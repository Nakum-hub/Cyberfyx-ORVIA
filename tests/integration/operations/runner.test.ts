// DPDP operations: background runner (implementation plan s7 "jobs and timers").
// Under test: work left mid-way by staff is resumed by the enrolled WORKER
// identity: an estate import still processing completes, a retention evaluation
// still evaluating reaches its dry run, and the runner never approves: the run
// waits for a second person, after which the runner executes and verifies it.
// Running the runner again applies nothing twice.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';

const t = operationsSuite('runner');
const { h, check, ok } = t;
const target = recordsTarget();
const DAY = 24;

await t.run(async () => {
  const runner = operationsRunner();
  try {
    await t.ensurePackage();
    const admin = await h.login('admin'); const reviewer = await h.login('reviewer');
    const s = t.scope();
    const system = await t.boundSystem('Runner store');
    const { activity, category } = await t.activity({ condition: 'CONSENT', systems: [system.id], categoryName: 'Runner customer' });
    const tag = randomUUID().slice(0, 8);
    const ref = (i: number) => `rn_${tag}_${i}`;
    const rows = Array.from({ length: 30 }, (_, i) => ({ row_key: `rn-${tag}-${i}`, source_key: null, references: [{ system_id: system.id, target_reference: ref(i) }],
      relationships: [{ category_id: category.id, status: 'ENDED', effective_from: hoursFromNow(-DAY * 900), effective_to: hoursFromNow(-DAY * 400), source_reference: `row ${i}`, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: `export:${i}` }],
      consent: [], notice_deliveries: [] }));

    t.setPhase('import resumed');
    const job = await ok(admin.call('/api/v1/admin/bulk-jobs', { source_label: 'Runner export', mapping_version: 'rn-map-1' }, key()), S.schemas.BulkJob);
    await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/rows`, { first_ordinal: 0, rows }, key()), S.schemas.BulkJob);
    const started = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}/processing`, { limit: 5 }, key()), S.schemas.BulkJob);
    check('staff processed only a first batch', [started.status, started.counts.applied], ['PROCESSING', 5]);
    const first = await runner.once();
    check('the runner reports no errors', first.flatMap(r => r.errors), []);
    const finished = await ok(admin.call(`/api/v1/admin/bulk-jobs/${job.id}`), S.schemas.BulkJob);
    check('the runner finished the import from its checkpoint', [finished.status, finished.counts.applied], ['COMPLETED', 30]);

    t.setPhase('evaluation resumed, approval waits');
    await target.seed(s, system.id, rows.map((_, i) => ({ reference: ref(i), fields: { email: `r${i}@records.example` } })));
    const rule = await ok(admin.call('/api/v1/admin/retention-rules', { name: 'Runner rule', activity_id: activity.id, principal_category_id: category.id, data_category_id: null, system_id: null,
      trigger: 'RELATIONSHIP_ENDED', duration_days: 365, duration_source: 'CUSTOMER_CONFIGURATION', source_reference: 'Retention policy RN-1 (synthetic)', requirement_id: null,
      approval_required: true, erasure_action: 'ERASE', effective_from: hoursFromNow(-DAY) }, key()), S.schemas.RetentionRule);
    const run = await ok(admin.call('/api/v1/admin/workflow-runs/retention', { retention_rule_id: rule.id }, key()), S.schemas.WorkflowRun);
    check('the run was left evaluating', run.status, 'EVALUATING');
    await runner.once();
    const evaluated = await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}`), S.schemas.WorkflowRun);
    check('the runner completed the evaluation into a dry run', [evaluated.status, evaluated.counts.eligible], ['DRY_RUN_READY', 30]);
    await runner.once();
    check('the runner never approves: the dry run still waits', (await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}`), S.schemas.WorkflowRun)).status, 'DRY_RUN_READY');
    check('nothing was erased before approval', Number((await target.pool.query('SELECT count(*) n FROM subject_records WHERE system_id=$1 AND erased_at IS NOT NULL', [system.id])).rows[0].n), 0);

    t.setPhase('approved run executed');
    await ok(reviewer.call(`/api/v1/admin/workflow-runs/${run.id}/decision`, { decision: 'APPROVED', note: 'Second person approves the runner dry run.', scope_hash: evaluated.scope_hash }, key()), S.schemas.WorkflowRun);
    await runner.once();
    const done = await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}`), S.schemas.WorkflowRun);
    check('after approval the runner executes and every erasure is verified', [done.status, done.counts.verified], ['COMPLETED_VERIFIED', 30]);
    await runner.once();
    check('running again applies nothing twice', Number((await target.pool.query('SELECT count(*) n FROM subject_operations WHERE system_id=$1', [system.id])).rows[0].n), 30);
    const actions = await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}/actions?limit=100`), S.schemas.DownstreamActionList);
    check('verification was independent of execution', actions.items.every(a => a.verifications[0]?.method === 'INDEPENDENT_READ_BACK'), true);
  } finally { await runner.close(); await target.end(); }
});
