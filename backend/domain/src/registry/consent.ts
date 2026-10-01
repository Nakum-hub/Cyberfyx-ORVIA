import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { createWithdrawalRun } from '../operations/runs.ts';
import { emit, exists, iso, packageAt, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * Consent lifecycle (requirements s12). Consent is recorded only where it is the
 * configured condition of an activity. The record's status is derived from an
 * append-only event history; an imported event with no source timestamp stays
 * "evidence missing" and is never given one. A withdrawal creates a propagation
 * run for the systems the activity uses.
 */
const STATUS_AFTER: Record<string, string | null> = { REQUESTED: 'REQUESTED', PRESENTED: 'PRESENTED', GRANTED: 'GRANTED', DECLINED: 'DECLINED', MODIFIED: null, WITHDRAWN: 'WITHDRAWN', EXPIRED: 'EXPIRED' };

export async function createConsentRecord(c: Context, input: unknown) {
  const value = R.ConsentRecordCreate.parse(input);
  const s = scope(c);
  const subject = (await c.tx.query(`SELECT principal_id FROM app.data_principals WHERE ${predicate} AND id=$4`, [...s, value.subject_id])).rows[0];
  if (!subject) refuse(404, 'subject_id', 'not_found');
  if (value.relationship_id) {
    const rel = (await c.tx.query(`SELECT subject_id FROM app.data_principal_relationships WHERE ${predicate} AND id=$4`, [...s, value.relationship_id])).rows[0];
    if (!rel) refuse(404, 'relationship_id', 'not_found');
    if (rel.subject_id !== value.subject_id) refuse(409, 'relationship_id', 'relationship_of_another_subject');
  }
  const version = (await c.tx.query(`SELECT v.purpose_version_id,pc.code,pc.unresolved FROM app.registry_activity_versions v LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.activity_id=$4 AND v.status='CURRENT'`, [...s, value.activity_id])).rows[0];
  if (!version) refuse(404, 'activity_id', 'not_found');
  // Consent is not assumed to be the basis for all processing.
  if (version.code !== 'CONSENT' || version.unresolved) refuse(409, 'activity_id', 'consent_is_not_the_configured_condition');
  if ((value.v1_principal_id === null) !== (value.v1_purpose_id === null)) refuse(400, 'v1_purpose_id', 'portal_link_names_principal_and_purpose');
  if (value.v1_principal_id) {
    if (subject.principal_id !== value.v1_principal_id) refuse(409, 'v1_principal_id', 'portal_identity_is_not_this_subject');
    if (!(await c.tx.query(`SELECT 1 FROM app.consent_aggregates WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5`, [...s, value.v1_principal_id, value.v1_purpose_id])).rowCount) refuse(404, 'v1_purpose_id', 'no_portal_consent_record');
  }
  const id = randomUUID();
  try {
    await c.tx.query(`INSERT INTO app.consent_records(tenant_id,legal_entity_id,environment_id,id,subject_id,relationship_id,activity_id,purpose_version_id,channel,expiry_policy,v1_principal_id,v1_purpose_id,recorded_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...s, id, value.subject_id, value.relationship_id, value.activity_id, version.purpose_version_id, value.channel, value.expiry_policy, value.v1_principal_id, value.v1_purpose_id, c.actor.actor_id]);
  } catch (error) { if ((error as { code?: string }).code === '23505') refuse(409, 'activity_id', 'consent_record_exists'); throw error; }
  await audit(c, 'consent_record.create', id);
  return consentRecordView(c, id);
}

type EventInput = { event: string; occurred_at: string | null; evidence_state: string; evidence_reference: string | null; notice_version_id: string | null };
/**
 * Appends one event and re-derives the status. Returns the withdrawal run it
 * created, if any. Imported history never triggers propagation: what happened to
 * downstream systems before deployment is not known and is not re-enacted.
 */
export async function appendConsentEvent(c: Context, recordId: string, value: EventInput, source: 'OPERATOR' | 'IMPORT' | 'V1_PORTAL' | 'SOURCE_SYSTEM' | 'CONSENT_MANAGER', provenance: Record<string, unknown>, v1EventId: string | null = null) {
  const s = scope(c);
  const record = (await c.tx.query(`SELECT * FROM app.consent_records WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, recordId])).rows[0];
  if (!record) refuse(404, 'id', 'not_found');
  if (value.event === 'EXPIRED' && !record.expiry_policy) refuse(409, 'event', 'expiry_is_not_configured_for_this_record');
  if (value.notice_version_id) await exists(c, 'registry_notice_versions', value.notice_version_id, 'notice_version_id');
  const pkg = await packageAt(c, value.occurred_at ?? new Date());
  const eventId = randomUUID();
  await c.tx.query(`INSERT INTO app.consent_record_events(tenant_id,legal_entity_id,environment_id,id,record_id,event,occurred_at,actor_id,source,evidence_state,evidence_reference,notice_version_id,package_row_id,v1_event_id,provenance)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
  [...s, eventId, recordId, value.event, value.occurred_at, c.actor.actor_id, source, value.evidence_state, value.evidence_reference, value.notice_version_id, pkg?.id ?? null, v1EventId, provenance]);
  const last = (await c.tx.query(`SELECT event,notice_version_id FROM app.consent_record_events WHERE ${predicate} AND record_id=$4 AND event<>'MODIFIED' ORDER BY occurred_at ASC NULLS FIRST,recorded_at ASC`, [...s, recordId])).rows.at(-1);
  const status = last ? STATUS_AFTER[last.event] ?? record.current_status : record.current_status;
  await c.tx.query(`UPDATE app.consent_records SET current_status=$4,notice_version_id=COALESCE($5,notice_version_id),updated_at=clock_timestamp() WHERE ${predicate} AND id=$6`, [...s, status, value.notice_version_id, recordId]);
  const type = value.event === 'GRANTED' ? 'consent_granted' : value.event === 'WITHDRAWN' ? 'consent_withdrawn' : 'consent_changed';
  await emit(c, type, 'consent_record', recordId, { event: value.event, source, evidence_state: value.evidence_state });
  let runId: string | null = null;
  // The event is pinned to the package in force when it happened (above), but
  // whether it propagates depends on the package in force now: a withdrawal made
  // before the first package took effect is still a withdrawal, and must reach
  // downstream systems. With no package in force now it waits, visibly, for
  // propagatePendingWithdrawals rather than being dropped.
  if (value.event === 'WITHDRAWN' && source !== 'IMPORT' && await packageAt(c, new Date())) {
    runId = await createWithdrawalRun(c, recordId, eventId);
  }
  return { eventId, runId };
}

/**
 * Withdrawals that are recorded but have no propagation run: the latest
 * non-MODIFIED event of a record still WITHDRAWN, from any source other than an
 * import, with no run. A withdrawal later superseded by a new grant is excluded,
 * because suppressing somebody who has consented again would be wrong.
 */
const PENDING_WITHDRAWALS = `SELECT e.record_id,e.id AS event_id FROM app.consent_records r
  JOIN LATERAL (SELECT x.id,x.record_id,x.event,x.source FROM app.consent_record_events x
    WHERE x.tenant_id=r.tenant_id AND x.legal_entity_id=r.legal_entity_id AND x.environment_id=r.environment_id AND x.record_id=r.id AND x.event<>'MODIFIED'
    ORDER BY x.occurred_at DESC NULLS LAST,x.recorded_at DESC LIMIT 1) e ON true
  WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.current_status='WITHDRAWN' AND e.event='WITHDRAWN' AND e.source<>'IMPORT'
    AND NOT EXISTS(SELECT 1 FROM app.workflow_runs w WHERE w.tenant_id=r.tenant_id AND w.legal_entity_id=r.legal_entity_id AND w.environment_id=r.environment_id AND w.consent_event_id=e.id)`;

export async function pendingWithdrawalCount(c: Context) {
  return Number((await c.tx.query(`SELECT count(*) n FROM (${PENDING_WITHDRAWALS}) p`, scope(c))).rows[0].n);
}

/**
 * Creates the propagation run for each pending withdrawal once a package is in
 * force. Each record is locked and re-checked before its run is created, and the
 * one_run_per_consent_event index is the backstop against a concurrent sweep.
 */
export async function propagatePendingWithdrawals(c: Context, limit = 100) {
  if (!await packageAt(c, new Date())) return { created: [] as string[], waiting: await pendingWithdrawalCount(c) };
  const s = scope(c);
  const created: string[] = [];
  for (const row of (await c.tx.query(`${PENDING_WITHDRAWALS} ORDER BY e.id LIMIT $4`, [...s, limit])).rows) {
    await c.tx.query(`SELECT 1 FROM app.consent_records WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, row.record_id]);
    const still = (await c.tx.query(`SELECT 1 FROM (${PENDING_WITHDRAWALS}) p WHERE p.event_id=$4`, [...s, row.event_id])).rows[0];
    if (!still) continue;
    created.push(await createWithdrawalRun(c, row.record_id, row.event_id));
    await audit(c, 'consent_record.withdrawal_propagated', row.record_id);
  }
  return { created, waiting: await pendingWithdrawalCount(c) };
}

export async function recordConsentEvent(c: Context, id: string, input: unknown) {
  const value = R.ConsentEventRecord.parse(input);
  await appendConsentEvent(c, id, value, 'OPERATOR', { source: 'OPERATOR', recorded_by: c.actor.actor_id });
  await audit(c, 'consent_record.event', id);
  return consentRecordView(c, id);
}

export async function consentRecordView(c: Context, id: string) {
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.consent_records WHERE ${predicate} AND id=$4`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const events = (await c.tx.query(`SELECT * FROM app.consent_record_events WHERE ${predicate} AND record_id=$4 ORDER BY occurred_at ASC NULLS FIRST,recorded_at ASC LIMIT 100`, [...s, id])).rows;
  const runRows = (await c.tx.query(`SELECT r.id,r.consent_event_id FROM app.workflow_runs r JOIN app.consent_record_events e ON e.tenant_id=r.tenant_id AND e.legal_entity_id=r.legal_entity_id AND e.environment_id=r.environment_id AND e.id=r.consent_event_id
    WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND e.record_id=$4 ORDER BY r.created_at LIMIT 20`, [...s, id])).rows;
  const runs = runRows.map(r => r.id as string);
  const cm = (await c.tx.query(`SELECT m.id, m.name, m.board_registration_number, m.status, l.artefact_reference FROM app.consent_manager_links l JOIN app.consent_managers m ON m.tenant_id=l.tenant_id AND m.legal_entity_id=l.legal_entity_id AND m.environment_id=l.environment_id AND m.id=l.consent_manager_id
    WHERE l.tenant_id=$1 AND l.legal_entity_id=$2 AND l.environment_id=$3 AND l.record_id=$4`, [...s, id])).rows[0] ?? null;
  return R.ConsentRecord.parse({ id: row.id, subject_id: row.subject_id, relationship_id: row.relationship_id, activity_id: row.activity_id, purpose_version_id: row.purpose_version_id,
    current_status: row.current_status, notice_version_id: row.notice_version_id, channel: row.channel, expiry_policy: row.expiry_policy, v1_principal_id: row.v1_principal_id, v1_purpose_id: row.v1_purpose_id,
    events: events.map(e => ({ id: e.id, event: e.event, occurred_at: iso(e.occurred_at), recorded_at: iso(e.recorded_at), actor_id: e.actor_id, source: e.source, evidence_state: e.evidence_state,
      evidence_reference: e.evidence_reference, notice_version_id: e.notice_version_id, package_row_id: e.package_row_id, run_id: runRows.find(r => r.consent_event_id === e.id)?.id ?? null, v1_event_id: e.v1_event_id })),
    withdrawal_run_ids: runs, updated_at: iso(row.updated_at), consent_manager: cm });
}
export async function consentRecordList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT id FROM app.consent_records WHERE ${predicate} AND ($4::uuid IS NULL OR (recorded_at,id) < (SELECT recorded_at,id FROM app.consent_records WHERE ${predicate} AND id=$4)) ORDER BY recorded_at DESC,id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await consentRecordView(c, row.id));
  return { items, next_cursor: paged.next_cursor };
}

/**
 * Mirrors choices made in the V1 portal into the linked registry records, each
 * carrying the portal receipt as its evidence. A portal withdrawal therefore
 * enters the same propagation workflow as any other.
 */
export async function syncPortalConsent(c: Context) {
  const s = scope(c);
  const records = (await c.tx.query(`SELECT id,v1_principal_id,v1_purpose_id FROM app.consent_records WHERE ${predicate} AND v1_principal_id IS NOT NULL LIMIT 1000`, s)).rows;
  let mirrored = 0; const runs: string[] = [];
  for (const record of records) {
    const events = (await c.tx.query(`SELECT e.id,e.state,e.accepted_at,e.receipt_id FROM app.consent_events e WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.principal_id=$4 AND e.purpose_id=$5
      AND NOT EXISTS(SELECT 1 FROM app.consent_record_events m WHERE m.tenant_id=e.tenant_id AND m.legal_entity_id=e.legal_entity_id AND m.environment_id=e.environment_id AND m.record_id=$6 AND m.v1_event_id=e.id)
      ORDER BY e.epoch`, [...s, record.v1_principal_id, record.v1_purpose_id, record.id])).rows;
    for (const event of events) {
      const result = await appendConsentEvent(c, record.id, { event: event.state, occurred_at: event.accepted_at.toISOString(), evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: `portal-receipt:${event.receipt_id}`, notice_version_id: null },
        'V1_PORTAL', { source: 'V1_PORTAL', v1_event_id: event.id }, event.id);
      mirrored++;
      if (result.runId) runs.push(result.runId);
    }
  }
  await audit(c, 'consent_record.portal_sync');
  return R.ConsentSync.parse({ examined_records: records.length, mirrored_events: mirrored, withdrawal_runs: runs.slice(0, 100) });
}

// ---------------------------------------------------------------- Consent Managers (DPDP Act s.6(7)-(9), rule 4)
type CmRow = { id: string; name: string; board_registration_number: string; registered_on: Date | string; status: string; status_reason: string | null; evidence_reference: string; recorded_at: Date; status_changed_at: Date | null; linked: number };
const dayOf = (d: Date | string) => typeof d === 'string' ? d.slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const cmView = (r: CmRow) => R.ConsentManager.parse({ id: r.id, name: r.name, board_registration_number: r.board_registration_number, registered_on: dayOf(r.registered_on), status: r.status, status_reason: r.status_reason,
  evidence_reference: r.evidence_reference, linked_records: Number(r.linked ?? 0), recorded_at: iso(r.recorded_at), status_changed_at: iso(r.status_changed_at) });
const CM_SELECT = `SELECT m.*, (SELECT count(*)::int FROM app.consent_manager_links l WHERE l.tenant_id=m.tenant_id AND l.legal_entity_id=m.legal_entity_id AND l.environment_id=m.environment_id AND l.consent_manager_id=m.id) AS linked FROM app.consent_managers m`;
async function cmRow(c: Context, id: string) {
  return ((await c.tx.query(`${CM_SELECT} WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND m.id=$4`, [...scope(c), id])).rows[0] ?? null) as CmRow | null;
}
export async function consentManagerList(c: Context, page: Page) {
  const rows = (await c.tx.query(`${CM_SELECT} WHERE m.tenant_id=$1 AND m.legal_entity_id=$2 AND m.environment_id=$3 AND ($4::uuid IS NULL OR (m.recorded_at,m.id) < (SELECT recorded_at,id FROM app.consent_managers WHERE ${predicate} AND id=$4)) ORDER BY m.recorded_at DESC,m.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows as CmRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(cmView), next_cursor: paged.next_cursor };
}
export async function createConsentManager(c: Context, input: unknown) {
  const v = R.ConsentManagerCreate.parse(input);
  if (Date.parse(v.registered_on) > Date.now()) refuse(400, 'registered_on', 'in_the_future');
  const id = randomUUID();
  try {
    await c.tx.query(`INSERT INTO app.consent_managers(tenant_id,legal_entity_id,environment_id,id,name,board_registration_number,registered_on,evidence_reference,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...scope(c), id, v.name.trim(), v.board_registration_number.trim(), v.registered_on, v.evidence_reference.trim(), c.actor.actor_id]);
  } catch (error) { if ((error as { code?: string }).code === '23505') refuse(409, 'board_registration_number', 'already_registered'); throw error; }
  await audit(c, 'consent_manager.create', id);
  return cmView((await cmRow(c, id))!);
}
export async function changeConsentManagerStatus(c: Context, id: string, input: unknown) {
  const v = R.ConsentManagerStatusChange.parse(input);
  const row = await cmRow(c, id); if (!row) refuse(404, 'id', 'not_found');
  if (row!.status === 'CANCELLED') refuse(409, 'status', 'cancelled_is_final');
  await c.tx.query(`UPDATE app.consent_managers SET status=$5, status_reason=$6, status_changed_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, v.status, v.reason.trim()]);
  await audit(c, 'consent_manager.status', id);
  return cmView((await cmRow(c, id))!);
}
export async function linkConsentManager(c: Context, recordId: string, input: unknown) {
  const v = R.ConsentManagerLink.parse(input);
  const record = (await c.tx.query(`SELECT id FROM app.consent_records WHERE ${predicate} AND id=$4`, [...scope(c), recordId])).rows[0];
  if (!record) refuse(404, 'id', 'not_found');
  const cm = await cmRow(c, v.consent_manager_id); if (!cm) refuse(404, 'consent_manager_id', 'not_found');
  if (cm!.status !== 'ACTIVE') refuse(409, 'consent_manager_id', 'consent_manager_not_active');
  try {
    await c.tx.query(`INSERT INTO app.consent_manager_links(tenant_id,legal_entity_id,environment_id,id,record_id,consent_manager_id,artefact_reference,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [...scope(c), randomUUID(), recordId, v.consent_manager_id, v.artefact_reference.trim(), c.actor.actor_id]);
  } catch (error) { if ((error as { code?: string }).code === '23505') refuse(409, 'id', 'already_linked_to_a_consent_manager'); throw error; }
  await audit(c, 'consent_record.consent_manager_linked', recordId);
  return consentRecordView(c, recordId);
}
/**
 * A withdrawal relayed by the Consent Manager the consent was given through. It is honoured even if that Consent Manager has
 * since been suspended or cancelled: withdrawing consent is never refused. It must name the linked Consent Manager and artefact.
 */
export async function recordConsentManagerWithdrawal(c: Context, recordId: string, input: unknown) {
  const v = R.ConsentManagerWithdrawal.parse(input);
  const link = (await c.tx.query(`SELECT consent_manager_id, artefact_reference FROM app.consent_manager_links WHERE ${predicate} AND record_id=$4`, [...scope(c), recordId])).rows[0];
  if (!link) refuse(409, 'id', 'consent_was_not_given_through_a_consent_manager');
  if (link.consent_manager_id !== v.consent_manager_id || link.artefact_reference !== v.artefact_reference.trim()) refuse(409, 'artefact_reference', 'does_not_match_the_linked_consent_manager_artefact');
  if (Date.parse(v.occurred_at) > Date.now() + 5 * 60_000) refuse(400, 'occurred_at', 'in_the_future');
  const cm = await cmRow(c, v.consent_manager_id);
  await appendConsentEvent(c, recordId, { event: 'WITHDRAWN', occurred_at: v.occurred_at, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: v.evidence_reference.trim(), notice_version_id: null }, 'CONSENT_MANAGER',
    { source: 'CONSENT_MANAGER', consent_manager_id: v.consent_manager_id, board_registration_number: cm?.board_registration_number ?? null, consent_manager_status: cm?.status ?? null, artefact_reference: link.artefact_reference, recorded_by: c.actor.actor_id });
  await audit(c, 'consent_record.consent_manager_withdrawal', recordId);
  return consentRecordView(c, recordId);
}
