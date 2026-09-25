import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFileSync,writeFileSync } from 'node:fs';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { createFinding,completeAssessment } from '../../../backend/domain/src/processors/processors.ts';
import type { Context } from '../../../backend/domain/src/shared/transaction.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const profile=loadProfile('codex-a00'),runId=randomUUID();
const database=`orvia_assessment_test_${runId.replaceAll('-','')}`;
const artifact=`handoffs/codex/artifacts/V1-EXPANSION-01-assessment-race-${runId}.json`;
const bootstrap=connectDatabase({...profile,database:'postgres'}).pool;
const pools:ReturnType<typeof connectDatabase>['pool'][]=[];
const assertions:{name:string;result:'PASS'|'FAIL'}[]=[];
let phase='setup';
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS'});console.log(`PASS ${name}`);}
  catch{assertions.push({name,result:'FAIL'});throw new Error(`Assertion failed: ${name}`);}
}
try{
  if(!/^orvia_assessment_test_[a-f0-9]{32}$/.test(database))throw new Error('Invalid isolated fixture database');
  await bootstrap.query(`CREATE DATABASE "${database}"`);
  const db=connectDatabase({...profile,database}).pool;pools.push(db);
  const observer=connectDatabase({...profile,database}).pool;pools.push(observer);
  // Exact production assessment/finding table definitions, with only their
  // prerequisite processor and audit tables reduced for this lock test.
  // This is not an authentication/RLS or full API acceptance test.
  const source=readFileSync('database/customer/migrations/0020_processors.sql','utf8');
  const tables=source.slice(source.indexOf('CREATE TABLE app.assessments ('),source.indexOf('CREATE FUNCTION app.processor_record_is_append_only()'));
  if(!tables.includes('CREATE TABLE app.assessment_findings'))throw new Error('Missing production table definitions');
  await db.query(`CREATE SCHEMA app;
    CREATE TABLE app.processors(tenant_id uuid,legal_entity_id uuid,environment_id uuid,id uuid,PRIMARY KEY(tenant_id,legal_entity_id,environment_id,id));
    CREATE TABLE app.audit_events(id uuid,tenant_id uuid,legal_entity_id uuid,environment_id uuid,actor_id uuid,actor_domain text,operation text,resource_id uuid,request_id uuid);
    ${tables}`);
  const scope={tenant_id:randomUUID(),legal_entity_id:randomUUID(),environment_id:randomUUID()};
  const actor:Context['actor']={actor_id:randomUUID(),actor_domain:'STAFF',scope,role:'ORG_ADMIN',capabilities:['processor.read','processor.write'],expires_at:new Date(Date.now()+3600000).toISOString()};
  const processor=randomUUID();
  const scoped=[scope.tenant_id,scope.legal_entity_id,scope.environment_id];
  await db.query('INSERT INTO app.processors VALUES($1,$2,$3,$4)',[...scoped,processor]);
  async function seed(){
    const id=randomUUID();
    const doc=S.Assessment.parse({id,processor_id:processor,kind:'VENDOR_DUE_DILIGENCE',applicability_basis:'Synthetic isolation and concurrent finding review.',scope_system_ids:[],reviewer_reference:'Synthetic reviewer',due_at:new Date(Date.now()+86400000).toISOString(),state:'OPEN',recorded_at:new Date().toISOString(),recorded_by:actor.actor_id,completed_at:null,conclusion:null});
    await db.query("INSERT INTO app.assessments(tenant_id,legal_entity_id,environment_id,id,processor_id,kind,state,due_at,recorded_by,document) VALUES($1,$2,$3,$4,$5,$6,'OPEN',$7,$8,$9)",[...scoped,id,processor,doc.kind,doc.due_at,actor.actor_id,doc]);
    return id;
  }
  const finding=(id:string)=>({assessment_id:id,severity:'HIGH',description:'Synthetic concurrent adverse finding.',affected_system_ids:[],owner_reference:'Synthetic reviewer',due_at:new Date(Date.now()+86400000).toISOString()});
  async function blocked(pid:number){
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      const r=await observer.query('SELECT cardinality(pg_blocking_pids($1)) AS n',[pid]);
      if(Number(r.rows[0].n)>0)return true;
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    return false;
  }
  const capture=async(work:()=>Promise<unknown>)=>{try{await work();return 'ACCEPTED';}catch(error){return String((error as {code?:string}).code??'UNKNOWN');}};
  phase='completion commits before finding';
  const id=await seed(),a=await db.connect(),b=await db.connect();
  try{
    await a.query('BEGIN');await b.query('BEGIN');
    const ca:Context={tx:a,actor,requestId:randomUUID()},cb:Context={tx:b,actor,requestId:randomUUID()};
    const pid=Number((await b.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
    await completeAssessment(ca,id,{conclusion:'Synthetic completed review before a competing finding.'});
    const pending=capture(()=>createFinding(cb,finding(id)));
    check('competing finding waits on assessment transaction',await blocked(pid),true);
    await a.query('COMMIT');
    const outcome=await pending;
    if(outcome==='ACCEPTED')await b.query('COMMIT');else await b.query('ROLLBACK');
    check('finding rechecks committed completed state',outcome,'EPOCH_CONFLICT');
    check('completed assessment has no late open finding',Number((await observer.query('SELECT count(*)::int AS n FROM app.assessment_findings WHERE assessment_id=$1',[id])).rows[0].n),0);
  }finally{await a.query('ROLLBACK');await b.query('ROLLBACK');a.release();b.release();}
  phase='finding commits before completion';
  const second=await seed(),c=await db.connect(),d=await db.connect();
  try{
    await c.query('BEGIN');await d.query('BEGIN');
    const cc:Context={tx:c,actor,requestId:randomUUID()},cd:Context={tx:d,actor,requestId:randomUUID()};
    const pid=Number((await d.query('SELECT pg_backend_pid() AS pid')).rows[0].pid);
    await createFinding(cc,finding(second));
    const pending=capture(()=>completeAssessment(cd,second,{conclusion:'Synthetic completion competing with a new finding.'}));
    check('completion waits for concurrent finding transaction',await blocked(pid),true);
    await c.query('COMMIT');
    const outcome=await pending;await d.query('ROLLBACK');
    check('completion refuses newly committed open finding',outcome,'EPOCH_CONFLICT');
    check('assessment remains open',(await observer.query('SELECT state FROM app.assessments WHERE id=$1',[second])).rows[0].state,'OPEN');
  }finally{await c.query('ROLLBACK');await d.query('ROLLBACK');c.release();d.release();}
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-01',result:'PASS',recorded_at:new Date().toISOString(),database,fixture_kind:'ISOLATED_SYNTHETIC_ASSESSMENT_RACE',assertions,limitations:['Lock/state semantics only; not HTTP, RLS or full release acceptance.']},null,2));
  console.log(`Artifact: ${artifact}`);
}catch(error){
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-01',result:'FAIL',recorded_at:new Date().toISOString(),database,phase,assertions,error:{name:error instanceof Error?error.name:'Error',code:String((error as {code?:string}).code??'UNCLASSIFIED')}},null,2));
  console.error(`FAIL ${phase}; artifact: ${artifact}`);process.exitCode=1;
}finally{for(const pool of pools)await pool.end();await bootstrap.end();}
