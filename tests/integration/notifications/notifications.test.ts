// WP11 / M10 Notification Engine integration suite.
// Under test: five delivery facts stay separate and ordered, a channel with no
// transport cannot be claimed as sent, and escalation never moves a deadline.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

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
const suffix = () => randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase();

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;

  // A real gap to notify about, derived from a real recorded row.
  const asset = S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets', {
    system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: `notify_${suffix()}`,
    description: 'Synthetic copy used to raise a real gap.', provenance: 'ASSERTED',
    valid_from: new Date().toISOString(), categories: [],
  }, key())).json());
  await staff.call('/api/v1/admin/gaps/derive', {}, key());
  const gap = (await db.query(`SELECT id FROM app.coverage_gaps WHERE subject_id=$1 AND source='NO_RETENTION_BASIS'`, [asset.id])).rows[0];
  check('a real gap exists to notify about', gap !== undefined, true);

  phase = 'templates';
  const inApp = S.Template.parse(await (await staff.call('/api/v1/admin/notification-templates', {
    code: `GAP_OVERDUE_${suffix()}`, channel: 'IN_APP', recipient_scope: 'CUSTOMER_STAFF',
    subject: 'A recorded gap has passed its deadline.',
    body: 'A gap assigned to you passed its agreed deadline. The deadline itself has not been changed.',
    purpose_note: 'Operational escalation only; never a marketing opportunity.',
  }, key())).json());
  check('a template records its version and content digest', [inApp.version, inApp.content_digest.length], [1, 64]);
  const sameCode = S.Template.parse(await (await staff.call('/api/v1/admin/notification-templates', {
    code: inApp.code, channel: 'IN_APP', recipient_scope: 'CUSTOMER_STAFF',
    subject: 'A recorded gap has passed its deadline.',
    body: 'Revised wording for the same operational notice.',
    purpose_note: 'Operational escalation only; never a marketing opportunity.',
  }, key())).json());
  check('re-issuing a template creates a new version rather than editing one', sameCode.version, 2);
  check('a template code must be a stable identifier',
    (await staff.call('/api/v1/admin/notification-templates', { code: 'lower case code', channel: 'IN_APP', recipient_scope: 'CUSTOMER_STAFF', subject: 'x', body: 'body text here', purpose_note: 'x' }, key())).status, 400);
  const email = S.Template.parse(await (await staff.call('/api/v1/admin/notification-templates', {
    code: `GAP_EMAIL_${suffix()}`, channel: 'EMAIL', recipient_scope: 'CUSTOMER_STAFF',
    subject: 'A recorded gap has passed its deadline.',
    body: 'A gap assigned to you passed its agreed deadline.',
    purpose_note: 'Operational escalation only.',
  }, key())).json());

  // --- FR-M10-01: a task points at something real ---------------------------
  phase = 'tasks';
  check('a task cannot be raised about a record that does not exist',
    (await staff.call('/api/v1/admin/notification-tasks', { template_id: inApp.id, source: 'COVERAGE_GAP', source_id: randomUUID(), recipient_reference: 'Records management', source_due_at: hoursAgo(2) }, key())).status, 404);
  const task = S.NotificationTask.parse(await (await staff.call('/api/v1/admin/notification-tasks', {
    template_id: inApp.id, source: 'COVERAGE_GAP', source_id: gap.id,
    recipient_reference: 'Records management', source_due_at: hoursAgo(2),
  }, key())).json());
  check('a new task is queued and nothing more', [task.queued, task.sent, task.delivered, task.failed, task.acknowledged], [true, false, false, false, false]);
  check('queueing needs no external evidence because ORVIA did it', task.deliveries[0]!.evidence_reference, null);
  check('a duplicate task for the same source and template is refused',
    (await staff.call('/api/v1/admin/notification-tasks', { template_id: inApp.id, source: 'COVERAGE_GAP', source_id: gap.id, recipient_reference: 'Records management', source_due_at: hoursAgo(2) }, key())).status, 409);

  // --- FR-M10-03: no transport is not a send -------------------------------
  phase = 'delivery facts';
  const record = (id: string, body: Record<string, unknown>) =>
    staff.call(`/api/v1/admin/notification-tasks/${id}/deliveries`, { evidence_reference: null, ...body }, key());
  check('nothing beyond queueing may be recorded without evidence',
    (await record(task.id, { fact: 'SENT', note: 'Sent it somehow.' })).status, 400);
  check('delivery cannot be claimed before anything was sent',
    (await record(task.id, { fact: 'DELIVERED', note: 'Arrived.', evidence_reference: 'Receipt.' })).status, 409);
  check('this deployment does not claim an in-app inbox it has not built', task.channel_available, false);
  check('in-app delivery cannot be claimed from a workspace list',
    (await record(task.id, { fact: 'SENT', note: 'Placed in the operator inbox.', evidence_reference: 'In-app message SYN-IA-0001.' })).status, 409);
  check('acknowledgement cannot be claimed before delivery',
    (await record(task.id, { fact: 'ACKNOWLEDGED', note: 'They read it.', evidence_reference: 'Read receipt.' })).status, 409);
  const afterRefusal = S.NotificationTask.parse(await (await staff.call(`/api/v1/admin/notification-tasks/${task.id}`)).json());
  check('the refused claims leave only the real queue fact', afterRefusal.deliveries.map(d => d.fact), ['QUEUED']);
  const rewrite = await db.query(`UPDATE app.notification_deliveries SET fact='ACKNOWLEDGED' WHERE task_id=$1 AND fact='QUEUED'`, [task.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the delivery log cannot be rewritten', rewrite, 'REJECTED');

  phase = 'failure is retained';
  const failing = S.NotificationTask.parse(await (await staff.call('/api/v1/admin/notification-tasks', {
    template_id: sameCode.id, source: 'COVERAGE_GAP', source_id: gap.id,
    recipient_reference: 'Head of records', source_due_at: hoursAgo(3),
  }, key())).json());
  const failed = S.NotificationTask.parse(await (await record(failing.id, { fact: 'FAILED', note: 'Recipient inbox unavailable.', evidence_reference: 'Failure SYN-IA-0010.' })).json());
  check('a recorded failure does not fabricate success', [failed.failed, failed.sent], [true, false]);
  check('attempts count the recorded failure', failed.attempts, 1);

  // --- FR-M10-02: a channel with no transport cannot be claimed as sent -----
  phase = 'unavailable channel';
  const emailTask = S.NotificationTask.parse(await (await staff.call('/api/v1/admin/notification-tasks', {
    template_id: email.id, source: 'COVERAGE_GAP', source_id: gap.id,
    recipient_reference: 'Records management', source_due_at: hoursAgo(4),
  }, key())).json());
  check('a channel this deployment cannot deliver on is declared unavailable', emailTask.channel_available, false);
  check('the queue note says the message will not be sent', emailTask.deliveries[0]!.note.includes('will not be sent'), true);
  check('a message cannot be claimed as sent on an unavailable channel',
    (await record(emailTask.id, { fact: 'SENT', note: 'Emailed it.', evidence_reference: 'Mail id SYN-EM-0001.' })).status, 409);

  // --- FR-M10-03: escalation never moves a deadline --------------------------
  phase = 'escalation';
  const beforeDue = (await db.query('SELECT source_due_at FROM app.notification_tasks WHERE id=$1', [emailTask.id])).rows[0].source_due_at.toISOString();
  const sweep = S.EscalationSweep.parse(await (await staff.call('/api/v1/admin/notification-tasks/escalate', {}, key())).json());
  check('the sweep asserts that no deadline changed', sweep.deadlines_changed, 0);
  check('the sweep escalated the overdue undelivered tasks', sweep.escalated > 0, true);
  check('the sweep states that a missed deadline stays missed', sweep.limits[0]!.includes('never moves the deadline'), true);
  const afterDue = (await db.query('SELECT source_due_at,escalated_at,escalation_reason FROM app.notification_tasks WHERE id=$1', [emailTask.id])).rows[0];
  check('the deadline is byte-for-byte unchanged after escalation', afterDue.source_due_at.toISOString(), beforeDue);
  check('the escalation states its reason', afterDue.escalation_reason.includes('deadline is unchanged'), true);
  check('an in-app task that could not be delivered is escalated',
    (await db.query('SELECT escalated_at FROM app.notification_tasks WHERE id=$1', [task.id])).rows[0].escalated_at !== null, true);
  const second = S.EscalationSweep.parse(await (await staff.call('/api/v1/admin/notification-tasks/escalate', {}, key())).json());
  check('a second sweep does not manufacture new escalations', second.escalated, 0);
  const moveDeadline = await db.query('UPDATE app.notification_tasks SET source_due_at=now() WHERE id=$1', [emailTask.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database itself refuses to move a source deadline', moveDeadline, 'REJECTED');

  // --- authority ---------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read notification tasks', (await auditor.call('/api/v1/admin/notification-tasks')).status, 200);
  check('an auditor cannot record a delivery',
    (await auditor.call(`/api/v1/admin/notification-tasks/${task.id}/deliveries`, { fact: 'SENT', note: 'Auditor attempt.', evidence_reference: 'x' }, key())).status, 403);
  const member = await h.login('member');
  check('a member without the notification capability is refused', (await member.call('/api/v1/admin/notification-tasks')).status, 403);

  writeEvidence('notifications-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('notifications-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
