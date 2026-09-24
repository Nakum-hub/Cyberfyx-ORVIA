import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';
import { rightsExecution } from '../shared/completion.ts';
import { adapterFor, type ConnectorActionType } from '../../../../connectors/src/shared/connector-adapters.ts';

/**
 * M14 Rights Management.
 *
 * The lifecycle state is the master's vocabulary and moves only along the
 * canonical transition map. It is never the whole answer: identity, authority,
 * execution, response and scope are stored and reported independently, because
 * a request can be administratively CLOSED while execution is still partial and
 * destinations remain unreachable. This module's job is to keep those facts from
 * being flattened into a single reassuring word.
 */

type RequestRow = {
  id: string; right_type: string; principal_id: string; mandate_id: string | null; state: string;
  identity: string; identity_grade: string | null; authority: string; execution: string; response: string; scope: string;
  received_at: Date; updated_at: Date; document: { description: string; submitted_channel: string; closure_note: string | null };
};

const time = (value: Date) => value.toISOString();

async function assemble(c: Context, row: RequestRow) {
  const scope = scopeValues(c.actor);
  const items = await c.tx.query(`SELECT system_id,action,automatable,retention_exception,note FROM app.rights_request_plan_items
    WHERE ${predicate} AND request_id=$4 ORDER BY system_id`, [...scope, row.id]);
  const recorded = await c.tx.query(`SELECT system_id,result,method,evidence_reference,note,recorded_at,recorded_by
    FROM app.rights_request_outcomes WHERE ${predicate} AND request_id=$4 ORDER BY system_id`, [...scope, row.id]);
  const unresolved = (await c.tx.query(`SELECT document->'unresolved_destinations' AS d FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...scope, row.id])).rows[0]?.d ?? [];
  const plan = items.rows.map(item => ({ system_id: item.system_id, action: item.action, automatable: item.automatable, retention_exception: item.retention_exception, note: item.note }));
  const outcomes = recorded.rows.map(outcome => ({ system_id: outcome.system_id, result: outcome.result, method: outcome.method,
    evidence_reference: outcome.evidence_reference, note: outcome.note, recorded_at: time(outcome.recorded_at), recorded_by: outcome.recorded_by }));
  return S.RightsRequest.parse({
    id: row.id, right_type: row.right_type, principal_id: row.principal_id, mandate_id: row.mandate_id,
    submitted_channel: row.document.submitted_channel, description: row.document.description,
    state: row.state, received_at: time(row.received_at), updated_at: time(row.updated_at),
    identity: row.identity, identity_grade: row.identity_grade, authority: row.authority,
    execution: row.execution, response: row.response, scope: row.scope,
    plan, outcomes, unresolved_destinations: unresolved,
    closure_note: row.document.closure_note,
  });
}

/** What execution achieved, read back from the recorded outcomes rather than
 *  from whatever an operator last clicked. Persisted so the stored row and the
 *  reported row can never disagree. */
export async function settleExecution(c: Context, id: string) {
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as RequestRow;
  const assembled = await assemble(c, row);
  const derived = rightsExecution(assembled.plan, assembled.outcomes, assembled.unresolved_destinations.length);
  // Having entered execution, "nothing recorded yet" reads as running, not as
  // never started. Every other value comes straight from the outcomes.
  const execution = derived === 'NOT_STARTED' && ['EXECUTING', 'PARTIALLY_COMPLETED'].includes(row.state) ? 'RUNNING' : derived;
  if (execution !== row.execution) await c.tx.query(`UPDATE app.rights_requests SET execution=$4,updated_at=clock_timestamp() WHERE ${predicate} AND id=$5`, [...scope, execution, id]);
  return assemble(c, requireOne((await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as RequestRow);
}

async function lockRequest(c: Context, id: string): Promise<RequestRow> {
  return requireOne((await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scopeValues(c.actor), id])).rows) as RequestRow;
}

/** Persist the row and append the history entry in the same transaction. */
async function save(c: Context, row: RequestRow, changes: Partial<Record<'state' | 'identity' | 'identity_grade' | 'authority' | 'execution' | 'response' | 'scope', string | null>>, document: Record<string, unknown>, reason: string) {
  const scope = scopeValues(c.actor);
  const next = { ...row, ...changes };
  await c.tx.query(`UPDATE app.rights_requests SET state=$4,identity=$5,identity_grade=$6,authority=$7,execution=$8,response=$9,scope=$10,
     document=$11,updated_at=clock_timestamp() WHERE ${predicate} AND id=$12`,
  [...scope, next.state, next.identity, next.identity_grade, next.authority, next.execution, next.response, next.scope, document, row.id]);
  await c.tx.query(`INSERT INTO app.rights_request_events(tenant_id,legal_entity_id,environment_id,id,request_id,from_state,to_state,reason,actor_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [...scope, randomUUID(), row.id, row.state, next.state, reason, c.actor.actor_id]);
}

// --- mandates (FR-M14-03) ----------------------------------------------------

export async function createMandate(c: Context, input: unknown) {
  const value = S.MandateCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.principal_references WHERE ${predicate} AND id=$4`, [...scope, value.principal_id])).rows);
  // A nomination and a guardian mandate are different authorities with different
  // safeguards. Neither is a general substitute account for the principal.
  const id = randomUUID();
  const document = S.Mandate.parse({ ...value, id, state: 'ACTIVE', recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id, revoked_at: null, revocation_reason: null });
  await c.tx.query(`INSERT INTO app.representation_mandates(tenant_id,legal_entity_id,environment_id,id,kind,principal_id,state,valid_from,valid_to,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,'ACTIVE',$7,$8,$9,$10)`, [...scope, id, value.kind, value.principal_id, value.valid_from, value.valid_to, c.actor.actor_id, document]);
  await audit(c, 'mandate.create', id);
  return document;
}

export async function mandateList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document,state,revoked_at FROM app.representation_mandates WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.Mandate.parse({ ...row.document, state: row.state, revoked_at: row.revoked_at ? time(row.revoked_at) : row.document.revoked_at })), page);
}

/** A revoked relationship stays revoked; a later retry cannot resurrect it. */
export async function revokeMandate(c: Context, id: string, input: unknown) {
  const value = S.MandateRevoke.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.representation_mandates WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (row.state !== 'ACTIVE') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const revoked_at = new Date().toISOString();
  const document = S.Mandate.parse({ ...row.document, state: 'REVOKED', revoked_at, revocation_reason: value.reason });
  await c.tx.query(`UPDATE app.representation_mandates SET state='REVOKED',revoked_at=$4,revocation_reason=$5,document=$6 WHERE ${predicate} AND id=$7`, [...scope, revoked_at, value.reason, document, id]);
  // Any request still relying on this mandate loses its authority immediately.
  await c.tx.query(`UPDATE app.rights_requests SET authority='MANDATE_REVOKED',updated_at=clock_timestamp()
    WHERE ${predicate} AND mandate_id=$4 AND state NOT IN ('CLOSED','REJECTED')`, [...scope, id]);
  await audit(c, 'mandate.revoke', id);
  return document;
}

/** Authority is re-derived from the mandate's current state, never cached. */
async function currentAuthority(c: Context, mandateId: string | null, rightType: string) {
  if (!mandateId) return 'SELF' as const;
  const row = requireOne((await c.tx.query(`SELECT state,valid_from,valid_to,document FROM app.representation_mandates WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), mandateId])).rows);
  if (row.state === 'REVOKED') return 'MANDATE_REVOKED' as const;
  const now = Date.now();
  if (Date.parse(row.valid_from) > now || (row.valid_to && Date.parse(row.valid_to) <= now)) return 'MANDATE_EXPIRED' as const;
  // A mandate authorises only the rights it names; it is not general ownership.
  if (!(row.document.permitted_rights as string[]).includes(rightType)) return 'NOT_ESTABLISHED' as const;
  return 'MANDATED' as const;
}

// --- requests (FR-M14-01, FR-M14-02, FR-M14-04) ------------------------------

export async function createRequest(c: Context, input: unknown) {
  const value = S.RightsRequestCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.principal_references WHERE ${predicate} AND id=$4`, [...scope, value.principal_id])).rows);
  if (value.mandate_id) {
    const mandate = requireOne((await c.tx.query(`SELECT principal_id FROM app.representation_mandates WHERE ${predicate} AND id=$4`, [...scope, value.mandate_id])).rows);
    if (mandate.principal_id !== value.principal_id) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'mandate_id', code: 'mandate_is_for_another_principal' }]);
  }
  const authority = await currentAuthority(c, value.mandate_id, value.right_type);
  const id = randomUUID();
  const document = { description: value.description, submitted_channel: value.submitted_channel, closure_note: null, unresolved_destinations: [], state: 'RECEIVED' };
  await c.tx.query(`INSERT INTO app.rights_requests(tenant_id,legal_entity_id,environment_id,id,right_type,principal_id,mandate_id,state,authority,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,'RECEIVED',$8,$9)`, [...scope, id, value.right_type, value.principal_id, value.mandate_id, authority, document]);
  await c.tx.query(`INSERT INTO app.rights_request_events(tenant_id,legal_entity_id,environment_id,id,request_id,from_state,to_state,reason,actor_id)
    VALUES($1,$2,$3,$4,$5,NULL,'RECEIVED','Request received.',$6)`, [...scope, randomUUID(), id, c.actor.actor_id]);
  await audit(c, 'rights_request.create', id);
  return assemble(c, await lockRequest(c, id));
}

export async function requestList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  const items = [];
  for (const row of result.rows) items.push(await assemble(c, row as RequestRow));
  return paged(items, page);
}

export async function readRequest(c: Context, id: string) {
  return assemble(c, requireOne((await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows) as RequestRow);
}

/**
 * FR-M14-02. A grade is a reviewer's finding about how well a requester matched
 * source identities. AMBIGUOUS and NO_MATCH are recorded truthfully and leave the
 * request unable to disclose or destroy; they are not converted into a soft pass.
 */
export async function reviewIdentity(c: Context, id: string, input: unknown) {
  const value = S.IdentityReview.parse(input);
  const row = await lockRequest(c, id);
  if (row.state === 'CLOSED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const identity = S.BLOCKING_GRADES.includes(value.grade as never)
    ? (value.grade === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'NO_MATCH')
    : value.grade === 'PROBABLE' ? 'UNDER_REVIEW' : 'ESTABLISHED';
  const document = { ...row.document, identity_basis: value.basis, matched_reference_count: value.matched_reference_count, state: row.state };
  await save(c, row, { identity, identity_grade: value.grade }, document, `Identity reviewed as ${value.grade}: ${value.basis}`);
  await audit(c, 'rights_request.identity_review', id);
  return settleExecution(c, id);
}

/**
 * FR-M14-04. The plan names one action per system and keeps the destinations it
 * cannot reach. Re-scoping an approved request invalidates the approval by
 * returning it to SCOPING, because approval binds the exact scope it approved.
 */
export async function scopeRequest(c: Context, id: string, input: unknown) {
  const value = S.RequestScope.parse(input);
  const scope = scopeValues(c.actor);
  const row = await lockRequest(c, id);
  if (['CLOSED', 'REJECTED'].includes(row.state)) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  if (new Set(value.items.map(item => item.system_id)).size !== value.items.length) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'items', code: 'duplicate_system' }]);
  const connectors = new Map<string, string>();
  const adapters = new Map<string, string | null>();
  for (const item of value.items) {
    const system = requireOne((await c.tx.query(`SELECT connector FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, item.system_id])).rows);
    connectors.set(item.system_id, system.connector);
    adapters.set(item.system_id, (await c.tx.query(`SELECT adapter FROM app.connector_bindings WHERE ${predicate} AND system_id=$4 AND valid_to IS NULL`, [...scope, item.system_id])).rows[0]?.adapter ?? null);
  }
  // Work already performed cannot be un-planned. A system with a recorded outcome
  // must still appear, with the same action it was executed under; otherwise the
  // new plan would quietly erase the record of what was done to it.
  const executed = await c.tx.query(`SELECT p.system_id,p.action FROM app.rights_request_plan_items p
    JOIN app.rights_request_outcomes o ON o.tenant_id=p.tenant_id AND o.legal_entity_id=p.legal_entity_id
      AND o.environment_id=p.environment_id AND o.request_id=p.request_id AND o.system_id=p.system_id
    WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.request_id=$4`, [...scope, id]);
  const locked = new Map<string, string>(executed.rows.map(row => [row.system_id as string, row.action as string]));
  const proposed = new Map(value.items.map(item => [item.system_id, item.action]));
  for (const [systemId, action] of locked) {
    if (!proposed.has(systemId)) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'items', code: 'system_with_recorded_outcome_omitted' }]);
    if (proposed.get(systemId) !== action) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'items', code: 'action_already_executed_cannot_change' }]);
  }
  await c.tx.query(`DELETE FROM app.rights_request_plan_items WHERE ${predicate} AND request_id=$4 AND system_id<>ALL($5::uuid[])`, [...scope, id, [...locked.keys()]]);
  for (const item of value.items) {
    if (locked.has(item.system_id)) continue;
    await c.tx.query(`INSERT INTO app.rights_request_plan_items(tenant_id,legal_entity_id,environment_id,request_id,system_id,action,automatable,retention_exception,note)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [...scope, id, item.system_id, item.action, automatable(item.action, connectors.get(item.system_id)!, adapters.get(item.system_id) ?? null), item.retention_exception, item.note]);
  }
  const scopeDimension = value.unresolved_destinations.length ? 'UNRESOLVED_DESTINATIONS' : 'DETERMINED';
  const document = { ...row.document, unresolved_destinations: value.unresolved_destinations, state: row.state === 'AWAITING_APPROVAL' ? 'SCOPING' : row.state };
  // A scope change after approval is not a small edit: the approval no longer
  // describes the work, so the request goes back for approval.
  const state = row.state === 'AWAITING_APPROVAL' ? 'SCOPING' : row.state;
  await save(c, row, { state, scope: scopeDimension }, document, row.state === 'AWAITING_APPROVAL' ? 'Scope changed after approval; approval invalidated.' : 'Scope determined.');
  await audit(c, 'rights_request.scope', id);
  return settleExecution(c, id);
}

/**
 * WP08. Whether an action can be automated is a property of the connector, not
 * of the operator's opinion. Restriction is what the V1 connectors implement.
 * A system bound to a connector adapter (DPDP operations extension) is
 * automatable for exactly the operations that adapter's code declares; an
 * unbound system keeps the V1 answer, and a manual system is never automatable.
 */
const PLAN_OPERATION: Record<string, ConnectorActionType | null> = { ERASE_RECORD: 'ERASE', CORRECT_RECORD: 'CORRECT', RESTRICT_PROCESSING: 'SUPPRESS', DISCLOSE_COPY: 'READ_REFERENCE', NO_ACTION_REQUIRED: null };
function automatable(action: string, connector: string, adapter: string | null) {
  if (connector === 'LEGACY_MANUAL') return false;
  const operation = PLAN_OPERATION[action];
  if (adapter && operation) return adapterFor(adapter)?.supports(operation) ?? false;
  return action === 'RESTRICT_PROCESSING';
}

/**
 * WP08. Record what actually happened to one planned system. This is the only
 * input to the execution dimension; nothing else may move it.
 */
export async function recordOutcome(c: Context, id: string, input: unknown) {
  const value = S.SystemOutcomeRecord.parse(input);
  const scope = scopeValues(c.actor);
  const row = await lockRequest(c, id);
  if (!['EXECUTING', 'PARTIALLY_COMPLETED'].includes(row.state)) throw new AccessError(409, 'EPOCH_CONFLICT');
  const item = requireOne((await c.tx.query(`SELECT action,automatable FROM app.rights_request_plan_items WHERE ${predicate} AND request_id=$4 AND system_id=$5`, [...scope, id, value.system_id])).rows);
  // A connector cannot have performed an operation it does not implement.
  if (value.method === 'CONNECTOR_OPERATION' && !item.automatable) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'method', code: 'no_supported_connector_operation' }]);
  const existing = await c.tx.query(`SELECT 1 FROM app.rights_request_outcomes WHERE ${predicate} AND request_id=$4 AND system_id=$5`, [...scope, id, value.system_id]);
  if (existing.rowCount) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  await c.tx.query(`INSERT INTO app.rights_request_outcomes(tenant_id,legal_entity_id,environment_id,request_id,system_id,result,method,evidence_reference,note,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [...scope, id, value.system_id, value.result, value.method, value.evidence_reference, value.note, c.actor.actor_id]);
  await audit(c, 'rights_request.outcome.' + value.result.toLowerCase(), id);
  return settleExecution(c, id);
}

/** FR-M14-01. Only the canonical map permits a transition, and only established
 *  identity and current authority permit execution of a disclosing or destructive right. */
export async function transitionRequest(c: Context, id: string, input: unknown) {
  const value = S.RequestTransition.parse(input);
  const row = await lockRequest(c, id);
  const permitted = S.REQUEST_TRANSITIONS[row.state as keyof typeof S.REQUEST_TRANSITIONS];
  if (!permitted.includes(value.to)) throw new AccessError(409, 'EPOCH_CONFLICT');
  if (value.to === 'EXECUTING') {
    // Re-derive authority now rather than trusting what was stored earlier: a
    // mandate may have been revoked or expired since the request was accepted.
    const authority = await currentAuthority(c, row.mandate_id, row.right_type);
    if (authority !== 'SELF' && authority !== 'MANDATED') throw new AccessError(403, 'FORBIDDEN');
    if (S.DESTRUCTIVE_OR_DISCLOSING.includes(row.right_type as never) && row.identity !== 'ESTABLISHED') throw new AccessError(403, 'FORBIDDEN');
    if (row.scope === 'NOT_DETERMINED') throw new AccessError(409, 'EPOCH_CONFLICT');
  }
  // WP08: no transition writes the execution dimension. Execution is derived from
  // recorded per-system outcomes afterwards, so moving a ticket cannot manufacture
  // an effect. COMPLETED is gated on what those outcomes already say.
  if (value.to === 'COMPLETED') {
    const current = await assemble(c, row);
    if (rightsExecution(current.plan, current.outcomes, current.unresolved_destinations.length) !== 'COMPLETE') throw new AccessError(409, 'EPOCH_CONFLICT');
  }
  const changes: Parameters<typeof save>[2] = { state: value.to };
  // CLOSED deliberately touches no dimension. Closure is an administrative act;
  // it reaches no system and must not claim that it did.
  const document = { ...row.document, state: value.to, ...(value.to === 'CLOSED' ? { closure_note: value.reason } : {}) };
  if (value.to === 'EXECUTING') changes.authority = await currentAuthority(c, row.mandate_id, row.right_type);
  await save(c, row, changes, document, value.reason);
  await audit(c, 'rights_request.transition.' + value.to.toLowerCase(), id);
  // Closing must not move execution, and the database trigger enforces that too.
  return value.to === 'CLOSED' ? assemble(c, await lockRequest(c, id)) : settleExecution(c, id);
}

/** FR-M14-04. A response is released only after third-party redaction review, and
 *  never to a requester whose identity was not resolved. */
export async function releaseResponse(c: Context, id: string, input: unknown) {
  const value = S.ResponseRelease.parse(input);
  const row = await lockRequest(c, id);
  if (!S.DESTRUCTIVE_OR_DISCLOSING.includes(row.right_type as never)) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'right_type', code: 'right_produces_no_response_package' }]);
  if (row.identity !== 'ESTABLISHED') throw new AccessError(403, 'FORBIDDEN');
  if (!['EXECUTING', 'PARTIALLY_COMPLETED', 'COMPLETED'].includes(row.state)) throw new AccessError(409, 'EPOCH_CONFLICT');
  if (row.response === 'RELEASED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  if (Date.parse(value.expires_at) <= Date.now()) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'expires_at', code: 'already_expired' }]);
  const document = { ...row.document, state: row.state, delivery_reference: value.delivery_reference, response_expires_at: value.expires_at, third_party_redaction_reviewed: true };
  await save(c, row, { response: 'RELEASED' }, document, `Response released after third-party redaction review; expires ${value.expires_at}.`);
  await audit(c, 'rights_request.response_released', id);
  return settleExecution(c, id);
}
