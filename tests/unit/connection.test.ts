// M29 Customer Onboarding contract invariants (FR-M29-03). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { ConnectionStart, ConnectionStep, ConnectionStepState, EnablementStage, GuidedConnection, routes, schemas } from '../../packages/contracts/src/index.ts';
import { example, uuid } from '../../packages/contracts/src/examples.ts';

const connection = () => structuredClone(example('GuidedConnection')) as Record<string, unknown>;
const steps = () => connection().steps as Record<string, unknown>[];

test('the nine steps are reported once each, in order, and the current one is the first unfinished', () => {
  const parsed = GuidedConnection.parse(connection());
  assert.equal(parsed.steps.length, 9);
  assert.deepEqual(parsed.steps.map(s => s.step), [...ConnectionStep.options]);
  assert.deepEqual(parsed.steps.map(s => s.position), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(parsed.current_step, 'SELECT_RESOURCES');
  // The current step cannot be named independently of the step states, so a
  // connection cannot report progress it has not made.
  assert.throws(() => GuidedConnection.parse({ ...connection(), current_step: 'ENABLE_PROGRESSIVELY' }));
  assert.throws(() => GuidedConnection.parse({ ...connection(), steps: steps().slice(0, 8) }));
  assert.throws(() => GuidedConnection.parse({ ...connection(), steps: Array.from({ length: 9 }, () => steps()[0]) }));
});

test('a step is done exactly when nothing about it is outstanding', () => {
  const done = { step: 'SELECT_SYSTEM' as const, position: 1, done: true, measured_from: 'The connection names a configured system.', outstanding: [] };
  assert.equal(ConnectionStepState.parse(done).done, true);
  // The two failures this shape exists to prevent: a step that claims to be
  // finished while naming work left, and one that hides finished work.
  assert.throws(() => ConnectionStepState.parse({ ...done, outstanding: ['Still to do.'] }));
  assert.throws(() => ConnectionStepState.parse({ ...done, done: false }));
  // Every step says what its answer was measured from, whichever way it went.
  for (const step of GuidedConnection.parse(connection()).steps) {
    assert.ok(step.measured_from.length > 20, `${step.step} does not say what it was measured from`);
  }
});

test('connecting is never reported as permission to change anything', () => {
  const parsed = GuidedConnection.parse(connection());
  assert.equal(parsed.connection_is_not_permission_to_mutate, true);
  assert.throws(() => GuidedConnection.parse({ ...connection(), connection_is_not_permission_to_mutate: false }));
  // What was asked for and what was observed are separate fields, and there is
  // no field through which a connection could grant itself anything.
  assert.deepEqual([parsed.requested_capabilities, parsed.observed_restrict], [['DISCOVER', 'READ'], false]);
  for (const smuggled of [{ can_mutate: true }, { approved_for_enforcement: true }, { write_granted: true }, { safe_to_mutate: true }]) {
    assert.throws(() => GuidedConnection.parse({ ...connection(), ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a connection`);
  }
});

test('a connection cannot be started with a right to change the connected system', () => {
  const start = { system_id: uuid(740), environment_kind: 'TEST' as const, requested_capabilities: ['DISCOVER' as const, 'READ' as const] };
  assert.deepEqual(ConnectionStart.parse(start).requested_capabilities, ['DISCOVER', 'READ']);
  // The closed vocabulary is the enforcement: there is no value here meaning
  // update or delete, so step 2's check cannot be failed by asking nicely.
  for (const asked of ['WRITE', 'UPDATE', 'DELETE', 'RESTRICT', 'ADMIN']) {
    assert.throws(() => ConnectionStart.parse({ ...start, requested_capabilities: [asked] }), new RegExp('.'), `${asked} was accepted as a connection capability`);
  }
  assert.throws(() => ConnectionStart.parse({ ...start, requested_capabilities: [] }));
  assert.throws(() => ConnectionStart.parse({ ...start, requested_capabilities: ['READ', 'READ'] }));
  // Production scope is stated, never inferred from an omission.
  assert.throws(() => ConnectionStart.parse({ system_id: start.system_id, requested_capabilities: ['READ'] }));
});

test('enforcement is not expressible without an observation that the system can restrict', () => {
  assert.deepEqual([...EnablementStage.options], ['OBSERVE', 'COORDINATE', 'ENFORCE']);
  const enforcing = { ...connection(), enablement_stage: 'ENFORCE', observed_restrict: false };
  assert.throws(() => GuidedConnection.parse(enforcing));
  assert.equal(GuidedConnection.parse({ ...connection(), enablement_stage: 'COORDINATE' }).enablement_stage, 'COORDINATE');
  // An unchecked system reports both observations as unknown, never as denied.
  // "We have not looked" and "we looked and it cannot" are different facts.
  const unchecked = GuidedConnection.parse({ ...connection(), observed_read: null, observed_restrict: null });
  assert.deepEqual([unchecked.observed_read, unchecked.observed_restrict], [null, null]);
  assert.throws(() => GuidedConnection.parse({ ...connection(), observed_read: null }));
});

test('enabling a connection is a different authority from configuring one', () => {
  const guided = routes.filter(route => route.path.startsWith('/api/v1/admin/connections'));
  assert.deepEqual(guided.map(route => route.id).sort(),
    ['approve_resources', 'change_enablement', 'connection', 'list_connections', 'record_connectivity', 'record_scoped_identity', 'start_connection']);
  assert.deepEqual(guided.filter(route => route.capability === 'connection.enable').map(route => route.id), ['change_enablement']);
  for (const route of guided) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // There is no route that connects and enables in one act.
  assert.ok(!routes.some(route => /connect_and|auto_enable|quick_connect/.test(route.id)));
});
