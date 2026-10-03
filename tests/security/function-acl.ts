// Observe the installed ACL, including inherited privileges and PUBLIC, after
// the protected auth-init and machine-init commands have run. Synthetic only.
import { connectDatabase } from '../../database/customer/src/index.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { writeEvidence, safeError } from '../../shared/testing/src/evidence.ts';

const profile = loadProfile();
if (profile.profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const pool = connectDatabase(profile).pool;
// Independent expectations: do not derive expected permissions from the code
// whose blanket grants/revocations this test verifies.
const expected: Record<string, string[]> = {
  'app.owner_recovery_issue(text,text)': [],
  'app.admit_real_principals(text,text)': [],
  'app.record_ledger_upgrade_boundary()': [],
  'app.canary_marketing_hold(uuid)': ['orvia_app', 'orvia_sender'],
  'app.withhold_real_decoy_message(uuid)': ['orvia_worker'],
  'app.real_decoy_recipient(uuid,uuid,uuid,text)': [],
  // Revisions 1.11/1.12: scope-bound licence and plan readers, the import guard and the file-intake decision guard.
  'app.effective_licence(uuid,uuid,uuid)': ['orvia_app', 'orvia_worker'],
  'app.licence_names_entitlement(uuid,text)': ['orvia_app', 'orvia_worker'],
  'app.licence_grace_days(text)': ['orvia_app', 'orvia_worker'],
  'app.licence_entitlement_codes(uuid)': ['orvia_app'],
  'app.licence_row_edition(uuid)': ['orvia_app'],
  'app.plan_usage()': ['orvia_app'],
  'app.licence_import_guard()': [],
  'app.file_intake_decided_once()': [],
  'app.serialize_licence_import()': [],
  'app.member_seats()': ['orvia_app'],
};
const assertions: Record<string, unknown>[] = [];
function check(name: string, actual: unknown, wanted: unknown) {
  const result = actual === wanted ? 'PASS' : 'FAIL';
  assertions.push({ name, actual, expected: wanted, result });
  console.log(`${result} ${name}`);
  if (result === 'FAIL') process.exitCode = 1;
}
try {
  const tx = await pool.connect();
  try {
    await tx.query('BEGIN READ ONLY');
    const roles=(await tx.query("SELECT rolname FROM pg_roles WHERE starts_with(rolname,'orvia_') AND NOT rolsuper ORDER BY rolname")).rows.map(r=>r.rolname as string);
    check('all installation runtime roles present',roles.length>=11,true);
    const identity = (await tx.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1')).rows[0];
    check('installation identity', identity?.installation_id, profile.installation_id);
    check('synthetic profile identity', identity?.profile, profile.profile);
    const tables = (await tx.query(`SELECT count(*)::int n,
      count(*) FILTER (WHERE NOT c.relrowsecurity OR NOT c.relforcerowsecurity)::int missing
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relkind IN ('r','p')`)).rows[0];
    check('223 application tables inspected (222 + file_intake_items, rev 1.12)', tables.n, 223);
    check('every application table enables and forces RLS', tables.missing, 0);
    for (const [fn, allowed] of Object.entries(expected)) {
      const present = (await tx.query('SELECT to_regprocedure($1) IS NOT NULL present', [fn])).rows[0].present;
      check(`${fn} exists`, present, true);
      if (!present) continue;
      const metadata=(await tx.query('SELECT prosecdef,proconfig FROM pg_proc WHERE oid=to_regprocedure($1)',[fn])).rows[0];
      check(fn+' pins search_path',metadata.proconfig?.some((v:string)=>v.startsWith('search_path=pg_catalog')),true);
      if(['app.effective_licence(uuid,uuid,uuid)','app.licence_names_entitlement(uuid,text)','app.licence_entitlement_codes(uuid)','app.licence_row_edition(uuid)','app.plan_usage()','app.licence_import_guard()','app.member_seats()'].includes(fn))check(fn+' SECURITY DEFINER',metadata.prosecdef,true);
      for (const role of roles) {
        const permitted = (await tx.query("SELECT has_function_privilege($1,$2,'EXECUTE') permitted", [role, fn])).rows[0].permitted;
        check(`${role} EXECUTE ${fn}`, permitted, allowed.includes(role));
      }
      const publicExecute = (await tx.query(`SELECT EXISTS(SELECT 1 FROM pg_proc p,
        LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
        WHERE p.oid=to_regprocedure($1) AND a.grantee=0 AND a.privilege_type='EXECUTE') permitted`, [fn])).rows[0].permitted;
      check(`PUBLIC EXECUTE ${fn}`, publicExecute, false);
    }
    await tx.query('COMMIT');
  } finally { tx.release(); }
} catch (error) { console.error(safeError(error)); process.exitCode = 1; }
finally {
  await pool.end();
  writeEvidence('function-acl', { assertions, result: process.exitCode ? 'FAIL' : 'PASS',
    prerequisite: 'Run auth-init and machine-init before this suite; no authority-changing SQL in this test.' });
  console.log(`${assertions.length} assertions, ${assertions.filter(a => a.result === 'FAIL').length} failures.`);
}
