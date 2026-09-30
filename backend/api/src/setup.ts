import { createHash, randomUUID } from 'node:crypto';
import { schemas } from '../../../shared/contracts/src/index.ts';
import { hashPassword } from '../../auth/src/bootstrap-password.ts';
import { limitedBody } from '../../auth/src/server.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';

/**
 * First-run setup of a customer installation. Reached before any login exists,
 * so it carries no session; what authorises it is the one-time setup code the
 * installer showed on its console. Owner and administrator choose their own
 * passwords here and enrol an authenticator at first sign-in. Once an owner
 * exists the setup is closed for good (app.first_run_state / first_run_complete,
 * migration 0064).
 */
export const setupCodeDigest = (code: string) => createHash('sha256').update(code.toUpperCase().replace(/[^A-Z0-9]/g, ''), 'utf8').digest('hex');
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };

/** GET /api/v1/setup — whether first-run setup is open. Says nothing about the code. */
export async function setupStateRoute(request: Request) {
  if (request.method !== 'GET') return Response.json({ error: { code: 'METHOD_NOT_ALLOWED' } }, { status: 405, headers: noStore });
  const state = (await runtime().pool.query('SELECT app.first_run_state() AS s')).rows[0]!.s as string;
  return Response.json(schemas.FirstRunState.parse({ state }), { headers: noStore });
}

/** POST /api/v1/setup — create the organisation, its owner and its administrator. */
export async function setupCompleteRoute(request: Request) {
  return safeRoute(async () => {
    if (request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
    if (request.headers.has('cookie') || request.headers.has('authorization')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_credentials_accepted' }]);
    const origin = request.headers.get('origin');
    if (origin !== null && origin !== new URL(runtime().config.origin).origin) throw new AccessError(403, 'FORBIDDEN');
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400, 'VALIDATION_ERROR');
    let input: unknown;
    try { input = JSON.parse(await limitedBody(request, 8192) ?? ''); } catch { throw new AccessError(400, 'VALIDATION_ERROR'); }
    const parsed = schemas.FirstRunSetup.safeParse(input);
    if (!parsed.success) throw new AccessError(400, 'VALIDATION_ERROR', parsed.error.issues.slice(0, 16).map(i => ({ field: i.path.join('.').slice(0, 120), code: i.code })));
    const v = parsed.data;
    const ownerId = randomUUID(); const adminId = randomUUID();
    const [ownerHash, adminHash] = await Promise.all([hashPassword(v.owner.password), hashPassword(v.admin.password)]);
    let rows: { tenant_id: string }[];
    try {
      rows = (await runtime().pool.query('SELECT * FROM app.first_run_complete($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
        [setupCodeDigest(v.setup_code), v.organisation_name, ownerId, v.owner.name, v.owner.email, ownerHash, adminId, v.admin.name, v.admin.email, adminHash])).rows;
    } catch (error) {
      const e = error as { code?: string; message?: string; hint?: string };
      if (e.code === 'P0001') throw new AccessError(409, 'VALIDATION_ERROR', [{ field: e.hint ?? 'setup', code: e.message ?? 'refused' }]);
      throw error;
    }
    // No row: the code did not match. The failed attempt has been counted and committed.
    if (!rows.length) throw new AccessError(403, 'FORBIDDEN', [{ field: 'setup_code', code: 'setup_code_not_accepted' }]);
    return Response.json(schemas.FirstRunCompleted.parse({ completed: true, sign_in: '/workspace/sign-in',
      next_steps: ['Sign in as the owner and set up your authenticator.', 'Give the administrator their password privately; they set up their own authenticator at first sign-in.'] }), { status: 201, headers: noStore });
  }, 'BUSINESS');
}

/**
 * POST /api/v1/setup/owner-recovery — customer-held owner recovery (OPEN-07, migration 0074). Reached without a session: what
 * authorises it is the one-time code a person with administrator access to the server issued with
 * `pnpm run owner:recovery-code`. A wrong email, a login that is not the active owner and a wrong code all get the same answer.
 */
export async function ownerRecoveryRoute(request: Request) {
  return safeRoute(async () => {
    if (request.method !== 'POST') throw new AccessError(404, 'NOT_FOUND');
    if (request.headers.has('cookie') || request.headers.has('authorization')) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'credentials', code: 'no_credentials_accepted' }]);
    const origin = request.headers.get('origin');
    if (origin !== null && origin !== new URL(runtime().config.origin).origin) throw new AccessError(403, 'FORBIDDEN');
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') throw new AccessError(400, 'VALIDATION_ERROR');
    let input: unknown;
    try { input = JSON.parse(await limitedBody(request, 4096) ?? ''); } catch { throw new AccessError(400, 'VALIDATION_ERROR'); }
    const parsed = schemas.OwnerRecoveryComplete.safeParse(input);
    if (!parsed.success) throw new AccessError(400, 'VALIDATION_ERROR', parsed.error.issues.slice(0, 8).map(i => ({ field: i.path.join('.').slice(0, 120), code: i.code })));
    const v = parsed.data;
    let recovered: boolean;
    try {
      recovered = (await runtime().pool.query('SELECT app.owner_recovery_complete($1,$2,$3) AS ok', [v.email, setupCodeDigest(v.recovery_code), await hashPassword(v.new_password)])).rows[0]!.ok === true;
    } catch (error) {
      const e = error as { code?: string; message?: string; hint?: string };
      // An expired, spent or locked code is reported like a wrong one: a distinct answer would tell a stranger which email is the
      // owner's (found by the owner-recovery test). The database keeps the specific reason; the audit trail records completions.
      if (e.code === 'P0001') throw new AccessError(403, 'FORBIDDEN', [{ field: 'recovery_code', code: 'recovery_not_accepted' }]);
      throw error;
    }
    if (!recovered) throw new AccessError(403, 'FORBIDDEN', [{ field: 'recovery_code', code: 'recovery_not_accepted' }]);
    return Response.json(schemas.OwnerRecoveryCompleted.parse({ recovered: true, sign_in: '/workspace/sign-in',
      next_steps: ['Sign in with the new password.', 'Set up a new authenticator at sign-in: the old one was removed.', 'Every earlier session of this login has ended. The recovery is in the audit trail.'] }), { headers: noStore });
  }, 'BUSINESS');
}
