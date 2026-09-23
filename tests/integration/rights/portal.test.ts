// Portal self-service rights intake integration suite.
// Under test: a data principal can exercise their own rights without a member
// of staff, the request is bound to the session rather than to anything the
// caller supplied, and one principal can never see or reach another's request.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import * as S from '../../../packages/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/rehearsal permitted');
const db = connectDatabase(profile).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let phase = 'setup';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, { expected, actual }); throw new Error('Assertion failed: ' + name); }
}
const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
const login = h.login.bind(h);
h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
const key = () => ({ 'idempotency-key': randomUUID() });
const fieldCodes = async (response: Response) =>
  ((await response.json()) as { error: { field_errors?: { code: string }[] } }).error.field_errors?.map(e => e.code) ?? [];
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) throw new Error(`Expected ${expected}, got ${response.status}: ${JSON.stringify(value).slice(0, 300)}`);
  return schema.parse(value);
}

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const alice = scenario.alice;
  const bob = await h.login('bob');
  const staff = scenario.author;
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];

  // --- the person the right belongs to can exercise it --------------------------
  phase = 'self-service';
  const raised = await body(S.OwnRightsRequest, await alice.call('/api/v1/portal/me/rights-requests',
    { right_type: 'ACCESS', description: 'Please tell me what personal data you hold about me and why.' }, key()));
  check('a data principal can raise their own request without any member of staff',
    [raised.right_type, raised.state, raised.submitted_channel], ['ACCESS', 'RECEIVED', 'PORTAL']);
  check('and it is recorded as open, with no response released yet',
    [raised.closed_at, raised.response_released], [null, false]);
  check('the status page says a state is not a promise about the outcome',
    raised.a_state_is_not_a_promise_about_the_outcome, true);

  // --- the request is bound to the session, not to anything supplied ------------
  phase = 'bound to the session';
  const stored = (await db.query(
    `SELECT principal_id, authority, identity, identity_grade, document->>'submitted_channel' AS channel
       FROM app.rights_requests WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`,
    [...scope, raised.id])).rows[0];
  check('the request is about the person who made it, taken from their session',
    stored.principal_id, h.users.alice!.principal_id);
  check('acting for themselves is recorded as self-authority, with no mandate',
    stored.authority, 'SELF');
  // The session is bound to exactly one principal reference, so the identity is
  // a fact from the authentication rather than an operator's later opinion.
  check('identity is established from the authenticated session rather than re-guessed',
    [stored.identity, stored.identity_grade], ['ESTABLISHED', 'EXACT']);
  check('and the channel records how the request actually arrived', stored.channel, 'PORTAL');
  // The failure that would matter most: a self-service intake that let somebody
  // raise a request about a stranger.
  const impersonation = await alice.call('/api/v1/portal/me/rights-requests',
    { right_type: 'ERASURE', description: 'A request about somebody who is not me.', principal_id: h.users.bob!.principal_id }, key());
  check('there is no field through which one person could raise a request about another',
    impersonation.status, 400);

  // --- one principal never reaches another's request ------------------------------
  phase = 'isolation';
  const bobRaised = await body(S.OwnRightsRequest, await bob.call('/api/v1/portal/me/rights-requests',
    { right_type: 'GRIEVANCE', description: 'I am unhappy with how a decision about me was handled.' }, key()));
  check('another principal raising their own request gets their own record',
    bobRaised.right_type, 'GRIEVANCE');
  check('and cannot read the first principal’s request even knowing its identifier',
    (await bob.call(`/api/v1/portal/me/rights-requests/${raised.id}`)).status, 404);
  const alicePage = S.schemas.OwnRightsRequestList.parse(
    await (await alice.call('/api/v1/portal/me/rights-requests?limit=100')).json());
  check('a principal’s own list contains their request and not the other person’s',
    [alicePage.items.some(i => i.id === raised.id), alicePage.items.some(i => i.id === bobRaised.id)], [true, false]);

  // --- what the requester is shown, and what they are not -------------------------
  phase = 'minimisation';
  const serialised = JSON.stringify(alicePage);
  check('the requester is not shown the organisation’s internal working notes',
    ['identity_grade', 'matched_reference_count', 'unresolved_destinations', 'planned_actions', 'closure_note']
      .filter(field => serialised.includes(field)), []);
  check('nor another principal’s identifier',
    serialised.includes(h.users.bob!.principal_id!), false);
  check('and the shape carries only the fields the contract declares',
    Object.keys(raised).sort(),
    ['a_state_is_not_a_promise_about_the_outcome', 'closed_at', 'description', 'id', 'limits',
      'response_released', 'right_type', 'state', 'submitted_at', 'submitted_channel']);

  // --- the same request is the one staff work on ------------------------------------
  phase = 'one record';
  const asStaff = S.schemas.RightsRequestList.parse(
    await (await staff.call('/api/v1/admin/rights-requests?limit=100')).json());
  check('the portal request is the same record staff handle, not a parallel one',
    asStaff.items.some(i => i.id === raised.id), true);
  check('raising a request in the portal is recorded in the audit trail',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND operation='rights_request.raised_in_portal'`, scope)).rows[0].n) > 0, true);

  // --- refusals ----------------------------------------------------------------------
  phase = 'refusals';
  const thin = await alice.call('/api/v1/portal/me/rights-requests', { right_type: 'ACCESS', description: 'hi' }, key());
  check('a request that says almost nothing is refused rather than recorded empty',
    [thin.status, (await fieldCodes(thin)).length > 0], [400, true]);
  check('a right this Act does not provide cannot be raised',
    (await alice.call('/api/v1/portal/me/rights-requests',
      { right_type: 'PORTABILITY', description: 'A right from another regime entirely.' }, key())).status, 400);
  check('a member of staff cannot use the portal route to act as a principal',
    (await staff.call('/api/v1/portal/me/rights-requests',
      { right_type: 'ACCESS', description: 'Staff should not be able to raise this here.' }, key())).status, 403);

  writeEvidence('portal-rights-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('portal-rights-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
