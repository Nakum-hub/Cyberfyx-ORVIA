// Portal self-service rights intake invariants. Docker-free.
//
// The Act gives these rights to the data principal. Everything asserted here
// protects the person exercising one: that the request is theirs, that nobody
// can raise one about them, and that a status page does not imply an outcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import { Capability, OwnRightsRequest, OwnRightsRequestCreate, RightType, routes, schemas } from '../../packages/contracts/src/index.ts';
import { example, uuid, sampleTime } from '../../packages/contracts/src/examples.ts';

const own = () => structuredClone(example('OwnRightsRequest')) as Record<string, unknown>;

test('a principal raises a request for themselves, and there is no field for anybody else', () => {
  const created = OwnRightsRequestCreate.parse({
    right_type: 'ACCESS', description: 'Please tell me what personal data you hold about me.',
  });
  assert.equal(created.right_type, 'ACCESS');
  // The failure that would matter most in a self-service intake: raising a
  // request about a stranger. There is no field to carry one.
  for (const smuggled of [
    { principal_id: uuid(900) }, { on_behalf_of: uuid(900) }, { subject_id: uuid(900) },
    { email: 'someone@else.example' }, { mandate_id: uuid(901) },
  ]) {
    assert.throws(() => OwnRightsRequestCreate.parse({
      right_type: 'ACCESS', description: 'A request about somebody who is not me.', ...smuggled,
    }), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted onto a portal request`);
  }
  // Nor can the caller label how the request arrived: that field is the record
  // of the channel and is set by the product, not by whoever called it.
  assert.throws(() => OwnRightsRequestCreate.parse({
    right_type: 'ACCESS', description: 'Trying to look like manual intake.', submitted_channel: 'RECORDED_MANUAL_INTAKE',
  }));
});

test('only the rights this Act provides can be asked for', () => {
  assert.deepEqual([...RightType.options], ['ACCESS', 'CORRECTION', 'ERASURE', 'GRIEVANCE', 'NOMINATION']);
  for (const right of RightType.options) {
    assert.equal(OwnRightsRequestCreate.parse({ right_type: right, description: 'A request of this kind.' }).right_type, right);
  }
  // Rights from other regimes are not in the vocabulary, so they cannot be raised.
  for (const foreign of ['PORTABILITY', 'OBJECT', 'RESTRICTION', 'AUTOMATED_DECISION']) {
    assert.throws(() => OwnRightsRequestCreate.parse({ right_type: foreign, description: 'A right from elsewhere.' }));
  }
});

test('a request that says almost nothing is refused rather than recorded empty', () => {
  // An organisation cannot act on "hi", and recording it as a request would
  // start a clock against something nobody can answer.
  for (const thin of ['', 'hi', 'data', 'please']) {
    assert.throws(() => OwnRightsRequestCreate.parse({ right_type: 'ACCESS', description: thin }),
      new RegExp('.'), `"${thin}" was accepted as a request`);
  }
  assert.ok(OwnRightsRequestCreate.parse({ right_type: 'ACCESS', description: 'Tell me what you hold.' }));
});

test('the requester is shown their request, not the organisation’s working notes', () => {
  const parsed = OwnRightsRequest.parse(own());
  assert.equal(parsed.submitted_channel, 'PORTAL');
  // The staff record carries identity grading, per-system planned actions and
  // unresolved destinations. Those describe how the organisation is built and
  // what it could not reach; the requester cannot act on them and is not shown them.
  for (const smuggled of [
    { identity_grade: 'EXACT' }, { matched_reference_count: 1 }, { planned_actions: [] },
    { unresolved_destinations: [] }, { closure_note: 'internal' }, { principal_id: uuid(900) },
  ]) {
    assert.throws(() => OwnRightsRequest.parse({ ...own(), ...smuggled }), new RegExp('.'),
      `${Object.keys(smuggled)[0]} was exposed to the requester`);
  }
});

test('a state is where it has got to, never a promise about the answer', () => {
  const parsed = OwnRightsRequest.parse(own());
  assert.equal(parsed.a_state_is_not_a_promise_about_the_outcome, true);
  assert.throws(() => OwnRightsRequest.parse({ ...own(), a_state_is_not_a_promise_about_the_outcome: false }));
  // Closed and answered are different facts. A request can close without a
  // response having been released, so the two never collapse into one.
  assert.equal(parsed.response_released, false);
  const closedUnanswered = { ...own(), state: 'CLOSED', closed_at: sampleTime, response_released: false };
  assert.equal(OwnRightsRequest.parse(closedUnanswered).response_released, false);
  // And a closed request says when it closed, while an open one does not.
  assert.throws(() => OwnRightsRequest.parse({ ...own(), state: 'CLOSED' }));
  assert.throws(() => OwnRightsRequest.parse({ ...own(), closed_at: sampleTime }));
});

test('the portal routes are the principal’s own, and staff cannot reach through them', () => {
  const portal = routes.filter(r => /rights-requests/.test(r.path) && r.path.startsWith('/api/v1/portal'));
  assert.deepEqual(portal.map(r => r.id).sort(),
    ['own_rights_request', 'own_rights_requests', 'raise_own_rights_request']);
  for (const route of portal) {
    assert.equal(route.authority, 'PRINCIPAL', `${route.id} is not principal-only`);
    assert.match(route.capability!, /^rights\.own\./);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
    // No path parameter names a principal: the person comes from the session.
    assert.ok(!/principal/.test(route.path), `${route.id} names a principal in its path`);
  }
  // The capabilities exist and are distinct from the staff ones, so granting a
  // principal their own rights never grants authority over anybody else's.
  assert.ok(Capability.options.includes('rights.own.read'));
  assert.ok(Capability.options.includes('rights.own.write'));
  const staffRights = routes.filter(r => r.capability === 'rights.write' || r.capability === 'rights.read');
  assert.ok(staffRights.every(r => r.authority === 'STAFF'));
});
