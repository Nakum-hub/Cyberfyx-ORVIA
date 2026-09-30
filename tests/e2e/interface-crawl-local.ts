// Interface crawl: every page of both installations, for every role, in a real
// browser (Chromium), on the synthetic codex-a00 (CUSTOMER_INSTALLATION) and
// vendor-a00 (VENDOR_SERVICE) profiles started from the current build.
//
// For each page and role it records what a person would notice first: a server
// error, a browser error, a failed API call (5xx), crash text, no page heading,
// a page stuck on "Loading", horizontal overflow at desktop and phone width, and
// any request leaving the installation. It follows every sidebar link, opens a
// detail page from each list that has one, clicks every tab of the vendor
// engagement workspace, and saves screenshots for visual inspection.
// It reads only; it records nothing in either installation. Synthetic data only.
import { spawn, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { waitForPageContent } from '../../shared/testing/src/browser-ready.ts';

const t = operationsSuite('interface-crawl');
const { h, check } = t;
const VENDOR = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const shots = resolve('output/playwright/crawl'); mkdirSync(shots, { recursive: true });
const journalPath = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
type VendorUser = { email: string; password: string; totp?: string };
const journal = (existsSync(journalPath) ? JSON.parse(readFileSync(journalPath, 'utf8')) : {}) as Record<string, VendorUser | string | undefined>;
const DESKTOP = { width: 1440, height: 1000 }; const PHONE = { width: 390, height: 844 };

/** Every page route in the application, from the file system (dynamic segments marked). */
function routes(dir = resolve('frontend/src/app'), prefix = ''): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routes(full, `${prefix}/${entry}`));
    else if (entry === 'page.tsx') out.push(prefix || '/');
  }
  return out.sort();
}
const ALL = routes();
const dynamic = (r: string) => r.includes('[');

type Visit = { installation: string; role: string; viewport: string; route: string; url: string; status: number | null; heading: string | null; issues: string[]; api_denied: number; screenshot: string | null };
const visits: Visit[] = [];

function watch(page: Page, origin: string) {
  const state = { errors: [] as string[], failed: [] as string[], external: [] as string[], denied: 0 };
  page.on('pageerror', e => state.errors.push(`pageerror: ${e.message.slice(0, 200)}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) state.errors.push(`console: ${m.text().slice(0, 200)}`); });
  page.on('request', r => { const o = new URL(r.url()).origin; if (o !== origin && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) state.external.push(r.url().slice(0, 120)); });
  page.on('response', r => { const u = new URL(r.url()); if (!u.pathname.startsWith('/api/')) return; if (r.status() >= 500) state.failed.push(`${r.status()} ${r.request().method()} ${u.pathname}`); else if (r.status() === 403) state.denied++; });
  return state;
}
async function newPage(browser: Browser, origin: string, viewport = DESKTOP) {
  const page = await (await browser.newContext({ baseURL: origin, viewport })).newPage();
  return { page, state: watch(page, origin) };
}
/** Visits one page and records what is wrong with it; returns the visit. */
async function visit(p: { page: Page; state: ReturnType<typeof watch> }, installation: string, role: string, route: string, url: string, o: { shot?: boolean; expectStatus?: number; viewport?: string } = {}) {
  const { page, state } = p; const before = { e: state.errors.length, f: state.failed.length, x: state.external.length, d: state.denied };
  let status: number | null = null; const issues: string[] = [];
  try { status = (await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 }))?.status() ?? null; } catch (e) { issues.push(`navigation: ${(e as Error).message.slice(0, 120)}`); }
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => issues.push('network did not settle within 20 s'));
  await waitForPageContent(page).catch(() => issues.push('page content remained loading for 10 s'));
  // Hydration may have started its queries after the first network-idle event.
  await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => issues.push('page reads did not settle within 20 s'));
  await page.waitForTimeout(400);
  const expected = o.expectStatus ?? 200;
  if (status !== null && status !== expected && !(expected === 200 && status === 304)) issues.push(`HTTP ${status} (expected ${expected})`);
  const probe = await page.evaluate(() => {
    const text = document.body?.innerText ?? '';
    const heading = [...document.querySelectorAll('main h1, main h2, h1, h2')].map(h => (h as HTMLElement).innerText.trim()).find(Boolean) ?? null;
    const loadingOnly = /^(loading|reading|opening)/i.test((document.querySelector('main')?.innerText ?? '').trim()) && (document.querySelector('main')?.innerText ?? '').trim().length < 80;
    return { heading, crash: /Application error|Unhandled Runtime Error|Internal Server Error|This page could not be found/.test(text) ? text.slice(0, 120) : null,
      overflow: document.documentElement.scrollWidth - window.innerWidth, loadingOnly };
  }).catch(() => ({ heading: null, crash: 'page could not be evaluated', overflow: 0, loadingOnly: false }));
  if (expected === 200) {
    if (!probe.heading) issues.push('no page heading');
    if (probe.crash) issues.push(`crash text: ${probe.crash}`);
    if (probe.loadingOnly) issues.push('still loading after the network settled');
  }
  if (probe.overflow > 2) issues.push(`horizontal overflow ${probe.overflow}px`);
  issues.push(...state.errors.slice(before.e), ...state.failed.slice(before.f).map(f => `API ${f}`), ...state.external.slice(before.x).map(x => `external request ${x}`));
  let screenshot: string | null = null;
  if (o.shot) { screenshot = `${installation}-${role}-${o.viewport ?? 'desktop'}-${route.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '') || 'root'}.png`; await page.screenshot({ path: resolve(shots, screenshot), fullPage: true }).catch(() => { screenshot = null; }); }
  const v: Visit = { installation, role, viewport: o.viewport ?? 'desktop', route, url, status, heading: probe.heading, issues, api_denied: state.denied - before.d, screenshot };
  visits.push(v);
  return v;
}
const label = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\*)?$`);

async function staffSignIn(browser: Browser, name: string, viewport = DESKTOP) {
  const p = await newPage(browser, h.config.origin, viewport); const user = h.users[name]!;
  await h.authWindow(); await p.page.goto('/workspace/sign-in');
  await p.page.getByLabel('Staff email').fill(user.email); await p.page.getByLabel('Password', { exact: true }).fill(user.password);
  await p.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  if (user.totp_uri) {
    await p.page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri));
    await p.page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  }
  await p.page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor({ timeout: 30000 });
  return p;
}
async function principalSignIn(browser: Browser, name: string) {
  const p = await newPage(browser, h.config.origin); const user = h.users[name]!;
  await h.authWindow(); await p.page.goto('/privacy/sign-in');
  await p.page.getByLabel('Email').fill(user.email); await p.page.getByLabel('Password', { exact: true }).fill(user.password);
  await p.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await p.page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor({ timeout: 30000 });
  return p;
}
async function vendorSignIn(browser: Browser, user: VendorUser, path = '/vendor/sign-in', viewport = DESKTOP) {
  const p = await newPage(browser, VENDOR, viewport);
  await p.page.goto(path);
  await p.page.getByLabel(label('Email')).fill(user.email); await p.page.getByLabel(label('Password')).fill(user.password);
  await p.page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await p.page.getByLabel(label('Authenticator code')).fill(authenticatorCode(user.totp!));
  await p.page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await p.page.waitForURL(/\/vendor\/(engagements|upload)/, { timeout: 30000 });
  return p;
}
async function startVendor() {
  const command = webProcess({ profile: 'vendor-a00', app_port: PROFILES['vendor-a00'].app_port });
  const child: ChildProcess = spawn(process.execPath, command.args, { cwd: command.cwd, stdio: ['ignore', 'ignore', 'pipe'], env: { ...command.env, ORVIA_PROFILE: 'vendor-a00', NEXT_TELEMETRY_DISABLED: '1' } });
  let diagnostics = ''; child.stderr?.on('data', c => { diagnostics += c.toString(); });
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw new Error(`Vendor web process exited: ${diagnostics.slice(-500)}`);
    try { if ((await fetch(`${VENDOR}/readyz`, { signal: AbortSignal.timeout(2000) })).ok) return child; } catch { /* not ready */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  throw new Error('Vendor installation readiness timeout');
}
/** The first link on the current page to a detail of the list route, if any. */
async function detailLink(page: Page, route: string) {
  const base = route.split('/[')[0]!;
  return page.evaluate(b => [...document.querySelectorAll('a[href]')].map(a => (a as HTMLAnchorElement).getAttribute('href')!)
    .find(href => href.startsWith(`${b}/`) && /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(href)) ?? null, base);
}
// A crawl must visit everything, so each finding is collected (and printed) instead of stopping the run; one check at the end fails
// the suite if anything was found.
const findings: string[] = [];
function soft(name: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify({ expected, actual }).slice(0, 400)}`}`);
  if (!ok) findings.push(name);
}
function record(name: string, v: Visit) { soft(name, v.issues, []); }

await t.run(async () => {
  const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
  let vendorProcess: ChildProcess | null = null;
  try {
    const customerStatic = ALL.filter(r => r.startsWith('/workspace') && !dynamic(r) && r !== '/workspace/sign-in');
    const customerDynamic = ALL.filter(r => r.startsWith('/workspace') && dynamic(r));

    // ---------------------------------------------------------------- customer: signed out
    t.setPhase('customer installation, signed out');
    const anon = await newPage(browser, h.config.origin);
    for (const r of ['/workspace/sign-in', '/privacy/sign-in', '/setup', '/supplier', '/privacy']) record(`signed out: ${r} renders`, await visit(anon, 'customer', 'signed-out', r, r, { shot: true }));
    record('signed out: an unknown page is a 404', await visit(anon, 'customer', 'signed-out', '/no-such-page', '/no-such-page', { expectStatus: 404 }));
    record('signed out: vendor pages are 404 on a customer installation', await visit(anon, 'customer', 'signed-out', '/vendor', '/vendor', { expectStatus: 404 }));
    await anon.page.context().close();

    // ---------------------------------------------------------------- customer: each staff role, every page
    for (const role of ['owner', 'admin', 'auditor', 'member']) {
      t.setPhase(`customer workspace as ${role}`);
      const p = await staffSignIn(browser, role);
      for (const r of customerStatic) {
        const v = await visit(p, 'customer', role, r, r, { shot: role === 'owner' });
        record(`${role}: ${r}`, v);
        if (role === 'owner') for (const d of customerDynamic.filter(x => x.split('/[')[0] === r)) {
          const link = await detailLink(p.page, d);
          if (link) record(`${role}: ${d} (${link.split('/').at(-1)!.slice(0, 8)})`, await visit(p, 'customer', role, d, link, { shot: true }));
          else visits.push({ installation: 'customer', role, viewport: 'desktop', route: d, url: '(no record listed)', status: null, heading: null, issues: [], api_denied: 0, screenshot: null });
        }
      }
      if (role === 'owner') {
        // Every sidebar link resolves to a page that exists.
        await p.page.goto('/workspace'); await p.page.waitForLoadState('networkidle');
        const links = await p.page.evaluate(() => [...document.querySelectorAll('nav a[href]')].map(a => (a as HTMLAnchorElement).getAttribute('href')!).filter(h => h.startsWith('/')));
        const unknown = [...new Set(links)].filter(l => !ALL.includes(l.split('?')[0]!) && !ALL.some(r => dynamic(r) && new RegExp(`^${r.replace(/\[[^\]]+\]/g, '[^/]+')}$`).test(l)));
        soft('every sidebar link points to an existing page', unknown, []);
        soft('the sidebar lists pages', links.length > 20, true);
      }
      await p.page.context().close();
    }

    // ---------------------------------------------------------------- customer: phone width
    t.setPhase('customer workspace at phone width');
    const phone = await staffSignIn(browser, 'owner', PHONE);
    for (const r of customerStatic) record(`owner at phone width: ${r}`, await visit(phone, 'customer', 'owner', r, r, { shot: true, viewport: 'phone' }));
    await phone.page.context().close();

    // ---------------------------------------------------------------- customer: Data Principal portal
    t.setPhase('Data Principal portal');
    const alice = await principalSignIn(browser, 'alice');
    for (const r of ALL.filter(x => x.startsWith('/privacy') && !dynamic(x) && x !== '/privacy/sign-in')) {
      record(`principal: ${r}`, await visit(alice, 'customer', 'principal', r, r, { shot: true }));
      if (r === '/privacy/receipts') { const link = await detailLink(alice.page, '/privacy/receipt/[id]'); if (link) record('principal: /privacy/receipt/[id]', await visit(alice, 'customer', 'principal', '/privacy/receipt/[id]', link, { shot: true })); }
    }
    await alice.page.context().close();

    // ---------------------------------------------------------------- vendor installation
    t.setPhase('vendor installation');
    vendorProcess = await startVendor();
    const vanon = await newPage(browser, VENDOR);
    for (const r of ['/vendor/sign-in', '/vendor/setup']) record(`vendor signed out: ${r} renders`, await visit(vanon, 'vendor', 'signed-out', r, r, { shot: true }));
    record('vendor signed out: the client workspace is 404 on the vendor installation', await visit(vanon, 'vendor', 'signed-out', '/workspace', '/workspace', { expectStatus: 404 }));
    await vanon.page.context().close();
    const vendorStatic = ALL.filter(r => r.startsWith('/vendor') && !dynamic(r) && !['/vendor/sign-in', '/vendor/setup'].includes(r));
    const people = (['admin', 'lead', 'reviewer', 'owner'] as const).filter(k => typeof journal[k] === 'object' && (journal[k] as VendorUser).totp);
    soft('vendor users from the browser journeys are available for the crawl', people.length >= 3, true);
    let engagementUrl: string | null = null;
    for (const role of people) {
      const p = await vendorSignIn(browser, journal[role] as VendorUser);
      for (const r of vendorStatic) {
        const v = await visit(p, 'vendor', role, r, r, { shot: role === 'lead' || role === 'admin' });
        record(`vendor ${role}: ${r}`, v);
        if (r === '/vendor/organisations' && role === 'admin') { const link = await detailLink(p.page, '/vendor/organisations/[id]'); if (link) record('vendor admin: /vendor/organisations/[id]', await visit(p, 'vendor', role, '/vendor/organisations/[id]', link, { shot: true })); }
      }
      // The engagement workspace: the most recent accepted engagement the person can open, every tab.
      await p.page.goto('/vendor/engagements'); await p.page.waitForLoadState('networkidle');
      // Engagements open from their reference link; the first one that shows an accepted workspace is used.
      const links = await p.page.evaluate(() => [...document.querySelectorAll('a[href^="/vendor/engagements/"]')].map(a => (a as HTMLAnchorElement).getAttribute('href')!));
      let opened = false;
      for (const href of links.slice(0, 12)) {
        await p.page.goto(href); await p.page.waitForLoadState('networkidle');
        if (await p.page.getByRole('tablist', { name: 'Engagement workspace' }).count() && await p.page.getByText(/Accepted\./).count()) { opened = true; break; }
      }
      if (!opened) { soft(`vendor ${role}: an accepted engagement is available to open`, role === 'admin' ? 'skipped for administrators' : 'none found', role === 'admin' ? 'skipped for administrators' : 'found'); await p.page.context().close(); continue; }
      engagementUrl = p.page.url();
      const tabs = await p.page.getByRole('tab').allInnerTexts();
      soft(`vendor ${role}: the engagement workspace has nine tabs`, tabs.map(x => x.replace(/\s*\d+$/, '').trim()), ['Overview', 'Scope and applicability', 'Plan', 'Requests', 'Evidence', 'Tests and working papers', 'Findings and actions', 'Report', 'Follow-up']);
      for (let i = 0; i < tabs.length; i++) {
        const name = tabs[i]!.replace(/\s*\d+$/, '').trim();
        const before = { e: p.state.errors.length, f: p.state.failed.length };
        await p.page.getByRole('tab').nth(i).click(); await p.page.waitForLoadState('networkidle'); await p.page.waitForTimeout(400);
        const selected = await p.page.getByRole('tab', { selected: true }).innerText();
        const overflow = await p.page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        const shot = `vendor-${role}-tab-${name.replace(/[^a-z0-9]+/gi, '_')}.png`;
        await p.page.screenshot({ path: resolve(shots, shot), fullPage: true });
        const issues = [...(selected.replace(/\s*\d+$/, '').trim() === name ? [] : [`tab did not select (${selected})`]), ...(overflow > 2 ? [`horizontal overflow ${overflow}px`] : []),
          ...p.state.errors.slice(before.e), ...p.state.failed.slice(before.f).map(f => `API ${f}`)];
        visits.push({ installation: 'vendor', role, viewport: 'desktop', route: `/vendor/engagements/[id]#${name}`, url: p.page.url(), status: 200, heading: name, issues, api_denied: 0, screenshot: shot });
        soft(`vendor ${role}: workspace tab "${name}"`, issues, []);
      }
      // Keyboard: arrow keys move between tabs.
      await p.page.getByRole('tab').first().focus(); await p.page.keyboard.press('ArrowRight');
      soft(`vendor ${role}: arrow keys move between workspace tabs`, (await p.page.getByRole('tab', { selected: true }).innerText()).replace(/\s*\d+$/, '').trim(), 'Scope and applicability');
      await p.page.context().close();
    }
    if (typeof journal.uploader === 'object') {
      const up = await vendorSignIn(browser, journal.uploader as VendorUser, '/vendor/sign-in?account=client');
      record('client account: /vendor/upload', await visit(up, 'vendor', 'client-account', '/vendor/upload', '/vendor/upload', { shot: true }));
      record('client account: the vendor area is refused, not broken', await visit(up, 'vendor', 'client-account', '/vendor/engagements', '/vendor/engagements', { shot: true }));
      await up.page.context().close();
    }
    t.setPhase('vendor installation at phone width');
    const lead = typeof journal.lead === 'object' ? journal.lead as VendorUser : null;
    if (lead) {
      const vp = await vendorSignIn(browser, lead, '/vendor/sign-in', PHONE);
      for (const r of vendorStatic) record(`vendor lead at phone width: ${r}`, await visit(vp, 'vendor', 'lead', r, r, { shot: true, viewport: 'phone' }));
      if (engagementUrl) record('vendor lead at phone width: engagement workspace', await visit(vp, 'vendor', 'lead', '/vendor/engagements/[id]', engagementUrl, { shot: true, viewport: 'phone' }));
      await vp.page.context().close();
    }
  } finally {
    await browser.close();
    if (vendorProcess && vendorProcess.exitCode === null) { const closed = once(vendorProcess, 'close'); vendorProcess.kill(); await closed; }
    const withIssues = visits.filter(v => v.issues.length);
    mkdirSync('handoffs/code/artifacts', { recursive: true });
    writeFileSync(`handoffs/code/artifacts/interface-crawl-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ suite: 'interface-crawl', routes: ALL, visits: visits.length, pages_with_issues: withIssues.length,
      unvisited_detail_routes: visits.filter(v => v.url === '(no record listed)').map(v => v.route), issues: withIssues.map(v => ({ installation: v.installation, role: v.role, viewport: v.viewport, route: v.route, issues: v.issues })), visits_detail: visits }, null, 2));
    console.log(`\ninterface crawl: ${visits.length} visits, ${withIssues.length} with issues`);
    for (const v of withIssues.slice(0, 80)) console.log(`  [${v.installation} ${v.role} ${v.viewport}] ${v.route}: ${v.issues.join(' | ').slice(0, 300)}`);
    check('the crawl found nothing wrong on any page, tab or link', findings, []);
  }
});
