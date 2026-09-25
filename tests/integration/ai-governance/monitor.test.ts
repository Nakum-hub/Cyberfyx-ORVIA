import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepAiGovernance } from '../../../services/worker/src/ai-governance-monitor.ts';
import { writeEvidence,safeError } from '../../../shared/testing/src/evidence.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('Only codex-a00 synthetic profile is owned here');
const h=new HttpFixture();
const assertions:{name:string;expected:unknown;actual:unknown;result:'PASS'|'FAIL'}[]=[];
let phase='start';
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,expected,actual,result:'PASS'});console.log('PASS '+name);}
  catch{assertions.push({name,expected,actual,result:'FAIL'});throw new Error(`Assertion failed: ${name}; actual=${JSON.stringify(actual)}`);}
}
const key=()=>({'idempotency-key':randomUUID()});
let runtime:ReturnType<typeof workflowActivities>|undefined;
try{
  await h.start();
  const scenario=await createMarketingScenario(h);
  const admin=scenario.author;
  phase='inventory';
  const asset=S.DataAsset.parse(await (await admin.call('/api/v1/admin/data-assets',{
    system_id:scenario.system.id,kind:'DATASET',parent_id:null,name:'declared_ai_input',
    description:'Declared synthetic input that has not been read from a target.',
    provenance:'ASSERTED',valid_from:new Date().toISOString(),categories:[],
  },key())).json());
  const activity=S.ProcessingActivity.parse(await (await admin.call('/api/v1/admin/processing-activities',{
    purpose_id:scenario.purpose.id,name:'Synthetic AI review',description:'Synthetic declared use only.',
    lawful_condition:'AFFIRMATIVE_MARKETING_CONSENT',owner_reference:'Synthetic test owner',
  },key())).json());
  const rel=(relationship_type:string,from:{kind:string;id:string},to:{kind:string;id:string})=>
    admin.call('/api/v1/admin/graph/relationships',{relationship_type,from,to,provenance:'ASSERTED',
      valid_from:new Date().toISOString(),confidence_basis:'Synthetic test declaration.'},key());
  check('asset/activity mapped',(await rel('ASSET_PROCESSED_BY_ACTIVITY',{kind:'DATA_ASSET',id:asset.id},{kind:'PROCESSING_ACTIVITY',id:activity.id})).status,201);
  check('activity/purpose mapped',(await rel('ACTIVITY_SERVES_PURPOSE',{kind:'PROCESSING_ACTIVITY',id:activity.id},{kind:'PURPOSE',id:scenario.purpose.id})).status,201);
  const ai=S.AiSystem.parse(await (await admin.call('/api/v1/admin/ai-systems',{
    name:'Synthetic monitored use',use_case:'Human review of declared synthetic input.',
    purpose_id:scenario.purpose.id,processing_activity_id:activity.id,input_asset_id:asset.id,
    output_system_id:scenario.system.id,processor_id:null,
  },key())).json());
  let detail=S.AiSystemDetail.parse(await (await admin.call(`/api/v1/admin/ai-systems/${ai.id}`)).json());
  check('no monitoring outcome invented at registration',detail.last_monitoring_at,null);
  phase='durable sweep';
  runtime=workflowActivities();
  const identities=runtime.enrollment.identities.map(identity=>identity.id);
  const first=await sweepAiGovernance(runtime.scoped,identities);
  check('due jobs were processed',first>0,true);
  detail=S.AiSystemDetail.parse(await (await admin.call(`/api/v1/admin/ai-systems/${ai.id}`)).json());
  check('declared input creates finding without target claim',[detail.finding_open,detail.events[0]?.state],[true,'FINDING']);
  check('worker identifies local asset reference',detail.events[0]?.source_reference,`asset:${asset.id}`);
  check('monitor record does not claim verification',detail.events[0]?.detail.includes('independent fresh observation'),true);
  const second=await sweepAiGovernance(runtime.scoped,identities);
  check('successful schedule prevents immediate duplicate',second,0);
  const report=S.AiGovernanceReport.parse(await (await admin.call('/api/v1/admin/ai-governance/report')).json());
  check('finding appears in scoped report',report.findings>=1,true);
  writeEvidence('ai-governance-monitor',{profile:profile.profile,phase:'complete',assertions,result:'PASS'});
  console.log(`${assertions.length} assertions, 0 failures.`);
}catch(error){
  writeEvidence('ai-governance-monitor',{profile:profile.profile,phase,assertions,result:'FAIL',error:safeError(error),detail:error instanceof Error?error.message.slice(0,300):null});
  console.error({phase,detail:error instanceof Error?error.message.slice(0,300):'Unknown error'});process.exitCode=1;
}finally{await runtime?.close();await h.stop();}
