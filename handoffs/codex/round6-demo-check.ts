// Read-only Chromium walkthrough of docs/demo/DEMO_SCRIPT.md on running installations.
import { chromium, type Page } from '@playwright/test';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import assert from 'node:assert/strict';
import { dpdpaAuditRoutes, AuditChannel } from '../../shared/contracts/src/dpdpa-audit.ts';
const directory = resolve('output/playwright/round6/demo'); mkdirSync(directory, { recursive: true });
const h = new HttpFixture(); const vendor = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const users = JSON.parse(readFileSync('.local/profiles/vendor-a00/auth/e2e-users.json', 'utf8'));
const browser = await chromium.launch({ headless: true });
const visits: { role: string; route: string; status: number | null; issues: string[] }[] = [];
const dataProof: Record<string, number | string> = {};
const customerRoutes = ['/workspace', '/workspace/operations-attention', '/workspace/configuration', '/workspace/processing-activities',
  '/workspace/registry-notices', '/workspace/website-consent', '/workspace/consent-records', '/workspace/operations-runs',
  '/workspace/rights', '/workspace/personal-data-breaches', '/workspace/processors', '/workspace/processor-engagements',
  '/workspace/registry-retention', '/workspace/retention/outcomes', '/workspace/inventory', '/workspace/catalog-discovery',
  '/workspace/grc', '/workspace/compliance', '/workspace/impact-assessments', '/workspace/assessments', '/workspace/ai-governance',
  '/workspace/dpdpa-audit', '/workspace/vendor-visibility', '/workspace/audit-trail'];
const vendorRoutes = ['/vendor', '/vendor/organisations', '/vendor/licences', '/vendor/engagements', '/vendor/practice', '/vendor/support', '/vendor/payments'];
async function inspect(page: Page, role: string, route: string, navigate = true) {
  const issues: string[] = [];
  const error = (e: Error) => issues.push(e.message); page.on('pageerror', error);
  const response = (r: import('@playwright/test').Response) => { if (r.status() >= 500) issues.push(`${r.status()} ${new URL(r.url()).pathname}`); };
  page.on('response', response);
  let status: number | null = 200;
  try {
    if (navigate) status = (await page.goto(route))?.status() ?? null;
    await page.waitForLoadState('networkidle');
    if (status !== 200) issues.push(`HTTP ${status}`);
    const probe = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth - innerWidth,
      crash: /Application error|Unhandled Runtime Error|Internal Server Error/.test(document.body.innerText),
      heading: !!document.querySelector('main h1, main h2') }));
    if (probe.overflow > 2) issues.push(`overflow ${probe.overflow}px`);
    if (probe.crash) issues.push('crash text'); if (!probe.heading) issues.push('no main heading');
  } catch (e) { issues.push((e as Error).message.slice(0, 200)); }
  page.off('pageerror', error); page.off('response', response);
  visits.push({ role, route, status, issues });
}
async function vendorSignIn(page: Page, user: { email: string; password: string; totp: string }) {
  await page.goto('/vendor/sign-in'); await page.getByLabel(/^Email( \*)?$/).fill(user.email);
  await page.getByLabel(/^Password( \*)?$/).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(/^Authenticator code( \*)?$/).fill(authenticatorCode(user.totp));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(/\/vendor\/engagements/);
}
try {
  const client = await browser.newPage({ baseURL: h.config.origin, viewport: { width: 1440, height: 1000 } });
  await h.authWindow(); await client.goto('/workspace/sign-in');
  await client.getByLabel('Staff email').fill(h.users.owner!.email);
  await client.getByLabel('Password', { exact: true }).fill(h.users.owner!.password);
  await client.getByRole('button', { name: 'Sign in', exact: true }).click();
  await client.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(h.users.owner!.totp_uri!));
  await client.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await client.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  for (const route of customerRoutes) await inspect(client, 'client owner', route);
  await client.goto('/workspace/dpdpa-audit'); await client.waitForLoadState('networkidle');
  const mandate = client.getByRole('table', { name: 'Engagements', exact: true }).getByRole('row').filter({ hasText: 'ENG-MB-' }).first();
  dataProof.mandate_engagement = await mandate.locator('td').first().innerText();
  const channelPath = dpdpaAuditRoutes.find(r => r.id === 'audit_channel')!.path;
  const channelResponse = client.waitForResponse(r => new URL(r.url()).pathname.startsWith(channelPath.split('{id}')[0]!) && new URL(r.url()).pathname.endsWith(channelPath.split('{id}')[1]!) && r.request().method() === 'GET');
  await mandate.getByRole('button', { name: 'Open', exact: true }).click();
  await client.getByRole('heading', { name: 'Audit mandate', exact: true }).waitFor();
  await inspect(client, 'client owner', '/workspace/dpdpa-audit#mandate-engagement', false);
  dataProof.delivery_rows = await client.getByRole('table', { name: 'Evidence deliveries', exact: true }).getByRole('row').count() - 1;
  assert.ok(dataProof.delivery_rows > 0, 'Journey deliveries must still be present');
  dataProof.mandate = await client.locator('dt').filter({ hasText: /^Mandate in force$/ }).locator('..').locator('dd').innerText();
  const channel = AuditChannel.parse(await (await channelResponse).json());
  assert.ok(channel.mandates.length > 0, 'The journey mandate history must still be present');
  dataProof.mandate_history_states = channel.mandates.map(m => m.state).join(', ');
  assert.ok(channel.mandates.some(m => m.state === 'ENDED'), 'The journey ends its mandate when it closes the engagement');
  await client.screenshot({ path: resolve(directory, 'client-mandate.png'), fullPage: true });
  await client.goto('/workspace/dpdpa-audit'); await client.waitForLoadState('networkidle');
  const reportRow = client.getByRole('table', { name: 'Engagements', exact: true }).getByRole('row').filter({ hasText: /ENG-[0-9a-f]{8}/ }).first();
  dataProof.report_engagement = await reportRow.locator('td').first().innerText();
  await reportRow.getByRole('button', { name: 'Open', exact: true }).click();
  const imported = client.getByRole('table', { name: 'Signed files imported', exact: true });
  await imported.waitFor();
  dataProof.signed_reports = await imported.getByRole('row').filter({ hasText: 'report' }).count();
  dataProof.signed_findings = await imported.getByRole('row').filter({ hasText: 'findings' }).count();
  assert.ok(dataProof.signed_reports > 0 && dataProof.signed_findings > 0, 'Signed report and findings must still be present');
  await inspect(client, 'client owner', '/workspace/dpdpa-audit#signed-report-and-findings', false);
  const admin = await browser.newPage({ baseURL: vendor, viewport: { width: 1440, height: 1000 } });
  await vendorSignIn(admin, users.admin);
  for (const route of vendorRoutes) await inspect(admin, 'vendor administrator', route);
  const lead = await browser.newPage({ baseURL: vendor, viewport: { width: 1440, height: 1000 } });
  await vendorSignIn(lead, users.lead); await lead.waitForLoadState('networkidle');
  const links = await lead.locator('main a[href^="/vendor/engagements/"]').evaluateAll(nodes => nodes.map(n => (n as HTMLAnchorElement).getAttribute('href')!));
  for (const link of links.slice(0, 2)) {
    await inspect(lead, 'lead auditor', link);
    for (const tab of await lead.getByRole('tab').all()) {
      const name = await tab.innerText(); await tab.click();
      await inspect(lead, 'lead auditor', link + '#' + name, false);
    }
  }
} finally {
  await browser.close();
  const result = { script: 'docs/demo/DEMO_SCRIPT.md', checked: visits.length, dataProof, pages_with_issues: visits.filter(v => v.issues.length), visits };
  writeFileSync('handoffs/codex/artifacts/R6-demo-pages.json', JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ checked: visits.length, pages_with_issues: result.pages_with_issues }));
  if (result.pages_with_issues.length) process.exitCode = 1;
}
