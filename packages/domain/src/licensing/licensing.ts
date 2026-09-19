import { randomUUID, createPublicKey, verify, type KeyObject } from 'node:crypto';
import * as S from '../../../contracts/src/index.ts';
import { canonicalJson } from '../../../contracts/src/crypto.ts';
import { AccessError } from '../../../authz/src/index.ts';
import { audit, predicate, scopeValues, type Context } from '../shared/transaction.ts';

/**
 * M27 Licensing and M28 Entitlements.
 *
 * A licence says what was bought. It is not a channel for instructions: the
 * claims schema is closed, so a licence cannot smuggle in a command, an endpoint
 * or an authority grant, and one naming a capability this product will not sell
 * is rejected outright rather than quietly ignored.
 *
 * Five independent gates must all pass before a feature is usable. Reporting
 * them individually is the point — knowing that a feature is blocked is much
 * less useful than knowing which gate blocks it.
 */

/** Features this release actually ships. Availability is a fact about the build. */
const RELEASED: readonly string[] = ['PRIVACY_GRAPH', 'RIGHTS_MANAGEMENT', 'RETENTION_MANAGEMENT', 'PROCESSOR_MANAGEMENT', 'INCIDENT_MANAGEMENT', 'COVERAGE_REPORTING', 'NOTIFICATIONS'];
/** Features the current deployment profile can actually run. */
const SUPPORTED_ON_PROFILE: readonly string[] = RELEASED;
/** Features deliberately held back from general use in this profile. */
const HELD_BACK: readonly string[] = ['PRIVACY_TEST_ENGINE'];
/** The capability an actor needs before a feature is usable by them. */
const REQUIRED_CAPABILITY: Record<string, string> = {
  PRIVACY_GRAPH: 'graph.read', RIGHTS_MANAGEMENT: 'rights.read', RETENTION_MANAGEMENT: 'retention.read',
  PROCESSOR_MANAGEMENT: 'processor.read', INCIDENT_MANAGEMENT: 'incident.read',
  COVERAGE_REPORTING: 'coverage.read', NOTIFICATIONS: 'notification.read', PRIVACY_TEST_ENGINE: 'tests.read',
};

const time = (value: Date) => value.toISOString();

/** The vendor signing key this installation trusts, supplied by configuration.
 *  There is no default and no fallback: without it, no licence verifies. */
function trustedSigner(): { key: KeyObject; keyId: string } | null {
  const spki = process.env.ORVIA_LICENCE_PUBLIC_KEY;
  const keyId = process.env.ORVIA_LICENCE_KEY_ID;
  if (!spki || !keyId) return null;
  try {
    const key = createPublicKey({ key: Buffer.from(spki, 'base64'), format: 'der', type: 'spki' });
    if (key.asymmetricKeyType !== 'ed25519') return null;
    return { key, keyId };
  } catch { return null; }
}

function reject(reason: S.LicenceRejectionValue): never {
  throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'licence', code: reason.toLowerCase() }]);
}

/**
 * FR-M27-02. Verify trusted signer, audience, signature, schema, installation
 * binding and validity locally. Every failure is a named rejection, so an
 * operator learns which check failed rather than that "something was wrong".
 */
export async function importLicence(c: Context, input: unknown, installationId: string) {
  const value = S.LicenceImport.parse(input);
  const scope = scopeValues(c.actor);
  const licence = value.licence;
  const claims = licence.claims;

  // A licence may never name a capability this product does not sell. Checked
  // before anything else, because the answer is the same however well it is signed.
  for (const entitlement of claims.entitlements as string[]) {
    if (S.NEVER_LICENSABLE.includes(entitlement)) reject('FORBIDDEN_CAPABILITY');
  }
  if (claims.audience !== 'ORVIA_CUSTOMER_INSTALLATION') reject('WRONG_AUDIENCE');
  if (claims.installation_id !== installationId) reject('WRONG_INSTALLATION');

  const signer = trustedSigner();
  if (!signer) throw new AccessError(503, 'SERVICE_UNAVAILABLE');
  if (licence.signing_key_id !== signer.keyId) reject('UNTRUSTED_SIGNER');
  let valid = false;
  try { valid = verify(null, Buffer.from(canonicalJson(claims)), signer.key, Buffer.from(licence.signature, 'base64url')); }
  catch { reject('MALFORMED'); }
  if (!valid) reject('INVALID_SIGNATURE');

  const now = Date.now();
  if (Date.parse(claims.valid_from) > now) reject('NOT_YET_VALID');
  if (Date.parse(claims.valid_to) <= now) reject('EXPIRED');

  // A licence is imported once. Re-importing the same one is a replay, not a renewal.
  const existing = await c.tx.query(`SELECT id FROM app.licences WHERE ${predicate} AND licence_id=$4`, [...scope, claims.licence_id]);
  if (existing.rowCount) reject('REPLAYED');

  const id = randomUUID();
  // A newer licence supersedes the previous one; the old row is retained.
  await c.tx.query(`UPDATE app.licences SET active=false WHERE ${predicate} AND active`, [...scope]);
  await c.tx.query(`INSERT INTO app.licences(tenant_id,legal_entity_id,environment_id,id,licence_id,installation_id,edition,valid_from,valid_to,signing_key_id,signature,imported_by,claims)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
  [...scope, id, claims.licence_id, claims.installation_id, claims.edition, claims.valid_from, claims.valid_to, licence.signing_key_id, licence.signature, c.actor.actor_id, claims]);
  for (const entitlement of claims.entitlements) {
    await c.tx.query('INSERT INTO app.licence_entitlements(tenant_id,legal_entity_id,environment_id,licence_row_id,code) VALUES($1,$2,$3,$4,$5)', [...scope, id, entitlement]);
  }
  await audit(c, 'licence.import', id);
  return (await readLicenceState(c))!;
}

async function readLicenceState(c: Context) {
  const scope = scopeValues(c.actor);
  const row = (await c.tx.query(`SELECT * FROM app.licences WHERE ${predicate} AND active`, [...scope])).rows[0];
  if (!row) return null;
  const entitlements = await c.tx.query(`SELECT code FROM app.licence_entitlements WHERE ${predicate} AND licence_row_id=$4 ORDER BY code`, [...scope, row.id]);
  const expired = (row.valid_to as Date).getTime() <= Date.now();
  return S.LicenceState.parse({
    licence_id: row.licence_id, edition: row.edition, entitlements: entitlements.rows.map(e => e.code),
    installation_id: row.installation_id, valid_from: time(row.valid_from), valid_to: time(row.valid_to),
    licensed_limits: (row.claims as { licensed_limits: unknown }).licensed_limits,
    imported_at: time(row.imported_at), imported_by: row.imported_by, active: row.active, expired,
    // FR-M28-03. Expiry restricts new work. It never removes recorded evidence,
    // and it never takes away the ability to read and export what already exists.
    continuity_note: expired
      ? 'This licence has expired. New work in licensed features is blocked; recorded evidence, reading and export remain available.'
      : 'Expiry restricts new work only. Recorded evidence, reading and export are never withdrawn by a licence.',
  });
}

/**
 * FR-M28-01. Five gates, all of which must pass. They are deliberately separate
 * concerns: what the build ships, what this deployment supports, what has been
 * rolled out, what was licensed, and what this actor may do.
 */
export async function entitlementReport(c: Context) {
  const licence = await readLicenceState(c);
  const licensed = new Set(licence && !licence.expired ? licence.entitlements : []);
  const features = S.EntitlementCode.options.map(feature => {
    const required = REQUIRED_CAPABILITY[feature]!;
    const gates = [
      { gate: 'RELEASE_AVAILABILITY' as const, satisfied: RELEASED.includes(feature),
        reason: RELEASED.includes(feature) ? 'Shipped in this release.' : 'Not shipped in this release.' },
      { gate: 'DEPLOYMENT_SUPPORT' as const, satisfied: SUPPORTED_ON_PROFILE.includes(feature),
        reason: SUPPORTED_ON_PROFILE.includes(feature) ? 'Supported on this deployment profile.' : 'Not supported on this deployment profile.' },
      { gate: 'CONTROLLED_ROLLOUT' as const, satisfied: !HELD_BACK.includes(feature),
        reason: HELD_BACK.includes(feature) ? 'Deliberately held back from general use in this profile.' : 'Not held back by a rollout control.' },
      { gate: 'LICENCE_ENTITLEMENT' as const, satisfied: licensed.has(feature),
        reason: !licence ? 'No licence has been imported.' : licence.expired ? 'The active licence has expired.' : licensed.has(feature) ? 'Named by the active licence.' : 'Not named by the active licence.' },
      { gate: 'ACTOR_AUTHORISATION' as const, satisfied: c.actor.capabilities.includes(required),
        reason: c.actor.capabilities.includes(required) ? `This actor holds ${required}.` : `This actor does not hold ${required}.` },
    ];
    return S.FeatureAvailability.parse({
      feature, usable: gates.every(gate => gate.satisfied), gates,
      limits: ['Every gate is evaluated independently. A feature is usable only when all five pass.'],
    });
  });
  return S.EntitlementReport.parse({
    as_of: new Date().toISOString(), licence, features,
    // FR-M28-04. Stated plainly so their absence reads as a commitment rather
    // than as something a bigger plan would unlock.
    never_licensable: S.NEVER_LICENSABLE.map(code => `${code}: no edition, licence or flag enables this. It is not a withheld feature.`),
    limits: [
      'A licence records what was purchased. It carries no commands, no endpoints and no authority grants, and cannot change what this product does.',
      'Expiry restricts new work in licensed features. It never removes recorded evidence, and never withdraws reading or export.',
      'Essential security behaviour and truthful outcome reporting are common to every edition and are not licensed features.',
    ],
  });
}
