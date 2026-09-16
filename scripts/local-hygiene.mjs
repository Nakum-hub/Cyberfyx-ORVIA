import { spawnSync } from 'node:child_process';
import { readFileSync,existsSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
const listed=spawnSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8',windowsHide:true});
if(listed.status!==0)throw new Error('Cannot enumerate Git candidates');
const paths=[...new Set(listed.stdout.trim().split(/\r?\n/))].filter(p=>p&&existsSync(p));
const credentials=[];
if(existsSync('.local/profiles'))for(const name of readdirSync('.local/profiles')){
  const path=join('.local/profiles',name,'postgres-password');if(existsSync(path))credentials.push(readFileSync(path,'utf8').trim());
}
const findings=[];
for(const path of paths){
  const body=readFileSync(path,'utf8');
  if(path.startsWith('.local/')||/(^|\/)\.env(\.|$)/.test(path)&&!path.endsWith('.env.example'))findings.push({path,reason:'Ignored local configuration became a candidate'});
  if(credentials.some(value=>value&&body.includes(value)))findings.push({path,reason:'Generated local credential found'});
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(body))findings.push({path,reason:'Private key marker'});
  if(/(?:ghp_|github_pat_)[A-Za-z0-9_]{25,}/.test(body))findings.push({path,reason:'GitHub token pattern'});
}
console.log(JSON.stringify({kind:'LOCAL_HYGIENE_CHECK',files_examined:paths.length,generated_credentials_compared:credentials.length,findings,limitations:['Pattern and exact-value checks only; not a comprehensive security scan or advisory audit.']},null,2));
process.exitCode=findings.length?1:0;
