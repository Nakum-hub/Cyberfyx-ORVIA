import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateTracking,renderTasks,renderAcceptance,assertViewRows,assertTaskDetails,taskRows,acceptanceRows,type Tracking,type AcceptanceTracking } from '../../scripts/tracking.ts';
const load=()=>({tasks:JSON.parse(readFileSync('tracking/tasks.json','utf8')) as Tracking,acceptance:JSON.parse(readFileSync('tracking/acceptance.json','utf8')) as AcceptanceTracking});
test('current and legitimately progressed/BLOCKED tracking remain valid',()=>{
  const {tasks,acceptance}=load();validateTracking(tasks,acceptance,()=>true);
  tasks.tasks.find(t=>t.id==='W00')!.status='COMPLETED';tasks.tasks.find(t=>t.id==='W00')!.commit='e5cdef3';
  const a00=tasks.tasks.find(t=>t.id==='A00')!;a00.status='IN_PROGRESS';
  const a01=tasks.tasks.find(t=>t.id==='A01')!;a01.status='BLOCKED';
  const t01=acceptance.tests.find(t=>t.id==='T01')!;t01.status='FAIL';t01.evidence=['handoffs/codex/example-failure.json'];
  validateTracking(tasks,acceptance,()=>true);
  assertViewRows(renderTasks(tasks),taskRows(tasks));assertViewRows(renderAcceptance(acceptance),acceptanceRows(acceptance));
  assertTaskDetails(renderTasks(tasks),tasks);
});
test('application PASS cannot be manufactured from a document or bootstrap subset',()=>{
  const {tasks,acceptance}=load();const t01=acceptance.tests[0]!;t01.status='PASS';t01.evidence=['handoffs/codex/test.json'];
  for(const report of [{result:'PASS'}, {kind:'APPLICATION_ACCEPTANCE',coverage:'BOOTSTRAP_SUBSET',result:'PASS',exit_code:0}])assert.throws(()=>validateTracking(tasks,acceptance,()=>true,()=>report));
  // Synthetic validator input only; never saved as application evidence.
  const execution={kind:'APPLICATION_ACCEPTANCE',coverage:'FULL_SCENARIO',test_ids:['T01'],result:'PASS',exit_code:0,source_commit:'a'.repeat(40),contract_version:'0.2.0',fixture_id:'synthetic-validator-fixture',profile:'codex-a00',command:['synthetic-validator-fixture'],started_at:'2026-09-16T00:00:00Z',finished_at:'2026-09-16T00:00:01Z',assertions:[{id:'fixture',result:'PASS',expected:'fixture',actual:'fixture'}],artifact_paths:['handoffs/codex/test-output.log'],limitations:['Validator unit input only']};
  validateTracking(tasks,acceptance,()=>true,()=>execution);
  assert.throws(()=>validateTracking(tasks,acceptance,()=>true,()=>({...execution,assertions:[]})));
  assert.throws(()=>assertTaskDetails(renderTasks(tasks).replace('**Accepted commit:** None recorded','**Accepted commit:** 1234567'),tasks));
});
test('unknown dependencies, cycles, invalid statuses, missing evidence, and view drift fail',()=>{
  for(const mutate of [
    (t:Tracking)=>{t.tasks[0]!.start_dependencies=['Z99'];},
    (t:Tracking)=>{t.tasks[0]!.start_dependencies=['A00'];},
    (t:Tracking)=>{t.tasks[0]!.status='FAKE_GREEN';},
    (t:Tracking)=>{t.tasks.find(t=>t.id==='A00')!.status='NOT_STARTED';t.tasks.find(t=>t.id==='A01')!.status='IN_PROGRESS';},
    (t:Tracking)=>{t.tasks[0]!.status='COMPLETED';t.tasks[0]!.evidence=[];},
  ]){const {tasks,acceptance}=load();mutate(tasks);assert.throws(()=>validateTracking(tasks,acceptance,()=>true));}
  const {tasks,acceptance}=load();assert.throws(()=>validateTracking(tasks,acceptance,()=>false));
  acceptance.tests[0]!.status='PASS';assert.throws(()=>validateTracking(tasks,acceptance,()=>true));
  const rows=taskRows(tasks);const original='| '+rows[0]!.join(' | ')+' |';
  const drifted=renderTasks(tasks).replace(original,original.replace(tasks.tasks[0]!.status,'FAKE_GREEN'));
  assert.notEqual(drifted,renderTasks(tasks),'the negative fixture must actually change a rendered row');
  assert.throws(()=>assertViewRows(drifted,rows));
});
