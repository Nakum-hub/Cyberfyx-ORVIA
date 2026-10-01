import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { SERVER_ONLY_FUNCTIONS, RUNTIME_ROLES } from '../../database/customer/src/server-only.ts';
const profile = loadProfile();
assert.equal(profile.profile, 'codex-a00');
const { pool } = connectDatabase(profile);
try {
  const tables = (await pool.query(`SELECT c.relname, c.relrowsecurity, c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relkind IN ('r','p') ORDER BY c.relname`)).rows;
  const privileges = [];
  for (const fn of SERVER_ONLY_FUNCTIONS) for (const role of RUNTIME_ROLES) {
    const row = (await pool.query('SELECT has_function_privilege($1,$2,\'EXECUTE\') permitted', [role, fn])).rows[0];
    privileges.push({ role, function: fn, ...row });
  }
  const evidence = { profile: profile.profile, checked_at: new Date().toISOString(), tables, privileges };
  writeFileSync('handoffs/codex/artifacts/R8-database-security-after-init.json', JSON.stringify(evidence, null, 2));
  assert.ok(tables.length > 0);
  assert.deepEqual(tables.filter(t => !t.relrowsecurity || !t.relforcerowsecurity), [], 'Every app table must enable and force RLS');
  assert.deepEqual(privileges.filter(p => p.permitted), [], 'No runtime role may execute protected server commands');
  console.log(JSON.stringify({ tables_checked: tables.length, privileges_checked: privileges.length, result: 'PASS' }));
} finally { await pool.end(); }
