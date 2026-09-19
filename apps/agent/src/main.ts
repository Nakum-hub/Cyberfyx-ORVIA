import { runtimeConfig } from '../../../packages/auth/src/config.ts';
import { agentEnrollment } from '../../../packages/auth/src/machine-profile.ts';
import { servicePool,machineAuthority } from '../../../packages/auth/src/machine.ts';
import { schemas } from '../../../packages/contracts/src/index.ts';
import { executeCommand } from './execute.ts';
import { safeError } from '../../../packages/testing/src/evidence.ts';
import { deliverSimulator } from '../../../packages/connectors/src/crm-synthetic/simulator.ts';
const config=runtimeConfig();const enrollment=agentEnrollment(config);
const control=servicePool(config,'orvia_agent_control');const target=servicePool(config,'orvia_target_agent');
let stopped=false;process.on('SIGINT',()=>{stopped=true;});process.on('SIGTERM',()=>{stopped=true;});process.on('message',message=>{if(message==='orvia-stop')stopped=true;});
try {
 while(!stopped) {
  for(const identity of enrollment.identities) {
   if(Date.parse(identity.expires_at)<=Date.now())throw Object.assign(new Error('Agent enrollment expired; renew through protected local setup'),{code:'MACHINE_ENROLLMENT_EXPIRED'});
   const headers={'content-type':'application/json',authorization:`Bearer ${identity.token}`};
   const response=await fetch(config.origin+'/api/v1/machine/commands/poll',{method:'POST',headers,body:JSON.stringify({installation_id:config.installation_id,environment_id:identity.scope.environment_id,maximum_commands:10}),signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error('Machine poll denied or unavailable');
   const result=schemas.CommandList.parse(await response.json());
   for(const command of result.commands) {
    const receipt=command.payload.binding.scope.operation==='SIMULATOR_RESTRICT'?await deliverSimulator(config,identity.token,command,target,machineAuthority(identity)):await executeCommand(command,enrollment,identity,control,target);
    const saved=await fetch(config.origin+`/api/v1/machine/commands/${command.payload.command_id}/receipts`,{method:'POST',headers:{...headers,'idempotency-key':command.payload.command_id},body:JSON.stringify(receipt),signal:AbortSignal.timeout(5000)});
    if(!saved.ok)throw new Error('Machine receipt unavailable; committed target ledger retained for replay');
   }
  }
  if(process.argv.includes('--once'))break;
  await new Promise(resolve=>setTimeout(resolve,2000));
 }
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await Promise.all([control.end(),target.end()]);}

if(process.connected)process.disconnect();
