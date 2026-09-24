import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { createDispositionRun } from '../operations/runs.ts';
import { settleRun } from '../operations/executor.ts';
import { emit, exists, iso, pageOf, predicate, recordEvidence, refuse, scope } from '../operations/shared.ts';

/**
 * Processor operations and the data-sharing register (requirements s17, s18).
 * An engagement ties a V1 processor to the activities, data categories and
 * systems it actually touches. Termination closes those links at the
 * termination time (history is kept) and, where disposition is required,
 * opens a disposition task whose only way to "verified" is independent evidence.
 */
const TARGET: Record<string, [string, string]> = { DATA_CATEGORY: ['personal_data_categories', 'data_category_id'], PRINCIPAL_CATEGORY: ['data_principal_categories', 'principal_category_id'], SYSTEM: ['systems', 'system_id'] };

export async function createEngagement(c: Context, input: unknown) {
  const value = R.EngagementCreate.parse(input);
  const s = scope(c);
  await exists(c, 'processors', value.processor_id, 'processor_id');
  await exists(c, 'processor_engagements', value.subprocessor_of, 'subprocessor_of');
  for (const link of value.links) await exists(c, TARGET[link.link_kind]![0], link.target_id, 'links.target_id');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.processor_engagements(tenant_id,legal_entity_id,environment_id,id,processor_id,service_description,subprocessor_of,effective_from,contract_evidence_reference,safeguard_evidence_reference,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [...s, id, value.processor_id, value.service_description, value.subprocessor_of, value.effective_from, value.contract_evidence_reference, value.safeguard_evidence_reference, c.actor.actor_id]);
  for (const link of value.links) {
    const column = TARGET[link.link_kind]![1];
    await c.tx.query(`INSERT INTO app.processor_engagement_links(tenant_id,legal_entity_id,environment_id,id,engagement_id,link_kind,${column},valid_from,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...s, randomUUID(), id, link.link_kind, link.target_id, value.effective_from, c.actor.actor_id]);
  }
  await emit(c, 'processor_relationship_changed', 'processor_engagement', id, { change: 'created', processor_id: value.processor_id });
  await audit(c, 'processor_engagement.create', id);
  return engagementView(c, id);
}

export async function terminateEngagement(c: Context, id: string, input: unknown) {
  const value = R.EngagementTerminate.parse(input);
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.processor_engagements WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status !== 'ACTIVE') refuse(409, 'status', 'already_terminated');
  if (Date.parse(value.terminated_at) < row.effective_from.getTime()) refuse(400, 'terminated_at', 'before_engagement_started');
  await c.tx.query(`UPDATE app.processor_engagements SET status='TERMINATED',effective_to=$4,terminated_at=$4,termination_reason=$5,disposition_state=$6 WHERE ${predicate} AND id=$7`,
    [...s, value.terminated_at, value.reason, value.disposition_required ? 'PENDING' : 'NOT_APPLICABLE', id]);
  // History is closed, never deleted: queries at an earlier time still see the engagement.
  await c.tx.query(`UPDATE app.processor_engagement_links SET valid_to=GREATEST($4::timestamptz,valid_from+interval '1 millisecond') WHERE ${predicate} AND engagement_id=$5 AND valid_to IS NULL`, [...s, value.terminated_at, id]);
  await c.tx.query(`UPDATE app.registry_activity_links SET valid_to=GREATEST($4::timestamptz,valid_from+interval '1 millisecond') WHERE ${predicate} AND engagement_id=$5 AND valid_to IS NULL`, [...s, value.terminated_at, id]);
  await c.tx.query(`UPDATE app.data_sharing_links SET valid_to=GREATEST($4::timestamptz,valid_from+interval '1 millisecond') WHERE ${predicate} AND engagement_id=$5 AND valid_to IS NULL`, [...s, value.terminated_at, id]);
  if (value.disposition_required) await createDispositionRun(c, id);
  await emit(c, 'processor_relationship_changed', 'processor_engagement', id, { change: 'terminated', disposition_required: value.disposition_required });
  await audit(c, 'processor_engagement.terminate', id);
  return engagementView(c, id);
}

/** A processor's statement confirms; only independent audit evidence verifies. */
export async function recordDisposition(c: Context, id: string, input: unknown) {
  const value = R.EngagementDisposition.parse(input);
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.processor_engagements WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status !== 'TERMINATED' || !['PENDING', 'PROCESSOR_CONFIRMED'].includes(row.disposition_state)) refuse(409, 'disposition_state', 'no_disposition_outstanding');
  if (row.disposition_state === 'PROCESSOR_CONFIRMED' && value.outcome === 'PROCESSOR_CONFIRMED') refuse(409, 'outcome', 'already_confirmed');
  const action = (await c.tx.query(`SELECT a.* FROM app.downstream_actions a JOIN app.workflow_runs r ON r.tenant_id=a.tenant_id AND r.legal_entity_id=a.legal_entity_id AND r.environment_id=a.environment_id AND r.id=a.run_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.engagement_id=$4 AND a.action_type='DISPOSITION_CONFIRMATION' ORDER BY a.created_at DESC LIMIT 1`, [...s, id])).rows[0];
  const evidenceId = await recordEvidence(c, { entity_kind: 'processor_engagement', entity_id: id, origin: 'OPERATOR', method: value.verification_method, content_digest: digest({ evidence_reference: value.evidence_reference, outcome: value.outcome }),
    package_row_id: null, requirement_ids: [], summary: { outcome: value.outcome, evidence_reference: value.evidence_reference }, fixture: false });
  await c.tx.query(`UPDATE app.processor_engagements SET disposition_state=$4 WHERE ${predicate} AND id=$5`, [...s, value.outcome, id]);
  if (action) {
    const attempts = action.attempts + 1;
    if (value.outcome === 'VERIFIED') {
      await c.tx.query(`INSERT INTO app.action_verifications(tenant_id,legal_entity_id,environment_id,id,action_id,method,verifier,expected,observed,result,failure_reason,evidence_id) VALUES($1,$2,$3,$4,$5,'TARGET_AUDIT_EVIDENCE',$6,$7,$8,'PASS',NULL,$9)`,
        [...s, randomUUID(), action.id, 'Independent audit evidence recorded by an operator', { disposition: 'returned_or_deleted' }, { evidence_reference_digest: digest(value.evidence_reference) }, evidenceId]);
      await c.tx.query(`UPDATE app.downstream_actions SET state='verified',verification='VERIFIED',target_result='COMPLETED_BY_TARGET',attempts=$4,updated_at=clock_timestamp() WHERE ${predicate} AND id=$5`, [...s, attempts, action.id]);
    } else await c.tx.query(`UPDATE app.downstream_actions SET state='succeeded_unverified',target_result='COMPLETED_BY_TARGET',attempts=$4,updated_at=clock_timestamp() WHERE ${predicate} AND id=$5`, [...s, attempts, action.id]);
    await c.tx.query(`UPDATE app.workflow_runs SET status='RUNNING',started_at=COALESCE(started_at,clock_timestamp()) WHERE ${predicate} AND id=$4 AND status='APPROVED'`, [...s, action.run_id]);
    if (value.outcome === 'VERIFIED') await settleRun(c, action.run_id);
  }
  await emit(c, 'processor_relationship_changed', 'processor_engagement', id, { change: 'disposition', outcome: value.outcome });
  await audit(c, 'processor_engagement.disposition', id);
  return engagementView(c, id);
}

export async function engagementView(c: Context, id: string, at: Date | null = null) {
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.processor_engagements WHERE ${predicate} AND id=$4`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const links = (await c.tx.query(`SELECT * FROM app.processor_engagement_links WHERE ${predicate} AND engagement_id=$4 ORDER BY valid_from LIMIT 50`, [...s, id])).rows;
  const moment = at ?? new Date();
  const activities = (await c.tx.query(`SELECT DISTINCT activity_id FROM app.registry_activity_links WHERE ${predicate} AND engagement_id=$4 AND valid_from<=$5 AND (valid_to IS NULL OR valid_to>$5) LIMIT 100`,
    [...s, id, at ? moment : new Date(8.64e15)])).rows.map(r => r.activity_id);
  const run = (await c.tx.query(`SELECT id FROM app.workflow_runs WHERE ${predicate} AND engagement_id=$4 ORDER BY created_at DESC LIMIT 1`, [...s, id])).rows[0];
  return R.Engagement.parse({ id: row.id, processor_id: row.processor_id, service_description: row.service_description, subprocessor_of: row.subprocessor_of,
    effective_from: iso(row.effective_from), effective_to: iso(row.effective_to), status: row.status, contract_evidence_reference: row.contract_evidence_reference,
    safeguard_evidence_reference: row.safeguard_evidence_reference, disposition_state: row.disposition_state, terminated_at: iso(row.terminated_at), termination_reason: row.termination_reason,
    links: links.map(l => ({ link_kind: l.link_kind, target_id: l.data_category_id ?? l.principal_category_id ?? l.system_id, valid_from: iso(l.valid_from), valid_to: iso(l.valid_to) })),
    activity_ids: activities, disposition_run_id: run?.id ?? null, recorded_at: iso(row.recorded_at) });
}

/** "Which processors served this activity at time T" is answered from effective periods. */
export async function engagementList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { activity_id?: string; as_of?: string };
  const at = q.as_of ? new Date(q.as_of) : null;
  const rows = (await c.tx.query(`SELECT e.id FROM app.processor_engagements e WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3
    AND ($4::timestamptz IS NULL OR (e.effective_from<=$4 AND (e.effective_to IS NULL OR e.effective_to>$4)))
    AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=e.tenant_id AND l.legal_entity_id=e.legal_entity_id AND l.environment_id=e.environment_id AND l.engagement_id=e.id AND l.activity_id=$5
      AND ($4::timestamptz IS NULL OR (l.valid_from<=$4 AND (l.valid_to IS NULL OR l.valid_to>$4)))))
    AND ($6::uuid IS NULL OR e.id>$6) ORDER BY e.id LIMIT $7`, [...scope(c), at, q.activity_id ?? null, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await engagementView(c, row.id, at));
  return { items, next_cursor: paged.next_cursor };
}

export async function createSharingLink(c: Context, input: unknown) {
  const value = R.SharingLinkCreate.parse(input);
  await exists(c, 'registry_activities', value.activity_id, 'activity_id');
  await exists(c, 'personal_data_categories', value.data_category_id, 'data_category_id');
  await exists(c, 'data_principal_categories', value.principal_category_id, 'principal_category_id');
  await exists(c, 'registry_purpose_versions', value.purpose_version_id, 'purpose_version_id');
  await exists(c, 'systems', value.system_id, 'system_id');
  if (value.engagement_id) {
    const engagement = (await c.tx.query(`SELECT status FROM app.processor_engagements WHERE ${predicate} AND id=$4`, [...scope(c), value.engagement_id])).rows[0];
    if (!engagement) refuse(404, 'engagement_id', 'not_found');
    if (engagement.status !== 'ACTIVE') refuse(409, 'engagement_id', 'engagement_terminated');
  }
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.data_sharing_links(tenant_id,legal_entity_id,environment_id,id,activity_id,data_category_id,principal_category_id,engagement_id,recipient_reference,purpose_version_id,system_id,valid_from,evidence_reference,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
  [...scope(c), id, value.activity_id, value.data_category_id, value.principal_category_id, value.engagement_id, value.recipient_reference, value.purpose_version_id, value.system_id, value.valid_from, value.evidence_reference, c.actor.actor_id])).rows[0];
  await audit(c, 'data_sharing_link.create', id);
  return sharingView(row);
}
const sharingView = (r: Record<string, unknown> & { valid_from: Date; valid_to: Date | null }) => R.SharingLink.parse({ id: r.id, activity_id: r.activity_id, data_category_id: r.data_category_id, principal_category_id: r.principal_category_id,
  engagement_id: r.engagement_id, recipient_reference: r.recipient_reference, purpose_version_id: r.purpose_version_id, system_id: r.system_id, valid_from: iso(r.valid_from), valid_to: iso(r.valid_to), evidence_reference: r.evidence_reference });
/** For a subject, the register is filtered to the activities of its relationship contexts. */
export async function sharingList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { activity_id?: string; subject_id?: string };
  const rows = (await c.tx.query(`SELECT d.* FROM app.data_sharing_links d WHERE d.tenant_id=$1 AND d.legal_entity_id=$2 AND d.environment_id=$3
    AND ($4::uuid IS NULL OR d.activity_id=$4)
    AND ($5::uuid IS NULL OR d.activity_id IN (SELECT l.activity_id FROM app.registry_activity_links l JOIN app.data_principal_relationships r ON r.tenant_id=l.tenant_id AND r.legal_entity_id=l.legal_entity_id AND r.environment_id=l.environment_id AND r.category_id=l.principal_category_id
      WHERE l.tenant_id=d.tenant_id AND l.legal_entity_id=d.legal_entity_id AND l.environment_id=d.environment_id AND l.link_kind='PRINCIPAL_CATEGORY' AND r.subject_id=$5))
    AND ($6::uuid IS NULL OR d.id>$6) ORDER BY d.id LIMIT $7`, [...scope(c), q.activity_id ?? null, q.subject_id ?? null, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(sharingView), next_cursor: paged.next_cursor };
}
