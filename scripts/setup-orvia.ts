/**
 * `npm run setup` — the explicit one-time installation command.
 *
 * It is exactly the established fresh-installation procedure: the wrapper
 * refuses an existing rehearsal profile rather than overwriting it, and it
 * never deletes anything. `npm start` runs this same script automatically when
 * it finds no installation at all.
 */
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { OperatorError, REPOSITORY_ROOT, childEnvironment, profileState, reportOperatorError, stage } from './orvia-cli.ts';

process.chdir(REPOSITORY_ROOT);

try {
  if (process.platform !== 'win32') throw new OperatorError('First-run setup is Windows-only.', 'The tested host for this prototype is Windows x64 with Docker Desktop.\n\nSee: docs/engineering/local-packaging-and-operation.md');
  const state = profileState();
  if (state === 'CONFIGURED') throw new OperatorError('ORVIA is already installed for the rehearsal profile.', 'Setup will not overwrite an existing installation, its credentials or its data.\n\nStart it with:\n  npm start');
  if (state === 'PARTIAL') throw new OperatorError('ORVIA rehearsal profile is partially initialized.', 'Automatic overwrite is disabled.\n\nResume the individual commands in docs/engineering/local-packaging-and-operation.md.');

  stage('Provisioning the pinned toolchain and the rehearsal installation...');
  const setup = spawn('powershell', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', resolve(REPOSITORY_ROOT, 'scripts/setup-rehearsal.ps1')], { cwd: REPOSITORY_ROOT, windowsHide: true, stdio: 'inherit', env: childEnvironment() });
  const [code] = await once(setup, 'close') as [number | null];
  if (code !== 0) throw new OperatorError('Setup did not complete.', 'Nothing was reset and any state it created is retained.\n\nCorrect the cause reported above and resume the individual commands in docs/engineering/local-packaging-and-operation.md.');
  process.stdout.write('\n  Setup complete. Generated credentials and TLS material stay in the protected\n  .local profile directory and must not be committed or shared.\n\n  Start ORVIA with:\n    npm start\n\n');
} catch (error) { reportOperatorError(error); process.exitCode = 1; }
