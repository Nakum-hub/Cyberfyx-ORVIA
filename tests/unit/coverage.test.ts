// WP13 / M18 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AttentionCount, CoverageMeasure, CoverageReport, Gap, GapClosure, Guidance, routes, schemas } from '../../packages/contracts/src/index.ts';
import { uuid, sampleTime } from '../../packages/contracts/src/examples.ts';

const measure = {
  dimension: 'INVENTORY_OBSERVED' as const, counted: 'Recorded data copies with a current independent observation.',
  numerator: 3, denominator: 10, excluded: 0, exclusion_reasons: [], as_of: sampleTime,
};
const gap = {
  id: uuid(500), source: 'NEVER_OBSERVED' as const, subject_kind: 'DATA_ASSET' as const, subject_id: uuid(501),
  detected_at: sampleTime, last_seen_at: sampleTime, state: 'OPEN' as const, severity: 'MEDIUM' as const,
  owner_reference: null, due_at: null, evidence_reference: null, resolution_note: null,
  description: 'This copy has never been independently observed.',
};

test('a coverage measure cannot claim more than it counted', () => {
  assert.equal(CoverageMeasure.parse(measure).numerator, 3);
  assert.throws(() => CoverageMeasure.parse({ ...measure, numerator: 11 }));
  // A full ratio is fine; an impossible one is not.
  assert.equal(CoverageMeasure.parse({ ...measure, numerator: 10 }).numerator, 10);
});

test('an exclusion nobody can explain is indistinguishable from a silent drop', () => {
  assert.throws(() => CoverageMeasure.parse({ ...measure, excluded: 4 }));
  assert.throws(() => CoverageMeasure.parse({ ...measure, excluded: 0, exclusion_reasons: ['Unused reason.'] }));
  assert.equal(CoverageMeasure.parse({ ...measure, excluded: 4, exclusion_reasons: ['Tombstoned copies are excluded.'] }).excluded, 4);
});

test('an overlapping state cannot overlap with itself', () => {
  assert.equal(AttentionCount.parse({ state: 'FAILED', count: 2, overlaps_with: ['MANUAL_REQUIRED'] }).count, 2);
  const report = {
    scope: { tenant_id: uuid(510), legal_entity_id: uuid(511), environment_id: uuid(512) }, as_of: sampleTime,
    measures: [measure], attention: [{ state: 'FAILED' as const, count: 1, overlaps_with: ['FAILED' as const] }], limits: [],
  };
  // A state that overlaps itself would make the warning meaningless.
  assert.throws(() => CoverageReport.parse(report));
  assert.equal(CoverageReport.parse({ ...report, attention: [{ state: 'FAILED', count: 1, overlaps_with: ['UNVERIFIED'] }] }).attention.length, 1);
});

test('a gap is closed by evidence or by an owned, reasoned acceptance', () => {
  assert.equal(Gap.parse(gap).state, 'OPEN');
  // Resolving without evidence is the exact claim this prevents.
  assert.throws(() => Gap.parse({ ...gap, state: 'RESOLVED' }));
  assert.equal(Gap.parse({ ...gap, state: 'RESOLVED', evidence_reference: 'Observation record.' }).state, 'RESOLVED');
  assert.throws(() => Gap.parse({ ...gap, state: 'ACCEPTED_RISK' }));
  assert.throws(() => Gap.parse({ ...gap, state: 'ACCEPTED_RISK', owner_reference: 'Head of records' }));
  assert.equal(Gap.parse({ ...gap, state: 'ACCEPTED_RISK', owner_reference: 'Head of records', resolution_note: 'Accepted for one quarter.' }).state, 'ACCEPTED_RISK');
  assert.throws(() => GapClosure.parse({ state: 'RESOLVED', note: 'Fixed it somehow.', evidence_reference: null }));
});

test('a gap cannot be last seen before it was detected', () => {
  assert.throws(() => Gap.parse({ ...gap, detected_at: '2026-09-16T12:00:00.000Z', last_seen_at: sampleTime }));
  assert.equal(Gap.parse({ ...gap, last_seen_at: '2026-09-16T12:00:00.000Z' }).last_seen_at, '2026-09-16T12:00:00.000Z');
});

test('guidance can only ever be advisory', () => {
  const guidance = { gap_id: uuid(500), matched_rule: 'RB-OBSERVE-001', suggestion: 'Check the connector scope.',
    authority: 'ADVISORY_ONLY' as const, caveats: ['It does not establish the cause.'] };
  assert.equal(Guidance.parse(guidance).authority, 'ADVISORY_ONLY');
  // The authority field is a literal, so no other value can be expressed.
  assert.throws(() => Guidance.parse({ ...guidance, authority: 'AUTHORITATIVE' }));
  assert.throws(() => Guidance.parse({ ...guidance, authority: 'ALLOW' }));
  // Guidance must always carry at least one caveat; silence would imply confidence.
  assert.throws(() => Guidance.parse({ ...guidance, caveats: [] }));
  // No match is a valid answer and is not a statement that nothing is wrong.
  assert.equal(Guidance.parse({ ...guidance, matched_rule: null, suggestion: null }).matched_rule, null);
});

test('deriving and closing gaps is separated from reading them', () => {
  const coverageRoutes = routes.filter(route => route.capability?.startsWith('coverage.'));
  assert.equal(coverageRoutes.length, 6);
  const manage = coverageRoutes.filter(route => route.capability === 'coverage.manage').map(route => route.id).sort();
  assert.deepEqual(manage, ['assign_gap', 'close_gap', 'derive_gaps']);
  for (const route of coverageRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // Coverage itself is a read: there is no endpoint that stores a coverage figure.
  assert.ok(!coverageRoutes.some(route => route.id === 'coverage' && route.method === 'post'));
});
