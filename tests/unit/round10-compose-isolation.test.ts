import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,sep} from 'node:path';
import {runtimeConfig} from '../../backend/auth/src/config.ts';
test('runtime helpers accept only the owned project for their named synthetic profile',()=>{
 const root=mkdtempSync(join(tmpdir(),'orvia-round10-config-'));
 assert.ok(resolve(root).startsWith(resolve(tmpdir())+sep),'temporary cleanup stays within the named temporary directory');
 const saved={...process.env};
 try {
  for(const profile of ['codex-a00','vendor-a00','rehearsal','ui-b00']) {
   const directory=join(root,'.local','profiles',profile);mkdirSync(directory,{recursive:true});
   writeFileSync(join(directory,'config.json'),JSON.stringify({profile,fixture_id:'bootstrap-probe-v1',installation_id:'11111111-1111-4111-8111-111111111111'}));
   process.env.ORVIA_WORKSPACE_ROOT=root;process.env.ORVIA_PROFILE=profile;delete process.env.ORVIA_TEST_COMPOSE_PROJECT;
   const standard=runtimeConfig().compose_project;
   process.env.ORVIA_TEST_COMPOSE_PROJECT=profile==='rehearsal'?'orvia-round10-rehearsal':'orvia-round10-customer';
   if(profile==='ui-b00')assert.throws(runtimeConfig,/Unapproved/);
   else assert.equal(runtimeConfig().compose_project,process.env.ORVIA_TEST_COMPOSE_PROJECT);
   process.env.ORVIA_TEST_COMPOSE_PROJECT=standard;assert.throws(runtimeConfig,/Unapproved/);
   process.env.ORVIA_TEST_COMPOSE_PROJECT='unrelated';assert.throws(runtimeConfig,/Unapproved/);
  }
 }finally{
  for(const key of ['ORVIA_WORKSPACE_ROOT','ORVIA_PROFILE','ORVIA_TEST_COMPOSE_PROJECT'])if(saved[key]===undefined)delete process.env[key];else process.env[key]=saved[key];
  rmSync(root,{recursive:true,force:true});
 }
});
