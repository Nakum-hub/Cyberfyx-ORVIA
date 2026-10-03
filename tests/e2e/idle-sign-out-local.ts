// Owner decision 2026-10-03: a session ends after 30 minutes without activity and the person signs in again from the
// branded sign-in page. Under test: the browser clock is moved forward with no input; the interface signs the staff member
// out, returns them to the sign-in page with the inactivity notice, and the server no longer accepts the old session.
// The server's own sliding expiry (SESSION_IDLE_SECONDS) is configuration, read here to keep both limits identical.
import { chromium } from '@playwright/test';
import { HttpFixture } from '../../shared/testing/src/http-fixture.ts';
import { SESSION_IDLE_SECONDS } from '../../shared/contracts/src/index.ts';
import { writeEvidence } from '../../shared/testing/src/evidence.ts';

const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => { results.push({ name, result: ok ? 'PASS' : 'FAIL', ...(ok ? {} : { detail }) }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${detail}`}`); };
const h = new HttpFixture();
try {
  await h.start();
  check('the idle limit is 30 minutes', SESSION_IDLE_SECONDS === 1800, String(SESSION_IDLE_SECONDS));
  const owner = await h.login('owner');
  const cookies = owner.headers().cookie.split('; ').map(kv => { const i = kv.indexOf('='); return { name: kv.slice(0, i), value: kv.slice(i + 1), url: h.config.origin }; });
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  try {
    const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
    await context.addCookies(cookies);
    const page = await context.newPage();
    await page.clock.install();
    await page.goto(`${h.config.origin}/workspace`, { waitUntil: 'networkidle' });
    check('the staff member is in the Workspace', await page.getByRole('heading', { name: 'Privacy control status' }).isVisible());
    await page.clock.fastForward('29:00');
    await page.waitForTimeout(500);
    check('29 minutes without activity still keeps them signed in', new URL(page.url()).pathname === '/workspace');
    await page.mouse.move(200, 200); await page.mouse.move(220, 240);
    await page.clock.fastForward('29:00');
    await page.waitForTimeout(500);
    check('activity restarts the 30 minutes', new URL(page.url()).pathname === '/workspace');
    await page.clock.fastForward('31:00');
    await page.waitForURL(url => url.pathname === '/workspace/sign-in', { timeout: 20_000 }).catch(() => undefined);
    check('after 30 minutes without activity they are back on the sign-in page', new URL(page.url()).pathname === '/workspace/sign-in' && new URL(page.url()).searchParams.get('expired') === '1', page.url());
    await page.clock.fastForward('00:06');
    check('the sign-in page says why', await page.getByText('You were signed out after 30 minutes without activity').isVisible().catch(() => false));
    const after = await fetch(`${h.config.origin}/api/v1/session`, { headers: { cookie: owner.headers().cookie } });
    check('the server no longer accepts the old session', after.status === 401 || after.status === 403, String(after.status));
  } finally { await browser.close(); }
} finally {
  await h.stop();
  const failures = results.filter(r => r.result === 'FAIL').length;
  writeEvidence('idle-sign-out', { results, result: failures ? 'FAIL' : 'PASS' });
  console.log(`\n${results.length} assertions, ${failures} failures.`);
  if (failures) process.exitCode = 1;
}
