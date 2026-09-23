// WP16 / M16 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Assessment, CoordinationRecord, Finding, FindingClosure, ProcessorStanding, routes, schemas } from '../../shared/contracts/src/index.ts';
import { uuid, sampleTime } from '../../shared/contracts/src/examples.ts';

const base = { processor_id: uuid(600), subject: 'Withdrawal propagation', note: 'Recorded.' };

test('only an independent check can ever record verification', () => {
  // A processor telling you it is done is a claim, not a check. This is the
  // single most important rule in the module.
  for (const method of ['RECORDED_MESSAGE', 'RECORDED_REPLY', 'ATTRIBUTED_STATEMENT']) {
    assert.throws(() => CoordinationRecord.parse({ ...base, fact: 'VERIFIED', method, evidence_reference: 'Vendor letter.' }),
      new RegExp('.'), `${method} was accepted as verification`);
  }
  assert.equal(CoordinationRecord.parse({ ...base, fact: 'VERIFIED', method: 'INDEPENDENT_CHECK', evidence_reference: 'Scoped read.' }).fact, 'VERIFIED');
  // Verification with no evidence is an assertion about an assertion.
  assert.throws(() => CoordinationRecord.parse({ ...base, fact: 'VERIFIED', method: 'INDEPENDENT_CHECK', evidence_reference: null }));
});

test('each coordination fact is tied to the kind of act that produces it', () => {
  assert.equal(CoordinationRecord.parse({ ...base, fact: 'NOTIFIED', method: 'RECORDED_MESSAGE', evidence_reference: 'Message.' }).fact, 'NOTIFIED');
  for (const method of ['RECORDED_REPLY', 'INDEPENDENT_CHECK', 'ATTRIBUTED_STATEMENT']) {
    assert.throws(() => CoordinationRecord.parse({ ...base, fact: 'NOTIFIED', method, evidence_reference: 'x' }));
  }
  for (const method of ['RECORDED_REPLY', 'ATTRIBUTED_STATEMENT']) {
    assert.equal(CoordinationRecord.parse({ ...base, fact: 'ACKNOWLEDGED', method, evidence_reference: null }).fact, 'ACKNOWLEDGED');
  }
  for (const method of ['RECORDED_MESSAGE', 'INDEPENDENT_CHECK']) {
    assert.throws(() => CoordinationRecord.parse({ ...base, fact: 'ACKNOWLEDGED', method, evidence_reference: null }));
  }
});

test('standing reports three facts and never combines them', () => {
  const standing = { processor_id: uuid(600), as_of: sampleTime, notified: true, acknowledged: true, verified: false,
    open_findings: 2, overdue_remediations: 1, unauthorised_system_links: [], limits: ['Only verification is evidence.'] };
  const parsed = ProcessorStanding.parse(standing);
  // Being told and replying is explicitly not being checked.
  assert.deepEqual([parsed.notified, parsed.acknowledged, parsed.verified], [true, true, false]);
  // There is no combined score field to be tempted by.
  assert.ok(!('score' in parsed) && !('compliant' in parsed) && !('status' in parsed));
  // Verification cannot appear for something never recorded as raised.
  assert.throws(() => ProcessorStanding.parse({ ...standing, notified: false, verified: true }));
});

test('a finding closes only with defined evidence or a retest', () => {
  const finding = { assessment_id: uuid(610), severity: 'HIGH' as const, description: 'Sub-processor list stale.',
    affected_system_ids: [], owner_reference: 'Vendor management', due_at: sampleTime, id: uuid(611),
    state: 'OPEN' as const, recorded_at: sampleTime, recorded_by: uuid(612), closed_at: null,
    closure_evidence: null, retest_reference: null, closure_note: null };
  assert.equal(Finding.parse(finding).state, 'OPEN');
  // Remediation with neither evidence nor a retest is the claim this prevents.
  assert.throws(() => Finding.parse({ ...finding, state: 'REMEDIATED', closed_at: sampleTime, closure_note: 'Done.' }));
  assert.equal(Finding.parse({ ...finding, state: 'REMEDIATED', closed_at: sampleTime, closure_evidence: 'Report.', closure_note: 'Done.' }).state, 'REMEDIATED');
  assert.equal(Finding.parse({ ...finding, state: 'REMEDIATED', closed_at: sampleTime, retest_reference: 'Retest.', closure_note: 'Done.' }).state, 'REMEDIATED');
  assert.throws(() => Finding.parse({ ...finding, state: 'ACCEPTED_RISK', closed_at: sampleTime }));
  // An open finding cannot carry a closure time, and a closed one must.
  assert.throws(() => Finding.parse({ ...finding, closed_at: sampleTime }));
  assert.throws(() => FindingClosure.parse({ state: 'REMEDIATED', closure_evidence: null, retest_reference: null, note: 'Fixed somehow.' }));
});

test('a completed assessment states when it completed and what it concluded', () => {
  const assessment = { processor_id: uuid(600), kind: 'VENDOR_DUE_DILIGENCE' as const,
    applicability_basis: 'Reviewed as applicable because this vendor processes contact details.',
    scope_system_ids: [], reviewer_reference: 'Privacy office', due_at: sampleTime, id: uuid(620),
    state: 'OPEN' as const, recorded_at: sampleTime, recorded_by: uuid(621), completed_at: null, conclusion: null };
  assert.equal(Assessment.parse(assessment).state, 'OPEN');
  assert.throws(() => Assessment.parse({ ...assessment, state: 'COMPLETED' }));
  assert.throws(() => Assessment.parse({ ...assessment, completed_at: sampleTime }));
  assert.equal(Assessment.parse({ ...assessment, state: 'COMPLETED', completed_at: sampleTime, conclusion: 'Accepted with remediation.' }).state, 'COMPLETED');
  // An applicability basis too short to be a reason is not a reason.
  assert.throws(() => Assessment.parse({ ...assessment, applicability_basis: 'Applies' }));
});

test('processor routes are staff-only, idempotent on write and fully typed', () => {
  const processorRoutes = routes.filter(route => route.capability?.startsWith('processor.'));
  assert.equal(processorRoutes.length, 11);
  for (const route of processorRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // Standing is a read. There is no endpoint that stores a processor's standing.
  assert.ok(!processorRoutes.some(route => route.id === 'processor_standing' && route.method === 'post'));
});
