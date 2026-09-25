import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { execFile,spawn,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { once } from 'node:events';
import { waitForAuthWindow } from '../../../shared/testing/src/auth-window.ts';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { writeEvidence,safeError } from '../../../shared/testing/src/evidence.ts';
import * as S from '../../../shared/contracts/src/index.ts';
const profile=loadProfile();if(!['codex-a00','rehearsal'].includes(profile.profile))throw new Error('Only codex-a00/rehearsal regression integration permitted');
const h=new HttpFixture();const db=connectDatabase(profile).pool;const cli=promisify(execFile);
const assertions:{name:string;result:'PASS'|'FAIL';expected:unknown;actual:unknown}[]=[];let runner:ChildProcess|undefined;let phase='setup';const runs:ReturnType<typeof S.TestRun.parse>[]=[];
function check(name:string,actual:unknown,expected:unknown){try{assert.deepEqual(actual,expected);assertions.push({name,result:'PASS',expected,actual});console.log('PASS '+name);}catch{assertions.push({name,result:'FAIL',expected,actual});throw new Error('Assertion failed');}}
try{
 await cli(process.execPath,['--import','tsx','scripts/regression-init.ts',`confirm:${profile.profile}`],{windowsHide:true,timeout:30000});await h.start();
 await waitForAuthWindow(db);
 const owner=await h.login('owner');const admin=await h.login('admin');const auditor=await h.login('auditor');const alice=await h.login('alice');const birch=await h.login('birch');
 const request={scenario:'MARKETING_WITHDRAWAL_HEALTHY',profile:profile.profile,fixture_id:'aster-birch-v1'};
 const start=(browser=owner,input:unknown=request,key=randomUUID())=>browser.call('/api/v1/admin/test-runs',input,{'idempotency-key':key});
 check('anonymous test start denied',(await start(h.browser())).status,401);check('principal test start denied',(await start(alice)).status,403);check('auditor test start denied',(await start(auditor)).status,403);check('delegated admin cannot run privileged faults',(await start(admin)).status,403);
 check('unenrolled tenant cannot run Aster fixture',(await start(birch)).status,404);check('another lane profile denied',(await start(owner,{...request,profile:'ui-b00'})).status,403);check('arbitrary scenario rejected',(await start(owner,{...request,scenario:'shell'})).status,400);
 for(const scenario of ['MARKETING_WITHDRAWAL_HEALTHY','MARKETING_WITHDRAWAL_BROKEN_CONTROL','MARKETING_WITHDRAWAL_HEALTHY','TARGET_RESTORE_QUARANTINE'] as const){
  await waitForAuthWindow(db);
  phase=scenario;const input={...request,scenario};const key=randomUUID();const response=await start(owner,input,key);check(scenario+' accepted',response.status,202);const accepted=S.TestRun.parse(await response.json());
  check('pending run is durably NOT_RUN',accepted.state,'NOT_RUN');check('pending request replay stable',await (await start(owner,input,key)).json(),accepted);check('overlapping fixture execution denied',(await start(owner,input)).status,409);
  const listPath='/api/v1/admin/test-runs?limit=100';
  check('anonymous run history denied',(await h.browser().call(listPath)).status,401);
  check('principal run history denied',(await alice.call(listPath)).status,403);
  let cursor:string|null=null;let found=false;let exhausted=false;
  for(let page=0;page<100;page++){
   const path=listPath+(cursor?'&cursor='+encodeURIComponent(cursor):'');
   const listed=S.schemas.TestRunList.parse(await (await auditor.call(path)).json());
   if(listed.items.some(run=>run.id===accepted.id)){found=true;break;}
   cursor=listed.next_cursor;
   if(!cursor){exhausted=true;break;}
  }
  check('scoped run history contains queued run',found,true);
  check('scoped run history paging terminates',found||exhausted,true);
  check('foreign tenant run history excludes queued run',S.schemas.TestRunList.parse(await (await birch.call(listPath)).json()).items.some(run=>run.id===accepted.id),false);
  check('foreign tenant cannot read run',(await birch.call('/api/v1/admin/test-runs/'+accepted.id)).status,404);check('principal cannot read run',(await alice.call('/api/v1/admin/test-runs/'+accepted.id)).status,403);
  const executed=await cli(process.execPath,['--import','tsx','scripts/regression-runner.ts',`confirm:${profile.profile}`],{windowsHide:true,timeout:240000,maxBuffer:2*1024*1024});
  check('protected runner executed real assertions',executed.stdout.includes('independent_read_restriction'),true);
  const result=S.TestRun.parse(await (await auditor.call('/api/v1/admin/test-runs/'+accepted.id)).json());runs.push(result);
  check(scenario+' actual result',result.state,scenario==='MARKETING_WITHDRAWAL_BROKEN_CONTROL'?'FAIL':'PASS');
  check('assertions separately persisted',(await db.query('SELECT count(*)::int n FROM app.test_case_results WHERE run_id=$1',[result.id])).rows[0].n,result.assertions.length);
  const effect=(await db.query('SELECT count(*)::int n FROM app.test_fixture_sends WHERE run_id=$1',[result.id])).rows[0].n;
  check('broken fixture actual synthetic send count',effect,scenario==='MARKETING_WITHDRAWAL_BROKEN_CONTROL'?1:0);
  check('violation assertion derives from actual effect',result.assertions.find(a=>a.id==='no_post_withdrawal_send')?.actual,String(effect));
  if(scenario==='TARGET_RESTORE_QUARANTINE')check('recovery journal artifact exists',existsSync(result.assertions.find(a=>a.id==='recovery_journal_recorded')!.artifact_paths[0]!),true);
  check('expected fault flag does not turn FAIL into PASS',result.expected_fault_detection,scenario==='MARKETING_WITHDRAWAL_BROKEN_CONTROL');
  check('committed acceptance replay remains immutable',await (await start(owner,input,key)).json(),accepted);
  const workflow=(await db.query('SELECT workflow_id FROM app.test_run_links WHERE run_id=$1',[result.id])).rows[0].workflow_id;
  const exported=S.Evidence.parse(await (await auditor.call('/api/v1/admin/evidence/'+workflow+'/export')).json());check('local evidence links actual test run',exported.tests.find(t=>t.id===result.id),result);
 }
 phase='runner interruption';const interrupted=S.TestRun.parse(await (await start()).json());
 runner=spawn(process.execPath,['--import','tsx','scripts/regression-runner.ts',`confirm:${profile.profile}`],{windowsHide:true,stdio:'ignore'});
 let started=false;for(let n=0;n<1500;n++){if((await db.query('SELECT state FROM app.test_runs WHERE id=$1',[interrupted.id])).rows[0].state==='RUNNING'){started=true;break;}await new Promise(r=>setTimeout(r,20));}
 check('runner actually began before interruption',started,true);const closed=once(runner,'close');runner.kill();await closed;
 check('interrupted run remains durable',(await db.query('SELECT state FROM app.test_runs WHERE id=$1',[interrupted.id])).rows[0].state,'RUNNING');
 await cli(process.execPath,['--import','tsx','scripts/regression-runner.ts',`confirm:${profile.profile}`],{windowsHide:true,timeout:30000});
 const recovered=S.TestRun.parse(await (await owner.call('/api/v1/admin/test-runs/'+interrupted.id)).json());check('interrupted run becomes explicit ERROR',recovered.state,'ERROR');check('interruption creates no success fallback',recovered.assertions.some(a=>a.id==='runner_interrupted'&&a.result==='ERROR'),true);
 check('interruption assertion separately persisted',(await db.query('SELECT count(*)::int n FROM app.test_case_results WHERE run_id=$1',[interrupted.id])).rows[0].n,recovered.assertions.length);
 let immutable=false;try{await db.query("UPDATE app.test_runs SET document=jsonb_set(document,'{state}','\"PASS\"'),state='PASS' WHERE id=$1",[interrupted.id]);}catch(error){immutable=safeError(error).code==='23514';}check('terminal outcome cannot be rewritten',immutable,true);
}catch(error){console.error({phase,...safeError(error),sites:error instanceof Error?error.stack?.split('\n').slice(1,5):[]});if(error&&typeof error==='object'&&'stderr' in error)console.error(String(error.stderr).slice(-8000));console.error(h.diagnostics);process.exitCode=1;}
finally{if(runner&&runner.exitCode===null&&runner.signalCode===null){const closed=once(runner,'close');runner.kill();await closed;}await h.stop();await db.end();writeEvidence('regression-integration',{test_ids:['T23','T24','T25'],profile:profile.profile,contract_version:S.CONTRACT_VERSION,assertions,runs,result:process.exitCode?'FAIL':'PASS',limitations:['Expected broken-control FAIL retained separately; healthy/repaired scenarios must PASS. Target-only recovery, no full control-plane restore or browser acceptance.']});}
