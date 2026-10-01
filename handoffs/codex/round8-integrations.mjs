// Serial synthetic-only qualification. This runner does not start/stop containers.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { closeSync, createWriteStream, existsSync, openSync, readFileSync, writeFileSync, writeSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';

const [label, expectedHead, expectedBuild] = process.argv.slice(2);
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
const affected = git(['diff', '--name-only', '4738d9a..HEAD', '--', 'tests']).split(/\r?\n/)
  .filter(path => /^tests\/integration\/.+\.test\.ts$/.test(path));
const required = [
  'operations/backup-obligations', 'expansion/policy-discovery', 'operations/notice-language-drift',
  'consent/canaries', 'consent/canary-retirement', 'onboarding/owner-recovery', 'onboarding/real-principals',
].map(path => `tests/integration/${path}.test.ts`);
const suites = [...new Set([...required, ...affected.sort()])];
assert.ok(suites.length > required.length);
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
    const child = spawn(process.execPath, args, { cwd: process.cwd(), env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false });
    const outcome = await new Promise(resolve => {
      child.once('error', error => resolve({ exit_code: null, signal: null, spawn_error: error.message }));
      child.once('close', (exit_code, signal) => resolve({ exit_code, signal }));
    });
    await new Promise((resolve, reject) => { output.once('error', reject); output.end(resolve); });
    try { frozen(); } catch (error) { blocked = error.message; }
    const record = { suite, command: [process.execPath, ...args], log, started_at, ended_at: new Date().toISOString(), ...outcome,
      status: blocked ? 'INVALIDATED' : outcome.exit_code === 0 ? 'PASS' : 'FAIL',
      ...(blocked ? { reason: blocked } : {}), commit: expectedHead, build: expectedBuild };
    results.push(record); writeSync(ledger, JSON.stringify(record) + '\n'); console.log(JSON.stringify(record));
  }
} finally {
  closeSync(ledger);
  writeFileSync(`${prefix}.json`, JSON.stringify({ commit: expectedHead, build: expectedBuild, affected, required, results,
    coverage_limits: ['Unit, policy mutation, database-security/initialization rerun, pagination/timestamp controls and serial browser matrix require their separate runners.',
      'Changed-source transitive integration coverage is broader than git-diff-selected suites; migration-upgrade, backup-drill, vendor-audit/schema-equivalence and remaining security suites require separate qualification decisions.',
      'Vendor suites use their existing isolated scratch database harness; development signing fixtures are not production qualification.'] }, null, 2), { flag: 'wx' });
}
process.exitCode = results.some(result => result.status !== 'PASS') ? 1 : 0;
