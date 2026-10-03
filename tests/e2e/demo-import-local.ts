// Import data, end to end in a real browser on the running rehearsal installation (owner request 2026-10-03).
// A staff member clicks "Import data" in the Privacy Centre, uploads a consent export and a privacy-requests export as a
// store would produce them, reads ORVIA's review of each file (what goes where, which rows cannot be used and why),
// approves, and the records appear in Data Principals, Consent records and Privacy requests. The files are generated per
// run (unique references), so the demonstration CSVs in fixtures/demo stay unused for a live demonstration.
// Requires npm start and npm run demo:data. TLS: only this installation's own certificate is accepted (pinned).
import { X509Certificate, createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { writeEvidence } from '../../shared/testing/src/evidence.ts';
import { guardAuthWindow } from '../../shared/testing/src/auth-window.ts';

process.env.ORVIA_PROFILE ??= 'rehearsal';
if (process.env.ORVIA_PROFILE !== 'rehearsal') throw new Error('This check runs against the rehearsal installation started by npm start');
const ORIGIN = 'https://127.0.0.1:4330';
const dir = resolve('.local/profiles/rehearsal');
const dataset = JSON.parse(readFileSync(resolve(dir, 'demo/dataset.json'), 'utf8'));
const owner = JSON.parse(readFileSync(resolve(dir, 'auth/bootstrap.json'), 'utf8')).users.owner as { email: string; password: string; totp_uri: string };
const spki = createHash('sha256').update(new X509Certificate(readFileSync(resolve(dir, 'tls/server-cert.pem'))).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
const shots = resolve('output/playwright/demo-import'); mkdirSync(shots, { recursive: true });
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => { results.push({ name, result: ok ? 'PASS' : 'FAIL', ...(ok ? {} : { detail: detail.slice(0, 300) }) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  (${detail.slice(0, 300)})`}`); };
const api = (page: Page, path: string) => page.evaluate(async p => { const r = await fetch(p, { credentials: 'same-origin' }); return r.ok ? r.json() : null; }, path);

const run = randomUUID().slice(0, 6);
const store = dataset.store as string;
const [, marketing, recommend] = dataset.purposes as string[];
const consentCsv = ['customer_reference,email,system,activity,decision,occurred_at,evidence',
  `imp_${run}_a,imp.${run}.a@aster.example,${store},${marketing},granted,2026-08-01T10:00:00Z,Counter signup ${run}`,
  `imp_${run}_b,imp.${run}.b@aster.example,${store},${marketing},granted,2026-08-02T10:00:00Z,Counter signup ${run}`,
  `imp_${run}_b,imp.${run}.b@aster.example,${store},${recommend},declined,2026-08-02T10:00:00Z,Counter signup ${run}`,
  `${dataset.people[0].ref},,${store},${marketing},granted,2026-07-01T09:00:00Z,CRM history ${run}`,
  `imp_${run}_c,,${store},Loyalty newsletter ${run},granted,2026-08-03T10:00:00Z,`].join('\n') + '\n';
const requestsCsv = ['email,name,right_type,description,received_at',
  `imp.${run}.a@aster.example,Import Person A,access,Asked at the store counter for a copy of her data (${run}).,2026-09-28`,
  `imp.${run}.b@aster.example,Import Person B,erasure,Asked by phone to erase his account data (${run}).,2026-09-29`,
  `real.${run}@example.com,Real Person,access,A real address must be refused here (${run}).,2026-09-30`,
  `imp.${run}.c@aster.example,Import Person C,refund,Not a DPDP right (${run}).,2026-09-30`].join('\n') + '\n';

async function upload(page: Page, name: string, csv: string) {
  await page.locator('input[type=file]').setInputFiles({ name, mimeType: 'text/csv', buffer: Buffer.from(csv) });
  const card = page.locator('.entry-card', { hasText: name });
  await card.waitFor({ timeout: 30_000 });
  return card;
}
async function approve(page: Page, name: string) {
  const card = page.locator('.entry-card', { hasText: name });
  await card.getByLabel('Reason (recorded with the decision)').fill('Reviewed the import summary; applying the rows ORVIA can use.');
  await card.getByRole('button', { name: 'Approve', exact: true }).click();
  await card.waitFor({ state: 'detached', timeout: 30_000 });
}

const browser = await chromium.launch({ executablePath, args: [`--ignore-certificate-errors-spki-list=${spki}`] });
try {
  const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await guardAuthWindow(4);
  await page.goto(`${ORIGIN}/workspace/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(owner.email); await page.getByLabel('Password', { exact: true }).fill(owner.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(owner.totp_uri));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(u => u.pathname === '/workspace', { timeout: 30_000 });

  await page.goto(`${ORIGIN}/workspace/privacy-centre`);
  await page.getByRole('link', { name: 'Import data', exact: true }).click();
  await page.waitForURL(u => u.pathname === '/workspace/files', { timeout: 20_000 });
  await page.getByRole('link', { name: 'Download the CSV template' }).first().waitFor({ timeout: 20_000 }).catch(() => undefined);
  check('"Import data" in the Privacy Centre opens the import section with both CSV templates', await page.getByRole('link', { name: 'Download the CSV template' }).count() === 2);

  const before = { requests: (await api(page, '/api/v1/admin/rights-requests?limit=100'))?.items?.length ?? 0 };
  const consentName = `crm-consent-${run}.csv`;
  const card = await upload(page, consentName, consentCsv);
  const review = (await card.innerText()).replace(/\s+/g, ' ');
  await page.screenshot({ path: resolve(shots, 'consent-export-review.png'), fullPage: true });
  check('the consent export is recognised as one', /Consent export \(CSV\)/.test(review), review.slice(0, 200));
  check('ORVIA reviews it before approval: 4 events for 3 people go to Data Principals and Consent records', /4 event\(s\) for 3 person\(s\) will go to Data Principals and Consent records/.test(review), review.slice(0, 300));
  check('the row it cannot use is listed with its reason', /1 row\(s\) cannot be applied/.test(review) && /line 6: activity "Loyalty newsletter/.test(review), review.slice(0, 400));
  await approve(page, consentName);

  // The operations runner applies the approved rows (it is woken at once and also passes every 30 seconds).
  let job: { status: string; counts: Record<string, number> } | undefined;
  for (let i = 0; i < 45; i++) {
    const jobs = await api(page, '/api/v1/admin/bulk-jobs?limit=20');
    job = (jobs?.items ?? []).find((j: { source_label: string }) => j.source_label === `File ${consentName}`);
    if (job && /COMPLETED/.test(job.status)) break;
    await page.waitForTimeout(2000);
  }
  check('the approved consent rows are applied by ORVIA', job?.status === 'COMPLETED', JSON.stringify(job ?? null).slice(0, 200));
  const principals = await api(page, `/api/v1/admin/data-principals?system_id=${dataset.system_id}&target_reference=imp_${run}_a`);
  check('an imported person is now a Data Principal, found by their store reference', (principals?.items?.length ?? 0) === 1, JSON.stringify(principals).slice(0, 200));
  await page.goto(`${ORIGIN}/workspace/estate-imports`);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  check('the import shows on Existing-data onboarding', (await page.locator('main').innerText()).includes(consentName));
  await page.screenshot({ path: resolve(shots, 'existing-data-onboarding.png'), fullPage: true });

  await page.goto(`${ORIGIN}/workspace/files#import`);
  const requestsName = `helpdesk-requests-${run}.csv`;
  const rcard = await upload(page, requestsName, requestsCsv);
  const rreview = (await rcard.innerText()).replace(/\s+/g, ' ');
  check('the privacy requests export is recognised and reviewed: 3 requests can go, 1 row cannot (not a DPDP right)', /Privacy requests \(CSV\)/.test(rreview) && /3 request\(s\) will go to Privacy requests; 1 row\(s\) cannot be applied/.test(rreview) && /refund/.test(rreview), rreview.slice(0, 300));
  await approve(page, requestsName);
  const after = (await api(page, '/api/v1/admin/rights-requests?limit=100'))?.items ?? [];
  const mine = after.filter((r: { description: string }) => r.description.includes(`(${run})`));
  check('2 privacy requests are recorded; the real address is refused by the synthetic-only rule', mine.length === 2 && after.length - before.requests === 2, `recorded ${mine.length}`);
  check('they are recorded as staff intake with their original date', mine.every((r: { submitted_channel: string; description: string }) => r.submitted_channel === 'RECORDED_MANUAL_INTAKE' && /received 2026-09-2[89]/.test(r.description)));
  await page.locator('table', { hasText: requestsName }).waitFor({ timeout: 20_000 }).catch(() => undefined);
  const decided = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
  check('the approved file records the outcome, including the refused real address', decided.includes(requestsName) && /2 request\(s\) recorded in Privacy requests; 2 row\(s\) not applied/.test(decided) && /synthetic people only/.test(decided), decided.slice(0, 300));
  await page.screenshot({ path: resolve(shots, 'files-after-approval.png'), fullPage: true });
  await page.goto(`${ORIGIN}/workspace/rights`);
  await page.waitForLoadState('networkidle').catch(() => undefined);
  await page.screenshot({ path: resolve(shots, 'privacy-requests.png'), fullPage: true });
  check('no page error or server error during the import', errors.length === 0, errors.join('; '));
} finally {
  await browser.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  writeEvidence('demo-import', { results, result: failures ? 'FAIL' : 'PASS' });
  console.log(`\n${results.length} assertions, ${failures} failures. Screenshots: output/playwright/demo-import/`);
  if (failures) process.exitCode = 1;
}
