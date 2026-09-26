// Upgrade of an existing V1 installation to the DPDP extension.
//
// A throwaway database is migrated to the last V1 migration (0036), loaded with
// the V1 rows already present in this synthetic profile (only the columns that
// existed at 0036), and then upgraded through 0037 onwards exactly as an
// installed customer database would be. It proves that the upgrade applies over
// real V1 data, that no existing V1 value is changed by it, that the upgraded
// schema matches a fresh installation, and that re-running is a no-op.
// The throwaway database is dropped at the end; the profile database is only read.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { applyMigrations, migrationIds } from '../../../database/customer/src/migrations.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';

const LAST_V1 = '0036_portal_rights_intake';
const profile = loadProfile();
if (!['codex-a00', 'ui-b00'].includes(profile.profile)) throw new Error('Synthetic codex-a00/ui-b00 profile only');
const client = (database: string) => new pg.Client({ host: '127.0.0.1', port: profile.postgres_port, database, user: 'orvia_migrator', password: profile.password, application_name: 'orvia-upgrade-check' });
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, JSON.stringify({ expected, actual }).slice(0, 2000)); throw new Error('Assertion failed: ' + name); }
}
const q = (name: string) => name.split('.').map(part => `"${part.replaceAll('"', '""')}"`).join('.');

const TABLES = `SELECT table_schema||'.'||table_name AS name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1`;
const COLUMNS = `SELECT column_name FROM information_schema.columns WHERE table_schema||'.'||table_name=$1 AND is_generated='NEVER' AND (identity_generation IS NULL OR identity_generation<>'ALWAYS') ORDER BY ordinal_position`;
async function fingerprint(c: pg.Client, table: string, columns: string[]) {
  const cols = columns.map(x => q(x)).join(',');
  const r = await c.query(`SELECT count(*)::int n, md5(coalesce(string_agg(t::text,'|' ORDER BY t::text),'')) h FROM (SELECT ${cols} FROM ${q(table)}) t`);
  return `${r.rows[0].n}:${r.rows[0].h}`;
}
/** A comparable description of the schema: columns, constraints, indexes, policies and triggers. */
async function schemaShape(c: pg.Client) {
  const rows = async (sql: string) => (await c.query(sql)).rows.map(r => Object.values(r).join(' ')).sort();
  return {
    columns: await rows(`SELECT table_schema,table_name,column_name,data_type,is_nullable,coalesce(column_default,'') FROM information_schema.columns WHERE table_schema NOT IN ('pg_catalog','information_schema')`),
    constraints: await rows(`SELECT n.nspname,t.relname,c.conname,pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname NOT IN ('pg_catalog','information_schema')`),
    indexes: await rows(`SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog','information_schema')`),
    policies: await rows(`SELECT schemaname,tablename,policyname,cmd,coalesce(qual,''),coalesce(with_check,'') FROM pg_policies`),
    triggers: await rows(`SELECT event_object_schema,event_object_table,trigger_name,event_manipulation,action_timing FROM information_schema.triggers`),
  };
}

const name = `orvia_upgrade_${randomUUID().replaceAll('-', '').slice(0, 12)}`;
const admin = client(profile.database); const source = client(profile.database);
let target: pg.Client | null = null; let created = false;
const summary: Record<string, unknown> = {};
try {
  await admin.connect(); await source.connect();
  await admin.query(`CREATE DATABASE ${q(name)}`); created = true;
  target = client(name); await target.connect();

  const v1 = await applyMigrations(target, profile, { through: LAST_V1 });
  check('the throwaway database is migrated to the last V1 migration', v1.at(-1), LAST_V1);
  const v1Tables = (await target.query(TABLES)).rows.map(r => r.name as string).filter(t => t !== 'public.bootstrap_migrations' && t !== 'public.bootstrap_profile');

  // Load V1 rows from the profile, column by column as they existed at 0036.
  // Triggers and foreign keys are suspended only for the load itself, because
  // the source also holds rows written by later releases.
  const loaded: Record<string, number> = {};
  await target.query(`SET session_replication_role = replica`);
  for (const table of v1Tables) {
    const columns = (await target.query(COLUMNS, [table])).rows.map(r => r.column_name as string);
    const present = new Set((await source.query(COLUMNS, [table])).rows.map(r => r.column_name as string));
    const shared = columns.filter(c => present.has(c));
    if (!shared.length) continue;
    const cols = shared.map(x => q(x)).join(',');
    let offset = 0; loaded[table] = 0;
    for (;;) {
      const batch = (await source.query(`SELECT coalesce(json_agg(t),'[]'::json) j FROM (SELECT ${cols} FROM ${q(table)} ORDER BY ${cols} LIMIT 1000 OFFSET ${offset}) t`)).rows[0].j as unknown[];
      if (!batch.length) break;
      await target.query(`INSERT INTO ${q(table)} (${cols}) SELECT ${cols} FROM json_populate_recordset(null::${q(table)}, $1::json)`, [JSON.stringify(batch)]);
      loaded[table] += batch.length; offset += batch.length;
      if (batch.length < 1000) break;
    }
  }
  await target.query(`SET session_replication_role = origin`);
  const rowCount = Object.values(loaded).reduce((a, b) => a + b, 0);
  summary.v1_tables = v1Tables.length; summary.v1_rows_loaded = rowCount;
  check('V1 tables hold real V1 rows before the upgrade', rowCount > 0, true);

  const before: Record<string, string> = {}; const v1Columns: Record<string, string[]> = {};
  for (const table of v1Tables) { v1Columns[table] = (await target.query(COLUMNS, [table])).rows.map(r => r.column_name as string); before[table] = await fingerprint(target, table, v1Columns[table]!); }

  const upgraded = await applyMigrations(target, profile);
  const expectedUpgrade = migrationIds().slice(migrationIds().indexOf(LAST_V1) + 1);
  check('the upgrade applies every later migration over V1 data, in order', upgraded, expectedUpgrade);
  summary.upgrade_migrations = upgraded;

  const changed: string[] = [];
  for (const table of v1Tables) if (await fingerprint(target, table, v1Columns[table]!) !== before[table]) changed.push(table);
  check('no existing V1 row or value is changed by the upgrade', changed, []);

  const [fresh, upgradedShape] = [await schemaShape(source), await schemaShape(target)];
  for (const part of Object.keys(fresh) as (keyof typeof fresh)[]) {
    const missing = fresh[part].filter(x => !upgradedShape[part].includes(x)); const extra = upgradedShape[part].filter(x => !fresh[part].includes(x));
    check(`the upgraded schema has the same ${part} as a fresh installation`, { missing: missing.slice(0, 10), extra: extra.slice(0, 10) }, { missing: [], extra: [] });
  }
  check('running the migrations again applies nothing', await applyMigrations(target, profile), []);
} catch (error) {
  if (!assertions.some(a => a.result === 'FAIL')) assertions.push({ name: 'unexpected failure', result: 'FAIL', expected: 'no error', actual: error instanceof Error ? error.message.slice(0, 500) : 'unknown' });
  console.error(safeError(error), error instanceof Error ? error.message.slice(0, 500) : '');
} finally {
  await target?.end().catch(() => undefined);
  if (created) await admin.query(`DROP DATABASE ${q(name)}`).catch(() => undefined);
  await admin.end().catch(() => undefined); await source.end().catch(() => undefined);
  const failures = assertions.filter(a => a.result === 'FAIL').length;
  writeEvidence('migration-upgrade', { profile: profile.profile, from: LAST_V1, ...summary, assertions, passed: assertions.length - failures, failures, throwaway_database_dropped: created });
  console.log(`\n${assertions.length} assertions, ${failures} failures.`);
  if (failures) process.exitCode = 1;
}
