import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type pg from 'pg';
import * as S from '../../contracts/src/index.ts';
import { digest } from '../../contracts/src/crypto.ts';
import { AccessError } from '../../authz/src/index.ts';
import { predicate,scopeValues,requireOne,audit,type Context,type Page,lockConsent } from './transaction.ts';
import { readWorkflow,observeAction,finishWorkflow } from './workflow.ts';
import { obligationSatisfied } from './completion.ts';
import { runtimeConfig } from '../../auth/src/config.ts';
import { observerEnrollment } from '../../auth/src/machine-profile.ts';
import { readSimulator } from '../../connectors/src/simulator.ts';
import { targetTransaction } from '../../connectors/src/target-db.ts';

export function buildId(){try{return readFileSync(resolve(process.env.ORVIA_WORKSPACE_ROOT??process.cwd(),'apps/web/.next/BUILD_ID'),'utf8').trim();}catch{return 'development-unqualified';}}
export async function requestReconciliation(c:Context,actionId:string) {
 const scope=scopeValues(c.actor);const action=requireOne((await c.tx.query(`SELECT * FROM app.action_plans WHERE ${predicate} AND id=$4`,[...scope,actionId])).rows);
 await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scope,'reconcile',actionId])]);
 const receipt=(await c.tx.query(`SELECT receipt FROM app.command_receipts WHERE ${predicate} AND action_id=$4`,[...scope,actionId])).rows[0]?.receipt;
 if(!receipt)throw new AccessError(409,'IDEMPOTENCY_CONFLICT');
 const pending=(await c.tx.query(`SELECT id,created_at FROM app.reconciliations WHERE ${predicate} AND action_id=$4 AND document->>'state' IN ('PENDING','RECONCILING')`,[...scope,actionId])).rows[0];
 if(pending)return S.AcceptedOperation.parse({operation_id:pending.id,status:'ACCEPTED',accepted_at:pending.created_at.toISOString()});
 const id=randomUUID();const at=new Date().toISOString();
 const document=S.Reconciliation.parse({id,action_id:actionId,uncertain_attempt_id:receipt.attempt_id,state:'PENDING',method:'SCOPED_READ',started_at:null,finished_at:null,observation_id:null,reason_code:null});
 await c.tx.query('INSERT INTO app.reconciliations(tenant_id,legal_entity_id,environment_id,id,action_id,principal_id,requester_id,document,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',[...scope,id,actionId,action.principal_id,c.actor.actor_id,document,at]);
 await audit(c,'reconciliation.accepted',id);return S.AcceptedOperation.parse({operation_id:id,status:'ACCEPTED',accepted_at:at});
}
export async function reconcile(c:Context,id:string,observer:pg.Pool) {
 const scope=scopeValues(c.actor);const row=requireOne((await c.tx.query(`SELECT * FROM app.reconciliations WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scope,id])).rows);
 const prior=S.Reconciliation.parse(row.document);if(['RESOLVED','INCONCLUSIVE','FAILED'].includes(prior.state))return prior;
 const action=requireOne((await c.tx.query(`SELECT * FROM app.action_plans WHERE ${predicate} AND id=$4`,[...scope,row.action_id])).rows);
 const plan=S.PlanBinding.parse(action.binding);await lockConsent(c.tx,c.actor.scope,plan.scope.principal_reference_id,plan.scope.purpose_id);
 const started=new Date().toISOString();await c.tx.query(`UPDATE app.reconciliations SET document=$5 WHERE ${predicate} AND id=$4`,[...scope,id,S.Reconciliation.parse({...prior,state:'RECONCILING',started_at:started})]);
 const observationId=await observeAction(c,row.action_id,observer);
 const observation=S.Observation.parse(requireOne((await c.tx.query(`SELECT observation FROM app.observations WHERE ${predicate} AND id=$4`,[...scope,observationId])).rows).observation);
 const workflow=await readWorkflow(c,action.workflow_id);const current=workflow.obligations.find(o=>o.observation?.id===observationId)?.scope_still_current===true;
 const satisfied=current&&observation.state==='OBSERVED_SATISFIED';
 const document=S.Reconciliation.parse({...prior,state:satisfied?'RESOLVED':'INCONCLUSIVE',started_at:started,finished_at:new Date().toISOString(),observation_id:observationId,reason_code:satisfied?null:observation.state==='UNVERIFIABLE'?'READ_UNAVAILABLE':!current?'STALE_SCOPE':'DESIRED_STATE_NOT_OBSERVED'});
 await c.tx.query(`UPDATE app.reconciliations SET document=$5 WHERE ${predicate} AND id=$4`,[...scope,id,document]);await finishWorkflow(c,action.workflow_id);await audit(c,'reconciliation.'+document.state.toLowerCase(),id);return document;
}
export async function attest(c:Context,id:string,input:unknown) {
 const value=S.ManualAttestation.parse(input);const scope=scopeValues(c.actor);
 const row=requireOne((await c.tx.query(`SELECT * FROM app.obligations WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scope,id])).rows);
 if(row.action_id||row.criterion!=='ATTRIBUTED_MANUAL_ATTESTATION')throw new AccessError(403,'FORBIDDEN');
 if(Number(row.manual_version)!==value.expected_task_version||row.attestation)throw new AccessError(409,'IDEMPOTENCY_CONFLICT');
 const workflow=await readWorkflow(c,row.workflow_id);const obligation=workflow.obligations.find(o=>o.id===id)!;
 if(!obligation.scope_still_current)throw new AccessError(409,'EPOCH_CONFLICT');
 const event=requireOne((await c.tx.query(`SELECT principal_id,purpose_id FROM app.workflows WHERE ${predicate} AND id=$4`,[...scope,row.workflow_id])).rows);
 await lockConsent(c.tx,c.actor.scope,event.principal_id,event.purpose_id);
 if(!(await readWorkflow(c,row.workflow_id)).obligations.find(o=>o.id===id)?.scope_still_current)throw new AccessError(409,'EPOCH_CONFLICT');
 const evidence=await c.tx.query(`SELECT receipt_id id FROM app.consent_events WHERE ${predicate} AND id=$4 AND receipt_id=ANY($5::uuid[])`,[...scope,workflow.event_id,value.evidence_record_ids]);
 if(evidence.rowCount!==new Set(value.evidence_record_ids).size)throw new AccessError(404,'NOT_FOUND');
 const at=new Date().toISOString();await c.tx.query(`UPDATE app.obligations SET manual_version=manual_version+1,attestation=$5 WHERE ${predicate} AND id=$4`,[...scope,id,{actor_id:c.actor.actor_id,recorded_at:at,statement:value.statement,evidence_record_ids:value.evidence_record_ids}]);
 await finishWorkflow(c,row.workflow_id);await audit(c,'manual.attest',id);return S.AcceptedOperation.parse({operation_id:randomUUID(),status:'ACCEPTED',accepted_at:at});
}
export async function failures(c:Context,page:Page) {
 const rows=await c.tx.query(`SELECT id,workflow_id FROM app.obligations WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
 const items=[];for(const row of rows.rows.slice(0,page.limit)){const o=(await readWorkflow(c,row.workflow_id)).obligations.find(o=>o.id===row.id)!;if(!obligationSatisfied(o,new Date()))items.push(o);}
 return {items:items.slice(0,page.limit),next_cursor:rows.rows.length>page.limit?Buffer.from(rows.rows[page.limit-1].id).toString('base64url'):null};
}
export async function overview(c:Context) {
 const rows=await c.tx.query(`SELECT id FROM app.workflows WHERE ${predicate}`,scopeValues(c.actor));
 const counts={accepted:0,running:0,needs_attention:0,completed:0,effect_unknown:0,manual_required:0,failed:0,unverified:0};
 for(const row of rows.rows){const w=await readWorkflow(c,row.id);counts[w.state.toLowerCase() as 'accepted'|'running'|'needs_attention'|'completed']++;for(const o of w.obligations){if(o.execution_state==='EFFECT_UNKNOWN')counts.effect_unknown++;if(o.execution_state==='MANUAL_REQUIRED')counts.manual_required++;if(o.execution_state==='FAILED')counts.failed++;if(o.completion_criterion==='CURRENT_SCOPED_OBSERVATION'&&!obligationSatisfied(o,new Date()))counts.unverified++;}}
 return S.Overview.parse({scope:c.actor.scope,build_id:buildId(),contract_version:S.CONTRACT_VERSION,profile:S.PROFILE,as_of:new Date().toISOString(),counts});
}
export async function evidence(c:Context,id:string,exporting=false) {
 const workflow=await readWorkflow(c,id);const event=requireOne((await c.tx.query(`SELECT receipt,policy_version_id,notice_version_id FROM app.consent_events WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),workflow.event_id])).rows);
 const tests=(await c.tx.query('SELECT r.document FROM app.test_run_links l JOIN app.test_runs r ON(r.tenant_id=l.tenant_id AND r.legal_entity_id=l.legal_entity_id AND r.environment_id=l.environment_id AND r.id=l.run_id) WHERE l.tenant_id=$1 AND l.legal_entity_id=$2 AND l.environment_id=$3 AND l.workflow_id=$4 ORDER BY r.created_at LIMIT 100',[...scopeValues(c.actor),id])).rows.map(r=>S.TestRun.parse(r.document));
 const value={workflow,receipts:[S.Receipt.parse(event.receipt)],policy_version_ids:[event.policy_version_id],notice_version_ids:event.notice_version_id?[event.notice_version_id]:[],tests,exported_at:new Date().toISOString(),coverage_limits:['Customer-local synthetic mapped resources only; no real-vendor or estate-wide coverage.','Execution receipts are not independent observations. Unknown attempts and manual attestations retain their distinct meanings.',...workflow.obligations.filter(o=>!obligationSatisfied(o,new Date())).map(o=>'Unresolved required obligation: '+o.id)],integrity_limit:'Digest detects change relative to a trusted reference; it does not prove external effects or prevent privileged rewriting.' as const};
 await audit(c,exporting?'evidence.export':'evidence.read',id);return S.Evidence.parse({...value,integrity_digest:digest(value)});
}
export async function checkSystem(c:Context,id:string,observer:pg.Pool) {
 const scope=scopeValues(c.actor);const row=requireOne((await c.tx.query(`SELECT * FROM app.systems WHERE ${predicate} AND id=$4`,[...scope,id])).rows);
 const mappings=await c.tx.query(`SELECT * FROM app.target_mappings WHERE ${predicate} AND system_id=$4`,[...scope,id]);let readable=!!mappings.rowCount;
 for(const mapping of mappings.rows)try{
  if(row.connector==='ORVIA_REST_SIMULATOR'){const config=runtimeConfig();const identity=observerEnrollment(config).identities.find(i=>i.scope.environment_id===c.actor.scope.environment_id&&i.scope.tenant_id===c.actor.scope.tenant_id);if(!identity)throw new Error('Unenrolled observer');await readSimulator(config,identity.token,mapping.id);}
  else if(row.connector==='SYNTHETIC_CRM'){if(!(await targetTransaction(observer,c.actor,tx=>tx.query('SELECT resource_id FROM marketing_memberships WHERE resource_id=$1',[mapping.id]))).rowCount)readable=false;}
  else readable=false;
 }catch{readable=false;}
 const at=new Date().toISOString();const restrict=row.connector!=='LEGACY_MANUAL';
 await c.tx.query('INSERT INTO app.system_checks VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[...scope,randomUUID(),id,at,readable,restrict]);await audit(c,'system.check',id);
 if(!readable)await c.tx.query(`UPDATE app.workflows w SET state='NEEDS_ATTENTION',updated_at=clock_timestamp() WHERE w.tenant_id=$1 AND w.legal_entity_id=$2 AND w.environment_id=$3 AND w.state='COMPLETED' AND EXISTS(SELECT 1 FROM app.action_plans a WHERE a.tenant_id=w.tenant_id AND a.legal_entity_id=w.legal_entity_id AND a.environment_id=w.environment_id AND a.workflow_id=w.id AND a.system_id=$4)`,[...scope,id]);
 return S.System.parse({...row.document,supports_read:readable,supports_restrict:restrict,checked_at:at});
}
export async function capabilities(c:Context,page:Page) {
 const rows=await c.tx.query(`SELECT id,connector FROM app.systems WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
 const items=rows.rows.slice(0,page.limit).map(r=>S.CapabilityRecord.parse({code:r.connector+':'+r.id,target_release:'V1',implementation_status:r.connector==='LEGACY_MANUAL'?'NOT_IMPLEMENTED':'IMPLEMENTED',test_status:'NOT_RUN',supported_profile:S.PROFILE,limitations:['Declared adapter implementation; current per-system checks and workflow observations determine effective coverage.','No full-release acceptance is inferred from this catalog.']}));
 return {items,next_cursor:rows.rows.length>page.limit?Buffer.from(rows.rows[page.limit-1].id).toString('base64url'):null};
}
