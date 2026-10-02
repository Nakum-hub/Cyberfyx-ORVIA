// One serial pass, durable command ledger, no automatic retries.
import { spawn, spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFileSync, createWriteStream, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vendorSigningEnvironment } from '../../scripts/credentials.ts';

const run = process.argv[2];
if (!['1', '2', '3'].includes(run)) throw new Error('Run must be 1, 2 or 3');
const prefix = `handoffs/codex/artifacts/R9-run${run}`;
if (existsSync(`${prefix}.jsonl`)) throw new Error('Run already started; never overwrite or repeat it');
const head = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true }).stdout.trim();
const env = { ...process.env, ORVIA_PROFILE: 'codex-a00', ORVIA_WORKSPACE_ROOT: process.cwd(),
  ORVIA_TASK_ID: 'DPDP', NEXT_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1', BETTER_AUTH_TELEMETRY: '0',
  ORVIA_GRC_OPA_PORT: '4499', ORVIA_TEST_OPA_CONTAINER: 'orvia-round9-opa', ORVIA_TEST_POSTGRES_CONTAINER: 'orvia-qualification-20260930-postgres',
  PLAYWRIGHT_BROWSERS_PATH: resolve('.local/tools/playwright') };
for (const kind of ['release', 'licence', 'audit']) Object.assign(env, vendorSigningEnvironment(kind));
const allFiles = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? allFiles(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
const all = [...allFiles('tests/integration').filter(p => p.endsWith('.test.ts')),
  ...allFiles('tests/security').filter(p => p.endsWith('.ts')),
  ...allFiles('tests/e2e').filter(p => /(?:-local|-preflight|\.spec)\.ts$/.test(p))].sort();
const exceptions = {
  'tests/security/tls.test.ts': 'Rehearsal-only TLS suite requires fixture users incompatible with the clean single-owner installation; existing NOT_RUN retained.',
  'tests/security/network-core.ts': 'Requires separately qualified packaged runtime image and controlled canary; existing NOT_RUN retained.',
  'tests/integration/lifecycle.test.ts': 'Existing rehearsal-only lifecycle remains NOT_RUN: requires seeded business fixtures and exclusive rehearsal supervisor, outside this codex-a00 run.',
  'tests/e2e/transport-preflight.ts': 'Rehearsal-only HTTPS transport requires the seeded multi-user rehearsal fixture; NOT_RUN, not a local-browser substitute.',
};
for (const p of all.filter(p => p.endsWith('.spec.ts'))) exceptions[p] = 'Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.';
const suites = run === '1' ? all : JSON.parse(readFileSync(`handoffs/codex/round9-run${run}-suites.json`, 'utf8'));
if (new Set(suites).size !== suites.length || suites.some(p => !all.includes(p))) throw new Error('Invalid or duplicate suite selection');
writeFileSync(`${prefix}.jsonl`, '', { flag: 'wx' });
writeFileSync(`${prefix}-manifest.json`, JSON.stringify({ head, run, suites, exceptions, started_at: new Date().toISOString() }, null, 2));
const results = [];
let index = 0;
async function execute(label, args, kind = 'suite') {
  const log = `${prefix}-${String(++index).padStart(3, '0')}-${label.replaceAll('/', '-').replaceAll('.', '-')}.log`;
  const started_at = new Date().toISOString();
  const id = randomUUID();
  const output = createWriteStream(log, { flags: 'wx' });
  const child = spawn(process.execPath, args, { windowsHide: true, env: { ...env, ORVIA_EVIDENCE_RUN: id }, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false });
  console.log(JSON.stringify({ event: 'START', label, kind, started_at }));
  const outcome = await new Promise(done => { child.once('error', e => done({ exit_code: null, error: e.message })); child.once('close', (exit_code, signal) => done({ exit_code, signal })); });
  await new Promise(done => output.end(done));
  const text = readFileSync(log, 'utf8');
  const first_error = text.split(/\r?\n/).find(s => /(^FAIL\b|AssertionError|Error:|code:|"result":"FAIL")/.test(s)) ?? null;
  const record = { label, kind, command: [process.execPath, ...args], head, run_id: id, started_at, ended_at: new Date().toISOString(), ...outcome,
    status: outcome.exit_code === 0 ? 'PASS' : 'FAILED', first_error, log,
    summary: text.split(/\r?\n/).filter(s => /assertions|\d+\/\d+ passed|tests \d+|pass \d+|fail \d+/.test(s)).slice(-5) };
  results.push(record); appendFileSync(`${prefix}.jsonl`, JSON.stringify(record) + '\n');
  console.log(JSON.stringify(record));
  return record;
}
if (run === '1') {
  for (const [label, args] of [
    ['db-migrate', ['scripts/migrate.ts']], ['vendor-init', ['scripts/vendor-init.ts', 'confirm:vendor-a00']],
    ['auth-init', ['scripts/auth-init.ts', 'confirm:codex-a00']], ['machine-init', ['scripts/machine-init.ts', 'confirm:codex-a00']],
    ['build', ['scripts/web.ts', 'build']],
  ]) await execute(label, ['--import', 'tsx', ...args], 'prerequisite');
}
for (const suite of suites) {
  if (exceptions[suite]) {
    const record = { label: suite, kind: 'suite', status: 'NOT_RUN', reason: exceptions[suite], head };
    results.push(record); appendFileSync(`${prefix}.jsonl`, JSON.stringify(record) + '\n'); continue;
  }
  // Renew the one-hour protected enrollment between serial suites, never during
  // a running worker or by changing the product expiry.
  if (/evidence\/evidence|regression\/regression|workflows\/workflow|enforcement\/withdrawal-timing|security\/fixture-isolation/.test(suite))
    await execute(`enrollment-${index}`, ['--import', 'tsx', 'scripts/machine-init.ts', 'confirm:codex-a00'], 'prerequisite');
  await execute(suite, ['--import', 'tsx', suite]);
}
writeFileSync(`${prefix}-results.json`, JSON.stringify({ head, run, results }, null, 2));
console.log(JSON.stringify({ event: 'FINISH', run, counts: Object.fromEntries(['PASS', 'FAILED', 'NOT_RUN'].map(s => [s, results.filter(r => r.kind === 'suite' && r.status === s).length])) }));
process.exitCode = results.some(r => r.status === 'FAILED') ? 1 : 0;
