import assert from 'node:assert/strict';
import {randomUUID,createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {connectDatabase} from '../../../database/customer/src/index.ts';
import {runtimePool,scopedTransaction,type Authority} from '../../../database/customer/src/runtime.ts';
import {runtimeConfig} from '../../../backend/auth/src/config.ts';
import {loadProfile} from '../../../shared/testing/src/config.ts';
import * as G from '../../../backend/domain/src/grc/grc.ts';
import * as A from '../../../backend/domain/src/grc/audits.ts';
import type {Context} from '../../../backend/domain/src/shared/transaction.ts';

const run=randomUUID(),database=`orvia_grc_audits_${run.replaceAll('-','')}`;
const artifact=`handoffs/codex/artifacts/V1-EXPANSION-04-grc-${run}.json`;
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
  if(!/^orvia_grc_audits_[a-f0-9]{32}$/.test(database))throw new Error('Unsafe fixture database name');
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
  await db.query(readFileSync('database/customer/migrations/0050_grc_audits.sql','utf8'));
  phase='audit lifecycle';
  const future=new Date(Date.now()+86400000).toISOString(),past=new Date(Date.now()-60000).toISOString();
  const framework=await as(author,c=>G.createGrcFramework(c,{name:'Synthetic audit framework',version:'1',source_reference:'Synthetic requirements',requirements:[{code:'AC-1',description:'Access review'}]}));
  const control=await as(author,c=>G.createGrcControl(c,{title:'Synthetic audit control',description:'Access review',owner_reference:'Synthetic owner',review_interval_days:30,mappings:[{framework_id:framework.id,requirement_code:'AC-1'}]}));
  const input={title:'Synthetic audit',objective:'Review synthetic access evidence',owner_reference:'Synthetic owner',due_at:future,control_ids:[control.id]};
  await rejects('unknown control denied',()=>as(author,c=>A.createGrcAudit(c,{...input,control_ids:[randomUUID()]})),'NOT_FOUND');
  await rejects('past deadline denied',()=>as(author,c=>A.createGrcAudit(c,{...input,due_at:past})),'VALIDATION_ERROR');
  const plan=await as(author,c=>A.createGrcAudit(c,input));
  check('new audit remains open',(await as(author,c=>A.grcAuditDetail(c,plan.id))).closure,null);
  await rejects('audit author cannot close',()=>as({...author,capabilities:reviewer.capabilities},c=>A.closeGrcAudit(c,plan.id,{reason:'Self review'})),'FORBIDDEN');
  await rejects('audit without requests cannot close',()=>as(reviewer,c=>A.closeGrcAudit(c,plan.id,{reason:'Empty'})),'EPOCH_CONFLICT');
  const reqInput={control_id:control.id,description:'Provide access evidence',assignee_reference:'Synthetic owner',due_at:future};
  await rejects('out-of-scope control request denied',()=>as(author,c=>A.createGrcAuditRequest(c,plan.id,{...reqInput,control_id:randomUUID()})),'VALIDATION_ERROR');
  await rejects('request beyond audit deadline denied',()=>as(author,c=>A.createGrcAuditRequest(c,plan.id,{...reqInput,due_at:new Date(Date.now()+172800000).toISOString()})),'VALIDATION_ERROR');
  const req=await as(author,c=>A.createGrcAuditRequest(c,plan.id,reqInput));
  check('request starts open',(await as(author,c=>A.grcAuditRequestDetail(c,req.id))).state,'OPEN');
  await rejects('unknown evidence cannot respond',()=>as(author,c=>A.respondGrcAuditRequest(c,req.id,{evidence_id:randomUUID(),explanation:'Synthetic'})),'EPOCH_CONFLICT');
  const evidenceInput={description:'Synthetic access report',local_reference:'local:synthetic-access',content_sha256:'a'.repeat(64),collected_at:past,valid_until:future};
  const evidence=await as(author,c=>G.submitGrcEvidence(c,control.id,evidenceInput));
  await rejects('unreviewed evidence cannot respond',()=>as(author,c=>A.respondGrcAuditRequest(c,req.id,{evidence_id:evidence.id,explanation:'Synthetic'})),'EPOCH_CONFLICT');
  await as(reviewer,c=>G.reviewGrcEvidence(c,control.id,{evidence_id:evidence.id,decision:'ACCEPT',reason:'Synthetic manual review'}));
  const response=await as(author,c=>A.respondGrcAuditRequest(c,req.id,{evidence_id:evidence.id,explanation:'Synthetic supplied evidence'}));
  check('response snapshots exact evidence',response.evidence_snapshot,evidence);
  check('response requires separate audit review',(await as(author,c=>A.grcAuditRequestDetail(c,req.id))).state,'REVIEW_PENDING');
  await rejects('self response approval denied',()=>as({...author,capabilities:reviewer.capabilities},c=>A.reviewGrcAuditResponse(c,req.id,{response_id:response.id,decision:'ACCEPT',reason:'Self review'})),'FORBIDDEN');
  await as(reviewer,c=>A.reviewGrcAuditResponse(c,req.id,{response_id:response.id,decision:'ACCEPT',reason:'Independent synthetic audit review'}));
  check('reviewed response accepted',(await as(reviewer,c=>A.grcAuditRequestDetail(c,req.id))).state,'ACCEPTED');
  await rejects('duplicate response review denied',()=>as(reviewer,c=>A.reviewGrcAuditResponse(c,req.id,{response_id:response.id,decision:'REJECT',reason:'Overwrite'})),'EPOCH_CONFLICT');
  const replacement=await as(author,c=>G.submitGrcEvidence(c,control.id,{...evidenceInput,description:'Replacement synthetic evidence'}));
  check('superseded evidence makes response stale',(await as(reviewer,c=>A.grcAuditRequestDetail(c,req.id))).state,'STALE');
  await rejects('stale response blocks closure',()=>as(reviewer,c=>A.closeGrcAudit(c,plan.id,{reason:'Stale'})),'EPOCH_CONFLICT');
  await as(reviewer,c=>G.reviewGrcEvidence(c,control.id,{evidence_id:replacement.id,decision:'ACCEPT',reason:'Replacement reviewed'}));
  const response2=await as(author,c=>A.respondGrcAuditRequest(c,req.id,{evidence_id:replacement.id,explanation:'Replacement response'}));
  check('replacement response does not inherit review',(await as(reviewer,c=>A.grcAuditRequestDetail(c,req.id))).state,'REVIEW_PENDING');
  await rejects('old response cannot be reapproved',()=>as(reviewer,c=>A.reviewGrcAuditResponse(c,req.id,{response_id:response.id,decision:'ACCEPT',reason:'Old'})),'EPOCH_CONFLICT');
  await as(reviewer,c=>A.reviewGrcAuditResponse(c,req.id,{response_id:response2.id,decision:'ACCEPT',reason:'Current response reviewed'}));
  const foreign={...reviewer,scope:{...scope,tenant_id:randomUUID()}};
  await rejects('foreign tenant audit detail denied',()=>as(foreign,c=>A.grcAuditDetail(c,plan.id)),'NOT_FOUND');
  await rejects('foreign tenant request detail denied',()=>as(foreign,c=>A.grcAuditRequestDetail(c,req.id)),'NOT_FOUND');
  check('foreign tenant list empty',(await as(foreign,c=>A.grcAuditList(c,{limit:10,cursor:null}))).items.length,0);
  const auditor={...reviewer,capabilities:['grc.read']};
  await rejects('auditor cannot write',()=>as(auditor,c=>A.createGrcAudit(c,input)),'FORBIDDEN');
  check('auditor can read accepted response',(await as(auditor,c=>A.grcAuditRequestDetail(c,req.id))).state,'ACCEPTED');
  await rejects('unrelated request cursor rejected',()=>as(auditor,c=>A.grcAuditRequests(c,plan.id,{limit:1,cursor:randomUUID()})),'NOT_FOUND');
  const closeResults=await Promise.allSettled([as(reviewer,c=>A.closeGrcAudit(c,plan.id,{reason:'Reviewed complete audit'})),as(reviewer,c=>A.closeGrcAudit(c,plan.id,{reason:'Concurrent close'}))]);
  check('concurrent closure commits exactly once',closeResults.filter(r=>r.status==='fulfilled').length,1);
  const closed=(await as(auditor,c=>A.grcAuditDetail(c,plan.id))).closure!;
  check('closure binds current accepted response',closed.accepted_response_ids,[response2.id]);
  check('closure never asserts certification',closed.certification_asserted,false);
  await rejects('closed audit rejects new requests',()=>as(author,c=>A.createGrcAuditRequest(c,plan.id,reqInput)),'EPOCH_CONFLICT');
  await rejects('closed audit rejects response replacement',()=>as(author,c=>A.respondGrcAuditRequest(c,req.id,{evidence_id:replacement.id,explanation:'Late'})),'EPOCH_CONFLICT');
  await rejects('database history cannot be updated',()=>db.query('UPDATE app.grc_audits SET document=document WHERE id=$1',[plan.id]),'23514');
  await rejects('database history cannot be deleted',()=>db.query('DELETE FROM app.grc_audit_responses WHERE id=$1',[response.id]),'23514');
  check('old response retained',Number((await db.query('SELECT count(*) n FROM app.grc_audit_responses WHERE request_id=$1',[req.id])).rows[0].n),2);
  writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-04',result:'PASS',database,recorded_at:new Date().toISOString(),results,migration_sha256:createHash('sha256').update(readFileSync('database/customer/migrations/0050_grc_audits.sql')).digest('hex'),limitations:['Isolated synthetic database; API/UI and full release acceptance are separate checks. Manual evidence only.']},null,2));
  console.log(`Artifact: ${artifact}`);
}catch(error){writeFileSync(artifact,JSON.stringify({task_id:'V1-EXPANSION-04',result:'FAIL',database,phase,results,error:{name:error instanceof Error?error.name:'Error',code:String((error as {code?:string}).code??'UNCLASSIFIED')}},null,2));console.error(`FAIL ${phase}; artifact: ${artifact}`);process.exitCode=1;}
finally{await Promise.all([app.end(),db.end(),bootstrap.end()]);}
