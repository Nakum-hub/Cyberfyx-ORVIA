// Serial synthetic-only qualification; extra services exist only for their dependent suite.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, createWriteStream, existsSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:net';
import { createRequire } from 'node:module';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';

const [label, expectedHead, expectedBuild] = process.argv.slice(2);
const mode = 'grc-unexecuted-suite';
assert.equal(process.argv.length, 5, 'Pass only fresh label, frozen HEAD and BUILD_ID');
assert.equal(process.env.ORVIA_GRC_OPA_PORT, '58281', 'Use the separately owned fixed GRC port');
assert.equal(createHash('sha256').update(readFileSync('handoffs/codex/round8-integrations.mjs')).digest('hex'), '7a7f20aca86824b34017db055de842ccc1ba6e9c6c43fca085e1ae522e545a66', 'Original runner changed; review completion logic again');
assert.match(label ?? '', /^[a-z0-9-]+$/);
assert.match(expectedHead ?? '', /^[a-f0-9]{40}$/);
assert.ok(expectedBuild && /^[A-Za-z0-9_-]+$/.test(expectedBuild), 'Pass the frozen Next BUILD_ID');
assert.equal(process.version, 'v24.21.0', 'Run with the repository pinned Node');
assert.equal(resolve(process.cwd()), resolve(fileURLToPath(new URL('../../', import.meta.url))), 'Run from the Round 8 worktree');
function git(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', windowsHide: true });
  assert.equal(result.status, 0, 'Git read failed');
  return result.stdout.trim();
}
function frozen() {
  assert.equal(git(['rev-parse', 'HEAD']), expectedHead, 'Candidate HEAD changed');
  assert.equal(readFileSync('frontend/.next/BUILD_ID', 'utf8').trim(), expectedBuild, 'Candidate build changed');
}
frozen();
const originalPath = 'handoffs/codex/artifacts/R8-frozen-iota-integrations.json';
assert.ok(existsSync(originalPath), 'Original battery must finish normally first');
const original = JSON.parse(readFileSync(originalPath, 'utf8'));
assert.equal(original.commit, expectedHead);
assert.equal(original.build, expectedBuild);
assert.equal(original.mode, 'all');
assert.equal(original.results.length, 44, 'Original full battery must have all 44 outcomes');
assert.equal(new Set(original.results.map(r => r.suite)).size, 44);
const originalLedger = readFileSync('handoffs/codex/artifacts/R8-frozen-iota-integrations.jsonl', 'utf8').trim().split(/\r?\n/).map(line => JSON.parse(line));
assert.deepEqual(originalLedger, original.results, 'Original summary and ledger differ');
const missing = original.results.filter(r => r.exit_code === null);
assert.equal(missing.length, 1, 'Only the original GRC prerequisite refusal may lack a suite exit');
assert.equal(missing[0].suite, 'tests/integration/grc/http.test.ts');
assert.equal(missing[0].status, 'FAIL');
assert.equal(missing[0].prerequisite_error, 'Set an independently owned ORVIA_GRC_OPA_PORT');
assert.equal(missing[0].signal, null);
assert.equal(missing[0].spawn_error, undefined);
assert.equal(missing[0].cleanup_error, undefined);
for (const r of original.results) {
  assert.equal(r.commit, expectedHead); assert.equal(r.build, expectedBuild);
  if (r !== missing[0]) { assert.ok(['PASS', 'FAIL'].includes(r.status)); assert.ok(Number.isInteger(r.exit_code)); assert.equal(r.signal, null); } 
}
const refusalLog = readFileSync(missing[0].log, 'utf8');
assert.ok(refusalLog.includes('Dependency setup failed: Set an independently owned ORVIA_GRC_OPA_PORT'));
assert.ok(!/^PASS |^FAIL |^Artifact:|assertions, /m.test(refusalLog), 'Original business fixture must not have dispatched');
const original_failed_context = original.results.filter(r => r.status === 'FAIL').map(r => ({ suite: r.suite, status: r.status, exit_code: r.exit_code, prerequisite_refused: !!r.prerequisite_error, cleanup_failed: !!r.cleanup_error, log: r.log }));
const qualification = 'NOT_ACCEPTED';
console.log(JSON.stringify({ kind: 'ORIGINAL_FAILED_CONTEXT', qualification, original_failed_context }));
const affected = [];
const required = ['tests/integration/grc/http.test.ts'];
const fullSuites = required;
const suites = required;
for (const suite of suites) assert.ok(existsSync(suite), `Missing required suite ${suite}`);
const prefix = `handoffs/codex/artifacts/R8-${label}-integrations`;
const logs = suites.map((suite, index) => `${prefix}-${String(index + 1).padStart(2, '0')}-${suite.slice('tests/integration/'.length).replace(/\.test\.ts$/, '').replaceAll('/', '-')}.log`);
for (const path of [...logs, `${prefix}.jsonl`, `${prefix}.json`]) assert.equal(existsSync(path), false, `Evidence already exists: ${path}`);
const ledger = openSync(`${prefix}.jsonl`, 'wx');
const env = {
  ...process.env, ORVIA_PROFILE: 'codex-a00', ORVIA_WORKSPACE_ROOT: process.cwd(),
  ORVIA_TEST_POSTGRES_CONTAINER: 'orvia-qualification-20260930-postgres',
  NEXT_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1',
};
// Vendor fixture keys go only to test processes. Their HTTP fixture starts the
// customer runtime through customerEnvironment(), which strips private keys.
for (const kind of ['release', 'licence', 'audit']) Object.assign(env, vendorSigningEnvironment(kind));
const TEMPORAL = 'orvia-codex-a00-temporal-1';
const PRIVATE = 'orvia-codex-a00_private';
const LOOPBACK = 'orvia-codex-a00_loopback_access';
const NODE_IMAGE = 'node@sha256:2fe369e969550cde8e867afc3fe370b260140cab4a23d467074295b42163d553';
const OPA_IMAGE = 'openpolicyagent/opa@sha256:2de1e6619246955695b982d0bcb6c73bcee22aa34ff96f2455996616ec1d21c1';
// Temporal is a worker workspace dependency, not a root package dependency.
const { Connection } = createRequire(new URL('../../services/worker/package.json', import.meta.url))('@temporalio/client');
assert.ok(label.length <= 40, 'Bound the owned Docker names');
function docker(args, output) {
  const result = spawnSync('docker', args, { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  // Arguments contain only fixed infrastructure names/paths and validated local
  // ports. Never inspect/log Config.Env or pass signing/password environment.
  output.write(JSON.stringify({ prerequisite_command: ['docker', ...args], exit_code: result.status, signal: result.signal }) + '\n');
  if (result.error || result.status !== 0) throw new Error(`Dependency command failed: docker ${args[0]} (exit ${result.status})`);
  return result.stdout.trim();
}
async function freePort(port) {
  await new Promise((resolve, reject) => {
    const server = createServer(); server.once('error', reject);
    server.listen(port, '127.0.0.1', () => server.close(error => error ? reject(error) : resolve()));
  });
}
async function ready(work, output, name) {
  const deadline = Date.now() + 60000; let last;
  while (Date.now() < deadline) {
    try { await work(); output.write(`Dependency ready: ${name}\n`); return; }
    catch (error) { last = error; await new Promise(resolve => setTimeout(resolve, 250)); }
  }
  // Readiness setup is bounded; suite assertions/timeouts are unchanged.
  throw new Error(`Dependency readiness failed: ${name} (${last?.name ?? 'Error'})`);
}
async function prerequisites(suite, output) {
  const cleanup = [];
  async function stop() {
    const errors = [];
    for (const work of cleanup.reverse()) try { await work(); } catch (error) { errors.push(error.message); }
    if (errors.length) throw new Error(errors.join('; '));
  }
  try {
    // The protected enrollment expires after one hour. Renew only between
    // serial suites, before any worker/agent starts; never relax the expiry.
    const enrollmentArgs = ['--import', 'tsx', 'scripts/machine-init.ts', 'confirm:codex-a00'];
    output.write(JSON.stringify({ prerequisite_command: [process.execPath, ...enrollmentArgs] }) + '\n');
    const enrollment = spawn(process.execPath, enrollmentArgs, { cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    enrollment.stdout.pipe(output, { end: false }); enrollment.stderr.pipe(output, { end: false });
    const enrollmentExit = await new Promise((resolve, reject) => {
      enrollment.once('error', reject); enrollment.once('close', (code, signal) => resolve({ code, signal }));
    });
    output.write(JSON.stringify({ prerequisite: 'MACHINE_ENROLLMENT', ...enrollmentExit }) + '\n');
    assert.equal(enrollmentExit.code, 0, 'Protected machine enrollment prerequisite failed');
    assert.equal(enrollmentExit.signal, null, 'Protected machine enrollment was interrupted');
    if (['tests/integration/evidence/evidence.test.ts', 'tests/integration/regression/regression.test.ts', 'tests/integration/workflows/workflow.test.ts'].includes(suite)) {
      await freePort(57233);
      for (const name of [PRIVATE, LOOPBACK]) {
        const project = docker(['network', 'inspect', '--format', '{{index .Labels "com.docker.compose.project"}}', name], output);
        assert.equal(project, 'orvia-codex-a00', 'Only the existing synthetic Compose networks may be used');
      }
      const temporalLabels = JSON.parse(docker(['inspect', '--format', '{{json .Config.Labels}}', TEMPORAL], output));
      assert.equal(temporalLabels['com.docker.compose.project'], 'orvia-codex-a00');
      assert.equal(temporalLabels['com.docker.compose.service'], 'temporal');
      assert.equal(docker(['inspect', '--format', '{{.State.Running}}', TEMPORAL], output), 'false', 'Do not assume ownership of a running Temporal service');
      const networks = JSON.parse(docker(['inspect', '--format', '{{json .NetworkSettings.Networks}}', TEMPORAL], output));
      assert.ok(networks[PRIVATE]?.Aliases?.includes('temporal'), 'The fixed relay must resolve the existing temporal alias');
      // Existing container/volume are started unchanged; never recreated, reset or removed.
      cleanup.push(() => docker(['stop', '--timeout', '20', TEMPORAL], output));
      docker(['start', TEMPORAL], output);
      docker(['image', 'inspect', NODE_IMAGE], output); // Existing local image only.
      const proxy = `orvia-round8-${label}-temporal-loopback`;
      docker(['create', '--pull=never', '--name', proxy, '--label', `orvia.round8.run=${label}`,
        '--network', PRIVATE, '--publish', '127.0.0.1:57233:7233', '--read-only', '--user', 'node',
        '--cap-drop', 'ALL', '--security-opt', 'no-new-privileges=true', '--memory', '256m',
        '--mount', `type=bind,src=${resolve('infrastructure/loopback.mjs')},dst=/app/loopback.mjs,readonly`,
        NODE_IMAGE, 'node', '/app/loopback.mjs'], output);
      // Delete only this newly created relay, with no volume deletion. It exposes
      // only 57233, so existing PostgreSQL/OPA loopback bindings never conflict.
      cleanup.push(() => {
        docker(['stop', '--timeout', '20', proxy], output);
        docker(['rm', proxy], output);
      });
      docker(['network', 'connect', LOOPBACK, proxy], output); docker(['start', proxy], output);
      await ready(async () => {
        const connection = await Connection.connect({ address: '127.0.0.1:57233', connectTimeout: '1s' });
        try { await connection.withDeadline(Date.now() + 1000, () => connection.workflowService.describeNamespace({ namespace: 'orvia-codex-a00' })); }
        finally { await connection.close(); }
      }, output, 'codex-a00 Temporal namespace');
    }
    if (suite === 'tests/integration/grc/http.test.ts') {
      const port = Number(env.ORVIA_GRC_OPA_PORT);
      assert.ok(Number.isInteger(port) && port >= 1024 && port <= 65535 && ![55431, 58181, 57233, 4310, 4340].includes(port), 'Set an independently owned ORVIA_GRC_OPA_PORT');
      await freePort(port); docker(['image', 'inspect', OPA_IMAGE], output);
      const opa = `orvia-round8-${label}-grc-opa`;
      docker(['create', '--pull=never', '--name', opa, '--label', `orvia.round8.run=${label}`,
        '--network', LOOPBACK, '--publish', `127.0.0.1:${port}:8181`, '--read-only', '--cap-drop', 'ALL',
        '--security-opt', 'no-new-privileges=true', '--memory', '128m',
        '--mount', `type=bind,src=${resolve('backend/policy')},dst=/policy,readonly`, OPA_IMAGE,
        'run', '--server', '--addr=0.0.0.0:8181', '--skip-version-check', '/policy'], output);
      cleanup.push(() => { docker(['stop', '--timeout', '20', opa], output); docker(['rm', opa], output); });
      docker(['start', opa], output);
      await ready(async () => {
        const response = await fetch(`http://127.0.0.1:${port}/v1/data/orvia/admin/authorize`, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ input: {} }), signal: AbortSignal.timeout(1000),
        });
        assert.equal(response.status, 200); assert.equal((await response.json()).result, false);
      }, output, 'independent GRC policy');
    }
    return stop;
  } catch (error) {
    try { await stop(); } catch (cleanupError) { output.write(`Dependency cleanup failed: ${cleanupError.message}\n`); }
    throw error;
  }
}
const results = [];
let blocked = null;
try {
  for (let index = 0; index < suites.length; index++) {
    const suite = suites[index];
    try { frozen(); } catch (error) { blocked = error.message; }
    if (blocked) {
      const record = { suite, status: 'NOT_RUN', reason: blocked, commit: expectedHead, build: expectedBuild };
      results.push(record); writeSync(ledger, JSON.stringify(record) + '\n');
      continue;
    }
    const args = ['node_modules/tsx/dist/cli.mjs', suite];
    const log = logs[index];
    const output = createWriteStream(log, { flags: 'wx' });
    await new Promise((resolve, reject) => { output.once('open', resolve); output.once('error', reject); });
    const started_at = new Date().toISOString();
    console.log(JSON.stringify({ suite, started_at, log }));
    let outcome; let cleanup = async () => {};
    try {
      cleanup = await prerequisites(suite, output);
      const child = spawn(process.execPath, args, { cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false });
      outcome = await new Promise(resolve => {
        child.once('error', error => resolve({ exit_code: null, signal: null, spawn_error: error.message }));
        child.once('close', (exit_code, signal) => resolve({ exit_code, signal }));
      });
    } catch (error) {
      outcome = { exit_code: null, signal: null, prerequisite_error: error.message };
      output.write(`Dependency setup failed: ${error.message}\n`);
    } finally {
      try { await cleanup(); }
      catch (error) { outcome = { ...outcome, cleanup_error: error.message }; output.write(`Dependency cleanup failed: ${error.message}\n`); }
    }
    await new Promise((resolve, reject) => { output.once('error', reject); output.end(resolve); });
    try { frozen(); } catch (error) { blocked = error.message; }
    const record = { suite, command: [process.execPath, ...args], log, started_at, ended_at: new Date().toISOString(), ...outcome,
      status: blocked ? 'INVALIDATED' : outcome.exit_code === 0 && !outcome.cleanup_error ? 'PASS' : 'FAIL',
      ...(blocked ? { reason: blocked } : {}), commit: expectedHead, build: expectedBuild };
    results.push(record); writeSync(ledger, JSON.stringify(record) + '\n'); console.log(JSON.stringify(record));
  }
} finally {
  closeSync(ledger);
  writeFileSync(`${prefix}.json`, JSON.stringify({ commit: expectedHead, build: expectedBuild, mode, fullSuites, affected, required, results, qualification, original_failed_context,
    coverage_limits: ['Unit, policy mutation, database-security/initialization rerun, pagination/timestamp controls and serial browser matrix require their separate runners.',
      'Changed-source transitive integration coverage is broader than git-diff-selected suites; migration-upgrade, backup-drill, vendor-audit/schema-equivalence and remaining security suites require separate qualification decisions.',
      'Vendor suites use their existing isolated scratch database harness; development signing fixtures are not production qualification.'] }, null, 2), { flag: 'wx' });
}
process.exitCode = results.some(result => result.status !== 'PASS') ? 1 : 0;
