import {readFileSync,readdirSync,statSync,writeFileSync} from 'node:fs';
import {resolve,relative} from 'node:path';
import {spawnSync} from 'node:child_process';
const secrets=[];
function walk(dir,fn){for(const e of readdirSync(dir,{withFileTypes:true})){const p=resolve(dir,e.name);if(e.isDirectory())walk(p,fn);else if(e.isFile())fn(p);}}
function collect(o){if(!o||typeof o!=='object')return;for(const[k,v]of Object.entries(o)){if(typeof v==='string'&&/password|secret|token|totp|private_key|public_key|setup_code|^private$|^public$/i.test(k)&&v.length>=8)secrets.push({kind:k,value:v});else if(typeof v==='object')collect(v);}}
for(const profile of ['codex-a00','rehearsal','vendor-a00'])walk(`.local/profiles/${profile}`,p=>{if(p.endsWith('.json')){try{collect(JSON.parse(readFileSync(p,'utf8')));}catch{}}});
walk('.local/vendor/signing',p=>{if(p.endsWith('.json'))collect(JSON.parse(readFileSync(p,'utf8')));});
const files=spawnSync('git',['diff','--cached','--name-only','--diff-filter=ACMR'],{encoding:'utf8'}).stdout.trim().split(/\r?\n/).filter(Boolean);
const leaks=[];
for(const file of files){if(/\.(png|zip|jpg|webp|pdf)$/.test(file))continue;const s=readFileSync(file,'utf8');for(const x of secrets)if(s.includes(x.value))leaks.push({file,kind:x.kind});if(/-----BEGIN (?:[A-Z ]*PRIVATE KEY|PUBLIC KEY)-----|otpauth:\/\//.test(s)&&!file.endsWith('.ts')&&!file.endsWith('.mjs'))leaks.push({file,kind:'key_or_authenticator_pattern'});}
const report={timestamp:new Date().toISOString(),staged_files:files.length,protected_values_checked:secrets.length,leaks};writeFileSync('handoffs/codex/artifacts/R10-staged-secret-scan.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));if(leaks.length)process.exitCode=1;
