import {spawnSync} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {writeFileSync,appendFileSync} from 'node:fs';
const env={...process.env,ORVIA_PROFILE:'codex-a00',ORVIA_WORKSPACE_ROOT:process.cwd(),ORVIA_TEST_COMPOSE_PROJECT:'orvia-round10-customer'};
for(const [name,args] of [['vendor-import-race-before',['--import','tsx','handoffs/codex/round10-vendor-import-race.ts','expect-defect']],['seat-reader-acl-before',['--import','tsx','handoffs/codex/round10-acl-review.ts']]]){
 if(process.argv.includes('--acl-only')&&name!=='seat-reader-acl-before')continue;
 const id=randomUUID(),started_at=new Date().toISOString(),log=`handoffs/codex/artifacts/R10-run2-${name}-${id}.log`;
 const result=spawnSync(process.execPath,args,{env,encoding:'utf8',windowsHide:true,maxBuffer:4*1024*1024});writeFileSync(log,(result.stdout??'')+(result.stderr??''),{flag:'wx'});
 const row={run:'2',kind:'diagnostic',run_id:id,label:name,head:'88b7b46558b9e4ec714c22643b6af657f0746609',command:[process.execPath,...args],started_at,ended_at:new Date().toISOString(),exit_code:result.status,status:result.status===0?'PASS':'FAILED',expected_defect:name.includes('race-before'),log};
 appendFileSync('handoffs/codex/artifacts/R10-run2-diagnostics.jsonl',JSON.stringify(row)+'\n');console.log(JSON.stringify(row));console.log((result.stdout??'').slice(-3000));
 if(result.status!==0){process.exitCode=1;break;}
}
