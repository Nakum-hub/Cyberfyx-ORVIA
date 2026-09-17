import { test, expect } from './fixture.ts';

test('B06 real browser validates rehearsal HTTPS without certificate bypass',async({page,h,browser})=>{
  const response=await page.goto('/');expect(response?.status()).toBe(200);
  await expect(page.getByRole('link',{name:/Staff Workspace/i})).toBeVisible();
  await expect(page.getByRole('link',{name:/Privacy Centre/i})).toBeVisible();
  expect(new URL(page.url()).origin).toBe(h.config.origin);
  console.log('Browser runtime '+browser.version());
});
