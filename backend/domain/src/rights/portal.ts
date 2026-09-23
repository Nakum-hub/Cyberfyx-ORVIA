import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * Portal self-service rights intake.
 *
 * The Act gives a data principal rights and expects the fiduciary to provide a
 * readily available means of exercising them. Until this existed, ORVIA could
 * record a rights request but only a member of staff could raise one, so the
 * person the right belongs to could not use it. Recording somebody else's
 * request on their behalf is a fallback, not the mechanism.
 *
 * Three decisions shape this, and each removes a way the feature could go wrong:
 *
 * The principal is taken from the session and never from the body. There is no
 * field on the request through which one person could raise a request about
 * another, which is the failure that would matter most here -- a self-service
 * intake that accepted a principal identifier would be a way to make requests
 * about strangers.
 *
 * The channel is not a choice. A request that arrived through the portal is
 * recorded as PORTAL, because that field is what later tells an auditor how the
 * request actually reached the organisation.
 *
 * Identity is recorded from the authentication that already happened, not
 * re-guessed by a human. The session is bound to exactly one principal
 * reference, which is an exact match to one reference by definition. Asking an
 * operator to "review" that would replace a fact with an opinion, and would
 * invite them to grade it lower or higher than the evidence supports.
 */

const PORTAL_LIMITS = [
  'This is where your request has got to inside this organisation. A state is not a promise about what the outcome will be.',
  'Only requests you made yourself appear here. A request somebody recorded on your behalf through another channel is not shown in this list.',
  'The organisation may need to contact you for more information. This page shows the recorded state and does not itself carry messages.',
];

type Row = {
  id: string; right_type: string; state: string; response: string; document: Record<string, unknown>;
  received_at: Date; updated_at: Date | null;
};

/**
 * What the requester sees. The staff record carries identity review, planned
 * actions per system and unresolved destinations; none of that is shown here.
 * It describes how the organisation is built and what it could not reach, which
 * the requester cannot act on and is not entitled to.
 */
function own(row: Row) {
  const document = row.document ?? {};
  const closed = row.state === 'CLOSED';
  return S.OwnRightsRequest.parse({
    id: row.id, right_type: row.right_type, state: row.state,
    submitted_at: row.received_at.toISOString(),
    description: String(document.description ?? ''),
    submitted_channel: 'PORTAL',
    closed_at: closed ? (row.updated_at ?? row.received_at).toISOString() : null,
    response_released: row.response === 'RELEASED',
    a_state_is_not_a_promise_about_the_outcome: true,
    limits: PORTAL_LIMITS,
  });
}

/** Only this principal's own portal requests, in both senses: raised by them,
 *  and raised here rather than recorded on their behalf elsewhere. */
const MINE = `${predicate} AND principal_id=$4 AND document->>'submitted_channel'='PORTAL'`;

export async function raiseOwnRightsRequest(c: Context, input: unknown) {
  const value = S.OwnRightsRequestCreate.parse(input);
  const scope = scopeValues(c.actor);
  const principalId = c.actor.principal_id;
  if (!principalId) throw new AccessError(403, 'FORBIDDEN', [{ field: 'principal_id', code: 'session_is_not_bound_to_a_principal' }]);

  // The session's principal must still resolve to a live reference in this
  // scope. A session outliving the reference it names would otherwise create a
  // request nobody could act on.
  requireOne((await c.tx.query(
    `SELECT id FROM app.principal_references WHERE ${predicate} AND id=$4`, [...scope, principalId])).rows);

  const id = randomUUID();
  const document = {
    description: value.description,
    submitted_channel: 'PORTAL',
    closure_note: null,
    unresolved_destinations: [],
    state: 'RECEIVED',
    // Recorded from the authentication that already happened. The portal
    // session is bound to exactly one principal reference, so this is an exact
    // match to one reference as a matter of fact rather than of judgement.
    identity_basis: 'Raised from an authenticated portal session bound to this principal reference.',
    matched_reference_count: 1,
  };
  await c.tx.query(
    `INSERT INTO app.rights_requests(tenant_id,legal_entity_id,environment_id,id,right_type,principal_id,mandate_id,state,authority,document,identity,identity_grade)
     VALUES($1,$2,$3,$4,$5,$6,NULL,'RECEIVED',$7,$8,'ESTABLISHED','EXACT')`,
    // A portal request is the person acting for themselves, so there is no
    // mandate and the authority is SELF by construction rather than by lookup.
    [...scope, id, value.right_type, principalId, 'SELF', document]);
  await c.tx.query(
    `INSERT INTO app.rights_request_events(tenant_id,legal_entity_id,environment_id,id,request_id,from_state,to_state,reason,actor_id)
     VALUES($1,$2,$3,$4,$5,NULL,'RECEIVED','Raised by the data principal in the privacy portal.',$6)`,
    [...scope, randomUUID(), id, c.actor.actor_id]);
  await audit(c, 'rights_request.raised_in_portal', id);
  return own(requireOne((await c.tx.query(
    `SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as Row);
}

export async function ownRightsRequests(c: Context, page: Page) {
  const rows = await c.tx.query(
    `SELECT * FROM app.rights_requests WHERE ${MINE} AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`,
    [...scopeValues(c.actor), c.actor.principal_id, page.cursor, page.limit + 1]);
  return paged(rows.rows.map(row => own(row as Row)), page);
}

export async function ownRightsRequest(c: Context, id: string) {
  // Scoped to this principal in the query itself, so another person's request
  // is not found rather than being found and then refused.
  return own(requireOne((await c.tx.query(
    `SELECT * FROM app.rights_requests WHERE ${MINE} AND id=$5`,
    [...scopeValues(c.actor), c.actor.principal_id, id])).rows) as Row);
}
