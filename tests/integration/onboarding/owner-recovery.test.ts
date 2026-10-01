// Customer-held owner recovery (OPEN-07; owner decision 2026-09-30; migration 0074; contract 0.49.0).
// Against a scratch copy of the current schema, so the shared profile's owner login is never touched:
// a code is issued only for the active owner (not the administrator, not an unknown email) and only its digest is stored; the
// application role can neither read the codes nor issue one; wrong codes are counted and five lock it; a reissue resets the lock;
// an expired code is refused; the right code replaces the owner's password, removes the authenticator and ends every session,
// keeps exactly one owner, leaves the administrator untouched and is recorded in the audit trail; a used code cannot be reused.
// Then, through the real HTTP boundary of the running application: wrong details get one undifferentiated refusal, and a request
// carrying cookies or a foreign origin is refused.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { postgresContainer } from '../../../shared/testing/src/postgres-container.ts';
import { writeEvidence } from '../../../shared/testing/src/evidence.ts';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { issueSetupCode, newSetupCode } from '../../../scripts/setup-code.ts';
import { issueOwnerRecoveryCode } from '../../../scripts/owner-recovery-code.ts';
import { setupCodeDigest } from '../../../backend/api/src/setup.ts';

const results: { name: string; result: 'PASS' | 'FAIL'; expected?: unknown; actual?: unknown }[] = [];
const check = (name: string, actual: unknown, expected: unknown) => {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', expected, actual }); console.log(`FAIL ${name}`, JSON.stringify({ expected, actual })); }
};
const profile = loadProfile();
const scratch = `orvia_owner_recovery_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
const container = postgresContainer(profile);
const exec = (args: string[], input?: Buffer) => { const r = spawnSync('docker', ['exec', '-i', '-e', `PGPASSWORD=${profile.password}`, container, ...args], { input, maxBuffer: 256 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`docker exec failed: ${r.stderr?.toString().slice(0, 300)}`); return r.stdout; };
const bootstrap = connectDatabase({ ...profile, database: 'postgres' }).pool;
await bootstrap.query(`CREATE DATABASE ${scratch}`);
try {
  exec(['pg_restore', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', scratch, '--no-owner', '--exit-on-error'], exec(['pg_dump', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', profile.database, '--schema-only', '-Fc', '--no-owner']));
  const db = connectDatabase({ ...profile, database: scratch }).pool;
  const asApp = async <T>(sql: string, values: unknown[] = []) => {
    const c = await db.connect();
    try { await c.query('BEGIN'); await c.query('SET LOCAL ROLE orvia_app'); const r = await c.query(sql, values); await c.query('COMMIT'); return r.rows as T[]; }
    catch (e) { await c.query('ROLLBACK').catch(() => {}); return { error: (e as { code?: string }).code, message: (e as { message?: string }).message }; } finally { c.release(); }
  };
  const recover = async (email: string, code: string, hash = 'new-owner-password-hash-000') => {
    const r = await asApp<{ ok: boolean }>('SELECT app.owner_recovery_complete($1,$2,$3) AS ok', [email, setupCodeDigest(code), hash]);
    return Array.isArray(r) ? r[0]!.ok : r;
  };
  try {
    // An installation with one owner and one administrator, created the normal way.
    const setup = await issueSetupCode(profile.profile, scratch, false);
    const owner = `owner.${randomUUID().slice(0, 6)}@customer.example`; const admin = `admin.${randomUUID().slice(0, 6)}@customer.example`;
    const ownerId = randomUUID(); const adminId = randomUUID();
    await asApp('SELECT * FROM app.first_run_complete($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [setupCodeDigest(setup), 'Synthetic Organisation', ownerId, 'Synthetic Owner', owner, 'owner-hash', adminId, 'Synthetic Admin', admin, 'admin-hash']);
    // The owner has an authenticator and two open sessions.
    await db.query(`INSERT INTO staff_auth."twoFactor"(id, secret, "backupCodes", "userId", verified) VALUES ($1,'synthetic-secret','[]',$2,true)`, [randomUUID(), ownerId]);
    await db.query(`UPDATE staff_auth."user" SET "twoFactorEnabled"=true WHERE id=$1`, [ownerId]);
    for (let i = 0; i < 2; i++) await db.query(`INSERT INTO staff_auth.session(id, "expiresAt", token, "userId") VALUES ($1, now() + interval '1 hour', $2, $3)`, [randomUUID(), randomUUID(), ownerId]);

    const refusal = async (email: string) => { try { await issueOwnerRecoveryCode(email, profile.profile, scratch); return 'issued'; } catch (e) { return /No active owner/.test(String(e)) ? 'refused' : String(e); } };
    check('no code is issued for the administrator', await refusal(admin), 'refused');
    check('no code is issued for an unknown email', await refusal('nobody@customer.example'), 'refused');
    let code = await issueOwnerRecoveryCode(owner.toUpperCase(), profile.profile, scratch);
    check('a code is issued for the owner (email in any case), in the expected form', /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(code), true);
    check('only its digest is stored, valid for 30 minutes', (await db.query(`SELECT code_digest, round(extract(epoch FROM expires_at - issued_at)/60) m FROM app.owner_recovery_codes WHERE user_id=$1`, [ownerId])).rows[0], { code_digest: setupCodeDigest(code), m: '30' });
    check('issuing is recorded in the audit trail', Number((await db.query(`SELECT count(*) n FROM app.audit_events WHERE operation='owner-recovery.code-issued-on-server'`)).rows[0].n), 1);
    check('the application role cannot read the codes', ((await asApp('SELECT * FROM app.owner_recovery_codes')) as { error?: string }).error, '42501');
    check('the application role cannot issue a code', ((await asApp('SELECT app.owner_recovery_issue($1,$2)', [owner, setupCodeDigest(newSetupCode())])) as { error?: string }).error, '42501');

    check('the administrator\'s email with the owner\'s code is refused without a counted attempt', [await recover(admin, code), (await db.query('SELECT failed_attempts n FROM app.owner_recovery_codes WHERE user_id=$1', [ownerId])).rows[0].n], [false, 0]);
    for (let i = 0; i < 4; i++) check(`wrong code ${i + 1} is refused`, await recover(owner, newSetupCode()), false);
    await recover(owner, newSetupCode());
    check('the fifth wrong code locks it, and then even the right code is refused', await recover(owner, code), { error: 'P0001', message: 'recovery_code_locked' });
    code = await issueOwnerRecoveryCode(owner, profile.profile, scratch);
    await db.query(`UPDATE app.owner_recovery_codes SET issued_at = issued_at - interval '40 minutes', expires_at = issued_at - interval '11 minutes' WHERE user_id=$1`, [ownerId]);
    check('an expired code is refused', await recover(owner, code), { error: 'P0001', message: 'no_valid_recovery_code' });
    code = await issueOwnerRecoveryCode(owner, profile.profile, scratch);
    check('the right code recovers the owner login (code accepted in lower case with spaces)', await recover(owner, code.toLowerCase().replaceAll('-', ' ')), true);
    const after = (await db.query(`SELECT acc.password, u."twoFactorEnabled" tfa, (SELECT count(*)::int FROM staff_auth."twoFactor" t WHERE t."userId"=u.id) factors,
      (SELECT count(*)::int FROM staff_auth.session s WHERE s."userId"=u.id) sessions FROM staff_auth."user" u JOIN staff_auth.account acc ON acc."userId"=u.id WHERE u.id=$1`, [ownerId])).rows[0];
    check('the password is replaced, the authenticator removed and every session ended', after, { password: 'new-owner-password-hash-000', tfa: false, factors: 0, sessions: 0 });
    check('exactly one owner remains, the same login', (await db.query(`SELECT user_id FROM staff_auth.authority WHERE role='ORG_SUPER_ADMIN' AND active`)).rows.map(r => r.user_id), [ownerId]);
    check('the administrator is untouched', (await db.query(`SELECT password FROM staff_auth.account WHERE "userId"=$1`, [adminId])).rows[0].password, 'admin-hash');
    check('the recovery is recorded in the audit trail', Number((await db.query(`SELECT count(*) n FROM app.audit_events WHERE operation='owner-recovery.completed' AND resource_id=$1`, [ownerId])).rows[0].n), 1);
    check('a used code cannot be used again', await recover(owner, code), { error: 'P0001', message: 'no_valid_recovery_code' });
  } finally { await db.end(); }
} finally {
  await bootstrap.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`);
  check('the scratch database was removed', (await bootstrap.query('SELECT 1 FROM pg_database WHERE datname=$1', [scratch])).rowCount, 0);
  await bootstrap.end();
}

// Through the real HTTP boundary of the running application (shared profile; nothing here can succeed or change a login).
const h = new HttpFixture();
try {
  await h.start();
  const post = (body: unknown, headers: Record<string, string> = {}) => fetch(`${h.config.origin}/api/v1/setup/owner-recovery`, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(20000) });
  const codes = async (r: Response) => ({ status: r.status, code: ((await r.json()) as { error?: { field_errors?: { code: string }[] } }).error?.field_errors?.[0]?.code ?? null });
  const body = { email: 'nobody@customer.example', recovery_code: newSetupCode(), new_password: 'a-new-password-of-16+' };
  check('HTTP: wrong details get one undifferentiated refusal', await codes(await post(body)), { status: 403, code: 'recovery_not_accepted' });
  // The shared owner has no recovery code issued: that must not be distinguishable from an unknown email.
  check('HTTP: the owner\'s real email with no valid code gets the same refusal (no email probing)', await codes(await post({ ...body, email: h.users.owner!.email })), { status: 403, code: 'recovery_not_accepted' });
  check('HTTP: a request carrying cookies is refused', await codes(await post(body, { cookie: 'x=1' })), { status: 400, code: 'no_credentials_accepted' });
  check('HTTP: a foreign origin is refused', (await post(body, { origin: 'https://evil.example' })).status, 403);
  check('HTTP: a short password is refused before anything is checked', (await post({ ...body, new_password: 'short' })).status, 400);
} finally { await h.stop(); }

const failures = results.filter(r => r.result === 'FAIL').length;
writeEvidence('owner-recovery', { suite: 'owner-recovery', assertions: results, passed: results.length - failures, failures, scratch_database: scratch });
console.log(`\n${results.length} assertions, ${failures} failures.`);
process.exitCode = failures ? 1 : 0;
