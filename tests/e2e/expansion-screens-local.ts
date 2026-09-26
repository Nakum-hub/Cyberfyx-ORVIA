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
import { recordsTarget } from '../../shared/testing/src/records-target.ts';
import { workflowActivities } from '../../services/worker/src/withdrawal-worker.ts';
import { sweepClassification } from '../../services/worker/src/classification.ts';
import { observerEnrollment } from '../../backend/auth/src/machine-profile.ts';
import { operationsRunner } from '../../services/worker/src/operations-runner.ts';
import http from 'node:http';

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

    // ---------------------------------------------------------------- EX08
    t.setPhase('EX08 agreement and gaps');
    const api = await h.login('admin'); const sc = t.scope();
    const v1p = await ok(api.call('/api/v1/admin/purposes', { legal_entity_id: sc.legal_entity_id, environment_id: sc.environment_id, code: 'order_service_demo', name: `Browser V1 purpose ${suffix}`, description: 'Synthetic V1 purpose authorising the processor.' }, { 'idempotency-key': randomUUID() }), S.schemas.Purpose);
    const proc = await ok(api.call('/api/v1/admin/processors', { name: `Browser vendor ${suffix}`, role: 'PROCESSOR', authorised_purpose_ids: [v1p.id], authorised_categories: ['CONTACT_DETAILS'], region: 'IN',
      contract_reference: 'DPA B-1', owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example', subprocessors_permitted: false }, { 'idempotency-key': randomUUID() }), S.schemas.Processor);
    await ok(api.call('/api/v1/admin/processor-engagements', { processor_id: proc.id, service_description: `Browser delivery ${suffix}`, subprocessor_of: null, effective_from: new Date(Date.now() - 86_400_000).toISOString(),
      contract_evidence_reference: null, safeguard_evidence_reference: null, links: [] }, { 'idempotency-key': randomUUID() }), S.schemas.Engagement);
    await open(admin, '/workspace/third-parties', 'Third parties');
    const findRow = async () => { for (let i = 0; i < 20; i++) { const row = admin.getByRole('row').filter({ hasText: `Browser vendor ${suffix}` }); if (await row.count()) return row; await admin.getByRole('button', { name: 'Next' }).first().click(); await admin.waitForLoadState('networkidle'); } throw new Error('Processor row not found'); };
    await (await findRow()).getByRole('button', { name: 'Open' }).click();
    await admin.getByRole('heading', { name: `Browser vendor ${suffix}` }).waitFor(); await admin.waitForLoadState('networkidle');
    f = admin.getByRole('form', { name: 'Record an agreement' });
    await field(f, 'Kind').selectOption('DPA'); await field(f, 'Reference').fill('DPA B-1'); await field(f, 'Permitted regions').fill('US'); await field(f, 'Evidence reference').fill('Signed copy DPA B-1');
    const agreement = await submit(admin, f, /\/processor-agreements$/, S.schemas.Agreement, 'Record an agreement');
    check('an agreement recorded on screen is in force', agreement.in_force, true);
    await admin.getByRole('table', { name: 'Gaps derived from recorded processing' }).getByText('Region not permitted').first().waitFor();
    check('the region gap appears on screen', await admin.getByRole('table', { name: 'Gaps derived from recorded processing' }).getByText('Region not permitted').count() > 0, true);
    f = admin.getByRole('form', { name: 'Set the risk tier' });
    await field(f, 'Tier').selectOption('HIGH'); await field(f, 'Reassess every (days)').fill('180'); await field(f, 'Reason').fill('Handles customer contact data.');
    await submit(admin, f, /\/tier$/, S.schemas.Tier, 'Set the risk tier');

    t.setPhase('EX08 supplier link');
    const ddTemplate = await ok(api.call('/api/v1/admin/impact-templates', { template_key: null, kind: 'VENDOR_DUE_DILIGENCE', name: `Browser vendor DD ${suffix}`, description: 'Vendor due diligence for the browser journey.',
      questions: [{ key: 'certified', text: 'Do you hold a current security certification?', answer_type: 'YES_NO', choices: [], required: true, evidence_required: true, finding_when: 'NO', finding_severity: 'MEDIUM', guidance: 'Name the certificate.' }], requirement_ids: [], review_interval_days: 365 }, { 'idempotency-key': randomUUID() }), S.schemas.ImpactTemplate);
    await ok((await h.login('owner')).call(`/api/v1/admin/impact-templates/${ddTemplate.id}/publication`, { action: 'PUBLISH' }, { 'idempotency-key': randomUUID() }), S.schemas.ImpactTemplate);
    const dd = await ok(api.call('/api/v1/admin/impact-assessments', { template_id: ddTemplate.id, subject_kind: 'PROCESSOR', subject_id: proc.id, title: `Browser vendor review ${suffix}`, owner_reference: 'Vendor management', due_at: new Date(Date.now() + 14 * 86_400_000).toISOString() }, { 'idempotency-key': randomUUID() }), S.schemas.ImpactAssessmentDetail);
    await admin.reload(); await admin.waitForLoadState('networkidle');
    await (await findRow()).getByRole('button', { name: 'Open' }).click();
    await admin.getByRole('heading', { name: `Browser vendor ${suffix}` }).waitFor(); await admin.waitForLoadState('networkidle');
    f = admin.getByRole('form', { name: 'Issue a supplier link' });
    await field(f, 'Assessment').selectOption(dd.id);
    await submit(admin, f, /\/supplier-links$/, S.schemas.SupplierLinkIssued, 'Issue a supplier link');
    const url = await admin.getByRole('code').filter({ hasText: '/supplier#token=' }).innerText().catch(async () => admin.locator('code').filter({ hasText: '/supplier#token=' }).innerText());
    check('the link is shown once with its token in the fragment', /\/supplier#token=[a-f0-9]{64}$/.test(url), true);
    const supplierContext = await browser.newContext({ viewport: { width: 1200, height: 900 } });
    const supplierPage = await supplierContext.newPage();
    supplierPage.on('pageerror', e => errors.push(e.message));
    await supplierPage.goto(url);
    await supplierPage.getByRole('heading', { name: 'Supplier questionnaire' }).waitFor();
    await supplierPage.getByText(`Browser vendor review ${suffix}`).waitFor();
    check('the token is removed from the address bar once read', supplierPage.url().includes('token='), false);
    const sf = supplierPage.getByRole('form', { name: 'Supplier answers' });
    await sf.locator('select[name=a_certified]').selectOption('YES'); await sf.locator('input[name=e_certified]').fill('ISO 27001 certificate C-11');
    const posted = supplierPage.waitForResponse(r => r.url().endsWith('/api/v1/supplier/questionnaire/answers'));
    await sf.getByRole('button', { name: 'Save answers' }).click();
    check('the supplier saves answers without an account', (await posted).status(), 200);
    await supplierPage.getByText('Your answers were saved.').waitFor();
    const staffView = await ok(api.call(`/api/v1/admin/impact-assessments/${dd.id}`), S.schemas.ImpactAssessmentDetail);
    check('staff see the answer labelled as a supplier attestation', staffView.answers.map(a => [a.question_key, a.value, a.respondent]), [['certified', 'YES', 'SUPPLIER']]);
    await admin.getByRole('button', { name: 'I have copied it' }).click();
    await (admin.getByRole('table', { name: 'Links for this assessment' }).getByRole('button', { name: 'Revoke' })).click();
    await admin.getByRole('table', { name: 'Links for this assessment' }).getByText('revoked').waitFor();
    const reopened = await supplierContext.newPage();
    await reopened.goto(url);
    await reopened.getByText('This link has expired or been revoked.').waitFor();
    check('a revoked link is refused on the supplier page', true, true);
    await supplierContext.close();

    // ---------------------------------------------------------------- EX10 / EX11
    t.setPhase('EX10/11 control test');
    const fw = await ok(api.call('/api/v1/admin/grc/regulatory-framework', { name: `Browser DPDP ${suffix}` }, { 'idempotency-key': randomUUID() }), S.schemas.GrcFramework);
    const ctl = await ok(api.call('/api/v1/admin/grc/controls', { title: `Browser row security ${suffix}`, description: 'Row security is forced on every application table.', owner_reference: 'Platform team', review_interval_days: 90,
      mappings: [{ framework_id: fw.id, requirement_code: fw.requirements[0]!.code }] }, { 'idempotency-key': randomUUID() }), S.schemas.GrcControl);
    await open(admin, '/workspace/compliance', 'Continuous compliance');
    f = admin.getByRole('form', { name: 'Add a control test' });
    await field(f, 'Control').selectOption(ctl.id); await field(f, 'Name').fill(`Browser RLS test ${suffix}`);
    await field(f, 'Check').selectOption('FORCED_ROW_SECURITY'); await field(f, 'Violations allowed').fill('0'); await field(f, 'Run every (minutes)').fill('60');
    const ct = await submit(admin, f, /\/grc\/control-tests$/, S.schemas.ControlTest, 'Add a control test');
    check('a control test added on screen has never run', ct.standing, 'NEVER_RUN');
    const testRow = admin.getByRole('table', { name: 'Control tests' }).getByRole('row').filter({ hasText: `Browser RLS test ${suffix}` });
    await testRow.waitFor();
    await testRow.getByRole('button', { name: 'Open' }).click();
    await admin.getByRole('heading', { name: `Browser RLS test ${suffix}` }).waitFor();
    const ran = await click(admin, admin.locator('.panel').filter({ has: admin.getByRole('heading', { name: `Browser RLS test ${suffix}` }) }), /\/runs$/, S.schemas.ControlTestDetail, 'Run now');
    check('running it on screen records a passing manual run', [ran.status, (ran.body as { test?: { standing?: string } }).test?.standing], [200, 'PASSING']);
    await admin.getByRole('table', { name: 'Run history' }).getByText('manual').first().waitFor();

    t.setPhase('EX10 policy by two people');
    f = admin.getByRole('form', { name: 'Draft a policy' });
    await field(f, 'Title').fill(`Browser policy ${suffix}`); await field(f, 'Policy text').fill('Personal data is processed only for recorded purposes.');
    await field(f, 'Owner').fill('Privacy office'); await field(f, 'Review every (days)').fill('365'); await field(f, 'Change summary').fill('Initial version from the browser.');
    const pol = await submit(admin, f, /\/grc\/policies$/, S.schemas.GrcPolicy, 'Draft a policy');
    check('the draft is version 1', [pol.status, pol.version], ['DRAFT', 1]);
    await admin.reload(); await admin.waitForLoadState('networkidle');
    check('an admin without approval authority sees no publish control', await admin.getByRole('row').filter({ hasText: `Browser policy ${suffix}` }).getByRole('button', { name: 'Publish' }).count(), 0);
    await open(owner, '/workspace/compliance', 'Continuous compliance');
    const pub = await click(owner, owner.getByRole('row').filter({ hasText: `Browser policy ${suffix}` }), /\/decision$/, S.schemas.GrcPolicy, 'Publish');
    check('another person publishes it from the list', [pub.status, (pub.body as { status?: string }).status], [200, 'PUBLISHED']);
    const ack = await click(owner, owner.getByRole('row').filter({ hasText: `Browser policy ${suffix}` }), /\/acknowledgement$/, S.schemas.GrcPolicy, 'Acknowledge');
    check('a reader acknowledges it', [ack.status, (ack.body as { acknowledgements?: number }).acknowledgements], [200, 1]);

    t.setPhase('EX10 issue remediation and review');
    f = admin.getByRole('form', { name: 'Raise an issue' });
    await field(f, 'Title').fill(`Browser issue ${suffix}`); await field(f, 'Severity').selectOption('HIGH'); await field(f, 'Owner').fill('IT security');
    const iss = await submit(admin, f, /\/grc\/issues$/, S.schemas.Issue, 'Raise an issue');
    const issueRow = () => admin.getByRole('table', { name: 'Issues' }).getByRole('row').filter({ hasText: `Browser issue ${suffix}` });
    await issueRow().waitFor(); await issueRow().getByRole('button', { name: 'Open' }).click();
    await admin.getByRole('heading', { name: `Browser issue ${suffix}` }).waitFor();
    f = admin.getByRole('form', { name: 'Record progress' });
    await field(f, 'Event').selectOption('REMEDIATED'); await field(f, 'Note').fill('Access review completed and filed.'); await field(f, 'Evidence reference').fill('Review pack AR-9');
    const remediated = await submit(admin, f, /\/events$/, S.schemas.Issue, 'Record progress');
    check('the issue is remediated on screen with its evidence', [remediated.id, remediated.state], [iss.id, 'REMEDIATED']);
    await owner.reload(); await owner.waitForLoadState('networkidle');
    const ownerIssue = owner.getByRole('table', { name: 'Issues' }).getByRole('row').filter({ hasText: `Browser issue ${suffix}` });
    await ownerIssue.getByRole('button', { name: 'Open' }).click();
    await owner.getByRole('heading', { name: `Browser issue ${suffix}` }).waitFor();
    f = owner.getByRole('form', { name: 'Record progress' });
    await field(f, 'Event').selectOption('VERIFIED'); await field(f, 'Note').fill('Reviewed the access review pack.'); await field(f, 'Evidence reference').fill('Review note RN-4');
    await field(f, 'Verified by').selectOption('INDEPENDENT_REVIEW');
    const verified = await submit(owner, f, /\/events$/, S.schemas.Issue, 'Record progress');
    check('someone other than the remediator verifies it on screen', verified.state, 'VERIFIED');
    await owner.getByRole('table', { name: 'History', exact: true }).getByText('Verified by independent review').waitFor();

    // ---------------------------------------------------------------- EX05
    t.setPhase('EX05 record of processing');
    const ropaSystem = await t.boundSystem(`Browser RoPA CRM ${suffix}`);
    await t.activity({ condition: 'CONSENT', systems: [ropaSystem.id], name: `Browser RoPA activity ${suffix}` });
    await open(admin, '/workspace/records-of-processing', 'Records of processing');
    const ropaRow = admin.getByRole('table', { name: 'Records of processing' }).getByRole('row').filter({ hasText: `Browser RoPA activity ${suffix}` });
    await ropaRow.waitFor();
    await ropaRow.getByRole('button', { name: 'Open' }).click();
    await admin.getByRole('heading', { name: `Browser RoPA activity ${suffix}` }).waitFor();
    check('the undeclared location is shown as a gap on screen', await admin.getByRole('table', { name: 'Gaps', exact: true }).getByText('Location undeclared').count(), 1);
    f = admin.getByRole('form', { name: 'Declare a system location' });
    await field(f, 'System').selectOption(ropaSystem.id); await field(f, 'Region').fill('IN-KA'); await field(f, 'Hosting').fill('Customer data centre, Bengaluru');
    await field(f, 'Basis').fill('Declared from the hosting contract schedule.');
    const declared = await submit(admin, f, /\/locations$/, S.schemas.SystemLocation, 'Declare a system location');
    check('the location is declared on screen', [declared.system_id, declared.region], [ropaSystem.id, 'IN-KA']);
    await admin.getByRole('table', { name: 'Systems', exact: true }).getByText('IN-KA — Customer data centre, Bengaluru').waitFor();
    check('the location gap is gone', await admin.getByRole('table', { name: 'Gaps', exact: true }).getByText('Location undeclared').count(), 0);
    f = admin.getByRole('form', { name: 'Record a version' });
    await field(f, 'Note').fill(`Browser version ${suffix}`);
    const version = await submit(admin, f, /\/ropa\/versions$/, S.schemas.RopaVersion, 'Record a version');
    check('a version is recorded from the screen', [version.activity_count > 0, version.approved_by], [true, null]);
    await open(owner, '/workspace/records-of-processing', 'Records of processing');
    const versionRow = owner.getByRole('table', { name: 'Recorded versions' }).getByRole('row').filter({ hasText: `Browser version ${suffix}` });
    const approvedVersion = await click(owner, versionRow, /\/approval$/, S.schemas.RopaVersion, 'Approve');
    check('another person approves it from the list', [approvedVersion.status, (approvedVersion.body as { approved_by?: string }).approved_by !== null], [200, true]);

    t.setPhase('EX05 bounded export and verified download');
    await admin.reload(); await admin.waitForLoadState('networkidle');
    f = admin.getByRole('form', { name: 'Start an export' });
    await field(f, 'Version').selectOption(version.id);
    const startedExport = await submit(admin, f, /\/data-exports$/, S.schemas.DataExport, 'Start an export');
    await admin.getByText(/Export complete: \d+ rows in \d+ chunk/).waitFor({ timeout: 60_000 });
    const finished = await ok(api.call(`/api/v1/admin/data-exports/${startedExport.id}`), S.schemas.DataExport);
    check('the export driven from the screen completed with a manifest', [finished.state, finished.rows_written, finished.manifest?.complete], ['COMPLETED', finished.expected_rows, true]);
    const exportRow = admin.getByRole('table', { name: 'Your exports' }).getByRole('row').filter({ hasText: startedExport.id.slice(0, 8) });
    const downloads: import('@playwright/test').Download[] = [];
    admin.on('download', d => downloads.push(d));
    await exportRow.getByRole('button', { name: 'Download' }).click();
    await admin.getByText(/Downloaded and checked every chunk against the manifest/).waitFor({ timeout: 60_000 });
    check('the browser saved the file and its manifest', downloads.map(d => d.suggestedFilename().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/, 'ID')).sort(), ['orvia-export-ID.csv', 'orvia-export-ID.manifest.json']);
    const csvFile = downloads.find(d => d.suggestedFilename().endsWith('.csv'))!;
    const { readFileSync } = await import('node:fs');
    const csv = readFileSync((await csvFile.path())!, 'utf8');
    check('the saved CSV has the header and every counted row', [csv.split('\n')[0], csv.trimEnd().split('\n').length - 1], [finished.manifest!.columns.join(','), finished.expected_rows]);

    // ---------------------------------------------------------------- EX03
    t.setPhase('EX03 request raised in the portal and executed');
    const records = recordsTarget();
    const rpSystem = await t.boundSystem(`Browser response CRM ${suffix}`);
    const rpRef = `brp_${suffix}`;
    await t.principalSubject('alice', [{ system_id: rpSystem.id, target_reference: rpRef }]);
    const third = `neighbour.${suffix}@elsewhere.example`;
    await records.seed(sc, rpSystem.id, [{ reference: rpRef, fields: { name: 'Alice Synthetic', email: 'alice.own@records.example', notes: `Parcel left with neighbour ${third}.` } }]);
    await records.end();
    const aliceApi = await h.login('alice');
    const own = await ok(aliceApi.call('/api/v1/portal/me/rights-requests', { right_type: 'ACCESS', description: `Browser access request ${suffix}` }, { 'idempotency-key': randomUUID() }), S.schemas.OwnRightsRequest);
    const move = (to: string) => ok(api.call(`/api/v1/admin/rights-requests/${own.id}/transition`, { to, reason: 'Synthetic progression for the browser journey.' }, { 'idempotency-key': randomUUID() }), S.schemas.RightsRequest);
    await move('PENDING_VERIFICATION');
    await ok(api.call(`/api/v1/admin/rights-requests/${own.id}/identity-review`, { grade: 'EXACT', basis: 'Signed in to the portal with the recorded identity.', matched_reference_count: 1 }, { 'idempotency-key': randomUUID() }), S.schemas.RightsRequest);
    await move('VERIFIED'); await move('SCOPING');
    await ok(api.call(`/api/v1/admin/rights-requests/${own.id}/scope`, { items: [{ system_id: rpSystem.id, action: 'DISCLOSE_COPY', retention_exception: null, note: 'Copy for the person.' }], unresolved_destinations: [] }, { 'idempotency-key': randomUUID() }), S.schemas.RightsRequest);
    await move('AWAITING_APPROVAL'); await move('EXECUTING');

    t.setPhase('EX03 prepared, reviewed and released on screen');
    await open(owner, `/workspace/rights/${own.id}`, `Privacy request ${own.id.slice(0, 8)}…`);
    const prepared = await click(owner, owner.getByRole('region', { name: 'Response package' }), /\/response-packages$/, S.schemas.ResponsePackage, 'Prepare a response package');
    check('the package is prepared from the request screen', [prepared.status, (prepared.body as { state?: string }).state], [201, 'DRAFT']);
    await open(reviewer, `/workspace/rights/${own.id}`, `Privacy request ${own.id.slice(0, 8)}…`);
    const rf = reviewer.getByRole('form', { name: 'Review the package' });
    await rf.locator('select[name$="|notes"]').selectOption('THIRD_PARTY');
    const reviewed = await submit(reviewer, rf, /\/review$/, S.schemas.ResponsePackage, 'Complete the review');
    check('the second person redacts the suggested field on screen', [reviewed.state, JSON.stringify(reviewed.released_content).includes(third)], ['REVIEWED', false]);
    f = reviewer.getByRole('form', { name: 'Release to the person\'s portal' });
    await field(f, 'Collections allowed').fill('2');
    const releasedPkg = await submit(reviewer, f, /\/release$/, S.schemas.ResponsePackage, 'Release to the person\'s portal');
    check('the package is released on screen', [releasedPkg.state, releasedPkg.delivery_state], ['RELEASED', 'ACTIVE']);

    t.setPhase('EX03 the person collects their copy');
    const aliceContext = await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1200, height: 900 } });
    const alicePage = await aliceContext.newPage();
    alicePage.on('pageerror', e => errors.push(e.message));
    alicePage.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });
    await h.authWindow();
    await alicePage.goto('/privacy/sign-in');
    await alicePage.getByLabel('Email').fill(h.users.alice!.email); await alicePage.getByLabel('Password', { exact: true }).fill(h.users.alice!.password);
    await alicePage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await alicePage.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await alicePage.goto('/privacy/rights'); await alicePage.waitForLoadState('networkidle');
    const article = alicePage.locator('article').filter({ hasText: `Browser access request ${suffix}` });
    const collected = alicePage.waitForResponse(r => r.url().endsWith(`/rights-requests/${own.id}/response-package`) && r.request().method() === 'POST');
    await article.getByRole('button', { name: 'Collect your copy' }).click();
    check('the person collects the copy from the portal', (await collected).status(), 200);
    const yourCopy = article.getByRole('table', { name: 'What this organisation holds about you' });
    await yourCopy.getByText('alice.own@records.example').waitFor();
    check('the collected copy shows the redaction and not the other person', [await yourCopy.getByText('[Redacted: another person\'s data]').count(), await alicePage.getByText(third).count()], [1, 0]);
    await aliceContext.close();

    // ---------------------------------------------------------------- EX04 / EX12
    t.setPhase('EX04 value classification on screen');
    const corpus = recordsTarget();
    for (let i = 0; i < 20; i++) await corpus.pool.query('INSERT INTO customer_profiles(tenant_id,legal_entity_id,environment_id,contact_email,aadhaar,city) VALUES($1,$2,$3,$4,$5,$6)',
      [sc.tenant_id, sc.legal_entity_id, sc.environment_id, `browser${i}.${suffix}@records.example`, '234123412346', 'Pune']);
    await corpus.end();
    const clsSystem = await t.boundSystem(`Browser classification ${suffix}`);
    const clsTarget = await ok(api.call('/api/v1/admin/catalog-discovery-targets', { system_id: clsSystem.id, schema_name: 'public', relation_name: 'customer_profiles' }, { 'idempotency-key': randomUUID() }), S.schemas.CatalogDiscoveryTarget);
    await ok((await h.login('owner')).call(`/api/v1/admin/catalog-discovery-targets/${clsTarget.id}/approve`, {}, { 'idempotency-key': randomUUID() }), S.schemas.CatalogDiscoveryTarget, [200]);
    await open(owner, `/workspace/catalog-discovery?target_id=${clsTarget.id}`, 'Catalog observations');
    f = owner.getByRole('form', { name: 'Request a classification sample' });
    await field(f, 'Rows to sample').fill('200');
    const queuedRun = await submit(owner, f, /\/classification-runs$/, S.schemas.ClassificationRun, 'Request a classification sample');
    check('a sample is requested from the screen and queued for the worker', queuedRun.state, 'QUEUED');
    const worker = workflowActivities();
    try { await sweepClassification(worker.scoped, worker.enrollment.identities.map(x => x.id), observerEnrollment(worker.config).identities, worker.observer); } finally { await worker.close(); }
    await owner.reload(); await owner.waitForLoadState('networkidle');
    const columnsTable = owner.getByRole('table', { name: 'Columns', exact: true });
    await columnsTable.waitFor();
    check('the screen shows classified columns', [await columnsTable.getByRole('row').filter({ hasText: 'aadhaar' }).getByText('Aadhaar number').count(), await columnsTable.getByRole('row').filter({ hasText: 'contact_email' }).getByText('Email address').count()], [1, 1]);
    check('the screen shows who can read them', await owner.getByRole('table', { name: 'Who can read the classified columns' }).getByText('orvia_target_agent').count(), 1);
    check('no sampled value appears on screen', await owner.getByText(`browser0.${suffix}@records.example`).count(), 0);
    const lf = owner.getByRole('form', { name: 'Reviewed labels' });
    await lf.locator('select[name="l:aadhaar"]').selectOption('AADHAAR'); await lf.locator('select[name="l:contact_email"]').selectOption('EMAIL'); await lf.locator('select[name="l:city"]').selectOption('NONE');
    await field(lf, 'Basis').fill('Reviewed against the synthetic corpus definition.');
    await submit(owner, lf, /\/classification-labels$/, S.schemas.ClassificationLabelSet, 'Record labels');
    const measured = await click(owner, owner, /\/quality$/, S.schemas.ClassificationQuality, 'Measure quality against the labels');
    check('quality is measured from the screen', [measured.status, (measured.body as { measurement?: { columns_labelled?: number } }).measurement?.columns_labelled], [201, 3]);
    await owner.getByRole('table', { name: 'Precision and recall by category' }).waitFor();
    check('the exposure overview lists the relation', await owner.getByRole('table', { name: 'Exposure by relation' }).getByText('public.customer_profiles').count() > 0, true);

    // ---------------------------------------------------------------- EX09
    t.setPhase('EX09 transport enabled by a second person on screen');
    const hookHits: { signature: string | undefined; body: string }[] = [];
    const hookServer = http.createServer((req, res) => { let body = ''; req.on('data', c => { body += c; }); req.on('end', () => { hookHits.push({ signature: req.headers['x-orvia-signature'] as string | undefined, body }); res.writeHead(200).end('ok'); }); });
    const hookPort = await new Promise<number>(r => hookServer.listen(0, '127.0.0.1', () => r((hookServer.address() as import('node:net').AddressInfo).port)));
    try {
      await open(admin, '/workspace/delivery', 'Delivery');
      f = admin.getByRole('form', { name: 'Add a transport' });
      await field(f, 'Kind').selectOption('WEBHOOK'); await field(f, 'Name').fill(`Browser hook ${suffix}`); await field(f, 'URL').fill(`http://127.0.0.1:${hookPort}/orvia`);
      const hookT = await submit(admin, f, /\/delivery-transports$/, S.schemas.DeliveryTransport, 'Add a transport');
      check('a transport added on screen is pending', hookT.state, 'PENDING');
      await open(owner, '/workspace/delivery', 'Delivery');
      const trow = owner.getByRole('table', { name: 'Transports' }).getByRole('row').filter({ hasText: `Browser hook ${suffix}` });
      const en = await click(owner, trow, /\/enable$/, S.schemas.DeliveryTransport, 'Enable');
      check('a second person enables it on screen', [en.status, (en.body as { state?: string }).state], [200, 'ENABLED']);
      const shown = await click(owner, trow, /\/signing-secret$/, S.schemas.SigningSecret, 'Show signing key once');
      await trow.getByRole('button', { name: 'Show signing key once' }).waitFor({ state: 'detached' });
      check('the signing key is shown once on screen, and the control is gone', [shown.status, await owner.getByText('Copy this signing key now').count(), await trow.getByRole('button', { name: 'Show signing key once' }).count()], [200, 1, 0]);
      await owner.getByRole('button', { name: 'I have copied it' }).click();

      t.setPhase('EX09 message reviewed on screen and sent');
      await admin.reload(); await admin.waitForLoadState('networkidle');
      f = admin.getByRole('form', { name: 'Compose a message' });
      await field(f, 'Transport').selectOption(hookT.id); await field(f, 'Recipient').fill('ticketing'); await field(f, 'Subject').fill(`Browser delivery ${suffix}`);
      await field(f, 'Body').fill('A synthetic message composed in the browser for the delivery journey.');
      const composed = await submit(admin, f, /\/outbound-messages$/, S.schemas.OutboundMessage, 'Compose a message');
      check('the composed message awaits review', composed.delivery_state, 'AWAITING_REVIEW');
      const authorRow = admin.getByRole('table', { name: 'Outbound messages' }).getByRole('row').filter({ hasText: `Browser delivery ${suffix}` });
      await authorRow.waitFor();
      const selfApprove = await click(admin, authorRow, /\/review$/, S.schemas.OutboundMessage, 'Approve');
      check('the server refuses the author\'s own approval', [selfApprove.status, ((selfApprove.body as { error?: { field_errors?: { code: string }[] } }).error?.field_errors ?? []).map(e => e.code)], [409, ['author_cannot_review']]);
      await owner.reload(); await owner.waitForLoadState('networkidle');
      const mrow = owner.getByRole('table', { name: 'Outbound messages' }).getByRole('row').filter({ hasText: `Browser delivery ${suffix}` });
      const approved = await click(owner, mrow, /\/review$/, S.schemas.OutboundMessage, 'Approve');
      check('a second person approves it on screen', [approved.status, (approved.body as { delivery_state?: string }).delivery_state], [200, 'QUEUED']);
      const deliveryRunner = operationsRunner();
      try { await deliveryRunner.once(); } finally { await deliveryRunner.close(); }
      check('the runner delivered a signed request to the endpoint', [hookHits.length, hookHits[0]?.signature?.startsWith('sha256='), JSON.parse(hookHits[0]?.body ?? '{}').subject], [1, true, `Browser delivery ${suffix}`]);
      await owner.reload(); await owner.waitForLoadState('networkidle');
      await owner.getByRole('table', { name: 'Outbound messages' }).getByRole('row').filter({ hasText: `Browser delivery ${suffix}` }).getByRole('button', { name: 'Open' }).click();
      const attemptsTable = owner.getByRole('table', { name: 'Delivery attempts' });
      await attemptsTable.waitFor();
      check('the screen shows the attempt and its receipt', [await attemptsTable.getByText('sent').count() > 0, await attemptsTable.getByText(/^HTTP 200 response/).count()], [true, 1]);
      await click(owner, owner.getByRole('table', { name: 'Transports' }).getByRole('row').filter({ hasText: `Browser hook ${suffix}` }), /\/disable$/, S.schemas.DeliveryTransport, 'Disable');
    } finally { hookServer.close(); }

    check('no request left the local origin', external, []);
    check('no page or console error occurred', errors, []);
  } finally { await browser.close(); }
});
