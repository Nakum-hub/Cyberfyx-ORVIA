// Shared harness for the DPDP operations integration suites. It drives the real
// HTTP boundary with the synthetic fixture users and records every assertion,
// in the same shape as the V1 suites, into a DPDP evidence artifact.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from './http-fixture.ts';
import { loadProfile } from './config.ts';
import { writeEvidence, safeError } from './evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { fixturePackage, signFixture } from './regulatory-fixture.ts';
import * as S from '../../contracts/src/index.ts';

export const key = () => ({ 'idempotency-key': randomUUID() });
export const hoursFromNow = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();
export const unique = (label: string) => `${label} ${randomUUID().slice(0, 8)}`;

export function operationsSuite(kind: string) {
  const h = new HttpFixture();
  const profile = loadProfile();
  if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
  const db = connectDatabase(profile).pool;
  const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
  let phase = 'setup';
  const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
  const login = h.login.bind(h);
  h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
  function check(name: string, actual: unknown, expected: unknown) {
    try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
    catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, JSON.stringify({ expected, actual })); throw new Error('Assertion failed: ' + name); }
  }
  /** Parses a successful response against its contract schema, or fails with the status and error codes. */
  async function ok<T>(response: Response | Promise<Response>, schema: { parse(v: unknown): T }, expected = [200, 201]): Promise<T> {
    const r = await response;
    const body = await r.json();
    if (!expected.includes(r.status)) throw new Error(`Unexpected ${r.status}: ${JSON.stringify(body).slice(0, 600)}`);
    return schema.parse(body);
  }
  async function codes(response: Response | Promise<Response>) {
    const r = await response;
    const body = await r.json() as { error?: { field_errors?: { code: string }[] } };
    return { status: r.status, codes: body.error?.field_errors?.map(e => e.code) ?? [] };
  }
  const scope = () => h.users.owner!.scope;

  /**
   * An approved TEST_FIXTURE package in effect now: reuses one if present,
   * otherwise imports one (owner) and approves it (a different super admin).
   */
  async function ensurePackage() {
    const owner = await h.login('owner'); const reviewer = await h.login('reviewer');
    const active = await ok(owner.call('/api/v1/admin/regulatory/active-package'), S.schemas.ActivePackage);
    if (active.package && active.package.distribution === 'TEST_FIXTURE') return active.package;
    const signed = signFixture(fixturePackage({ version: `1.${Date.now()}.0`, previous_version: null, effective_from: new Date(Date.now() - 60_000).toISOString(), requirement_effective_from: '2025-01-01' }),
      process.env.ORVIA_RELEASE_KEY_ID!, process.env.ORVIA_RELEASE_PRIVATE_KEY!);
    const imported = await ok(owner.call('/api/v1/admin/regulatory/packages', signed, key()), S.schemas.RegulatoryPackage);
    return ok(reviewer.call(`/api/v1/admin/regulatory/packages/${imported.id}/decision`, { decision: 'APPROVED', note: 'Approving the synthetic fixture package for validation.', acknowledged_open_verification_items: false }, key()), S.schemas.RegulatoryPackage);
  }

  /** A synthetic CRM system bound to the records test adapter. */
  async function boundSystem(name: string, options: { system_of_record_for?: string[]; holds?: string[] } = {}) {
    const admin = await h.login('admin');
    const selectors = { legal_entity_id: scope().legal_entity_id, environment_id: scope().environment_id };
    const system = await ok(admin.call('/api/v1/admin/systems', { ...selectors, name: unique(name), connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
    await ok(admin.call('/api/v1/admin/connector-bindings', { system_id: system.id, adapter: 'SYNTHETIC_RECORDS_TEST_ADAPTER', system_of_record_for: options.system_of_record_for ?? [], holds_data_categories: options.holds ?? [] }, key()), S.schemas.ConnectorBinding);
    return system;
  }

  /** Categories, a purpose and an activity with the requested condition, linked to the given systems. */
  async function activity(options: { condition: string; systems: string[]; categoryName?: string; childData?: 'UNKNOWN' | 'YES' | 'NO' }) {
    const admin = await h.login('admin');
    const category = await ok(admin.call('/api/v1/admin/data-principal-categories', { name: unique(options.categoryName ?? 'Customer'), description: 'Synthetic relationship category.', regulatory_tags: [] }, key()), S.schemas.PrincipalCategory);
    const dataCategory = await ok(admin.call('/api/v1/admin/personal-data-categories', { name: unique('Contact details'), description: 'Synthetic contact data category.', legacy_code: 'CONTACT_DETAILS' }, key()), S.schemas.DataCategory);
    const purpose = await ok(admin.call('/api/v1/admin/registry-purposes', { name: unique('Service delivery'), owner_reference: 'Synthetic owner', description: 'Synthetic purpose for operations validation.', effective_from: hoursFromNow(-24 * 30), change_reason: 'Initial registration', evidence_reference: null, v1_purpose_id: null }, key()), S.schemas.RegistryPurpose);
    const condition = await ok(admin.call('/api/v1/admin/processing-conditions', { code: options.condition, label: 'Synthetic condition', effective_from: hoursFromNow(-24 * 30), justification_reference: null, evidence_requirements: 'Synthetic evidence expectation.', unresolved_reason: options.condition === 'UNRESOLVED' ? 'The basis has not been established.' : null }, key()), S.schemas.Condition);
    let created = await ok(admin.call('/api/v1/admin/registry-activities', { name: unique('Activity'), description: 'Synthetic activity.', owner_reference: 'Synthetic owner', processes_child_data: options.childData ?? 'NO', graph_activity_id: null,
      purpose_version_id: purpose.versions[0]!.id, condition_id: condition.id, notice_version_ids: [], requirement_ids: [], effective_from: hoursFromNow(-24 * 30), change_reason: 'Initial registration' }, key()), S.schemas.Activity);
    const link = (link_kind: string, target_id: string) => ok(admin.call(`/api/v1/admin/registry-activities/${created.id}/links`, { link_kind, target_id, channel: null, basis: 'Synthetic declaration.', valid_from: hoursFromNow(-24 * 30) }, key()), S.schemas.Activity);
    created = await link('PRINCIPAL_CATEGORY', category.id);
    created = await link('DATA_CATEGORY', dataCategory.id);
    for (const system of options.systems) created = await link('SYSTEM', system);
    return { activity: created, category, dataCategory, purpose, condition };
  }

  /** A V1 incident; awareness may be left unrecorded to exercise unresolved deadlines. */
  async function incident(systemIds: string[], awareHoursAgo: number | null) {
    const admin = await h.login('admin');
    const base = awareHoursAgo ?? 4;
    return ok(admin.call('/api/v1/admin/incidents', { summary: 'Synthetic incident for breach validation.', occurred_at: hoursFromNow(-base - 2), detected_at: hoursFromNow(-base - 1),
      became_aware_at: awareHoursAgo === null ? null : hoursFromNow(-awareHoursAgo), occurrence_basis: 'Synthetic log review.', severity: 'HIGH', severity_basis: 'Synthetic assessment.',
      affected_system_ids: systemIds, affected_purpose_ids: [], affected_processor_ids: [], principal_scope: 'Not yet established.', principal_scope_certain: false }, key()), S.schemas.Incident);
  }

  /** The Data Principal linked to a fixture portal identity, created once and reused; references are linked as needed. */
  async function principalSubject(user: 'alice' | 'bob', references: { system_id: string; target_reference: string }[]) {
    const admin = await h.login('admin');
    const principalId = h.users[user]!.principal_id!;
    const existing = (await ok(admin.call(`/api/v1/admin/data-principals?principal_id=${principalId}`), S.schemas.SubjectList)).items[0];
    let subject = existing ? await ok(admin.call(`/api/v1/admin/data-principals/${existing.id}`), S.schemas.Subject) : await ok(admin.call('/api/v1/admin/data-principals', { principal_id: principalId, references: [] }, key()), S.schemas.Subject);
    for (const ref of references) subject = await ok(admin.call(`/api/v1/admin/data-principals/${subject.id}/references`, { ...ref, source_key: null }, key()), S.schemas.Subject);
    return subject;
  }

  /** A V1 rights request driven through identity review, scoping and approval into execution. */
  async function executingRequest(right: string, principalId: string, items: { system_id: string; action: string; retention_exception?: string | null }[], unresolved: string[] = []) {
    const admin = await h.login('admin');
    const request = await ok(admin.call('/api/v1/admin/rights-requests', { right_type: right, principal_id: principalId, submitted_channel: 'RECORDED_MANUAL_INTAKE', mandate_id: null, description: 'Synthetic rights request for operations validation.' }, key()), S.schemas.RightsRequest);
    const move = (to: string) => ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/transition`, { to, reason: 'Synthetic progression for the operations fixture.' }, key()), S.schemas.RightsRequest);
    await move('PENDING_VERIFICATION');
    await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/identity-review`, { grade: 'EXACT', basis: 'Reviewed against the recorded portal identity.', matched_reference_count: 1 }, key()), S.schemas.RightsRequest);
    await move('VERIFIED'); await move('SCOPING');
    await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/scope`, { items: items.map(i => ({ system_id: i.system_id, action: i.action, retention_exception: i.retention_exception ?? null, note: 'Synthetic plan item.' })), unresolved_destinations: unresolved }, key()), S.schemas.RightsRequest);
    await move('AWAITING_APPROVAL');
    return move('EXECUTING');
  }

  async function run(work: () => Promise<void>) {
    try { await h.start(); await work(); }
    catch (error) { assertions.push({ name: `unexpected failure in ${phase}`, result: 'FAIL', expected: 'no error', actual: error instanceof Error ? error.message.slice(0, 500) : safeError(error) }); console.error(error); console.error('Server diagnostics (safe codes only):', h.diagnostics.slice(-3000)); process.exitCode = 1; }
    finally {
      await h.stop(); await db.end();
      const failures = assertions.filter(a => a.result === 'FAIL').length;
      writeEvidence(`operations-${kind}`, { suite: kind, assertions, passed: assertions.length - failures, failures, profile: profile.profile, test_adapter_only: true,
        limitation: 'Connector effects are exercised against the synthetic records test adapter; no live customer system was contacted.' });
      console.log(`\n${assertions.length} assertions, ${failures} failures.`);
      if (failures) process.exitCode = 1;
    }
  }
  return { h, db, check, ok, codes, scope, ensurePackage, boundSystem, activity, incident, principalSubject, executingRequest, run, setPhase: (value: string) => { phase = value; }, key };
}
