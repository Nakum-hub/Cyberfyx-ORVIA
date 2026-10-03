import * as C from '../../../../shared/contracts/src/audit-channel.ts';
import type { Context } from '../shared/transaction.ts';
import { predicate, scope, packageAt } from '../operations/shared.ts';
import { indicatorsFor } from './indicators.ts';
import { dpdpFramework, controlStandings } from './exchange.ts';

/**
 * Evidence ORVIA generates for an audit mandate (revision 1.6 addendum).
 *
 * Every entry is an aggregate or a state read from this installation's own
 * records by the background worker under row-level security (the worker may
 * read these sources only while an active mandate exists). No entry carries a
 * data principal's identifier, contact detail or free text; control and policy
 * titles are the organisation's own names for its controls and policies.
 * Nothing here is written by the client for the occasion, so nothing can be
 * selected, edited or backdated before it is signed.
 */
type Entry = C.EvidenceEntry;
const MAX_ROWS = 500;
const entry = (e: Omit<Entry, 'detail'> & { detail?: Entry['detail'] }): Entry => C.EvidenceEntry.parse({ detail: null, ...e, label: e.label.slice(0, 200), basis: e.basis.slice(0, 400) });
const isoOrNull = (v: unknown) => v instanceof Date ? v.toISOString() : v === null || v === undefined ? null : String(v);

export type Collection = { categories: C.EvidenceCategory[]; scope: string[]; period: { from: string; to: string }; requirementFilter?: string | null };
export async function collect(c: Context, spec: Collection, now = new Date()): Promise<{ entries: Entry[]; limits: string[]; regulatory_package: { version: string; kind: string } | null }> {
  const entries: Entry[] = []; const limits: string[] = [];
  const reqs = spec.requirementFilter ? spec.scope.filter(r => r === spec.requirementFilter) : spec.scope;
  const pkg = await packageAt(c, now);
  if (!pkg) limits.push('No approved regulatory package is in force in this installation.');
  else if (pkg.distribution === 'TEST_FIXTURE') limits.push('The regulatory package in force is a TEST FIXTURE, not the official DPDP text.');
  const want = new Set(spec.categories);
  if (want.has('INDICATORS')) for (const r of reqs) for (const i of await indicatorsFor(c, r, now))
    entries.push(entry({ category: 'INDICATORS', requirement_id: r, key: i.key, label: i.label, value: i.value, unit: i.unit, basis: i.basis }));
  const framework = (want.has('CONTROL_STANDING') || want.has('CONTROL_TESTS')) && pkg ? await dpdpFramework(c, pkg.version) : null;
  if ((want.has('CONTROL_STANDING') || want.has('CONTROL_TESTS')) && !framework) limits.push('The DPDP framework is not imported into Frameworks & controls, so no control evidence exists to report.');
  const standings = framework ? await controlStandings(c, framework.id, false) : new Map();
  if (want.has('CONTROL_STANDING')) for (const r of reqs) for (const s of standings.get(r) ?? [])
    entries.push(entry({ category: 'CONTROL_STANDING', requirement_id: r, key: 'control.standing', label: s.title, value: s.standing, unit: 'standing',
      basis: 'standing of the control from its latest evidence, review decision and validity', detail: { control_id: s.control_id, evidence_id: s.evidence_id } }));
  if (want.has('CONTROL_TESTS')) {
    const controlReqs = new Map<string, string[]>();
    for (const r of reqs) for (const s of standings.get(r) ?? []) controlReqs.set(s.control_id, [...(controlReqs.get(s.control_id) ?? []), r]);
    const tests = (await c.tx.query(`SELECT t.id, t.control_id, t.check_kind, t.enabled,
        (SELECT count(*)::int FROM app.control_test_runs x WHERE x.tenant_id=t.tenant_id AND x.legal_entity_id=t.legal_entity_id AND x.environment_id=t.environment_id AND x.test_id=t.id AND x.observed_at>$4 AND x.observed_at<=$5) AS runs,
        (SELECT count(*)::int FROM app.control_test_runs x WHERE x.tenant_id=t.tenant_id AND x.legal_entity_id=t.legal_entity_id AND x.environment_id=t.environment_id AND x.test_id=t.id AND x.observed_at>$4 AND x.observed_at<=$5 AND x.result='PASS') AS passes,
        (SELECT count(*)::int FROM app.control_test_runs x WHERE x.tenant_id=t.tenant_id AND x.legal_entity_id=t.legal_entity_id AND x.environment_id=t.environment_id AND x.test_id=t.id AND x.observed_at>$4 AND x.observed_at<=$5 AND x.result='FAIL') AS fails,
        (SELECT count(*)::int FROM app.control_test_runs x WHERE x.tenant_id=t.tenant_id AND x.legal_entity_id=t.legal_entity_id AND x.environment_id=t.environment_id AND x.test_id=t.id AND x.observed_at>$4 AND x.observed_at<=$5 AND x.result='ERROR') AS errors,
        (SELECT x.result FROM app.control_test_runs x WHERE x.tenant_id=t.tenant_id AND x.legal_entity_id=t.legal_entity_id AND x.environment_id=t.environment_id AND x.test_id=t.id ORDER BY x.sequence DESC LIMIT 1) AS latest_result,
        (SELECT x.observed_at FROM app.control_test_runs x WHERE x.tenant_id=t.tenant_id AND x.legal_entity_id=t.legal_entity_id AND x.environment_id=t.environment_id AND x.test_id=t.id ORDER BY x.sequence DESC LIMIT 1) AS latest_at
      FROM app.control_tests t WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 ORDER BY t.id LIMIT ${MAX_ROWS}`, [...scope(c), spec.period.from, spec.period.to])).rows;
    for (const t of tests) for (const r of controlReqs.get(t.control_id) ?? [])
      entries.push(entry({ category: 'CONTROL_TESTS', requirement_id: r, key: 'control_test.result', label: `Control test ${String(t.check_kind).replaceAll('_', ' ').toLowerCase()}`, value: t.latest_result ?? 'NOT_RUN', unit: 'result',
        basis: 'latest result of the scheduled control test, and its runs within the period', detail: { test_id: t.id, control_id: t.control_id, check_kind: t.check_kind, enabled: t.enabled,
          runs_in_period: t.runs, passes: t.passes, fails: t.fails, errors: t.errors, latest_at: isoOrNull(t.latest_at) } }));
  }
  if (want.has('NOTICE_VERSIONS')) {
    const rows = (await c.tx.query(`SELECT notice_id, version, locale, status, published_at, effective_from, effective_to, content_digest FROM app.registry_notice_versions WHERE ${predicate} AND status IN ('PUBLISHED','SUPERSEDED')
      ORDER BY notice_id, locale, version LIMIT ${MAX_ROWS + 1}`, scope(c))).rows;
    if (rows.length > MAX_ROWS) limits.push(`More than ${MAX_ROWS} notice versions exist; the first ${MAX_ROWS} are listed.`);
    for (const n of rows.slice(0, MAX_ROWS)) entries.push(entry({ category: 'NOTICE_VERSIONS', requirement_id: null, key: 'notice.version', label: `Notice version ${n.version} (${n.locale})`, value: n.status, unit: 'status',
      basis: 'published or superseded notice versions in the data processing registry', detail: { notice_id: n.notice_id, version: n.version, locale: n.locale, published_at: isoOrNull(n.published_at),
        effective_from: isoOrNull(n.effective_from), effective_to: isoOrNull(n.effective_to), content_sha256: n.content_digest } }));
  }
  if (want.has('POLICY_VERSIONS')) {
    const rows = (await c.tx.query(`SELECT policy_key, version, title, status, published_at, next_review_at, retired_at, requirement_ids, approved_by IS NOT NULL AS independently_approved FROM app.grc_policies WHERE ${predicate} AND status IN ('PUBLISHED','RETIRED')
      ORDER BY policy_key, version LIMIT ${MAX_ROWS}`, scope(c))).rows;
    const inScope = new Set(reqs);
    for (const p of rows) {
      const targets = (p.requirement_ids as string[]).filter(r => inScope.has(r));
      for (const r of targets.length ? targets : [null]) entries.push(entry({ category: 'POLICY_VERSIONS', requirement_id: r, key: 'policy.version', label: p.title, value: p.status, unit: 'status',
        basis: 'published or retired policy versions', detail: { policy_key: p.policy_key, version: p.version, published_at: isoOrNull(p.published_at), retired_at: isoOrNull(p.retired_at),
          next_review_at: isoOrNull(p.next_review_at), review_overdue: p.status === 'PUBLISHED' && p.next_review_at !== null && new Date(p.next_review_at) < now, independently_approved: p.independently_approved } }));
    }
  }
  if (want.has('ACTIVITY_LOG_DIGEST')) {
    const families = (await c.tx.query(`SELECT split_part(operation,'.',1) AS family, count(*)::int AS n FROM app.audit_events WHERE ${predicate} AND created_at>$4 AND created_at<=$5 GROUP BY 1 ORDER BY 1 LIMIT 200`,
      [...scope(c), spec.period.from, spec.period.to])).rows;
    const digest = (await c.tx.query(`SELECT count(*)::int AS n, encode(sha256(convert_to(coalesce(string_agg(id::text, ',' ORDER BY created_at, id), ''), 'UTF8')), 'hex') AS d
      FROM app.audit_events WHERE ${predicate} AND created_at>$4 AND created_at<=$5`, [...scope(c), spec.period.from, spec.period.to])).rows[0];
    entries.push(entry({ category: 'ACTIVITY_LOG_DIGEST', requirement_id: null, key: 'activity_log.digest', label: 'Audit trail digest for the period', value: digest.d, unit: 'sha256',
      basis: 'SHA-256 over the identifiers of all audit events in the period, in time order; no actors or resources are included', detail: { events: digest.n, from: spec.period.from, to: spec.period.to } }));
    for (const f of families) entries.push(entry({ category: 'ACTIVITY_LOG_DIGEST', requirement_id: null, key: 'activity_log.family', label: `Audit events: ${f.family}`, value: f.n, unit: 'count',
      basis: 'audit events in the period whose operation starts with this family name', detail: { family: String(f.family).slice(0, 60) } }));
    limits.push('The audit trail digest shows what the log held when this delivery was generated; the audit event table itself is not hash-chained.');
  }
  return { entries, limits, regulatory_package: pkg ? { version: pkg.version, kind: pkg.distribution } : null };
}

/** Population and yes/no test for each auditor-sampled population; only counts and a digest of the selection leave. */
const POPULATIONS: Record<C.SamplePopulation, string> = {
  CONSENT_EVENTS_WITH_EVIDENCE: `SELECT id::text AS id, evidence_state='EVIDENCE_AVAILABLE' AS pass FROM app.consent_record_events WHERE ${predicate}`,
  BREACH_TASKS_WITHIN_TIMER: `SELECT id::text AS id, completed_at<=due_at AS pass FROM app.breach_tasks WHERE ${predicate} AND state='COMPLETED' AND legal_status<>'NOT_YET_IN_FORCE' AND due_at IS NOT NULL AND kind IN ('PRINCIPAL_INTIMATION','BOARD_INTIMATION','BOARD_DETAILED_REPORT')`,
  GRIEVANCES_RESOLVED_WITHIN_90_DAYS: `SELECT r.id::text AS id, coalesce((SELECT min(e.recorded_at) FROM app.rights_request_events e WHERE e.tenant_id=r.tenant_id AND e.legal_entity_id=r.legal_entity_id AND e.environment_id=r.environment_id
      AND e.request_id=r.id AND e.to_state IN ('COMPLETED','REJECTED','CLOSED')) <= r.received_at + interval '90 days', false) AS pass
    FROM app.rights_requests r WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.right_type='GRIEVANCE' AND r.state IN ('COMPLETED','REJECTED','CLOSED')`,
  WITHDRAWAL_RUNS_VERIFIED: `SELECT id::text AS id, status='COMPLETED_VERIFIED' AS pass FROM app.workflow_runs WHERE ${predicate} AND kind='CONSENT_WITHDRAWAL' AND status IN ('COMPLETED_VERIFIED','COMPLETED_WITH_EXCEPTIONS','PARTIALLY_FAILED','BLOCKED','CANCELLED')`,
};
const MAX_POPULATION = 200_000;
export async function sampleCount(c: Context, request: C.AuditorRequest): Promise<{ entries: Entry[]; limits: string[] }> {
  const population = request.population!; const size = request.sample_size!;
  const rows = (await c.tx.query(`${POPULATIONS[population]} ORDER BY 1 LIMIT ${MAX_POPULATION + 1}`, scope(c))).rows as { id: string; pass: boolean }[];
  const limits: string[] = [];
  if (rows.length > MAX_POPULATION) limits.push(`The population exceeds ${MAX_POPULATION} records; the selection was made from the first ${MAX_POPULATION} by identifier.`);
  const selected = C.seededSelection(rows.slice(0, MAX_POPULATION), request.seed!, size);
  const passed = selected.filter(s => s.pass).length;
  const label = C.samplePopulationLabels[population];
  return { limits, entries: [entry({ category: 'SAMPLE_COUNTS', requirement_id: request.requirement_id, key: `sample.${population.toLowerCase()}`, label: `${label.population}: ${label.test}`, value: passed, unit: 'records passing',
    basis: `records selected by the auditor's seed (HMAC-SHA256 order) from the population; only counts and a digest of the selected identifiers are reported`,
    detail: { population_size: Math.min(rows.length, MAX_POPULATION), selected: selected.length, passed, failed: selected.length - passed, selection_sha256: C.selectionDigest(selected.map(s => s.id)), seed: request.seed } })] };
}
