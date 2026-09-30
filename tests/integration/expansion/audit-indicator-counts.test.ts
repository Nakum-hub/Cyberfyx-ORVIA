// Audit indicators return the exact counts (task AUDIT-PRACTICE-02). Every indicator added for the 18 requirements that had none is
// run against records whose correct count is known, including rows each filter must exclude (wrong state, expired, superseded,
// older history row, another scope). The suite runs in one transaction on the development database, in a freshly generated scope
// no other data uses, with foreign-key triggers suspended so each table can be seeded on its own; it always rolls back, so nothing
// is left behind. The operator connection bypasses row-level security; the indicator SQL carries its own scope predicate, which
// the second scope checks.
import { randomUUID } from 'node:crypto';
import assert from 'node:assert/strict';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { indicatorsFor } from '../../../backend/domain/src/dpdpa-audit/indicators.ts';
import type { Context } from '../../../backend/domain/src/shared/transaction.ts';

const pool = connectDatabase(loadProfile('codex-a00')).pool;
const tx = await pool.connect();
const results: { name: string; ok: boolean }[] = [];
const check = (name: string, actual: unknown, expected: unknown) => {
  try { assert.deepEqual(actual, expected); results.push({ name, ok: true }); console.log(`PASS ${name}`); }
  catch { results.push({ name, ok: false }); console.log(`FAIL ${name}: ${JSON.stringify(actual)} != ${JSON.stringify(expected)}`); }
};
const scopeA = { tenant_id: randomUUID(), legal_entity_id: randomUUID(), environment_id: randomUUID() };
const scopeB = { tenant_id: scopeA.tenant_id, legal_entity_id: scopeA.legal_entity_id, environment_id: randomUUID() };
const U = () => randomUUID();
const who = U(), other = U();
const now = new Date();
const ago = (days: number) => new Date(now.getTime() - days * 86_400_000).toISOString();
const ahead = (days: number) => new Date(now.getTime() + days * 86_400_000).toISOString();
const hex = (c: string) => c.repeat(64);

async function ins(scope: typeof scopeA, table: string, row: Record<string, unknown>) {
  const cols = { ...scope, id: U(), ...row };
  const keys = Object.keys(cols);
  await tx.query(`INSERT INTO app.${table} (${keys.join(',')}) VALUES (${keys.map((_, i) => `$${i + 1}`).join(',')})`,
    keys.map(k => { const v = (cols as Record<string, unknown>)[k]; return v !== null && typeof v === 'object' && !Array.isArray(v) ? JSON.stringify(v) : v; }));
}
const A = (table: string, row: Record<string, unknown>) => ins(scopeA, table, row);
const B = (table: string, row: Record<string, unknown>) => ins(scopeB, table, row);
const ctx = (scope: typeof scopeA) => ({ tx, actor: { scope } as unknown as Context['actor'], requestId: U() }) as Context;
async function values(scope: typeof scopeA, requirementId: string) {
  return Object.fromEntries((await indicatorsFor(ctx(scope), requirementId, now)).map(i => [i.key, i.value]));
}

try {
  await tx.query('BEGIN');
  await tx.query("SET LOCAL session_replication_role = 'replica'");

  // ---------------------------------------------------------------- legitimate uses
  const cLegit = U(), cConsent = U();
  const cond = (id: string, reqs: string[], extra: Record<string, unknown>) => A('processing_conditions', { id, code: 'S7_A', label: 'c', requirement_ids: reqs, package_row_id: U(), effective_from: ago(30), unresolved: false, evidence_requirements: 'e', recorded_by: who, ...extra });
  await cond(cLegit, ['DPDP-LEGITIMATE-USES'], {});
  await cond(U(), ['DPDP-LEGITIMATE-USES'], { effective_from: ago(60), effective_to: ago(1) });            // ended: excluded
  await cond(U(), ['DPDP-LEGITIMATE-USES'], { unresolved: true, unresolved_reason: 'r', package_row_id: null }); // unresolved
  await cond(cConsent, ['DPDP-CONSENT-VALIDITY'], { code: 'CONSENT' });
  const act = (condition_id: string | null, status: string) => A('registry_activity_versions', { activity_id: U(), version: 1, purpose_version_id: U(), condition_id, evidence_state: 'KNOWN', effective_from: ago(10), change_reason: 'c', status, recorded_by: who, ...(status === 'SUPERSEDED' ? { superseded_by: U() } : {}) });
  await act(cLegit, 'CURRENT'); await act(cConsent, 'CURRENT'); await act(null, 'CURRENT');
  await act(cLegit, 'SUPERSEDED'); await act(null, 'SUPERSEDED');
  check('legitimate uses', await values(scopeA, 'DPDP-LEGITIMATE-USES'),
    { 'conditions.legitimate_use': 1, 'conditions.unresolved': 1, 'activities.on_legitimate_use': 1, 'activities.without_condition': 1 });

  // ---------------------------------------------------------------- processors and cross-border agreements
  const p1 = U(), p2 = U(), p3 = U();
  const eng = (processor_id: string, extra: Record<string, unknown> = {}) => A('processor_engagements', { processor_id, service_description: 's', effective_from: ago(400), recorded_by: who, ...extra });
  await eng(p1); await eng(p2); await eng(p3);
  await eng(U(), { status: 'TERMINATED', terminated_at: ago(5), termination_reason: 'r', disposition_state: 'PENDING' });
  await eng(U(), { status: 'TERMINATED', terminated_at: ago(5), termination_reason: 'r', disposition_state: 'VERIFIED' });
  const agr = (processor_id: string, extra: Record<string, unknown>) => A('processor_agreements', { processor_id, kind: 'DPA', reference: 'r', signed_at: ago(800), effective_from: ago(700), subprocessors_allowed: false, onward_transfer_allowed: false, evidence_reference: 'e', recorded_by: who, ...extra });
  await agr(p1, { onward_transfer_allowed: true });                                        // in force
  await agr(p2, { expires_at: ago(365) });                                                 // expired but still ACTIVE
  await agr(p3, { status: 'TERMINATED', terminated_at: ago(3), onward_transfer_allowed: true }); // terminated: covers nothing
  await agr(p3, { effective_from: ahead(10), expires_at: ahead(400) });                     // not yet in effect: covers nothing
  check('processor contracts', await values(scopeA, 'DPDP-PROCESSOR-CONTRACT'),
    { 'processors.engagements_active': 3, 'processors.active_without_agreement': 2, 'processors.agreements_expired_not_terminated': 1, 'processors.terminated_disposition_unverified': 1 });

  // ---------------------------------------------------------------- correction and erasure runs
  const run = (kind: string, status: string) => A('workflow_runs', { kind, workflow_version: 'v1', package_row_id: U(), configuration: {}, trigger: {}, status, approval_required: false, created_by: who, ...(status === 'BLOCKED' ? { block_reason: 'b' } : {}) });
  for (const s of ['COMPLETED_VERIFIED', 'COMPLETED_VERIFIED', 'BLOCKED', 'RUNNING', 'CANCELLED']) await run('CORRECTION', s);
  for (const s of ['COMPLETED_VERIFIED', 'PARTIALLY_FAILED']) await run('RETENTION_ERASURE', s);
  await run('RIGHTS_EXECUTION', 'RUNNING'); // another kind: excluded everywhere
  check('accuracy (correction runs)', await values(scopeA, 'DPDP-ACCURACY'),
    { 'correction.runs_verified': 2, 'correction.runs_with_exceptions': 1, 'correction.runs_open': 1 });

  // ---------------------------------------------------------------- retention and erasure
  const rule = (status: string, requirement_id: string | null) => A('retention_rules', { rule_key: U(), version: 1, name: 'r', principal_category_id: U(), trigger: 'RELATIONSHIP_ENDED', approval_required: true, erasure_action: 'ERASE', effective_from: ago(30), status, requirement_id, recorded_by: who });
  await rule('ACTIVE', 'DPDP-RETENTION-THIRD-SCHEDULE'); await rule('ACTIVE', null); await rule('RETIRED', 'DPDP-RETENTION-THIRD-SCHEDULE');
  const outcome = (result: string, method: string, evidence_reference: string | null) => A('retention_outcomes', { data_asset_id: U(), copy_class: 'PRIMARY', result, method, evidence_reference, note: 'n', recorded_by: who });
  await outcome('FAILED', 'CONNECTOR_OPERATION', null); await outcome('EFFECT_UNKNOWN', 'MANUAL_ATTESTATION', null); await outcome('DELETED', 'CONNECTOR_OPERATION', 'e');
  check('erasure when purpose served', await values(scopeA, 'DPDP-ERASURE-PURPOSE-SERVED'),
    { 'erasure.runs_verified': 1, 'erasure.runs_with_exceptions': 1, 'erasure.runs_open': 0, 'retention.rules_active': 2, 'retention.outcomes_failed_or_unknown': 2 });
  check('Third Schedule retention', await values(scopeA, 'DPDP-RETENTION-THIRD-SCHEDULE'), { 'retention.rules_third_schedule': 1 });

  // ---------------------------------------------------------------- security safeguards
  const sg = (kind: string, evidence_state: string) => A('security_safeguards', { kind, description: 'd', evidence_state, evidence_reference: evidence_state === 'EVIDENCE_AVAILABLE' ? 'e' : null, recorded_by: who });
  await sg('ENCRYPTION', 'EVIDENCE_AVAILABLE'); await sg('ACCESS_CONTROL', 'EVIDENCE_AVAILABLE'); await sg('ENCRYPTION', 'EVIDENCE_MISSING'); await sg('LOGGING_MONITORING', 'NEEDS_VERIFICATION');
  await B('security_safeguards', { kind: 'BACKUP_AVAILABILITY', description: 'd', evidence_state: 'EVIDENCE_MISSING', recorded_by: who }); // other scope
  check('security safeguards', await values(scopeA, 'DPDP-SECURITY-SAFEGUARDS'),
    { 'safeguards.recorded': 4, 'safeguards.evidence_available': 2, 'safeguards.evidence_missing': 1, 'safeguards.needs_verification': 1, 'safeguards.kinds_covered': 3 });

  // ---------------------------------------------------------------- contact publication (latest profile only) and notices
  const profile = (scope: typeof scopeA, version: number, contact: string | null) => ins(scope, 'organisation_profile_versions', { version, sdf_status: 'NOT_DESIGNATED', dpo_contact: contact, facts: {}, effective_from: ago(10 - version), reason: 'r', recorded_by: who });
  await profile(scopeA, 1, 'dpo@example.test'); await profile(scopeA, 2, null);   // latest has none: 0
  await profile(scopeB, 1, null); await profile(scopeB, 2, 'dpo@example.test');   // latest has one: 1
  const notice = (status: string) => A('registry_notice_versions', { notice_id: U(), version: 1, locale: 'en', title: 't', content: 'c', content_digest: hex('a'), purpose_version_ids: [U()], data_category_ids: [U()], channels: {}, status, recorded_by: who,
    ...(status === 'DRAFT' ? {} : { published_at: ago(5), effective_from: ago(5), published_by: other }), ...(status === 'SUPERSEDED' ? { superseded_by: U() } : {}) });
  await notice('PUBLISHED'); await notice('PUBLISHED'); await notice('DRAFT'); await notice('SUPERSEDED');
  check('contact publication: the latest profile has no contact', await values(scopeA, 'DPDP-CONTACT-PUBLICATION'), { 'profile.contact_recorded': 0, 'notices.published_versions': 2 });
  check('contact publication: the latest profile has a contact (second scope)', await values(scopeB, 'DPDP-CONTACT-PUBLICATION'), { 'profile.contact_recorded': 1, 'notices.published_versions': 0 });

  // ---------------------------------------------------------------- rights
  const rr = (right_type: string, state: string, extra: Record<string, unknown> = {}) => A('rights_requests', { right_type, principal_id: U(), state, document: { state }, received_at: ago(5), ...extra });
  await rr('ACCESS', 'COMPLETED', { response: 'RELEASED' });
  await rr('ACCESS', 'RECEIVED');
  await rr('ACCESS', 'VERIFIED', { received_at: ago(100) });
  await rr('ACCESS', 'REJECTED', { received_at: ago(120) });
  await rr('CORRECTION', 'COMPLETED', { execution: 'COMPLETE' });
  await rr('CORRECTION', 'EXECUTING', { execution: 'FAILED' });
  await rr('ERASURE', 'RECEIVED', { received_at: ago(95), execution: 'MANUAL_REQUIRED' });
  await rr('NOMINATION', 'CLOSED');
  await B('rights_requests', { right_type: 'ACCESS', principal_id: U(), state: 'RECEIVED', document: { state: 'RECEIVED' } }); // other scope
  check('rights means', await values(scopeA, 'DPDP-RIGHTS-MEANS'), { 'rights.requests_total': 8, 'rights.requests_last_90_days': 5 });
  check('right of access', await values(scopeA, 'DPDP-RIGHT-ACCESS'),
    { 'rights.access.completed': 1, 'rights.access.open': 2, 'rights.access.open_over_90_days': 1, 'rights.access.rejected': 1, 'rights.access.responses_released': 1 });
  check('correction and erasure', await values(scopeA, 'DPDP-RIGHT-CORRECTION-ERASURE'),
    { 'rights.correction_erasure.completed': 1, 'rights.correction_erasure.open': 2, 'rights.correction_erasure.open_over_90_days': 1, 'rights.correction_erasure.rejected': 0, 'rights.correction_erasure.execution_failed': 2 });

  // ---------------------------------------------------------------- nomination
  const rep = (kind: string, verification: string, extra: Record<string, unknown> = {}) => A('data_principal_representatives', { subject_id: U(), kind, representative_reference: 'r', authority_evidence_reference: 'a', effective_from: ago(30), verification, recorded_by: who,
    ...(verification === 'UNVERIFIED' ? {} : { verified_at: ago(20), verified_by: other, verification_evidence_reference: 'v' }), ...extra });
  await rep('NOMINEE', 'VERIFIED'); await rep('NOMINEE', 'UNVERIFIED'); await rep('NOMINEE', 'UNVERIFIED', { effective_to: ago(1) }); await rep('GUARDIAN', 'VERIFIED');
  check('nomination', await values(scopeA, 'DPDP-RIGHT-NOMINATION'),
    { 'rights.nomination.completed': 0, 'rights.nomination.open': 0, 'rights.nomination.open_over_90_days': 0, 'rights.nomination.rejected': 0, 'nominees.verified': 1, 'nominees.unverified': 1 });

  // ---------------------------------------------------------------- children (latest record per principal)
  const s1 = U(), s2 = U(), s3 = U(), s4 = U();
  const child = (subject_id: string, child_status: string, verifiable_consent: string, recorded_at: string) => A('child_status_records', { subject_id, child_status, basis: 'b', evidence_reference: child_status === 'UNKNOWN' ? null : 'e', verifiable_consent, recorded_at, recorded_by: who,
    ...(verifiable_consent === 'ESTABLISHED' ? { verifiable_consent_evidence_reference: 'v', guardian_id: U() } : {}) });
  await child(s1, 'CHILD', 'NOT_ESTABLISHED', ago(10)); await child(s1, 'CHILD', 'ESTABLISHED', ago(2));
  await child(s2, 'CHILD', 'UNKNOWN', ago(3));
  await child(s3, 'CHILD', 'NOT_ESTABLISHED', ago(10)); await child(s3, 'NOT_CHILD', 'NOT_REQUIRED_RECORDED', ago(1));
  await child(s4, 'UNKNOWN', 'UNKNOWN', ago(4));
  const cmp = (state: string) => A('cmp_configs', { site_id: U(), version: 1, document: {}, content_digest: hex('b'), state, authored_by: who, ...(state === 'PUBLISHED' ? { published_by: other, published_at: ago(1) } : {}) });
  await cmp('PUBLISHED'); await cmp('DRAFT');
  check('children: verifiable consent', await values(scopeA, 'DPDP-CHILD-VERIFIABLE-CONSENT'),
    { 'children.recorded': 2, 'children.verifiable_consent_established': 1, 'children.verifiable_consent_not_established': 1, 'children.status_unknown': 1 });
  check('children: no tracking', await values(scopeA, 'DPDP-CHILD-NO-TRACKING'), { 'children.recorded': 2, 'cmp.published_configurations': 1 });

  // ---------------------------------------------------------------- SDF duties
  const pastDue = ago(7);
  const sdfRow = (kind: string, state: string, due_at: string | null) => A('sdf_obligations', { profile_version_id: U(), package_row_id: U(), requirement_id: 'DPDP-SDF-DPO', kind, period_start: new Date(now.getTime() - Math.random() * 1e10).toISOString(), due_at, legal_status: 'APPLICABLE', state,
    ...(state === 'COMPLETED' ? { completed_at: ago(3), evidence_reference: 'e' } : {}), ...(state === 'NOT_APPLICABLE' ? { closure_reason: 'n' } : {}) });
  await sdfRow('DPO_APPOINTMENT', 'OPEN', pastDue); await sdfRow('DPO_APPOINTMENT', 'OPEN', ahead(30)); await sdfRow('DPO_APPOINTMENT', 'COMPLETED', ago(40)); await sdfRow('DPO_APPOINTMENT', 'NOT_APPLICABLE', ago(50));
  await sdfRow('TRANSFER_RESTRICTION_REVIEW', 'COMPLETED', ago(10));
  check('SDF: DPO', await values(scopeA, 'DPDP-SDF-DPO'), { 'sdf.dpo.next_due': pastDue.slice(0, 10), 'sdf.dpo.overdue': 1, 'sdf.dpo.completed': 1 });
  check('SDF: independent auditor (none recorded)', await values(scopeA, 'DPDP-SDF-AUDITOR'), { 'sdf.auditor.next_due': null, 'sdf.auditor.overdue': 0, 'sdf.auditor.completed': 0 });
  for (let i = 0; i < 2; i++) await A('ai_systems', { name: 'n', use_case: 'u', owner_actor_id: who, purpose_id: U(), processing_activity_id: U(), input_asset_id: U(), output_system_id: U(), recorded_by: who, document: {} });
  check('SDF: algorithmic diligence', await values(scopeA, 'DPDP-SDF-ALGORITHMIC-DILIGENCE'), { 'sdf.algorithmic.next_due': null, 'sdf.algorithmic.overdue': 0, 'sdf.algorithmic.completed': 0, 'ai.systems_recorded': 2 });

  // ---------------------------------------------------------------- locations
  const sys = async (id: string) => A('systems', { id, connector: 'LEGACY_MANUAL', document: {} });
  const loc = (system_id: string, region: string, extra: Record<string, unknown> = {}) => A('system_locations', { system_id, region, hosting_description: 'h', basis: 'b', valid_from: ago(30), recorded_by: who, ...extra });
  const [sIn, sUs, sDe, sNone, sKa] = [U(), U(), U(), U(), U()];
  for (const s of [sIn, sUs, sDe, sNone, sKa]) await sys(s);
  await loc(sIn, 'IN'); await loc(sUs, 'US'); await loc(sUs, 'IN', { valid_from: ago(90), valid_to: ago(31) }); await loc(sDe, 'DE', { valid_to: ago(1) }); await loc(sKa, 'IN-KA');
  // sUs was in India earlier (no longer current); sDe's only location has ended; sNone has none.
  check('SDF: transfer restriction', await values(scopeA, 'DPDP-SDF-TRANSFER-RESTRICTION'), { 'sdf.transfer.next_due': null, 'sdf.transfer.overdue': 0, 'sdf.transfer.completed': 1, 'locations.systems_outside_india': 1 });
  check('cross-border', await values(scopeA, 'DPDP-CROSS-BORDER'), { 'locations.systems_outside_india': 1, 'locations.systems_without_location': 2, 'processors.onward_transfer_allowed': 1 });

  // ---------------------------------------------------------------- the other scope sees none of scope A's records
  check('another scope: no safeguards but its own', (await values(scopeB, 'DPDP-SECURITY-SAFEGUARDS'))['safeguards.recorded'], 1);
  check('another scope: no rights requests but its own', (await values(scopeB, 'DPDP-RIGHTS-MEANS'))['rights.requests_total'], 1);
} finally {
  await tx.query('ROLLBACK').catch(() => undefined);
  tx.release(); await pool.end();
}
const failed = results.filter(r => !r.ok).length;
console.log(`audit-indicator-counts: ${results.length - failed}/${results.length} passed`);
if (failed) process.exit(1);
