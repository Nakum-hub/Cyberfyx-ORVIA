// Foreground supervisor: stop requests are protected local files, never an API.
import { spawn,type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { createServer } from 'node:net';
import { existsSync,readFileSync,unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { runtimeConfig } from '../packages/auth/src/config.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { loadProfile } from '../packages/testing/src/config.ts';
import { privateDirectory,writePrivateJson } from './local-private.ts';
import { webProcess } from './web-process.ts';
import { safeError,writeEvidence } from '../packages/testing/src/evidence.ts';
const p=loadProfile();const config=runtimeConfig();
if(p.profile!=='rehearsal'||process.argv[2]!=='confirm:rehearsal')throw new Error('Named rehearsal application confirmation required');
const directory=resolve(p.directory,'supervisor');privateDirectory(directory);const journal=resolve(directory,'run.json');const stopFile=resolve(directory,'stop.json');
if(existsSync(journal)||existsSync(stopFile))throw new Error('Existing supervisor journal requires operator inspection; no automatic takeover');
const db=connectDatabase(p).pool;const lock=await db.connect();const children:ChildProcess[]=[];let stopping=false;let created=false;let stopReason='ERROR';
const forced=new Set<number>();
const identity={run_id:randomUUID(),installation_id:p.installation_id,profile:p.profile,pid:process.pid,started_at:new Date().toISOString()};
const start=(args:string[],cwd=process.cwd())=>{const child=spawn(process.execPath,args,{cwd,windowsHide:true,stdio:['ignore','inherit','inherit','ipc'],env:{...process.env,ORVIA_WORKSPACE_ROOT:process.cwd()}});children.push(child);return child;};
const requestStop=()=>{stopping=true;stopReason='OPERATOR_STOP';};process.on('SIGINT',requestStop);process.on('SIGTERM',requestStop);
try{
 if(!(await lock.query('SELECT pg_try_advisory_lock(728108) locked')).rows[0].locked)throw new Error('Another supervisor owns this profile');
 if((await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control') LIMIT 1")).rowCount)throw new Error('Existing profile worker/agent prevents startup');
 const portProbe=createServer();await new Promise<void>((done,fail)=>{portProbe.once('error',fail);portProbe.listen(config.app_port,'127.0.0.1',()=>portProbe.close(()=>done()));});
 const command=webProcess(config);const web=start(command.args,command.cwd);
 let ready=false;for(let i=0;i<90;i++){if(web.exitCode!==null)throw new Error('Owned web process exited before readiness');try{ready=(await fetch(config.origin+'/healthz',{signal:AbortSignal.timeout(1000)})).ok;}catch{/* bounded startup */}if(ready)break;await new Promise(r=>setTimeout(r,500));}
 if(!ready)throw new Error('HTTPS readiness failed');
 start(['--import','tsx','apps/worker/src/main.ts']);start(['--import','tsx','apps/agent/src/main.ts']);
 writePrivateJson(journal,identity);created=true;console.log(`Application supervisor running: ${config.origin}. Stop with app:stop confirm:rehearsal.`);
 while(!stopping){
  if(children.some(c=>c.exitCode!==null||c.signalCode!==null))throw new Error('An owned application process exited unexpectedly');
  if(existsSync(stopFile)){const value=JSON.parse(readFileSync(stopFile,'utf8'));if(value.run_id!==identity.run_id||value.installation_id!==identity.installation_id)throw new Error('Mismatched stop request');requestStop();}
  await new Promise(r=>setTimeout(r,500));
 }
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{
 for(const child of children.reverse())if(child.exitCode===null&&child.signalCode===null){const closed=once(child,'close');if(child.connected)child.send('orvia-stop');else child.kill();const force=setTimeout(()=>{if(child.pid)forced.add(child.pid);child.kill();},10000);await closed;clearTimeout(force);}
 if(children.some(child=>child.exitCode!==0||child.signalCode!==null)||forced.size)process.exitCode=1;
 if(created&&existsSync(journal)){const actual=JSON.parse(readFileSync(journal,'utf8'));if(actual.run_id===identity.run_id)unlinkSync(journal);else process.exitCode=1;}
 if(created&&existsSync(stopFile)){const actual=JSON.parse(readFileSync(stopFile,'utf8'));if(actual.run_id===identity.run_id)unlinkSync(stopFile);else process.exitCode=1;}
 lock.release();await db.end();writeEvidence('application-lifecycle',{profile:p.profile,installation_id:p.installation_id,run_id:identity.run_id,started_at:identity.started_at,finished_at:new Date().toISOString(),stop_reason:stopReason,children:children.map(c=>({pid:c.pid,exit_code:c.exitCode,signal:c.signalCode,forced:c.pid?forced.has(c.pid):false})),result:process.exitCode?'FAIL':'PASS',limitations:['Only direct children owned by this foreground supervisor are stopped. Abrupt supervisor/host death requires operator inspection of its journal; no arbitrary PID killing or store deletion. Nonzero/forced child shutdown is a failure, including during an operator stop.']});
}
