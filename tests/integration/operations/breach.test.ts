// DPDP operations: personal-data breach (quality s4 "Personal-data breach").
// Under test: a V1 incident becomes a breach only when registered; it is pinned
// to the package in effect at awareness; its tasks and deadlines come from that
// package; a missing awareness time leaves deadlines unresolved; an unknown
// affected count stays unknown; completion needs communication evidence;
// overdue work surfaces in Attention; and deadlines raise notifications only
// where a template and a recipient are recorded.
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow } from '../../../shared/testing/src/operations-fixture.ts';
import { fixturePackage, signFixture } from '../../../shared/testing/src/regulatory-fixture.ts';

const t = operationsSuite('breach');
const { h, check, ok, codes } = t;
const facts = { nature: 'Unauthorised access to a synthetic mailing list', extent: 'One synthetic table', timing: 'Detected during a routine review', location: 'Synthetic CRM', likely_impact: 'Unwanted contact' };

await t.run(async () => {
  await t.ensurePackage();
  const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const admin = await h.login('admin'); const auditor = await h.login('auditor'); const member = await h.login('member');
  // A package effective ten days ago, so an incident three days old has one in force at its awareness.
  const older = signFixture(fixturePackage({ version: `3.${Date.now()}.0`, previous_version: null, effective_from: hoursFromNow(-240), requirement_effective_from: '2025-01-01' }), process.env.ORVIA_RELEASE_KEY_ID!, process.env.ORVIA_RELEASE_PRIVATE_KEY!);
  const imported = await ok(owner.call('/api/v1/admin/regulatory/packages', older, key()), S.schemas.RegulatoryPackage);
  await ok(reviewer.call(`/api/v1/admin/regulatory/packages/${imported.id}/decision`, { decision: 'APPROVED', note: 'Back-dated fixture package for breach deadlines.', acknowledged_open_verification_items: false }, key()), S.schemas.RegulatoryPackage);
  const system = await t.boundSystem('Breach CRM');
  const setup = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const register = (incidentId: string) => admin.call('/api/v1/admin/personal-data-breaches', { incident_id: incidentId, affected_count: null, affected_count_state: 'UNKNOWN', data_category_ids: [setup.dataCategory.id], activity_ids: [setup.activity.id], system_ids: [system.id], engagement_ids: [], facts, mitigation: null }, key());

  t.setPhase('pinned timers');
  const overdueIncident = await t.incident([system.id], 80);
  const plain = await t.incident([system.id], 1);
  check('an incident is not a breach until it is registered as one', (await admin.call(`/api/v1/admin/personal-data-breaches/${plain.id}`)).status, 404);
  const breach = await ok(register(overdueIncident.id), S.schemas.Breach);
  check('the breach is pinned to the package in force at awareness', breach.package.version, imported.version);
  const task = (b: ReturnType<typeof S.schemas.Breach.parse>, kind: string) => b.tasks.find(x => x.kind === kind)!;
  const due = new Date(Date.parse(breach.became_aware_at!) + 72 * 3_600_000).toISOString();
  check('the detailed Board report is due 72 hours after awareness and is overdue', [task(breach, 'BOARD_DETAILED_REPORT').due_at, task(breach, 'BOARD_DETAILED_REPORT').overdue, task(breach, 'BOARD_DETAILED_REPORT').legal_status], [due, true, 'APPLICABLE']);
  check('intimation to the Board and to each principal is due without delay, with no invented hour count', [task(breach, 'BOARD_INTIMATION').due_at, task(breach, 'PRINCIPAL_INTIMATION').due_at, task(breach, 'PRINCIPAL_INTIMATION').timer_rule.startsWith('Without delay')], [null, null, true]);
  check('an unknown affected count stays unknown', [breach.affected_count, breach.affected_count_state], [null, 'UNKNOWN']);
  check('a breach is registered once', (await codes(register(overdueIncident.id))).codes, ['already_registered']);

  t.setPhase('unknown awareness');
  const unaware = await t.incident([system.id], null);
  const unresolved = await ok(register(unaware.id), S.schemas.Breach);
  check('without an awareness time the 72-hour deadline is unresolved, not guessed from detection', [task(unresolved, 'BOARD_DETAILED_REPORT').legal_status, task(unresolved, 'BOARD_DETAILED_REPORT').due_at, task(unresolved, 'BOARD_DETAILED_REPORT').unresolved_reason !== null], ['UNRESOLVED', null, true]);

  t.setPhase('facts and completion');
  const estimated = await ok(admin.call(`/api/v1/admin/personal-data-breaches/${overdueIncident.id}/facts`, { affected_count: 120, affected_count_state: 'ESTIMATED', mitigation: 'Access revoked and credentials rotated.', facts }, key()), S.schemas.Breach);
  const established = await ok(admin.call(`/api/v1/admin/personal-data-breaches/${overdueIncident.id}/facts`, { affected_count: 118, affected_count_state: 'ESTABLISHED', mitigation: 'Access revoked and credentials rotated.', facts }, key()), S.schemas.Breach);
  check('the affected count moves from estimated to established', [estimated.affected_count_state, established.affected_count], ['ESTIMATED', 118]);
  check('an established count cannot be put back to unknown', (await codes(admin.call(`/api/v1/admin/personal-data-breaches/${overdueIncident.id}/facts`, { affected_count: null, affected_count_state: 'UNKNOWN', mitigation: null, facts }, key()))).codes, ['established_count_cannot_regress']);
  check('completing a task without communication evidence is refused by the contract', (await admin.call(`/api/v1/admin/breach-tasks/${task(breach, 'BOARD_INTIMATION').id}/completion`, { note: 'Missing evidence must be refused.' }, key())).status, 400);
  const completed = await ok(admin.call(`/api/v1/admin/breach-tasks/${task(breach, 'BOARD_INTIMATION').id}/completion`, { communication_evidence_reference: 'Board portal submission BRD-1 (synthetic)', note: 'Intimation submitted to the Board.' }, key()), S.schemas.Breach);
  check('the completed task keeps its evidence', [task(completed, 'BOARD_INTIMATION').state, task(completed, 'BOARD_INTIMATION').communication_evidence_reference], ['COMPLETED', 'Board portal submission BRD-1 (synthetic)']);
  check('a task is completed once', (await admin.call(`/api/v1/admin/breach-tasks/${task(breach, 'BOARD_INTIMATION').id}/completion`, { communication_evidence_reference: 'Another submission', note: 'A second completion must fail.' }, key())).status, 409);
  check('an auditor can read a breach but not change it', [(await auditor.call(`/api/v1/admin/personal-data-breaches/${overdueIncident.id}`)).status, (await auditor.call(`/api/v1/admin/personal-data-breaches/${overdueIncident.id}/facts`, { affected_count: 1, affected_count_state: 'ESTABLISHED', mitigation: null, facts }, key())).status], [200, 403]);
  check('a member cannot see breach workspaces', (await member.call(`/api/v1/admin/personal-data-breaches/${overdueIncident.id}`)).status, 403);
  const attention = await ok(admin.call('/api/v1/admin/operations/attention'), S.schemas.OperationsAttention);
  check('the overdue breach deadline is in Attention', attention.items.some(i => i.kind === 'BREACH_TASK_DUE' && i.entity_id === overdueIncident.id && i.severity === 'OVERDUE'), true);
  check('the unresolved deadline is in Attention as unresolved', attention.items.some(i => i.kind === 'BREACH_TASK_DUE' && i.entity_id === unaware.id && i.severity === 'UNRESOLVED'), true);

  t.setPhase('notifications');
  await ok(owner.call('/api/v1/admin/organisation-profile', { sdf_status: 'NOT_DESIGNATED', sdf_designation_reference: null, dpo_contact: null, grievance_contact: null, independent_auditor_reference: null, facts: { third_schedule_class: 'NONE' }, effective_from: new Date().toISOString(), reason: 'Contacts removed to prove notifications need a recipient.' }, key()), S.schemas.OrganisationProfile);
  const blocked = await ok(admin.call('/api/v1/admin/operations/notification-sweep', {}, key()), S.schemas.NotificationSweep);
  const ours = [task(breach, 'BOARD_DETAILED_REPORT').id, task(breach, 'PRINCIPAL_INTIMATION').id];
  check('with no recipient recorded, deadlines are reported unresolved and no message is invented', ours.every(id => blocked.unresolved.some(u => u.source_id === id)), true);
  await ok(admin.call('/api/v1/admin/notification-templates', { code: 'DPDP_OPERATIONS_ALERT', channel: 'IN_APP', recipient_scope: 'CUSTOMER_STAFF', subject: 'A DPDP operational deadline or failure needs attention.', body: 'An operational item recorded in ORVIA needs attention. Open the linked record for its facts.', purpose_note: 'Operational alert only.' }, key()), S.schemas.Template);
  await ok(owner.call('/api/v1/admin/organisation-profile', { sdf_status: 'NOT_DESIGNATED', sdf_designation_reference: null, dpo_contact: 'Privacy office (synthetic)', grievance_contact: 'Grievance desk (synthetic)', independent_auditor_reference: null, facts: { third_schedule_class: 'NONE' }, effective_from: new Date().toISOString(), reason: 'Contacts recorded for operational alerts.' }, key()), S.schemas.OrganisationProfile);
  const swept = await ok(admin.call('/api/v1/admin/operations/notification-sweep', {}, key()), S.schemas.NotificationSweep);
  const tasks = (await t.db.query(`SELECT source_id,source_due_at FROM app.notification_tasks WHERE source='DPDP_BREACH_TASK' AND source_id=ANY($1::uuid[])`, [ours])).rows;
  check('each open deadline raises one notification carrying its unchanged due time', [swept.created > 0, tasks.length, tasks.find(r => r.source_id === ours[0])?.source_due_at.toISOString()], [true, 2, due]);
  await ok(admin.call('/api/v1/admin/operations/notification-sweep', {}, key()), S.schemas.NotificationSweep);
  check('sweeping again raises nothing twice', Number((await t.db.query(`SELECT count(*) n FROM app.notification_tasks WHERE source_id=ANY($1::uuid[])`, [ours])).rows[0].n), 2);
});
