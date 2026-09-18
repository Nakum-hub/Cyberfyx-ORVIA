/**
 * Shared plumbing for the operator-facing commands (`npm start`, `npm stop`,
 * `npm run status`, `npm run setup`).
 *
 * These commands are a thin, safe layer over the existing protected engineering
 * scripts. Nothing here reimplements service, credential, migration or
 * supervisor logic, and nothing here weakens a check that those scripts make.
 */
import { spawn, spawnSync, type SpawnOptions } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { request } from 'node:https';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export const REPOSITORY_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const PROFILE = 'rehearsal';
export const PROFILE_DIRECTORY = resolve(REPOSITORY_ROOT, '.local/profiles', PROFILE);
export const SUPERVISOR_JOURNAL = resolve(PROFILE_DIRECTORY, 'supervisor/run.json');
export const CA_CERTIFICATE = resolve(PROFILE_DIRECTORY, 'tls/ca-cert.pem');
export const ORIGIN = 'https://127.0.0.1:4330';

/** The exact Node the repository pins. An operator is never silently given another one. */
export const PINNED_NODE = (JSON.parse(readFileSync(resolve(REPOSITORY_ROOT, 'package.json'), 'utf8')) as { engines: { node: string } }).engines.node;
export const WORKSPACE_NODE = resolve(REPOSITORY_ROOT, `.local/tools/node-v${PINNED_NODE}-win-x64/node.exe`);

/**
 * Files written by the one-time rehearsal setup. Present means configured;
 * absent means a fresh installation; a mixture means a setup that stopped part
 * way, which is never repaired or overwritten automatically.
 */
export const PROFILE_MARKERS = ['config.json', 'postgres-password', 'tls/ca-cert.pem', 'tls/server-cert.pem', 'tls/server-key.pem', 'auth/bootstrap.json'];

export type ProfileState = 'ABSENT' | 'PARTIAL' | 'CONFIGURED';
export function profileState(): ProfileState {
  const present = PROFILE_MARKERS.filter(marker => existsSync(resolve(PROFILE_DIRECTORY, marker)));
  if (present.length === PROFILE_MARKERS.length) return 'CONFIGURED';
  return present.length === 0 && !existsSync(resolve(PROFILE_DIRECTORY, 'config.json')) ? 'ABSENT' : 'PARTIAL';
}

/** An operator failure carries its own guidance; it never carries a raw service error. */
export class OperatorError extends Error {
  constructor(readonly summary: string, readonly guidance: string) { super(summary); this.name = 'OperatorError'; }
}

export function reportOperatorError(error: unknown) {
  if (error instanceof OperatorError) { process.stderr.write(`\n  ${error.summary}\n\n  ${error.guidance.replaceAll('\n', '\n  ')}\n\n`); return; }
  process.stderr.write(`\n  ORVIA could not complete the request.\n\n  ${error instanceof Error ? error.name : 'Error'}: see the output above, then run:\n    npm run status\n\n`);
}

/** Environment every delegated child inherits: pinned profile, local CA trust, no telemetry. */
export function childEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    ORVIA_PROFILE: PROFILE,
    ORVIA_WORKSPACE_ROOT: REPOSITORY_ROOT,
    NEXT_TELEMETRY_DISABLED: '1', DO_NOT_TRACK: '1', BETTER_AUTH_TELEMETRY: '0',
    // Certificate verification stays on. This points Node at the protected local
    // CA so the readiness probe can validate the rehearsal certificate properly
    // instead of disabling validation.
    ...(existsSync(CA_CERTIFICATE) ? { NODE_EXTRA_CA_CERTS: CA_CERTIFICATE } : {}),
  };
}

/** The Node used for every delegated script: the pinned workspace toolchain, or nothing. */
export function toolchainExecutable() {
  if (existsSync(WORKSPACE_NODE)) return WORKSPACE_NODE;
  if (process.versions.node === PINNED_NODE) return process.execPath;
  throw new OperatorError(
    `ORVIA requires Node ${PINNED_NODE} and the workspace toolchain is not installed.`,
    `This machine is running Node ${process.versions.node}.\n\nProvision the pinned toolchain once:\n  npm run setup\n\nor, to install only the toolchain:\n  powershell -ExecutionPolicy Bypass -File scripts/bootstrap-tools.ps1`);
}

export type RunResult = { code: number; output: string };

/** Run a repository script under the pinned toolchain, capturing its output. */
export function runScript(script: string, args: string[] = [], options: { quiet?: boolean } = {}): Promise<RunResult> {
  return new Promise(done => {
    const child = spawn(toolchainExecutable(), ['--import', 'tsx', resolve(REPOSITORY_ROOT, script), ...args], { cwd: REPOSITORY_ROOT, windowsHide: true, env: childEnvironment(), stdio: ['ignore', 'pipe', 'pipe'] } as SpawnOptions);
    let output = '';
    const collect = (chunk: Buffer) => { output += chunk; if (!options.quiet) process.stdout.write(chunk); };
    child.stdout?.on('data', collect); child.stderr?.on('data', collect);
    child.on('error', error => { output += `\nLaunch error: ${(error as NodeJS.ErrnoException).code ?? 'UNKNOWN'}\n`; });
    child.on('close', code => done({ code: code ?? 1, output }));
  });
}

/**
 * Compose needs the profile's project name, database, ports and secret
 * directory, exactly as scripts/services.ts supplies them. Read-only queries
 * need the same values or Compose refuses to interpolate the file at all.
 */
export function composeEnvironment(profile: { compose_project: string; database: string; postgres_port: number; opa_port: number; temporal_port: number; temporal_namespace: string; directory: string }): NodeJS.ProcessEnv {
  return { ...childEnvironment(), ORVIA_COMPOSE_PROJECT: profile.compose_project, ORVIA_DATABASE: profile.database, ORVIA_POSTGRES_PORT: String(profile.postgres_port), ORVIA_OPA_PORT: String(profile.opa_port), ORVIA_TEMPORAL_PORT: String(profile.temporal_port), ORVIA_TEMPORAL_NAMESPACE: profile.temporal_namespace, ORVIA_SECRET_DIRECTORY: profile.directory };
}

/** Read-only docker query. Mutations always go through scripts/services.ts. */
export function docker(args: string[], env: NodeJS.ProcessEnv = childEnvironment()) {
  return spawnSync('docker', args, { cwd: REPOSITORY_ROOT, encoding: 'utf8', windowsHide: true, env });
}

/** Names of the Compose services currently reported as running, or null when Docker is unavailable. */
export function runningServices(profile: Parameters<typeof composeEnvironment>[0]) {
  if (!dockerAvailable()) return null;
  const listed = docker(['compose', '-f', 'infrastructure/compose.yaml', 'ps', '--services', '--status', 'running'], composeEnvironment(profile));
  return listed.status === 0 ? listed.stdout.split(/\r?\n/).map(name => name.trim()).filter(Boolean) : null;
}

export function dockerAvailable() {
  const probe = docker(['version', '--format', '{{.Server.Os}}']);
  return probe.status === 0;
}

export async function portFree(port: number) {
  const probe = createServer();
  return await new Promise<boolean>(done => { probe.once('error', () => done(false)); probe.listen(port, '127.0.0.1', () => probe.close(() => done(true))); });
}

/** The supervisor's protected journal, when one is present. Never contains a secret. */
export type SupervisorRun = { run_id: string; profile: string; pid: number; started_at: string };
export function supervisorRun(): SupervisorRun | null {
  if (!existsSync(SUPERVISOR_JOURNAL)) return null;
  try { return JSON.parse(readFileSync(SUPERVISOR_JOURNAL, 'utf8')); } catch { return null; }
}

/** A journal is ownership evidence only while its exact recorded process lives. */
export function supervisorAlive(run: SupervisorRun | null = supervisorRun()) {
  if (!run || !Number.isSafeInteger(run.pid) || run.pid <= 0) return false;
  try { process.kill(run.pid, 0); return true; } catch { return false; }
}

export async function httpsHealthy() {
  if (!existsSync(CA_CERTIFICATE)) return false;
  return await new Promise<boolean>(done => {
    const probe = request(`${ORIGIN}/healthz`, {
      ca: readFileSync(CA_CERTIFICATE),
      rejectUnauthorized: true,
      timeout: 2000,
    }, response => {
      response.resume();
      done(Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 300));
    });
    probe.once('timeout', () => probe.destroy(new Error('ORVIA health probe timed out')));
    probe.once('error', () => done(false));
    probe.end();
  });
}

export const line = (label: string, value: string) => `  ${label.padEnd(17)}${value}`;
export const stage = (message: string) => process.stdout.write(`  [ORVIA] ${message}\n`);
export const done = (message: string) => process.stdout.write(`  ok   ${message}\n`);
