import { test, expect, loginUi } from './fixture.ts';

test('B01 real staff MFA, refresh, actor separation and logout',async({page,h})=>{
  await loginUi(page,h,'owner');await page.getByRole('link',{name:'Go to workspace',exact:true}).click();
  await expect(page.getByRole('heading',{name:'Workspace overview',exact:true})).toBeVisible();
  await expect(page.getByText('MFA verified',{exact:false})).toBeVisible();await page.reload();
  await expect(page.getByRole('heading',{name:'Workflow counts',exact:true})).toBeVisible();await h.screenshot(page,'staff-workspace');
  await page.goto('/privacy');await expect(page.getByRole('heading',{name:'Wrong actor domain for this area'})).toBeVisible();
  await page.getByRole('button',{name:'Sign out',exact:true}).click();await expect(page.getByRole('heading',{name:'Sign in required'})).toBeVisible();
});

test('B01 rejected login and read-only authority',async({page,h})=>{
  await page.goto('/workspace/sign-in');await page.getByLabel('Staff email').fill('no-such-ui-user@aster.example');await page.getByLabel('Password',{exact:true}).fill('non-credential-invalid-input');await page.getByRole('button',{name:'Sign in',exact:true}).click();await expect(page.getByRole('alert')).toContainText('not accepted');
  await loginUi(page,h,'auditor');await page.goto('/workspace/configuration');await expect(page.getByRole('heading',{name:'Read-only for this session'})).toBeVisible();await expect(page.getByRole('button',{name:'Create purpose',exact:true})).toHaveCount(0);
  const denied=await page.request.post('/api/v1/admin/purposes',{data:{},headers:{origin:h.config.origin,'idempotency-key':crypto.randomUUID()}});expect(denied.status()).toBe(403);
  await page.goto('/workspace/policy-preview');await expect(page.getByRole('heading',{name:'Not permitted for this session'})).toBeVisible();
});

test('B01 expired browser session is rechecked and protected content disappears',async({page,h})=>{
  await loginUi(page,h,'auditor');await page.goto('/workspace');await expect(page.getByRole('heading',{name:'Workflow counts'})).toBeVisible();
  // Expire only the actual server session created by this browser login.
  const response=await page.request.get('/api/auth/staff/get-session');expect(response.status()).toBe(200);
  const actual=await response.json();expect(actual.session.id).toBeTruthy();
  const changed=await h.db.query('UPDATE staff_auth.session SET "expiresAt"=clock_timestamp()-interval \'1 second\' WHERE id=$1 AND "userId"=$2',[actual.session.id,h.users.auditor!.id]);expect(changed.rowCount).toBe(1);
  await page.evaluate(()=>globalThis.dispatchEvent(new Event('focus')));
  await expect(page.getByRole('heading',{name:'Sign in required'})).toBeVisible();await expect(page.getByRole('heading',{name:'Workflow counts'})).toHaveCount(0);
});
