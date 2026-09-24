// DPDP operations: rights request execution (quality s4 "Rights request").
// Under test: a V1 request that has passed intake, identity and scoping runs
// through connectors; a recorded hold is respected; unsupported and unreachable
// targets are accounted for rather than dropped; an irreversible run needs a
// second person's approval of the exact scope; outcomes flow back into the V1
// request; closure never claims completion; and a grievance carries the
// regulatory due time from the package in force when it was received.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { recordsTarget } from '../../../shared/testing/src/records-target.ts';

const t = operationsSuite('rights');
const { h, check, ok, codes } = t;
const target = recordsTarget();

await t.run(async () => {
  try {
    await t.ensurePackage();
    const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const alice = await h.login('alice');
    const s = t.scope();
    const principal = h.users.alice!.principal_id!;
    const [crm, held, orphan] = [await t.boundSystem('Rights CRM'), await t.boundSystem('Rights ledger'), await t.boundSystem('Rights archive')];
    const manual = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: `Rights paper index ${randomUUID().slice(0, 6)}`, connector: 'LEGACY_MANUAL' }, key()), S.schemas.System);
    const ref = `rt_${randomUUID().slice(0, 12)}`;
    const subject = await t.principalSubject('alice', [{ system_id: crm.id, target_reference: ref }, { system_id: held.id, target_reference: ref }, { system_id: manual.id, target_reference: ref }]);
    for (const system of [crm, held]) await target.seed(s, system.id, [{ reference: ref, fields: { email: 'alice@records.example', notes: 'synthetic' } }]);
    await ok(admin.call('/api/v1/admin/retention-holds', { hold_type: 'OTHER_LAW_RETENTION', authority_reference: 'Customer legal register entry RL-7 (synthetic)', reason: 'Ledger entries are kept under a customer-recorded statutory obligation.',
      subject_id: null, activity_id: null, system_id: held.id, data_category_id: null, starts_at: hoursFromNow(-24), ends_at: null, review_at: hoursFromNow(24 * 30), owner_reference: 'Legal team', evidence_reference: 'legal-register:RL-7', requirement_id: null }, key()), S.schemas.RetentionHold);

    t.setPhase('request');
    const request = await t.executingRequest('ERASURE', principal, [crm.id, held.id, manual.id, orphan.id].map(system_id => ({ system_id, action: 'ERASE_RECORD' })), ['Paper archive at the branch office']);
    check('the V1 plan marks only bound systems whose adapter erases as automatable', request.plan.map(p => [p.system_id === manual.id, p.automatable]).filter(([m]) => m).map(([, a]) => a), [false]);
    const profile = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/case-profile`, { subject_id: subject.id }, key()), S.schemas.CaseProfile);
    check('the case is pinned to the package in effect at receipt; erasure has no statutory period in it', [profile.package?.distribution, profile.due_at, profile.legal_status], ['TEST_FIXTURE', null, 'APPLICABLE']);
    check('opening the profile again returns the same pin', (await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/case-profile`, { subject_id: subject.id }, key()), S.schemas.CaseProfile)).package?.id, profile.package?.id);

    t.setPhase('dry run');
    check('a run for a person other than the requester is refused', (await codes(owner.call('/api/v1/admin/workflow-runs/rights', { rights_request_id: request.id, subject_id: (await ok(admin.call('/api/v1/admin/data-principals', { principal_id: null, references: [] }, key()), S.schemas.Subject)).id, corrections: [] }, key()))).codes, ['subject_is_not_the_requesting_principal']);
    const run = await ok(owner.call('/api/v1/admin/workflow-runs/rights', { rights_request_id: request.id, subject_id: subject.id, corrections: [] }, key()), S.schemas.WorkflowRun);
    check('an erasure run stops at a dry run for approval', [run.status, run.approval_required, run.preview?.irreversible], ['DRY_RUN_READY', true, true]);
    const byTarget = async (id: string) => new Map((await ok(admin.call(`/api/v1/admin/workflow-runs/${id}/actions?limit=100`), S.schemas.DownstreamActionList)).items.map(a => [a.system_id!, a]));
    const plan = await byTarget(run.id);
    check('the recorded hold blocks erasure on its system and is named', [plan.get(held.id)?.state, plan.get(held.id)?.block_reason, (plan.get(held.id)?.hold_ids.length ?? 0) > 0], ['blocked', 'BLOCKED_BY_RECORDED_HOLD', true]);
    check('a manual system is reported not supported', plan.get(manual.id)?.state, 'not_supported');
    check('a system with no reference for this person is blocked, not silently skipped', [plan.get(orphan.id)?.state, plan.get(orphan.id)?.block_reason], ['blocked', 'NO_SUBJECT_REFERENCE_IN_SYSTEM']);
    check('the unreachable paper archive is carried into the run', run.open_exceptions.some(e => e.includes('Paper archive')), true);
    check('the preview names the blocking hold and the unsupported target', [run.preview!.blocking_hold_ids.length > 0, run.preview!.unsupported], [true, 1]);
    check('nothing executes before approval', (await codes(owner.call(`/api/v1/admin/workflow-runs/${run.id}/execution`, { limit: 50 }, key()))).codes, ['run_requires_approval']);
    check('an organisation admin cannot approve an irreversible run', (await admin.call(`/api/v1/admin/workflow-runs/${run.id}/decision`, { decision: 'APPROVED', note: 'Admin approval must be refused.', scope_hash: run.scope_hash }, key())).status, 403);
    check('the creator cannot approve their own run', (await codes(owner.call(`/api/v1/admin/workflow-runs/${run.id}/decision`, { decision: 'APPROVED', note: 'Self approval must be refused.', scope_hash: run.scope_hash }, key()))).codes, ['creator_cannot_approve']);
    check('an approval must bind the scope that was previewed', (await codes(reviewer.call(`/api/v1/admin/workflow-runs/${run.id}/decision`, { decision: 'APPROVED', note: 'Approving a different scope.', scope_hash: 'f'.repeat(64) }, key()))).codes, ['scope_changed_since_preview']);
    const approved = await ok(reviewer.call(`/api/v1/admin/workflow-runs/${run.id}/decision`, { decision: 'APPROVED', note: 'Second person approves the previewed erasure scope.', scope_hash: run.scope_hash }, key()), S.schemas.WorkflowRun);
    check('the approval is recorded against the exact scope hash', [approved.status, approved.approval?.scope_hash], ['APPROVED', run.scope_hash]);

    t.setPhase('execute');
    const executed = await ok(admin.call(`/api/v1/admin/workflow-runs/${run.id}/execution`, { limit: 50 }, key()), S.schemas.WorkflowRun);
    const after = await byTarget(run.id);
    check('the erasable target is erased and verified', [after.get(crm.id)?.state, (await target.record(crm.id, ref)).erased_at !== null], ['verified', true]);
    check('the held target is untouched', [(await target.record(held.id, ref)).erased_at, Object.keys((await target.record(held.id, ref)).fields).length], [null, 2]);
    check('exceptions end the run as completed with exceptions, never as fully verified', executed.status, 'COMPLETED_WITH_EXCEPTIONS');
    const v1 = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}`), S.schemas.RightsRequest);
    const outcome = new Map(v1.outcomes.map(o => [o.system_id, o]));
    check('the V1 request receives one factual outcome per system', [outcome.get(crm.id)?.result, outcome.get(crm.id)?.method, outcome.get(held.id)?.result, outcome.get(manual.id)?.result, outcome.get(orphan.id)?.result],
      ['SUCCEEDED', 'CONNECTOR_OPERATION', 'MANUAL_REQUIRED', 'NOT_SUPPORTED', 'MANUAL_REQUIRED']);
    check('the verified outcome cites its evidence record', outcome.get(crm.id)?.evidence_reference?.startsWith('evidence-record:'), true);
    check('the V1 execution dimension states outstanding work', v1.execution, 'MANUAL_REQUIRED');
    check('the request cannot be marked completed while work remains', (await admin.call(`/api/v1/admin/rights-requests/${request.id}/transition`, { to: 'COMPLETED', reason: 'Attempting to complete with outstanding work.' }, key())).status, 409);
    await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/transition`, { to: 'PARTIALLY_COMPLETED', reason: 'Erased where possible; hold and manual systems accounted for.' }, key()), S.schemas.RightsRequest);
    const closed = await ok(admin.call(`/api/v1/admin/rights-requests/${request.id}/transition`, { to: 'CLOSED', reason: 'Closed with the held ledger, manual index and paper archive stated as exceptions.' }, key()), S.schemas.RightsRequest);
    check('closure keeps the execution and the unresolved destination visible', [closed.state, closed.execution, closed.unresolved_destinations], ['CLOSED', 'MANUAL_REQUIRED', ['Paper archive at the branch office']]);

    t.setPhase('grievance and privacy centre');
    const raised = await ok(alice.call('/api/v1/portal/me/rights-requests', { right_type: 'GRIEVANCE', description: 'My earlier request was not handled to my satisfaction.' }, key()), S.schemas.OwnRightsRequest);
    const grievance = await ok(admin.call(`/api/v1/admin/rights-requests/${raised.id}/case-profile`, { subject_id: subject.id }, key()), S.schemas.CaseProfile);
    const expected = new Date(Date.parse(raised.submitted_at) + 2160 * 3_600_000).toISOString();
    check('a grievance is due within the 90-day period of the package in effect at receipt', [grievance.due_at, grievance.requirement_id, grievance.legal_status], [expected, 'DPDP-GRIEVANCE-RESPONSE', 'APPLICABLE']);
    const history = await ok(alice.call(`/api/v1/portal/me/rights-requests/${raised.id}/history`), S.schemas.OwnRequestEventList);
    check('the Privacy Centre shows the requester their status history without internal notes', [history.items.map(e => e.to_state), history.items.every(e => e.note === null)], [['RECEIVED'], true]);
    const bob = await h.login('bob');
    check('another person cannot read that history', (await bob.call(`/api/v1/portal/me/rights-requests/${raised.id}/history`)).status, 404);
  } finally { await target.end(); }
});
