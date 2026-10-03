// Start the two already-provisioned synthetic installations from this build.
// No migration, reset, role, resource-limit or fixture mutation is performed.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, openSync, closeSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { webProcess } from '../../scripts/web-process.ts';
import { PROFILES } from '../../shared/contracts/src/index.ts';
import { writePrivateJson } from '../../scripts/local-private.ts';
const root = process.cwd();
const directory = resolve('.local/round6'); mkdirSync(directory, { recursive: true });
for (const profile of ['codex-a00', 'vendor-a00'] as const) {
  const server = createServer();
  await new Promise<void>((ok, fail) => { server.once('error', fail); server.listen(PROFILES[profile].app_port, '127.0.0.1', () => server.close(() => ok())); });
}
const processes: { profile: string; pid: number | undefined; origin: string }[] = [];
for (const profile of ['codex-a00', 'vendor-a00'] as const) {
  const command = webProcess({ profile, app_port: PROFILES[profile].app_port });
  const stdout = openSync(resolve(directory, profile + '.stdout.log'), 'a');
  const stderr = openSync(resolve(directory, profile + '.stderr.log'), 'a');
  const child = spawn(process.execPath, command.args, { cwd: command.cwd, env: { ...command.env, ORVIA_PROFILE: profile }, windowsHide: true, detached: true, stdio: ['ignore', stdout, stderr] });
  child.unref(); closeSync(stdout); closeSync(stderr);
  processes.push({ profile, pid: child.pid, origin: `http://127.0.0.1:${PROFILES[profile].app_port}` });
}
writePrivateJson(resolve(directory, 'runtime.json'), { root, build: readFileSync('frontend/.next/BUILD_ID', 'utf8').trim(), started: new Date().toISOString(), processes });
const customer = JSON.parse(readFileSync('.local/profiles/codex-a00/auth/bootstrap.json', 'utf8')).users;
const vendor = JSON.parse(readFileSync('.local/profiles/vendor-a00/auth/e2e-users.json', 'utf8'));
writePrivateJson(resolve(directory, 'sign-in-details.json'), {
  warning: 'Synthetic local demo only. Keep this untracked file private. Authenticator setup URIs generate rotating MFA codes.',
  customer_url: processes[0]!.origin + '/workspace/sign-in', vendor_url: processes[1]!.origin + '/vendor/sign-in',
  client_owner: { email: customer.owner.email, password: customer.owner.password, authenticator_uri: customer.owner.totp_uri },
  client_reviewer: { email: customer.reviewer.email, password: customer.reviewer.password, authenticator_uri: customer.reviewer.totp_uri },
  vendor_administrator: { email: vendor.admin.email, password: vendor.admin.password, authenticator_uri: vendor.admin.totp },
  lead_auditor: { email: vendor.lead.email, password: vendor.lead.password, authenticator_uri: vendor.lead.totp },
});
for (const process of processes) {
  let ready = false;
  for (let i = 0; i < 90; i++) {
    try { ready = (await fetch(process.origin + '/readyz', { signal: AbortSignal.timeout(2000) })).ok; } catch { /* bounded readiness */ }
    if (ready) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  if (!ready) throw new Error(process.profile + ' did not become ready; inspect .local/round6 logs');
}
console.log(JSON.stringify({ result: 'READY', processes, sign_in_file: '.local/round6/sign-in-details.json' }));
