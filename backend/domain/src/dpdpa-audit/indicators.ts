import * as D from '../../../../shared/contracts/src/dpdpa-audit.ts';
import type { Context } from '../shared/transaction.ts';
import { predicate, scope } from '../operations/shared.ts';

/**
 * ORVIA-derived indicators for the DPDPA gap register and audit packages.
 * Each is a single aggregate (a count, or a date) over this installation's own
 * records, read as the signed-in user under row-level security; none carries
 * any identifier or personal data. The basis says exactly what was counted.
 */
type Spec = { key: string; label: string; unit: string; basis: string; sql: string; params?: unknown[] };
const count = (key: string, label: string, basis: string, from: string, params: unknown[] = []): Spec => ({ key, label, unit: 'count', basis, sql: `SELECT count(*)::int AS v FROM ${from}`, params });
const breach = (kind: string, prefix: string): Spec[] => [
  count(`${prefix}.met`, 'Completed within the timer', `breach tasks of kind ${kind} completed on or before their due time`, `app.breach_tasks WHERE ${predicate} AND kind=$4 AND state='COMPLETED' AND due_at IS NOT NULL AND completed_at<=due_at`, [kind]),
  count(`${prefix}.missed`, 'Missed the timer', `breach tasks of kind ${kind} completed late, or open past their due time`, `app.breach_tasks WHERE ${predicate} AND kind=$4 AND due_at IS NOT NULL AND ((state='COMPLETED' AND completed_at>due_at) OR (state='OPEN' AND due_at<clock_timestamp()))`, [kind]),
  count(`${prefix}.open`, 'Open within the timer', `breach tasks of kind ${kind} still open and not yet due`, `app.breach_tasks WHERE ${predicate} AND kind=$4 AND state='OPEN' AND (due_at IS NULL OR due_at>=clock_timestamp())`, [kind]),
];
const sdf = (kind: string, prefix: string): Spec[] => [
  { key: `${prefix}.next_due`, label: 'Next due date', unit: 'date', basis: `earliest due date of open SDF obligations of kind ${kind}`, sql: `SELECT to_char(min(due_at) AT TIME ZONE 'UTC','YYYY-MM-DD') AS v FROM app.sdf_obligations WHERE ${predicate} AND kind=$4 AND state='OPEN'`, params: [kind] },
  count(`${prefix}.overdue`, 'Overdue', `open SDF obligations of kind ${kind} past their due date`, `app.sdf_obligations WHERE ${predicate} AND kind=$4 AND state='OPEN' AND due_at<clock_timestamp()`, [kind]),
];
const sdfDone = (kind: string, prefix: string): Spec[] => [...sdf(kind, prefix),
  count(`${prefix}.completed`, 'Completed with evidence', `SDF obligations of kind ${kind} completed with an evidence reference`, `app.sdf_obligations WHERE ${predicate} AND kind=$4 AND state='COMPLETED'`, [kind])];
/** The same scope as `predicate`, for a table under an alias. */
const at = (a: string) => `${a}.tenant_id=$1 AND ${a}.legal_entity_id=$2 AND ${a}.environment_id=$3`;
const OPEN_RIGHT = `state NOT IN ('COMPLETED','REJECTED','CLOSED')`;
const rights = (types: string[], prefix: string, noun: string): Spec[] => {
  const t = `right_type IN (${types.map(x => `'${x}'`).join(',')})`;
  return [
    count(`${prefix}.completed`, `${noun} completed`, `${noun.toLowerCase()} in state COMPLETED`, `app.rights_requests WHERE ${predicate} AND ${t} AND state='COMPLETED'`),
    count(`${prefix}.open`, `${noun} open`, `${noun.toLowerCase()} not completed, rejected or closed`, `app.rights_requests WHERE ${predicate} AND ${t} AND ${OPEN_RIGHT}`),
    count(`${prefix}.open_over_90_days`, `${noun} open for more than 90 days`, `${noun.toLowerCase()} still open, received more than 90 days ago`, `app.rights_requests WHERE ${predicate} AND ${t} AND ${OPEN_RIGHT} AND received_at<clock_timestamp()-interval '90 days'`),
    count(`${prefix}.rejected`, `${noun} rejected`, `${noun.toLowerCase()} in state REJECTED`, `app.rights_requests WHERE ${predicate} AND ${t} AND state='REJECTED'`)];
};
const runs = (kind: string, prefix: string, noun: string): Spec[] => [
  count(`${prefix}.runs_verified`, `${noun} runs verified`, `${kind} runs completed with independent verification`, `app.workflow_runs WHERE ${predicate} AND kind=$4 AND status='COMPLETED_VERIFIED'`, [kind]),
  count(`${prefix}.runs_with_exceptions`, `${noun} runs with exceptions`, `${kind} runs completed with exceptions, partially failed or blocked`, `app.workflow_runs WHERE ${predicate} AND kind=$4 AND status IN ('COMPLETED_WITH_EXCEPTIONS','PARTIALLY_FAILED','BLOCKED')`, [kind]),
  count(`${prefix}.runs_open`, `${noun} runs in progress`, `${kind} runs not yet finished`, `app.workflow_runs WHERE ${predicate} AND kind=$4 AND status IN ('EVALUATING','DRY_RUN_READY','AWAITING_APPROVAL','APPROVED','RUNNING')`, [kind])];
/** Latest child-status record per data principal: the record is append-only, so earlier rows are history. */
const CHILDREN = `(SELECT DISTINCT ON (subject_id) child_status, verifiable_consent FROM app.child_status_records WHERE ${predicate} ORDER BY subject_id, recorded_at DESC, id DESC) x`;
const LEGIT = `(SELECT pc.id FROM app.processing_conditions pc WHERE ${at('pc')} AND 'DPDP-LEGITIMATE-USES'=ANY(pc.requirement_ids))`;
const CURRENT_LOCATION = `(l.valid_to IS NULL OR l.valid_to>clock_timestamp()) AND l.valid_from<=clock_timestamp()`;
const SPECS: Record<string, Spec[]> = {
  'DPDP-NOTICE-CONSENT-REQUEST': [
    count('notices.published_versions', 'Published notice versions', 'registry notice versions in PUBLISHED status', `app.registry_notice_versions WHERE ${predicate} AND status='PUBLISHED'`),
    count('consent.records_granted', 'Consent records currently granted', 'consent records whose current status is GRANTED', `app.consent_records WHERE ${predicate} AND current_status='GRANTED'`)],
  'DPDP-NOTICE-LEGACY-CONSENT': [count('notices.delivery_evidence', 'Notice delivery evidence records', 'notice delivery evidence records', `app.notice_delivery_evidence WHERE ${predicate}`)],
  'DPDP-CONSENT-VALIDITY': [
    count('consent.records_total', 'Consent records', 'all consent records', `app.consent_records WHERE ${predicate}`),
    count('consent.records_withdrawn', 'Consent records withdrawn', 'consent records whose current status is WITHDRAWN', `app.consent_records WHERE ${predicate} AND current_status='WITHDRAWN'`)],
  'DPDP-CONSENT-PROOF': [
    count('consent.events_total', 'Consent events', 'all consent record events', `app.consent_record_events WHERE ${predicate}`),
    count('consent.events_with_evidence', 'Consent events with evidence available', 'consent record events whose evidence state is EVIDENCE_AVAILABLE', `app.consent_record_events WHERE ${predicate} AND evidence_state='EVIDENCE_AVAILABLE'`)],
  'DPDP-CONSENT-WITHDRAWAL-CESSATION': [
    count('withdrawal.runs_verified', 'Withdrawal propagation runs verified', 'consent-withdrawal runs completed with independent verification', `app.workflow_runs WHERE ${predicate} AND kind='CONSENT_WITHDRAWAL' AND status='COMPLETED_VERIFIED'`),
    count('withdrawal.runs_with_exceptions', 'Withdrawal runs with exceptions', 'consent-withdrawal runs completed with exceptions, partially failed or blocked', `app.workflow_runs WHERE ${predicate} AND kind='CONSENT_WITHDRAWAL' AND status IN ('COMPLETED_WITH_EXCEPTIONS','PARTIALLY_FAILED','BLOCKED')`),
    count('withdrawal.runs_open', 'Withdrawal runs in progress', 'consent-withdrawal runs not yet finished', `app.workflow_runs WHERE ${predicate} AND kind='CONSENT_WITHDRAWAL' AND status IN ('EVALUATING','DRY_RUN_READY','AWAITING_APPROVAL','APPROVED','RUNNING')`)],
  'DPDP-BREACH-PRINCIPAL-INTIMATION': breach('PRINCIPAL_INTIMATION', 'breach.principal_intimation'),
  'DPDP-BREACH-BOARD-INTIMATION': breach('BOARD_INTIMATION', 'breach.board_intimation'),
  'DPDP-BREACH-BOARD-REPORT': breach('BOARD_DETAILED_REPORT', 'breach.board_report_72h'),
  'DPDP-GRIEVANCE-RESPONSE': [
    count('grievances.open_over_90_days', 'Grievances open for more than 90 days', 'grievances not completed, rejected or closed, received more than 90 days ago', `app.rights_requests WHERE ${predicate} AND right_type='GRIEVANCE' AND state NOT IN ('COMPLETED','REJECTED','CLOSED') AND received_at<clock_timestamp()-interval '90 days'`),
    count('grievances.open', 'Grievances open', 'grievances not completed, rejected or closed', `app.rights_requests WHERE ${predicate} AND right_type='GRIEVANCE' AND state NOT IN ('COMPLETED','REJECTED','CLOSED')`)],
  'DPDP-LOG-RETENTION-MINIMUM': [count('log_retention.active_holds', 'Active log-retention holds', 'active retention holds citing DPDP-LOG-RETENTION-MINIMUM', `app.retention_holds WHERE ${predicate} AND state='ACTIVE' AND requirement_id='DPDP-LOG-RETENTION-MINIMUM'`)],
  'DPDP-SDF-DPIA': sdf('PERIODIC_DPIA', 'sdf.dpia'),
  'DPDP-SDF-AUDIT': sdf('PERIODIC_AUDIT', 'sdf.audit'),
  // Added with the audit methodology (docs/audit-practice/METHODOLOGY.md). Requirements with no indicator here are tested only by
  // auditor procedures, because ORVIA holds no record that could show them: DPDP-BOARD-COMPLAINT-CHANNEL (notice text, inspected).
  'DPDP-LEGITIMATE-USES': [
    count('conditions.legitimate_use', 'Legitimate-use conditions in effect', 'resolved processing conditions citing DPDP-LEGITIMATE-USES and in effect', `app.processing_conditions WHERE ${predicate} AND 'DPDP-LEGITIMATE-USES'=ANY(requirement_ids) AND NOT unresolved AND effective_from<=clock_timestamp() AND (effective_to IS NULL OR effective_to>clock_timestamp())`),
    count('conditions.unresolved', 'Processing conditions unresolved', 'processing conditions recorded as unresolved', `app.processing_conditions WHERE ${predicate} AND unresolved`),
    count('activities.on_legitimate_use', 'Activities relying on a legitimate use', 'current activity versions whose condition cites DPDP-LEGITIMATE-USES', `app.registry_activity_versions v WHERE ${at('v')} AND v.status='CURRENT' AND v.condition_id IN ${LEGIT}`),
    count('activities.without_condition', 'Activities with no processing condition', 'current activity versions with no processing condition recorded', `app.registry_activity_versions WHERE ${predicate} AND status='CURRENT' AND condition_id IS NULL`)],
  'DPDP-PROCESSOR-CONTRACT': [
    count('processors.engagements_active', 'Processor engagements active', 'processor engagements in status ACTIVE', `app.processor_engagements WHERE ${predicate} AND status='ACTIVE'`),
    count('processors.active_without_agreement', 'Active engagements with no agreement in force', 'active engagements whose processor has no active, unexpired agreement', `app.processor_engagements e WHERE ${at('e')} AND e.status='ACTIVE' AND NOT EXISTS (SELECT 1 FROM app.processor_agreements a WHERE ${at('a')} AND a.processor_id=e.processor_id AND a.status='ACTIVE' AND a.effective_from<=clock_timestamp() AND (a.expires_at IS NULL OR a.expires_at>clock_timestamp()))`),
    count('processors.agreements_expired_not_terminated', 'Agreements past expiry still marked active', 'processor agreements in status ACTIVE whose expiry date has passed', `app.processor_agreements WHERE ${predicate} AND status='ACTIVE' AND expires_at<=clock_timestamp()`),
    count('processors.terminated_disposition_unverified', 'Terminated engagements with data return not verified', 'terminated engagements whose disposition is PENDING, PROCESSOR_CONFIRMED or UNKNOWN', `app.processor_engagements WHERE ${predicate} AND status='TERMINATED' AND disposition_state IN ('PENDING','PROCESSOR_CONFIRMED','UNKNOWN')`)],
  'DPDP-ACCURACY': runs('CORRECTION', 'correction', 'Correction'),
  'DPDP-SECURITY-SAFEGUARDS': [
    count('safeguards.recorded', 'Safeguards recorded', 'security safeguards in the register', `app.security_safeguards WHERE ${predicate}`),
    count('safeguards.evidence_available', 'Safeguards with evidence', 'safeguards whose evidence state is EVIDENCE_AVAILABLE', `app.security_safeguards WHERE ${predicate} AND evidence_state='EVIDENCE_AVAILABLE'`),
    count('safeguards.evidence_missing', 'Safeguards with evidence missing', 'safeguards whose evidence state is EVIDENCE_MISSING', `app.security_safeguards WHERE ${predicate} AND evidence_state='EVIDENCE_MISSING'`),
    count('safeguards.needs_verification', 'Safeguards needing verification', 'safeguards whose evidence state is NEEDS_VERIFICATION', `app.security_safeguards WHERE ${predicate} AND evidence_state='NEEDS_VERIFICATION'`),
    { key: 'safeguards.kinds_covered', label: 'Safeguard kinds covered (of 8)', unit: 'count', basis: 'distinct safeguard kinds with at least one safeguard recorded', sql: `SELECT count(DISTINCT kind)::int AS v FROM app.security_safeguards WHERE ${predicate}` }],
  'DPDP-ERASURE-PURPOSE-SERVED': [...runs('RETENTION_ERASURE', 'erasure', 'Retention erasure'),
    count('retention.rules_active', 'Retention rules active', 'retention rules in status ACTIVE', `app.retention_rules WHERE ${predicate} AND status='ACTIVE'`),
    count('retention.outcomes_failed_or_unknown', 'Erasure outcomes failed or unknown', 'retention outcomes recorded as FAILED or EFFECT_UNKNOWN', `app.retention_outcomes WHERE ${predicate} AND result IN ('FAILED','EFFECT_UNKNOWN')`)],
  'DPDP-CONSENT-MANAGER': [
    count('consent_managers.active', 'Consent Managers accepted (active)', 'registered Consent Managers in status ACTIVE', `app.consent_managers WHERE ${predicate} AND status='ACTIVE'`),
    count('consent_managers.records', 'Consent records given through a Consent Manager', 'consent records linked to a Consent Manager artefact', `app.consent_manager_links WHERE ${predicate}`),
    count('consent_managers.relayed_withdrawals', 'Withdrawals relayed by a Consent Manager', 'consent withdrawal events with source CONSENT_MANAGER', `app.consent_record_events WHERE ${predicate} AND event='WITHDRAWN' AND source='CONSENT_MANAGER'`)],
  'DPDP-ERASURE-ADVANCE-NOTICE': [
    count('intimations.recorded', 'Erasure intimations recorded', 'Rule 8(2) intimations recorded with their evidence', `app.erasure_intimations WHERE ${predicate}`),
    count('intimations.re_engaged', 'People who re-engaged after an intimation', 'intimations followed by a login, contact or exercise of rights', `app.erasure_intimations WHERE ${predicate} AND re_engaged_at IS NOT NULL`),
    count('intimations.overdue', 'Intimations overdue', 'people under a Third Schedule rule whose erasure is due within 48 hours or past, with no intimation recorded',
      `app.retention_states st WHERE st.tenant_id=$1 AND st.legal_entity_id=$2 AND st.environment_id=$3 AND st.eligible_at IS NOT NULL AND st.eligible_at - interval '48 hours' < clock_timestamp() AND st.state NOT IN ('ERASED','SCHEDULED')
        AND EXISTS (SELECT 1 FROM app.retention_rules r WHERE r.tenant_id=st.tenant_id AND r.legal_entity_id=st.legal_entity_id AND r.environment_id=st.environment_id AND r.id=st.rule_id AND r.requirement_id='DPDP-RETENTION-THIRD-SCHEDULE')
        AND NOT EXISTS (SELECT 1 FROM app.erasure_intimations i WHERE i.tenant_id=st.tenant_id AND i.legal_entity_id=st.legal_entity_id AND i.environment_id=st.environment_id AND i.subject_id=st.subject_id AND i.rule_id=st.rule_id)`)],
  'DPDP-RETENTION-THIRD-SCHEDULE': [
    count('retention.rules_third_schedule', 'Retention rules citing the Third Schedule', 'active retention rules citing DPDP-RETENTION-THIRD-SCHEDULE', `app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND requirement_id='DPDP-RETENTION-THIRD-SCHEDULE'`)],
  'DPDP-CONTACT-PUBLICATION': [
    count('profile.contact_recorded', 'Contact recorded in the current organisation profile (1 = yes)', 'latest organisation profile version with a DPO or grievance contact recorded; the contact itself is not reported', `(SELECT dpo_contact, grievance_contact FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 1) x WHERE coalesce(x.dpo_contact, x.grievance_contact) IS NOT NULL`),
    count('notices.published_versions', 'Published notice versions', 'registry notice versions in PUBLISHED status', `app.registry_notice_versions WHERE ${predicate} AND status='PUBLISHED'`)],
  'DPDP-RIGHTS-MEANS': [
    count('rights.requests_total', 'Rights requests received', 'all rights requests received through any channel', `app.rights_requests WHERE ${predicate}`),
    count('rights.requests_last_90_days', 'Rights requests received in the last 90 days', 'rights requests received in the last 90 days', `app.rights_requests WHERE ${predicate} AND received_at>=clock_timestamp()-interval '90 days'`)],
  'DPDP-RIGHT-ACCESS': [...rights(['ACCESS'], 'rights.access', 'Access requests'),
    count('rights.access.responses_released', 'Access responses released', 'access requests whose response was RELEASED', `app.rights_requests WHERE ${predicate} AND right_type='ACCESS' AND response='RELEASED'`)],
  'DPDP-RIGHT-CORRECTION-ERASURE': [...rights(['CORRECTION', 'ERASURE'], 'rights.correction_erasure', 'Correction and erasure requests'),
    count('rights.correction_erasure.execution_failed', 'Correction and erasure requests with failed or manual execution', 'correction and erasure requests whose execution is FAILED or MANUAL_REQUIRED', `app.rights_requests WHERE ${predicate} AND right_type IN ('CORRECTION','ERASURE') AND execution IN ('FAILED','MANUAL_REQUIRED')`)],
  'DPDP-RIGHT-NOMINATION': [...rights(['NOMINATION'], 'rights.nomination', 'Nomination requests'),
    count('nominees.verified', 'Nominees verified', 'nominee representatives in effect and VERIFIED', `app.data_principal_representatives WHERE ${predicate} AND kind='NOMINEE' AND verification='VERIFIED' AND (effective_to IS NULL OR effective_to>clock_timestamp())`),
    count('nominees.unverified', 'Nominees not yet verified', 'nominee representatives in effect and UNVERIFIED', `app.data_principal_representatives WHERE ${predicate} AND kind='NOMINEE' AND verification='UNVERIFIED' AND (effective_to IS NULL OR effective_to>clock_timestamp())`)],
  'DPDP-CHILD-VERIFIABLE-CONSENT': [
    count('children.recorded', 'Data principals recorded as children', 'data principals whose latest child status is CHILD', `${CHILDREN} WHERE x.child_status='CHILD'`),
    count('children.verifiable_consent_established', 'Children with verifiable consent established', 'children whose latest record has verifiable consent ESTABLISHED with evidence and a guardian', `${CHILDREN} WHERE x.child_status='CHILD' AND x.verifiable_consent='ESTABLISHED'`),
    count('children.verifiable_consent_not_established', 'Children without verifiable consent established', 'children whose latest record has verifiable consent NOT_ESTABLISHED or UNKNOWN', `${CHILDREN} WHERE x.child_status='CHILD' AND x.verifiable_consent IN ('NOT_ESTABLISHED','UNKNOWN')`),
    count('children.status_unknown', 'Data principals with child status unknown', 'data principals whose latest child status is UNKNOWN', `${CHILDREN} WHERE x.child_status='UNKNOWN'`)],
  'DPDP-CHILD-NO-TRACKING': [
    count('children.recorded', 'Data principals recorded as children', 'data principals whose latest child status is CHILD; ORVIA cannot see advertising or tracking systems', `${CHILDREN} WHERE x.child_status='CHILD'`),
    count('cmp.published_configurations', 'Published consent-banner configurations', 'consent-banner configurations in state PUBLISHED', `app.cmp_configs WHERE ${predicate} AND state='PUBLISHED'`)],
  'DPDP-SDF-DPO': sdfDone('DPO_APPOINTMENT', 'sdf.dpo'),
  'DPDP-SDF-AUDITOR': sdfDone('INDEPENDENT_AUDITOR_APPOINTMENT', 'sdf.auditor'),
  'DPDP-SDF-ALGORITHMIC-DILIGENCE': [...sdfDone('ALGORITHMIC_DUE_DILIGENCE', 'sdf.algorithmic'),
    count('ai.systems_recorded', 'AI systems recorded', 'AI systems in the AI governance register', `app.ai_systems WHERE ${predicate}`)],
  'DPDP-SDF-TRANSFER-RESTRICTION': [...sdfDone('TRANSFER_RESTRICTION_REVIEW', 'sdf.transfer'),
    { key: 'locations.systems_outside_india', label: 'Systems located outside India', unit: 'count', basis: 'systems with a current location whose region is not IN', sql: `SELECT count(DISTINCT l.system_id)::int AS v FROM app.system_locations l WHERE ${at('l')} AND ${CURRENT_LOCATION} AND l.region !~ '^IN(-|$)'` }],
  'DPDP-CROSS-BORDER': [
    { key: 'locations.systems_outside_india', label: 'Systems located outside India', unit: 'count', basis: 'systems with a current location whose region is not IN', sql: `SELECT count(DISTINCT l.system_id)::int AS v FROM app.system_locations l WHERE ${at('l')} AND ${CURRENT_LOCATION} AND l.region !~ '^IN(-|$)'` },
    count('locations.systems_without_location', 'Systems with no current location recorded', 'systems with no current location record', `app.systems s WHERE ${at('s')} AND NOT EXISTS (SELECT 1 FROM app.system_locations l WHERE ${at('l')} AND l.system_id=s.id AND ${CURRENT_LOCATION})`),
    count('processors.onward_transfer_allowed', 'Active agreements allowing onward transfer', 'active processor agreements that allow onward transfer', `app.processor_agreements WHERE ${predicate} AND status='ACTIVE' AND onward_transfer_allowed`)],
};
/** Requirements the audit tests by auditor procedure only, with the reason stated in the methodology. */
export const PROCEDURE_ONLY_REQUIREMENTS = ['DPDP-BOARD-COMPLAINT-CHANNEL'] as const;
export const indicatorRequirements = () => Object.keys(SPECS);
export const indicatorKeys = (requirementId: string) => (SPECS[requirementId] ?? []).map(s => s.key);
export async function indicatorsFor(c: Context, requirementId: string, now: Date): Promise<D.Indicator[]> {
  const out: D.Indicator[] = [];
  for (const s of SPECS[requirementId] ?? []) {
    const v = (await c.tx.query(s.sql, [...scope(c), ...(s.params ?? [])])).rows[0]?.v ?? null;
    out.push(D.Indicator.parse({ key: s.key, label: s.label, value: v, unit: s.unit, as_of: now.toISOString(), basis: `${s.basis}; counted under your access in this installation` }));
  }
  return out;
}
