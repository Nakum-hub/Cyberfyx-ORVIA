// Synthetic local visual evidence. Credentials are read locally, never printed.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { HttpFixture, authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import assert from 'node:assert/strict';
const label = process.argv[2];
if (!['before', 'after', 'demo'].includes(label)) throw new Error('Expected before, after or demo');
const dir = resolve(`output/playwright/round6/${label}`); mkdirSync(dir, { recursive: true });
const h = new HttpFixture();
const vendor = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const command = webProcess({ profile: 'vendor-a00', app_port: PROFILES['vendor-a00'].app_port });
const browser = await chromium.launch({ headless: true });
const child = spawn(process.execPath, command.args, { cwd: command.cwd, env: { ...command.env, ORVIA_PROFILE: 'vendor-a00' }, windowsHide: true, stdio: 'ignore' });
const results: unknown[] = [];
try {
  await h.start();
  for (let i = 0; i < 90; i++) {
    if (child.exitCode !== null) throw new Error('Vendor process exited');
    try { if ((await fetch(vendor + '/readyz')).ok) break; } catch { /* bounded readiness */ }
    await new Promise(r => setTimeout(r, 1000));
  }
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await h.authWindow();
  await page.goto(h.config.origin + '/workspace/sign-in');
  await page.getByLabel('Staff email').fill(h.users.owner!.email);
  await page.getByLabel('Password', { exact: true }).fill(h.users.owner!.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(h.users.owner!.totp_uri!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  for (const [name, path] of [['client-overview', '/workspace'], ['client-list', '/workspace/rights'], ['dpdpa-audit', '/workspace/dpdpa-audit']]) {
    const response = await page.goto(h.config.origin + path); await page.waitForLoadState('networkidle');
    await page.screenshot({ path: resolve(dir, name + '.png'), fullPage: true });
    results.push({ name, path, status: response?.status(), errors: [...errors] });
    if (label === 'after') {
      const activeGroup = page.locator('.nav-group').filter({ has: page.locator('[aria-current="page"]') }).first();
      const toggle = activeGroup.getByRole('button');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      await toggle.focus(); await page.keyboard.press('Enter');
      assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
      const other = page.locator('.nav-group button[aria-expanded="false"]').first();
      await other.focus(); await page.keyboard.press('Enter');
      assert.equal(await page.locator('.nav-group button[aria-expanded="true"]').count(), 2);
      await page.keyboard.press('Enter');
      assert.equal(await page.locator('.nav-group button[aria-expanded="true"]').count(), 1);
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
      await page.locator('.session-details > summary').click();
      await page.getByText('Session and scope identifiers', { exact: true }).click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2));
      await page.locator('.session-details > summary').click();
      await page.screenshot({ path: resolve(dir, name + '-phone.png'), fullPage: true });
      await page.setViewportSize({ width: 1440, height: 1000 });
      results.push({ name, keyboard_group_toggle: 'PASS', current_group_stays_open: 'PASS', phone_overflow: 'PASS' });
    }
  }
  const users = JSON.parse(readFileSync('.local/profiles/vendor-a00/auth/e2e-users.json', 'utf8'));
  await page.goto(vendor + '/vendor/sign-in');
  await page.getByLabel(/^Email( \*)?$/).fill(users.admin.email);
  await page.getByLabel(/^Password( \*)?$/).fill(users.admin.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(/^Authenticator code( \*)?$/).fill(authenticatorCode(users.admin.totp));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(/\/vendor\/engagements/);
  const response = await page.goto(vendor + '/vendor'); await page.waitForLoadState('networkidle');
  await page.screenshot({ path: resolve(dir, 'vendor-overview.png'), fullPage: true });
  results.push({ name: 'vendor-overview', status: response?.status(), errors });
  writeFileSync(resolve(dir, 'results.json'), JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results));
} finally { await browser.close(); await h.stop(); child.kill(); }
