import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { intimationsDue } from '../../backend/domain/src/registry/retention.ts';
import type { Context } from '../../backend/domain/src/shared/transaction.ts';
import { AccessError } from '../../backend/authorization/src/index.ts';
const mode=process.argv[2]==='before'?'before':'after';
const label=process.env.R8_PAGE_CHECK_LABEL??mode;assert.match(label,/^[a-z0-9-]+$/);
const artifact=`handoffs/codex/artifacts/R8-composite-pagination-${label}.json`;
assert.equal(existsSync(artifact),false,'Use a new R8_PAGE_CHECK_LABEL; old evidence must not be overwritten');
const file='backend/domain/src/registry/retention.ts';
const source=mode==='before'?spawnSync('git',['show',`b24b3fb:${file}`],{encoding:'utf8',maxBuffer:4000000}).stdout:readFileSync(file,'utf8');
const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let sql='';
function visit(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==='intimationsDue'){function find(p:ts.Node){if(ts.isNoSubstitutionTemplateLiteral(p)&&p.text.includes('FROM app.retention_states'))sql=p.text;ts.forEachChild(p,find);}find(n);}ts.forEachChild(n,visit);}visit(ast);assert.ok(sql);
const profile=loadProfile();assert.equal(profile.profile,'codex-a00');const {pool}=connectDatabase(profile);const tx=await pool.connect();
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;const scope=[id(11),id(12),id(13)];const requirement='DPDP-RETENTION-THIRD-SCHEDULE';
const result:{mode:string;plan?:unknown;actual?:string[];result?:string;failure?:string;checks:{name:string;result:string;failure?:string}[]}={mode,checks:[]};
async function check(name:string,work:()=>unknown|Promise<unknown>) {
 try {await work();result.checks.push({name,result:'PASS'});}
 catch(e){result.checks.push({name,result:'FAIL',failure:(e as Error).message});}
}
try {
 await check('candidate malformed cursors refuse before any SQL',async()=>{
  let queries=0;
  const context={tx:{query:async()=>{queries++;throw new Error('Malformed cursor reached SQL');}}} as unknown as Context;
  for(const cursor of ['not-a-pair',`${id(1)}:not-uuid`,`${id(1)}:${id(2)}:extra`,`${id(1)}:`]) {
   await assert.rejects(intimationsDue(context,{limit:2,cursor}),error=>error instanceof AccessError&&error.status===400&&error.code==='VALIDATION_ERROR'&&error.fieldErrors?.some(f=>f.field==='cursor'&&f.code==='invalid_cursor')===true);
  }
  assert.equal(queries,0);
 });
 await tx.query('BEGIN');result.plan=(await tx.query('EXPLAIN (FORMAT JSON) '+sql,[...scope,requirement,null,2])).rows[0]['QUERY PLAN'];
 for(const table of ['retention_states','retention_rules']){await tx.query(`CREATE TEMP TABLE r8_${table} AS SELECT * FROM app.${table} WITH NO DATA`);sql=sql.replaceAll(`app.${table}`,`pg_temp.r8_${table}`);}
 for(const rule of [id(1),id(2)])await tx.query('INSERT INTO r8_retention_rules(tenant_id,legal_entity_id,environment_id,id,name,requirement_id) VALUES($1,$2,$3,$4,$5,$6)',[...scope,rule,'Synthetic rule',requirement]);
 const pairs=[[id(9),id(1),null],[id(2),id(2),'2026-01-02T00:00:00Z'],[id(2),id(1),'2026-01-02T00:00:00Z'],[id(8),id(1),'2026-01-03T00:00:00Z']];
 for(const [subject,rule,stamp] of pairs)await tx.query(`INSERT INTO r8_retention_states(tenant_id,legal_entity_id,environment_id,subject_id,rule_id,inserted_at,eligible_at,state) VALUES($1,$2,$3,$4,$5,$6,'2026-01-05T00:00:00Z','ELIGIBLE')`,[...scope,subject,rule,stamp]);
 // These anchors exist, but none belongs to the requested eligible collection.
 await tx.query('INSERT INTO r8_retention_rules(tenant_id,legal_entity_id,environment_id,id,name,requirement_id) VALUES($1,$2,$3,$4,$5,$6)',[id(21),...scope.slice(1),id(1),'Foreign synthetic rule',requirement]);
 await tx.query('INSERT INTO r8_retention_rules(tenant_id,legal_entity_id,environment_id,id,name,requirement_id) VALUES($1,$2,$3,$4,$5,$6)',[...scope,id(3),'Other synthetic requirement','OTHER-REQUIREMENT']);
 for(const [tenant,subject,rule,state,eligible] of [[id(21),id(7),id(1),'ELIGIBLE','2026-01-05T00:00:00Z'],[scope[0],id(6),id(1),'ERASED','2026-01-05T00:00:00Z'],[scope[0],id(5),id(3),'ELIGIBLE','2026-01-05T00:00:00Z'],[scope[0],id(4),id(1),'ELIGIBLE',null]]) {
  await tx.query('INSERT INTO r8_retention_states(tenant_id,legal_entity_id,environment_id,subject_id,rule_id,inserted_at,eligible_at,state) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[tenant,...scope.slice(1),subject,rule,'2026-01-04T00:00:00Z',eligible,state]);
 }
 const first=(await tx.query(sql,[...scope,requirement,null,2])).rows;const cursor=(row:Record<string,string>)=>`${row.subject_id}:${row.rule_id}`;
 const second=(await tx.query(sql,[...scope,requirement,cursor(first.at(-1)),2])).rows;
 result.actual=[...first,...second].map(cursor);
 const expected=[`${id(8)}:${id(1)}`,`${id(2)}:${id(2)}`,`${id(2)}:${id(1)}`,`${id(9)}:${id(1)}`];
 await check('descending insertion chronology, composite ties and legacy unknown',()=>assert.deepEqual(result.actual,expected));
 await check('terminal eligible anchor',async()=>assert.equal((await tx.query(sql,[...scope,requirement,expected.at(-1),2])).rowCount,0));
 for(const [name,anchor] of [['unknown anchor',`${id(99)}:${id(1)}`],['existing foreign-scope anchor',`${id(7)}:${id(1)}`],['existing erased anchor',`${id(6)}:${id(1)}`],['existing wrong-requirement anchor',`${id(5)}:${id(3)}`],['existing null-eligibility anchor',`${id(4)}:${id(1)}`]]) {
  await check(name!,async()=>assert.equal((await tx.query(sql,[...scope,requirement,anchor,2])).rowCount,0));
 }
 // Mutable eligibility dates must not move a row within insertion chronology.
 await tx.query('UPDATE r8_retention_states SET eligible_at=\'2030-01-01T00:00:00Z\' WHERE subject_id=$1',[id(9)]);
 await check('mutable eligibility preserves insertion order',async()=>assert.deepEqual((await tx.query(sql,[...scope,requirement,null,2])).rows.map(cursor),expected.slice(0,2)));
 result.result=result.checks.some(check=>check.result==='FAIL')?'FAIL':'PASS';
 process.exitCode=result.result==='FAIL'?1:0;
 console.log(JSON.stringify({mode,result:result.result,checks:result.checks}));
}catch(e){result.result='FAIL';result.failure=(e as Error).message;console.log(JSON.stringify({mode,result:'FAIL',failure:result.failure}));process.exitCode=1;}
finally {await tx.query('ROLLBACK');tx.release();await pool.end();writeFileSync(artifact,JSON.stringify(result,null,2),{flag:'wx'});}
