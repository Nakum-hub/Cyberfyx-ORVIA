import { test, expect, loginUi } from './fixture.ts';
import { schemas } from '../../shared/contracts/src/index.ts';

// Owner decision 2026-10-03: ORVIA is used by the organisation's staff only. Data Principals (the organisation's own users)
// never sign in to ORVIA; their consent decisions arrive from the organisation's platforms. Receipt immutability, replay
// safety and stale-decision refusal are covered by the consent integration suites against the same API.
test('B02 consent arrives from the organisation and staff maintain it in the Privacy Centre module',async({page,h})=>{
  const scenario=await h.scenario();
  const grant=schemas.Receipt.parse((await scenario.change('grant')).receipt);
  const withdrawal=schemas.Receipt.parse((await scenario.change('withdraw')).receipt);
  expect(withdrawal.consent_epoch).toBe(grant.consent_epoch+1);expect(withdrawal.consent_status).toBe('WITHDRAWN');
  await loginUi(page,h,'owner');
  await page.goto('/workspace/privacy-centre');
  await expect(page.getByRole('heading',{name:'Privacy Centre',exact:true})).toBeVisible();
  await expect(page.getByRole('heading',{name:'Your Data Principals do not sign in to ORVIA'})).toBeVisible();
  for(const [tab,heading] of [['Consents','Consent records'],['Data Principals','Data Principals'],['Requests','Privacy requests'],['Sources','Website & app intake']] as const){
    await page.getByRole('tab',{name:tab,exact:true}).click();
    await expect(page.getByRole('tab',{name:tab,exact:true})).toHaveAttribute('aria-selected','true');
    await expect(page.getByRole('tabpanel').getByRole('heading',{name:heading}).first()).toBeVisible();
    await expect(page.getByText('Not permitted for this session')).toHaveCount(0);
  }
  await h.screenshot(page,'privacy-centre-module');
  expect((await page.goto('/privacy'))?.status()).toBe(404);
});
