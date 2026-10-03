// Two existing feature suites, all three engines, serial. No assertion changes.
import { spawn, spawnSync } from 'node:child_process';
import { appendFileSync, createWriteStream, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const engines = ['chromium', 'webkit', 'firefox'];
const suites = ['backups-and-recovery-local', 'vendor-production-criteria-local'];
const label = process.env.R8_FEATURE_LABEL;
if (process.env.ORVIA_PROFILE !== 'codex-a00') throw new Error('Named synthetic customer fixture required');
if (!label || !/^[a-z0-9][a-z0-9-]{0,59}$/.test(label)) throw new Error('Fresh safe R8_FEATURE_LABEL required');
const root = 'handoffs/codex/artifacts';
const gitHead = () => {
  const result = spawnSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', windowsHide: true });
  if (result.error || result.status !== 0) throw new Error('HEAD inspection failed');
  return result.stdout.trim();
};
const buildId = () => readFileSync('frontend/.next/BUILD_ID', 'utf8').trim();

if (process.argv[2] === '--child') {
  const [, , , engine, suite] = process.argv;
  if (process.argv.length !== 5 || !engines.includes(engine) || !suites.includes(suite)) throw new Error('Unknown fixed feature selection');
  if (gitHead() !== process.env.R8_FEATURE_HEAD || buildId() !== process.env.R8_FEATURE_BUILD) throw new Error('Frozen feature candidate changed');
  const diagnostic = `${root}/R8-${label}-${engine}-${suite}-diagnostic.jsonl`;
  writeFileSync(diagnostic, '', { flag: 'wx' });
  const record = value => appendFileSync(diagnostic, JSON.stringify({ at: new Date().toISOString(), engine, suite, ...value }) + '\n');
  const [{ chromium, webkit, firefox }, childProcess, { syncBuiltinESMExports }, { vendorSigningEnvironment }] = await Promise.all([
    import('@playwright/test'), import('node:child_process').then(m => m.default), import('node:module'), import('../../scripts/credentials.ts')
  ]);
  const originalSpawn = childProcess.spawn;
  childProcess.spawn = function (...args) {
    const child = originalSpawn.apply(this, args);
    let pending = '';
    child.stderr?.on('data', chunk => {
      pending += chunk.toString();
      const lines = pending.split('\n'); pending = lines.pop() ?? '';
      if (pending.length > 65536) pending = '';
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.round7_diagnostic) record({ server: data });
          else if (data.dependency === 'policy_engine') record({ server: { dependency: data.dependency, attempt: data.attempt, elapsed_ms: data.elapsed_ms, error: data.error } });
          else if (data.request_id && data.operation) record({ server: { request_id: data.request_id, operation: data.operation, name: data.name, code: data.code } });
        } catch { /* Never retain arbitrary server stderr or credentials. */ }
      }
    });
    return child;
  };
  syncBuiltinESMExports();
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS ?? ''} --import=${pathToFileURL(resolve('handoffs/codex/round7-server-trace.mjs')).href}`.trim();
  // Only the release signer is needed for these synthetic test fixtures. The
  // existing webProcess/customerEnvironment strips private keys from runtimes,
  // including the vendor suite's own startVendor subprocess.
  Object.assign(process.env, vendorSigningEnvironment('release'));
  const browserType = { chromium, webkit, firefox }[engine];
  const launch = browserType.launch.bind(browserType);
  chromium.launch = async options => {
    const browser = await launch({ ...options, ...(engine === 'chromium' ? {} : { executablePath: undefined }) });
    record({ kind: 'BROWSER', version: browser.version() });
    const newContext = browser.newContext.bind(browser);
    browser.newContext = async options => {
      const context = await newContext(options);
      context.on('page', page => {
        const issued = new WeakMap();
        page.on('request', request => issued.set(request, { issued_at: new Date().toISOString(), page_path: new URL(page.url(), 'http://127.0.0.1').pathname }));
        page.on('requestfailed', request => record({ ...issued.get(request), kind: 'REQUEST_FAILED', path: new URL(request.url()).pathname, failure: request.failure()?.errorText }));
        page.on('pageerror', error => record({ kind: 'PAGE_ERROR', page_path: new URL(page.url()).pathname, message: error.message }));
        page.on('response', response => {
          if (response.status() < 500) return;
          void (async () => record({ ...issued.get(response.request()), kind: 'SERVER_ERROR', path: new URL(response.url()).pathname,
            status: response.status(), request_id: (await response.allHeaders())['x-request-id'] }))().catch(() => {});
        });
      });
      return context;
    };
    return browser;
  };
  await import(pathToFileURL(resolve(`tests/e2e/${suite}.ts`)));
  if (gitHead() !== process.env.R8_FEATURE_HEAD || buildId() !== process.env.R8_FEATURE_BUILD) throw new Error('Frozen feature candidate changed during suite');
} else {
  if (process.argv.length !== 2) throw new Error('Full feature matrix takes no selectors');
  const commit = gitHead(); const build = buildId();
  const ledger = `${root}/R8-${label}-feature-browser-exits.jsonl`;
  for (const engine of engines) for (const suite of suites) {
    for (const suffix of ['', '-enrollment']) if (existsSync(`${root}/R8-${label}-${engine}-${suite}${suffix}.log`)) throw new Error('Feature log already exists');
    if (existsSync(`${root}/R8-${label}-${engine}-${suite}-diagnostic.jsonl`)) throw new Error('Feature diagnostic already exists');
  }
  writeFileSync(ledger, '', { flag: 'wx' });
  const record = value => { appendFileSync(ledger, JSON.stringify({ commit, build, ...value }) + '\n'); console.log(JSON.stringify(value)); };
  const frozen = () => { if (gitHead() !== commit || buildId() !== build) throw new Error('Frozen feature HEAD or BUILD_ID changed'); };
  const run = async (args, log) => {
    const output = createWriteStream(log, { flags: 'wx' }); const started_at = new Date().toISOString();
    const child = spawn(process.execPath, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
      env: { ...process.env, ORVIA_WORKSPACE_ROOT: process.cwd(), R8_FEATURE_HEAD: commit, R8_FEATURE_BUILD: build } });
    child.stdout.pipe(output, { end: false }); child.stderr.pipe(output, { end: false });
    let spawn_error = null;
    child.once('error', error => { spawn_error = error.name; });
    const result = await new Promise(done => child.once('close', (exit_code, signal) => output.end(() => done({
      command: [process.execPath, ...args], started_at, ended_at: new Date().toISOString(), exit_code, signal, spawn_error, log }))));
    record(result); return result;
  };
  let failed = false; let completed = 0;
  record({ kind: 'START', engines, suites, total: 6 });
  try {
    for (const engine of engines) for (const suite of suites) {
      frozen();
      const enrollment = await run(['--import', 'tsx', 'scripts/machine-init.ts', 'confirm:codex-a00'], `${root}/R8-${label}-${engine}-${suite}-enrollment.log`);
      if (enrollment.exit_code !== 0) throw new Error('Enrollment failed; remaining feature browser checks NOT_RUN');
      frozen();
      const result = await run(['--import', 'tsx', 'handoffs/codex/round8-feature-browser.mjs', '--child', engine, suite], `${root}/R8-${label}-${engine}-${suite}.log`);
      completed++;
      if (result.exit_code !== 0) failed = true;
      frozen();
    }
  } catch (error) {
    failed = true; record({ kind: 'STOP_ERROR', error: error instanceof Error ? error.message : 'UnknownError', remaining_not_run: 6 - completed });
  }
  record({ kind: 'FINISH', completed, remaining_not_run: 6 - completed, exit_code: failed || completed !== 6 ? 1 : 0 });
  process.exitCode = failed || completed !== 6 ? 1 : 0;
}
