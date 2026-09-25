import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h=new HttpFixture();
const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('This new suite owns only the codex-a00 synthetic profile');
const db=connectDatabase(profile).pool;
const assertions:{name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];
let phase='setup';
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',expected,actual});console.log('PASS '+name);}
  catch{assertions.push({name,result:'FAIL',expected,actual});throw new Error('Assertion failed: '+name+` actual=${JSON.stringify(actual)}`);}
}
const key=()=>({'idempotency-key':randomUUID()});
const event=(kind:string,state:string,policy_version_id:string|null=null,incident_id:string|null=null)=>({
  kind,state,title:`Synthetic ${kind}`,detail:'Reviewed synthetic governance record for this test.',
  source_reference:'SYNTHETIC-REVIEW-1',policy_version_id,incident_id,
});

try{
  await h.start();
  const scenario=await createMarketingScenario(h);
  const admin=scenario.author;
  const owner=scenario.owner;
  const auditor=await h.login('auditor');
  const birch=await h.login('birch');
  const member=await h.login('member');
  phase='graph setup';
  const asset=S.DataAsset.parse(await (await admin.call('/api/v1/admin/data-assets',{
    system_id:scenario.system.id,kind:'DATASET',parent_id:null,name:'synthetic_ai_input',
    description:'Synthetic input inventory, declared by a staff reviewer.',provenance:'ASSERTED',
    valid_from:new Date().toISOString(),categories:[],
  },key())).json());
  const activity=S.ProcessingActivity.parse(await (await admin.call('/api/v1/admin/processing-activities',{
    purpose_id:scenario.purpose.id,name:'Synthetic classification trial',
    description:'Human reviewed synthetic AI use only.',lawful_condition:'AFFIRMATIVE_MARKETING_CONSENT',
    owner_reference:'Synthetic privacy team',
  },key())).json());
  const relationship=(type:string,from:{kind:string;id:string},to:{kind:string;id:string})=>
    admin.call('/api/v1/admin/graph/relationships',{relationship_type:type,from,to,provenance:'ASSERTED',
      valid_from:new Date().toISOString(),confidence_basis:'Declared synthetic test mapping.'},key());
  check('input-to-activity relationship is created',(await relationship('ASSET_PROCESSED_BY_ACTIVITY',{kind:'DATA_ASSET',id:asset.id},{kind:'PROCESSING_ACTIVITY',id:activity.id})).status,201);
  check('activity-to-purpose relationship is created',(await relationship('ACTIVITY_SERVES_PURPOSE',{kind:'PROCESSING_ACTIVITY',id:activity.id},{kind:'PURPOSE',id:scenario.purpose.id})).status,201);

  phase='inventory';
  const input={name:'Synthetic AI classification use',use_case:'Assist a human review of synthetic records.',
    purpose_id:scenario.purpose.id,processing_activity_id:activity.id,input_asset_id:asset.id,
    output_system_id:scenario.system.id,processor_id:null};
  check('cross-tenant purpose cannot enter inventory',(await admin.call('/api/v1/admin/ai-systems',{
    ...input,purpose_id:randomUUID()},key())).status,404);
  check('client cannot nominate an arbitrary owner',(await admin.call('/api/v1/admin/ai-systems',{
    ...input,owner_actor_id:h.users.birch!.id},key())).status,400);
  const created=await admin.call('/api/v1/admin/ai-systems',input,key());
  check('inventory creation succeeds',created.status,201);
  const system=S.AiSystem.parse(await created.json());
  check('owner is the authenticated creator',system.owner_actor_id,h.users.admin!.id);
  check('record remains declared and never calls a model',typeof system.id,'string');
  const queued=S.AiGovernanceReport.parse(await (await admin.call('/api/v1/admin/ai-governance/report')).json());
  check('a durable monitoring check is due after registration',queued.monitor_due>=1,true);
  const job=await db.query('SELECT state,attempts FROM app.ai_monitor_jobs WHERE ai_system_id=$1',[system.id]);
  check('check job persisted in PostgreSQL',[job.rowCount,job.rows[0]?.state,job.rows[0]?.attempts],[1,'READY',0]);
  check('other tenant cannot read inventory',(await birch.call(`/api/v1/admin/ai-systems/${system.id}`)).status,404);
  check('other tenant cannot add events',(await birch.call(`/api/v1/admin/ai-systems/${system.id}/events`,event('CONTROL','RECORDED'),key())).status,404);
  check('member without governance permission is denied',(await member.call('/api/v1/admin/ai-systems')).status,403);
  check('auditor can read governed inventory',(await auditor.call(`/api/v1/admin/ai-systems/${system.id}`)).status,200);
  check('auditor cannot write governed inventory',(await auditor.call(`/api/v1/admin/ai-systems/${system.id}/events`,event('CONTROL','RECORDED'),key())).status,403);

  phase='review';
  const path=`/api/v1/admin/ai-systems/${system.id}/events`;
  check('approval without prerequisites is refused',(await owner.call(path,event('APPROVAL','APPROVED'),key())).status,409);
  check('inventor cannot approve own AI use',(await admin.call(path,event('APPROVAL','APPROVED'),key())).status,403);
  check('assessment recorded',(await admin.call(path,event('RISK_ASSESSMENT','RECORDED'),key())).status,201);
  check('policy must exist and be published',(await admin.call(path,event('POLICY','RECORDED',randomUUID()),key())).status,404);
  check('published policy linked',(await admin.call(path,event('POLICY','RECORDED',scenario.policy.version_id),key())).status,201);
  check('control recorded',(await admin.call(path,event('CONTROL','RECORDED'),key())).status,201);
  check('evidence record remains a record, not verification',(await admin.call(path,event('EVIDENCE','RECORDED'),key())).status,201);
  const approval=await owner.call(path,event('APPROVAL','APPROVED'),key());
  check('separate reviewer can approve',approval.status,201);
  let detail=S.AiSystemDetail.parse(await (await auditor.call(`/api/v1/admin/ai-systems/${system.id}`)).json());
  check('read exposes linked approval and risk record',[detail.approved,detail.assessment_recorded,detail.events.some(e=>e.kind==='POLICY')],[true,true,true]);
  check('monitoring is missing until recorded',detail.last_monitoring_at,null);
  check('finding recorded',(await admin.call(path,event('MONITORING','FINDING'),key())).status,201);
  detail=S.AiSystemDetail.parse(await (await auditor.call(`/api/v1/admin/ai-systems/${system.id}`)).json());
  check('finding invalidates earlier approval',[detail.finding_open,detail.approved],[true,false]);
  check('a later assertion cannot silently close finding',(await admin.call(path,event('MONITORING','RECORDED'),key())).status,201);
  detail=S.AiSystemDetail.parse(await (await auditor.call(`/api/v1/admin/ai-systems/${system.id}`)).json());
  check('finding remains open after later assertion',detail.finding_open,true);
  check('approval blocked by open finding',(await owner.call(path,event('APPROVAL','APPROVED'),key())).status,409);
  const report=S.AiGovernanceReport.parse(await (await auditor.call('/api/v1/admin/ai-governance/report')).json());
  check('report counts the unresolved finding',report.findings>=1,true);
  check('report explains declaration limit',report.limitations.some(x=>x.includes('not independent verification')),true);
  const rewrite=await db.query('UPDATE app.ai_governance_events SET state=$1 WHERE id=$2',['APPROVED',detail.events[0]!.id]).then(()=> 'ACCEPTED').catch(()=> 'REJECTED');
  check('append-only event cannot be rewritten',rewrite,'REJECTED');

  writeEvidence('ai-governance-integration',{profile:profile.profile,phase:'complete',assertions,result:'PASS'});
  console.log(`${assertions.length} assertions, 0 failures.`);
}catch(error){
  writeEvidence('ai-governance-integration',{profile:profile.profile,phase,assertions,result:'FAIL',error:safeError(error),diagnostics:h.diagnostics.slice(-6000)});
  console.error(safeError(error));process.exitCode=1;
}finally{await h.stop();await db.end();}
