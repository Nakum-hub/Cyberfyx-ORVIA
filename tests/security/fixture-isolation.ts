import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { resetBootstrap } from '../../shared/testing/src/reset.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { connectTemporal } from '../../services/worker/src/probe-client.ts';
import { writeEvidence,safeError } from '../../shared/testing/src/evidence.ts';
const profile=loadProfile();if(profile.profile!=='codex-a00')throw new Error('Only the named Codex fixture profile is permitted');
const db=connectDatabase(profile).pool,target=connectDatabase({...profile,database:profile.database+'_targets'}).pool;
const checks:Record<string,unknown>[]=[];let temporal:Awaited<ReturnType<typeof connectTemporal>>|undefined;let owned:string|undefined;
function check(name:string,actual:unknown,expected:unknown){assert.deepEqual(actual,expected);checks.push({name,actual,expected,result:'PASS'});console.log('PASS '+name);}
async function denied(name:string,fn:()=>Promise<unknown>){let rejected=false;try{await fn();}catch{rejected=true;}check(name,rejected,true);}
async function state(){return {
 control:(await db.query("SELECT (SELECT count(*) FROM app.consent_events) events,(SELECT count(*) FROM app.workflows) workflows,(SELECT count(*) FROM bootstrap_probes) probes,(SELECT md5(coalesce(string_agg(row_to_json(c)::text,',' ORDER BY purpose_id,principal_id),'')) FROM app.consent_aggregates c) ledger")).rows,
 target:(await target.query("SELECT md5(coalesce(string_agg(row_to_json(c)::text,',' ORDER BY resource_id),'')) fingerprint FROM simulator_controls c")).rows
};}
try{
 temporal=await connectTemporal(profile);
 const before=await state();
 await denied('unknown production profile denied',()=>resetBootstrap('customer-production','customer-production-bootstrap-only'));
 await denied('wrong confirmation denied',()=>resetBootstrap(profile.profile,'WRONG_CONFIRMATION'));
 await denied('business schema blocks bootstrap reset',()=>resetBootstrap(profile.profile,profile.reset));
 check('reset denials preserve ledger workflows and target controls',await state(),before);
 const cli=promisify(execFile);
 for(const [name,args] of [
  ['foreign lane confirmation',['confirm:ui-b00',randomUUID(),'HEALTHY','read']],
  ['unenrolled resource',[`confirm:${profile.profile}`,randomUUID(),'HEALTHY','read']],
  ['arbitrary simulator operation',[`confirm:${profile.profile}`,randomUUID(),'SQL','read']]
 ] as const)await denied(name,()=>cli(process.execPath,['--import','tsx','scripts/simulator-fixture.ts',...args],{windowsHide:true,timeout:30000}));
 check('invalid fault operations preserve database state',await state(),before);
 owned='a06-reset-guard-'+randomUUID();
 const handle=await temporal.client.workflow.start('bootstrapProbe',{workflowId:owned,taskQueue:'a06-reset-guard-no-worker',args:['synthetic-reset-guard'],workflowExecutionTimeout:'60s'});
 check('test-owned workflow is actually running',(await handle.describe()).status.name,'RUNNING');
 // Visibility is asynchronous; wait for this exact test-owned execution.
 let visible=false;for(let n=0;n<40&&!visible;n++){for await(const item of temporal.client.workflow.list({query:`WorkflowId = '${owned}' AND ExecutionStatus = 'Running'`}))if(item.workflowId===owned)visible=true;if(!visible)await new Promise(r=>setTimeout(r,100));}
 check('running execution visible to reset guard',visible,true);
 let reason='';try{await resetBootstrap(profile.profile,profile.reset);}catch(error){reason=error instanceof Error?error.message:'';}
 check('active workflow blocks reset before database mutation',reason,'Active workflows block reset');
 check('active-job denial preserves database state',await state(),before);
 const names=['codex-a00','ui-b00','rehearsal'].map(name=>loadProfilePorts(name));
 check('all frozen lane ports and namespaces differ',new Set(names.flat()).size,names.flat().length);
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{
 if(owned&&temporal)await temporal.client.workflow.getHandle(owned).terminate('A06 test-owned reset guard cleanup');
 await temporal?.connection.close();await Promise.all([db.end(),target.end()]);
 writeEvidence('fixture-isolation',{test_ids:['T28'],profile:profile.profile,checks,result:process.exitCode?'FAIL':'PASS',limitations:['No business data reset; reset refuses A01+ schema. Other lane databases, profiles and networks were not accessed.']});
}
import { PROFILES } from '../../shared/contracts/src/index.ts';
function loadProfilePorts(name:string){const p=PROFILES[name as keyof typeof PROFILES];return [p.app_port,p.postgres_port,p.opa_port,p.temporal_port,p.temporal_namespace,p.database];}
