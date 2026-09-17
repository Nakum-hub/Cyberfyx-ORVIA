import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { isIP } from 'node:net';
import { HttpFixture } from '../../packages/testing/src/http-fixture.ts';
import { TestRun,CONTRACT_VERSION } from '../../packages/contracts/src/index.ts';
import { writeEvidence,safeError } from '../../packages/testing/src/evidence.ts';
const h=new HttpFixture();const results:Record<string,unknown>[]=[];
const ip=process.env.ORVIA_CANARY_IP;if(!ip||isIP(ip)!==4)throw new Error('Controlled canary address required');
async function denied(name:string,url:string){let blocked=false;try{await fetch(url,{signal:AbortSignal.timeout(1500)});}catch{blocked=true;}results.push({name,blocked});if(!blocked)throw new Error('Egress unexpectedly allowed');}
try{
 await denied('DNS name denied','http://egress-canary.invalid:9091/probe');await denied('Direct external network address denied',`http://${ip}:9091/probe`);
 await h.start();const owner=await h.login('owner');
 const response=await owner.call('/api/v1/admin/test-runs',{scenario:'MARKETING_WITHDRAWAL_HEALTHY',profile:h.config.profile,fixture_id:'aster-birch-v1'},{'idempotency-key':randomUUID()});
 if(response.status!==202)throw new Error('Network scenario was not accepted');const accepted=TestRun.parse(await response.json());
 const executed=await promisify(execFile)(process.execPath,['--import','tsx','scripts/regression-runner.ts',`confirm:${h.config.profile}`],{timeout:240000,maxBuffer:2*1024*1024});
 results.push({name:'Actual backend core under blocked egress',assertion_output:executed.stdout});
 const completed=TestRun.parse(await (await owner.call('/api/v1/admin/test-runs/'+accepted.id)).json());results.push({run:completed});if(completed.state!=='PASS')throw new Error('Core scenario did not pass');
}catch(error){console.error({...safeError(error),sites:error instanceof Error?error.stack?.split('\n').slice(1,5):[]});if(error&&typeof error==='object'&&'stderr' in error)console.error(String(error.stderr).slice(-8000));console.error(h.diagnostics);process.exitCode=1;}finally{await h.stop();writeEvidence('network-core',{profile:h.config.profile,contract_version:CONTRACT_VERSION,results,result:process.exitCode?'FAIL':'PASS',limitations:['Private Docker backend network only; host development processes and browser traffic are not qualified by this test. Controlled external-network canary and local deny-all DNS; no real vendor call.']});}
