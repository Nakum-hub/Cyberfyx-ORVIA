// Focused reproduction of the three round-3 observations. Same settle budget as the crawl.
import { chromium } from '@playwright/test';
import { writeFileSync } from 'node:fs';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';

const t = operationsSuite('round-four-crawl-observations');
const { h } = t;
const results: unknown[] = [];
await t.run(async () => {
  const browser = await chromium.launch({ headless: true, ...(process.env.ORVIA_CHROMIUM_PATH ? { executablePath: process.env.ORVIA_CHROMIUM_PATH } : {}) });
  try {
    for (const [role, route] of [
      ['admin', '/workspace/installed-versions'], ['auditor', '/workspace/assessments'], ['auditor', '/workspace/audit-coverage'],
      // Also retain idle-host controls for new owner-route failures in the traced full crawl.
      ['owner', '/workspace/evidence'], ['owner', '/workspace/installed-versions'], ['owner', '/workspace/operations-runs'],
      ['owner', '/workspace/preflight'], ['owner', '/workspace/processor-engagements'], ['owner', '/workspace/support-cases'], ['owner', '/workspace/updates'],
      ['member', '/workspace/failures'],
    ] as const) {
      const page = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1440, height: 1000 } })).newPage();
      const user = h.users[role]!;
      await h.authWindow();
      await page.goto('/workspace/sign-in');
      await page.getByLabel('Staff email').fill(user.email);
      await page.getByLabel('Password', { exact: true }).fill(user.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      if (user.totp_uri) {
        await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri));
        await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
      }
      await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor({ timeout: 30000 });
      const issues: string[] = [];
      const session: { status: number; method: string }[] = [];
      page.on('response', r => {
        if (new URL(r.url()).pathname === '/api/v1/session') session.push({ status: r.status(), method: r.request().method() });
        if (new URL(r.url()).pathname.startsWith('/api/') && r.status() >= 500) issues.push(`API ${r.status()} ${new URL(r.url()).pathname}`);
      });
      page.on('pageerror', e => issues.push(e.message));
      const response = await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForLoadState('networkidle', { timeout: 20000 }).catch(() => issues.push('network did not settle within 20 s'));
      await page.waitForTimeout(400);
      const probe = await page.evaluate(() => {
        const text = (document.querySelector('main')?.textContent ?? '').trim();
        return { heading: document.querySelector('main h1, main h2, h1, h2')?.textContent?.trim(), loadingOnly: /^(loading|reading|opening)/i.test(text) && text.length < 80 };
      });
      if (response?.status() !== 200) issues.push(`HTTP ${response?.status()}`);
      if (!probe.heading) issues.push('no page heading');
      if (probe.loadingOnly) issues.push('still loading after the network settled');
      results.push({ role, route, status: response?.status(), ...probe, session, issues });
      await page.context().close();
    }
    writeFileSync(`handoffs/codex/artifacts/R4-${process.env.R4_RUN_LABEL}-crawl-observations.json`, JSON.stringify(results, null, 2) + '\n');
    for (const result of results as { role: string; route: string; issues: string[] }[]) t.check(`${result.role} ${result.route} settles without API/server errors`, result.issues, []);
  } finally { await browser.close(); }
});
