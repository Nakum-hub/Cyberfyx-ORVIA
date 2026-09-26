// DPDP operations screens, driven through the real workspace in a real browser
// on the synthetic codex-a00 profile: breaches, organisation profile, consent
// records and withdrawal, Data Principals and representatives, processor
// termination and disposition, sharing, safeguards, connector binding, rights
// execution, estate upload, notice history, package import and exemptions.
// Every record is created through the screen and read back through the API.
// Only synthetic fixtures and the synthetic records test adapter are involved.
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Locator, type Page } from '@playwright/test';
import * as S from '../../shared/contracts/src/index.ts';
import { authenticatorCode } from '../../shared/testing/src/http-fixture.ts';
import { operationsSuite, key, hoursFromNow } from '../../shared/testing/src/operations-fixture.ts';
import { fixturePackage, signFixture } from '../../shared/testing/src/regulatory-fixture.ts';
import { recordsTarget } from '../../shared/testing/src/records-target.ts';
import { loadProfile } from '../../shared/testing/src/config.ts';

if (loadProfile().profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile only');
const keyId = process.env.ORVIA_RELEASE_KEY_ID; const privateKey = process.env.ORVIA_RELEASE_PRIVATE_KEY;
if (!keyId || !privateKey || !process.env.ORVIA_RELEASE_PUBLIC_KEY) throw new Error('Set ORVIA_RELEASE_KEY_ID, ORVIA_RELEASE_PRIVATE_KEY and ORVIA_RELEASE_PUBLIC_KEY from .local/release-fixture.json.');
const t = operationsSuite('operations-screens-browser');
const { h, check, ok } = t;
const target = recordsTarget();
const executablePath = process.env.ORVIA_CHROMIUM_PATH ?? (existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined);
const scratch = resolve('.local/browser-files'); mkdirSync(scratch, { recursive: true });
const shots = resolve('output/playwright'); mkdirSync(shots, { recursive: true });

await t.run(async () => {
  try {
    await t.ensurePackage();
    const admin = await h.login('admin');
    const s = t.scope();
    const suffix = randomUUID().slice(0, 8);
    // Prerequisites configured on other screens or by the V1 workflow.
    const system = await t.boundSystem(`Screens CRM ${suffix}`);
    const setup = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: `Screens customer ${suffix}` });
    const incident = await t.incident([system.id], 2);
    const v1Purpose = await ok(admin.call('/api/v1/admin/purposes', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, code: 'order_service_demo', name: `Screens V1 purpose ${suffix}`, description: 'Synthetic V1 purpose authorising the processor.' }, key()), S.schemas.Purpose);
    const processor = await ok(admin.call('/api/v1/admin/processors', { name: `Screens vendor ${suffix}`, role: 'PROCESSOR', authorised_purpose_ids: [v1Purpose.id], authorised_categories: ['CONTACT_DETAILS'], region: 'Synthetic region',
      contract_reference: 'DPA SYN-SCREENS', owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example', subprocessors_permitted: false }, key()), S.schemas.Processor);
    const engagement = await ok(admin.call('/api/v1/admin/processor-engagements', { processor_id: processor.id, service_description: `Screens delivery ${suffix}`, subprocessor_of: null, effective_from: hoursFromNow(-24 * 30),
      contract_evidence_reference: 'DPA SYN-SCREENS', safeguard_evidence_reference: null, links: [{ link_kind: 'SYSTEM', target_id: system.id }] }, key()), S.schemas.Engagement);
    const rightsRef = `rs_${randomUUID().slice(0, 12)}`;
    await target.seed(s, system.id, [{ reference: rightsRef, fields: { email: 'alice@records.example', notes: 'synthetic' } }]);
    const aliceSubject = await t.principalSubject('alice', [{ system_id: system.id, target_reference: rightsRef }]);
    const request = await t.executingRequest('ERASURE', h.users.alice!.principal_id!, [{ system_id: system.id, action: 'ERASE_RECORD' }]);
    await ok(admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ACTIVITY', scope_id: setup.activity.id, as_of: null }, key()), S.schemas.ApplicabilityEvaluation);

    const browser = await chromium.launch({ headless: true, ...executablePath ? { executablePath } : {} });
    const errors: string[] = []; const external: string[] = [];
    try {
      const context = await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1440, height: 1000 } });
      const page = await context.newPage();
      page.on('pageerror', e => errors.push(e.message));
      page.on('console', m => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); });
      page.on('request', r => { if (new URL(r.url()).origin !== h.config.origin) external.push(r.url()); });

      t.setPhase('sign-in');
      const user = h.users.owner!;
      await h.authWindow();
      await page.goto('/workspace/sign-in');
      await page.getByLabel('Staff email').fill(user.email);
      await page.getByLabel('Password', { exact: true }).fill(user.password);
      await page.getByRole('button', { name: 'Sign in', exact: true }).click();
      await page.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(user.totp_uri!));
      await page.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
      await page.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();

      const form = (name: string) => page.getByRole('form', { name });
      const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const field = (f: Locator, label: string) => f.getByLabel(new RegExp(`^${escape(label)}( \\*)?$`));
      async function submit<T>(f: Locator, path: RegExp, schema: { parse(v: unknown): T }, button: string) {
        const response = page.waitForResponse(r => path.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
        await f.getByRole('button', { name: button, exact: true }).click();
        const received = await response; const body = await received.json();
        if (![200, 201].includes(received.status())) throw new Error(`Unexpected ${received.status()} from ${received.url()}: ${JSON.stringify(body).slice(0, 400)}`);
        return schema.parse(body);
      }
      /** For a form that navigates on success: the response body is gone with the page, so only the status is taken here. */
      async function submitAndLeave(f: Locator, path: RegExp, button: string) {
        const response = page.waitForResponse(r => path.test(new URL(r.url()).pathname) && r.request().method() === 'POST');
        await f.getByRole('button', { name: button, exact: true }).click();
        return (await response).status();
      }
      const open = async (p: Page, path: string, heading: string) => { await p.goto(path); await p.getByRole('heading', { name: heading, exact: true }).first().waitFor(); await p.waitForLoadState('networkidle'); };

      t.setPhase('breach');
      await open(page, '/workspace/personal-data-breaches', 'Personal-data breaches');
      let f = form('Register as a personal-data breach');
      await field(f, 'Incident').selectOption(incident.id);
      await field(f, 'People affected').selectOption('UNKNOWN'); await field(f, 'Number of people').fill('12');
      for (const [label, value] of [['Nature', 'Synthetic exposure of contact details.'], ['Extent', 'One synthetic system.'], ['Timing', 'Two hours before awareness.'], ['Location', 'Synthetic data centre.'], ['Likely impact', 'Unwanted contact.']]) await field(f, label!).fill(value!);
      await f.getByRole('checkbox', { name: system.name }).check();
      await f.getByRole('button', { name: 'Register as a personal-data breach', exact: true }).click();
      await f.getByText('Leave the number blank when it is unknown.').waitFor();
      await field(f, 'Number of people').fill('');
      check('registration is accepted', await submitAndLeave(f, /\/personal-data-breaches$/, 'Register as a personal-data breach'), 201);
      await page.waitForURL(`**/workspace/personal-data-breaches/${incident.id}`);
      const registered = await ok(admin.call(`/api/v1/admin/personal-data-breaches/${incident.id}`), S.schemas.Breach);
      check('a breach registered on screen is pinned with deadlines from the package', [registered.incident_id, registered.affected_count_state, registered.tasks.length > 0], [incident.id, 'UNKNOWN', true]);
      await page.waitForLoadState('networkidle');
      f = form('Record corrected facts');
      await field(f, 'People affected').selectOption('ESTIMATED'); await field(f, 'Number of people').fill('40');
      const corrected = await submit(f, /\/personal-data-breaches\/[^/]+\/facts$/, S.schemas.Breach, 'Record corrected facts');
      check('correcting the facts keeps the pinned package and deadlines', [corrected.affected_count, corrected.package.id, corrected.tasks.map(x => x.due_at)], [40, registered.package.id, registered.tasks.map(x => x.due_at)]);

      t.setPhase('organisation profile');
      await open(page, '/workspace/organisation-profile', 'Organisation profile');
      f = form('Record profile version');
      await field(f, 'Significant Data Fiduciary status').selectOption('DESIGNATED');
      await field(f, 'Reason for this version').fill('Recording the DPO contact from the workspace.');
      await f.getByRole('button', { name: 'Record profile version', exact: true }).click();
      await f.getByText('A designation cites the Government notification that made it.').waitFor();
      await field(f, 'Significant Data Fiduciary status').selectOption('UNKNOWN'); await field(f, 'DPO contact').fill('dpo@synthetic.example');
      const profile = await submit(f, /\/organisation-profile$/, S.schemas.OrganisationProfile, 'Record profile version');
      check('a profile version is recorded; unknown SDF status leaves no obligation open (history is kept)', [profile.sdf_status, profile.dpo_contact, profile.sdf_obligations.filter(o => o.state === 'OPEN').length], ['UNKNOWN', 'dpo@synthetic.example', 0]);

      t.setPhase('data principal');
      await open(page, '/workspace/data-principals', 'Data Principals');
      f = form('Register Data Principal');
      const personRef = `dp_${randomUUID().slice(0, 12)}`;
      await field(f, 'System 1').selectOption(system.id); await field(f, 'Record key 1').fill(personRef); await field(f, 'Source identifier 1').fill('person@synthetic.example');
      const person = await submit(f, /\/data-principals$/, S.schemas.Subject, 'Register Data Principal');
      check('a person is registered with a keyed reference and no stored identifier', [person.references.length, person.references[0]!.has_source_key], [1, true]);
      await page.getByRole('heading', { name: 'Maintain this person' }).waitFor(); await page.waitForLoadState('networkidle');
      f = form('Start a relationship context');
      await field(f, 'Context').selectOption({ label: setup.category.name }); await field(f, 'Status').selectOption('ACTIVE'); await field(f, 'Evidence').selectOption('UNKNOWN');
      const relationship = await submit(f, /\/data-principal-relationships$/, S.schemas.Relationship, 'Start a relationship context');
      check('a relationship context is recorded with unknown evidence kept unknown', [relationship.status, relationship.evidence_state, relationship.effective_from], ['ACTIVE', 'UNKNOWN', null]);
      f = form('Record a representative');
      await field(f, 'Kind').selectOption('GUARDIAN'); await field(f, 'Who').fill('Guardian reference G-1'); await field(f, 'Authority evidence').fill('Court order CO-1 (synthetic)');
      const guardian = await submit(f, /\/data-principal-representatives$/, S.schemas.Representative, 'Record a representative');
      check('a representative starts unverified', guardian.verification, 'UNVERIFIED');
      await page.waitForLoadState('networkidle');
      f = form('Verify a representative');
      await field(f, 'Representative').selectOption(guardian.id); await field(f, 'Outcome').selectOption('VERIFIED'); await field(f, 'Verification evidence').fill('Order checked against the court register');
      const refused = page.waitForResponse(r => r.url().endsWith(`/data-principal-representatives/${guardian.id}/verification`));
      await f.getByRole('button', { name: 'Verify a representative', exact: true }).click();
      check('the person who recorded a representative cannot verify them', (await refused).status(), 403);
      // Verification by a second staff member, in their own browser session.
      const second = await (await browser.newContext({ baseURL: h.config.origin, viewport: { width: 1440, height: 1000 } })).newPage();
      second.on('pageerror', e => errors.push(e.message));
      const reviewer = h.users.reviewer!;
      await h.authWindow();
      await second.goto('/workspace/sign-in');
      await second.getByLabel('Staff email').fill(reviewer.email); await second.getByLabel('Password', { exact: true }).fill(reviewer.password);
      await second.getByRole('button', { name: 'Sign in', exact: true }).click();
      await second.getByLabel('Authenticator code', { exact: true }).fill(authenticatorCode(reviewer.totp_uri!));
      await second.getByRole('button', { name: 'Verify authenticator', exact: true }).click();
      await second.getByRole('heading', { name: 'Signed in', exact: true }).waitFor();
      await open(second, '/workspace/data-principals', 'Data Principals');
      const search = second.getByRole('form', { name: 'Search Data Principals' });
      await search.getByLabel('System', { exact: true }).selectOption(system.id); await search.getByLabel('Record key in that system').fill(personRef);
      await search.getByRole('button', { name: 'Search', exact: true }).click();
      await second.getByRole('row').filter({ hasText: person.id.slice(0, 8) }).getByRole('button', { name: 'Open' }).click();
      await second.getByRole('heading', { name: 'Maintain this person' }).waitFor(); await second.waitForLoadState('networkidle');
      const vf = second.getByRole('form', { name: 'Verify a representative' });
      await vf.getByLabel(/^Representative/).selectOption(guardian.id); await vf.getByLabel(/^Outcome/).selectOption('VERIFIED'); await vf.getByLabel(/^Verification evidence/).fill('Order checked against the court register');
      const verifiedResponse = second.waitForResponse(r => r.url().endsWith(`/data-principal-representatives/${guardian.id}/verification`));
      await vf.getByRole('button', { name: 'Verify a representative', exact: true }).click();
      const verified = S.schemas.Representative.parse(await (await verifiedResponse).json());
      check('a different staff member verifies the representative', [verified.verification, verified.verified_by !== null], ['VERIFIED', true]);
      await second.context().close();
      await page.reload(); await page.waitForLoadState('networkidle');
      const own = page.getByRole('form', { name: 'Search Data Principals' });
      await own.getByLabel('System', { exact: true }).selectOption(system.id); await own.getByLabel('Record key in that system').fill(personRef);
      await own.getByRole('button', { name: 'Search', exact: true }).click();
      await page.getByRole('row').filter({ hasText: person.id.slice(0, 8) }).getByRole('button', { name: 'Open' }).click();
      await page.getByRole('heading', { name: 'Maintain this person' }).waitFor(); await page.waitForLoadState('networkidle');
      f = form('Record child status');
      await field(f, 'Status').selectOption('CHILD'); await field(f, 'Basis').fill('Date of birth in the enrolment record');
      await field(f, 'Guardian').selectOption(guardian.id); await field(f, 'Verifiable consent').selectOption('NOT_ESTABLISHED');
      await f.getByRole('button', { name: 'Record child status', exact: true }).click();
      await f.getByText('A known status is recorded with the evidence it rests on.').waitFor();
      await field(f, 'Evidence reference').fill('Enrolment record ER-2 (synthetic)');
      const child = await submit(f, /\/child-status-records$/, S.schemas.ChildStatusView, 'Record child status');
      check('child status is recorded with its guardian', [child.child_status, child.guardian_id, child.verifiable_consent], ['CHILD', guardian.id, 'NOT_ESTABLISHED']);

      t.setPhase('consent record and withdrawal');
      await open(page, '/workspace/consent-records', 'Consent records');
      f = form('Create consent record');
      await field(f, 'Data Principal identifier').fill(person.id); await field(f, 'Activity').selectOption(setup.activity.id); await field(f, 'Channel').fill('WEB_FORM');
      const record = await submit(f, /\/consent-records$/, S.schemas.ConsentRecord, 'Create consent record');
      check('a consent record starts unknown, never granted', record.current_status, 'UNKNOWN');
      await page.getByRole('heading', { name: `Consent record ${record.id.slice(0, 8)}` }).waitFor().catch(() => undefined);
      await page.waitForLoadState('networkidle');
      const event = async (kind: string, at: string, reference: string) => {
        const ef = form('Record a consent event');
        await field(ef, 'Event').selectOption(kind); await field(ef, 'Occurred at').fill(at); await field(ef, 'Evidence').selectOption('EVIDENCE_AVAILABLE'); await field(ef, 'Evidence reference').fill(reference);
        return submit(ef, /\/consent-records\/[^/]+\/events$/, S.schemas.ConsentRecord, 'Record a consent event');
      };
      const local = (hours: number) => { const d = new Date(Date.now() + hours * 3_600_000); const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
      await event('GRANTED', local(-48), 'web-form:granted');
      const withdrawn = await event('WITHDRAWN', local(-1), 'web-form:withdrawn');
      check('a withdrawal recorded on screen opens exactly one propagation run', [withdrawn.current_status, withdrawn.withdrawal_run_ids.length], ['WITHDRAWN', 1]);
      const wdRun = await ok(admin.call(`/api/v1/admin/workflow-runs/${withdrawn.withdrawal_run_ids[0]}`), S.schemas.WorkflowRun);
      check('the run suppresses in the linked system', [wdRun.kind, wdRun.counts.total_discovered], ['CONSENT_WITHDRAWAL', 1]);

      t.setPhase('processors, sharing, safeguards, connectors');
      await open(page, '/workspace/processor-engagements', 'Processor engagements and data sharing');
      f = form('Terminate engagement');
      await field(f, 'Engagement').selectOption(engagement.id); await field(f, 'Reason').fill('Service ended at contract expiry.');
      const terminated = await submit(f, /\/termination$/, S.schemas.Engagement, 'Terminate engagement');
      check('termination closes the engagement and requires return or deletion', [terminated.status, terminated.disposition_state], ['TERMINATED', 'PENDING']);
      await page.reload(); await page.waitForLoadState('networkidle');
      f = form('Record return or deletion');
      await field(f, 'Engagement').selectOption(engagement.id); await field(f, 'Evidence kind').selectOption('PROCESSOR_STATEMENT'); await field(f, 'Evidence reference').fill('Vendor deletion letter DL-3');
      const disposed = await submit(f, /\/disposition$/, S.schemas.Engagement, 'Record return or deletion');
      check('a processor statement is recorded as a confirmation, never as verified', disposed.disposition_state, 'PROCESSOR_CONFIRMED');
      f = form('Record data share');
      await field(f, 'Activity').selectOption(setup.activity.id); await field(f, 'Personal data category').selectOption(setup.dataCategory.id);
      await field(f, 'Purpose').selectOption(setup.purpose.versions[0]!.id); await field(f, 'Other recipient').fill('Synthetic logistics partner');
      const share = await submit(f, /\/data-sharing-links$/, S.schemas.SharingLink, 'Record data share');
      check('a data share names exactly one recipient', [share.recipient_reference, share.engagement_id], ['Synthetic logistics partner', null]);
      await open(page, '/workspace/registry-setup', 'Registry set-up');
      f = form('Record a safeguard');
      await field(f, 'Kind').selectOption('ENCRYPTION'); await field(f, 'Description').fill('Disk encryption on the CRM hosts'); await field(f, 'Evidence').selectOption('EVIDENCE_AVAILABLE');
      await f.getByRole('button', { name: 'Record a safeguard', exact: true }).click();
      await f.getByText('Only available evidence carries a reference, and it always does.').waitFor();
      await field(f, 'Evidence reference').fill('Encryption report ER-9');
      const safeguard = await submit(f, /\/security-safeguards$/, S.schemas.Safeguard, 'Record a safeguard');
      check('a safeguard is recorded with its evidence', [safeguard.kind, safeguard.evidence_reference], ['ENCRYPTION', 'Encryption report ER-9']);
      const manualSystem = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: `Screens paper index ${suffix}`, connector: 'LEGACY_MANUAL' }, key()), S.schemas.System);
      await page.reload(); await page.waitForLoadState('networkidle');
      f = form('Bind a connector');
      await field(f, 'System').selectOption(manualSystem.id); await field(f, 'Adapter').selectOption('MANUAL_ONLY');
      const binding = await submit(f, /\/connector-bindings$/, S.schemas.ConnectorBinding, 'Bind a connector');
      check('a manual-only binding declares no automated action', [binding.adapter, binding.capabilities.erase, binding.capabilities.suppress], ['MANUAL_ONLY', false, false]);

      t.setPhase('rights execution');
      await open(page, `/workspace/rights/${request.id}`, 'DPDP execution');
      f = form('Open DPDP case profile');
      await field(f, 'Data Principal identifier').fill(aliceSubject.id);
      const caseProfile = await submit(f, /\/case-profile$/, S.schemas.CaseProfile, 'Open DPDP case profile');
      check('a case profile is pinned to the package in force at receipt', [caseProfile.rights_request_id, caseProfile.package?.distribution], [request.id, 'TEST_FIXTURE']);
      f = form('Start execution across systems');
      await f.waitFor();
      check('execution is accepted', await submitAndLeave(f, /\/workflow-runs\/rights$/, 'Start execution across systems'), 201);
      await page.waitForURL(/\/workspace\/operations-runs\/[0-9a-f-]{36}$/);
      const run = await ok(admin.call(`/api/v1/admin/workflow-runs/${page.url().split('/').at(-1)}`), S.schemas.WorkflowRun);
      check('starting execution plans an erasure that waits for a second person', [run.kind, run.approval_required], ['RIGHTS_EXECUTION', true]);

      t.setPhase('estate import');
      await open(page, '/workspace/estate-imports', 'Existing-data onboarding');
      f = form('Create import job');
      await field(f, 'Source').fill(`Screens CRM export ${suffix}`);
      const job = await submit(f, /\/bulk-jobs$/, S.schemas.BulkJob, 'Create import job');
      const row = (n: number) => ({ row_key: `row-${suffix}-${n}`, source_key: null, references: [{ system_id: system.id, target_reference: `im_${suffix}_${n}` }],
        relationships: [{ category_id: setup.category.id, status: 'UNKNOWN', effective_from: null, effective_to: null, source_reference: null, evidence_state: 'UNKNOWN', evidence_reference: null }], consent: [], notice_deliveries: [] });
      const bad = resolve(scratch, `estate-bad-${suffix}.jsonl`); writeFileSync(bad, `${JSON.stringify(row(1))}\n${JSON.stringify({ ...row(2), references: [] })}\n`);
      await page.getByLabel('Estate file (JSON array or JSON Lines)').setInputFiles(bad);
      await page.getByText('Nothing was sent: the file has invalid rows').waitFor();
      check('an estate file with an invalid row is refused whole in the browser', (await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}`), S.schemas.BulkJob)).counts.received, 0);
      const good = resolve(scratch, `estate-good-${suffix}.json`); writeFileSync(good, JSON.stringify([row(1), row(2)]));
      await page.getByLabel('Estate file (JSON array or JSON Lines)').setInputFiles(good);
      await page.getByText('2 valid row(s) ready.').waitFor();
      await page.getByRole('button', { name: 'Upload rows', exact: true }).click();
      await page.getByText('All 2 rows received. Apply them from the job below.').waitFor();
      await page.getByRole('row').filter({ hasText: `Screens CRM export ${suffix}` }).getByRole('button', { name: 'Open' }).click();
      const applied = page.waitForResponse(r => r.url().endsWith(`/bulk-jobs/${job.id}/processing`) && r.request().method() === 'POST');
      await page.getByRole('button', { name: 'Apply next 500 rows' }).click(); await applied;
      const imported = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}`), S.schemas.BulkJob);
      check('uploaded rows are applied from the checkpoint', [imported.counts.received, imported.counts.applied, imported.counts.error], [2, 2, 0]);

      t.setPhase('notice history');
      const notice = await ok(admin.call('/api/v1/admin/registry-notices', { name: `Screens notice ${suffix}`, audience_category_ids: [setup.category.id] }, key()), S.schemas.RegistryNotice);
      const drafted = await ok(admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, { locale: 'en', title: 'Screens notice', content: 'Synthetic notice text for the history lookup.', purpose_version_ids: [setup.purpose.versions[0]!.id], data_category_ids: [setup.dataCategory.id],
        channels: { withdrawal: 'Use the Privacy Centre withdrawal control.', rights: 'Open a request in the Privacy Centre.', grievance: 'Write to the grievance officer.', board_complaint: 'Use the Board complaint channel.' }, template_reference: null, v1_notice_version_id: null }, key()), S.schemas.RegistryNotice);
      const version = drafted.versions.at(-1)!;
      await ok(admin.call(`/api/v1/admin/registry-notice-versions/${version.id}/publication`, { effective_from: hoursFromNow(-1) }, key()), S.schemas.RegistryNotice);
      await open(page, '/workspace/registry-notices', 'Notices');
      f = form('Which version applied');
      await field(f, 'Notice').selectOption(notice.id); await field(f, 'At').fill(local(-2));
      await f.getByRole('button', { name: 'Look up', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'No version applied.' }).waitFor();
      await field(f, 'At').fill(local(0));
      await f.getByRole('button', { name: 'Look up', exact: true }).click();
      await page.getByRole('status').filter({ hasText: 'Version 1 (“Screens notice”)' }).waitFor();
      check('the history lookup names the version in effect at each time', true, true);
      f = form('Record a delivery');
      await field(f, 'Notice version').selectOption(version.id); await field(f, 'Population').fill('Synthetic web sign-ups'); await field(f, 'Channel').fill('WEB_BANNER');
      await field(f, 'Source reference').fill('Banner log BL-4'); await field(f, 'Result').selectOption('PRESENTED');
      const delivery = await submit(f, /\/notice-delivery-evidence$/, S.schemas.NoticeDelivery, 'Record a delivery');
      check('delivery evidence is recorded against the version shown', [delivery.notice_version_id, delivery.result], [version.id, 'PRESENTED']);

      t.setPhase('regulatory import and exemption');
      const pkgFile = resolve(scratch, `package-${suffix}.json`);
      writeFileSync(pkgFile, JSON.stringify(signFixture(fixturePackage({ version: `3.${Date.now()}.0`, previous_version: null, effective_from: hoursFromNow(24 * 365), requirement_effective_from: '2025-01-01' }), keyId, privateKey)));
      await open(page, '/workspace/regulatory', 'Regulatory packages');
      f = form('Import package');
      await f.locator('input[type=file]').setInputFiles(pkgFile);
      const importedPkg = await submit(f, /\/regulatory\/packages$/, S.schemas.RegulatoryPackage, 'Import package');
      check('an imported package waits for a second approver and is not in force', [importedPkg.state, importedPkg.active], ['IMPORTED', false]);
      await open(page, '/workspace/regulatory/applicability', 'Applicability');
      f = form('Record exemption');
      const decision = await f.getByLabel(/^Decision/).locator('option').nth(1).getAttribute('value');
      await field(f, 'Decision').selectOption(decision!); await field(f, 'Basis').fill('Recorded exemption under a synthetic authority for validation.');
      const exempt = await submit(f, /\/applicability\/overrides$/, S.schemas.ApplicabilityDecision, 'Record exemption');
      check('an exemption is recorded with its basis and keeps the original', [exempt.result, exempt.override_of], ['EXEMPT_WITH_RECORDED_BASIS', decision]);

      t.setPhase('evidence page');
      await open(page, '/workspace/operations-evidence', 'Evidence and events');
      await page.getByRole('table', { name: 'Evidence records' }).waitFor();
      await page.getByRole('table', { name: 'Operational events' }).waitFor();
      check('evidence records and operational events are listed', true, true);
      await page.screenshot({ path: resolve(shots, 'operations-evidence-codex-a00.png') });

      check('no request left the local origin', external, []);
      check('no page or console error occurred', errors, []);
      await context.close();
    } finally { await browser.close(); }
  } finally { await target.end(); }
});
