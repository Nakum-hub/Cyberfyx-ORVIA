import {randomUUID,sign,createPrivateKey} from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import {canonicalJson} from '../../../shared/contracts/src/crypto.ts';
import {vendorSigningKey} from '../../../scripts/credentials.ts';
import {operationsSuite,key} from '../../../shared/testing/src/operations-fixture.ts';
import {createMarketingScenario} from '../../../shared/testing/src/scenario.ts';
import {workflowActivities} from '../../../services/worker/src/withdrawal-worker.ts';
const t=operationsSuite('automation-quota-race');
await t.run(async()=>{
 const one=await createMarketingScenario(t.h),two=await createMarketingScenario(t.h);
 await one.change('grant');await two.change('grant');
 const ids=[(await one.change('withdraw')).receipt.workflow_id!, (await two.change('withdraw')).receipt.workflow_id!];
 const scope=[one.scope.tenant_id,one.scope.legal_entity_id,one.scope.environment_id];
 const lookup=await t.db.connect();
 let previous;
 try {
  await lookup.query('BEGIN');
  await lookup.query("SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true)",[...scope,t.h.users.owner!.id]);
  previous=(await lookup.query('SELECT claims FROM app.effective_licence($1,$2,$3)',scope)).rows[0].claims;
  await lookup.query('COMMIT');
 }finally{await lookup.query('ROLLBACK');lookup.release();}
 const used=Number((await t.db.query("SELECT count(*)::int n FROM app.agent_commands WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND created_at>=date_trunc('month',clock_timestamp())",scope)).rows[0].n);
 const k=vendorSigningKey('licence'),privateKey=createPrivateKey({key:Buffer.from(k.private,'base64'),format:'der',type:'pkcs8'});
 const install=async(quota?:number)=>{
  const claims={...previous,licence_id:randomUUID(),licensed_limits:{...previous.licensed_limits,...(quota===undefined?{}:{automated_actions_per_month:quota})}};
  delete claims.licensed_limits.automated_actions_per_month;if(quota!==undefined)claims.licensed_limits.automated_actions_per_month=quota;
  if(claims.sequence!==undefined)claims.sequence=Number((await t.db.query('SELECT max(sequence) n FROM app.licences WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3',scope)).rows[0].n)+1;
  await t.ok(one.owner.call('/api/v1/admin/licences',{licence:{algorithm:'Ed25519',claims,signing_key_id:k.key_id,signature:sign(null,Buffer.from(canonicalJson(claims)),privateKey).toString('base64url')}},key()),S.schemas.LicenceState,[200,201]);
 };
 const runtime=workflowActivities();
 try {
  await install(used+1);
  const worker=runtime.enrollment.identities.find(i=>i.scope.environment_id===one.scope.environment_id)!;
  const actions=await Promise.all(ids.map(id=>runtime.activities.prepare(worker.id,id)));
  t.check('two concurrent withdrawals spend only the final allowance',actions.map(x=>x.length).sort(),[0,1]);
  const obligations=(await t.db.query('SELECT action_id,criterion FROM app.obligations WHERE workflow_id=ANY($1::uuid[])',[ids])).rows;
  t.check('the other withdrawal retains its manual obligation',obligations.filter(r=>!r.action_id&&r.criterion==='ATTRIBUTED_MANUAL_ATTESTATION').length,1);
 }finally{await runtime.close();await install();}
});
