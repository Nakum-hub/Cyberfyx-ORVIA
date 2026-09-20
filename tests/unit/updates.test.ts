// WP27 / M31 contract invariants. Docker-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { PRODUCT_VERSION, ReleaseClaims, UpdateEligibility, UpdatePlan, UpdateStepName, UpdateStepRecord, routes, schemas } from '../../packages/contracts/src/index.ts';
import { uuid, sampleTime } from '../../packages/contracts/src/examples.ts';
import { unsafeArchiveEntry, recoveryMode, eligibilityChecks } from '../../packages/domain/src/updates/updates.ts';

const claims = (overrides: Record<string, unknown> = {}) => ({
  release_id: uuid(700), version: '0.2.0', published_at: sampleTime,
  audience: 'ORVIA_CUSTOMER_INSTALLATION' as const, minimum_upgradable_from: '0.0.0',
  supported_profiles: ['CUSTOMER_LOCAL_SYNTHETIC' as const],
  artifact_digest: 'a'.repeat(64), artifact_bytes: 52428800,
  archive: [{ path: 'orvia/packages/db/migrations/0026_example.sql', bytes: 4096 }],
  dependencies: [{ name: 'zod', version: '4.1.13', digest: 'b'.repeat(64) }],
  provenance: { source_commit: '0'.repeat(40), built_at: sampleTime, builder_reference: 'Reproducible internal build.', reviewed_by_reference: 'Release review SYN-REL-0001.' },
  migrations: [{ migration: '0026_example', irreversible: false, note: 'Adds a nullable column.' }],
  introduces_network_egress: false as const, requires_model_runtime: false as const,
  introduces_capabilities: [] as string[],
  ...overrides,
});
const parsed = (overrides: Record<string, unknown> = {}) => ReleaseClaims.parse(claims(overrides));
const plan = (overrides: Record<string, unknown> = {}) => ({
  id: uuid(701), release_id: uuid(702), from_version: '0.1.0', to_version: '0.2.0',
  state: 'APPLYING' as const, recovery_mode: 'REVERSIBLE' as const, rollback_available: true,
  approved_at: sampleTime, approved_by: uuid(703), approval_note: 'Approved after review of the migration notes.',
  steps: [], outstanding_steps: ['RUN_CORE_REGRESSION' as const],
  post_change_verification: { boundaries_revalidated: true, core_regression_passed: false },
  recovery_instruction: 'No irreversible migration was applied, so this update can be reversed.',
  limits: ['An update is applied only when all seven steps have succeeded.'],
  ...overrides,
});

test('a release cannot declare the things an update is never allowed to introduce', () => {
  assert.equal(parsed().version, '0.2.0');
  // Each of these is a literal false in the schema, so there is no manifest,
  // however well signed, that can say otherwise.
  assert.throws(() => ReleaseClaims.parse(claims({ introduces_network_egress: true })));
  assert.throws(() => ReleaseClaims.parse(claims({ requires_model_runtime: true })));
  // The capability vocabulary is this contract's own and closed, so a release
  // cannot introduce an authority that does not already exist here.
  assert.throws(() => ReleaseClaims.parse(claims({ introduces_capabilities: ['vendor.remote.access'] })));
  assert.throws(() => ReleaseClaims.parse(claims({ introduces_capabilities: ['AI_COPILOT'] })));
  assert.throws(() => ReleaseClaims.parse(claims({ audience: 'ORVIA_VENDOR_CONSOLE' })));
  // And it cannot smuggle instructions in alongside the description.
  for (const smuggled of [{ post_install_script: 'curl https://vendor.example' }, { enable_remote_support: true }, { telemetry_endpoint: 'https://vendor.example' }]) {
    assert.throws(() => ReleaseClaims.parse(claims(smuggled)), new RegExp('.'), `${Object.keys(smuggled)[0]} was accepted into a manifest`);
  }
});

test('a manifest cannot claim to have been published before it was built', () => {
  assert.throws(() => ReleaseClaims.parse(claims({ provenance: { ...claims().provenance, built_at: '2027-01-01T00:00:00.000Z' } })));
  assert.throws(() => ReleaseClaims.parse(claims({ archive: [{ path: 'a', bytes: 1 }, { path: 'a', bytes: 2 }] })));
  assert.throws(() => ReleaseClaims.parse(claims({ migrations: [{ migration: '0026_example', irreversible: false, note: 'One.' }, { migration: '0026_example', irreversible: true, note: 'Again.' }] })));
});

test('an archive path that escapes the target directory is refused before anything is written', () => {
  assert.equal(unsafeArchiveEntry('orvia/packages/db/migrations/0026_example.sql'), null);
  assert.equal(unsafeArchiveEntry('a/b/c.txt'), null);
  assert.equal(unsafeArchiveEntry('/etc/passwd'), 'absolute path');
  assert.equal(unsafeArchiveEntry('\\\\server\\share'), 'absolute path');
  assert.equal(unsafeArchiveEntry('C:/Windows/System32/x.dll'), 'drive-qualified path');
  assert.equal(unsafeArchiveEntry('orvia\\packages\\x'), 'backslash separator');
  assert.equal(unsafeArchiveEntry('orvia/../../etc/passwd'), 'parent traversal');
  assert.equal(unsafeArchiveEntry('..'), 'parent traversal');
  assert.equal(unsafeArchiveEntry('orvia//x'), 'empty path segment');
  assert.equal(unsafeArchiveEntry('orvia/x\0.sql'), 'embedded null');
});

test('one irreversible migration decides the recovery mode for the whole update', () => {
  assert.equal(recoveryMode(parsed()), 'REVERSIBLE');
  assert.equal(recoveryMode(parsed({ migrations: [
    { migration: '0026_example', irreversible: false, note: 'Adds a nullable column.' },
    { migration: '0027_example', irreversible: true, note: 'Drops a superseded table.' },
  ] })), 'FORWARD_RECOVERY_ONLY');
  // An update with no migrations at all is reversible, because nothing changed
  // that could fail to reverse.
  assert.equal(recoveryMode(parsed({ migrations: [] })), 'REVERSIBLE');
});

test('every update check is named once, and each one alone is enough to refuse', () => {
  const pass = eligibilityChecks(parsed(), '0.1.0', true, true);
  assert.equal(pass.length, 8);
  assert.equal(new Set(pass.map(check => check.check)).size, 8);
  assert.ok(pass.every(check => check.satisfied));
  const blocked = (checks: ReturnType<typeof eligibilityChecks>) => checks.filter(check => !check.satisfied).map(check => check.check);
  assert.deepEqual(blocked(eligibilityChecks(parsed(), '0.1.0', false, true)), ['SIGNATURE_VALID']);
  assert.deepEqual(blocked(eligibilityChecks(parsed(), '0.1.0', true, false)), ['TRUSTED_ORIGIN']);
  // A downgrade is refused rather than attempted, however it is signed.
  assert.deepEqual(blocked(eligibilityChecks(parsed({ version: '0.0.1' }), '0.2.0', true, true)), ['NO_UNSAFE_DOWNGRADE']);
  // The same version is not a downgrade, but it is not an upgrade either.
  assert.deepEqual(blocked(eligibilityChecks(parsed({ version: '0.1.0' }), '0.1.0', true, true)), ['NO_UNSAFE_DOWNGRADE']);
  assert.deepEqual(blocked(eligibilityChecks(parsed({ minimum_upgradable_from: '0.5.0' }), '0.1.0', true, true)), ['UPGRADE_PATH_SUPPORTED']);
  assert.deepEqual(blocked(eligibilityChecks(parsed({ archive: [{ path: '../escape.sh', bytes: 10 }] }), '0.1.0', true, true)), ['ARCHIVE_ENTRIES_SAFE']);
  // A declared expansion implausibly larger than the artifact is a bomb.
  assert.deepEqual(blocked(eligibilityChecks(parsed({ artifact_bytes: 1000, archive: [{ path: 'big.bin', bytes: 4000000000 }] }), '0.1.0', true, true)), ['ARCHIVE_ENTRIES_SAFE']);
  assert.deepEqual(blocked(eligibilityChecks(parsed({ introduces_capabilities: ['graph.write'] }), '0.1.0', true, true)), []);
});

test('an ineligible release is never reported as eligible, and rollback follows the recovery mode', () => {
  const base = {
    release_id: uuid(700), release_version: '0.2.0', installed_version: '0.1.0', evaluated_at: sampleTime,
    eligible: true, checks: eligibilityChecks(parsed(), '0.1.0', true, true),
    recovery_mode: 'REVERSIBLE' as const, rollback_available: true,
    eligibility_is_not_permission_to_execute: true as const, limits: [],
  };
  assert.equal(UpdateEligibility.parse(base).eligible, true);
  const failing = eligibilityChecks(parsed(), '0.1.0', false, true);
  assert.throws(() => UpdateEligibility.parse({ ...base, checks: failing }), new RegExp('.'), 'eligible was accepted with a failing check');
  assert.equal(UpdateEligibility.parse({ ...base, checks: failing, eligible: false }).eligible, false);
  // The reassuring answer this module exists to refuse.
  assert.throws(() => UpdateEligibility.parse({ ...base, recovery_mode: 'FORWARD_RECOVERY_ONLY', rollback_available: true }),
    new RegExp('.'), 'rollback was offered for a forward-recovery-only update');
  assert.throws(() => UpdateEligibility.parse({ ...base, eligibility_is_not_permission_to_execute: false }));
  // Eight named checks, not seven with one silently dropped.
  assert.throws(() => UpdateEligibility.parse({ ...base, checks: base.checks.slice(0, 7) }));
  assert.throws(() => UpdateEligibility.parse({ ...base, checks: [...base.checks.slice(0, 7), base.checks[0]!] }));
});

test('an update is applied only when nothing is outstanding and both post-change checks passed', () => {
  assert.equal(UpdatePlan.parse(plan()).state, 'APPLYING');
  // Every way of claiming an applied update without the evidence for it.
  assert.throws(() => UpdatePlan.parse(plan({ state: 'APPLIED' })), new RegExp('.'), 'applied was accepted with a step outstanding');
  assert.throws(() => UpdatePlan.parse(plan({ state: 'APPLIED', outstanding_steps: [] })),
    new RegExp('.'), 'applied was accepted without core regression');
  assert.throws(() => UpdatePlan.parse(plan({ state: 'APPLIED', outstanding_steps: [], post_change_verification: { boundaries_revalidated: false, core_regression_passed: true } })),
    new RegExp('.'), 'applied was accepted without boundary revalidation');
  const applied = plan({ state: 'APPLIED', outstanding_steps: [], post_change_verification: { boundaries_revalidated: true, core_regression_passed: true } });
  assert.equal(UpdatePlan.parse(applied).state, 'APPLIED');
  // And the converse: a finished, verified update cannot be reported as still
  // interrupted, which would understate rather than overstate but is equally untrue.
  assert.throws(() => UpdatePlan.parse({ ...applied, state: 'INTERRUPTED' }));
  assert.throws(() => UpdatePlan.parse(plan({ recovery_mode: 'FORWARD_RECOVERY_ONLY' })));
});

test('a step that claims success must name the evidence for the claim', () => {
  assert.equal(UpdateStepRecord.parse({ step: 'APPLY_MIGRATIONS', state: 'RUNNING', evidence_reference: null, note: 'Started.' }).state, 'RUNNING');
  assert.throws(() => UpdateStepRecord.parse({ step: 'RUN_CORE_REGRESSION', state: 'SUCCEEDED', evidence_reference: null, note: 'All good.' }));
  assert.equal(UpdateStepRecord.parse({ step: 'RUN_CORE_REGRESSION', state: 'SUCCEEDED', evidence_reference: 'Regression run SYN-REG-0001.', note: 'Passed.' }).state, 'SUCCEEDED');
  // A failure does not have to name evidence, because the failure is the record.
  assert.equal(UpdateStepRecord.parse({ step: 'UNPACK_ARTIFACT', state: 'FAILED', evidence_reference: null, note: 'Digest mismatch.' }).state, 'FAILED');
  // Boundary revalidation and core regression are steps, not optional extras.
  assert.ok(UpdateStepName.options.includes('REVALIDATE_BOUNDARIES'));
  assert.ok(UpdateStepName.options.includes('RUN_CORE_REGRESSION'));
  assert.equal(UpdateStepName.options.length, 7);
});

test('executing an update needs its own authority, separate from reading about one', () => {
  const update = routes.filter(route => route.capability?.startsWith('update.'));
  assert.equal(update.length, 7);
  assert.deepEqual(update.filter(route => route.capability === 'update.approve').map(route => route.id).sort(),
    ['import_release', 'plan_update', 'record_update_step']);
  for (const route of update) {
    assert.equal(route.authority, 'STAFF', `${route.id} is not staff-only`);
    if (route.method === 'post') assert.ok(route.idempotency, `${route.id} is a write without idempotency`);
    assert.ok(schemas[route.response], `${route.id} has no registered response schema`);
  }
  // Nothing here fetches or executes on its own: there is no endpoint a vendor
  // could reach to push an update, and none that downloads anything.
  assert.ok(!update.some(route => ['download', 'fetch', 'apply_now', 'push'].some(word => route.id.includes(word))));
  assert.equal(PRODUCT_VERSION.split('.').length, 3);
});
