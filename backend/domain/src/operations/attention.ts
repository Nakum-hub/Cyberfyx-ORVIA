import * as O from '../../../../shared/contracts/src/operations.ts';
import { audit, type Context } from '../shared/transaction.ts';
import { createNotificationTask } from '../notifications/notifications.ts';
import { iso, packageAt, predicate, scope } from './shared.ts';
import { pendingWithdrawalCount } from '../registry/consent.ts';

/**
 * Attention, coverage and notifications (requirements s24; backend Coverage,
 * Failure and Attention). Every item is derived from recorded state at the moment
 * it is read. Nothing here is a recommendation or a score; an item names a fact
 * (an overdue deadline, a failed action, a missing mapping) and where it is.
 */
type Item = O.AttentionItemValue;
const DAY = 86_400_000;

export async function operationsAttention(c: Context) {
  const s = scope(c);
  const now = new Date();
  const items: Item[] = [];
  const push = (item: Item) => { if (items.length < 200) items.push(item); };
  if (!await packageAt(c, now)) push({ kind: 'NO_ACTIVE_PACKAGE', severity: 'UNRESOLVED', entity_kind: 'regulatory_package', entity_id: null, count: 1, detail: 'No approved regulatory package is in effect; material workflows are refused until one is.', due_at: null });

  for (const r of (await c.tx.query(`SELECT p.rights_request_id,p.due_at FROM app.rights_case_profiles p JOIN app.rights_requests q ON q.tenant_id=p.tenant_id AND q.legal_entity_id=p.legal_entity_id AND q.environment_id=p.environment_id AND q.id=p.rights_request_id
    WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.due_at IS NOT NULL AND p.due_at<$4 AND q.state NOT IN ('CLOSED','COMPLETED','REJECTED') ORDER BY p.due_at LIMIT 50`, [...s, new Date(now.getTime() + 7 * DAY)])).rows)
    push({ kind: 'RIGHTS_CASE_DUE', severity: r.due_at < now ? 'OVERDUE' : 'DUE_SOON', entity_kind: 'rights_request', entity_id: r.rights_request_id, count: 1, detail: r.due_at < now ? 'A rights case is past its due time.' : 'A rights case is due within seven days.', due_at: iso(r.due_at) });

  // One item per breach, carrying its worst open task state.
  for (const b of (await c.tx.query(`SELECT incident_id,bool_or(due_at IS NOT NULL AND due_at<$4) overdue,bool_or(legal_status='UNRESOLVED') unresolved,
      bool_or(due_at IS NOT NULL AND due_at<$5) due_soon,min(due_at) FILTER (WHERE due_at IS NOT NULL) next_due,count(*)::int n,max(created_at) latest
    FROM app.breach_tasks WHERE ${predicate} AND state='OPEN' GROUP BY incident_id
    ORDER BY bool_or(due_at IS NOT NULL AND due_at<$4) DESC,bool_or(legal_status='UNRESOLVED') DESC,max(created_at) DESC LIMIT 100`, [...s, now, new Date(now.getTime() + DAY)])).rows)
    push({ kind: 'BREACH_TASK_DUE', severity: b.overdue ? 'OVERDUE' : b.unresolved ? 'UNRESOLVED' : b.due_soon ? 'DUE_SOON' : 'OPEN', entity_kind: 'personal_data_breach', entity_id: b.incident_id, count: b.n,
      detail: b.overdue ? `${b.n} open breach task(s); at least one is past its deadline.` : b.unresolved ? `${b.n} open breach task(s); a deadline cannot be computed because the awareness time is not recorded.` : `${b.n} open breach task(s), including intimations due without delay.`, due_at: iso(b.next_due) });

  const actionKinds: Record<string, [Item['kind'], Item['severity'], string]> = {
    failed: ['ACTION_FAILED', 'FAILED', 'downstream action(s) failed'], inconclusive: ['ACTION_INCONCLUSIVE', 'INCONCLUSIVE', 'downstream action(s) could not be verified either way'],
    not_supported: ['ACTION_NOT_SUPPORTED', 'NOT_SUPPORTED', 'action(s) target a system with no supported operation'], succeeded_unverified: ['ACTION_AWAITING_VERIFICATION', 'OPEN', 'action(s) reported done by the target but not yet verified'],
  };
  for (const a of (await c.tx.query(`SELECT a.run_id,a.state,count(*)::int n FROM app.downstream_actions a JOIN app.workflow_runs r ON r.tenant_id=a.tenant_id AND r.legal_entity_id=a.legal_entity_id AND r.environment_id=a.environment_id AND r.id=a.run_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND r.status<>'CANCELLED' AND a.state IN ('failed','inconclusive','not_supported','succeeded_unverified') GROUP BY a.run_id,a.state LIMIT 100`, s)).rows) {
    const [kind, severity, text] = actionKinds[a.state]!;
    push({ kind, severity, entity_kind: 'workflow_run', entity_id: a.run_id, count: a.n, detail: `${a.n} ${text}.`, due_at: null });
  }
  for (const r of (await c.tx.query(`SELECT id FROM app.workflow_runs WHERE ${predicate} AND status='DRY_RUN_READY' LIMIT 50`, s)).rows)
    push({ kind: 'RUN_AWAITING_APPROVAL', severity: 'REVIEW_REQUIRED', entity_kind: 'workflow_run', entity_id: r.id, count: 1, detail: 'A dry run is ready and waits for a second person to approve or reject it.', due_at: null });

  for (const a of (await c.tx.query(`SELECT a.id FROM app.registry_activities a JOIN app.registry_activity_versions v ON v.tenant_id=a.tenant_id AND v.legal_entity_id=a.legal_entity_id AND v.environment_id=a.environment_id AND v.activity_id=a.id AND v.status='CURRENT'
    LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.status='ACTIVE' AND (pc.id IS NULL OR pc.unresolved) LIMIT 50`, s)).rows)
    push({ kind: 'CONDITION_UNRESOLVED', severity: 'UNRESOLVED', entity_kind: 'registry_activity', entity_id: a.id, count: 1, detail: 'The processing condition for this activity is missing or unresolved; dependent destructive work is blocked.', due_at: null });

  const unmapped = Number((await c.tx.query(`SELECT count(*) n FROM app.registry_activities a WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.status='ACTIVE'
    AND (NOT EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.activity_id=a.id AND l.link_kind='SYSTEM' AND l.valid_to IS NULL)
      OR NOT EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.activity_id=a.id AND l.link_kind='PRINCIPAL_CATEGORY' AND l.valid_to IS NULL)
      OR NOT EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.activity_id=a.id AND l.link_kind='DATA_CATEGORY' AND l.valid_to IS NULL))`, s)).rows[0].n);
  if (unmapped) push({ kind: 'ACTIVITY_MAPPING_MISSING', severity: 'MISSING', entity_kind: 'registry_activity', entity_id: null, count: unmapped, detail: `${unmapped} activit${unmapped === 1 ? 'y has' : 'ies have'} no system, Data Principal category or data category mapped.`, due_at: null });
  for (const sys of (await c.tx.query(`SELECT DISTINCT l.system_id FROM app.registry_activity_links l WHERE l.tenant_id=$1 AND l.legal_entity_id=$2 AND l.environment_id=$3 AND l.link_kind='SYSTEM' AND l.valid_to IS NULL
    AND NOT EXISTS(SELECT 1 FROM app.connector_bindings b WHERE b.tenant_id=l.tenant_id AND b.legal_entity_id=l.legal_entity_id AND b.environment_id=l.environment_id AND b.system_id=l.system_id AND b.valid_to IS NULL) LIMIT 50`, s)).rows)
    push({ kind: 'SYSTEM_UNBOUND', severity: 'MISSING', entity_kind: 'system', entity_id: sys.system_id, count: 1, detail: 'A system used by an activity has no connector binding, so no action there can be executed or verified.', due_at: null });

  const unpropagated = await pendingWithdrawalCount(c);
  if (unpropagated) push({ kind: 'WITHDRAWAL_NOT_PROPAGATED', severity: 'UNRESOLVED', entity_kind: 'consent_record', entity_id: null, count: unpropagated,
    detail: `${unpropagated} recorded withdrawal(s) have not been propagated to downstream systems${await packageAt(c, now) ? '; the operations runner creates their runs on its next cycle' : ' because no regulatory package is in force'}.`, due_at: null });
  const consentMissing = Number((await c.tx.query(`SELECT count(*) n FROM app.consent_record_events WHERE ${predicate} AND evidence_state<>'EVIDENCE_AVAILABLE'`, s)).rows[0].n);
  if (consentMissing) push({ kind: 'CONSENT_EVIDENCE_MISSING', severity: 'MISSING', entity_kind: 'consent_record', entity_id: null, count: consentMissing, detail: `${consentMissing} consent event(s) lack evidence or need verification.`, due_at: null });
  const relMissing = Number((await c.tx.query(`SELECT count(*) n FROM app.data_principal_relationships WHERE ${predicate} AND evidence_state IN ('UNKNOWN','EVIDENCE_MISSING','NEEDS_VERIFICATION','NEEDS_REMEDIATION')`, s)).rows[0].n);
  if (relMissing) push({ kind: 'RELATIONSHIP_EVIDENCE_MISSING', severity: 'MISSING', entity_kind: 'data_principal_relationship', entity_id: null, count: relMissing, detail: `${relMissing} relationship context(s) have unknown or missing evidence.`, due_at: null });

  for (const i of (await c.tx.query(`SELECT package_row_id,count(*)::int n FROM app.regulatory_impacts WHERE ${predicate} AND state='OPEN' GROUP BY package_row_id LIMIT 20`, s)).rows)
    push({ kind: 'REGULATORY_IMPACT_OPEN', severity: 'REVIEW_REQUIRED', entity_kind: 'regulatory_package', entity_id: i.package_row_id, count: i.n, detail: `${i.n} regulatory impact item(s) await review.`, due_at: null });
  const unresolvedApplicability = Number((await c.tx.query(`SELECT count(*) n FROM (SELECT DISTINCT ON (requirement_id,scope_kind,scope_id) result FROM app.applicability_decisions WHERE ${predicate} ORDER BY requirement_id,scope_kind,scope_id,evaluated_at DESC) d WHERE result='UNRESOLVED'`, s)).rows[0].n);
  if (unresolvedApplicability) push({ kind: 'APPLICABILITY_UNRESOLVED', severity: 'UNRESOLVED', entity_kind: 'applicability_decision', entity_id: null, count: unresolvedApplicability, detail: `${unresolvedApplicability} requirement decision(s) are unresolved because a customer fact is not recorded.`, due_at: null });
  for (const r of (await c.tx.query(`SELECT rule_id,count(*)::int n FROM app.retention_states WHERE ${predicate} AND state='UNRESOLVED' GROUP BY rule_id LIMIT 20`, s)).rows)
    push({ kind: 'RETENTION_UNRESOLVED', severity: 'UNRESOLVED', entity_kind: 'retention_rule', entity_id: r.rule_id, count: r.n, detail: `${r.n} subject(s) cannot be evaluated under this rule because a fact is missing.`, due_at: null });
  for (const h of (await c.tx.query(`SELECT id,review_at FROM app.retention_holds WHERE ${predicate} AND state='ACTIVE' AND review_at<$4 LIMIT 50`, [...s, now])).rows)
    push({ kind: 'HOLD_REVIEW_DUE', severity: 'OVERDUE', entity_kind: 'retention_hold', entity_id: h.id, count: 1, detail: 'A hold has passed its review date.', due_at: iso(h.review_at) });
  for (const o of (await c.tx.query(`SELECT id,kind,due_at FROM app.sdf_obligations WHERE ${predicate} AND state='OPEN' AND (due_at IS NULL OR due_at<$4) LIMIT 50`, [...s, new Date(now.getTime() + 30 * DAY)])).rows)
    push({ kind: 'SDF_OBLIGATION_DUE', severity: o.due_at === null ? 'OPEN' : o.due_at < now ? 'OVERDUE' : 'DUE_SOON', entity_kind: 'sdf_obligation', entity_id: o.id, count: 1, detail: `SDF obligation ${o.kind} is open.`, due_at: iso(o.due_at) });
  for (const j of (await c.tx.query(`SELECT job_id,count(*)::int n FROM app.bulk_job_rows WHERE ${predicate} AND state='ERROR' GROUP BY job_id LIMIT 20`, s)).rows)
    push({ kind: 'IMPORT_ROWS_FAILED', severity: 'FAILED', entity_kind: 'bulk_job', entity_id: j.job_id, count: j.n, detail: `${j.n} import row(s) failed and are isolated for review or replay.`, due_at: null });
  await audit(c, 'operations.attention');
  return O.OperationsAttention.parse({ as_of: now.toISOString(), items, derived_from_records: true,
    limits: ['Every item is derived from recorded state at the time of reading.', 'An absent item means nothing recorded raises it, not that the underlying obligation is met.'] });
}

export async function operationsCoverage(c: Context) {
  const s = scope(c);
  const one = async (sql: string) => (await c.tx.query(sql, s)).rows[0] as { n: number; d: number; x?: number };
  const activity = `FROM app.registry_activities a JOIN app.registry_activity_versions v ON v.tenant_id=a.tenant_id AND v.legal_entity_id=a.legal_entity_id AND v.environment_id=a.environment_id AND v.activity_id=a.id AND v.status='CURRENT'
    LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.status='ACTIVE'`;
  const condition = await one(`SELECT count(*) FILTER (WHERE pc.id IS NOT NULL AND NOT pc.unresolved)::int n,count(*)::int d ${activity}`);
  const notices = await one(`SELECT count(*) FILTER (WHERE cardinality(v.notice_version_ids)>0)::int n,count(*)::int d ${activity} AND pc.code='CONSENT' AND NOT pc.unresolved`);
  const retention = await one(`SELECT count(*) FILTER (WHERE EXISTS(SELECT 1 FROM app.retention_rules r WHERE r.tenant_id=a.tenant_id AND r.legal_entity_id=a.legal_entity_id AND r.environment_id=a.environment_id AND r.activity_id=a.id AND r.status='ACTIVE')
    OR EXISTS(SELECT 1 FROM app.registry_activity_links l WHERE l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.activity_id=a.id AND l.link_kind='RETENTION_RULE' AND l.valid_to IS NULL))::int n,count(*)::int d ${activity}`);
  const bound = await one(`SELECT count(*) FILTER (WHERE EXISTS(SELECT 1 FROM app.connector_bindings b WHERE b.tenant_id=$1 AND b.legal_entity_id=$2 AND b.environment_id=$3 AND b.system_id=x.system_id AND b.valid_to IS NULL))::int n,count(*)::int d
    FROM (SELECT DISTINCT system_id FROM app.registry_activity_links WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND link_kind='SYSTEM' AND valid_to IS NULL) x`);
  const consent = await one(`SELECT count(*) FILTER (WHERE evidence_state='EVIDENCE_AVAILABLE')::int n,count(*)::int d FROM app.consent_record_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`);
  const actions = await one(`SELECT count(*) FILTER (WHERE state='verified')::int n,count(*) FILTER (WHERE attempts>0 OR state='verified')::int d,count(*) FILTER (WHERE state IN ('not_supported','blocked'))::int x FROM app.downstream_actions WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`);
  const measure = (dimension: string, counted: string, m: { n: number; d: number }, excluded = 0, reasons: string[] = []) => ({ dimension, counted, numerator: m.n, denominator: m.d, excluded, exclusion_reasons: excluded ? reasons : [] });
  await audit(c, 'operations.coverage');
  return O.OperationsCoverage.parse({ as_of: new Date().toISOString(), no_compliance_score: true, measures: [
    measure('ACTIVITY_CONDITION_RESOLVED', 'Active registry activities whose current version has a resolved processing condition.', condition),
    measure('CONSENT_ACTIVITY_NOTICE_LINKED', 'Active activities resting on consent whose current version names at least one notice version.', notices),
    measure('ACTIVITY_RETENTION_LINKED', 'Active activities with an active retention rule or a retention-rule link.', retention),
    measure('ACTIVITY_SYSTEM_BOUND', 'Distinct systems used by activities that have a current connector binding.', bound),
    measure('CONSENT_EVIDENCE_KNOWN', 'Recorded consent events with evidence available.', consent),
    measure('ACTION_VERIFIED', 'Attempted downstream actions confirmed by independent verification.', actions, actions.x ?? 0, ['Actions that were not supported or were blocked were never attempted and are excluded.']),
  ] });
}

const TEMPLATE_CODE = 'DPDP_OPERATIONS_ALERT';
/**
 * Raises one V1 notification task per open deadline or failure that does not
 * already have one. The recipient comes from the organisation profile; with no
 * recipient or no template configured, the item is reported unresolved and no
 * message is invented.
 */
export async function notificationSweep(c: Context) {
  const s = scope(c);
  const template = (await c.tx.query(`SELECT id FROM app.notification_templates WHERE ${predicate} AND code=$4 ORDER BY version DESC LIMIT 1`, [...s, TEMPLATE_CODE])).rows[0];
  const profile = (await c.tx.query(`SELECT dpo_contact,grievance_contact FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 1`, s)).rows[0];
  const recipient: string | null = profile?.dpo_contact ?? profile?.grievance_contact ?? null;
  const sources: { source: string; id: string; due: Date | null }[] = [
    ...(await c.tx.query(`SELECT id,due_at FROM app.breach_tasks WHERE ${predicate} AND state='OPEN'`, s)).rows.map(r => ({ source: 'DPDP_BREACH_TASK', id: r.id, due: r.due_at })),
    ...(await c.tx.query(`SELECT p.rights_request_id id,p.due_at FROM app.rights_case_profiles p JOIN app.rights_requests q ON q.tenant_id=p.tenant_id AND q.legal_entity_id=p.legal_entity_id AND q.environment_id=p.environment_id AND q.id=p.rights_request_id
      WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.due_at IS NOT NULL AND q.state NOT IN ('CLOSED','COMPLETED','REJECTED')`, s)).rows.map(r => ({ source: 'DPDP_RIGHTS_DEADLINE', id: r.id, due: r.due_at })),
    ...(await c.tx.query(`SELECT id FROM app.downstream_actions WHERE ${predicate} AND state IN ('failed','inconclusive') LIMIT 200`, s)).rows.map(r => ({ source: 'DPDP_ACTION_FAILURE', id: r.id, due: null })),
    ...(await c.tx.query(`SELECT id FROM app.regulatory_impacts WHERE ${predicate} AND state='OPEN' LIMIT 200`, s)).rows.map(r => ({ source: 'DPDP_REGULATORY_CHANGE', id: r.id, due: null })),
    ...(await c.tx.query(`SELECT id,due_at FROM app.sdf_obligations WHERE ${predicate} AND state='OPEN'`, s)).rows.map(r => ({ source: 'DPDP_SDF_OBLIGATION', id: r.id, due: r.due_at })),
  ];
  let created = 0; const unresolved: { source: string; source_id: string; reason: string }[] = [];
  for (const item of sources) {
    if ((await c.tx.query(`SELECT 1 FROM app.notification_tasks WHERE ${predicate} AND source=$4 AND source_id=$5`, [...s, item.source, item.id])).rowCount) continue;
    if (!template || !recipient) {
      if (unresolved.length < 100) unresolved.push({ source: item.source, source_id: item.id, reason: !template ? `No ${TEMPLATE_CODE} notification template is configured.` : 'No DPO or grievance contact is recorded on the organisation profile.' });
      continue;
    }
    await createNotificationTask(c, { template_id: template.id, source: item.source, source_id: item.id, recipient_reference: recipient, source_due_at: iso(item.due) });
    created++;
  }
  await audit(c, 'operations.notification_sweep');
  return O.NotificationSweep.parse({ swept_at: new Date().toISOString(), examined: sources.length, created, unresolved });
}
