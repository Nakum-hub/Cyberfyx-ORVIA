import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { safeError,writeEvidence } from '../../../packages/testing/src/evidence.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { senderEnrollment,agentEnrollment } from '../../../packages/auth/src/machine-profile.ts';
import { servicePool } from '../../../packages/auth/src/machine.ts';
import { SendRequest,SendResult,Decision,CONTRACT_VERSION } from '../../../packages/contracts/src/index.ts';
import { enqueue,drain } from '../../../apps/demo-targets/src/sender.ts';

const h=new HttpFixture();const config=h.config;const db=connectDatabase(loadProfile()).pool;
if(!['codex-a00','rehearsal'].includes(config.profile))throw new Error('Only isolated codex-a00/rehearsal permitted');
let sender:ReturnType<typeof servicePool>|undefined;
const assertions:{name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];
function check(name:string,actual:unknown,expected:unknown){try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',expected,actual});console.log('PASS '+name);}catch{assertions.push({name,result:'FAIL',expected,actual});throw new Error('Assertion failed: '+name);}}
const run=promisify(execFile);
const setup=(script:string)=>run(process.execPath,['--import','tsx',script,`confirm:${config.profile}`],{windowsHide:true,encoding:'utf8',timeout:60000});
const docker=(command:string)=>run('docker',[command,`${config.compose_project}-opa-1`],{windowsHide:true,encoding:'utf8',timeout:30000});
const opa=`http://127.0.0.1:${config.opa_port}`;
try {
 await docker('restart');await h.start();
 const marketing=await createMarketingScenario(h);const order=await createMarketingScenario(h,'SYNTHETIC_CRM','order_service_demo');
 await marketing.change('grant');await setup('scripts/machine-init.ts');await setup('scripts/seed-orders.ts');
 const identity=senderEnrollment(config).identities.find(i=>i.scope.environment_id===marketing.scope.environment_id)!;
 const foreign=senderEnrollment(config).identities.find(i=>i.scope.tenant_id!==marketing.scope.tenant_id)!;
 const agent=agentEnrollment(config).identities.find(i=>i.scope.environment_id===marketing.scope.environment_id)!;
 sender=servicePool(config,'orvia_sender');
 const fresh=()=>SendRequest.parse({attempt_id:randomUUID(),principal_reference_id:h.users.alice!.principal_id,purpose_id:marketing.purpose.id,system_id:marketing.system.id,message_class:'MARKETING',order_reference:null});
 async function send(value:unknown,token=identity.token,key?:string) {
  return fetch(config.origin+'/api/v1/machine/simulator/send',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json','idempotency-key':key??randomUUID()},body:JSON.stringify(value),signal:AbortSignal.timeout(15000)});
 }
 async function result(value:unknown) {const r=await send(value);check('machine send transport status',r.status,200);return SendResult.parse(await r.json());}
 const count=async(id:string)=>(await db.query('SELECT count(*)::int n FROM app.send_records WHERE attempt_id=$1',[id])).rows[0].n;
 check('agent cannot authenticate as sender',(await send(fresh(),agent.token)).status,401);
 check('foreign tenant sender cannot select target',(await send(fresh(),foreign.token)).status,404);
 check('human session cannot admit sends',(await marketing.owner.call('/api/v1/machine/simulator/send',fresh(),{'idempotency-key':randomUUID()})).status,403);
 check('unallowlisted body fields denied',(await send({...fresh(),decision:'ALLOW'})).status,400);
 const initial=fresh();const allowed=await result(initial);check('fresh grant admits synthetic send',allowed.decision,'ALLOW');check('one actual send row created',await count(initial.attempt_id),1);
 check('stable attempt replay even with different transport key',await result(initial),allowed);check('replay has no additional send',await count(initial.attempt_id),1);
 check('attempt ID with changed payload denied',(await send({...initial,principal_reference_id:h.users.bob!.principal_id})).status,409);
 const previewResponse=await marketing.owner.call('/api/v1/admin/policy/evaluate',{principal_id:h.users.alice!.principal_id,purpose_id:marketing.purpose.id,system_id:marketing.system.id,action:'MARKETING_SEND'});
 check('preview is current but not admission',Decision.parse(await previewResponse.json()).decision,'ALLOW');
 const queued=fresh();await enqueue(sender,identity,queued);check('queued attempt durable with no early send',(await db.query('SELECT result FROM app.send_queue WHERE id=$1',[queued.attempt_id])).rows[0].result,null);
 // Prove ordering using a real uncommitted withdrawal transaction, not sleeps.
 const holder=await db.connect();let pending:Promise<Response>|undefined;
 const current=await marketing.choice();const withdrawalPath=`/api/v1/portal/me/consents/${marketing.purpose.id}/withdraw`;
 try {
  await holder.query('BEGIN');await holder.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([marketing.scope.tenant_id,marketing.scope.legal_entity_id,h.users.alice!.principal_id,marketing.purpose.id,'consent-boundary'])]);
  pending=marketing.alice.call(withdrawalPath,{expected_epoch:current.consent_epoch,interaction_id:current.interaction_id},{'idempotency-key':randomUUID()});pending.catch(()=>{});
  const pid=(await holder.query('SELECT pg_backend_pid() pid')).rows[0].pid;let blocked=false;
  for(let i=0;i<100;i++){if((await db.query("SELECT 1 FROM pg_stat_activity WHERE application_name='orvia-orvia_app' AND $1::int=ANY(pg_blocking_pids(pid))",[pid])).rowCount){blocked=true;break;}await new Promise(r=>setTimeout(r,25));}
  check('withdrawal waits on shared consent boundary',blocked,true);await holder.query('COMMIT');check('withdrawal commits before drain',(await pending).status,202);
 }finally{await holder.query('ROLLBACK');holder.release();if(pending)await pending.catch(()=>{});}
 const drained=await drain(sender,config,identity);check('queued attempt sees current withdrawal',drained.find(r=>r.attempt_id===queued.attempt_id)?.decision,'BLOCK');check('withdrawn queued attempt creates no send',await count(queued.attempt_id),0);
 const post=fresh();check('new post-withdrawal attempt blocked',(await result(post)).decision,'BLOCK');check('post-withdrawal no effect',await count(post.attempt_id),0);
 check('committed old admission replay preserves original response',await result(initial),allowed);check('old admission replay does not send again',await count(initial.attempt_id),1);
 const orders=JSON.parse(readFileSync(resolve(config.directory,'sender/orders.json'),'utf8')).orders as {purpose_id:string;order_reference:string}[];
 const condition=orders.find(o=>o.purpose_id===order.purpose.id)!;
 const service=()=>({...fresh(),purpose_id:order.purpose.id,system_id:order.system.id,message_class:'ORDER_SERVICE',order_reference:condition.order_reference});
 check('separately approved synthetic order service works',(await result(service())).decision,'ALLOW');
 check('service class cannot reuse marketing purpose',(await result({...fresh(),message_class:'ORDER_SERVICE',order_reference:condition.order_reference})).decision,'BLOCK');
 check('order requires its own exact condition',(await result({...service(),order_reference:'syn_order_missing'})).decision,'BLOCK');
 await db.query('UPDATE app.service_conditions SET expires_at=clock_timestamp()-interval \'1 second\' WHERE purpose_id=$1',[order.purpose.id]);
 check('expired service condition blocked',(await result(service())).decision,'BLOCK');
 const policies=await (await fetch(opa+'/v1/policies')).json() as {result:{id:string}[]};
 const policy=policies.result.find(p=>p.id.includes('processing')&&p.id.endsWith('decision.rego'));
 if(!policy)throw new Error('Actual processing policy module not found');const url=opa+'/v1/policies/'+policy.id;
 const original=readFileSync('policy/processing/decision.rego','utf8');
 try {
  check('remove actual policy module for missing-result fixture',(await fetch(url,{method:'DELETE'})).status,200);
  const missing=fresh();check('missing OPA result is indeterminate',(await result(missing)).decision,'INDETERMINATE');check('missing OPA creates no send',await count(missing.attempt_id),0);
  check('install malformed decision fixture',(await fetch(url,{method:'PUT',body:'package orvia.processing\nimport rego.v1\ndecision := {"decision":"ALLOW"}\n',headers:{'content-type':'text/plain'}})).status,200);
  const malformed=fresh();check('malformed OPA result is indeterminate',(await result(malformed)).decision,'INDETERMINATE');check('malformed OPA creates no send',await count(malformed.attempt_id),0);
 }finally{check('restore processing policy',(await fetch(url,{method:'PUT',body:original,headers:{'content-type':'text/plain'}})).status,200);}
 try{await docker('stop');const outage=fresh();check('OPA outage is indeterminate',(await result(outage)).decision,'INDETERMINATE');check('OPA outage creates no send',await count(outage.attempt_id),0);}
 finally{await docker('start');}
 let recovered=false;for(let i=0;i<60;i++){try{if((await fetch(opa+'/health')).ok){recovered=true;break;}}catch{/* actual readiness */}await new Promise(r=>setTimeout(r,100));}
 check('OPA recovered',recovered,true);check('recovered policy still blocks withdrawal',(await result(fresh())).decision,'BLOCK');
}catch(error){console.error({...safeError(error),message:error instanceof Error&&/^(Synthetic|Assertion|Actual)/.test(error.message)?error.message:undefined,cause:safeError(error instanceof Error?error.cause:undefined),sites:error instanceof Error?error.stack?.split('\n').slice(1,5):[]});console.error(h.diagnostics);process.exitCode=1;}
finally{await h.stop();await db.end();await sender?.end();writeEvidence('send-enforcement',{test_ids:['T14','T15','T16'],profile:config.profile,contract_version:CONTRACT_VERSION,build_id:readFileSync('apps/web/.next/BUILD_ID','utf8').trim(),assertions,result:process.exitCode?'FAIL':'PASS',limitations:['Synthetic send records only; no real transport. Broken bypass detection and target restore belong to A06.']});}
