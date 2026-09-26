// DPDP registry creation journeys, driven through the real workspace in a real
// browser on the synthetic codex-a00 profile. Each record is created with the
// screen's own form, its POST response is captured, and the stored record is
// read back through the API; client-side refusals are shown to send nothing.
// No customer system is contacted and no release claim follows from this run.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Locator, type Page } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite, key } from '../../shared/testing/src/operations-fixture.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const t = operationsSuite('registry-forms-browser');
const { h, check, ok } = t;
// A locally installed Chromium is used when named; otherwise Playwright resolves its own.
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const shots = resolve('output/playwright'); mkdirSync(shots, { recursive: true });

await t.run(async () => {
  await t.ensurePackage();
  const admin = await h.login('admin');
  const s = t.scope();
  const suffix = randomUUID().slice(0, 8);
  // Systems and processors have their own configuration screens; they are prerequisites here.
  const system = await t.boundSystem(`Forms CRM ${suffix}`);
  const v1Purpose = await ok(admin.call('/api/v1/admin/purposes', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, code: 'order_service_demo', name: `Forms V1 purpose ${suffix}`, description: 'Synthetic V1 purpose authorising the processor.' }, key()), S.schemas.Purpose);
  const processor = await ok(admin.call('/api/v1/admin/processors', { name: `Forms vendor ${suffix}`, role: 'PROCESSOR', authorised_purpose_ids: [v1Purpose.id], authorised_categories: ['CONTACT_DETAILS'], region: 'Synthetic region',
    contract_reference: 'DPA SYN-FORMS', owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example', subprocessors_permitted: false }, key()), S.schemas.Processor);

  const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
  const errors: string[] = []; const external: string[] = [];
  try {
    const context = await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
    page.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });

    t.setPhase('sign-in');
    const user = h.users.admin!;
    await h.authWindow(); // UI sign-ins share the staff rate-limit bucket with the fixture's API logins
    await page.goto('/workspace/sign-in');
    await page.getByLabel('Staff email').fill(user.email);
    await page.getByLabel('Password', { exact: true }).fill(user.password);
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
    await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
    await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();

    const form = (name: string) => page.getByRole('form', { name });
    // The visual required marker is part of the label text; match the label exactly, with or without it.
    const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const field = (f: Locator, label: string) => f.getByLabel(new RegExp(`^${escape(label)}( \\*)?$`));
    /** Submits a form and returns the parsed body of the POST it made. */
    async function submit<T>(f: Locator, path: RegExp, schema: { parse(v: unknown): T }, button?: string) {
      const response = page.waitForResponse(r => path.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
      await f.getByRole('button', { name: button ?? (await f.getByRole('heading').first().innerText()), exact: true }).click();
      const received = await response;
      const body = await received.json();
      if (![200, 201].includes(received.status())) throw new Error(`Unexpected ${received.status()} from ${received.url()}: ${JSON.stringify(body).slice(0, 400)}`);
      await f.getByRole('status').waitFor();
      return schema.parse(body);
    }
    const waitReady = async (p: Page, heading: string) => { await p.getByRole('heading', { name: heading, exact: true }).first().waitFor(); await p.waitForLoadState('networkidle'); };

    t.setPhase('registry set-up');
    await page.goto('/workspace/registry-setup'); await waitReady(page, 'Registry set-up');
    let f = form('Add a Data Principal category');
    await field(f, 'Name').fill(`Forms customer ${suffix}`); await field(f, 'Description').fill('Synthetic customer relationship.');
    const principalCategory = await submit(f, /\/data-principal-categories$/, S.schemas.PrincipalCategory);
    f = form('Add a personal data category');
    await field(f, 'Name').fill(`Forms contact ${suffix}`); await field(f, 'Description').fill('Synthetic contact details.'); await field(f, 'Consent-control category').selectOption('CONTACT_DETAILS');
    const dataCategory = await submit(f, /\/personal-data-categories$/, S.schemas.DataCategory);
    f = form('Register a purpose');
    await field(f, 'Name').fill(`Forms newsletter ${suffix}`); await field(f, 'Owner').fill('Synthetic marketing lead');
    await field(f, 'Description').fill('Sending the synthetic newsletter to subscribers.'); await field(f, 'Reason for recording').fill('Initial registration through the workspace');
    const purpose = await submit(f, /\/registry-purposes$/, S.schemas.RegistryPurpose);
    f = form('Record a processing condition');
    await field(f, 'Condition').selectOption('CONSENT');
    await field(f, 'Label').fill('Consent for the newsletter'); await field(f, 'Evidence expected').fill('A consent record with a notice version.');
    const condition = await submit(f, /\/processing-conditions$/, S.schemas.Condition);
    check('categories, purpose and condition are created from the set-up screen', [principalCategory.name, dataCategory.legacy_code, purpose.versions.length], [`Forms customer ${suffix}`, 'CONTACT_DETAILS', 1]);
    check('a condition chosen from the package vocabulary is traced, not unresolved', [condition.code, condition.unresolved, condition.requirement_ids.length > 0], ['CONSENT', false, true]);
    f = form('Record a processing condition');
    await field(f, 'Condition').selectOption('UNRESOLVED');
    await field(f, 'Label').fill('Basis still being established'); await field(f, 'Evidence expected').fill('To be decided.');
    await field(f, 'Why it is unresolved').fill('Legal review of the basis is outstanding.');
    const unresolved = await submit(f, /\/processing-conditions$/, S.schemas.Condition);
    check('an unresolved condition is recorded with its reason', [unresolved.unresolved, unresolved.unresolved_reason], [true, 'Legal review of the basis is outstanding.']);
    await page.screenshot({ path: resolve(shots, 'registry-setup-codex-a00.png'), fullPage: true });

    t.setPhase('notices');
    await page.goto('/workspace/registry-notices'); await waitReady(page, 'Notices');
    f = form('Create a notice');
    await field(f, 'Name').fill(`Forms newsletter notice ${suffix}`); await f.getByRole('checkbox', { name: `Forms customer ${suffix}` }).check();
    const notice = await submit(f, /\/registry-notices$/, S.schemas.RegistryNotice);
    await page.reload(); await waitReady(page, 'Notices');
    f = form('Draft a notice version');
    await field(f, 'Notice').selectOption(notice.id); await field(f, 'Language').selectOption('en');
    await field(f, 'Title').fill('Newsletter notice'); await field(f, 'Notice text').fill('We send a synthetic newsletter to subscribers who consent. You can withdraw at any time.');
    await f.getByRole('checkbox', { name: `Forms newsletter ${suffix} (v1)` }).check(); await f.getByRole('checkbox', { name: `Forms contact ${suffix}` }).check();
    await field(f, 'How to withdraw consent').fill('Use the Privacy Centre withdrawal control.'); await field(f, 'How to exercise rights').fill('Open a request in the Privacy Centre.');
    await field(f, 'How to raise a grievance').fill('Write to the synthetic grievance officer.'); await field(f, 'How to complain to the Board').fill('Use the channel the Data Protection Board publishes.');
    const drafted = await submit(f, /\/registry-notices\/[^/]+\/versions$/, S.schemas.RegistryNotice);
    const draft = drafted.versions.at(-1)!;
    check('a notice version is drafted, not published', draft.status, 'DRAFT');
    await page.reload(); await waitReady(page, 'Notices');
    f = form('Publish a draft version');
    await field(f, 'Draft version').selectOption(draft.id);
    const published = await submit(f, /\/registry-notice-versions\/[^/]+\/publication$/, S.schemas.RegistryNotice);
    check('publishing puts the version in force', published.versions.find(v => v.id === draft.id)?.status, 'PUBLISHED');

    t.setPhase('activity');
    await page.goto('/workspace/processing-activities'); await waitReady(page, 'Processing activities');
    f = form('Register a processing activity');
    await field(f, 'Name').fill(`Forms newsletter sending ${suffix}`); await field(f, 'Description').fill('Sending the synthetic newsletter.'); await field(f, 'Owner').fill('Synthetic marketing lead');
    await field(f, 'Purpose (current version)').selectOption({ label: `Forms newsletter ${suffix} (v1)` }); await field(f, 'Processing condition').selectOption(condition.id);
    await field(f, 'Does it process children’s data?').selectOption('NO'); await f.getByRole('checkbox', { name: `Forms newsletter notice ${suffix} v1 (en)` }).check();
    await field(f, 'Reason for recording').fill('Initial registration through the workspace');
    const activity = await submit(f, /\/registry-activities$/, S.schemas.Activity);
    check('a registered activity with no links states exactly what is missing', ['NO_SYSTEM', 'NO_PRINCIPAL_CATEGORY', 'NO_DATA_CATEGORY'].every(g => activity.gaps.includes(g as never)), true);
    const link = async (kind: string, target: string) => {
      await page.reload(); await waitReady(page, 'Processing activities');
      const lf = form('Link something to an activity');
      await field(lf, 'Activity').selectOption(activity.id); await field(lf, 'What to link').selectOption(kind); await field(lf, 'Target').selectOption(target);
      await field(lf, 'Basis').fill('Declared by the activity owner.');
      return submit(lf, /\/registry-activities\/[^/]+\/links$/, S.schemas.Activity);
    };
    await link('PRINCIPAL_CATEGORY', principalCategory.id); await link('DATA_CATEGORY', dataCategory.id);
    const linked = await link('SYSTEM', system.id);
    check('after linking, only the missing retention rule remains', linked.gaps, ['NO_RETENTION_RULE']);

    t.setPhase('retention');
    await page.goto('/workspace/registry-retention'); await waitReady(page, 'Retention rules and holds');
    f = form('Create a retention rule');
    await field(f, 'Name').fill(`Forms newsletter retention ${suffix}`); await field(f, 'Data Principal category').selectOption(principalCategory.id);
    await field(f, 'Activity').selectOption(activity.id); await field(f, 'Starts when').selectOption('CONSENT_WITHDRAWN');
    await field(f, 'Retention period (days)').fill('30');
    await field(f, 'When eligible').selectOption('SUPPRESS');
    await f.getByRole('button', { name: 'Create a retention rule', exact: true }).click();
    await f.getByText('A retention period and where it comes from are recorded together, or neither is.').waitFor();
    const ruleNamed = async () => (await ok(admin.call('/api/v1/admin/retention-rules?limit=100'), S.schemas.RetentionRuleList)).items.filter(r => r.name === `Forms newsletter retention ${suffix}`).length;
    check('a period without its source is refused in the browser and nothing is sent', await ruleNamed(), 0);
    await field(f, 'Period comes from').selectOption('CUSTOMER_CONFIGURATION'); await field(f, 'Source reference').fill('Retention schedule RS-7, section 2');
    const rule = await submit(f, /\/retention-rules$/, S.schemas.RetentionRule);
    check('a rule with a sourced period is resolved', [rule.resolved, rule.duration_days, rule.approval_required], [true, 30, true]);
    await page.reload(); await waitReady(page, 'Retention rules and holds');
    f = form('Place a hold');
    await field(f, 'Kind of hold').selectOption('OPERATIONAL_HOLD'); await field(f, 'Authority').fill('Litigation hold LH-12');
    await field(f, 'Reason').fill('Preserve records during the synthetic dispute.'); await field(f, 'Owner').fill('Synthetic legal team');
    await f.getByRole('button', { name: 'Place a hold', exact: true }).click();
    await f.getByText('A hold names what it covers; there is no hold on everything.').waitFor();
    await field(f, 'Activity').selectOption(activity.id);
    const hold = await submit(f, /\/retention-holds$/, S.schemas.RetentionHold);
    check('a hold is placed on what it names and is active', [hold.activity_id, hold.state], [activity.id, 'ACTIVE']);

    t.setPhase('engagement');
    await page.goto('/workspace/processor-engagements'); await waitReady(page, 'Processor engagements and data sharing');
    f = form('Record a processor engagement');
    await field(f, 'Processor').selectOption(processor.id); await field(f, 'Service provided').fill('Newsletter delivery');
    await field(f, 'Contract evidence reference').fill('DPA SYN-FORMS signed copy');
    await f.getByRole('checkbox', { name: `Forms contact ${suffix}` }).first().check(); await f.getByRole('checkbox', { name: system.name }).check();
    const engagement = await submit(f, /\/processor-engagements$/, S.schemas.Engagement);
    check('an engagement is recorded with the links chosen', [engagement.status, engagement.links.map(l => l.link_kind).sort()], ['ACTIVE', ['DATA_CATEGORY', 'SYSTEM']]);

    t.setPhase('read-back');
    const stored = await ok(admin.call(`/api/v1/admin/registry-activities/${activity.id}`), S.schemas.Activity);
    check('the stored activity carries the notice, condition and three current links', [stored.versions[0]!.notice_version_ids, stored.versions[0]!.condition_id, stored.links.filter(l => l.valid_to === null).length], [[draft.id], condition.id, 3]);
    await page.goto('/workspace/processing-activities'); await waitReady(page, 'Processing activities');
    const filter = page.getByRole('form', { name: 'Filter processing activities' });
    await filter.getByLabel('Uses system').selectOption(system.id); await filter.getByRole('button', { name: 'Filter', exact: true }).click();
    await page.getByRole('table', { name: 'Processing activities' }).getByText(`Forms newsletter sending ${suffix}`).waitFor();
    await page.screenshot({ path: resolve(shots, 'registry-activities-codex-a00.png'), fullPage: true });

    t.setPhase('read-only session');
    const auditorPage = await (await browser.newContext({ baseURL: h.config.origin })).newPage();
    const auditor = h.users.auditor!;
    await h.authWindow();
    await auditorPage.goto('/workspace/sign-in');
    await auditorPage.getByLabel('Staff email').fill(auditor.email); await auditorPage.getByLabel('Password', { exact: true }).fill(auditor.password);
    await auditorPage.getByRole('button', { name: 'Sign in', exact: true }).click();
    await auditorPage.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
    await auditorPage.goto('/workspace/registry-setup'); await waitReady(auditorPage, 'Registry set-up');
    check('a read-only session sees no creation form', await auditorPage.getByRole('form', { name: 'Register a purpose' }).count(), 0);
    check('and the server refuses the write regardless', (await (await h.login('auditor')).call('/api/v1/admin/registry-purposes', { name: 'x', owner_reference: 'x', description: 'Refused for a read-only role.', effective_from: new Date().toISOString(), change_reason: 'x', evidence_reference: null, v1_purpose_id: null }, key())).status, 403);

    check('no request left the local origin', external, []);
    check('no page or console error occurred', errors, []);
    await context.close();
  } finally { await browser.close(); }
});
