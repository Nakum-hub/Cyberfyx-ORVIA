import test from 'node:test';
import assert from 'node:assert/strict';
import { schemas } from '../../packages/contracts/src/index.ts';
import { obligationSatisfied,workflowCompletion } from '../../packages/domain/src/shared/completion.ts';

const id=(n:number)=>`00000000-0000-4000-8000-${String(n).padStart(12,'0')}`;
const now=new Date('2026-09-16T10:01:00Z');
const providerReceipt=schemas.Observation.parse({
  id:id(2),action_id:id(3),system_id:id(4),resource_id:id(5),target_generation:1,
  state:'OBSERVED_SATISFIED',method:'PROVIDER_RECEIPT',observed_at:'2026-09-16T10:00:00Z',
  fresh_until:'2026-09-16T10:02:00Z',desired_state:'MARKETING_RESTRICTED',observed_state:'MARKETING_RESTRICTED',
  limits:['Provider assertion only; no independent target read performed.'],
});
const obligation=schemas.Obligation.parse({
  id:id(1),task_version:0,required:true,completion_criterion:'CURRENT_SCOPED_OBSERVATION',execution_state:'ACKNOWLEDGED',
  attestation:null,scope_still_current:true,skip_reason:null,observation:providerReceipt,
});
const scopedRead=schemas.Observation.parse({...providerReceipt,method:'SCOPED_READ',limits:['Exact synthetic resource read.']});

test('W00-F07: provider-only evidence cannot complete an independent-observation obligation',()=>{
  for(const execution_state of ['ACKNOWLEDGED','EFFECT_UNKNOWN'] as const){
    const input={...obligation,execution_state};
    const original=structuredClone(input);
    assert.equal(obligationSatisfied(input,now),false);
    assert.equal(workflowCompletion([input],now),'NEEDS_ATTENTION');
    assert.deepEqual(input,original,'Completion evaluation must retain execution history and provider evidence');
  }
});

test('W00-F07 controls: only a fresh, satisfied independent read in current scope completes',()=>{
  const cases=[
    {name:'ACK alone',input:{...obligation,observation:null},expected:'NEEDS_ATTENTION'},
    {name:'fresh scoped read',input:{...obligation,observation:scopedRead},expected:'COMPLETED'},
    {name:'expired scoped read',input:{...obligation,observation:{...scopedRead,fresh_until:'2026-09-16T10:00:30Z'}},expected:'NEEDS_ATTENTION'},
    {name:'freshness boundary',input:{...obligation,observation:{...scopedRead,fresh_until:now.toISOString()}},expected:'NEEDS_ATTENTION'},
    {name:'future-dated read',input:{...obligation,observation:{...scopedRead,observed_at:'2026-09-16T10:01:30Z'}},expected:'NEEDS_ATTENTION'},
    {name:'superseded scope',input:{...obligation,scope_still_current:false,observation:scopedRead},expected:'NEEDS_ATTENTION'},
    {name:'unsatisfied read',input:{...obligation,observation:{...scopedRead,state:'OBSERVED_NOT_SATISFIED',observed_state:'MARKETING_ENABLED'}},expected:'NEEDS_ATTENTION'},
  ];
  for(const {name,input,expected} of cases)assert.equal(workflowCompletion([input],now),expected,name);
  const unknown={...obligation,execution_state:'EFFECT_UNKNOWN',observation:scopedRead};
  assert.equal(workflowCompletion([unknown],now),'COMPLETED');
  assert.equal(unknown.execution_state,'EFFECT_UNKNOWN');
});

test('W00-F07: provider receipts remain valid reconciliation evidence and manual work stays distinct',()=>{
  const reconciliation=schemas.Reconciliation.parse({
    id:id(6),action_id:id(3),uncertain_attempt_id:id(7),state:'RESOLVED',method:'PROVIDER_RECEIPT',
    started_at:'2026-09-16T10:00:00Z',finished_at:'2026-09-16T10:00:30Z',observation_id:providerReceipt.id,reason_code:null,
  });
  assert.equal(reconciliation.method,'PROVIDER_RECEIPT');
  assert.deepEqual(schemas.Obligation.parse(obligation).observation,providerReceipt);
  assert.equal(workflowCompletion([obligation],now),'NEEDS_ATTENTION');
  const manual={actor_id:id(8),recorded_at:'2026-09-16T10:00:00Z',statement:'Synthetic attributed manual evidence',evidence_record_ids:[id(9)]};
  assert.equal(obligationSatisfied({...obligation,attestation:manual},now),false);
  assert.equal(obligationSatisfied({...obligation,completion_criterion:'ATTRIBUTED_MANUAL_ATTESTATION',attestation:manual},now),true);
});
