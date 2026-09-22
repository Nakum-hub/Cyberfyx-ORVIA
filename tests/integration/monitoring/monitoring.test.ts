// M32 Monitoring integration suite (FR-M32-01, FR-M32-02).
// Under test: three readiness verdicts that never merge, a business readiness
// answer that differs from liveness when it should, and seven signals of which
// the two this build cannot measure say so rather than reporting zero.
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { HttpFixture } from '../../../packages/testing/src/http-fixture.ts';
import { createMarketingScenario } from '../../../packages/testing/src/scenario.ts';
import { writeEvidence, safeError } from '../../../packages/testing/src/evidence.ts';
import { connectDatabase } from '../../../packages/db/src/index.ts';
import { loadProfile } from '../../../packages/testing/src/config.ts';
import * as S from '../../../packages/contracts/src/index.ts';

const h = new HttpFixture();
const profile = loadProfile();
if (!['codex-a00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/rehearsal permitted');
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

try {
  await h.start();
  phase = 'scenario';
  const scenario = await createMarketingScenario(h, 'SYNTHETIC_CRM');
  const staff = scenario.author;
  const scope = [scenario.scope.tenant_id, scenario.scope.legal_entity_id, scenario.scope.environment_id];

  const readiness = async (as = staff) => {
    const response = await as.call('/api/v1/admin/readiness');
    if (response.status !== 200) throw new Error(`Readiness answered ${response.status}`);
    return S.OperationalReadiness.parse(await response.json());
  };
  const fact = (r: Awaited<ReturnType<typeof readiness>>, kind: string) => r.facts.find(f => f.kind === kind)!;
  const signal = (r: Awaited<ReturnType<typeof readiness>>, name: string) => r.signals.find(s => s.signal === name)!;

  // --- FR-M32-01: three questions, three answers -------------------------------
  phase = 'readiness facts';
  const report = await readiness();
  check('three readiness kinds are reported, each exactly once',
    report.facts.map(f => f.kind), ['LIVENESS', 'DEPENDENCY_READINESS', 'BUSINESS_READINESS']);
  check('the report refuses to reduce itself to one status',
    [report.combined_status_is_not_reported, report.uptime_is_not_evidence_of_correct_operation], [true, true]);
  check('liveness is established and says what it does not cover',
    [fact(report, 'LIVENESS').verdict, fact(report, 'LIVENESS').covers.includes('says nothing about')], ['READY', true]);
  check('dependency readiness is established by having done real work, not by a probe',
    [fact(report, 'DEPENDENCY_READINESS').verdict, fact(report, 'DEPENDENCY_READINESS').covers.includes('rather than by a separate probe')], ['READY', true]);
  // The marketing scenario publishes a policy and configures a system, so this
  // installation can carry a decision through and the report should say so.
  check('business readiness is established once a policy is published and a system can restrict',
    [fact(report, 'BUSINESS_READINESS').verdict, fact(report, 'BUSINESS_READINESS').blocking], ['READY', []]);

  // --- the condition this page exists to catch ---------------------------------
  // An installation that is live, whose dependencies answer, and that cannot
  // carry out a single privacy decision. Every probe an uptime monitor makes
  // still passes; only business readiness changes.
  phase = 'live but unable';
  const checks = await db.query(
    `SELECT id,supports_restrict FROM app.system_checks WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND supports_restrict`, scope);
  check('the scenario recorded at least one system able to restrict', checks.rowCount! > 0, true);
  await db.query(`UPDATE app.system_checks SET supports_restrict=false WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope);
  try {
    const degraded = await readiness();
    check('liveness and dependency readiness are unchanged when the product cannot act',
      [fact(degraded, 'LIVENESS').verdict, fact(degraded, 'DEPENDENCY_READINESS').verdict], ['READY', 'READY']);
    check('business readiness alone reports that no decision could be carried out',
      fact(degraded, 'BUSINESS_READINESS').verdict, 'NOT_READY');
    check('and it names what is blocking rather than merely refusing',
      fact(degraded, 'BUSINESS_READINESS').blocking.some(reason => reason.includes('able to restrict')), true);
    check('there is still no combined status to mislead a reader',
      Object.keys(degraded).includes('status'), false);
  } finally {
    // Restore exactly what was changed. The rows are the fixture's own.
    for (const row of checks.rows) {
      await db.query(`UPDATE app.system_checks SET supports_restrict=true WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4`, [...scope, row.id]);
    }
  }
  const restored = await readiness();
  check('the verdict returns once the installation can act again', fact(restored, 'BUSINESS_READINESS').verdict, 'READY');

  // --- FR-M32-02: signals, measured or explicitly not --------------------------
  phase = 'signals';
  check('all seven signals are reported, each exactly once',
    restored.signals.map(s => s.signal).sort(), [...S.OperationalSignalName.options].sort());
  check('every signal says what it counted', restored.signals.every(s => s.counted.length > 20), true);
  // The signal this build still cannot produce says so rather than reporting a
  // comfortable zero, which is the fault an operator would act on.
  check('the signal this build cannot produce says so rather than reporting zero',
    [signal(restored, 'CONNECTOR_LIMIT_HEADROOM').measured, signal(restored, 'CONNECTOR_LIMIT_HEADROOM').value,
      signal(restored, 'CONNECTOR_LIMIT_HEADROOM').unit], [false, null, null]);
  check('and it names why, in terms of the product rather than a transient fault',
    signal(restored, 'CONNECTOR_LIMIT_HEADROOM').unavailable_reason!.includes('No connector load budget'), true);
  // Backup status joined the measured set when FR-M32-03 gave this installation
  // a record of declared snapshots. Which branch applies depends on whether a
  // snapshot has ever been declared here, so it is checked against the record
  // rather than against a verdict written into this test.
  const declaredSnapshots = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.backup_snapshots WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n);
  const backupStatus = signal(restored, 'BACKUP_STATUS');
  check('backup status reports the declared record, and its absence is never a zero',
    [backupStatus.measured, backupStatus.value === null, backupStatus.unit],
    [declaredSnapshots > 0, declaredSnapshots === 0, declaredSnapshots > 0 ? 'SECONDS' : null]);
  check('whichever branch applies, it says what it is and is not evidence of',
    declaredSnapshots > 0
      ? backupStatus.counted.includes('not evidence that the archive exists')
      : backupStatus.unavailable_reason!.includes('is the absence of any record'), true);
  check('the measured signals carry a unit and a value',
    restored.signals.filter(s => s.measured).every(s => s.unit !== null && s.value !== null), true);
  const storage = signal(restored, 'STORAGE_FOOTPRINT');
  check('the database size is a real figure, not a placeholder', [storage.unit, storage.value! > 1_000_000], ['BYTES', true]);
  check('the storage figure says it is not a per-tenant number', storage.counted.includes('not a per-tenant'), true);

  phase = 'signals track real state';
  // A withdrawal creates real work, so the queue depth and the unresolved work
  // signals have to be reading live tables rather than returning constants.
  const before = signal(restored, 'QUEUE_DEPTH').value!;
  await scenario.change('grant');
  await scenario.change('withdraw');
  const after = await readiness();
  const pending = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.outbox_events WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND dispatched_at IS NULL`, scope)).rows[0].n);
  check('the queue depth is read from the outbox rather than reported as a constant',
    [signal(after, 'QUEUE_DEPTH').value, signal(after, 'QUEUE_DEPTH').value === before && pending === before],
    [pending, signal(after, 'QUEUE_DEPTH').value === before && pending === before]);
  check('the report is evaluated at read time, not stored', after.as_of > restored.as_of, true);

  // --- minimisation is a property of what is selected --------------------------
  phase = 'minimisation';
  const body = JSON.stringify(after);
  for (const [what, value] of [
    ['a data principal', h.users.alice!.principal_id!], ['a staff member', h.users.owner!.email],
    ['the tenant', scenario.scope.tenant_id], ['a purpose', scenario.purpose.id], ['a system', scenario.system.id],
  ] as const) check(`the readiness report does not contain ${what}`, body.includes(String(value)), false);
  check('and it carries no free-text operational field the schema did not declare',
    Object.keys(after).sort(),
    ['as_of', 'combined_status_is_not_reported', 'facts', 'limits', 'profile', 'signals', 'uptime_is_not_evidence_of_correct_operation']);

  // --- authority ------------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor holding health.read may read operational readiness',
    (await auditor.call('/api/v1/admin/readiness')).status, 200);
  const member = await h.login('member');
  check('a member without the capability is refused', (await member.call('/api/v1/admin/readiness')).status, 403);
  check('the readiness route is a read and accepts no body',
    (await staff.call('/api/v1/admin/readiness', { anything: true }, key())).status, 404);

  writeEvidence('monitoring-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('monitoring-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
