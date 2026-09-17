import { once } from 'node:events';
import type { Page } from '@playwright/test';
import { test, expect, loginUi, type BrowserHarness } from './fixture.ts';
import { schemas } from '../../packages/contracts/src/index.ts';

async function queue(page:Page,scenario:string){
  await page.goto('/workspace/test-lab');await page.getByLabel('Scenario',{exact:true}).selectOption(scenario);
  const accepted=page.waitForResponse(r=>r.url().endsWith('/admin/test-runs')&&r.request().method()==='POST');await page.getByRole('button',{name:'Queue synthetic test'}).click();const response=await accepted;expect(response.status()).toBe(202);const run=schemas.TestRun.parse(await response.json());expect(run.state).toBe('NOT_RUN');await page.getByRole('link',{name:'Open test run '+run.id}).click();await expect(page.getByText('Not run',{exact:true})).toBeVisible();return run;
}
async function runOperator(h:BrowserHarness){await h.authWindow();const child=h.startProcess(['--import','tsx','scripts/regression-runner.ts','confirm:rehearsal']);const [code]=await once(child,'close');h.processes.delete(child);return code;}

test('B04 real healthy, broken detection, repaired and target restoration results',async({page,h})=>{
  test.setTimeout(720000);await loginUi(page,h,'owner');
  expect((await h.db.query("SELECT count(*)::int n FROM app.test_runs WHERE state IN ('NOT_RUN','RUNNING')")).rows[0].n,'No unrelated pending test request may be consumed').toBe(0);
  for(const [scenario,result,exit] of [
    ['MARKETING_WITHDRAWAL_HEALTHY','PASS',0],['MARKETING_WITHDRAWAL_BROKEN_CONTROL','FAIL',1],['MARKETING_WITHDRAWAL_HEALTHY','PASS',0],['TARGET_RESTORE_QUARANTINE','PASS',0],
  ] as const){
    const run=await queue(page,scenario);expect(await runOperator(h)).toBe(exit);
    await expect(page.getByText(result==='PASS'?'Pass':'Fail',{exact:true}).first()).toBeVisible({timeout:30000});await page.reload();await expect(page.getByRole('heading',{name:'Actual assertions'})).toBeVisible();
    const stored=schemas.TestRun.parse((await h.db.query('SELECT document FROM app.test_runs WHERE id=$1',[run.id])).rows[0].document);expect(stored.state).toBe(result);expect(stored.assertions.length).toBeGreaterThan(0);
    if(result==='FAIL'){expect(stored.expected_fault_detection).toBe(true);await expect(page.getByRole('heading',{name:'Expected broken-control detection'})).toBeVisible();}
    await h.screenshot(page,'test-lab-'+scenario+'-'+run.id);
  }
});

test('B04 actual interrupted operator is recovered as ERROR without fabricated pass',async({page,h})=>{
  test.setTimeout(300000);await loginUi(page,h,'owner');const run=await queue(page,'MARKETING_WITHDRAWAL_HEALTHY');
  // Hold real fixture configuration before any worker/agent is started. This
  // makes process interruption deterministic without manufacturing run state.
  const barrier=await h.db.connect();await barrier.query('BEGIN');await barrier.query('LOCK TABLE app.purposes IN SHARE MODE');
  const operator=h.startProcess(['--import','tsx','scripts/regression-runner.ts','confirm:rehearsal']);
  try{
    await expect(page.getByText('Running',{exact:true})).toBeVisible({timeout:60000});const stopped=once(operator,'close');operator.kill();await stopped;h.processes.delete(operator);
  }finally{await barrier.query('ROLLBACK');barrier.release();}
  expect((await h.db.query('SELECT state FROM app.test_runs WHERE id=$1',[run.id])).rows[0].state).toBe('RUNNING');
  expect(await runOperator(h)).toBe(0);await expect(page.getByRole('heading',{name:'Execution error'})).toBeVisible({timeout:30000});
  const stored=schemas.TestRun.parse((await h.db.query('SELECT document FROM app.test_runs WHERE id=$1',[run.id])).rows[0].document);expect(stored.state).toBe('ERROR');expect(stored.assertions.some(a=>a.id==='runner_interrupted'&&a.result==='ERROR')).toBe(true);await h.screenshot(page,'test-lab-interrupted-error');
});
