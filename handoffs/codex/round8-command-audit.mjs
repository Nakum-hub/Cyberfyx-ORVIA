// Extract this task's command text and observed tool results, without retaining
// conversation text, command output, credentials or another thread's session.
import { readFileSync,writeFileSync } from 'node:fs';
import ts from 'typescript';
const session='C:/Users/sadas/.codex/sessions/2026/10/01/rollout-2026-10-01T12-02-53-01a0f62a-75ec-7663-b87e-43da43916ce8.jsonl';
const rows=readFileSync(session,'utf8').trim().split('\n').map(line=>JSON.parse(line));
const calls=new Map();const output=[];
for(const row of rows){
 const p=row.payload;
 if(row.type!=='response_item')continue;
 if(p.type==='custom_tool_call'&&p.name==='exec'){
  const ast=ts.createSourceFile('tool.js',p.input,ts.ScriptTarget.Latest,true,ts.ScriptKind.JS);
  const commands=[];
  const visit=n=>{
   if(ts.isCallExpression(n)&&n.expression.getText(ast)==='tools.exec_command'){
    const arg=n.arguments[0];const fields={};
    if(arg&&ts.isObjectLiteralExpression(arg))for(const prop of arg.properties){
     if(ts.isPropertyAssignment(prop)&&ts.isStringLiteralLike(prop.initializer))fields[prop.name.getText(ast)]=prop.initializer.text;
    }
    commands.push({command:fields.cmd??'DYNAMIC: see original tool call',workdir:fields.workdir??null});
   }
   ts.forEachChild(n,visit);
  };visit(ast);
  if(commands.length){const item={at:row.timestamp,tool_call_id:p.call_id,commands,observed_results:[]};calls.set(p.call_id,item);output.push(item);}
 }
 if(p.type==='custom_tool_call_output'&&calls.has(p.call_id)){
  const item=calls.get(p.call_id);
  for(const block of p.output??[]){
   if(!block.text)continue;
   // Tools are printed as adjacent JSON objects by text(); inspect each object
   // via the TypeScript AST's object expression boundaries, never eval it.
   const source=block.text;const rx=/"chunk_id":"([^"]+)"/g;const matches=[...source.matchAll(rx)];
   for(let i=0;i<matches.length;i++){
    const fragment=source.slice(matches[i].index,matches[i+1]?.index??source.length);
    const value=key=>new RegExp(`"${key}":(null|-?\\d+)`).exec(fragment)?.[1];
    item.observed_results.push({chunk_id:matches[i][1],exit_code:value('exit_code')===undefined?'NOT_RECORDED':JSON.parse(value('exit_code')),session_id:value('session_id')===undefined?null:JSON.parse(value('session_id'))});
   }
  }
 }
}
writeFileSync('handoffs/codex/artifacts/R8-command-tool-audit.json',JSON.stringify({note:'Ordered commands and observed results per tool call. Multiple commands are not individually assigned an exit without matching evidence; NOT_RECORDED is not a pass. Async completions are recorded in the command ledger.',calls:output},null,2));
console.log(`Recorded ${output.length} command tool calls; no command output retained.`);
