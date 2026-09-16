import { randomUUID } from 'node:crypto';
import { Id,PollRequest,CommandReceipt,AcceptedOperation,schemas } from '../../../../packages/contracts/src/index.ts';
import { digest } from '../../../../packages/contracts/src/crypto.ts';
import { machineFor,machineAuthority,servicePool } from '../../../../packages/auth/src/machine.ts';
import { limitedBody } from '../../../../packages/auth/src/server.ts';
import { AccessError } from '../../../../packages/authz/src/index.ts';
import { scopedTransaction } from '../../../../packages/db/src/runtime.ts';
import { audit,idempotent,predicate,scopeValues,requireOne } from '../../../../packages/domain/src/transaction.ts';
import { runtime } from './runtime.ts';
import { safeRoute } from './http.ts';
let identityPool: ReturnType<typeof servicePool>|undefined;
export function machineRoute(request: Request) {return safeRoute(async requestId=>{
 const r=runtime();
 if(request.method!=='POST')throw new AccessError(404,'NOT_FOUND');
 if(request.headers.has('origin'))throw new AccessError(403,'FORBIDDEN');
 const identity=await machineFor(request,identityPool??=servicePool(r.config,'orvia_machine_auth'),r.config,'AGENT');
 const actor=machineAuthority(identity);const path=new URL(request.url).pathname;
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new AccessError(400,'VALIDATION_ERROR');
 let input: unknown;try{input=JSON.parse(await limitedBody(request,16384)??'');}catch{throw new AccessError(400,'VALIDATION_ERROR');}
 const result=await scopedTransaction(r.pool,actor,async tx=>{
  const c={tx,actor,requestId};const scope=scopeValues(actor);
  if(path==='/api/v1/machine/commands/poll') {
   const parsed=PollRequest.safeParse(input);if(!parsed.success)throw new AccessError(400,'VALIDATION_ERROR');
   if(parsed.data.installation_id!==identity.installation_id||parsed.data.environment_id!==identity.scope.environment_id)throw new AccessError(403,'FORBIDDEN');
   const commands=await tx.query(`SELECT c.command FROM app.agent_commands c WHERE c.tenant_id=$1 AND c.legal_entity_id=$2 AND c.environment_id=$3 AND c.agent_id=$4 AND c.expires_at>now()
     AND NOT EXISTS(SELECT 1 FROM app.command_receipts r WHERE r.command_id=c.id) ORDER BY c.created_at,c.id LIMIT $5`,[...scope,actor.actor_id,parsed.data.maximum_commands]);
   await audit(c,'machine.poll');return schemas.CommandList.parse({commands:commands.rows.map(row=>row.command),poll_after_ms:2000});
  }
  const id=path.match(/^\/api\/v1\/machine\/commands\/([^/]+)\/receipts$/)?.[1];
  if(!id||!Id.safeParse(id).success)throw new AccessError(404,'NOT_FOUND');
  const parsed=CommandReceipt.safeParse(input);if(!parsed.success)throw new AccessError(400,'VALIDATION_ERROR');
  const receipt=parsed.data;const key=request.headers.get('idempotency-key');
  if(!key||!/^[A-Za-z0-9_-]{16,128}$/.test(key))throw new AccessError(400,'VALIDATION_ERROR');
  return idempotent(c,'machine.receipt:'+id,key,receipt,async()=>{
   const command=requireOne((await tx.query(`SELECT * FROM app.agent_commands WHERE ${predicate} AND id=$4 AND agent_id=$5`,[...scope,id,actor.actor_id])).rows);
   if(receipt.command_id!==id||receipt.command_digest!==digest(command.command)||receipt.target_generation!==command.command.payload.binding.scope.target_generation)throw new AccessError(409,'INVALID_COMMAND');
   const existing=(await tx.query(`SELECT receipt FROM app.command_receipts WHERE ${predicate} AND command_id=$4`,[...scope,id])).rows[0];
   if(existing&&digest(existing.receipt)!==digest(receipt))throw new AccessError(409,'IDEMPOTENCY_CONFLICT');
   if(!existing)await tx.query('INSERT INTO app.command_receipts VALUES($1,$2,$3,$4,$5,$6,$7,$8)',[...scope,receipt.attempt_id,command.action_id,command.principal_id,id,receipt]);
   await audit(c,'machine.receipt',id);
   return AcceptedOperation.parse({operation_id:randomUUID(),status:'ACCEPTED',accepted_at:new Date().toISOString()});
  });
 });
 return Response.json(result,{status:path.endsWith('/receipts')?202:200});
},'BUSINESS');}
