// Windows adapter for the unchanged Bash gate. Native argv avoids MSYS rewriting
// Docker's Linux working directory. Only the gate's fixed OPA operation is allowed.
import {spawnSync} from 'node:child_process';
import {appendFileSync,readFileSync,existsSync,writeFileSync,realpathSync} from 'node:fs';
import {join,sep} from 'node:path';
const args=process.argv.slice(2);
if(![['test','policy','tests'],['test','--format=json','policy','tests']].some(expected=>JSON.stringify(args)===JSON.stringify(expected)))throw new Error('Fixed policy test operation only');
const root=process.env.R8_GATE_ROOT;const label=process.env.R8_GATE_LABEL;
if(!root||!label||!/^[a-z-]+$/.test(label))throw new Error('Named gate root and label required');
if(!realpathSync(process.cwd()).toLowerCase().startsWith((realpathSync(process.env.R8_GATE_TEMP)+sep).toLowerCase()))throw new Error('Policy stage outside its named temporary directory');
const ledger=join(root,`handoffs/codex/artifacts/R8-${label}-opa-calls.jsonl`);
const count=existsSync(ledger)?readFileSync(ledger,'utf8').trim().split('\n').length:0;
const image='openpolicyagent/opa@sha256:2de1e6619246955695b982d0bcb6c73bcee22aa34ff96f2455996616ec1d21c1';
const operation=process.env.R8_GATE_EXECUTION_FAULT==='1'&&count>0?['test','--round-eight-deliberate-execution-error']:['test','--format=json','policy','tests'];
const command=['run','--rm','--name','orvia-round8-policy-gate','--network','none','-v',`${process.cwd()}:/w:ro`,'-w','/w',image,...operation];
const result=spawnSync('docker',command,{encoding:'utf8',windowsHide:true});
const artifact=`handoffs/codex/artifacts/R8-${label}-opa-${count}.json`;
writeFileSync(join(root,artifact),result.stdout??'');
appendFileSync(ledger,JSON.stringify({at:new Date().toISOString(),command:['docker',...command],exit_code:result.status,signal:result.signal,artifact,execution_fault:operation.includes('--round-eight-deliberate-execution-error')})+'\n');
process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');process.exitCode=result.status??1;
