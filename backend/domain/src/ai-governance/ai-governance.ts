import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

const at = (date: Date) => date.toISOString();

export async function createAiSystem(c: Context, input: unknown) {
  const value = S.AiSystemCreate.parse(input);
  const scope = scopeValues(c.actor);
  // Every reference is checked under the actor's exact scope. Composite FKs
  // repeat the invariant inside PostgreSQL if a caller races a delete/change.
  for (const [table, id] of [
    ['purpose_versions', value.purpose_id], ['processing_activities', value.processing_activity_id],
    ['data_assets', value.input_asset_id], ['systems', value.output_system_id],
    ...(value.processor_id ? [['processors', value.processor_id]] : []),
  ]) requireOne((await c.tx.query(`SELECT id FROM app.${table} WHERE ${predicate} AND id=$4`, [...scope,id])).rows);
  const activity = requireOne((await c.tx.query(`SELECT purpose_id FROM app.processing_activities WHERE ${predicate} AND id=$4`, [...scope,value.processing_activity_id])).rows);
  if (activity.purpose_id !== value.purpose_id) throw new AccessError(400,'VALIDATION_ERROR',[{field:'processing_activity_id',code:'purpose_mismatch'}]);
  const asset = requireOne((await c.tx.query(`SELECT system_id FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope,value.input_asset_id])).rows);
  requireOne((await c.tx.query(`SELECT id FROM app.graph_relationships WHERE ${predicate} AND relationship_type='ASSET_PROCESSED_BY_ACTIVITY' AND from_asset_id=$4 AND to_activity_id=$5 AND valid_to IS NULL`,
    [...scope,value.input_asset_id,value.processing_activity_id])).rows);
  requireOne((await c.tx.query(`SELECT id FROM app.graph_relationships WHERE ${predicate} AND relationship_type='ACTIVITY_SERVES_PURPOSE' AND from_activity_id=$4 AND to_purpose_id=$5 AND valid_to IS NULL`,
    [...scope,value.processing_activity_id,value.purpose_id])).rows);
  const id = randomUUID();
  const document = S.AiSystem.parse({...value,id,owner_actor_id:c.actor.actor_id,recorded_at:new Date().toISOString(),recorded_by:c.actor.actor_id});
  await c.tx.query(`INSERT INTO app.ai_systems(tenant_id,legal_entity_id,environment_id,id,name,use_case,owner_actor_id,purpose_id,processing_activity_id,input_asset_id,output_system_id,processor_id,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [...scope,id,value.name,value.use_case,c.actor.actor_id,value.purpose_id,value.processing_activity_id,value.input_asset_id,value.output_system_id,value.processor_id,c.actor.actor_id,document]);
  await c.tx.query(`INSERT INTO app.ai_monitor_jobs(tenant_id,legal_entity_id,environment_id,ai_system_id) VALUES($1,$2,$3,$4)`,[...scope,id]);
  // The existing asset-to-system relationship is read, not inferred from a
  // user-entered output reference. This warning is an assertion needing review.
  if (asset.system_id !== value.output_system_id) {
    await insertEvent(c,id,{kind:'MONITORING',state:'NEEDS_REVIEW',title:'Input and output systems differ',
      detail:'Review the declared data flow and connected system boundary.',source_reference:null,policy_version_id:null,incident_id:null});
  }
  await audit(c,'ai_system.create',id);
  return document;
}

export async function aiSystemList(c: Context, page: Page) {
  const rows = await c.tx.query(`SELECT id,document FROM app.ai_systems WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor),page.cursor,page.limit+1]);
  return paged(rows.rows.map(row=>S.AiSystem.parse(row.document)),page);
}

export async function readAiSystem(c: Context, id: string) {
  const scope=scopeValues(c.actor);
  const system=requireOne((await c.tx.query(`SELECT document FROM app.ai_systems WHERE ${predicate} AND id=$4`,[...scope,id])).rows);
  const rows=await c.tx.query(`SELECT document FROM app.ai_governance_events WHERE ${predicate} AND ai_system_id=$4 ORDER BY recorded_at DESC,id DESC LIMIT 101`,[...scope,id]);
  const events=rows.rows.slice(0,100).map(row=>S.AiGovernanceEvent.parse(row.document));
  const flags=await eventFlags(c,id);
  return S.AiSystemDetail.parse({system:system.document,events,event_limit_reached:rows.rows.length>100,
    assessment_recorded:flags.assessment_present,approved:flags.approved,finding_open:flags.finding_open,last_monitoring_at:flags.last_monitoring_at});
}

type NewEvent = ReturnType<typeof S.AiGovernanceEventCreate.parse>;
async function insertEvent(c: Context, aiSystemId: string, value: NewEvent) {
  const id=randomUUID();
  const document=S.AiGovernanceEvent.parse({...value,id,ai_system_id:aiSystemId,recorded_at:new Date().toISOString(),recorded_by:c.actor.actor_id});
  await c.tx.query(`INSERT INTO app.ai_governance_events(tenant_id,legal_entity_id,environment_id,id,ai_system_id,kind,state,title,detail,source_reference,policy_version_id,incident_id,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
    [...scopeValues(c.actor),id,aiSystemId,value.kind,value.state,value.title,value.detail,value.source_reference,value.policy_version_id,value.incident_id,c.actor.actor_id,document]);
  return document;
}

export async function recordAiEvent(c: Context, id: string, input: unknown) {
  const value=S.AiGovernanceEventCreate.parse(input);
  const scope=scopeValues(c.actor);
  const system=requireOne((await c.tx.query(`SELECT owner_actor_id FROM app.ai_systems WHERE ${predicate} AND id=$4`,[...scope,id])).rows);
  if (value.kind==='POLICY') requireOne((await c.tx.query(`SELECT id FROM app.policy_versions WHERE ${predicate} AND version_id=$4 AND status='PUBLISHED'`,[...scope,value.policy_version_id])).rows);
  if (value.kind==='INCIDENT') requireOne((await c.tx.query(`SELECT id FROM app.incidents WHERE ${predicate} AND id=$4`,[...scope,value.incident_id])).rows);
  if (value.kind==='APPROVAL') {
    if (!c.actor.capabilities.includes('ai_governance.approve') || c.actor.actor_id===system.owner_actor_id)
      throw new AccessError(403,'FORBIDDEN');
    const flags=await eventFlags(c,id);
    if (!flags.assessment_present || !flags.policy_present || !flags.control_present || flags.finding_open)
      throw new AccessError(409,'EPOCH_CONFLICT',[{field:'kind',code:'review_prerequisites_missing'}]);
  }
  const document=await insertEvent(c,id,value);
  await audit(c,`ai_governance.${value.kind.toLowerCase()}`,document.id);
  return document;
}

async function eventFlags(c: Context,id: string) {
  const rows=await c.tx.query(`SELECT kind,state,recorded_at FROM app.ai_governance_events WHERE ${predicate} AND ai_system_id=$4 ORDER BY recorded_at DESC,id DESC`,[...scopeValues(c.actor),id]);
  const latest=new Map<string,{state:string;recorded_at:Date;position:number}>();
  rows.rows.forEach((row,position)=>{if(!latest.has(row.kind))latest.set(row.kind,{...row,position});});
  // A later assessment, policy/control change, incident or finding invalidates
  // an earlier approval. Findings stay open until a reviewed closure workflow
  // exists; a new monitoring assertion cannot silently erase one.
  const approval=latest.get('APPROVAL');
  const invalidated=approval ? rows.rows.slice(0,approval.position).some(row=>
    ['RISK_ASSESSMENT','POLICY','CONTROL','INCIDENT'].includes(row.kind)||
    (row.kind==='MONITORING'&&row.state==='FINDING')) : false;
  const findingOpen=rows.rows.some(row=>row.kind==='MONITORING'&&row.state==='FINDING');
  return {assessment_present:latest.get('RISK_ASSESSMENT')?.state==='RECORDED',
    policy_present:latest.get('POLICY')?.state==='RECORDED',control_present:latest.get('CONTROL')?.state==='RECORDED',
    approved:approval?.state==='APPROVED'&&!invalidated&&!findingOpen,finding_open:findingOpen,
    last_monitoring_at:latest.get('MONITORING')?at(latest.get('MONITORING')!.recorded_at):null};
}

export async function aiGovernanceReport(c: Context) {
  const scope=scopeValues(c.actor);
  const systems=await c.tx.query(`SELECT id FROM app.ai_systems WHERE ${predicate} ORDER BY id`,scope);
  const jobs=await c.tx.query(`SELECT count(*) FILTER(WHERE state<>'EXHAUSTED' AND next_run_at<=clock_timestamp())::int AS due,
    count(*) FILTER(WHERE state='EXHAUSTED')::int AS exhausted FROM app.ai_monitor_jobs WHERE ${predicate}`,scope);
  let approved=0,assessment_missing=0,monitoring_missing=0,findings=0;
  for(const row of systems.rows) {
    const flags=await eventFlags(c,row.id);
    if(flags.approved)approved++;
    if(!flags.assessment_present)assessment_missing++;
    if(!flags.last_monitoring_at)monitoring_missing++;
    if(flags.finding_open)findings++;
  }
  return S.AiGovernanceReport.parse({as_of:new Date().toISOString(),systems:systems.rows.length,approved,assessment_missing,monitoring_missing,findings,
    monitor_due:Number(jobs.rows[0].due),monitor_exhausted:Number(jobs.rows[0].exhausted),
    limitations:['Inventory and review records are customer declarations; approval is not independent verification of an AI system.',
      'Monitoring entries are recorded observations or assertions; this report does not test external AI behaviour.']});
}
