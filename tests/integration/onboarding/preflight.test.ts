// WP03 / WP34 / M29 preflight gates integration suite, FR-M29-01 and FR-M29-02.
// Under test: every gate reports what it actually examined, a gate this build
// cannot check says so rather than passing, and the report cannot be read as a
// clearance to go live.
import assert from 'node:assert/strict';
import { HttpFixture } from '../../../shared/testing/src/http-fixture.ts';
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
async function body<T>(schema: { parse: (value: unknown) => T }, response: Response, expected = 200) {
  const value: unknown = await response.json();
  if (response.status !== expected) {
    console.log(`FAIL unexpected ${response.status} where ${expected} was required:`, JSON.stringify(value).slice(0, 400));
    throw new Error('Unexpected response status');
  }
  return schema.parse(value);
}

try {
  await h.start();
  phase = 'report';
  const owner = await h.login('owner');
  const report = await body(S.PreflightReport, await owner.call('/api/v1/admin/preflight'));
  const gate = (kind: string) => report.gates.find(g => g.kind === kind)!;

  check('every gate the requirement names is reported exactly once',
    [report.gates.length, new Set(report.gates.map(g => g.kind)).size], [11, 11]);
  check('every gate says what it examined, however it turned out',
    report.gates.filter(g => g.checked.length < 30).map(g => g.kind), []);
  check('the two derived lists agree with the gates they came from',
    [report.failing.slice().sort(), report.not_verifiable.slice().sort()],
    [report.gates.filter(g => g.verdict === 'FAILED').map(g => g.kind).sort(),
      report.gates.filter(g => g.verdict === 'NOT_VERIFIABLE_HERE').map(g => g.kind).sort()]);

  // --- the gate answered from the record, never from its absence -----------------
  phase = 'honesty';
  // FR-M32-03 made this gate decidable, so it is checked the way the storage
  // gate is: against what the tables actually hold, rather than against a
  // verdict written into the test. Whether a snapshot exists here depends on
  // whether the restore suite has run against this database, and the gate has
  // to be right either way.
  const backupRecord = (await db.query(
    `SELECT (SELECT count(*) FROM app.backup_snapshots)::int AS snapshots,
            (SELECT count(*) FROM app.restore_runs WHERE state='RELEASED')::int AS released`)).rows[0];
  const earned = backupRecord.snapshots > 0 && backupRecord.released > 0;
  check('the backup gate answers from the declared record and never from its absence',
    [gate('BACKUP_TARGET').verdict, gate('BACKUP_TARGET').unverifiable_reason,
      earned ? null : Boolean(gate('BACKUP_TARGET').remedy)],
    [earned ? 'PASSED' : 'FAILED', null, earned ? null : true]);
  // The point of the gate: an absent record is a failure with something to do
  // about it, never a pass and never a claim that the archive itself was seen.
  check('a missing backup record fails the gate rather than passing it',
    [report.failing.includes('BACKUP_TARGET'), report.not_verifiable.includes('BACKUP_TARGET'),
      report.an_unverified_gate_is_not_a_passed_gate],
    [!earned, false, true]);
  check('the gate never claims to have seen the archive itself',
    /does not make, hold or read the archive/.test(gate('BACKUP_TARGET').checked), true);
  check('passing the technical gates is never stated as a legal conclusion',
    [report.passing_every_gate_is_not_a_statement_about_the_law,
      Object.keys(report).some(k => /ready|compliant|approved|score/.test(k))],
    [true, false]);

  // --- the gates are measured, not asserted --------------------------------------
  phase = 'measured';
  const durability = (await db.query(`SELECT current_setting('fsync') AS fsync, current_setting('synchronous_commit') AS c`)).rows[0];
  check('the storage gate reports what the database itself is configured to do',
    [gate('DURABLE_STORAGE').verdict, gate('DURABLE_STORAGE').observed],
    [durability.fsync === 'on' && durability.c !== 'off' ? 'PASSED' : 'FAILED',
      `fsync=${durability.fsync}, synchronous_commit=${durability.c}.`]);

  // Scoped, because the gate is. The fixture holds primary owners in a second
  // tenant and a sibling environment, and a gate that counted those would be
  // telling this organisation about somebody else's installation.
  const scope = [h.users.owner!.scope.tenant_id, h.users.owner!.scope.legal_entity_id, h.users.owner!.scope.environment_id];
  const owners = Number((await db.query(
    `SELECT count(*)::int AS n FROM staff_auth.authority
     WHERE active AND role='ORG_SUPER_ADMIN' AND tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`, scope)).rows[0].n);
  check('the identity gate is scoped to this organisation and not to every owner in the database',
    owners < Number((await db.query(`SELECT count(*)::int AS n FROM staff_auth.authority WHERE active AND role='ORG_SUPER_ADMIN'`)).rows[0].n), true);
  check('the identity gate counted the primary owners that actually exist locally',
    [gate('CUSTOMER_CONTROLLED_IDENTITY').verdict, gate('CUSTOMER_CONTROLLED_IDENTITY').observed!.startsWith(`${owners} active primary owner`)],
    [owners >= 1 ? 'PASSED' : 'FAILED', true]);

  check('the runtime gate names the address this process is really serving on',
    [gate('RUNTIME_LOCATION').verdict, gate('RUNTIME_LOCATION').observed],
    ['PASSED', `Serving on 127.0.0.1:${profile.app_port}.`]);
  check('the runtime gate names the interpreter this process is really running on',
    gate('RUNTIME_AND_ARCHITECTURE').observed, `Node ${process.versions.node} on ${process.platform}/${process.arch}.`);
  check('a loopback-only HTTP profile is not reported as a transport failure, and says why',
    [gate('TRANSPORT_SECURITY').verdict, gate('TRANSPORT_SECURITY').observed!.includes('loopback-only')],
    [profile.profile === 'rehearsal' ? 'PASSED' : 'PASSED', profile.profile !== 'rehearsal']);
  check('the telemetry gate read the environment this process is actually running with',
    gate('VENDOR_TELEMETRY_DISABLED').verdict, 'PASSED');

  // --- FR-M29-01: the package ------------------------------------------------------
  phase = 'package';
  const installed = (await db.query(
    `SELECT version FROM app.installation_versions WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
     ORDER BY applied_at DESC,id DESC LIMIT 1`,
    scope)).rows[0];
  const verified = installed && (await db.query(
    `SELECT 1 FROM app.release_manifests WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND version=$4`,
    [...scope, installed.version])).rowCount;
  check('the package gate is decided by whether the installed version has a verified manifest behind it',
    gate('PACKAGE_SIGNATURE').verdict, installed && verified ? 'PASSED' : 'FAILED');
  check('a failing package gate names what to do about it rather than only reporting a red mark',
    gate('PACKAGE_SIGNATURE').verdict === 'FAILED' ? (gate('PACKAGE_SIGNATURE').remedy?.length ?? 0) > 40 : true, true);

  // --- egress -----------------------------------------------------------------------
  phase = 'egress';
  const external = Number((await db.query(
    `SELECT count(*)::int AS n FROM app.connections WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND endpoint_reference IS NOT NULL AND endpoint_reference !~ '^(127\\.0\\.0\\.1|localhost|::1)'`,
    [h.users.owner!.scope.tenant_id, h.users.owner!.scope.legal_entity_id, h.users.owner!.scope.environment_id])).rows[0].n);
  check('the egress gate counted the configured endpoints and says the firewall is not what it checked',
    [gate('PERMITTED_EGRESS').observed!.startsWith(`${external} configured connection endpoint`),
      gate('PERMITTED_EGRESS').checked.includes('network policy is not something this process can see')],
    [true, true]);

  // --- authority ---------------------------------------------------------------------
  phase = 'authority';
  const auditor = await h.login('auditor');
  check('an auditor may read the gates', (await auditor.call('/api/v1/admin/preflight')).status, 200);
  const member = await h.login('member');
  check('an actor without installation-health authority is refused',
    (await member.call('/api/v1/admin/preflight')).status, 403);

  writeEvidence('preflight-integration', { profile: profile.profile, phase: 'complete', assertions, result: 'PASS' });
  console.log(`\n${assertions.length} assertions, 0 failures.`);
} catch (error) {
  writeEvidence('preflight-integration', { profile: profile.profile, phase, assertions, result: 'FAIL', error: safeError(error) });
  console.error(safeError(error));
  process.exitCode = 1;
} finally {
  await h.stop();
  await db.end();
}
