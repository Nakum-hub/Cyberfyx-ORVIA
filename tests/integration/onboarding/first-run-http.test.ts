// First-run setup through the real HTTP boundary on an installation that is
// already set up (the shared profile has owners): the state reads COMPLETED,
// setup is refused, credentials and foreign origins are refused, malformed input
// is rejected, and the setup page tells the visitor to sign in instead.
import { existsSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { operationsSuite } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('first-run-http');
const { h, check, codes } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const body = { setup_code: 'ABCDE-FGHJK-LMNPQ-RSTUV', organisation_name: 'Synthetic takeover', owner: { name: 'Intruder', email: 'intruder@customer.example', password: 'x'.repeat(20) }, admin: { name: 'Helper', email: 'helper@customer.example', password: 'y'.repeat(20) } };
const post = (payload: unknown, headers: Record<string, string> = {}) => fetch(h.config.origin + '/api/v1/setup', { method: 'POST', headers: { 'content-type': 'application/json', origin: h.config.origin, ...headers }, body: JSON.stringify(payload) });

await t.run(async () => {
  const state = await fetch(h.config.origin + '/api/v1/setup');
  check('the state of a set-up installation is COMPLETED and not cached', [state.status, await state.json(), state.headers.get('cache-control')], [200, { state: 'COMPLETED' }, 'no-store']);
  check('setup cannot take over a set-up installation', await codes(post(body)), { status: 409, codes: ['setup_already_completed'] });
  check('a request carrying a session cookie is refused', await codes(post(body, { cookie: 'x=y' })), { status: 400, codes: ['no_credentials_accepted'] });
  check('a request from another origin is refused', (await post(body, { origin: 'https://evil.example' })).status, 403);
  check('a short password is rejected before anything else', (await post({ ...body, owner: { ...body.owner, password: 'short' } })).status, 400);
  check('an unknown field is rejected', (await post({ ...body, role: 'ORG_SUPER_ADMIN' })).status, 400);
  const browser = await chromium.launch({ headless: true, ...(executablePath ? { executablePath } : {}) });
  try {
    const page = await (await browser.newContext({ baseURL: h.config.origin })).newPage();
    await page.goto('/setup');
    await page.getByText('This installation is already set up').waitFor();
    check('the setup page offers sign-in, not a setup form', [await page.getByRole('link', { name: 'Go to staff sign in' }).count(), await page.getByRole('form', { name: 'First-run setup' }).count()], [1, 0]);
  } finally { await browser.close(); }
});
