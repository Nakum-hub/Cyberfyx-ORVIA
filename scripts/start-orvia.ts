/**
 * `npm start` — the single operator command that brings the whole ORVIA
 * prototype up.
 *
 * This is an orchestrator, not a second implementation. Every step delegates to
 * the protected script that already owns it: `services.ts` for Docker,
 * `migrate.ts` for schema, `machine-init.ts` for enrollment, `web.ts` for the
 * production build and `app-run.ts` for the web/worker/agent supervisor. None
 * of their confirmations, identity checks or locks are bypassed.
 *
 * Safety properties this command is required to keep:
 *   - it never deletes `.local`, a volume, a credential or business state;
 *   - it never repairs a half-initialised profile;
 *   - it never starts a second instance;
 *   - it never prints a password, TOTP secret, machine token or private key;
 *   - it never disables certificate verification.
 */
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  CA_CERTIFICATE, ORIGIN, PROFILE, PROFILE_DIRECTORY, REPOSITORY_ROOT, OperatorError,
  childEnvironment, dockerAvailable, done, httpsHealthy, line, portFree, profileState,
  reportOperatorError, runScript, runningServices, stage, supervisorRun, toolchainExecutable,
} from './orvia-cli.ts';

process.chdir(REPOSITORY_ROOT);

/**
 * `npm start` runs under whatever Node is on the operator's PATH. Re-launch once
 * under the pinned workspace toolchain, with the local CA and profile already in
 * the environment, so every later step — including the HTTPS readiness probe —
 * runs on the exact runtime the repository qualified.
 */
if (process.env.ORVIA_START_REEXEC !== '1') {
  try {
    const child = spawn(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url)], {
      cwd: REPOSITORY_ROOT,
      windowsHide: true,
      stdio: 'inherit',
      env: { ...childEnvironment(), ORVIA_START_REEXEC: '1' },
    });
    let interrupting = false;
    const bridgeInterrupt = () => {
      if (interrupting) return;
      interrupting = true;
      // npm's Windows launcher can close the console immediately after a
      // signal handler returns. Block here until the protected supervisor has
      // acknowledged the exact run identity; the pinned child then performs
      // its normal owned-service cleanup and exits.
      if (supervisorRun()) spawnSync(toolchainExecutable(), ['--import', 'tsx', resolve(REPOSITORY_ROOT, 'scripts/app-stop.ts'), `confirm:${PROFILE}`], {
        cwd: REPOSITORY_ROOT, windowsHide: true, stdio: 'inherit', env: childEnvironment(),
      });
      else child.kill('SIGTERM');
    };
    process.on('SIGINT', bridgeInterrupt); process.on('SIGTERM', bridgeInterrupt);
    const [code] = await once(child, 'close') as [number | null];
    process.exit(code ?? 1);
  } catch (error) { reportOperatorError(error); process.exit(1); }
}

if (process.env.ORVIA_PROFILE && process.env.ORVIA_PROFILE !== PROFILE) throw new OperatorError(`ORVIA_PROFILE is set to "${process.env.ORVIA_PROFILE}".`, `npm start runs the ${PROFILE} profile only.\n\nClear the variable, or use the engineering commands in docs/engineering/A07-PACKAGE.md for another profile.`);
process.env.ORVIA_PROFILE = PROFILE;

const COMPOSE_SERVICES = ['postgres', 'opa', 'temporal', 'loopback'];
let ownedServices = false;
let supervisorLog = '';
let streaming = false;
let stopping = false;

process.stdout.write('\n  ORVIA\n  ------------------------------------------------------------\n');
process.stdout.write(line('Profile', PROFILE) + '\n');
process.stdout.write(line('Mode', 'customer-local synthetic') + '\n');
process.stdout.write(line('Repository', REPOSITORY_ROOT) + '\n\n');

try {
  // 1. Prerequisites and installation state -------------------------------
  stage('Checking environment...');
  const state = profileState();
  if (state === 'PARTIAL') throw new OperatorError('ORVIA rehearsal profile is partially initialized.', 'Automatic overwrite is disabled, so no credential, key or store is touched.\n\nInspect .local/profiles/rehearsal and resume the individual setup commands.\n\nSee: docs/engineering/A07-PACKAGE.md');
  if (state === 'ABSENT') {
    if (process.platform !== 'win32') throw new OperatorError('No ORVIA installation was found, and first-run setup is Windows-only.', 'The tested host for this prototype is Windows x64 with Docker Desktop.\n\nSee: docs/engineering/A07-PACKAGE.md');
    stage('No installation found. Running one-time rehearsal setup...');
    const setup = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(REPOSITORY_ROOT, 'scripts/setup-rehearsal.ps1')], { cwd: REPOSITORY_ROOT, windowsHide: true, stdio: 'inherit', env: childEnvironment() });
    const [setupCode] = await once(setup, 'close') as [number | null];
    if (setupCode !== 0) throw new OperatorError('First-run setup did not complete.', 'Nothing was reset and any state it did create is retained.\n\nCorrect the cause reported above and resume the individual commands in docs/engineering/A07-PACKAGE.md.');
    if (profileState() !== 'CONFIGURED') throw new OperatorError('First-run setup finished without producing a complete profile.', 'See: docs/engineering/A07-PACKAGE.md');
  }
  if (!existsSync(CA_CERTIFICATE)) throw new OperatorError('The local rehearsal certificate authority is missing.', 'Regenerate it with the protected TLS command in docs/engineering/A07-PACKAGE.md.');
  done(`Rehearsal profile ready (${PROFILE_DIRECTORY.replace(REPOSITORY_ROOT, '')})`);

  // 2. Single instance ------------------------------------------------------
  const existingRun = supervisorRun();
  if (existingRun) {
    const { supervisorAlive } = await import('./orvia-cli.ts');
    if (!supervisorAlive(existingRun)) throw new OperatorError('A stale ORVIA supervisor journal requires inspection.', 'No automatic takeover or journal deletion is allowed.\n\nRun:\n  npm run status\n\nThen inspect .local/profiles/rehearsal/supervisor/run.json and follow docs/engineering/A07-PACKAGE.md.');
    process.stdout.write(`\n  ORVIA is already running for profile ${PROFILE}.\n\n  Workspace        ${ORIGIN}/workspace\n  Privacy Centre   ${ORIGIN}/privacy\n\n  Inspect it with:   npm run status\n  Stop it with:      npm stop\n\n`); process.exit(0);
  }
  if (!(await portFree(4330))) throw new OperatorError('Port 4330 is already in use, and it is not an ORVIA supervisor this command owns.', 'Something else is bound to the application port.\n\nCheck what ORVIA thinks is running:\n  npm run status\n\nThen stop the other listener, or stop ORVIA with:\n  npm stop');

  // 3. Backing services -----------------------------------------------------
  if (!dockerAvailable()) throw new OperatorError('Docker is not available.', 'ORVIA needs PostgreSQL, Temporal and OPA, which run as pinned Docker containers.\n\nStart Docker Desktop, wait for it to report running, then run:\n  npm start');
  done('Docker available');
  const { loadProfile } = await import('../packages/testing/src/config.ts');
  const profile = loadProfile(PROFILE);
  const running = runningServices(profile) ?? [];
  ownedServices = !COMPOSE_SERVICES.every(service => running.includes(service));
  if (ownedServices) {
    stage('Starting local services...');
    const services = await runScript('scripts/services.ts', ['up'], { quiet: true });
    if (services.code !== 0) { process.stdout.write(services.output); throw new OperatorError('The local service stack did not start.', 'No volume was removed and no data was reset.\n\nInspect the Docker output above, then run:\n  npm run status'); }
  }

  // 4. Service readiness ----------------------------------------------------
  stage('Waiting for PostgreSQL, Temporal and OPA...');
  const { checkServices } = await import('./service-readiness.ts');
  let checks = await checkServices(profile);
  for (let attempt = 0; attempt < 30 && Object.values(checks).some(check => check.result !== 'PASS'); attempt++) {
    await new Promise(r => setTimeout(r, 2000));
    checks = await checkServices(profile);
  }
  const failed = Object.entries(checks).filter(([, check]) => check.result !== 'PASS').map(([name]) => name);
  if (failed.length) throw new OperatorError(`These backing services did not become ready: ${failed.join(', ')}.`, 'Nothing was reset. The containers and their volumes are left exactly as they are.\n\nInspect them with:\n  npm run status\n\nFor a recorded service report:\n  npm run preflight');
  done('PostgreSQL ready'); done('Temporal ready'); done('OPA ready');

  // 5. Schema ---------------------------------------------------------------
  // Migrations are applied only when something is genuinely pending, so a normal
  // start neither re-runs them nor records a migration artifact for a no-op.
  const { connectDatabase } = await import('../packages/db/src/index.ts');
  const pool = connectDatabase(profile).pool;
  let pending: string[] = [];
  try {
    const present = await pool.query("SELECT to_regclass('public.bootstrap_migrations') AS name");
    const applied: string[] = present.rows[0].name ? (await pool.query('SELECT id FROM bootstrap_migrations')).rows.map((row: { id: string }) => row.id) : [];
    pending = readdirSync('packages/db/migrations').filter(file => /^\d{4}_[a-z_]+\.sql$/.test(file)).sort().map(file => file.slice(0, -4)).filter(id => !applied.includes(id));
  } finally { await pool.end(); }
  if (pending.length) {
    stage(`Applying ${pending.length} pending migration(s)...`);
    const migrated = await runScript('scripts/migrate.ts', [], { quiet: true });
    if (migrated.code !== 0) { process.stdout.write(migrated.output); throw new OperatorError('Database migration failed.', 'The migration runs in one transaction and was rolled back, so no partial schema was left behind.\n\nInspect the recorded artifact named in the output above.'); }
  }
  done(pending.length ? `Database migrated (${pending.length} applied)` : 'Database migrations current');

  // 6. Machine enrollment ---------------------------------------------------
  // Machine identities expire an hour after issue. Renewal goes through the same
  // protected command an operator would run, which preserves existing target
  // restrictions and never prints a token.
  stage('Renewing local machine enrollment...');
  const enrolled = await runScript('scripts/machine-init.ts', [`confirm:${PROFILE}`], { quiet: true });
  if (enrolled.code !== 0) { process.stdout.write(enrolled.output); throw new OperatorError('Machine enrollment could not be renewed.', 'No enrollment was removed and no permission was restored.\n\nConfirm the services are healthy and try again:\n  npm run status'); }
  done('Machine enrollment current');

  // 7. Production build -----------------------------------------------------
  const { buildInputIdentity, recordWebBuild, webBuildCurrent } = await import('./build-state.ts');
  const identity = buildInputIdentity();
  if (webBuildCurrent(PROFILE_DIRECTORY, identity)) done(`Production build current (${identity.files} inputs)`);
  else {
    stage('Building the application (first run after a source change)...');
    const built = await runScript('scripts/web.ts', ['build']);
    if (built.code !== 0) throw new OperatorError('The production build failed.', 'The previous build, if any, is untouched.\n\nFix the compilation errors reported above and run:\n  npm start');
    recordWebBuild(PROFILE_DIRECTORY, identity);
    done('Production build created');
  }

  // 8. Application supervisor ----------------------------------------------
  // app-run.ts owns the web, worker and agent children, takes the profile
  // advisory lock and writes the protected run journal. Its output is held back
  // until ORVIA is ready so the operator sees stages rather than a log wall; on
  // failure the held output is printed in full.
  stage('Starting the application...');
  const supervisor = spawn(toolchainExecutable(), ['--import', 'tsx', resolve(REPOSITORY_ROOT, 'scripts/app-run.ts'), `confirm:${PROFILE}`], {
    cwd: REPOSITORY_ROOT,
    windowsHide: true,
    // Windows sends Ctrl+C to every process sharing the console process group.
    // Keep the protected supervisor in its own group so only this top-level
    // command receives the interrupt and asks the supervisor to stop through
    // app-stop.ts. Otherwise web/worker/agent can die before their owner has a
    // chance to shut them down and remove its journal.
    detached: process.platform === 'win32',
    env: childEnvironment(),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const collect = (chunk: Buffer) => { if (streaming) process.stdout.write(chunk); else supervisorLog += chunk; };
  supervisor.stdout?.on('data', collect); supervisor.stderr?.on('data', collect);
  const supervisorClosed = once(supervisor, 'close') as Promise<[number | null]>;
  let closedWith: number | null | undefined;
  void supervisorClosed.then(([code]) => { closedWith = code; });

  let ready = false;
  const readinessDb = connectDatabase(profile).pool;
  try {
    for (let attempt = 0; attempt < 180 && closedWith === undefined && !ready; attempt++) {
      let worker = false; let agent = false;
      try {
        const currentRun = supervisorRun();
        const activity = currentRun ? (await readinessDb.query("SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE datname=current_database() AND application_name='orvia_worker') worker, EXISTS(SELECT 1 FROM app.audit_events a JOIN app.request_audit r ON r.id=a.request_id WHERE a.operation='machine.poll' AND a.actor_domain='MACHINE' AND r.status=200 AND a.created_at>$1) agent", [currentRun.started_at])).rows[0] : {};
        worker = Boolean(activity.worker); agent = Boolean(activity.agent);
      } catch { /* bounded startup; the supervisor output is printed on failure */ }
      ready = Boolean(supervisorRun()) && await httpsHealthy() && worker && agent;
      if (!ready) await new Promise(r => setTimeout(r, 1000));
    }
  } finally { await readinessDb.end(); }
  if (!ready) { process.stdout.write(supervisorLog); throw new OperatorError('The application did not become ready.', 'Owned processes were stopped and every store, credential and volume is retained.\n\nInspect the state with:\n  npm run status'); }
  streaming = true;
  done('Web ready'); done('Worker running'); done('Agent running');

  process.stdout.write(`\n  ORVIA is ready\n\n${line('Workspace', `${ORIGIN}/workspace`)}\n${line('Privacy Centre', `${ORIGIN}/privacy`)}\n\n  Sign-in credentials were generated locally during setup and stay in the\n  protected .local profile directory. They are never printed here and must not\n  be committed or shared.\n\n  Press Ctrl+C to stop ORVIA.\n\n`);

  const requestStop = () => {
    if (stopping) return;
    stopping = true;
    process.stdout.write('\n  [ORVIA] Stopping the application...\n');
    // Windows npm can close the console as soon as this handler returns. Block
    // until the protected supervisor acknowledges its exact run identity.
    if (closedWith === undefined && supervisorRun()) spawnSync(toolchainExecutable(), ['--import', 'tsx', resolve(REPOSITORY_ROOT, 'scripts/app-stop.ts'), `confirm:${PROFILE}`], {
      cwd: REPOSITORY_ROOT, windowsHide: true, stdio: 'inherit', env: childEnvironment(),
    });
  };
  process.on('SIGINT', requestStop); process.on('SIGTERM', requestStop);

  const [code] = await supervisorClosed;
  if (stopping || code === 0) {
    // Exit 0 also covers `npm stop` run from another terminal: the supervisor
    // honoured a valid protected stop request and shut its children down cleanly.
    stopping = true;
    if (code !== 0) process.exitCode = 1;
  } else { process.stdout.write(supervisorLog); process.stderr.write('\n  The application supervisor stopped unexpectedly. Every store, credential and volume is retained.\n\n  Inspect the state with:\n    npm run status\n\n'); process.exitCode = 1; }
} catch (error) {
  reportOperatorError(error);
  process.exitCode = 1;
} finally {
  // Stop only what this invocation started, and only ever with `stop`. No
  // command in this repository removes a volume, and this one does not either.
  if (ownedServices) { process.stdout.write('  [ORVIA] Stopping local services (volumes and data are retained)...\n'); await runScript('scripts/services.ts', ['stop'], { quiet: true }); }
  if (stopping) process.stdout.write('\n  ORVIA stopped. The PostgreSQL volume, Temporal state, rehearsal profile,\n  credentials, evidence and synthetic business history are all retained.\n\n');
}
