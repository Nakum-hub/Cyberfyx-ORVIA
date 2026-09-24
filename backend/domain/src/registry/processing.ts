import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, exists, iso, packageAt, pageOf, predicate, refuse, scope, only } from '../operations/shared.ts';

/**
 * Purposes, processing conditions, safeguards and the Processing Activity
 * Registry (requirements s9, s10, s13, s19). Purposes and activities are
 * versioned and effective-dated; a change closes the previous version and
 * records a governed change event with its impact, and never edits history.
 */

type PurposeVersionRow = { id: string; purpose_id: string; version: number; description: string; status: string; effective_from: Date; effective_to: Date | null; change_reason: string; evidence_reference: string | null; v1_purpose_id: string | null; recorded_at: Date; recorded_by: string };
const purposeVersionView = (v: PurposeVersionRow) => ({ id: v.id, version: v.version, description: v.description, status: v.status, effective_from: iso(v.effective_from), effective_to: iso(v.effective_to),
  change_reason: v.change_reason, evidence_reference: v.evidence_reference, v1_purpose_id: v.v1_purpose_id, recorded_at: iso(v.recorded_at), recorded_by: v.recorded_by });

async function purposeView(c: Context, id: string, impact: R.RegistryPurposeValue['impact'] = null) {
  const row = (await c.tx.query(`SELECT * FROM app.registry_purposes WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const versions = (await c.tx.query(`SELECT * FROM app.registry_purpose_versions WHERE ${predicate} AND purpose_id=$4 ORDER BY version LIMIT 100`, [...scope(c), id])).rows as PurposeVersionRow[];
  return R.RegistryPurpose.parse({ id: row.id, name: row.name, owner_reference: row.owner_reference, versions: versions.map(purposeVersionView), impact });
}

export async function createPurpose(c: Context, input: unknown) {
  const value = R.RegistryPurposeCreate.parse(input);
  if (value.v1_purpose_id) await exists(c, 'purpose_versions', value.v1_purpose_id, 'v1_purpose_id');
  const id = randomUUID();
  try {
    await c.tx.query(`INSERT INTO app.registry_purposes(tenant_id,legal_entity_id,environment_id,id,name,owner_reference,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7)`, [...scope(c), id, value.name, value.owner_reference, c.actor.actor_id]);
  } catch (error) { if ((error as { code?: string }).code === '23505') refuse(409, 'name', 'purpose_exists'); throw error; }
  await c.tx.query(`INSERT INTO app.registry_purpose_versions(tenant_id,legal_entity_id,environment_id,id,purpose_id,version,description,status,effective_from,change_reason,evidence_reference,v1_purpose_id,recorded_by)
    VALUES($1,$2,$3,$4,$5,1,$6,'ACTIVE',$7,$8,$9,$10,$11)`, [...scope(c), randomUUID(), id, value.description, value.effective_from, value.change_reason, value.evidence_reference, value.v1_purpose_id, c.actor.actor_id]);
  await emit(c, 'purpose_changed', 'registry_purpose', id, { change: 'created', version: 1 });
  await audit(c, 'registry_purpose.create', id);
  return purposeView(c, id);
}

/** What a purpose change reaches: activities, notices, retention rules, consent records and open runs. */
export async function purposeImpact(c: Context, purposeId: string) {
  const s = scope(c);
  const versionIds = (await c.tx.query(`SELECT id FROM app.registry_purpose_versions WHERE ${predicate} AND purpose_id=$4`, [...s, purposeId])).rows.map(r => r.id);
  const activityIds = (await c.tx.query(`SELECT DISTINCT activity_id FROM app.registry_activity_versions WHERE ${predicate} AND status='CURRENT' AND purpose_version_id=ANY($4::uuid[]) LIMIT 100`, [...s, versionIds])).rows.map(r => r.activity_id);
  const noticeIds = (await c.tx.query(`SELECT id FROM app.registry_notice_versions WHERE ${predicate} AND status<>'SUPERSEDED' AND purpose_version_ids && $4::uuid[] LIMIT 100`, [...s, versionIds])).rows.map(r => r.id);
  const ruleIds = (await c.tx.query(`SELECT id FROM app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND activity_id=ANY($4::uuid[]) LIMIT 100`, [...s, activityIds])).rows.map(r => r.id);
  const consent = Number((await c.tx.query(`SELECT count(*) n FROM app.consent_records WHERE ${predicate} AND activity_id=ANY($4::uuid[])`, [...s, activityIds])).rows[0].n);
  const runs = (await c.tx.query(`SELECT r.id FROM app.workflow_runs r JOIN app.consent_record_events e ON e.tenant_id=r.tenant_id AND e.legal_entity_id=r.legal_entity_id AND e.environment_id=r.environment_id AND e.id=r.consent_event_id
    JOIN app.consent_records cr ON cr.tenant_id=e.tenant_id AND cr.legal_entity_id=e.legal_entity_id AND cr.environment_id=e.environment_id AND cr.id=e.record_id
    WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND cr.activity_id=ANY($4::uuid[]) AND r.status IN ('EVALUATING','DRY_RUN_READY','AWAITING_APPROVAL','APPROVED','RUNNING','PARTIALLY_FAILED') LIMIT 100`, [...s, activityIds])).rows.map(r => r.id);
  return { activity_ids: activityIds, notice_version_ids: noticeIds, retention_rule_ids: ruleIds, consent_record_count: consent, open_run_ids: runs };
}

export async function revisePurpose(c: Context, id: string, input: unknown) {
  const value = R.RegistryPurposeRevise.parse(input);
  const current = (await c.tx.query(`SELECT * FROM app.registry_purpose_versions WHERE ${predicate} AND purpose_id=$4 AND effective_to IS NULL ORDER BY version DESC LIMIT 1 FOR UPDATE`, [...scope(c), id])).rows[0] as PurposeVersionRow | undefined;
  if (!current) refuse(404, 'id', 'not_found');
  if (Date.parse(value.effective_from) <= current.effective_from.getTime()) refuse(400, 'effective_from', 'must_follow_current_version');
  await c.tx.query(`UPDATE app.registry_purpose_versions SET effective_to=$4 WHERE ${predicate} AND id=$5`, [...scope(c), value.effective_from, current.id]);
  await c.tx.query(`INSERT INTO app.registry_purpose_versions(tenant_id,legal_entity_id,environment_id,id,purpose_id,version,description,status,effective_from,change_reason,evidence_reference,v1_purpose_id,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...scope(c), randomUUID(), id, current.version + 1, value.description, value.status, value.effective_from, value.change_reason, value.evidence_reference, current.v1_purpose_id, c.actor.actor_id]);
  const impact = await purposeImpact(c, id);
  await emit(c, 'purpose_changed', 'registry_purpose', id, { change: value.status === 'RETIRED' ? 'retired' : 'revised', version: current.version + 1, impact });
  await audit(c, 'registry_purpose.revise', id);
  return purposeView(c, id, impact);
}
export async function purposeList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT id FROM app.registry_purposes WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await purposeView(c, row.id));
  return { items, next_cursor: paged.next_cursor };
}

type ConditionRow = { id: string; code: string; label: string; requirement_ids: string[]; package_row_id: string | null; effective_from: Date; effective_to: Date | null; unresolved: boolean; unresolved_reason: string | null; evidence_requirements: string; justification_reference: string | null; recorded_at: Date };
const conditionView = (r: ConditionRow) => R.Condition.parse({ ...only(R.Condition, r), effective_from: iso(r.effective_from), effective_to: iso(r.effective_to), recorded_at: iso(r.recorded_at) });
/**
 * s13. A condition is resolved only when its code is in the vocabulary of the
 * package in force, which ties it to the official provisions. Anything else is
 * recorded as unresolved with its reason, and blocks dependent destructive work.
 */
export async function createCondition(c: Context, input: unknown) {
  const value = R.ConditionCreate.parse(input);
  const pkg = await packageAt(c, new Date());
  let unresolved = value.unresolved_reason;
  let requirementIds: string[] = [];
  if (value.code === 'UNRESOLVED') { if (!unresolved) refuse(400, 'unresolved_reason', 'unresolved_condition_states_why'); }
  else if (!pkg) unresolved ??= 'No approved regulatory package is in effect, so the condition cannot be traced to an official provision.';
  else {
    const entry = pkg.claims.condition_vocabulary.find(v => v.code === value.code);
    if (!entry) unresolved ??= `Code ${value.code} is not in the vocabulary of regulatory package ${pkg.version}.`;
    else requirementIds = entry.requirement_ids;
  }
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.processing_conditions(tenant_id,legal_entity_id,environment_id,id,code,label,requirement_ids,package_row_id,effective_from,unresolved,unresolved_reason,evidence_requirements,justification_reference,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
  [...scope(c), id, value.code, value.label, unresolved ? [] : requirementIds, unresolved ? null : pkg!.id, value.effective_from, unresolved !== null, unresolved, value.evidence_requirements, value.justification_reference, c.actor.actor_id])).rows[0];
  await audit(c, 'processing_condition.create', id);
  return conditionView(row);
}
export async function conditionList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.processing_conditions WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(conditionView), next_cursor: paged.next_cursor };
}

export async function createSafeguard(c: Context, input: unknown) {
  const value = R.SafeguardCreate.parse(input);
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.security_safeguards(tenant_id,legal_entity_id,environment_id,id,kind,description,control_reference,evidence_state,evidence_reference,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`, [...scope(c), id, value.kind, value.description, value.control_reference, value.evidence_state, value.evidence_reference, c.actor.actor_id])).rows[0];
  await audit(c, 'security_safeguard.create', id);
  return R.Safeguard.parse({ ...value, id, recorded_at: iso(row.recorded_at) });
}
export async function safeguardList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.security_safeguards WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => R.Safeguard.parse({ id: r.id, kind: r.kind, description: r.description, control_reference: r.control_reference, evidence_state: r.evidence_state, evidence_reference: r.evidence_reference, recorded_at: iso(r.recorded_at) })), next_cursor: paged.next_cursor };
}

async function validateVersionInputs(c: Context, value: { purpose_version_id: string; condition_id: string | null; notice_version_ids: string[]; requirement_ids: string[] }) {
  const purpose = (await c.tx.query(`SELECT status,effective_to FROM app.registry_purpose_versions WHERE ${predicate} AND id=$4`, [...scope(c), value.purpose_version_id])).rows[0];
  if (!purpose) refuse(404, 'purpose_version_id', 'not_found');
  if (purpose.status !== 'ACTIVE' || purpose.effective_to !== null) refuse(409, 'purpose_version_id', 'purpose_version_not_current');
  await exists(c, 'processing_conditions', value.condition_id, 'condition_id');
  for (const notice of value.notice_version_ids) await exists(c, 'registry_notice_versions', notice, 'notice_version_ids');
  if (value.requirement_ids.length) {
    const pkg = await packageAt(c, new Date());
    const known = new Set((pkg?.claims.requirements ?? []).map(r => r.requirement_id));
    for (const requirement of value.requirement_ids) if (!known.has(requirement)) refuse(409, 'requirement_ids', 'requirement_not_in_active_package');
  }
}

export async function createActivity(c: Context, input: unknown) {
  const value = R.ActivityCreate.parse(input);
  await validateVersionInputs(c, value);
  await exists(c, 'processing_activities', value.graph_activity_id, 'graph_activity_id');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.registry_activities(tenant_id,legal_entity_id,environment_id,id,name,description,owner_reference,processes_child_data,graph_activity_id,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [...scope(c), id, value.name, value.description, value.owner_reference, value.processes_child_data, value.graph_activity_id, c.actor.actor_id]);
  await c.tx.query(`INSERT INTO app.registry_activity_versions(tenant_id,legal_entity_id,environment_id,id,activity_id,version,purpose_version_id,condition_id,notice_version_ids,requirement_ids,evidence_state,effective_from,change_reason,recorded_by)
    VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9,'UNKNOWN',$10,$11,$12)`,
  [...scope(c), randomUUID(), id, value.purpose_version_id, value.condition_id, value.notice_version_ids, value.requirement_ids, value.effective_from, value.change_reason, c.actor.actor_id]);
  await emit(c, 'processing_activity_created', 'registry_activity', id, { name: value.name });
  await audit(c, 'registry_activity.create', id);
  return activityView(c, id);
}

export async function reviseActivity(c: Context, id: string, input: unknown) {
  const value = R.ActivityRevise.parse(input);
  await validateVersionInputs(c, value);
  const current = (await c.tx.query(`SELECT * FROM app.registry_activity_versions WHERE ${predicate} AND activity_id=$4 AND status='CURRENT' FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!current) refuse(404, 'id', 'not_found');
  if (Date.parse(value.effective_from) <= current.effective_from.getTime()) refuse(400, 'effective_from', 'must_follow_current_version');
  const next = randomUUID();
  await c.tx.query(`UPDATE app.registry_activity_versions SET status='SUPERSEDED',effective_to=$4 WHERE ${predicate} AND id=$5`, [...scope(c), value.effective_from, current.id]);
  await c.tx.query(`INSERT INTO app.registry_activity_versions(tenant_id,legal_entity_id,environment_id,id,activity_id,version,purpose_version_id,condition_id,notice_version_ids,requirement_ids,evidence_state,effective_from,change_reason,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
  [...scope(c), next, id, current.version + 1, value.purpose_version_id, value.condition_id, value.notice_version_ids, value.requirement_ids, value.evidence_state, value.effective_from, value.change_reason, c.actor.actor_id]);
  await c.tx.query(`UPDATE app.registry_activity_versions SET superseded_by=$4 WHERE ${predicate} AND id=$5`, [...scope(c), next, current.id]);
  await emit(c, 'processing_activity_updated', 'registry_activity', id, { version: current.version + 1, reason: value.change_reason });
  await audit(c, 'registry_activity.revise', id);
  return activityView(c, id);
}

const LINK_TARGET: Record<string, [string, string]> = {
  PRINCIPAL_CATEGORY: ['data_principal_categories', 'principal_category_id'], DATA_CATEGORY: ['personal_data_categories', 'data_category_id'],
  SYSTEM: ['systems', 'system_id'], PROCESSOR_ENGAGEMENT: ['processor_engagements', 'engagement_id'], RETENTION_RULE: ['retention_rules', 'retention_rule_id'],
  SAFEGUARD: ['security_safeguards', 'safeguard_id'],
};
export async function linkActivity(c: Context, id: string, input: unknown) {
  const value = R.ActivityLinkCreate.parse(input);
  await exists(c, 'registry_activities', id, 'id');
  const columns: Record<string, string | null> = { principal_category_id: null, data_category_id: null, system_id: null, engagement_id: null, retention_rule_id: null, safeguard_id: null, channel: null };
  if (value.link_kind === 'CHANNEL') columns.channel = value.channel;
  else { const [table, column] = LINK_TARGET[value.link_kind]!; await exists(c, table, value.target_id, 'target_id'); columns[column] = value.target_id; }
  const duplicate = await c.tx.query(`SELECT 1 FROM app.registry_activity_links WHERE ${predicate} AND activity_id=$4 AND link_kind=$5 AND valid_to IS NULL
    AND principal_category_id IS NOT DISTINCT FROM $6 AND data_category_id IS NOT DISTINCT FROM $7 AND system_id IS NOT DISTINCT FROM $8 AND engagement_id IS NOT DISTINCT FROM $9
    AND retention_rule_id IS NOT DISTINCT FROM $10 AND safeguard_id IS NOT DISTINCT FROM $11 AND channel IS NOT DISTINCT FROM $12`,
  [...scope(c), id, value.link_kind, columns.principal_category_id, columns.data_category_id, columns.system_id, columns.engagement_id, columns.retention_rule_id, columns.safeguard_id, columns.channel]);
  if (duplicate.rowCount) refuse(409, 'target_id', 'link_already_current');
  const linkId = randomUUID();
  await c.tx.query(`INSERT INTO app.registry_activity_links(tenant_id,legal_entity_id,environment_id,id,activity_id,link_kind,principal_category_id,data_category_id,system_id,engagement_id,retention_rule_id,safeguard_id,channel,basis,valid_from,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
  [...scope(c), linkId, id, value.link_kind, columns.principal_category_id, columns.data_category_id, columns.system_id, columns.engagement_id, columns.retention_rule_id, columns.safeguard_id, columns.channel, value.basis, value.valid_from, c.actor.actor_id]);
  if (value.link_kind === 'PROCESSOR_ENGAGEMENT') await emit(c, 'processor_relationship_changed', 'registry_activity', id, { engagement_id: value.target_id, change: 'linked' });
  await emit(c, 'processing_activity_updated', 'registry_activity', id, { link: value.link_kind });
  await audit(c, 'registry_activity.link', id);
  return activityView(c, id);
}
type LinkRow = { id: string; activity_id: string; link_kind: string; principal_category_id: string | null; data_category_id: string | null; system_id: string | null; engagement_id: string | null; retention_rule_id: string | null; safeguard_id: string | null; channel: string | null; basis: string; valid_from: Date; valid_to: Date | null };
const linkView = (l: LinkRow) => R.ActivityLink.parse({ id: l.id, activity_id: l.activity_id, link_kind: l.link_kind,
  target_id: l.principal_category_id ?? l.data_category_id ?? l.system_id ?? l.engagement_id ?? l.retention_rule_id ?? l.safeguard_id, channel: l.channel, basis: l.basis, valid_from: iso(l.valid_from), valid_to: iso(l.valid_to) });
export async function closeLink(c: Context, id: string, input: unknown) {
  const value = R.LinkClose.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.registry_activity_links WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0] as LinkRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  if (row.valid_to) refuse(409, 'valid_to', 'already_closed');
  if (Date.parse(value.valid_to) <= row.valid_from.getTime()) refuse(400, 'valid_to', 'before_valid_from');
  const closed = (await c.tx.query(`UPDATE app.registry_activity_links SET valid_to=$4 WHERE ${predicate} AND id=$5 RETURNING *`, [...scope(c), value.valid_to, id])).rows[0] as LinkRow;
  if (row.link_kind === 'PROCESSOR_ENGAGEMENT') await emit(c, 'processor_relationship_changed', 'registry_activity', row.activity_id, { engagement_id: row.engagement_id, change: 'unlinked', reason: value.reason });
  await emit(c, 'processing_activity_updated', 'registry_activity', row.activity_id, { closed_link: id, reason: value.reason });
  await audit(c, 'registry_activity.link_close', id);
  return linkView(closed);
}

export async function activityView(c: Context, id: string) {
  const s = scope(c);
  const row = (await c.tx.query(`SELECT * FROM app.registry_activities WHERE ${predicate} AND id=$4`, [...s, id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const versions = (await c.tx.query(`SELECT * FROM app.registry_activity_versions WHERE ${predicate} AND activity_id=$4 ORDER BY version LIMIT 100`, [...s, id])).rows;
  const links = (await c.tx.query(`SELECT * FROM app.registry_activity_links WHERE ${predicate} AND activity_id=$4 ORDER BY valid_from,id LIMIT 200`, [...s, id])).rows as LinkRow[];
  const current = versions.find(v => v.status === 'CURRENT');
  const condition = current?.condition_id ? (await c.tx.query(`SELECT code,unresolved FROM app.processing_conditions WHERE ${predicate} AND id=$4`, [...s, current.condition_id])).rows[0] : null;
  const live = links.filter(l => l.valid_to === null);
  const has = (kind: string) => live.some(l => l.link_kind === kind);
  const systems = live.filter(l => l.link_kind === 'SYSTEM').map(l => l.system_id!);
  const bound = systems.length ? (await c.tx.query(`SELECT system_id FROM app.connector_bindings WHERE ${predicate} AND valid_to IS NULL AND system_id=ANY($4::uuid[])`, [...s, systems])).rows.map(r => r.system_id) : [];
  const rules = Number((await c.tx.query(`SELECT count(*) n FROM app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND activity_id=$4`, [...s, id])).rows[0].n);
  const gaps: string[] = [];
  if (!condition) gaps.push('NO_CONDITION'); else if (condition.unresolved) gaps.push('CONDITION_UNRESOLVED');
  if (condition?.code === 'CONSENT' && !(current?.notice_version_ids ?? []).length) gaps.push('NO_NOTICE_FOR_CONSENT');
  if (!has('RETENTION_RULE') && rules === 0) gaps.push('NO_RETENTION_RULE');
  if (!has('SYSTEM')) gaps.push('NO_SYSTEM');
  if (!has('PRINCIPAL_CATEGORY')) gaps.push('NO_PRINCIPAL_CATEGORY');
  if (!has('DATA_CATEGORY')) gaps.push('NO_DATA_CATEGORY');
  if (row.processes_child_data === 'UNKNOWN') gaps.push('CHILD_DATA_UNKNOWN');
  if (systems.some(sys => !bound.includes(sys))) gaps.push('UNBOUND_SYSTEM');
  return R.Activity.parse({ id: row.id, name: row.name, description: row.description, owner_reference: row.owner_reference, status: row.status,
    processes_child_data: row.processes_child_data, graph_activity_id: row.graph_activity_id,
    versions: versions.map(v => ({ id: v.id, version: v.version, purpose_version_id: v.purpose_version_id, condition_id: v.condition_id, notice_version_ids: v.notice_version_ids,
      requirement_ids: v.requirement_ids, evidence_state: v.evidence_state, effective_from: iso(v.effective_from), effective_to: iso(v.effective_to), status: v.status,
      change_reason: v.change_reason, recorded_at: iso(v.recorded_at), recorded_by: v.recorded_by })),
    links: links.map(linkView), gaps, recorded_at: iso(row.recorded_at) });
}

export async function activityList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { system_id?: string; data_category_id?: string; as_of?: string };
  const at = q.as_of ? new Date(q.as_of) : new Date();
  const rows = (await c.tx.query(`SELECT a.id FROM app.registry_activities a WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3
    AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.activity_id=a.id AND l.system_id=$4 AND l.valid_from<=$6 AND (l.valid_to IS NULL OR l.valid_to>$6)))
    AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.activity_id=a.id AND l.data_category_id=$5 AND l.valid_from<=$6 AND (l.valid_to IS NULL OR l.valid_to>$6)))
    AND ($7::uuid IS NULL OR a.id>$7) ORDER BY a.id LIMIT $8`, [...scope(c), q.system_id ?? null, q.data_category_id ?? null, at, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const r of paged.items) items.push(await activityView(c, r.id));
  return { items, next_cursor: paged.next_cursor };
}
