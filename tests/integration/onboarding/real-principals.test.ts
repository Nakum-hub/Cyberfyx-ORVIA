// Real people as Data Principals (owner decision 2026-10-01, revision 1.9 addendum; migration 0082; contract 0.54.0).
// Against a scratch copy of the current schema seeded as a customer installation (profile `rehearsal`), so the shared profile is
// never switched: before admission a real email is refused with the synthetic-only constraint that organisation intake already
// explains, and synthetic addresses are accepted and labelled synthetic; the application role can read the state but cannot
// admit real people; a short reference is refused; the protected command admits them once, records the reference and who ran
// it, and writes the audit trail of every environment; from then on a real email is accepted and labelled real while a
// synthetic address stays synthetic and nobody can relabel either; a repeat is refused; the admission cannot be updated or
// deleted; a malformed email is still refused. The development and test profiles refuse the command outright, and on the
// development installation the admin API refuses a real email with `synthetic_principals_only` and labels a synthetic one.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { postgresContainer } from '../../../shared/testing/src/postgres-container.ts';
import { writeEvidence } from '../../../shared/testing/src/evidence.ts';
import { issueSetupCode } from '../../../scripts/setup-code.ts';
import { admitRealPrincipals, realPrincipalState } from '../../../scripts/real-principals.ts';
import { setupCodeDigest } from '../../../backend/api/src/setup.ts';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';

const results: { name: string; result: 'PASS' | 'FAIL'; expected?: unknown; actual?: unknown }[] = [];
const check = (name: string, actual: unknown, expected: unknown) => {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', expected, actual }); console.log(`FAIL ${name}`, JSON.stringify({ expected, actual })); }
};
const profile = loadProfile();
const scratch = `orvia_real_principals_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
const container = postgresContainer(profile);
const exec = (args: string[], input?: Buffer) => { const r = spawnSync('docker', ['exec', '-i', '-e', `PGPASSWORD=${profile.password}`, container, ...args], { input, maxBuffer: 256 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`docker exec failed: ${r.stderr?.toString().slice(0, 300)}`); return r.stdout; };
const failure = (e: unknown) => ({ code: (e as { code?: string }).code, message: (e as { message?: string }).message, constraint: (e as { constraint?: string }).constraint });
const bootstrap = connectDatabase({ ...profile, database: 'postgres' }).pool;

// The shared development profile itself refuses: it holds synthetic fixtures by design.
check('the development profile refuses the command', await admitRealPrincipals('QUAL-DEV-REFUSAL-1', 'Synthetic operator', profile.profile).then(() => 'admitted', (e: Error) => e.message),
  'This is a development or test installation; it never admits real people.');
check('the development profile still records synthetic people only', (await realPrincipalState(profile.profile)).real_permitted, false);

await bootstrap.query(`CREATE DATABASE ${scratch}`);
try {
  exec(['pg_restore', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', scratch, '--no-owner', '--exit-on-error'], exec(['pg_dump', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', profile.database, '--schema-only', '-Fc', '--no-owner']));
  const db = connectDatabase({ ...profile, database: scratch }).pool;
  const asApp = async <T>(sql: string, values: unknown[] = []) => {
    const c = await db.connect();
    try { await c.query('BEGIN'); await c.query('SET LOCAL ROLE orvia_app'); const r = await c.query(sql, values); await c.query('COMMIT'); return r.rows as T[]; }
    catch (e) { await c.query('ROLLBACK').catch(() => {}); return failure(e); } finally { c.release(); }
  };
  try {
    // A customer installation (the installer's `rehearsal` profile), set up the normal way.
    const installation = randomUUID();
    await db.query(`INSERT INTO public.bootstrap_profile VALUES (1, $1, 'rehearsal', 'bootstrap-probe-v1')`, [installation]);
    const setup = await issueSetupCode(profile.profile, scratch, false);
    await asApp('SELECT * FROM app.first_run_complete($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)', [setupCodeDigest(setup), 'Synthetic Organisation', randomUUID(), 'Synthetic Owner',
      `owner.${randomUUID().slice(0, 6)}@customer.example`, 'owner-hash', randomUUID(), 'Synthetic Admin', `admin.${randomUUID().slice(0, 6)}@customer.example`, 'admin-hash']);
    const env = (await db.query('SELECT tenant_id, legal_entity_id, id FROM app.environments LIMIT 1')).rows[0] as { tenant_id: string; legal_entity_id: string; id: string };
    const environments = Number((await db.query('SELECT count(*)::int n FROM app.environments')).rows[0].n);
    const insert = (email: string, synthetic = true) => db.query('INSERT INTO app.principal_references(tenant_id,legal_entity_id,environment_id,id,display_name,email,synthetic) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING synthetic',
      [env.tenant_id, env.legal_entity_id, env.id, randomUUID(), 'Synthetic person', email, synthetic]).then(r => r.rows[0].synthetic as boolean, failure);

    // Before admission.
    check('before admission the installation reports synthetic people only', await realPrincipalState(profile.profile, scratch), { real_permitted: false, real_permitted_at: null, qualification_reference: null });
    const refused = await insert('meera.k@customer.example');
    check('a real email is refused with SQLSTATE 23514 and an email constraint (what organisation intake explains as NEEDS_STAFF)',
      [refused, /email/.test((refused as { constraint?: string }).constraint ?? '')], [{ code: '23514', message: 'synthetic_principals_only', constraint: 'principal_references_email_synthetic_only' }, true]);
    check('a synthetic address is accepted and labelled synthetic', await insert(`p.${randomUUID().slice(0, 6)}@aster.example`), true);
    check('a synthetic address cannot be labelled real', await insert(`q.${randomUUID().slice(0, 6)}@birch.example`, false), true);

    // The application cannot switch it.
    check('the application role can read the state', ((await asApp<{ real_permitted: boolean }>('SELECT * FROM app.principal_admission_state()')) as { real_permitted: boolean }[])[0]?.real_permitted, false);
    check('the application role cannot admit real people', ((await asApp('SELECT app.admit_real_principals($1,$2)', ['QUAL-APP-ATTEMPT-1', 'Application'])) as { code?: string }).code, '42501');
    check('the application role cannot write the admission table', ((await asApp(`INSERT INTO app.principal_admission(qualification_reference, recorded_by) VALUES ('QUAL-APP-ATTEMPT-2','App')`)) as { code?: string }).code, '42501');
    check('a qualification reference shorter than 8 characters is refused', await admitRealPrincipals('short', 'Synthetic operator', profile.profile, scratch).then(() => 'admitted', (e: Error) => e.message),
      'The qualification reference needs 8 to 500 characters and your name and role must be given.');
    check('nothing was admitted by the refused attempts', (await realPrincipalState(profile.profile, scratch)).real_permitted, false);

    // Admission by the protected command.
    const reference = 'PRODUCTION_READINESS sign-off PR-2026-10-01 (synthetic)';
    const at = await admitRealPrincipals(reference, 'Synthetic DPO, data protection officer', profile.profile, scratch);
    const state = await realPrincipalState(profile.profile, scratch);
    check('the command admits real people and records the reference and its time', [state.real_permitted, state.qualification_reference, state.real_permitted_at?.toISOString()], [true, reference, at.toISOString()]);
    check('who ran it is recorded', (await db.query('SELECT recorded_by FROM app.principal_admission')).rows[0].recorded_by, 'Synthetic DPO, data protection officer');
    check('the admission is in the audit trail of every environment, attributed to the installation', (await db.query(`SELECT count(*)::int n, bool_and(actor_id=$1 AND actor_domain='MACHINE') own FROM app.audit_events WHERE operation='principals.real-admitted-on-server'`, [installation])).rows[0], { n: environments, own: true });

    // After admission.
    check('a real email is now accepted and labelled real', await insert('meera.k@customer.example'), false);
    check('a real email cannot be labelled synthetic', await insert('arjun.r@customer.example', true), false);
    check('a synthetic address is still labelled synthetic', await insert(`r.${randomUUID().slice(0, 6)}@aster.example`, false), true);
    check('a malformed email is still refused', ((await insert('not-an-email')) as { code?: string }).code, '23514');
    const real = (await db.query(`SELECT id FROM app.principal_references WHERE email='meera.k@customer.example'`)).rows[0].id;
    await db.query('UPDATE app.principal_references SET synthetic=true WHERE id=$1', [real]);
    check('a real person cannot be relabelled synthetic afterwards', (await db.query('SELECT synthetic FROM app.principal_references WHERE id=$1', [real])).rows[0].synthetic, false);
    check('a repeat is refused and changes nothing', [await admitRealPrincipals('ANOTHER-REFERENCE-2', 'Someone else', profile.profile, scratch).then(() => 'admitted', (e: Error) => e.message),
      (await realPrincipalState(profile.profile, scratch)).qualification_reference], ['Real people are already admitted on this installation. Nothing changed.', reference]);
    check('the admission cannot be rewritten', await db.query(`UPDATE app.principal_admission SET qualification_reference='REWRITTEN-REFERENCE'`).then(() => 'changed', (e: Error) => e.message), 'principal_admission_is_permanent');
    check('the admission cannot be removed', await db.query('DELETE FROM app.principal_admission').then(() => 'deleted', (e: Error) => e.message), 'principal_admission_is_permanent');
  } finally { await db.end(); }
} finally {
  await bootstrap.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`);
  check('the scratch database was removed', (await bootstrap.query('SELECT 1 FROM pg_database WHERE datname=$1', [scratch])).rowCount, 0);
  await bootstrap.end();
}

// Through the real HTTP boundary of the running application on the development profile, which has not admitted real people.
const h = new HttpFixture();
try {
  await h.start();
  const owner = await h.login('owner');
  const scope = h.users.owner!.scope;
  const create = (email: string) => owner.call('/api/v1/admin/principals', { environment_id: scope.environment_id, legal_entity_id: scope.legal_entity_id, display_name: 'Synthetic person', email }, { 'idempotency-key': randomUUID() });
  const real = await create(`meera.${randomUUID().slice(0, 6)}@customer.example`);
  check('HTTP: the admin API refuses a real email before admission, saying why', [real.status, ((await real.json()) as { error?: { field_errors?: { code: string }[] } }).error?.field_errors?.[0]?.code], [400, 'synthetic_principals_only']);
  const synthetic = await create(`s.${randomUUID().slice(0, 8)}@aster.example`);
  check('HTTP: a synthetic address is created and labelled synthetic by the database', [synthetic.status, ((await synthetic.json()) as { synthetic?: boolean }).synthetic], [201, true]);
} finally { await h.stop(); }

const failures = results.filter(r => r.result === 'FAIL').length;
writeEvidence('real-principals', { suite: 'real-principals', assertions: results, passed: results.length - failures, failures, scratch_database: scratch });
console.log(`\n${results.length} assertions, ${failures} failures.`);
process.exitCode = failures ? 1 : 0;
