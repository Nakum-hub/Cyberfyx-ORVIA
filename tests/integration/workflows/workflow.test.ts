import assert from 'node:assert/strict';
import { spawn,execFile,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { randomUUID,createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence,safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { servicePool,machineAuthority } from '../../../packages/auth/src/machine.ts';
import { agentEnrollment } from '../../../packages/auth/src/machine-profile.ts';
import { targetTransaction } from '../../../packages/connectors/src/target-db.ts';
import { executeCommand } from '../../../apps/agent/src/execute.ts';
import { workflowActivities,dispatchOutbox } from '../../../apps/worker/src/withdrawal-worker.ts';
import { connectTemporal } from '../../../apps/worker/src/probe-client.ts';
import { signCommand,digest } from '../../../packages/contracts/src/crypto.ts';
import { SignedCommand,Workflow,ReceiptView,CONTRACT_VERSION } from '../../../packages/contracts/src/index.ts';

const harness=new HttpFixture();const config=harness.config;
const admin=connectDatabase(loadProfile()).pool;
const assertions: {name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];
const processes: ChildProcess[]=[];let processOutput='';
let runtime: ReturnType<typeof workflowActivities>|undefined;
let observer: ReturnType<typeof servicePool>|undefined;let agentControl: ReturnType<typeof servicePool>|undefined;let target: ReturnType<typeof servicePool>|undefined;
function check(name: string,actual: unknown,expected: unknown) {try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',expected,actual});console.log('PASS '+name);}catch{assertions.push({name,result:'FAIL',expected,actual});throw new Error('Assertion failed: '+name);}}
async function rejects(name: string,work:()=>Promise<unknown>) {let denied=false;try{await work();}catch{denied=true;}check(name,denied,true);}
function start(path: string) {const child=spawn(process.execPath,['--import','tsx',path],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd()}});child.stdout?.on('data',chunk=>{processOutput+=chunk;});child.stderr?.on('data',chunk=>{processOutput+=chunk;});processes.push(child);return child;}
async function stop(child: ChildProcess) {if(child.exitCode===null&&child.signalCode===null){const closed=once(child,'close');child.kill();await closed;}}
async function until<T>(read:()=>Promise<T>,ready:(v:T)=>boolean) {for(let i=0;i<120;i++){const value=await read();if(ready(value))return value;await new Promise(resolve=>setTimeout(resolve,500));}throw new Error('Timed out waiting for actual durable state');}
try {
 await harness.start();const scenario=await createMarketingScenario(harness);await scenario.change('grant');
 const init=await promisify(execFile)(process.execPath,['--import','tsx','scripts/machine-init.ts',`confirm:${config.profile}`],{encoding:'utf8',windowsHide:true,timeout:60000});
 check('protected machine setup completed',init.stdout.includes('provisioned'),true);
 const enrollment=agentEnrollment(config);const identity=enrollment.identities.find(i=>i.scope.environment_id===scenario.scope.environment_id)!;
 const actor=machineAuthority(identity);observer=servicePool(config,'orvia_target_observer');agentControl=servicePool(config,'orvia_agent_control');target=servicePool(config,'orvia_target_agent');
 const readTarget=()=>targetTransaction(observer!,actor,async tx=>(await tx.query('SELECT generation,last_applied_epoch,marketing_restricted,changed_at FROM marketing_memberships WHERE resource_id=$1',[scenario.mapping.id])).rows[0]);
 check('synthetic target initially has marketing membership',(await readTarget()).marketing_restricted,false);
 await rejects('observer cannot mutate target',()=>targetTransaction(observer!,actor,tx=>tx.query('UPDATE marketing_memberships SET marketing_restricted=true WHERE resource_id=$1',[scenario.mapping.id])));
 const withdrawal=await scenario.change('withdraw');const workflowId=withdrawal.receipt.workflow_id!;
 check('withdrawal is accepted with worker stopped',(await admin.query('SELECT dispatched_at FROM app.outbox_events WHERE workflow_id=$1',[workflowId])).rows[0].dispatched_at,null);
 runtime=workflowActivities();let interruptedWorkflow='';let interruptedEvent='';
 await rejects('injected stop after real Temporal acceptance',()=>dispatchOutbox(runtime!,async(id,event)=>{interruptedWorkflow=id;interruptedEvent=event;throw new Error('Synthetic interruption before dispatcher commit');}));
 check('outbox delivery marker rolled back',(await admin.query('SELECT dispatched_at FROM app.outbox_events WHERE event_id=$1',[interruptedEvent])).rows[0].dispatched_at,null);
 const temporal=await connectTemporal(config);try{check('Temporal retained accepted workflow despite DB rollback',(await temporal.client.workflow.getHandle(interruptedWorkflow).describe()).status.name,'RUNNING');}finally{await temporal.connection.close();}
 check('dispatcher resumes stable workflow identity',(await dispatchOutbox(runtime))>0,true);
 check('duplicate dispatcher pass creates no new work',await dispatchOutbox(runtime),0);
 const worker=start('apps/worker/src/main.ts');
 const commandRow=await until<{command:unknown}>(async()=>(await admin.query('SELECT c.command FROM app.agent_commands c JOIN app.action_plans a ON a.id=c.action_id WHERE a.workflow_id=$1',[workflowId])).rows[0],value=>!!value);
 check('real worker derived signed command',SignedCommand.safeParse(commandRow.command).success,true);
 const command=SignedCommand.parse(commandRow.command);
 await stop(worker);check('worker process stopped before target execution',worker.exitCode!==null||worker.signalCode!==null,true);
 check('target unchanged before agent mutation',(await readTarget()).marketing_restricted,false);
 const agent=start('apps/agent/src/main.ts');
 await until(async()=>(await admin.query('SELECT receipt FROM app.command_receipts WHERE command_id=$1',[command.payload.command_id])).rows[0],value=>!!value);
 check('agent actually removed synthetic membership',(await readTarget()).marketing_restricted,true);
 check('target recorded current withdrawal epoch',Number((await readTarget()).last_applied_epoch),2);
 const replacement=start('apps/worker/src/main.ts');
 await until(async()=>(await admin.query('SELECT state FROM app.workflows WHERE id=$1',[workflowId])).rows[0].state,state=>state==='COMPLETED');
 const response=await scenario.owner.call('/api/v1/admin/workflows/'+workflowId);check('scoped workflow endpoint returns live record',response.status,200);
 const workflow=Workflow.parse(await response.json());check('independent scoped read completes required outcome',workflow.state,'COMPLETED');
 check('observation is separate from provider acknowledgement',workflow.actions[0]!.observations[0]!.method,'SCOPED_READ');
 check('receipt retained as execution evidence',workflow.actions[0]!.attempts[0]!.execution_state,'ACKNOWLEDGED');
 const before=await readTarget();
 const replay=await executeCommand(command,enrollment,identity,agentControl,target);
 check('same command resumes original receipt',replay,workflow.actions[0]!.attempts[0]);
 check('command replay does not mutate target again',(await readTarget()).changed_at,before.changed_at);
 const signer=createPrivateKey(readFileSync(resolve(config.directory,'worker/signing-key.pem')));
 const tampered=structuredClone(command);tampered.payload.binding.scope.resource_id=randomUUID();
 await rejects('agent rejects tampered scope before effect',()=>executeCommand(tampered,enrollment,identity,agentControl!,target!));
 const wrongTrust={...enrollment,installation_id:randomUUID()};await rejects('agent independently rejects another installation',()=>executeCommand(command,wrongTrust,identity,agentControl!,target!));
 const changed=structuredClone(command.payload);changed.nonce=randomUUID().replaceAll('-','');
 await rejects('same command ID with changed signed body rejected',()=>executeCommand(signCommand(changed,signer),enrollment,identity,agentControl!,target!));
 const expired={...command.payload,command_id:randomUUID(),nonce:randomUUID().replaceAll('-',''),issued_at:new Date(Date.now()-600000).toISOString(),expires_at:new Date(Date.now()-300000).toISOString()};
 await rejects('expired new command rejected',()=>executeCommand(signCommand(expired,signer),enrollment,identity,agentControl!,target!));
 const stale=structuredClone(command.payload);stale.command_id=randomUUID();stale.nonce=randomUUID().replaceAll('-','');stale.binding.scope.target_generation++;
 stale.scope_digest=digest(stale.binding.scope);stale.plan_digest=digest(stale.binding);stale.approval.approved_plan_digest=stale.plan_digest;stale.approval_digest=digest(stale.approval);
 check('generation mismatch produces known failed execution',(await executeCommand(signCommand(stale,signer),enrollment,identity,agentControl,target)).reason_code,'STALE_GENERATION');
 const reusedNonce={...command.payload,command_id:randomUUID()};
 await rejects('nonce replay with another command ID rolls back',()=>executeCommand(signCommand(reusedNonce,signer),enrollment,identity,agentControl!,target!));
 check('all rejected commands preserve last target mutation',(await readTarget()).changed_at,before.changed_at);
 await scenario.change('grant');
 const oldEpoch={...command.payload,command_id:randomUUID(),nonce:randomUUID().replaceAll('-','')};
 check('stale withdrawal cannot act after fresh consent',(await executeCommand(signCommand(oldEpoch,signer),enrollment,identity,agentControl,target)).reason_code,'STALE_EPOCH');
 check('fresh grant does not silently reactivate target',(await readTarget()).marketing_restricted,true);
 const current=Workflow.parse(await (await scenario.owner.call('/api/v1/admin/workflows/'+workflowId)).json());check('old evidence is not current completion after epoch changes',current.state,'NEEDS_ATTENTION');
 const portal=ReceiptView.parse(await (await scenario.alice.call('/api/v1/portal/me/receipts/'+withdrawal.receipt.receipt_id)).json());check('portal receipt does not turn stale completion green',portal.current.propagation_status,'NEEDS_ATTENTION');
 const denial=await scenario.alice.call('/api/v1/machine/commands/poll',{installation_id:config.installation_id,environment_id:scenario.scope.environment_id,maximum_commands:1});check('human session cannot poll machine commands',denial.status,403);
 await stop(agent);await stop(replacement);
}catch(error){console.error({...safeError(error),message:error instanceof Error&&/^(Synthetic|Owned|Readiness|Assertion|Timed)/.test(error.message)?error.message:undefined,sites:error instanceof Error?error.stack?.split('\n').slice(1,5):[]});console.error(harness.diagnostics);console.error(processOutput.slice(-12000));process.exitCode=1;}
finally {
 for(const child of processes)await stop(child);await harness.stop();await runtime?.close();
 await Promise.all([admin.end(),observer?.end(),agentControl?.end(),target?.end()]);
 writeEvidence('workflow-integration',{test_ids:['T10','T11','T12','T13'],contract_version:CONTRACT_VERSION,profile:config.profile,assertions,result:process.exitCode?'FAIL':'PASS',limitations:['Synthetic CRM only; simulator faults, send admission and target restore are later increments. No browser acceptance claim.']});
}
