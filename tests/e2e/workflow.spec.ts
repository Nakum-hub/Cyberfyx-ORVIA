import { test, expect, loginUi, withdrawUi } from './fixture.ts';
import { schemas } from '../../shared/contracts/src/index.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digest } from '../../shared/contracts/src/crypto.ts';

test('B03 real target effect, independent read, workflow persistence and evidence export',async({page,browser,h})=>{
  const scenario=await h.scenario();await scenario.change('grant');await loginUi(page,h,'owner');const principal=await browser.newContext();const stop=await h.workers();
  try{const privacy=await principal.newPage();await loginUi(privacy,h,'alice');const receipt=schemas.Receipt.parse(await withdrawUi(privacy,scenario.purpose));const id=receipt.workflow_id!;
    await page.goto('/workspace/workflows/'+id);await expect(page.getByText('Independently observed',{exact:true})).toBeVisible({timeout:100000});
    const target=(await h.target.query('SELECT marketing_restricted,last_applied_epoch FROM marketing_memberships WHERE resource_id=$1',[scenario.mapping.id])).rows[0];expect(target.marketing_restricted).toBe(true);expect(Number(target.last_applied_epoch)).toBe(receipt.consent_epoch);
    await page.reload();await expect(page.getByText('Independently observed',{exact:true})).toBeVisible();await h.screenshot(page,'workflow');
    await page.getByRole('link',{name:'Evidence for this workflow'}).click();await expect(page.getByRole('heading',{name:'Evidence scope and integrity'})).toBeVisible();await h.screenshot(page,'workflow-evidence');
    const downloaded=page.waitForEvent('download');await page.getByRole('button',{name:'Download local evidence JSON'}).click();const file=await downloaded;const path=resolve(h.publicDirectory,'synthetic-evidence-'+id+'.json');await file.saveAs(path);
    const evidence=schemas.Evidence.parse(JSON.parse(readFileSync(path,'utf8')));expect(evidence.workflow.id).toBe(id);expect(evidence.receipts[0]!.receipt_id).toBe(receipt.receipt_id);const {integrity_digest,...body}=evidence;expect(integrity_digest).toBe(digest(body));
  }finally{await principal.close();await stop();}
});

test('B03 applied response lost, read reconciliation and visible manual obligation',async({page,h})=>{
  const scenario=await h.scenario('ORVIA_REST_SIMULATOR');await scenario.change('grant');await h.cli('scripts/machine-init.ts');await h.cli('scripts/simulator-fixture.ts',[scenario.mapping.id,'APPLY_THEN_TIMEOUT','read']);const receipt=(await scenario.change('withdraw')).receipt;
  const manual=await h.scenario('LEGACY_MANUAL',false);await manual.change('grant');const manualReceipt=(await manual.change('withdraw')).receipt;await loginUi(page,h,'owner');const stop=await h.workers();
  try{
    await page.goto('/workspace/workflows/'+receipt.workflow_id);await expect(page.getByText('Effect unknown',{exact:true}).first()).toBeVisible({timeout:100000});await expect(page.getByText('Independently observed',{exact:true})).toHaveCount(0);
    const target=(await h.target.query('SELECT marketing_restricted FROM marketing_memberships WHERE resource_id=$1',[scenario.mapping.id])).rows[0];expect(target.marketing_restricted).toBe(true);
    const before=schemas.Workflow.parse(await (await scenario.owner.call('/api/v1/admin/workflows/'+receipt.workflow_id)).json());expect(before.actions[0]!.observations).toHaveLength(0);
    await page.getByRole('button',{name:'Request scoped read reconciliation'}).click();await expect(page.getByText('Independently observed',{exact:true})).toBeVisible({timeout:100000});await expect(page.getByText('Effect unknown',{exact:true}).first()).toBeVisible();
    const after=schemas.Workflow.parse(await (await scenario.owner.call('/api/v1/admin/workflows/'+receipt.workflow_id)).json());expect(after.actions[0]!.attempts).toEqual(before.actions[0]!.attempts);expect(after.actions[0]!.reconciliations.at(-1)?.state).toBe('RESOLVED');
    await page.goto('/workspace/workflows/'+manualReceipt.workflow_id);await expect(page.getByRole('heading',{name:'Manual action required'})).toBeVisible({timeout:100000});await expect(page.getByText('Unresolved',{exact:true})).toBeVisible();await h.screenshot(page,'manual-unresolved');
    await page.goto('/workspace/failures');await expect(page.getByRole('heading',{name:'Attention',exact:true})).toBeVisible();await expect(page.locator('.state-block').filter({hasText:'Loading'})).toHaveCount(0);await h.screenshot(page,'failure-state');
  }finally{await stop();}
});

test('B03 acknowledgement without effect remains unresolved and never verified',async({page,h})=>{
  const scenario=await h.scenario('ORVIA_REST_SIMULATOR');await scenario.change('grant');await h.cli('scripts/machine-init.ts');await h.cli('scripts/simulator-fixture.ts',[scenario.mapping.id,'ACK_WITHOUT_EFFECT','read']);const receipt=(await scenario.change('withdraw')).receipt;await loginUi(page,h,'owner');const stop=await h.workers();
  try{await page.goto('/workspace/workflows/'+receipt.workflow_id);await expect(page.getByText('Observed not satisfied',{exact:true})).toBeVisible({timeout:100000});await expect(page.getByText('Independently observed',{exact:true})).toHaveCount(0);await expect(page.getByText('Unresolved',{exact:true})).toBeVisible();expect((await h.target.query('SELECT marketing_restricted FROM marketing_memberships WHERE resource_id=$1',[scenario.mapping.id])).rows[0].marketing_restricted).toBe(false);await h.screenshot(page,'acknowledgement-without-effect');}finally{await stop();}
});

test('B03 manual task uses its read version, preserves replay and rejects a stale tab',async({page,context,h})=>{
  const scenario=await h.scenario('LEGACY_MANUAL',false);await scenario.change('grant');const receipt=(await scenario.change('withdraw')).receipt;
  const stop=await h.workers();const stale=await context.newPage();let releaseStale=()=>{};
  try{
    const readWorkflow=async()=>schemas.Workflow.parse(await (await scenario.owner.call('/api/v1/admin/workflows/'+receipt.workflow_id)).json());
    await expect.poll(async()=>(await readWorkflow()).obligations.length,{timeout:100000}).toBe(1);
    await h.cli('scripts/assign-manual.ts',[receipt.workflow_id!]);await loginUi(page,h,'member');
    const response=page.waitForResponse(r=>r.url().endsWith('/admin/workflows/'+receipt.workflow_id)&&r.request().method()==='GET');
    await page.goto('/workspace/workflows/'+receipt.workflow_id);const task=schemas.Workflow.parse(await (await response).json()).obligations[0]!;
    await stale.goto('/workspace/workflows/'+receipt.workflow_id);
    const staleForm=stale.getByRole('form',{name:'Record manual attestation'});await expect(staleForm).toBeVisible();
    const path=`/api/v1/admin/manual-tasks/${task.id}/attest`;const requests:{key:string|undefined;body:string|null}[]=[];
    let staleSeen=()=>{};const seen=new Promise<void>(resolve=>{staleSeen=resolve;});const held=new Promise<void>(resolve=>{releaseStale=resolve;});
    await stale.route('**'+path,async route=>{staleSeen();await held;await route.continue();});
    await staleForm.getByLabel('Action statement',{exact:true}).fill('Another synthetic statement from the stale task view.');await staleForm.getByLabel('Receipt evidence IDs',{exact:true}).fill(receipt.receipt_id);
    const denied=stale.waitForResponse(r=>r.url().endsWith(path));await staleForm.getByRole('button',{name:'Record attributed action'}).click();await seen;
    await page.route('**'+path,async route=>{
      requests.push({key:route.request().headers()['idempotency-key'],body:route.request().postData()});
      if(requests.length===1){const actual=await route.fetch();expect(actual.status()).toBe(202);await route.abort('failed');}else await route.continue();
    });
    const form=page.getByRole('form',{name:'Record manual attestation'});
    await form.getByLabel('Action statement',{exact:true}).fill('Synthetic member records completing the declared manual restriction.');
    await form.getByLabel('Receipt evidence IDs',{exact:true}).fill(receipt.receipt_id);await form.getByRole('button',{name:'Record attributed action'}).click();
    await expect(form.getByRole('heading',{name:'Original request preserved'})).toBeVisible();
    expect(JSON.parse(requests[0]!.body!).expected_task_version).toBe(task.task_version);
    await form.getByRole('button',{name:'Read current task'}).click();await expect(page.getByRole('heading',{name:'Attributed manual closure'})).toBeVisible();
    await expect(form.getByRole('heading',{name:'Original request preserved'})).toBeVisible();
    await form.getByRole('button',{name:'Replay original request'}).click();await expect(form).toHaveCount(0);
    expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);
    releaseStale();expect((await denied).status()).toBe(409);
    await expect(staleForm.getByRole('alert')).toContainText('IDEMPOTENCY_CONFLICT');await staleForm.getByRole('button',{name:'Read current task'}).click();await expect(stale.getByRole('heading',{name:'Attributed manual closure'})).toBeVisible();
    const current=(await readWorkflow()).obligations[0]!;expect(current.task_version).toBe(task.task_version+1);expect(current.attestation?.actor_id).toBe(h.users.member!.id);expect(current.observation).toBeNull();
    await expect(page.getByText('Independently observed',{exact:true})).toHaveCount(0);await h.screenshot(page,'manual-attributed-not-observed');
  }finally{releaseStale();await stale.close();await stop();}
});
