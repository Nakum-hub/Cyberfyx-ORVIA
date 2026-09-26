import { createHash, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, packageAt, pageOf, predicate, refuse, scope } from '../operations/shared.ts';
import { createGrcFramework } from './grc.ts';

/**
 * EX10 policy lifecycle and issue management; EX11 continuous control tests.
 *
 * A policy version is immutable and is published by someone other than its
 * author. An issue is remediated with evidence and closed only by verification:
 * a passing run of a control test recorded after the remediation, or a review by
 * someone other than the remediator. A control test runs a deterministic check
 * over this installation's records (app.run_control_check); its result derives
 * the control's standing, a failure opens one issue per test and repeated
 * failures are recorded against it, and only a change of state raises an alert.
 * An error is an error, never a pass; a test that has not run within twice its
 * interval is stale.
 */
type Row = QueryResultRow;
const DAY = 86_400_000;
const DECISIVE = new Set(['REMEDIATION_PLANNED', 'REMEDIATED', 'VERIFIED', 'RISK_ACCEPTED', 'REOPENED', 'RECURRED']);
const SEVERITY_FOR_CHECK: Record<string, string> = { FORCED_ROW_SECURITY: 'CRITICAL', AUDIT_TRAIL_APPEND_ONLY: 'CRITICAL', WITHDRAWALS_PROPAGATED: 'HIGH' };
const lock = (c: Context, kind: string, id: string) => c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), kind, id])]);
const isApprover = (c: Context) => c.actor.actor_domain === 'STAFF' && c.actor.capabilities.includes('grc.approve');

// ---------------------------------------------------------------- policies
async function policyView(c: Context, r: Row) {
  const acks = (await c.tx.query(`SELECT count(*)::int n, bool_or(actor_id=$5) mine FROM app.grc_policy_acknowledgements WHERE ${predicate} AND policy_id=$4`, [...scope(c), r.id, c.actor.actor_id])).rows[0]!;
  return X.GrcPolicy.parse({
    id: r.id, policy_key: r.policy_key, version: r.version, title: r.title, body: r.body, owner_reference: r.owner_reference, review_interval_days: r.review_interval_days,
    control_ids: r.control_ids, requirement_ids: r.requirement_ids, change_summary: r.change_summary, status: r.status, recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at),
    approved_by: r.approved_by, published_at: iso(r.published_at), retired_at: iso(r.retired_at), next_review_at: iso(r.next_review_at),
    review_due: r.status === 'PUBLISHED' && r.next_review_at !== null && Date.parse(r.next_review_at) < Date.now(), acknowledgements: acks.n, acknowledged_by_me: Boolean(acks.mine),
  });
}
async function policyRow(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT * FROM app.grc_policies WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
export async function createPolicy(c: Context, input: unknown) {
  const value = X.GrcPolicyCreate.parse(input);
  for (const control of value.control_ids) await exists(c, 'grc_controls', control, 'control_ids');
  if (value.requirement_ids.length) {
    const pkg = await packageAt(c, new Date());
    for (const id of value.requirement_ids) if (!pkg?.claims.requirements.some(r => r.requirement_id === id)) refuse(409, 'requirement_ids', 'requirement_not_in_active_package');
  }
  const key = value.policy_key ?? randomUUID();
  await lock(c, 'grc-policy', key);
  let version = 1;
  if (value.policy_key) {
    const prior = (await c.tx.query(`SELECT max(version) v FROM app.grc_policies WHERE ${predicate} AND policy_key=$4`, [...scope(c), key])).rows[0];
    if (!prior?.v) refuse(404, 'policy_key', 'not_found');
    version = Number(prior.v) + 1;
  }
  const row = (await c.tx.query(`INSERT INTO app.grc_policies(tenant_id,legal_entity_id,environment_id,id,policy_key,version,title,body,owner_reference,review_interval_days,control_ids,requirement_ids,change_summary,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
  [...scope(c), randomUUID(), key, version, value.title, value.body, value.owner_reference, value.review_interval_days, value.control_ids, value.requirement_ids, value.change_summary, c.actor.actor_id])).rows[0];
  await audit(c, 'grc_policy.create', row.id);
  return policyView(c, row);
}
export async function decidePolicy(c: Context, id: string, input: unknown) {
  const value = X.GrcPolicyDecision.parse(input);
  const current = await policyRow(c, id);
  await lock(c, 'grc-policy', current.policy_key);
  if (value.action === 'PUBLISH') {
    if (current.status !== 'DRAFT') refuse(409, 'status', 'only_a_draft_is_published');
    if (current.recorded_by === c.actor.actor_id) refuse(409, 'approved_by', 'author_cannot_publish');
    await c.tx.query(`UPDATE app.grc_policies SET status='RETIRED',retired_at=clock_timestamp() WHERE ${predicate} AND policy_key=$4 AND status='PUBLISHED'`, [...scope(c), current.policy_key]);
    const row = (await c.tx.query(`UPDATE app.grc_policies SET status='PUBLISHED',approved_by=$5,published_at=clock_timestamp(),next_review_at=clock_timestamp()+make_interval(days=>review_interval_days) WHERE ${predicate} AND id=$4 RETURNING *`,
      [...scope(c), id, c.actor.actor_id])).rows[0];
    await audit(c, 'grc_policy.publish', id);
    return policyView(c, row);
  }
  if (current.status !== 'PUBLISHED') refuse(409, 'status', 'only_a_published_policy_is_retired');
  const row = (await c.tx.query(`UPDATE app.grc_policies SET status='RETIRED',retired_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'grc_policy.retire', id);
  return policyView(c, row);
}
export async function acknowledgePolicy(c: Context, id: string) {
  const current = await policyRow(c, id);
  if (current.status !== 'PUBLISHED') refuse(409, 'status', 'only_a_published_policy_is_acknowledged');
  await c.tx.query(`INSERT INTO app.grc_policy_acknowledgements(tenant_id,legal_entity_id,environment_id,id,policy_id,actor_id) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING`, [...scope(c), randomUUID(), id, c.actor.actor_id]);
  await audit(c, 'grc_policy.acknowledge', id);
  return policyView(c, current);
}
export async function policyList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.grc_policies x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3
    AND ($4::uuid IS NULL OR (x.recorded_at, x.id) < (SELECT k.recorded_at, k.id FROM app.grc_policies k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4))
    ORDER BY x.recorded_at DESC, x.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = []; for (const r of paged.items) items.push(await policyView(c, r));
  return { items, next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------- issues
function issueState(events: Row[], now: number): ReturnType<typeof X.IssueState.parse> {
  const decisive = events.find(e => DECISIVE.has(e.kind));
  if (!decisive || decisive.kind === 'REOPENED' || decisive.kind === 'RECURRED') return 'OPEN';
  if (decisive.kind === 'RISK_ACCEPTED') return Date.parse(decisive.acceptance_expires_at) <= now ? 'ACCEPTANCE_EXPIRED' : 'RISK_ACCEPTED';
  return decisive.kind;
}
async function issueRows(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT * FROM app.grc_issues WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  const events = (await c.tx.query(`SELECT * FROM app.grc_issue_events WHERE ${predicate} AND issue_id=$4 ORDER BY sequence DESC LIMIT 200`, [...scope(c), id])).rows;
  return { issue: r as Row, events };
}
async function issueView(c: Context, id: string) {
  const { issue: r, events } = await issueRows(c, id);
  const now = Date.now(); const state = issueState(events, now);
  return X.Issue.parse({
    id: r.id, source_kind: r.source_kind, source_id: r.source_id, title: r.title, severity: r.severity, owner_reference: r.owner_reference, due_at: iso(r.due_at),
    control_id: r.control_id, risk_id: r.risk_id, state, overdue: !['VERIFIED', 'RISK_ACCEPTED'].includes(state) && Date.parse(r.due_at) < now,
    events: events.map(e => ({ id: e.id, kind: e.kind, note: e.note, evidence_reference: e.evidence_reference, verification_method: e.verification_method, control_test_run_id: e.control_test_run_id,
      acceptance_expires_at: iso(e.acceptance_expires_at), actor_id: e.actor_id, recorded_at: iso(e.recorded_at) })),
    created_by: r.created_by, created_at: iso(r.created_at),
  });
}
export const readIssue = issueView;
const SOURCE_TABLE: Record<string, string> = { AUDIT_REQUEST: 'grc_audit_requests', IMPACT_FINDING: 'impact_findings', POLICY_REVIEW: 'grc_policies' };
export async function createIssue(c: Context, input: unknown) {
  const value = X.IssueCreate.parse(input);
  if (value.source_id) await exists(c, SOURCE_TABLE[value.source_kind]!, value.source_id, 'source_id');
  await exists(c, 'grc_controls', value.control_id, 'control_id');
  await exists(c, 'grc_risks', value.risk_id, 'risk_id');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.grc_issues(tenant_id,legal_entity_id,environment_id,id,source_kind,source_id,title,severity,owner_reference,due_at,control_id,risk_id,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
    [...scope(c), id, value.source_kind, value.source_id, value.title, value.severity, value.owner_reference, value.due_at, value.control_id, value.risk_id, c.actor.actor_id]);
  await audit(c, 'grc_issue.create', id);
  return issueView(c, id);
}
export async function recordIssueEvent(c: Context, id: string, input: unknown) {
  const value = X.IssueEventRecord.parse(input);
  await lock(c, 'grc-issue', id);
  const { issue, events } = await issueRows(c, id);
  const state = issueState(events, Date.now());
  const allowed: Record<string, string[]> = {
    REMEDIATION_PLANNED: ['OPEN', 'ACCEPTANCE_EXPIRED'], REMEDIATED: ['OPEN', 'REMEDIATION_PLANNED', 'ACCEPTANCE_EXPIRED'], VERIFIED: ['REMEDIATED'],
    RISK_ACCEPTED: ['OPEN', 'REMEDIATION_PLANNED', 'ACCEPTANCE_EXPIRED'], REOPENED: ['VERIFIED', 'RISK_ACCEPTED', 'ACCEPTANCE_EXPIRED'],
  };
  if (!allowed[value.kind]!.includes(state)) refuse(409, 'kind', `not_allowed_when_${state.toLowerCase()}`);
  if (value.kind === 'RISK_ACCEPTED') {
    if (!isApprover(c)) refuse(409, 'kind', 'risk_acceptance_needs_an_approver');
    if (issue.created_by === c.actor.actor_id) refuse(409, 'actor_id', 'raiser_cannot_accept_the_risk');
    if (Date.parse(value.acceptance_expires_at!) <= Date.now()) refuse(400, 'acceptance_expires_at', 'expiry_is_in_the_future');
  }
  if (value.kind === 'VERIFIED') {
    const remediation = events.find(e => e.kind === 'REMEDIATED')!;
    if (value.verification_method === 'INDEPENDENT_REVIEW') {
      if (!isApprover(c)) refuse(409, 'verification_method', 'independent_review_needs_an_approver');
      if (remediation.actor_id === c.actor.actor_id) refuse(409, 'actor_id', 'remediator_cannot_verify');
      if (!value.evidence_reference) refuse(400, 'evidence_reference', 'review_cites_evidence');
    } else {
      // A control-test verification names a passing run, observed after the remediation, of a test that covers this issue.
      const run = (await c.tx.query(`SELECT r.result, r.observed_at, t.id test_id, t.control_id FROM app.control_test_runs r JOIN app.control_tests t ON t.tenant_id=r.tenant_id AND t.legal_entity_id=r.legal_entity_id AND t.environment_id=r.environment_id AND t.id=r.test_id
        WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.id=$4`, [...scope(c), value.control_test_run_id])).rows[0];
      if (!run) refuse(404, 'control_test_run_id', 'not_found');
      const covers = (issue.source_kind === 'CONTROL_TEST' && issue.source_id === run.test_id) || (issue.control_id !== null && issue.control_id === run.control_id);
      if (!covers) refuse(409, 'control_test_run_id', 'run_does_not_cover_this_issue');
      if (run.result !== 'PASS') refuse(409, 'control_test_run_id', 'run_did_not_pass');
      if (Date.parse(run.observed_at) <= Date.parse(remediation.recorded_at)) refuse(409, 'control_test_run_id', 'run_precedes_the_remediation');
    }
  }
  await c.tx.query(`INSERT INTO app.grc_issue_events(tenant_id,legal_entity_id,environment_id,id,issue_id,kind,note,evidence_reference,verification_method,control_test_run_id,acceptance_expires_at,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [...scope(c), randomUUID(), id, value.kind, value.note, value.evidence_reference, value.verification_method, value.control_test_run_id, value.acceptance_expires_at, c.actor.actor_id]);
  await audit(c, `grc_issue.${value.kind.toLowerCase()}`, id);
  return issueView(c, id);
}
export async function issueList(c: Context, page: Page, query: unknown) {
  const q = X.IssueQuery.parse(query ?? {});
  // Newest first. State is derived from events, so filtering by state reads a bounded window and filters it.
  const rows = (await c.tx.query(`SELECT x.id FROM app.grc_issues x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3
    AND ($4::uuid IS NULL OR (x.created_at, x.id) < (SELECT k.created_at, k.id FROM app.grc_issues k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4)) AND ($6::text IS NULL OR x.source_kind=$6)
    ORDER BY x.created_at DESC, x.id DESC LIMIT $5`,
    [...scope(c), page.cursor, q.state ? 1000 : page.limit + 1, q.source_kind ?? null])).rows;
  const items = [];
  let last: string | null = null;
  for (const r of rows) {
    const view = await issueView(c, r.id);
    last = r.id;
    if (!q.state || view.state === q.state) items.push(view);
    if (items.length > page.limit) break;
  }
  const pageItems = items.slice(0, page.limit);
  // A full page resumes after its last item; a filtered window that ran out resumes after the last row it scanned.
  const resume = items.length > page.limit ? pageItems.at(-1)!.id : q.state && rows.length === 1000 ? last : null;
  return { items: pageItems, next_cursor: resume ? Buffer.from(resume).toString('base64url') : null };
}
export async function importRegulatoryFramework(c: Context, input: unknown) {
  const value = X.RegulatoryFrameworkImport.parse(input);
  const pkg = await packageAt(c, new Date());
  if (!pkg) refuse(409, 'package', 'no_regulatory_package_in_force');
  return createGrcFramework(c, { name: value.name, version: `${pkg.version} (${pkg.distribution === 'TEST_FIXTURE' ? 'test fixture' : 'production'})`, source_reference: `ORVIA regulatory package ${pkg.version}`,
    requirements: pkg.claims.requirements.slice(0, 100).map(r => ({ code: r.requirement_id, description: r.title.slice(0, 500) })) });
}

// ---------------------------------------------------------------- control tests
const runView = (r: Row) => X.ControlTestRun.parse({
  id: r.id, test_id: r.test_id, trigger: r.trigger, result: r.result, violations: r.violations, sample: (r.sample as unknown[]).map(String).slice(0, 10), error_code: r.error_code,
  observation_digest: r.observation_digest, actor_id: r.actor_id, observed_at: iso(r.observed_at),
});
function standingOf(test: Row, latest: Row | undefined, now: number): ReturnType<typeof X.ControlTestStanding.parse> {
  if (!test.enabled) return 'DISABLED';
  if (!latest) return 'NEVER_RUN';
  if (now - Date.parse(latest.observed_at) > 2 * test.interval_minutes * 60_000) return 'STALE';
  return latest.result === 'PASS' ? 'PASSING' : latest.result === 'FAIL' ? 'FAILING' : 'ERROR';
}
async function testView(c: Context, r: Row) {
  const latest = (await c.tx.query(`SELECT * FROM app.control_test_runs WHERE ${predicate} AND test_id=$4 ORDER BY sequence DESC LIMIT 1`, [...scope(c), r.id])).rows[0];
  const issue = (await c.tx.query(`SELECT id FROM app.grc_issues WHERE ${predicate} AND source_kind='CONTROL_TEST' AND source_id=$4`, [...scope(c), r.id])).rows[0];
  let openIssue: string | null = null;
  if (issue) { const v = await issueView(c, issue.id); if (!['VERIFIED', 'RISK_ACCEPTED'].includes(v.state)) openIssue = issue.id; }
  return X.ControlTest.parse({
    id: r.id, control_id: r.control_id, name: r.name, check_kind: r.check_kind, maximum_violations: r.maximum_violations, interval_minutes: r.interval_minutes, enabled: r.enabled,
    next_run_at: iso(r.next_run_at), created_by: r.created_by, created_at: iso(r.created_at), latest_run: latest ? runView(latest) : null, standing: standingOf(r, latest, Date.now()), open_issue_id: openIssue,
  });
}
async function testRow(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT * FROM app.control_tests WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
export async function createControlTest(c: Context, input: unknown) {
  const value = X.ControlTestCreate.parse(input);
  await exists(c, 'grc_controls', value.control_id, 'control_id');
  const row = (await c.tx.query(`INSERT INTO app.control_tests(tenant_id,legal_entity_id,environment_id,id,control_id,name,check_kind,maximum_violations,interval_minutes,next_run_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,clock_timestamp(),$10) RETURNING *`,
    [...scope(c), randomUUID(), value.control_id, value.name, value.check_kind, value.maximum_violations, value.interval_minutes, c.actor.actor_id])).rows[0];
  await audit(c, 'control_test.create', row.id);
  return testView(c, row);
}
export async function toggleControlTest(c: Context, id: string, input: unknown) {
  const value = X.ControlTestToggle.parse(input);
  await testRow(c, id);
  const row = (await c.tx.query(`UPDATE app.control_tests SET enabled=$5 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, value.enabled])).rows[0];
  await audit(c, value.enabled ? 'control_test.enable' : 'control_test.disable', id);
  return testView(c, row);
}

/** Runs one test and applies its consequences: issue, recurrence, verification and state-change alert. */
async function executeTest(c: Context, test: Row, trigger: 'SCHEDULE' | 'MANUAL') {
  await lock(c, 'control-test', test.id);
  const previous = (await c.tx.query(`SELECT * FROM app.control_test_runs WHERE ${predicate} AND test_id=$4 ORDER BY sequence DESC LIMIT 1`, [...scope(c), test.id])).rows[0];
  let result: 'PASS' | 'FAIL' | 'ERROR'; let violations: number | null = null; let sample: unknown[] = []; let errorCode: string | null = null;
  await c.tx.query('SAVEPOINT control_check');
  try {
    const observed = (await c.tx.query('SELECT app.run_control_check($1) AS r', [test.check_kind])).rows[0]!.r as { violations: number; sample: unknown[] };
    await c.tx.query('RELEASE SAVEPOINT control_check');
    violations = observed.violations; sample = observed.sample.slice(0, 10);
    result = violations <= test.maximum_violations ? 'PASS' : 'FAIL';
  } catch (error) {
    await c.tx.query('ROLLBACK TO SAVEPOINT control_check');
    result = 'ERROR'; errorCode = `SQLSTATE_${String((error as { code?: string }).code ?? 'UNKNOWN').slice(0, 20)}`;
  }
  const observedAt = new Date().toISOString();
  const digest = createHash('sha256').update(JSON.stringify({ check: test.check_kind, violations, sample, result, observed_at: observedAt })).digest('hex');
  const run = (await c.tx.query(`INSERT INTO app.control_test_runs(tenant_id,legal_entity_id,environment_id,id,test_id,trigger,result,violations,sample,error_code,observation_digest,actor_id,observed_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
    [...scope(c), randomUUID(), test.id, trigger, result, violations, JSON.stringify(sample), errorCode, digest, c.actor.actor_id, observedAt])).rows[0]!;
  await c.tx.query(`UPDATE app.control_tests SET next_run_at=clock_timestamp()+make_interval(mins=>interval_minutes) WHERE ${predicate} AND id=$4`, [...scope(c), test.id]);
  // An alert marks a change of state only; a test that keeps failing does not alert again.
  const before = previous?.result ?? null;
  const alert = result === 'FAIL' && before !== 'FAIL' ? 'DRIFT_TO_FAIL' : result === 'PASS' && before === 'FAIL' ? 'RECOVERED' : result === 'ERROR' && before !== 'ERROR' ? 'ERROR' : null;
  if (alert) await c.tx.query(`INSERT INTO app.compliance_alerts(tenant_id,legal_entity_id,environment_id,id,test_id,run_id,kind,detail) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
    [...scope(c), randomUUID(), test.id, run.id, alert, `${test.name}: ${alert === 'ERROR' ? `the check could not run (${errorCode})` : `${violations} violation(s), limit ${test.maximum_violations}`}`.slice(0, 500)]);
  const existing = (await c.tx.query(`SELECT id FROM app.grc_issues WHERE ${predicate} AND source_kind='CONTROL_TEST' AND source_id=$4`, [...scope(c), test.id])).rows[0];
  if (result === 'FAIL') {
    if (!existing) {
      await c.tx.query(`INSERT INTO app.grc_issues(tenant_id,legal_entity_id,environment_id,id,source_kind,source_id,title,severity,owner_reference,due_at,control_id,created_by) VALUES($1,$2,$3,$4,'CONTROL_TEST',$5,$6,$7,$8,$9,$10,$11)`,
        [...scope(c), randomUUID(), test.id, `Control test failing: ${test.name}`.slice(0, 300), SEVERITY_FOR_CHECK[test.check_kind] ?? 'MEDIUM', 'Control owner', new Date(Date.now() + 14 * DAY).toISOString(), test.control_id, c.actor.actor_id]);
    } else {
      const view = await issueView(c, existing.id);
      if (['VERIFIED', 'RISK_ACCEPTED', 'ACCEPTANCE_EXPIRED'].includes(view.state))
        await c.tx.query(`INSERT INTO app.grc_issue_events(tenant_id,legal_entity_id,environment_id,id,issue_id,kind,note,actor_id) VALUES($1,$2,$3,$4,$5,'RECURRED',$6,$7)`,
          [...scope(c), randomUUID(), existing.id, `The control test failed again (${violations} violation(s)); run ${run.id}.`, c.actor.actor_id]);
    }
  } else if (result === 'PASS' && existing) {
    const view = await issueView(c, existing.id);
    if (view.state === 'REMEDIATED')
      await c.tx.query(`INSERT INTO app.grc_issue_events(tenant_id,legal_entity_id,environment_id,id,issue_id,kind,note,verification_method,control_test_run_id,actor_id) VALUES($1,$2,$3,$4,$5,'VERIFIED',$6,'CONTROL_TEST',$7,$8)`,
        [...scope(c), randomUUID(), existing.id, `Verified by a passing run of "${test.name}" after remediation.`, run.id, c.actor.actor_id]);
  }
  await audit(c, `control_test.run.${result.toLowerCase()}`, test.id);
  return { run, alert };
}
export async function runControlTest(c: Context, id: string) {
  const test = await testRow(c, id);
  if (!test.enabled) refuse(409, 'enabled', 'test_disabled');
  await executeTest(c, test, 'MANUAL');
  return controlTestDetail(c, id);
}
export async function controlTestDetail(c: Context, id: string) {
  const test = await testRow(c, id);
  const runs = (await c.tx.query(`SELECT * FROM app.control_test_runs WHERE ${predicate} AND test_id=$4 ORDER BY sequence DESC LIMIT 100`, [...scope(c), id])).rows;
  return X.ControlTestDetail.parse({ test: await testView(c, test), runs: runs.map(runView) });
}
export async function controlTestList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.control_tests x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3
    AND ($4::uuid IS NULL OR (x.created_at, x.id) < (SELECT k.created_at, k.id FROM app.control_tests k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4))
    ORDER BY x.created_at DESC, x.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = []; for (const r of paged.items) items.push(await testView(c, r));
  return { items, next_cursor: paged.next_cursor };
}
/** Runs every due test in scope and escalates overdue open issues once per due date. Used by the operations runner. */
export async function controlTestSweep(c: Context, limit = 50) {
  const due = (await c.tx.query(`SELECT * FROM app.control_tests WHERE ${predicate} AND enabled AND next_run_at<=clock_timestamp() ORDER BY next_run_at LIMIT $4`, [...scope(c), limit])).rows;
  let failing = 0, errors = 0, alerts = 0;
  for (const test of due) {
    const { run, alert } = await executeTest(c, test, 'SCHEDULE');
    if (run.result === 'FAIL') failing++; if (run.result === 'ERROR') errors++; if (alert) alerts++;
  }
  let escalated = 0;
  const overdue = (await c.tx.query(`SELECT id, due_at FROM app.grc_issues WHERE ${predicate} AND due_at<clock_timestamp() ORDER BY due_at LIMIT 200`, scope(c))).rows;
  for (const r of overdue) {
    const view = await issueView(c, r.id);
    if (!view.overdue) continue;
    const note = `Overdue since ${iso(r.due_at)}`;
    if (view.events.some(e => e.kind === 'ESCALATED' && e.note === note)) continue;
    await c.tx.query(`INSERT INTO app.grc_issue_events(tenant_id,legal_entity_id,environment_id,id,issue_id,kind,note,actor_id) VALUES($1,$2,$3,$4,$5,'ESCALATED',$6,$7)`, [...scope(c), randomUUID(), r.id, note, c.actor.actor_id]);
    escalated++;
  }
  return X.ControlTestSweep.parse({ ran: due.length, failing, errors, alerts, issues_escalated: escalated });
}
export async function alertList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.compliance_alerts x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3
    AND ($4::uuid IS NULL OR (x.created_at, x.id) < (SELECT k.created_at, k.id FROM app.compliance_alerts k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4))
    ORDER BY x.created_at DESC, x.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => X.ComplianceAlert.parse({ id: r.id, test_id: r.test_id, run_id: r.run_id, kind: r.kind, detail: r.detail, created_at: iso(r.created_at), delivery_state: r.delivery_state })), next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------- auditor report
export async function complianceReport(c: Context) {
  const now = Date.now();
  const tests = (await c.tx.query(`SELECT * FROM app.control_tests WHERE ${predicate} ORDER BY created_at LIMIT 500`, scope(c))).rows;
  const standings = new Map<string, { test: Row; standing: string; last: string | null }>();
  for (const t of tests) {
    const latest = (await c.tx.query(`SELECT * FROM app.control_test_runs WHERE ${predicate} AND test_id=$4 ORDER BY sequence DESC LIMIT 1`, [...scope(c), t.id])).rows[0];
    standings.set(t.id, { test: t, standing: standingOf(t, latest, now), last: latest ? iso(latest.observed_at) : null });
  }
  const count = (s: string) => [...standings.values()].filter(x => x.standing === s).length;
  const issueIds = (await c.tx.query(`SELECT id FROM app.grc_issues WHERE ${predicate} LIMIT 1000`, scope(c))).rows;
  const issues = []; for (const r of issueIds) issues.push(await issueView(c, r.id));
  const open = issues.filter(i => !['VERIFIED', 'RISK_ACCEPTED'].includes(i.state));
  const policies = (await c.tx.query(`SELECT status, next_review_at FROM app.grc_policies WHERE ${predicate}`, scope(c))).rows;
  const frameworks = (await c.tx.query(`SELECT document FROM app.grc_frameworks WHERE ${predicate} ORDER BY id LIMIT 100`, scope(c))).rows.map(r => r.document);
  const controls = (await c.tx.query(`SELECT document FROM app.grc_controls WHERE ${predicate} ORDER BY id LIMIT 100`, scope(c))).rows.map(r => r.document);
  const mapped = new Set(controls.flatMap((ctl: { mappings: { framework_id: string; requirement_code: string }[] }) => ctl.mappings.map(m => `${m.framework_id}:${m.requirement_code}`)));
  return X.ComplianceReport.parse({
    as_of: new Date(now).toISOString(),
    summary: { tests: tests.length, passing: count('PASSING'), failing: count('FAILING'), error: count('ERROR'), stale: count('STALE'), never_run: count('NEVER_RUN'), disabled: count('DISABLED'),
      open_issues: open.length, overdue_issues: open.filter(i => i.overdue).length, policies_published: policies.filter(p => p.status === 'PUBLISHED').length,
      policies_review_due: policies.filter(p => p.status === 'PUBLISHED' && p.next_review_at && Date.parse(p.next_review_at) < now).length },
    frameworks: frameworks.map((f: { id: string; name: string; version: string; requirements: { code: string }[] }) => {
      const unmapped = f.requirements.filter(r => !mapped.has(`${f.id}:${r.code}`)).map(r => r.code);
      return { framework_id: f.id, name: f.name, version: f.version, requirements: f.requirements.length, requirements_mapped: f.requirements.length - unmapped.length, unmapped_codes: unmapped.slice(0, 100) };
    }),
    controls: controls.map((ctl: { id: string; title: string; mappings: { framework_id: string; requirement_code: string }[] }) => ({
      control_id: ctl.id, title: ctl.title, requirements: ctl.mappings.map(m => `${frameworks.find((f: { id: string; name: string }) => f.id === m.framework_id)?.name ?? m.framework_id}: ${m.requirement_code}`).slice(0, 100),
      tests: [...standings.values()].filter(x => x.test.control_id === ctl.id).map(x => ({ test_id: x.test.id, name: x.test.name, standing: x.standing, last_observed_at: x.last })).slice(0, 50),
      open_issues: open.filter(i => i.control_id === ctl.id).length,
    })),
    limits: ['Control tests examine records held by this installation; they do not observe external systems.', 'A passing test is evidence for the named check at the time shown, not a certification.'],
  });
}
