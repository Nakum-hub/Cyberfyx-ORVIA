// Sign-in forms cannot lose input before the page is interactive (Codex round 4, WebKit finding).
// WebKit accepted typing into the server-rendered email field before React hydrated; hydration then reset the
// controlled field to empty, native validation blocked the submit and no sign-in request was sent. The fix keeps
// every shared form control, and the submit button of each first-paint form, disabled until hydration.
// This suite forces a slow hydration in Chromium by holding the page's JavaScript chunks, then checks on every
// sign-in page: the email field and submit button are disabled before hydration; once released, typed input
// survives, and submitting sends the sign-in request. Chromium only here; WebKit reruns are Codex's.
// It signs in with a wrong password only; it records nothing. Synthetic data only.
import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { chromium, type Browser } from '@playwright/test';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { webProcess } from '../../scripts/web-process.ts';

const t = operationsSuite('sign-in-hydration');
const { h, check } = t;
const VENDOR = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);

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

async function probe(browser: Browser, origin: string, path: string, name: string) {
  const context = await browser.newContext({ baseURL: origin });
  const page = await context.newPage();
  let release!: () => void; const held = new Promise<void>(r => { release = r; });
  await page.route('**/_next/static/chunks/**', async route => { await held; await route.continue(); });
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const email = page.locator('input[type=email]').first(); const password = page.locator('input[type=password]').first();
  const submit = page.locator('form button[type=submit]').first();
  await email.waitFor({ state: 'attached' });
  check(`${name}: before hydration the email field is disabled`, await email.isDisabled(), true);
  check(`${name}: before hydration the submit button is disabled`, await submit.isDisabled(), true);
  release();
  await page.waitForFunction(() => !(document.querySelector('input[type=email]') as HTMLInputElement | null)?.disabled, undefined, { timeout: 30_000 });
  await email.fill('nobody@example.invalid'); await password.fill('Wrong-password-1');
  await page.waitForTimeout(500);
  check(`${name}: typed input survives hydration`, [await email.inputValue(), (await password.inputValue()).length], ['nobody@example.invalid', 16]);
  const request = page.waitForRequest(r => r.method() === 'POST' && /sign-in/.test(r.url()), { timeout: 15_000 }).then(() => true, () => false);
  await submit.click();
  check(`${name}: submitting sends the sign-in request`, await request, true);
  check(`${name}: the password never appears in the address`, page.url().includes('Wrong-password'), false);
  await context.close();
}

await t.run(async () => {
  const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
  let vendor: ChildProcess | null = null;
  try {
    t.setPhase('customer sign-in pages');
    await probe(browser, h.config.origin, '/workspace/sign-in', 'staff sign-in');
    await probe(browser, h.config.origin, '/privacy/sign-in', 'Data Principal sign-in');
    t.setPhase('vendor sign-in page');
    vendor = await startVendor();
    await probe(browser, VENDOR, '/vendor/sign-in', 'vendor sign-in');
    await probe(browser, VENDOR, '/vendor/sign-in?account=client', 'client account sign-in');
  } finally {
    await browser.close();
    if (vendor) { vendor.kill('SIGTERM'); }
  }
});
