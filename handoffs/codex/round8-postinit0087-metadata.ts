// Explicit read-only structural/security metadata. No row values, SQL text,
// credentials or customer identifiers emitted. Parent runs after init reruns.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {writeFileSync} from 'node:fs';
import {loadProfile} from '../../shared/testing/src/config.ts';
import {SERVER_ONLY_FUNCTIONS,RUNTIME_ROLES} from '../../database/customer/src/server-only.ts';
const pg=createRequire(new URL('../../database/customer/package.json',import.meta.url))('pg') as typeof import('pg');
const profile=loadProfile();assert.equal(profile.profile,'codex-a00');
const label=process.argv[2];assert.equal(process.argv.length,3);
assert.match(label??'',/^[a-z0-9][a-z0-9-]{0,59}$/);
const artifact=`handoffs/codex/artifacts/R8-${label}-postinit0087-metadata.json`;
writeFileSync(artifact,'',{flag:'wx'});
const output:Record<string,unknown>={diagnostic_only:true,profile:profile.profile,started_at:new Date().toISOString(),checks:[]};
const checks=output.checks as {name:string,result:'PASS'|'FAIL'}[];
function check(name:string,condition:boolean){checks.push({name,result:condition?'PASS':'FAIL'});assert.ok(condition,name);}
const pool=new pg.Pool({host:'127.0.0.1',port:profile.postgres_port,database:profile.database,user:'orvia_migrator',password:profile.password,max:1,connectionTimeoutMillis:3000,query_timeout:3000,statement_timeout:2000,options:'-c default_transaction_read_only=on',application_name:'orvia-round8-postinit0087-metadata'});
try{
 const client=await pool.connect();try{
  await client.query('BEGIN READ ONLY');
  const identity=(await client.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1')).rows;
  check('own installation and profile',identity.length===1&&identity[0].installation_id===profile.installation_id&&identity[0].profile===profile.profile);
  const tables=(await client.query(`SELECT count(*)::int AS tables_checked,count(*) FILTER(WHERE NOT c.relrowsecurity OR NOT c.relforcerowsecurity)::int AS missing_enable_or_force FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='app' AND c.relkind IN('r','p')`)).rows[0];
  output.rls=tables;check('exact current220 application tables all enable and force RLS',tables.tables_checked===220&&tables.missing_enable_or_force===0);
  const privileges=[];
  for(const fn of SERVER_ONLY_FUNCTIONS)for(const role of RUNTIME_ROLES){
   const row=(await client.query(`SELECT to_regprocedure($2) IS NOT NULL AS present,has_function_privilege($1,$2,'EXECUTE') AS permitted`,[role,fn])).rows[0];
   privileges.push({role,function:fn,...row});
  }
  output.protected_function_acl=privileges;
  check('all10 protected function-runtime role controls exist and deny EXECUTE',privileges.length===10&&privileges.every(row=>row.present===true&&row.permitted===false));
  const columns=(await client.query(`SELECT c.relname AS table_name,a.attname AS column_name,a.atttypid::regtype::text AS data_type,a.attnotnull AS not_null,pg_get_expr(d.adbin,d.adrelid) AS column_default
   FROM pg_attribute a JOIN pg_class c ON c.oid=a.attrelid JOIN pg_namespace n ON n.oid=c.relnamespace LEFT JOIN pg_attrdef d ON d.adrelid=a.attrelid AND d.adnum=a.attnum
   WHERE n.nspname='app' AND NOT a.attisdropped AND ((c.relname='action_verifications' AND a.attname='verification_transaction') OR(c.relname='evidence_records' AND a.attname='recorded_transaction')) ORDER BY c.relname,a.attname`)).rows;
  output.proof_columns=columns;
  check('both proof columns nullable xid8 with current full-transaction default',columns.length===2&&columns.every(row=>row.data_type==='xid8'&&row.not_null===false&&/^((pg_catalog\.)?pg_current_xact_id\(\))$/.test(row.column_default??'')));
  const names=['stamp_verification_transaction','stamp_evidence_transaction','downstream_action_guard'];
  const functions=(await client.query(`SELECT p.proname,p.pronargs,p.prosecdef,p.prorettype::regtype::text AS return_type,l.lanname,
    EXISTS(SELECT 1 FROM aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE') AS public_execute
    FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_language l ON l.oid=p.prolang WHERE n.nspname='app' AND p.proname=ANY($1::text[]) ORDER BY p.proname`,[names])).rows;
  output.proof_functions=functions;
  check('exact3 expected functions invoker trigger-return no-args PLpgSQL PUBLIC denied',functions.length===3&&functions.every(row=>row.pronargs===0&&row.prosecdef===false&&row.return_type==='trigger'&&row.lanname==='plpgsql'&&row.public_execute===false));
  const expected=[
   {table:'action_verifications',trigger:'verification_transaction_stamp',fn:'stamp_verification_transaction',type:7},
   {table:'evidence_records',trigger:'evidence_transaction_stamp',fn:'stamp_evidence_transaction',type:7},
   {table:'downstream_actions',trigger:'action_guard',fn:'downstream_action_guard',type:19},
   {table:'action_verifications',trigger:'verifications_append_only',fn:'append_only_history',type:27},
   {table:'evidence_records',trigger:'evidence_append_only',fn:'append_only_history',type:27},
  ];
  const triggers=(await client.query(`SELECT c.relname AS table_name,t.tgname,t.tgenabled,t.tgtype::int,t.tgnargs::int AS trigger_args,t.tgqual IS NULL AS unconditional,t.tgconstraint=0 AS ordinary_trigger,p.proname,p.pronargs,p.prosecdef,nf.nspname AS function_schema,p.prorettype::regtype::text AS return_type
   FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace JOIN pg_proc p ON p.oid=t.tgfoid JOIN pg_namespace nf ON nf.oid=p.pronamespace
   WHERE n.nspname='app' AND NOT t.tgisinternal AND t.tgname=ANY($1::text[]) ORDER BY c.relname,t.tgname`,[expected.map(row=>row.trigger)])).rows;
  output.proof_triggers=triggers;
  check('all5 exact expected enabled unconditional row BEFORE INSERT/UPDATE/DELETE trigger bindings',triggers.length===expected.length&&expected.every(want=>triggers.some(row=>row.table_name===want.table&&row.tgname===want.trigger&&row.proname===want.fn&&row.function_schema==='app'&&row.tgtype===want.type&&row.tgenabled==='O'&&row.trigger_args===0&&row.unconditional===true&&row.ordinary_trigger===true&&row.pronargs===0&&row.prosecdef===false&&row.return_type==='trigger')));
  await client.query('COMMIT');output.exit_code=0;output.result='PASS';
 }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}finally{client.release();}
}catch(error){output.error_class=error instanceof Error?error.name:'UnknownError';const code=(error as {code?:unknown})?.code;if(typeof code==='string'&&/^[0-9A-Z_]{1,40}$/.test(code))output.error_code=code;output.exit_code=1;output.result='FAIL';process.exitCode=1;}
finally{await pool.end();output.completed_at=new Date().toISOString();writeFileSync(artifact,JSON.stringify(output,null,2)+'\n');console.log(JSON.stringify({artifact,result:output.result,exit_code:output.exit_code}));}
