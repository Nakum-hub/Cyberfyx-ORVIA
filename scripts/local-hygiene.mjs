import { spawnSync } from 'node:child_process';
import { readFileSync,existsSync,readdirSync } from 'node:fs';
import { join } from 'node:path';
const listed=spawnSync('git',['ls-files','--cached','--others','--exclude-standard'],{encoding:'utf8',windowsHide:true});
if(listed.status!==0)throw new Error('Cannot enumerate Git candidates');
const paths=[...new Set(listed.stdout.trim().split(/\r?\n/))].filter(p=>p&&existsSync(p));
const credentials=[];
if(existsSync('.local/profiles'))for(const name of readdirSync('.local/profiles')){
  const path=join('.local/profiles',name,'postgres-password');if(existsSync(path))credentials.push(readFileSync(path,'utf8').trim());
  const auth=join('.local/profiles',name,'auth');
  if(existsSync(auth))for(const file of readdirSync(auth)){
    if(file.endsWith('-password')||file.endsWith('-secret'))credentials.push(readFileSync(join(auth,file),'utf8').trim());
    if(file==='bootstrap.json')for(const user of Object.values(JSON.parse(readFileSync(join(auth,file),'utf8')).users)){
      credentials.push(user.password);if(user.totp_uri){credentials.push(user.totp_uri);credentials.push(new URL(user.totp_uri).searchParams.get('secret'));}
    }
  }
  for(const folder of ['worker','agent','observer','machine-auth','sender']) {
    const directory=join('.local/profiles',name,folder);
    if(!existsSync(directory))continue;
    for(const file of readdirSync(directory)) {
      if(file.endsWith('-password')||file.endsWith('-key.pem'))credentials.push(readFileSync(join(directory,file),'utf8').trim());
      if(file==='enrollment.json')for(const identity of JSON.parse(readFileSync(join(directory,file),'utf8')).identities??[]){if(identity.token)credentials.push(identity.token);}
    }
  }
}
const findings=[];
const assets='apps/web/.next/static';
const bundlePaths=existsSync(assets)?readdirSync(assets,{recursive:true,withFileTypes:true}).filter(entry=>entry.isFile()).map(entry=>join(entry.parentPath,entry.name)):[];
for(const path of [...paths,...bundlePaths]){
  const body=readFileSync(path,'utf8');
  if(path.startsWith('.local/')||/(^|\/)\.env(\.|$)/.test(path)&&!path.endsWith('.env.example'))findings.push({path,reason:'Ignored local configuration became a candidate'});
  if(credentials.some(value=>value&&body.includes(value)))findings.push({path,reason:'Generated local credential found'});
  if(/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(body))findings.push({path,reason:'Private key marker'});
  if(/(?:ghp_|github_pat_)[A-Za-z0-9_]{25,}/.test(body))findings.push({path,reason:'GitHub token pattern'});
}
console.log(JSON.stringify({kind:'LOCAL_HYGIENE_CHECK',files_examined:paths.length,browser_bundle_files_examined:bundlePaths.length,generated_credentials_compared:credentials.length,findings,limitations:['Pattern and exact-value checks only; not a comprehensive security scan or advisory audit.']},null,2));
process.exitCode=findings.length?1:0;
