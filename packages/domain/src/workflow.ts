import { randomUUID,randomBytes,type KeyObject } from 'node:crypto';
import type pg from 'pg';
import * as S from '../../contracts/src/index.ts';
import { signCommand,digest } from '../../contracts/src/crypto.ts';
import { workflowCompletion } from './completion.ts';
import { predicate,scopeValues,requireOne,audit,paged,type Context,type Page } from './transaction.ts';
import { targetTransaction } from '../../connectors/src/target-db.ts';
import { runtimeConfig } from '../../auth/src/config.ts';
import { observerEnrollment } from '../../auth/src/machine-profile.ts';
import { readSimulator } from '../../connectors/src/simulator.ts';

export async function prepareWorkflow(c: Context, id: string, signer: {key:KeyObject;key_id:string;installation_id:string;agent_id:string}) {
 const scope=scopeValues(c.actor);
 const workflow=requireOne((await c.tx.query(`SELECT * FROM app.workflows WHERE ${predicate} AND id=$4 FOR UPDATE`,[...scope,id])).rows);
 const existing=await c.tx.query(`SELECT id FROM app.action_plans WHERE ${predicate} AND workflow_id=$4 ORDER BY id`,[...scope,id]);
 const already=await c.tx.query(`SELECT 1 FROM app.obligations WHERE ${predicate} AND workflow_id=$4`,[...scope,id]);
 if(already.rowCount)return existing.rows.map(row=>row.id as string);
 const event=requireOne((await c.tx.query(`SELECT * FROM app.consent_events WHERE ${predicate} AND id=$4`,[...scope,workflow.event_id])).rows);
 const policy=requireOne((await c.tx.query(`SELECT document FROM app.policy_versions WHERE ${predicate} AND version_id=$4`,[...scope,event.policy_version_id])).rows);
 const planPolicy=S.Policy.parse(policy.document);const actions: string[]=[];
 for(const systemId of planPolicy.system_ids) {
  const system=requireOne((await c.tx.query(`SELECT connector FROM app.systems WHERE ${predicate} AND id=$4`,[...scope,systemId])).rows);
  const mapping=(await c.tx.query(`SELECT * FROM app.target_mappings WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5 AND system_id=$6`,[...scope,event.principal_id,event.purpose_id,systemId])).rows[0];
  let actionId: string|null=null;
  if(mapping&&system.connector!=='LEGACY_MANUAL') {
   actionId=randomUUID();
   const binding=S.PlanBinding.parse({workflow_id:id,action_id:actionId,scope:{...c.actor.scope,principal_reference_id:event.principal_id,system_id:systemId,resource_id:mapping.id,target_subject_reference:mapping.target_subject_reference,purpose_id:event.purpose_id,policy_version_id:event.policy_version_id,consent_epoch:Number(event.epoch),target_generation:Number(mapping.target_generation),operation:system.connector==='SYNTHETIC_CRM'?'CRM_REMOVE_MARKETING_MEMBERSHIP':'SIMULATOR_RESTRICT'},capability:'restrict_exact_synthetic_subject',capability_version:'1.0.0',operation_budget:{maximum_records:1,maximum_attempts:1}});
   const planDigest=digest(binding);const now=new Date();
   const approval=S.Approval.parse({result:'NOT_REQUIRED_BY_POLICY',decision_id:randomUUID(),policy_version_id:event.policy_version_id,approved_plan_digest:planDigest,rule_id:'SYNTHETIC_NON_DESTRUCTIVE_RESTRICTION',decided_at:now.toISOString()});
   const command=signCommand({schema_version:S.COMMAND_SCHEMA_VERSION,command_id:randomUUID(),installation_id:signer.installation_id,signing_key_id:signer.key_id,binding,scope_digest:digest(binding.scope),plan_digest:planDigest,approval,approval_digest:digest(approval),issued_at:now.toISOString(),expires_at:new Date(now.getTime()+300000).toISOString(),nonce:randomBytes(32).toString('base64url')},signer.key);
   await c.tx.query(`INSERT INTO app.action_plans VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDING')`,[...scope,actionId,id,event.principal_id,systemId,mapping.id,binding,planDigest]);
   await c.tx.query('INSERT INTO app.agent_commands VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)',[...scope,command.payload.command_id,actionId,event.principal_id,signer.agent_id,command,digest(command),command.payload.issued_at,command.payload.expires_at]);
   actions.push(actionId);
  }
  await c.tx.query(`INSERT INTO app.obligations(tenant_id,legal_entity_id,environment_id,id,workflow_id,principal_id,action_id,system_id,required,criterion) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`,[...scope,randomUUID(),id,event.principal_id,actionId,systemId,actionId||planPolicy.required_observation?'CURRENT_SCOPED_OBSERVATION':'ATTRIBUTED_MANUAL_ATTESTATION']);
 }
 await c.tx.query(`UPDATE app.workflows SET state='RUNNING',updated_at=now() WHERE ${predicate} AND id=$4`,[...scope,id]);
 await audit(c,'workflow.plan',id);return actions;
}
export async function actionReceipt(c: Context, id: string) {
 const result=(await c.tx.query(`SELECT receipt FROM app.command_receipts WHERE ${predicate} AND action_id=$4`,[...scopeValues(c.actor),id])).rows[0];
 if(!result)return null;
 const receipt=S.CommandReceipt.parse(result.receipt);
 await c.tx.query(`UPDATE app.action_plans SET execution_state=$5 WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id,receipt.execution_state]);
 return receipt;
}
export async function observeAction(c: Context, id: string, observer: pg.Pool) {
 const row=requireOne((await c.tx.query(`SELECT * FROM app.action_plans WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows);
 const plan=S.PlanBinding.parse(row.binding);const s=plan.scope;
 let target:{generation:number|string;marketing_restricted:boolean}|undefined;
 try {
  if(s.operation==='SIMULATOR_RESTRICT') {
   const config=runtimeConfig();const identity=observerEnrollment(config).identities.find(i=>i.scope.tenant_id===s.tenant_id&&i.scope.legal_entity_id===s.legal_entity_id&&i.scope.environment_id===s.environment_id);
   if(!identity)throw new Error('Observer not enrolled');target=await readSimulator(config,identity.token,s.resource_id);
  }else target=(await targetTransaction(observer,c.actor,tx=>tx.query(`SELECT generation,marketing_restricted FROM marketing_memberships WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND resource_id=$4 AND principal_id=$5 AND purpose_id=$6 AND system_id=$7 AND subject_reference=$8`,[s.tenant_id,s.legal_entity_id,s.environment_id,s.resource_id,s.principal_reference_id,s.purpose_id,s.system_id,s.target_subject_reference]))).rows[0];
 }catch{/* A denied/unavailable independent read is persisted as unverifiable. */}
 const current=target&&Number(target.generation)===s.target_generation;const now=new Date();
 const observation=S.Observation.parse({id:randomUUID(),action_id:id,system_id:s.system_id,resource_id:s.resource_id,target_generation:target?Number(target.generation):s.target_generation,state:!target?'UNVERIFIABLE':!current?'STALE':target.marketing_restricted?'OBSERVED_SATISFIED':'OBSERVED_NOT_SATISFIED',method:target?'SCOPED_READ':'NONE',observed_at:target?now.toISOString():null,fresh_until:target?new Date(now.getTime()+300000).toISOString():null,desired_state:'MARKETING_RESTRICTED',observed_state:!target?'UNKNOWN':target.marketing_restricted?'MARKETING_RESTRICTED':'MARKETING_ENABLED',limits:['Separate read of this exact synthetic resource and generation; no estate-wide coverage.']});
 await c.tx.query('INSERT INTO app.observations(tenant_id,legal_entity_id,environment_id,id,action_id,principal_id,observation) VALUES($1,$2,$3,$4,$5,$6,$7)',[...scopeValues(c.actor),observation.id,id,row.principal_id,observation]);
 await audit(c,'action.observe',id);return observation.id;
}
export async function readWorkflow(c: Context, id: string) {
 const scope=scopeValues(c.actor);
 const workflow=requireOne((await c.tx.query(`SELECT * FROM app.workflows WHERE ${predicate} AND id=$4`,[...scope,id])).rows);
 const rows=await c.tx.query(`SELECT * FROM app.action_plans WHERE ${predicate} AND workflow_id=$4 ORDER BY id`,[...scope,id]);
 const actions=[];
 for(const row of rows.rows) {
  const receipts=await c.tx.query(`SELECT receipt FROM app.command_receipts WHERE ${predicate} AND action_id=$4 ORDER BY id`,[...scope,row.id]);
  const observations=await c.tx.query(`SELECT observation FROM app.observations WHERE ${predicate} AND action_id=$4 ORDER BY created_at,id`,[...scope,row.id]);
  const reconciliations=await c.tx.query(`SELECT document FROM app.reconciliations WHERE ${predicate} AND action_id=$4 ORDER BY created_at,id`,[...scope,row.id]);
  actions.push(S.Action.parse({id:row.id,plan:row.binding,execution_state:row.execution_state,attempts:receipts.rows.map(r=>r.receipt),observations:observations.rows.map(r=>r.observation),reconciliations:reconciliations.rows.map(r=>r.document)}));
 }
 const aggregate=(await c.tx.query(`SELECT state,epoch FROM app.consent_aggregates WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5`,[...scope,workflow.principal_id,workflow.purpose_id])).rows[0];
 const obligations=[];
 const event=requireOne((await c.tx.query(`SELECT epoch FROM app.consent_events WHERE ${predicate} AND id=$4`,[...scope,workflow.event_id])).rows);
 for(const row of (await c.tx.query(`SELECT * FROM app.obligations WHERE ${predicate} AND workflow_id=$4 ORDER BY id`,[...scope,id])).rows) {
  const action=actions.find(a=>a.id===row.action_id);const observation=action?.observations.at(-1)??null;
  let current=!!aggregate&&aggregate.state==='WITHDRAWN'&&Number(aggregate.epoch)===Number(event.epoch);
  if(action) {
   const mapping=(await c.tx.query(`SELECT target_generation FROM app.target_mappings WHERE ${predicate} AND id=$4`,[...scope,action.plan.scope.resource_id])).rows[0];
   current=current&&Number(aggregate.epoch)===action.plan.scope.consent_epoch&&Number(mapping?.target_generation)===action.plan.scope.target_generation&&(!observation||observation.target_generation===action.plan.scope.target_generation);
   const check=(await c.tx.query(`SELECT supports_read,checked_at FROM app.system_checks WHERE ${predicate} AND system_id=$4 ORDER BY checked_at DESC,id DESC LIMIT 1`,[...scope,action.plan.scope.system_id])).rows[0];
   if(check&&!check.supports_read&&(!observation?.observed_at||check.checked_at.getTime()>=Date.parse(observation.observed_at)))current=false;
  }
  obligations.push(S.Obligation.parse({id:row.id,task_version:Number(row.manual_version),required:row.required,completion_criterion:row.criterion,execution_state:action?.execution_state??'MANUAL_REQUIRED',observation,attestation:row.attestation,scope_still_current:current,skip_reason:null}));
 }
 const state=workflow.state==='ACCEPTED'||workflow.state==='RUNNING'?workflow.state:workflowCompletion(obligations,new Date());
 return S.Workflow.parse({id,event_id:workflow.event_id,purpose_id:workflow.purpose_id,state,accepted_at:workflow.accepted_at.toISOString(),updated_at:workflow.updated_at.toISOString(),actions,obligations});
}
export async function finishWorkflow(c: Context, id: string) {
 const current=await readWorkflow(c,id);const state=workflowCompletion(current.obligations,new Date());
 await c.tx.query(`UPDATE app.workflows SET state=$5,updated_at=now() WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id,state]);
 await audit(c,'workflow.'+state.toLowerCase(),id);return state;
}
export async function workflowList(c: Context, page: Page) {
 const rows=await c.tx.query(`SELECT id FROM app.workflows WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
 const items=[];for(const row of rows.rows){const workflow=await readWorkflow(c,row.id);items.push(S.WorkflowSummary.parse({id:workflow.id,event_id:workflow.event_id,purpose_id:workflow.purpose_id,state:workflow.state,accepted_at:workflow.accepted_at,updated_at:workflow.updated_at}));}
 return paged(items,page);
}
