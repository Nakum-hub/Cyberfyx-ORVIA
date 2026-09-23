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
  httpsHealthy, line, profileState, reportOperatorError, runningServices, supervisorAlive, supervisorRun,
} from './orvia-cli.ts';

process.chdir(REPOSITORY_ROOT);
process.env.ORVIA_PROFILE = PROFILE;

const report: string[] = [];
try {
  const installed = profileState();
  report.push(line('Profile', `${PROFILE} (${installed.toLowerCase()})`));
  report.push(line('Mode', 'customer-local synthetic'));

  const { loadProfile } = await import('../shared/testing/src/config.ts');
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
  const liveSupervisor = supervisorAlive(run);
  const healthy = liveSupervisor ? await httpsHealthy() : false;
  let worker = false; let agent = false;
  if (profile && probes.postgres?.result === 'PASS') {
    const { connectDatabase } = await import('../database/customer/src/index.ts');
    const db = connectDatabase(profile).pool;
    try {
      const activity = (await db.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name='orvia_worker') worker, EXISTS(SELECT 1 FROM app.audit_events a JOIN app.request_audit r ON r.id=a.request_id WHERE a.operation='machine.poll' AND a.actor_domain='MACHINE' AND r.status=200 AND a.created_at>clock_timestamp()-interval '10 seconds') agent")).rows[0];
      worker = Boolean(activity.worker); agent = Boolean(activity.agent);
    } finally { await db.end(); }
  }
  report.push(line('Web', liveSupervisor ? (healthy ? 'ready' : 'starting or not responding') : 'not running'));
  report.push(line('Worker', worker ? 'running' : 'not running'));
  report.push(line('Agent', agent ? 'running' : 'not running'));
  report.push(line('Supervisor', liveSupervisor && run ? `running since ${run.started_at}` : run ? 'stale run journal; inspect before restart' : 'no run journal'));
  report.push(line('Production build', existsSync('frontend/.next/BUILD_ID') ? 'present' : 'absent'));
  report.push(line('Application URL', liveSupervisor && healthy ? ORIGIN : `${ORIGIN} (not serving)`));
  report.push(line('Credentials', `generated locally, kept in ${PROFILE_DIRECTORY.replace(REPOSITORY_ROOT, '')}; never printed`));

  process.stdout.write(`\n  ORVIA status\n  ------------------------------------------------------------\n${report.join('\n')}\n\n  Start with:  npm start\n  Stop with:   npm stop\n\n`);
} catch (error) { process.stdout.write(`\n${report.join('\n')}\n`); reportOperatorError(error); process.exitCode = 1; }
