// Serial, frozen-candidate qualification. No selective engines/suites or retries.
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, createWriteStream, existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';

if (process.env.ORVIA_PROFILE !== 'codex-a00') throw new Error('Named synthetic profile only');
const label = process.env.R8_MATRIX_LABEL;
// The inherited Firefox OPA sampler accepts letters/hyphens only.
if (!label || !/^[a-z][a-z-]{0,49}$/.test(label)) throw new Error('Fresh letters/hyphens R8_MATRIX_LABEL required');
if (process.argv.length > 2) throw new Error('Full matrix takes no engine or suite selectors');
if (process.env.R7_SUITES || process.env.R7_CRAWL_FROM) throw new Error('Selective suite/crawl configuration forbidden');
const engines = ['chromium', 'webkit', 'firefox'];
const suites = ['interface-crawl-local', 'expansion-screens-local', 'audit-mandate-local', 'operations-screens-local', 'sign-in-hydration-local'];
const artifacts = 'handoffs/codex/artifacts';
const ledger = `${artifacts}/R8-${label}-matrix-exits.jsonl`;
const git = args => {
  const result = spawnSync('git', args, { windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
  if (result.error || result.status !== 0) throw new Error('Read-only Git inspection failed');
  return result.stdout;
};
const commit = git(['rev-parse', 'HEAD']).toString().trim();
const build = readFileSync('frontend/.next/BUILD_ID', 'utf8').trim();
const frozen = () => {
  if (git(['rev-parse', 'HEAD']).toString().trim() !== commit || readFileSync('frontend/.next/BUILD_ID', 'utf8').trim() !== build) throw new Error('Frozen HEAD or BUILD_ID changed');
};
const record = value => {
  appendFileSync(ledger, JSON.stringify({ at: new Date().toISOString(), commit, build, ...value }) + '\n');
  console.log(JSON.stringify(value));
};
// Refuse overwriting unrelated pre-existing tracked screenshot edits. Store exact
// git-show bytes before any test, then restore only this initially clean set.
const historical = new Map();
for (const path of git(['ls-files', '-z', '--', 'output/playwright/crawl']).toString().split('\0').filter(Boolean)) {
  const bytes = git(['show', `${commit}:${path}`]);
  if (!existsSync(path) || !readFileSync(path).equals(bytes)) throw new Error(`Pre-existing tracked crawl change: ${path}`);
  historical.set(path, bytes);
}
const archiveRoot = resolve('output/playwright/round8', `matrix-${label}`);
if (existsSync(archiveRoot)) throw new Error('Matrix archive already exists');
for (const engine of engines) for (const suite of suites) {
  for (const suffix of ['', '-enrollment']) {
    if (existsSync(`${artifacts}/R8-${label}-${engine}-${suite}${suffix}.log`)) throw new Error('Matrix log already exists');
  }
  if (existsSync(`${artifacts}/R7V-${label}-${engine}-${suite}-diagnostic.jsonl`)) throw new Error('Browser diagnostic already exists');
  if (existsSync(`${artifacts}/R8-${label}-${engine}-${suite}-requests.jsonl`)) throw new Error('Verbose browser diagnostic already exists');
}
if (existsSync(`${artifacts}/R8-${label}-postgres-sampler.log`) || existsSync(`${artifacts}/R8-${label}-webkit-operations-postgres-samples.jsonl`)) throw new Error('Sampler artifact already exists');
writeFileSync(ledger, '', { flag: 'wx' });
mkdirSync(archiveRoot, { recursive: true });
const running = new Set();
let interrupted = false;
const stop = () => { interrupted = true; for (const child of running) if (child.exitCode === null) child.kill(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
function start(args, log, extra = {}) {
  const output = createWriteStream(log, { flags: 'wx' });
  const started_at = new Date().toISOString();
  const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ORVIA_WORKSPACE_ROOT: process.cwd(), R7_RUN_LABEL: label, R8_LABEL: label, ...extra } });
  running.add(child);
  child.stdout.pipe(output, { end: false });
  child.stderr.pipe(output, { end: false });
  const done = new Promise(resolveDone => {
    let spawn_error = null;
    child.once('error', error => { spawn_error = error.name; });
    child.once('close', (exit_code, signal) => {
      running.delete(child);
      output.end(() => {
        const result = { kind: 'COMMAND', command: [process.execPath, ...args], started_at,
          ended_at: new Date().toISOString(), exit_code, signal, spawn_error, log };
        record(result); resolveDone(result);
      });
    });
  });
  return { child, done };
}
let failed = false;
let completed = 0;
record({ kind: 'START', suites, engines, total: 15, passive_postgres_sampler: process.env.R8_PG_SAMPLER === '1' });
try {
  for (const engine of engines) for (const suite of suites) {
    if (interrupted) throw new Error('Matrix interrupted');
    frozen();
    const enrollment = await start(['node_modules/tsx/dist/cli.mjs', 'scripts/machine-init.ts', 'confirm:codex-a00'],
      `${artifacts}/R8-${label}-${engine}-${suite}-enrollment.log`).done;
    if (enrollment.exit_code !== 0) throw new Error('Enrollment failed; remaining browser checks NOT_RUN');
    frozen();
    let sampler;
    try {
      if (engine === 'webkit' && suite === 'operations-screens-local' && process.env.R8_PG_SAMPLER === '1') {
        sampler = start(['--import', 'tsx', 'handoffs/codex/round8-postgres-sampler.ts'],
          `${artifacts}/R8-${label}-postgres-sampler.log`, { R8_METRIC_LABEL: `${label}-webkit-operations`, R8_METRIC_DURATION_MS: '1200000' });
      }
      const harness = engine === 'webkit' && suite === 'operations-screens-local' && process.env.R8_VERBOSE_WEBKIT_OPERATIONS === '1'
        ? 'handoffs/codex/round8-browser.mjs' : 'handoffs/codex/round7-browser.mjs';
      const result = await start(['node_modules/tsx/dist/cli.mjs', harness, engine, suite],
        `${artifacts}/R8-${label}-${engine}-${suite}.log`, {
          R8_CRAWL_DIR: suite === 'interface-crawl-local' ? `output/playwright/round8/matrix-${label}/${engine}` : '',
        }).done;
      completed++;
      if (result.exit_code !== 0) failed = true;
      if (engine === 'webkit' && suite === 'interface-crawl-local') {
        const log = readFileSync(result.log, 'utf8');
        const originalChecks = [
          ['owner', '/workspace/personal-data-breaches/[id]'], ['owner', '/workspace/updates'],
          ['admin', '/workspace/policy-preview'], ['auditor', '/workspace/policy-preview'],
        ];
        const coverage = originalChecks.map(([role, route]) => ({ role, route,
          observed: log.split(/\r?\n/).some(line => line.startsWith(`PASS ${role}: ${route}`) || line.startsWith(`FAIL ${role}: ${route}`)) }));
        if (coverage.some(check => !check.observed)) failed = true;
        record({ kind: 'ORIGINAL_WEBKIT_CRAWL_CONTROLS', coverage });
      }
      frozen();
    } finally {
      if (sampler) {
        const stop_requested = sampler.child.exitCode === null;
        if (stop_requested) sampler.child.kill();
        const result = await sampler.done;
        record({ kind: 'PASSIVE_SAMPLER_EXIT', exit_code: result.exit_code, signal: result.signal,
          stop_requested, qualification_result: false });
        // Windows may forcibly terminate on kill rather than delivering SIGTERM.
        // Keep its actual exit; do not relabel a deliberate diagnostic stop PASS.
        if (!stop_requested && result.exit_code !== 0) failed = true;
      }
      if (suite === 'interface-crawl-local') {
        const destination = resolve(archiveRoot, engine);
        const screenshots = existsSync(destination) ? readdirSync(destination).filter(name => name.endsWith('.png')).sort().map(name => {
          const bytes = readFileSync(resolve(destination, name));
          return { name, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
        }) : [];
        if (!screenshots.length) failed = true;
        writeFileSync(resolve(archiveRoot, `${engine}-screenshots.json`), JSON.stringify({ commit, build, engine,
          provenance: 'Captured directly by this crawl into a previously absent engine directory; no historical copying',
          destination, screenshots }, null, 2), { flag: 'wx' });
        for (const [path, bytes] of historical) if (!existsSync(path) || !readFileSync(path).equals(bytes)) writeFileSync(path, bytes);
        record({ kind: 'CRAWL_ARCHIVE', engine, destination, fresh_screenshots: screenshots.length,
          screenshot_manifest: resolve(archiveRoot, `${engine}-screenshots.json`), restored_initially_clean_tracked_paths: historical.size });
      }
    }
  }
} catch (error) {
  failed = true;
  record({ kind: 'STOP_ERROR', error: error instanceof Error ? error.message : 'UnknownError', completed, remaining_not_run: 15 - completed });
} finally {
  stop();
  process.removeListener('SIGINT', stop);
  process.removeListener('SIGTERM', stop);
  record({ kind: 'FINISH', completed, remaining_not_run: 15 - completed, exit_code: failed || completed !== 15 ? 1 : 0 });
}
process.exitCode = failed || completed !== 15 ? 1 : 0;
