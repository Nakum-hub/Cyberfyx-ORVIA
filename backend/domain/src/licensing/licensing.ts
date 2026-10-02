import { randomUUID, createPublicKey, verify, type KeyObject } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { canonicalJson } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
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

/** Features this release actually ships. Availability is a fact about the build. SSO is not delivered yet (GO_LIVE D1). */
const RELEASED: readonly string[] = S.EntitlementCode.options.filter(code => code !== 'SSO_IDENTITY');
/** Features the current deployment profile can actually run. */
const SUPPORTED_ON_PROFILE: readonly string[] = RELEASED;
/** Features deliberately held back from general use in this profile. */
const HELD_BACK: readonly string[] = ['PRIVACY_TEST_ENGINE'];
/** The capability an actor needs before a feature is usable by them (rev 1.11 tier model). */
const REQUIRED_CAPABILITY: Record<string, string> = Object.fromEntries(S.EntitlementCode.options.map(code => [code, S.ENTITLEMENTS[code].capability]));

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
  // Revision 1.11: an edition carries only its own tier's entitlements, so an issuing mistake cannot open a higher tier.
  const ceiling = S.editionCeiling(claims.edition);
  if (claims.entitlements.some(code => !ceiling.has(code))) reject('ENTITLEMENT_EXCEEDS_EDITION');
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
  const sequence = claims.sequence ?? null;
  const term = claims.term ?? 'CONTRACT';
  const trial = claims.trial ?? false;
  // A sequenced licence may arrive before it starts (a downgrade or period change effective at renewal): it waits until
  // valid_from (migration 0100). A licence issued before revision 1.11 still has to be valid on import.
  if (sequence === null && Date.parse(claims.valid_from) > now) reject('NOT_YET_VALID');
  if (Date.parse(claims.valid_to) <= now) reject('EXPIRED');

  // A licence is imported once. Re-importing the same one is a replay, not a renewal.
  const existing = await c.tx.query(`SELECT id FROM app.licences WHERE ${predicate} AND licence_id=$4`, [...scope, claims.licence_id]);
  if (existing.rowCount) reject('REPLAYED');
  // Anti-rollback and one trial per edition. The database refuses both as well (licence_import_guard); checking here gives the
  // operator a named reason.
  const history = (await c.tx.query(`SELECT max(sequence) AS top, bool_or(sequence IS NOT NULL) AS sequenced, bool_or(trial AND edition=$4) AS trial_used
    FROM app.licences WHERE ${predicate}`, [...scope, claims.edition])).rows[0];
  if ((sequence === null && history.sequenced) || (sequence !== null && history.top !== null && sequence <= Number(history.top))) reject('STALE_SEQUENCE');
  if (trial && history.trial_used) reject('TRIAL_ALREADY_USED');

  const id = randomUUID();
  // A licence issued before revision 1.11 supersedes the previous one by deactivating it, as before. Sequenced licences need
  // no deactivation: the effective licence is the highest sequence in force, and a trial overlays the paid licence.
  if (sequence === null) await c.tx.query(`UPDATE app.licences SET active=false WHERE ${predicate} AND active`, [...scope]);
  await c.tx.query(`INSERT INTO app.licences(tenant_id,legal_entity_id,environment_id,id,licence_id,installation_id,edition,valid_from,valid_to,signing_key_id,signature,imported_by,claims,term,sequence,trial)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
  [...scope, id, claims.licence_id, claims.installation_id, claims.edition, claims.valid_from, claims.valid_to, licence.signing_key_id, licence.signature, c.actor.actor_id, claims, term, sequence, trial]);
  for (const entitlement of claims.entitlements) {
    await c.tx.query('INSERT INTO app.licence_entitlements(tenant_id,legal_entity_id,environment_id,licence_row_id,code) VALUES($1,$2,$3,$4,$5)', [...scope, id, entitlement]);
  }
  await audit(c, 'licence.import', id);
  return (await readLicenceState(c))!;
}

async function readLicenceState(c: Context) {
  const scope = scopeValues(c.actor);
  // The licence in force (migration 0100): a trial overlay while its window is open, otherwise the paid licence with its grace.
  const row = (await c.tx.query('SELECT * FROM app.effective_licence($1,$2,$3)', scope)).rows[0];
  if (!row) return null;
  const meta = (await c.tx.query(`SELECT active, imported_at, imported_by, installation_id FROM app.licences WHERE ${predicate} AND id=$4`, [...scope, row.id])).rows[0];
  const entitlements = await c.tx.query(`SELECT code FROM app.licence_entitlements WHERE ${predicate} AND licence_row_id=$4 ORDER BY code`, [...scope, row.id]);
  const fallback = row.fallback_id ? (await c.tx.query(`SELECT licence_id, edition, valid_to FROM app.licences WHERE ${predicate} AND id=$4`, [...scope, row.fallback_id])).rows[0] : null;
  const lifecycle = row.lifecycle as 'ACTIVE' | 'GRACE' | 'EXPIRED';
  const expired = lifecycle === 'EXPIRED';
  return S.LicenceState.parse({
    licence_id: row.licence_id, edition: row.edition, entitlements: entitlements.rows.map(e => e.code),
    installation_id: meta.installation_id, valid_from: time(row.valid_from), valid_to: time(row.valid_to),
    licensed_limits: (row.claims as { licensed_limits: unknown }).licensed_limits,
    term: row.term, sequence: row.sequence ?? null, trial: row.trial, lifecycle, grace_until: time(row.grace_until),
    falls_back_to: fallback ? { licence_id: fallback.licence_id, edition: fallback.edition, valid_to: time(fallback.valid_to) } : null,
    imported_at: time(meta.imported_at), imported_by: meta.imported_by, active: meta.active, expired,
    // FR-M28-03. Expiry restricts new work. It never removes recorded evidence,
    // and it never takes away the ability to read and export what already exists.
    continuity_note: expired
      ? 'This licence has expired. New work in licensed features is blocked; your legal duties, protective controls, recorded evidence, reading and export remain available.'
      : lifecycle === 'GRACE'
        ? `This licence ended on ${time(row.valid_to).slice(0, 10)}. Everything keeps working until ${time(row.grace_until).slice(0, 10)}; import the renewal before then.`
        : row.trial
          ? `This is a trial until ${time(row.valid_to).slice(0, 10)}. It then returns to ${fallback ? `your ${fallback.edition} licence` : 'no licence'}; anything recorded during the trial stays readable.`
          : 'Expiry restricts new work only. Your legal duties, recorded evidence, reading and export are never withdrawn by a licence.',
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
  // Exported for enforcement (rev 1.11): the same set the report shows is the set the server enforces.
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
        reason: !licence ? 'No licence has been imported.' : licence.expired ? 'The active licence has expired.' : licensed.has(feature) ? 'Named by the active licence.' : `Not in your plan. Part of ${S.ENTITLEMENTS[feature].tier}.` },
      { gate: 'ACTOR_AUTHORISATION' as const, satisfied: c.actor.capabilities.includes(required),
        reason: c.actor.capabilities.includes(required) ? `This actor holds ${required}.` : `This actor does not hold ${required}.` },
    ];
    return S.FeatureAvailability.parse({
      feature, usable: gates.every(gate => gate.satisfied), gates,
      tier: S.ENTITLEMENTS[feature].tier, label: S.ENTITLEMENTS[feature].label, value: S.ENTITLEMENTS[feature].value,
      limits: ['Every gate is evaluated independently. A feature is usable only when all five pass.'],
    });
  });
  // Licensed limits against what this installation actually holds. Neither
  // environments nor staff members are created by any route in this build --
  // both come from the protected local bootstrap -- so a limit cannot be
  // exceeded by using the product, and enforcement would have nothing to act
  // on. Drift past a limit is still real, though, and nothing was reporting it.
  //
  // Environments are counted for this organisation; staff come from the scoped
  // identity view, because orvia_app cannot read staff_auth directly.
  const limit_usage = [];
  if (licence) {
    const environments = Number((await c.tx.query(
      `SELECT count(*)::int AS n FROM app.environments WHERE tenant_id=$1 AND legal_entity_id=$2`,
      [c.actor.scope.tenant_id, c.actor.scope.legal_entity_id])).rows[0].n);
    const staff = Number((await c.tx.query(
      'SELECT active_identities AS n FROM app.local_identity_summary')).rows[0]?.n ?? 0);
    limit_usage.push({
      limit: 'ENVIRONMENTS' as const, licensed: licence.licensed_limits.environments,
      observed: environments, within: environments <= licence.licensed_limits.environments,
      counted: 'Environments recorded for this organisation, across every tenant scope it owns.',
    }, {
      limit: 'STAFF_MEMBERS' as const, licensed: licence.licensed_limits.staff_members,
      observed: staff, within: staff <= licence.licensed_limits.staff_members,
      counted: 'Active staff identities in this scope, read from the scoped identity summary rather than from the identity store directly.',
    });
    const seats = licence.licensed_limits.member_seats;
    if (seats !== undefined) {
      const members = Number((await c.tx.query('SELECT active_members AS n FROM app.local_identity_summary')).rows[0]?.n ?? 0);
      limit_usage.push({ limit: 'MEMBER_SEATS' as const, licensed: seats, observed: members, within: members <= seats,
        counted: 'Active MEMBER and AUDITOR logins in this scope. Owner and administrator logins are not counted. Unlike the other limits, this one is enforced when a member is created or reactivated.' });
    }
  }
  return S.EntitlementReport.parse({
    as_of: new Date().toISOString(), licence, features,
    limit_usage, a_limit_is_reported_and_never_enforced_here: true,
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

/**
 * Revision 1.11 enforcement. Called by the dispatcher inside the business transaction, after the capability check, for every
 * route. Reads, platform routes and protective writes pass whatever the licence says. Any other write needs its entitlement:
 *   * a FOUNDATION entitlement needs a licence that was imported and names it, in any lifecycle state: the legal floor keeps
 *     working after expiry (an installation that has never been licensed has no plan at all);
 *   * a higher-tier entitlement needs the licence in force (ACTIVE or GRACE) to name it; after expiry it stops.
 * A refusal names the entitlement and the lowest tier that includes it, so the interface can say which plan unlocks it.
 */
export async function requireEntitlement(c: Context, route: { id: string; method: string; path: string; authority: string }) {
  const cls = S.classifyRoute(route);
  if (cls === null) throw new AccessError(403, 'FORBIDDEN', [{ field: 'entitlement', code: 'route_not_classified' }]);
  if (cls === 'READ' || cls === 'PLATFORM' || cls === 'PROTECTIVE') return;
  const row = (await c.tx.query('SELECT id, lifecycle FROM app.effective_licence($1,$2,$3)', scopeValues(c.actor))).rows[0];
  const refuse = (why: string): never => { throw new AccessError(403, 'FORBIDDEN', [{ field: 'entitlement', code: why }, { field: 'entitlement_code', code: cls.toLowerCase() }, { field: 'tier', code: S.ENTITLEMENTS[cls].tier.toLowerCase() }]); };
  if (!row) refuse('no_licence');
  // Through the scope-bound definer function: the actor need not hold licence.read to be covered by the licence (0101).
  const named = (await c.tx.query('SELECT app.licence_names_entitlement($1,$2) AS named', [row.id, cls])).rows[0].named;
  if (!named) refuse('entitlement_required');
  if (!coversNewWork(cls, row.lifecycle)) refuse('licence_expired');
}

/** The licence rule shared by enforcement and the plan summary: may new work use this entitlement under that licence? */
function coversNewWork(code: S.EntitlementCodeValue, lifecycle: string) { return S.ENTITLEMENTS[code].tier === 'FOUNDATION' || lifecycle !== 'EXPIRED'; }

/**
 * Revision 1.11 plan summary for the interface: which plan is in force and which entitlements new work may use, decided by
 * the same rule as requireEntitlement. Readable by every staff member (overview.read), so locked items are shown honestly to
 * everyone rather than discovered by a refusal.
 */
export async function planSummary(c: Context) {
  const row = (await c.tx.query('SELECT id, edition, term, trial, lifecycle, valid_to, grace_until, fallback_id, claims FROM app.effective_licence($1,$2,$3)', scopeValues(c.actor))).rows[0];
  const profile = (await c.tx.query(`SELECT sdf_status FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 1`, scopeValues(c.actor))).rows[0];
  const sdf = profile?.sdf_status === 'DESIGNATED';
  const usage = (await c.tx.query('SELECT websites, connected_systems, member_seats FROM app.plan_usage()')).rows[0];
  const limitsOf = (claims: { licensed_limits?: Record<string, number> } | null) => (['websites', 'connected_systems', 'member_seats'] as const)
    .map(name => ({ name, licensed: typeof claims?.licensed_limits?.[name] === 'number' ? claims.licensed_limits[name]! : null, used: usage[name] as number }));
  if (!row) return S.PlanSummary.parse({ as_of: time(new Date()), licensed: false, edition: null, term: null, trial: false, lifecycle: null, valid_to: null, grace_until: null, falls_back_to: null, usable: [], significant_data_fiduciary: sdf, limits: limitsOf(null) });
  const codes = (await c.tx.query('SELECT app.licence_entitlement_codes($1) AS codes, app.licence_row_edition($2) AS fallback', [row.id, row.fallback_id])).rows[0];
  const named = S.EntitlementCode.options.filter(code => (codes.codes as string[]).includes(code) && coversNewWork(code, row.lifecycle));
  const fallback = row.fallback_id ? { edition: codes.fallback } : null;
  return S.PlanSummary.parse({
    as_of: time(new Date()), licensed: true, edition: row.edition, term: row.term, trial: row.trial, lifecycle: row.lifecycle,
    valid_to: time(row.valid_to), grace_until: time(row.grace_until), falls_back_to: fallback?.edition ?? null, usable: named, significant_data_fiduciary: sdf, limits: limitsOf(row.claims),
  });
}

/**
 * Rev 1.11 runner check. Scheduled work for a gated feature (discovery, classification, AI monitoring) runs only while the
 * licence in force covers it, by the same rule as requireEntitlement. Uncovered work is not failed or discarded: it stays
 * queued and resumes when a licence covering it is imported. Protective work (withdrawal propagation, rights and breach
 * deadlines, outbound notifications already approved) never calls this.
 */
export async function licenceCovers(c: Context, code: S.EntitlementCodeValue) {
  const row = (await c.tx.query('SELECT id, lifecycle FROM app.effective_licence($1,$2,$3)', scopeValues(c.actor))).rows[0];
  if (!row || !coversNewWork(code, row.lifecycle)) return false;
  return Boolean((await c.tx.query('SELECT app.licence_names_entitlement($1,$2) AS named', [row.id, code])).rows[0].named);
}

/**
 * Rev 1.11 hard limits, checked by the dispatcher after the entitlement, in the same transaction as the creation. Only the
 * resources a plan is sized by are limited here: websites under the cookie banner and connected systems. A limit the licence
 * does not state is not enforced (licences issued before 1.11). Data Principals, consents and rights requests are never
 * limited, and nothing here can refuse a withdrawal, a rights request or a breach report.
 */
const LIMITED: Record<string, { limit: 'websites' | 'connected_systems'; count: string; extra?: (id: string | undefined, input: unknown) => unknown }> = {
  create_cmp_site: { limit: 'websites', count: `SELECT count(*)::int AS n FROM app.cmp_sites WHERE ${predicate} AND state<>'DISABLED'` },
  enable_cmp_site: { limit: 'websites', count: `SELECT count(*)::int AS n FROM app.cmp_sites WHERE ${predicate} AND state<>'DISABLED' AND id<>$4`, extra: id => id },
  // Starting again for an already connected system resumes it (one connection per system), so it never counts twice.
  start_connection: { limit: 'connected_systems', count: `SELECT count(*)::int AS n FROM app.connections WHERE ${predicate} AND system_id<>$4::uuid`, extra: (_id, input) => (input as { system_id?: string })?.system_id ?? '00000000-0000-0000-0000-000000000000' },
};
export const LIMITED_ROUTES: readonly string[] = Object.keys(LIMITED);
export async function requireLimit(c: Context, route: { id: string }, id?: string, input?: unknown) {
  const rule = LIMITED[route.id];
  if (!rule) return;
  const row = (await c.tx.query('SELECT claims FROM app.effective_licence($1,$2,$3)', scopeValues(c.actor))).rows[0];
  const licensed = row?.claims?.licensed_limits?.[rule.limit];
  if (typeof licensed !== 'number') return;
  // Serialise concurrent creations in this scope so two requests cannot both take the last place.
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`orvia.limit.${rule.limit}.${scopeValues(c.actor).join('.')}`]);
  const used = (await c.tx.query(rule.count, rule.extra ? [...scopeValues(c.actor), rule.extra(id, input)] : scopeValues(c.actor))).rows[0].n as number;
  if (used >= licensed) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'limit', code: 'plan_limit_reached' }, { field: 'limit_name', code: rule.limit }, { field: 'licensed', code: String(licensed) }]);
}
