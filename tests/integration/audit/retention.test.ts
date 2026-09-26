// M33 purpose-based audit retention integration suite (FR-M33-04).
// Under test: the trail is kept for stated purposes with periods somebody
// configured and justified, the absence of a payload is measured rather than
// promised, and an elapsed period is reported rather than acted on — because a
// product that deleted its own audit trail on a timer is the failure the
// append-only trigger exists to prevent.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../shared/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../shared/testing/src/evidence.ts';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import * as S from '../../../shared/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');
const db = connectDatabase(profile).pool;
const assertions: { name: string; result: 'PASS' | 'FAIL'; expected: unknown; actual: unknown }[] = [];
let phase = 'setup';
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); assertions.push({ name, result: 'PASS', expected, actual }); console.log('PASS ' + name); }
  catch { assertions.push({ name, result: 'FAIL', expected, actual }); console.log('FAIL ' + name, { expected, actual }); throw new Error('Assertion failed: ' + name); }
}
const clients = new Map<string, ReturnType<HttpFixture['browser']>>();
const login = h.login.bind(h);
h.login = async name => { let browser = clients.get(name); if (!browser) { browser = await login(name); clients.set(name, browser); } return browser; };
const key = () => ({ 'idempotency-key': randomUUID() });
const fieldCodes = async (response: Response) =>
  ((await response.json()) as { error: { field_errors?: { code: string }[] } }).error.field_errors?.map(e => e.code) ?? [];
const direct = (sql: string, values: unknown[] = []) =>
  db.query(sql, values).then(() => 'accepted').catch((error: { code?: string }) => error.code ?? 'rejected');

try {
  await h.start();
  phase = 'scenario';
  // The scenario publishes a policy, which records a POLICY_PUBLICATION event,
  // so the trail has something in it before anything is asserted about it.
  await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const owner = await h.login('owner');
  const scope = [h.users.owner!.scope.tenant_id, h.users.owner!.scope.legal_entity_id, h.users.owner!.scope.environment_id];

  const retention = async (as = owner) => {
    const response = await as.call('/api/v1/admin/audit-retention');
    if (response.status !== 200) throw new Error(`Audit retention answered ${response.status}`);
    return S.AuditRetentionReport.parse(await response.json());
  };
  const line = (r: S.AuditRetentionReportValue, purpose: string) => r.lines.find(l => l.purpose === purpose)!;

  // --- payload minimisation is measured, not claimed ----------------------------
  phase = 'no payload';
  const report = await retention();
  // The product's own count, and the same question asked directly of the
  // database. A report that counted its own way could be made to say anything.
  const columns = (await db.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='app' AND table_name='audit_events' ORDER BY column_name`)).rows
    .map(row => row.column_name as string);
  check('the product counts zero payload columns on the audit table', report.payload_columns_found, 0);
  check('and the audit table really is an envelope and nothing else',
    columns, ['actor_domain', 'actor_id', 'created_at', 'environment_id', 'id', 'legal_entity_id', 'operation', 'request_id', 'resource_id', 'tenant_id']);
  check('so there is no payload whose justified deletion an envelope would have to survive',
    report.payload_is_not_recorded_so_none_can_be_deleted, true);

  // --- every category is kept for exactly one stated purpose ---------------------
  phase = 'purpose-based';
  const covered = report.lines.flatMap(l => l.categories).sort();
  check('all eight audited categories are retained under exactly one purpose each',
    [covered, new Set(covered).size], [[...S.AuditCategory.options].sort(), 8]);
  check('and each of the four purposes is reported once',
    report.lines.map(l => l.purpose).sort(), [...S.AuditRetentionPurpose.options].sort());

  // --- no period ships ------------------------------------------------------------
  phase = 'nothing is assumed';
  const existing = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.audit_retention_rules WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND purpose='CHANGE_TRACEABILITY'`, scope)).rows[0].n);
  if (existing === 0) {
    check('a purpose nobody has configured reports that, rather than a default number',
      [line(report, 'CHANGE_TRACEABILITY').rule, line(report, 'CHANGE_TRACEABILITY').period_is_not_configured_here,
        line(report, 'CHANGE_TRACEABILITY').beyond_period], [null, true, 0]);
  }
  const bare = await owner.call('/api/v1/admin/audit-retention-rules',
    { purpose: 'REGULATORY_ACCOUNTABILITY', days: 365, source_reference: 'because' }, key());
  check('a period cannot be recorded without saying what it rests on', bare.status, 400);
  check('and the refusal names the field rather than failing bare',
    (await fieldCodes(bare)).length > 0, true);

  // --- configuring a period, and what that changes -------------------------------
  phase = 'configured';
  const recorded = await owner.call('/api/v1/admin/audit-retention-rules',
    { purpose: 'REGULATORY_ACCOUNTABILITY', days: 3650,
      source_reference: 'Reviewed accountability window agreed with the organisation’s privacy reviewer, recorded for this environment.' }, key());
  const rule = S.AuditRetentionRule.parse(await recorded.json());
  check('recording a period is accepted and attributed',
    [recorded.status, rule.days, rule.recorded_by.length], [201, 3650, 36]);
  const afterRule = await retention();
  check('the purpose now reports its period and stops saying it has none',
    [line(afterRule, 'REGULATORY_ACCOUNTABILITY').rule?.days,
      line(afterRule, 'REGULATORY_ACCOUNTABILITY').period_is_not_configured_here], [3650, false]);
  check('nothing recorded moments ago is beyond a ten-year period',
    line(afterRule, 'REGULATORY_ACCOUNTABILITY').beyond_period, 0);

  // A short period makes the same events overdue. This is the check that the
  // count is measured against the rule rather than returned as a constant.
  const short = await owner.call('/api/v1/admin/audit-retention-rules',
    { purpose: 'REGULATORY_ACCOUNTABILITY', days: 1,
      source_reference: 'Deliberately short window recorded by this suite to prove the overdue count is measured against the configured period.' }, key());
  check('a second rule for the same purpose is recorded rather than refused', short.status, 201);
  const afterShort = await retention();
  const held = line(afterShort, 'REGULATORY_ACCOUNTABILITY').events_held;
  check('the newest rule is the one in force', line(afterShort, 'REGULATORY_ACCOUNTABILITY').rule?.days, 1);
  check('and the overdue count is measured against it rather than reported as a constant',
    [line(afterShort, 'REGULATORY_ACCOUNTABILITY').beyond_period,
      line(afterShort, 'REGULATORY_ACCOUNTABILITY').beyond_period <= held],
    [Number((await db.query(
      `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND operation = ANY($4) AND created_at < now() - interval '1 day'`,
      [...scope, ['policy.publish', 'publish_policy', 'policy.reauthenticate', 'reauthenticate_policy',
        'evidence.export', 'export'].flatMap(name => [name, `${name}.replayed`])])).rows[0].n), true]);
  // Shortening a period is exactly the change somebody would make to clear a
  // backlog, so the period it replaced has to stay visible.
  check('the period that was replaced is still on the record',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.audit_retention_rules WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
        AND purpose='REGULATORY_ACCOUNTABILITY' AND days=3650`, scope)).rows[0].n) > 0, true);
  check('and a recorded rule cannot be edited or removed, even by the migrator',
    [await direct(`UPDATE app.audit_retention_rules SET days=1 WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope),
      await direct(`DELETE FROM app.audit_retention_rules WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)],
    ['23514', '23514']);

  // --- an elapsed period is not authority to delete ------------------------------
  phase = 'nothing is deleted';
  const before = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n);
  await retention();
  await retention();
  check('reading the schedule never removes anything, however overdue the events are',
    Number((await db.query(
      `SELECT count(*)::int AS n FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n) >= before,
    true);
  // The oldest event in scope is targeted rather than events older than a day:
  // on an installation younger than a day that filter matched no row, the row
  // trigger never fired, and an empty DELETE was reported as accepted.
  check('and the trail refuses deletion at the database, past its period or not',
    await direct(`DELETE FROM app.audit_events WHERE id=(SELECT id FROM app.audit_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      ORDER BY created_at LIMIT 1)`, scope), '23514');
  check('the report says so structurally rather than only in prose',
    afterShort.envelopes_are_never_deleted_by_this_product, true);

  // --- tested backup handling -----------------------------------------------------
  phase = 'the archive is out of reach';
  const snapshots = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.backup_snapshots WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND 'EVIDENCE' = ANY(covers)`, scope)).rows[0].n);
  const withSnapshots = await retention();
  check('the report counts the declared snapshots that cover the trail',
    withSnapshots.snapshots_covering_evidence, snapshots);
  check('and states that nothing it describes reaches a copy held in one',
    withSnapshots.a_declared_snapshot_is_not_reached_by_anything_here, true);

  // --- authority ---------------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor holding audit.read may read the schedule',
    (await auditor.call('/api/v1/admin/audit-retention')).status, 200);
  check('but may not set a period, which is audit administration',
    (await auditor.call('/api/v1/admin/audit-retention-rules',
      { purpose: 'COMMERCIAL_OBLIGATION', days: 90, source_reference: 'An auditor should not be able to record this at all.' }, key())).status, 403);
  const member = await h.login('member');
  check('a member may not read the schedule', (await member.call('/api/v1/admin/audit-retention')).status, 403);

  writeEvidence('audit-retention-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('audit-retention-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
