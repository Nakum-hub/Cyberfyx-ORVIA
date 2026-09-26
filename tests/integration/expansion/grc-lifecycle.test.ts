// EX10 policy lifecycle and issues; EX11 continuous control tests, through the real HTTP boundary.
// Under test: policy versions published only by someone other than their author,
// one published version per policy, acknowledgement by readers; issues whose state
// is derived from append-only events, closed only by verification (independent
// review or a passing control-test run after the remediation), risk acceptance by
// an approver other than the raiser; control tests run against this
// installation's records, where a deliberately broken control is detected, opens
// exactly one issue, alerts once per change of state, is verified automatically
// by the passing run after remediation and recurs on the same issue; an error is
// recorded as an error and never as a pass; the operations runner runs due tests
// and escalates overdue issues once; row-level policies checked at the database.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';
import { operationsRunner } from '../../../services/worker/src/operations-runner.ts';

const t = operationsSuite('grc-lifecycle');
const { h, check, ok, codes, db } = t;
const Policy = S.schemas.GrcPolicy; const Issue = S.schemas.Issue; const Test = S.schemas.ControlTest; const Detail = S.schemas.ControlTestDetail;

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const s = t.scope();
  const pkg = await t.ensurePackage();
  const runner = operationsRunner();
  const all = async <T>(path: string, schema: { parse(v: unknown): { items: T[]; next_cursor: string | null } }) => {
    const items: T[] = []; let cursor: string | null = null;
    do { const sep = path.includes('?') ? '&' : '?'; const r: { items: T[]; next_cursor: string | null } = await ok(admin.call(`${path}${sep}limit=100${cursor ? `&cursor=${cursor}` : ''}`), schema); items.push(...r.items); cursor = r.next_cursor; } while (cursor);
    return items;
  };
  try {
    t.setPhase('framework and control');
    const framework = await ok(admin.call('/api/v1/admin/grc/regulatory-framework', { name: unique('DPDP obligations') }, key()), S.schemas.GrcFramework);
    check('the regulatory framework is imported from the package in force, labelled with its distribution', [framework.requirements.length > 0, framework.version.includes('test fixture')], [true, true]);
    const code = framework.requirements[0]!.code;
    const control = await ok(admin.call('/api/v1/admin/grc/controls', { title: unique('Every processing system is bound'), description: 'Each system named by an activity has a connector binding.', owner_reference: 'Platform team', review_interval_days: 90,
      mappings: [{ framework_id: framework.id, requirement_code: code }] }, key()), S.schemas.GrcControl);

    t.setPhase('policy lifecycle');
    const body = { policy_key: null, title: unique('Data protection policy'), body: 'Personal data is processed only for recorded purposes and deleted on schedule.', owner_reference: 'Privacy office', review_interval_days: 365,
      control_ids: [control.id], requirement_ids: [code], change_summary: 'Initial version of the policy.' };
    check('a policy citing a requirement outside the package in force is refused', await codes(owner.call('/api/v1/admin/grc/policies', { ...body, requirement_ids: ['NOT-A-REQUIREMENT'] }, key())), { status: 409, codes: ['requirement_not_in_active_package'] });
    const v1 = await ok(owner.call('/api/v1/admin/grc/policies', body, key()), Policy);
    check('a new policy is a draft, version 1', [v1.status, v1.version, v1.next_review_at], ['DRAFT', 1, null]);
    check('a draft cannot be acknowledged', (await admin.call(`/api/v1/admin/grc/policies/${v1.id}/acknowledgement`, {}, key())).status, 409);
    check('the author cannot publish their own policy', await codes(owner.call(`/api/v1/admin/grc/policies/${v1.id}/decision`, { action: 'PUBLISH' }, key())), { status: 409, codes: ['author_cannot_publish'] });
    check('an admin without approval authority cannot publish', (await admin.call(`/api/v1/admin/grc/policies/${v1.id}/decision`, { action: 'PUBLISH' }, key())).status, 403);
    const published = await ok(reviewer.call(`/api/v1/admin/grc/policies/${v1.id}/decision`, { action: 'PUBLISH' }, key()), Policy);
    check('another approver publishes it and a review date is set', [published.status, published.approved_by === h.users.reviewer!.id, published.next_review_at !== null, published.review_due], ['PUBLISHED', true, true, false]);
    const acked = await ok(auditor.call(`/api/v1/admin/grc/policies/${v1.id}/acknowledgement`, {}, key()), Policy);
    await ok(auditor.call(`/api/v1/admin/grc/policies/${v1.id}/acknowledgement`, {}, key()), Policy);
    check('a reader acknowledges a published policy once, however often they press', [acked.acknowledgements, acked.acknowledged_by_me], [1, true]);
    const v2 = await ok(admin.call('/api/v1/admin/grc/policies', { ...body, policy_key: v1.policy_key, change_summary: 'Adds the deletion schedule reference.' }, key()), Policy);
    check('a new version of the same policy is version 2', [v2.policy_key, v2.version, v2.status], [v1.policy_key, 2, 'DRAFT']);
    check('a version of an unknown policy is refused', (await admin.call('/api/v1/admin/grc/policies', { ...body, policy_key: randomUUID() }, key())).status, 404);
    await ok(owner.call(`/api/v1/admin/grc/policies/${v2.id}/decision`, { action: 'PUBLISH' }, key()), Policy);
    const policies = (await all('/api/v1/admin/grc/policies', S.schemas.GrcPolicyList)).filter(p => p.policy_key === v1.policy_key);
    check('publishing version 2 retires version 1; one version is in force', policies.map(p => [p.version, p.status]).sort(), [[1, 'RETIRED'], [2, 'PUBLISHED']]);
    check('a retired version cannot be published again', (await reviewer.call(`/api/v1/admin/grc/policies/${v1.id}/decision`, { action: 'PUBLISH' }, key())).status, 409);

    t.setPhase('manual issues');
    const issueBody = { source_kind: 'MANUAL', source_id: null, title: unique('Access review not evidenced'), severity: 'HIGH', owner_reference: 'IT security', due_at: hoursFromNow(24 * 7), control_id: control.id, risk_id: null };
    check('a sourced issue must name its source', (await admin.call('/api/v1/admin/grc/issues', { ...issueBody, source_kind: 'AUDIT_REQUEST' }, key())).status, 400);
    check('a control-test issue cannot be raised by hand', (await admin.call('/api/v1/admin/grc/issues', { ...issueBody, source_kind: 'CONTROL_TEST', source_id: randomUUID() }, key())).status, 400);
    let issue = await ok(admin.call('/api/v1/admin/grc/issues', issueBody, key()), Issue);
    check('a new issue is open', [issue.state, issue.events.length], ['OPEN', 0]);
    const event = (id: string, who: typeof admin, value: Record<string, unknown>) => who.call(`/api/v1/admin/grc/issues/${id}/events`, { note: 'Recorded in the lifecycle suite.', evidence_reference: null, verification_method: null, control_test_run_id: null, acceptance_expires_at: null, ...value }, key());
    check('an open issue cannot be verified', await codes(event(issue.id, owner, { kind: 'VERIFIED', verification_method: 'INDEPENDENT_REVIEW', evidence_reference: 'Review R-1' })), { status: 409, codes: ['not_allowed_when_open'] });
    check('a remediation must cite evidence', (await event(issue.id, admin, { kind: 'REMEDIATED' })).status, 400);
    issue = await ok(event(issue.id, admin, { kind: 'REMEDIATION_PLANNED' }), Issue);
    issue = await ok(event(issue.id, admin, { kind: 'REMEDIATED', evidence_reference: 'Change ticket CH-11' }), Issue);
    check('remediation is recorded with evidence', issue.state, 'REMEDIATED');
    check('an admin without approval authority cannot verify by review', await codes(event(issue.id, admin, { kind: 'VERIFIED', verification_method: 'INDEPENDENT_REVIEW', evidence_reference: 'Review R-1' })), { status: 409, codes: ['independent_review_needs_an_approver'] });
    check('an independent review cites evidence', await codes(event(issue.id, owner, { kind: 'VERIFIED', verification_method: 'INDEPENDENT_REVIEW' })), { status: 400, codes: ['review_cites_evidence'] });
    issue = await ok(event(issue.id, owner, { kind: 'VERIFIED', verification_method: 'INDEPENDENT_REVIEW', evidence_reference: 'Review R-1' }), Issue);
    check('someone other than the remediator verifies it', [issue.state, issue.events[0]!.actor_id === h.users.owner!.id], ['VERIFIED', true]);
    issue = await ok(event(issue.id, admin, { kind: 'REOPENED' }), Issue);
    check('a verified issue can be reopened and its history kept', [issue.state, issue.events.map(e => e.kind)], ['OPEN', ['REOPENED', 'VERIFIED', 'REMEDIATED', 'REMEDIATION_PLANNED']]);
    const selfVerify = await ok(owner.call('/api/v1/admin/grc/issues', { ...issueBody, title: unique('Self remediated') }, key()), Issue);
    await ok(event(selfVerify.id, owner, { kind: 'REMEDIATED', evidence_reference: 'Change ticket CH-12' }), Issue);
    check('the remediator cannot verify their own remediation', await codes(event(selfVerify.id, owner, { kind: 'VERIFIED', verification_method: 'INDEPENDENT_REVIEW', evidence_reference: 'Review R-2' })), { status: 409, codes: ['remediator_cannot_verify'] });
    check('a remediated issue awaits verification, not risk acceptance', await codes(event(selfVerify.id, owner, { kind: 'RISK_ACCEPTED', acceptance_expires_at: hoursFromNow(24 * 30) })), { status: 409, codes: ['not_allowed_when_remediated'] });
    const acceptance = await ok(admin.call('/api/v1/admin/grc/issues', { ...issueBody, title: unique('Legacy system gap') }, key()), Issue);
    check('the raiser of an issue cannot accept its risk either', await codes(event(acceptance.id, admin, { kind: 'RISK_ACCEPTED', acceptance_expires_at: hoursFromNow(24 * 30) })), { status: 409, codes: ['risk_acceptance_needs_an_approver'] });
    check('a risk acceptance expires in the future', await codes(event(acceptance.id, reviewer, { kind: 'RISK_ACCEPTED', acceptance_expires_at: hoursFromNow(-1) })), { status: 400, codes: ['expiry_is_in_the_future'] });
    const accepted = await ok(event(acceptance.id, reviewer, { kind: 'RISK_ACCEPTED', acceptance_expires_at: hoursFromNow(24 * 30) }), Issue);
    check('an approver other than the raiser accepts the risk until a date', accepted.state, 'RISK_ACCEPTED');
    const overdue = await ok(admin.call('/api/v1/admin/grc/issues', { ...issueBody, title: unique('Overdue item'), due_at: hoursFromNow(-2) }, key()), Issue);
    check('an issue past its due date is overdue', overdue.overdue, true);
    const acceptedList = await all('/api/v1/admin/grc/issues?state=RISK_ACCEPTED', S.schemas.IssueList);
    check('issues filter by derived state', [acceptedList.some(i => i.id === accepted.id), acceptedList.every(i => i.state === 'RISK_ACCEPTED')], [true, true]);

    t.setPhase('control test drift, issue and alert');
    const create = (name: string, check_kind: string, maximum: number, interval = 60) => ok(admin.call('/api/v1/admin/grc/control-tests', { control_id: control.id, name: unique(name), check_kind, maximum_violations: maximum, interval_minutes: interval }, key()), Test);
    const run = (id: string) => ok(admin.call(`/api/v1/admin/grc/control-tests/${id}/runs`, {}, key()), Detail);
    const alertsFor = async (id: string) => (await all('/api/v1/admin/grc/compliance-alerts', S.schemas.ComplianceAlertList)).filter(a => a.test_id === id).map(a => a.kind).sort();
    // The check spans this environment; earlier suites may have left unbound systems, so the limit is set to what is there now.
    const probe = await run((await create('Baseline probe', 'SYSTEMS_HAVE_CONNECTOR_BINDING', 100000)).id);
    const baseline = probe.test.latest_run!.violations!;
    const binding = await create('Systems are bound', 'SYSTEMS_HAVE_CONNECTOR_BINDING', baseline);
    check('a new test has never run', [binding.standing, binding.latest_run], ['NEVER_RUN', null]);
    let d = await run(binding.id);
    check('the control holds while nothing is broken', [d.test.standing, d.test.latest_run!.result, d.test.latest_run!.trigger, d.test.open_issue_id], ['PASSING', 'PASS', 'MANUAL', null]);
    check('a passing first run raises no alert', await alertsFor(binding.id), []);
    const firstPass = d.test.latest_run!;
    const unbound = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: unique('Unbound CRM'), connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
    await t.activity({ condition: 'CONSENT', systems: [unbound.id] });
    d = await run(binding.id);
    check('a deliberately broken control is detected', [d.test.standing, d.test.latest_run!.result, d.test.latest_run!.violations], ['FAILING', 'FAIL', baseline + 1]);
    check('the failure opens an issue linked to the test and control', d.test.open_issue_id !== null, true);
    check('the drift raises one alert', await alertsFor(binding.id), ['DRIFT_TO_FAIL']);
    const issueId = d.test.open_issue_id!;
    let tIssue = await ok(admin.call(`/api/v1/admin/grc/issues/${issueId}`), Issue);
    check('the control-test issue names its source and control', [tIssue.source_kind, tIssue.source_id, tIssue.control_id, tIssue.state, tIssue.severity], ['CONTROL_TEST', binding.id, control.id, 'OPEN', 'MEDIUM']);
    d = await run(binding.id);
    check('a repeated failure keeps the same issue and does not alert again', [d.test.open_issue_id, await alertsFor(binding.id)], [issueId, ['DRIFT_TO_FAIL']]);
    const failingRun = d.test.latest_run!;
    check('the run records identifiers, never record contents', d.runs.every(r => r.sample.every(x => x.length <= 120)), true);
    await ok(event(issueId, admin, { kind: 'REMEDIATED', evidence_reference: 'Binding request BR-3' }), Issue);
    check('a passing run from before the remediation cannot verify it', await codes(event(issueId, owner, { kind: 'VERIFIED', verification_method: 'CONTROL_TEST', control_test_run_id: firstPass.id })), { status: 409, codes: ['run_precedes_the_remediation'] });
    check('a failing run cannot verify it', await codes(event(issueId, owner, { kind: 'VERIFIED', verification_method: 'CONTROL_TEST', control_test_run_id: failingRun.id })), { status: 409, codes: ['run_did_not_pass'] });
    check('a run of an unrelated test cannot verify it', await codes(event(issueId, owner, { kind: 'VERIFIED', verification_method: 'CONTROL_TEST', control_test_run_id: randomUUID() })), { status: 404, codes: ['not_found'] });
    await ok(admin.call('/api/v1/admin/connector-bindings', { system_id: unbound.id, adapter: 'SYNTHETIC_RECORDS_TEST_ADAPTER', system_of_record_for: [], holds_data_categories: [] }, key()), S.schemas.ConnectorBinding);
    d = await run(binding.id);
    check('binding the system restores the control', [d.test.standing, d.test.latest_run!.violations, d.test.open_issue_id], ['PASSING', baseline, null]);
    check('recovery raises one alert', await alertsFor(binding.id), ['DRIFT_TO_FAIL', 'RECOVERED']);
    tIssue = await ok(admin.call(`/api/v1/admin/grc/issues/${issueId}`), Issue);
    check('the passing run after remediation verifies the issue', [tIssue.state, tIssue.events[0]!.verification_method, tIssue.events[0]!.control_test_run_id], ['VERIFIED', 'CONTROL_TEST', d.test.latest_run!.id]);
    const second = await ok(admin.call('/api/v1/admin/systems', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, name: unique('Second unbound CRM'), connector: 'SYNTHETIC_CRM' }, key()), S.schemas.System);
    await t.activity({ condition: 'CONSENT', systems: [second.id] });
    d = await run(binding.id);
    tIssue = await ok(admin.call(`/api/v1/admin/grc/issues/${issueId}`), Issue);
    check('a new failure after verification recurs on the same issue', [d.test.open_issue_id, tIssue.state, tIssue.events[0]!.kind], [issueId, 'OPEN', 'RECURRED']);
    const testIssues = (await all('/api/v1/admin/grc/issues?source_kind=CONTROL_TEST', S.schemas.IssueList)).filter(i => i.source_id === binding.id);
    check('there is still exactly one issue for the test', testIssues.length, 1);
    await ok(admin.call('/api/v1/admin/connector-bindings', { system_id: second.id, adapter: 'SYNTHETIC_RECORDS_TEST_ADAPTER', system_of_record_for: [], holds_data_categories: [] }, key()), S.schemas.ConnectorBinding);
    d = await run(binding.id);
    check('the control passes again once the second system is bound', d.test.standing, 'PASSING');

    t.setPhase('errors are errors');
    const evidence = await create('Evidence is current', 'AUDIT_TRAIL_APPEND_ONLY', 0);
    // Fault injection: withdraw the application's right to run checks, then restore it.
    await db.query('REVOKE EXECUTE ON FUNCTION app.run_control_check(text) FROM orvia_app');
    let errored;
    try { errored = await run(evidence.id); await run(evidence.id); errored = await ok(admin.call(`/api/v1/admin/grc/control-tests/${evidence.id}`), Detail); }
    finally { await db.query('GRANT EXECUTE ON FUNCTION app.run_control_check(text) TO orvia_app'); }
    check('a check that cannot run is recorded as an error, not a pass', [errored.test.standing, errored.test.latest_run!.result, errored.test.latest_run!.violations, errored.test.latest_run!.error_code], ['ERROR', 'ERROR', null, 'SQLSTATE_42501']);
    check('an error alerts once and opens no issue', [await alertsFor(evidence.id), errored.test.open_issue_id], [['ERROR'], null]);
    d = await run(evidence.id);
    check('once the check can run again the audit trail is confirmed append-only', [d.test.standing, d.test.latest_run!.violations], ['PASSING', 0]);

    t.setPhase('disabled tests and the scheduled runner');
    const off = await ok(admin.call(`/api/v1/admin/grc/control-tests/${evidence.id}/enabled`, { enabled: false }, key()), Test);
    check('a disabled test says so and cannot be run', [off.standing, (await admin.call(`/api/v1/admin/grc/control-tests/${evidence.id}/runs`, {}, key())).status], ['DISABLED', 409]);
    const scheduled = await create('Row security is forced', 'FORCED_ROW_SECURITY', 0);
    const reports = await runner.once();
    const report = reports.find(r => r.scope === s.environment_id)!;
    check('the operations runner ran the due test without compliance errors', [report.control_tests_run >= 1, report.errors.filter(e => e.startsWith('control test') || e.startsWith('assessment finding'))], [true, []]);
    const scheduledDetail = await ok(admin.call(`/api/v1/admin/grc/control-tests/${scheduled.id}`), Detail);
    check('the scheduled run is the worker\'s, and every application table forces row security', [scheduledDetail.test.latest_run!.trigger, scheduledDetail.test.latest_run!.result, scheduledDetail.test.latest_run!.actor_id !== h.users.admin!.id], ['SCHEDULE', 'PASS', true]);
    check('a disabled test is not run by the schedule', (await ok(admin.call(`/api/v1/admin/grc/control-tests/${evidence.id}`), Detail)).runs.length, 3);
    let escalated = await ok(admin.call(`/api/v1/admin/grc/issues/${overdue.id}`), Issue);
    check('the runner escalated the overdue issue', escalated.events.filter(e => e.kind === 'ESCALATED').length, 1);
    await runner.once();
    await ok(admin.call('/api/v1/admin/grc/control-tests/sweep', {}, key()), S.schemas.ControlTestSweep);
    escalated = await ok(admin.call(`/api/v1/admin/grc/issues/${overdue.id}`), Issue);
    check('an overdue issue is escalated once per due date, however often the sweep runs', escalated.events.filter(e => e.kind === 'ESCALATED').length, 1);
    const verifiedEscalation = await ok(admin.call(`/api/v1/admin/grc/issues/${issueId}`), Issue);
    check('an issue within its due date is not escalated', verifiedEscalation.events.some(e => e.kind === 'ESCALATED'), false);

    t.setPhase('auditor report');
    const report2 = await ok(auditor.call('/api/v1/admin/grc/compliance-report'), S.schemas.ComplianceReport);
    const row = report2.controls.find(c => c.control_id === control.id)!;
    check('the report maps the control to its requirement and lists its tests with standing', [row.requirements.some(r => r.endsWith(code)), row.tests.find(x => x.test_id === binding.id)?.standing, row.tests.find(x => x.test_id === evidence.id)?.standing], [true, 'PASSING', 'DISABLED']);
    const fw = report2.frameworks.find(f => f.framework_id === framework.id)!;
    check('the report counts mapped and unmapped requirements', [fw.requirements_mapped, fw.requirements, fw.unmapped_codes.includes(code)], [1, framework.requirements.length, false]);
    check('the report counts open and overdue issues and published policies', [report2.summary.open_issues >= 2, report2.summary.overdue_issues >= 1, report2.summary.policies_published >= 1], [true, true, true]);
    check('the report states its limits', report2.limits.length, 2);
    check('an auditor can read tests and alerts', [(await auditor.call('/api/v1/admin/grc/control-tests?limit=10')).status, (await auditor.call('/api/v1/admin/grc/compliance-alerts?limit=10')).status], [200, 200]);
    check('an auditor cannot create, run or sweep tests', [(await auditor.call('/api/v1/admin/grc/control-tests', { control_id: control.id, name: 'Auditor test', check_kind: 'FORCED_ROW_SECURITY', maximum_violations: 0, interval_minutes: 60 }, key())).status,
      (await auditor.call(`/api/v1/admin/grc/control-tests/${binding.id}/runs`, {}, key())).status, (await auditor.call('/api/v1/admin/grc/control-tests/sweep', {}, key())).status], [403, 403, 403]);
    check('an auditor cannot raise or change issues', [(await auditor.call('/api/v1/admin/grc/issues', issueBody, key())).status, (await event(issue.id, auditor, { kind: 'REMEDIATION_PLANNED' })).status], [403, 403]);
    check('the package the framework came from is the one in force', framework.source_reference.includes(pkg.version), true);

    t.setPhase('isolation and history');
    check('another tenant cannot read the issue, test or policy', [(await birch.call(`/api/v1/admin/grc/issues/${issueId}`)).status, (await birch.call(`/api/v1/admin/grc/control-tests/${binding.id}`)).status,
      (await birch.call('/api/v1/admin/grc/policies?limit=100')).status === 200 && !(await ok(birch.call('/api/v1/admin/grc/policies?limit=100'), S.schemas.GrcPolicyList)).items.some(p => p.id === v1.id)], [404, 404, true]);
    const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((e: { code?: string }) => e.code ?? 'rejected');
    check('a published policy cannot be rewritten at the database', await direct(`UPDATE app.grc_policies SET body='Rewritten body of the policy text.' WHERE id=$1`, [v2.id]), '23514');
    check('a retired policy cannot be republished at the database', await direct(`UPDATE app.grc_policies SET status='PUBLISHED' WHERE id=$1`, [v1.id]), '23514');
    check('an issue event cannot be edited at the database', await direct(`UPDATE app.grc_issue_events SET note='Changed' WHERE issue_id=$1`, [issueId]), '23514');
    check('a control test run cannot be deleted at the database', await direct(`DELETE FROM app.control_test_runs WHERE test_id=$1`, [binding.id]), '23514');
    check('a control test cannot change what it checks at the database', await direct(`UPDATE app.control_tests SET maximum_violations=100000 WHERE id=$1`, [binding.id]), '23514');
    check('an alert cannot be removed at the database', await direct(`DELETE FROM app.compliance_alerts WHERE test_id=$1`, [binding.id]), '23514');
    const asRole = async (role: string, capabilities: string[], actor: string, sql: string, values: unknown[]) => {
      const client = await db.connect();
      try {
        await client.query('BEGIN'); await client.query(`SET LOCAL ROLE ${role}`);
        for (const [k, v] of Object.entries({ 'orvia.tenant_id': s.tenant_id, 'orvia.legal_entity_id': s.legal_entity_id, 'orvia.environment_id': s.environment_id, 'orvia.actor_domain': 'STAFF', 'orvia.actor_id': actor, 'orvia.capabilities': capabilities.join(',') }))
          await client.query('SELECT set_config($1,$2,true)', [k, v]);
        await client.query(sql, values); return 'accepted';
      } catch (e) { return (e as { code?: string }).code ?? 'rejected'; } finally { await client.query('ROLLBACK').catch(() => {}); client.release(); }
    };
    const readOnly = ['grc.read'];
    check('a reader cannot insert an issue at the database', await asRole('orvia_app', readOnly, h.users.auditor!.id, `INSERT INTO app.grc_issues(tenant_id,legal_entity_id,environment_id,id,source_kind,title,severity,owner_reference,due_at,created_by) VALUES($1,$2,$3,$4,'MANUAL','Forged','LOW','x',now(),$5)`,
      [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID(), h.users.auditor!.id]), '42501');
    check('a reader cannot acknowledge for someone else at the database', await asRole('orvia_app', readOnly, h.users.auditor!.id, `INSERT INTO app.grc_policy_acknowledgements(tenant_id,legal_entity_id,environment_id,id,policy_id,actor_id) VALUES($1,$2,$3,$4,$5,$6)`,
      [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID(), v2.id, h.users.admin!.id]), '42501');
    check('a reader cannot run a control check at the database', await asRole('orvia_app', readOnly, h.users.auditor!.id, `SELECT app.run_control_check('FORCED_ROW_SECURITY')`, []), '42501');
  } finally { await runner.close(); }
});
