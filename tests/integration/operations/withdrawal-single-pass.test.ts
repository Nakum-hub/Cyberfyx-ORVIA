// One-pass withdrawal control. Creation finishes planning in the same transaction,
// so this is NOT expected regression detection for the executable reread patch.
// Synthetic adapter only. This is a pass-boundary assertion, not a 15-second latency qualification.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';

const t = operationsSuite('withdrawal-single-pass');
const { h, check, ok } = t;
const target = recordsTarget();

await t.run(async () => {
  await t.ensurePackage();
  const admin = await h.login('admin');
  const auditor = await h.login('auditor');
  const birch = await h.login('birch');
  const system = await t.boundSystem('Single pass synthetic store');
  const { activity } = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const make = async (label: string) => {
    const reference = `sp_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
    const subject = await ok(admin.call('/api/v1/admin/data-principals', {
      principal_id: null, references: [{ system_id: system.id, target_reference: reference, source_key: null }],
    }, key()), S.schemas.Subject);
    await target.seed(t.scope(), system.id, [{ reference, fields: { email: `${label}@records.example` } }]);
    const record = await ok(admin.call('/api/v1/admin/consent-records', {
      subject_id: subject.id, relationship_id: null, activity_id: activity.id, channel: 'WEB_FORM', expiry_policy: null,
      v1_principal_id: null, v1_purpose_id: null,
    }, key()), S.schemas.ConsentRecord);
    const granted = await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, {
      event: 'GRANTED', occurred_at: hoursFromNow(-48), evidence_state: 'EVIDENCE_AVAILABLE',
      evidence_reference: 'synthetic-single-pass:grant', notice_version_id: null,
    }, key()), S.schemas.ConsentRecord);
    return { reference, record: granted };
  };
  try {
    const withdrawn = await make('withdrawn');
    const standing = await make('standing');
    const path = `/api/v1/admin/consent-records/${withdrawn.record.id}/events`;
    const event = { event: 'WITHDRAWN', occurred_at: hoursFromNow(-0.01), evidence_state: 'EVIDENCE_AVAILABLE',
      evidence_reference: 'synthetic-single-pass:withdraw', notice_version_id: null };
    check('auditor cannot record a withdrawal', (await auditor.call(path, event, key())).status, 403);
    check('foreign tenant cannot record this withdrawal', (await birch.call(path, event, key())).status, 404);
    check('role and tenant refusals leave the target unrestricted', (await target.record(system.id, withdrawn.reference)).suppressed === true, false);
    const result = await ok(admin.call(path, event, key()), S.schemas.ConsentRecord);
    check('withdrawal creates one owned propagation run', result.withdrawal_run_ids.length, 1);
    const runId = result.withdrawal_run_ids[0]!;
    check('fresh withdrawal is already approved by non-destructive planning', (await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}`), S.schemas.WorkflowRun)).status, 'APPROVED');
    check('before the only pass the target is not yet suppressed', (await target.record(system.id, withdrawn.reference)).suppressed === true, false);
    const runner = operationsRunner();
    const started = performance.now();
    try {
      await runner.once(); // Exactly one call: no polling, second cycle or direct domain execution.
    } finally { await runner.close(); }
    console.log('OBSERVED single pass duration', JSON.stringify({ ms: Math.round(performance.now() - started), latency_acceptance: 'NOT_ASSERTED' }));
    check('standing grant control remains unrestricted', (await target.record(system.id, standing.reference)).suppressed === true, false);
    check('one pass independently suppresses the withdrawn target', (await target.record(system.id, withdrawn.reference)).suppressed === true, true);
    const completed = await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}`), S.schemas.WorkflowRun);
    check('the fresh run finishes with independently verified effect', [completed.status, completed.counts.verified], ['COMPLETED_VERIFIED', 1]);
  } finally { await target.end(); }
});
