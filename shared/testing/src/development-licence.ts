// Revision 1.11 test support. Every non-read business route now needs the entitlement in the licence in force, so a suite
// that exercises Control or Enterprise features needs a licence that grants them. This module gives each fixture scope a
// DEVELOPMENT FIXTURE licence: edition CUSTOM, every released entitlement, signed with the local vendor development key
// (.local/vendor/signing/licence.json) exactly as the vendor would sign one. It is test data, not a runtime fallback: the
// application has no code path that grants an entitlement without a licence row, and this module refuses any database
// whose bootstrap profile is not one of the local development profiles.
//
// A suite that tests licensing itself (imports its own licences, downgrades, expiry) replaces it by importing; the next
// suite to start restores it. Pass developmentLicence=false to HttpFixture to leave the scope exactly as a suite left it.
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import type { Pool } from 'pg';
import { canonicalJson } from '../../contracts/src/crypto.ts';
import { EntitlementCode } from '../../contracts/src/tiers.ts';
import { vendorSigningKey } from '../../../scripts/credentials.ts';
import { ProfileName } from './config.ts';

type Scope = { tenant_id: string; legal_entity_id: string; environment_id: string };
/** SSO_IDENTITY is not released (GO_LIVE D1), so not even a development licence names it. */
const RELEASED = EntitlementCode.options.filter(code => code !== 'SSO_IDENTITY');

export async function ensureDevelopmentLicence(pool: Pool, scopes: Scope[]) {
  const identity = (await pool.query('SELECT installation_id, profile FROM bootstrap_profile WHERE singleton=1')).rows[0];
  if (!identity || !ProfileName.options.includes(identity.profile)) throw new Error('A development licence is only issued on a local development profile');
  const unique = [...new Map(scopes.map(s => [`${s.tenant_id}/${s.legal_entity_id}/${s.environment_id}`, s])).values()];
  const issued: Scope[] = [];
  for (const scope of unique) {
    const scopeArgs = [scope.tenant_id, scope.legal_entity_id, scope.environment_id];
    const present = (await pool.query(`SELECT lifecycle, claims FROM app.effective_licence($1,$2,$3)`, scopeArgs)).rows[0];
    if (present && present.lifecycle === 'ACTIVE' && RELEASED.every(code => (present.claims.entitlements as string[]).includes(code))) continue;
    const history = (await pool.query(`SELECT max(sequence) AS top FROM app.licences WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scopeArgs)).rows[0];
    const sequence = history.top === null ? undefined : Number(history.top) + 1;
    const now = Date.now();
    const claims = {
      licence_id: randomUUID(), edition: 'CUSTOM', entitlements: RELEASED, installation_id: identity.installation_id,
      audience: 'ORVIA_CUSTOMER_INSTALLATION', valid_from: new Date(now - 86_400_000).toISOString(), valid_to: new Date(now + 365 * 86_400_000).toISOString(),
      licensed_limits: { environments: 100, staff_members: 10000, member_seats: 1000 }, term: 'CONTRACT', ...(sequence ? { sequence } : {}),
    };
    const key = vendorSigningKey('licence');
    const signature = sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(key.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
    const rowId = randomUUID();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Same supersession as an import: an unsequenced licence replaces the active ones; a sequenced one outranks them.
      if (!sequence) await client.query(`UPDATE app.licences SET active=false WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND active`, scopeArgs);
      await client.query(`INSERT INTO app.licences(tenant_id,legal_entity_id,environment_id,id,licence_id,installation_id,edition,valid_from,valid_to,signing_key_id,signature,imported_by,claims,term,sequence,trial)
        VALUES ($1,$2,$3,$4,$5,$6,'CUSTOM',$7,$8,$9,$10,$11,$12,'CONTRACT',$13,false)`,
      [...scopeArgs, rowId, claims.licence_id, identity.installation_id, claims.valid_from, claims.valid_to, key.key_id, signature, identity.installation_id, claims, sequence ?? null]);
      for (const code of RELEASED) await client.query('INSERT INTO app.licence_entitlements(tenant_id,legal_entity_id,environment_id,licence_row_id,code) VALUES($1,$2,$3,$4,$5)', [...scopeArgs, rowId, code]);
      await client.query('COMMIT');
    } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
    issued.push(scope);
  }
  return issued;
}

/** For suites that start the application themselves rather than through HttpFixture: the same labelled development
 *  licence for every fixture scope of the profile in use. A vendor profile has no customer licences and is left alone. */
export async function ensureFixtureLicences() {
  const { loadProfile } = await import('./config.ts');
  const { connectDatabase } = await import('../../../database/customer/src/index.ts');
  const { readFileSync, existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');
  const profile = loadProfile();
  if (profile.profile === 'vendor-a00') return [];
  const journal = resolve(profile.directory, 'auth/bootstrap.json');
  if (!existsSync(journal)) return [];
  const users = (JSON.parse(readFileSync(journal, 'utf8')) as { users: Record<string, { scope: Scope }> }).users;
  const { pool } = connectDatabase(profile);
  try { return await ensureDevelopmentLicence(pool, Object.values(users).map(u => u.scope)); } finally { await pool.end(); }
}
