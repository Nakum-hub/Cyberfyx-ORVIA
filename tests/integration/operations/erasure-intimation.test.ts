// DPDP operations: the Rule 8(2) intimation before Third Schedule erasure (contract 0.47.0).
// Under test: under a rule citing DPDP-RETENTION-THIRD-SCHEDULE, a person past their erasure date is not scheduled until an
// intimation was recorded at least 48 hours earlier; a recent intimation moves erasure to 48 hours after it; a person who
// re-engaged after the intimation is purpose-active, never erased; the same people under a rule not citing the Third Schedule
// are scheduled as before; the due list shows who must be told and by when; a read-only role cannot record; an intimation
// against a non-Third-Schedule rule is refused; and a recorded intimation cannot be changed.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('erasure-intimation');
const { h, check, ok, db } = t;
const DAY = 24;
const THIRD = 'DPDP-RETENTION-THIRD-SCHEDULE';

await t.run(async () => {
  try {
    await t.ensurePackage();
    const admin = await h.login('admin'); const auditor = await h.login('auditor');
    const system = await t.boundSystem('Dormant account store');
    const { activity, category } = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: 'Dormant account holder' });
    const run = randomUUID().slice(0, 8);
    const ref = (i: number) => `ei_${run}_${i}`;
    const rows = Array.from({ length: 4 }, (_, i) => ({ row_key: `ei-${run}-${i}`, source_key: null, references: [{ system_id: system.id, target_reference: ref(i) }],
      relationships: [{ category_id: category.id, status: 'ENDED', effective_from: hoursFromNow(-DAY * 1500), effective_to: hoursFromNow(-DAY * 1200), source_reference: `store row ${i}`, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: `store-export:${i}` }],
      consent: [], notice_deliveries: [] }));
    const job = await ok(admin.call('/api/v1/admin/bulk-jobs', { source_label: 'Dormant account store export', mapping_version: 'ei-map-1' }, key()), S.schemas.BulkJob);
    await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: 0, rows }, key()), S.schemas.BulkJob);
    let imported = job;
    while (imported.status !== 'COMPLETED' && imported.status !== 'COMPLETED_WITH_ERRORS') imported = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 50 }, key()), S.schemas.BulkJob);
    const subject = async (i: number) => (await ok(admin.call(`/api/v1/admin/data-principals?system_id=${system.id}&target_reference=${ref(i)}`), S.schemas.SubjectList)).items[0]!.id as string;
    const people = [await subject(0), await subject(1), await subject(2), await subject(3)];
    const rule = (name: string, requirement: string | null) => ok(admin.call('/api/v1/admin/retention-rules', { name, activity_id: activity.id, principal_category_id: category.id, data_category_id: null, system_id: null,
      trigger: 'RELATIONSHIP_ENDED', duration_days: 1095, duration_source: requirement ? 'REGULATORY_REQUIREMENT' : 'CUSTOMER_CONFIGURATION',
      source_reference: requirement ? 'DPDP Rules, 2025, Third Schedule (synthetic class)' : 'Records policy RP-3 (synthetic)', requirement_id: requirement,
      approval_required: true, erasure_action: 'ERASE', effective_from: hoursFromNow(-DAY) }, key()), S.schemas.RetentionRule);
    const third = await rule(`Dormant accounts ${run}`, THIRD);
    const plain = await rule(`Dormant accounts, customer policy ${run}`, null);
    const evaluate = async (ruleId: string) => { let r = await ok(admin.call('/api/v1/admin/workflow-runs/retention', { retention_rule_id: ruleId }, key()), S.schemas.WorkflowRun);
      while (r.status === 'EVALUATING') r = await ok(admin.call(`/api/v1/admin/workflow-runs/${r.id}/evaluation`, { limit: 50 }, key()), S.schemas.WorkflowRun); return r; };
    const states = async (ruleId: string) => Object.fromEntries((await db.query('SELECT subject_id, state, unresolved_reason, eligible_at FROM app.retention_states WHERE rule_id=$1', [ruleId])).rows.map(r => [r.subject_id, r]));
    const cancel = (runId: string) => ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/cancellation`, { reason: 'Closing this evaluation to record intimations first.' }, key()), S.schemas.WorkflowRun);

    t.setPhase('no intimation yet');
    const first = await evaluate(third.id);
    let st = await states(third.id);
    check('without an intimation nobody under the Third Schedule rule is scheduled', people.map(p => st[p]?.state), ['UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED']);
    check('the reason names Rule 8(2)', /Rule 8\(2\)/.test(String(st[people[0]!]?.unresolved_reason)), true);
    check('the erasure date is still recorded, so the intimation can be scheduled', people.every(p => st[p]?.eligible_at !== null), true);
    const control = await evaluate(plain.id);
    check('the same people under a rule not citing the Third Schedule are scheduled as before', (await db.query("SELECT count(*)::int n FROM app.retention_states WHERE rule_id=$1 AND state='SCHEDULED'", [plain.id])).rows[0].n, 4);
    await cancel(control.id);
    if (first.status !== 'CANCELLED' && first.status !== 'COMPLETED_VERIFIED') await cancel(first.id);

    t.setPhase('due list and recording');
    const due = await ok(admin.call('/api/v1/admin/erasure-intimations/due?limit=50'), S.schemas.ErasureIntimationDueList);
    const mine = due.items.filter(d => d.rule_id === third.id);
    check('the due list shows each person, overdue because the erasure date has passed', [mine.length, mine.every(d => d.overdue)], [4, true]);
    const tell = (i: number, at: string) => admin.call('/api/v1/admin/erasure-intimations', { subject_id: people[i], rule_id: third.id, intimated_at: at, channel: 'EMAIL', evidence_reference: `Synthetic message M-${run}-${i}` }, key());
    check('a read-only role cannot record an intimation', (await auditor.call('/api/v1/admin/erasure-intimations', { subject_id: people[1], rule_id: third.id, intimated_at: hoursFromNow(0), channel: 'EMAIL', evidence_reference: 'Synthetic' }, key())).status, 403);
    check('an intimation against a rule not citing the Third Schedule is refused', (await admin.call('/api/v1/admin/erasure-intimations', { subject_id: people[1], rule_id: plain.id, intimated_at: hoursFromNow(0), channel: 'EMAIL', evidence_reference: 'Synthetic' }, key())).status, 409);
    const recent = await ok(tell(1, hoursFromNow(0)), S.schemas.ErasureIntimation);
    check('a recent intimation makes erasure possible 48 hours after it', Math.round((Date.parse(recent.erasable_from) - Date.parse(recent.intimated_at)) / 3_600_000), 48);
    await ok(tell(2, hoursFromNow(-DAY * 3)), S.schemas.ErasureIntimation);
    const back = await ok(tell(3, hoursFromNow(-DAY * 3)), S.schemas.ErasureIntimation);
    await ok(admin.call(`/api/v1/admin/erasure-intimations/${back.id}/re-engagement`, { re_engaged_at: hoursFromNow(-DAY), basis: 'LOGGED_IN' }, key()), S.schemas.ErasureIntimation);
    check('a re-engagement is recorded once', (await admin.call(`/api/v1/admin/erasure-intimations/${back.id}/re-engagement`, { re_engaged_at: hoursFromNow(0), basis: 'INITIATED_CONTACT' }, key())).status, 409);
    check('the database refuses to change a recorded intimation', await db.query('UPDATE app.erasure_intimations SET evidence_reference=$2 WHERE id=$1', [recent.id, 'Altered']).then(() => 'updated', (e: Error) => e.message), 'intimation_is_immutable');

    t.setPhase('evaluation after intimations');
    await evaluate(third.id);
    st = await states(third.id);
    check('no intimation: still waiting', st[people[0]!]?.state, 'UNRESOLVED');
    check('intimation under 48 hours ago: not yet eligible, until 48 hours after it', [st[people[1]!]?.state, Math.round((new Date(st[people[1]!]!.eligible_at).getTime() - Date.parse(recent.intimated_at)) / 3_600_000)], ['NOT_YET_ELIGIBLE', 48]);
    check('intimation over 48 hours ago: scheduled for erasure', st[people[2]!]?.state, 'SCHEDULED');
    check('re-engaged after the intimation: purpose active, not erased', st[people[3]!]?.state, 'PURPOSE_ACTIVE');
    const listed = await ok(admin.call(`/api/v1/admin/erasure-intimations?subject_id=${people[3]}&limit=10`), S.schemas.ErasureIntimationList);
    check('the intimation list shows the re-engagement', [listed.items.length, listed.items[0]?.re_engagement_basis], [1, 'LOGGED_IN']);
  } finally { /* the operations suite closes its own resources */ }
});
