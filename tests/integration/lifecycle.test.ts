import assert from 'node:assert/strict';
import { spawn,execFile,type ChildProcess } from 'node:child_process';
import { promisify } from 'node:util';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { once } from 'node:events';
import { loadProfile } from '../../packages/testing/src/config.ts';
import { runtimeConfig } from '../../packages/auth/src/config.ts';
import { connectDatabase } from '../../packages/db/src/index.ts';
import { writeEvidence,safeError } from '../../packages/testing/src/evidence.ts';
import { resetBootstrap } from '../../packages/testing/src/reset.ts';
const p=loadProfile();if(p.profile!=='rehearsal')throw new Error('Named rehearsal lifecycle only');
const db=connectDatabase(p).pool;const config=runtimeConfig();const assertions:Record<string,unknown>[]=[];let child:ChildProcess|undefined;let output='';const cli=promisify(execFile);
function check(name:string,actual:unknown,expected:unknown){try{assert.deepEqual(actual,expected);assertions.push({name,actual,expected,result:'PASS'});console.log('PASS '+name);}catch{assertions.push({name,actual,expected,result:'FAIL'});throw new Error(name);}}
const counts=async()=>(await db.query('SELECT (SELECT count(*)::int FROM app.consent_events) events,(SELECT count(*)::int FROM app.test_runs) runs,(SELECT count(*)::int FROM app.target_mappings) mappings')).rows[0];
try{
 const before=await counts();check('business fixture exists before restart',before.events>0,true);
 let resetDenied=false;try{await resetBootstrap('rehearsal','rehearsal-bootstrap-only');}catch(error){resetDenied=error instanceof Error&&error.message==='Non-bootstrap schema blocks this reset';}check('named bootstrap reset refuses business schema',resetDenied,true);check('reset denial preserves business state',await counts(),before);
 for(let cycle=0;cycle<2;cycle++){
  await cli(process.execPath,['--import','tsx','scripts/machine-init.ts','confirm:rehearsal'],{windowsHide:true,timeout:60000});
  child=spawn(process.execPath,['--import','tsx','scripts/app-run.ts','confirm:rehearsal'],{windowsHide:true,stdio:['ignore','pipe','pipe']});child.stdout?.on('data',c=>{output+=c;});child.stderr?.on('data',c=>{output+=c;});
  let active=false;for(let n=0;n<120;n++){if(child.exitCode!==null)throw new Error('Supervisor exited before readiness');active=existsSync(resolve(p.directory,'supervisor/run.json'))&&(await db.query("SELECT count(DISTINCT application_name)::int n FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control')")).rows[0].n===2;if(active)break;await new Promise(r=>setTimeout(r,500));}
  check('web worker and agent actually active cycle '+cycle,active,true);check('verified HTTPS health cycle '+cycle,(await fetch(config.origin+'/healthz')).status,200);check('unauthenticated authority denied cycle '+cycle,(await fetch(config.origin+'/api/v1/session')).status,401);
  let refused=false;try{await cli(process.execPath,['--import','tsx','scripts/app-stop.ts','confirm:ui-b00'],{windowsHide:true,timeout:30000});}catch{refused=true;}check('wrong profile stop refused cycle '+cycle,refused,true);
  const closed=once(child,'close');await cli(process.execPath,['--import','tsx','scripts/app-stop.ts','confirm:rehearsal'],{windowsHide:true,timeout:45000});await closed;check('supervisor stopped normally cycle '+cycle,child.exitCode,0);child=undefined;
  check('owned worker and agent connections gone cycle '+cycle,(await db.query("SELECT count(*)::int n FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control')")).rows[0].n,0);
  check('business state retained cycle '+cycle,await counts(),before);
 }
}catch(error){console.error(safeError(error));console.error(output.slice(-6000));process.exitCode=1;}finally{if(child&&child.exitCode===null){try{await cli(process.execPath,['--import','tsx','scripts/app-stop.ts','confirm:rehearsal'],{windowsHide:true,timeout:45000});}catch{console.error('Owned supervisor cleanup requires inspection');process.exitCode=1;}}await db.end();writeEvidence('lifecycle-integration',{profile:p.profile,assertions,result:process.exitCode?'FAIL':'PASS',limitations:['Application process restarts with existing synthetic database. Host crash recovery and human demonstration are not inferred.']});}
