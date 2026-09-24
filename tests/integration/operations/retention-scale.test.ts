// DPDP operations: retention and erasure at scale (quality s4 "Retention/erasure at scale").
// Under test: a 2,000-person estate is evaluated in bounded batches into eligible,
// blocked, not-yet-eligible, purpose-active and unresolved; the dry run is
// approved by a second person; execution is interrupted and resumed; nothing is
// applied twice; and verified and failed totals are reported, with failures
// kept open and a later run picking up only what is still outstanding.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';

const t = operationsSuite('retention-scale');
const { h, check, ok, db } = t;
const target = recordsTarget();
const N = 2000;
const DAY = 24;

await t.run(async () => {
  try {
    await t.ensurePackage();
    const admin = await h.login('admin'); const reviewer = await h.login('reviewer');
    const s = t.scope();
    const system = await t.boundSystem('Former customer store');
    const { activity, category } = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: 'Former customer' });
    const run = randomUUID().slice(0, 8);
    const ref = (i: number) => `rs_${run}_${i}`;
    const kind = (i: number) => i % 5;
    const rows = Array.from({ length: N }, (_, i) => ({ row_key: `rs-${run}-${i}`, source_key: null, references: [{ system_id: system.id, target_reference: ref(i) }],
      relationships: [{ category_id: category.id, status: kind(i) === 0 ? 'ACTIVE' : kind(i) === 3 ? 'UNKNOWN' : 'ENDED', effective_from: hoursFromNow(-DAY * 900),
        effective_to: kind(i) === 1 ? hoursFromNow(-DAY * 400) : kind(i) === 2 ? hoursFromNow(-DAY * 100) : null,
        source_reference: `crm row ${i}`, evidence_state: kind(i) === 3 ? 'UNKNOWN' : 'EVIDENCE_AVAILABLE', evidence_reference: kind(i) === 3 ? null : `crm-export:${i}` }], consent: [], notice_deliveries: [] }));
    t.setPhase('import');
    const started = Date.now();
    const job = await ok(admin.call('/api/v1/admin/bulk-jobs', { source_label: 'Former customer store export', mapping_version: 'rs-map-1' }, key()), S.schemas.BulkJob);
    for (let i = 0; i < N; i += 500) await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: i, rows: rows.slice(i, i + 500) }, key()), S.schemas.BulkJob);
    let imported = job;
    while (imported.status !== 'COMPLETED' && imported.status !== 'COMPLETED_WITH_ERRORS') imported = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 400 }, key()), S.schemas.BulkJob);
    check('the estate imports completely', [imported.status, imported.counts.applied], ['COMPLETED', N]);
    const importSeconds = (Date.now() - started) / 1000;
    // Eligible people have records in the target, except a slice that has gone missing there.
    const eligible = rows.map((_, i) => i).filter(i => kind(i) === 1);
    const missing = new Set(eligible.filter(i => i % 100 === 21));
    await target.seed(s, system.id, eligible.filter(i => !missing.has(i)).map(i => ({ reference: ref(i), fields: { name: `Synthetic ${i}`, email: `p${i}@records.example` } })));
    const held = eligible.filter(i => i % 100 === 1);
    for (const i of held) {
      const subjectId = (await ok(admin.call(`/api/v1/admin/data-principals?system_id=${system.id}&target_reference=${ref(i)}`), S.schemas.SubjectList)).items[0]!.id;
      await ok(admin.call('/api/v1/admin/retention-holds', { hold_type: 'OPERATIONAL_HOLD', authority_reference: `Dispute file D-${i} (synthetic)`, reason: 'An open customer dispute requires the record to be kept.',
        subject_id: subjectId, activity_id: null, system_id: null, data_category_id: null, starts_at: hoursFromNow(-1), ends_at: null, review_at: hoursFromNow(DAY * 30), owner_reference: 'Disputes team', evidence_reference: null, requirement_id: null }, key()), S.schemas.RetentionHold);
    }
    const rule = await ok(admin.call('/api/v1/admin/retention-rules', { name: 'Former customer records', activity_id: activity.id, principal_category_id: category.id, data_category_id: null, system_id: null,
      trigger: 'RELATIONSHIP_ENDED', duration_days: 365, duration_source: 'CUSTOMER_CONFIGURATION', source_reference: 'Records retention policy RP-9 (synthetic)', requirement_id: null,
      approval_required: true, erasure_action: 'ERASE', effective_from: hoursFromNow(-DAY) }, key()), S.schemas.RetentionRule);
    check('a rule with a sourced period is resolved', rule.resolved, true);

    t.setPhase('evaluation');
    const evalStart = Date.now();
    let evaluation = await ok(admin.call('/api/v1/admin/workflow-runs/retention', { retention_rule_id: rule.id }, key()), S.schemas.WorkflowRun);
    let batches = 0;
    while (evaluation.status === 'EVALUATING') { evaluation = await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/evaluation`, { limit: 500 }, key()), S.schemas.WorkflowRun); batches++; }
    const evalSeconds = (Date.now() - evalStart) / 1000;
    check('evaluation proceeds in bounded, checkpointed batches', batches >= Math.ceil(N / 500), true);
    const expectedEligible = eligible.length - held.length;
    check('the population separates into eligible, blocked and unresolved', [evaluation.counts.total_discovered, evaluation.counts.eligible, evaluation.counts.blocked, evaluation.counts.unresolved], [N, expectedEligible, held.length, 2 * N / 5]);
    const states = Object.fromEntries((await db.query(`SELECT state,count(*)::int n FROM app.retention_states WHERE rule_id=$1 GROUP BY state`, [rule.id])).rows.map(r => [r.state, r.n]));
    check('each person has a persisted retention position', [states.PURPOSE_ACTIVE, states.NOT_YET_ELIGIBLE, states.UNRESOLVED, states.BLOCKED_BY_HOLD, states.SCHEDULED], [N / 5, N / 5, 2 * N / 5, held.length, expectedEligible]);
    const reasons = (await db.query(`SELECT DISTINCT unresolved_reason FROM app.retention_states WHERE rule_id=$1 AND state='UNRESOLVED' ORDER BY 1`, [rule.id])).rows.map(r => r.unresolved_reason);
    check('an unknown status or end date is unresolved with its reason, never assumed', reasons, ['A relationship ended on an unrecorded date.', 'A relationship in scope has an unknown status.']);
    check('the dry run waits for approval with its irreversible scope stated', [evaluation.status, evaluation.preview?.irreversible, evaluation.preview?.eligible, evaluation.preview?.blocking_hold_ids.length], ['DRY_RUN_READY', true, expectedEligible, held.length]);

    t.setPhase('approval and interrupted execution');
    await ok(reviewer.call(`/api/v1/admin/workflow-runs/${evaluation.id}/decision`, { decision: 'APPROVED', note: 'Retention dry run reviewed and approved.', scope_hash: evaluation.scope_hash }, key()), S.schemas.WorkflowRun);
    const execStart = Date.now();
    const partial = await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/execution`, { limit: 100 }, key()), S.schemas.WorkflowRun);
    check('an interrupted run records exactly the batch it completed', [partial.status, partial.counts.submitted], ['RUNNING', 100]);
    let current = partial;
    while (current.status === 'RUNNING') current = await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/execution`, { limit: 150 }, key()), S.schemas.WorkflowRun);
    const execSeconds = (Date.now() - execStart) / 1000;
    check('resuming finishes the run with verified and failed totals', [current.counts.verified, current.counts.failed, current.counts.submitted], [expectedEligible - missing.size, missing.size, expectedEligible]);
    check('records missing at the target keep the run open as partially failed', current.status, 'PARTIALLY_FAILED');
    const erased = Number((await target.pool.query(`SELECT count(*) n FROM subject_records WHERE system_id=$1 AND erased_at IS NOT NULL`, [system.id])).rows[0].n);
    check('exactly the verified people were erased at the target', erased, expectedEligible - missing.size);
    const heldRecord = await target.record(system.id, ref(held[0]!));
    check('a held person was not erased', heldRecord.erased_at, null);
    await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/execution`, { limit: 200 }, key()), S.schemas.WorkflowRun);
    const ledger = Number((await target.pool.query(`SELECT count(*) n FROM subject_operations WHERE system_id=$1`, [system.id])).rows[0].n);
    check('executing again applies nothing twice', ledger, expectedEligible - missing.size);
    const erasedStates = Number((await db.query(`SELECT count(*) n FROM app.retention_states WHERE rule_id=$1 AND state='ERASED'`, [rule.id])).rows[0].n);
    check('verified erasures are recorded as erased, failures as failed', [erasedStates, Number((await db.query(`SELECT count(*) n FROM app.retention_states WHERE rule_id=$1 AND state='FAILED'`, [rule.id])).rows[0].n)], [expectedEligible - missing.size, missing.size]);

    t.setPhase('follow-up');
    await ok(admin.call(`/api/v1/admin/workflow-runs/${evaluation.id}/cancellation`, { reason: 'Closing the first run; outstanding failures move to a follow-up run.' }, key()), S.schemas.WorkflowRun);
    let followUp = await ok(admin.call('/api/v1/admin/workflow-runs/retention', { retention_rule_id: rule.id }, key()), S.schemas.WorkflowRun);
    while (followUp.status === 'EVALUATING') followUp = await ok(admin.call(`/api/v1/admin/workflow-runs/${followUp.id}/evaluation`, { limit: 1000 }, key()), S.schemas.WorkflowRun);
    check('a later run picks up only what is still outstanding', followUp.counts.eligible, missing.size);
    t.check('timings are recorded for the scale fixture', typeof importSeconds === 'number' && typeof evalSeconds === 'number' && typeof execSeconds === 'number', true);
    console.log(JSON.stringify({ scale: { subjects: N, import_seconds: importSeconds, evaluation_seconds: evalSeconds, execution_seconds: execSeconds, actions: expectedEligible } }));
  } finally { await target.end(); }
});
