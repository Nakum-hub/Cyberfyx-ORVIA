/**
 * `npm run demo:data` — loads a synthetic DPDP dataset into the running rehearsal installation, through the same
 * authorised API the Workspace screens and the organisation's own website use, and writes what it loaded to
 * .local/profiles/rehearsal/demo/dataset.json so `npm run test:e2e:demo-data` can check every screen shows exactly that.
 *
 * The organisation is Aster (the synthetic fixture organisation), which runs an online store. Each record maps to a DPDP
 * Act 2023 / DPDP Rules 2025 duty:
 *   - a published notice with its withdrawal, rights, grievance and Board-complaint channels (s.5, Rule 3);
 *   - purpose-specific consent, given and withdrawn on the store, sent to ORVIA by the store's server (s.6, Rule 14(1));
 *   - processing on a legitimate use (s.7);
 *   - retention periods with an erasure action (s.8(7));
 *   - a processor under contract (s.8(2));
 *   - a personal-data breach (s.8(6), Rule 7);
 *   - access, correction, erasure, grievance and nomination requests (s.11–14).
 *
 * Every person is synthetic and uses an address on the reserved .example domain. Nothing is written to the database
 * directly, nothing is reset, deleted or rewritten, and no outcome is asserted on ORVIA's behalf: what ORVIA did with each
 * submission is read back and recorded as observed. Nothing leaves this installation. Loading twice is refused.
 */
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import * as S from '../shared/contracts/src/index.ts';
import { HttpFixture } from '../shared/testing/src/http-fixture.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { safeError } from '../shared/testing/src/evidence.ts';
import { privateDirectory, writePrivateJson } from './local-private.ts';
import { recordsTarget } from '../shared/testing/src/records-target.ts';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { childEnvironment, toolchainExecutable } from './orvia-cli.ts';

// Like npm start: run once under the pinned toolchain with the rehearsal profile and the local CA trusted (certificate
// verification stays on), whatever Node and environment the operator's terminal has.
if (process.env.ORVIA_DEMO_REEXEC !== '1') {
  const child = spawnSync(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: { ...childEnvironment(), ORVIA_DEMO_REEXEC: '1' } });
  process.exit(child.status ?? 1);
}

const profile = loadProfile();
if (profile.profile !== 'rehearsal' || process.argv[2] !== 'confirm:rehearsal') throw new Error('Run as: npm run demo:data (rehearsal profile, confirm:rehearsal)');

export const DEMO_STORE = 'Aster online store';
const key = () => ({ 'idempotency-key': randomUUID() });
const daysAgo = (days: number, hour = 10) => { const d = new Date(Date.now() - days * 86_400_000); d.setUTCHours(hour, 15, 0, 0); return d.toISOString(); };
async function ok<T>(response: Promise<Response>, schema: { parse(v: unknown): T }, expected = [200, 201, 202]): Promise<T> {
  const r = await response; const body = await r.json();
  if (!expected.includes(r.status)) throw new Error(`ORVIA answered ${r.status}: ${JSON.stringify(body).slice(0, 400)}`);
  return schema.parse(body);
}
const step = (text: string) => process.stdout.write(`  ok   ${text}\n`);

/** Synthetic shoppers. Names are illustrative; every address is on the reserved .example domain. */
const PEOPLE = [
  ['Priya Sharma', 'priya.sharma'], ['Arjun Mehta', 'arjun.mehta'], ['Kavya Nair', 'kavya.nair'], ['Rohan Gupta', 'rohan.gupta'],
  ['Ananya Iyer', 'ananya.iyer'], ['Vikram Singh', 'vikram.singh'], ['Meera Pillai', 'meera.pillai'], ['Aditya Rao', 'aditya.rao'],
  ['Sneha Kulkarni', 'sneha.kulkarni'], ['Farhan Ali', 'farhan.ali'], ['Ishita Bose', 'ishita.bose'], ['Karthik Reddy', 'karthik.reddy'],
  ['Neha Joshi', 'neha.joshi'], ['Siddharth Menon', 'siddharth.menon'],
].map(([name, local], i) => ({ name: name!, email: `${local}@aster.example`, ref: `cust_${1001 + i}` }));
/** Consent the store records (indexes into PEOPLE): who said yes to what, and who later withdrew marketing. */
const MARKETING_YES = PEOPLE.map((_, i) => i).filter(i => i % 5 !== 4);           // 12 people
const RECOMMEND_YES = PEOPLE.map((_, i) => i).filter(i => i % 2 === 0);           // 7 people
const MARKETING_WITHDRAWN = [1, 6, 10];                                            // 3 of the 11
const REQUESTS: { who: number; right: S.RightTypeValue; description: string }[] = [
  { who: 2, right: 'ACCESS', description: 'Please send me a copy of the personal data you hold about me and how it is used.' },
  { who: 5, right: 'ERASURE', description: 'I have closed my account. Please erase the personal data you no longer need to keep.' },
  { who: 8, right: 'CORRECTION', description: 'The phone number on my account is wrong. Please correct it to the one I entered today.' },
  { who: 11, right: 'GRIEVANCE', description: 'I kept receiving offers by SMS after I opted out. Please look into this.' },
  { who: 12, right: 'NOMINATION', description: 'I want to nominate my sister to exercise my rights if I am unable to.' },
];

const h = new HttpFixture();
try {
  const ready = await fetch(`${h.config.origin}/readyz`, { signal: AbortSignal.timeout(5000) }).catch(() => null);
  if (!ready?.ok) throw new Error('ORVIA is not running. Start it with npm start, then run npm run demo:data in a second terminal.');
  const owner = await h.login('owner'); const admin = await h.login('admin');
  const scope = h.users.owner!.scope;

  const existing = S.schemas.IntakeClientList.parse(await (await admin.call('/api/v1/admin/intake-clients?limit=100')).json());
  if (existing.items.some(c => c.name === DEMO_STORE)) {
    process.stdout.write(`\n  The demonstration data is already loaded (intake key "${DEMO_STORE}" exists). Nothing was changed.\n\n`); process.exit(0);
  }
  process.stdout.write('\n  Loading the synthetic DPDP dataset into the running installation\n  ------------------------------------------------------------\n');

  // The DPDP regulatory package. Without an approved package ORVIA cannot trace "consent" to a provision or compute any
  // statutory deadline, and it says so instead of guessing. The package is built from the official Act and Rules (the
  // five Government of India PDFs, downloaded once from their official URLs and hashed), signed with this machine's
  // local release key, imported by the owner and approved by a second super administrator (the two-person rule).
  const active = S.schemas.ActivePackage.parse(await (await owner.call(`/api/v1/admin/regulatory/active-package?as_of=${encodeURIComponent(new Date().toISOString())}`)).json());
  if (!active.package) {
    const releaseKey = resolve('.local/vendor/signing/release.json');
    if (!existsSync(releaseKey)) throw new Error('No regulatory package is in effect and this machine has no local release key (.local/vendor/signing/release.json) to sign one.');
    const release = JSON.parse(readFileSync(releaseKey, 'utf8')) as { key_id: string; private: string };
    const tool = (args: string[]) => spawnSync(process.execPath, ['--import', 'tsx', 'scripts/regulatory-package.ts', ...args], { stdio: 'inherit', windowsHide: true,
      env: { ...process.env, ORVIA_RELEASE_KEY_ID: release.key_id, ORVIA_RELEASE_PRIVATE_KEY: release.private } }).status;
    const sources = ['DPDP-ACT-2023', 'GSR-843E-2025', 'GSR-844E-2025', 'DPDP-RULES-2025', 'GSR-892E-2025'];
    if (sources.some(id => !existsSync(resolve('.local/regulatory-sources', `${id}.json`)))) {
      process.stdout.write('  ..   Downloading the official DPDP Act, Rules and notifications from meity.gov.in (once)\n');
      if (tool(['retrieve', 'confirm:official-download']) !== 0) throw new Error('The official DPDP sources could not be downloaded. Check the internet connection and run npm run demo:data again.');
    }
    const version = `1.0.${Math.floor(Date.now() / 1000)}`;
    if (tool(['build', version, '2025-11-13T00:00:00Z']) !== 0) throw new Error('The DPDP regulatory package could not be built.');
    const signed = JSON.parse(readFileSync(resolve('artifacts/regulatory', `dpdp-package-${version}.json`), 'utf8'));
    const imported = await ok(owner.call('/api/v1/admin/regulatory/packages', signed, key()), S.schemas.RegulatoryPackage);
    const reviewer = await h.login('reviewer');
    await ok(reviewer.call(`/api/v1/admin/regulatory/packages/${imported.id}/decision`, { decision: 'APPROVED', note: 'Approved for the synthetic demonstration installation after reviewing its sources and open verification items.', acknowledged_open_verification_items: true }, key()), S.schemas.RegulatoryPackage);
    step(`DPDP regulatory package ${version} built from the official sources, imported by the owner and approved by a second super administrator`);
  } else step(`DPDP regulatory package ${active.package.version} already in effect`);

  // The store as a source system, with the synthetic records adapter: no live system is contacted.
  const system = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: scope.legal_entity_id, environment_id: scope.environment_id, name: DEMO_STORE, connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
  await ok(admin.call('/api/v1/admin/connector-bindings', { system_id: system.id, adapter: 'SYNTHETIC_RECORDS_TEST_ADAPTER', system_of_record_for: [], holds_data_categories: [] }, key()), S.schemas.ConnectorBinding);
  // The store's own customer database. On this synthetic installation it is the isolated records simulator (the _targets
  // database) that stands in for the store; ORVIA itself reaches it only through the connector's agent and observer roles.
  const store = recordsTarget();
  try {
    await store.seed(scope, system.id, PEOPLE.map(p => ({ reference: p.ref, fields: { name: p.name, email: p.email, marketing_email: 'opted_in', marketing_sms: 'opted_in' } })));
    await store.mode(scope, system.id, 'HEALTHY');
  } finally { await store.end(); }
  step(`Source system: ${DEMO_STORE}, with its ${PEOPLE.length} customer accounts`);

  // Who the data is about and what is held.
  const shopper = await ok(admin.call('/api/v1/admin/data-principal-categories', { name: 'Online shopper', description: 'People with an account on the Aster online store.', regulatory_tags: [] }, key()), S.schemas.PrincipalCategory);
  const contact = await ok(admin.call('/api/v1/admin/personal-data-categories', { name: 'Contact details', description: 'Name, email address and phone number given at sign-up.', legacy_code: 'CONTACT_DETAILS' }, key()), S.schemas.DataCategory);
  const orders = await ok(admin.call('/api/v1/admin/personal-data-categories', { name: 'Order history', description: 'Orders, deliveries and returns.', legacy_code: 'ORDER_RECORDS' }, key()), S.schemas.DataCategory);
  const prefs = await ok(admin.call('/api/v1/admin/personal-data-categories', { name: 'Marketing preferences', description: 'Choices about promotional email and SMS.', legacy_code: 'MARKETING_PREFERENCES' }, key()), S.schemas.DataCategory);
  step('Data Principal category and personal-data categories');

  // Purposes (s.5(1)(i): the notice itemises them).
  const purpose = (name: string, description: string) => ok(admin.call('/api/v1/admin/registry-purposes', { name, owner_reference: 'Head of Customer Experience', description, effective_from: daysAgo(120), change_reason: 'Initial registration', evidence_reference: null, v1_purpose_id: null }, key()), S.schemas.RegistryPurpose);
  const pFulfil = await purpose('Order fulfilment and delivery', 'Processing orders, payments, delivery and returns for the person who placed them.');
  const pMarketing = await purpose('Promotional email and SMS', 'Offers, product announcements and campaign messages, only for people who said yes.');
  const pRecommend = await purpose('Personalised recommendations', 'Suggesting products from the person\'s order history, only with their consent.');
  step('Three purposes');

  // The notice (s.5, Rule 3), published.
  const notice = await ok(admin.call('/api/v1/admin/registry-notices', { name: 'Aster store privacy notice', audience_category_ids: [shopper.id] }, key()), S.schemas.RegistryNotice);
  const drafted = await ok(admin.call(`/api/v1/admin/registry-notices/${notice.id}/versions`, { locale: 'en', title: 'How Aster uses your information',
    content: 'Aster uses your contact details and order history to deliver your orders. With your consent we also send offers by email and SMS, and suggest products from your order history. Giving consent is optional and you can withdraw it at any time, as easily as you gave it. You can ask for a summary of your personal data, its correction or erasure, nominate someone to act for you, or raise a grievance.',
    purpose_version_ids: [pFulfil.versions[0]!.id, pMarketing.versions[0]!.id, pRecommend.versions[0]!.id], data_category_ids: [contact.id, orders.id, prefs.id],
    channels: { withdrawal: 'Account > Privacy on the Aster store, one click per purpose.', rights: 'Account > Privacy > Make a request on the Aster store.',
      grievance: 'Account > Privacy > Raise a grievance, answered by the Aster privacy team.', board_complaint: 'If unresolved, complain to the Data Protection Board of India through its published channel.' },
    template_reference: null, v1_notice_version_id: null }, key()), S.schemas.RegistryNotice);
  const noticeVersion = drafted.versions.at(-1)!;
  const published = await ok(admin.call(`/api/v1/admin/registry-notice-versions/${noticeVersion.id}/publication`, { effective_from: daysAgo(100) }, key()), S.schemas.RegistryNotice);
  step(`Privacy notice ${published.versions.at(-1)?.status === 'PUBLISHED' ? 'published' : 'recorded'}, with withdrawal, rights, grievance and Board channels`);

  // Conditions and processing activities, each linked to the store.
  const activity = async (name: string, description: string, purposeVersion: string, code: string, label: string, notices: string[], categories: string[]) => {
    const condition = await ok(admin.call('/api/v1/admin/processing-conditions', { code, label, effective_from: daysAgo(120), justification_reference: null, evidence_requirements: code === 'CONSENT' ? 'A recorded consent event from the store for each person.' : 'The order record in the store.', unresolved_reason: null }, key()), S.schemas.Condition);
    let a = await ok(admin.call('/api/v1/admin/registry-activities', { name, description, owner_reference: 'Head of Customer Experience', processes_child_data: 'NO', graph_activity_id: null,
      purpose_version_id: purposeVersion, condition_id: condition.id, notice_version_ids: notices, requirement_ids: [], effective_from: daysAgo(100), change_reason: 'Initial registration' }, key()), S.schemas.Activity);
    const link = (link_kind: string, target_id: string) => ok(admin.call(`/api/v1/admin/registry-activities/${a.id}/links`, { link_kind, target_id, channel: null, basis: 'Declared by the store team.', valid_from: daysAgo(100) }, key()), S.schemas.Activity);
    a = await link('PRINCIPAL_CATEGORY', shopper.id);
    for (const c of categories) a = await link('DATA_CATEGORY', c);
    return link('SYSTEM', system.id);
  };
  const aFulfil = await activity('Order fulfilment and delivery', 'Orders, payments, delivery and returns.', pFulfil.versions[0]!.id, 'LEGITIMATE_USE', 'Voluntarily provided for a specified purpose (s.7(a))', [noticeVersion.id], [contact.id, orders.id]);
  const aMarketing = await activity('Promotional email and SMS', 'Offers and campaign messages for people who consented.', pMarketing.versions[0]!.id, 'CONSENT', 'Consent (s.6)', [noticeVersion.id], [contact.id, prefs.id]);
  const aRecommend = await activity('Personalised recommendations', 'Product suggestions from order history for people who consented.', pRecommend.versions[0]!.id, 'CONSENT', 'Consent (s.6)', [noticeVersion.id], [orders.id, prefs.id]);
  step('Three processing activities: one on legitimate use, two on consent');

  // Retention (s.8(7)): erase marketing data when consent is withdrawn; erase account data two years after the account ends.
  await ok(admin.call('/api/v1/admin/retention-rules', { name: 'Marketing data after withdrawal', activity_id: aMarketing.id, principal_category_id: shopper.id, data_category_id: prefs.id, system_id: system.id,
    trigger: 'CONSENT_WITHDRAWN', duration_days: 0, duration_source: 'CUSTOMER_CONFIGURATION', source_reference: 'Aster retention schedule v3, section 2', requirement_id: null, approval_required: false, erasure_action: 'ERASE', effective_from: daysAgo(100) }, key()), S.schemas.RetentionRule);
  await ok(admin.call('/api/v1/admin/retention-rules', { name: 'Account data after the account is closed', activity_id: aFulfil.id, principal_category_id: shopper.id, data_category_id: orders.id, system_id: system.id,
    trigger: 'RELATIONSHIP_ENDED', duration_days: 730, duration_source: 'CUSTOMER_CONFIGURATION', source_reference: 'Aster retention schedule v3, section 4 (returns, warranty and tax queries)', requirement_id: null, approval_required: true, erasure_action: 'ERASE', effective_from: daysAgo(100) }, key()), S.schemas.RetentionRule);
  step('Two retention rules with erasure actions');

  // A processor under contract (s.8(2)): the delivery partner.
  const mappings = S.schemas.MappingList.parse(await (await admin.call('/api/v1/admin/target-mappings?limit=5')).json());
  let processorName: string | null = null;
  if (mappings.items[0]) {
    const processor = await ok(admin.call('/api/v1/admin/processors', { name: 'Swift Courier Services (synthetic)', role: 'PROCESSOR', authorised_purpose_ids: [mappings.items[0].purpose_id], authorised_categories: ['CONTACT_DETAILS', 'ORDER_RECORDS'],
      region: 'India', contract_reference: 'DPA-SWIFT-2026-04', owner_reference: 'Head of Logistics', incident_contact: 'privacy@swift-courier.example', subprocessors_permitted: false }, key()), S.schemas.Processor);
    await ok(admin.call('/api/v1/admin/processor-engagements', { processor_id: processor.id, service_description: 'Last-mile delivery of store orders.', subprocessor_of: null, effective_from: daysAgo(100),
      contract_evidence_reference: 'DPA-SWIFT-2026-04 signed 2026-06-01', safeguard_evidence_reference: 'Security annex A, reviewed 2026-06-01',
      links: [{ link_kind: 'DATA_CATEGORY', target_id: contact.id }, { link_kind: 'DATA_CATEGORY', target_id: orders.id }, { link_kind: 'PRINCIPAL_CATEGORY', target_id: shopper.id }, { link_kind: 'SYSTEM', target_id: system.id }] }, key()), S.schemas.Engagement);
    processorName = processor.name;
    step('Processor and its engagement (delivery partner)');
  } else process.stdout.write('  --   Processor skipped: this installation has no configured V1 purpose to authorise it for\n');

  // The store's customers as Data Principals (the email becomes a keyed digest; it is never stored).
  for (const p of PEOPLE) await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: p.ref, source_key: p.email }] }, key()), S.schemas.Subject);
  step(`${PEOPLE.length} Data Principals from the store's customer list`);

  // The store's intake key: shown once, used here, never stored.
  const intake = await ok(owner.call('/api/v1/admin/intake-clients', { name: DEMO_STORE, system_id: system.id, authenticates_customers: true, accepts_consent: true, accepts_rights: true }, key()), S.schemas.IntakeClientCreated);
  step('Intake key issued to the store (used here only; not stored)');

  // What the store's server sends.
  const send = (path: string, body: unknown) => ok(fetch(h.config.origin + path, { method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { 'content-type': 'application/json', 'idempotency-key': randomUUID(), authorization: `Bearer ${intake.key}` }, body: JSON.stringify(body) }), S.schemas.IntakeReceipt, [202]);
  const consent = (ref: string, activityId: string, decision: 'GRANTED' | 'WITHDRAWN', at: string) => send('/api/v1/intake/consents', { customer_reference: ref, activity_id: activityId, decision, occurred_at: at, notice_version_id: noticeVersion.id, evidence_reference: `Aster store account page, ${decision === 'GRANTED' ? 'opt-in' : 'opt-out'} event for ${ref}` });
  const receipts: { id: string; kind: string; ref: string }[] = [];
  for (const i of MARKETING_YES) receipts.push({ id: (await consent(PEOPLE[i]!.ref, aMarketing.id, 'GRANTED', daysAgo(40 - i))).submission_id, kind: 'marketing granted', ref: PEOPLE[i]!.ref });
  for (const i of RECOMMEND_YES) receipts.push({ id: (await consent(PEOPLE[i]!.ref, aRecommend.id, 'GRANTED', daysAgo(38 - i, 14))).submission_id, kind: 'recommendations granted', ref: PEOPLE[i]!.ref });
  for (const i of MARKETING_WITHDRAWN) receipts.push({ id: (await consent(PEOPLE[i]!.ref, aMarketing.id, 'WITHDRAWN', daysAgo(3 - (i % 3), 16))).submission_id, kind: 'marketing withdrawn', ref: PEOPLE[i]!.ref });
  step(`${receipts.length} consent decisions sent by the store (${MARKETING_WITHDRAWN.length} withdrawals)`);
  for (const r of REQUESTS) receipts.push({ id: (await send('/api/v1/intake/rights-requests', { customer_reference: PEOPLE[r.who]!.ref, right_type: r.right, description: r.description, display_name: PEOPLE[r.who]!.name, email: PEOPLE[r.who]!.email })).submission_id, kind: `request ${r.right}`, ref: PEOPLE[r.who]!.ref });
  step(`${REQUESTS.length} privacy requests sent by the store (${REQUESTS.map(r => r.right.toLowerCase()).join(', ')})`);

  // ORVIA's runner applies them. Read back, not assumed.
  process.stdout.write('  ..   Waiting for ORVIA to apply them');
  const status = async (id: string) => S.schemas.IntakeReceipt.parse(await (await fetch(`${h.config.origin}/api/v1/intake/submissions/${id}`, { headers: { authorization: `Bearer ${intake.key}` }, signal: AbortSignal.timeout(20000) })).json());
  let observed = await Promise.all(receipts.map(r => status(r.id)));
  for (let i = 0; i < 60 && observed.some(r => r.status === 'RECEIVED'); i++) { await new Promise(r => setTimeout(r, 2000)); process.stdout.write('.'); observed = await Promise.all(receipts.map(r => status(r.id))); }
  const count = (s: string) => observed.filter(r => r.status === s).length;
  process.stdout.write(`\n  ok   Applied by ORVIA: ${count('APPLIED')} of ${receipts.length}; waiting for staff: ${count('NEEDS_STAFF')}; not yet processed: ${count('RECEIVED')}\n`);

  // A personal-data breach (s.8(6), Rule 7): the store became aware yesterday at 10:15 UTC.
  const awareAt = daysAgo(1, 10);
  const incident = await ok(admin.call('/api/v1/admin/incidents', { summary: 'Order export briefly reachable through a misconfigured storage link (synthetic).', occurred_at: daysAgo(2, 8), detected_at: daysAgo(1, 9),
    became_aware_at: awareAt, occurrence_basis: 'Storage access log review by the store team.', severity: 'HIGH', severity_basis: 'Contact details and order history of store customers.',
    affected_system_ids: [system.id], affected_purpose_ids: [], affected_processor_ids: [], principal_scope: 'Customers whose orders were in the export; being established.', principal_scope_certain: false }, key()), S.schemas.Incident);
  const breach = await ok(admin.call('/api/v1/admin/personal-data-breaches', { incident_id: incident.id, affected_count: 320, affected_count_state: 'ESTIMATED', data_category_ids: [contact.id, orders.id],
    activity_ids: [aFulfil.id], system_ids: [system.id], engagement_ids: [],
    facts: { nature: 'Unauthorised access possible to an order export file.', extent: 'About 320 customers: contact details and order lines.', timing: 'Link reachable for about 26 hours.', location: 'Store storage bucket.', likely_impact: 'Unwanted contact; no payment data in the file.' },
    mitigation: 'Link revoked, storage access tightened, affected customers being identified.' }, key()), S.schemas.Breach);
  step('Personal-data breach registered');

  const dataset = {
    loaded_at: new Date().toISOString(), store: DEMO_STORE, system_id: system.id, notice_id: notice.id, notice_version_id: noticeVersion.id, processor: processorName,
    purposes: [pFulfil.name, pMarketing.name, pRecommend.name], activities: { fulfilment: aFulfil.id, marketing: aMarketing.id, recommendations: aRecommend.id },
    people: PEOPLE.map(p => ({ name: p.name, ref: p.ref })),
    expected: { principals: PEOPLE.length, marketing_records: MARKETING_YES.length, marketing_withdrawn: MARKETING_WITHDRAWN.length, recommendation_records: RECOMMEND_YES.length,
      consent_records: MARKETING_YES.length + RECOMMEND_YES.length, requests: REQUESTS.map(r => ({ right: r.right, name: PEOPLE[r.who]!.name })),
      breach: { incident_id: breach.incident_id, affected_count: 320, aware_at: awareAt }, retention_rules: 2 },
    observed: { applied: count('APPLIED'), needs_staff: count('NEEDS_STAFF'), not_processed: count('RECEIVED'),
      submissions: receipts.map((r, i) => ({ kind: r.kind, ref: r.ref, status: observed[i]!.status, reason: observed[i]!.outcome_reason, request_id: observed[i]!.rights_request?.id ?? null })) },
  };
  const directory = resolve(h.config.directory, 'demo'); privateDirectory(directory);
  writePrivateJson(resolve(directory, 'dataset.json'), dataset);
  process.stdout.write(`\n  Loaded. What was loaded is recorded in .local/profiles/rehearsal/demo/dataset.json.\n  Check every screen against it with: npm run test:e2e:demo-data\n\n`);
} catch (error) {
  process.stderr.write(`\n  Loading did not finish: ${error instanceof Error ? error.message : JSON.stringify(safeError(error))}\n  Everything recorded so far is kept and visible; nothing was reset.\n\n`);
  process.exitCode = 1;
}
