import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, packageAt, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * Retention rules and holds (requirements s16, domain model s15-s17).
 * A rule's period exists only with the source that set it; a rule without one
 * is unresolved and never makes anything eligible. Holds are typed: an official
 * exemption, a customer-recorded other-law retention, or an operational hold.
 * An other-law hold is always customer supplied; nothing here infers one.
 */
type RuleRow = Record<string, unknown> & { id: string; duration_days: number | null; effective_from: Date; effective_to: Date | null; recorded_at: Date };
const ruleView = (r: RuleRow) => R.RetentionRule.parse({ id: r.id, rule_key: r.rule_key, version: r.version, name: r.name, activity_id: r.activity_id, principal_category_id: r.principal_category_id,
  data_category_id: r.data_category_id, system_id: r.system_id, trigger: r.trigger, duration_days: r.duration_days, duration_source: r.duration_source, source_reference: r.source_reference,
  requirement_id: r.requirement_id, approval_required: r.approval_required, erasure_action: r.erasure_action, effective_from: iso(r.effective_from), effective_to: iso(r.effective_to),
  status: r.status, resolved: r.duration_days !== null, recorded_at: iso(r.recorded_at) });

async function checkRequirement(c: Context, requirementId: string | null) {
  if (!requirementId) return;
  const pkg = await packageAt(c, new Date());
  if (!pkg?.claims.requirements.some(r => r.requirement_id === requirementId)) refuse(409, 'requirement_id', 'requirement_not_in_active_package');
}

export async function createRule(c: Context, input: unknown) {
  const value = R.RetentionRuleCreate.parse(input);
  await exists(c, 'registry_activities', value.activity_id, 'activity_id');
  await exists(c, 'data_principal_categories', value.principal_category_id, 'principal_category_id');
  await exists(c, 'personal_data_categories', value.data_category_id, 'data_category_id');
  await exists(c, 'systems', value.system_id, 'system_id');
  await checkRequirement(c, value.requirement_id);
  if (value.trigger !== 'RELATIONSHIP_ENDED' && !value.activity_id) refuse(400, 'activity_id', 'trigger_needs_an_activity');
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.retention_rules(tenant_id,legal_entity_id,environment_id,id,rule_key,version,name,activity_id,principal_category_id,data_category_id,system_id,trigger,duration_days,duration_source,source_reference,requirement_id,approval_required,erasure_action,effective_from,status,recorded_by)
    VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'ACTIVE',$19) RETURNING *`,
  [...scope(c), id, randomUUID(), value.name, value.activity_id, value.principal_category_id, value.data_category_id, value.system_id, value.trigger, value.duration_days, value.duration_source,
    value.source_reference, value.requirement_id, value.approval_required, value.erasure_action, value.effective_from, c.actor.actor_id])).rows[0];
  await audit(c, 'retention_rule.create', id);
  return ruleView(row);
}

/** A revision is a new version under the same rule key; the previous version is closed, not edited. */
export async function reviseRule(c: Context, id: string, input: unknown) {
  const value = R.RetentionRuleRevise.parse(input);
  if ((value.duration_days === null) !== (value.duration_source === null) || (value.duration_days !== null && value.source_reference === null)) refuse(400, 'duration_source', 'a_duration_names_its_source');
  if (value.duration_source === 'REGULATORY_REQUIREMENT' && !value.requirement_id) refuse(400, 'requirement_id', 'regulatory_duration_cites_requirement');
  await checkRequirement(c, value.requirement_id);
  const current = (await c.tx.query(`SELECT * FROM app.retention_rules WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!current) refuse(404, 'id', 'not_found');
  if (current.status !== 'ACTIVE' || current.effective_to !== null) refuse(409, 'id', 'only_the_current_version_is_revised');
  if (Date.parse(value.effective_from) <= current.effective_from.getTime()) refuse(400, 'effective_from', 'must_follow_current_version');
  const next = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.retention_rules(tenant_id,legal_entity_id,environment_id,id,rule_key,version,name,activity_id,principal_category_id,data_category_id,system_id,trigger,duration_days,duration_source,source_reference,requirement_id,approval_required,erasure_action,effective_from,status,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,'ACTIVE',$20) RETURNING *`,
  [...scope(c), next, current.rule_key, current.version + 1, current.name, current.activity_id, current.principal_category_id, current.data_category_id, current.system_id, current.trigger,
    value.duration_days, value.duration_source, value.source_reference, value.requirement_id, value.approval_required, value.erasure_action, value.effective_from, c.actor.actor_id])).rows[0];
  await c.tx.query(`UPDATE app.retention_rules SET status='RETIRED',effective_to=$4,superseded_by=$5 WHERE ${predicate} AND id=$6`, [...scope(c), value.effective_from, next, id]);
  await audit(c, 'retention_rule.revise', next);
  return ruleView(row);
}
export async function ruleList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.retention_rules WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(ruleView), next_cursor: paged.next_cursor };
}

type HoldRow = Record<string, unknown> & { id: string; starts_at: Date; ends_at: Date | null; review_at: Date; released_at: Date | null; recorded_at: Date; recorded_by: string; state: string };
const holdView = (h: HoldRow) => R.RetentionHold.parse({ id: h.id, hold_type: h.hold_type, authority_reference: h.authority_reference, reason: h.reason, subject_id: h.subject_id, activity_id: h.activity_id,
  system_id: h.system_id, data_category_id: h.data_category_id, starts_at: iso(h.starts_at), ends_at: iso(h.ends_at), review_at: iso(h.review_at), owner_reference: h.owner_reference,
  evidence_reference: h.evidence_reference, requirement_id: h.requirement_id, state: h.state, released_at: iso(h.released_at), release_reason: h.release_reason,
  review_overdue: h.state === 'ACTIVE' && h.review_at.getTime() < Date.now(), recorded_at: iso(h.recorded_at) });

export async function createHold(c: Context, input: unknown) {
  const value = R.RetentionHoldCreate.parse(input);
  await exists(c, 'data_principals', value.subject_id, 'subject_id');
  await exists(c, 'registry_activities', value.activity_id, 'activity_id');
  await exists(c, 'systems', value.system_id, 'system_id');
  await exists(c, 'personal_data_categories', value.data_category_id, 'data_category_id');
  if (value.hold_type === 'OFFICIAL_EXEMPTION') await checkRequirement(c, value.requirement_id);
  if (value.ends_at && Date.parse(value.ends_at) <= Date.parse(value.starts_at)) refuse(400, 'ends_at', 'ends_before_it_starts');
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.retention_holds(tenant_id,legal_entity_id,environment_id,id,hold_type,authority_reference,reason,subject_id,activity_id,system_id,data_category_id,starts_at,ends_at,review_at,owner_reference,evidence_reference,requirement_id,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18) RETURNING *`,
  [...scope(c), id, value.hold_type, value.authority_reference, value.reason, value.subject_id, value.activity_id, value.system_id, value.data_category_id, value.starts_at, value.ends_at, value.review_at,
    value.owner_reference, value.evidence_reference, value.requirement_id, c.actor.actor_id])).rows[0];
  await audit(c, 'retention_hold.create', id);
  return holdView(row);
}
/** Removing a hold is an approval act, by someone other than the person who placed it. */
export async function releaseHold(c: Context, id: string, input: unknown) {
  const value = R.RetentionHoldRelease.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.retention_holds WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0] as HoldRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  if (row.state !== 'ACTIVE') refuse(409, 'state', 'already_released');
  if (row.recorded_by === c.actor.actor_id) throw new AccessError(403, 'FORBIDDEN', [{ field: 'released_by', code: 'placer_cannot_release' }]);
  const updated = (await c.tx.query(`UPDATE app.retention_holds SET state='RELEASED',released_at=clock_timestamp(),released_by=$4,release_reason=$5 WHERE ${predicate} AND id=$6 RETURNING *`,
    [...scope(c), c.actor.actor_id, value.reason, id])).rows[0];
  await audit(c, 'retention_hold.release', id);
  return holdView(updated);
}
export async function holdList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { subject_id?: string; active?: 'true' | 'false' };
  const rows = (await c.tx.query(`SELECT * FROM app.retention_holds WHERE ${predicate} AND ($4::uuid IS NULL OR subject_id=$4) AND ($5::text IS NULL OR (state='ACTIVE')=($5='true'))
    AND ($6::uuid IS NULL OR id>$6) ORDER BY id LIMIT $7`, [...scope(c), q.subject_id ?? null, q.active ?? null, page.cursor, page.limit + 1])).rows as HoldRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(holdView), next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------- Rule 8(2): 48-hour intimation before Third Schedule erasure
export const THIRD_SCHEDULE = 'DPDP-RETENTION-THIRD-SCHEDULE';
const HOURS_48 = 48 * 3_600_000;
type IntimationRow = { id: string; subject_id: string; rule_id: string; erasure_due_at: Date; intimated_at: Date; channel: string; evidence_reference: string; re_engaged_at: Date | null; re_engagement_basis: string | null; recorded_at: Date };
const intimationView = (r: IntimationRow) => R.ErasureIntimation.parse({ id: r.id, subject_id: r.subject_id, rule_id: r.rule_id, erasure_due_at: iso(r.erasure_due_at), intimated_at: iso(r.intimated_at),
  channel: r.channel, evidence_reference: r.evidence_reference, erasable_from: iso(new Date(Math.max(r.erasure_due_at.getTime(), r.intimated_at.getTime() + HOURS_48))),
  re_engaged_at: iso(r.re_engaged_at), re_engagement_basis: r.re_engagement_basis, recorded_at: iso(r.recorded_at) });
/** The latest intimation for a person under a rule, or null. The retention evaluator gates Third Schedule erasure on it. */
export async function latestIntimation(c: Context, subjectId: string, ruleId: string) {
  return ((await c.tx.query(`SELECT * FROM app.erasure_intimations WHERE ${predicate} AND subject_id=$4 AND rule_id=$5 ORDER BY intimated_at DESC, id DESC LIMIT 1`, [...scope(c), subjectId, ruleId])).rows[0] ?? null) as IntimationRow | null;
}
export async function recordIntimation(c: Context, input: unknown) {
  const v = R.ErasureIntimationRecord.parse(input);
  const rule = (await c.tx.query(`SELECT id, requirement_id FROM app.retention_rules WHERE ${predicate} AND id=$4`, [...scope(c), v.rule_id])).rows[0];
  if (!rule) refuse(404, 'rule_id', 'not_found');
  if (rule.requirement_id !== THIRD_SCHEDULE) refuse(409, 'rule_id', 'rule_does_not_cite_the_third_schedule');
  const state = (await c.tx.query(`SELECT state, eligible_at FROM app.retention_states WHERE ${predicate} AND subject_id=$4 AND rule_id=$5`, [...scope(c), v.subject_id, v.rule_id])).rows[0];
  if (!state || !state.eligible_at) refuse(409, 'subject_id', 'no_erasure_date_evaluated_for_this_person');
  if (state.state === 'ERASED') refuse(409, 'subject_id', 'already_erased');
  if (Date.parse(v.intimated_at) > Date.now() + 5 * 60_000) refuse(400, 'intimated_at', 'in_the_future');
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.erasure_intimations(tenant_id,legal_entity_id,environment_id,id,subject_id,rule_id,erasure_due_at,intimated_at,channel,evidence_reference,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [...scope(c), id, v.subject_id, v.rule_id, state.eligible_at, v.intimated_at, v.channel, v.evidence_reference, c.actor.actor_id])).rows[0] as IntimationRow;
  await audit(c, 'retention.erasure_intimation.recorded', id);
  return intimationView(row);
}
export async function recordReEngagement(c: Context, id: string, input: unknown) {
  const v = R.ErasureReEngagement.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.erasure_intimations WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0] as IntimationRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  if (row!.re_engaged_at) refuse(409, 'id', 'already_recorded');
  if (Date.parse(v.re_engaged_at) < row!.intimated_at.getTime()) refuse(400, 're_engaged_at', 'before_the_intimation');
  const updated = (await c.tx.query(`UPDATE app.erasure_intimations SET re_engaged_at=$5, re_engagement_basis=$6 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, v.re_engaged_at, v.basis])).rows[0] as IntimationRow;
  await audit(c, 'retention.erasure_intimation.re_engaged', id);
  return intimationView(updated);
}
export async function intimationList(c: Context, page: Page, query: unknown) {
  const q = R.ErasureIntimationQuery.parse(query ?? {});
  const rows = (await c.tx.query(`SELECT * FROM app.erasure_intimations WHERE ${predicate} AND ($4::uuid IS NULL OR subject_id=$4) AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`,
    [...scope(c), q.subject_id ?? null, page.cursor, page.limit + 1])).rows as IntimationRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(intimationView), next_cursor: paged.next_cursor };
}
type DueRow = { subject_id: string; rule_id: string; rule_name: string; eligible_at: Date; intimation_id: string | null; intimated_at: Date | null };
/** People under Third Schedule rules whose erasure date is known and not yet carried out, with the time the intimation is due. */
export async function intimationsDue(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT st.subject_id, st.rule_id, r.name AS rule_name, st.eligible_at,
      (SELECT i.id FROM app.erasure_intimations i WHERE i.tenant_id=st.tenant_id AND i.legal_entity_id=st.legal_entity_id AND i.environment_id=st.environment_id AND i.subject_id=st.subject_id AND i.rule_id=st.rule_id ORDER BY i.intimated_at DESC LIMIT 1) AS intimation_id,
      (SELECT i.intimated_at FROM app.erasure_intimations i WHERE i.tenant_id=st.tenant_id AND i.legal_entity_id=st.legal_entity_id AND i.environment_id=st.environment_id AND i.subject_id=st.subject_id AND i.rule_id=st.rule_id ORDER BY i.intimated_at DESC LIMIT 1) AS intimated_at
    FROM app.retention_states st JOIN app.retention_rules r ON r.tenant_id=st.tenant_id AND r.legal_entity_id=st.legal_entity_id AND r.environment_id=st.environment_id AND r.id=st.rule_id
    WHERE st.tenant_id=$1 AND st.legal_entity_id=$2 AND st.environment_id=$3 AND r.requirement_id=$4 AND st.eligible_at IS NOT NULL AND st.state NOT IN ('ERASED','SCHEDULED')
      AND ($5::text IS NULL OR (st.subject_id::text || ':' || st.rule_id::text) > $5)
    ORDER BY st.subject_id::text || ':' || st.rule_id::text LIMIT $6`, [...scope(c), THIRD_SCHEDULE, page.cursor, page.limit + 1])).rows as DueRow[];
  const paged = pageOf(rows, page.limit, r => `${r.subject_id}:${r.rule_id}`);
  return { items: paged.items.map(r => R.ErasureIntimationDue.parse({
    subject_id: r.subject_id, rule_id: r.rule_id, rule_name: r.rule_name, erasure_due_at: iso(r.eligible_at), intimate_by: iso(new Date(r.eligible_at.getTime() - HOURS_48)),
    overdue: !r.intimation_id && r.eligible_at.getTime() - HOURS_48 < Date.now(), intimation_id: r.intimation_id, intimated_at: iso(r.intimated_at) })), next_cursor: paged.next_cursor };
}
