// UI-lane command evidence; raw authenticated browser traces stay in .local.
import { spawn,execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync,readFileSync,writeFileSync,existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { qualifiedDirty, qualifiedSourcePaths } from '../../scripts/source-paths.mjs';
const [ticket,command,...args]=process.argv.slice(2);
if(!/^B0[0-46]$/.test(ticket??'')||!['typecheck','lint','test','build','contracts:check','hygiene:check','install','exec'].includes(command))throw new Error('Unknown UI qualification command');
if(command==='exec'&&!['playwright','tsx'].includes(args[0]))throw new Error('Only pinned browser/test tools are allowed');
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
const hash=value=>createHash('sha256').update(value).digest('hex');
// Same qualified inventory as the candidate manifest and scripts/record.mjs.
const source=()=>qualifiedSourcePaths(git('ls-files','--cached')).filter(p=>existsSync(p)).map(path=>({path,sha256:hash(readFileSync(path))}));
const files=source(); const commit=git('rev-parse','HEAD'); const started=new Date().toISOString();
const directory=`handoffs/codex/browser/${ticket}-${command.replaceAll(':','-')}-${started.replaceAll(':','-')}`;mkdirSync(directory,{recursive:true});
const node=resolve('.local/tools/node-v24.21.0-win-x64/node.exe');const pnpm=resolve('.local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs');
const env={...process.env,ORVIA_PROFILE:'rehearsal',ORVIA_TASK_ID:'A07',NODE_EXTRA_CA_CERTS:resolve('.local/profiles/rehearsal/tls/ca-cert.pem'),NEXT_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1',BETTER_AUTH_TELEMETRY:'0',PATH:`${resolve('.local/tools/node-v24.21.0-win-x64')};${process.env.PATH}`};
const child=spawn(node,[pnpm,command,...args],{windowsHide:true,env,stdio:['ignore','pipe','pipe']});let output='';
for(const stream of [child.stdout,child.stderr])stream.on('data',chunk=>{output+=chunk;process.stdout.write(chunk);});
child.on('error',error=>{output+='Launch error '+error.code;});
child.on('close',(code,signal)=>{
 const finished=source();writeFileSync(directory+'/command.txt',output);
 writeFileSync(directory+'/command.json',JSON.stringify({ticket,command:['node','tests/e2e/record.mjs',...process.argv.slice(2)],source_commit:commit,ui_commit:commit,git_tree:git('rev-parse','HEAD^{tree}'),source_files:files,source_tree_sha256:hash(JSON.stringify(files)),source_changed_during_run:hash(JSON.stringify(files))!==hash(JSON.stringify(finished)),dirty:qualifiedDirty(git('status','--porcelain','--untracked-files=all')),lockfile_sha256:hash(readFileSync('pnpm-lock.yaml')),contract_version:JSON.parse(readFileSync('shared/contracts/package.json','utf8')).version,profile:'rehearsal',fixture:'aster-birch-v1',build_id:existsSync('frontend/.next/BUILD_ID')?readFileSync('frontend/.next/BUILD_ID','utf8').trim():null,started_at:started,finished_at:new Date().toISOString(),exit_code:code,signal,result:code===0?'PASS':'FAIL',artifact:directory+'/command.txt',limitations:['UI engineering execution, not Work acceptance or human rehearsal. Existing backend helpers retain their A07 artifact namespace; this wrapper records the actual B increment and source. Authenticated raw browser traces remain private.']},null,2)+'\n');
 console.log('UI evidence: '+directory+'/command.json');process.exitCode=code??1;
});
