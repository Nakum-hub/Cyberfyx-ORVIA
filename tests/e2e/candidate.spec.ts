import { test, expect, loginUi, grantUi, withdrawUi, expectPageError } from './fixture.ts';
import { schemas } from '../../shared/contracts/src/index.ts';

test('B06 branded route fallback, session-aware navigation and captured page errors',async({page,h})=>{
  // F-06: an unmatched route stays HTTP 404 but is presented inside the product.
  const missing=await page.goto('/workspace/does-not-exist');
  expect(missing?.status()).toBe(404);
  await expect(page.getByRole('heading',{name:'This page does not exist',exact:true})).toBeVisible();
  await expect(page.getByText('Synthetic demonstration',{exact:true})).toBeVisible();
  await expect(page.getByRole('link',{name:'Return to the ORVIA entry page',exact:true})).toBeVisible();
  await expect(page.getByText(/at\s|stack|\.tsx:/i).filter({hasText:/\bat\s+\w+\s*\(/})).toHaveCount(0);
  await h.screenshot(page,'route-not-found');

  // F-09: signed out the sign-in destination is offered; signed in it is not.
  await page.goto('/workspace/sign-in');
  const nav=page.getByRole('navigation',{name:'Primary'});
  await expect(nav.getByRole('link',{name:'Staff sign in',exact:true})).toBeVisible();
  await loginUi(page,h,'owner');
  await expect(nav.getByRole('link',{name:'Staff sign in',exact:true})).toHaveCount(0);
  await expect(nav.getByRole('link',{name:'Overview',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();
  await expect(nav.getByRole('link',{name:'Staff sign in',exact:true})).toBeVisible();

  // F-08: prove the audit actually captures an uncaught page error. Without the
  // capture the assertion inside the browserAudit fixture fails this test.
  expectPageError(test.info(),'ORVIA_SYNTHETIC_AUDIT_PROBE');
  await page.evaluate(()=>{globalThis.setTimeout(()=>{throw new Error('ORVIA_SYNTHETIC_AUDIT_PROBE');},0);});
  await expect.poll(async()=>page.url()).toContain('/workspace');
  await page.waitForTimeout(250);
});

test('B06 candidate walkthrough across staff, privacy, enforcement and evidence',async({page,browser,h})=>{
  const scenario=await h.scenario();await loginUi(page,h,'owner');await page.goto('/workspace/configuration');await page.getByLabel('Search purpose versions').fill(scenario.purpose.id);await expect(page.getByRole('heading',{name:scenario.purpose.name,exact:true})).toBeVisible();
  const context=await browser.newContext();const stop=await h.workers();
  try{const privacy=await context.newPage();await loginUi(privacy,h,'alice');const granted=schemas.Receipt.parse(await grantUi(privacy,scenario.purpose));const withdrawn=schemas.Receipt.parse(await withdrawUi(privacy,scenario.purpose));expect(withdrawn.consent_epoch).toBe(granted.consent_epoch+1);
    await page.goto('/workspace/workflows/'+withdrawn.workflow_id);await expect(page.getByText('Independently observed',{exact:true})).toBeVisible({timeout:100000});await page.getByRole('link',{name:'Evidence for this workflow'}).click();await expect(page.getByRole('button',{name:'Download local evidence JSON'})).toBeVisible();
    await page.goto('/workspace/test-lab');await expect(page.getByRole('heading',{name:'Local operator execution'})).toBeVisible();await h.screenshot(page,'candidate-test-lab');
  }finally{await stop();await context.close();}
});

test('B06 real dependency outage, malformed ID, denied scope and responsive navigation',async({page,context,browser,h})=>{
  await loginUi(page,h,'owner');await page.goto('/workspace/workflows/not-a-uuid');await expect(page.getByRole('main').getByRole('alert')).toBeVisible();await expect(page.getByText('Independently observed',{exact:true})).toHaveCount(0);
  const scenario=await h.scenario('LEGACY_MANUAL');await scenario.change('grant');const withdrawal=await scenario.change('withdraw');const foreign=await browser.newContext();
  try{const other=await foreign.newPage();await loginUi(other,h,'birch');await other.goto('/workspace/workflows/'+withdrawal.receipt.workflow_id);await expect(other.getByRole('main').getByRole('alert')).toContainText('NOT_FOUND');}finally{await foreign.close();}
  await page.goto('/workspace');await expect(page.getByRole('heading',{name:'Privacy control status',exact:true})).toBeVisible();await context.setOffline(true);await page.getByRole('button',{name:'Refresh now',exact:true}).first().click();await expect(page.getByRole('main').getByRole('alert').first()).toBeVisible();await context.setOffline(false);await page.getByRole('button',{name:'Retry this read'}).first().click();await expect(page.getByRole('heading',{name:'Privacy control status',exact:true})).toBeVisible();
  await page.setViewportSize({width:390,height:844});await page.goto('/workspace/capabilities');await expect(page.getByRole('heading',{name:'Programme modules'})).toBeVisible();expect(await page.locator('article').filter({has:page.getByRole('heading',{name:/^M\d\d /})}).count()).toBe(33);
  // The register must describe this build, not its inspection-time baseline: a
  // module demonstrated in this very walkthrough may not read as uninspected.
  const register=page.getByRole('main');
  await expect(register.getByText('NOT_INSPECTED')).toHaveCount(0);
  const consent=page.locator('article').filter({has:page.getByRole('heading',{name:/^M11 /})});
  await expect(consent.getByText('Built (synthetic subset)',{exact:true})).toBeVisible();
  await expect(consent.getByText('Covered at candidate',{exact:true})).toBeVisible();
  await expect(consent.locator('code',{hasText:'test:consent'})).toBeVisible();
  // An unbuilt module must still say so plainly and claim no evidence.
  const rights=page.locator('article').filter({has:page.getByRole('heading',{name:/^M14 /})});
  await expect(rights.getByText('Not built',{exact:true})).toBeVisible();
  await expect(rights.getByText('Evidence: none recorded in the programme register.')).toBeVisible();
  await h.screenshot(page,'mobile-capability-register');
});
