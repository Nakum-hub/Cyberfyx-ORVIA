import { randomUUID, createPublicKey, verify, type KeyObject } from 'node:crypto';
import * as S from '../../../contracts/src/index.ts';
import { canonicalJson } from '../../../contracts/src/crypto.ts';
import { AccessError } from '../../../authz/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M31 Updates.
 *
 * Two separations carry this module. The first is between being allowed to
 * fetch a release and being allowed to run it: eligibility is computed and
 * reported, and applying is a second explicit act by a second capability that
 * re-runs every check.
 *
 * The second is between recovery and rollback. A manifest that declares an
 * irreversible migration forces forward recovery, and the schema will not let
 * this module say otherwise — rollback_available is derived, not chosen, and a
 * plan that claims both is rejected before it reaches the wire.
 *
 * An update is applied only when all seven steps have succeeded, including
 * boundary revalidation and core regression. That is enforced by a trigger as
 * well as here, so an interrupted run stays visibly interrupted.
 */

/** Every step, in the order they must happen. */
const STEPS = S.UpdateStepName.options;
/** The two that exist because FR-M31-04 requires the boundaries to be rerun. */
const POST_CHANGE = ['REVALIDATE_BOUNDARIES', 'RUN_CORE_REGRESSION'] as const;

const time = (value: Date) => value.toISOString();
const ordinal = (version: string) => version.split('.').map(Number);

/** Strictly newer, compared component by component rather than as a string. */
function isNewer(candidate: string, installed: string) {
  const [a, b] = [ordinal(candidate), ordinal(installed)];
  for (let i = 0; i < 3; i += 1) { if (a[i]! !== b[i]!) return a[i]! > b[i]!; }
  return false;
}
function isAtLeast(candidate: string, minimum: string) {
  const [a, b] = [ordinal(candidate), ordinal(minimum)];
  for (let i = 0; i < 3; i += 1) { if (a[i]! !== b[i]!) return a[i]! > b[i]!; }
  return true;
}

/**
 * Safe unpacking, as a pure decision about one declared entry. An archive is
 * described in the signed manifest, so this runs before anything is written:
 * a path that escapes the target directory is refused at plan time rather than
 * discovered at extract time.
 */
export function unsafeArchiveEntry(path: string): string | null {
  if (path.startsWith('/') || path.startsWith('\\')) return 'absolute path';
  if (/^[A-Za-z]:/.test(path)) return 'drive-qualified path';
  if (path.includes('\\')) return 'backslash separator';
  if (path.split('/').some(segment => segment === '..')) return 'parent traversal';
  if (path.split('/').some(segment => segment === '')) return 'empty path segment';
  if (path.includes('\0')) return 'embedded null';
  return null;
}

/** A declared expansion far larger than the artifact is a decompression bomb,
 *  whoever signed it. One hundred to one is generous for source and SQL. */
const MAXIMUM_EXPANSION_RATIO = 100;

/** The vendor release signing key this installation trusts. Separate from the
 *  licence key on purpose: signing what a customer bought and signing what will
 *  execute on their machine are different trust decisions. */
function trustedRelease(): { key: KeyObject; keyId: string } | null {
  const spki = process.env.ORVIA_RELEASE_PUBLIC_KEY;
  const keyId = process.env.ORVIA_RELEASE_KEY_ID;
  if (!spki || !keyId) return null;
  try {
    const key = createPublicKey({ key: Buffer.from(spki, 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ed25519') return null;
    return { key, keyId };
  } catch { return null; }
}

function reject(reason: S.ReleaseRejectionValue): never {
  throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'release', code: reason.toLowerCase() }]);
}

// --- releases -----------------------------------------------------------------

/** FR-M31-01. A manifest is stored exactly as it was signed and never edited. */
export async function importRelease(c: Context, input: unknown) {
  const value = S.ReleaseImport.parse(input);
  const scope = scopeValues(c.actor);
  const claims = value.release.claims;
  if (claims.audience !== 'ORVIA_CUSTOMER_INSTALLATION') reject('WRONG_AUDIENCE');
  const signer = trustedRelease();
  if (!signer) throw new AccessError(503, 'SERVICE_UNAVAILABLE');
  if (value.release.signing_key_id !== signer.keyId) reject('UNTRUSTED_ORIGIN');
  let valid = false;
  try { valid = verify(null, Buffer.from(canonicalJson(claims)), signer.key, Buffer.from(value.release.signature, 'base64url')); }
  catch { reject('MALFORMED'); }
  if (!valid) reject('INVALID_SIGNATURE');
  const existing = await c.tx.query(`SELECT 1 FROM app.release_manifests WHERE ${predicate} AND (release_id=$4 OR version=$5)`, [...scope, claims.release_id, claims.version]);
  if (existing.rowCount) reject('REPLAYED');

  const id = randomUUID();
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.release_manifests(tenant_id,legal_entity_id,environment_id,id,release_id,version,published_at,artifact_digest,artifact_bytes,signing_key_id,signature,claims,imported_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [...scope, id, claims.release_id, claims.version, claims.published_at, claims.artifact_digest, claims.artifact_bytes,
      value.release.signing_key_id, value.release.signature, claims, c.actor.actor_id])).rows);
  await audit(c, 'release.import', id);
  return releaseState(row);
}

type ManifestRow = { id: string; release_id: string; version: string; published_at: Date; artifact_digest: string; artifact_bytes: string; signing_key_id: string; signature: string; claims: S.ReleaseClaimsValue; imported_at: Date; imported_by: string };

const releaseState = (row: ManifestRow) => S.ReleaseState.parse({
  id: row.id, release_id: row.release_id, version: row.version, published_at: time(row.published_at),
  artifact_digest: row.artifact_digest, artifact_bytes: Number(row.artifact_bytes),
  signing_key_id: row.signing_key_id, imported_at: time(row.imported_at), imported_by: row.imported_by,
  dependency_count: row.claims.dependencies.length, migration_count: row.claims.migrations.length,
  // Named individually, because "some migrations cannot be undone" is the whole
  // reason this update will not offer rollback.
  irreversible_migrations: row.claims.migrations.filter(m => m.irreversible).map(m => m.migration),
  provenance: row.claims.provenance,
});

export async function releaseList(c: Context, page: Page) {
  const rows = await c.tx.query(`SELECT * FROM app.release_manifests WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(rows.rows.map(releaseState), page);
}

/** The version this installation is actually on: the most recent recorded
 *  version, or the version this build declares if nothing has been applied. */
export async function installedVersion(c: Context) {
  const row = (await c.tx.query(`SELECT version FROM app.installation_versions WHERE ${predicate} ORDER BY applied_at DESC,id DESC LIMIT 1`, scopeValues(c.actor))).rows[0];
  return (row?.version as string | undefined) ?? S.PRODUCT_VERSION;
}

// --- eligibility ------------------------------------------------------------------

/**
 * FR-M31-02 and FR-M31-04. Every check is named and reported separately, so an
 * ineligible release says which gate refused it. Pure enough to be exercised
 * without a database: it takes the claims, the installed version and the signer.
 */
export function eligibilityChecks(claims: S.ReleaseClaimsValue, installed: string, signatureValid: boolean, trustedOrigin: boolean) {
  const unsafe = claims.archive.map(entry => ({ entry, reason: unsafeArchiveEntry(entry.path) })).filter(item => item.reason);
  const declared = claims.archive.reduce((total, entry) => total + entry.bytes, 0);
  const bomb = declared > claims.artifact_bytes * MAXIMUM_EXPANSION_RATIO;
  const prohibited = claims.introduces_capabilities.filter(capability => !S.Capability.options.includes(capability));
  return [
    { check: 'TRUSTED_ORIGIN' as const, satisfied: trustedOrigin,
      reason: trustedOrigin ? 'Signed by the release key this installation is configured to trust.' : 'Not signed by the configured release key.' },
    { check: 'SIGNATURE_VALID' as const, satisfied: signatureValid,
      reason: signatureValid ? 'The signature verifies over exactly these claims.' : 'The signature does not verify over these claims.' },
    { check: 'AUDIENCE_MATCH' as const, satisfied: claims.audience === 'ORVIA_CUSTOMER_INSTALLATION',
      reason: 'Issued for a customer installation.' },
    { check: 'PROFILE_SUPPORTED' as const, satisfied: claims.supported_profiles.includes(S.PROFILE),
      reason: claims.supported_profiles.includes(S.PROFILE) ? `This deployment profile is named as supported.` : `This deployment profile is not named as supported by the release.` },
    { check: 'UPGRADE_PATH_SUPPORTED' as const, satisfied: isAtLeast(installed, claims.minimum_upgradable_from),
      reason: isAtLeast(installed, claims.minimum_upgradable_from) ? `The installed version is at or above the declared minimum of ${claims.minimum_upgradable_from}.` : `This release cannot be applied below version ${claims.minimum_upgradable_from}.` },
    { check: 'ARCHIVE_ENTRIES_SAFE' as const, satisfied: unsafe.length === 0 && !bomb,
      reason: unsafe.length ? `An archive entry is unsafe to unpack: ${unsafe[0]!.reason}.` : bomb ? 'The declared expansion is implausibly larger than the artifact.' : 'Every archive path is relative and contained, and the declared expansion is plausible.' },
    { check: 'NO_PROHIBITED_CHANGE' as const, satisfied: !claims.introduces_network_egress && !claims.requires_model_runtime && prohibited.length === 0,
      reason: claims.introduces_network_egress ? 'The release declares new network egress.' : claims.requires_model_runtime ? 'The release requires a model runtime, which this product does not have.' : 'No egress, model runtime or unknown capability is introduced.' },
    { check: 'NO_UNSAFE_DOWNGRADE' as const, satisfied: isNewer(claims.version, installed),
      reason: isNewer(claims.version, installed) ? `Newer than the installed version ${installed}.` : `Version ${claims.version} is not newer than the installed ${installed}. A downgrade is refused rather than attempted.` },
  ];
}

/** FR-M31-03. Derived, never chosen. One irreversible migration decides it. */
export const recoveryMode = (claims: S.ReleaseClaimsValue) =>
  claims.migrations.some(migration => migration.irreversible) ? 'FORWARD_RECOVERY_ONLY' as const : 'REVERSIBLE' as const;

export async function updateEligibility(c: Context, id: string) {
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.release_manifests WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as ManifestRow;
  const claims = S.ReleaseClaims.parse(row.claims);
  const signer = trustedRelease();
  // Re-verified now, rather than trusted because it verified at import: a key
  // that has since been withdrawn must make an imported release ineligible.
  const trustedOrigin = signer !== null && row.signing_key_id === signer.keyId;
  let signatureValid = false;
  if (signer) { try { signatureValid = verify(null, Buffer.from(canonicalJson(claims)), signer.key, Buffer.from(row.signature, 'base64url')); } catch { signatureValid = false; } }
  const installed = await installedVersion(c);
  const checks = eligibilityChecks(claims, installed, signatureValid, trustedOrigin);
  const mode = recoveryMode(claims);
  return S.UpdateEligibility.parse({
    release_id: row.release_id, release_version: row.version, installed_version: installed,
    evaluated_at: new Date().toISOString(),
    eligible: checks.every(check => check.satisfied), checks,
    recovery_mode: mode, rollback_available: mode === 'REVERSIBLE',
    eligibility_is_not_permission_to_execute: true,
    limits: [
      'Being eligible is permission to fetch and verify, not to execute. Applying is a separate approval by a separate capability.',
      mode === 'FORWARD_RECOVERY_ONLY'
        ? 'This release declares an irreversible migration, so recovery is forward only. Rollback is not offered, because it would not work.'
        : 'No irreversible migration is declared, so reversing this release is possible.',
      'Trust is re-evaluated here rather than inherited from the import, so a withdrawn key makes an imported release ineligible.',
    ],
  });
}

// --- plans and the migration ledger -----------------------------------------------

/** FR-M31-02. Executing is a separate act: every check runs again here, and an
 *  operator who acknowledged the wrong recovery mode is refused. */
export async function planUpdate(c: Context, id: string, input: unknown) {
  const value = S.UpdatePlanCreate.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.release_manifests WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as ManifestRow;
  const eligibility = await updateEligibility(c, id);
  if (!eligibility.eligible) {
    const blocking = eligibility.checks.filter(check => !check.satisfied).map(check => ({ field: 'release', code: check.check.toLowerCase() }));
    throw new AccessError(409, 'VALIDATION_ERROR', blocking);
  }
  // The approver has to have understood which recovery they are committing to.
  // Acknowledging reversibility for an irreversible update is the single most
  // expensive misunderstanding available here, so it is refused.
  if (value.acknowledged_recovery_mode !== eligibility.recovery_mode) {
    throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'acknowledged_recovery_mode', code: 'recovery_mode_mismatch' }]);
  }
  const inflight = await c.tx.query(`SELECT 1 FROM app.update_plans WHERE ${predicate} AND state IN ('APPROVED','APPLYING','INTERRUPTED')`, scope);
  if (inflight.rowCount) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'plan', code: 'update_already_in_flight' }]);
  const planId = randomUUID();
  await c.tx.query(
    `INSERT INTO app.update_plans(tenant_id,legal_entity_id,environment_id,id,manifest_row_id,from_version,to_version,recovery_mode,approval_note,approved_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [...scope, planId, row.id, eligibility.installed_version, row.version, eligibility.recovery_mode, value.approval_note, c.actor.actor_id]);
  await audit(c, 'update_plan.approve', planId);
  return readUpdatePlan(c, planId);
}

type PlanRow = { id: string; manifest_row_id: string; from_version: string; to_version: string; state: string; recovery_mode: string; approval_note: string; approved_at: Date; approved_by: string };

async function assemblePlan(c: Context, row: PlanRow) {
  const scope = scopeValues(c.actor);
  const ledger = await c.tx.query(`SELECT * FROM app.update_steps WHERE ${predicate} AND plan_id=$4 ORDER BY recorded_at,id`, [...scope, row.id]);
  const succeeded = new Set(ledger.rows.filter(step => step.state === 'SUCCEEDED').map(step => step.step as string));
  const outstanding = STEPS.filter(step => !succeeded.has(step));
  const forward = row.recovery_mode === 'FORWARD_RECOVERY_ONLY';
  return S.UpdatePlan.parse({
    id: row.id, release_id: row.manifest_row_id, from_version: row.from_version, to_version: row.to_version,
    state: row.state, recovery_mode: row.recovery_mode, rollback_available: !forward,
    approved_at: time(row.approved_at), approved_by: row.approved_by, approval_note: row.approval_note,
    steps: ledger.rows.map(step => S.UpdateStep.parse({
      id: step.id, step: step.step, state: step.state, evidence_reference: step.evidence_reference,
      note: step.note, recorded_at: time(step.recorded_at), recorded_by: step.recorded_by,
    })),
    outstanding_steps: outstanding,
    // Reported as their own facts. A restarted service is not a verified
    // installation, and neither is a green migration.
    post_change_verification: {
      boundaries_revalidated: succeeded.has(POST_CHANGE[0]),
      core_regression_passed: succeeded.has(POST_CHANGE[1]),
    },
    recovery_instruction: forward
      ? 'Recovery is forward only. Resolve the failed step and re-record it; do not attempt to reverse the applied migrations.'
      : 'No irreversible migration was applied, so this update can be reversed to the recorded previous version.',
    limits: [
      'An update is applied only when all seven steps have succeeded. The database refuses to record it otherwise.',
      'A step that claims success names its evidence. The ledger is append-only, so a failed attempt is never tidied away.',
      forward ? 'Rollback is not offered for this update and would not work if it were.' : 'Rollback is available for this update.',
    ],
  });
}

export async function readUpdatePlan(c: Context, id: string) {
  const row = requireOne((await c.tx.query(`SELECT * FROM app.update_plans WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows) as PlanRow;
  return assemblePlan(c, row);
}

/**
 * FR-M31-03. Each step is appended, never amended. The plan state follows the
 * ledger rather than the other way round: it becomes APPLIED only when all seven
 * steps have succeeded, and a failure leaves it FAILED with the evidence intact.
 */
export async function recordUpdateStep(c: Context, id: string, input: unknown) {
  const value = S.UpdateStepRecord.parse(input);
  const scope = scopeValues(c.actor);
  const plan = requireOne((await c.tx.query(`SELECT * FROM app.update_plans WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as PlanRow;
  if (['APPLIED', 'FAILED'].includes(plan.state)) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'state', code: 'plan_already_finished' }]);
  const ledger = await c.tx.query(`SELECT step,state FROM app.update_steps WHERE ${predicate} AND plan_id=$4`, [...scope, id]);
  const succeeded = new Set(ledger.rows.filter(step => step.state === 'SUCCEEDED').map(step => step.step as string));
  if (succeeded.has(value.step)) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'step', code: 'step_already_succeeded' }]);
  // Order is part of the guarantee: regression cannot be reported before the
  // migrations it is supposed to be testing have run.
  const position = STEPS.indexOf(value.step);
  const missing = STEPS.slice(0, position).filter(step => !succeeded.has(step));
  if (missing.length) throw new AccessError(409, 'VALIDATION_ERROR', [{ field: 'step', code: `out_of_order:${missing[0]!.toLowerCase()}`.slice(0, 64) }]);

  await c.tx.query(
    `INSERT INTO app.update_steps(tenant_id,legal_entity_id,environment_id,id,plan_id,step,state,evidence_reference,note,recorded_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [...scope, randomUUID(), id, value.step, value.state, value.evidence_reference, value.note, c.actor.actor_id]);
  if (value.state === 'SUCCEEDED') succeeded.add(value.step);

  const next = value.state === 'FAILED' ? 'FAILED'
    : STEPS.every(step => succeeded.has(step)) ? 'APPLIED'
      : value.state === 'RUNNING' ? 'APPLYING' : 'APPLYING';
  await c.tx.query(`UPDATE app.update_plans SET state=$5 WHERE ${predicate} AND id=$4`, [...scope, id, next]);
  if (next === 'APPLIED') {
    await c.tx.query(`INSERT INTO app.installation_versions(tenant_id,legal_entity_id,environment_id,id,version,plan_id,note) VALUES($1,$2,$3,$4,$5,$6,$7)`,
      [...scope, randomUUID(), plan.to_version, id, 'Recorded after every update step succeeded, including boundary revalidation and core regression.']);
  }
  await audit(c, 'update_step.record', id);
  return readUpdatePlan(c, id);
}

export async function installationVersionList(c: Context, page: Page) {
  const rows = await c.tx.query(`SELECT * FROM app.installation_versions WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(rows.rows.map(row => S.InstallationVersion.parse({
    id: row.id, version: row.version, applied_at: time(row.applied_at), plan_id: row.plan_id, note: row.note,
  })), page);
}
