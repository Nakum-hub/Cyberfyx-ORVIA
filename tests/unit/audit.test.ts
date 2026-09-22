// M33 Audit Administration contract invariants (FR-M33-01, FR-M33-03). Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { AuditCategory, AuditCoverage, AuditCoverageEntry, AuditCorrection, AuditCorrectionCreate, AuditEvent, AuditExport, AuditQuery, routes, schemas } from '../../packages/contracts/src/index.ts';
import { example, uuid, sampleTime } from '../../packages/contracts/src/examples.ts';

const coverage = () => structuredClone(example('AuditCoverage')) as Record<string, unknown>;
const entries = () => coverage().entries as Record<string, unknown>[];
const covered = { category: 'EXPORTS' as const, operations: ['evidence.export'], recorded: 4, first_seen_at: sampleTime, last_seen_at: sampleTime, has_a_path: true, note: 'Every evidence export is recorded.' };

test('every audit category is reported exactly once', () => {
  const parsed = AuditCoverage.parse(coverage());
  assert.equal(parsed.entries.length, 8);
  assert.deepEqual(parsed.entries.map(e => e.category).sort(), [...AuditCategory.options].sort());
  const [first] = entries();
  assert.throws(() => AuditCoverage.parse({ ...coverage(), entries: Array.from({ length: 8 }, () => first) }));
  assert.throws(() => AuditCoverage.parse({ ...coverage(), entries: entries().slice(0, 7) }));
});

test('coverage is measured from the trail and cannot be asserted', () => {
  assert.equal(AuditCoverage.parse(coverage()).derived_from_recorded_events, true);
  // The structural statement cannot be flipped, and nothing can declare a
  // category covered alongside the measurement.
  assert.throws(() => AuditCoverage.parse({ ...coverage(), derived_from_recorded_events: false }));
  for (const smuggled of [{ configured_categories: ['EXPORTS'] }, { assumed_covered: true }, { complete: true }]) {
    assert.throws(() => AuditCoverage.parse({ ...coverage(), ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into audit coverage`);
  }
});

test('a category with nothing recorded is distinct from one with no path at all', () => {
  const parsed = AuditCoverage.parse(coverage());
  const owner = parsed.entries.find(e => e.category === 'OWNER_CHANGES')!;
  // This build has no ownership-transfer route, so the entry says there is
  // nothing to audit rather than that auditing was omitted.
  assert.deepEqual([owner.has_a_path, owner.recorded, owner.operations], [false, 0, []]);
  // A path that exists but has recorded nothing yet is a different, expressible fact.
  const quiet = AuditCoverageEntry.parse({ ...covered, recorded: 0, first_seen_at: null, last_seen_at: null });
  assert.deepEqual([quiet.has_a_path, quiet.recorded], [true, 0]);
  // And the impossible combination is refused: no path cannot have recorded anything.
  assert.throws(() => AuditCoverageEntry.parse({ ...covered, has_a_path: false }));
});

test('a category has a first occurrence exactly when something was recorded', () => {
  assert.equal(AuditCoverageEntry.parse(covered).recorded, 4);
  assert.throws(() => AuditCoverageEntry.parse({ ...covered, recorded: 0 }));
  assert.throws(() => AuditCoverageEntry.parse({ ...covered, first_seen_at: null }));
  assert.throws(() => AuditCoverageEntry.parse({ ...covered, last_seen_at: null }));
  // Every entry names the operations behind its count, so the claim is checkable.
  for (const entry of AuditCoverage.parse(coverage()).entries) {
    assert.equal(entry.operations.length > 0, entry.has_a_path, `${entry.category} disagrees about whether it has a path`);
    assert.ok(entry.note.length > 20, `${entry.category} does not explain itself`);
  }
});

test('a correction is appended beside the disputed event and never replaces it', () => {
  const correction = {
    id: uuid(700), event_id: uuid(701), disputed: 'WRONG_ACTOR' as const,
    correction: 'The recorded actor was the scheduler, not the named operator.',
    recorded_at: sampleTime, recorded_by: uuid(702), original_event_unchanged: true as const,
    limits: ['The disputed event is unchanged.'],
  };
  assert.equal(AuditCorrection.parse(correction).original_event_unchanged, true);
  // The claim this product is not entitled to make.
  assert.throws(() => AuditCorrection.parse({ ...correction, original_event_unchanged: false }));
  // There is no field through which a correction could edit, hide or supersede
  // the record it disputes.
  for (const smuggled of [{ replaces: true }, { supersedes_event: uuid(701) }, { hidden: true }, { new_operation: 'something.else' }, { delete_original: true }]) {
    assert.throws(() => AuditCorrection.parse({ ...correction, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a correction`);
  }
});

test('a dispute names a reason from a closed vocabulary and explains itself', () => {
  const create = { event_id: uuid(701), disputed: 'DUPLICATE_RECORD' as const, correction: 'This is the same act recorded twice by a retry.' };
  assert.equal(AuditCorrectionCreate.parse(create).disputed, 'DUPLICATE_RECORD');
  assert.throws(() => AuditCorrectionCreate.parse({ ...create, disputed: 'IT_LOOKED_WRONG' }));
  // A correction that says nothing is not a correction.
  assert.throws(() => AuditCorrectionCreate.parse({ ...create, correction: 'wrong' }));
  assert.throws(() => AuditCorrectionCreate.parse({ ...create, correction: '' }));
});

test('an audit event reports whether it is disputed without being altered by the dispute', () => {
  const event = {
    id: uuid(710), operation: 'evidence.export', actor_id: uuid(711), actor_domain: 'STAFF' as const,
    resource_id: uuid(712), request_id: uuid(713), created_at: sampleTime, corrections: 0,
  };
  assert.equal(AuditEvent.parse(event).corrections, 0);
  assert.equal(AuditEvent.parse({ ...event, corrections: 2 }).corrections, 2);
  // A machine-recorded event has no resource in every case, which must stay expressible.
  assert.equal(AuditEvent.parse({ ...event, actor_domain: 'MACHINE', resource_id: null }).resource_id, null);
  // The event carries no payload, and a dispute cannot rewrite what it says.
  for (const smuggled of [{ payload: { body: 'x' } }, { detail: 'pool timeout' }, { corrected_operation: 'something.else' }, { superseded_by: uuid(714) }]) {
    assert.throws(() => AuditEvent.parse({ ...event, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into an audit event`);
  }
});

test('the trail is filtered only by keys the contract declares', () => {
  assert.deepEqual(Object.keys(AuditQuery.shape).sort(), ['actor_domain', 'actor_id', 'from', 'operation', 'to']);
  assert.deepEqual(AuditQuery.parse({}), {});
  assert.equal(AuditQuery.parse({ operation: 'evidence.export' }).operation, 'evidence.export');
  assert.throws(() => AuditQuery.parse({ actor_id: 'not-a-uuid' }));
  assert.throws(() => AuditQuery.parse({ from: 'yesterday' }));
  assert.throws(() => AuditQuery.parse({ actor_domain: 'ROBOT' }));
  // No free-form predicate reaches the database.
  assert.throws(() => AuditQuery.parse({ where: "1=1 OR ''=''" }));
});

test('reading, exporting and administering the trail are three separate authorities', () => {
  const trail = routes.filter(route => route.capability?.startsWith('audit.'));
  assert.deepEqual(trail.map(route => route.id).sort(),
    ['audit_coverage', 'audit_retention', 'correct_audit_event', 'export_audit_events', 'list_audit_events', 'set_audit_retention']);
  // FR-M33-03 names read, export and administration separately, so no two of
  // them are the same permission.
  // FR-M33-04 put setting a retention period here rather than under read:
  // deciding how long the trail is kept is administration of it.
  assert.deepEqual(trail.filter(route => route.capability === 'audit.administer').map(route => route.id).sort(),
    ['correct_audit_event', 'set_audit_retention']);
  assert.deepEqual(trail.filter(route => route.capability === 'audit.export').map(route => route.id), ['export_audit_events']);
  assert.deepEqual(trail.filter(route => route.capability === 'audit.read').map(route => route.id).sort(),
    ['audit_coverage', 'audit_retention', 'list_audit_events']);
  for (const route of trail) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // There is no endpoint that edits or removes an audit record, under any name.
  // Scoped to routes that touch the trail: FR-M29-04 added a purge for quarantined
  // import rows, which is a different thing and must not trip this.
  const touchesTheTrail = routes.filter(route => /audit/.test(route.id) || route.capability?.startsWith('audit.'));
  assert.ok(!touchesTheTrail.some(route => ['delete', 'purge', 'redact', 'amend', 'expire'].some(word => route.id.includes(word))));
});

test('an export carries everything it matched or it is not produced at all', () => {
  const events = [{
    id: uuid(720), operation: 'evidence.export', actor_id: uuid(721), actor_domain: 'STAFF' as const,
    resource_id: uuid(722), request_id: uuid(723), created_at: sampleTime, corrections: 0,
  }];
  const artifact = { exported_at: sampleTime, filter: { operation: 'evidence.export' }, events, matched: 1,
    complete: true as const, digest: 'a'.repeat(64), limits: ['Every event the filter matched is here.'] };
  assert.equal(AuditExport.parse(artifact).matched, 1);
  // The failure this shape exists to prevent: a file that carries fewer events
  // than it matched and still reads as a complete record of a period.
  assert.throws(() => AuditExport.parse({ ...artifact, matched: 9 }));
  assert.throws(() => AuditExport.parse({ ...artifact, events: [] }));
  assert.throws(() => AuditExport.parse({ ...artifact, complete: false }));
  // There is no field through which partialness could be smuggled in as a note.
  for (const smuggled of [{ truncated: true }, { partial: true }, { omitted: 4 }, { sample_of: 900 }]) {
    assert.throws(() => AuditExport.parse({ ...artifact, ...smuggled }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into an export`);
  }
  // The artifact says what it is the answer to, so it cannot be read as the
  // whole trail when it is the answer to a narrow filter.
  assert.deepEqual(AuditExport.parse(artifact).filter, { operation: 'evidence.export' });
});
