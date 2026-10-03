// The EX07 Backups panel and the owner-recovery page in a real browser (synthetic codex-a00 profile).
// Backups: an administrator records a backup treatment through the form and sees it waiting for a second person, with no
// Approve button for their own record; a reviewer approves it with the Approve button; the coverage table shows the system as
// approved; a restore is recorded through the form and reports how many people were marked to be erased again; an
// administrator without sensitive access is told who must be erased again is not visible to them.
// Owner recovery: the sign-in page links to it; mismatched and short passwords are refused in the page without a request; a
// wrong code for a login that is not the owner is refused with the same message as any other refusal (no owner-email probing).
// The owner's own login is never changed here: the successful recovery runs on a scratch database in
// tests/integration/onboarding/owner-recovery.test.ts. No page error and no request leaves the installation's origin.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chromium, type Browser, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const t = operationsSuite('backups-and-recovery-browser');
const { h, check, db } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const errors: string[] = []; const external: string[] = [];

async function page(browser: Browser) {
  const p = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource') && !m.text().includes('403') && !m.text().includes('401')) errors.push(m.text()); });
  p.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });
  return p;
}
async function signIn(p: Page, who: string) {
  const user = h.users[who]!;
  await h.authWindow();
  await p.goto('/workspace/sign-in');
  await p.getByLabel('Email', { exact: true }).fill(user.email); await p.getByLabel('Password', { exact: true }).fill(user.password);
  await p.getByRole('button', { name: 'Sign in', exact: true }).click();
  await p.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
  await p.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await p.waitForURL(u => u.pathname === '/workspace');
}

await t.run(async () => {
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const run = randomUUID().slice(0, 8);
    const system = await t.boundSystem(`Browser backups ${run}`);

    t.setPhase('record a treatment');
    const admin = await page(browser);
    await signIn(admin, 'admin');
    await admin.goto('/workspace/registry-retention');
    const form = admin.getByRole('form', { name: 'Record a backup treatment' });
    await form.waitFor();
    await form.getByLabel('System').selectOption({ label: system.name });
    await form.getByLabel('Technical restriction').fill('Nightly full database images; one record cannot be removed (synthetic).');
    await form.getByLabel('Isolation controls').fill('Encrypted; restore by two named DBAs only (synthetic).');
    await form.getByLabel('Backups kept for (days)').fill('35');
    await form.getByLabel('Restore procedure reference').fill('Runbook DBA-7 (synthetic)');
    await form.getByLabel('Customer-approved legal treatment').fill('Management accepts erased people remaining in backups until they age out (synthetic).');
    const created = admin.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/backup-treatments' && r.request().method() === 'POST');
    await form.getByRole('button', { name: 'Record a backup treatment', exact: true }).click();
    check('the form records the treatment', (await created).status(), 201);
    await form.getByRole('status').filter({ hasText: `recorded for ${system.name}; a second person must approve it` }).waitFor();
    const treatments = admin.getByRole('table', { name: 'Backup treatments' });
    const adminRow = treatments.getByRole('row').filter({ hasText: system.name });
    await adminRow.getByText('awaiting a second person').waitFor();
    check('the recorder is offered no Approve button for their own treatment', await adminRow.getByRole('button', { name: 'Approve' }).count(), 0);
    check('without sensitive access, who must be erased again is not shown', await admin.getByText('Who must be erased again is visible only to people with sensitive registry access.').count(), 1);

    t.setPhase('a second person approves');
    const reviewer = await page(browser);
    await signIn(reviewer, 'reviewer');
    await reviewer.goto('/workspace/registry-retention');
    const reviewerRow = reviewer.getByRole('table', { name: 'Backup treatments' }).getByRole('row').filter({ hasText: system.name });
    const approved = reviewer.waitForResponse(r => /\/api\/v1\/admin\/backup-treatments\/[0-9a-f-]+\/approval$/.test(new URL(r.url()).pathname));
    await reviewerRow.getByRole('button', { name: 'Approve' }).click();
    const approval = await approved;
    check('the Approve button sends a POST and it succeeds', [approval.request().method(), approval.status()], ['POST', 200]);
    await reviewerRow.getByText('current', { exact: true }).waitFor();
    const coverageRow = reviewer.getByRole('table', { name: 'Backup coverage by system' }).getByRole('row').filter({ hasText: system.name });
    await coverageRow.getByText('approved', { exact: true }).waitFor();
    const stored = (await db.query('SELECT status, recorded_by, approved_by FROM app.backup_treatments WHERE system_id=$1', [system.id])).rows;
    check('the stored treatment is current and approved by someone other than the recorder', [stored.length, stored[0]?.status, stored[0]?.approved_by !== null && stored[0]?.approved_by !== stored[0]?.recorded_by], [1, 'CURRENT', true]);

    t.setPhase('record a restore');
    const restore = reviewer.getByRole('form', { name: 'Record a system restore' });
    await restore.getByLabel('System').selectOption({ label: system.name });
    const local = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await restore.getByLabel('The restored backup was taken at').fill(local(new Date(Date.now() - 2 * 86_400_000)));
    await restore.getByLabel('Restored at').fill(local(new Date()));
    await restore.getByLabel('Evidence').fill(`Change CHG-${run} (synthetic)`);
    const restored = reviewer.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/system-restores' && r.request().method() === 'POST');
    await restore.getByRole('button', { name: 'Record a system restore', exact: true }).click();
    check('the form records the restore', (await restored).status(), 201);
    await restore.getByRole('status').filter({ hasText: 'person(s) marked to be erased again' }).waitFor();

    t.setPhase('owner recovery page');
    const visitor = await page(browser);
    await visitor.goto('/workspace/sign-in');
    await visitor.getByRole('link', { name: 'Recover the owner login' }).click();
    await visitor.getByRole('heading', { name: 'Recover the owner login' }).waitFor();
    check('the sign-in page links to the recovery page', new URL(visitor.url()).pathname, '/workspace/recover');
    let requests = 0;
    visitor.on('request', r => { if (new URL(r.url()).pathname === '/api/v1/setup/owner-recovery') requests += 1; });
    const recovery = visitor.getByRole('form', { name: 'Owner recovery' });
    await recovery.getByLabel('Owner email').fill(h.users.admin!.email);
    await recovery.getByLabel('Recovery code').fill('000000-000000');
    await recovery.getByLabel('New password', { exact: true }).fill('short');
    await recovery.getByLabel('Confirm new password').fill('short');
    await recovery.getByRole('button', { name: 'Recover owner login' }).click();
    await recovery.getByText('The new password must be at least 16 characters.').waitFor();
    await recovery.getByLabel('New password', { exact: true }).fill('a-long-synthetic-password-1');
    await recovery.getByLabel('Confirm new password').fill('a-long-synthetic-password-2');
    await recovery.getByRole('button', { name: 'Recover owner login' }).click();
    await recovery.getByText('The passwords do not match.').waitFor();
    check('short and mismatched passwords are refused in the page without a request', requests, 0);
    await recovery.getByLabel('Confirm new password').fill('a-long-synthetic-password-1');
    const refused = visitor.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/setup/owner-recovery');
    await recovery.getByRole('button', { name: 'Recover owner login' }).click();
    check('a wrong code for a login that is not the owner is refused', (await refused).status(), 403);
    await recovery.getByText('Those details were not accepted.', { exact: false }).waitFor();
    check('the refusal does not say whether the email belongs to the owner', await recovery.getByText(/not the owner|no such|unknown email/i).count(), 0);

    t.setPhase('page hygiene');
    check('no page errors on these screens', errors, []);
    check('no request left the installation origin', external, []);
  } finally { await browser.close(); }
});
