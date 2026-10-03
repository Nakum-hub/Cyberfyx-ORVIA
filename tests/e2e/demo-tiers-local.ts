// Tier-based access, two organisations on the running rehearsal installation (owner request 2026-10-03, revision 1.11).
// Set up with: npm run demo:tier -- birch 1   and   npm run demo:tier -- aster 3
// For each organisation, signed in through the branded page: the plan page states the tier; the navigation marks every
// module the plan does not include; the server refuses new work in a module outside the plan (entitlement_required) while
// recorded data stays readable; work inside the plan passes the plan check; protective DPDP controls are never gated.
// Writes are probed with an empty body, so the plan check is observed without recording anything.
import { X509Certificate, createHash, randomUUID } from 'node:crypto';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { writeEvidence } from '../../shared/testing/src/evidence.ts';
import { guardAuthWindow } from '../../shared/testing/src/auth-window.ts';
import { ENTITLEMENTS, classifyRoute, routes } from '../../shared/contracts/src/index.ts';
import { example } from '../../shared/contracts/src/examples.ts';

process.env.ORVIA_PROFILE ??= 'rehearsal';
const ORIGIN = 'https://127.0.0.1:4330';
const dir = resolve('.local/profiles/rehearsal');
const users = JSON.parse(readFileSync(resolve(dir, 'auth/bootstrap.json'), 'utf8')).users as Record<string, { email: string; password: string; totp_uri: string }>;
const spki = createHash('sha256').update(new X509Certificate(readFileSync(resolve(dir, 'tls/server-cert.pem'))).publicKey.export({ type: 'spki', format: 'der' })).digest('base64');
const shots = resolve('output/playwright/demo-tiers'); mkdirSync(shots, { recursive: true });
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => { results.push({ name, result: ok ? 'PASS' : 'FAIL', ...(ok ? {} : { detail: detail.slice(0, 300) }) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  (${detail.slice(0, 300)})`}`); };

// One write route per tier, chosen from the contract itself: a plain admin POST without path parameters.
const writeFor = (tier: string) => routes.find(r => r.method === 'post' && r.authority === 'STAFF' && !r.path.includes('{') && (() => { const c = classifyRoute(r); return c && c in ENTITLEMENTS && ENTITLEMENTS[c as keyof typeof ENTITLEMENTS].tier === tier; })())!;
const foundationWrite = writeFor('FOUNDATION'); const controlWrite = writeFor('CONTROL'); const enterpriseWrite = writeFor('ENTERPRISE');
// A valid body (the contract's own example) for routes the plan must refuse, so the refusal is the plan's and nothing is recorded.
const probe = (page: Page, path: string, body: unknown = {}) => page.evaluate(async ([p, b]) => { const r = await fetch(p as string, { method: 'POST', credentials: 'same-origin', headers: { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify(b) });
  const body = await r.json().catch(() => ({})) as { error?: { field_errors?: { code: string }[] } }; return { status: r.status, codes: (body.error?.field_errors ?? []).map(e => e.code) }; }, [path, body] as const);

async function signIn(page: Page, name: string) {
  const u = users[name]!; await guardAuthWindow(4);
  await page.goto(`${ORIGIN}/workspace/sign-in`);
  await page.getByLabel('Email', { exact: true }).fill(u.email); await page.getByLabel('Password', { exact: true }).fill(u.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(u.totp_uri));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(url => url.pathname === '/workspace', { timeout: 30_000 });
}

const browser = await chromium.launch({ executablePath, args: [`--ignore-certificate-errors-spki-list=${spki}`] });
try {
  for (const [org, user, edition] of [['Birch', 'birch', 'FOUNDATION'], ['Aster', 'owner', 'ENTERPRISE']] as const) {
    const page = await (await browser.newContext({ viewport: { width: 1440, height: 1000 } })).newPage();
    await signIn(page, user);
    const plan = await page.evaluate(async () => (await fetch('/api/v1/admin/plan', { credentials: 'same-origin' })).json()) as { edition: string; usable: string[] };
    check(`${org}: the installation enforces ${edition} for this organisation`, plan.edition === edition, plan.edition);
    await page.goto(`${ORIGIN}/workspace/plan`); await page.waitForLoadState('networkidle').catch(() => undefined);
    const planText = (await page.locator('main').innerText()).replace(/\s+/g, ' ');
    await page.screenshot({ path: resolve(shots, `${org.toLowerCase()}-plan.png`), fullPage: true });
    check(`${org}: "Your plan" shows the tier`, new RegExp(edition === 'FOUNDATION' ? 'Foundation' : 'Enterprise').test(planText), planText.slice(0, 200));
    // Every navigation item, including those in collapsed groups (textContent reads hidden items too).
    const nav = ((await page.locator('nav').first().textContent()) ?? '').replace(/\s+/g, ' ');
    await page.screenshot({ path: resolve(shots, `${org.toLowerCase()}-navigation.png`), fullPage: true });
    const marked = (nav.match(/ · (Control|Enterprise)/g) ?? []).length;
    if (edition === 'FOUNDATION') check('Birch: the navigation marks the modules outside Tier 1 (Control / Enterprise)', marked >= 5, `${marked} marked`);
    else check('Aster: nothing in the navigation is marked as outside the plan', marked === 0, `${marked} marked`);
    const f = await probe(page, foundationWrite.path);
    const c = edition === 'FOUNDATION' ? await probe(page, controlWrite.path, example(controlWrite.request!)) : null;
    const e = edition === 'FOUNDATION' ? await probe(page, enterpriseWrite.path, example(enterpriseWrite.request!)) : null;
    check(`${org}: Tier 1 work (${foundationWrite.id}) passes the plan check`, f.status !== 403 || !f.codes.includes('entitlement_required'), JSON.stringify(f));
    if (edition === 'FOUNDATION') {
      check(`Birch: Tier 2 work (${controlWrite.id}) is refused by the server: not in the plan`, c!.status === 403 && c!.codes.includes('entitlement_required'), JSON.stringify(c));
      check(`Birch: Tier 3 work (${enterpriseWrite.id}) is refused by the server: not in the plan`, e!.status === 403 && e!.codes.includes('entitlement_required'), JSON.stringify(e));
      const read = await page.evaluate(async () => (await fetch('/api/v1/admin/assessments?limit=1', { credentials: 'same-origin' })).status);
      check('Birch: what is already recorded in a locked module stays readable', read === 200, String(read));
      const protective = routes.find(r => r.method === 'post' && classifyRoute(r) === 'PROTECTIVE' && r.authority === 'STAFF' && !r.path.includes('{'));
      if (protective) { const p = await probe(page, protective.path); check(`Birch: a protective control (${protective.id}) is never gated by the plan`, !p.codes.includes('entitlement_required'), JSON.stringify(p)); }
    } else {
      const all = Object.keys(ENTITLEMENTS).every(code => plan.usable.includes(code));
      check('Aster: every Tier 1, 2 and 3 feature is usable', all, `${plan.usable.length} usable`);
      // Desktop fit (owner request 2026-10-03): the window does not scroll, the content pane does, and the "On this page"
      // tabs under the heading jump to a section and stay visible.
      await page.goto(`${ORIGIN}/workspace/records-of-processing`);
      const tabs = page.getByRole('navigation', { name: 'On this page' });
      await tabs.getByRole('button', { name: 'Exports', exact: true }).waitFor({ timeout: 20_000 });
      await tabs.getByRole('button', { name: 'Exports', exact: true }).click();
      await page.waitForTimeout(1200);
      const fit = await page.evaluate(() => { const m = document.getElementById('main')!; const t = document.querySelector('.section-tabs')!.getBoundingClientRect(); const e = document.querySelector('section[aria-label="Exports"]')!.getBoundingClientRect();
        return { windowScrolls: document.documentElement.scrollHeight > window.innerHeight + 1, paneTop: m.scrollTop, tabsTop: Math.round(t.top - m.getBoundingClientRect().top), exportsTop: Math.round(e.top - t.bottom), visible: e.top < m.getBoundingClientRect().bottom - 40 }; });
      await page.screenshot({ path: resolve(shots, 'desktop-fit-tabs.png') });
      check('Desktop fit: the window itself does not scroll; the content pane does', !fit.windowScrolls && fit.paneTop > 0, JSON.stringify(fit));
      check('Desktop fit: a tab brings its section under the sticky tab bar', fit.tabsTop <= 2 && fit.tabsTop >= -2 && fit.exportsTop >= -4 && fit.visible, JSON.stringify(fit));
    }
    await page.context().close();
  }
} finally {
  await browser.close();
  const failures = results.filter(r => r.result === 'FAIL').length;
  writeEvidence('demo-tiers', { results, result: failures ? 'FAIL' : 'PASS', run: randomUUID() });
  console.log(`\n${results.length} assertions, ${failures} failures. Screenshots: output/playwright/demo-tiers/`);
  if (failures) process.exitCode = 1;
}
