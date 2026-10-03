// Demonstration accuracy check, organisation side: every screen shows exactly what `npm run demo:data` loaded.
// Runs against the running rehearsal installation (npm start) in a real browser. Each role signs in through the branded
// sign-in page with its own synthetic account. For the owner, each screen's text is compared with the recorded dataset
// (.local/profiles/rehearsal/demo/dataset.json) and with the server's own API answer for the same session. For the other
// roles, what they may open and what they are refused is recorded. It reads only, apart from signing in.
//
// TLS: the browser is told to accept exactly this installation's own server certificate (pinned by its public-key hash
// read from the protected profile), so verification is not switched off for anything else.
import { X509Certificate, createHash } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { writeEvidence } from '../../shared/testing/src/evidence.ts';
import { guardAuthWindow } from '../../shared/testing/src/auth-window.ts';

process.env.ORVIA_PROFILE ??= 'rehearsal';
if (process.env.ORVIA_PROFILE !== 'rehearsal') throw new Error('This check runs against the rehearsal installation started by npm start');
const ORIGIN = 'https://127.0.0.1:4330';
const profileDir = resolve('.local/profiles/rehearsal');
const dataset = JSON.parse(readFileSync(resolve(profileDir, 'demo/dataset.json'), 'utf8'));
const users = JSON.parse(readFileSync(resolve(profileDir, 'auth/bootstrap.json'), 'utf8')).users as Record<string, { email: string; password: string; role: string; domain: string; totp_uri?: string }>;
const spki = createHash('sha256').update(new X509Certificate(readFileSync(resolve(profileDir, 'tls/server-cert.pem'))).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
const shots = resolve('output/playwright/demo-data'); mkdirSync(shots, { recursive: true });
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => { results.push({ name, result: ok ? 'PASS' : 'FAIL', ...(ok ? {} : { detail: detail.slice(0, 300) }) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  (${detail.slice(0, 300)})`}`); };
const count = (text: string, needle: string | RegExp) => (text.match(needle instanceof RegExp ? new RegExp(needle.source, 'g') : new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) ?? []).length;

async function signIn(page: Page, name: string) {
  const u = users[name]!;
  // ORVIA allows 10 sign-ins a minute from one address; wait out the window rather than trip the protection.
  await guardAuthWindow(4);
  await page.goto(`${ORIGIN}/workspace/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(u.email);
  await page.getByLabel('Password', { exact: true }).fill(u.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  if (u.role !== 'AUDITOR' && u.totp_uri) {
    await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(u.totp_uri));
    await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  }
  await page.waitForURL(url => url.pathname === '/workspace', { timeout: 30_000 });
}
async function open(page: Page, path: string) {
  await page.goto(ORIGIN + path, { waitUntil: 'load' });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  for (let i = 0; i < 40 && /Loading/.test(await page.locator('main').innerText().catch(() => '')); i++) await page.waitForTimeout(250);
  await page.screenshot({ path: resolve(shots, `${path.replaceAll('/', '_').replace(/^_/, '')}.png`), fullPage: true });
  return (await page.locator('main').innerText()).replace(/[ \t]+/g, ' ');
}
// API reads and writes are made from inside the signed-in page, exactly as the interface makes them.
const api = (page: Page, path: string) => page.evaluate(async p => { const r = await fetch(p, { credentials: 'same-origin' }); return { status: r.status, body: r.ok ? await r.json() : null }; }, path);
const post = (page: Page, path: string, body: unknown) => page.evaluate(async ([p, b]) => (await fetch(p as string, { method: 'POST', credentials: 'same-origin',
  headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify(b) })).status, [path, body] as const);

const browser = await chromium.launch({ executablePath, args: [`--ignore-certificate-errors-spki-list=${spki}`] });
try {
  // ---------------------------------------------------------------- owner: every screen against the dataset
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await ctx.newPage();
  const errors: string[] = [];
  page.on('pageerror', e => errors.push(e.message.slice(0, 160)));
  page.on('response', r => { if (r.url().includes('/api/') && r.status() >= 500) errors.push(`${r.status()} ${new URL(r.url()).pathname}`); });
  await signIn(page, 'owner');
  check('owner signs in through the branded page and lands in the Workspace', new URL(page.url()).pathname === '/workspace');

  const e = dataset.expected;
  let t = await open(page, '/workspace/rights');
  for (const r of e.requests as { right: string }[]) check(`Privacy requests shows the ${r.right.toLowerCase()} request`, new RegExp(`\\b${r.right.charAt(0)}${r.right.slice(1).toLowerCase()}\\b`).test(t));
  const rights = await api(page, '/api/v1/admin/rights-requests?limit=100');
  const storeRequests = (rights.body?.items ?? []).filter((x: { submitted_channel: string }) => x.submitted_channel === 'ORGANISATION_APP');
  check('the server holds exactly the 5 requests the store sent, all received through the store', storeRequests.length === e.requests.length, `server has ${storeRequests.length}`);
  check('each store request shows identity established (the store signs its customers in)', count(t, 'Established') >= e.requests.length, `screen shows ${count(t, 'Established')}`);

  t = await open(page, '/workspace/consent-records');
  const records = await api(page, '/api/v1/admin/consent-records?limit=100');
  const mine = (records.body?.items ?? []).filter((x: { activity_id: string }) => [dataset.activities.marketing, dataset.activities.recommendations].includes(x.activity_id));
  check(`the server holds ${e.consent_records} consent records for the store's two consent activities`, mine.length === e.consent_records, `server has ${mine.length}`);
  check(`${e.marketing_withdrawn} of them read withdrawn on the server`, mine.filter((x: { current_status: string }) => x.current_status === 'WITHDRAWN').length === e.marketing_withdrawn);
  check(`the screen lists ${e.marketing_records} marketing records`, count(t, 'Promotional email and SMS') >= e.marketing_records, `screen shows ${count(t, 'Promotional email and SMS')}`);
  check(`the screen lists ${e.recommendation_records} recommendation records`, count(t, 'Personalised recommendations') >= e.recommendation_records, `screen shows ${count(t, 'Personalised recommendations')}`);
  check(`the screen shows ${e.marketing_withdrawn} withdrawn records`, count(t, /✕?\s?Withdrawn/) >= e.marketing_withdrawn, `screen shows ${count(t, 'Withdrawn')}`);

  t = await open(page, '/workspace/operations-runs');
  check('each withdrawal has a propagation run on the screen', count(t, 'Consent withdrawal propagation') >= e.marketing_withdrawn, `screen shows ${count(t, 'Consent withdrawal propagation')}`);
  const runRows = (await page.locator('main table tbody').first().innerText()).replace(/[ \t]+/g, ' ');
  check('every propagation run is completed and independently verified', count(runRows, 'Completed and verified') >= e.marketing_withdrawn && !/Partly failed|Failed/.test(runRows), runRows.slice(0, 300));

  t = await open(page, '/workspace/organisation-intake');
  check('the store\'s intake key is listed and active', t.includes(dataset.store) && /active/.test(t));
  check('27 submissions received from the store', /27 received/.test(t));
  check('consent changes are described by activity name, not an identifier', /Consent withdrawn: Promotional email and SMS/.test(t) && !/for activity [0-9a-f]{8}-/.test(t));
  check('no submission is waiting for staff', !/Waiting for staff/i.test(t.split('Received from your applications')[1] ?? ''));

  t = await open(page, '/workspace/personal-data-breaches');
  check('the breach shows 320 people affected (estimated)', /320 \(estimated\)/.test(t));
  check('the breach shows its DPDP tasks', /\b[1-9]\d*\b/.test(t.split('320 (estimated)')[1]?.slice(0, 20) ?? ''));

  t = await open(page, '/workspace/registry-notices');
  check('the published privacy notice is listed', t.includes('Aster store privacy notice'));
  t = await open(page, '/workspace/processing-activities');
  for (const p of dataset.purposes as string[]) check(`processing activity "${p}" is listed`, t.includes(p));
  t = await open(page, '/workspace/registry-retention');
  check('both retention rules are listed', t.includes('Marketing data after withdrawal') && t.includes('Account data after the account is closed'));
  if (dataset.processor) { t = await open(page, '/workspace/processor-engagements'); check('the delivery processor engagement is listed', t.includes('Last-mile delivery of store orders.')); }

  t = await open(page, '/workspace/privacy-centre');
  for (const [tab, heading] of [['Consents', 'Consent records'], ['Data Principals', 'Data Principals'], ['Requests', 'Privacy requests'], ['Sources', 'Website & app intake']] as const) {
    await page.getByRole('tab', { name: tab, exact: true }).click();
    const ok = await page.getByRole('tabpanel').getByRole('heading', { name: heading }).first().isVisible({ timeout: 15_000 }).catch(() => false);
    check(`Privacy Centre tab "${tab}" opens its screen`, ok);
  }
  check('no page error or server error on any owner screen', errors.length === 0, errors.join('; '));
  await ctx.close();

  // ---------------------------------------------------------------- other roles: sign-in and what each may do
  for (const name of ['admin', 'member', 'auditor', 'reviewer']) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const p = await c.newPage();
    try {
      await signIn(p, name);
      check(`${name} (${users[name]!.role}) signs in through the branded page`, new URL(p.url()).pathname === '/workspace');
      const requests = await api(p, '/api/v1/admin/rights-requests?limit=5');
      const consents = await api(p, '/api/v1/admin/consent-records?limit=5');
      // Only probed for roles that must be refused, so the probe never records anything.
      const create = ['auditor', 'member'].includes(name) ? await post(p, '/api/v1/admin/data-principal-categories', { name: `Role probe ${name}`, description: 'Must be refused for read-only roles.', regulatory_tags: [] }) : null;
      console.log(`     ${name}: privacy requests ${requests.status}, consent records ${consents.status}, create a registry category ${create ?? 'not probed'}`);
      if (name === 'auditor') check('the auditor can read but cannot change the registry', consents.status === 200 && create === 403, `read ${consents.status}, write ${create}`);
      if (name === 'member') check('a member cannot change the registry', create === 403, `write ${create}`);
      await open(p, '/workspace/privacy-centre');
    } catch (error) { await p.screenshot({ path: resolve(shots, `sign-in-failure-${name}.png`) }).catch(() => undefined); check(`${name} signs in and opens the Workspace`, false, `${String(error).slice(0, 120)} | page: ${(await p.locator('main').innerText().catch(() => '')).replace(/\s+/g, ' ').slice(0, 200)}`); }
    finally { await c.close(); }
  }
  // ---------------------------------------------------------------- vendor side (when npm run start:vendor is running)
  const VENDOR = 'http://127.0.0.1:4340';
  const vendorUp = await fetch(`${VENDOR}/readyz`, { signal: AbortSignal.timeout(3000) }).then(r => r.ok, () => false);
  const vendorJournal = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
  if (!vendorUp || !existsSync(vendorJournal)) console.log('     vendor service not running (npm run start:vendor) or not set up: vendor checks NOT_RUN');
  else {
    const vendorUsers = JSON.parse(readFileSync(vendorJournal, 'utf8')) as Record<string, { email: string; password: string; totp?: string }>;
    const roles: [string, string, string, RegExp][] = [['admin', 'vendor administrator', '/vendor/sign-in', /\/vendor\/engagements/], ['lead', 'audit lead (auditor)', '/vendor/sign-in', /\/vendor\/engagements/],
      ['reviewer', 'audit reviewer (auditor)', '/vendor/sign-in', /\/vendor\/engagements/], ['uploader', 'client organisation account', '/vendor/sign-in?account=client', /\/vendor\/upload/]];
    for (const [name, role, path, landing] of roles) {
      const u = vendorUsers[name]; if (!u?.totp) { check(`vendor ${role} has a synthetic account`, false, 'missing from the vendor journal'); continue; }
      const c = await browser.newContext({ viewport: { width: 1440, height: 1000 } }); const p = await c.newPage();
      try {
        await p.goto(VENDOR + path);
        await p.getByLabel('Email', { exact: true }).fill(u.email); await p.getByLabel('Password', { exact: true }).fill(u.password);
        await p.getByRole('button', { name: 'Sign in', exact: true }).click();
        await p.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(u.totp));
        await p.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
        await p.waitForURL(landing, { timeout: 30_000 });
        const text = (await p.locator('main').innerText()).replace(/\s+/g, ' ');
        await p.screenshot({ path: resolve(shots, `vendor-${name}.png`), fullPage: true });
        check(`vendor side: the ${role} signs in through the branded page and lands on ${new URL(p.url()).pathname}`, !/Not permitted|Request failed|Something went wrong/.test(text), text.slice(0, 200));
      } catch (error) { await p.screenshot({ path: resolve(shots, `vendor-failure-${name}.png`) }).catch(() => undefined); check(`vendor side: the ${role} signs in`, false, String(error).slice(0, 200)); }
      finally { await c.close(); }
    }
  }
} finally {
  await browser.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  writeEvidence('demo-data', { results, result: failures ? 'FAIL' : 'PASS', dataset_loaded_at: dataset.loaded_at });
  console.log(`\n${results.length} assertions, ${failures} failures. Screenshots: output/playwright/demo-data/`);
  if (failures) process.exitCode = 1;
}
