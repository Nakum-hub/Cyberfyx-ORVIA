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
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { applyMigrations, migrationIds } from '../../../database/customer/src/migrations.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';

const LAST_V1 = '0036_portal_rights_intake';
const profile = loadProfile();
if (!['codex-a00', 'ui-b00'].includes(profile.profile)) throw new Error('Synthetic codex-a00/ui-b00 profile only');
/** One dedicated connection to a database; session settings persist on it. */
type Conn = { query: (sql: string, values?: unknown[]) => Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>; end: () => Promise<void> };
async function client(database: string): Promise<Conn & { raw: Parameters<typeof applyMigrations>[0] }> {
  const pool = connectDatabase({ ...profile, database }).pool;
  const c = await pool.connect();
  return { raw: c, query: (sql, values) => c.query(sql, values as unknown[]) as never, end: async () => { c.release(); await pool.end(); } };
}
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, JSON.stringify({ expected, actual }).slice(0, 2000)); throw new Error('Assertion failed: ' + name); }
}
const q = (name: string) => name.split('.').map(part => `"${part.replaceAll('"', '""')}"`).join('.');

const TABLES = `SELECT table_schema||'.'||table_name AS name FROM information_schema.tables WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') ORDER BY 1`;
const COLUMNS = `SELECT column_name FROM information_schema.columns WHERE table_schema||'.'||table_name=$1 AND is_generated='NEVER' AND (identity_generation IS NULL OR identity_generation<>'ALWAYS') ORDER BY ordinal_position`;
async function fingerprint(c: Conn, table: string, columns: string[]) {
  const cols = columns.map(x => q(x)).join(',');
  const r = await c.query(`SELECT count(*)::int n, md5(coalesce(string_agg(t::text,'|' ORDER BY t::text),'')) h FROM (SELECT ${cols} FROM ${q(table)}) t`);
  return `${r.rows[0]!.n}:${r.rows[0]!.h}`;
}
/** A comparable description of the schema: columns, constraints, indexes, policies and triggers. */
async function schemaShape(c: Conn) {
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
let admin: Conn | null = null; let source: Conn | null = null;
let target: Awaited<ReturnType<typeof client>> | null = null; let created = false;
const summary: Record<string, unknown> = {};
try {
  admin = await client(profile.database); source = await client(profile.database);
  await admin.query(`CREATE DATABASE ${q(name)}`); created = true;
  target = await client(name);

  const v1 = await applyMigrations(target.raw, profile, { through: LAST_V1 });
  check('the throwaway database is migrated to the last V1 migration', v1.at(-1), LAST_V1);
  const v1Tables = (await target.query(TABLES)).rows.map(r => r.name as string).filter(t => t !== 'public.bootstrap_migrations' && t !== 'public.bootstrap_profile');

  // Load V1 rows from the profile, column by column as they existed at 0036.
  // Triggers and foreign keys are suspended only for the load itself, because
  // the source also holds rows written by later releases.
  const loaded: Record<string, number> = {}; const skipped: Record<string, number> = {};
  await target.query('BEGIN');
  await target.query(`SET LOCAL session_replication_role = replica`);
  for (const table of v1Tables) {
    const columns = (await target.query(COLUMNS, [table])).rows.map(r => r.column_name as string);
    const present = new Set((await source.query(COLUMNS, [table])).rows.map(r => r.column_name as string));
    const shared = columns.filter(c => present.has(c));
    if (!shared.length) continue;
    const cols = shared.map(x => q(x)).join(',');
    let offset = 0; loaded[table] = 0;
    for (;;) {
      const batch = (await source.query(`SELECT coalesce(json_agg(t),'[]'::json) j FROM (SELECT ${cols} FROM ${q(table)} ORDER BY ${cols} LIMIT 1000 OFFSET ${offset}) t`)).rows[0]!.j as unknown[];
      if (!batch.length) break;
      const insert = (rows: unknown[]) => target!.query(`INSERT INTO ${q(table)} (${cols}) SELECT ${cols} FROM json_populate_recordset(null::${q(table)}, $1::json)`, [JSON.stringify(rows)]);
      await target.query('SAVEPOINT batch');
      try { await insert(batch); await target.query('RELEASE SAVEPOINT batch'); loaded[table] += batch.length; }
      catch {
        // Some rows were written by later releases and hold values the 0036
        // schema rejects (for example a coverage-gap source added in 0046); such
        // a row cannot exist in a real 0036 database, so it is skipped and counted.
        await target.query('ROLLBACK TO SAVEPOINT batch');
        for (const row of batch) {
          await target.query('SAVEPOINT one');
          try { await insert([row]); await target.query('RELEASE SAVEPOINT one'); loaded[table] += 1; }
          catch { await target.query('ROLLBACK TO SAVEPOINT one'); skipped[table] = (skipped[table] ?? 0) + 1; }
        }
      }
      offset += batch.length;
      if (batch.length < 1000) break;
    }
  }
  await target.query('COMMIT');
  const rowCount = Object.values(loaded).reduce((a, b) => a + b, 0);
  summary.v1_tables = v1Tables.length; summary.v1_rows_loaded = rowCount; summary.rows_skipped_as_later_release_data = skipped;
  check('V1 tables hold real V1 rows before the upgrade', rowCount > 0, true);

  const before: Record<string, string> = {}; const v1Columns: Record<string, string[]> = {};
  for (const table of v1Tables) { v1Columns[table] = (await target.query(COLUMNS, [table])).rows.map(r => r.column_name as string); before[table] = await fingerprint(target, table, v1Columns[table]!); }

  const upgraded = await applyMigrations(target.raw, profile);
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
  check('running the migrations again applies nothing', await applyMigrations(target.raw, profile), []);
} catch (error) {
  if (!assertions.some(a => a.result === 'FAIL')) assertions.push({ name: 'unexpected failure', result: 'FAIL', expected: 'no error', actual: error instanceof Error ? error.message.slice(0, 500) : 'unknown' });
  console.error(safeError(error), error instanceof Error ? error.message.slice(0, 500) : '');
} finally {
  await target?.end().catch(() => undefined);
  if (created) await admin?.query(`DROP DATABASE ${q(name)}`).catch(() => undefined);
  await admin?.end().catch(() => undefined); await source?.end().catch(() => undefined);
  const failures = assertions.filter(a => a.result === 'FAIL').length;
  writeEvidence('migration-upgrade', { profile: profile.profile, from: LAST_V1, ...summary, assertions, passed: assertions.length - failures, failures, throwaway_database_dropped: created });
  console.log(`\n${assertions.length} assertions, ${failures} failures.`);
  if (failures) process.exitCode = 1;
}
