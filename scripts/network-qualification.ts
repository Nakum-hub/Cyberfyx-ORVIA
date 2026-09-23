import { execFile,spawn } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../shared/testing/src/config.ts';
import { writeEvidence,safeError } from '../shared/testing/src/evidence.ts';
import { sourceState } from './source-state.ts';
const profile=loadProfile();if(!['codex-a00','rehearsal'].includes(profile.profile)||process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named codex-a00/rehearsal network test required');
const docker=async(...args:string[])=>{try{return (await promisify(execFile)('docker',args,{windowsHide:true,maxBuffer:2*1024*1024})).stdout.trim();}catch(error){console.error({docker_operation:args[0],...safeError(error),stderr:typeof error==='object'&&error&&'stderr' in error?String(error.stderr).slice(-3000):undefined});throw error;}};
const source=sourceState();const nonce=randomUUID();const network=profile.compose_project+'-canary-'+nonce;const canary=network+'-endpoint';const runtime=profile.compose_project+'-runtime-'+nonce;const privateNetwork=profile.compose_project+'_private';
const task=process.env.ORVIA_TASK_ID??'A06';if(!['A06','A07'].includes(task))throw new Error('Named network task required');
const artifact=task+'-network-observations-'+nonce+'.json';const assertions:Record<string,unknown>[]=[];let networkCreated=false;let canaryCreated=false;let runtimeCreated=false;
function check(name:string,actual:unknown,expected:unknown){const pass=JSON.stringify(actual)===JSON.stringify(expected);assertions.push({name,actual,expected,result:pass?'PASS':'FAIL'});if(!pass)throw new Error('Network assertion failed');console.log('PASS '+name);}
async function removeOwned(name:string){const item=JSON.parse(await docker('inspect',name))[0];if(item.Config.Labels['orvia.network-test']!==nonce)throw new Error('Refusing to remove an unowned container');await docker('rm','-f',name);}
try{
 const image=JSON.parse(await docker('image','inspect','orvia-local:prototype'))[0];check('runtime image matches current source',image.Config.Labels['orvia.source-tree'],source.sha256);
 const net=JSON.parse(await docker('network','inspect',privateNetwork))[0];check('service network is internal',net.Internal,true);
 const peers:Record<string,string>={};for(const name of ['postgres','opa','temporal']){const container=JSON.parse(await docker('inspect',`${profile.compose_project}-${name}-1`))[0];check(name+' belongs to named profile',container.Config.Labels['com.docker.compose.project'],profile.compose_project);peers[name]=container.NetworkSettings.Networks[privateNetwork].IPAddress;}
 await docker('network','create','--label',`orvia.network-test=${nonce}`,network);networkCreated=true;
 await docker('run','-d','--name',canary,'--label',`orvia.network-test=${nonce}`,'--network',network,'--read-only','--cap-drop','ALL','--security-opt','no-new-privileges:true','--mount',`type=bind,src=${resolve('infrastructure/egress-canary.mjs')},dst=/canary.mjs,readonly`,'node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553','node','/canary.mjs');canaryCreated=true;
 const ip=JSON.parse(await docker('inspect',canary))[0].NetworkSettings.Networks[network].IPAddress;
 const request="(async()=>{for(let n=0;n<30;n++){try{const r=await fetch('http://127.0.0.1:9091/probe');if(r.ok)return;}catch{}await new Promise(r=>setTimeout(r,100));}process.exitCode=1;})()";await docker('exec',canary,'node','-e',request);
 const counter=async()=>JSON.parse(await docker('exec',canary,'node','-e',"fetch('http://127.0.0.1:9091/count').then(r=>r.text()).then(v=>process.stdout.write(v))")).probes;
 check('controlled canary is reachable in positive control',await counter(),1);
 const args=['create','--name',runtime,'--label',`orvia.network-test=${nonce}`,'--network',privateNetwork,'--cap-drop','ALL','--security-opt','no-new-privileges:true','--memory','3g','--env',`ORVIA_PROFILE=${profile.profile}`,'--env',`ORVIA_TASK_ID=${task}`,...(profile.profile==='rehearsal'?['--env','NODE_EXTRA_CA_CERTS=/app/.local/profiles/rehearsal/tls/ca-cert.pem']:[]),'--env',`ORVIA_SERVICE_IPS=${JSON.stringify(peers)}`,'--env',`ORVIA_CANARY_IP=${ip}`,'--env',`ORVIA_NETWORK_ARTIFACT=${artifact}`,'--mount',`type=bind,src=${resolve(profile.directory)},dst=/app/.local/profiles/${profile.profile}`,'--mount',`type=bind,src=${resolve('handoffs/codex/artifacts')},dst=/app/handoffs/codex/artifacts`,'--mount',`type=bind,src=${resolve('infrastructure/runtime-resolv.conf')},dst=/etc/resolv.conf,readonly`,'orvia-local:prototype'];
 await docker(...args);runtimeCreated=true;
 const isolated=JSON.parse(await docker('inspect',runtime))[0];check('runtime has only the internal service network',Object.keys(isolated.NetworkSettings.Networks),[privateNetwork]);check('runtime publishes no host ports',isolated.HostConfig.PortBindings,{});
 const child=spawn('docker',['start','--attach',runtime],{windowsHide:true,stdio:'inherit'});const code=await new Promise<number>(resolve=>{child.once('error',()=>resolve(1));child.once('close',code=>resolve(code??1));});
 check('actual backend core succeeds under blocked egress',code,0);check('isolated runtime never reached controlled external endpoint',await counter(),1);
 const observations=JSON.parse(readFileSync(resolve('handoffs/codex/artifacts',artifact),'utf8'));check('deny-all DNS observed controlled query',observations.dns_denied.some((q:{host:string})=>q.host==='egress-canary.invalid'),true);
 check('no unexpected DNS queries',observations.dns_denied.every((q:{host:string})=>q.host==='egress-canary.invalid'),true);
 check('core used PostgreSQL OPA and Temporal',Object.values(observations.service_connections).every(n=>Number(n)>0),true);
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{
 for(const [created,name] of [[runtimeCreated,runtime],[canaryCreated,canary]] as const)if(created)try{await removeOwned(name);}catch(error){process.exitCode=1;assertions.push({name:'owned container cleanup',result:'ERROR',error:safeError(error)});}
 if(networkCreated)try{const own=JSON.parse(await docker('network','inspect',network))[0];if(own.Labels['orvia.network-test']===nonce)await docker('network','rm',network);else{process.exitCode=1;assertions.push({name:'network ownership mismatch; removal refused',result:'ERROR'});}}catch(error){process.exitCode=1;assertions.push({name:'owned network cleanup',result:'ERROR',error:safeError(error)});}
 writeEvidence('network-qualification',{test_ids:['T26'],source,profile:profile.profile,assertions,observations_artifact:'handoffs/codex/artifacts/'+artifact,result:process.exitCode?'FAIL':'PASS',limitations:['Observed backend core only, private Docker network, local deny-all DNS and controlled external-network canary. Browser/network and host development egress remain unqualified. No real vendor/model call.']});
}
