// M29 Customer Onboarding preflight invariants (FR-M29-01, FR-M29-02). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PreflightGate, PreflightGateKind, PreflightReport, PreflightVerdict, routes } from '../../packages/contracts/src/index.ts';
import { example } from '../../packages/contracts/src/examples.ts';

const report = () => structuredClone(example('PreflightReport')) as Record<string, unknown>;
const gates = () => report().gates as Record<string, unknown>[];
const ok = { kind: 'RUNTIME_LOCATION' as const, verdict: 'PASSED' as const, checked: 'The address this application is actually serving on.', observed: 'Serving on loopback.', unverifiable_reason: null, remedy: null };

test('every gate the requirement names is reported exactly once', () => {
  const parsed = PreflightReport.parse(report());
  assert.equal(parsed.gates.length, 11);
  assert.deepEqual(parsed.gates.map(g => g.kind).sort(), [...PreflightGateKind.options].sort());
  const [first] = gates();
  assert.throws(() => PreflightReport.parse({ ...report(), gates: Array.from({ length: 11 }, () => first) }));
  assert.throws(() => PreflightReport.parse({ ...report(), gates: gates().slice(0, 10) }));
});

test('a gate that could not be checked is never a gate that passed', () => {
  assert.deepEqual([...PreflightVerdict.options], ['PASSED', 'FAILED', 'NOT_VERIFIABLE_HERE']);
  const parsed = PreflightReport.parse(report());
  const backup = parsed.gates.find(g => g.kind === 'BACKUP_TARGET')!;
  assert.deepEqual([backup.verdict, backup.observed], ['NOT_VERIFIABLE_HERE', null]);
  assert.ok(backup.unverifiable_reason && backup.unverifiable_reason.length > 40);
  // The two shapes can never be confused: an unverifiable gate observing
  // something, or a passing gate claiming it could not be checked.
  assert.throws(() => PreflightGate.parse({ ...ok, verdict: 'NOT_VERIFIABLE_HERE', unverifiable_reason: 'No subsystem exists.' }));
  assert.throws(() => PreflightGate.parse({ ...ok, unverifiable_reason: 'No subsystem exists.' }));
  assert.throws(() => PreflightGate.parse({ ...ok, verdict: 'NOT_VERIFIABLE_HERE', observed: null, unverifiable_reason: null }));
});

test('a failing gate says what to do, and a passing one has nothing to remedy', () => {
  assert.equal(PreflightGate.parse(ok).remedy, null);
  assert.throws(() => PreflightGate.parse({ ...ok, remedy: 'Do something.' }));
  assert.throws(() => PreflightGate.parse({ ...ok, verdict: 'FAILED' }));
  const bad = PreflightGate.parse({ ...ok, verdict: 'FAILED', observed: 'Serving on a routable address.', remedy: 'Bind to loopback.' });
  assert.equal(bad.remedy, 'Bind to loopback.');
});

test('the two lists are derived from the gates and cannot disagree with them', () => {
  const parsed = PreflightReport.parse(report());
  assert.deepEqual(parsed.not_verifiable, ['BACKUP_TARGET']);
  assert.deepEqual(parsed.failing, ['PACKAGE_SIGNATURE']);
  // Quietly emptying either list while the gates still say otherwise.
  assert.throws(() => PreflightReport.parse({ ...report(), not_verifiable: [] }));
  assert.throws(() => PreflightReport.parse({ ...report(), failing: [] }));
  // Or claiming a failure that no gate reports.
  assert.throws(() => PreflightReport.parse({ ...report(), failing: ['PACKAGE_SIGNATURE', 'DURABLE_STORAGE'] }));
});

test('the report refuses to become a clearance to go live', () => {
  const parsed = PreflightReport.parse(report());
  assert.equal(parsed.an_unverified_gate_is_not_a_passed_gate, true);
  assert.equal(parsed.passing_every_gate_is_not_a_statement_about_the_law, true);
  assert.throws(() => PreflightReport.parse({ ...report(), an_unverified_gate_is_not_a_passed_gate: false }));
  assert.throws(() => PreflightReport.parse({ ...report(), passing_every_gate_is_not_a_statement_about_the_law: false }));
  // There is no field through which eleven technical checks could be restated
  // as permission, readiness or compliance.
  for (const smuggled of [{ ready_for_production: true }, { compliant: true }, { go_live_approved: true }, { score: 91 }, { percentage_passed: 91 }]) {
    assert.throws(() => PreflightReport.parse({ ...report(), ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a preflight report`);
  }
});

test('every gate says what it examined, however it turned out', () => {
  for (const gate of PreflightReport.parse(report()).gates) {
    assert.ok(gate.checked.length > 30, `${gate.kind} does not say what it examined`);
  }
});

test('preflight is a read, available to anyone who may read installation health', () => {
  const route = routes.find(r => r.id === 'preflight')!;
  assert.deepEqual([route.method, route.authority, route.capability], ['get', 'STAFF', 'health.read']);
  // Nothing about preflight writes, approves or enables anything.
  assert.ok(!routes.some(r => /preflight/.test(r.id) && r.method === 'post'));
});
