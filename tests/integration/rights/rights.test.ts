// WP07 / M14 Rights Management integration suite.
// Exercises the real HTTP boundary, the real scoped transaction and the real
// PostgreSQL constraints. The invariant under test throughout is that a request
// never claims more than actually happened.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

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
const later = (hours: number) => new Date(Date.now() + hours * 3_600_000).toISOString();

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: rights.write, no rights.release
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also rights.release
  const principal = h.users.alice!.principal_id!;
  const request = async (right: S.RightTypeValue, mandate: string | null = null) =>
    S.RightsRequest.parse(await (await staff.call('/api/v1/admin/rights-requests', {
      right_type: right, principal_id: principal, submitted_channel: 'PORTAL', mandate_id: mandate,
      description: 'Synthetic rights request fixture.',
    }, key())).json());
  const transition = (id: string, to: string, reason = 'Synthetic progression for the fixture.') =>
    staff.call(`/api/v1/admin/rights-requests/${id}/transition`, { to, reason }, key());
  const review = (id: string, grade: string, count: number) =>
    staff.call(`/api/v1/admin/rights-requests/${id}/identity-review`, { grade, basis: 'Reviewed against recorded portal identity.', matched_reference_count: count }, key());
  const scopeIt = (id: string, unresolved: string[] = [], action = 'ERASE_RECORD') =>
    staff.call(`/api/v1/admin/rights-requests/${id}/scope`, {
      items: [{ system_id: scenario.system.id, action, retention_exception: null, note: 'Synthetic plan item.' }],
      unresolved_destinations: unresolved,
    }, key());
  const outcome = (id: string, body: Record<string, unknown>) =>
    staff.call(`/api/v1/admin/rights-requests/${id}/outcomes`, { system_id: scenario.system.id, ...body }, key());
  /** VERIFIED -> SCOPING -> (plan recorded) -> AWAITING_APPROVAL, per the canonical map. */
  const advanceToApproval = async (id: string, unresolved: string[] = []) => {
    await transition(id, 'SCOPING');
    await scopeIt(id, unresolved);
    return transition(id, 'AWAITING_APPROVAL');
  };

  // --- FR-M14-01: five dimensions are independent of the lifecycle state -----
  phase = 'intake';
  const access = await request('ACCESS');
  check('a new request starts in the master vocabulary', access.state, 'RECEIVED');
  check('nothing is assessed or executed merely because a request exists',
    [access.identity, access.identity_grade, access.execution, access.response, access.scope],
    ['NOT_ASSESSED', null, 'NOT_STARTED', 'NOT_PREPARED', 'NOT_DETERMINED']);
  check('a request made by the principal themselves has self authority', access.authority, 'SELF');

  phase = 'transition map';
  // The map is canonical: a state not listed as reachable is refused.
  check('a transition outside the canonical map is refused', (await transition(access.id, 'COMPLETED')).status, 409);
  check('a lifecycle state that does not exist is rejected by the contract', (await transition(access.id, 'ARCHIVED')).status, 400);
  check('the declared first step is permitted', (await transition(access.id, 'PENDING_VERIFICATION')).status, 200);

  // --- FR-M14-02: identity grades ------------------------------------------
  phase = 'identity';
  check('an exact match cannot claim two references', (await review(access.id, 'EXACT', 2)).status, 400);
  check('an ambiguous review must actually be ambiguous', (await review(access.id, 'AMBIGUOUS', 1)).status, 400);
  check('a no-match review cannot name matched references', (await review(access.id, 'NO_MATCH', 1)).status, 400);
  const ambiguous = S.RightsRequest.parse(await (await review(access.id, 'AMBIGUOUS', 3)).json());
  check('an ambiguous grade is recorded truthfully, not softened', [ambiguous.identity, ambiguous.identity_grade], ['AMBIGUOUS', 'AMBIGUOUS']);
  await transition(access.id, 'VERIFIED');
  await advanceToApproval(access.id);
  check('an ambiguous identity cannot begin a disclosing execution', (await transition(access.id, 'EXECUTING')).status, 403);
  check('an ambiguous identity cannot receive a disclosure',
    (await owner.call(`/api/v1/admin/rights-requests/${access.id}/response`, { third_party_redaction_reviewed: true, delivery_reference: 'Local expiring delivery.', expires_at: later(24) }, key())).status, 403);
  const resolved = S.RightsRequest.parse(await (await review(access.id, 'EXACT', 1)).json());
  check('a later exact review resolves the identity', [resolved.identity, resolved.identity_grade], ['ESTABLISHED', 'EXACT']);
  check('an established identity may now execute', (await transition(access.id, 'EXECUTING')).status, 200);

  // --- FR-M14-04: response release -----------------------------------------
  phase = 'response';
  const releasePath = `/api/v1/admin/rights-requests/${access.id}/response`;
  const body = { third_party_redaction_reviewed: true, delivery_reference: 'Local expiring delivery.', expires_at: later(24) };
  check('releasing a response needs its own capability, not merely write access', (await staff.call(releasePath, body, key())).status, 403);
  check('an already-expired delivery is rejected', (await owner.call(releasePath, { ...body, expires_at: later(-1) }, key())).status, 400);
  check('redaction review cannot be declined and still release', (await owner.call(releasePath, { ...body, third_party_redaction_reviewed: false }, key())).status, 400);
  const released = S.RightsRequest.parse(await (await owner.call(releasePath, body, key())).json());
  check('the response dimension moves without changing the lifecycle state', [released.response, released.state], ['RELEASED', 'EXECUTING']);
  check('a response cannot be released twice', (await owner.call(releasePath, body, key())).status, 409);

  // --- FR-M14-04: CLOSED is administrative closure, not erasure -------------
  phase = 'closure';
  const partial = await request('ERASURE');
  await transition(partial.id, 'PENDING_VERIFICATION');
  await review(partial.id, 'EXACT', 1);
  await transition(partial.id, 'VERIFIED');
  await transition(partial.id, 'SCOPING');
  const scoped = S.RightsRequest.parse(await (await scopeIt(partial.id, ['Offline archive tapes held by facilities'])).json());
  check('an unreachable destination is recorded, not dropped', scoped.unresolved_destinations, ['Offline archive tapes held by facilities']);
  check('unresolved destinations are visible in the scope dimension', scoped.scope, 'UNRESOLVED_DESTINATIONS');
  await transition(partial.id, 'AWAITING_APPROVAL');
  const executing = S.RightsRequest.parse(await (await transition(partial.id, 'EXECUTING')).json());
  // WP08: entering execution records no effect, because no system was touched.
  check('entering execution claims nothing until an outcome is recorded', executing.execution, 'RUNNING');
  check('a request with no recorded outcome cannot claim completion', (await transition(partial.id, 'COMPLETED')).status, 409);
  const succeeded = S.RightsRequest.parse(await (await outcome(partial.id, { result: 'SUCCEEDED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Signed deletion confirmation from the records team.', note: 'Erased in the live store.' })).json());
  // The live store succeeded, but the tape archive was never reached. Partial is
  // the honest answer; a success on every planned system is still not the whole job.
  check('a success on every planned system is still partial while a destination is unreached', succeeded.execution, 'PARTIAL');
  check('a request with unreachable destinations still cannot claim completion', (await transition(partial.id, 'COMPLETED')).status, 409);
  const partially = S.RightsRequest.parse(await (await transition(partial.id, 'PARTIALLY_COMPLETED')).json());
  check('the lifecycle move does not change what the outcomes already said', partially.execution, 'PARTIAL');
  check('the recorded outcome names its method and evidence', [partially.outcomes[0]!.method, partially.outcomes[0]!.evidence_reference !== null], ['MANUAL_ATTESTATION', true]);
  const closed = S.RightsRequest.parse(await (await transition(partial.id, 'CLOSED', 'Closed administratively; tape archive remains unreached.')).json());
  check('closure does not rewrite what execution achieved', closed.execution, 'PARTIAL');
  check('closure keeps the unresolved destination visible', closed.unresolved_destinations, ['Offline archive tapes held by facilities']);
  check('closure records why it was closed', closed.closure_note, 'Closed administratively; tape archive remains unreached.');
  check('a closed request is terminal', (await transition(closed.id, 'EXECUTING')).status, 409);
  const reopen = await db.query(`UPDATE app.rights_requests SET state='EXECUTING' WHERE id=$1`, [closed.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database itself refuses to reopen a closed request', reopen, 'REJECTED');

  // --- WP08: execution is derived from recorded outcomes --------------------
  phase = 'execution outcomes';
  const otherSystemForPlan = S.System.parse(await (await staff.call('/api/v1/admin/systems', { legal_entity_id: scenario.scope.legal_entity_id, environment_id: scenario.scope.environment_id, name: 'Manual records store', connector: 'LEGACY_MANUAL' }, key())).json());
  // Restriction is the only operation the supported connectors actually implement.
  const restrict = await request('ERASURE');
  await transition(restrict.id, 'PENDING_VERIFICATION');
  await review(restrict.id, 'EXACT', 1);
  await transition(restrict.id, 'VERIFIED');
  await transition(restrict.id, 'SCOPING');
  const restrictPlan = S.RightsRequest.parse(await (await scopeIt(restrict.id, [], 'RESTRICT_PROCESSING')).json());
  check('the server marks a supported operation automatable', restrictPlan.plan[0]!.automatable, true);
  const erasePlan = S.RightsRequest.parse(await (await scopeIt(restrict.id, [], 'ERASE_RECORD')).json());
  check('an operation no connector implements is not automatable, whatever was asked for', erasePlan.plan[0]!.automatable, false);

  check('an outcome cannot be recorded before execution begins', (await outcome(restrict.id, { result: 'MANUAL_REQUIRED', method: 'NONE', evidence_reference: null, note: 'Too early.' })).status, 409);
  await transition(restrict.id, 'AWAITING_APPROVAL');
  await transition(restrict.id, 'EXECUTING');
  check('success cannot be claimed without evidence', (await outcome(restrict.id, { result: 'SUCCEEDED', method: 'MANUAL_ATTESTATION', evidence_reference: null, note: 'No evidence.' })).status, 400);
  check('outstanding work cannot carry evidence', (await outcome(restrict.id, { result: 'MANUAL_REQUIRED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Something.', note: 'Contradictory.' })).status, 400);
  check('an effect is only unknown after a connector attempt', (await outcome(restrict.id, { result: 'EFFECT_UNKNOWN', method: 'MANUAL_ATTESTATION', evidence_reference: null, note: 'Wrong method.' })).status, 400);
  // The plan says erasure, which no connector implements, so a connector cannot
  // be credited with having performed it.
  check('a connector cannot be credited with an operation it does not implement', (await outcome(restrict.id, { result: 'SUCCEEDED', method: 'CONNECTOR_OPERATION', evidence_reference: 'Fabricated receipt.', note: 'No such operation.' })).status, 400);
  const unknownSystem = await staff.call(`/api/v1/admin/rights-requests/${restrict.id}/outcomes`, { system_id: randomUUID(), result: 'MANUAL_REQUIRED', method: 'NONE', evidence_reference: null, note: 'Not in the plan.' }, key());
  check('an outcome cannot be recorded for a system the plan does not name', unknownSystem.status, 404);

  const manual = S.RightsRequest.parse(await (await outcome(restrict.id, { result: 'MANUAL_REQUIRED', method: 'NONE', evidence_reference: null, note: 'Records team must erase this by hand.' })).json());
  check('outstanding manual work is reported as needing a person', manual.execution, 'MANUAL_REQUIRED');
  check('a manual request still cannot claim completion', (await transition(restrict.id, 'COMPLETED')).status, 409);
  check('a recorded outcome cannot be replaced by a second one', (await outcome(restrict.id, { result: 'SUCCEEDED', method: 'MANUAL_ATTESTATION', evidence_reference: 'Later confirmation.', note: 'Second attempt.' })).status, 409);
  const rewriteOutcome = await db.query(`UPDATE app.rights_request_outcomes SET result='SUCCEEDED' WHERE request_id=$1`, [restrict.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('the database refuses to rewrite a recorded outcome', rewriteOutcome, 'REJECTED');
  const dropPlanItem = await db.query('DELETE FROM app.rights_request_plan_items WHERE request_id=$1', [restrict.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('a system with a recorded outcome cannot be dropped from the plan', dropPlanItem, 'REJECTED');
  check('re-scoping cannot change the action a system was already executed under', (await scopeIt(restrict.id, [], 'RESTRICT_PROCESSING')).status, 409);
  const omitted = await staff.call(`/api/v1/admin/rights-requests/${restrict.id}/scope`, {
    items: [{ system_id: otherSystemForPlan.id, action: 'NO_ACTION_REQUIRED', retention_exception: null, note: 'Replacing the plan entirely.' }],
    unresolved_destinations: [],
  }, key());
  check('re-scoping cannot discard a system whose outcome was recorded', omitted.status, 409);
  check('re-scoping that keeps the executed system unchanged is permitted', (await scopeIt(restrict.id)).status, 200);

  // --- FR-M14-03: mandates --------------------------------------------------
  phase = 'mandates';
  const mandate = S.Mandate.parse(await (await staff.call('/api/v1/admin/mandates', {
    kind: 'GUARDIAN', principal_id: principal, representative_reference: 'Synthetic guardian',
    permitted_rights: ['ACCESS'], valid_from: later(-24), valid_to: later(48), evidence_reference: 'Recorded guardianship attestation.',
  }, key())).json());
  check('a guardian mandate is a distinct kind with its own permitted rights', [mandate.kind, mandate.permitted_rights, mandate.state], ['GUARDIAN', ['ACCESS'], 'ACTIVE']);
  const badWindow = await staff.call('/api/v1/admin/mandates', {
    kind: 'NOMINATION', principal_id: principal, representative_reference: 'Synthetic nominee',
    permitted_rights: ['ACCESS'], valid_from: later(48), valid_to: later(24), evidence_reference: 'Invalid window.',
  }, key());
  check('a mandate cannot end before it begins', badWindow.status, 400);

  const mandated = await request('ACCESS', mandate.id);
  check('a request under a mandate is not treated as self authority', mandated.authority, 'MANDATED');
  const outOfScope = await request('ERASURE', mandate.id);
  check('a mandate does not authorise a right it does not name', outOfScope.authority, 'NOT_ESTABLISHED');

  // A mandate authorises only while it is current.
  const expired = S.Mandate.parse(await (await staff.call('/api/v1/admin/mandates', {
    kind: 'NOMINATION', principal_id: principal, representative_reference: 'Synthetic lapsed nominee',
    permitted_rights: ['ACCESS'], valid_from: later(-48), valid_to: later(-24), evidence_reference: 'Lapsed attestation.',
  }, key())).json());
  const lapsed = await request('ACCESS', expired.id);
  check('an expired mandate does not carry authority', lapsed.authority, 'MANDATE_EXPIRED');

  phase = 'revocation';
  await transition(mandated.id, 'PENDING_VERIFICATION');
  await review(mandated.id, 'EXACT', 1);
  await transition(mandated.id, 'VERIFIED');
  await advanceToApproval(mandated.id);
  const revoked = S.Mandate.parse(await (await staff.call(`/api/v1/admin/mandates/${mandate.id}/revoke`, { reason: 'Guardianship ended by order of the court.' }, key())).json());
  check('a revocation records when and why', [revoked.state, revoked.revoked_at !== null, revoked.revocation_reason !== null], ['REVOKED', true, true]);
  const afterRevocation = S.RightsRequest.parse(await (await staff.call(`/api/v1/admin/rights-requests/${mandated.id}`)).json());
  check('revoking a mandate immediately withdraws authority from its open requests', afterRevocation.authority, 'MANDATE_REVOKED');
  check('a revoked authority blocks new execution', (await transition(mandated.id, 'EXECUTING')).status, 403);
  check('a revoked mandate stays revoked on retry', (await staff.call(`/api/v1/admin/mandates/${mandate.id}/revoke`, { reason: 'Attempting to revoke a second time.' }, key())).status, 409);

  // --- approval binding -----------------------------------------------------
  phase = 'approval binding';
  const rebind = await request('ACCESS');
  await transition(rebind.id, 'PENDING_VERIFICATION');
  await review(rebind.id, 'EXACT', 1);
  await transition(rebind.id, 'VERIFIED');
  await advanceToApproval(rebind.id);
  const rescoped = S.RightsRequest.parse(await (await scopeIt(rebind.id, ['A destination discovered after approval'])).json());
  check('changing scope after approval sends the request back for approval', rescoped.state, 'SCOPING');

  // --- history --------------------------------------------------------------
  phase = 'history';
  const events = await db.query('SELECT count(*)::int AS n FROM app.rights_request_events WHERE request_id=$1', [closed.id]);
  check('every transition is recorded in append-only history', events.rows[0].n >= 6, true);
  const rewrite = await db.query(`UPDATE app.rights_request_events SET reason='Rewritten' WHERE request_id=$1`, [closed.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('request history cannot be rewritten', rewrite, 'REJECTED');
  const erase = await db.query('DELETE FROM app.rights_request_events WHERE request_id=$1', [closed.id]).then(() => 'ACCEPTED').catch(() => 'REJECTED');
  check('request history cannot be deleted', erase, 'REJECTED');

  // --- authority boundary ---------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read rights requests', (await auditor.call('/api/v1/admin/rights-requests')).status, 200);
  check('an auditor cannot create a rights request',
    (await auditor.call('/api/v1/admin/rights-requests', { right_type: 'ACCESS', principal_id: principal, submitted_channel: 'PORTAL', mandate_id: null, description: 'Auditor attempt.' }, key())).status, 403);
  const member = await h.login('member');
  check('a member without the rights capability is refused', (await member.call('/api/v1/admin/rights-requests')).status, 403);

  writeEvidence('rights-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('rights-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
