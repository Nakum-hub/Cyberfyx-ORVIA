import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M29 Customer Onboarding, FR-M29-03: the nine-step guided connection.
 *
 * The design decision that shapes the whole module is that a step is not a
 * tick. Four of the nine steps record a decision the customer actually made,
 * and the other five are answered by reading evidence that exists for its own
 * reasons elsewhere in the product: a recorded capability check, an approved
 * resource, a target mapping, a preview decision. Nothing here writes a
 * "step 5 complete" flag, so nothing here can be wrong about it, and a step
 * that was done stops being done if the evidence for it is withdrawn.
 *
 * The second is that a connection succeeding is not permission to change
 * anything. What was requested and what was observed are separate fields, the
 * enablement ladder only climbs, and the top rung is refused unless a real
 * check found the system able to restrict -- in the application, and again in a
 * trigger for anyone who reaches past it.
 */

const STEPS = S.ConnectionStep.options;

type ConnectionRow = {
  id: string; system_id: string; environment_kind: string; requested_capabilities: string[];
  endpoint_reference: string | null; tls_verified: boolean | null; secret_reference: string | null;
  enablement_stage: string; started_at: Date;
};

/** What each step was answered from, whether or not it is done. */
type Answer = { done: boolean; measured_from: string; outstanding: string[] };

const LIMITS = [
  'Each step reports what it was measured from. Five of the nine are answered from records kept elsewhere for their own reasons, so a step stops being done if the evidence behind it is withdrawn.',
  'A completed connection is not permission to change anything in the connected system. Requesting a capability and having one observed are separate facts, and enforcement is a separate authority again.',
  'This product never holds the connection secret. What is stored is a reference to where the customer keeps it, and there is no field here through which the secret itself could travel.',
  'This is a synthetic local connector. Connectivity and certificate verification are recorded as the customer performed them; this product did not reach the network to confirm them.',
];

/**
 * Reads everything the nine steps are measured from, in one place, so the step
 * answers below are plainly derived rather than scattered through queries.
 */
async function evidenceFor(c: Context, row: ConnectionRow) {
  const scope = scopeValues(c.actor);
  const check = (await c.tx.query(
    `SELECT supports_read,supports_restrict FROM app.system_checks WHERE ${predicate} AND system_id=$4
     ORDER BY checked_at DESC,id DESC LIMIT 1`, [...scope, row.system_id])).rows[0];
  const resources = Number((await c.tx.query(
    `SELECT count(*)::int AS n FROM app.connection_resources WHERE ${predicate} AND connection_id=$4`, [...scope, row.id])).rows[0].n);
  const mappings = Number((await c.tx.query(
    `SELECT count(*)::int AS n FROM app.target_mappings WHERE ${predicate} AND system_id=$4`, [...scope, row.system_id])).rows[0].n);
  const previews = Number((await c.tx.query(
    `SELECT count(*)::int AS n FROM app.processing_decisions WHERE ${predicate} AND system_id=$4 AND preview_only`, [...scope, row.system_id])).rows[0].n);
  return { check, resources, mappings, previews };
}

function answers(row: ConnectionRow, e: Awaited<ReturnType<typeof evidenceFor>>): Record<S.ConnectionStepValue, Answer> {
  const done = (measured_from: string): Answer => ({ done: true, measured_from, outstanding: [] });
  const not = (measured_from: string, ...outstanding: string[]): Answer => ({ done: false, measured_from, outstanding });
  return {
    // Steps 1 and 2 exist the moment the connection does: it cannot be created
    // without a system, a stated environment kind and at least one capability.
    SELECT_SYSTEM: done(`The connection names a configured system and is marked ${row.environment_kind.toLowerCase()}. Production scope was stated rather than assumed.`),
    CHOOSE_CAPABILITIES: done(`${row.requested_capabilities.join(', ')} requested. None of these is a right to update or delete; a connection cannot be started with one.`),
    CONFIGURE_CONNECTIVITY: row.endpoint_reference === null
      ? not('No endpoint and certificate result have been recorded for this connection.', 'Record the local endpoint reference and whether its certificate verified.')
      : row.tls_verified
        ? done(`Endpoint ${row.endpoint_reference} recorded, with its certificate verified.`)
        : not(`Endpoint ${row.endpoint_reference} recorded, but its certificate did not verify.`,
          'Fix the certificate and record connectivity again. Verification is not turned off to let this step pass.'),
    SCOPED_IDENTITY: row.secret_reference === null
      ? not('No scoped service identity has been recorded.', 'Have the customer provision a dedicated least-privilege account and record the reference to where its secret is held.')
      : done(`A reference to a customer-held secret is recorded. The secret itself is not in this product.`),
    // The remaining five are read from evidence kept elsewhere.
    TEST_PERMISSIONS: e.check
      ? done(`A recorded capability check observed read ${e.check.supports_read ? 'allowed' : 'denied'} and restrict ${e.check.supports_restrict ? 'allowed' : 'denied'}.`)
      : not('No capability check has been recorded against this system.', 'Run a bounded capability check on the system, which reports what is actually allowed without copying anything.'),
    SELECT_RESOURCES: e.resources > 0
      ? done(`${e.resources} data asset${e.resources === 1 ? '' : 's'} explicitly approved for this connection.`)
      : not('No data asset has been approved for this connection.', 'Approve the specific assets in scope. Discovering an asset does not approve it.'),
    REVIEW_MAPPINGS: e.mappings > 0
      ? done(`${e.mappings} target mapping${e.mappings === 1 ? '' : 's'} bind a principal and purpose to this system, each carrying its source reference.`)
      : not('No target mapping refers to this system.', 'Map the source references, identities and purposes this connection will act on.'),
    PREVIEW_AND_TEST: e.previews > 0
      ? done(`${e.previews} preview decision${e.previews === 1 ? '' : 's'} have been evaluated against this system without acting on it.`)
      : not('No preview decision has been evaluated against this system.', 'Run a decision preview so the planned effect is examined before anything is enabled.'),
    // Step 9 is done only at the top of the ladder, and the ladder is climbed
    // deliberately rather than reached by finishing the other eight.
    ENABLE_PROGRESSIVELY: row.enablement_stage === 'ENFORCE'
      ? done('This connection is in approved enforcement, which required a recorded check finding the system able to restrict.')
      : not(`This connection is at ${row.enablement_stage.toLowerCase()}.`,
        row.enablement_stage === 'OBSERVE'
          ? 'Move to coordination, and then to approved enforcement, as a separate decision under its own authority.'
          : 'Move to approved enforcement as a separate decision under its own authority.'),
  };
}

async function present(c: Context, row: ConnectionRow) {
  const e = await evidenceFor(c, row);
  const table = answers(row, e);
  const steps = STEPS.map((step, index) => ({ step, position: index + 1, ...table[step] }));
  return S.GuidedConnection.parse({
    id: row.id, system_id: row.system_id, environment_kind: row.environment_kind,
    requested_capabilities: row.requested_capabilities,
    endpoint_reference: row.endpoint_reference, tls_verified: row.tls_verified,
    secret_reference: row.secret_reference,
    steps, current_step: steps.find(s => !s.done)?.step ?? null,
    enablement_stage: row.enablement_stage,
    connection_is_not_permission_to_mutate: true,
    observed_read: e.check ? e.check.supports_read : null,
    observed_restrict: e.check ? e.check.supports_restrict : null,
    started_at: row.started_at.toISOString(),
    limits: LIMITS,
  });
}

const readConnection = async (c: Context, id: string) => requireOne<ConnectionRow>((await c.tx.query(
  `SELECT * FROM app.connections WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows);

export async function connectionList(c: Context, page: Page) {
  const rows = await c.tx.query(
    `SELECT * FROM app.connections WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  const items = [];
  for (const row of rows.rows.slice(0, page.limit + 1)) items.push(await present(c, row as ConnectionRow));
  return paged(items, page);
}

export const readGuidedConnection = async (c: Context, id: string) => present(c, await readConnection(c, id));

/** Steps 1 and 2. A connection begins read-only and says which system it is. */
export async function startConnection(c: Context, input: unknown) {
  const value = S.ConnectionStart.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, value.system_id])).rows);
  const existing = (await c.tx.query(`SELECT id FROM app.connections WHERE ${predicate} AND system_id=$4`, [...scope, value.system_id])).rows[0];
  // Resuming rather than starting beside it, so "which stage am I at" has one
  // answer for a given system.
  if (existing) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'system_id', code: 'connection_already_started' }]);
  const id = randomUUID();
  const row = requireOne<ConnectionRow>((await c.tx.query(
    `INSERT INTO app.connections(tenant_id,legal_entity_id,environment_id,id,system_id,environment_kind,requested_capabilities,started_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope, id, value.system_id, value.environment_kind, value.requested_capabilities, c.actor.actor_id])).rows);
  await audit(c, 'connection.start', id);
  return present(c, row);
}

/** Step 3. Recorded whole: an endpoint and what its certificate did. */
export async function recordConnectivity(c: Context, id: string, input: unknown) {
  const value = S.ConnectivityRecord.parse(input);
  const row = requireOne<ConnectionRow>((await c.tx.query(
    `UPDATE app.connections SET endpoint_reference=$5,tls_verified=$6,connectivity_recorded_at=clock_timestamp()
     WHERE ${predicate} AND id=$4 RETURNING *`,
    [...scopeValues(c.actor), id, value.endpoint_reference, value.tls_verified])).rows);
  await audit(c, 'connection.connectivity', id);
  return present(c, row);
}

/** Step 4. A reference to a customer-held secret, never the secret. */
export async function recordScopedIdentity(c: Context, id: string, input: unknown) {
  const value = S.ScopedIdentityRecord.parse(input);
  const row = requireOne<ConnectionRow>((await c.tx.query(
    `UPDATE app.connections SET secret_reference=$5,identity_recorded_at=clock_timestamp()
     WHERE ${predicate} AND id=$4 RETURNING *`,
    [...scopeValues(c.actor), id, value.secret_reference])).rows);
  await audit(c, 'connection.identity', id);
  return present(c, row);
}

/**
 * Step 6. An explicit allowlist. Every asset named must belong to the system
 * this connection is for, so approving a resource cannot reach past the
 * connection's own scope.
 */
export async function approveResources(c: Context, id: string, input: unknown) {
  const value = S.ResourceApproval.parse(input);
  const scope = scopeValues(c.actor);
  const row = await readConnection(c, id);
  const belong = await c.tx.query(
    `SELECT id FROM app.data_assets WHERE ${predicate} AND id=ANY($4::uuid[]) AND system_id=$5`,
    [...scope, value.data_asset_ids, row.system_id]);
  if (belong.rowCount !== new Set(value.data_asset_ids).size) {
    throw new AccessError(404, 'NOT_FOUND', [{ field: 'data_asset_ids', code: 'asset_not_in_this_connected_system' }]);
  }
  for (const asset of belong.rows) {
    await c.tx.query(
      `INSERT INTO app.connection_resources(tenant_id,legal_entity_id,environment_id,id,connection_id,data_asset_id,approved_by)
       VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT DO NOTHING`, [...scope, randomUUID(), id, asset.id, c.actor.actor_id]);
  }
  await audit(c, 'connection.resources_approved', id);
  return present(c, row);
}

/**
 * Step 9. A separate authority and a separate decision. The ladder is climbed
 * one rung at a time so that "coordinate" is a state somebody chose rather than
 * one passed through, and enforcement is refused outright unless a recorded
 * check found the system able to restrict.
 */
export async function changeEnablement(c: Context, id: string, input: unknown) {
  const value = S.EnablementChange.parse(input);
  const ladder = S.EnablementStage.options;
  const row = await readConnection(c, id);
  const from = ladder.indexOf(row.enablement_stage as S.EnablementStageValue);
  const to = ladder.indexOf(value.to);
  if (to !== from + 1) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'to', code: 'enablement_moves_one_rung_forward' }]);
  const e = await evidenceFor(c, row);
  const outstanding = STEPS.slice(0, 8).filter(step => !answers(row, e)[step].done);
  if (outstanding.length) throw new AccessError(400, 'VALIDATION_ERROR', outstanding.map(step => ({ field: 'steps', code: `incomplete_${step.toLowerCase()}` })));
  if (value.to === 'ENFORCE' && !e.check?.supports_restrict) {
    throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'to', code: 'no_check_observed_this_system_able_to_restrict' }]);
  }
  const updated = requireOne<ConnectionRow>((await c.tx.query(
    `UPDATE app.connections SET enablement_stage=$5 WHERE ${predicate} AND id=$4 RETURNING *`,
    [...scopeValues(c.actor), id, value.to])).rows);
  await audit(c, `connection.enablement.${value.to.toLowerCase()}`, id);
  return present(c, updated);
}
