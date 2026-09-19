// WP17 / M17 Privacy Incident Explorer integration suite.
// Under test: three clocks stay separate, deadlines come only from activated
// customer rules, corrections append and name every deadline they moved, and
// ORVIA never claims to have dispatched anything.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import * as S from '../../../packages/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/rehearsal permitted');
const db = connectDatabase(profile).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let phase = 'setup';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, { expected, actual }); throw new Error('Assertion failed: ' + name); }
}
const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
const login = h.login.bind(h);
h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
const key = () => ({ 'idempotency-key': randomUUID() });
const hoursAgo = (n: number) => new Date(Date.now() - n * 3_600_000).toISOString();

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: incident.write, no incident.approve
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also incident.approve

  // --- FR-M17-03: deadlines come from activated customer rules ---------------
  phase = 'rule packs';
  check('recording an obligation rule requires approval authority',
    (await staff.call('/api/v1/admin/obligation-rules', { recipient: 'Supervisory authority', regime_reference: 'Reviewed notification duty.', runs_from: 'BECAME_AWARE_AT', hours: 72, minimum_severity: 'MEDIUM', applies_when_scope_uncertain: true }, key())).status, 403);
  const regulator = S.ObligationRule.parse(await (await owner.call('/api/v1/admin/obligation-rules', {
    recipient: 'Supervisory authority', regime_reference: 'Reviewed notification duty, reference SYN-REG-01.',
    runs_from: 'BECAME_AWARE_AT', hours: 72, minimum_severity: 'MEDIUM', applies_when_scope_uncertain: true,
  }, key())).json());
  check('a rule names its own source and the clock it runs from', [regulator.runs_from, regulator.hours, regulator.regime_reference.length > 10], ['BECAME_AWARE_AT', 72, true]);
  const principals = S.ObligationRule.parse(await (await owner.call('/api/v1/admin/obligation-rules', {
    recipient: 'Affected data principals', regime_reference: 'Reviewed principal notification duty, reference SYN-REG-02.',
    runs_from: 'DETECTED_AT', hours: 168, minimum_severity: 'HIGH', applies_when_scope_uncertain: false,
  }, key())).json());
  check('a second rule can run from a different clock entirely', principals.runs_from, 'DETECTED_AT');

  // --- FR-M17-01: three separate moments --------------------------------------
  phase = 'incident intake';
  const incident = S.Incident.parse(await (await staff.call('/api/v1/admin/incidents', {
    summary: 'Marketing export shared with an unintended recipient.',
    occurred_at: hoursAgo(50), detected_at: hoursAgo(10), became_aware_at: null,
    occurrence_basis: 'Established from the export audit log.',
    severity: 'HIGH', severity_basis: 'Configured policy: personal data left the boundary.',
    affected_system_ids: [scenario.system.id], affected_purpose_ids: [scenario.purpose.id], affected_processor_ids: [],
    principal_scope: 'Not yet established which principals were in the export.', principal_scope_certain: false,
  }, key())).json());
  check('occurrence, detection and awareness are three separate fields', [incident.occurred_at !== null, incident.detected_at !== null, incident.became_aware_at], [true, true, null]);
  check('an unknown awareness time is kept as unknown, not filled in from detection', incident.became_aware_at, null);
  check('an incident cannot be detected before it occurred',
    (await staff.call('/api/v1/admin/incidents', { summary: 'Impossible ordering incident.', occurred_at: hoursAgo(1), detected_at: hoursAgo(5), became_aware_at: null, occurrence_basis: 'x', severity: 'LOW', severity_basis: 'x', affected_system_ids: [], affected_purpose_ids: [], affected_processor_ids: [], principal_scope: 'x', principal_scope_certain: false }, key())).status, 400);
  check('awareness cannot precede detection',
    (await staff.call('/api/v1/admin/incidents', { summary: 'Aware before detecting incident.', occurred_at: null, detected_at: hoursAgo(5), became_aware_at: hoursAgo(9), occurrence_basis: 'x', severity: 'LOW', severity_basis: 'x', affected_system_ids: [], affected_purpose_ids: [], affected_processor_ids: [], principal_scope: 'x', principal_scope_certain: false }, key())).status, 400);

  // --- FR-M17-03: obligations per recipient, each on its own clock ------------
  phase = 'obligations';
  const assessment = S.IncidentAssessment.parse(await (await staff.call(`/api/v1/admin/incidents/${incident.id}/assessment`)).json());
  // Rules persist across runs of this suite, so assert on the two this run
  // created rather than on a global total.
  check('exactly one obligation exists for each rule this run activated',
    [regulator.id, principals.id].map(rule => assessment.obligations.filter(o => o.rule_id === rule).length), [1, 1]);
  check('every obligation names the recipient and regime its rule came from',
    assessment.obligations.every(o => o.recipient.length > 0 && o.regime_reference.length > 0), true);
  const regulatorTask = assessment.obligations.find(o => o.rule_id === regulator.id)!;
  const principalTask = assessment.obligations.find(o => o.rule_id === principals.id)!;
  // The regulator rule runs from awareness, which is not yet established.
  check('a duty whose clock has not started has no deadline', [regulatorTask.clock_started_at, regulatorTask.due_at], [null, null]);
  check('a duty with no deadline is not overdue', regulatorTask.overdue, false);
  // The principal rule runs from detection, which is known, but does not apply
  // while the affected scope is uncertain.
  check('a rule that does not apply while scope is uncertain says so explicitly', principalTask.state, 'NOT_APPLICABLE');
  check('the assessment states that ORVIA ships no notification periods', assessment.limits.some(l => l.includes('ships no notification periods')), true);
  check('the assessment states severity is configured policy, not a legal determination', assessment.limits.some(l => l.includes('not a determination of what any law requires')), true);

  // --- FR-M17-01: corrections append and name what moved ----------------------
  phase = 'corrections';
  const corrected = S.IncidentAssessment.parse(await (await staff.call(`/api/v1/admin/incidents/${incident.id}/corrections`, {
    field: 'BECAME_AWARE_AT', new_value: hoursAgo(8),
    reason: 'Awareness established at the point the incident review board was convened.',
    reviewer_reference: 'Incident review board',
  }, key())).json());
  check('a correction is recorded with its previous value', corrected.corrections[0]!.previous_value, null);
  check('a correction names its reviewer and reason', [corrected.corrections[0]!.reviewer_reference, corrected.corrections[0]!.reason.length > 10], ['Incident review board', true]);
  const startedTask = corrected.obligations.find(o => o.rule_id === regulator.id)!;
  check('establishing awareness starts the clock that runs from it', startedTask.clock_started_at !== null, true);
  check('the deadline is the rule hours after its own clock', startedTask.due_at, new Date(Date.parse(startedTask.clock_started_at!) + 72 * 3_600_000).toISOString());
  check('the correction names the deadline it moved', corrected.corrections[0]!.affected_deadlines.includes(startedTask.id), true);
  check('a correction that would break the orderings is refused',
    (await staff.call(`/api/v1/admin/incidents/${incident.id}/corrections`, { field: 'BECAME_AWARE_AT', new_value: hoursAgo(50), reason: 'Attempting to move awareness before detection.', reviewer_reference: 'Board' }, key())).status, 400);
  const rewriteCorrection = await db.query(`UPDATE app.incident_corrections SET reason='Rewritten' WHERE incident_id=$1`, [incident.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('corrections cannot be rewritten', rewriteCorrection, 'REJECTED');
  const rewriteDetection = await db.query('UPDATE app.incidents SET detected_at=now() WHERE id=$1', [incident.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('a detection time is never rewritten in place', rewriteDetection, 'REJECTED');

  phase = 'scope correction';
  const scoped = S.IncidentAssessment.parse(await (await staff.call(`/api/v1/admin/incidents/${incident.id}/corrections`, {
    field: 'PRINCIPAL_SCOPE', new_value: 'Established: 412 principals in the export.',
    reason: 'Scope established from the export manifest.', reviewer_reference: 'Incident review board',
  }, key())).json());
  check('a scope correction is appended alongside the first', scoped.corrections.length, 2);

  // --- FR-M17-04: dispatch, manual packages and overdue -----------------------
  phase = 'notification lifecycle';
  const move = (id: string, body: Record<string, unknown>) =>
    staff.call(`/api/v1/admin/notification-obligations/${id}/transition`, { dispatch_evidence: null, unavailable_reason: null, ...body }, key());
  check('a notification cannot jump straight to dispatched', (await move(startedTask.id, { to: 'DISPATCHED', note: 'Skipping review and approval.', dispatch_evidence: 'Receipt.' })).status, 409);
  await move(startedTask.id, { to: 'DRAFTED', note: 'Draft prepared for the supervisory authority.' });
  await move(startedTask.id, { to: 'APPROVED', note: 'Approved by the incident review board.' });
  check('dispatch without evidence is refused', (await move(startedTask.id, { to: 'DISPATCHED', note: 'Sent it somehow.' })).status, 400);
  const dispatched = S.NotificationObligation.parse(await (await move(startedTask.id, { to: 'DISPATCHED', note: 'Submitted through the authority portal.', dispatch_evidence: 'Submission receipt SYN-SUB-0001.' })).json());
  check('a dispatch names its evidence', [dispatched.state, dispatched.dispatch_evidence !== null], ['DISPATCHED', true]);
  check('a dispatched notification cannot be walked back', (await move(startedTask.id, { to: 'DRAFTED', note: 'Trying to unsend it.' })).status, 409);
  const unsend = await db.query(`UPDATE app.notification_obligations SET state='DRAFTED' WHERE id=$1`, [startedTask.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to withdraw a dispatched notification', unsend, 'REJECTED');

  phase = 'manual package';
  const manualIncident = S.Incident.parse(await (await staff.call('/api/v1/admin/incidents', {
    summary: 'Second synthetic incident requiring a manual submission package.',
    occurred_at: null, detected_at: hoursAgo(200), became_aware_at: hoursAgo(200),
    occurrence_basis: 'Occurrence time never established.',
    severity: 'SEVERE', severity_basis: 'Configured policy: severe category.',
    affected_system_ids: [], affected_purpose_ids: [], affected_processor_ids: [],
    principal_scope: 'All principals in the affected export.', principal_scope_certain: true,
  }, key())).json());
  check('an unknown occurrence time is recorded as unknown', manualIncident.occurred_at, null);
  const manualAssessment = S.IncidentAssessment.parse(await (await staff.call(`/api/v1/admin/incidents/${manualIncident.id}/assessment`)).json());
  const overdueTask = manualAssessment.obligations.find(o => o.rule_id === regulator.id)!;
  check('a duty past its deadline is reported overdue', overdueTask.overdue, true);
  check('a certain scope activates the rule that requires it', manualAssessment.obligations.find(o => o.rule_id === principals.id)!.state, 'PENDING_REVIEW');
  check('a manual package must say why no supported channel exists',
    (await move(overdueTask.id, { to: 'MANUAL_PACKAGE_REQUIRED', note: 'No channel.' })).status, 400);
  const manual = S.NotificationObligation.parse(await (await move(overdueTask.id, {
    to: 'MANUAL_PACKAGE_REQUIRED', note: 'No supported filing channel exists for this authority.',
    unavailable_reason: 'This authority accepts only postal submissions; ORVIA has no supported channel.',
  })).json());
  check('a manual package records why', [manual.state, manual.unavailable_reason !== null], ['MANUAL_PACKAGE_REQUIRED', true]);

  // --- closure ----------------------------------------------------------------
  phase = 'closure';
  check('containment is recorded before closure', S.Incident.parse(await (await staff.call(`/api/v1/admin/incidents/${incident.id}/containment`, { note: 'Export access revoked and the recipient confirmed deletion.' }, key())).json()).state, 'CONTAINED');
  check('closing an incident needs approval authority',
    (await staff.call(`/api/v1/admin/incidents/${incident.id}/closure`, { note: 'Attempting to close without approval authority.' }, key())).status, 403);
  const stillOwed = await owner.call(`/api/v1/admin/incidents/${manualIncident.id}/closure`, { note: 'Closing while a notification is still owed.' }, key());
  check('an incident cannot be closed while a notification is still owed', stillOwed.status, 409);
  // Rules persist across runs of this suite, so this incident may carry
  // obligations from rules earlier runs activated. Every one of them genuinely
  // blocks closure, which is the behaviour under test; resolve them all first.
  const beforeClosure = S.IncidentAssessment.parse(await (await staff.call(`/api/v1/admin/incidents/${incident.id}/assessment`)).json());
  for (const outstanding of beforeClosure.obligations.filter(o => ['PENDING_REVIEW', 'DRAFTED', 'APPROVED'].includes(o.state))) {
    await move(outstanding.id, { to: 'NOT_APPLICABLE', note: 'Reviewed and found not applicable to this incident.' });
  }
  const closed = S.Incident.parse(await (await owner.call(`/api/v1/admin/incidents/${incident.id}/closure`, { note: 'All notifications dispatched and containment confirmed.' }, key())).json());
  check('a closed incident records when and why', [closed.state, closed.closed_at !== null, closed.closure_note !== null], ['CLOSED', true, true]);
  check('a closed incident cannot be corrected',
    (await staff.call(`/api/v1/admin/incidents/${incident.id}/corrections`, { field: 'SEVERITY', new_value: 'LOW', reason: 'Attempting to downgrade after closure.', reviewer_reference: 'Board' }, key())).status, 409);
  const reopen = await db.query(`UPDATE app.incidents SET state='OPEN' WHERE id=$1`, [incident.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to reopen a closed incident', reopen, 'REJECTED');

  // --- authority ----------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read incidents', (await auditor.call('/api/v1/admin/incidents')).status, 200);
  check('an auditor cannot record an incident',
    (await auditor.call('/api/v1/admin/incidents', { summary: 'Auditor attempt at recording an incident.', occurred_at: null, detected_at: hoursAgo(1), became_aware_at: null, occurrence_basis: 'x', severity: 'LOW', severity_basis: 'x', affected_system_ids: [], affected_purpose_ids: [], affected_processor_ids: [], principal_scope: 'x', principal_scope_certain: false }, key())).status, 403);
  const member = await h.login('member');
  check('a member without the incident capability is refused', (await member.call('/api/v1/admin/incidents')).status, 403);

  writeEvidence('incidents-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('incidents-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
