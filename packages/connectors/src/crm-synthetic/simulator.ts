import { randomUUID } from 'node:crypto';
import { CommandReceipt,SignedCommand,SimulatorState } from '../../../contracts/src/index.ts';
import { digest } from '../../../contracts/src/crypto.ts';
import type { RuntimeConfig } from '../../../auth/src/config.ts';
import type pg from 'pg';
import type { Authority } from '../../../db/src/runtime.ts';
import { targetTransaction } from '../shared/target-db.ts';
export async function restrictSimulator(config:RuntimeConfig,token:string,command:ReturnType<typeof SignedCommand.parse>) {
 let state:'FAILED'|'EFFECT_UNKNOWN'='EFFECT_UNKNOWN';let reason='PROVIDER_RESPONSE_UNKNOWN';
 try {
  const response=await fetch(config.origin+`/api/v1/machine/simulator/resources/${command.payload.binding.scope.resource_id}/restrict`,{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json','idempotency-key':command.payload.command_id},body:JSON.stringify(command),signal:AbortSignal.timeout(1000)});
  if(response.ok){const receipt=CommandReceipt.parse(await response.json());if(receipt.command_id!==command.payload.command_id||receipt.command_digest!==digest(command))throw new Error('Receipt binding mismatch');return receipt;}
  if([400,401,403,404,409,503].includes(response.status)){state='FAILED';reason=response.status===503?'PROVIDER_UNAVAILABLE':'PROVIDER_DENIED';}
 }catch{/* Timeout, malformed response or broken connection leaves effect unknown. */}
 return CommandReceipt.parse({command_id:command.payload.command_id,command_digest:digest(command),attempt_id:randomUUID(),execution_state:state,recorded_at:new Date().toISOString(),reason_code:reason,target_generation:command.payload.binding.scope.target_generation});
}
export async function readSimulator(config:RuntimeConfig,token:string,resource:string) {
 const response=await fetch(config.origin+`/api/v1/machine/simulator/resources/${resource}`,{headers:{authorization:`Bearer ${token}`},signal:AbortSignal.timeout(2000)});
 if(!response.ok)throw new Error('Independent provider read unavailable');return SimulatorState.parse(await response.json());
}
export async function deliverSimulator(config:RuntimeConfig,token:string,command:ReturnType<typeof SignedCommand.parse>,pool:pg.Pool,actor:Authority) {
 return targetTransaction(pool,actor,async tx=>{
  const id=command.payload.command_id;const hash=digest(command);
  await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify(['agent-delivery',id])]);
  const old=(await tx.query('SELECT command_digest,receipt FROM agent_deliveries WHERE command_id=$1',[id])).rows[0];
  if(old){if(old.command_digest!==hash)throw new Error('Delivery identity conflict');return CommandReceipt.parse(old.receipt);}
  const receipt=await restrictSimulator(config,token,command);
  await tx.query('INSERT INTO agent_deliveries VALUES($1,$2,$3,$4)',[id,command.payload.binding.scope.resource_id,hash,receipt]);return receipt;
 });
}
