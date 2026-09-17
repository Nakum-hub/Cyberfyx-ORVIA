import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync,createPublicKey } from 'node:crypto';
import signatureVector from '../../packages/contracts/fixtures/command-vector.json' with { type:'json' };
import { canonicalJson,digest,signCommand,verifyCommand } from '../../packages/contracts/src/crypto.ts';
import { examplePayload,exampleReceipt,receiptReplayExample,uuid,sampleTime } from '../../packages/contracts/src/examples.ts';
import { schemas } from '../../packages/contracts/src/index.ts';
import { createClient,ApiError } from '../../packages/contracts/src/client.ts';
import { obligationSatisfied,workflowCompletion,assertReconciliationTransition } from '../../packages/domain/src/completion.ts';

test('canonical digest is order-independent for objects and strict for unsupported values',()=>{
  assert.equal(canonicalJson({b:2,a:[true,null,1]}),'{"a":[true,null,1],"b":2}');
  assert.equal(digest({a:1,b:2}),digest({b:2,a:1}));
  assert.notEqual(digest([1,2]),digest([2,1]));
  for(const value of [undefined,NaN,Infinity,-0,1.5,new Date(),{a:undefined},'\ud800',Array(1)])assert.throws(()=>canonicalJson(value));
});
test('signed envelope rejects altered bindings, signature, trust and expiry',()=>{
  const keys=generateKeyPairSync('ed25519');
  const command=signCommand(examplePayload,keys.privateKey);
  const expected={installation_id:examplePayload.installation_id,tenant_id:examplePayload.binding.scope.tenant_id,legal_entity_id:examplePayload.binding.scope.legal_entity_id,environment_id:examplePayload.binding.scope.environment_id,signing_key_id:examplePayload.signing_key_id,now:new Date('2026-09-16T10:01:00Z')};
  assert.deepEqual(verifyCommand(command,keys.publicKey,expected),examplePayload);
  const fixtureKey=createPublicKey({key:Buffer.from(signatureVector.public_key_spki_base64,'base64'),format:'der',type:'spki'});
  assert.deepEqual(verifyCommand(signatureVector.command,fixtureKey,expected),examplePayload);
  for(const field of Object.keys(command.payload.binding.scope)){
    const tampered=structuredClone(command) as unknown as {payload:{binding:{scope:Record<string,unknown>}}};
    const scope=tampered.payload.binding.scope;
    scope[field]=typeof scope[field]==='number'?Number(scope[field])+1:field==='operation'?'SIMULATOR_RESTRICT':field==='target_subject_reference'?'syn_other':uuid(999);
    assert.throws(()=>verifyCommand(tampered,keys.publicKey,expected),field);
  }
  for(const field of ['command_id','installation_id','signing_key_id','nonce'] as const){const altered=structuredClone(command);altered.payload[field]=field==='nonce'?'Z'.repeat(32):uuid(999);assert.throws(()=>verifyCommand(altered,keys.publicKey,expected));}
  const signature=structuredClone(command);signature.signature='A'.repeat(86);assert.throws(()=>verifyCommand(signature,keys.publicKey,expected));
  assert.throws(()=>verifyCommand(command,generateKeyPairSync('ed25519').publicKey,expected));
  assert.throws(()=>verifyCommand(command,keys.publicKey,{...expected,now:new Date('2026-09-16T10:04:00Z')}));
  assert.throws(()=>verifyCommand(command,keys.publicKey,{...expected,environment_id:uuid(999)}));
  assert.throws(()=>verifyCommand(command,keys.publicKey,{...expected,legal_entity_id:uuid(999)}));
  assert.throws(()=>verifyCommand(command,keys.publicKey,{...expected,now:new Date(NaN)}));
  assert.throws(()=>schemas.CommandPayload.parse({...examplePayload,schema_version:'999.0.0'}));
  assert.throws(()=>schemas.CommandPayload.parse({...examplePayload,schema_version:'0.2.0'}));
  assert.throws(()=>schemas.CommandPayload.parse({...examplePayload,url:'https://unapproved.example'}));
});
test('portal-safe immutable acceptance and refreshed current status remain distinct',()=>{
  assert.deepEqual(schemas.Receipt.parse(receiptReplayExample.original_response),schemas.Receipt.parse(receiptReplayExample.replayed_response));
  const view=schemas.ReceiptView.parse(receiptReplayExample.current_get);
  assert.equal(view.receipt.consent_epoch,2);assert.equal(view.current.consent_epoch,3);
  assert.throws(()=>schemas.Receipt.parse({...exampleReceipt,tenant_id:uuid(90)}));
  assert.throws(()=>schemas.Receipt.parse({...exampleReceipt,workflow_id:null}));
  assert.throws(()=>schemas.Grant.parse({expected_epoch:1,notice_version_id:uuid(1),interaction_id:uuid(2),affirmative:false}));
  assert.throws(()=>schemas.SendRequest.parse({attempt_id:uuid(1),principal_reference_id:uuid(2),purpose_id:uuid(3),system_id:uuid(4),message_class:'MARKETING',order_reference:null,decision:'ALLOW'}));
});
test('ACK and manual work do not fabricate automated observation; unknown history is retained',()=>{
  const now=new Date('2026-09-16T10:01:00Z');
  const obligation={id:uuid(1),task_version:0,required:true,completion_criterion:'CURRENT_SCOPED_OBSERVATION',execution_state:'ACKNOWLEDGED',observation:null,attestation:null,scope_still_current:true,skip_reason:null};
  assert.equal(obligationSatisfied(obligation,now),false);
  const manual={actor_id:uuid(2),recorded_at:sampleTime,statement:'Synthetic manual evidence',evidence_record_ids:[uuid(3)]};
  assert.equal(obligationSatisfied({...obligation,attestation:manual},now),false);
  assert.equal(obligationSatisfied({...obligation,completion_criterion:'ATTRIBUTED_MANUAL_ATTESTATION',attestation:manual},now),true);
  const observed={id:uuid(4),action_id:uuid(5),system_id:uuid(6),resource_id:uuid(7),target_generation:1,state:'OBSERVED_SATISFIED',method:'SCOPED_READ',observed_at:sampleTime,fresh_until:'2026-09-16T10:02:00Z',desired_state:'MARKETING_RESTRICTED',observed_state:'MARKETING_RESTRICTED',limits:['Exact synthetic resource only']};
  const unknown={...obligation,execution_state:'EFFECT_UNKNOWN',observation:observed};
  assert.equal(workflowCompletion([unknown],now),'COMPLETED');assert.equal(unknown.execution_state,'EFFECT_UNKNOWN');
  assert.equal(obligationSatisfied({...unknown,scope_still_current:false},now),false);
  assert.equal(obligationSatisfied(unknown,new Date('2026-09-16T10:03:00Z')),false);
  assert.equal(workflowCompletion([],now),'NEEDS_ATTENTION');
  assertReconciliationTransition('PENDING','RECONCILING');assertReconciliationTransition('RECONCILING','RESOLVED');
  assert.throws(()=>assertReconciliationTransition('PENDING','RESOLVED'));
  assert.throws(()=>assertReconciliationTransition('RESOLVED','RECONCILING'));
});
test('browser transport enforces request validation, parses errors, and never retries writes',async()=>{
  let calls=0;
  const fake:typeof fetch=async(input,init)=>{
    calls++;assert.equal(input,`/api/v1/portal/me/consents/${uuid(1)}/withdraw`);assert.equal(init?.credentials,'same-origin');
    return new Response(JSON.stringify({error:{code:'EPOCH_CONFLICT',message:'Synthetic conflict',retry:'REFRESH'},request_id:uuid(2)}),{status:409,headers:{'Content-Type':'application/json'}});
  };
  const client=createClient(fake);
  await assert.rejects(client.call('withdraw',{expected_epoch:2,interaction_id:uuid(3)},{params:{purpose_id:uuid(1)}}));assert.equal(calls,0);
  await assert.rejects(client.call('withdraw',{expected_epoch:2,interaction_id:uuid(3)},{params:{purpose_id:uuid(1)},idempotency_key:'synthetic_test_key_0001'}),error=>error instanceof ApiError&&error.status===409);
  assert.equal(calls,1);
});

test('no-input browser POST uses the actual server JSON boundary without inventing a DTO',async()=>{
  let calls=0;
  const client=createClient(async(_input,init)=>{
    calls++;assert.equal(init?.method,'POST');assert.equal(new Headers(init.headers).get('content-type'),'application/json');assert.equal(init?.body,'{}');
    return new Response(JSON.stringify({error:{code:'SERVICE_UNAVAILABLE',message:'Synthetic unavailable dependency',retry:'AFTER_DELAY'},request_id:uuid(2)}),{status:503});
  });
  await assert.rejects(client.call('check_system',undefined,{params:{id:uuid(1)}}),e=>e instanceof ApiError&&e.status===503);
  await assert.rejects(client.call('reconcile',undefined,{params:{id:uuid(1)},idempotency_key:'synthetic_reconcile_0001'}),e=>e instanceof ApiError&&e.status===503);
  assert.equal(calls,2,'Each explicit call dispatches once; no mutation is automatically retried');
});
