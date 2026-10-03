// EX01 contact preferences, driven through the real workspace and privacy
// centre in a real browser on the synthetic codex-a00 profile. Staff add a topic
// on screen; the person says yes and then no on screen; staff look the person up;
// results are read back through the API. Synthetic fixtures only.
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chromium, type Browser, type Locator } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const t = operationsSuite('preferences-browser');
const { h, check, ok } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const errors: string[] = []; const external: string[] = [];
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const field = (f: Locator, label: string) => f.getByLabel(new RegExp(`^${escape(label)}( \\*)?$`));

async function page(browser: Browser) {
  const p = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1280, height: 900 } })).newPage();
  p.on('pageerror', e => errors.push(e.message));
  p.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  p.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });
  return p;
}

await t.run(async () => {
  const api = await h.login('admin');
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    t.setPhase('staff add a topic on screen');
    const admin = await page(browser);
    const user = h.users.admin!;
    await h.authWindow();
    await admin.goto('/workspace/sign-in');
    await admin.getByLabel('Staff email').fill(user.email);
    await admin.getByLabel('Password', { exact: true }).fill(user.password);
    await admin.getByRole('button', { name: 'Sign in', exact: true }).click();
    await admin.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
    await admin.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
    await admin.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await admin.goto('/workspace/contact-preferences');
    await admin.getByRole('heading', { name: 'Contact preferences', exact: true }).first().waitFor();
    const suffix = randomUUID().slice(0, 8);
    const name = `Browser news ${suffix}`;
    const f = admin.getByRole('form', { name: 'Add a topic' });
    await field(f, 'Code').fill(`browser_news_${suffix}`);
    await field(f, 'Name').fill(name);
    await field(f, 'Description shown to people').fill('Synthetic news for the browser journey.');
    await f.getByLabel('Email').check(); await f.getByLabel('Text message').check();
    const created = admin.waitForResponse(r => new URL(r.url()).pathname === '/api/v1/admin/preference-topics' && r.request().method() === 'POST');
    await f.getByRole('button', { name: 'Add a topic', exact: true }).click();
    const topic = S.schemas.PreferenceTopic.parse(await (await created).json());
    check('the topic is created on screen with the chosen channels', [topic.name, topic.channels, topic.state], [name, ['EMAIL', 'SMS'], 'ACTIVE']);
    await admin.getByRole('table', { name: 'Preference topics' }).getByText(name).waitFor();

    t.setPhase('the person\'s yes then no arrive from the organisation');
    // Owner decision 2026-10-03: Data Principals never sign in to ORVIA. Their choices reach it from the organisation's side;
    // until a contact-preference intake route exists, the remaining backend preference API carries them here.
    const person = await h.login('alice');
    const choose = (choice: 'OPTED_IN' | 'OPTED_OUT') => person.call('/api/v1/portal/me/preferences', { topic_id: topic.id, channel: 'EMAIL', choice, observed_at: new Date().toISOString() }, { 'idempotency-key': randomUUID() });
    check('saying yes is recorded', (await choose('OPTED_IN')).status, 201);
    check('saying no is recorded', (await choose('OPTED_OUT')).status, 201);

    t.setPhase('staff look the person up');
    await admin.getByLabel('Principal id').fill(h.users.alice!.principal_id!);
    await admin.getByRole('button', { name: 'Show preferences', exact: true }).click();
    await admin.getByRole('table', { name: `Channels for ${name}` }).getByRole('row').filter({ hasText: 'Email' }).getByText('Not contacted (you said no)').waitFor();
    check('staff see no change controls for the person\'s choices', await admin.getByRole('button', { name: `Yes to ${name} by Email` }).count(), 0);
    const decision = await ok(api.call(`/api/v1/admin/preference-decisions?principal_id=${h.users.alice!.principal_id}&topic_id=${topic.id}&channel=EMAIL`), S.schemas.PreferenceDecision);
    check('the API decision matches the screen', [decision.permitted, decision.reason], [false, 'OPTED_OUT']);

    check('no request left the local origin', external, []);
    check('no page or console error occurred', errors, []);
  } finally { await browser.close(); }
});
