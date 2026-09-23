// Protected local synthetic operator process; API requests only enqueue durable
// records. This process owns fixture setup and its short-lived worker/agent.
import { randomUUID,createPrivateKey } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execFile,spawn,type ChildProcess } from 'node:child_process';
import { promisify,isDeepStrictEqual } from 'node:util';
import { once } from 'node:events';
import { loadProfile } from '../shared/testing/src/config.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import { HttpFixture } from '../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../shared/testing/src/scenario.ts';
import { safeError,writeEvidence } from '../shared/testing/src/evidence.ts';
import { restoreTarget,activateRestoredTarget,type TargetSnapshot } from '../shared/testing/src/target-recovery.ts';
import { stalePreviewSender } from '../tests/fault-fixtures/stale-sender.ts';
import { agentEnrollment,senderEnrollment } from '../backend/auth/src/machine-profile.ts';
import { servicePool,machineAuthority } from '../backend/auth/src/machine.ts';
import { targetTransaction } from '../connectors/src/shared/target-db.ts';
import { executeCommand } from '../services/agent/src/execute.ts';
import { signCommand,digest } from '../shared/contracts/src/crypto.ts';
import * as S from '../shared/contracts/src/index.ts';
import { buildId } from '../backend/domain/src/evidence/evidence.ts';
const profile=loadProfile();if(process.argv[2]!==`confirm:${profile.profile}`||process.argv.length!==3)throw new Error('Named synthetic profile confirmation required');
const db=connectDatabase(profile).pool;const target=connectDatabase({...profile,database:profile.database+'_targets'}).pool;
const h=new HttpFixture();const processes:ChildProcess[]=[];const runFile=promisify(execFile);let processOutput='';
const ownership=await db.connect();let run:ReturnType<typeof S.TestRun.parse>|undefined;let scope:string[]=[];
function start(file:string){const p=spawn(process.execPath,['--import','tsx',file],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd()}});p.stdout?.on('data',c=>{processOutput+=c;});p.stderr?.on('data',c=>{processOutput+=c;});processes.push(p);return p;}
async function stop(p:ChildProcess){if(p.exitCode===null&&p.signalCode===null){const closed=once(p,'close');p.kill();await closed;}}
async function persist(){const tx=await db.connect();try{await tx.query('BEGIN');for(const value of run!.assertions)await tx.query('INSERT INTO app.test_case_results(tenant_id,legal_entity_id,environment_id,run_id,assertion_id,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[...scope,run!.id,value.id,value]);await tx.query('UPDATE app.test_runs SET state=$2,document=$3 WHERE id=$1 AND state IN (\'NOT_RUN\',\'RUNNING\')',[run!.id,run!.state,run]);await tx.query("INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id) VALUES($1,$2,$3,$4,$5,'MACHINE',$6,$7,$8)",[randomUUID(),...scope,profile.installation_id,'test.'+run!.state.toLowerCase(),run!.id,randomUUID()]);await tx.query('COMMIT');}catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}}
async function assertion(id:string,actual:unknown,expected:unknown,artifacts:string[]=[]){
 const value=S.Assertion.parse({id,result:isDeepStrictEqual(actual,expected)?'PASS':'FAIL',actual:(JSON.stringify(actual)??'undefined').slice(0,500),expected:(JSON.stringify(expected)??'undefined').slice(0,500),artifact_paths:artifacts});
 run!.assertions.push(value);const tx=await db.connect();try{await tx.query('BEGIN');await tx.query('INSERT INTO app.test_case_results(tenant_id,legal_entity_id,environment_id,run_id,assertion_id,document) VALUES($1,$2,$3,$4,$5,$6)',[...scope,run!.id,id,value]);await tx.query('UPDATE app.test_runs SET document=$2 WHERE id=$1',[run!.id,run]);await tx.query('COMMIT');}catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
 console.log(value.result+' '+id);
}
async function checkpoint(value:unknown){await db.query('UPDATE app.test_runs SET context=context||$2::jsonb WHERE id=$1',[run!.id,JSON.stringify(value)]);}
try{
 if(!(await ownership.query('SELECT pg_try_advisory_lock(728106) locked')).rows[0].locked)throw new Error('Another regression operator owns this profile');
 const fixture=h.users.owner!.scope;scope=[fixture.tenant_id,fixture.legal_entity_id,fixture.environment_id];
 const identity=(await db.query('SELECT * FROM bootstrap_profile WHERE singleton=1')).rows[0];if(identity?.installation_id!==profile.installation_id||identity?.profile!==profile.profile)throw new Error('Profile mismatch');
 const authorized=(await db.query('SELECT * FROM app.test_fixture_profiles WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3',scope)).rows[0];if(authorized?.installation_id!==profile.installation_id||authorized?.profile!==profile.profile)throw new Error('Regression fixture not enrolled');
 // A process interruption cannot manufacture a completed test or safely resume
 // unknown test-only effects. Preserve assertions, mark ERROR, retain fixtures.
 for(const row of (await db.query("SELECT document FROM app.test_runs WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND state='RUNNING'",scope)).rows){const abandoned=S.TestRun.parse(row.document);abandoned.state='ERROR';abandoned.finished_at=new Date().toISOString();abandoned.assertions.push({id:'runner_interrupted',result:'ERROR',expected:'One uninterrupted protected fixture execution',actual:'Previous runner ended before recording a terminal result',artifact_paths:[]});run=abandoned;await persist();run=undefined;}
 const row=(await db.query("SELECT * FROM app.test_runs WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND state='NOT_RUN' ORDER BY created_at LIMIT 1",scope)).rows[0];
 if(!row){console.log('No pending synthetic test run.');}
 else {
  run=S.TestRun.parse(row.document);run.state='RUNNING';run.started_at=new Date().toISOString();await persist();
  const requester=(await db.query("SELECT 1 FROM staff_auth.authority WHERE user_id=$1 AND tenant_id=$2 AND legal_entity_id=$3 AND environment_id=$4 AND active AND role='ORG_SUPER_ADMIN'",[row.requester_id,...scope])).rowCount;
  if(!requester||run.build_id!==buildId()||run.contract_version!==S.CONTRACT_VERSION||run.request.profile!==profile.profile)throw new Error('Current requester/build/profile authority mismatch');
  if((await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control') LIMIT 1")).rowCount)throw new Error('Exclusive fixture profile required; stop existing worker and agent');
  const scenario=await createMarketingScenario(h);await scenario.change('grant');
  await checkpoint({resource_id:scenario.mapping.id,purpose_id:scenario.purpose.id,phase:'CONFIGURED'});
  await runFile(process.execPath,['--import','tsx','scripts/machine-init.ts',`confirm:${profile.profile}`],{windowsHide:true,timeout:90000});
  const enrollment=agentEnrollment(h.config);const agent=enrollment.identities.find(i=>i.scope.environment_id===fixture.environment_id)!;
  const sender=senderEnrollment(h.config).identities.find(i=>i.scope.environment_id===fixture.environment_id)!;
  const actor=machineAuthority(agent);const observer=servicePool(h.config,'orvia_target_observer');const executor=servicePool(h.config,'orvia_target_agent');const control=servicePool(h.config,'orvia_agent_control');
  try{
   const read=()=>targetTransaction(observer,actor,async tx=>(await tx.query('SELECT resource_id,generation,last_applied_epoch,marketing_restricted,quarantined FROM marketing_memberships WHERE resource_id=$1',[scenario.mapping.id])).rows[0]);
   const initial=await read();const snapshot:TargetSnapshot={resource_id:initial.resource_id,generation:Number(initial.generation),last_applied_epoch:Number(initial.last_applied_epoch),marketing_restricted:initial.marketing_restricted};await checkpoint({snapshot});
   const send=async()=>{const attempt=randomUUID();const response=await fetch(h.config.origin+'/api/v1/machine/simulator/send',{method:'POST',headers:{authorization:`Bearer ${sender.token}`,'content-type':'application/json','idempotency-key':attempt},signal:AbortSignal.timeout(15000),body:JSON.stringify({attempt_id:attempt,principal_reference_id:h.users.alice!.principal_id,purpose_id:scenario.purpose.id,system_id:scenario.system.id,message_class:'MARKETING',order_reference:null})});if(!response.ok)throw new Error('Synthetic admission transport failed');return S.SendResult.parse(await response.json());};
   const granted=await send();await assertion('fresh_permission_admits',granted.decision,'ALLOW');
   const preview=S.Decision.parse(await (await scenario.owner.call('/api/v1/admin/policy/evaluate',{principal_id:h.users.alice!.principal_id,purpose_id:scenario.purpose.id,system_id:scenario.system.id,action:'MARKETING_SEND'})).json());
   const queued={run:run.id,attempt:randomUUID(),resource:scenario.mapping.id,epoch:1,decision:preview.decision};await checkpoint({queued});
   const withdrawal=await scenario.change('withdraw');const workflow=withdrawal.receipt.workflow_id!;
   await db.query('INSERT INTO app.test_run_links VALUES($1,$2,$3,$4,$5)',[...scope,run.id,workflow]);await checkpoint({workflow_id:workflow,receipt_id:withdrawal.receipt.receipt_id,phase:'WITHDRAWN'});
   start('services/worker/src/main.ts');start('services/agent/src/main.ts');let completed:ReturnType<typeof S.Workflow.parse>|undefined;
   for(let n=0;n<160;n++){completed=S.Workflow.parse(await (await scenario.owner.call('/api/v1/admin/workflows/'+workflow)).json());if(completed.state==='COMPLETED')break;await new Promise(r=>setTimeout(r,500));}
   await assertion('durable_workflow_completed',completed?.state,'COMPLETED');await assertion('independent_read_restriction',(await read()).marketing_restricted,true);
   await assertion('independent_observation_method',completed?.actions[0]?.observations.at(-1)?.method,'SCOPED_READ');
   const post=await send();await assertion('current_boundary_blocks_withdrawal',post.decision,'BLOCK');
   if(run.request.scenario==='MARKETING_WITHDRAWAL_BROKEN_CONTROL')await stalePreviewSender(db,queued);
   const effects=Number((await db.query('SELECT (SELECT count(*) FROM app.send_records WHERE attempt_id=$1)+(SELECT count(*) FROM app.test_fixture_sends WHERE run_id=$2) n',[post.attempt_id,run.id])).rows[0].n);
   await assertion('no_post_withdrawal_send',effects,0);
   if(run.request.scenario==='TARGET_RESTORE_QUARANTINE'){
    const before=(await db.query('SELECT state,epoch FROM app.consent_aggregates WHERE purpose_id=$1',[scenario.purpose.id])).rows;
    const original=S.SignedCommand.parse((await db.query('SELECT command FROM app.agent_commands WHERE action_id=$1',[completed!.actions[0]!.id])).rows[0].command);
    const generation=await restoreTarget(profile,db,target,run.id,snapshot);await assertion('old_target_snapshot_quarantined',(await read()).quarantined,true);await assertion('actual_old_snapshot_restored',(await read()).marketing_restricted,snapshot.marketing_restricted);
    await assertion('quarantined_processing_blocked',(await send()).decision,'BLOCK');let denied=false;try{await activateRestoredTarget(profile,db,target,run.id);}catch{denied=true;}await assertion('premature_activation_denied',denied,true);
    const signer=createPrivateKey(readFileSync(resolve(profile.directory,'worker/signing-key.pem')));
    // One clock reading for the whole command. Two separate Date.now() calls
    // made the lifetime 300000ms + however long the line took, which the
    // canonical schema rejects as "at most five minutes"; the recovery scenario
    // then errored whenever the two calls did not land in the same millisecond.
    const command=(targetGeneration:number)=>{const issued=Date.now();const binding={...original.payload.binding,action_id:randomUUID(),scope:{...original.payload.binding.scope,target_generation:targetGeneration}};const approval={...original.payload.approval,decision_id:randomUUID(),approved_plan_digest:digest(binding),decided_at:new Date().toISOString()};return signCommand({...original.payload,command_id:randomUUID(),nonce:randomUUID().replaceAll('-',''),binding,approval,scope_digest:digest(binding.scope),plan_digest:digest(binding),approval_digest:digest(approval),issued_at:new Date(issued).toISOString(),expires_at:new Date(issued+300000).toISOString()},signer);};
    await assertion('old_generation_command_denied',(await executeCommand(command(snapshot.generation),enrollment,agent,control,executor)).reason_code,'STALE_GENERATION');
    const recovery=command(generation);await checkpoint({recovery_command:recovery});const receipt=await executeCommand(recovery,enrollment,agent,control,executor);await checkpoint({recovery_receipt:receipt});
    const observed=await read();await checkpoint({recovery_observation:observed});await assertion('current_restriction_independently_observed',[observed.marketing_restricted,Number(observed.generation),Number(observed.last_applied_epoch)],[true,generation,withdrawal.receipt.consent_epoch]);
    await activateRestoredTarget(profile,db,target,run.id);await assertion('reconciled_target_activated',(await read()).quarantined,false);await assertion('restriction_survives_activation',(await send()).decision,'BLOCK');
    await assertion('authoritative_consent_ledger_unchanged',(await db.query('SELECT state,epoch FROM app.consent_aggregates WHERE purpose_id=$1',[scenario.purpose.id])).rows,before);
    const journal=(await db.query('SELECT context FROM app.test_runs WHERE id=$1',[run.id])).rows[0].context;
    const artifact=writeEvidence('recovery-journal',{run_id:run.id,profile:profile.profile,context:journal,limitations:['Synthetic target-only recovery. Current control-plane ledger was retained.']});
    await assertion('recovery_journal_recorded',journal.restore_state,'RECONCILED_ACTIVE',[artifact]);
   }
  }finally{await Promise.all([observer.end(),executor.end(),control.end()]);}
  run.state=run.assertions.some(a=>a.result==='FAIL')?'FAIL':'PASS';run.finished_at=new Date().toISOString();await persist();
 }
}catch(error){
 console.error({...safeError(error),message:error instanceof Error&&/^Synthetic [A-Za-z ()0-9_,.-]+$/.test(error.message)?error.message:undefined,sites:error instanceof Error?error.stack?.split('\n').slice(1,5):[]});console.error(processOutput.slice(-8000));
 if(run){run.state='ERROR';run.finished_at=new Date().toISOString();run.assertions.push({id:'execution_error',result:'ERROR',expected:'Complete real scenario execution',actual:safeError(error).code,artifact_paths:[]});await persist();}process.exitCode=1;
}finally{
 for(const p of processes)await stop(p);if(run)writeEvidence('regression-run',{run,profile:profile.profile,fixture_id:'aster-birch-v1',limitations:['Protected synthetic operator runner; actual HTTP/PG/OPA/Temporal/agent/target only. No browser acceptance or full control-plane recovery.']});
 await ownership.query('SELECT pg_advisory_unlock(728106)');ownership.release();await Promise.all([db.end(),target.end()]);
}
