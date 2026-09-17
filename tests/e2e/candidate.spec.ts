import { test, expect, loginUi, grantUi, withdrawUi } from './fixture.ts';
import { schemas } from '../../packages/contracts/src/index.ts';

test('B06 candidate walkthrough across staff, privacy, enforcement and evidence',async({page,browser,h})=>{
  const scenario=await h.scenario();await loginUi(page,h,'owner');await page.goto('/workspace/configuration');await page.getByLabel('Search purpose versions').fill(scenario.purpose.id);await expect(page.getByRole('heading',{name:scenario.purpose.name,exact:true})).toBeVisible();
  const context=await browser.newContext();const stop=await h.workers();
  try{const privacy=await context.newPage();await loginUi(privacy,h,'alice');const granted=schemas.Receipt.parse(await grantUi(privacy,scenario.purpose));const withdrawn=schemas.Receipt.parse(await withdrawUi(privacy,scenario.purpose));expect(withdrawn.consent_epoch).toBe(granted.consent_epoch+1);
    await page.goto('/workspace/workflows/'+withdrawn.workflow_id);await expect(page.getByText('Independently observed',{exact:true})).toBeVisible({timeout:100000});await page.getByRole('link',{name:'Evidence for this workflow'}).click();await expect(page.getByRole('button',{name:'Download local evidence JSON'})).toBeVisible();
    await page.goto('/workspace/test-lab');await expect(page.getByRole('heading',{name:'Local operator execution'})).toBeVisible();await h.screenshot(page,'candidate-test-lab');
  }finally{await stop();await context.close();}
});

test('B06 real dependency outage, malformed ID, denied scope and responsive navigation',async({page,context,browser,h})=>{
  await loginUi(page,h,'owner');await page.goto('/workspace/workflows/not-a-uuid');await expect(page.getByRole('alert')).toBeVisible();await expect(page.getByText('Independently observed',{exact:true})).toHaveCount(0);
  const scenario=await h.scenario('LEGACY_MANUAL');await scenario.change('grant');const withdrawal=await scenario.change('withdraw');const foreign=await browser.newContext();
  try{const other=await foreign.newPage();await loginUi(other,h,'birch');await other.goto('/workspace/workflows/'+withdrawal.receipt.workflow_id);await expect(other.getByRole('alert')).toContainText('NOT_FOUND');}finally{await foreign.close();}
  await page.goto('/workspace');await expect(page.getByRole('heading',{name:'Workflow counts'})).toBeVisible();await context.setOffline(true);await page.getByRole('button',{name:'Refresh now',exact:true}).first().click();await expect(page.getByRole('alert').first()).toBeVisible();await context.setOffline(false);await page.getByRole('button',{name:'Retry this read'}).first().click();await expect(page.getByRole('heading',{name:'Workflow counts'})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.goto('/workspace/capabilities');await expect(page.getByRole('heading',{name:'Programme modules'})).toBeVisible();expect(await page.locator('article').filter({has:page.getByRole('heading',{name:/^M\d\d /})}).count()).toBe(33);await h.screenshot(page,'mobile-capability-register');
});
