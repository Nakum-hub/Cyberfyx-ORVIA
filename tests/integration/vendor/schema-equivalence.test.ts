// Vendor installation upgrade equivalence (task AUDIT-PRACTICE-01): the vendor-a00 database, reached by
// upgrading through every vendor migration over time, has exactly the schema of a vendor database migrated
// fresh - columns, constraints, indexes, policies, triggers, function bodies and row-level security.
// The fresh database is throwaway and dropped at the end; vendor-a00 is only read.
import { randomUUID } from 'node:crypto';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { applyVendorMigrations } from '../../../database/vendor/src/migrations.ts';
const p = loadProfile('codex-a00'); const fresh = `orvia_vendor_test_${randomUUID().replaceAll('-', '')}`;
const admin = connectDatabase({ ...p, database: 'postgres' }).pool; await admin.query(`CREATE DATABASE "${fresh}"`);
const Q = {
  columns: `SELECT table_schema,table_name,column_name,data_type,is_nullable,coalesce(column_default,'') FROM information_schema.columns WHERE table_schema IN ('vendor','vendor_auth','account_auth') ORDER BY 1,2,3`,
  constraints: `SELECT n.nspname,t.relname,c.conname,pg_get_constraintdef(c.oid) FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace n ON n.oid=t.relnamespace WHERE n.nspname IN ('vendor','vendor_auth','account_auth') ORDER BY 1,2,3`,
  indexes: `SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname IN ('vendor','vendor_auth','account_auth') ORDER BY 1,2,3`,
  policies: `SELECT schemaname,tablename,policyname,cmd,coalesce(qual,''),coalesce(with_check,'') FROM pg_policies WHERE schemaname IN ('vendor','vendor_auth','account_auth') ORDER BY 1,2,3`,
  triggers: `SELECT event_object_schema,event_object_table,trigger_name,event_manipulation,action_timing FROM information_schema.triggers WHERE event_object_schema IN ('vendor','vendor_auth','account_auth') ORDER BY 1,2,3,4`,
  functions: `SELECT p.proname, md5(pg_get_functiondef(p.oid)) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='vendor' ORDER BY 1,2`,
  rls: `SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('vendor','vendor_auth','account_auth') AND c.relkind='r' ORDER BY 1`,
};
const snap = async (db: string, migrate: boolean) => { const pool = connectDatabase({ ...p, database: db }).pool; const c = await pool.connect();
  try { if (migrate) await applyVendorMigrations(c, randomUUID()); const out: Record<string, string[]> = {};
    for (const [k, q] of Object.entries(Q)) out[k] = (await c.query(q)).rows.map(r => JSON.stringify(Object.values(r))); return out; } finally { c.release(); await pool.end(); } };
try {
  const a = await snap('orvia_vendor_a00', false); const b = await snap(fresh, true);
  let failed = 0;
  for (const k of Object.keys(Q)) { const onlyA = a[k]!.filter(x => !b[k]!.includes(x)); const onlyB = b[k]!.filter(x => !a[k]!.includes(x));
    if (onlyA.length || onlyB.length) failed++;
    console.log(`${onlyA.length || onlyB.length ? 'FAIL' : 'PASS'} upgraded and fresh ${k} match (${a[k]!.length}/${b[k]!.length})${onlyA.length || onlyB.length ? ` upgraded-only=${JSON.stringify(onlyA).slice(0, 600)} fresh-only=${JSON.stringify(onlyB).slice(0, 600)}` : ''}`); }
  if ((await (async () => { const pool = connectDatabase({ ...p, database: 'orvia_vendor_a00' }).pool; try { return (await pool.query('SELECT count(*)::int AS n FROM public.vendor_migrations')).rows[0].n; } finally { await pool.end(); } })()) === 0) { failed++; console.log('FAIL vendor-a00 has no migration ledger'); }
  console.log(`\nvendor-schema-equivalence: ${Object.keys(Q).length - failed}/${Object.keys(Q).length} passed`); process.exitCode = failed ? 1 : 0;
} finally { await admin.query(`DROP DATABASE "${fresh}" WITH (FORCE)`); await admin.end(); }
