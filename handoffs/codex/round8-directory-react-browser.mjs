// Root-run real React/Playwright controlled directory lifecycle differential.
// No app/database/auth/network fixture. Uses installed esbuild and local React.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {chromium,webkit,firefox} from '@playwright/test';
const require=createRequire(new URL('../../package.json',import.meta.url));
const esbuild=createRequire(require.resolve('tsx'))('esbuild'); // Existing tsx dependency tree, no install.
const label=process.argv[2];if(process.argv.length!==3||!/^[a-z0-9][a-z0-9-]{0,59}$/.test(label??''))throw new Error('Fresh safe label required');
const artifact=`handoffs/codex/artifacts/R8-${label}-directory-react-browser.json`;
writeFileSync(artifact,'',{flag:'wx'});
const pinned='3951440cad070881b204b6c2c23be5a11fdeb279';
const api=`let identity='controlled-actor|tenant|legal|environment';const listeners=new Set();const pending=[];let ignoreAbort=false;
export const currentIdentity=()=>identity;export const onIdentityChange=f=>{listeners.add(f);return()=>listeners.delete(f)};
export const call=(_op,_input,{signal})=>new Promise((resolve,reject)=>{const item={signal,resolve};pending.push(item);signal.addEventListener('abort',()=>{if(!ignoreAbort)reject(signal.reason)},{once:true});});
globalThis.fixtureApi={pending,change:()=>{identity='controlled-new-actor|new-tenant|legal|environment';for(const f of listeners)f();},ignoreAbort:()=>{ignoreAbort=true;},resolve:(index,name)=>pending[index].resolve({items:[{id:'controlled-purpose',name}],next_cursor:null})};`;
const entry=`import React,{useState} from 'react';import {createRoot} from 'react-dom/client';import {useDirectory} from 'directory-under-test';
function Subscriber({name}){const result=useDirectory(['purposes']);return React.createElement('div',{'data-testid':name,'data-status':result.status},result.data?.purposes.map(p=>p.name).join(',')??'');}
function App(){const [first,setFirst]=useState(true);globalThis.removeFirst=()=>setFirst(false);return React.createElement(React.Fragment,null,first&&React.createElement(Subscriber,{key:'a',name:'a'}),React.createElement(Subscriber,{key:'b',name:'b'}));}
createRoot(document.getElementById('fixture-root')).render(React.createElement(App));`;
async function bundle(mode){const source=mode==='baseline'?execFileSync('git',['show',pinned+':frontend/src/components/shared/directory.ts'],{encoding:'utf8',windowsHide:true}):readFileSync('frontend/src/components/shared/directory.ts','utf8');
 const result=await esbuild.build({stdin:{contents:entry,resolveDir:resolve('frontend'),sourcefile:'controlled-entry.jsx',loader:'jsx'},bundle:true,write:false,metafile:true,platform:'browser',format:'iife',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'fixed-api-seam',setup(build){
 build.onResolve({filter:/^directory-under-test$/},()=>({path:'directory.ts',namespace:'controlled-directory'}));
 build.onLoad({filter:/.*/,namespace:'controlled-directory'},()=>({contents:source,loader:'ts',resolveDir:resolve('frontend/src/components/shared')}));
 build.onResolve({filter:/^\.\/api\.ts$/},args=>args.namespace==='controlled-directory'?{path:'api',namespace:'controlled-api'}:undefined);
 build.onLoad({filter:/.*/,namespace:'controlled-api'},()=>({contents:api,loader:'js'}));}}]});
 const inputs=Object.keys(result.metafile.inputs);const dependency_metadata={direct_api_stub_present:inputs.some(path=>path==='controlled-api:api'),actual_shared_api_module_present:inputs.some(path=>/components[\/]shared[\/]api\.ts$/.test(path)),react_package_instances:new Set(inputs.filter(path=>/node_modules[\/]react[\/]/.test(path)).map(path=>path.split(/node_modules[\/]react[\/]/)[0])).size};
 return{dependency_metadata,code:result.outputFiles[0].text,source_sha256:createHash('sha256').update(source).digest('hex')};}
const bundles={baseline:await bundle('baseline'),current:await bundle('current')};const results=[];
let stage='BUNDLED',selection={},lastSnapshot;
async function snapshot(page,errors){try{return await page.evaluate(errorClasses=>({fixture_api_present:!!globalThis.fixtureApi,pending_count:globalThis.fixtureApi?.pending.length??null,pending_aborted:globalThis.fixtureApi?.pending.map(item=>item.signal.aborted)??[],root_present:!!document.getElementById('fixture-root'),subscriber_count:document.querySelectorAll('[data-testid]').length,a_status:document.querySelector('[data-testid="a"]')?.getAttribute('data-status')??null,b_status:document.querySelector('[data-testid="b"]')?.getAttribute('data-status')??null,obsolete_control_visible:document.body.textContent.includes('OBSOLETE-CONTROLLED-PURPOSE'),error_classes:errorClasses}),errors);}catch{return{snapshot_unavailable:true,error_classes:errors};}}
async function mounted(browser,code){stage='CREATE_CONTEXT';const context=await browser.newContext({offline:true});const page=await context.newPage();const errors=[];page.on('pageerror',error=>errors.push(['TypeError','ReferenceError','SyntaxError','Error'].includes(error.name)?error.name:'OTHER_PAGE_ERROR'));try{stage='SET_CONTENT';await page.setContent('<main><div id="fixture-root"></div></main>');stage='ADD_LOCAL_BUNDLE';await page.addScriptTag({content:code});stage='WAIT_SUBSCRIBER_ATTACHED';await page.getByTestId('b').waitFor({state:'attached'});return{context,page,errors};}catch(error){lastSnapshot=await snapshot(page,errors);await context.close();throw error;}}
try{for(const [engine,type] of [['chromium',chromium],['webkit',webkit],['firefox',firefox]]){const browser=await type.launch({headless:true,...(engine==='chromium'&&process.env.ORVIA_CHROMIUM_PATH?{executablePath:process.env.ORVIA_CHROMIUM_PATH}:{})});try{for(const mode of ['baseline','current']){selection={engine,mode};
 let fixture=await mounted(browser,bundles[mode].code);try{const p=fixture.page;stage='WAIT_SHARED_OR_OWN_CALL_COUNT';await p.waitForFunction(expected=>globalThis.fixtureApi.pending.length===expected,mode==='baseline'?1:2);stage='UNMOUNT_FIRST';await p.evaluate(()=>globalThis.removeFirst());await p.getByTestId('a').waitFor({state:'detached'});
 stage='WAIT_FIRST_ABORT';await p.waitForFunction(()=>globalThis.fixtureApi.pending[0].signal.aborted);
 await p.evaluate(()=>{globalThis.fixtureApi.pending.forEach((item,index)=>{if(!item.signal.aborted)globalThis.fixtureApi.resolve(index,'healthy-controlled-purpose');});});
 stage='ASSERT_SURVIVOR';if(mode==='current')await p.waitForFunction(()=>document.querySelector('[data-testid="b"]').getAttribute('data-status')==='ready');
 else{await p.evaluate(()=>new Promise(r=>setTimeout(r,50)));assert.equal(await p.getByTestId('b').getAttribute('data-status'),'loading');}
 assert.deepEqual(fixture.errors,[]);results.push({engine,mode,case:'first-subscriber-unmount',survivor_status:await p.getByTestId('b').getAttribute('data-status'),version:browser.version(),source_sha256:bundles[mode].source_sha256});
 }finally{lastSnapshot=await snapshot(fixture.page,fixture.errors);await fixture.context.close();}
 fixture=await mounted(browser,bundles[mode].code);try{const p=fixture.page;stage='IDENTITY_WAIT_INITIAL_CALL';await p.waitForFunction(()=>globalThis.fixtureApi.pending.length>0);await p.evaluate(()=>{globalThis.fixtureApi.ignoreAbort();globalThis.oldPendingCount=globalThis.fixtureApi.pending.length;globalThis.fixtureApi.change();});
 stage='IDENTITY_WAIT_NEW_CALL';await p.waitForFunction(()=>globalThis.fixtureApi.pending.length>globalThis.oldPendingCount);
 await p.evaluate(()=>{for(let i=0;i<globalThis.oldPendingCount;i++)globalThis.fixtureApi.resolve(i,'OBSOLETE-CONTROLLED-PURPOSE');});
 await p.evaluate(()=>new Promise(r=>setTimeout(r,50)));assert.equal(await p.getByTestId('b').textContent(),'');
 await p.evaluate(()=>{for(let i=globalThis.oldPendingCount;i<globalThis.fixtureApi.pending.length;i++)globalThis.fixtureApi.resolve(i,'healthy-new-scope-purpose');});
 stage='IDENTITY_WAIT_HEALTHY_RESPONSE';await p.waitForFunction(()=>document.querySelector('[data-testid="b"]').textContent==='healthy-new-scope-purpose');assert.deepEqual(fixture.errors,[]);results.push({engine,mode,case:'late-identity-response-discarded',obsolete_content_visible:false});
 }finally{lastSnapshot=await snapshot(fixture.page,fixture.errors);await fixture.context.close();}
 }}finally{await browser.close();}}
 const report={diagnostic_only:true,actual_react_dom:true,actual_directory_module:true,api_stub_only:true,pinned_baseline:pinned,results,exit_code:0,limitations:['Controlled pending API promises, no production HTTP/RLS/database assurance.','Baseline expected loading is a reproduced defect, not a passing healthy behavior.']};writeFileSync(artifact,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({artifact,exit_code:0,controls:results.length}));
}catch(error){writeFileSync(artifact,JSON.stringify({diagnostic_only:true,results,exit_code:1,failure_stage:stage,selection,dependency_metadata:{baseline:bundles.baseline.dependency_metadata,current:bundles.current.dependency_metadata},snapshot:lastSnapshot,error_class:error instanceof Error?error.name:'UnknownError'},null,2)+'\n');console.log(JSON.stringify({artifact,exit_code:1}));process.exitCode=1;}
