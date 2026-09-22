// WP03 / WP34 / M29 Customer Onboarding integration suite, FR-M29-03.
// Under test: a step is answered from evidence rather than ticked, a connection
// succeeding is never permission to mutate, the enablement ladder only climbs,
// and enforcement is refused for a system no check found able to restrict.
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
  if (response.status !== expected) {
    console.log(`FAIL unexpected ${response.status} where ${expected} was required:`, JSON.stringify(value).slice(0, 400));
    throw new Error('Unexpected response status');
  }
  return schema.parse(value);
}
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'ACCEPTED').catch(() => 'REJECTED');
const stepOf = (c: S.GuidedConnectionValue, step: S.ConnectionStepValue) => c.steps.find(s => s.step === step)!;

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: configuration.write, no connection.enable
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also connection.enable
  const selectors = { legal_entity_id: scenario.scope.legal_entity_id, environment_id: scenario.scope.environment_id };
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];

  // A system of this suite's own, so the nine steps start from nothing and each
  // one can be watched turning over. Re-runnable: every run connects a system
  // it created, because a connection is one per system and is never deleted.
  const system = S.System.parse(await (await staff.call('/api/v1/admin/systems',
    { ...selectors, name: `onboarding_${randomUUID().slice(0, 8)}`, connector: 'SYNTHETIC_CRM' }, key())).json());

  // --- steps 1 and 2 ----------------------------------------------------------
  phase = 'start';
  const start = (input: Record<string, unknown>, as = staff) => as.call('/api/v1/admin/connections', input, key());
  check('a connection cannot be started asking for a right to change the connected system',
    (await start({ system_id: system.id, environment_kind: 'TEST', requested_capabilities: ['WRITE'] })).status, 400);
  check('a connection to a system that does not exist is refused rather than created',
    (await start({ system_id: randomUUID(), environment_kind: 'TEST', requested_capabilities: ['READ'] })).status, 404);
  const fresh = await body(S.GuidedConnection, await start(
    { system_id: system.id, environment_kind: 'TEST', requested_capabilities: ['DISCOVER', 'READ'] }));
  check('a new connection has done the two steps it could not exist without, and no more',
    [fresh.steps.filter(s => s.done).map(s => s.step), fresh.current_step],
    [['SELECT_SYSTEM', 'CHOOSE_CAPABILITIES'], 'CONFIGURE_CONNECTIVITY']);
  check('it starts in observation, with nothing observed about the system yet',
    [fresh.enablement_stage, fresh.observed_read, fresh.observed_restrict, fresh.connection_is_not_permission_to_mutate],
    ['OBSERVE', null, null, true]);
  check('a second connection to the same system resumes rather than starting beside it',
    (await start({ system_id: system.id, environment_kind: 'PRODUCTION', requested_capabilities: ['READ'] })).status, 409);

  // --- step 3: connectivity, which is recorded whole ---------------------------
  phase = 'connectivity';
  const connectivity = (input: Record<string, unknown>) =>
    staff.call(`/api/v1/admin/connections/${fresh.id}/connectivity`, input, key());
  const unverified = await body(S.GuidedConnection,
    await connectivity({ endpoint_reference: 'crm.internal:5432', tls_verified: false }), 200);
  check('an endpoint whose certificate did not verify does not complete the step, and says why',
    [stepOf(unverified, 'CONFIGURE_CONNECTIVITY').done, stepOf(unverified, 'CONFIGURE_CONNECTIVITY').outstanding.some(o => o.includes('not turned off'))],
    [false, true]);
  const connected = await body(S.GuidedConnection,
    await connectivity({ endpoint_reference: 'crm.internal:5432', tls_verified: true }), 200);
  check('a verified endpoint completes the step and moves the wizard on',
    [stepOf(connected, 'CONFIGURE_CONNECTIVITY').done, connected.current_step], [true, 'SCOPED_IDENTITY']);
  check('the database refuses an endpoint recorded without a verification result',
    await direct(`UPDATE app.connections SET tls_verified=NULL WHERE id=$1`, [fresh.id]), 'REJECTED');

  // --- step 4: a reference, never a secret -------------------------------------
  phase = 'identity';
  const identity = (secret_reference: string) =>
    staff.call(`/api/v1/admin/connections/${fresh.id}/identity`, { secret_reference }, key());
  check('something that looks like a pasted secret does not fit in the reference field',
    (await identity('AKIA' + 'Q'.repeat(140))).status, 400);
  check('a reference containing whitespace, which a copied credential block would, is refused',
    (await identity('user pass')).status, 400);
  const identified = await body(S.GuidedConnection, await identity('vault://synthetic/crm-reader'), 200);
  check('a reference to a customer-held secret completes the step',
    [stepOf(identified, 'SCOPED_IDENTITY').done, identified.secret_reference, identified.current_step],
    [true, 'vault://synthetic/crm-reader', 'TEST_PERMISSIONS']);
  check('there is no column on a connection in which a secret could be written',
    Number((await db.query(`SELECT count(*)::int AS n FROM information_schema.columns WHERE table_schema='app' AND table_name='connections'
      AND (column_name LIKE '%password%' OR column_name LIKE '%token%' OR column_name LIKE '%credential%' OR column_name='secret')`)).rows[0].n), 0);

  // --- step 5: measured from a real capability check ---------------------------
  phase = 'permissions';
  check('the step is not done because the connection says so; it is not done because no check exists',
    stepOf(identified, 'TEST_PERMISSIONS').done, false);
  await staff.call(`/api/v1/admin/systems/${system.id}/check`, {}, key());
  const checked = await body(S.GuidedConnection, await staff.call(`/api/v1/admin/connections/${fresh.id}`), 200);
  const observed = (await db.query(
    `SELECT supports_read,supports_restrict FROM app.system_checks WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND system_id=$4 ORDER BY checked_at DESC,id DESC LIMIT 1`, [...scope, system.id])).rows[0];
  check('the step reports exactly what the recorded check observed, not what was requested',
    [stepOf(checked, 'TEST_PERMISSIONS').done, checked.observed_read, checked.observed_restrict],
    [true, observed.supports_read, observed.supports_restrict]);
  check('what was asked for and what was observed stay separate facts',
    [checked.requested_capabilities, checked.requested_capabilities.includes('RESTRICT' as never)], [['DISCOVER', 'READ'], false]);

  // --- step 6: discovery is not approval ---------------------------------------
  phase = 'resources';
  const asset = S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets',
    { system_id: system.id, kind: 'DATASET', parent_id: null, name: `onboarding_${randomUUID().slice(0, 8)}`,
      description: 'Synthetic dataset used to exercise the resource allowlist.', provenance: 'ASSERTED',
      valid_from: new Date().toISOString(), categories: [] }, key())).json());
  check('an asset existing on the system does not approve it for the connection',
    stepOf(await body(S.GuidedConnection, await staff.call(`/api/v1/admin/connections/${fresh.id}`), 200), 'SELECT_RESOURCES').done, false);
  const foreign = S.DataAsset.parse(await (await staff.call('/api/v1/admin/data-assets',
    { system_id: scenario.system.id, kind: 'DATASET', parent_id: null, name: `elsewhere_${randomUUID().slice(0, 8)}`,
      description: 'Synthetic dataset on a different system.', provenance: 'ASSERTED',
      valid_from: new Date().toISOString(), categories: [] }, key())).json());
  check('an asset on another system cannot be approved into this connection',
    await fieldCodes(await staff.call(`/api/v1/admin/connections/${fresh.id}/resources`, { data_asset_ids: [foreign.id] }, key())),
    ['asset_not_in_this_connected_system']);
  const approved = await body(S.GuidedConnection,
    await staff.call(`/api/v1/admin/connections/${fresh.id}/resources`, { data_asset_ids: [asset.id] }, key()), 200);
  check('an explicitly approved asset completes the step',
    [stepOf(approved, 'SELECT_RESOURCES').done, approved.current_step], [true, 'REVIEW_MAPPINGS']);
  check('withdrawing the approval makes the step undone again, because it was measured rather than stored',
    await (async () => {
      await db.query('DELETE FROM app.connection_resources WHERE connection_id=$1 AND data_asset_id=$2', [fresh.id, asset.id]);
      const after = await body(S.GuidedConnection, await staff.call(`/api/v1/admin/connections/${fresh.id}`), 200);
      await staff.call(`/api/v1/admin/connections/${fresh.id}/resources`, { data_asset_ids: [asset.id] }, key());
      return stepOf(after, 'SELECT_RESOURCES').done;
    })(), false);

  // --- steps 7 and 8, measured from mappings and preview decisions -------------
  phase = 'mappings and preview';
  const beforeMapping = await body(S.GuidedConnection, await staff.call(`/api/v1/admin/connections/${fresh.id}`), 200);
  check('no mapping to this system means step 7 is outstanding', stepOf(beforeMapping, 'REVIEW_MAPPINGS').done, false);
  await staff.call('/api/v1/admin/target-mappings',
    { principal_id: h.users.alice!.principal_id, purpose_id: scenario.purpose.id, system_id: system.id }, key());
  const mapped = await body(S.GuidedConnection, await staff.call(`/api/v1/admin/connections/${fresh.id}`), 200);
  check('a mapping binding a principal and purpose to this system completes step 7',
    [stepOf(mapped, 'REVIEW_MAPPINGS').done, mapped.current_step], [true, 'PREVIEW_AND_TEST']);

  // --- step 9: the ladder, and what it refuses ---------------------------------
  phase = 'enablement';
  const enable = (to: string, as = owner) => as.call(`/api/v1/admin/connections/${fresh.id}/enablement`, { to }, key());
  check('configuring a connection does not carry the authority to enable it',
    (await enable('COORDINATE', staff)).status, 403);
  check('the ladder cannot be skipped', (await fieldCodes(await enable('ENFORCE'))), ['enablement_moves_one_rung_forward']);
  check('a connection with an unfinished step is not enabled, and the refusal names which step',
    await fieldCodes(await enable('COORDINATE')), ['incomplete_preview_and_test']);
  // A real preview decision against this system, which is what step 8 measures.
  // The decision itself may be ALLOW or BLOCK; what step 8 records is that the
  // planned effect was examined before anything was enabled, not that it passed.
  const preview = await staff.call('/api/v1/admin/policy/evaluate',
    { principal_id: h.users.alice!.principal_id, purpose_id: scenario.purpose.id, system_id: system.id, action: 'MARKETING_SEND' });
  check('the preview ran and acted on nothing', (await body(S.Decision, preview, 200)).preview_only, true);
  const previewed = await body(S.GuidedConnection, await staff.call(`/api/v1/admin/connections/${fresh.id}`), 200);
  check('a preview evaluated against this system completes step 8 without acting on anything',
    [stepOf(previewed, 'PREVIEW_AND_TEST').done, previewed.current_step], [true, 'ENABLE_PROGRESSIVELY']);
  const coordinating = await body(S.GuidedConnection, await enable('COORDINATE'), 200);
  check('coordination is a stage somebody chose, and it is still not permission to mutate',
    [coordinating.enablement_stage, coordinating.connection_is_not_permission_to_mutate, stepOf(coordinating, 'ENABLE_PROGRESSIVELY').done],
    ['COORDINATE', true, false]);
  check('a connection is never quietly returned to observation',
    [(await enable('OBSERVE')).status, await direct(`UPDATE app.connections SET enablement_stage='OBSERVE' WHERE id=$1`, [fresh.id])],
    [400, 'REJECTED']);

  phase = 'enforcement';
  if (observed.supports_restrict) {
    const enforcing = await body(S.GuidedConnection, await enable('ENFORCE'), 200);
    check('approved enforcement is reached only after every other step, and completes the ninth',
      [enforcing.enablement_stage, enforcing.steps.every(s => s.done), enforcing.current_step, enforcing.observed_restrict],
      ['ENFORCE', true, null, true]);
  } else {
    check('a system no check found able to restrict is refused enforcement by name',
      await fieldCodes(await enable('ENFORCE')), ['no_check_observed_this_system_able_to_restrict']);
  }
  // The guarantee that does not depend on which branch ran: the database refuses
  // enforcement for a system nothing observed able to restrict, whoever asks.
  const unrestrictable = S.System.parse(await (await staff.call('/api/v1/admin/systems',
    { ...selectors, name: `unchecked_${randomUUID().slice(0, 8)}`, connector: 'LEGACY_MANUAL' }, key())).json());
  const unchecked = await body(S.GuidedConnection, await start(
    { system_id: unrestrictable.id, environment_kind: 'TEST', requested_capabilities: ['READ'] }));
  check('the database refuses enforcement for a system no check found able to restrict',
    await direct(`UPDATE app.connections SET enablement_stage='ENFORCE' WHERE id=$1`, [unchecked.id]), 'REJECTED');
  check('a connection record is kept rather than deleted, so what was connected stays answerable',
    await direct('DELETE FROM app.connections WHERE id=$1', [unchecked.id]), 'REJECTED');

  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read a connection but may not start or change one',
    [(await auditor.call(`/api/v1/admin/connections/${fresh.id}`)).status,
      (await start({ system_id: unrestrictable.id, environment_kind: 'TEST', requested_capabilities: ['READ'] }, auditor)).status,
      (await auditor.call(`/api/v1/admin/connections/${fresh.id}/identity`, { secret_reference: 'vault://x' }, key())).status,
      (await enable('ENFORCE', auditor)).status],
    [200, 403, 403, 403]);
  const member = await h.login('member');
  check('an actor holding neither capability cannot see the connections at all',
    (await member.call('/api/v1/admin/connections')).status, 403);

  writeEvidence('onboarding-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('onboarding-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
