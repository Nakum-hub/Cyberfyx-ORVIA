// Organisation member logins, driven through the real workspace in a real
// browser on the synthetic codex-a00 profile: an administrator adds a member
// on screen and hands over the one-time password; the member signs in, is made
// to replace it, sets up an authenticator and reaches the workspace; the screen
// then shows the seats full and offers no further additions. The test signs the
// licence as the vendor; the application never holds the vendor key.
import { randomUUID, sign, createPrivateKey } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chromium, type Browser, type Locator } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../shared/contracts/src/crypto.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite, key } from '../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';
import { vendorSigningKey } from '../../scripts/credentials.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const t = operationsSuite('team-browser');
const { h, check, ok, db } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const errors: string[] = []; const external: string[] = [];
const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const field = (f: Locator, label: string) => f.getByLabel(new RegExp(`^${escape(label)}( \\*)?$`));

async function page(browser: Browser) {
  const p = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource') && !m.text().includes('403')) errors.push(m.text()); });
  p.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });
  return p;
}

await t.run(async () => {
  const owner = await h.login('owner'); const api = await h.login('admin');
  const created: string[] = [];
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    t.setPhase('licence with one free member seat');
    const used = (await ok(api.call('/api/v1/admin/staff-members'), S.schemas.StaffTeam)).seats.used;
    const vendor = vendorSigningKey('licence');
    const installation = (await db.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0].installation_id as string;
    const claims = { licence_id: randomUUID(), edition: 'CONTROL', entitlements: ['PRIVACY_GRAPH'], installation_id: installation, audience: 'ORVIA_CUSTOMER_INSTALLATION',
      valid_from: new Date(Date.now() - 86_400_000).toISOString(), valid_to: new Date(Date.now() + 365 * 86_400_000).toISOString(), licensed_limits: { environments: 3, staff_members: 25, member_seats: used + 1 } };
    const signature = sign(null, Buffer.from(canonicalJson(claims)), createPrivateKey({ key: Buffer.from(vendor.private, 'base64'), format: 'der', type: 'pkcs8' })).toString('base64url');
    await ok(owner.call('/api/v1/admin/licences', { licence: { algorithm: 'Ed25519', claims, signing_key_id: vendor.key_id, signature } }, key()), S.schemas.LicenceState, [200, 201]);

    t.setPhase('administrator adds a member on screen');
    const admin = await page(browser); const user = h.users.admin!;
    await h.authWindow();
    await admin.goto('/workspace/sign-in');
    await admin.getByLabel('Staff email').fill(user.email); await admin.getByLabel('Password', { exact: true }).fill(user.password);
    await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
    await admin.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
    await admin.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
    await admin.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await admin.goto('/workspace/team');
    await admin.getByText(`${used} of ${used + 1}`).waitFor();
    check('the screen shows one free seat', await admin.getByText('1 available').count() > 0, true);
    const email = `browser.member.${randomUUID().slice(0, 8)}@aster.example`;
    const f = admin.getByRole('form', { name: 'Add member' });
    await field(f, 'Name').fill('Browser member'); await field(f, 'Work email').fill(email);
    await field(f, 'Role').selectOption('MEMBER');
    const saved = admin.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/staff-members' && r.request().method() === 'POST');
    await f.getByRole('button', { name: 'Add member', exact: true }).click();
    const result = S.schemas.StaffMemberCreated.parse(await (await saved).json()); created.push(result.member.id);
    const shown = await admin.getByLabel('One-time password').textContent();
    check('the one-time password is shown once on screen and matches what was issued', shown, result.one_time_password);
    await admin.getByText('All member seats are in use').waitFor();
    check('with the seats full the add form is gone', await admin.getByRole('form', { name: 'Add member' }).count(), 0);
    check('the new login waits for first sign-in', await admin.getByRole('table', { name: 'Organisation logins' }).getByRole('row').filter({ hasText: email }).getByText('waiting for first sign-in').count(), 1);

    t.setPhase('the member signs in, replaces the password and sets up the authenticator');
    const newcomer = await page(browser);
    await h.authWindow();
    await newcomer.goto('/workspace/sign-in');
    await newcomer.getByLabel('Staff email').fill(email); await newcomer.getByLabel('Password', { exact: true }).fill(shown!);
    await newcomer.getByRole('button', { name: 'Sign in', exact: true }).click();
    await newcomer.getByRole('heading', { name: 'Choose your own password' }).waitFor();
    const chosen = `Browser-${randomUUID()}`;
    await newcomer.getByLabel('Confirm new password').fill('does-not-match-at-all');
    await newcomer.getByLabel('New password', { exact: true }).fill(chosen);
    await newcomer.getByRole('button', { name: 'Save new password' }).click();
    await newcomer.getByRole('alert').getByText('The two passwords do not match.').waitFor();
    await newcomer.getByLabel('Confirm new password').fill(chosen);
    await newcomer.getByRole('button', { name: 'Save new password' }).click();
    await newcomer.getByRole('heading', { name: 'Set up privileged MFA' }).waitFor();
    await newcomer.getByLabel('Current password for enrollment').fill(chosen);
    await newcomer.getByRole('button', { name: 'Set up authenticator' }).click();
    await newcomer.getByText('Show my authenticator enrollment and recovery codes').click();
    const uri = (await newcomer.locator('code').first().textContent())!;
    await newcomer.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(uri));
    await newcomer.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
    await newcomer.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    const session = await newcomer.evaluate(() => fetch('/api/v1/session', { credentials: 'same-origin' }).then(r => r.json()));
    check('the member has a workspace session with the member role', [(session as { role?: string }).role, (session as { mfa_verified?: boolean }).mfa_verified], ['MEMBER', true]);
    await admin.reload();
    const row = admin.getByRole('table', { name: 'Organisation logins' }).getByRole('row').filter({ hasText: email });
    await row.waitFor();
    check('the administrator now sees the member as active with an authenticator', await row.getByText('active', { exact: true }).count(), 1);

    check('no request left the local origin', external, []);
    check('no page or console error occurred', errors, []);
  } finally {
    await browser.close();
    for (const id of created) await api.call(`/api/v1/admin/staff-members/${id}/deactivate`, {}, key()).catch(() => {});
  }
});
