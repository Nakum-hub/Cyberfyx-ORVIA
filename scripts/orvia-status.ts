/**
 * `npm run status` — what is actually running, without any secret.
 *
 * Every line comes from a real check: a Docker query, the same backing-service
 * probes preflight records, the protected supervisor journal and an HTTPS
 * request to the local health endpoint. No credential, token, key or connection
 * setting is read or printed.
 */
import { existsSync } from 'node:fs';
import {
  ORIGIN, PROFILE, PROFILE_DIRECTORY, REPOSITORY_ROOT, dockerAvailable,
  httpsHealthy, line, profileState, reportOperatorError, runningServices, supervisorRun,
} from './orvia-cli.ts';

process.chdir(REPOSITORY_ROOT);
process.env.ORVIA_PROFILE = PROFILE;

const report: string[] = [];
try {
  const installed = profileState();
  report.push(line('Profile', `${PROFILE} (${installed.toLowerCase()})`));
  report.push(line('Mode', 'customer-local synthetic'));

  const { loadProfile } = await import('../packages/testing/src/config.ts');
  const profile = installed === 'CONFIGURED' ? loadProfile(PROFILE) : null;
  const running = profile ? runningServices(profile) : null;
  const container = (name: string) => running === null ? (dockerAvailable() ? 'unknown' : 'docker unavailable') : running.includes(name) ? 'container running' : 'stopped';

  let probes: Record<string, { result: string }> = {};
  if (profile && running?.length) {
    const { checkServices } = await import('./service-readiness.ts');
    probes = await checkServices(profile);
  }
  const service = (name: string, key: string) => report.push(line(name, probes[key] ? (probes[key].result === 'PASS' ? 'ready' : 'not ready') : container(key)));
  service('PostgreSQL', 'postgres');
  service('Temporal', 'temporal');
  service('OPA', 'opa');

  const run = supervisorRun();
  const healthy = run ? await httpsHealthy() : false;
  report.push(line('Web', run ? (healthy ? 'ready' : 'starting or not responding') : 'not running'));
  report.push(line('Worker', run ? 'owned by the supervisor' : 'not running'));
  report.push(line('Agent', run ? 'owned by the supervisor' : 'not running'));
  report.push(line('Supervisor', run ? `running since ${run.started_at}` : 'no run journal'));
  report.push(line('Production build', existsSync('apps/web/.next/BUILD_ID') ? 'present' : 'absent'));
  report.push(line('Application URL', run && healthy ? ORIGIN : `${ORIGIN} (not serving)`));
  report.push(line('Credentials', `generated locally, kept in ${PROFILE_DIRECTORY.replace(REPOSITORY_ROOT, '')}; never printed`));

  process.stdout.write(`\n  ORVIA status\n  ------------------------------------------------------------\n${report.join('\n')}\n\n  Start with:  npm start\n  Stop with:   npm stop\n\n`);
} catch (error) { process.stdout.write(`\n${report.join('\n')}\n`); reportOperatorError(error); process.exitCode = 1; }
