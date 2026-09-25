// Runs the integration battery and reports what actually happened.
//
// This exists because of a mistake worth not repeating. The battery used to be
// checked by running each suite and then reading the newest evidence artifact
// whose name matched it. That is unsound in exactly the case that matters: a
// suite which throws before writing an artifact leaves the previous run's
// record in place, so the reader picks up a stale PASS and reports a suite as
// green when it did not run at all. Two suites were misreported that way.
//
// So this runner only believes a result it can tie to this execution:
//
//   - the process exit code, which a stale file cannot fake; and
//   - an artifact carrying this run's identifier, which each suite receives
//     through ORVIA_EVIDENCE_RUN and the evidence writer stamps on its record.
//
// A modification time is not enough: two batteries run at once write fresh
// artifacts of the same names, and each would accept the other's. That also
// means two batteries at once share one database and fail each other, so a
// second run is refused while the first holds the lock.
//
// A suite that exits non-zero, writes nothing, or writes nothing stamped with
// this run is reported as such and never as a pass. NOT_RUN stays NOT_RUN.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeEvidence } from '../shared/testing/src/evidence.ts';
import { loadProfile } from '../shared/testing/src/config.ts';

const run = promisify(execFile);
const profile = loadProfile();
if (!['codex-a00', 'ui-b00', 'rehearsal'].includes(profile.profile)) throw new Error('Only codex-a00/ui-b00/rehearsal permitted');

const ARTIFACTS = 'handoffs/codex/artifacts';

/** Refuses to start while another live battery holds the lock. A lock left by a
 *  process that no longer exists is stale and is taken over. */
const LOCK = resolve('.local', 'suite-battery.lock');
function holderIsAlive(pid: number) {
  try { process.kill(pid, 0); return true; } catch (error) { return (error as { code?: string }).code === 'EPERM'; }
}
mkdirSync('.local', { recursive: true });
try {
  writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
} catch {
  const holder = Number(readFileSync(LOCK, 'utf8'));
  if (Number.isInteger(holder) && holder > 0 && holderIsAlive(holder)) {
    throw new Error(`Another suite battery (pid ${holder}) is running against this profile; the two would share one database and fail each other`);
  }
  unlinkSync(LOCK);
  writeFileSync(LOCK, String(process.pid), { flag: 'wx' });
}
process.on('exit', () => { try { if (readFileSync(LOCK, 'utf8') === String(process.pid)) unlinkSync(LOCK); } catch { /* already gone */ } });
const RUN_ID = randomUUID();

/**
 * A fixture key pair some suites need. They sign with the private key while the
 * application verifies with the public one, so all three values must be present
 * or the suite exercises nothing and fails in a way that looks like a fault.
 */
function keyPair(file: string, prefix: string): Record<string, string> {
  const path = resolve('.local', file);
  if (!existsSync(path)) return {};
  const fixture = JSON.parse(readFileSync(path, 'utf8')) as { key_id: string; public: string; private: string };
  return {
    [`${prefix}_KEY_ID`]: fixture.key_id,
    [`${prefix}_PRIVATE_KEY`]: fixture.private,
    [`${prefix}_PUBLIC_KEY`]: fixture.public,
  };
}

/** Script name, artifact fragment and any fixture environment the script requires. */
const SUITES: { script: string; artifact: string; env?: Record<string, string> }[] = [
  { script: 'test:consent', artifact: 'consent-integration' },
  { script: 'test:expiry', artifact: 'expiry-integration' },
  { script: 'test:enforcement', artifact: 'send-enforcement' },
  { script: 'test:evidence', artifact: 'evidence-integration' },
  { script: 'test:graph', artifact: 'graph-integration' },
  { script: 'test:rights', artifact: 'rights-integration' },
  { script: 'test:portal-rights', artifact: 'portal-rights-integration' },
  { script: 'test:retention', artifact: 'retention-integration' },
  { script: 'test:coverage', artifact: 'coverage-integration' },
  { script: 'test:processors', artifact: 'processors-integration' },
  { script: 'test:incidents', artifact: 'incidents-integration' },
  { script: 'test:notifications', artifact: 'notifications-integration' },
  { script: 'test:licensing', artifact: 'licensing-integration', env: keyPair('licence-fixture.json', 'ORVIA_LICENCE') },
  { script: 'test:monitoring', artifact: 'monitoring-integration' },
  { script: 'test:restore', artifact: 'restore-integration' },
  { script: 'test:vendor-visibility', artifact: 'vendor-visibility-integration' },
  { script: 'test:support', artifact: 'support-integration' },
  { script: 'test:updates', artifact: 'updates-integration', env: keyPair('release-fixture.json', 'ORVIA_RELEASE') },
  { script: 'test:audit', artifact: 'audit-integration' },
  { script: 'test:audit-retention', artifact: 'audit-retention-integration' },
  { script: 'test:onboarding', artifact: 'onboarding-integration' },
  { script: 'test:languages', artifact: 'notice-language-integration' },
  { script: 'test:preflight', artifact: 'preflight-integration' },
  { script: 'test:imports', artifact: 'imports-integration' },
  { script: 'test:reports', artifact: 'reports-integration' },
  { script: 'test:workflows', artifact: 'workflow-integration' },
  { script: 'test:regression', artifact: 'regression-integration' },
];
const from = process.argv[2] === '--from' ? process.argv[3] : undefined;
if (process.argv.length > (from ? 4 : 2) || (process.argv[2] && !from))
  throw new Error('Usage: verify-suites.ts [--from test:script]');
const firstSuite = from ? SUITES.findIndex(suite => suite.script === from) : 0;
if (firstSuite < 0) throw new Error('Unknown suite start');

/** The newest artifact for this suite stamped with this run's identifier. The
 *  modification time only narrows the search; the identifier decides, so an
 *  older record or one written by a concurrent execution is never accepted. */
function freshArtifact(fragment: string, startedAt: number) {
  const matches = readdirSync(ARTIFACTS)
    .filter(name => name.includes(fragment) && name.endsWith('.json'))
    .map(name => ({ name, at: statSync(resolve(ARTIFACTS, name)).mtimeMs }))
    .filter(entry => entry.at >= startedAt)
    .filter(entry => (JSON.parse(readFileSync(resolve(ARTIFACTS, entry.name), 'utf8')) as { run_id?: string }).run_id === RUN_ID)
    .sort((a, b) => b.at - a.at);
  return matches[0]?.name ?? null;
}

const results: Record<string, unknown>[] = [];
for (const suite of SUITES.slice(firstSuite)) {
  const startedAt = Date.now();
  let exitCode = 0;
  let failure: string | null = null;
  try {
    // These are closed, source-controlled script names rather than user input.
    // On Windows the shell must remain the process owner: invoking npm-cli
    // directly can return while TSX/Next descendants are still running.
    await run('npm', ['run', suite.script], {
      shell: true, windowsHide: true, maxBuffer: 32 * 1024 * 1024,
      env: { ...process.env, ...suite.env, ORVIA_EVIDENCE_RUN: RUN_ID },
    });
  } catch (error) {
    exitCode = (error as { code?: number }).code ?? 1;
    failure = 'non-zero exit';
  }

  const artifact = freshArtifact(suite.artifact, startedAt);
  let assertions = 0;
  let recorded: string | null = null;
  if (artifact) {
    const record = JSON.parse(readFileSync(resolve(ARTIFACTS, artifact), 'utf8')) as
      { result?: string; assertions?: { result: string }[] };
    recorded = record.result ?? null;
    assertions = record.assertions?.length ?? 0;
    if (record.assertions?.some(a => a.result !== 'PASS')) failure = 'a recorded assertion failed';
  } else if (!failure) {
    // Exit zero and nothing written by this run. Not a pass: something ran that
    // this runner cannot tie to an execution, and a silent suite is a gap.
    failure = 'no artifact written by this run';
  }

  const outcome = exitCode === 0 && recorded === 'PASS' && !failure ? 'PASS' : 'FAIL';
  results.push({ suite: suite.script, outcome, exit_code: exitCode, assertions, artifact, reason: failure });
  console.log(`${outcome === 'PASS' ? 'PASS' : 'FAIL'} ${suite.script.padEnd(26)} ${String(assertions).padStart(4)} assertions${failure ? `  (${failure})` : ''}`);
}

const failed = results.filter(r => r.outcome !== 'PASS');
const total = results.reduce((sum, r) => sum + (r.assertions as number), 0);
writeEvidence('suite-battery', {
  profile: profile.profile, suites: results.length, assertions: total,
  failures: failed.length, results,
  result: failed.length ? 'FAIL' : 'PASS',
  limitations: [
    'A suite is a pass only when it exited zero and wrote an artifact stamped with this run\'s identifier whose assertions all passed. An artifact from an earlier or a concurrent execution is never accepted.',
    'This is component coverage. It is not application acceptance, which only the human-run rehearsals produce.',
  ],
});
console.log(`\n${results.length} suites, ${total} assertions, ${failed.length} failing.`);
if (failed.length) {
  for (const f of failed) console.error(`  ${f.suite}: ${f.reason ?? 'recorded ' + String(f.outcome)}`);
  process.exitCode = 1;
}
