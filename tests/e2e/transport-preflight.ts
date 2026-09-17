// Real HTTPS integration probe for the shared no-input POST transport.
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
import { HttpFixture } from '../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../packages/testing/src/scenario.ts';
import { createClient, ApiError } from '../../packages/contracts/src/client.ts';
const h=new HttpFixture();if(h.config.profile!=='rehearsal')throw new Error('Named rehearsal only');
const actualFetch=globalThis.fetch;
globalThis.fetch=async(input,init)=>{const response=await actualFetch(input,init);const path=new URL(String(input)).pathname;if(path.startsWith('/api/auth/')&&!response.ok)console.log(JSON.stringify({auth_path:path,status:response.status}));return response;};
const port=createServer();await new Promise<void>((done,fail)=>{port.once('error',fail);port.listen(h.config.app_port,'127.0.0.1',()=>port.close(()=>done()));});
let result:unknown;
try{
  await h.start();const scenario=await createMarketingScenario(h);
  const client=createClient((path,init)=>fetch(h.config.origin+String(path),{...init,headers:{...init?.headers,...scenario.owner.headers(),origin:h.config.origin}}));
  try{const system=await client.call('check_system',undefined,{params:{id:scenario.system.id}});result={operation:'check_system',system_id:system.id,result:'PASS'};}
  catch(error){if(!(error instanceof ApiError))throw error;result={operation:'check_system',status:error.status,code:error.envelope.error.code,result:'FAIL'};process.exitCode=1;}
  const directory='handoffs/codex/browser/B06-transport-'+new Date().toISOString().replaceAll(':','-');mkdirSync(directory,{recursive:true});writeFileSync(directory+'/result.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
}finally{await h.stop();}
