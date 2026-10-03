// First-run setup against a fresh installation database (a scratch copy of the
// current schema, so the shared profile's existing owners do not close setup).
// Under test: no code issued; a code is issued (digest only stored); wrong codes
// are counted and five lock setup; a reissued code resets the lock; an expired
// code is refused; the correct code creates one organisation, an owner and an
// administrator with their chosen password hashes and records the act; setup is
// then closed for good, including for a newly issued code; the application role
// cannot read the code table; owner and administrator must differ.
import assert from 'node:assert/strict';
import { postgresContainer } from '../../../shared/testing/src/postgres-container.ts';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { writeEvidence } from '../../../shared/testing/src/evidence.ts';
import { issueSetupCode, newSetupCode } from '../../../scripts/setup-code.ts';
import { setupCodeDigest } from '../../../backend/api/src/setup.ts';

const results: { name: string; result: 'PASS' | 'FAIL' }[] = [];
const check = (name: string, actual: unknown, expected: unknown) => { try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); } catch { results.push({ name, result: 'FAIL' }); console.log(`FAIL ${name} ${JSON.stringify({ expected, actual })}`); process.exitCode = 1; } };
const profile = loadProfile();
const scratch = `orvia_first_run_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
const container = postgresContainer(profile);
const exec = (args: string[], input?: Buffer) => { const r = spawnSync('docker', ['exec', '-i', '-e', `PGPASSWORD=${profile.password}`, container, ...args], { input, maxBuffer: 256 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`${args[0]} failed: ${String(r.stderr).slice(0, 200)}`); return r.stdout as Buffer; };
const bootstrap = connectDatabase({ ...profile, database: 'postgres' }).pool;
await bootstrap.query(`CREATE DATABASE ${scratch}`);
try {
  exec(['pg_restore', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', scratch, '--no-owner', '--exit-on-error'], exec(['pg_dump', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', profile.database, '--schema-only', '-Fc', '--no-owner']));
  const db = connectDatabase({ ...profile, database: scratch }).pool;
  const asApp = async <T>(work: (q: (sql: string, v?: unknown[]) => Promise<{ rows: T[] }>) => Promise<unknown>) => {
    const c = await db.connect();
    try { await c.query('BEGIN'); await c.query('SET LOCAL ROLE orvia_app'); const r = await work((sql, v) => c.query(sql, v) as never); await c.query('COMMIT'); return r; }
    catch (e) { await c.query('ROLLBACK').catch(() => {}); return { error: (e as { code?: string; message?: string }).code, message: (e as { message?: string }).message }; } finally { c.release(); }
  };
  const state = async () => (await db.query('SELECT app.first_run_state() s')).rows[0].s;
  const complete = (code: string, owner = `owner.${randomUUID().slice(0, 6)}@customer.example`, admin = `admin.${randomUUID().slice(0, 6)}@customer.example`) =>
    asApp<Record<string, string>>(q => q('SELECT * FROM app.first_run_complete($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [setupCodeDigest(code), 'Synthetic Organisation', randomUUID(), 'Synthetic Owner', owner, 'owner-hash', randomUUID(), 'Synthetic Admin', admin, 'admin-hash']).then(r => r.rows));
  try {
    check('a fresh installation has no code issued', await state(), 'NO_CODE_ISSUED');
    check('setup cannot complete without a code', await complete(newSetupCode()), { error: 'P0001', message: 'no_setup_code_issued' });
    let code = await issueSetupCode(profile.profile, scratch, false);
    check('an issued code is in the expected form and setup is open', [/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(code), await state()], [true, 'OPEN']);
    check('only the digest is stored', (await db.query('SELECT code_digest FROM app.installation_setup')).rows[0].code_digest, setupCodeDigest(code));
    check('the application role cannot read the code table', ((await asApp(q => q('SELECT * FROM app.installation_setup'))) as { error?: string }).error, '42501');
    for (let i = 0; i < 4; i++) check(`wrong code ${i + 1} is refused and counted`, await complete(newSetupCode()), []);
    check('four wrong attempts leave setup open', [await state(), (await db.query('SELECT failed_attempts n FROM app.installation_setup')).rows[0].n], ['OPEN', 4]);
    await complete(newSetupCode());
    check('the fifth wrong attempt locks setup', await state(), 'LOCKED');
    check('even the right code is refused once locked', await complete(code), { error: 'P0001', message: 'setup_code_locked' });
    code = await issueSetupCode(profile.profile, scratch, false);
    check('a newly issued code resets the lock', await state(), 'OPEN');
    await db.query(`UPDATE app.installation_setup SET issued_at=issued_at-interval '2 days', expires_at=clock_timestamp()-interval '1 second'`);
    check('an expired code is refused', [await state(), await complete(code)], ['EXPIRED', { error: 'P0001', message: 'setup_code_expired' }]);
    code = await issueSetupCode(profile.profile, scratch, false);
    check('owner and administrator must have different addresses', await complete(code, 'same@customer.example', 'SAME@customer.example'), { error: 'P0001', message: 'owner_and_admin_must_differ' });
    check('the code is accepted in lower case with spaces', ((await complete(code.toLowerCase().replaceAll('-', ' '))) as unknown[]).length, 1);
    const logins = (await db.query(`SELECT a.role, u.name, acc.password FROM staff_auth.authority a JOIN staff_auth."user" u ON u.id=a.user_id JOIN staff_auth.account acc ON acc."userId"=u.id ORDER BY a.role`)).rows;
    check('one owner and one administrator were created with their chosen password hashes', logins.map(r => [r.role, r.password]), [['ORG_ADMIN', 'admin-hash'], ['ORG_SUPER_ADMIN', 'owner-hash']]);
    check('both logins belong to the one new organisation', Number((await db.query('SELECT count(DISTINCT (tenant_id,legal_entity_id,environment_id)) n FROM staff_auth.authority')).rows[0].n), 1);
    check('the setup was recorded in the audit trail', Number((await db.query(`SELECT count(*) n FROM app.audit_events WHERE operation='first-run.setup-completed'`)).rows[0].n), 1);
    check('setup is closed afterwards', await state(), 'COMPLETED');
    check('the used code cannot run setup again', await complete(code), { error: 'P0001', message: 'setup_already_completed' });
    let reissue = 'refused';
    try { await issueSetupCode(profile.profile, scratch, false); reissue = 'issued'; } catch (e) { reissue = /already has an owner/.test(String(e)) ? 'refused' : String(e); }
    check('no new code can be issued once an owner exists', reissue, 'refused');
  } finally { await db.end(); }
} finally {
  await bootstrap.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`);
  const left = (await bootstrap.query('SELECT 1 FROM pg_database WHERE datname=$1', [scratch])).rowCount;
  check('the scratch database was removed', left, 0);
  await bootstrap.end();
}
writeEvidence('first-run-setup', { suite: 'first-run-setup', results });
console.log(`\n${results.length} assertions, ${results.filter(r => r.result === 'FAIL').length} failures.`);
