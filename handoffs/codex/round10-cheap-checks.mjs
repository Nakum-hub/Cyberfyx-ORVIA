import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {writeFileSync,appendFileSync} from 'node:fs';
import {resolve} from 'node:path';
const head=spawnSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).stdout.trim();
const env={...process.env,PATH:resolve('.local/tools/node-v24.21.0-win-x64')+';'+process.env.PATH,NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1'};
for(const name of (process.argv.slice(2).length?process.argv.slice(2):['test','contracts:check','typecheck','lint'])){
 const id=randomUUID(),started_at=new Date().toISOString(),log=`handoffs/codex/artifacts/R10-final-check-${name.replace(':','-')}-${id}.log`;
 const args=[resolve('.local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs'),'run',name];
 const r=spawnSync(process.execPath,args,{env,encoding:'utf8',windowsHide:true,maxBuffer:8*1024*1024});writeFileSync(log,(r.stdout??'')+(r.stderr??''),{flag:'wx'});
 const row={label:name,head,run_id:id,command:[process.execPath,...args],started_at,ended_at:new Date().toISOString(),exit_code:r.status,status:r.status===0?'PASS':'FAILED',log};
 appendFileSync('handoffs/codex/artifacts/R10-final-checks.jsonl',JSON.stringify(row)+'\n');console.log(JSON.stringify(row));
 if(r.status!==0){console.log((r.stdout??'').slice(-5000)+(r.stderr??'').slice(-1000));process.exitCode=1;break;}
}
