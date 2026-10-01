// Actual directory hook/helper AST reproduction. No app writes, browser or network.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import vm from 'node:vm';
const ts=createRequire(new URL('../../package.json',import.meta.url))('typescript');
const [label,mode]=process.argv.slice(2);
if(!/^[a-z0-9][a-z0-9-]{0,59}$/.test(label??'')||!['baseline','proposal','current'].includes(mode))throw new Error('Fresh label and baseline|proposal|current required');
const baselineCommit='3951440cad070881b204b6c2c23be5a11fdeb279';
let source=(mode==='current'?readFileSync('frontend/src/components/shared/directory.ts','utf8'):execFileSync('git',['show',`${baselineCommit}:frontend/src/components/shared/directory.ts`],{encoding:'utf8',windowsHide:true})).replaceAll('\r\n','\n');
if(mode==='proposal')for(const old of ["  const existing = inflight.get(key);\n  if (existing) return existing;\n","  inflight.set(key, promise);\n"]){assert.equal(source.split(old).length,2);source=source.replace(old,'');}
const file=ts.createSourceFile('actual.ts',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
const wanted=new Set(['OPERATION','inflight','readAll','load','useDirectory']);
const declarations=file.statements.filter(n=>ts.isFunctionDeclaration(n)?wanted.has(n.name?.text):ts.isVariableStatement(n)&&n.declarationList.declarations.some(d=>wanted.has(d.name.getText(file))));
assert.equal(declarations.length,mode==='current'?4:5);
let activeComponent;let identity='actor|tenant|legal|environment';const pending=[];let dispatched=0;
const bindings={AbortController,Map,Set,Date,Promise,currentIdentity:()=>identity,onIdentityChange:()=>()=>{},
 describeFailure:e=>({kind:e.name==='AbortError'?'ABORTED':'NETWORK'}),
 useState:initial=>{const slot=activeComponent.state.length;activeComponent.state.push(initial);const owner=activeComponent;return[initial,next=>{owner.state[slot]=typeof next==='function'?next(owner.state[slot]):next;}];},
 useEffect:effect=>{activeComponent.effects.push(effect);},useMemo:f=>f(),useCallback:f=>f,
 call:(_operation,_body,{signal})=>{dispatched++;return new Promise((resolve,reject)=>{const item={resolve,signal};pending.push(item);signal.addEventListener('abort',()=>reject(signal.reason),{once:true});});},
 CONNECTOR_LABELS:{},shortId:id=>id};
const code=declarations.map(n=>n.getText(file).replace(/^export /,'')).join('\n')+'\nglobalThis.hook=useDirectory;';
const context=vm.createContext(bindings);vm.runInContext(ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText,context);
function mount(){const component={state:[],effects:[],cleanups:[]};activeComponent=component;context.hook(['purposes']);component.cleanups=component.effects.map(f=>f());return component;}
const a=mount(),b=mount();assert.equal(dispatched,mode==='baseline'?1:2);
a.cleanups[1](); // Actual first subscriber effect cleanup aborts its controller.
for(const item of pending)if(!item.signal.aborted)item.resolve({items:[{id:'controlled-purpose'}],next_cursor:null});
await new Promise(resolve=>setImmediate(resolve));
assert.equal(b.state[0].status,mode==='baseline'?'loading':'ready');
assert.equal(b.state[0].failure,null);
const surviving=b.state[0].status;
b.cleanups[1]();
// Independent actor-change control: actual hook rejects a late foreign-generation response.
const c=mount();identity='different-actor|different-tenant|legal|environment';
for(const item of pending)if(!item.signal.aborted)item.resolve({items:[{id:'obsolete-controlled-purpose'}],next_cursor:null});
await new Promise(resolve=>setImmediate(resolve));assert.equal(c.state[0].data,null);c.cleanups[1]();
const report={mode,source_identity:mode==='current'?'CURRENT_WORKTREE_AST':baselineCommit,diagnostic_only:true,actual_directory_ast:true,first_subscriber_unmounted:true,surviving_subscriber_status:surviving,transport_calls:dispatched,late_identity_response_discarded:true,limitations:['Controlled hook/transport seams; no actual React renderer/browser, API/RLS or network acceptance.','Baseline loading is reproduced source behavior, not a claimed current feature-suite failure.']};
writeFileSync(`handoffs/codex/artifacts/R8-${label}-directory-subscriber-${mode}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
