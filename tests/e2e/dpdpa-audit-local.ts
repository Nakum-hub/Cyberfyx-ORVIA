// DPDPA external audit exchange, end to end in a real browser (Chromium), across
// two installations started from the same build:
//   codex-a00  CUSTOMER_INSTALLATION  http://127.0.0.1:4310
//   vendor-a00 VENDOR_SERVICE         http://127.0.0.1:4340
// Client: gap register → attach evidence → confirm personal data (second person)
// → record engagement → prepare, approve (different person) and download the
// package file. Vendor: first-run setup (once), sign-in through the website link
// and through the in-app link (same session), organisation, accounts, team,
// engagement; the client account uploads the file; the lead reviews, records a
// result, raises a finding, exports signed findings and drafts the report; the
// reviewer approves; the lead signs and downloads the PDF. Client: imports the
// signed findings and report and tracks remediation. Synthetic data only.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type Page, type Download } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite, key, unique } from '../../shared/testing/src/operations-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';
import { issueVendorSetupCode } from '../../scripts/vendor-setup-code.ts';

const t = operationsSuite('dpdpa-audit-browser');
const { h, check, ok } = t;
const VENDOR = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const shots = resolve('output/playwright'); mkdirSync(shots, { recursive: true });
const downloads = resolve('output/playwright/downloads'); mkdirSync(downloads, { recursive: true });
const journalPath = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
type User = { email: string; password: string; totp?: string };
type Journal = { owner?: User; admin?: User; lead?: User & { id?: string }; reviewer?: User & { id?: string }; uploader?: User; organisation_id?: string };
const journal: Journal = existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8')) : {};
const persist = () => writePrivateJson(journalPath, journal);
const errors: string[] = []; const external: string[] = [];
const label = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\*)?$`);

async function context(browser: Browser, base: string) {
  const page = await (await browser.newContext({ baseURL: base, viewport: { width: 1440, height: 1000 }, acceptDownloads: true })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  page.on('request', r => { const o = new URL(r.url()).origin; if (o !== base) external.push(r.url()); });
  return page;
}
async function staffSignIn(browser: Browser, name: 'owner' | 'reviewer' | 'admin') {
  const page = await context(browser, h.config.origin); const user = h.users[name]!;
  await h.authWindow(); await page.goto('/workspace/sign-in');
  await page.getByLabel('Staff email').fill(user.email); await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  return page;
}
/** Vendor-side sign-in through the UI; first sign-in replaces the one-time password and enrols an authenticator. */
async function vendorSignIn(page: Page, user: User, path = '/vendor/sign-in') {
  await page.goto(path);
  await page.getByLabel(label('Email')).fill(user.email); await page.getByLabel(label('Password')).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const outcome = await Promise.race([page.getByLabel(label('Authenticator code')).waitFor().then(() => 'challenge'), page.getByLabel(label('New password')).waitFor().then(() => 'replace'),
    page.getByLabel(label('Current password for authenticator set-up')).waitFor().then(() => 'enroll')]);
  if (outcome === 'replace') {
    const replacement = `Browser-${randomUUID()}`;
    await page.getByLabel(label('New password')).fill(replacement); await page.getByLabel(label('Confirm new password')).fill(replacement);
    await page.getByRole('button', { name: 'Save new password', exact: true }).click(); user.password = replacement; persist();
  }
  if (outcome !== 'challenge') {
    await page.getByRole('button', { name: 'Set up authenticator', exact: true }).click();
    await page.getByText('Show authenticator set-up and recovery codes').click();
    user.totp = (await page.locator('details code').first().textContent())!; persist();
  }
  await page.getByLabel(label('Authenticator code')).fill(authenticatorCode(user.totp!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(/\/vendor\/(engagements|upload)/);
}
async function save(download: Download, name: string) { const path = resolve(downloads, name); await download.saveAs(path); return path; }
async function startVendor() {
  const command = webProcess({ profile: 'vendor-a00', app_port: PROFILES['vendor-a00'].app_port });
  const child: ChildProcess = spawn(process.execPath, command.args, { cwd: command.cwd, stdio: ['ignore', 'ignore', 'pipe'], env: { ...command.env, ORVIA_PROFILE: 'vendor-a00', NEXT_TELEMETRY_DISABLED: '1' } });
  let diagnostics = ''; child.stderr?.on('data', c => { diagnostics += c.toString(); });
  for (let i = 0; i < 120; i++) { if (child.exitCode !== null) throw new Error(`Vendor web process exited: ${diagnostics.slice(-500)}`); try { if ((await fetch(`${VENDOR}/readyz`, { signal: AbortSignal.timeout(2000) })).ok) return child; } catch { /* starting */ } await new Promise(r => setTimeout(r, 500)); }
  throw new Error('Vendor installation readiness timeout');
}

await t.run(async () => {
  const suffix = randomUUID().slice(0, 8);
  const vendorProcess = await startVendor();
  const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
  try {
    t.setPhase('installation kinds');
    check('the vendor installation reports VENDOR_SERVICE and a verified kind', await fetch(`${VENDOR}/readyz`).then(r => r.json()).then(r => [r.installation_kind, r.kind_verified]), ['VENDOR_SERVICE', true]);
    check('client workspace and staff sign-in are 404 on the vendor installation', [(await fetch(`${VENDOR}/workspace`)).status, (await fetch(`${VENDOR}/api/auth/staff/get-session`)).status, (await fetch(`${VENDOR}/privacy`)).status], [404, 404, 404]);
    check('the vendor area and vendor sign-in are 404 on a customer installation', [(await fetch(`${h.config.origin}/vendor/sign-in`)).status, (await fetch(`${h.config.origin}/api/v1/vendor/session`)).status], [404, 404]);

    t.setPhase('vendor first-run setup');
    const vendorAdmin = await context(browser, VENDOR);
    const state = await fetch(`${VENDOR}/api/v1/vendor/setup`).then(r => r.json()) as { state: string };
    if (state.state !== 'COMPLETED') {
      const code = await issueVendorSetupCode(undefined, false);
      journal.owner = { email: 'owner@vendor.example', password: `Owner-${randomUUID()}` }; journal.admin = { email: 'admin@vendor.example', password: `Admin-${randomUUID()}` }; persist();
      await vendorAdmin.goto('/vendor/setup');
      const f = vendorAdmin.getByRole('form', { name: 'Vendor first-run setup' });
      await f.getByLabel(label('Setup code')).fill(code);
      await f.getByLabel(label('Super administrator name')).fill('Vendor Owner'); await f.getByLabel(label('Super administrator email')).fill(journal.owner.email); await f.getByLabel(label('Super administrator password')).fill(journal.owner.password);
      await f.getByLabel(label('Administrator name')).fill('Vendor Admin'); await f.getByLabel(label('Administrator email')).fill(journal.admin.email); await f.getByLabel(label('Administrator password')).fill(journal.admin.password);
      await f.getByRole('button', { name: 'Create vendor logins' }).click();
      await vendorAdmin.getByRole('heading', { name: 'Vendor installation set up' }).waitFor();
      check('vendor first-run setup completes in the browser', true, true);
    }

    t.setPhase('vendor sign-in, two entry points');
    // The public website's "Vendor / Auditor login" link is this exact URL on the vendor installation.
    await vendorSignIn(vendorAdmin, journal.admin!, `${VENDOR}/vendor/sign-in`);
    await vendorAdmin.goto('/vendor'); await vendorAdmin.getByRole('link', { name: 'Open engagements' }).click();
    await vendorAdmin.getByRole('heading', { name: 'DPDPA audit engagements' }).waitFor();
    await vendorAdmin.goto('/vendor/sign-in');
    check('the website link and the in-app sign-in share one session', await vendorAdmin.getByRole('heading', { name: 'Signed in' }).waitFor({ timeout: 15000 }).then(() => true, () => false), true);

    t.setPhase('vendor organisation, accounts, team');
    if (!journal.organisation_id) {
      await vendorAdmin.goto('/vendor/organisations');
      const f = vendorAdmin.getByRole('form', { name: 'Add organisation' });
      await f.getByLabel(label('Organisation name')).fill(`Aster Synthetic ${suffix}`); await f.getByRole('button', { name: 'Add organisation' }).click();
      await vendorAdmin.waitForURL(/\/vendor\/organisations\/[0-9a-f-]{36}$/); journal.organisation_id = vendorAdmin.url().split('/').pop()!;
      const a = vendorAdmin.getByRole('form', { name: 'Create vendor account' });
      await a.getByLabel(label('Account holder name')).fill('Aster Uploader'); await a.getByLabel(label('Account email')).fill(`uploader-${suffix}@aster.example`); await a.getByRole('button', { name: 'Create vendor account' }).click();
      const otp = (await vendorAdmin.locator('.notice-warn code').first().textContent())!;
      journal.uploader = { email: `uploader-${suffix}@aster.example`, password: otp }; persist();
      await vendorAdmin.goto('/vendor/team');
      for (const [role, name] of [['LEAD_AUDITOR', 'Lead Auditor'], ['AUDIT_REVIEWER', 'Audit Reviewer']] as const) {
        const f2 = vendorAdmin.getByRole('form', { name: 'Add vendor member' });
        await f2.getByLabel(label('Name')).fill(name); await f2.getByLabel(label('Email')).fill(`${role.toLowerCase()}-${suffix}@vendor.example`); await f2.getByLabel(label('Role')).selectOption(role);
        await f2.getByRole('button', { name: 'Create login' }).click();
        const pw = (await vendorAdmin.locator('.notice-warn code').first().textContent())!;
        const u = { email: `${role.toLowerCase()}-${suffix}@vendor.example`, password: pw };
        if (role === 'LEAD_AUDITOR') journal.lead = u; else journal.reviewer = u; persist();
        await vendorAdmin.getByRole('button', { name: 'I have handed it over' }).click();
      }
      check('vendor organisation, client account and audit team created in the browser', [!!journal.uploader, !!journal.lead, !!journal.reviewer], [true, true, true]);
    }

    t.setPhase('vendor engagement');
    await vendorAdmin.goto('/vendor/engagements');
    const ef = vendorAdmin.getByRole('form', { name: 'Create engagement' });
    await ef.getByLabel(label('Client organisation')).selectOption(journal.organisation_id!);
    await ef.getByLabel(label('Engagement reference')).fill(`ENG-${suffix}`); await ef.getByLabel(label('Requirements in scope')).fill('DPDP-NOTICE-CONSENT-REQUEST');
    await ef.getByLabel(label('Audit period from (YYYY-MM-DD)')).fill('2026-01-01'); await ef.getByLabel(label('Audit period to (YYYY-MM-DD)')).fill('2026-06-30');
    await ef.getByRole('button', { name: 'Create engagement' }).click();
    const engagementCode = (await vendorAdmin.locator('.notice-warn code').first().textContent())!.trim();
    check('the engagement code is shown once in the browser', /^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/.test(engagementCode), true);
    await vendorAdmin.getByRole('link', { name: 'Open the engagement' }).click(); await vendorAdmin.waitForURL(/\/vendor\/engagements\/[0-9a-f-]{36}$/);
    const engagementUrl = vendorAdmin.url();
    const members = await fetch(`${VENDOR}/api/v1/vendor/team`, { headers: { cookie: (await vendorAdmin.context().cookies()).map(c => `${c.name}=${c.value}`).join('; ') } }).then(r => r.json()) as { members: { user_id: string; email: string }[] };
    for (const [u, role] of [[journal.lead!, 'LEAD'], [journal.reviewer!, 'REVIEWER']] as const) {
      const tf = vendorAdmin.getByRole('form', { name: 'Add team member' });
      await tf.getByLabel(label('Member')).selectOption(members.members.find(m => m.email === u.email)!.user_id); await tf.getByLabel(label('Engagement role')).selectOption(role);
      await tf.getByRole('button', { name: 'Add to team' }).click(); await vendorAdmin.getByRole('cell', { name: role, exact: true }).waitFor();
    }
    await vendorAdmin.screenshot({ path: resolve(shots, 'dpdpa-vendor-engagement.png'), fullPage: true });

    t.setPhase('client gap register and evidence');
    const admin = await staffSignIn(browser, 'admin'); const reviewer = await staffSignIn(browser, 'reviewer');
    await t.ensurePackage();
    const framework = await ok((await h.login('admin')).call('/api/v1/admin/grc/regulatory-framework', { name: unique('DPDP browser audit') }, key()), S.schemas.GrcFramework);
    await ok((await h.login('admin')).call('/api/v1/admin/grc/controls', { title: `Notices published ${suffix}`, description: 'Each consent activity has a published itemised notice.', owner_reference: 'Privacy office', review_interval_days: 90,
      mappings: [{ framework_id: framework.id, requirement_code: 'DPDP-NOTICE-CONSENT-REQUEST' }] }, key()), S.schemas.GrcControl);
    await admin.goto('/workspace/dpdpa-audit'); await admin.getByRole('heading', { name: 'DPDPA external audit' }).waitFor();
    check('the client gap register lists DPDP requirements with gap statuses', await admin.getByRole('table', { name: 'Requirements' }).getByRole('row').count() > 1, true);
    const evidencePath = resolve(downloads, `notice-${suffix}.pdf`); writeFileSync(evidencePath, '%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n');
    const ev = admin.getByRole('form', { name: 'Add evidence file' });
    await ev.getByLabel(label('Control')).selectOption({ label: `DPDP-NOTICE-CONSENT-REQUEST — Notices published ${suffix}` });
    await ev.getByLabel(label('Description')).fill('Published itemised notice (synthetic)'); await ev.getByLabel('Evidence file').setInputFiles(evidencePath);
    await ev.getByLabel(label('Contains personal data')).selectOption('NO'); await ev.getByRole('button', { name: 'Store evidence file' }).click();
    await admin.getByText('Evidence file stored and submitted for review.').waitFor();
    await reviewer.goto('/workspace/dpdpa-audit');
    await reviewer.getByRole('row').filter({ hasText: `notice-${suffix}.pdf` }).getByRole('button', { name: 'Confirm no personal data' }).click();
    await reviewer.getByText('Confirmed: no personal data.').waitFor();
    check('a second person confirms the personal-data flag in the browser', true, true);

    t.setPhase('client engagement and package');
    await admin.reload(); await admin.getByRole('heading', { name: 'DPDPA external audit' }).waitFor();
    const cf = admin.getByRole('form', { name: 'Record engagement' });
    await cf.getByLabel(label('Engagement code')).fill(engagementCode); await cf.getByLabel(label('Audit firm')).fill('ORVIA audit practice');
    await cf.getByLabel(label('Engagement reference')).fill(`ENG-${suffix}`); await cf.getByLabel(label('Requirements in scope')).fill('DPDP-NOTICE-CONSENT-REQUEST');
    await cf.getByLabel(label('Audit period from (YYYY-MM-DD)')).fill('2026-01-01'); await cf.getByLabel(label('Audit period to (YYYY-MM-DD)')).fill('2026-06-30');
    await cf.getByRole('button', { name: 'Record engagement' }).click(); await admin.getByText('Engagement recorded.').waitFor();
    await admin.getByRole('button', { name: 'Prepare a new package' }).click();
    const itemForm = admin.getByRole('form', { name: 'Add package item' });
    await itemForm.getByLabel(label('Requirement')).selectOption('DPDP-NOTICE-CONSENT-REQUEST'); await itemForm.getByLabel(label('Item kind')).selectOption('FILE');
    await itemForm.getByLabel(label('Item title')).fill('Published itemised notice'); await itemForm.getByLabel(label('Evidence file')).selectOption({ label: `notice-${suffix}.pdf (shareable)` });
    await itemForm.getByRole('button', { name: 'Add item' }).click(); await admin.getByText('Item added.').waitFor();
    check('the preparer sees the approve control but approval is refused for them', await (async () => { await admin.getByRole('button', { name: 'Approve and seal package' }).click(); return admin.getByText(/approver must differ from preparer/).waitFor({ timeout: 10000 }).then(() => true, () => false); })(), true);
    await reviewer.reload(); await reviewer.getByRole('table', { name: 'Engagements' }).getByRole('row').filter({ hasText: `ENG-${suffix}` }).getByRole('button', { name: 'Open' }).click();
    await reviewer.getByRole('button', { name: 'Approve and seal package' }).click(); await reviewer.getByText('Package approved and sealed.').waitFor();
    const pkgDownload = reviewer.waitForEvent('download'); await reviewer.getByRole('button', { name: 'Export file' }).click();
    const packagePath = await save(await pkgDownload, `package-${suffix}.json`);
    check('a different owner approves and downloads the sealed package file', JSON.parse(readFileSync(packagePath, 'utf8')).manifest.format, 'orvia.dpdpa-audit-package');
    await reviewer.screenshot({ path: resolve(shots, 'dpdpa-client-package.png'), fullPage: true });

    t.setPhase('client account uploads to the vendor installation');
    const uploader = await context(browser, VENDOR);
    await vendorSignIn(uploader, journal.uploader!, '/vendor/sign-in?account=client');
    const uf = uploader.getByRole('form', { name: 'Upload audit package' });
    await uf.getByLabel(label('Engagement code')).fill(engagementCode); await uf.getByLabel('Package file').setInputFiles(packagePath);
    await uf.getByRole('button', { name: 'Upload package' }).click();
    await uploader.getByRole('heading', { name: 'Package received and verified' }).waitFor();
    check('the client uploads the file and the vendor verifies it', true, true);

    t.setPhase('audit practice set-up');
    const lead = await context(browser, VENDOR); await vendorSignIn(lead, journal.lead!);
    const rev = await context(browser, VENDOR); await vendorSignIn(rev, journal.reviewer!);
    const tab = async (page: Page, name: string) => { await page.getByRole('tab', { name: new RegExp(`^${name}`) }).click(); await page.getByRole('tabpanel').waitFor(); };
    const done = async (page: Page, text: string) => { await page.getByRole('status').filter({ hasText: text }).first().waitFor(); };
    await lead.goto('/vendor/practice'); await lead.getByRole('heading', { name: 'Audit practice' }).waitFor();
    await lead.getByRole('form', { name: 'Record test-fixture criteria' }).getByLabel(label('Criteria version label')).fill(`DPDP-FIXTURE-${suffix}`);
    await lead.getByRole('form', { name: 'Record test-fixture criteria' }).getByRole('button', { name: 'Record test-fixture criteria' }).click(); await done(lead, 'Criteria recorded.');
    await lead.getByRole('form', { name: 'Record methodology' }).getByLabel(label('Methodology version label')).fill(`RM-${suffix}`);
    await lead.getByRole('form', { name: 'Record methodology' }).getByRole('button', { name: 'Record methodology' }).click(); await done(lead, 'Methodology recorded.');
    await rev.goto('/vendor/practice');
    await rev.getByRole('table', { name: 'Criteria versions' }).getByRole('row').filter({ hasText: `DPDP-FIXTURE-${suffix}` }).getByRole('button', { name: 'Approve' }).click();
    const criteriaReview = rev.getByRole('form', { name: 'Review criteria evidence' });
    check('fixture criteria still require an explicit evidence review', await criteriaReview.getByRole('button', { name: 'Approve criteria' }).isDisabled(), true);
    await criteriaReview.getByLabel('Review reference').fill(`Synthetic review RV-${suffix}: fixture evidence and open items reviewed.`);
    await criteriaReview.getByLabel('I have reviewed the evidence and the open verification items listed above').check();
    await criteriaReview.getByRole('button', { name: 'Approve criteria' }).click(); await done(rev, 'Criteria approved.');
    await rev.getByRole('table', { name: 'Methodology versions' }).getByRole('row').filter({ hasText: `RM-${suffix}` }).getByRole('button', { name: 'Approve' }).click(); await done(rev, 'Methodology approved.');
    check('the practice page shows real use refused and the development key marked', [await rev.getByText('Refused until every gate below is recorded').isVisible(), await rev.getByText(/DEVELOPMENT key/).isVisible()], [true, true]);
    await rev.screenshot({ path: resolve(shots, 'practice-settings.png'), fullPage: true });

    t.setPhase('engagement acceptance');
    await vendorAdmin.goto(engagementUrl); await vendorAdmin.getByRole('tablist', { name: 'Engagement workspace' }).waitFor();
    const cfg = vendorAdmin.getByRole('form', { name: 'Configure engagement' });
    await cfg.getByLabel(label('Criteria version')).selectOption({ label: `DPDP-FIXTURE-${suffix} (test fixture)` }); await cfg.getByLabel(label('Risk methodology')).selectOption({ label: `RM-${suffix}` });
    await cfg.getByRole('button', { name: 'Save configuration' }).click(); await done(vendorAdmin, 'Configuration saved.');
    const acc = vendorAdmin.getByRole('form', { name: 'Prepare acceptance' });
    for (const [l, v] of [['Objectives', 'Form an evidence-based opinion on the notice requirement for the audit period.'], ['Intended users', 'Board of the synthetic client'], ['Client responsibilities', 'Provide sealed evidence packages and answer requests on time.'],
      ['Auditor responsibilities', 'Plan and perform procedures and report findings independently.'], ['Confidentiality', 'Engagement records stay on the vendor installation until purged.'], ['Evidence handling', 'Sealed packages only; personal data needs a processing agreement.'],
      ['Competence', 'Lead auditor and reviewer trained on the DPDP Act (synthetic).']] as const) await acc.getByLabel(label(l)).fill(v);
    check('acceptance cannot be prepared without the licence-independence statement', await acc.getByRole('button', { name: 'Prepare acceptance' }).isDisabled(), true);
    await acc.getByRole('checkbox').check(); await acc.getByRole('button', { name: 'Prepare acceptance' }).click(); await done(vendorAdmin, 'Acceptance prepared');
    await rev.goto(engagementUrl); const dec = rev.getByRole('form', { name: 'Decide acceptance' });
    await dec.getByLabel(label('Decision rationale')).fill('No conflicts; terms and competence adequate for a synthetic engagement.'); await dec.getByRole('button', { name: 'Record decision' }).click(); await done(rev, 'Decision recorded.');
    await lead.goto(engagementUrl); const indf = lead.getByRole('form', { name: 'Declare independence' });
    await indf.getByLabel(label('Independence statement')).fill('The audit team is independent of the client organisation and holds no conflicting interest.'); await indf.getByRole('button', { name: 'Declare independence' }).click(); await done(lead, 'Independence declared.');
    check('the workspace marks the engagement synthetic and its criteria test-fixture', [await lead.getByText(/^SYNTHETIC ENGAGEMENT/).isVisible(), await lead.getByText(/^TEST-FIXTURE CRITERIA/).isVisible()], [true, true]);
    await lead.screenshot({ path: resolve(shots, 'practice-overview.png'), fullPage: true });

    t.setPhase('scope, applicability and plan');
    await tab(lead, 'Scope and applicability');
    const uf2 = lead.getByRole('form', { name: 'Record understanding' });
    await uf2.getByLabel(label('Business overview')).fill('Synthetic retailer; privacy office reachable at dpo@aster.example.'); await uf2.getByLabel(label('Processing activities (one per line)')).fill('Marketing consent');
    await uf2.getByLabel(label('Source for SDF status')).fill('No notification found (synthetic)'); await uf2.getByRole('button', { name: 'Record understanding' }).click(); await done(lead, 'Understanding recorded.');
    check('contact details in the understanding are redacted before storage', [await lead.locator('dl').getByText('dpo@aster.example').count(), await lead.locator('dl').getByText(/\[redacted: e-mail\]/).count()], [0, 1]);
    const apf = lead.getByRole('form', { name: 'Record applicability' });
    await apf.getByLabel(label('Requirement')).selectOption('DPDP-NOTICE-CONSENT-REQUEST'); await apf.getByLabel(label('Rationale')).fill('Consent is a ground of processing for marketing.');
    await apf.getByRole('button', { name: 'Record decision' }).click(); await done(lead, 'Decision recorded.');
    const sf = lead.getByRole('form', { name: 'Propose scope' });
    await sf.getByLabel(label('Entities (one per line)')).fill('Aster Synthetic'); await sf.getByLabel(label('Processes (one per line)')).fill('Consent capture');
    await sf.getByRole('button', { name: 'Propose scope' }).click(); await done(lead, 'Scope proposed.');
    await rev.reload(); await tab(rev, 'Scope and applicability');
    await rev.getByRole('button', { name: 'Review understanding' }).click(); await done(rev, 'Understanding reviewed.');
    await rev.getByRole('table', { name: /Applicability decisions/ }).getByRole('button', { name: 'Review' }).click(); await done(rev, 'Decision reviewed.');
    await rev.getByRole('button', { name: 'Approve scope' }).click(); await done(rev, 'Scope approved.');
    await rev.screenshot({ path: resolve(shots, 'practice-scope.png'), fullPage: true });
    await lead.reload(); await tab(lead, 'Plan');
    const rk = lead.getByRole('form', { name: 'Assess risk' });
    await rk.getByLabel(label('Requirement')).selectOption('DPDP-NOTICE-CONSENT-REQUEST'); await rk.getByLabel(label('Risk')).fill('The notice may omit a required element (synthetic).');
    await rk.getByLabel(label('Likelihood (1-5)')).selectOption('2'); await rk.getByLabel(label('Impact (1-5)')).selectOption('3');
    for (const [l, v] of [['Affected people', 'Consenting customers'], ['Affected scope', 'Marketing'], ['Duration', 'Audit period'], ['Uncertainty', 'Low'], ['Risk rationale', 'Notice template last reviewed a year ago (synthetic).']] as const) await rk.getByLabel(label(l)).fill(v);
    await rk.getByRole('button', { name: 'Assess risk' }).click(); await done(lead, 'Risk assessed.');
    check('the residual rating is computed by the methodology, not typed', await lead.getByRole('table', { name: 'Risk assessments' }).getByRole('cell', { name: 'MEDIUM', exact: true }).count(), 2);
    const pf = lead.getByRole('form', { name: 'Add procedure' });
    await pf.getByLabel(label('Procedure requirement')).selectOption('DPDP-NOTICE-CONSENT-REQUEST'); await pf.getByLabel(label('Objective')).fill('Inspect the published notice for every required element.');
    await pf.getByLabel(label('Evidence expected')).fill('Published notice version.'); await pf.getByLabel(label('Completion criteria')).fill('Reviewed working paper with a supported conclusion.');
    await pf.getByRole('button', { name: 'Add procedure' }).click(); await done(lead, 'Procedure added.');
    await rev.reload(); await tab(rev, 'Plan');
    await rev.getByRole('table', { name: 'Risk assessments' }).getByRole('button', { name: 'Review' }).click(); await done(rev, 'Risk reviewed.');
    await rev.getByRole('button', { name: 'Approve work programme' }).click(); await done(rev, 'Work programme approved.');
    await rev.screenshot({ path: resolve(shots, 'practice-plan.png'), fullPage: true });

    t.setPhase('evidence, working paper and review');
    await lead.reload(); await tab(lead, 'Evidence');
    await lead.getByRole('table', { name: 'Received packages' }).getByRole('button', { name: 'Open' }).first().click();
    const dl = lead.waitForEvent('download'); await lead.getByRole('table', { name: 'Items' }).getByRole('button', { name: 'Download' }).first().click(); await save(await dl, `evidence-${suffix}.pdf`);
    const rg = lead.getByRole('form', { name: 'Register evidence' });
    await rg.getByLabel(label('Evidence source')).selectOption('PACKAGE_ITEM'); await rg.getByLabel(label('Package')).selectOption({ index: 1 }); await rg.getByLabel(label('Item')).selectOption({ index: 1 });
    await rg.getByRole('button', { name: 'Register evidence' }).click(); await done(lead, 'Evidence registered.');
    const evf = lead.getByRole('form', { name: 'Evaluate evidence' });
    await evf.getByLabel(label('Evidence to evaluate')).selectOption({ index: 1 }); await evf.getByLabel(label('Against procedure')).selectOption({ index: 1 });
    await evf.getByLabel(label('Evaluation rationale')).fill('The published notice is the item the procedure inspects.'); await evf.getByRole('button', { name: 'Record evaluation' }).click(); await done(lead, 'Evaluation recorded.');
    await lead.screenshot({ path: resolve(shots, 'practice-evidence.png'), fullPage: true });
    await tab(lead, 'Tests and working papers');
    const wf = lead.getByRole('form', { name: 'Record working paper' });
    await wf.getByLabel(label('Working paper procedure')).selectOption({ index: 1 }); await wf.getByLabel(label('What was performed')).fill('Inspected the published notice against the requirement statement.');
    await wf.getByLabel(label('Criteria applied')).fill('Requirement statement'); await wf.getByLabel(label('Results')).fill('The Board complaint channel is missing.');
    await wf.getByLabel(label('Exceptions found')).fill('1'); await wf.getByLabel(label('Exception details')).fill('No Board complaint channel on the notice.');
    await wf.getByLabel(label('Conclusion')).selectOption('EXCEPTIONS_NOTED'); await wf.getByRole('group', { name: 'Evidence cited' }).getByRole('checkbox').first().check();
    await wf.getByRole('button', { name: 'Record working paper' }).click(); await done(lead, 'Working paper recorded.');
    await rev.reload(); await tab(rev, 'Tests and working papers');
    const nf = rev.getByRole('form', { name: 'Raise review note' }); await nf.getByLabel(label('Working paper')).selectOption({ index: 1 });
    await nf.getByLabel(label('Review note')).fill('Confirm which notice version you inspected.'); await nf.getByRole('button', { name: 'Raise note' }).click(); await done(rev, 'Review note raised.');
    check('an open review note blocks the review', await rev.getByRole('table', { name: 'Current working papers' }).getByRole('button', { name: 'Review' }).isDisabled(), true);
    await lead.reload(); await tab(lead, 'Tests and working papers');
    const an = lead.getByRole('form', { name: 'Answer review note' }); await an.getByLabel(label('Note to answer')).selectOption({ index: 1 });
    await an.getByLabel(label('Answer')).fill('Version 3, published 2026-01-05.'); await an.getByRole('button', { name: 'Answer note' }).click(); await done(lead, 'Answer recorded.');
    await rev.reload(); await tab(rev, 'Tests and working papers');
    await rev.getByRole('table', { name: 'Open review notes' }).getByRole('button', { name: 'Resolve' }).click(); await done(rev, 'Note resolved.');
    await rev.getByRole('table', { name: 'Current working papers' }).getByRole('button', { name: 'Review' }).click(); await done(rev, 'Working paper reviewed.');
    await rev.screenshot({ path: resolve(shots, 'practice-working-papers.png'), fullPage: true });

    t.setPhase('finding, conclusion and report');
    await lead.reload(); await tab(lead, 'Report');
    const resf = lead.getByRole('form', { name: 'Record requirement result' });
    await resf.getByLabel(label('Requirement')).selectOption('DPDP-NOTICE-CONSENT-REQUEST'); await resf.getByLabel(label('Result')).selectOption('MEETS'); await resf.getByLabel(label('Rationale')).fill('Attempt to record a favourable conclusion.');
    await resf.getByRole('button', { name: 'Record result' }).click();
    check('the browser shows why an unsupported favourable conclusion is refused', await lead.getByRole('alert').filter({ hasText: /favourable conclusion needs reviewed effective work/ }).waitFor({ timeout: 10000 }).then(() => true, () => false), true);
    await resf.getByLabel(label('Result')).selectOption('PARTIALLY_MEETS'); await resf.getByLabel(label('Rationale')).fill('Notice published; complaint channel missing.');
    await resf.getByRole('button', { name: 'Record result' }).click(); await done(lead, 'Conclusion recorded.');
    await tab(lead, 'Findings and actions');
    const ff = lead.getByRole('form', { name: 'Raise finding' });
    await ff.getByLabel(label('Finding requirement')).selectOption('DPDP-NOTICE-CONSENT-REQUEST'); await ff.getByLabel(label('Provisions cited')).fill('ACT-S5(1)'); await ff.getByLabel(label('Severity')).selectOption('HIGH');
    await ff.getByLabel(label('Finding title')).fill('Notice lacks Board complaint channel'); await ff.getByLabel(label('Condition (what was found)')).fill('The sampled notice omits the means to complain to the Board.');
    for (const [l, v] of [['Affected scope', 'Published consent notice'], ['Cause', 'The notice template predates the requirement.'], ['Consequence', 'Data Principals are not told how to complain to the Board.'], ['Severity rationale', 'Every consenting Data Principal receives the incomplete notice.']] as const) await ff.getByLabel(label(l)).fill(v);
    await ff.getByLabel(label('Recommendation')).fill('Add the Board complaint channel to the notice.'); await ff.getByLabel(label('Finding due (YYYY-MM-DD)')).fill('2026-12-31');
    await ff.getByRole('group', { name: 'Adverse working papers' }).getByRole('checkbox').first().check();
    await ff.getByRole('button', { name: 'Raise finding' }).click(); await done(lead, 'Finding raised.');
    const fdl = lead.waitForEvent('download'); await lead.getByRole('button', { name: 'Export signed findings file' }).click(); const findingsPath = await save(await fdl, `findings-${suffix}.json`);
    await lead.screenshot({ path: resolve(shots, 'practice-findings.png'), fullPage: true });
    await tab(lead, 'Report');
    const df = lead.getByRole('form', { name: 'Draft report' });
    await df.getByLabel(label('Executive summary')).fill('Synthetic engagement: the notice requirement is partially met; one high finding on the Board complaint channel.');
    await df.getByLabel(label('Method')).fill('Inspection of the client-approved evidence package.'); await df.getByLabel(label('Opinion')).fill('The requirement in scope is partially met, subject to the finding raised.');
    await df.getByLabel(label('Limitations (one per line)')).fill('Only evidence the client chose to share was examined.'); await df.getByRole('button', { name: 'Save draft report' }).click(); await done(lead, 'Draft saved.');
    await rev.reload(); await tab(rev, 'Report'); await rev.getByRole('button', { name: 'Approve as reviewer' }).click(); await done(rev, 'Report approved and bound to its snapshot.');
    await lead.reload(); await tab(lead, 'Report');
    const jdl = lead.waitForEvent('download'); await lead.getByRole('button', { name: 'Sign and download JSON' }).click(); const reportJson = await save(await jdl, `report-${suffix}.json`);
    await lead.getByRole('table', { name: 'Report versions' }).getByRole('cell', { name: 'signed' }).waitFor();
    const pdl = lead.waitForEvent('download'); await lead.getByRole('button', { name: 'Download PDF' }).click(); const reportPdf = await save(await pdl, `report-${suffix}.pdf`);
    const reportDoc = JSON.parse(readFileSync(reportJson, 'utf8')).document;
    check('the report is bound to its approved snapshot and carries its marks, issued as JSON and PDF', [reportDoc.kind, /^[a-f0-9]{64}$/.test(reportDoc.snapshot_digest), reportDoc.watermarks.length, readFileSync(reportPdf).subarray(0, 5).toString(), readFileSync(reportPdf).toString('latin1').includes('SYNTHETIC ENGAGEMENT')], ['REPORT', true, 3, '%PDF-', true]);
    await lead.screenshot({ path: resolve(shots, 'practice-report.png'), fullPage: true });

    t.setPhase('client imports findings and report');
    const imp = async (file: string, pdf?: string) => { const f = admin.getByRole('form', { name: 'Import signed file' }); await f.getByLabel(/Signed file/).setInputFiles(file); if (pdf) await f.getByLabel(/Report PDF/).setInputFiles(pdf);
      await f.getByRole('button', { name: 'Verify and import' }).click(); await admin.getByText('Signed file verified and imported.').waitFor(); };
    await admin.reload(); await admin.getByRole('table', { name: 'Engagements' }).getByRole('row').filter({ hasText: `ENG-${suffix}` }).getByRole('button', { name: 'Open' }).click();
    await imp(findingsPath); await imp(reportJson, reportPdf);
    await admin.getByRole('table', { name: 'Signed files imported' }).getByRole('row').filter({ hasText: 'findings' }).getByRole('button', { name: 'Open' }).click();
    await admin.getByRole('button', { name: 'Track remediation' }).click(); await admin.getByText('Finding tracked as a GRC issue.').waitFor();
    check('the client imports the signed findings and report and tracks remediation', await admin.getByRole('link', { name: 'Tracked as a GRC issue' }).isVisible(), true);
    await admin.screenshot({ path: resolve(shots, 'dpdpa-client-imports.png'), fullPage: true });

    check('no browser errors and no request left either installation', [errors, external], [[], []]);

    // Resilience (Codex round 5, WebKit): a 503 from the gap register once hid the whole page, including the Engagements table.
    // Forced here after the error check above, so the deliberate 503 is not counted as a browser error.
    let failures = 0;
    await admin.route('**/api/v1/admin/dpdpa-audit/gaps', route => { failures++; return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: { code: 'SERVICE_UNAVAILABLE', message: 'Request could not be completed.', retry: 'AFTER_DELAY' }, request_id: '00000000-0000-4000-8000-000000000000' }) }); });
    await admin.reload(); await admin.getByText('Gap register unavailable').waitFor();
    check('a gap-register 503 is retried once, then shown only in its own section', failures, 2);
    check('the engagements stay usable while the gap register is unavailable', await admin.getByRole('table', { name: 'Engagements' }).getByRole('row').filter({ hasText: `ENG-${suffix}` }).getByRole('button', { name: 'Open' }).isVisible(), true);
    await admin.unroute('**/api/v1/admin/dpdpa-audit/gaps');
    await admin.getByRole('button', { name: 'Try again' }).click(); await admin.getByRole('table', { name: 'Requirements' }).waitFor();
    check('Try again recovers the gap register', await admin.getByText('Gap register unavailable').count(), 0);
  } finally {
    await browser.close();
    if (vendorProcess.exitCode === null) { const closed = once(vendorProcess, 'close'); vendorProcess.kill(); await closed; }
  }
});
