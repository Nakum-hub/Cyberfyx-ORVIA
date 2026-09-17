import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { writeFileSync } from 'node:fs';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { waitForAuthWindow } from '../../../packages/testing/src/auth-window.ts';

const profile=loadProfile();
if(profile.profile!=='rehearsal')throw new Error('Only the named rehearsal is authorized');
const db=connectDatabase(profile).pool;const h=new HttpFixture();
const id='84cd5044-b7c9-4957-b7f9-46024a329c58';
const started_at=new Date().toISOString();
try {
  const before=(await db.query("SELECT id,state,document FROM app.test_runs WHERE state IN ('NOT_RUN','RUNNING') ORDER BY id")).rows;
  if(before.length!==1||before[0].id!==id||before[0].state!=='RUNNING')throw new Error('Unexpected pending work; recovery refused');
  if((await db.query("SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name IN ('orvia_worker','orvia_agent_control') LIMIT 1")).rowCount)throw new Error('Active runtime owner; recovery refused');
  await h.start();await waitForAuthWindow(db);
  const run=await promisify(execFile)(process.execPath,['--import','tsx','scripts/regression-runner.ts','confirm:rehearsal'],{windowsHide:true,timeout:120000});
  const after=(await db.query('SELECT id,state,document FROM app.test_runs WHERE id=$1',[id])).rows[0];
  if(after.state!=='ERROR'||!after.document.assertions.some((a:{id:string;result:string})=>a.id==='runner_interrupted'&&a.result==='ERROR'))throw new Error('Expected interrupted-run attribution absent');
  const record={kind:'RECOVERY_OF_INTERRUPTED_ENGINEERING_RUN',started_at,finished_at:new Date().toISOString(),profile:profile.profile,run_id:id,command:'node --import tsx scripts/regression-runner.ts confirm:rehearsal',exit_code:0,before,after,stdout:run.stdout,stderr:run.stderr,limitations:['Existing operator recovery, no reset or manual result rewrite. Original broken-control execution remains ERROR, not a qualifying detection.']};
  writeFileSync(`handoffs/work/final-prototype-7bc7780/interrupted-recovery-${Date.now()}.json`,JSON.stringify(record,null,2)+'\n',{flag:'wx'});
  console.log('Existing runner recorded the abandoned synthetic run as ERROR; history retained.');
} finally {await h.stop();await db.end();}
