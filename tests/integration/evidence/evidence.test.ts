import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile,spawn,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { readFileSync } from 'node:fs';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence,safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';
import { digest } from '../../../shared/contracts/src/crypto.ts';
import { observerEnrollment,agentEnrollment,senderEnrollment } from '../../../backend/auth/src/machine-profile.ts';
const h=new HttpFixture();const profile=loadProfile();if(!['codex-a00','ui-b00','rehearsal'].includes(profile.profile))throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
const db=connectDatabase(profile).pool;const target=connectDatabase({...profile,database:profile.database+'_targets'}).pool;
const assertions:{name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];const children:ChildProcess[]=[];let output='';let phase='setup';
function check(name:string,actual:unknown,expected:unknown){try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',expected,actual});console.log('PASS '+name);}catch{assertions.push({name,result:'FAIL',expected,actual});throw new Error('Assertion failed');}}
const run=promisify(execFile);
const cli=(file:string,args:string[]=[])=>run(process.execPath,['--import','tsx',file,`confirm:${profile.profile}`,...args],{encoding:'utf8',windowsHide:true,timeout:60000});
function start(file:string){const child=spawn(process.execPath,['--import','tsx',file],{windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd()}});child.stdout?.on('data',c=>{output+=c;});child.stderr?.on('data',c=>{output+=c;});children.push(child);return child;}
async function stop(child:ChildProcess){if(child.exitCode===null&&child.signalCode===null){const closed=once(child,'close');child.kill();await closed;}}
async function until<T>(read:()=>Promise<T>,ready:(value:T)=>boolean){for(let i=0;i<160;i++){const value=await read();if(ready(value))return value;await new Promise(r=>setTimeout(r,500));}throw new Error('Durable state timeout');}
const clients=new Map<string,ReturnType<HttpFixture['browser']>>();const login=h.login.bind(h);h.login=async name=>{let browser=clients.get(name);if(!browser){browser=await login(name);clients.set(name,browser);}return browser;};
try{
 await run('docker',['restart',`${profile.compose_project}-opa-1`],{encoding:'utf8',windowsHide:true});await h.start();
 const scenarios=[];
 for(const mode of ['HEALTHY','UNAVAILABLE','APPLY_THEN_TIMEOUT','ACK_WITHOUT_EFFECT'] as const){phase='create '+mode;const s=await createMarketingScenario(h,'ORVIA_REST_SIMULATOR');await s.change('grant');scenarios.push({mode,s,workflow:''});}
 const manual=await createMarketingScenario(h,'LEGACY_MANUAL','promotional_marketing',false);await manual.change('grant');
 const mandatory=await createMarketingScenario(h,'LEGACY_MANUAL','promotional_marketing',true);await mandatory.change('grant');
 phase='machine setup';await cli('scripts/machine-init.ts');
 for(const scenario of scenarios){phase='withdraw '+scenario.mode;await cli('scripts/simulator-fixture.ts',[scenario.s.mapping.id,scenario.mode,'read']);scenario.workflow=(await scenario.s.change('withdraw')).receipt.workflow_id!;}
 phase='withdraw manual';const manualWithdrawal=await manual.change('withdraw');phase='withdraw required observation';const mandatoryWithdrawal=await mandatory.change('withdraw');
 const manualId=manualWithdrawal.receipt.workflow_id!;const mandatoryId=mandatoryWithdrawal.receipt.workflow_id!;
 const workflow=async(id:string)=>S.Workflow.parse(await (await manual.owner.call('/api/v1/admin/workflows/'+id)).json());
 phase='durable worker and agent';const worker=start('services/worker/src/main.ts');const agent=start('services/agent/src/main.ts');
 for(const {mode,s,workflow:id} of scenarios){
  phase='observe '+mode;const w=await until(()=>workflow(id),w=>['COMPLETED','NEEDS_ATTENTION'].includes(w.state));
  const action=w.actions[0]!;check(mode+': one bounded attempt',action.attempts.length,1);check(mode+': plan attempt budget',action.plan.operation_budget.maximum_attempts,1);
  const actual=(await target.query('SELECT marketing_restricted FROM marketing_memberships WHERE resource_id=$1',[s.mapping.id])).rows[0].marketing_restricted;
  check(mode+': actual target effect',actual,['HEALTHY','APPLY_THEN_TIMEOUT'].includes(mode));
  check(mode+': execution state',action.execution_state,mode==='APPLY_THEN_TIMEOUT'?'EFFECT_UNKNOWN':mode==='UNAVAILABLE'?'FAILED':'ACKNOWLEDGED');
  check(mode+': aggregate truth',w.state,mode==='HEALTHY'?'COMPLETED':'NEEDS_ATTENTION');
  if(mode==='ACK_WITHOUT_EFFECT')check('ACK without effect has a separate mismatching read',action.observations.at(-1)?.state,'OBSERVED_NOT_SATISFIED');
  if(mode==='UNAVAILABLE')check('unavailable read is explicitly unverifiable',action.observations.at(-1)?.state,'UNVERIFIABLE');
 }
 const unknown=scenarios.find(s=>s.mode==='APPLY_THEN_TIMEOUT')!;const before=await workflow(unknown.workflow);const action=before.actions[0]!;
 check('uncertain outcome has no fabricated observation',action.observations.length,0);
 const observer=observerEnrollment(h.config).identities.find(i=>i.scope.environment_id===unknown.s.scope.environment_id)!;const executor=agentEnrollment(h.config).identities.find(i=>i.scope.environment_id===unknown.s.scope.environment_id)!;
 check('executor cannot use observer mount',(await fetch(h.config.origin+`/api/v1/machine/simulator/resources/${unknown.s.mapping.id}`,{headers:{authorization:`Bearer ${executor.token}`}})).status,401);
 check('observer read sees real applied effect',S.SimulatorState.parse(await (await fetch(h.config.origin+`/api/v1/machine/simulator/resources/${unknown.s.mapping.id}`,{headers:{authorization:`Bearer ${observer.token}`}})).json()).marketing_restricted,true);
 const command=(await db.query('SELECT command FROM app.agent_commands WHERE action_id=$1',[action.id])).rows[0].command;
 check('observer cannot execute restriction',(await fetch(h.config.origin+`/api/v1/machine/simulator/resources/${unknown.s.mapping.id}/restrict`,{method:'POST',headers:{authorization:`Bearer ${observer.token}`,'content-type':'application/json','idempotency-key':command.payload.command_id},body:JSON.stringify(command)})).status,401);
 phase='durable reconciliation';await stop(worker);const key=randomUUID();const path=`/api/v1/admin/actions/${action.id}/reconcile`;
 const acceptedResponse=await manual.owner.call(path,{}, {'idempotency-key':key});check('reconciliation accepted with worker stopped',acceptedResponse.status,202);const accepted=S.AcceptedOperation.parse(await acceptedResponse.json());
 check('reconciliation persisted pending',(await db.query('SELECT document FROM app.reconciliations WHERE id=$1',[accepted.operation_id])).rows[0].document.state,'PENDING');
 check('reconciliation committed replay stable',await (await manual.owner.call(path,{}, {'idempotency-key':key})).json(),accepted);
 start('services/worker/src/main.ts');const reconciled=await until(()=>workflow(unknown.workflow),w=>w.actions[0]!.reconciliations.at(-1)?.state==='RESOLVED');
 check('read reconciliation completes observed obligation',reconciled.state,'COMPLETED');check('original uncertain attempt remains immutable',reconciled.actions[0]!.attempts,action.attempts);check('reconciliation never invents recovered ACK',reconciled.actions[0]!.execution_state,'EFFECT_UNKNOWN');
 await cli('scripts/simulator-fixture.ts',[unknown.s.mapping.id,'HEALTHY','deny-read']);
 const checked=await manual.owner.call(`/api/v1/admin/systems/${unknown.s.system.id}/check`,{});check('capability loss becomes effective read=false',S.System.parse(await checked.json()).supports_read,false);
 check('failed capability check immediately invalidates prior completion',(await workflow(unknown.workflow)).state,'NEEDS_ATTENTION');
 const receiptId=(await db.query('SELECT receipt_id FROM app.consent_events WHERE id=$1',[reconciled.event_id])).rows[0].receipt_id;
 check('portal immediately reflects failed read capability',S.ReceiptView.parse(await (await unknown.s.alice.call('/api/v1/portal/me/receipts/'+receiptId)).json()).current.propagation_status,'NEEDS_ATTENTION');
 const deniedOp=S.AcceptedOperation.parse(await (await manual.owner.call(path,{}, {'idempotency-key':randomUUID()})).json());
 const deniedRead=await until(()=>workflow(unknown.workflow),w=>w.actions[0]!.reconciliations.find(r=>r.id===deniedOp.operation_id)?.state==='INCONCLUSIVE');
 check('new failed read supersedes prior satisfied read',deniedRead.actions[0]!.observations.at(-1)?.state,'UNVERIFIABLE');check('permission loss removes current completion',deniedRead.state,'NEEDS_ATTENTION');
 const sender=senderEnrollment(h.config).identities.find(i=>i.scope.environment_id===unknown.s.scope.environment_id)!;const attempt=randomUUID();
 const decision=S.SendResult.parse(await (await fetch(h.config.origin+'/api/v1/machine/simulator/send',{method:'POST',headers:{authorization:`Bearer ${sender.token}`,'content-type':'application/json','idempotency-key':attempt},body:JSON.stringify({attempt_id:attempt,principal_reference_id:h.users.alice!.principal_id,purpose_id:unknown.s.purpose.id,system_id:unknown.s.system.id,message_class:'MARKETING',order_reference:null})})).json());
 check('REST read permission loss also fails closed at admission',decision.decision,'INDETERMINATE');check('unverifiable REST admission has no send',(await db.query('SELECT count(*)::int n FROM app.send_records WHERE attempt_id=$1',[attempt])).rows[0].n,0);
 phase='manual assignments';await until(()=>workflow(manualId),w=>w.state==='NEEDS_ATTENTION');await until(()=>workflow(mandatoryId),w=>w.state==='NEEDS_ATTENTION');const member=await h.login('member');
 check('unassigned member cannot see workflow',(await member.call('/api/v1/admin/workflows/'+manualId)).status,404);await cli('scripts/assign-manual.ts',[manualId]);
 const assigned=S.Workflow.parse(await (await member.call('/api/v1/admin/workflows/'+manualId)).json());check('member sees only exact assigned workflow',assigned.id,manualId);
 check('member still cannot see other workflow',(await member.call('/api/v1/admin/workflows/'+mandatoryId)).status,404);
 const assignments=(await db.query('SELECT workflow_id FROM app.workflow_assignments WHERE staff_actor_id=$1 ORDER BY workflow_id',[h.users.member!.id])).rows.map(r=>r.workflow_id);
 check('member list equals exact persisted assignments',S.schemas.WorkflowList.parse(await (await member.call('/api/v1/admin/workflows?limit=100')).json()).items.map(w=>w.id).sort(),assignments);
 const task=assigned.obligations[0]!;const storedVersion=Number((await db.query('SELECT manual_version FROM app.obligations WHERE id=$1',[task.id])).rows[0].manual_version);
 check('manual task read exposes authoritative stored version',task.task_version,storedVersion);
 const attestation={statement:'Synthetic operator reports completing the declared manual restriction task.',evidence_record_ids:[manualWithdrawal.receipt.receipt_id],expected_task_version:task.task_version};
 check('foreign evidence reference denied',(await member.call(`/api/v1/admin/manual-tasks/${task.id}/attest`,{...attestation,evidence_record_ids:[mandatoryWithdrawal.receipt.receipt_id]},{'idempotency-key':randomUUID()})).status,404);
 const attestPath=`/api/v1/admin/manual-tasks/${task.id}/attest`;const attestKeys=[randomUUID(),randomUUID()];
 const concurrent=await Promise.all(attestKeys.map(key=>member.call(attestPath,attestation,{'idempotency-key':key})));
 check('concurrent current-version attestations accept exactly one',concurrent.map(r=>r.status).sort(),[202,409]);
 const winner=concurrent.findIndex(r=>r.status===202);const originalAttestation=await concurrent[winner]!.json();
 const replay=await member.call(attestPath,attestation,{'idempotency-key':attestKeys[winner]!});check('manual identical replay accepted',replay.status,202);check('manual identical replay preserves original operation',await replay.json(),originalAttestation);
 check('manual conflicting replay denied',(await member.call(attestPath,{...attestation,statement:attestation.statement+' Changed.'},{'idempotency-key':attestKeys[winner]!})).status,409);
 check('manual stale version denied on a new request',(await member.call(attestPath,attestation,{'idempotency-key':randomUUID()})).status,409);
 const completed=await workflow(manualId);check('declared manual criterion completes administratively',completed.state,'COMPLETED');check('manual attestation attributed',completed.obligations[0]!.attestation?.actor_id,h.users.member!.id);check('manual attestation creates no automated observation',completed.obligations[0]!.observation,null);
 check('manual task revision increments once',completed.obligations[0]!.task_version,task.task_version+1);
 await manual.change('grant');check('old manual attestation is not current after fresh consent',(await workflow(manualId)).state,'NEEDS_ATTENTION');
 const required=(await workflow(mandatoryId)).obligations[0]!;check('manual cannot satisfy independent-read criterion',(await manual.owner.call(`/api/v1/admin/manual-tasks/${required.id}/attest`,{...attestation,evidence_record_ids:[mandatoryWithdrawal.receipt.receipt_id]},{'idempotency-key':randomUUID()})).status,403);
 phase='scoped evidence export';const auditor=await h.login('auditor');const birch=await h.login('birch');
 const exportPath=`/api/v1/admin/evidence/${unknown.workflow}/export`;const exportedResponse=await auditor.call(exportPath);check('auditor local export allowed',exportedResponse.status,200);check('export is attachment with no-store',[exportedResponse.headers.get('content-disposition')?.startsWith('attachment;'),exportedResponse.headers.get('cache-control')],[true,'no-store']);
 const exported=S.Evidence.parse(await exportedResponse.json());const {integrity_digest,...content}=exported;check('export integrity digest matches actual document',integrity_digest,digest(content));check('export retains unresolved coverage',exported.coverage_limits.some(l=>l.startsWith('Unresolved required obligation:')),true);check('export retains exact immutable acceptance',exported.receipts[0]!.event_id,reconciled.event_id);
 check('foreign tenant cannot export',(await birch.call(exportPath)).status,404);check('principal cannot export',(await manual.alice.call(exportPath)).status,403);check('member has no export capability',(await member.call(exportPath)).status,403);
 check('export action persisted in audit',(await db.query("SELECT 1 FROM app.audit_events WHERE resource_id=$1 AND operation='evidence.export' AND actor_id=$2",[unknown.workflow,h.users.auditor!.id])).rowCount!>0,true);
 const overview=S.Overview.parse(await (await manual.owner.call('/api/v1/admin/overview')).json());const total=(await db.query('SELECT count(*)::int n FROM app.workflows WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3',[manual.scope.tenant_id,manual.scope.legal_entity_id,manual.scope.environment_id])).rows[0].n;
 check('overview workflow counts come from scoped persisted rows',overview.counts.accepted+overview.counts.running+overview.counts.needs_attention+overview.counts.completed,total);
 check('overview exposes unknown and manual axes',overview.counts.effect_unknown>0&&overview.counts.manual_required>0,true);
 const failures:ReturnType<typeof S.Obligation.parse>[]=[];let cursor:string|null=null;
 do{const page=S.schemas.FailureList.parse(await (await manual.owner.call('/api/v1/admin/failures?limit=7'+(cursor?'&cursor='+cursor:''))).json());failures.push(...page.items);cursor=page.next_cursor;}while(cursor);
 check('failure projection includes unmet observation',failures.some(o=>o.id===required.id),true);
 check('filtered failure pagination does not duplicate obligations',new Set(failures.map(o=>o.id)).size,failures.length);
 await stop(agent);
}catch(error){console.error({phase,...safeError(error),cause:safeError(error instanceof Error?error.cause:undefined),sites:error instanceof Error?error.stack?.split('\n').slice(1,6):[]});console.error(h.diagnostics);console.error(output.slice(-14000));process.exitCode=1;}
finally{for(const c of children)await stop(c);await h.stop();await Promise.all([db.end(),target.end()]);writeEvidence('evidence-integration',{test_ids:['T13','T17','T18','T19','T20','T21','T22'],profile:profile.profile,contract_version:S.CONTRACT_VERSION,build_id:readFileSync('frontend/.next/BUILD_ID','utf8').trim(),assertions,result:process.exitCode?'FAIL':'PASS',limitations:['Only customer-local synthetic targets; no browser or production-readiness claim. One automatic effect attempt; unresolved effects require read reconciliation rather than blind retry.']});}
