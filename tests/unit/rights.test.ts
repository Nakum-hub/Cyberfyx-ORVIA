// WP07 / M14 contract invariants. These protect the meanings the schema owns,
// independently of any stored row, and run without Docker.
import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKING_GRADES, DESTRUCTIVE_OR_DISCLOSING, IdentityReview, Mandate, MandateCreate, REQUEST_TRANSITIONS, RequestState, RightsRequest, routes, schemas } from '../../shared/contracts/src/index.ts';
import { uuid, sampleTime } from '../../shared/contracts/src/examples.ts';
import { rightsExecution } from '../../backend/domain/src/shared/completion.ts';

const request = {
  id: uuid(300), right_type: 'ACCESS' as const, principal_id: uuid(301), submitted_channel: 'PORTAL' as const,
  mandate_id: null, description: 'Synthetic request.', state: 'RECEIVED' as const,
  received_at: sampleTime, updated_at: sampleTime, identity: 'NOT_ASSESSED' as const, identity_grade: null,
  authority: 'SELF' as const, execution: 'NOT_STARTED' as const, response: 'NOT_PREPARED' as const,
  scope: 'NOT_DETERMINED' as const, plan: [], outcomes: [], unresolved_destinations: [], closure_note: null,
};

test('the transition map covers every state and CLOSED is terminal', () => {
  const states = RequestState.options;
  assert.deepEqual(Object.keys(REQUEST_TRANSITIONS).sort(), [...states].sort());
  // Every destination must itself be a real state; no transition may point nowhere.
  for (const [from, targets] of Object.entries(REQUEST_TRANSITIONS)) {
    for (const to of targets) assert.ok(states.includes(to), `${from} points at unknown state ${to}`);
    assert.ok(!targets.includes(from as never), `${from} lists itself as a transition`);
  }
  assert.deepEqual(REQUEST_TRANSITIONS.CLOSED, []);
  // Every state except the initial one must be reachable, or it is dead vocabulary.
  const reachable = new Set(Object.values(REQUEST_TRANSITIONS).flat());
  for (const state of states) if (state !== 'RECEIVED') assert.ok(reachable.has(state), `${state} is unreachable`);
});

test('a scope change after approval is a route back to scoping, not a silent edit', () => {
  assert.ok(REQUEST_TRANSITIONS.AWAITING_APPROVAL.includes('SCOPING'));
  // Execution can only be entered from approval, never straight from verification.
  assert.ok(!REQUEST_TRANSITIONS.VERIFIED.includes('EXECUTING'));
  assert.ok(REQUEST_TRANSITIONS.AWAITING_APPROVAL.includes('EXECUTING'));
});

test('an assessed identity always records its grade', () => {
  assert.equal(RightsRequest.parse(request).identity_grade, null);
  assert.throws(() => RightsRequest.parse({ ...request, identity: 'ESTABLISHED' }));
  assert.throws(() => RightsRequest.parse({ ...request, identity_grade: 'EXACT' }));
  assert.equal(RightsRequest.parse({ ...request, identity: 'ESTABLISHED', identity_grade: 'EXACT' }).identity, 'ESTABLISHED');
});

test('an unresolved identity can never be recorded as having received a disclosure', () => {
  for (const grade of BLOCKING_GRADES) {
    const identity = grade === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NO_MATCH';
    assert.throws(() => RightsRequest.parse({ ...request, identity, identity_grade: grade, response: 'RELEASED' }), new RegExp('.'), `${grade} was allowed to receive a disclosure`);
  }
  assert.equal(RightsRequest.parse({ ...request, identity: 'ESTABLISHED', identity_grade: 'EXACT', response: 'RELEASED' }).response, 'RELEASED');
});

test('closure cannot claim complete execution while destinations remain unresolved', () => {
  const closed = { ...request, state: 'CLOSED' as const, closure_note: 'Closed administratively.' };
  assert.throws(() => RightsRequest.parse({ ...closed, execution: 'COMPLETE', scope: 'UNRESOLVED_DESTINATIONS', unresolved_destinations: ['Offline tape archive'] }));
  // Partial execution alongside unresolved destinations is the honest record.
  const honest = RightsRequest.parse({ ...closed, execution: 'PARTIAL', scope: 'UNRESOLVED_DESTINATIONS', unresolved_destinations: ['Offline tape archive'] });
  assert.equal(honest.execution, 'PARTIAL');
  assert.deepEqual(honest.unresolved_destinations, ['Offline tape archive']);
});

test('unresolved scope must name what is unresolved', () => {
  assert.throws(() => RightsRequest.parse({ ...request, scope: 'UNRESOLVED_DESTINATIONS' }));
  assert.equal(RightsRequest.parse({ ...request, scope: 'UNRESOLVED_DESTINATIONS', unresolved_destinations: ['A queue nobody owns'] }).scope, 'UNRESOLVED_DESTINATIONS');
});

test('an identity grade must agree with the number of references it matched', () => {
  const basis = 'Reviewed against the recorded portal identity.';
  assert.equal(IdentityReview.parse({ grade: 'EXACT', basis, matched_reference_count: 1 }).grade, 'EXACT');
  assert.equal(IdentityReview.parse({ grade: 'STRONG', basis, matched_reference_count: 1 }).grade, 'STRONG');
  assert.equal(IdentityReview.parse({ grade: 'AMBIGUOUS', basis, matched_reference_count: 2 }).grade, 'AMBIGUOUS');
  assert.equal(IdentityReview.parse({ grade: 'NO_MATCH', basis, matched_reference_count: 0 }).grade, 'NO_MATCH');
  for (const bad of [
    { grade: 'EXACT', matched_reference_count: 0 }, { grade: 'EXACT', matched_reference_count: 2 },
    { grade: 'STRONG', matched_reference_count: 3 }, { grade: 'AMBIGUOUS', matched_reference_count: 1 },
    { grade: 'NO_MATCH', matched_reference_count: 1 },
  ]) assert.throws(() => IdentityReview.parse({ ...bad, basis }), new RegExp('.'), JSON.stringify(bad));
  // A reviewer must say why; a grade with no stated basis is not a review.
  assert.throws(() => IdentityReview.parse({ grade: 'EXACT', basis: 'ok', matched_reference_count: 1 }));
});

test('ambiguous and no-match are exactly the grades that block disclosure', () => {
  assert.deepEqual([...BLOCKING_GRADES].sort(), ['AMBIGUOUS', 'NO_MATCH']);
  assert.deepEqual([...DESTRUCTIVE_OR_DISCLOSING].sort(), ['ACCESS', 'CORRECTION', 'ERASURE']);
  // A grievance or nomination discloses nothing, so it is not gated the same way.
  assert.ok(!DESTRUCTIVE_OR_DISCLOSING.includes('GRIEVANCE'));
  assert.ok(!DESTRUCTIVE_OR_DISCLOSING.includes('NOMINATION'));
});

test('a mandate records its window, its revocation and the rights it actually permits', () => {
  const base = { kind: 'GUARDIAN' as const, principal_id: uuid(310), representative_reference: 'Synthetic guardian',
    permitted_rights: ['ACCESS' as const], valid_from: sampleTime, valid_to: null, evidence_reference: 'Recorded attestation.' };
  assert.equal(MandateCreate.parse(base).kind, 'GUARDIAN');
  assert.throws(() => MandateCreate.parse({ ...base, valid_from: '2026-09-16T12:00:00.000Z', valid_to: sampleTime }));
  // A mandate that permits nothing is not a mandate.
  assert.throws(() => MandateCreate.parse({ ...base, permitted_rights: [] }));
  const stored = { ...base, id: uuid(311), state: 'ACTIVE' as const, recorded_at: sampleTime, recorded_by: uuid(312), revoked_at: null, revocation_reason: null };
  assert.equal(Mandate.parse(stored).state, 'ACTIVE');
  assert.throws(() => Mandate.parse({ ...stored, state: 'REVOKED' }));
  assert.throws(() => Mandate.parse({ ...stored, revoked_at: sampleTime }));
  assert.equal(Mandate.parse({ ...stored, state: 'REVOKED', revoked_at: sampleTime, revocation_reason: 'Ended by court order.' }).state, 'REVOKED');
});

test('releasing a response is separated from ordinary rights write access', () => {
  // Staff authority over other people's requests. The data principal's own
  // rights are a deliberately separate capability family (rights.own.*) so
  // that letting somebody exercise their own rights never grants them
  // authority over anybody else's; those routes are asserted in
  // tests/unit/portal-rights.test.ts.
  const rightsRoutes = routes.filter(route => route.capability?.startsWith('rights.')
    && !route.capability.startsWith('rights.own.'));
  // DPDP adds three staff case-profile routes and the principal's own history.
  assert.equal(rightsRoutes.length, 14);
  assert.equal(routes.filter(r => r.capability?.startsWith('rights.own.')).length, 4);
  const release = rightsRoutes.filter(route => route.capability === 'rights.release');
  // Disclosure to a person is its own authority, held by exactly one route.
  assert.equal(release.length, 1);
  assert.equal(release[0]!.id, 'release_response');
  for (const route of rightsRoutes) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
});

// --- WP08: execution derivation ---------------------------------------------

const planItem = (system: string, action = 'ERASE_RECORD') => ({ system_id: system, action, automatable: false, retention_exception: null, note: 'Planned.' });
const outcomeFor = (system: string, result: string, method = 'MANUAL_ATTESTATION', evidence: string | null = 'Signed confirmation.') =>
  ({ system_id: system, result, method, evidence_reference: evidence, note: 'Recorded.', recorded_at: sampleTime, recorded_by: uuid(320) });
const a = uuid(330), b = uuid(331);

test('execution claims nothing until an outcome is recorded', () => {
  assert.equal(rightsExecution([planItem(a)], [], 0), 'NOT_STARTED');
  // A planned system with no outcome means the work is still open, never done.
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'SUCCEEDED')], 0), 'RUNNING');
});

test('completion requires every planned system to have succeeded and nothing left unreached', () => {
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'SUCCEEDED'), outcomeFor(b, 'SUCCEEDED')], 0), 'COMPLETE');
  // An unreachable destination keeps it partial no matter how many systems succeeded.
  assert.equal(rightsExecution([planItem(a)], [outcomeFor(a, 'SUCCEEDED')], 1), 'PARTIAL');
});

test('the least flattering true answer wins', () => {
  // Outstanding work outranks a partial success, because somebody still must act.
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'SUCCEEDED'), outcomeFor(b, 'MANUAL_REQUIRED', 'NONE', null)], 0), 'MANUAL_REQUIRED');
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'SUCCEEDED'), outcomeFor(b, 'NOT_SUPPORTED', 'NONE', null)], 0), 'MANUAL_REQUIRED');
  // An unknown effect can never be reported as success.
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'SUCCEEDED'), outcomeFor(b, 'EFFECT_UNKNOWN', 'CONNECTOR_OPERATION', null)], 0), 'PARTIAL');
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'FAILED'), outcomeFor(b, 'FAILED')], 0), 'FAILED');
  assert.equal(rightsExecution([planItem(a), planItem(b)], [outcomeFor(a, 'SUCCEEDED'), outcomeFor(b, 'FAILED')], 0), 'PARTIAL');
});

test('a system needing no action neither blocks nor manufactures completion', () => {
  const none = planItem(b, 'NO_ACTION_REQUIRED');
  assert.equal(rightsExecution([planItem(a), none], [outcomeFor(a, 'SUCCEEDED')], 0), 'COMPLETE');
});

test('a lifecycle state is not an input to what execution achieved', () => {
  // The signature takes only the plan, the outcomes and the unreached count.
  assert.equal(rightsExecution.length, 3);
});
