// WP17 / M17 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Incident, IncidentCreate, NotificationObligation, NotificationTransition, ObligationRuleCreate, routes, schemas } from '../../shared/contracts/src/index.ts';
import { uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const t = (hours: number) => new Date(Date.parse(sampleTime) + hours * 3_600_000).toISOString();
const create = {
  summary: 'Marketing export shared with an unintended recipient.',
  occurred_at: t(0), detected_at: t(5), became_aware_at: t(8),
  occurrence_basis: 'Established from the export audit log.',
  severity: 'HIGH' as const, severity_basis: 'Configured policy.',
  affected_system_ids: [], affected_purpose_ids: [], affected_processor_ids: [],
  principal_scope: 'Not yet established.', principal_scope_certain: false,
};
const incident = { ...create, id: uuid(700), state: 'OPEN' as const, recorded_at: sampleTime, recorded_by: uuid(701),
  contained_at: null, closed_at: null, closure_note: null };

test('occurrence, detection and awareness keep their real order', () => {
  assert.equal(IncidentCreate.parse(create).severity, 'HIGH');
  // Detection before occurrence, and awareness before detection, are impossible.
  assert.throws(() => IncidentCreate.parse({ ...create, occurred_at: t(9) }));
  assert.throws(() => IncidentCreate.parse({ ...create, became_aware_at: t(1) }));
  assert.throws(() => Incident.parse({ ...incident, occurred_at: t(9) }));
  assert.throws(() => Incident.parse({ ...incident, became_aware_at: t(1) }));
});

test('an unknown moment stays unknown and is never filled in from another', () => {
  // Both nullable fields accept null; only detection is required, because it is
  // the one moment the organisation always has.
  assert.equal(IncidentCreate.parse({ ...create, occurred_at: null }).occurred_at, null);
  assert.equal(IncidentCreate.parse({ ...create, became_aware_at: null }).became_aware_at, null);
  assert.throws(() => IncidentCreate.parse({ ...create, detected_at: null }));
  // Awareness equal to detection is allowed, but it must be stated, not assumed.
  assert.equal(IncidentCreate.parse({ ...create, became_aware_at: create.detected_at }).became_aware_at, create.detected_at);
});

test('a rule carries its own source, clock and duration rather than a built-in period', () => {
  const rule = { recipient: 'Supervisory authority', regime_reference: 'Reviewed duty SYN-REG-01.',
    runs_from: 'BECAME_AWARE_AT' as const, hours: 72, minimum_severity: 'MEDIUM' as const, applies_when_scope_uncertain: true };
  assert.equal(ObligationRuleCreate.parse(rule).hours, 72);
  // Every clock a duty can run from is one of the three recorded moments.
  for (const runs_from of ['OCCURRED_AT', 'DETECTED_AT', 'BECAME_AWARE_AT']) {
    assert.equal(ObligationRuleCreate.parse({ ...rule, runs_from }).runs_from, runs_from);
  }
  assert.throws(() => ObligationRuleCreate.parse({ ...rule, runs_from: 'REPORTED_AT' }));
  // A duration of zero or beyond a year is not a reviewed period.
  assert.throws(() => ObligationRuleCreate.parse({ ...rule, hours: 0 }));
  assert.throws(() => ObligationRuleCreate.parse({ ...rule, hours: 10000 }));
});

test('a deadline exists exactly when its clock has started', () => {
  const obligation = { id: uuid(710), incident_id: uuid(700), rule_id: uuid(711), recipient: 'Authority',
    regime_reference: 'Duty.', state: 'PENDING_REVIEW' as const, runs_from: 'BECAME_AWARE_AT' as const,
    clock_started_at: null, due_at: null, overdue: false, dispatch_evidence: null, unavailable_reason: null };
  assert.equal(NotificationObligation.parse(obligation).due_at, null);
  // A deadline with no clock is a number somebody invented.
  assert.throws(() => NotificationObligation.parse({ ...obligation, due_at: t(80) }));
  assert.throws(() => NotificationObligation.parse({ ...obligation, clock_started_at: t(8) }));
  // Nothing can be overdue without a deadline to be late against.
  assert.throws(() => NotificationObligation.parse({ ...obligation, overdue: true }));
  assert.equal(NotificationObligation.parse({ ...obligation, clock_started_at: t(8), due_at: t(80), overdue: true }).overdue, true);
});

test('a dispatch names its evidence and a manual package names its reason', () => {
  const obligation = { id: uuid(710), incident_id: uuid(700), rule_id: uuid(711), recipient: 'Authority',
    regime_reference: 'Duty.', runs_from: 'DETECTED_AT' as const, clock_started_at: t(5), due_at: t(80),
    overdue: false, dispatch_evidence: null, unavailable_reason: null };
  // ORVIA sends nothing, so a dispatch is a recorded claim and must be evidenced.
  assert.throws(() => NotificationObligation.parse({ ...obligation, state: 'DISPATCHED' }));
  assert.equal(NotificationObligation.parse({ ...obligation, state: 'DISPATCHED', dispatch_evidence: 'Receipt.' }).state, 'DISPATCHED');
  assert.throws(() => NotificationObligation.parse({ ...obligation, state: 'MANUAL_PACKAGE_REQUIRED' }));
  assert.equal(NotificationObligation.parse({ ...obligation, state: 'MANUAL_PACKAGE_REQUIRED', unavailable_reason: 'Postal only.' }).state, 'MANUAL_PACKAGE_REQUIRED');
  assert.throws(() => NotificationTransition.parse({ to: 'DISPATCHED', note: 'Sent it somehow.', dispatch_evidence: null, unavailable_reason: null }));
  assert.throws(() => NotificationTransition.parse({ to: 'MANUAL_PACKAGE_REQUIRED', note: 'No channel exists.', dispatch_evidence: null, unavailable_reason: null }));
});

test('closure and containment are recorded states, not implied ones', () => {
  assert.throws(() => Incident.parse({ ...incident, state: 'CLOSED' }));
  assert.throws(() => Incident.parse({ ...incident, closed_at: sampleTime }));
  assert.equal(Incident.parse({ ...incident, state: 'CLOSED', closed_at: sampleTime, closure_note: 'Resolved.' }).state, 'CLOSED');
  // An open incident has not been contained, whatever else is recorded.
  assert.throws(() => Incident.parse({ ...incident, contained_at: sampleTime }));
  assert.equal(Incident.parse({ ...incident, state: 'CONTAINED', contained_at: sampleTime }).state, 'CONTAINED');
});

test('activating a rule pack and closing an incident are approval acts', () => {
  const incidentRoutes = routes.filter(route => route.capability?.startsWith('incident.'));
  // Includes the five DPDP personal-data breach routes.
  assert.equal(incidentRoutes.length, 14);
  const approve = incidentRoutes.filter(route => route.capability === 'incident.approve').map(route => route.id).sort();
  assert.deepEqual(approve, ['close_incident', 'create_obligation_rule']);
  for (const route of incidentRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // There is no endpoint that sends a notification: ORVIA records, it does not dispatch.
  assert.ok(!incidentRoutes.some(route => route.id.includes('send') || route.id.includes('dispatch')));
});
