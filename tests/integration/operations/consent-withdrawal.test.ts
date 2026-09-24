// DPDP operations: consent withdrawal propagation (quality s4 "Consent withdrawal").
// Under test: a withdrawal becomes a pinned propagation run; a healthy target is
// independently verified; an unavailable target fails and is retried; a target
// that acknowledges without acting is caught by read-back; a timeout is an
// unknown effect resolved only by verification; an unbound target is reported
// not supported; failed work stays open; a crashed dispatch replays rather than
// re-applies; and a withdrawal made in the V1 portal enters the same workflow.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { digest } from '../../../shared/contracts/src/crypto.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';

const t = operationsSuite('consent-withdrawal');
const { h, check, ok, db } = t;
const target = recordsTarget();

await t.run(async () => {
  try {
    await t.ensurePackage();
    const admin = await h.login('admin'); const owner = await h.login('owner'); const member = await h.login('member');
    const s = t.scope();
    const [healthy, unavailable, silent, slow] = [await t.boundSystem('Healthy CRM'), await t.boundSystem('Unavailable CRM'), await t.boundSystem('Silent CRM'), await t.boundSystem('Slow CRM')];
    const unbound = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: `Unbound CRM ${randomUUID().slice(0, 6)}`, connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
    const systems = [healthy, unavailable, silent, slow, unbound];
    const { activity } = await t.activity({ condition: 'CONSENT', systems: systems.map(x => x.id) });
    const ref = `wd_${randomUUID().slice(0, 12)}`;
    const subject = await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: systems.map(x => ({ system_id: x.id, target_reference: ref, source_key: null })) }, key()), S.schemas.Subject);
    for (const system of [healthy, unavailable, silent, slow]) await target.seed(s, system.id, [{ reference: ref, fields: { email: 'synthetic@records.example', segment: 'newsletter' } }]);
    await target.mode(s, unavailable.id, 'UNAVAILABLE'); await target.mode(s, silent.id, 'ACK_WITHOUT_EFFECT'); await target.mode(s, slow.id, 'APPLY_THEN_TIMEOUT');

    t.setPhase('withdrawal');
    const record = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: subject.id, relationship_id: null, activity_id: activity.id, channel: 'WEB_FORM', expiry_policy: null, v1_principal_id: null, v1_purpose_id: null }, key()), S.schemas.ConsentRecord);
    check('a consent record starts unknown, not granted', record.current_status, 'UNKNOWN');
    check('an admin without the executor capability cannot record consent events', (await member.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-48), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'form:1', notice_version_id: null }, key())).status, 403);
    await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-48), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:granted', notice_version_id: null }, key()), S.schemas.ConsentRecord);
    check('expiry is refused where no expiry policy is configured', (await admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'EXPIRED', occurred_at: hoursFromNow(-1), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'x-expiry', notice_version_id: null }, key())).status, 409);
    const withdrawn = await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'WITHDRAWN', occurred_at: hoursFromNow(-0.1), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:withdrawn', notice_version_id: null }, key()), S.schemas.ConsentRecord);
    check('the withdrawal is appended and creates exactly one propagation run', [withdrawn.current_status, withdrawn.events.map(e => e.event), withdrawn.withdrawal_run_ids.length], ['WITHDRAWN', ['GRANTED', 'WITHDRAWN'], 1]);
    const runId = withdrawn.withdrawal_run_ids[0]!;
    const planned = await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}`), S.schemas.WorkflowRun);
    check('the run is pinned to the regulatory package and needs no approval to stop processing', [planned.kind, planned.status, planned.approval_required, planned.package.distribution], ['CONSENT_WITHDRAWAL', 'APPROVED', false, 'TEST_FIXTURE']);
    const actions = async () => new Map((await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/actions?limit=100`), S.schemas.DownstreamActionList)).items.map(a => [a.system_id!, a]));
    check('a system with no connector binding is reported not supported, never skipped', (await actions()).get(unbound.id)?.state, 'not_supported');
    check('a withdrawal suppresses; it never deletes by itself', [...(await actions()).values()].every(a => a.action_type === 'SUPPRESS'), true);

    t.setPhase('execution');
    check('a member cannot execute propagation', (await member.call(`/api/v1/admin/workflow-runs/${runId}/execution`, { limit: 50 }, key())).status, 403);
    const firstPass = await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    let view = await actions();
    check('the healthy target is verified by independent read-back', [view.get(healthy.id)?.state, view.get(healthy.id)?.execution, view.get(healthy.id)?.verifications[0]?.method], ['verified', 'verified', 'INDEPENDENT_READ_BACK']);
    check('the unavailable target failed and stays retryable', [view.get(unavailable.id)?.state, view.get(unavailable.id)?.last_error_code], ['failed', 'TARGET_UNAVAILABLE']);
    check('a target that claimed success without acting is caught by verification', [view.get(silent.id)?.target_result, view.get(silent.id)?.state, view.get(silent.id)?.verification], ['COMPLETED_BY_TARGET', 'failed', 'FAILED']);
    check('a timeout is an unknown effect, resolved only by reading the target back', [view.get(slow.id)?.target_result, view.get(slow.id)?.state], ['TIMEOUT_EFFECT_UNKNOWN', 'verified']);
    check('with a retry outstanding the run stays running', firstPass.status, 'RUNNING');
    check('the target really changed only where the effect was applied', [(await target.record(healthy.id, ref)).suppressed, (await target.record(silent.id, ref)).suppressed], [true, false]);
    await target.mode(s, unavailable.id, 'HEALTHY');
    const secondPass = await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    view = await actions();
    check('the retried target succeeds on its second attempt', [view.get(unavailable.id)?.state, view.get(unavailable.id)?.attempts], ['verified', 2]);
    check('failed and unsupported work keeps the run open, not completed', [secondPass.status, secondPass.counts.verified, secondPass.counts.failed, secondPass.counts.not_supported], ['PARTIALLY_FAILED', 3, 1, 1]);
    check('the open exceptions are stated in the run', secondPass.open_exceptions.some(e => e.includes('failed')) && secondPass.open_exceptions.some(e => e.includes('no supported connector')), true);
    await ok(admin.call(`/api/v1/admin/workflow-runs/${runId}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    check('re-running a settled run applies nothing twice', [(await target.operations(healthy.id, ref)).length, (await actions()).get(healthy.id)?.attempts], [1, 1]);
    check('a verified action cannot be edited back to a pending state', await db.query(`UPDATE app.downstream_actions SET state='pending' WHERE id=$1`, [view.get(healthy.id)!.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED'), 'REJECTED');

    t.setPhase('crash replay');
    await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'GRANTED', occurred_at: hoursFromNow(-0.05), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:regranted', notice_version_id: null }, key()), S.schemas.ConsentRecord);
    const again = await ok(admin.call(`/api/v1/admin/consent-records/${record.id}/events`, { event: 'WITHDRAWN', occurred_at: hoursFromNow(-0.01), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'web-form:withdrawn-again', notice_version_id: null }, key()), S.schemas.ConsentRecord);
    const secondRun = again.withdrawal_run_ids.find(id => id !== runId)!;
    const crashed = (await ok(admin.call(`/api/v1/admin/workflow-runs/${secondRun}/actions?limit=100`), S.schemas.DownstreamActionList)).items.find(a => a.system_id === healthy.id)!;
    const keyRow = (await db.query('SELECT idempotency_key FROM app.downstream_actions WHERE id=$1', [crashed.id])).rows[0].idempotency_key;
    // A worker that applied the effect at the target and died before recording it.
    await target.pool.query(`INSERT INTO subject_operations(idempotency_key,system_id,subject_reference,operation,request_digest,applied,outcome) VALUES($1,$2,$3,'SUPPRESS',$4,true,'COMPLETED')`,
      [keyRow, healthy.id, ref, digest({ action_type: 'SUPPRESS', system_id: healthy.id, target_reference: ref, payload: null })]);
    await db.query(`UPDATE app.downstream_actions SET state='executing',attempts=1 WHERE id=$1`, [crashed.id]);
    await ok(admin.call(`/api/v1/admin/workflow-runs/${secondRun}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    const replayed = (await ok(admin.call(`/api/v1/admin/workflow-runs/${secondRun}/actions?limit=100`), S.schemas.DownstreamActionList)).items.find(a => a.id === crashed.id)!;
    const attempts = (await db.query('SELECT replayed FROM app.downstream_action_attempts WHERE action_id=$1 AND target_result<>$2', [crashed.id, 'DISPATCHED'])).rows;
    check('an interrupted dispatch is resumed by replaying the target record, then verified', [replayed.state, attempts.map(a => a.replayed)], ['verified', [true]]);
    check('the target applied that operation exactly once', (await target.operations(healthy.id, ref)).filter(o => o.idempotency_key === keyRow).length, 1);

    t.setPhase('evidence');
    const pkg = await ok(owner.call(`/api/v1/admin/workflow-runs/${runId}/evidence-package`), S.schemas.EvidencePackage);
    check('the evidence package carries the trigger, package, actions, verifications and final state', [pkg.run.id, pkg.final_state, pkg.actions.length, pkg.regulatory_package.distribution, pkg.fixture_content], [runId, 'PARTIALLY_FAILED', 5, 'TEST_FIXTURE', true]);
    check('each verified action in the export carries its verification evidence', pkg.actions.filter(a => a.state === 'verified').every(a => a.verifications.some(v => v.result === 'PASS' && v.evidence_id !== null)), true);
    check('a member cannot export evidence', (await member.call(`/api/v1/admin/workflow-runs/${runId}/evidence-package`)).status, 403);
    const audited = (await db.query(`SELECT count(*)::int n FROM app.audit_events WHERE operation='workflow_run.evidence_export' AND resource_id=$1`, [runId])).rows[0].n;
    check('exporting evidence is itself audited', audited >= 1, true);
    const attention = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
    check('the failed action appears in Attention against its run', attention.items.some(i => i.kind === 'ACTION_FAILED' && i.entity_id === runId), true);

    t.setPhase('portal');
    const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
    const alicePrincipal = h.users.alice!.principal_id!;
    const existing = (await ok(admin.call(`/api/v1/admin/data-principals?principal_id=${alicePrincipal}`), S.schemas.SubjectList)).items[0];
    const aliceSubject = existing ?? await ok(admin.call('/api/v1/admin/data-principals', { principal_id: alicePrincipal, references: [] }, key()), S.schemas.Subject);
    const portalActivity = await t.activity({ condition: 'CONSENT', systems: [healthy.id] });
    await scenario.change('grant'); await scenario.change('withdraw');
    const linked = await ok(admin.call('/api/v1/admin/consent-records', { subject_id: aliceSubject.id, relationship_id: null, activity_id: portalActivity.activity.id, channel: 'V1_PORTAL', expiry_policy: null, v1_principal_id: alicePrincipal, v1_purpose_id: scenario.purpose.id }, key()), S.schemas.ConsentRecord);
    const synced = await ok(admin.call('/api/v1/admin/consent-records/portal-sync', {}, key()), S.schemas.ConsentSync);
    const mirrored = await ok(admin.call(`/api/v1/admin/consent-records/${linked.id}`), S.schemas.ConsentRecord);
    check('portal choices are mirrored with their receipts as evidence', [mirrored.events.map(e => e.event), mirrored.events.every(e => e.source === 'V1_PORTAL' && e.evidence_reference?.startsWith('portal-receipt:'))], [['GRANTED', 'WITHDRAWN'], true]);
    check('a portal withdrawal enters the same propagation workflow', synced.withdrawal_runs.length >= 1 && mirrored.withdrawal_run_ids.length === 1, true);
    const resynced = await ok(admin.call('/api/v1/admin/consent-records/portal-sync', {}, key()), S.schemas.ConsentSync);
    check('syncing again mirrors nothing twice', resynced.mirrored_events, 0);
  } finally { await target.end(); }
});
