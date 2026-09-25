// DPDP operations: applicability (quality s4 "Applicability").
// Under test: organisation-level facts that are not recorded leave requirements
// unresolved rather than assumed; recording the fact resolves them and the change
// is emitted as an event; decisions are persisted with their inputs and are
// tenant-scoped; and an activity whose processing condition is unresolved blocks
// retention erasure instead of guessing a basis.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('applicability');
const { h, check, ok, db } = t;
const DAY = 24;

await t.run(async () => {
  await t.ensurePackage();
  const owner = await h.login('owner'); const admin = await h.login('admin'); const auditor = await h.login('auditor'); const member = await h.login('member'); const birch = await h.login('birch');
  const profile = (sdf: string, schedule: string, reason: string) => ok(owner.call('/api/v1/admin/organisation-profile', { sdf_status: sdf, sdf_designation_reference: null, dpo_contact: 'Privacy office (synthetic)', grievance_contact: 'Grievance desk (synthetic)',
    independent_auditor_reference: null, facts: { third_schedule_class: schedule }, effective_from: new Date().toISOString(), reason }, key()), S.schemas.OrganisationProfile);
  const evaluateOrganisation = () => ok(admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ORGANISATION', scope_id: null, as_of: null }, key()), S.schemas.ApplicabilityEvaluation);
  const result = (e: ReturnType<typeof S.schemas.ApplicabilityEvaluation.parse>, id: string) => e.decisions.find(d => d.requirement_id === id);

  t.setPhase('unknown organisation facts');
  await profile('UNKNOWN', 'UNKNOWN', 'Organisation facts not yet established.');
  const unknown = await evaluateOrganisation();
  check('an unrecorded SDF status leaves SDF requirements unresolved, never assumed not designated', [result(unknown, 'DPDP-SDF-DPO')?.result, result(unknown, 'DPDP-SDF-DPO')?.inputs['organisation.sdf_status']], ['UNRESOLVED', null]);
  check('an unrecorded Third Schedule class leaves the class-based retention requirement unresolved', result(unknown, 'DPDP-RETENTION-THIRD-SCHEDULE')?.result, 'UNRESOLVED');
  check('requirements that always apply are applicable regardless of unknown facts', result(unknown, 'DPDP-GRIEVANCE-RESPONSE')?.result, 'APPLICABLE');
  check('the summary counts unresolved decisions', (unknown.summary.UNRESOLVED ?? 0) >= 7, true);

  t.setPhase('recorded organisation facts');
  const since = new Date();
  await profile('NOT_DESIGNATED', 'NONE', 'Not designated; no Third Schedule class applies (synthetic).');
  const recorded = await evaluateOrganisation();
  check('a recorded non-designation makes SDF requirements not applicable', ['DPDP-SDF-DPO', 'DPDP-SDF-AUDITOR', 'DPDP-SDF-DPIA'].map(id => result(recorded, id)?.result), ['NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE']);
  check('a recorded class outside the Third Schedule makes the class-based rule not applicable', result(recorded, 'DPDP-RETENTION-THIRD-SCHEDULE')?.result, 'NOT_APPLICABLE');
  check('each decision records the fact values it used and a readable trace', [result(recorded, 'DPDP-SDF-DPO')?.inputs['organisation.sdf_status'], (result(recorded, 'DPDP-SDF-DPO')?.trace.length ?? 0) > 0], ['NOT_DESIGNATED', true]);
  const changes = (await db.query(`SELECT payload FROM app.operational_events WHERE event_type='requirement_applicability_changed' AND occurred_at>=$1 AND tenant_id=$2`, [since, t.scope().tenant_id])).rows.map(r => r.payload.requirement_id);
  check('a change of result is emitted as an applicability event', ['DPDP-SDF-DPO', 'DPDP-RETENTION-THIRD-SCHEDULE'].every(id => changes.includes(id)), true);
  const listed = await ok(auditor.call('/api/v1/admin/regulatory/applicability?limit=100'), S.schemas.ApplicabilityDecisionList);
  check('an auditor can read persisted decisions', listed.items.length > 0, true);
  check('a member cannot evaluate applicability', (await member.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ORGANISATION', scope_id: null, as_of: null }, key())).status, 403);
  check('an auditor cannot evaluate applicability', (await auditor.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ORGANISATION', scope_id: null, as_of: null }, key())).status, 403);
  const birchDecisions = await birch.call('/api/v1/admin/regulatory/applicability?limit=100');
  const birchIds = birchDecisions.status === 200 ? ((await birchDecisions.json()) as { items: { id: string }[] }).items.map(d => d.id) : [];
  check('another tenant never sees these decisions', recorded.decisions.some(d => birchIds.includes(d.id)), false);
  check('an organisation scope carries no id', (await admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ORGANISATION', scope_id: randomUUID(), as_of: null }, key())).status, 400);

  t.setPhase('unresolved condition blocks erasure');
  const system = await t.boundSystem('Applicability store');
  const { activity, category } = await t.activity({ condition: 'UNRESOLVED', systems: [system.id], childData: 'UNKNOWN' });
  const evaluation = await ok(admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ACTIVITY', scope_id: activity.id, as_of: null }, key()), S.schemas.ApplicabilityEvaluation);
  check('an unresolved condition leaves condition-dependent requirements unresolved', [result(evaluation, 'DPDP-NOTICE-CONSENT-REQUEST')?.result, result(evaluation, 'DPDP-LEGITIMATE-USES')?.result, result(evaluation, 'DPDP-CHILD-NO-TRACKING')?.result],
    ['UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED']);
  check('no processor is assumed when none is recorded', [result(evaluation, 'DPDP-PROCESSOR-CONTRACT')?.result, result(evaluation, 'DPDP-PROCESSOR-CONTRACT')?.inputs['activity.has_processor']], ['UNRESOLVED', null]);
  const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [{ system_id: system.id, target_reference: `ap_${randomUUID().slice(0, 10)}`, source_key: null }] }, key()), S.schemas.Subject);
  await ok(admin.call('/api/v1/admin/data-principal-relationships', { subject_id: subject.id, category_id: category.id, effective_from: hoursFromNow(-DAY * 900), effective_to: hoursFromNow(-DAY * 400), status: 'ENDED',
    source_system_id: null, source_reference: 'Closed account', evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'crm-export:closed' }, key()), S.schemas.Relationship);
  const rule = await ok(admin.call('/api/v1/admin/retention-rules', { name: 'Unresolved basis records', activity_id: activity.id, principal_category_id: category.id, data_category_id: null, system_id: null,
    trigger: 'RELATIONSHIP_ENDED', duration_days: 365, duration_source: 'CUSTOMER_CONFIGURATION', source_reference: 'Records retention policy RP-2 (synthetic)', requirement_id: null,
    approval_required: true, erasure_action: 'ERASE', effective_from: hoursFromNow(-DAY) }, key()), S.schemas.RetentionRule);
  let run = await ok(admin.call('/api/v1/admin/workflow-runs/retention', { retention_rule_id: rule.id }, key()), S.schemas.WorkflowRun);
  while (run.status === 'EVALUATING') run = await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}/evaluation`, { limit: 100 }, key()), S.schemas.WorkflowRun);
  check('a person past the period under an unresolved condition is unresolved, not eligible', [run.counts.total_discovered, run.counts.eligible, run.counts.unresolved], [1, 0, 1]);
  const state = (await db.query(`SELECT state,unresolved_reason FROM app.retention_states WHERE rule_id=$1 AND subject_id=$2`, [rule.id, subject.id])).rows[0];
  check('the persisted position names the unresolved condition', [state?.state, state?.unresolved_reason], ['UNRESOLVED', 'The processing condition for the activity is unresolved.']);
  const actions = await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}/actions?limit=100`), S.schemas.DownstreamActionList);
  check('no erasure action is planned', actions.items.length, 0);
});
