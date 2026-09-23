/**
 * `npm stop` — stop the whole ORVIA stack safely from any terminal.
 *
 * The application is stopped through the existing protected request file, which
 * the running supervisor validates against its own run identity. No PID is
 * chosen, signalled or killed here. Backing services are then stopped with
 * `docker compose stop`, which keeps the PostgreSQL volume and Temporal state.
 * Nothing is deleted or reset.
 */
import { PROFILE, OperatorError, dockerAvailable, reportOperatorError, runScript, stage, supervisorAlive, supervisorRun, REPOSITORY_ROOT } from './orvia-cli.ts';

process.chdir(REPOSITORY_ROOT);
process.env.ORVIA_PROFILE = PROFILE;

try {
  const run = supervisorRun();
  if (run && !supervisorAlive(run)) throw new OperatorError('A stale ORVIA supervisor journal requires inspection.', 'No arbitrary process is stopped and the journal is not deleted automatically.\n\nInspect .local/profiles/rehearsal/supervisor/run.json and follow docs/engineering/local-packaging-and-operation.md.');
  if (run) {
    stage('Stopping the application (web, worker, agent)...');
    const stopped = await runScript('scripts/app-stop.ts', [`confirm:${PROFILE}`], { quiet: true });
    if (stopped.code !== 0) { process.stdout.write(stopped.output); throw new OperatorError('The application supervisor did not acknowledge the stop request.', 'No process was force-terminated and no store was removed.\n\nInspect the protected supervisor journal and the running processes, then see:\n  docs/engineering/local-packaging-and-operation.md'); }
    process.stdout.write('  ok   Application stopped\n');
  } else process.stdout.write('  ok   No ORVIA application supervisor is running\n');

  if (dockerAvailable()) {
    stage('Stopping local services (volumes and data are retained)...');
    const services = await runScript('scripts/services.ts', ['stop'], { quiet: true });
    if (services.code !== 0) { process.stdout.write(services.output); throw new OperatorError('The local services did not stop cleanly.', 'No volume was removed.\n\nInspect them with:\n  npm run status'); }
    process.stdout.write('  ok   Local services stopped\n');
  } else process.stdout.write('  ok   Docker is not available; no service was stopped\n');

  process.stdout.write('\n  ORVIA stopped. The PostgreSQL volume, Temporal state, rehearsal profile,\n  credentials, evidence and synthetic business history are all retained.\n\n');
} catch (error) { reportOperatorError(error); process.exitCode = 1; }
