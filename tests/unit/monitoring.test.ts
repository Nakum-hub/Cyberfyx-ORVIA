// M32 Monitoring contract invariants (FR-M32-01, FR-M32-02). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { OperationalReadiness, ReadinessFact, OperationalSignal, OperationalSignalName, routes, schemas } from '../../packages/contracts/src/index.ts';
import { example, sampleTime } from '../../packages/contracts/src/examples.ts';

const report = () => structuredClone(example('OperationalReadiness')) as Record<string, unknown>;
const facts = () => report().facts as Record<string, unknown>[];
const signals = () => report().signals as Record<string, unknown>[];

test('an installation reports three readiness facts and never a combined one', () => {
  const parsed = OperationalReadiness.parse(report());
  assert.deepEqual(parsed.facts.map(f => f.kind), ['LIVENESS', 'DEPENDENCY_READINESS', 'BUSINESS_READINESS']);
  // The failure this module exists to prevent, stated as a schema fact: a live
  // process with reachable dependencies that can carry out no decision at all
  // must remain expressible, and it is.
  assert.deepEqual(parsed.facts.map(f => f.verdict), ['READY', 'READY', 'NOT_READY']);
  assert.equal(parsed.combined_status_is_not_reported, true);
  assert.equal(parsed.uptime_is_not_evidence_of_correct_operation, true);
  // There is no field that reduces the three to one, and none can be added by a caller.
  for (const smuggled of [{ status: 'healthy' }, { overall: 'READY' }, { up: true }, { healthy: true }]) {
    assert.throws(() => OperationalReadiness.parse({ ...report(), ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a readiness report`);
  }
  // And the two structural statements cannot be flipped.
  assert.throws(() => OperationalReadiness.parse({ ...report(), combined_status_is_not_reported: false }));
  assert.throws(() => OperationalReadiness.parse({ ...report(), uptime_is_not_evidence_of_correct_operation: false }));
});

test('each readiness kind is reported exactly once', () => {
  const [liveness] = facts();
  assert.throws(() => OperationalReadiness.parse({ ...report(), facts: [liveness, liveness, liveness] }));
  assert.throws(() => OperationalReadiness.parse({ ...report(), facts: facts().slice(0, 2) }));
});

test('a readiness verdict is not ready exactly when something is blocking it', () => {
  const ready = { kind: 'LIVENESS' as const, verdict: 'READY' as const, covers: 'The process answered.', blocking: [] };
  assert.equal(ReadinessFact.parse(ready).verdict, 'READY');
  // Refusing without a reason, and refusing to name a reason while refusing,
  // are the same omission in two directions.
  assert.throws(() => ReadinessFact.parse({ ...ready, verdict: 'NOT_READY' }));
  assert.throws(() => ReadinessFact.parse({ ...ready, blocking: ['Something is wrong.'] }));
  // A verdict that cannot be established says so rather than guessing either way.
  assert.equal(ReadinessFact.parse({ ...ready, verdict: 'NOT_ASSESSABLE' }).verdict, 'NOT_ASSESSABLE');
});

test('an unmeasured signal is never a signal at zero', () => {
  const base = { signal: 'QUEUE_DEPTH' as const, measured: true, value: 0, unit: 'RECORDS' as const, counted: 'Accepted events not yet dispatched.', unavailable_reason: null };
  assert.equal(OperationalSignal.parse(base).value, 0);
  // Claiming a measurement without one, and reporting a value while saying it
  // could not be measured, are both refused.
  assert.throws(() => OperationalSignal.parse({ ...base, measured: false }));
  assert.throws(() => OperationalSignal.parse({ ...base, measured: false, value: null, unit: null }));
  assert.throws(() => OperationalSignal.parse({ ...base, unavailable_reason: 'Not measured.' }));
  assert.throws(() => OperationalSignal.parse({ ...base, value: null }));
  assert.throws(() => OperationalSignal.parse({ ...base, unit: null }));
  const absent = { ...base, measured: false, value: null, unit: null, unavailable_reason: 'There is no backup capability in this build.' };
  assert.equal(OperationalSignal.parse(absent).value, null);
});

test('every signal names what it counted, measured or not', () => {
  const parsed = OperationalReadiness.parse(report());
  assert.equal(parsed.signals.length, 7);
  assert.deepEqual(parsed.signals.map(s => s.signal).sort(), [...OperationalSignalName.options].sort());
  for (const signal of parsed.signals) assert.ok(signal.counted.length > 20, `${signal.signal} does not say what it counted`);
  // The two the requirement names and this build cannot measure. Reporting them
  // as zero would be the exact lie the module is built to avoid.
  assert.deepEqual(parsed.signals.filter(s => !s.measured).map(s => s.signal), ['CONNECTOR_LIMIT_HEADROOM', 'BACKUP_STATUS']);
  for (const signal of parsed.signals.filter(s => !s.measured)) assert.ok(signal.unavailable_reason!.length > 20);
});

test('each operational signal is reported exactly once', () => {
  const [first] = signals();
  assert.throws(() => OperationalReadiness.parse({ ...report(), signals: Array.from({ length: 7 }, () => first) }));
  assert.throws(() => OperationalReadiness.parse({ ...report(), signals: signals().slice(0, 6) }));
});

test('the report has no field in which a payload, a secret or a person could appear', () => {
  for (const smuggled of [
    { logs: ['ERROR pool timeout for asha@aster.example'] }, { traces: [{ span: 'send' }] },
    { principal_id: '00000000-0000-4000-8000-000000000001' }, { connection_string: 'postgres://user:pw@host/db' },
    { hostname: 'orvia-prod-01' }, { last_error: 'relation does not exist' },
  ]) {
    assert.throws(() => OperationalReadiness.parse({ ...report(), ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a readiness report`);
  }
  // A signal is a number and a sentence about what was counted. There is no
  // free field on one either.
  assert.throws(() => OperationalSignal.parse({ signal: 'QUEUE_DEPTH', measured: true, value: 0, unit: 'RECORDS', counted: 'Depth.', unavailable_reason: null, sample: 'row data' }));
  assert.throws(() => OperationalReadiness.parse({ ...report(), as_of: sampleTime.replace('Z', '') }));
});

test('installation health is a read, and everything held by that capability is one', () => {
  // `health.read` existed with no route at all until M32 gave it one. M29's
  // preflight is the second, and both are reads of this installation's own
  // state: the capability must never come to carry anything that acts.
  const readiness = routes.filter(route => route.capability === 'health.read');
  assert.deepEqual(readiness.map(route => route.id).sort(),
    ['list_backup_snapshots', 'list_restore_runs', 'operational_readiness', 'preflight', 'restore_run']);
  for (const route of readiness) {
    assert.equal(route.method, 'get', `${route.id} is not a read`);
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // Nothing here pushes anywhere: this report is read locally and is not a
  // telemetry endpoint under another name.
  assert.ok(!routes.some(r => ['telemetry', 'metrics_push', 'phone_home', 'heartbeat'].some(word => r.id.includes(word))));
});
