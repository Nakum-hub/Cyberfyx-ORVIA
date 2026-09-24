// DPDP operations: processors and data sharing (quality s4 "Processor/data sharing").
// Under test: an engagement ties a V1 processor to the activities, categories and
// systems it touches; the sharing register answers "who received what" for a
// person and feeds an access request; termination closes history rather than
// deleting it and opens a disposition task that only independent evidence can
// verify; and historical queries still see the engagement at earlier times.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('processors');
const { h, check, ok, codes } = t;

await t.run(async () => {
  await t.ensurePackage();
  const admin = await h.login('admin');
  const s = t.scope();
  const principal = h.users.alice!.principal_id!;
  const system = await t.boundSystem('Mailing platform');
  const setup = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const v1Purpose = await ok(admin.call('/api/v1/admin/purposes', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, code: 'order_service_demo', name: unique('Order service'), description: 'Synthetic V1 purpose authorising the processor.' }, key()), S.schemas.Purpose);
  const processor = await ok(admin.call('/api/v1/admin/processors', { name: unique('Mail vendor'), role: 'PROCESSOR', authorised_purpose_ids: [v1Purpose.id], authorised_categories: ['CONTACT_DETAILS'], region: 'Synthetic region',
    contract_reference: 'DPA SYN-1', owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example', subprocessors_permitted: false }, key()), S.schemas.Processor);
  t.setPhase('engagement');
  const engagement = await ok(admin.call('/api/v1/admin/processor-engagements', { processor_id: processor.id, service_description: 'Newsletter delivery', subprocessor_of: null, effective_from: hoursFromNow(-24 * 60),
    contract_evidence_reference: 'contract-store:DPA-SYN-1', safeguard_evidence_reference: null, links: [{ link_kind: 'DATA_CATEGORY', target_id: setup.dataCategory.id }, { link_kind: 'SYSTEM', target_id: system.id }] }, key()), S.schemas.Engagement);
  await ok(admin.call(`/api/v1/admin/registry-activities/${setup.activity.id}/links`, { link_kind: 'PROCESSOR_ENGAGEMENT', target_id: engagement.id, channel: null, basis: 'Vendor register declaration.', valid_from: hoursFromNow(-24 * 60) }, key()), S.schemas.Activity);
  const share = await ok(admin.call('/api/v1/admin/data-sharing-links', { activity_id: setup.activity.id, data_category_id: setup.dataCategory.id, principal_category_id: setup.category.id, engagement_id: engagement.id, recipient_reference: null,
    purpose_version_id: setup.purpose.versions[0]!.id, system_id: system.id, valid_from: hoursFromNow(-24 * 60), evidence_reference: 'vendor-register:1' }, key()), S.schemas.SharingLink);
  check('a share names exactly one recipient', (await admin.call('/api/v1/admin/data-sharing-links', { activity_id: setup.activity.id, data_category_id: setup.dataCategory.id, principal_category_id: null, engagement_id: engagement.id, recipient_reference: 'Also somebody else',
    purpose_version_id: setup.purpose.versions[0]!.id, system_id: null, valid_from: hoursFromNow(-1), evidence_reference: null }, key())).status, 400);
  const byActivity = await ok(admin.call(`/api/v1/admin/processor-engagements?activity_id=${setup.activity.id}`), S.schemas.EngagementList);
  check('the processors serving an activity are queryable', byActivity.items.map(e => e.id), [engagement.id]);
  const evaluation = await ok(admin.call('/api/v1/admin/regulatory/applicability', { scope_kind: 'ACTIVITY', scope_id: setup.activity.id, as_of: null }, key()), S.schemas.ApplicabilityEvaluation);
  check('a recorded engagement makes the processor-contract requirement applicable', evaluation.decisions.find(d => d.requirement_id === 'DPDP-PROCESSOR-CONTRACT')?.result, 'APPLICABLE');

  t.setPhase('rights scope');
  const subject = await t.principalSubject('alice', [{ system_id: system.id, target_reference: `pr_${randomUUID().slice(0, 10)}` }]);
  await ok(admin.call('/api/v1/admin/data-principal-relationships', { subject_id: subject.id, category_id: setup.category.id, effective_from: hoursFromNow(-24 * 30), effective_to: null, status: 'ACTIVE', source_system_id: null, source_reference: 'Newsletter sign-up', evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'signup:1' }, key()), S.schemas.Relationship);
  const shared = await ok(admin.call(`/api/v1/admin/data-sharing-links?subject_id=${subject.id}&limit=100`), S.schemas.SharingLinkList);
  check('the sharing register answers who received this person\'s data', shared.items.some(x => x.id === share.id && x.engagement_id === engagement.id), true);
  const access = await t.executingRequest('ACCESS', principal, [{ system_id: system.id, action: 'DISCLOSE_COPY' }]);
  const accessRun = await ok(admin.call('/api/v1/admin/workflow-runs/rights', { rights_request_id: access.id, subject_id: subject.id, corrections: [] }, key()), S.schemas.WorkflowRun);
  check('an access request carries the sharing register into its run', (accessRun.configuration.sharing_register as { id: string }[]).some(x => x.id === share.id), true);

  t.setPhase('termination');
  const before = hoursFromNow(-1);
  const terminated = await ok(admin.call(`/api/v1/admin/processor-engagements/${engagement.id}/termination`, { terminated_at: hoursFromNow(-0.01), reason: 'Contract ended at renewal.', disposition_required: true }, key()), S.schemas.Engagement);
  check('termination opens a disposition task', [terminated.status, terminated.disposition_state, terminated.disposition_run_id !== null], ['TERMINATED', 'PENDING', true]);
  check('termination closes the engagement\'s links instead of deleting them', terminated.links.every(l => l.valid_to !== null), true);
  const historical = await ok(admin.call(`/api/v1/admin/processor-engagements?activity_id=${setup.activity.id}&as_of=${encodeURIComponent(before)}`), S.schemas.EngagementList);
  const nowList = await ok(admin.call(`/api/v1/admin/processor-engagements?activity_id=${setup.activity.id}&as_of=${encodeURIComponent(hoursFromNow(0.01))}`), S.schemas.EngagementList);
  check('a question about an earlier time still sees the engagement; about now it does not', [historical.items.map(e => e.id), nowList.items.length], [[engagement.id], 0]);
  check('a terminated engagement cannot receive new sharing', (await codes(admin.call('/api/v1/admin/data-sharing-links', { activity_id: setup.activity.id, data_category_id: setup.dataCategory.id, principal_category_id: null, engagement_id: engagement.id, recipient_reference: null,
    purpose_version_id: setup.purpose.versions[0]!.id, system_id: null, valid_from: hoursFromNow(0), evidence_reference: null }, key()))).codes, ['engagement_terminated']);
  check('termination is recorded once', (await admin.call(`/api/v1/admin/processor-engagements/${engagement.id}/termination`, { terminated_at: hoursFromNow(0), reason: 'Terminating a second time must fail.', disposition_required: false }, key())).status, 409);

  t.setPhase('disposition');
  const runId = terminated.disposition_run_id!;
  await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/execution`, { limit: 10 }, key()), S.schemas.WorkflowRun);
  const untouched = (await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/actions`), S.schemas.DownstreamActionList)).items[0]!;
  check('no connector pretends to perform a processor\'s disposition', [untouched.action_type, untouched.state], ['DISPOSITION_CONFIRMATION', 'pending']);
  check('a processor statement cannot be recorded as verification', (await admin.call(`/api/v1/admin/processor-engagements/${engagement.id}/disposition`, { outcome: 'VERIFIED', evidence_reference: 'Vendor letter saying it is done', verification_method: 'PROCESSOR_STATEMENT' }, key())).status, 400);
  const confirmed = await ok(admin.call(`/api/v1/admin/processor-engagements/${engagement.id}/disposition`, { outcome: 'PROCESSOR_CONFIRMED', evidence_reference: 'Vendor deletion certificate VDC-1', verification_method: 'PROCESSOR_STATEMENT' }, key()), S.schemas.Engagement);
  const confirmedAction = (await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/actions`), S.schemas.DownstreamActionList)).items[0]!;
  check('a processor confirmation is completed-by-target, not verified', [confirmed.disposition_state, confirmedAction.state, confirmedAction.execution], ['PROCESSOR_CONFIRMED', 'succeeded_unverified', 'completed_by_target']);
  await ok(admin.call(`/api/v1/admin/processor-engagements/${engagement.id}/disposition`, { outcome: 'VERIFIED', evidence_reference: 'Independent audit report IA-9', verification_method: 'INDEPENDENT_AUDIT_EVIDENCE' }, key()), S.schemas.Engagement);
  const finalRun = await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}`), S.schemas.WorkflowRun);
  const finalAction = (await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/actions`), S.schemas.DownstreamActionList)).items[0]!;
  check('independent audit evidence verifies the disposition and completes the run', [finalAction.state, finalAction.verifications[0]?.method, finalRun.status], ['verified', 'TARGET_AUDIT_EVIDENCE', 'COMPLETED_VERIFIED']);
});
