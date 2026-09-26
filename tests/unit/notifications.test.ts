// WP11 / M10 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { DeliveryRecord, EscalationSweep, NotificationTask, TemplateCreate, routes, schemas } from '../../shared/contracts/src/index.ts';
import { uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const task = {
  id: uuid(800), template_id: uuid(801), template_code: 'GAP_OVERDUE_NOTICE', channel: 'IN_APP' as const,
  recipient_scope: 'CUSTOMER_STAFF' as const, recipient_reference: 'Records management',
  source: 'COVERAGE_GAP' as const, source_id: uuid(802), source_due_at: sampleTime, created_at: sampleTime,
  queued: true, sent: false, delivered: false, failed: false, acknowledged: false, attempts: 0,
  channel_available: true, escalated_at: null, escalation_reason: null, deliveries: [],
};

test('the five delivery facts keep their real order', () => {
  assert.equal(NotificationTask.parse(task).queued, true);
  // Claiming a later fact without the earlier one is how "we notified them"
  // comes to mean nothing.
  assert.throws(() => NotificationTask.parse({ ...task, sent: true, queued: false }));
  assert.throws(() => NotificationTask.parse({ ...task, delivered: true }));
  assert.throws(() => NotificationTask.parse({ ...task, sent: true, acknowledged: true }));
  assert.equal(NotificationTask.parse({ ...task, sent: true, delivered: true, acknowledged: true }).acknowledged, true);
});

test('a failure and a later success are both true at once', () => {
  // They are independent booleans, not a status that advances, so a retry never
  // erases the record of what failed first.
  const retried = NotificationTask.parse({ ...task, sent: true, failed: true, attempts: 2 });
  assert.deepEqual([retried.failed, retried.sent, retried.attempts], [true, true, 2]);
});

test('nothing beyond queueing may be claimed without evidence', () => {
  assert.equal(DeliveryRecord.parse({ fact: 'QUEUED', evidence_reference: null, note: 'Queued locally.' }).fact, 'QUEUED');
  for (const fact of ['SENT', 'DELIVERED', 'FAILED', 'ACKNOWLEDGED']) {
    assert.throws(() => DeliveryRecord.parse({ fact, evidence_reference: null, note: 'Happened somehow.' }),
      new RegExp('.'), `${fact} was accepted without evidence`);
    assert.equal(DeliveryRecord.parse({ fact, evidence_reference: 'Receipt.', note: 'Recorded.' }).fact, fact);
  }
});

test('current transport loss does not erase a previously recorded send', () => {
  assert.equal(NotificationTask.parse({ ...task, channel_available: false }).channel_available, false);
  // The server prevents new sends while unavailable. Old claims remain visible.
  assert.equal(NotificationTask.parse({ ...task, channel_available: false, sent: true }).sent, true);
});

test('an escalation states its reason and never stands half-recorded', () => {
  assert.throws(() => NotificationTask.parse({ ...task, escalated_at: sampleTime }));
  assert.throws(() => NotificationTask.parse({ ...task, escalation_reason: 'Overdue.' }));
  assert.equal(NotificationTask.parse({ ...task, escalated_at: sampleTime, escalation_reason: 'Deadline passed; the deadline is unchanged.' }).escalated_at, sampleTime);
});

test('a sweep can only ever report that no deadline changed', () => {
  const sweep = { swept_at: sampleTime, examined: 5, escalated: 2, deadlines_changed: 0 as const, limits: ['Escalation never moves a deadline.'] };
  assert.equal(EscalationSweep.parse(sweep).deadlines_changed, 0);
  // The field is a literal zero, so the shape itself cannot express a sweep that
  // moved a deadline. This is the guarantee, not a convention.
  assert.throws(() => EscalationSweep.parse({ ...sweep, deadlines_changed: 1 }));
});

test('a template code is a stable identifier, not free text', () => {
  const template = { code: 'GAP_OVERDUE_NOTICE', channel: 'IN_APP' as const, recipient_scope: 'CUSTOMER_STAFF' as const,
    subject: 'A recorded gap has passed its deadline.', body: 'A gap assigned to you passed its agreed deadline.',
    purpose_note: 'Operational escalation only.' };
  assert.equal(TemplateCreate.parse(template).code, 'GAP_OVERDUE_NOTICE');
  for (const code of ['lower case', 'has spaces', '1_STARTS_WITH_DIGIT', 'AB', 'HAS-HYPHEN']) {
    assert.throws(() => TemplateCreate.parse({ ...template, code }), new RegExp('.'), `${code} was accepted`);
  }
  // Every template states why it is sent at all, so an operational channel does
  // not quietly become a marketing one.
  assert.throws(() => TemplateCreate.parse({ ...template, purpose_note: '' }));
});

test('notification routes are staff-only, idempotent on write and fully typed', () => {
  const notificationRoutes = routes.filter(route => route.capability?.startsWith('notification.'));
  // Includes the customer-local DPDP notification sweep, and the eleven EX09
  // transport, alert-routing and outbound-message routes. Enabling a transport
  // and revealing its signing key are connection.enable, not notification.*.
  assert.equal(notificationRoutes.length, 19);
  assert.deepEqual(routes.filter(r => ['enable_delivery_transport', 'reveal_transport_signing_secret'].includes(r.id)).map(r => r.capability), ['connection.enable', 'connection.enable']);
  for (const route of notificationRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // No endpoint transmits anything. Reviewed messages are sent by the operations
  // runner through transports a second person enabled.
  assert.ok(!notificationRoutes.some(route => route.id.includes('send') || route.id.includes('dispatch')));
});
