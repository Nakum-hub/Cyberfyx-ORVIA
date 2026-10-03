/**
 * `npm run start:vendor` — starts the vendor's own installation (VENDOR_SERVICE: vendor staff, auditors and client
 * accounts) beside the customer installation that `npm start` runs, for a demonstration on one machine.
 *
 * In development the vendor installation shares the codex-a00 PostgreSQL server (scripts/vendor-init.ts). This command
 * only starts what already exists: it refuses, with the exact next step, if the vendor profile was never provisioned.
 * It never creates accounts, resets anything or removes a volume. Ctrl+C stops the vendor web process; the shared
 * database server is left running if something else started it.
 */
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PROFILES } from '../shared/contracts/src/index.ts';
import { webProcess } from './web-process.ts';
import { childEnvironment, toolchainExecutable } from './orvia-cli.ts';

if (process.env.ORVIA_VENDOR_REEXEC !== '1') {
  const child = spawnSync(toolchainExecutable(), ['--import', 'tsx', fileURLToPath(import.meta.url)], { stdio: 'inherit', windowsHide: true,
    env: { ...childEnvironment(), ORVIA_PROFILE: 'vendor-a00', ORVIA_VENDOR_REEXEC: '1' } });
  process.exit(child.status ?? 1);
}

const vendor = PROFILES['vendor-a00'];
const origin = `http://127.0.0.1:${vendor.app_port}`;
const say = (text: string) => process.stdout.write(`${text}\n`);
say('\n  ORVIA vendor service\n  ------------------------------------------------------------');
if (!existsSync(resolve('.local/profiles/vendor-a00/installation.json'))) {
  say('  The vendor installation has not been set up on this machine.\n\n  Set it up once with:\n    npm run vendor:init confirm:vendor-a00\n  then open http://127.0.0.1:4340/vendor/setup to create the first vendor administrator.\n');
  process.exit(1);
}
if (!existsSync(resolve('frontend/.next/BUILD_ID'))) { say('  No production build yet. Run npm start once first; it builds the application.\n'); process.exit(1); }
const ready = async () => { try { return (await fetch(`${origin}/readyz`, { signal: AbortSignal.timeout(2000) })).ok; } catch { return false; } };
if (await ready()) { say(`  The vendor service is already running.\n\n  Vendor sign-in    ${origin}/vendor/sign-in\n`); process.exit(0); }

// The shared PostgreSQL server (codex-a00 compose project). `up` starts only what is not running; volumes are kept.
say('  ..   Starting the vendor database server (shared with the development profile)');
const services = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/services.ts', 'up'], { stdio: 'ignore', windowsHide: true, env: { ...process.env, ORVIA_PROFILE: 'codex-a00' } });
if (services.status !== 0) { say('  The vendor database server did not start. Check that Docker is running, then try again.\n'); process.exit(1); }

const command = webProcess({ profile: 'vendor-a00', app_port: vendor.app_port });
const web = spawn(process.execPath, command.args, { cwd: command.cwd, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'], env: { ...command.env, ORVIA_PROFILE: 'vendor-a00', NEXT_TELEMETRY_DISABLED: '1' } });
let diagnostics = ''; web.stderr?.on('data', chunk => { diagnostics = (diagnostics + chunk).slice(-4000); });
let up = false;
for (let i = 0; i < 120 && web.exitCode === null && !up; i++) { up = await ready(); if (!up) await new Promise(r => setTimeout(r, 500)); }
if (!up) { say(`  The vendor service did not become ready.\n${diagnostics}`); web.kill(); process.exit(1); }
say(`  ok   Vendor service ready\n\n  Vendor sign-in    ${origin}/vendor/sign-in\n  Client accounts   ${origin}/vendor/sign-in?account=client\n\n  Press Ctrl+C to stop the vendor service.\n`);
const stop = () => { if (web.exitCode === null) web.kill(); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
const [code] = await once(web, 'close') as [number | null];
say('\n  Vendor service stopped. Its database and accounts are kept.\n');
process.exit(code === null || code === 0 ? 0 : 1);
