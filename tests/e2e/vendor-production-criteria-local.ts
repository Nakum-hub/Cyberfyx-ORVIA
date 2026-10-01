// Recording production criteria through the vendor Audit practice screen in a real browser (vendor-a00 VENDOR_SERVICE,
// vendor contract 0.5.0). The lead auditor uploads a TEST_FIXTURE package and is refused with a visible alert and no new row;
// uploads a package signed with a key that is not this vendor's release key and is refused; then uploads a PRODUCTION-shaped
// package signed with this vendor's release key, which appears as Production and awaiting a different approver (no Approve
// button for the uploader); a different reviewer approves it on the same screen. The activation gate itself is NOT recorded,
// so real engagements stay refused on this development installation.
// The package content is synthetic (release notes say so); it only has the shape of an official package. This writes one
// unapproved-then-approved synthetic PRODUCTION criteria version into the vendor-a00 development database, never a gate.
import { spawn, type ChildProcess } from 'node:child_process';
import { generateKeyPairSync, randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { webProcess } from '../../scripts/web-process.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';
import { vendorSigningKey } from '../../scripts/credentials.ts';
import { fixturePackage, signFixture } from '../../shared/testing/src/regulatory-fixture.ts';

const VENDOR = `http://127.0.0.1:${PROFILES['vendor-a00'].app_port}`;
const t = operationsSuite('vendor-production-criteria-browser');
const { check } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const journalPath = resolve('.local/profiles/vendor-a00/auth/e2e-users.json');
type User = { email: string; password: string; totp?: string };
const journal = JSON.parse(readFileSync(journalPath, 'utf8')) as { admin: User; lead: User; reviewer: User };
const errors: string[] = []; const external: string[] = [];
const label = (text: string) => new RegExp(`^${text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}( \\*)?$`);

async function context(browser: Browser) {
  const page = await (await browser.newContext({ baseURL: VENDOR, viewport: { width: 1440, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  page.on('request', r => { if (new URL(r.url()).origin !== VENDOR) external.push(r.url()); });
  return page;
}
async function vendorSignIn(page: Page, user: User) {
  await page.goto('/vendor/sign-in');
  await page.getByLabel(label('Email')).fill(user.email); await page.getByLabel(label('Password')).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel(label('Authenticator code')).fill(authenticatorCode(user.totp!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.waitForURL(/\/vendor\/(engagements|upload)/);
  writePrivateJson(journalPath, journal);
}
async function stopVendor(child: ChildProcess) {
  if (!child.pid || child.exitCode !== null || child.signalCode !== null) return;
  const closed = once(child, 'close');
  child.kill('SIGTERM');
  await closed;
}
async function startVendor() {
  const command = webProcess({ profile: 'vendor-a00', app_port: PROFILES['vendor-a00'].app_port });
  const child: ChildProcess = spawn(process.execPath, command.args, { cwd: command.cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: { ...command.env, ORVIA_PROFILE: 'vendor-a00', NEXT_TELEMETRY_DISABLED: '1' } });
  let diagnostics = ''; child.stderr?.on('data', c => { diagnostics += c.toString(); });
  let spawnError: Error | undefined;
  child.once('error', error => { spawnError = error; });
  try {
    for (let i = 0; i < 120; i++) {
      if (spawnError) throw new Error('Vendor web process failed to start', { cause: spawnError });
      if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Vendor web process exited: ${diagnostics.slice(-500)}`);
      try { if ((await fetch(`${VENDOR}/readyz`, { signal: AbortSignal.timeout(2000) })).ok) return child; } catch { /* starting */ }
      await new Promise(r => setTimeout(r, 500));
    }
    throw new Error('Vendor installation readiness timeout');
  } catch (error) {
    await stopVendor(child);
    throw error;
  }
}

const dir = mkdtempSync(join(tmpdir(), 'orvia-criteria-'));
const release = vendorSigningKey('release');
const today = new Date().toISOString().slice(0, 10);
const version = `9.${Math.floor(Math.random() * 1e6)}.0`;
const claims = fixturePackage({ version, previous_version: null, effective_from: new Date().toISOString(), requirement_effective_from: today });
const production = { ...claims, distribution: 'PRODUCTION' as const, release_notes: ['SYNTHETIC production-shaped package for automated browser validation only.'],
  open_verification_items: ['Approver re-downloads each source and confirms its digest (synthetic).'],
  sources: claims.sources.map((src, i) => ({ ...src, official_url: `https://www.meity.gov.in/static/uploads/synthetic-${i}.pdf`, artifact_digest: 'a'.repeat(64), retrieved_at: new Date().toISOString(), verification: 'ARTIFACT_HASHED' as const })) };
const stranger = generateKeyPairSync('ed25519').privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64');
const file = (name: string, value: unknown) => { const path = join(dir, name); writeFileSync(path, JSON.stringify(value)); return path; };
const fixtureFile = file('fixture.json', signFixture(claims, release.key_id, release.private));
const strangerFile = file('stranger.json', signFixture(production as unknown as typeof claims, randomUUID(), stranger));
const productionFile = file('production.json', signFixture(production as unknown as typeof claims, release.key_id, release.private));

const vendor = await startVendor();
try {
  await t.run(async () => {
    const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
    try {
      const lead = await context(browser); await vendorSignIn(lead, journal.lead);
      await lead.goto('/vendor/practice'); await lead.getByRole('heading', { name: 'Audit practice' }).waitFor();
      const form = lead.getByRole('form', { name: 'Record production criteria' });
      const table = lead.getByRole('table', { name: 'Criteria versions' });
      const upload = async (path: string) => {
        await form.locator('input[type="file"]').setInputFiles(path);
        const response = lead.waitForResponse(r => new URL(r.url()).pathname.endsWith('/practice/criteria/production'));
        await form.getByRole('button', { name: 'Record production criteria' }).click();
        return (await response).status();
      };

      t.setPhase('refusals');
      const alert = lead.locator('.notice-stop[role="alert"]');
      check('a TEST_FIXTURE package is refused', await upload(fixtureFile), 409);
      check('the screen says it is not a production package', (await alert.textContent())?.includes('not a production package'), true);
      check('a package signed with another key is refused', await upload(strangerFile), 409);
      await alert.filter({ hasText: 'not signed with this vendor release key' }).waitFor();
      check('the screen says the package is not signed with this vendor\'s release key', await alert.filter({ hasText: 'not signed with this vendor release key' }).count(), 1);
      check('no criteria row appears for a refused package', await table.getByRole('row').filter({ hasText: version }).count(), 0);

      t.setPhase('record');
      check('the signed production package is recorded', await upload(productionFile), 200);
      await lead.getByRole('status').filter({ hasText: 'Production criteria recorded. A different reviewer must approve them' }).waitFor();
      const leadRow = table.getByRole('row').filter({ hasText: version });
      await leadRow.waitFor();
      check('the row shows Production and waits for a different approver', [await leadRow.getByText(/production/i).count() > 0, await leadRow.getByText('Awaiting a different approver').count(), await leadRow.getByRole('button', { name: 'Approve' }).count()], [true, 1, 0]);

      t.setPhase('a different reviewer approves');
      const reviewer = await context(browser); await vendorSignIn(reviewer, journal.reviewer);
      await reviewer.goto('/vendor/practice'); await reviewer.getByRole('heading', { name: 'Audit practice' }).waitFor();
      const reviewerRow = reviewer.getByRole('table', { name: 'Criteria versions' }).getByRole('row').filter({ hasText: version });
      await reviewerRow.getByRole('button', { name: 'Approve' }).click();
      await reviewer.getByRole('status').filter({ hasText: 'Criteria approved.' }).waitFor();
      await reviewerRow.getByText(/^Approved \d{4}-\d{2}-\d{2}$/).waitFor();
      check('the reviewer approves it on the same screen', await reviewerRow.getByText(/^Approved/).count(), 1);
      check('the production-criteria gate is still not recorded (real engagements stay refused here)', await reviewer.getByText('Refused until every gate below is recorded').count(), 1);

      t.setPhase('page hygiene');
      check('no page errors on the practice screen', errors, []);
      check('no request left the vendor origin', external, []);
    } finally { await browser.close(); }
  });
} finally { await stopVendor(vendor); }
