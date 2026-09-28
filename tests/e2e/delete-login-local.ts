// Deleting logins through the real workspace in a real browser (synthetic
// codex-a00 profile). The pop-up's Delete button stays disabled until DELETE is
// typed exactly; an administrator deletes a member from the Team screen; an
// auditor deletes their own login from My login and is signed out; the owner is
// offered no deletion of their own login. Plays the vendor to sign a licence.
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../shared/contracts/src/crypto.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite, key } from '../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { vendorSigningKey } from '../../scripts/credentials.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const t = operationsSuite('delete-login-browser');
const { h, check, ok, db } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const errors: string[] = []; const external: string[] = [];

async function page(browser: Browser) {
  const p = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource') && !m.text().includes('403') && !m.text().includes('401')) errors.push(m.text()); });
  p.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });
  return p;
}

await t.run(async () => {
  const owner = await h.login('owner'); const api = await h.login('admin');
  const created: string[] = [];
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    t.setPhase('setup');
    const used = (await ok(api.call('/api/v1/admin/staff-members'), S.schemas.StaffTeam)).seats.used;
    const vendor = vendorSigningKey('licence');
    const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id as string;
    const claims = { licence_id: randomUUID(), edition: 'CONTROL', entitlements: ['PRIVACY_GRAPH'], installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION',
      valid_from: new Date(Date.now() - 86_400_000).toISOString(), valid_to: new Date(Date.now() + 365 * 86_400_000).toISOString(), licensed_limits: { environments: 3, staff_members: 25, member_seats: used + 2 } };
    const signature = sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(vendor.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
    await ok(owner.call('/api/v1/admin/licences', { licence: { algorithm: 'Ed25519', claims, signing_key_id: vendor.key_id, signature } }, key()), S.schemas.LicenceState, [200, 201]);
    const target = await ok(api.call('/api/v1/admin/staff-members', { display_name: `Browser delete ${randomUUID().slice(0, 6)}`, email: `browser.delete.${randomUUID().slice(0, 8)}@aster.example`, role: 'MEMBER' }, key()), S.schemas.StaffMemberCreated, [201]);
    created.push(target.member.id);
    const auditorMade = await ok(api.call('/api/v1/admin/staff-members', { display_name: `Browser auditor ${randomUUID().slice(0, 6)}`, email: `browser.auditor.${randomUUID().slice(0, 8)}@aster.example`, role: 'AUDITOR' }, key()), S.schemas.StaffMemberCreated, [201]);
    created.push(auditorMade.member.id);

    t.setPhase('the pop-up needs DELETE exactly');
    const admin = await page(browser); const user = h.users.admin!;
    await h.authWindow();
    await admin.goto('/workspace/sign-in');
    await admin.getByLabel('Staff email').fill(user.email); await admin.getByLabel('Password', { exact: true }).fill(user.password);
    await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
    await admin.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
    await admin.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
    await admin.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await admin.goto('/workspace/team');
    await admin.getByRole('button', { name: `Delete ${target.member.display_name}` }).click();
    const dialog = admin.getByRole('dialog', { name: `Delete ${target.member.display_name}'s login?` });
    await dialog.waitFor();
    const confirm = dialog.getByRole('button', { name: 'Delete', exact: true });
    const box = dialog.getByLabel('Type DELETE to confirm');
    check('Delete is disabled before anything is typed', await confirm.isDisabled(), true);
    for (const wrong of ['delete', 'Delete', 'DELETE ', 'DELET']) { await box.fill(wrong); check(`Delete stays disabled for "${wrong}"`, await confirm.isDisabled(), true); }
    await dialog.getByRole('button', { name: 'Cancel' }).click();
    check('Cancel closes the pop-up and deletes nothing', [await dialog.count(), (await ok(api.call('/api/v1/admin/staff-members'), S.schemas.StaffTeam)).members.find(m => m.id === target.member.id)?.deleted_at], [0, null]);
    await admin.getByRole('button', { name: `Delete ${target.member.display_name}` }).click();
    await box.fill('DELETE');
    check('Delete is enabled only for DELETE', await confirm.isEnabled(), true);
    const done = admin.waitForResponse(r => new URL(r.url()).pathname === `/api/v1/admin/staff-members/${target.member.id}/delete`);
    await confirm.click();
    const response = await done;
    check('the request carried the confirmation and succeeded', [response.status(), JSON.parse(response.request().postData() ?? '{}').confirmation], [200, 'DELETE']);
    await admin.getByRole('table', { name: 'Organisation logins' }).getByRole('row').filter({ hasText: target.member.email }).getByText('deleted', { exact: true }).waitFor();
    check('the deleted login has no Delete or Reactivate button', await admin.getByRole('button', { name: `Delete ${target.member.display_name}` }).count(), 0);

    t.setPhase('an auditor deletes their own login');
    const auditor = await page(browser);
    await h.authWindow();
    await auditor.goto('/workspace/sign-in');
    await auditor.getByLabel('Staff email').fill(auditorMade.member.email); await auditor.getByLabel('Password', { exact: true }).fill(auditorMade.one_time_password);
    await auditor.getByRole('button', { name: 'Sign in', exact: true }).click();
    await auditor.getByRole('heading', { name: 'Choose your own password' }).waitFor();
    const chosen = `Browser-${randomUUID()}`;
    await auditor.getByLabel('New password', { exact: true }).fill(chosen); await auditor.getByLabel('Confirm new password').fill(chosen);
    await auditor.getByRole('button', { name: 'Save new password' }).click();
    await auditor.getByRole('button', { name: 'Check my session' }).click();
    await auditor.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await auditor.goto('/workspace/my-login');
    await auditor.getByRole('button', { name: 'Delete my login' }).click();
    const own = auditor.getByRole('dialog', { name: 'Delete your login?' });
    await own.getByLabel('Type DELETE to confirm').fill('delete');
    check('self-deletion also stays disabled for lower case', await own.getByRole('button', { name: 'Delete', exact: true }).isDisabled(), true);
    await own.getByLabel('Type DELETE to confirm').fill('DELETE');
    await own.getByRole('button', { name: 'Delete', exact: true }).click();
    await auditor.getByRole('heading', { name: 'Your login has been deleted' }).waitFor();
    check('after self-deletion the session is gone', await auditor.evaluate(() => fetch('/api/v1/session', { credentials: 'same-origin' }).then(r => r.status)), 401);

    t.setPhase('the owner is not offered self-deletion');
    const ownerPage = await page(browser); const ownerUser = h.users.owner!;
    await h.authWindow();
    await ownerPage.goto('/workspace/sign-in');
    await ownerPage.getByLabel('Staff email').fill(ownerUser.email); await ownerPage.getByLabel('Password', { exact: true }).fill(ownerUser.password);
    await ownerPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await ownerPage.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(ownerUser.totp_uri!));
    await ownerPage.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
    await ownerPage.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await ownerPage.goto('/workspace/my-login');
    await ownerPage.getByText('The owner login cannot be deleted here').waitFor();
    check('the owner sees no Delete my login button', await ownerPage.getByRole('button', { name: 'Delete my login' }).count(), 0);

    check('no request left the local origin', external, []);
    check('no page or console error occurred', errors, []);
  } finally {
    await browser.close();
    for (const id of created) await api.call(`/api/v1/admin/staff-members/${id}/deactivate`, {}, key()).catch(() => {});
  }
});
