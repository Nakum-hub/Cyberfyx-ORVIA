import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { once } from 'node:events';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { writeEvidence,safeError } from '../../shared/testing/src/evidence.ts';
const profile=loadProfile();
const require=createRequire(new URL('../../frontend/package.json',import.meta.url));
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','--hostname','127.0.0.1','--port',String(profile.app_port)],{cwd:fileURLToPath(new URL('../../frontend/',import.meta.url)),windowsHide:true,stdio:['ignore','pipe','pipe'],env:{...process.env,NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1'}});
let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
try{
  let healthy=false;
  for(let attempt=0;attempt<60;attempt++){
    if(child.exitCode!==null)throw new Error('Web process exited before readiness');
    try{
      const response=await fetch(`http://127.0.0.1:${profile.app_port}/healthz`,{signal:AbortSignal.timeout(1000)});
      assert.equal(response.status,200);assert.deepEqual(await response.json(),{status:'alive'});healthy=true;break;
    }catch{await new Promise(resolve=>setTimeout(resolve,500));}
  }
  assert.equal(healthy,true);
  const page=await fetch(`http://127.0.0.1:${profile.app_port}/`);
  assert.equal(page.status,200);assert.equal(page.headers.get('x-content-type-options'),'nosniff');
  // This matched "foundation build", wording the landing page has not carried
  // since it was rewritten, and asserted 404 for /api/v1/admin/overview on the
  // grounds that the route was unbuilt. Both drifted into asserting that the
  // product was less finished than it is, and the suite has been failing since
  // the overview module landed rather than reporting anything real.
  // The landing page's label changed from "Synthetic demonstration" to "Synthetic
  // test environment" when demonstration wording was removed; what is asserted is
  // still that the page says it runs on synthetic data.
  assert.match(await page.text(),/Synthetic test environment/);
  // This process is started without the profile environment on purpose, so the
  // business boundary has no database, policy engine or audit sink to reach.
  // What is worth proving at bootstrap is that it then refuses: a route that
  // cannot do its work says so rather than answering anyway.
  assert.equal((await fetch(`http://127.0.0.1:${profile.app_port}/api/v1/admin/overview`)).status,503);
  writeEvidence('web-integration',{profile:profile.profile,result:'PASS',assertions:['liveness 200 with exact body','landing page 200, nosniff, and labelled synthetic','business endpoint without its dependencies refuses with 503 rather than answering'],limitations:['HTTP bootstrap smoke only, with no profile environment; not UI browser acceptance and not an authenticated API test.']});
}catch(error){console.error(safeError(error));writeEvidence('web-integration',{profile:profile.profile,result:'FAIL',error:safeError(error),server_output:output});process.exitCode=1;}
finally{if(child.exitCode===null){const closed=once(child,'close');child.kill();await closed;}}
