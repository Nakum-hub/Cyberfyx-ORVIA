import { randomUUID } from 'node:crypto';
import { SignedCommand,SimulatorState,CommandReceipt,Id } from '../../../../shared/contracts/src/index.ts';
import { machineFor,machineAuthority,servicePool } from '../../../auth/src/machine.ts';
import { agentEnrollment,observerEnrollment } from '../../../auth/src/machine-profile.ts';
import { targetTransaction } from '../../../../connectors/src/shared/target-db.ts';
import { executeCommand } from '../../../../services/agent/src/execute.ts';
import { limitedBody } from '../../../auth/src/server.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { runtime } from '../runtime.ts';
import { safeRoute } from '../http.ts';
let pools: {auth:ReturnType<typeof servicePool>;control:ReturnType<typeof servicePool>;target:ReturnType<typeof servicePool>;observer:ReturnType<typeof servicePool>}|undefined;
export function simulatorRoute(request:Request) {return safeRoute(async()=>{
 const config=runtime().config;const p=pools??={auth:servicePool(config,'orvia_machine_auth'),control:servicePool(config,'orvia_agent_control'),target:servicePool(config,'orvia_target_agent'),observer:servicePool(config,'orvia_target_observer')};
 if(request.headers.has('origin'))throw new AccessError(403,'FORBIDDEN');
 const auth=await machineFor(request,p.auth,config,request.method==='GET'?'OBSERVER':'AGENT');const enrollment=request.method==='GET'?observerEnrollment(config):agentEnrollment(config);
 const identity=enrollment.identities.find(i=>i.id===auth.id);if(!identity)throw new AccessError(403,'FORBIDDEN');
 const actor=machineAuthority(auth);const url=new URL(request.url);
 if(url.search)throw new AccessError(400,'VALIDATION_ERROR');
 const match=url.pathname.match(/^\/api\/v1\/machine\/simulator\/(resources|receipts)\/([^/]+)(\/restrict)?$/);
 if(!match||!Id.safeParse(match[2]).success)throw new AccessError(404,'NOT_FOUND');
 const id=match[2]!;const isReceipt=match[1]==='receipts';
 const target=await targetTransaction(p.observer,actor,async tx=>{
  const row=(await tx.query(`SELECT m.*,coalesce(s.mode,'HEALTHY') mode,coalesce(s.read_allowed,true) read_allowed FROM marketing_memberships m LEFT JOIN simulator_controls s USING(resource_id) WHERE ${isReceipt?'m.resource_id=(SELECT resource_id FROM command_ledger WHERE command_id=$1)':'m.resource_id=$1'}`,[id])).rows[0];
  if(!row||row.connector!=='ORVIA_REST_SIMULATOR'||!identity.systems.some(s=>s.id===row.system_id&&s.connector==='ORVIA_REST_SIMULATOR'))throw new AccessError(404,'NOT_FOUND');return row;
 });
 if(request.method==='GET'&&!match[3]) {
  if(!target.read_allowed)throw new AccessError(403,'FORBIDDEN');
  if(target.mode==='UNAVAILABLE')throw new AccessError(503,'SERVICE_UNAVAILABLE');
  if(isReceipt){const receipt=await targetTransaction(p.observer,actor,async tx=>(await tx.query('SELECT receipt FROM command_ledger WHERE command_id=$1',[id])).rows[0]?.receipt);if(!receipt)throw new AccessError(404,'NOT_FOUND');return Response.json(CommandReceipt.parse(receipt));}
  return Response.json(SimulatorState.parse({resource_id:id,generation:Number(target.generation),last_applied_epoch:Number(target.last_applied_epoch),marketing_restricted:target.marketing_restricted,observed_at:new Date().toISOString()}));
 }
 if(request.method!=='POST'||isReceipt||!match[3])throw new AccessError(404,'NOT_FOUND');
 if(request.headers.get('content-type')?.split(';')[0]!=='application/json')throw new AccessError(400,'VALIDATION_ERROR');
 let command;try{command=SignedCommand.parse(JSON.parse(await limitedBody(request,16384)??''));}catch{throw new AccessError(400,'VALIDATION_ERROR');}
 if(command.payload.binding.scope.resource_id!==id||request.headers.get('idempotency-key')!==command.payload.command_id)throw new AccessError(409,'INVALID_COMMAND');
 if(target.mode==='UNAVAILABLE')throw new AccessError(503,'SERVICE_UNAVAILABLE');
 let receipt;try{receipt=await executeCommand(command,enrollment,{...identity,expires_at:auth.expires_at},p.control,p.target);}catch{throw new AccessError(409,'INVALID_COMMAND');}
 // Actual target transaction has committed; the caller's deadline expires while
 // this deliberate synthetic provider response is delayed. No success fallback.
 if(target.mode==='APPLY_THEN_TIMEOUT')await new Promise(resolve=>setTimeout(resolve,3000));
 return Response.json(receipt,{headers:{'x-orvia-synthetic-response':randomUUID()}});
},'BUSINESS');}
