// Expanded V1 family screens, driven through the real workspace in a real
// browser on the synthetic codex-a00 profile. Every step uses the screen's own
// controls; results are read back through the API. Synthetic fixtures only.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type Locator, type Page } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite } from '../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const t = operationsSuite('expansion-screens-browser');
const { h, check, ok } = t;
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const shots = resolve('output/playwright'); mkdirSync(shots, { recursive: true });
const errors: string[] = []; const external: string[] = [];

async function signIn(browser: Browser, name: 'owner' | 'reviewer' | 'admin') {
  const page = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1440, height: 1000 } })).newPage();
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
  page.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });
  const user = h.users[name]!;
  await h.authWindow();
  await page.goto('/workspace/sign-in');
  await page.getByLabel('Staff email').fill(user.email);
  await page.getByLabel('Password', { exact: true }).fill(user.password);
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
  await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
  await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
  return page;
}
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const field = (f: Locator, label: string) => f.getByLabel(new RegExp(`^${escape(label)}( \\*)?$`));
async function submit<T>(page: Page, f: Locator, path: RegExp, schema: { parse(v: unknown): T }, button: string) {
  const response = page.waitForResponse(r => path.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
  await f.getByRole('button', { name: button, exact: true }).click();
  const received = await response; const body = await received.json();
  if (![200, 201].includes(received.status())) throw new Error(`Unexpected ${received.status()} from ${received.url()}: ${JSON.stringify(body).slice(0, 400)}`);
  return schema.parse(body);
}
async function click<T>(page: Page, scope: Locator | Page, path: RegExp, schema: { parse(v: unknown): T }, button: string) {
  const response = page.waitForResponse(r => path.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
  await scope.getByRole('button', { name: button, exact: true }).first().click();
  const received = await response; const body = await received.json();
  return { status: received.status(), body: received.ok() ? schema.parse(body) : body as unknown };
}
const open = async (p: Page, path: string, heading: string) => { await p.goto(path); await p.getByRole('heading', { name: heading, exact: true }).first().waitFor(); await p.waitForLoadState('networkidle'); };

await t.run(async () => {
  const suffix = randomUUID().slice(0, 8);
  const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
  try {
    const admin = await signIn(browser, 'admin');
    const owner = await signIn(browser, 'owner');
    const reviewer = await signIn(browser, 'reviewer');

    // ---------------------------------------------------------------- EX06
    t.setPhase('EX06 template');
    await open(admin, '/workspace/impact-assessments', 'Impact assessments');
    let f = admin.getByRole('form', { name: 'Record a template version' });
    await field(f, 'Kind').selectOption('DPIA'); await field(f, 'Name').fill(`Browser DPIA ${suffix}`);
    await field(f, 'Description').fill('DPIA template authored in the browser.'); await field(f, 'Review every (days)').fill('180');
    await f.getByLabel('Question 1 key').fill('shares_data'); await f.getByLabel('Question 1 text').fill('Is personal data shared with a third party?');
    await f.getByLabel('Question 1 finding when').fill('YES'); await f.getByLabel('Question 1 finding severity').selectOption('HIGH');
    await f.getByRole('checkbox', { name: 'Evidence required' }).check();
    await f.getByRole('button', { name: 'Add a question', exact: true }).click();
    await f.getByLabel('Question 2 key').fill('purpose'); await f.getByLabel('Question 2 text').fill('Describe the purpose.'); await f.getByLabel('Question 2 answer type').selectOption('TEXT');
    const template = await submit(admin, f, /\/impact-templates$/, S.schemas.ImpactTemplate, 'Record a template version');
    check('a template authored in the builder is recorded as a draft with its questions', [template.status, template.questions.map(q => [q.key, q.answer_type, q.finding_when])], ['DRAFT', [['shares_data', 'YES_NO', 'YES'], ['purpose', 'TEXT', null]]]);
    check('an organisation admin sees no publish control', await admin.getByRole('row').filter({ hasText: `Browser DPIA ${suffix}` }).getByRole('button', { name: 'Publish' }).count(), 0);
    await open(owner, '/workspace/impact-assessments', 'Impact assessments');
    const publish = await click(owner, owner.getByRole('row').filter({ hasText: `Browser DPIA ${suffix}` }), /\/publication$/, S.schemas.ImpactTemplate, 'Publish');
    check('a super admin who did not author it publishes it from the list', [publish.status, (publish.body as { status?: string }).status], [200, 'PUBLISHED']);

    t.setPhase('EX06 assessment');
    await owner.reload(); await owner.waitForLoadState('networkidle');
    f = owner.getByRole('form', { name: 'Start an assessment' });
    await field(f, 'Template').selectOption(template.id); await field(f, 'Title').fill(`Browser organisation DPIA ${suffix}`); await field(f, 'Owner').fill('Privacy team');
    const started = await submit(owner, f, /\/impact-assessments$/, S.schemas.ImpactAssessmentDetail, 'Start an assessment');
    await owner.getByRole('heading', { name: `Browser organisation DPIA ${suffix} — revision 1` }).waitFor(); await owner.waitForLoadState('networkidle');
    await owner.getByText('Not ready to submit').waitFor();
    f = owner.getByRole('form', { name: 'Save answers' });
    const q1 = f.getByRole('group', { name: /^Is personal data shared/ }); const q2 = f.getByRole('group', { name: /^Describe the purpose/ });
    await field(q1, 'Answer').selectOption('YES'); await field(q2, 'Answer').fill('Order fulfilment.');
    let saved = await submit(owner, f, /\/answers$/, S.schemas.ImpactAssessmentDetail, 'Save answers');
    check('an answer without required evidence is named as missing on screen', saved.missing, [{ question_key: 'shares_data', reason: 'EVIDENCE_MISSING' }]);
    // After a save the form keeps the stored answers rather than clearing them.
    await owner.waitForLoadState('networkidle');
    check('after saving, the form shows the stored answer rather than clearing it', await field(owner.getByRole('form', { name: 'Save answers' }).getByRole('group', { name: /^Is personal data shared/ }), 'Answer').inputValue(), 'YES');
    await field(owner.getByRole('form', { name: 'Save answers' }).getByRole('group', { name: /^Is personal data shared/ }), 'Evidence reference (required)').fill('Data-flow register DF-9');
    saved = await submit(owner, owner.getByRole('form', { name: 'Save answers' }), /\/answers$/, S.schemas.ImpactAssessmentDetail, 'Save answers');
    check('with evidence nothing is missing', saved.missing, []);
    const submitted = await click(owner, owner, /\/submission$/, S.schemas.ImpactAssessmentDetail, 'Submit for review');
    const sub = submitted.body as { status: string; findings: { id: string; source: string }[] };
    check('submission raises the answer-rule finding', [submitted.status, sub.status, sub.findings.map(x => x.source)], [200, 'SUBMITTED', ['ANSWER_RULE']]);
    await owner.getByText('Cannot be approved yet').waitFor();

    t.setPhase('EX06 review by a second person');
    await open(reviewer, '/workspace/impact-assessments', 'Impact assessments');
    await reviewer.getByRole('row').filter({ hasText: `Browser organisation DPIA ${suffix}` }).getByRole('button', { name: 'Open' }).click();
    await reviewer.getByRole('heading', { name: `Browser organisation DPIA ${suffix} — revision 1` }).waitFor(); await reviewer.waitForLoadState('networkidle');
    f = reviewer.getByRole('form', { name: 'Record the review decision' });
    await field(f, 'Decision').selectOption('APPROVED'); await field(f, 'Note').fill('Approving with an open finding must fail.');
    const blocked = reviewer.waitForResponse(r => r.url().endsWith(`/impact-assessments/${started.id}/decision`));
    await f.getByRole('button', { name: 'Record the review decision', exact: true }).click();
    check('the screen cannot approve while a finding is unresolved', (await blocked).status(), 409);
    f = reviewer.getByRole('form', { name: 'Record progress on a finding' });
    await field(f, 'Finding').selectOption(sub.findings[0]!.id); await field(f, 'Progress').selectOption('RISK_ACCEPTED');
    await field(f, 'Note').fill('Accepted until the recipient agreement is signed.');
    const accepted = await submit(reviewer, f, /\/impact-findings\/[^/]+\/events$/, S.schemas.ImpactFinding, 'Record progress on a finding');
    check('a second person accepts the risk with an expiry', [accepted.state, accepted.blocks_approval], ['RISK_ACCEPTED', false]);
    await reviewer.reload(); await reviewer.waitForLoadState('networkidle');
    await reviewer.getByRole('row').filter({ hasText: `Browser organisation DPIA ${suffix}` }).getByRole('button', { name: 'Open' }).click();
    await reviewer.getByRole('heading', { name: `Browser organisation DPIA ${suffix} — revision 1` }).waitFor(); await reviewer.waitForLoadState('networkidle');
    f = reviewer.getByRole('form', { name: 'Record the review decision' });
    await field(f, 'Decision').selectOption('APPROVED'); await field(f, 'Note').fill('Reviewed; residual risk accepted with expiry.');
    const approved = await submit(reviewer, f, /\/decision$/, S.schemas.ImpactAssessmentDetail, 'Record the review decision');
    check('an independent reviewer approves on screen', [approved.status, approved.decided_by !== approved.submitted_by], ['APPROVED', true]);

    t.setPhase('EX06 retest');
    f = reviewer.getByRole('form', { name: 'Start a retest' });
    await field(f, 'Reason').fill('Annual retest started from the screen.');
    const retest = await submit(reviewer, f, /\/revision$/, S.schemas.ImpactAssessmentDetail, 'Start a retest');
    check('a retest is revision 2 with answers carried forward', [retest.revision, retest.previous_id, retest.answers.every(x => x.carried_forward)], [2, started.id, true]);
    await reviewer.getByRole('heading', { name: `Browser organisation DPIA ${suffix} — revision 2` }).waitFor();
    await reviewer.screenshot({ path: resolve(shots, 'impact-assessments-codex-a00.png'), fullPage: true });
    const stored = await ok((await h.login('admin')).call(`/api/v1/admin/impact-assessments/${started.id}`), S.schemas.ImpactAssessmentDetail);
    check('the approved revision is still approved until its retest is approved', stored.status, 'APPROVED');

    check('no request left the local origin', external, []);
    check('no page or console error occurred', errors, []);
  } finally { await browser.close(); }
});
