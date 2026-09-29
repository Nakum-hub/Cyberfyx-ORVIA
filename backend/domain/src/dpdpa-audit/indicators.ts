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
};
export const indicatorKeys = (requirementId: string) => (SPECS[requirementId] ?? []).map(s => s.key);
export async function indicatorsFor(c: Context, requirementId: string, now: Date): Promise<D.Indicator[]> {
  const out: D.Indicator[] = [];
  for (const s of SPECS[requirementId] ?? []) {
    const v = (await c.tx.query(s.sql, [...scope(c), ...(s.params ?? [])])).rows[0]?.v ?? null;
    out.push(D.Indicator.parse({ key: s.key, label: s.label, value: v, unit: s.unit, as_of: now.toISOString(), basis: `${s.basis}; counted under your access in this installation` }));
  }
  return out;
}
