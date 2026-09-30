import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { loadProfile } from '../../shared/testing/src/config.ts';
if (process.env.ORVIA_PROFILE !== 'rehearsal') throw new Error('Isolated rehearsal only');
const read = path => JSON.parse(readFileSync(path, 'utf8'));
const runPath = '.local/profiles/rehearsal/supervisor/run.json';
const run = existsSync(runPath) ? read(runPath) : null;
const profile = loadProfile();
const services = ['postgres', 'loopback', 'temporal', 'opa'];
const containers = services.map(service => {
  const name = `orvia-rehearsal-${service}-1`;
  return { name, ...JSON.parse(execFileSync('docker', ['inspect', name, '--format', '{"state":{{json .State}},"restarts":{{.RestartCount}},"memory_bytes":{{.HostConfig.Memory}}}'], { encoding: 'utf8' })) };
});
let httpsStatus = null;
try { httpsStatus = (await fetch('https://127.0.0.1:4330/readyz', { signal: AbortSignal.timeout(10000) })).status; } catch { /* Retain failed readiness as null. */ }
const result = {
  fixture: 'SYNTHETIC_ONLY', recorded_at: new Date().toISOString(),
  source: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  tracked_changes: execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], { encoding: 'utf8' }).trim(),
  installation_id_retained: profile.installation_id === read('.local/qualification/first-run.json').installation_id,
  installation: read('.local/installer/installation.json'), upgrade: read('.local/installer/last-upgrade.json'),
  supervisor: run ? { started_at: run.started_at, observed_seconds: Math.floor((Date.now() - Date.parse(run.started_at)) / 1000) } : null,
  https_readiness_status: httpsStatus, containers,
};
writeFileSync('/qualification/public-final-state.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ source: result.source, supervisor_seconds: result.supervisor?.observed_seconds, httpsStatus, identity_retained: result.installation_id_retained }));
