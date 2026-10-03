import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * Withdrawal canaries (migration 0079). A canary is a decoy Data Principal the organisation plants in its own systems, who has
 * never consented or has withdrawn. Any attempt to market to it, address it from an ORVIA transport or record consent for it is a
 * hit: evidence that some system or person is not honouring withdrawal. The traps themselves are in the database
 * (app.canary_trap, app.canary_consent_trap); this module manages canaries, staff-reported receipts and reviews.
 */
type Row = QueryResultRow;
const canaryView = (r: Row) => X.WithdrawalCanary.parse({ id: r.id, label: r.label, principal_id: r.principal_id, principal_email: r.email, planted_in: r.planted_in, state: r.state,
  created_by: r.created_by, created_at: iso(r.created_at), activated_by: r.activated_by, activated_at: iso(r.activated_at), retired_at: iso(r.retired_at), open_hits: Number(r.open_hits ?? 0) });
const hitView = (r: Row) => X.CanaryHit.parse({ id: r.id, canary_id: r.canary_id, canary_label: r.label, source: r.source, actor_id: r.actor_id, actor_domain: r.actor_domain, system_id: r.system_id,
  detail: r.detail, evidence_reference: r.evidence_reference, observed_at: iso(r.observed_at), recorded_at: iso(r.recorded_at), reviewed_by: r.reviewed_by, reviewed_at: iso(r.reviewed_at), review_note: r.review_note });
const CANARY = `SELECT w.*, p.email, (SELECT count(*) FROM app.canary_hits h WHERE h.tenant_id=w.tenant_id AND h.legal_entity_id=w.legal_entity_id AND h.environment_id=w.environment_id AND h.canary_id=w.id AND h.reviewed_at IS NULL) AS open_hits
  FROM app.withdrawal_canaries w JOIN app.principal_references p ON p.tenant_id=w.tenant_id AND p.legal_entity_id=w.legal_entity_id AND p.environment_id=w.environment_id AND p.id=w.principal_id
  WHERE w.tenant_id=$1 AND w.legal_entity_id=$2 AND w.environment_id=$3`;
const HIT = `SELECT h.*, w.label FROM app.canary_hits h JOIN app.withdrawal_canaries w ON w.tenant_id=h.tenant_id AND w.legal_entity_id=h.legal_entity_id AND w.environment_id=h.environment_id AND w.id=h.canary_id
  WHERE h.tenant_id=$1 AND h.legal_entity_id=$2 AND h.environment_id=$3`;

async function canary(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.withdrawal_canaries WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
const read = async (c: Context, id: string) => canaryView((await c.tx.query(`${CANARY} AND w.id=$4`, [...scope(c), id])).rows[0]);

/** Whether the principal holds any granted consent in either consent model; a canary must hold none. */
async function hasGrant(c: Context, principalId: string) {
  const a = await c.tx.query(`SELECT 1 FROM app.consent_aggregates WHERE ${predicate} AND principal_id=$4 AND state='GRANTED' LIMIT 1`, [...scope(c), principalId]);
  const b = await c.tx.query(`SELECT 1 FROM app.consent_records r JOIN app.data_principals d ON d.tenant_id=r.tenant_id AND d.legal_entity_id=r.legal_entity_id AND d.environment_id=r.environment_id AND d.id=r.subject_id
    WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND d.principal_id=$4 AND r.current_status='GRANTED' LIMIT 1`, [...scope(c), principalId]);
  return Boolean(a.rowCount || b.rowCount);
}

export async function canaryList(c: Context, page: Page) {
  const rows = (await c.tx.query(`${CANARY} AND ($4::uuid IS NULL OR w.id>$4) ORDER BY w.id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(canaryView), next_cursor: paged.next_cursor };
}

export async function createCanary(c: Context, input: unknown) {
  const v = X.WithdrawalCanaryCreate.parse(input);
  if (!(await c.tx.query(`SELECT 1 FROM app.principal_references WHERE ${predicate} AND id=$4`, [...scope(c), v.principal_id])).rowCount) refuse(404, 'principal_id', 'not_found');
  if ((await c.tx.query(`SELECT 1 FROM app.withdrawal_canaries WHERE ${predicate} AND principal_id=$4 AND state<>'RETIRED'`, [...scope(c), v.principal_id])).rowCount) refuse(409, 'principal_id', 'already_a_canary');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.withdrawal_canaries(tenant_id,legal_entity_id,environment_id,id,label,principal_id,planted_in,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [...scope(c), id, v.label, v.principal_id, v.planted_in, c.actor.actor_id]);
  await audit(c, 'withdrawal_canary.create', id);
  return read(c, id);
}

export async function activateCanary(c: Context, id: string) {
  const r = await canary(c, id, true);
  if (r.state !== 'PENDING') refuse(409, 'state', 'only_a_pending_canary_is_activated');
  if (r.created_by === c.actor.actor_id) refuse(409, 'activated_by', 'activator_must_differ_from_creator');
  if (await hasGrant(c, r.principal_id)) refuse(409, 'principal_id', 'a_canary_must_hold_no_granted_consent');
  await c.tx.query(`UPDATE app.withdrawal_canaries SET state='ACTIVE', activated_by=$5, activated_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id]);
  await audit(c, 'withdrawal_canary.activate', id);
  return read(c, id);
}

export async function retireCanary(c: Context, id: string) {
  const r = await canary(c, id, true);
  if (r.state === 'RETIRED') refuse(409, 'state', 'already_retired');
  await c.tx.query(`UPDATE app.withdrawal_canaries SET state='RETIRED', retired_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id]);
  await audit(c, 'withdrawal_canary.retire', id);
  return read(c, id);
}

/** A receipt outside ORVIA (the decoy mailbox or phone received a message), recorded by staff with its evidence. */
export async function reportCanaryHit(c: Context, id: string, input: unknown) {
  const v = X.CanaryHitReport.parse(input);
  const r = await canary(c, id);
  if (r.state !== 'ACTIVE') refuse(409, 'state', 'canary_not_active');
  if (Date.parse(v.observed_at) > Date.now() + 60_000) refuse(400, 'observed_at', 'in_the_future');
  const hit = randomUUID();
  await c.tx.query(`INSERT INTO app.canary_hits(tenant_id,legal_entity_id,environment_id,id,canary_id,source,actor_id,actor_domain,system_id,detail,evidence_reference,observed_at)
    VALUES($1,$2,$3,$4,$5,'REPORTED_RECEIPT',$6,'STAFF',$7,$8,$9,$10)`, [...scope(c), hit, id, c.actor.actor_id, v.system_id, v.detail, v.evidence_reference, v.observed_at]);
  await audit(c, 'canary_hit.report', hit);
  return hitView((await c.tx.query(`${HIT} AND h.id=$4`, [...scope(c), hit])).rows[0]);
}

export async function canaryHitList(c: Context, page: Page, query: unknown) {
  const q = X.CanaryHitQuery.parse(query ?? {});
  const rows = (await c.tx.query(`${HIT} AND ($4::uuid IS NULL OR h.canary_id=$4) AND ($5::boolean IS NULL OR (h.reviewed_at IS NULL)=$5)
    AND ($6::uuid IS NULL OR (h.recorded_at, h.id) < (SELECT k.recorded_at, k.id FROM app.canary_hits k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$6))
    ORDER BY h.recorded_at DESC, h.id DESC LIMIT $7`, [...scope(c), q.canary_id ?? null, q.open === undefined ? null : q.open === 'true', page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(hitView), next_cursor: paged.next_cursor };
}

export async function reviewCanaryHit(c: Context, id: string, input: unknown) {
  const v = X.CanaryHitReview.parse(input);
  const r = (await c.tx.query(`SELECT reviewed_at FROM app.canary_hits WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  if (r.reviewed_at) refuse(409, 'state', 'already_reviewed');
  await c.tx.query(`UPDATE app.canary_hits SET reviewed_by=$5, reviewed_at=clock_timestamp(), review_note=$6 WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id, v.note]);
  await audit(c, 'canary_hit.review', id);
  return hitView((await c.tx.query(`${HIT} AND h.id=$4`, [...scope(c), id])).rows[0]);
}

/** For send admission and outbound messages: record a hit if the target is an active canary. Never reports the result. */
export async function trapCanary(c: Context, target: { principal_id?: string | null; email?: string | null }, source: 'SEND_ADMISSION' | 'OUTBOUND_MESSAGE', systemId: string | null, detail: string) {
  await c.tx.query('SELECT app.canary_trap($1,$2,$3,$4,$5)', [target.principal_id ?? null, target.email ?? null, source, systemId, detail]);
}
