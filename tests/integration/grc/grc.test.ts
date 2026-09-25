import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {connectDatabase} from '../../../database/customer/src/index.ts';
import {runtimePool,scopedTransaction,type Authority} from '../../../database/customer/src/runtime.ts';
import {runtimeConfig} from '../../../backend/auth/src/config.ts';
import {loadProfile} from '../../../shared/testing/src/config.ts';
import * as G from '../../../backend/domain/src/grc/grc.ts';
import * as R from '../../../backend/domain/src/grc/risks.ts';
import type {Context} from '../../../backend/domain/src/shared/transaction.ts';

const run=randomUUID(),database=`orvia_grc_test_${run.replaceAll('-','')}`;
const artifact=`handoffs/codex/artifacts/V1-EXPANSION-02-grc-${run}.json`;
const profile=loadProfile('codex-a00'),bootstrap=connectDatabase({...profile,database:'postgres'}).pool;
const db=connectDatabase({...profile,database}).pool;
const config=runtimeConfig();
if(config.profile!=='codex-a00')throw new Error('GRC isolated fixture requires the codex-a00 runtime credentials.');
// Production configuration intentionally narrows database to named profiles.
// Only this fixture overrides the name; the generated identifier is allowlist
// checked below before any pool connects, and no customer database is mutated.
const app=runtimePool({...config,database} as ReturnType<typeof runtimeConfig>,'orvia_app');
const results:{name:string;result:'PASS'|'FAIL'}[]=[];
let phase='setup';
function check(name:string,a:unknown,b:unknown){try{assert.deepEqual(a,b);results.push({name,result:'PASS'});console.log(`PASS ${name}`);}catch(e){results.push({name,result:'FAIL'});throw e;}}
async function rejects(name:string,fn:()=>Promise<unknown>,code:string){let observed='ACCEPTED';try{await fn();}catch(e){observed=String((e as {code?:string}).code??'UNCLASSIFIED');}check(name,observed,code);}
const scope={tenant_id:randomUUID(),legal_entity_id:randomUUID(),environment_id:randomUUID()};
const author:Authority={actor_id:randomUUID(),actor_domain:'STAFF',role:'ORG_ADMIN',scope,capabilities:['grc.read','grc.write'],expires_at:new Date(Date.now()+3600000).toISOString()};
const reviewer:Authority={...author,actor_id:randomUUID(),role:'ORG_SUPER_ADMIN',capabilities:['grc.read','grc.write','grc.approve']};
const as=<T>(actor:Authority,fn:(c:Context)=>Promise<T>)=>scopedTransaction(app,actor,tx=>fn({tx,actor,requestId:randomUUID()}));
try{
  if(!/^orvia_grc_test_[a-f0-9]{32}$/.test(database))throw new Error('Unsafe fixture database name');
  await bootstrap.query(`CREATE DATABASE "${database}"`);
  const auth=readFileSync('database/customer/migrations/0001_auth_scope.sql','utf8');
  const functions=auth.slice(auth.indexOf('CREATE FUNCTION app.in_scope'),auth.indexOf('ALTER TABLE app.organisations ENABLE'));
  if(!functions.includes('CREATE FUNCTION app.has_capability'))throw new Error('Missing scope functions');
  // Isolated prerequisites; production GRC migration and production scoped
  // transaction run unchanged under the non-bypass application role.
  await db.query(`CREATE SCHEMA app; GRANT USAGE ON SCHEMA app TO orvia_app;
    ${functions}
    CREATE TABLE app.audit_events(id uuid,tenant_id uuid,legal_entity_id uuid,environment_id uuid,actor_id uuid,actor_domain text,operation text,resource_id uuid,request_id uuid);
    GRANT INSERT ON app.audit_events TO orvia_app;`);
  const migration=readFileSync('database/customer/migrations/0049_grc.sql','utf8');
  await db.query(migration);
  phase='framework and control mappings';
  const framework=await as(author,c=>G.createGrcFramework(c,{name:'Synthetic access baseline',version:'1',source_reference:'Synthetic test requirements',requirements:[{code:'AC-1',description:'Review access'}]}));
  await rejects('duplicate framework version rejected',()=>as(author,c=>G.createGrcFramework(c,{name:framework.name,version:'1',source_reference:'Replacement',requirements:[{code:'AC-1',description:'Changed'}]})),'EPOCH_CONFLICT');
  const value={title:'Synthetic control',description:'Review accounts',owner_reference:'Synthetic owner',review_interval_days:30,mappings:[{framework_id:framework.id,requirement_code:'AC-1'}]};
  await rejects('unknown requirement rejected',()=>as(author,c=>G.createGrcControl(c,{...value,mappings:[{framework_id:framework.id,requirement_code:'AC-2'}]})),'VALIDATION_ERROR');
  const ctl=await as(author,c=>G.createGrcControl(c,value));
  check('no evidence reports unknown',(await as(author,c=>G.grcStanding(c,ctl.id))).state,'UNKNOWN');
  phase='evidence review';
  const input={description:'Synthetic access review',local_reference:'local:synthetic-review',content_sha256:'b'.repeat(64),collected_at:new Date(Date.now()-60000).toISOString(),valid_until:new Date(Date.now()+86400000).toISOString()};
  const evidence=await as(author,c=>G.submitGrcEvidence(c,ctl.id,input));
  check('submission is pending',(await as(author,c=>G.grcStanding(c,ctl.id))).state,'PENDING_REVIEW');
  const decision={evidence_id:evidence.id,decision:'ACCEPT',reason:'Reviewed synthetic artifact'};
  await rejects('writer cannot review',()=>as(author,c=>G.reviewGrcEvidence(c,ctl.id,decision)),'FORBIDDEN');
  await rejects('author with approval capability cannot self-review',()=>as({...author,capabilities:reviewer.capabilities},c=>G.reviewGrcEvidence(c,ctl.id,decision)),'FORBIDDEN');
  await as(reviewer,c=>G.reviewGrcEvidence(c,ctl.id,decision));
  const standing=await as(author,c=>G.grcStanding(c,ctl.id));
  check('independent review explicitly manual',standing.state,'MANUAL_REVIEW_ACCEPTED');
  check('manual review never claims observed effect',standing.automated_effect_verified,false);
  await rejects('second contradictory decision rejected',()=>as(reviewer,c=>G.reviewGrcEvidence(c,ctl.id,{...decision,decision:'REJECT'})),'EPOCH_CONFLICT');
  const replacement=await as(author,c=>G.submitGrcEvidence(c,ctl.id,input));
  check('replacement evidence removes old acceptance',(await as(author,c=>G.grcStanding(c,ctl.id))).state,'PENDING_REVIEW');
  await rejects('superseded evidence cannot be approved',()=>as(reviewer,c=>G.reviewGrcEvidence(c,ctl.id,decision)),'EPOCH_CONFLICT');
  await as(reviewer,c=>G.reviewGrcEvidence(c,ctl.id,{...decision,evidence_id:replacement.id,decision:'REJECT'}));
  check('replacement rejection visible',(await as(author,c=>G.grcStanding(c,ctl.id))).state,'REJECTED');
  await rejects('future evidence rejected',()=>as(author,c=>G.submitGrcEvidence(c,ctl.id,{...input,collected_at:new Date(Date.now()+60000).toISOString()})),'VALIDATION_ERROR');
  phase='concurrent replacement and approval';
  let releaseReplacement!:()=>void, replacementReady!:()=>void, reviewerReady!:(pid:number)=>void;
  const release=new Promise<void>(resolve=>{releaseReplacement=resolve;});
  const ready=new Promise<void>(resolve=>{replacementReady=resolve;});
  const reviewPid=new Promise<number>(resolve=>{reviewerReady=resolve;});
  const replacing=as(author,async c=>{
    const next=await G.submitGrcEvidence(c,ctl.id,input);
    replacementReady();await release;return next;
  });
  await ready;
  const reviewing=as(reviewer,async c=>{
    reviewerReady(Number((await c.tx.query('SELECT pg_backend_pid() pid')).rows[0].pid));
    return G.reviewGrcEvidence(c,ctl.id,{...decision,evidence_id:replacement.id});
  }).then(()=> 'ACCEPTED',e=>String((e as {code?:string}).code??'UNCLASSIFIED'));
  try{
    const pid=await reviewPid;let blocked=false;
    for(const deadline=Date.now()+5000;Date.now()<deadline;){
      if(Number((await db.query('SELECT cardinality(pg_blocking_pids($1)) n',[pid])).rows[0].n)>0){blocked=true;break;}
      await new Promise(resolve=>setTimeout(resolve,20));
    }
    check('review waits for concurrent replacement transaction',blocked,true);
  }finally{releaseReplacement();}
  await replacing;
  check('review rechecks committed replacement',await reviewing,'EPOCH_CONFLICT');
  check('new replacement remains pending',(await as(author,c=>G.grcStanding(c,ctl.id))).state,'PENDING_REVIEW');
  phase='authorization and database boundaries';
  const other={...author,scope:{...scope,tenant_id:randomUUID()}};
  await rejects('cross-tenant control invisible',()=>as(other,c=>G.grcStanding(c,ctl.id)),'NOT_FOUND');
  await rejects('cross-tenant framework cannot be mapped',()=>as(other,c=>G.createGrcControl(c,value)),'NOT_FOUND');
  const auditor={...author,capabilities:['grc.read'],role:'AUDITOR'};
  await rejects('auditor cannot submit evidence',()=>as(auditor,c=>G.submitGrcEvidence(c,ctl.id,input)),'FORBIDDEN');
  check('RLS denies rows directly across tenant',await as(other,async c=>(await c.tx.query('SELECT id FROM app.grc_controls')).rowCount),0);
  check('RLS denies principal even with fabricated GRC capability',await as({...author,actor_domain:'PRINCIPAL'},async c=>(await c.tx.query('SELECT id FROM app.grc_controls')).rowCount),0);
  await rejects('database rejects read-only direct insertion',()=>as(auditor,c=>c.tx.query('INSERT INTO app.grc_frameworks VALUES($1,$2,$3,$4,$5)',[...Object.values(scope),randomUUID(),framework])),'42501');
  await rejects('runtime role cannot update history',()=>as(author,c=>c.tx.query('UPDATE app.grc_controls SET document=document WHERE id=$1',[ctl.id])),'42501');
  await rejects('immutable history rejects owner mutation',()=>db.query('UPDATE app.grc_controls SET document=document WHERE id=$1',[ctl.id]),'23514');
  check('failed decisions did not append reviews',Number((await db.query('SELECT count(*)::int n FROM app.grc_reviews')).rows[0].n),2);
  check('successful mutations have audit events',Number((await db.query('SELECT count(*)::int n FROM app.audit_events')).rows[0].n),7);
  phase='risk treatment lifecycle';
  const riskInput={title:'Synthetic access risk',description:'Overbroad access',owner_reference:'Synthetic IT',likelihood:3,impact:4,review_due_at:new Date(Date.now()+86400000).toISOString(),control_ids:[ctl.id]};
  await rejects('risk cannot reference another tenant control',()=>as(other,c=>R.createGrcRisk(c,riskInput)),'NOT_FOUND');
  const risk=await as(author,c=>R.createGrcRisk(c,riskInput));
  check('risk starts open',(await as(author,c=>R.grcRiskDetail(c,risk.id))).standing.state,'OPEN');
  const treatmentInput={response:'ACCEPT',plan:'Temporary synthetic acceptance',due_at:new Date(Date.now()+86400000).toISOString(),acceptance_expires_at:new Date(Date.now()+86400000).toISOString()};
  await rejects('past risk acceptance rejected',()=>as(author,c=>R.proposeGrcRiskTreatment(c,risk.id,{...treatmentInput,acceptance_expires_at:new Date(Date.now()-60000).toISOString()})),'VALIDATION_ERROR');
  const treatment=await as(author,c=>R.proposeGrcRiskTreatment(c,risk.id,treatmentInput));
  const riskDecision={treatment_id:treatment.id,decision:'ACCEPT',reason:'Synthetic independent review'};
  await rejects('risk author cannot self-approve',()=>as({...author,capabilities:reviewer.capabilities},c=>R.reviewGrcRiskTreatment(c,risk.id,riskDecision)),'FORBIDDEN');
  await as(reviewer,c=>R.reviewGrcRiskTreatment(c,risk.id,riskDecision));
  check('independent temporary acceptance visible',(await as(author,c=>R.grcRiskDetail(c,risk.id))).standing.state,'RISK_ACCEPTED');
  await rejects('review cannot be overwritten',()=>as(reviewer,c=>R.reviewGrcRiskTreatment(c,risk.id,{...riskDecision,decision:'REJECT'})),'EPOCH_CONFLICT');
  const mitigation=await as(author,c=>R.proposeGrcRiskTreatment(c,risk.id,{...treatmentInput,response:'MITIGATE',acceptance_expires_at:null}));
  check('replacement removes previous risk acceptance',(await as(author,c=>R.grcRiskDetail(c,risk.id))).standing.state,'REVIEW_PENDING');
  await rejects('old treatment cannot receive new approval',()=>as(reviewer,c=>R.reviewGrcRiskTreatment(c,risk.id,riskDecision)),'EPOCH_CONFLICT');
  await as(reviewer,c=>R.reviewGrcRiskTreatment(c,risk.id,{...riskDecision,treatment_id:mitigation.id}));
  const mitigationDetail=await as(author,c=>R.grcRiskDetail(c,risk.id));
  check('reviewed plan is not closure',mitigationDetail.standing.state,'PLAN_REVIEWED');
  check('risk review is not verification',mitigationDetail.standing.mitigation_effect_verified,false);
  await rejects('cross-tenant risk invisible',()=>as(other,c=>R.grcRiskDetail(c,risk.id)),'NOT_FOUND');
  await rejects('auditor cannot propose risk treatment',()=>as(auditor,c=>R.proposeGrcRiskTreatment(c,risk.id,treatmentInput)),'FORBIDDEN');
  check('RLS directly hides risk history across tenant',await as(other,async c=>(await c.tx.query('SELECT id FROM app.grc_risk_treatments')).rowCount),0);
  check('risk mutations audited',Number((await db.query("SELECT count(*)::int n FROM app.audit_events WHERE operation LIKE 'grc.risk.%'")).rows[0].n),5);
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-02',result:'PASS',database,recorded_at:new Date().toISOString(),migration_sha256:createHash('sha256').update(migration).digest('hex'),results,limitations:['Synthetic isolated database. Authentication HTTP/OPA/UI and whole-product acceptance are not exercised. Audit prerequisites are reduced; GRC tables, RLS and transaction code are production sources.']},null,2));
  console.log(`Artifact: ${artifact}`);
}catch(e){
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-02',result:'FAIL',database,phase,results,error:{name:e instanceof Error?e.name:'Error',code:String((e as {code?:string}).code??'UNCLASSIFIED')}},null,2));
  console.error(`FAIL ${phase}; artifact: ${artifact}`);process.exitCode=1;
}finally{await app.end();await db.end();await bootstrap.end();}
