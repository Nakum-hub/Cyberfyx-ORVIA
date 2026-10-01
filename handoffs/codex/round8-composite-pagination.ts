import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import ts from 'typescript';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
const mode=process.argv[2]==='before'?'before':'after';
const file='backend/domain/src/registry/retention.ts';
const source=mode==='before'?spawnSync('git',['show',`b24b3fb:${file}`],{encoding:'utf8',maxBuffer:4000000}).stdout:readFileSync(file,'utf8');
const ast=ts.createSourceFile(file,source,ts.ScriptTarget.Latest,true);let sql='';
function visit(n:ts.Node){if(ts.isFunctionDeclaration(n)&&n.name?.text==='intimationsDue'){function find(p:ts.Node){if(ts.isNoSubstitutionTemplateLiteral(p)&&p.text.includes('FROM app.retention_states'))sql=p.text;ts.forEachChild(p,find);}find(n);}ts.forEachChild(n,visit);}visit(ast);assert.ok(sql);
const profile=loadProfile();assert.equal(profile.profile,'codex-a00');const {pool}=connectDatabase(profile);const tx=await pool.connect();
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;const scope=[id(11),id(12),id(13)];const requirement='DPDP-RETENTION-THIRD-SCHEDULE';
const result:{mode:string;plan?:unknown;actual?:string[];result?:string;failure?:string}={mode};
try {
 await tx.query('BEGIN');result.plan=(await tx.query('EXPLAIN (FORMAT JSON) '+sql,[...scope,requirement,null,2])).rows[0]['QUERY PLAN'];
 for(const table of ['retention_states','retention_rules']){await tx.query(`CREATE TEMP TABLE r8_${table} AS SELECT * FROM app.${table} WITH NO DATA`);sql=sql.replaceAll(`app.${table}`,`pg_temp.r8_${table}`);}
 for(const rule of [id(1),id(2)])await tx.query('INSERT INTO r8_retention_rules(tenant_id,legal_entity_id,environment_id,id,name,requirement_id) VALUES($1,$2,$3,$4,$5,$6)',[...scope,rule,'Synthetic rule',requirement]);
 const pairs=[[id(9),id(1),null],[id(2),id(2),'2026-01-02T00:00:00Z'],[id(2),id(1),'2026-01-02T00:00:00Z'],[id(8),id(1),'2026-01-03T00:00:00Z']];
 for(const [subject,rule,stamp] of pairs)await tx.query(`INSERT INTO r8_retention_states(tenant_id,legal_entity_id,environment_id,subject_id,rule_id,inserted_at,eligible_at,state) VALUES($1,$2,$3,$4,$5,$6,'2026-01-05T00:00:00Z','ELIGIBLE')`,[...scope,subject,rule,stamp]);
 const first=(await tx.query(sql,[...scope,requirement,null,2])).rows;const cursor=(row:Record<string,string>)=>`${row.subject_id}:${row.rule_id}`;
 const second=(await tx.query(sql,[...scope,requirement,cursor(first.at(-1)),2])).rows;
 result.actual=[...first,...second].map(cursor);
 assert.deepEqual(result.actual,[`${id(8)}:${id(1)}`,`${id(2)}:${id(2)}`,`${id(2)}:${id(1)}`,`${id(9)}:${id(1)}`]);
 assert.equal((await tx.query(sql,[...scope,requirement,result.actual.at(-1),2])).rowCount,0);
 assert.equal((await tx.query(sql,[...scope,requirement,`${id(99)}:${id(1)}`,2])).rowCount,0);
 // Mutable eligibility dates must not move a row within insertion chronology.
 await tx.query('UPDATE r8_retention_states SET eligible_at=\'2030-01-01T00:00:00Z\' WHERE subject_id=$1',[id(9)]);
 assert.deepEqual((await tx.query(sql,[...scope,requirement,null,2])).rows.map(cursor),result.actual.slice(0,2));
 result.result='PASS';console.log(JSON.stringify({mode,result:'PASS',checks:'composite ties, legacy unknown, terminal, unknown anchor, mutable eligibility date'}));
}catch(e){result.result='FAIL';result.failure=(e as Error).message;console.log(JSON.stringify({mode,result:'FAIL',failure:result.failure}));process.exitCode=1;}
finally {await tx.query('ROLLBACK');tx.release();await pool.end();writeFileSync(`handoffs/codex/artifacts/R8-composite-pagination-${mode}.json`,JSON.stringify(result,null,2));}
