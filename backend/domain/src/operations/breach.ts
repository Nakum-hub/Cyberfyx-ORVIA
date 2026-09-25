import { randomUUID } from 'node:crypto';
import * as O from '../../../../shared/contracts/src/operations.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, exists, inForce, iso, packageAt, packageById, pageOf, predicate, recordEvidence, refuse, scope, type PackageRow } from './shared.ts';

/**
 * Personal-data breach operations (requirements s20, integrations s7).
 *
 * Only a V1 incident explicitly registered here becomes a personal-data breach.
 * It is pinned to the regulatory package in effect when the organisation became
 * aware of it, and its tasks and deadlines come from that package's requirements.
 * A later package never re-times an existing breach. Without a recorded awareness
 * time the awareness-anchored deadlines are unresolved rather than guessed.
 */
type BreachRow = { incident_id: string; package_row_id: string; pinned_at: Date; affected_count: number | null; affected_count_state: string; data_category_ids: string[]; activity_ids: string[]; system_ids: string[]; engagement_ids: string[];
  facts: Record<string, string>; mitigation: string | null; recorded_at: Date };

export async function registerBreach(c: Context, input: unknown) {
  const value = O.BreachRegister.parse(input);
  const s = scope(c);
  const incident = (await c.tx.query(`SELECT state,detected_at,became_aware_at FROM app.incidents WHERE ${predicate} AND id=$4`, [...s, value.incident_id])).rows[0];
  if (!incident) refuse(404, 'incident_id', 'not_found');
  if (incident.state === 'CLOSED') refuse(409, 'incident_id', 'incident_closed');
  if ((await c.tx.query(`SELECT 1 FROM app.personal_data_breaches WHERE ${predicate} AND incident_id=$4`, [...s, value.incident_id])).rowCount) refuse(409, 'incident_id', 'already_registered');
  for (const id of value.data_category_ids) await exists(c, 'personal_data_categories', id, 'data_category_ids');
  for (const id of value.activity_ids) await exists(c, 'registry_activities', id, 'activity_ids');
  for (const id of value.system_ids) await exists(c, 'systems', id, 'system_ids');
  for (const id of value.engagement_ids) await exists(c, 'processor_engagements', id, 'engagement_ids');
  const anchor: Date = incident.became_aware_at ?? incident.detected_at;
  const pkg = await packageAt(c, anchor);
  if (!pkg) refuse(409, 'regulatory_package', 'no_regulatory_package_in_effect_at_awareness');
  await c.tx.query(`INSERT INTO app.personal_data_breaches(tenant_id,legal_entity_id,environment_id,incident_id,package_row_id,pinned_at,affected_count,affected_count_state,data_category_ids,activity_ids,system_ids,engagement_ids,facts,mitigation,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
  [...s, value.incident_id, pkg.id, anchor, value.affected_count, value.affected_count_state, value.data_category_ids, value.activity_ids, value.system_ids, value.engagement_ids, value.facts, value.mitigation, c.actor.actor_id]);
  await createTasks(c, value.incident_id, pkg, incident.became_aware_at);
  await recordEvidence(c, { entity_kind: 'personal_data_breach', entity_id: value.incident_id, origin: 'OPERATOR', method: 'BREACH_REGISTRATION', content_digest: digest(value.facts), package_row_id: pkg.id,
    requirement_ids: pkg.claims.requirements.filter(r => r.breach_task_kind).map(r => r.requirement_id), summary: { affected_count_state: value.affected_count_state, pinned_package: pkg.version }, fixture: pkg.distribution === 'TEST_FIXTURE' });
  await emit(c, 'personal_data_breach_created', 'personal_data_breach', value.incident_id, { package_version: pkg.version, awareness_recorded: incident.became_aware_at !== null });
  await audit(c, 'personal_data_breach.register', value.incident_id);
  return breachView(c, value.incident_id);
}

async function createTasks(c: Context, incidentId: string, pkg: PackageRow, awareAt: Date | null) {
  for (const requirement of pkg.claims.requirements.filter(r => r.breach_task_kind)) {
    const timer = requirement.timer;
    let dueAt: Date | null = null; let rule = 'No statutory time limit in the pinned package.'; let status = inForce(requirement, awareAt ?? new Date()) ? 'APPLICABLE' : 'NOT_YET_IN_FORCE'; let unresolved: string | null = null;
    if (timer.kind === 'HOURS' && timer.runs_from === 'AWARENESS') {
      rule = `Within ${timer.hours} hours of becoming aware (${requirement.requirement_id} v${requirement.version}).`;
      if (awareAt) dueAt = new Date(awareAt.getTime() + timer.hours * 3_600_000);
      else { status = 'UNRESOLVED'; unresolved = 'The time the organisation became aware is not recorded, so this deadline cannot be computed.'; }
    } else if (timer.kind === 'WITHOUT_DELAY') rule = `Without delay after becoming aware (${requirement.requirement_id} v${requirement.version}).`;
    await c.tx.query(`INSERT INTO app.breach_tasks(tenant_id,legal_entity_id,environment_id,id,incident_id,package_row_id,requirement_id,requirement_version,kind,timer_rule,due_at,legal_status,unresolved_reason)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [...scope(c), randomUUID(), incidentId, pkg.id, requirement.requirement_id, requirement.version, requirement.breach_task_kind, rule, dueAt, status, unresolved]);
  }
}

export async function updateBreach(c: Context, id: string, input: unknown) {
  const value = O.BreachUpdate.parse(input);
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.personal_data_breaches WHERE ${predicate} AND incident_id=$4 FOR UPDATE`, [...s, id])).rows[0] as BreachRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  // An established count is not later unknown; knowledge only grows.
  if (row.affected_count_state === 'ESTABLISHED' && value.affected_count_state !== 'ESTABLISHED') refuse(409, 'affected_count_state', 'established_count_cannot_regress');
  await c.tx.query(`UPDATE app.personal_data_breaches SET affected_count=$4,affected_count_state=$5,mitigation=$6,facts=$7 WHERE ${predicate} AND incident_id=$8`,
    [...s, value.affected_count, value.affected_count_state, value.mitigation, value.facts, id]);
  await recordEvidence(c, { entity_kind: 'personal_data_breach', entity_id: id, origin: 'OPERATOR', method: 'BREACH_FACTS_UPDATE', content_digest: digest({ facts: value.facts, count: value.affected_count }), package_row_id: row.package_row_id, requirement_ids: [], summary: { affected_count_state: value.affected_count_state }, fixture: false });
  await emit(c, 'personal_data_breach_updated', 'personal_data_breach', id, { affected_count_state: value.affected_count_state });
  await audit(c, 'personal_data_breach.update', id);
  return breachView(c, id);
}

export async function completeBreachTask(c: Context, taskId: string, input: unknown) {
  const value = O.BreachTaskComplete.parse(input);
  const s = scope(c);
  const task = (await c.tx.query(`SELECT * FROM app.breach_tasks WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, taskId])).rows[0];
  if (!task) refuse(404, 'id', 'not_found');
  if (task.state !== 'OPEN') refuse(409, 'state', 'task_not_open');
  await c.tx.query(`UPDATE app.breach_tasks SET state='COMPLETED',completed_at=clock_timestamp(),completed_by=$4,communication_evidence_reference=$5,completion_note=$6 WHERE ${predicate} AND id=$7`,
    [...s, c.actor.actor_id, value.communication_evidence_reference, value.note, taskId]);
  await recordEvidence(c, { entity_kind: 'breach_task', entity_id: taskId, origin: 'OPERATOR', method: 'COMMUNICATION_EVIDENCE', content_digest: digest(value.communication_evidence_reference), package_row_id: task.package_row_id,
    requirement_ids: [task.requirement_id], summary: { kind: task.kind, reference: value.communication_evidence_reference, late: task.due_at ? task.due_at.getTime() < Date.now() : null }, fixture: false });
  await emit(c, 'personal_data_breach_updated', 'personal_data_breach', task.incident_id, { task_completed: task.kind });
  await audit(c, 'breach_task.complete', taskId);
  return breachView(c, task.incident_id);
}

export async function breachView(c: Context, id: string) {
  const s = scope(c);
  const row = (await c.tx.query(`SELECT b.*,i.detected_at,i.became_aware_at,i.state incident_state FROM app.personal_data_breaches b JOIN app.incidents i ON i.tenant_id=b.tenant_id AND i.legal_entity_id=b.legal_entity_id AND i.environment_id=b.environment_id AND i.id=b.incident_id
    WHERE b.tenant_id=$1 AND b.legal_entity_id=$2 AND b.environment_id=$3 AND b.incident_id=$4`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const pkg = await packageById(c, row.package_row_id);
  const tasks = (await c.tx.query(`SELECT * FROM app.breach_tasks WHERE ${predicate} AND incident_id=$4 ORDER BY created_at,kind`, [...s, id])).rows;
  return O.Breach.parse({ incident_id: row.incident_id, package: { id: pkg.id, version: pkg.version, distribution: pkg.distribution }, pinned_at: iso(row.pinned_at),
    detected_at: iso(row.detected_at), became_aware_at: iso(row.became_aware_at), incident_state: row.incident_state,
    affected_count: row.affected_count, affected_count_state: row.affected_count_state, data_category_ids: row.data_category_ids, activity_ids: row.activity_ids, system_ids: row.system_ids, engagement_ids: row.engagement_ids,
    facts: row.facts, mitigation: row.mitigation, recorded_at: iso(row.recorded_at),
    tasks: tasks.map(t => ({ id: t.id, requirement_id: t.requirement_id, requirement_version: t.requirement_version, package_row_id: t.package_row_id, kind: t.kind, timer_rule: t.timer_rule,
      due_at: iso(t.due_at), legal_status: t.legal_status, unresolved_reason: t.unresolved_reason, state: t.state, overdue: t.state === 'OPEN' && t.due_at !== null && t.due_at.getTime() < Date.now(),
      completed_at: iso(t.completed_at), communication_evidence_reference: t.communication_evidence_reference, completion_note: t.completion_note, created_at: iso(t.created_at) })) });
}
export async function breachList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT incident_id FROM app.personal_data_breaches WHERE ${predicate} AND ($4::uuid IS NULL OR incident_id>$4) ORDER BY incident_id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.incident_id);
  const items = [];
  for (const row of paged.items) items.push(await breachView(c, row.incident_id));
  return { items, next_cursor: paged.next_cursor };
}
