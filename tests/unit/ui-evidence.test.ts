import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { schemas } from '../../packages/contracts/src/index.ts';
import { actionVerification, buildTimeline, obligationStatus, obligationTotals, receiptIntegrity } from '../../apps/web/src/components/derive.ts';

// Schema examples are unit inputs only, never served as runtime/browser evidence.
const examples=JSON.parse(readFileSync('packages/contracts/generated/examples.json','utf8'));
const workflow=schemas.Workflow.parse(examples.routes.find((r:{operation_id:string})=>r.operation_id==='workflow').response);
const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const plan=schemas.PlanBinding.parse({workflow_id:workflow.id,action_id:id(1),scope:{tenant_id:id(2),legal_entity_id:id(3),environment_id:id(4),principal_reference_id:id(5),system_id:id(6),resource_id:id(7),target_subject_reference:'syn_ui_test',purpose_id:workflow.purpose_id,policy_version_id:id(8),consent_epoch:2,target_generation:1,operation:'CRM_REMOVE_MARKETING_MEMBERSHIP'},capability:'restrict_exact_synthetic_subject',capability_version:'0.3.0',operation_budget:{maximum_records:1,maximum_attempts:1}});
workflow.actions.push(schemas.Action.parse({id:plan.action_id,plan,execution_state:'ACKNOWLEDGED',attempts:[],observations:[],reconciliations:[]}));
const observation=schemas.Observation.parse({id:'00000000-0000-4000-8000-000000000010',action_id:workflow.actions[0]!.id,system_id:workflow.actions[0]!.plan.scope.system_id,resource_id:workflow.actions[0]!.plan.scope.resource_id,target_generation:workflow.actions[0]!.plan.scope.target_generation,state:'OBSERVED_SATISFIED',method:'SCOPED_READ',observed_at:'2026-09-17T00:00:00Z',fresh_until:'2026-09-17T00:05:00Z',desired_state:'MARKETING_RESTRICTED',observed_state:'MARKETING_RESTRICTED',limits:['Synthetic unit input only']});
const action={...workflow.actions[0]!,observations:[observation]};
const now=Date.parse('2026-09-17T00:01:00Z');

test('UI never verifies provider ACK, future/expired reads or mismatched current target',()=>{
  assert.equal(actionVerification(action,now,true).verified,true);
  assert.equal(actionVerification(action,now).verified,false,'current scope must be positively established');
  for(const patch of [{method:'PROVIDER_RECEIPT' as const},{target_generation:observation.target_generation+1},{resource_id:'00000000-0000-4000-8000-000000000099'},{system_id:'00000000-0000-4000-8000-000000000099'},{action_id:'00000000-0000-4000-8000-000000000099'},{fresh_until:new Date(now).toISOString()},{observed_at:new Date(now+1000).toISOString()}]){
    assert.equal(actionVerification({...action,observations:[{...observation,...patch}]},now,true).verified,false,JSON.stringify(patch));
  }
  assert.equal(actionVerification({...action,observations:[]},now,true).verified,false);
});

test('UI empty obligations, provider receipts and manual closure retain their different meanings',()=>{
  assert.match(obligationTotals({...workflow,obligations:[]},now).statement,/No obligations recorded/);
  const obligation=schemas.Obligation.parse({id:observation.id,task_version:0,required:true,completion_criterion:'CURRENT_SCOPED_OBSERVATION',execution_state:'ACKNOWLEDGED',observation:{...observation,method:'PROVIDER_RECEIPT'},attestation:null,scope_still_current:true,skip_reason:null});
  assert.equal(obligationStatus(obligation,action,now).resolved,false);
  const timeline=buildTimeline({...workflow,actions:[{...action,observations:[obligation.observation!]}]});
  assert.equal(timeline.find(e=>e.category==='OBSERVATION')!.tone,'warn');
  assert.match(timeline.find(e=>e.category==='OBSERVATION')!.title,/not independent/);
  const manual={...obligation,completion_criterion:'ATTRIBUTED_MANUAL_ATTESTATION' as const,attestation:{actor_id:observation.id,recorded_at:observation.observed_at!,statement:'Attributed synthetic manual record',evidence_record_ids:[observation.id]}};
  assert.match(obligationStatus(manual,null,now).summary,/not automated verification/);
  assert.equal(obligationStatus({...manual,scope_still_current:false},null,now).resolved,false);
});

test('UI reports receipt/current epoch contradictions without rewriting immutable receipt',()=>{
  const view=schemas.ReceiptView.parse(examples.routes.find((r:{operation_id:string})=>r.operation_id==='own_receipt').response);
  const original=structuredClone(view.receipt);
  assert.equal(receiptIntegrity({...view,current:{...view.current,consent_epoch:view.receipt.consent_epoch+1}}).superseded,true);
  assert.equal(receiptIntegrity({...view,current:{...view.current,consent_epoch:view.receipt.consent_epoch,consent_status:view.receipt.consent_status==='GRANTED'?'WITHDRAWN':'GRANTED'}}).consistent,false);
  assert.deepEqual(view.receipt,original);
});
