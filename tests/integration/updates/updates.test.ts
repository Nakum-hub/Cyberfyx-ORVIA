// WP27 / M31 Updates integration suite.
// Under test: eligibility is not permission to execute, rollback is never
// offered when the schema cannot give it, and an update is recorded as applied
// only when the ledger says every step succeeded.
import assert from 'node:assert/strict';
import { randomUUID, generateKeyPairSync, sign } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import { canonicalJson } from '../../../packages/contracts/src/crypto.ts';
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
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'ACCEPTED').catch(() => 'REJECTED');

// The release signer this installation was started with. The fixture signs with
// the same key, so the suite exercises real verification rather than a bypass.
const keyId = process.env.ORVIA_RELEASE_KEY_ID;
const privateKeyPem = process.env.ORVIA_RELEASE_PRIVATE_KEY;
if (!keyId || !privateKeyPem) throw new Error('This suite requires the fixture release key pair in the environment');
const privateKey = { key: Buffer.from(privateKeyPem, 'base64'), format: 'der' as const, type: 'pkcs8' as const };
const untrusted = generateKeyPairSync('ed25519');

const commit = 'a'.repeat(40);
const builtAt = new Date(Date.now() - 3_600_000).toISOString();
const claimsFor = (version: string, overrides: Record<string, unknown> = {}) => ({
  release_id: randomUUID(), version, published_at: new Date().toISOString(),
  audience: 'ORVIA_CUSTOMER_INSTALLATION', minimum_upgradable_from: '0.0.0',
  supported_profiles: ['CUSTOMER_LOCAL_SYNTHETIC'],
  artifact_digest: 'e'.repeat(64), artifact_bytes: 4_000_000,
  archive: [{ path: 'packages/domain/src/updates/updates.ts', bytes: 12_000 }, { path: 'packages/db/migrations/0026_example.sql', bytes: 3_000 }],
  dependencies: [{ name: 'pg', version: '8.16.3', digest: 'f'.repeat(64) }],
  provenance: { source_commit: commit, built_at: builtAt, builder_reference: 'Synthetic build SYN-BLD-0001.', reviewed_by_reference: 'Synthetic review SYN-REV-0001.' },
  migrations: [{ migration: '0026_example', irreversible: false, note: 'Adds a nullable column.' }],
  introduces_network_egress: false, requires_model_runtime: false, introduces_capabilities: [],
  ...overrides,
});
function signRelease(claims: Record<string, unknown>, options: { signer?: 'untrusted'; tamper?: boolean } = {}) {
  const signingKey = options.signer === 'untrusted' ? untrusted.privateKey : privateKey;
  const signed = options.tamper ? { ...claims, version: '9.9.9' } : claims;
  return {
    algorithm: 'Ed25519' as const, claims,
    signing_key_id: options.signer === 'untrusted' ? randomUUID() : keyId,
    signature: sign(null, Buffer.from(canonicalJson(signed)), signingKey).toString('base64url'),
  };
}

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;   // ORG_ADMIN: update.read only
  const owner = scenario.owner;    // ORG_SUPER_ADMIN: also update.approve

  const importIt = (claims: Record<string, unknown>, options: { signer?: 'untrusted'; tamper?: boolean } = {}, as = owner) =>
    as.call('/api/v1/admin/releases', { release: signRelease(claims, options) }, key());
  const eligibilityOf = async (id: string) => S.UpdateEligibility.parse(await (await staff.call(`/api/v1/admin/releases/${id}/eligibility`)).json());
  const blocking = (e: Awaited<ReturnType<typeof eligibilityOf>>) => e.checks.filter(c => !c.satisfied).map(c => c.check);

  // --- FR-M31-04: what a manifest is not able to declare ----------------------
  phase = 'prohibited claims';
  for (const [what, overrides] of [
    ['new network egress', { introduces_network_egress: true }],
    ['a model runtime', { requires_model_runtime: true }],
    ['an authority that does not exist in this contract', { introduces_capabilities: ['vendor.remote.access'] }],
    ['an audience other than a customer installation', { audience: 'ORVIA_VENDOR_FLEET' }],
  ] as const) check(`a release declaring ${what} is refused before any signature is considered`,
    (await importIt(claimsFor('1.0.0', overrides))).status, 400);
  check('a release published before it was built is refused',
    (await importIt(claimsFor('1.0.0', { published_at: new Date(Date.parse(builtAt) - 60_000).toISOString() }))).status, 400);

  // --- FR-M31-01: provenance, and a manifest that cannot be edited -------------
  phase = 'import';
  check('importing a release needs its own authority, not merely read access',
    (await importIt(claimsFor('0.1.0'), {}, staff)).status, 403);
  check('a release from an untrusted signer is refused', await fieldCodes(await importIt(claimsFor('0.1.0'), { signer: 'untrusted' })), ['untrusted_origin']);
  check('a release whose claims were altered after signing is refused', await fieldCodes(await importIt(claimsFor('0.1.0'), { tamper: true })), ['invalid_signature']);

  const irreversibleClaims = claimsFor('0.1.0', {
    migrations: [{ migration: '0026_example', irreversible: false, note: 'Adds a nullable column.' },
      { migration: '0027_rewrite', irreversible: true, note: 'Rewrites a column in place; the previous values are not retained.' }],
  });
  const releaseA = S.ReleaseState.parse(await (await importIt(irreversibleClaims)).json());
  check('the stored release names its provenance and its irreversible migrations',
    [releaseA.provenance.source_commit, releaseA.dependency_count, releaseA.migration_count, releaseA.irreversible_migrations],
    [commit, 1, 2, ['0027_rewrite']]);
  check('re-importing the same release is a replay, not a new release', await fieldCodes(await importIt(irreversibleClaims)), ['replayed']);
  check('a different release claiming a version already imported is refused',
    await fieldCodes(await importIt(claimsFor('0.1.0'))), ['replayed']);
  check('a release manifest is never edited',
    await direct(`UPDATE app.release_manifests SET artifact_bytes=1 WHERE id=$1`, [releaseA.id]), 'REJECTED');
  check('a release manifest is never removed', await direct('DELETE FROM app.release_manifests WHERE id=$1', [releaseA.id]), 'REJECTED');

  // --- FR-M31-02: eligibility, reported check by check -------------------------
  phase = 'eligibility';
  const eligibleA = await eligibilityOf(releaseA.id);
  check('every check is named exactly once', eligibleA.checks.map(c => c.check).sort(),
    ['ARCHIVE_ENTRIES_SAFE', 'AUDIENCE_MATCH', 'NO_PROHIBITED_CHANGE', 'NO_UNSAFE_DOWNGRADE',
      'PROFILE_SUPPORTED', 'SIGNATURE_VALID', 'TRUSTED_ORIGIN', 'UPGRADE_PATH_SUPPORTED']);
  check('every check reports its own reason', eligibleA.checks.every(c => c.reason.length > 10), true);
  check('an eligible release says so, and says that is not permission to execute',
    [eligibleA.eligible, eligibleA.eligibility_is_not_permission_to_execute, eligibleA.installed_version],
    [true, true, S.PRODUCT_VERSION]);
  check('trust is re-evaluated here rather than inherited from the import',
    eligibleA.limits.some(l => l.includes('withdrawn key')), true);

  phase = 'individual gates';
  const gate = async (version: string, overrides: Record<string, unknown>) => {
    const state = S.ReleaseState.parse(await (await importIt(claimsFor(version, overrides))).json());
    return blocking(await eligibilityOf(state.id));
  };
  check('a release whose archive escapes the target directory is blocked on that gate alone',
    await gate('0.3.0', { archive: [{ path: '../../etc/orvia.conf', bytes: 100 }] }), ['ARCHIVE_ENTRIES_SAFE']);
  check('an absolute archive path is blocked the same way',
    await gate('0.4.0', { archive: [{ path: '/etc/orvia.conf', bytes: 100 }] }), ['ARCHIVE_ENTRIES_SAFE']);
  check('a declared expansion implausibly larger than the artifact is refused as a bomb',
    await gate('0.5.0', { artifact_bytes: 1000, archive: [{ path: 'payload.bin', bytes: 900_000_000 }] }), ['ARCHIVE_ENTRIES_SAFE']);
  check('a release that cannot be applied from this version names the upgrade path',
    await gate('0.6.0', { minimum_upgradable_from: '9.0.0' }), ['UPGRADE_PATH_SUPPORTED']);
  check('the only deployment profile this contract admits is the one that is supported',
    S.ReleaseClaims.safeParse(claimsFor('0.7.0', { supported_profiles: ['VENDOR_HOSTED'] })).success, false);

  phase = 'withdrawn key';
  // Written straight to the table as the migrator, so it never passed import.
  // This is the withdrawn-key case: a stored manifest whose signer this
  // installation no longer trusts must become ineligible rather than stay
  // eligible because it verified once.
  const strangerId = randomUUID();
  await db.query(
    `INSERT INTO app.release_manifests(tenant_id,legal_entity_id,environment_id,id,release_id,version,published_at,artifact_digest,artifact_bytes,signing_key_id,signature,claims,imported_by)
     SELECT tenant_id,legal_entity_id,environment_id,$1,$2,'0.8.0',now(),$3,4000000,$4,$5,$6::jsonb,imported_by FROM app.release_manifests WHERE id=$7`,
    [strangerId, randomUUID(), 'e'.repeat(64), randomUUID(), 'x'.repeat(86), JSON.stringify(claimsFor('0.8.0')), releaseA.id]);
  check('a manifest signed by a key this installation does not trust is ineligible, however it got here',
    (await eligibilityOf(strangerId)).checks.filter(c => !c.satisfied).map(c => c.check).sort(), ['SIGNATURE_VALID', 'TRUSTED_ORIGIN']);

  // --- FR-M31-03: recovery is derived, never chosen ----------------------------
  phase = 'recovery mode';
  check('one irreversible migration makes the whole update forward-recovery only',
    [eligibleA.recovery_mode, eligibleA.rollback_available], ['FORWARD_RECOVERY_ONLY', false]);
  check('the eligibility says plainly why rollback is not offered',
    eligibleA.limits.some(l => l.includes('would not work')), true);
  const plan = (id: string, acknowledged: string, as = owner) =>
    as.call(`/api/v1/admin/releases/${id}/plan`, { approval_note: 'Approved after reviewing the manifest and the migration notes.', acknowledged_recovery_mode: acknowledged }, key());
  check('planning an update needs its own authority, separate from reading eligibility',
    (await plan(releaseA.id, 'FORWARD_RECOVERY_ONLY', staff)).status, 403);
  check('an approver who acknowledged the wrong recovery is refused',
    await fieldCodes(await plan(releaseA.id, 'REVERSIBLE')), ['recovery_mode_mismatch']);
  const planA = S.UpdatePlan.parse(await (await plan(releaseA.id, 'FORWARD_RECOVERY_ONLY')).json());
  check('the approved plan carries the derived recovery mode and offers no rollback',
    [planA.state, planA.recovery_mode, planA.rollback_available, planA.outstanding_steps.length], ['APPROVED', 'FORWARD_RECOVERY_ONLY', false, 7]);
  check('the recovery instruction tells the operator to go forward, not back',
    planA.recovery_instruction.includes('forward only'), true);
  check('a second update while one is in flight is refused',
    await fieldCodes(await plan(releaseA.id, 'FORWARD_RECOVERY_ONLY')), ['update_already_in_flight']);
  check('recovery mode cannot be relaxed after approval',
    await direct(`UPDATE app.update_plans SET recovery_mode='REVERSIBLE' WHERE id=$1`, [planA.id]), 'REJECTED');

  // --- the ledger --------------------------------------------------------------
  phase = 'ledger';
  const step = (planId: string, body: Record<string, unknown>, as = owner) =>
    as.call(`/api/v1/admin/update-plans/${planId}/steps`, body, key());
  const succeed = (planId: string, name: string, as = owner) =>
    step(planId, { step: name, state: 'SUCCEEDED', evidence_reference: `Synthetic evidence for ${name}.`, note: `${name} completed.` }, as);
  check('a step claiming success without naming its evidence is refused by the schema',
    (await step(planA.id, { step: 'VERIFY_TRUSTED_ORIGIN', state: 'SUCCEEDED', evidence_reference: null, note: 'No evidence.' })).status, 400);
  check('a step reported before the steps it depends on names what is missing',
    await fieldCodes(await succeed(planA.id, 'RUN_CORE_REGRESSION')), ['out_of_order:verify_trusted_origin']);
  check('recording a step needs the approval authority, not merely read access',
    (await succeed(planA.id, 'VERIFY_TRUSTED_ORIGIN', staff)).status, 403);
  await succeed(planA.id, 'VERIFY_TRUSTED_ORIGIN');
  check('the same step cannot succeed twice', await fieldCodes(await succeed(planA.id, 'VERIFY_TRUSTED_ORIGIN')), ['step_already_succeeded']);
  const applying = S.UpdatePlan.parse(await (await succeed(planA.id, 'VERIFY_ARTIFACT_DIGEST')).json());
  check('a plan part way through is applying, and says what is still outstanding',
    [applying.state, applying.outstanding_steps], ['APPLYING', ['UNPACK_ARTIFACT', 'APPLY_MIGRATIONS', 'RESTART_SERVICES', 'REVALIDATE_BOUNDARIES', 'RUN_CORE_REGRESSION']]);
  check('neither post-change check has passed, and the plan does not pretend otherwise',
    applying.post_change_verification, { boundaries_revalidated: false, core_regression_passed: false });

  check('the database refuses to record an update as applied while the ledger is short',
    await direct(`UPDATE app.update_plans SET state='APPLIED' WHERE id=$1`, [planA.id]), 'REJECTED');
  check('the migration ledger is append-only',
    await direct(`UPDATE app.update_steps SET state='SUCCEEDED' WHERE plan_id=$1`, [planA.id]), 'REJECTED');
  check('a recorded step is never deleted', await direct('DELETE FROM app.update_steps WHERE plan_id=$1', [planA.id]), 'REJECTED');

  phase = 'failure';
  const failed = S.UpdatePlan.parse(await (await step(planA.id,
    { step: 'UNPACK_ARTIFACT', state: 'FAILED', evidence_reference: 'Synthetic unpack log SYN-UPD-0001.', note: 'An archive entry did not match its declared size.' })).json());
  check('a failed step leaves the plan failed with its evidence intact',
    [failed.state, failed.steps.length, failed.outstanding_steps.length], ['FAILED', 3, 5]);
  check('a finished plan records nothing further', await fieldCodes(await succeed(planA.id, 'UNPACK_ARTIFACT')), ['plan_already_finished']);
  check('a finished plan does not change state again',
    await direct(`UPDATE app.update_plans SET state='APPLYING' WHERE id=$1`, [planA.id]), 'REJECTED');
  check('a failed update recorded no new installed version',
    (await db.query('SELECT count(*)::int AS n FROM app.installation_versions WHERE plan_id=$1', [planA.id])).rows[0].n, 0);

  // --- an update that actually completes ---------------------------------------
  phase = 'apply';
  const releaseB = S.ReleaseState.parse(await (await importIt(claimsFor('0.2.0'))).json());
  const eligibleB = await eligibilityOf(releaseB.id);
  check('a release with no irreversible migration is reversible and offers rollback',
    [eligibleB.eligible, eligibleB.recovery_mode, eligibleB.rollback_available], [true, 'REVERSIBLE', true]);
  const planB = S.UpdatePlan.parse(await (await plan(releaseB.id, 'REVERSIBLE')).json());
  let latest = planB;
  for (const name of S.UpdateStepName.options) latest = S.UpdatePlan.parse(await (await succeed(planB.id, name)).json());
  check('an update is applied only once every step has succeeded and both post-change checks passed',
    [latest.state, latest.outstanding_steps, latest.post_change_verification],
    ['APPLIED', [], { boundaries_revalidated: true, core_regression_passed: true }]);
  check('the applied update recorded the version this installation is now on',
    S.schemas.InstallationVersionList.parse(await (await staff.call('/api/v1/admin/installation-versions')).json()).items.map(v => [v.version, v.plan_id]),
    [['0.2.0', planB.id]]);
  const afterwards = await eligibilityOf(releaseA.id);
  check('a release older than what is now installed is refused as a downgrade rather than attempted',
    [afterwards.eligible, blocking(afterwards)], [false, ['NO_UNSAFE_DOWNGRADE']]);
  check('the refusal says a downgrade is refused rather than attempted',
    afterwards.checks.find(c => c.check === 'NO_UNSAFE_DOWNGRADE')!.reason.includes('refused rather than attempted'), true);

  // --- authority -------------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor holding update.read may read the release list',
    (await auditor.call('/api/v1/admin/releases')).status, 200);
  check('an auditor may not import a release', (await importIt(claimsFor('0.9.0'), {}, auditor)).status, 403);
  const member = await h.login('member');
  check('a member holding neither capability is refused', (await member.call('/api/v1/admin/releases')).status, 403);

  writeEvidence('updates-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('updates-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
