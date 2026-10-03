import {spawnSync} from 'node:child_process';
import {mkdirSync,writeFileSync,existsSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
const label=process.argv[2];const rejectFault=process.argv[3]==='execution-fault-rejected';const fault=process.argv[3]==='execution-fault'||rejectFault;
if(!label||!/^[a-z-]+$/.test(label))throw new Error('Unique letter-only label required');
const root=process.cwd();const ledger=join(root,`handoffs/codex/artifacts/R8-${label}-opa-calls.jsonl`);
if(existsSync(ledger))throw new Error('Refuse to replace policy evidence');
const shim=join(root,'.local',`round8-${label}-opa-bin`);mkdirSync(shim,{recursive:true});
const temp=join(shim,'temporary-stages');mkdirSync(temp,{recursive:true});
writeFileSync(join(shim,'opa'),'#!/usr/bin/env bash\nexec "$R8_GATE_NODE" "$R8_GATE_ROOT/handoffs/codex/round8-policy-gate-driver.mjs" "$@"\n');
const slash=path=>path.replaceAll('\\','/');
const command=['-c','export PATH="$(cygpath -u "$R8_GATE_SHIM"):$PATH"; export TMPDIR="$(cygpath -u "$R8_GATE_TEMP")"; exec bash scripts/policy-gate.sh'];
const result=spawnSync('C:/Program Files/Git/bin/bash.exe',command,{encoding:'utf8',windowsHide:true,env:{...process.env,R8_GATE_ROOT:slash(root),R8_GATE_SHIM:slash(shim),R8_GATE_TEMP:slash(temp),R8_GATE_NODE:slash(process.execPath),R8_GATE_LABEL:label,R8_GATE_EXECUTION_FAULT:fault?'1':'0'}});
process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
const calls=existsSync(ledger)?readFileSync(ledger,'utf8').trim().split('\n').map(line=>JSON.parse(line)):[];
const states=calls.map((call,index)=>{
 let tests;try{tests=JSON.parse(readFileSync(join(root,call.artifact),'utf8'));}catch{}
 return{index,exit_code:call.exit_code,execution_fault:call.execution_fault,semantic_test_failures:Array.isArray(tests)?tests.filter(t=>t.fail===true&&!t.error).length:0,errors:Array.isArray(tests)?tests.filter(t=>t.error).length:null};
});
const realHealthy=calls.length===9&&states[0]?.exit_code===0&&states[0]?.errors===0;
const semanticMutants=states.slice(1).every(s=>s.exit_code!==0&&s.semantic_test_failures>0&&s.errors===0);
const audit={label,fault,gate_exit_code:result.status,calls:states,healthy_control:realHealthy,all_mutants_semantically_detected:semanticMutants};
writeFileSync(join(root,`handoffs/codex/artifacts/R8-${label}-gate-audit.json`),JSON.stringify(audit,null,2));
console.log(JSON.stringify(audit));
// The execution-fault case is an explicit broken fixture: a zero gate exit is
// the before-regression failure being demonstrated, never a healthy acceptance.
process.exitCode=fault?(realHealthy&&(rejectFault?result.status!==0:result.status===0)&&!semanticMutants?0:1):(realHealthy&&semanticMutants&&result.status===0?0:1);
