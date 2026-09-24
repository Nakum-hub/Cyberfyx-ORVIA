// M32 vendor-side visibility integration suite (FR-M32-04).
// Under test: the account of everything that ever left this installation
// towards the vendor. The requirement is mostly a list of things that must not
// happen, and absences cannot be demonstrated by asserting them — so this drives
// two real disclosures through the support flow and checks that the report
// matches the records exactly, with nothing appearing that nobody approved.
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
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
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
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 201) {
  const value: unknown = await response.json();
  if (response.status !== expected) throw new Error(`Expected ${expected}, got ${response.status}: ${JSON.stringify(value).slice(0, 400)}`);
  return schema.parse(value);
}

try {
  await h.start();
  phase = 'scenario';
  await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const owner = await h.login('owner');   // holds support.approve and health.read
  const scope = [h.users.owner!.scope.tenant_id, h.users.owner!.scope.legal_entity_id, h.users.owner!.scope.environment_id];

  const visibility = async (as = owner) => {
    const response = await as.call('/api/v1/admin/vendor-visibility');
    if (response.status !== 200) throw new Error(`Vendor visibility answered ${response.status}`);
    return S.VendorVisibility.parse(await response.json());
  };

  // --- what a fresh read says before anything is disclosed ----------------------
  phase = 'baseline';
  const before = await visibility();
  check('vendor service health is an absence with a reason, never a clean bill of health',
    [before.vendor_service_health.observed, before.vendor_service_health.reason.includes('no vendor service')], [false, true]);
  check('the four statements the requirement is made of are all present',
    [before.no_automatic_telemetry_is_collected, before.no_employee_activity_is_tracked,
      before.the_absence_of_a_model_is_never_an_incident,
      before.this_states_what_was_disclosed_not_what_the_vendor_holds], [true, true, true, true]);

  // --- a case that discloses nothing --------------------------------------------
  phase = 'a case is not a disclosure';
  const quiet = await body(S.SupportCase, await owner.call('/api/v1/admin/support-cases',
    { subject: 'PERFORMANCE_DEGRADATION', gap_id: null }, key()));
  const afterQuiet = await visibility();
  check('opening a support case discloses nothing by itself',
    [afterQuiet.disclosures.length, afterQuiet.cases_with_nothing_disclosed],
    [before.disclosures.length, before.cases_with_nothing_disclosed + 1]);
  check('and the quiet case appears in no disclosure',
    afterQuiet.disclosures.some(d => d.case_id === quiet.id), false);

  // --- approved and carried ---------------------------------------------------
  phase = 'a disclosure that was carried';
  const carriedCase = await body(S.SupportCase, await owner.call('/api/v1/admin/support-cases',
    { subject: 'CONNECTOR_OBSERVATION_FAILURE', gap_id: null }, key()));
  const draftA = await body(S.DiagnosticDraft,
    await owner.call(`/api/v1/admin/support-cases/${carriedCase.id}/diagnostics`, {}, key()));
  await body(S.DiagnosticApproval, await owner.call(`/api/v1/admin/diagnostics/${draftA.id}/approval`,
    { approved_digest: draftA.payload_digest, destination: 'MANUAL_OFFLINE_TRANSFER', purpose: 'DIAGNOSE_REPORTED_FAILURE', retention_days: 30 }, key()));
  const approvalA = (await db.query(
    `SELECT id FROM app.diagnostic_approvals WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND draft_id=$4`,
    [...scope, draftA.id])).rows[0];
  await body(S.DiagnosticTransfer, await owner.call(`/api/v1/admin/diagnostic-approvals/${approvalA.id}/transfers`,
    { method: 'MANUAL_OFFLINE_TRANSFER', outcome: 'ACCEPTED', rejection_code: null,
      evidence_reference: 'Offline transfer receipt SYN-OT-0001.', note: 'Carried on removable media by the operator.' }, key()));

  // --- approved and never carried ---------------------------------------------
  phase = 'a disclosure that was not carried';
  const uncarriedCase = await body(S.SupportCase, await owner.call('/api/v1/admin/support-cases',
    { subject: 'UPDATE_FAILURE', gap_id: null }, key()));
  const draftB = await body(S.DiagnosticDraft,
    await owner.call(`/api/v1/admin/support-cases/${uncarriedCase.id}/diagnostics`, {}, key()));
  await body(S.DiagnosticApproval, await owner.call(`/api/v1/admin/diagnostics/${draftB.id}/approval`,
    { approved_digest: draftB.payload_digest, destination: 'MANUAL_OFFLINE_TRANSFER', purpose: 'DIAGNOSE_REPORTED_FAILURE', retention_days: 14 }, key()));

  const after = await visibility();
  const carried = after.disclosures.find(d => d.case_id === carriedCase.id)!;
  const uncarried = after.disclosures.find(d => d.case_id === uncarriedCase.id)!;
  check('both approvals appear, and each says whether anybody carried it',
    [carried.outcome, carried.carried_at !== null, uncarried.outcome, uncarried.carried_at], ['ACCEPTED', true, null, null]);
  check('an approval nobody carried is counted apart from one that was',
    after.approved_but_not_carried, after.disclosures.filter(d => d.carried_at === null).length);
  check('neither claims this product moved anything',
    [carried.transported_by_orvia, uncarried.transported_by_orvia], [false, false]);
  check('each names the exact payload digest that was approved',
    [carried.approved_digest, uncarried.approved_digest], [draftA.payload_digest, draftB.payload_digest]);

  // --- the report is derived from the records, not from a parallel store ---------
  phase = 'derived, not collected';
  const recorded = (await db.query(
    `SELECT count(*)::int AS n FROM app.diagnostic_approvals WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0];
  check('every approval this installation holds is accounted for, and nothing else is',
    after.disclosures.length, Math.min(Number(recorded.n), 200));
  check('the facts disclosed are exactly the observations in the payload that was approved',
    carried.facts.map(f => f.code).sort(),
    draftA.report.observations.map(o => o.code).sort());
  check('and every fact is a closed code with a window, never a sentence',
    carried.facts.every(f => S.DiagnosticCode.options.includes(f.code) && Date.parse(f.last_seen_at) >= Date.parse(f.first_seen_at)), true);

  // --- what must not be there ----------------------------------------------------
  phase = 'minimisation';
  const serialised = JSON.stringify(after);
  for (const [what, value] of [
    ['a data principal', h.users.alice!.principal_id!],
    ['a staff email address', h.users.owner!.email],
  ] as const) check(`the report does not contain ${what}`, serialised.includes(String(value)), false);
  check('it carries no field beyond the ones the schema declares',
    Object.keys(after).sort(),
    ['approved_but_not_carried', 'as_of', 'cases_with_nothing_disclosed', 'disclosures', 'limits',
      'no_automatic_telemetry_is_collected', 'no_employee_activity_is_tracked', 'profile',
      'the_absence_of_a_model_is_never_an_incident',
      'this_states_what_was_disclosed_not_what_the_vendor_holds', 'vendor_service_health']);
  // The requirement forbids a model-absence incident. This build has no model at
  // all, so the check is that nothing recorded here ever mentions one.
  check('nothing disclosed mentions a model, and no incident was raised about one lacking',
    // Scoped to what was actually disclosed: the report's own field saying a
    // model's absence is never an incident is the one place the word belongs.
    [/model|inference|embedding/i.test(JSON.stringify(after.disclosures)),
      Number((await db.query(
        `SELECT count(*)::int AS n FROM app.incidents WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
          AND document::text ~* '(model|inference|embedding)'`, scope)).rows[0].n)], [false, 0]);

  // --- authority ------------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read what the vendor was told', (await auditor.call('/api/v1/admin/vendor-visibility')).status, 200);
  const member = await h.login('member');
  check('a member without installation-health authority is refused',
    (await member.call('/api/v1/admin/vendor-visibility')).status, 403);
  check('the route is a read and accepts no body',
    (await owner.call('/api/v1/admin/vendor-visibility', { anything: true }, key())).status, 404);

  writeEvidence('vendor-visibility-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('vendor-visibility-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
