import assert from 'node:assert/strict';import { writeFileSync } from 'node:fs';
import { loadProfile } from '../../shared/testing/src/config.ts';import { connectDatabase } from '../../database/customer/src/index.ts';
const profile=loadProfile();assert.equal(profile.profile,'codex-a00');const {pool}=connectDatabase(profile);const tx=await pool.connect();const results:unknown[]=[];
try {
 await tx.query('BEGIN');
 const triggers=(await tx.query(`SELECT c.relname,pg_get_triggerdef(t.oid) definition,encode(t.tgargs,'escape') arguments FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND t.tgname='immutable_list_timestamp' ORDER BY c.relname`)).rows;
 assert.equal(triggers.length,30);
 for(let i=0;i<triggers.length;i++) {
  const row=triggers[i];const stamp=String(row.arguments).split('\\000')[0]!;assert.ok(['recorded_at','created_at','inserted_at'].includes(stamp));const table=`r8_guard_${i}`;
  await tx.query(`CREATE TEMP TABLE ${table}(id int,${stamp} timestamptz DEFAULT clock_timestamp())`);
  await tx.query(`INSERT INTO ${table} VALUES(1,NULL),(2,'2026-01-01T00:00:00Z')`);
  await tx.query(`CREATE TRIGGER immutable_list_timestamp BEFORE INSERT OR UPDATE ON ${table} FOR EACH ROW EXECUTE FUNCTION app.immutable_list_timestamp('${stamp}')`);
  for(const sql of [`UPDATE ${table} SET ${stamp}=clock_timestamp() WHERE id=1`,`UPDATE ${table} SET ${stamp}=clock_timestamp() WHERE id=2`,`INSERT INTO ${table} VALUES(3,NULL)`]) {
   await tx.query('SAVEPOINT guard_case');let code='NONE';try{await tx.query(sql);}catch(e){code=(e as {code:string}).code;}await tx.query('ROLLBACK TO SAVEPOINT guard_case');assert.equal(code,'23514');
  }
  await tx.query(`UPDATE ${table} SET id=4 WHERE id=1`);
  await tx.query(`INSERT INTO ${table}(id) VALUES(5)`);
  assert.equal((await tx.query(`SELECT ${stamp} IS NOT NULL present FROM ${table} WHERE id=5`)).rows[0].present,true);
  results.push({table:row.relname,timestamp:stamp,definition:row.definition,legacy_immutable:'PASS',timestamp_immutable:'PASS',explicit_null_refused:'PASS',ordinary_update_and_default_insert:'PASS'});
 }
 console.log(JSON.stringify({tables:results.length,adverse_assertions:results.length*3,ordinary_controls:results.length*2,result:'PASS',fixtures:'ROLLBACK'}));
} finally {await tx.query('ROLLBACK');tx.release();await pool.end();writeFileSync('handoffs/codex/artifacts/R8-timestamp-guard-checks.json',JSON.stringify(results,null,2));}
