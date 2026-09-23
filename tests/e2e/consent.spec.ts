import { test, expect, loginUi, grantUi, withdrawUi, choicePanel } from './fixture.ts';
import { schemas } from '../../shared/contracts/src/index.ts';

test('B02 principal consent, immutable receipt, withdrawal, history and refresh',async({page,h})=>{
  const scenario=await h.scenario();await loginUi(page,h,'alice');const grant=schemas.Receipt.parse(await grantUi(page,scenario.purpose));
  await page.goto('/privacy/receipt/'+grant.receipt_id);await expect(page.getByRole('heading',{name:'Receipt facts (immutable)'})).toBeVisible();await h.screenshot(page,'consent-receipt');
  const card=await choicePanel(page,scenario.purpose);await expect(card.getByRole('button',{name:'Withdraw consent',exact:true})).toBeEnabled();await h.screenshot(page,'privacy-centre');
  const withdrawal=schemas.Receipt.parse(await withdrawUi(page,scenario.purpose));expect(withdrawal.consent_epoch).toBe(grant.consent_epoch+1);expect(withdrawal.consent_status).toBe('WITHDRAWN');
  await page.goto('/privacy/receipt/'+grant.receipt_id);await expect(page.getByRole('heading',{name:'This receipt has been superseded'})).toBeVisible();const immutable=page.locator('section').filter({has:page.getByRole('heading',{name:'Receipt facts (immutable)'})});await expect(immutable.getByText('Granted',{exact:true})).toBeVisible();
  const current=page.locator('section').filter({has:page.getByRole('heading',{name:'Current state (read separately just now)'})});await expect(current.getByText('Withdrawn',{exact:true})).toBeVisible();
  await page.goto('/privacy/receipts');await page.getByLabel('Purpose',{exact:true}).selectOption(scenario.purpose.id);await expect(page.getByRole('link',{name:grant.receipt_id,exact:true})).toBeVisible();await expect(page.getByRole('link',{name:withdrawal.receipt_id,exact:true})).toBeVisible();await page.reload();
  await page.goto('/workspace');await expect(page.getByRole('heading',{name:'Wrong actor domain for this area'})).toBeVisible();
});

test('B02 lost committed response retains exact request across read and replays one event',async({page,h})=>{
  const scenario=await h.scenario();await loginUi(page,h,'alice');const card=await choicePanel(page,scenario.purpose);const path=`/api/v1/portal/me/consents/${scenario.purpose.id}/grant`;
  const requests:{key:string|undefined;body:string|null}[]=[];let committed:ReturnType<typeof schemas.Receipt.parse>|undefined;
  await page.route('**'+path,async route=>{
    requests.push({key:route.request().headers()['idempotency-key'],body:route.request().postData()});
    if(requests.length===1){const real=await route.fetch();expect(real.status()).toBe(202);committed=schemas.Receipt.parse(await real.json());await route.abort('failed');}else await route.continue();
  });
  await card.getByRole('checkbox').check();await card.getByRole('button',{name:'Give consent',exact:true}).click();await expect(card.getByRole('heading',{name:'Original request preserved'})).toBeVisible();
  await card.getByRole('button',{name:'Read my authoritative current state'}).click();await expect(card.getByRole('button',{name:'Withdraw consent',exact:true})).toBeDisabled();
  await card.getByRole('button',{name:'Replay original request'}).click();await expect(card.getByRole('link',{name:'Open this receipt'})).toBeVisible();expect(requests).toHaveLength(2);expect(requests[1]).toEqual(requests[0]);
  expect((await h.db.query('SELECT count(*)::int n FROM app.consent_events WHERE purpose_id=$1',[scenario.purpose.id])).rows[0].n).toBe(1);
  await expect(card.getByRole('heading',{name:'Decision recorded — receipt '+committed!.receipt_id})).toBeVisible();
});

test('B02 stale interaction denial has no extra event and withdrawal modal supports Escape',async({page,h})=>{
  const scenario=await h.scenario();await loginUi(page,h,'alice');const card=await choicePanel(page,scenario.purpose);
  await scenario.change('grant');await card.getByRole('checkbox').check();await card.getByRole('button',{name:'Give consent',exact:true}).click();await expect(card.getByRole('alert')).toContainText('EPOCH_CONFLICT');
  expect((await h.db.query('SELECT count(*)::int n FROM app.consent_events WHERE purpose_id=$1',[scenario.purpose.id])).rows[0].n).toBe(1);
  await card.getByRole('button',{name:'Read my current decision again'}).click();const withdraw=card.getByRole('button',{name:'Withdraw consent',exact:true});await withdraw.click();await expect(page.getByRole('dialog')).toBeVisible();await expect(page.getByRole('button',{name:'Cancel',exact:true})).toBeFocused();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);await expect(withdraw).toBeFocused();
});
