// TEST_FIXTURE diagnostic only. New disposable network/target; no real PG or SQL.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createServer,connect } from 'node:net';
import { appendFileSync,writeFileSync,realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const root=realpathSync(fileURLToPath(new URL('../../',import.meta.url)));
assert.equal(realpathSync(process.cwd()),root);
const [label]=process.argv.slice(2);assert.equal(process.argv.length,3);
assert.match(label??'',/^[a-z0-9-]{1,30}$/);
assert.equal(process.env.ORVIA_PROFILE,'codex-a00');assert.equal(process.version,'v24.21.0');
const output=resolve(root,`handoffs/codex/artifacts/R8-${label}-relay-stop-diagnostic.jsonl`);
writeFileSync(output,'',{flag:'wx'});
const emit=value=>appendFileSync(output,JSON.stringify(value)+'\n');
const IMAGE='node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553';
const network=`orvia-r8-${label}-fixture-net`;
const fixture=`orvia-r8-${label}-fixture`;
const marker=Buffer.from('R8_RELAY_FIXTURE\n');
let cleanupFailed=false;
function docker(args,required=true){
  const start=performance.now();
  const result=spawnSync('docker',args,{encoding:'utf8',windowsHide:true,timeout:30000,maxBuffer:1024*1024});
  emit({kind:'DOCKER',operation:args[0],elapsed_ms:Math.round(performance.now()-start),exit_code:result.status,signal:result.signal,error_class:result.error?['ETIMEDOUT','ENOENT'].includes(result.error.code)?result.error.code:'UNCLASSIFIED':null});
  if(required)assert.ok(!result.error&&result.status===0,'Disposable operation failed');
  return result;
}
function inspect(name,format){return docker(['inspect','--format',format,name]).stdout.trim();}
const ownershipArgs=['--label',`orvia.round8.relay-stop=${label}`,'--label','orvia.round8.disposable=true','--label','orvia.round8.test-fixture=true'];
function labelsOwned(labels){assert.equal(labels['orvia.round8.relay-stop'],label);assert.equal(labels['orvia.round8.disposable'],'true');assert.equal(labels['orvia.round8.test-fixture'],'true');}
function ownedContainer(name){labelsOwned(JSON.parse(inspect(name,'{{json .Config.Labels}}')));}
function ownNetwork(){const v=JSON.parse(docker(['network','inspect',network]).stdout);assert.equal(v.length,1);assert.equal(v[0].Name,network);labelsOwned(v[0].Labels);return v[0];}
function cleanupContainer(name){
  try{
    // Creation may have taken effect even when its CLI returned a timeout.
    const probe=docker(['inspect','--format','{{json .Config.Labels}}',name],false);
    if(!probe.error&&probe.status===1&&probe.stderr.trim()===`Error: No such object: ${name}`)return;
    assert.ok(!probe.error&&probe.status===0,'Uncertain disposable existence; cleanup refused');
    labelsOwned(JSON.parse(probe.stdout));
    let stopped;
    if(inspect(name,'{{.State.Running}}')==='true'){
      stopped=docker(['stop','--timeout','20',name],false);
      ownedContainer(name);
      if(inspect(name,'{{.State.Running}}')==='true')docker(['kill','--signal','KILL',name]);
    }
    docker(['rm',name]);
    if(stopped)assert.ok(!stopped.error&&stopped.status===0,'Cleanup stop command failed despite subsequent removal');
  }catch(error){cleanupFailed=true;emit({kind:'CLEANUP_FAILURE',error_class:'OWNED_CONTAINER_CLEANUP_FAILED'});throw error;}
}
function cleanupNetwork(){
  try{
    const probe=docker(['network','inspect',network],false);
    if(!probe.error&&probe.status===1&&probe.stderr.trim()===`Error response from daemon: network ${network} not found`)return;
    assert.ok(!probe.error&&probe.status===0,'Uncertain network existence; cleanup refused');
    const values=JSON.parse(probe.stdout);assert.equal(values.length,1);assert.equal(values[0].Name,network);labelsOwned(values[0].Labels);
    assert.equal(Object.keys(values[0].Containers??{}).length,0,'Never remove a network containing another object');
    docker(['network','rm',network]);
  }catch(error){cleanupFailed=true;emit({kind:'CLEANUP_FAILURE',error_class:'OWNED_NETWORK_CLEANUP_FAILED'});throw error;}
}
async function freePort(){await new Promise((res,rej)=>{const s=createServer();s.once('error',rej);s.listen(57233,'127.0.0.1',()=>s.close(e=>e?rej(e):res()));});}
function echoed(){
  return new Promise((res,rej)=>{
    const socket=connect({host:'127.0.0.1',port:57233});let data=Buffer.alloc(0);let settled=false;
    const fail=()=>{if(settled)return;settled=true;clearTimeout(timer);socket.destroy();rej(new Error('Fixture marker unavailable'));};
    const timer=setTimeout(fail,1000);socket.once('error',fail);socket.once('close',()=>{if(!settled)fail();});
    socket.once('connect',()=>socket.write(marker));
    socket.on('data',chunk=>{
      data=Buffer.concat([data,chunk]);
      if(data.length>marker.length||!marker.subarray(0,data.length).equals(data)){fail();return;}
      if(data.length===marker.length&&!settled){settled=true;clearTimeout(timer);res(socket);}
    });
  });
}
async function ready(){const end=Date.now()+20000;while(Date.now()<end){try{return await echoed();}catch{await new Promise(r=>setTimeout(r,250));}}throw new Error('Fixture readiness deadline');}
const results=[];let failed=false;let networkAttempted=false;let fixtureAttempted=false;
try{
  docker(['image','inspect',IMAGE]);await freePort();
  networkAttempted=true;docker(['network','create','--driver','bridge',...ownershipArgs,network]);ownNetwork();
  fixtureAttempted=true;
  docker(['create','--pull=never','--name',fixture,...ownershipArgs,'--network',network,'--network-alias','postgres','--read-only','--user','node','--cap-drop','ALL','--security-opt','no-new-privileges=true','--memory','128m','--mount',`type=bind,src=${resolve(root,'handoffs/codex/round8-relay-test-fixture.mjs')},dst=/app/fixture.mjs,readonly`,IMAGE,'node','/app/fixture.mjs']);
  ownedContainer(fixture);docker(['start',fixture]);
  for(const variant of ['baseline','candidate'])for(const state of ['idle','held']){
    await freePort();const name=`orvia-r8-${label}-${variant}-${state}`;let attempted=false;let socket;let socketClosed=false;
    try{
      const current=ownNetwork();assert.ok(Object.values(current.Containers??{}).every(c=>c.Name===fixture),'Only the fixed test fixture may be attached before relay creation');
      const source=resolve(root,variant==='baseline'?'infrastructure/loopback.mjs':'handoffs/codex/round8-relay-graceful-shutdown-candidate.mjs');
      attempted=true;
      docker(['create','--pull=never','--name',name,...ownershipArgs,'--network',network,'--publish','127.0.0.1:57233:5432','--read-only','--user','node','--cap-drop','ALL','--security-opt','no-new-privileges=true','--memory','256m','--mount',`type=bind,src=${source},dst=/app/loopback.mjs,readonly`,IMAGE,'node','/app/loopback.mjs']);
      ownedContainer(name);docker(['start',name]);socket=await ready();
      emit({kind:'MARKER_FORWARDED',variant,state,test_fixture:true});
      if(state==='idle'){socket.destroy();socket=undefined;await new Promise(r=>setTimeout(r,250));}
      else{socket.once('close',()=>{socketClosed=true;});socket.on('error',()=>{});await new Promise(r=>setTimeout(r,1000));assert.ok(!socket.destroyed,'Fixture must hold the marker-verified connection');}
      const start=performance.now();const stop=docker(['stop','--timeout','20',name],false);const elapsed=Math.round(performance.now()-start);
      ownedContainer(name);const final=JSON.parse(inspect(name,'{{json .State}}'));
      if(socket)await new Promise(r=>{if(socketClosed)return r();const t=setTimeout(r,2000);socket.once('close',()=>{clearTimeout(t);r();});});
      const result={kind:'CASE',variant,state,marker_forwarded:true,stop_cli_exit:stop.status,stop_cli_signal:stop.signal,stop_elapsed_ms:elapsed,container_exit_code:final.ExitCode,running:final.Running,held_socket_closed:socket?socketClosed:null};results.push(result);emit(result);
      assert.equal(final.Running,false);
      if(variant==='baseline')assert.equal(final.ExitCode,137);
      else{assert.ok(!stop.error);assert.equal(stop.status,0);assert.equal(final.ExitCode,0);assert.ok(elapsed<10000);}
      if(socket)assert.ok(socketClosed);
    }finally{socket?.destroy();if(attempted)cleanupContainer(name);}
  }
}catch{failed=true;emit({kind:'SAFE_FAILURE',error_class:cleanupFailed?'OWNED_CLEANUP_FAILED':'DIAGNOSTIC_CONTROL_FAILED'});}
finally{
  try{if(fixtureAttempted)cleanupContainer(fixture);}catch{failed=true;}
  try{if(networkAttempted)cleanupNetwork();}catch{failed=true;}
  emit({kind:'SUMMARY',diagnostic_only:true,test_fixture:true,results,cleanup_failed:cleanupFailed,exit_code:failed?1:0});
}
process.exitCode=failed?1:0;
