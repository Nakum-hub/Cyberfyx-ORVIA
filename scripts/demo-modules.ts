/**
 * `npm run demo:modules` — fills the remaining organisation modules with one coherent, synthetic Aster story (owner
 * request 2026-10-03: every module shows how it works in front of the CEO). Runs after `demo:data` (and its inventory),
 * through the real API as the organisation's super administrator, so every record carries the same checks, audit and
 * entitlements as staff work. Rehearsal only. If the GRC framework below already exists, nothing is changed.
 *
 *   Organisation profile · DPDP framework, controls, risks and control tests (with a first run) · a DPIA template, a
 *   DPIA and its finding · a processor due-diligence assessment and finding · the store's recommendation-ranking
 *   system in AI governance · the store website in Website consent · contact-preference topics · a notification
 *   template · a statutory retention constraint and a legal hold · a nominee for a shopper · derived coverage gaps.
 *
 * Each step is independent: a refused step is reported with ORVIA's answer and the rest continue; the run exits 1 if
 * any step was refused, so a partial load is never reported as complete.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { childEnvironment, toolchainExecutable } from './orvia-cli.ts';

if (process.env.ORVIA_DEMO_REEXEC !== '1') {
  const child = spawnSync(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: { ...childEnvironment(), ORVIA_DEMO_REEXEC: '1' } });
  process.exit(child.status ?? 1);
}
const { randomUUID } = await import('node:crypto');
const { HttpFixture } = await import('../shared/testing/src/http-fixture.ts');

const FRAMEWORK = 'DPDP Act 2023 and DPDP Rules 2025 (Aster working set)';
const h = new HttpFixture();
if (h.config.profile !== 'rehearsal') throw new Error('Demonstration modules are loaded on the rehearsal installation only.');
const file = resolve('.local/profiles/rehearsal/demo/dataset.json');
if (!existsSync(file)) { process.stdout.write('\n  Run npm run demo:data first.\n\n'); process.exit(1); }
const dataset = JSON.parse(readFileSync(file, 'utf8')) as { system_id: string };
const owner = await h.login('owner');
// A second person for four-eyes steps: ORVIA refuses publication by a template's author and verification by its recorder.
const second = await h.login('reviewer');
const day = 86_400_000;
const at = (days: number) => new Date(Date.now() + days * day).toISOString();
type Json = Record<string, unknown> & { id?: string; items?: Record<string, unknown>[] };
const failures: string[] = [];
const get = async (path: string) => (await (await owner.call(path)).json()) as Json;
const post = async (path: string, body?: unknown, who = owner): Promise<Json> => {
  const r = await who.call(path, body ?? {}, { 'idempotency-key': randomUUID() });
  const text = await r.text();
  if (r.status >= 300) throw new Error(`${r.status} ${text.slice(0, 300)}`);
  return (text ? JSON.parse(text) : {}) as Json;
};
async function step(name: string, run: () => Promise<unknown>) {
  try { await run(); process.stdout.write(`  ok   ${name}\n`); }
  catch (e) { failures.push(name); process.stdout.write(`  FAIL ${name}: ${(e as Error).message.slice(0, 300)}\n`); }
}

// Re-runnable: a step whose records already exist is skipped (matched by name), so a partial load can be completed.
const has = async (path: string, match: (x: Record<string, unknown>) => boolean) => ((await get(path)).items ?? []).some(match);
const loaded = await has('/api/v1/admin/grc/frameworks?limit=100', f => f.name === FRAMEWORK);
const skip = (name: string) => { process.stdout.write(`  --   ${name}: already loaded\n`); };

const find = async (path: string, match: (x: Record<string, unknown>) => boolean) => ((await get(path)).items ?? []).find(match) as Json | undefined;
const purposeService = await find('/api/v1/admin/purposes?limit=100', p => p.code === 'order_service_demo');
const purposeMarketing = await find('/api/v1/admin/purposes?limit=100', p => p.code === 'promotional_marketing');
const activityMarketing = await find('/api/v1/admin/processing-activities?limit=100', a => a.name === 'Send promotional email and SMS');
const asset = async (name: string) => find('/api/v1/admin/data-assets?limit=100', a => a.name === name && a.system_id === dataset.system_id);
const accounts = await asset('Customer accounts'); const orders = await asset('Order history'); const tickets = await asset('Support tickets');
const processor = await find('/api/v1/admin/processors?limit=100', p => String(p.name).startsWith('Swift Courier'));
if (!purposeService || !purposeMarketing || !activityMarketing || !accounts || !orders || !tickets) { process.stdout.write('\n  Run npm run demo:inventory first (the data inventory these records refer to is missing).\n\n'); process.exit(1); }

if (loaded) skip('organisation profile, framework, controls, risks, control tests, assessments, AI, website, preferences, templates, retention'); else {
await step('Organisation profile: e-commerce entity, not a Significant Data Fiduciary, DPO and grievance contacts', () => post('/api/v1/admin/organisation-profile', {
  sdf_status: 'NOT_DESIGNATED', sdf_designation_reference: null, dpo_contact: 'dpo@aster.example', grievance_contact: 'grievance@aster.example',
  independent_auditor_reference: null, facts: { third_schedule_class: 'E_COMMERCE_ENTITY' }, effective_from: at(-90), reason: 'Annual review of the organisation profile by the DPO.' }));

const controls: string[] = [];
await step('Framework, 5 controls and 3 risks (Frameworks & controls)', async () => {
  const fw = await post('/api/v1/admin/grc/frameworks', { name: FRAMEWORK, version: '2025-11', source_reference: 'Gazette of India: DPDP Act 2023 (No. 22 of 2023); DPDP Rules 2025',
    requirements: [
      { code: 'S5-NOTICE', description: 'Section 5 and Rule 3: notice before or at the time of seeking consent, itemising personal data and purpose.' },
      { code: 'S6-CONSENT', description: 'Section 6: free, specific, informed, unconditional and unambiguous consent; withdrawal as easy as giving it.' },
      { code: 'S8-SECURITY', description: 'Section 8(5) and Rule 6: reasonable security safeguards to prevent personal data breach.' },
      { code: 'S8-BREACH', description: 'Section 8(6) and Rule 7: intimation of a personal data breach to the Board and each affected Data Principal.' },
      { code: 'S11-14-RIGHTS', description: 'Sections 11 to 14 and Rule 14: access, correction, erasure, grievance redressal and nomination.' },
      { code: 'S8-RETENTION', description: 'Section 8(7) and Rule 8: erase when the purpose is no longer served, with 48 hours notice before erasure.' }] });
  const control = async (title: string, description: string, codes: string[]) => controls.push((await post('/api/v1/admin/grc/controls', { title, description, owner_reference: 'Data Protection Officer', review_interval_days: 90,
    mappings: codes.map(requirement_code => ({ framework_id: fw.id, requirement_code })) })).id!);
  await control('Notice shown before every consent request', 'The store shows the published Aster notice, in the shopper\'s language, before any consent checkbox.', ['S5-NOTICE']);
  await control('Withdrawal stops marketing everywhere', 'A withdrawal recorded in ORVIA blocks the CRM and the SMS gateway before the next campaign.', ['S6-CONSENT']);
  await control('Processor contracts and security annex', 'Every processor has a signed DPA with a security annex reviewed yearly.', ['S8-SECURITY']);
  await control('72-hour breach intimation runbook', 'Breaches are assessed and intimated to the Board within 72 hours; affected shoppers are told without delay.', ['S8-BREACH']);
  await control('Privacy requests answered within the deadline', 'Access, correction, erasure, grievance and nomination requests are tracked to closure within 90 days.', ['S11-14-RIGHTS', 'S8-RETENTION']);
  const risk = (title: string, description: string, likelihood: number, impact: number, ids: string[]) => post('/api/v1/admin/grc/risks', { title, description, owner_reference: 'Head of Customer Experience', likelihood, impact, review_due_at: at(60), control_ids: ids });
  await risk('Marketing sent after withdrawal', 'An SMS campaign tool that is not synchronised could message shoppers who withdrew consent.', 3, 4, [controls[1]!]);
  await risk('Courier partner breach exposes delivery addresses', 'A breach at the delivery partner would expose names, phone numbers and addresses.', 2, 4, [controls[2]!, controls[3]!]);
  await risk('Erasure misses the nightly backup', 'Erased accounts could survive in backups for up to 30 days and be restored.', 2, 3, [controls[4]!]);
});

await step('Continuous compliance: 3 automated control tests, each run once', async () => {
  for (const [i, name, check_kind] of [[1, 'Every consent event carries evidence', 'CONSENT_EVENTS_HAVE_EVIDENCE'], [1, 'Withdrawals reached every system', 'WITHDRAWALS_PROPAGATED'], [2, 'Every processor has an agreement', 'PROCESSORS_HAVE_AGREEMENT']] as const) {
    const t = await post('/api/v1/admin/grc/control-tests', { control_id: controls[i], name, check_kind, maximum_violations: 0, interval_minutes: 1440 });
    await post(`/api/v1/admin/grc/control-tests/${t.id}/runs`);
  }
});

}
if (await has('/api/v1/admin/impact-assessments?limit=100', a => a.title === 'DPIA: personalised recommendations on the Aster store')) skip('impact assessments'); else
await step('Impact assessments: a published DPIA template, a DPIA for personalised recommendations and a finding', async () => {
  const existing = ((await get('/api/v1/admin/impact-templates?limit=100')).items ?? []).find(t => t.name === 'Aster DPIA (customer data)') as Json | undefined;
  const template = existing ?? await post('/api/v1/admin/impact-templates', { template_key: null, kind: 'DPIA', name: 'Aster DPIA (customer data)', description: 'Data protection impact assessment for new or changed processing of shopper data.',
    questions: [
      { key: 'profiling', text: 'Does the processing profile shoppers to personalise offers?', answer_type: 'YES_NO', choices: [], required: true, evidence_required: true, finding_when: 'YES', finding_severity: 'MEDIUM', guidance: 'Profiling for offers needs consent and an easy opt-out.' },
      { key: 'children', text: 'Could the processing reach children under 18?', answer_type: 'YES_NO', choices: [], required: true, evidence_required: false, finding_when: 'YES', finding_severity: 'HIGH', guidance: 'Section 9: verifiable parental consent; no tracking or targeted advertising.' },
      { key: 'shares', text: 'Is personal data shared with a third party?', answer_type: 'YES_NO', choices: [], required: true, evidence_required: true, finding_when: 'YES', finding_severity: 'MEDIUM', guidance: null }],
    requirement_ids: [], review_interval_days: 365 });
  if (!existing || existing.status !== 'PUBLISHED') await post(`/api/v1/admin/impact-templates/${template.id}/publication`, { action: 'PUBLISH' }, second);
  const dpia = await post('/api/v1/admin/impact-assessments', { template_id: template.id, subject_kind: 'ORGANISATION', subject_id: null, title: 'DPIA: personalised recommendations on the Aster store', owner_reference: 'Data Protection Officer', due_at: at(21) });
  await post(`/api/v1/admin/impact-assessments/${dpia.id}/findings`, { question_key: null, title: 'Recommendation profile kept after marketing withdrawal', severity: 'MEDIUM', owner_reference: 'Head of Customer Experience', due_at: at(30), grc_risk_id: null, grc_control_id: null });
});

if (!loaded) {
if (processor) await step('Processor assessment: due diligence of the delivery partner, with a finding', async () => {
  const a = await post('/api/v1/admin/assessments', { processor_id: processor.id, kind: 'VENDOR_DUE_DILIGENCE', applicability_basis: 'The courier receives names, phone numbers and delivery addresses for every order.', scope_system_ids: [dataset.system_id], reviewer_reference: 'Data Protection Officer', due_at: at(14) });
  await post('/api/v1/admin/findings', { assessment_id: a.id, severity: 'MEDIUM', description: 'Delivery drivers\' handheld devices are not enrolled in remote wipe; a lost device exposes the day\'s delivery list.', affected_system_ids: [dataset.system_id], owner_reference: 'Head of Logistics', due_at: at(30) });
});
else { failures.push('processor assessment'); process.stdout.write('  FAIL processor assessment: the delivery partner from demo:data was not found\n'); }

await step('AI governance: the store\'s product-recommendation ranking, recorded with its data and purpose', () => post('/api/v1/admin/ai-systems', {
  name: 'Aster product recommendation ranking', use_case: 'Ranks products on the home page for shoppers who agreed to personalised recommendations.',
  purpose_id: purposeMarketing.id, processing_activity_id: activityMarketing.id, input_asset_id: accounts.id, output_system_id: dataset.system_id, processor_id: null }));

await step('Website consent: the Aster store website registered for the consent banner', () => post('/api/v1/admin/cmp-sites', { name: 'Aster store website', origins: ['https://www.aster.example', 'https://shop.aster.example'] }));

await step('Contact preferences: order updates and weekly offers topics', async () => {
  await post('/api/v1/admin/preference-topics', { code: 'order_updates', name: 'Order and delivery updates', description: 'Messages about orders you placed: confirmation, dispatch, delivery.', channels: ['EMAIL', 'SMS', 'PUSH'], purpose_id: null });
  await post('/api/v1/admin/preference-topics', { code: 'weekly_offers', name: 'Weekly offers', description: 'One email a week with offers, only if you agreed to promotional messages.', channels: ['EMAIL', 'SMS'], purpose_id: null });
});

await step('Message templates: overdue privacy request reminder for staff', () => post('/api/v1/admin/notification-templates', { code: 'RIGHTS_REQUEST_DUE_SOON', channel: 'IN_APP', recipient_scope: 'CUSTOMER_STAFF',
  subject: 'A privacy request is due within 7 days.', body: 'A privacy request assigned to your team is due within 7 days. Open Privacy requests to see it.', purpose_note: 'Operational reminder only; never a marketing message.' }));

await step('Retention: 8-year statutory retention of order history and a legal hold on support tickets', async () => {
  await post('/api/v1/admin/retention/constraints', { data_asset_id: orders.id, purpose_id: purposeService.id, trigger: 'RECORD_CREATED', basis: 'STATUTORY_OBLIGATION', source_reference: 'CGST Act 2017, s.36 and Rule 56: accounts and invoices kept for 72 months after the annual return.',
    minimum_days: 2190, maximum_days: 2920, permitted_use: 'Tax and audit only; not used for marketing or profiling.', owner_reference: 'Finance controller', review_at: at(365), release_condition: 'Released when the statutory period ends.' });
  await post('/api/v1/admin/retention/holds', { data_asset_ids: [tickets.id], reason: 'Consumer complaint before the District Consumer Commission, Bengaluru (synthetic case CC/112/2026).', authority_reference: 'Legal counsel instruction LC-2026-019',
    issued_at: at(-10), review_at: at(80), release_criterion: 'Released when the complaint is finally disposed of.' });
});

}
await step('Representation: a nominee recorded for a shopper (cust_1013) after her nomination request', async () => {
  const subject = ((await get(`/api/v1/admin/data-principals?system_id=${dataset.system_id}&target_reference=cust_1013`)).items ?? [])[0] as Json | undefined;
  if (!subject) throw new Error('shopper cust_1013 from demo:data not found');
  if (await has(`/api/v1/admin/data-principal-representatives?subject_id=${subject.id}`, r => r.kind === 'NOMINEE' && r.verification !== 'UNVERIFIED')) return;
  const rep = await post('/api/v1/admin/data-principal-representatives', { subject_id: subject.id, kind: 'NOMINEE', representative_reference: 'Sister (synthetic): nominee.joshi@aster.example',
    authority_evidence_reference: 'Nomination form N-2026-0042 signed in the store app', mandate_id: null, effective_from: at(-5), effective_to: null, restrictions: [] });
  await post(`/api/v1/admin/data-principal-representatives/${rep.id}/verification`, { verification: 'VERIFIED', evidence_reference: 'Identity of nominee checked against the nomination form.' }, second);
});

await step('Representation: a nomination mandate for the shopper who asked to nominate her sister', async () => {
  const principals = ((await get('/api/v1/admin/principals?limit=100')).items ?? []) as Json[];
  const neha = principals.find(p => String(p.email ?? '').toLowerCase() === 'neha.joshi@aster.example') ?? principals.find(p => /Neha Joshi/.test(String(p.display_name ?? '')));
  if (!neha) throw new Error('the requester neha.joshi@aster.example is not a recorded principal (demo:data store requests not loaded?)');
  if (await has('/api/v1/admin/mandates?limit=100', m => m.principal_id === neha.id && m.kind === 'NOMINATION')) return;
  await post('/api/v1/admin/mandates', { kind: 'NOMINATION', principal_id: neha.id, representative_reference: 'Sister (synthetic): nominee.joshi@aster.example',
    permitted_rights: ['ACCESS', 'CORRECTION', 'ERASURE', 'GRIEVANCE'], valid_from: at(-5), valid_to: null, evidence_reference: 'Nomination form N-2026-0042 signed in the store app (DPDP s.14, Rule 14(4))' });
});

await step('Gaps: coverage gaps derived from everything recorded', () => post('/api/v1/admin/gaps/derive'));

process.stdout.write(failures.length ? `\n  ${failures.length} step(s) refused: ${failures.join('; ')}.\n\n` : '\n  Every module now has demonstration records. Sign in as the owner to see them.\n\n');
if (failures.length) process.exitCode = 1;
