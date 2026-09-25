import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence,safeError } from '../../../shared/testing/src/evidence.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { waitForAuthWindow } from '../../../shared/testing/src/auth-window.ts';
import { workflowActivities } from '../../../services/worker/src/withdrawal-worker.ts';
import { sweepCatalogDiscovery } from '../../../services/worker/src/catalog-discovery.ts';
import { observerEnrollment } from '../../../backend/auth/src/machine-profile.ts';
import { sweepAiGovernance } from '../../../services/worker/src/ai-governance-monitor.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const profile=loadProfile();
if(profile.profile!=='codex-a00')throw new Error('Synthetic codex-a00 profile only');
const h=new HttpFixture();
const db=connectDatabase(profile).pool;
const targetDb=connectDatabase({...profile,database:profile.database+'_targets'}).pool;
let runtime:ReturnType<typeof workflowActivities>|undefined;
const assertions:{name:string;result:'PASS'|'FAIL';actual:unknown;expected:unknown}[]=[];
function check(name:string,actual:unknown,expected:unknown){
  try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',actual,expected});console.log('PASS '+name);}
  catch{assertions.push({name,result:'FAIL',actual,expected});throw new Error(`Assertion failed: ${name}; actual=${JSON.stringify(actual)}`);}
}
const key=()=>({'idempotency-key':randomUUID()});
let phase='setup';
try{
  await h.start();
  await waitForAuthWindow(db);
  const scenario=await createMarketingScenario(h);
  const admin=scenario.author,owner=scenario.owner;
  const auditor=await h.login('auditor'),member=await h.login('member'),birch=await h.login('birch');
  const path='/api/v1/admin/catalog-discovery-targets';
  const input={system_id:scenario.system.id,schema_name:'public',relation_name:'marketing_memberships'};
  phase='registration';
  check('member cannot register a target',(await member.call(path,input,key())).status,403);
  check('unknown system refused',(await admin.call(path,{...input,system_id:randomUUID()},key())).status,404);
  const created=await admin.call(path,input,key());
  check('target registration succeeds',created.status,201);
  const target=S.CatalogDiscoveryTarget.parse(await created.json());
  check('registration remains pending',target.state,'PENDING');
  check('other tenant cannot see target',(await birch.call(`${path}/${target.id}`)).status,404);
  check('other tenant cannot approve target',(await birch.call(`${path}/${target.id}/approve`,{},key())).status,404);
  check('author without enablement permission cannot approve',(await admin.call(`${path}/${target.id}/approve`,{},key())).status,403);
  const approved=await owner.call(`${path}/${target.id}/approve`,{},key());
  check('separate owner approves',approved.status,200);
  check('approval has a durable due job',(await auditor.call(`${path}/${target.id}`)).status,200);
  let detail=S.CatalogDiscoveryDetail.parse(await (await auditor.call(`${path}/${target.id}`)).json());
  check('job ready and no fabricated observation',[detail.job?.state,detail.observations.length],['READY',0]);
  const missingResponse=await admin.call(path,{...input,relation_name:'does_not_exist'},key());
  check('second exact relation can be registered',missingResponse.status,201);
  const missingTarget=S.CatalogDiscoveryTarget.parse(await missingResponse.json());
  check('missing relation receives separate approval',(await owner.call(`${path}/${missingTarget.id}/approve`,{},key())).status,200);
  phase='worker observation';
  runtime=workflowActivities();
  const processed=await sweepCatalogDiscovery(runtime.scoped,runtime.enrollment.identities.map(x=>x.id),
    observerEnrollment(runtime.config).identities,runtime.observer);
  check('due catalog jobs processed',processed>=2,true);
  detail=S.CatalogDiscoveryDetail.parse(await (await auditor.call(`${path}/${target.id}`)).json());
  check('independent metadata observation persisted',detail.observations[0]?.state,'OBSERVED_METADATA');
  check('readback has column metadata',detail.observations[0]?.columns.some(x=>x.name==='marketing_restricted'),true);
  check('digest proves a stable schema snapshot',/^[a-f0-9]{64}$/.test(detail.observations[0]?.digest??''),true);
  check('no value or classification claim',detail.observations[0]?.limits.some(x=>x.includes('no record values')),true);
  check('job scheduled for freshness recheck',detail.job?.state,'READY');
  const graphPath='/api/v1/admin/data-assets';
  const assetResponse=await admin.call(`${graphPath}/from-catalog`,{observation_id:detail.observations[0]!.id},key());
  check('current source creates an observed graph dataset',assetResponse.status,201);
  const asset=S.DataAsset.parse(await assetResponse.json());
  check('graph provenance binds the exact independent read',[asset.provenance,asset.source_observation_id,asset.system_id],
    ['OBSERVED',detail.observations[0]!.id,scenario.system.id]);
  check('metadata cannot infer a sensitive category',asset.categories,[]);
  check('observed asset has bounded freshness',Date.parse(asset.fresh_until!)>Date.parse(asset.last_seen_at!),true);
  check('other tenant cannot use source observation',(await birch.call(`${graphPath}/from-catalog`,
    {observation_id:detail.observations[0]!.id},key())).status,404);
  check('one observation cannot create duplicate graph assets',(await admin.call(`${graphPath}/from-catalog`,
    {observation_id:detail.observations[0]!.id},key())).status,409);
  check('staff cannot self-label an asset observed',(await admin.call(graphPath,{system_id:scenario.system.id,kind:'DATASET',
    parent_id:null,name:'forged_read',description:'Forged staff observation',provenance:'OBSERVED',
    valid_from:new Date().toISOString(),categories:[]},key())).status,400);
  const activity=S.ProcessingActivity.parse(await (await admin.call('/api/v1/admin/processing-activities',{
    purpose_id:scenario.purpose.id,name:'Catalog linked synthetic AI use',description:'Synthetic catalog monitor fixture.',
    lawful_condition:'AFFIRMATIVE_MARKETING_CONSENT',owner_reference:'Synthetic privacy team'},key())).json());
  const relationship=async(relationship_type:string,from:{kind:string;id:string},to:{kind:string;id:string})=>
    admin.call('/api/v1/admin/graph/relationships',{relationship_type,from,to,provenance:'ASSERTED',
      valid_from:new Date().toISOString(),confidence_basis:'Synthetic mapping; relationship itself was not observed.'},key());
  check('observed asset mapped to activity',(await relationship('ASSET_PROCESSED_BY_ACTIVITY',
    {kind:'DATA_ASSET',id:asset.id},{kind:'PROCESSING_ACTIVITY',id:activity.id})).status,201);
  check('activity mapped to purpose',(await relationship('ACTIVITY_SERVES_PURPOSE',
    {kind:'PROCESSING_ACTIVITY',id:activity.id},{kind:'PURPOSE',id:scenario.purpose.id})).status,201);
  const aiResponse=await admin.call('/api/v1/admin/ai-systems',{name:'Catalog linked synthetic use',
    use_case:'Human-reviewed synthetic test of inventory monitoring.',purpose_id:scenario.purpose.id,
    processing_activity_id:activity.id,input_asset_id:asset.id,output_system_id:scenario.system.id,processor_id:null},key());
  check('AI inventory linked to observed dataset',aiResponse.status,201);
  const ai=S.AiSystem.parse(await aiResponse.json());
  check('durable AI monitor processed source',await sweepAiGovernance(runtime.scoped,
    runtime.enrollment.identities.map(x=>x.id))>=1,true);
  const aiDetail=S.AiSystemDetail.parse(await (await auditor.call(`/api/v1/admin/ai-systems/${ai.id}`)).json());
  check('AI monitor names independently read input but not model behavior',
    [aiDetail.events[0]?.state,aiDetail.events[0]?.source_reference,aiDetail.events[0]?.detail.includes('does not classify')],
    ['RECORDED',`catalog-observation:${detail.observations[0]!.id}`,true]);
  const missing=S.CatalogDiscoveryDetail.parse(await (await auditor.call(`${path}/${missingTarget.id}`)).json());
  check('absent relation is shown as missing rather than observed',[missing.observations[0]?.state,missing.observations[0]?.digest],['MISSING',null]);
  check('missing relation cannot become observed graph asset',(await admin.call(`${graphPath}/from-catalog`,
    {observation_id:missing.observations[0]!.id},key())).status,409);
  check('other tenant still cannot see observation',(await birch.call(`${path}/${target.id}`)).status,404);
  phase='failure retry';
  const ownResponse=await owner.call(path,{...input,relation_name:'owner_only_relation'},key());
  check('owner can request a relation',ownResponse.status,201);
  const ownTarget=S.CatalogDiscoveryTarget.parse(await ownResponse.json());
  check('owner cannot approve own request',(await owner.call(`${path}/${ownTarget.id}/approve`,{},key())).status,409);
  const failedResponse=await admin.call(path,{...input,relation_name:'observer_unavailable'},key());
  check('failure target registered',failedResponse.status,201);
  const failedTarget=S.CatalogDiscoveryTarget.parse(await failedResponse.json());
  check('failure target approved',(await owner.call(`${path}/${failedTarget.id}/approve`,{},key())).status,200);
  for(let attempt=1;attempt<=3;attempt++){
    check(`failed observer attempt ${attempt} processed`,await sweepCatalogDiscovery(runtime.scoped,
      runtime.enrollment.identities.map(x=>x.id),[],runtime.observer)>=1,true);
    const current=S.CatalogDiscoveryDetail.parse(await (await auditor.call(`${path}/${failedTarget.id}`)).json());
    check(`failure state after attempt ${attempt}`,[current.job?.state,current.job?.attempts,current.observations.length],
      [attempt===3?'EXHAUSTED':'RETRY',attempt,0]);
    if(attempt<3)await db.query('UPDATE app.catalog_discovery_jobs SET next_run_at=clock_timestamp() WHERE target_id=$1',[failedTarget.id]);
  }
  const failedGaps=(await db.query(`SELECT source,subject_kind,state FROM app.coverage_gaps
    WHERE subject_id=$1 AND source='CATALOG_READ_EXHAUSTED'`,[failedTarget.id])).rows;
  check('exhausted observer creates one durable target gap',failedGaps,
    [{source:'CATALOG_READ_EXHAUSTED',subject_kind:'CATALOG_TARGET',state:'OPEN'}]);
  check('other tenant cannot see exhausted target gap',(await birch.call('/api/v1/admin/gaps?limit=100')).status,200);
  const otherGaps=await (await birch.call('/api/v1/admin/gaps?limit=100')).json() as {items:{subject_id:string}[]};
  check('other tenant gap page excludes target',otherGaps.items.some(x=>x.subject_id===failedTarget.id),false);
  phase='schema drift';
  let driftColumnAdded=false;
  try{
    await targetDb.query('ALTER TABLE public.marketing_memberships ADD COLUMN orvia_catalog_drift_marker text');
    driftColumnAdded=true;
    await db.query('UPDATE app.catalog_discovery_jobs SET next_run_at=clock_timestamp() WHERE target_id=$1',[target.id]);
    check('changed relation is rescanned',await sweepCatalogDiscovery(runtime.scoped,
      runtime.enrollment.identities.map(x=>x.id),observerEnrollment(runtime.config).identities,runtime.observer)>=1,true);
    const changed=S.CatalogDiscoveryDetail.parse(await (await auditor.call(`${path}/${target.id}`)).json());
    check('independent read detects synthetic column',changed.observations[0]?.columns.some(x=>x.name==='orvia_catalog_drift_marker'),true);
    check('new source digest differs from prior read',changed.observations[0]?.digest===detail.observations[0]?.digest,false);
    const driftGaps=(await db.query(`SELECT source,subject_kind,state,evidence_reference FROM app.coverage_gaps
      WHERE subject_id=$1 AND source='CATALOG_SCHEMA_CHANGED'`,[target.id])).rows;
    check('schema drift opens durable gap with exact read reference',driftGaps,
      [{source:'CATALOG_SCHEMA_CHANGED',subject_kind:'CATALOG_TARGET',state:'OPEN',evidence_reference:changed.observations[0]!.id}]);
    check('new independent read can refresh observed inventory',(await admin.call(`${graphPath}/from-catalog`,
      {observation_id:changed.observations[0]!.id},key())).status,201);
  }finally{
    if(driftColumnAdded)await targetDb.query('ALTER TABLE public.marketing_memberships DROP COLUMN orvia_catalog_drift_marker');
  }
  phase='revocation';
  const before=S.CoverageReport.parse(await (await auditor.call('/api/v1/admin/coverage')).json());
  const countedBefore=before.measures.find(x=>x.dimension==='INVENTORY_OBSERVED')!.numerator;
  check('other tenant cannot disable source',(await birch.call(`${path}/${target.id}/disable`,{},key())).status,404);
  check('separate owner disables exact source',(await owner.call(`${path}/${target.id}/disable`,{},key())).status,200);
  detail=S.CatalogDiscoveryDetail.parse(await (await auditor.call(`${path}/${target.id}`)).json());
  check('disabled source cannot report current freshness',[detail.target.state,detail.freshness],['DISABLED','UNKNOWN']);
  check('disabled source cannot be approved again',(await owner.call(`${path}/${target.id}/approve`,{},key())).status,409);
  const after=S.CoverageReport.parse(await (await auditor.call('/api/v1/admin/coverage')).json());
  check('revoked source immediately leaves observed coverage',after.measures.find(x=>x.dimension==='INVENTORY_OBSERVED')!.numerator,countedBefore-1);
  await db.query('UPDATE app.ai_monitor_jobs SET next_run_at=clock_timestamp() WHERE ai_system_id=$1',[ai.id]);
  check('AI monitor rechecks revoked source',await sweepAiGovernance(runtime.scoped,runtime.enrollment.identities.map(x=>x.id))>=1,true);
  const revokedAi=S.AiSystemDetail.parse(await (await auditor.call(`/api/v1/admin/ai-systems/${ai.id}`)).json());
  check('AI monitor downgrades revoked input to finding',revokedAi.events[0]?.state,'FINDING');
  writeEvidence('catalog-discovery-flow',{profile:profile.profile,phase:'complete',result:'PASS',assertions});
  console.log(`${assertions.length} assertions, 0 failures.`);
}catch(error){
  writeEvidence('catalog-discovery-flow',{profile:profile.profile,phase,result:'FAIL',assertions,error:safeError(error),diagnostics:h.diagnostics.slice(-5000)});
  console.error(safeError(error));process.exitCode=1;
}finally{if(runtime)await runtime.close();await h.stop();await db.end();await targetDb.end();}
