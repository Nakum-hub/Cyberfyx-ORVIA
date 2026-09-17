import { test, expect, loginUi, withdrawUi } from './fixture.ts';
import { schemas } from '../../packages/contracts/src/index.ts';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { digest } from '../../packages/contracts/src/crypto.ts';

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
    await page.goto('/workspace/failures');await expect(page.getByRole('heading',{name:'Failure Centre'})).toBeVisible();await expect(page.locator('.state-block').filter({hasText:'Loading'})).toHaveCount(0);await h.screenshot(page,'failure-state');
  }finally{await stop();}
});

test('B03 acknowledgement without effect remains unresolved and never verified',async({page,h})=>{
  const scenario=await h.scenario('ORVIA_REST_SIMULATOR');await scenario.change('grant');await h.cli('scripts/machine-init.ts');await h.cli('scripts/simulator-fixture.ts',[scenario.mapping.id,'ACK_WITHOUT_EFFECT','read']);const receipt=(await scenario.change('withdraw')).receipt;await loginUi(page,h,'owner');const stop=await h.workers();
  try{await page.goto('/workspace/workflows/'+receipt.workflow_id);await expect(page.getByText('Observed not satisfied',{exact:true})).toBeVisible({timeout:100000});await expect(page.getByText('Independently observed',{exact:true})).toHaveCount(0);await expect(page.getByText('Unresolved',{exact:true})).toBeVisible();expect((await h.target.query('SELECT marketing_restricted FROM marketing_memberships WHERE resource_id=$1',[scenario.mapping.id])).rows[0].marketing_restricted).toBe(false);await h.screenshot(page,'acknowledgement-without-effect');}finally{await stop();}
});
