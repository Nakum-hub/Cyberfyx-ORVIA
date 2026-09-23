// M32 vendor-side visibility invariants (FR-M32-04). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DiagnosticCode, IncidentSeverity, IncidentState, SupportSubject,
  VendorDisclosure, VendorVisibility, routes, schemas,
} from '../../shared/contracts/src/index.ts';
import { example } from '../../shared/contracts/src/examples.ts';

const report = () => structuredClone(example('VendorVisibility')) as Record<string, unknown>;
const disclosures = () => report().disclosures as Record<string, unknown>[];

test('vendor service health is an absence and is never reported as healthy', () => {
  const parsed = VendorVisibility.parse(report());
  assert.equal(parsed.vendor_service_health.observed, false);
  assert.ok(parsed.vendor_service_health.reason.length > 40);
  // `observed` is a literal false, so no build can start claiming it looked.
  // There is no verdict, status or uptime field it could look through either.
  assert.throws(() => VendorVisibility.parse({ ...report(), vendor_service_health: { observed: true, reason: 'All good.' } }));
  for (const smuggled of [{ status: 'UP' }, { healthy: true }, { uptime_seconds: 900 }, { latency_ms: 12 }]) {
    assert.throws(() => VendorVisibility.parse({ ...report(), vendor_service_health: { observed: false, reason: 'x'.repeat(50), ...smuggled } }),
      new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted onto vendor service health`);
  }
});

test('the four statements the requirement is made of cannot be flipped', () => {
  const parsed = VendorVisibility.parse(report());
  assert.deepEqual([
    parsed.no_automatic_telemetry_is_collected,
    parsed.no_employee_activity_is_tracked,
    parsed.the_absence_of_a_model_is_never_an_incident,
    parsed.this_states_what_was_disclosed_not_what_the_vendor_holds,
  ], [true, true, true, true]);
  for (const field of [
    'no_automatic_telemetry_is_collected', 'no_employee_activity_is_tracked',
    'the_absence_of_a_model_is_never_an_incident', 'this_states_what_was_disclosed_not_what_the_vendor_holds',
  ]) {
    assert.throws(() => VendorVisibility.parse({ ...report(), [field]: false }), new RegExp('.'), `${field} could be set false`);
  }
});

test('no vocabulary in this build can express an incident about an absent model', () => {
  // The requirement forbids raising a model-absence incident. Asserting that in
  // prose would be worth nothing, so it is checked against the closed
  // vocabularies instead: there is no code, subject, severity or state in which
  // such an incident could be written, and adding one is a contract change that
  // fails this test.
  const vocabularies = [
    ...DiagnosticCode.options, ...SupportSubject.options,
    ...IncidentSeverity.options, ...IncidentState.options,
  ];
  for (const term of ['MODEL', 'AI_', 'INFERENCE', 'EMBEDDING', 'PREDICTION', 'TRAINING']) {
    assert.deepEqual(vocabularies.filter(value => value.includes(term)), [],
      `a vocabulary in this build can name ${term}`);
  }
  // And nothing disclosed can name, count or measure a person.
  for (const term of ['PRINCIPAL', 'EMPLOYEE', 'STAFF', 'USER', 'PERSON', 'OPERATOR']) {
    assert.deepEqual(DiagnosticCode.options.filter(value => value.includes(term)), [],
      `a diagnostic code names ${term}`);
  }
});

test('a disclosure that was carried says when and how, and one that was not says neither', () => {
  const [carried, uncarried] = disclosures();
  assert.deepEqual([VendorDisclosure.parse(carried).outcome, VendorDisclosure.parse(uncarried).outcome], ['ACCEPTED', null]);
  assert.equal(VendorDisclosure.parse(uncarried).carried_at, null);
  // Approved-and-never-carried and carried-and-rejected are different facts and
  // can never be written as each other.
  assert.throws(() => VendorDisclosure.parse({ ...carried, carried_at: null }));
  assert.throws(() => VendorDisclosure.parse({ ...uncarried, outcome: 'ACCEPTED' }));
  // And nothing here claims ORVIA moved the payload.
  assert.equal(VendorDisclosure.parse(carried).transported_by_orvia, false);
  assert.throws(() => VendorDisclosure.parse({ ...carried, transported_by_orvia: true }));
});

test('the uncarried count is derived from the disclosures and cannot disagree', () => {
  const parsed = VendorVisibility.parse(report());
  assert.equal(parsed.approved_but_not_carried, parsed.disclosures.filter(d => d.carried_at === null).length);
  assert.throws(() => VendorVisibility.parse({ ...report(), approved_but_not_carried: 0 }));
  // A case that disclosed nothing is counted separately, so an open case is
  // never read as something having been sent.
  assert.equal(parsed.cases_with_nothing_disclosed, 3);
  const nothing = { ...report(), disclosures: [], approved_but_not_carried: 0 };
  assert.deepEqual(VendorVisibility.parse(nothing).disclosures, []);
});

test('a disclosure carries closed facts and no field in which prose could travel', () => {
  for (const disclosure of VendorVisibility.parse(report()).disclosures) {
    for (const fact of disclosure.facts) {
      assert.ok(DiagnosticCode.options.includes(fact.code), `${fact.code} is not a declared diagnostic code`);
      assert.ok(Date.parse(fact.last_seen_at) >= Date.parse(fact.first_seen_at));
    }
  }
  const [carried] = disclosures();
  for (const smuggled of [
    { note: 'The connector kept timing out for asha@aster.example' }, { log_excerpt: 'ERROR pool timeout' },
    { description: 'free text' }, { principal_id: '00000000-0000-4000-8000-000000000001' },
    { employee_id: 'e-1' }, { hostname: 'orvia-prod-01' },
  ]) {
    assert.throws(() => VendorDisclosure.parse({ ...carried, ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was accepted onto a disclosure`);
  }
});

test('what the vendor can see is a read, and there is nothing that pushes it anywhere', () => {
  const route = routes.find(r => r.id === 'vendor_visibility')!;
  assert.deepEqual([route.method, route.authority, route.capability], ['get', 'STAFF', 'health.read']);
  assert.ok(schemas[route.response]);
  // This report exists because there is no automatic channel. A route that sent
  // anything would contradict the thing it is asserting.
  assert.ok(!routes.some(r => ['telemetry', 'phone_home', 'heartbeat', 'metrics_push', 'vendor_report'].some(word => r.id.includes(word))));
  assert.ok(!routes.some(r => r.method === 'post' && r.id.includes('vendor_visibility')));
});
