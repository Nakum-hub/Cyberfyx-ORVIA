import { randomUUID } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { HttpFixture } from '../shared/testing/src/http-fixture.ts';
import { waitForAuthWindow } from '../shared/testing/src/auth-window.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { TestRun,Evidence } from '../shared/contracts/src/index.ts';
import { writeEvidence,safeError } from '../shared/testing/src/evidence.ts';
const p=loadProfile();if(p.profile!=='rehearsal'||process.argv[2]!=='confirm:rehearsal')throw new Error('Named rehearsal demo required');
const scenario=process.argv[3]??'MARKETING_WITHDRAWAL_HEALTHY';if(!['MARKETING_WITHDRAWAL_HEALTHY','MARKETING_WITHDRAWAL_BROKEN_CONTROL','TARGET_RESTORE_QUARANTINE'].includes(scenario))throw new Error('Allowlisted synthetic scenario required');
const h=new HttpFixture();const db=connectDatabase(p).pool;
try{
 await h.start();await waitForAuthWindow(db);const owner=await h.login('owner');
 const response=await owner.call('/api/v1/admin/test-runs',{scenario,profile:p.profile,fixture_id:'aster-birch-v1'},{'idempotency-key':randomUUID()});if(response.status!==202)throw new Error('Test request denied');const run=TestRun.parse(await response.json());
 const execution=await promisify(execFile)(process.execPath,['--import','tsx','scripts/regression-runner.ts','confirm:rehearsal'],{windowsHide:true,timeout:240000,maxBuffer:2*1024*1024});process.stdout.write(execution.stdout);
 const completed=TestRun.parse(await (await owner.call('/api/v1/admin/test-runs/'+run.id)).json());const expected=scenario==='MARKETING_WITHDRAWAL_BROKEN_CONTROL'?'FAIL':'PASS';if(completed.state!==expected)throw new Error('Scenario outcome differed from its real control requirement');
 const scope=h.users.owner!.scope;const linked=await db.query('SELECT workflow_id FROM app.test_run_links WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND run_id=$4',[scope.tenant_id,scope.legal_entity_id,scope.environment_id,run.id]);
 const exported=Evidence.parse(await (await owner.call('/api/v1/admin/evidence/'+linked.rows[0].workflow_id+'/export')).json());
 writeEvidence('demo-export',{profile:p.profile,test_run:completed,evidence:exported,result:'PASS',expected_fault_detected:expected==='FAIL',limitations:['Scripted real backend scenario and local export, not browser acceptance or a human rehearsal.']});
}catch(error){console.error(safeError(error));if(error&&typeof error==='object'&&'stderr' in error)console.error(String(error.stderr).slice(-4000));process.exitCode=1;}finally{await h.stop();await db.end();}
