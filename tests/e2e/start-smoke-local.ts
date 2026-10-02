// Start-and-smoke check (revision 1.13 V5): both installations start from the current build and their main screens work.
// Customer installation (codex-a00) and vendor service (vendor-a00) are started from the built application, must report
// ready, and a signed-in browser opens each main screen with no page error, no failed contract read and no request leaving
// the installation. Screenshots and a JSON record are written to handoffs/code/artifacts/start-smoke/.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';

const out = resolve('handoffs/code/artifacts/start-smoke'); mkdirSync(out, { recursive: true });
const VENDOR = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const vendorJournal = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
type Visit = { installation: string; path: string; ok: boolean; heading: string; problems: string[] };
const visits: Visit[] = []; const external: string[] = [];

async function startVendor() {
  const command = webProcess({ profile: 'vendor-a00', app_port: PROFILES['vendor-a00'].app_port });
  const child: ChildProcess = spawn(process.execPath, command.args, { cwd: command.cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: { ...command.env, ORVIA_PROFILE: 'vendor-a00', NEXT_TELEMETRY_DISABLED: '1' } });
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error('Vendor web process exited');
    try { if ((await fetch(`${VENDOR}/readyz`, { signal: AbortSignal.timeout(2000) })).ok) return child; } catch { /* starting */ }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error('Vendor readiness timeout');
}
async function visit(page: Page, installation: string, origin: string, path: string, expect: RegExp) {
  const problems: string[] = [];
  const onError = (e: Error) => problems.push(`page error: ${e.message.slice(0, 200)}`);
  const onResponse = (r: { url(): string; status(): number }) => { if (r.url().includes('/api/') && r.status() >= 500) problems.push(`${r.status()} ${new URL(r.url()).pathname}`); };
  page.on('pageerror', onError); page.on('response', onResponse);
  try {
    await page.goto(origin + path, { waitUntil: 'networkidle', timeout: 45_000 });
    const main = (await page.locator('main').innerText({ timeout: 15_000 })).replace(/\s+/g, ' ');
    if (!expect.test(main)) problems.push(`expected ${expect} on the page`);
    if (/Not permitted for this session|Request failed|Server dependency unavailable/.test(main)) problems.push('failure notice shown');
    const heading = (await page.locator('main h1, main h2').first().innerText().catch(() => '')).trim();
    await page.screenshot({ path: resolve(out, `${installation}${path.replaceAll('/', '_')}.png`), fullPage: false });
    visits.push({ installation, path, ok: problems.length === 0, heading, problems });
  } catch (error) { visits.push({ installation, path, ok: false, heading: '', problems: [...problems, String(error).slice(0, 300)] }); }
  finally { page.off('pageerror', onError); page.off('response', onResponse); }
}

const h = new HttpFixture();
let vendor: ChildProcess | undefined;
const startedAt = Date.now();
try {
  await h.start();
  const customerReady = (await fetch(`${h.config.origin}/readyz`)).status;
  vendor = await startVendor();
  const vendorReady = (await fetch(`${VENDOR}/readyz`)).status;
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });

  // Customer installation, signed in as the owner.
  const owner = await h.login('owner');
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await ctx.addCookies(owner.headers().cookie.split('; ').map(kv => { const i = kv.indexOf('='); return { name: kv.slice(0, i), value: kv.slice(i + 1), url: h.config.origin }; }));
  const cpage = await ctx.newPage();
  cpage.on('request', r => { const o = new URL(r.url()).origin; if (o !== h.config.origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  for (const [path, expect] of [
    ['/workspace', /Overview|Attention|privacy/i], ['/workspace/plan', /Your plan/], ['/workspace/files', /Files/], ['/workspace/team', /Team/],
    ['/workspace/rights', /request/i], ['/workspace/consent-records', /consent/i], ['/workspace/personal-data-breaches', /breach/i],
    ['/workspace/organisation-intake', /intake/i], ['/workspace/registry-notices', /notice/i], ['/workspace/processors', /processor/i],
    ['/workspace/regulatory', /regulatory|package/i], ['/workspace/audit-trail', /audit/i],
  ] as const) await visit(cpage, 'customer', h.config.origin, path, expect);
  await ctx.close();

  // Vendor service: public pages, then signed in as the vendor administrator.
  const vctx = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  const vpage = await vctx.newPage();
  vpage.on('request', r => { const o = new URL(r.url()).origin; if (o !== VENDOR && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) external.push(r.url()); });
  await visit(vpage, 'vendor', VENDOR, '/vendor/sign-in', /Sign in|sign in/);
  await visit(vpage, 'vendor', VENDOR, '/vendor/account-setup', /Set your password/);
  const journal = JSON.parse(readFileSync(vendorJournal, 'utf8')) as { admin: { email: string; password: string; totp?: string } };
  await vpage.goto(`${VENDOR}/vendor/sign-in`);
  await vpage.getByLabel(/^Email( \*)?$/).fill(journal.admin.email); await vpage.getByLabel(/^Password( \*)?$/).fill(journal.admin.password);
  await vpage.getByRole('button', { name: 'Sign in', exact: true }).click();
  await vpage.getByLabel(/^Authenticator code( \*)?$/).fill(authenticatorCode(journal.admin.totp!));
  await vpage.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await vpage.waitForURL(url => !url.pathname.startsWith('/vendor/sign-in'), { timeout: 30_000 });
  await vpage.waitForLoadState('networkidle');
  writePrivateJson(vendorJournal, journal);
  for (const [path, expect] of [['/vendor/team', /Vendor team/], ['/vendor/organisations', /rganisation/], ['/vendor/engagements', /ngagement/], ['/vendor/licences', /icence/], ['/vendor/practice', /ractice|criteria/i]] as const)
    await visit(vpage, 'vendor', VENDOR, path, expect);
  await vctx.close(); await browser.close();

  const failures = visits.filter(v => !v.ok);
  const result = { recorded_at: new Date().toISOString(), seconds: Math.round((Date.now() - startedAt) / 1000), customer_readyz: customerReady, vendor_readyz: vendorReady, visits, external_requests: external,
    result: customerReady === 200 && vendorReady === 200 && !failures.length && !external.length ? 'PASS' : 'FAIL' };
  writeFileSync(resolve(out, 'start-smoke.json'), JSON.stringify(result, null, 2));
  for (const v of visits) console.log(`${v.ok ? 'PASS' : 'FAIL'} ${v.installation} ${v.path}${v.ok ? '' : ' — ' + v.problems.join('; ')}`);
  console.log(`readyz customer=${customerReady} vendor=${vendorReady}; external requests: ${external.length}; ${visits.length - failures.length}/${visits.length} screens OK -> ${result.result}`);
  if (result.result !== 'PASS') process.exitCode = 1;
} finally {
  await h.stop();
  if (vendor && vendor.exitCode === null) { const closed = once(vendor, 'close'); vendor.kill('SIGTERM'); await closed; }
}
