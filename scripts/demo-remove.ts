/**
 * `npm run demo:remove` — removes the demonstration data by restoring the snapshot `npm run demo:data` took before it
 * loaded anything (rehearsal installation only).
 *
 * ORVIA's consent history, audit trail and receipts are append-only by design, so demonstration records are not deleted
 * one by one: both rehearsal databases go back to exactly how they were before loading, together with the sign-in
 * journal of that moment, so every account and its authenticator stay in step. Anything recorded after loading,
 * demonstration or not, is removed too, which is why ORVIA must be stopped and the command asks for confirmation.
 */
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { childEnvironment, toolchainExecutable, supervisorRun, portFree } from './orvia-cli.ts';

if (process.env.ORVIA_DEMO_REEXEC !== '1') {
  const child = spawnSync(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url), ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env: { ...childEnvironment(), ORVIA_DEMO_REEXEC: '1' } });
  process.exit(child.status ?? 1);
}
const { loadProfile } = await import('../shared/testing/src/config.ts');
const profile = loadProfile();
const say = (text: string) => process.stdout.write(`${text}\n`);
if (profile.profile !== 'rehearsal') throw new Error('Demonstration data exists only on the rehearsal installation.');
const snapshots = resolve(profile.directory, 'snapshots');
const files = [profile.database, `${profile.database}_targets`].map(db => ({ db, file: resolve(snapshots, `before-demo-data-${db}.dump`) }));
const journal = resolve(snapshots, 'before-demo-data-bootstrap.json');
if (files.some(f => !existsSync(f.file)) || !existsSync(journal)) { say('\n  No snapshot from npm run demo:data was found, so there is nothing to restore. Nothing was changed.\n'); process.exit(1); }
if (process.argv[2] !== 'confirm:rehearsal') {
  say('\n  This restores the rehearsal databases to the moment before the demonstration data was loaded.\n  Everything recorded since then is removed. To go ahead, stop ORVIA (npm stop) and run:\n    npm run demo:remove -- confirm:rehearsal\n');
  process.exit(1);
}
if (supervisorRun() || !(await portFree(4330))) { say('\n  ORVIA is still running. Stop it first with npm stop, then run this again. Nothing was changed.\n'); process.exit(1); }

const container = `${profile.compose_project}-postgres-1`;
spawnSync('docker', ['start', container], { stdio: 'ignore', windowsHide: true });
for (let i = 0; i < 30 && spawnSync('docker', ['exec', container, 'pg_isready', '-q'], { windowsHide: true }).status !== 0; i++) await new Promise(r => setTimeout(r, 1000));
const env = { ...process.env, PGPASSWORD: profile.password };
const open = spawnSync('docker', ['exec', '-e', 'PGPASSWORD', container, 'psql', '-h', '127.0.0.1', '-U', 'orvia_migrator', '-d', 'postgres', '-Atc',
  `SELECT count(*) FROM pg_stat_activity WHERE datname LIKE '${profile.database}%' AND pid <> pg_backend_pid()`], { env, encoding: 'utf8', windowsHide: true });
if (open.status !== 0 || open.stdout.trim() !== '0') { say('\n  Something is still connected to the rehearsal databases. Stop ORVIA and anything using them, then try again. Nothing was changed.\n'); process.exit(1); }
for (const { db, file } of files) {
  const restore = spawnSync('docker', ['exec', '-i', '-e', 'PGPASSWORD', container, 'pg_restore', '-h', '127.0.0.1', '-U', 'orvia_migrator', '-d', db, '--clean', '--if-exists', '--single-transaction'],
    { env, input: readFileSync(file), maxBuffer: 64 * 1024 * 1024, windowsHide: true });
  if (restore.status !== 0) { say(`\n  Restoring ${db} failed; that database was left exactly as it was (one transaction).\n${String(restore.stderr).slice(-2000)}`); process.exit(1); }
  say(`  ok   ${db} restored`);
}
copyFileSync(journal, resolve(profile.directory, 'auth/bootstrap.json'));
rmSync(resolve(profile.directory, 'demo/dataset.json'), { force: true });
rmSync(resolve('.local/demo-accounts.txt'), { force: true });
say('\n  The demonstration data is removed. Start ORVIA again with npm start.\n');
