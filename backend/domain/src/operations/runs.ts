import { randomUUID } from 'node:crypto';
import * as O from '../../../../shared/contracts/src/operations.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { adapterFor } from '../../../../connectors/src/shared/connector-adapters.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, iso, packageById, pageOf, predicate, recordEvidence, refuse, requirePackage, scope } from './shared.ts';

/**
 * Workflow runs (architecture s9-s10, integrations s3-s6, s13-s14).
 *
 * A run pins the workflow version, the regulatory package and the configuration
 * it used, generates one downstream action per target, and keeps every action's
 * state distinct. Destructive runs are evaluated in bounded batches into a dry
 * run whose scope is hashed; an approval binds that exact hash, and the person
 * who approves is never the person who created the run.
 */
export const WORKFLOW_VERSION = '1.0.0';
const OPEN_STATUSES = ['EVALUATING', 'DRY_RUN_READY', 'AWAITING_APPROVAL', 'APPROVED', 'RUNNING', 'PARTIALLY_FAILED'];
const DESTRUCTIVE = new Set(['ERASE', 'ANONYMISE']);
const CAPABILITY_FOR: Record<string, 'suppress' | 'erase' | 'anonymise' | 'correct' | 'read_reference'> = { SUPPRESS: 'suppress', ERASE: 'erase', ANONYMISE: 'anonymise', CORRECT: 'correct', READ_REFERENCE: 'read_reference' };

export const actionKey = (runId: string, ordinal: number) => digest({ run_id: runId, ordinal });

type Binding = { system_id: string; adapter: string; capabilities: Record<string, unknown>; system_of_record_for: string[]; holds_data_categories: string[] };
export async function bindings(c: Context, systemIds: string[]) {
  const rows = systemIds.length ? (await c.tx.query(`SELECT system_id,adapter,capabilities,system_of_record_for,holds_data_categories FROM app.connector_bindings WHERE ${predicate} AND valid_to IS NULL AND system_id=ANY($4::uuid[])`, [...scope(c), systemIds])).rows as Binding[] : [];
  return new Map(rows.map(b => [b.system_id, b]));
}
/** Whether the bound adapter declares this capability. Declared capabilities come from adapter code. */
export function supportsAction(binding: Binding | undefined, actionType: string) {
  const adapter = adapterFor(binding?.adapter);
  return Boolean(adapter && adapter.supports(actionType as never) && (adapter.capabilities as Record<string, unknown>)[CAPABILITY_FOR[actionType] ?? ''] === true);
}

/** Active holds that cover a subject, a system, one of the system's data categories or an activity using the system. */
export async function coveringHolds(c: Context, subjectId: string | null, systemId: string | null, categories: string[], activityIds: string[]) {
  return (await c.tx.query(`SELECT id FROM app.retention_holds WHERE ${predicate} AND state='ACTIVE' AND starts_at<=clock_timestamp() AND (ends_at IS NULL OR ends_at>clock_timestamp())
    AND ((subject_id IS NOT NULL AND subject_id=$4) OR (system_id IS NOT NULL AND system_id=$5) OR (data_category_id IS NOT NULL AND data_category_id=ANY($6::uuid[])) OR (activity_id IS NOT NULL AND activity_id=ANY($7::uuid[])))
    AND (subject_id IS NULL OR subject_id=$4)`, [...scope(c), subjectId, systemId, categories, activityIds])).rows.map(r => r.id as string);
}

type ActionInput = { subject_id: string | null; system_id: string | null; engagement_id: string | null; target_reference: string | null; action_type: string;
  state: 'pending' | 'awaiting_approval' | 'blocked' | 'not_supported'; block_reason?: string | null; hold_ids?: string[]; payload?: Record<string, string> | null };
export async function insertAction(c: Context, runId: string, ordinal: number, input: ActionInput) {
  const id = randomUUID();
  const payloadDigest = input.payload ? digest(input.payload) : null;
  await c.tx.query(`INSERT INTO app.downstream_actions(tenant_id,legal_entity_id,environment_id,id,run_id,ordinal,subject_id,system_id,engagement_id,target_reference,action_type,idempotency_key,payload_digest,state,target_result,block_reason,hold_ids)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
  [...scope(c), id, runId, ordinal, input.subject_id, input.system_id, input.engagement_id, input.target_reference, input.action_type, actionKey(runId, ordinal), payloadDigest,
    input.state, input.state === 'not_supported' ? 'NOT_SUPPORTED' : 'NONE', input.state === 'blocked' ? input.block_reason : null, input.hold_ids ?? []]);
  if (input.payload) await c.tx.query(`INSERT INTO app.downstream_action_payloads(tenant_id,legal_entity_id,environment_id,action_id,payload) VALUES($1,$2,$3,$4,$5)`, [...scope(c), id, input.payload]);
  if (DESTRUCTIVE.has(input.action_type)) await emit(c, 'erasure_action_requested', 'downstream_action', id, { run_id: runId, system_id: input.system_id, state: input.state }, runId);
  return id;
}

async function insertRun(c: Context, value: { kind: string; package_row_id: string; configuration: Record<string, unknown>; trigger: Record<string, unknown>; subject_id?: string | null;
  rights_request_id?: string | null; retention_rule_id?: string | null; engagement_id?: string | null; consent_event_id?: string | null; status: string; approval_required: boolean }) {
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.workflow_runs(tenant_id,legal_entity_id,environment_id,id,kind,workflow_version,package_row_id,configuration,trigger,subject_id,rights_request_id,retention_rule_id,engagement_id,consent_event_id,status,approval_required,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`,
  [...scope(c), id, value.kind, WORKFLOW_VERSION, value.package_row_id, value.configuration, value.trigger, value.subject_id ?? null, value.rights_request_id ?? null,
    value.retention_rule_id ?? null, value.engagement_id ?? null, value.consent_event_id ?? null, value.status, value.approval_required, c.actor.actor_id]);
  return id;
}

/** The scope an approval binds: every action, its target and its initial state, in order. */
export async function scopeHash(c: Context, runId: string) {
  const rows = (await c.tx.query(`SELECT ordinal,subject_id,system_id,engagement_id,target_reference,action_type,payload_digest,block_reason FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 ORDER BY ordinal`, [...scope(c), runId])).rows;
  return digest(rows);
}
async function finishPlanning(c: Context, runId: string, approvalRequired: boolean) {
  const hash = await scopeHash(c, runId);
  await c.tx.query(`UPDATE app.workflow_runs SET scope_hash=$4,evaluation_complete=true,status=$5,updated_at=clock_timestamp() WHERE ${predicate} AND id=$6`,
    [...scope(c), hash, approvalRequired ? 'DRY_RUN_READY' : 'APPROVED', runId]);
}

/**
 * Consent withdrawal (integrations s4). Stop/suppression actions are created for
 * each system the activity uses, where the bound connector implements it. A
 * withdrawal never deletes by itself: erasure follows only through retention
 * evaluation, which honours holds and sourced retention periods.
 */
export async function createWithdrawalRun(c: Context, recordId: string, eventId: string) {
  const s = scope(c);
  const pkg = await requirePackage(c);
  const record = (await c.tx.query(`SELECT * FROM app.consent_records WHERE ${predicate} AND id=$4`, [...s, recordId])).rows[0];
  const version = (await c.tx.query(`SELECT v.id,pc.code FROM app.registry_activity_versions v LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.activity_id=$4 AND v.status='CURRENT'`, [...s, record.activity_id])).rows[0];
  const systems = (await c.tx.query(`SELECT system_id FROM app.registry_activity_links WHERE ${predicate} AND activity_id=$4 AND link_kind='SYSTEM' AND valid_to IS NULL ORDER BY system_id`, [...s, record.activity_id])).rows.map(r => r.system_id as string);
  const bound = await bindings(c, systems);
  const requirements = pkg.claims.requirements.filter(r => r.modules.includes('CONSENT')).map(r => r.requirement_id);
  const runId = await insertRun(c, { kind: 'CONSENT_WITHDRAWAL', package_row_id: pkg.id, subject_id: record.subject_id, consent_event_id: eventId, status: 'EVALUATING', approval_required: false,
    configuration: { activity_version_id: version?.id ?? null, condition_code: version?.code ?? null, requirement_ids: requirements, bindings: systems.map(sys => ({ system_id: sys, adapter: bound.get(sys)?.adapter ?? null })) },
    trigger: { kind: 'CONSENT_WITHDRAWN', consent_record_id: recordId, consent_event_id: eventId } });
  let ordinal = 0;
  for (const system of systems) {
    const ref = (await c.tx.query(`SELECT target_reference FROM app.data_principal_references WHERE ${predicate} AND subject_id=$4 AND system_id=$5 ORDER BY recorded_at LIMIT 1`, [...s, record.subject_id, system])).rows[0];
    const binding = bound.get(system);
    if (!ref) await insertAction(c, runId, ordinal++, { subject_id: record.subject_id, system_id: system, engagement_id: null, target_reference: null, action_type: 'SUPPRESS', state: 'blocked', block_reason: 'NO_SUBJECT_REFERENCE_IN_SYSTEM' });
    else if (!supportsAction(binding, 'SUPPRESS')) await insertAction(c, runId, ordinal++, { subject_id: record.subject_id, system_id: system, engagement_id: null, target_reference: ref.target_reference, action_type: 'SUPPRESS', state: 'not_supported' });
    else await insertAction(c, runId, ordinal++, { subject_id: record.subject_id, system_id: system, engagement_id: null, target_reference: ref.target_reference, action_type: 'SUPPRESS', state: 'pending' });
  }
  await c.tx.query(`UPDATE app.workflow_runs SET counts=$4 WHERE ${predicate} AND id=$5`, [...s, { total_discovered: systems.length, eligible: systems.length, blocked: 0, unresolved: 0 }, runId]);
  await finishPlanning(c, runId, false);
  return runId;
}

const RIGHT_ACTION: Record<string, string | null> = { ERASE_RECORD: 'ERASE', CORRECT_RECORD: 'CORRECT', RESTRICT_PROCESSING: 'SUPPRESS', DISCLOSE_COPY: 'READ_REFERENCE', NO_ACTION_REQUIRED: null };

/**
 * Rights execution (integrations s3, s5). The V1 request supplies intake,
 * identity, authority and scope; only a request that V1 has moved into
 * execution can run here. Erasure honours recorded holds, and a correction is
 * written first to the configured system of record; with no single configured
 * system of record the correction is blocked rather than guessed.
 */
export async function createRightsRun(c: Context, input: unknown) {
  const value = O.RightsRunCreate.parse(input);
  const s = scope(c);
  const request = (await c.tx.query(`SELECT * FROM app.rights_requests WHERE ${predicate} AND id=$4`, [...s, value.rights_request_id])).rows[0];
  if (!request) refuse(404, 'rights_request_id', 'not_found');
  if (!['EXECUTING', 'PARTIALLY_COMPLETED'].includes(request.state)) refuse(409, 'rights_request_id', 'request_not_in_execution');
  const subject = (await c.tx.query(`SELECT principal_id,status FROM app.data_principals WHERE ${predicate} AND id=$4`, [...s, value.subject_id])).rows[0];
  if (!subject) refuse(404, 'subject_id', 'not_found');
  if (subject.principal_id !== request.principal_id) refuse(409, 'subject_id', 'subject_is_not_the_requesting_principal');
  if ((await c.tx.query(`SELECT 1 FROM app.workflow_runs WHERE ${predicate} AND rights_request_id=$4 AND status=ANY($5::text[])`, [...s, value.rights_request_id, OPEN_STATUSES])).rowCount) refuse(409, 'rights_request_id', 'open_run_exists');
  const pkg = await requirePackage(c);
  const plan = (await c.tx.query(`SELECT system_id,action,retention_exception FROM app.rights_request_plan_items WHERE ${predicate} AND request_id=$4 ORDER BY system_id`, [...s, value.rights_request_id])).rows;
  const already = new Set((await c.tx.query(`SELECT system_id FROM app.rights_request_outcomes WHERE ${predicate} AND request_id=$4`, [...s, value.rights_request_id])).rows.map(r => r.system_id));
  const systems = plan.map(p => p.system_id as string);
  const bound = await bindings(c, systems);
  if (request.right_type === 'CORRECTION' && !value.corrections.length) refuse(400, 'corrections', 'correction_request_names_the_corrected_values');
  // The authoritative source is configuration, never inferred.
  const recordSystems = new Map<string, string[]>();
  for (const correction of value.corrections) recordSystems.set(correction.data_category_id, [...bound.values()].filter(b => b.system_of_record_for.includes(correction.data_category_id)).map(b => b.system_id));
  const unresolvedAuthority = [...recordSystems.entries()].filter(([, list]) => list.length !== 1).map(([category]) => category);
  const activityIds = (await c.tx.query(`SELECT DISTINCT activity_id FROM app.registry_activity_links WHERE ${predicate} AND link_kind='SYSTEM' AND valid_to IS NULL AND system_id=ANY($4::uuid[])`, [...s, systems])).rows.map(r => r.activity_id);
  const sharing = (await c.tx.query(`SELECT id,activity_id,data_category_id,engagement_id,recipient_reference,purpose_version_id FROM app.data_sharing_links WHERE ${predicate} AND valid_to IS NULL AND activity_id=ANY($4::uuid[]) LIMIT 100`, [...s, activityIds])).rows;
  const kind = request.right_type === 'CORRECTION' ? 'CORRECTION' : 'RIGHTS_EXECUTION';
  const planned = plan.filter(p => RIGHT_ACTION[p.action] && !already.has(p.system_id));
  const destructive = planned.some(p => DESTRUCTIVE.has(RIGHT_ACTION[p.action]!));
  const runId = await insertRun(c, { kind, package_row_id: pkg.id, subject_id: value.subject_id, rights_request_id: value.rights_request_id, status: 'EVALUATING', approval_required: destructive,
    configuration: { right_type: request.right_type, bindings: systems.map(sys => ({ system_id: sys, adapter: bound.get(sys)?.adapter ?? null })),
      requirement_ids: pkg.claims.requirements.filter(r => r.modules.includes('RIGHTS') || r.modules.includes('GRIEVANCE')).map(r => r.requirement_id),
      sharing_register: sharing, systems_of_record: Object.fromEntries(recordSystems), authoritative_source_unresolved: unresolvedAuthority },
    trigger: { kind: 'RIGHTS_REQUEST', rights_request_id: value.rights_request_id, right_type: request.right_type, unresolved_destinations: request.document.unresolved_destinations ?? [] } });
  // The system of record is corrected before any copy of it.
  const authoritative = new Set([...recordSystems.values()].flat());
  // System of record first, then copies that hold a corrected category, then the rest (whose actions are unsupported or blocked).
  const rank = (systemId: string) => authoritative.has(systemId) ? 0 : value.corrections.some(cr => bound.get(systemId)?.holds_data_categories.includes(cr.data_category_id)) ? 1 : 2;
  planned.sort((a, b) => rank(a.system_id) - rank(b.system_id));
  let ordinal = 0; let blocked = 0;
  for (const item of planned) {
    const actionType = RIGHT_ACTION[item.action]!;
    const binding = bound.get(item.system_id);
    const ref = (await c.tx.query(`SELECT target_reference FROM app.data_principal_references WHERE ${predicate} AND subject_id=$4 AND system_id=$5 ORDER BY recorded_at LIMIT 1`, [...s, value.subject_id, item.system_id])).rows[0];
    const base = { subject_id: value.subject_id, system_id: item.system_id, engagement_id: null, target_reference: ref?.target_reference ?? null, action_type: actionType };
    const initial = destructive ? 'awaiting_approval' as const : 'pending' as const;
    if (!ref) { blocked++; await insertAction(c, runId, ordinal++, { ...base, state: 'blocked', block_reason: 'NO_SUBJECT_REFERENCE_IN_SYSTEM' }); continue; }
    if (!supportsAction(binding, actionType)) { await insertAction(c, runId, ordinal++, { ...base, state: 'not_supported' }); continue; }
    if (actionType === 'ERASE' || actionType === 'ANONYMISE') {
      const systemActivities = (await c.tx.query(`SELECT DISTINCT activity_id FROM app.registry_activity_links WHERE ${predicate} AND link_kind='SYSTEM' AND valid_to IS NULL AND system_id=$4`, [...s, item.system_id])).rows.map(r => r.activity_id);
      const holds = await coveringHolds(c, value.subject_id, item.system_id, binding!.holds_data_categories, systemActivities);
      if (holds.length || item.retention_exception) { blocked++; await insertAction(c, runId, ordinal++, { ...base, state: 'blocked', block_reason: holds.length ? 'BLOCKED_BY_RECORDED_HOLD' : 'RETENTION_EXCEPTION_ON_PLAN', hold_ids: holds }); continue; }
    }
    if (actionType === 'CORRECT') {
      const applicable = value.corrections.filter(cr => binding!.holds_data_categories.includes(cr.data_category_id) || binding!.system_of_record_for.includes(cr.data_category_id));
      if (!applicable.length) { blocked++; await insertAction(c, runId, ordinal++, { ...base, state: 'blocked', block_reason: 'NO_CORRECTION_APPLIES_TO_SYSTEM' }); continue; }
      if (applicable.some(cr => unresolvedAuthority.includes(cr.data_category_id))) { blocked++; await insertAction(c, runId, ordinal++, { ...base, state: 'blocked', block_reason: 'AUTHORITATIVE_SOURCE_UNRESOLVED' }); continue; }
      await insertAction(c, runId, ordinal++, { ...base, state: initial, payload: Object.fromEntries(applicable.map(cr => [cr.field, cr.value])) });
      continue;
    }
    await insertAction(c, runId, ordinal++, { ...base, state: initial });
  }
  await c.tx.query(`UPDATE app.workflow_runs SET counts=$4 WHERE ${predicate} AND id=$5`, [...s, { total_discovered: plan.length, eligible: planned.length - blocked, blocked, unresolved: request.document.unresolved_destinations?.length ?? 0 }, runId]);
  await finishPlanning(c, runId, destructive);
  await emit(c, 'rights_request_updated', 'rights_request', value.rights_request_id, { run_id: runId });
  await audit(c, 'workflow_run.create_rights', runId);
  return runView(c, runId);
}

export async function createRetentionRun(c: Context, input: unknown) {
  const value = O.RetentionRunCreate.parse(input);
  const s = scope(c);
  const rule = (await c.tx.query(`SELECT * FROM app.retention_rules WHERE ${predicate} AND id=$4`, [...s, value.retention_rule_id])).rows[0];
  if (!rule) refuse(404, 'retention_rule_id', 'not_found');
  if (rule.status !== 'ACTIVE') refuse(409, 'retention_rule_id', 'rule_not_active');
  if ((await c.tx.query(`SELECT 1 FROM app.workflow_runs WHERE ${predicate} AND retention_rule_id=$4 AND status=ANY($5::text[])`, [...s, rule.id, OPEN_STATUSES])).rowCount) refuse(409, 'retention_rule_id', 'open_run_exists');
  const pkg = await requirePackage(c);
  const runId = await insertRun(c, { kind: 'RETENTION_ERASURE', package_row_id: pkg.id, retention_rule_id: rule.id, status: 'EVALUATING',
    approval_required: rule.approval_required || rule.erasure_action !== 'SUPPRESS',
    configuration: { rule_id: rule.id, rule_key: rule.rule_key, rule_version: rule.version, erasure_action: rule.erasure_action, duration_days: rule.duration_days, duration_source: rule.duration_source, source_reference: rule.source_reference,
      requirement_id: rule.requirement_id, requirement_ids: pkg.claims.requirements.filter(r => r.modules.includes('RETENTION')).map(r => r.requirement_id) },
    trigger: { kind: 'RETENTION_EVALUATION', rule_id: rule.id, trigger: rule.trigger } });
  await c.tx.query(`UPDATE app.workflow_runs SET counts=$4 WHERE ${predicate} AND id=$5`, [...s, { total_discovered: 0, eligible: 0, blocked: 0, unresolved: 0, not_yet_eligible: 0, purpose_active: 0, not_triggered: 0 }, runId]);
  await audit(c, 'workflow_run.create_retention', runId);
  return runView(c, runId);
}

type RuleRow = { id: string; activity_id: string | null; principal_category_id: string; data_category_id: string | null; system_id: string | null; trigger: string; duration_days: number | null; erasure_action: string };
/** One subject's retention position under one rule, from recorded facts only. */
export async function evaluateSubject(c: Context, rule: RuleRow, subjectId: string, conditionUnresolved: boolean, activitySystems: string[], purposeRetiredAt: Date | null, now: Date) {
  const s = scope(c);
  const result = { state: 'UNRESOLVED', trigger_at: null as Date | null, eligible_at: null as Date | null, hold_ids: [] as string[], purpose: 'UNKNOWN', reason: null as string | null, systems: [] as string[] };
  if (rule.duration_days === null) { result.reason = 'The rule has no sourced retention period.'; return result; }
  if (conditionUnresolved) { result.reason = 'The processing condition for the activity is unresolved.'; return result; }
  if (rule.trigger === 'RELATIONSHIP_ENDED') {
    const rels = (await c.tx.query(`SELECT status,effective_to FROM app.data_principal_relationships WHERE ${predicate} AND subject_id=$4 AND category_id=$5`, [...s, subjectId, rule.principal_category_id])).rows;
    if (rels.some(r => r.status === 'ACTIVE')) { result.state = 'PURPOSE_ACTIVE'; result.purpose = 'KNOWN_TRUE'; return result; }
    if (rels.some(r => r.status === 'UNKNOWN')) { result.reason = 'A relationship in scope has an unknown status.'; return result; }
    if (rels.some(r => r.effective_to === null)) { result.reason = 'A relationship ended on an unrecorded date.'; return result; }
    result.trigger_at = new Date(Math.max(...rels.map(r => r.effective_to.getTime())));
  } else if (rule.trigger === 'CONSENT_WITHDRAWN') {
    const record = (await c.tx.query(`SELECT id,current_status FROM app.consent_records WHERE ${predicate} AND subject_id=$4 AND activity_id=$5 ORDER BY updated_at DESC LIMIT 1`, [...s, subjectId, rule.activity_id])).rows[0];
    if (!record || record.current_status !== 'WITHDRAWN') {
      if (record?.current_status === 'GRANTED') { result.state = 'PURPOSE_ACTIVE'; result.purpose = 'KNOWN_TRUE'; } else result.state = 'NOT_TRIGGERED';
      return result;
    }
    const withdrawn = (await c.tx.query(`SELECT occurred_at FROM app.consent_record_events WHERE ${predicate} AND record_id=$4 AND event='WITHDRAWN' ORDER BY recorded_at DESC LIMIT 1`, [...s, record.id])).rows[0];
    if (!withdrawn?.occurred_at) { result.reason = 'The withdrawal time is not recorded.'; return result; }
    result.trigger_at = withdrawn.occurred_at;
  } else {
    if (!purposeRetiredAt) { result.state = 'PURPOSE_ACTIVE'; result.purpose = 'KNOWN_TRUE'; return result; }
    result.trigger_at = purposeRetiredAt;
  }
  result.purpose = 'KNOWN_FALSE';
  const triggeredAt = result.trigger_at as Date;
  result.eligible_at = new Date(triggeredAt.getTime() + rule.duration_days * 86_400_000);
  if (result.eligible_at > now) { result.state = 'NOT_YET_ELIGIBLE'; return result; }
  const systems = rule.system_id ? [rule.system_id] : activitySystems.length ? activitySystems
    : (await c.tx.query(`SELECT DISTINCT system_id FROM app.data_principal_references WHERE ${predicate} AND subject_id=$4`, [...s, subjectId])).rows.map(r => r.system_id);
  result.systems = systems;
  const holds = await coveringHolds(c, subjectId, rule.system_id, rule.data_category_id ? [rule.data_category_id] : [], rule.activity_id ? [rule.activity_id] : []);
  if (holds.length) { result.state = 'BLOCKED_BY_HOLD'; result.hold_ids = holds; return result; }
  result.state = 'ELIGIBLE';
  return result;
}

/** A bounded evaluation batch. The cursor is persisted, so evaluation resumes after interruption. */
export async function evaluateRun(c: Context, id: string, input: unknown) {
  const value = O.RunEvaluate.parse(input);
  const s = scope(c);
  const run = (await c.tx.query(`SELECT * FROM app.workflow_runs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!run) refuse(404, 'id', 'not_found');
  if (run.kind !== 'RETENTION_ERASURE' || run.status !== 'EVALUATING') refuse(409, 'status', 'run_is_not_evaluating');
  const rule = (await c.tx.query(`SELECT * FROM app.retention_rules WHERE ${predicate} AND id=$4`, [...s, run.retention_rule_id])).rows[0] as RuleRow;
  const now = new Date();
  let conditionUnresolved = false; let activitySystems: string[] = []; let purposeRetiredAt: Date | null = null;
  if (rule.activity_id) {
    const version = (await c.tx.query(`SELECT v.purpose_version_id,pc.unresolved,pc.id condition FROM app.registry_activity_versions v LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
      WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.activity_id=$4 AND v.status='CURRENT'`, [...s, rule.activity_id])).rows[0];
    conditionUnresolved = !version?.condition || version.unresolved === true;
    activitySystems = (await c.tx.query(`SELECT system_id FROM app.registry_activity_links WHERE ${predicate} AND activity_id=$4 AND link_kind='SYSTEM' AND valid_to IS NULL ORDER BY system_id`, [...s, rule.activity_id])).rows.map(r => r.system_id);
    if (version) {
      const retired = (await c.tx.query(`SELECT effective_from FROM app.registry_purpose_versions WHERE ${predicate} AND purpose_id=(SELECT purpose_id FROM app.registry_purpose_versions WHERE ${predicate} AND id=$4) AND status='RETIRED' ORDER BY version DESC LIMIT 1`, [...s, version.purpose_version_id])).rows[0];
      purposeRetiredAt = retired?.effective_from ?? null;
    }
  }
  const bound = await bindings(c, activitySystems.length ? activitySystems : rule.system_id ? [rule.system_id] : []);
  const subjects = (await c.tx.query(`SELECT DISTINCT p.id FROM app.data_principals p JOIN app.data_principal_relationships r ON r.tenant_id=p.tenant_id AND r.legal_entity_id=p.legal_entity_id AND r.environment_id=p.environment_id AND r.subject_id=p.id
    WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.status='ACTIVE' AND r.category_id=$4 AND ($5::uuid IS NULL OR p.id>$5) ORDER BY p.id LIMIT $6`,
  [...s, rule.principal_category_id, run.evaluation_cursor, value.limit])).rows.map(r => r.id as string);
  const counts = { ...run.counts } as Record<string, number>;
  let ordinal = Number((await c.tx.query(`SELECT COALESCE(max(ordinal)+1,0) n FROM app.downstream_actions WHERE ${predicate} AND run_id=$4`, [...s, id])).rows[0].n);
  const initial = run.approval_required ? 'awaiting_approval' as const : 'pending' as const;
  const action = rule.erasure_action;
  for (const subjectId of subjects) {
    counts.total_discovered = (counts.total_discovered ?? 0) + 1;
    const prior = (await c.tx.query(`SELECT state,run_id FROM app.retention_states WHERE ${predicate} AND subject_id=$4 AND rule_id=$5`, [...s, subjectId, rule.id])).rows[0];
    if (prior?.state === 'ERASED') { counts.already_erased = (counts.already_erased ?? 0) + 1; continue; }
    const evaluated = await evaluateSubject(c, rule, subjectId, conditionUnresolved, activitySystems, purposeRetiredAt, now);
    const key = { UNRESOLVED: 'unresolved', BLOCKED_BY_HOLD: 'blocked', ELIGIBLE: 'eligible', NOT_YET_ELIGIBLE: 'not_yet_eligible', PURPOSE_ACTIVE: 'purpose_active', NOT_TRIGGERED: 'not_triggered' }[evaluated.state]!;
    counts[key] = (counts[key] ?? 0) + 1;
    let state = evaluated.state;
    if (state === 'ELIGIBLE') {
      state = 'SCHEDULED';
      for (const system of evaluated.systems) {
        const binding = bound.get(system) ?? (await bindings(c, [system])).get(system);
        const ref = (await c.tx.query(`SELECT target_reference FROM app.data_principal_references WHERE ${predicate} AND subject_id=$4 AND system_id=$5 ORDER BY recorded_at LIMIT 1`, [...s, subjectId, system])).rows[0];
        const base = { subject_id: subjectId, system_id: system, engagement_id: null, target_reference: ref?.target_reference ?? null, action_type: action };
        if (!ref) await insertAction(c, id, ordinal++, { ...base, state: 'blocked', block_reason: 'NO_SUBJECT_REFERENCE_IN_SYSTEM' });
        else if (!supportsAction(binding, action)) await insertAction(c, id, ordinal++, { ...base, state: 'not_supported' });
        else await insertAction(c, id, ordinal++, { ...base, state: initial });
      }
      await emit(c, 'retention_trigger_reached', 'data_principal', subjectId, { rule_id: rule.id, eligible_at: iso(evaluated.eligible_at) }, id);
    }
    await c.tx.query(`INSERT INTO app.retention_states(tenant_id,legal_entity_id,environment_id,subject_id,rule_id,state,trigger_at,eligible_at,hold_ids,purpose_still_active,unresolved_reason,run_id,last_evaluated_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,clock_timestamp())
      ON CONFLICT(tenant_id,legal_entity_id,environment_id,subject_id,rule_id) DO UPDATE SET state=EXCLUDED.state,trigger_at=EXCLUDED.trigger_at,eligible_at=EXCLUDED.eligible_at,hold_ids=EXCLUDED.hold_ids,
        purpose_still_active=EXCLUDED.purpose_still_active,unresolved_reason=EXCLUDED.unresolved_reason,run_id=EXCLUDED.run_id,last_evaluated_at=EXCLUDED.last_evaluated_at`,
    [...s, subjectId, rule.id, state, evaluated.trigger_at, evaluated.eligible_at, evaluated.hold_ids, evaluated.purpose, evaluated.state === 'UNRESOLVED' ? evaluated.reason : null, state === 'SCHEDULED' ? id : null]);
  }
  const cursor = subjects.at(-1) ?? run.evaluation_cursor;
  await c.tx.query(`UPDATE app.workflow_runs SET counts=$4,evaluation_cursor=$5,updated_at=clock_timestamp() WHERE ${predicate} AND id=$6`, [...s, counts, cursor, id]);
  if (subjects.length < value.limit) await finishPlanning(c, id, run.approval_required);
  await audit(c, 'workflow_run.evaluate', id);
  return runView(c, id);
}

export async function decideRun(c: Context, id: string, input: unknown) {
  const value = O.RunDecision.parse(input);
  const s = scope(c);
  const run = (await c.tx.query(`SELECT * FROM app.workflow_runs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!run) refuse(404, 'id', 'not_found');
  if (run.status !== 'DRY_RUN_READY') refuse(409, 'status', 'run_is_not_awaiting_a_decision');
  if (run.created_by === c.actor.actor_id) throw new AccessError(403, 'FORBIDDEN', [{ field: 'approver_id', code: 'creator_cannot_approve' }]);
  if (value.scope_hash !== run.scope_hash || value.scope_hash !== await scopeHash(c, id)) refuse(409, 'scope_hash', 'scope_changed_since_preview');
  await c.tx.query(`INSERT INTO app.workflow_run_approvals(tenant_id,legal_entity_id,environment_id,id,run_id,scope_hash,decision,note,approver_id,run_creator_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [...s, randomUUID(), id, value.scope_hash, value.decision, value.note, c.actor.actor_id, run.created_by]);
  if (value.decision === 'APPROVED') {
    await c.tx.query(`UPDATE app.downstream_actions SET state='pending',updated_at=clock_timestamp() WHERE ${predicate} AND run_id=$4 AND state='awaiting_approval'`, [...s, id]);
    await c.tx.query(`UPDATE app.workflow_runs SET status='APPROVED',updated_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...s, id]);
  } else await cancelInternal(c, run, `Rejected: ${value.note}`);
  await recordEvidence(c, { entity_kind: 'workflow_run', entity_id: id, origin: 'OPERATOR', method: 'MAKER_CHECKER_DECISION', content_digest: value.scope_hash, package_row_id: run.package_row_id,
    requirement_ids: run.configuration.requirement_ids ?? [], summary: { decision: value.decision, note: value.note, run_creator_id: run.created_by }, fixture: false });
  await audit(c, 'workflow_run.' + value.decision.toLowerCase(), id);
  return runView(c, id);
}

async function cancelInternal(c: Context, run: { id: string; kind: string }, reason: string) {
  const s = scope(c);
  await c.tx.query(`UPDATE app.downstream_actions SET state='cancelled',updated_at=clock_timestamp() WHERE ${predicate} AND run_id=$4 AND state IN ('pending','awaiting_approval')`, [...s, run.id]);
  if (run.kind === 'RETENTION_ERASURE') await c.tx.query(`UPDATE app.retention_states SET state='ELIGIBLE',run_id=NULL WHERE ${predicate} AND run_id=$4 AND state='SCHEDULED'`, [...s, run.id]);
  await c.tx.query(`UPDATE app.workflow_runs SET status='CANCELLED',ended_at=clock_timestamp(),updated_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...s, run.id]);
  await emit(c, 'rights_request_updated', 'workflow_run', run.id, { cancelled: reason });
}
export async function cancelRun(c: Context, id: string, input: unknown) {
  const value = O.RunCancel.parse(input);
  const run = (await c.tx.query(`SELECT * FROM app.workflow_runs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!run) refuse(404, 'id', 'not_found');
  if (!OPEN_STATUSES.includes(run.status)) refuse(409, 'status', 'run_is_not_open');
  if ((await c.tx.query(`SELECT 1 FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 AND state='executing'`, [...scope(c), id])).rowCount) refuse(409, 'status', 'an_action_is_executing');
  await cancelInternal(c, run, value.reason);
  await audit(c, 'workflow_run.cancel', id);
  return runView(c, id);
}

/** Processor termination with disposition required: one manual confirmation action. */
export async function createDispositionRun(c: Context, engagementId: string) {
  const pkg = await requirePackage(c);
  const runId = await insertRun(c, { kind: 'PROCESSOR_DISPOSITION', package_row_id: pkg.id, engagement_id: engagementId, status: 'EVALUATING', approval_required: false,
    configuration: { requirement_ids: pkg.claims.requirements.filter(r => r.modules.includes('PROCESSORS')).map(r => r.requirement_id) },
    trigger: { kind: 'PROCESSOR_TERMINATED', engagement_id: engagementId } });
  await insertAction(c, runId, 0, { subject_id: null, system_id: null, engagement_id: engagementId, target_reference: null, action_type: 'DISPOSITION_CONFIRMATION', state: 'pending' });
  await c.tx.query(`UPDATE app.workflow_runs SET counts=$4 WHERE ${predicate} AND id=$5`, [...scope(c), { total_discovered: 1, eligible: 1, blocked: 0, unresolved: 0 }, runId]);
  await finishPlanning(c, runId, false);
  return runId;
}

// --- read models ---------------------------------------------------------------

const EXECUTION: Record<string, string> = { pending: 'requested', awaiting_approval: 'requested', blocked: 'requested', executing: 'dispatched', verified: 'verified', failed: 'failed', inconclusive: 'inconclusive', not_supported: 'not_supported', cancelled: 'requested' };
export function executionReport(state: string, targetResult: string) {
  if (state === 'succeeded_unverified') return targetResult === 'ACCEPTED_BY_TARGET' ? 'accepted_by_target' : 'completed_by_target';
  return EXECUTION[state] ?? 'requested';
}
type ActionRow = { id: string; run_id: string; ordinal: number; subject_id: string | null; system_id: string | null; engagement_id: string | null; target_reference: string | null; action_type: string; state: string;
  target_result: string; verification: string; block_reason: string | null; hold_ids: string[]; attempts: number; last_error_code: string | null; payload_digest: string | null; updated_at: Date };
export async function actionView(c: Context, row: ActionRow) {
  const verifications = (await c.tx.query(`SELECT * FROM app.action_verifications WHERE ${predicate} AND action_id=$4 ORDER BY verified_at LIMIT 20`, [...scope(c), row.id])).rows;
  return O.DownstreamAction.parse({ id: row.id, run_id: row.run_id, ordinal: row.ordinal, subject_id: row.subject_id, system_id: row.system_id, engagement_id: row.engagement_id, target_reference: row.target_reference,
    action_type: row.action_type, state: row.state, execution: executionReport(row.state, row.target_result), target_result: row.target_result, verification: row.verification,
    block_reason: row.block_reason, hold_ids: row.hold_ids, attempts: row.attempts, last_error_code: row.last_error_code, payload_digest: row.payload_digest, updated_at: iso(row.updated_at),
    verifications: verifications.map(v => ({ id: v.id, method: v.method, verifier: v.verifier, expected: v.expected, observed: v.observed, result: v.result, failure_reason: v.failure_reason, verified_at: iso(v.verified_at), evidence_id: v.evidence_id })) });
}
export async function actionList(c: Context, id: string, page: Page, query: unknown) {
  const state = (query as { state?: string } | undefined)?.state ?? null;
  const rows = (await c.tx.query(`SELECT * FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 AND ($5::text IS NULL OR state=$5) AND ($6::uuid IS NULL OR id>$6) ORDER BY id LIMIT $7`,
    [...scope(c), id, state, page.cursor, page.limit + 1])).rows as ActionRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await actionView(c, row));
  return { items, next_cursor: paged.next_cursor };
}

export async function runCounts(c: Context, id: string, stored: Record<string, number>) {
  const rows = (await c.tx.query(`SELECT state,target_result,count(*)::int n,count(*) FILTER (WHERE attempts>0)::int attempted FROM app.downstream_actions WHERE ${predicate} AND run_id=$4 GROUP BY state,target_result`, [...scope(c), id])).rows;
  const sum = (f: (r: { state: string; target_result: string }) => boolean) => rows.filter(f).reduce((a, r) => a + r.n, 0);
  return {
    total_discovered: stored.total_discovered ?? 0, eligible: stored.eligible ?? 0, unresolved: stored.unresolved ?? 0,
    blocked: (stored.blocked ?? 0) + sum(r => r.state === 'blocked'),
    submitted: rows.reduce((a, r) => a + r.attempted, 0),
    succeeded: sum(r => r.target_result === 'COMPLETED_BY_TARGET' || r.target_result === 'ACCEPTED_BY_TARGET'),
    verified: sum(r => r.state === 'verified'), failed: sum(r => r.state === 'failed'), inconclusive: sum(r => r.state === 'inconclusive'),
    not_supported: sum(r => r.state === 'not_supported'), pending: sum(r => ['pending', 'awaiting_approval', 'executing', 'succeeded_unverified'].includes(r.state)),
  };
}

export async function runPreview(c: Context, run: { id: string; kind: string; configuration: Record<string, unknown>; counts: Record<string, number> }) {
  const s = scope(c);
  const bySystem = (await c.tx.query(`SELECT a.system_id,a.action_type,count(*)::int n,count(*) FILTER (WHERE a.state='not_supported')::int unsupported,b.adapter
    FROM app.downstream_actions a LEFT JOIN app.connector_bindings b ON b.tenant_id=a.tenant_id AND b.legal_entity_id=a.legal_entity_id AND b.environment_id=a.environment_id AND b.system_id=a.system_id AND b.valid_to IS NULL
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.run_id=$4 GROUP BY a.system_id,a.action_type,b.adapter`, [...s, run.id])).rows;
  const holds = (await c.tx.query(`SELECT DISTINCT unnest(hold_ids) id FROM app.downstream_actions WHERE ${predicate} AND run_id=$4
    UNION SELECT DISTINCT unnest(hold_ids) FROM app.retention_states WHERE ${predicate} AND rule_id IS NOT DISTINCT FROM $5 AND state='BLOCKED_BY_HOLD' LIMIT 100`, [...s, run.id, (run.configuration.rule_id as string | undefined) ?? null])).rows.map(r => r.id);
  const types = [...new Set(bySystem.map(r => r.action_type))];
  const systems = new Map<string, { system_id: string; adapter: string; supported: boolean; can_verify: boolean; action_count: number }>();
  for (const row of bySystem.filter(r => r.system_id)) {
    const adapter = adapterFor(row.adapter);
    const entry = systems.get(row.system_id) ?? { system_id: row.system_id, adapter: row.adapter ?? 'UNBOUND', supported: row.unsupported < row.n, can_verify: adapter?.capabilities.verify === true, action_count: 0 };
    entry.action_count += row.n; systems.set(row.system_id, entry);
  }
  const unsupported = bySystem.reduce((a, r) => a + r.unsupported, 0);
  const verifiable = bySystem.filter(r => adapterFor(r.adapter)?.capabilities.verify).reduce((a, r) => a + r.n - r.unsupported, 0);
  const irreversible = types.some(t => DESTRUCTIVE.has(t));
  return O.RunPreview.parse({ action_types: types, target_systems: [...systems.values()], population_count: run.counts.total_discovered ?? 0, eligible: run.counts.eligible ?? 0,
    blocked: run.counts.blocked ?? 0, unresolved: run.counts.unresolved ?? 0, unsupported, verifiable, blocking_hold_ids: holds,
    rule_references: [run.configuration.source_reference as string | undefined, run.configuration.duration_source ? `Duration source: ${String(run.configuration.duration_source)}` : undefined].filter((v): v is string => Boolean(v)),
    requirement_ids: ((run.configuration.requirement_ids as string[] | undefined) ?? []).slice(0, 20), irreversible,
    warning: irreversible ? 'Erasure and anonymisation are irreversible. Approving authorises exactly the actions in this scope and nothing else.' : null });
}

export async function runView(c: Context, id: string) {
  const s = scope(c);
  const run = (await c.tx.query(`SELECT * FROM app.workflow_runs WHERE ${predicate} AND id=$4`, [...s, id])).rows[0];
  if (!run) refuse(404, 'id', 'not_found');
  const pkg = await packageById(c, run.package_row_id);
  const approval = (await c.tx.query(`SELECT * FROM app.workflow_run_approvals WHERE ${predicate} AND run_id=$4`, [...s, id])).rows[0];
  const counts = await runCounts(c, id, run.counts);
  const exceptions: string[] = [];
  for (const destination of (run.trigger.unresolved_destinations as string[] | undefined) ?? []) exceptions.push(`Unresolved destination: ${destination}`.slice(0, 500));
  if (counts.not_supported) exceptions.push(`${counts.not_supported} action(s) target a system with no supported connector operation.`);
  if (counts.blocked) exceptions.push(`${counts.blocked} action(s) or subject(s) blocked (hold, missing reference or unresolved source).`);
  if (counts.failed) exceptions.push(`${counts.failed} action(s) failed.`);
  if (counts.inconclusive) exceptions.push(`${counts.inconclusive} action(s) could not be verified either way.`);
  if (counts.unresolved) exceptions.push(`${counts.unresolved} subject(s) or destination(s) unresolved.`);
  return O.WorkflowRun.parse({ id: run.id, kind: run.kind, status: run.status, workflow_version: run.workflow_version, package: { id: pkg.id, version: pkg.version, distribution: pkg.distribution },
    configuration: run.configuration, trigger: run.trigger, subject_id: run.subject_id, rights_request_id: run.rights_request_id, retention_rule_id: run.retention_rule_id, engagement_id: run.engagement_id,
    consent_event_id: run.consent_event_id, approval_required: run.approval_required,
    approval: approval ? { id: approval.id, scope_hash: approval.scope_hash, decision: approval.decision, note: approval.note, approver_id: approval.approver_id, decided_at: iso(approval.decided_at) } : null,
    scope_hash: run.scope_hash, evaluation_complete: run.evaluation_complete, counts, preview: await runPreview(c, run), block_reason: run.block_reason,
    created_at: iso(run.created_at), created_by: run.created_by, started_at: iso(run.started_at), ended_at: iso(run.ended_at), open_exceptions: exceptions });
}
export async function runList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { kind?: string; status?: string };
  const rows = (await c.tx.query(`SELECT id FROM app.workflow_runs WHERE ${predicate} AND ($4::text IS NULL OR kind=$4) AND ($5::text IS NULL OR status=$5) AND ($6::uuid IS NULL OR id>$6) ORDER BY id LIMIT $7`,
    [...scope(c), q.kind ?? null, q.status ?? null, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await runView(c, row.id));
  return { items, next_cursor: paged.next_cursor };
}
