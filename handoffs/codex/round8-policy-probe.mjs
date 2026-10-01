import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { freemem } from 'node:os';
import { writeFileSync } from 'node:fs';
const exec=promisify(execFile);
const body=JSON.stringify({input:{actor_domain:'STAFF',role:'AUDITOR',capability:'grc.read',mfa_verified:false}});
const direct=`const s=performance.now();try{const r=await fetch('http://opa:8181/v1/data/orvia/admin/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body:${JSON.stringify(body)},signal:AbortSignal.timeout(10000)});const b=await r.json();console.log(JSON.stringify({status:r.status,result:b.result,ms:performance.now()-s}));}catch(e){console.log(JSON.stringify({error:e.name,ms:performance.now()-s}));}`;
const rows=[];
for(let i=0;i<12;i++){
 const at=new Date().toISOString();const s=performance.now();
 const host=(async()=>{try{const r=await fetch('http://127.0.0.1:58181/v1/data/orvia/admin/authorize',{method:'POST',headers:{'Content-Type':'application/json'},body,signal:AbortSignal.timeout(10000)});const b=await r.json();return{status:r.status,result:b.result,ms:performance.now()-s};}catch(e){return{error:e.name,ms:performance.now()-s};}})();
 const vm=exec('docker',['exec','orvia-qualification-20260930-loopback','node','--input-type=module','-e',direct],{windowsHide:true,timeout:20000}).then(r=>JSON.parse(r.stdout),e=>({error:e.code??e.name}));
 const [published,internal]=await Promise.all([host,vm]);
 const row={at,published,internal,host_available_bytes:freemem()};rows.push(row);console.log(JSON.stringify(row));
}
writeFileSync('handoffs/codex/artifacts/R8-policy-probe.json',JSON.stringify(rows,null,2));
process.exitCode=rows.some(r=>r.published.result!==true||r.internal.result!==true)?1:0;
