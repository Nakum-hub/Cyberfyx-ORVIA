// Foreground supervisor: stop requests are protected local files, never an API.
import { spawn,type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { existsSync,readFileSync,unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeConfig } from '../backend/auth/src/config.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { privateDirectory,writePrivateJson } from './local-private.ts';
import { webProcess } from './web-process.ts';
import { safeError,writeEvidence } from '../shared/testing/src/evidence.ts';
const p=loadProfile();const config=runtimeConfig();
if(p.profile!=='rehearsal'||process.argv[2]!=='confirm:rehearsal')throw new Error('Named rehearsal application confirmation required');
const directory=resolve(p.directory,'supervisor');privateDirectory(directory);const journal=resolve(directory,'run.json');const stopFile=resolve(directory,'stop.json');
if(existsSync(journal)||existsSync(stopFile))throw new Error('Existing supervisor journal requires operator inspection; no automatic takeover');
const db=connectDatabase(p).pool;const lock=await db.connect();const children:ChildProcess[]=[];let stopping=false;let created=false;let stopReason='ERROR';
const forced=new Set<number>();
const identity={run_id:randomUUID(),installation_id:p.installation_id,profile:p.profile,pid:process.pid,started_at:new Date().toISOString()};
const names=new Map<ChildProcess,string>();
const start=(args:string[],name:string,cwd=process.cwd())=>{const child=spawn(process.execPath,args,{cwd,windowsHide:true,stdio:['ignore','inherit','inherit','ipc'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd()}});children.push(child);names.set(child,name);return child;};
// The agent's machine enrollment expires one hour after it is issued, and an
// expired enrollment is by far the most common cause of a mid-demonstration
// stop. Classify which child exited so `safeError` can surface the curated
// operator guidance for it; the guidance text stays in the static table and is
// never taken from the error.
const exited=(child:ChildProcess)=>Object.assign(
  new Error('An owned application process exited unexpectedly'),
  { code: `${(names.get(child)??'owned').toUpperCase()}_PROCESS_EXITED` });
const requestStop=()=>{stopping=true;stopReason='OPERATOR_STOP';};process.on('SIGINT',requestStop);process.on('SIGTERM',requestStop);
// The loopback relay destroys any relayed connection idle for five minutes. This
// ownership connection carries the advisory lock and is otherwise silent, so a
// demonstration that simply paused for five minutes lost the lock and took the
// whole application down with it. Keep it active, and treat a genuinely lost
// connection as a stop with a real reason rather than an unhandled event.
const ownership:{lost:Error|null}={lost:null};
lock.on('error',error=>{ownership.lost=error instanceof Error?error:new Error(String(error));});
const HEARTBEAT_MS=30000;let lastBeat=Date.now();
try{
 if(!(await lock.query('SELECT pg_try_advisory_lock(728108) locked')).rows[0].locked)throw new Error('Another supervisor owns this profile');
 if((await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control') LIMIT 1")).rowCount)throw new Error('Existing profile worker/agent prevents startup');
 const portProbe=createServer();await new Promise<void>((done,fail)=>{portProbe.once('error',fail);portProbe.listen(config.app_port,'127.0.0.1',()=>portProbe.close(()=>done()));});
 const command=webProcess(config);const web=start(command.args,'web',command.cwd);
 let ready=false;for(let i=0;i<90;i++){if(web.exitCode!==null)throw new Error('Owned web process exited before readiness');try{ready=(await fetch(config.origin+'/healthz',{signal:AbortSignal.timeout(1000)})).ok;}catch{/* bounded startup */}if(ready)break;await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw new Error('HTTPS readiness failed');
 start(['--import','tsx','services/worker/src/main.ts'],'worker');start(['--import','tsx','services/agent/src/main.ts'],'agent');
 writePrivateJson(journal,identity);created=true;console.log(`Application supervisor running: ${config.origin}. Stop with app:stop confirm:rehearsal.`);
 while(!stopping){
  if(ownership.lost)throw ownership.lost;
  const dead=children.find(c=>c.exitCode!==null||c.signalCode!==null);
  if(dead)throw exited(dead);
  if(existsSync(stopFile)){const value=JSON.parse(readFileSync(stopFile,'utf8'));if(value.run_id!==identity.run_id||value.installation_id!==identity.installation_id)throw new Error('Mismatched stop request');requestStop();}
  if(Date.now()-lastBeat>=HEARTBEAT_MS){await lock.query('SELECT 1');lastBeat=Date.now();}
  await new Promise(r=>setTimeout(r,500));
 }
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{
 for(const child of children.reverse())if(child.exitCode===null&&child.signalCode===null){const closed=once(child,'close');if(child.connected)child.send('orvia-stop');else child.kill();const force=setTimeout(()=>{if(child.pid)forced.add(child.pid);child.kill();},10000);await closed;clearTimeout(force);}
 if(children.some(child=>child.exitCode!==0||child.signalCode!==null)||forced.size)process.exitCode=1;
 if(created&&existsSync(journal)){const actual=JSON.parse(readFileSync(journal,'utf8'));if(actual.run_id===identity.run_id)unlinkSync(journal);else process.exitCode=1;}
 if(created&&existsSync(stopFile)){const actual=JSON.parse(readFileSync(stopFile,'utf8'));if(actual.run_id===identity.run_id)unlinkSync(stopFile);else process.exitCode=1;}
 // A broken ownership connection is discarded rather than returned to the pool.
 try{lock.release(ownership.lost??undefined);}catch{/* already destroyed by the failure above */}
 await db.end();writeEvidence('application-lifecycle',{profile:p.profile,installation_id:p.installation_id,run_id:identity.run_id,started_at:identity.started_at,finished_at:new Date().toISOString(),stop_reason:stopReason,children:children.map(c=>({pid:c.pid,exit_code:c.exitCode,signal:c.signalCode,forced:c.pid?forced.has(c.pid):false})),result:process.exitCode?'FAIL':'PASS',limitations:['Only direct children owned by this foreground supervisor are stopped. Abrupt supervisor/host death requires operator inspection of its journal; no arbitrary PID killing or store deletion. Nonzero/forced child shutdown is a failure, including during an operator stop.']});
}
