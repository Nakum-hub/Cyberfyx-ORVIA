import { appendFileSync, existsSync, writeFileSync } from 'node:fs';
import { cpus, freemem, totalmem } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { performance } from 'node:perf_hooks';
import { PROFILES } from '../../shared/contracts/src/index.ts';
const exec = promisify(execFile);
const label = process.env.R7_METRIC_LABEL ?? 'firefox';
if (!/^[a-z-]+$/.test(label)) throw new Error('Invalid metric label');
const file = `handoffs/codex/artifacts/R7V-${label}-opa-host-samples.jsonl`;
const containers = ['postgres', 'opa', 'loopback'].map(name => `orvia-qualification-20260930-${name}`);
const record = (value: unknown) => appendFileSync(file, JSON.stringify(value) + '\n');
const cpu = () => cpus().reduce((sum, c) => ({ idle: sum.idle + c.times.idle, total: sum.total + Object.values(c.times).reduce((a, b) => a + b, 0) }), { idle: 0, total: 0 });
let previous = cpu(); let stopped = false;
process.on('SIGTERM', () => { stopped = true; });
writeFileSync(file, '');
try {
  const limits = await exec('docker', ['inspect', '--format', '{{.Name}} memory={{.HostConfig.Memory}} nano_cpus={{.HostConfig.NanoCpus}} cpu_quota={{.HostConfig.CpuQuota}} cpu_period={{.HostConfig.CpuPeriod}}', ...containers], { windowsHide: true, timeout: 15_000 });
  record({ at: new Date().toISOString(), limits: limits.stdout.trim().split('\n'), host_cpu_count: cpus().length, host_total_bytes: totalmem() });
} catch { record({ at: new Date().toISOString(), limits_error: true }); }
while (!stopped && !existsSync(`.local/round7-${label}-metrics-stop`)) {
  const at = new Date().toISOString(); const started = performance.now();
  const probe = (async () => {
    try {
      const response = await fetch(`http://127.0.0.1:${PROFILES['codex-a00'].opa_port}/v1/data/orvia/admin/authorize`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({ input: { actor_domain: 'STAFF', role: 'AUDITOR', capability: 'grc.read', mfa_verified: true } }),
      });
      await response.arrayBuffer(); return { status: response.status, elapsed_ms: Math.round(performance.now() - started) };
    } catch (error) { return { error: error instanceof Error ? error.name : 'unknown', elapsed_ms: Math.round(performance.now() - started) }; }
  })();
  const stats = exec('docker', ['stats', '--no-stream', '--format', '{{json .}}', ...containers], { windowsHide: true, timeout: 15_000 })
    .then(result => result.stdout.trim().split('\n').filter(Boolean).map(line => JSON.parse(line)), () => ({ error: 'stats_failed' }));
  const [opa, docker] = await Promise.all([probe, stats]);
  const current = cpu(); const delta = current.total - previous.total;
  record({ at, ended_at: new Date().toISOString(), opa, docker, host_cpu_percent: delta ? Number((100 * (1 - (current.idle - previous.idle) / delta)).toFixed(2)) : null, host_available_bytes: freemem() });
  previous = current;
  await new Promise(resolve => setTimeout(resolve, 5000));
}
