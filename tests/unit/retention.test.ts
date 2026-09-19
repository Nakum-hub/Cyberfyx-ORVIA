// WP15 / M15 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Eligibility, LegalHold, RetentionConstraintCreate, RetentionOutcome, RetentionOutcomeRecord, routes, schemas } from '../../packages/contracts/src/index.ts';
import { uuid, sampleTime } from '../../packages/contracts/src/examples.ts';

const constraint = {
  data_asset_id: uuid(400), purpose_id: uuid(401), trigger: 'RECORD_CREATED' as const, basis: 'STATUTORY_OBLIGATION' as const,
  source_reference: 'Reviewed statutory schedule.', minimum_days: 365, maximum_days: 2555,
  permitted_use: 'Retained only for the stated obligation.', owner_reference: 'Records management',
  review_at: sampleTime, release_condition: 'Released when the obligation lapses.',
};
const eligibility = {
  data_asset_id: uuid(400), evaluated_at: sampleTime, eligible: false, blockers: ['NO_RECORDED_BASIS' as const],
  applicable_constraint_ids: [], active_hold_ids: [], governing_constraint_id: null, earliest_deletion_at: null,
  reasons: ['No reviewed retention basis is recorded.'], limits: [],
};

test('a retention constraint must actually bound something', () => {
  assert.equal(RetentionConstraintCreate.parse(constraint).minimum_days, 365);
  assert.throws(() => RetentionConstraintCreate.parse({ ...constraint, minimum_days: null, maximum_days: null }));
  // One bound alone is a real constraint; both missing is not.
  assert.equal(RetentionConstraintCreate.parse({ ...constraint, maximum_days: null }).maximum_days, null);
  assert.equal(RetentionConstraintCreate.parse({ ...constraint, minimum_days: null }).minimum_days, null);
  assert.throws(() => RetentionConstraintCreate.parse({ ...constraint, minimum_days: 400, maximum_days: 30 }));
});

test('eligibility and its blockers are the same fact and cannot disagree', () => {
  assert.equal(Eligibility.parse(eligibility).eligible, false);
  // Claiming eligibility while naming a blocker is the exact lie this prevents.
  assert.throws(() => Eligibility.parse({ ...eligibility, eligible: true }));
  assert.throws(() => Eligibility.parse({ ...eligibility, eligible: false, blockers: [] }));
  // An eligible copy must name what permits the deletion.
  assert.throws(() => Eligibility.parse({ ...eligibility, eligible: true, blockers: [], governing_constraint_id: null }));
  assert.equal(Eligibility.parse({ ...eligibility, eligible: true, blockers: [], governing_constraint_id: uuid(402) }).eligible, true);
});

test('a completed retention action must name its method and evidence', () => {
  const done = { result: 'DELETED' as const, method: 'MANUAL_ATTESTATION' as const, evidence_reference: 'Signed confirmation.', note: 'Erased.' };
  assert.equal(RetentionOutcomeRecord.parse(done).result, 'DELETED');
  assert.throws(() => RetentionOutcomeRecord.parse({ ...done, evidence_reference: null }));
  assert.throws(() => RetentionOutcomeRecord.parse({ ...done, method: 'NONE' }));
  assert.throws(() => RetentionOutcomeRecord.parse({ ...done, result: 'EFFECT_UNKNOWN', method: 'NONE' }));
  // Unsupported means nothing was attempted, so it carries neither.
  assert.throws(() => RetentionOutcomeRecord.parse({ ...done, result: 'NOT_SUPPORTED' }));
  assert.equal(RetentionOutcomeRecord.parse({ result: 'NOT_SUPPORTED', method: 'NONE', evidence_reference: null, note: 'No adapter.' }).result, 'NOT_SUPPORTED');
});

test('a backup copy is never reported as erased, whatever evidence is offered', () => {
  const base = { data_asset_id: uuid(400), result: 'DELETED' as const, method: 'MANUAL_ATTESTATION' as const,
    evidence_reference: 'Backup expiry schedule.', note: 'Claimed.', recorded_at: sampleTime, recorded_by: uuid(403) };
  // A future expiry date is not current proof of erasure.
  assert.throws(() => RetentionOutcome.parse({ ...base, copy_class: 'BACKUP_COPY' }));
  assert.throws(() => RetentionOutcome.parse({ ...base, copy_class: 'BACKUP_COPY', result: 'SUPPRESSED' }));
  assert.equal(RetentionOutcome.parse({ ...base, copy_class: 'BACKUP_COPY', result: 'EFFECT_UNKNOWN', evidence_reference: null }).result, 'EFFECT_UNKNOWN');
  // Every other copy class may be reported as done, because it can be read back.
  for (const copy_class of ['DATASET', 'FIELD', 'DERIVED_COPY', 'EXPORT'] as const) {
    assert.equal(RetentionOutcome.parse({ ...base, copy_class }).copy_class, copy_class);
  }
});

test('a hold records its release and never stands half-released', () => {
  const hold = { data_asset_ids: [uuid(410)], reason: 'Preserved for anticipated litigation.',
    authority_reference: 'SYN-2026-014', issued_at: sampleTime, review_at: sampleTime,
    release_criterion: 'Released when the matter concludes.', id: uuid(411), state: 'ACTIVE' as const,
    recorded_at: sampleTime, recorded_by: uuid(412), released_at: null, release_reason: null };
  assert.equal(LegalHold.parse(hold).state, 'ACTIVE');
  assert.throws(() => LegalHold.parse({ ...hold, state: 'RELEASED' }));
  assert.throws(() => LegalHold.parse({ ...hold, released_at: sampleTime }));
  assert.equal(LegalHold.parse({ ...hold, state: 'RELEASED', released_at: sampleTime, release_reason: 'Matter concluded.' }).state, 'RELEASED');
  // A hold with no named copies would be a hold over everything.
  assert.throws(() => LegalHold.parse({ ...hold, data_asset_ids: [] }));
});

test('releasing a hold and deciding a conflict are approval acts, not ordinary writes', () => {
  const retentionRoutes = routes.filter(route => route.capability?.startsWith('retention.'));
  assert.equal(retentionRoutes.length, 9);
  const approve = retentionRoutes.filter(route => route.capability === 'retention.approve').map(route => route.id).sort();
  assert.deepEqual(approve, ['release_hold', 'retention_decision']);
  for (const route of retentionRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
});
