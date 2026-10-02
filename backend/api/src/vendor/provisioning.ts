import { randomUUID, timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import * as P from '../../../../shared/contracts/src/vendor-provisioning.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { open, vaultKeyFrom } from '../../../vendor/audit/vault.ts';
import { newEngagementCode, setupCodeDigestOf } from '../../../vendor/audit/service.ts';
import type { VendorRuntime } from './runtime.ts';
import { parseWith } from './authority.ts';
import { limitedBody } from '../../../auth/src/server.ts';

/**
 * Revision 1.13 provisioning API: the company website manages vendor accounts here, signed per vendor-provisioning.ts. No
 * session, no cookie: the signature is the authority, and each operation is limited to the client's scopes in the
 * database. The website never sends or receives a password; it gets one-time setup codes.
 */
const MAX_BODY = 8192;
const iso = (v: Date | null) => v ? v.toISOString() : null;
async function readBody(request: Request) {
  const text = request.method === 'POST' ? await limitedBody(request, MAX_BODY) : '';
  if (text === undefined) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'body', code: 'too_large' }]);
  return text;
}

async function authenticate(request: Request, path: string, body: string, r: VendorRuntime) {
  const h = (name: string) => request.headers.get(name) ?? '';
  const client = h(P.PROVISIONING_HEADERS.client), timestamp = h(P.PROVISIONING_HEADERS.timestamp), nonce = h(P.PROVISIONING_HEADERS.nonce), signature = h(P.PROVISIONING_HEADERS.signature);
  const refuse = (code: string): never => { throw new AccessError(401, 'UNAUTHENTICATED', [{ field: 'signature', code }]); };
  if (request.headers.has('cookie')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_session_accepted' }]);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(client) || !/^\d{9,11}$/.test(timestamp) || !/^[A-Za-z0-9_-]{16,64}$/.test(nonce) || !/^[0-9a-f]{64}$/.test(signature)) refuse('malformed');
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > P.PROVISIONING_WINDOW_SECONDS) refuse('stale');
  const row = (await r.pool.query('SELECT * FROM vendor.provisioning_client($1)', [client])).rows[0];
  if (!row) refuse('unknown_client');
  const vault = vaultKeyFrom(readFileSync(resolve(r.config.directory, 'auth', 'vault-key'), 'utf8').trim());
  const secret = open(vault, { ciphertext: row.secret_ciphertext, nonce: row.secret_nonce, tag: row.secret_tag }, `provisioning:${client}`).toString('utf8');
  const expected = Buffer.from(P.provisioningSignature(secret, request.method, path, timestamp, nonce, body), 'hex');
  if (!timingSafeEqual(expected, Buffer.from(signature, 'hex'))) refuse('bad_signature');
  // Only a correctly signed request may consume a nonce, so nobody can burn the website's nonces.
  if (!(await r.pool.query('SELECT vendor.provisioning_accept_nonce($1,$2) AS ok', [client, nonce])).rows[0].ok) refuse('replayed');
  return client;
}

async function guarded<T>(work: () => Promise<T>) {
  try { return await work(); }
  catch (error) {
    const e = error as { code?: string; message?: string; hint?: string };
    if (e.code === 'P0001') {
      if (e.message === 'scope_not_granted') throw new AccessError(403, 'FORBIDDEN', [{ field: 'scope', code: 'scope_not_granted' }]);
      if (e.message === 'not_found') throw new AccessError(404, 'NOT_FOUND');
      throw new AccessError(409, 'VALIDATION_ERROR', [{ field: e.hint ?? 'request', code: e.message ?? 'refused' }]);
    }
    throw error;
  }
}

export async function provisioningRoute(request: Request, path: string, r: VendorRuntime, requestId: string) {
  const body = await readBody(request);
  const client = await authenticate(request, path, body, r);
  let input: unknown;
  try { input = body ? JSON.parse(body) as unknown : undefined; }
  catch { throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'body', code: 'invalid_json' }]); }
  const sub = path.replace(/^\/api\/v1\/vendor\/provisioning/, '');
  // Each operation and its audit record commit together or not at all.
  const tx = async <T>(work: (q: (sql: string, params: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>) => Promise<T>) => {
    const db = await r.pool.connect();
    try { await db.query('BEGIN'); const result = await work((sql, params) => db.query(sql, params)); await db.query('COMMIT'); return result; }
    catch (error) { await db.query('ROLLBACK').catch(() => {}); throw error; } finally { db.release(); }
  };
  const audit = (q: (sql: string, params: unknown[]) => Promise<unknown>, operation: string, resource: string | null) => q('SELECT vendor.provisioning_audit($1,$2,$3,$4)', [client, operation, resource, requestId]);
  return guarded(async () => {
    if (request.method === 'GET' && sub === '/accounts') {
      const rows = (await r.pool.query('SELECT * FROM vendor.provisioning_accounts($1)', [client])).rows;
      return Response.json(P.ProvisioningAccountList.parse({ accounts: rows.map(a => P.ProvisioningAccount.parse({ ...a, created_at: iso(a.created_at) })) }));
    }
    if (request.method === 'POST' && sub === '/accounts') {
      const v = parseWith(P.ProvisioningAccountCreate, input); const id = randomUUID(); const code = newEngagementCode();
      const expires = await tx(async q => {
        const e = (await q('SELECT vendor.provisioning_create_account($1,$2,$3,$4,$5,$6,$7) AS e', [client, id, v.name, v.email, v.role, setupCodeDigestOf(code), v.setup_code_valid_hours])).rows[0]!.e as Date;
        await audit(q, 'vendor.provisioning.account-created', id); return e;
      });
      const account = { user_id: id, name: v.name, email: v.email.toLowerCase(), role: v.role, active: true, deleted: false, password_set: false, mfa_enrolled: false, created_at: new Date().toISOString() };
      return Response.json(P.ProvisioningAccountCreated.parse({ account: P.ProvisioningAccount.parse(account), setup_code: code, setup_code_expires_at: expires.toISOString(),
        set_password_path: '/vendor/account-setup', note: 'Send the code only to the account holder. They set their password at the vendor service with their work email and this code; it works once.' }), { status: 201 });
    }
    const codeMatch = /^\/accounts\/([0-9a-f-]{36})\/setup-code$/.exec(sub);
    if (request.method === 'POST' && codeMatch) {
      const v = parseWith(P.ProvisioningCodeRequest, input ?? {}); const code = newEngagementCode();
      const expires = await tx(async q => {
        const e = (await q('SELECT vendor.provisioning_issue_code($1,$2,$3,$4) AS e', [client, codeMatch[1], setupCodeDigestOf(code), v.setup_code_valid_hours])).rows[0]!.e as Date;
        await audit(q, 'vendor.provisioning.setup-code-issued', codeMatch[1]!); return e;
      });
      return Response.json(P.ProvisioningSetupCode.parse({ user_id: codeMatch[1], setup_code: code, setup_code_expires_at: expires.toISOString() }));
    }
    const deactivate = /^\/accounts\/([0-9a-f-]{36})\/deactivate$/.exec(sub);
    if (request.method === 'POST' && deactivate) {
      await tx(async q => { await q('SELECT vendor.provisioning_deactivate($1,$2)', [client, deactivate[1]]); await audit(q, 'vendor.provisioning.account-deactivated', deactivate[1]!); });
      return Response.json({ deactivated: true });
    }
    throw new AccessError(404, 'NOT_FOUND');
  });
}
