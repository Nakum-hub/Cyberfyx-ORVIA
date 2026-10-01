// Explicitly started, bounded, metadata-only diagnostic. Never a qualification test.
import pg from 'pg';
import { writeFileSync, appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { freemem, totalmem } from 'node:os';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { loadProfile, safeArtifactPath } from '../../shared/testing/src/config.ts';

const profile = loadProfile();
if (profile.profile !== 'codex-a00') throw new Error('Synthetic codex-a00 profile required');
const label = process.env.R8_METRIC_LABEL;
if (!label || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(label)) throw new Error('Unique safe R8_METRIC_LABEL required');
const duration = Number(process.env.R8_METRIC_DURATION_MS ?? 1_200_000);
if (!Number.isInteger(duration) || duration < 1000 || duration > 1_200_000) throw new Error('Sampler duration must be 1000..1200000 ms');
const file = safeArtifactPath(resolve('handoffs/codex/artifacts', `R8-${label}-postgres-samples.jsonl`));
writeFileSync(file, '', { flag: 'wx' });
const record = (value: unknown) => appendFileSync(file, JSON.stringify(value) + '\n');
const pool = new pg.Pool({ host: '127.0.0.1', port: profile.postgres_port, database: profile.database,
  user: 'orvia_migrator', password: profile.password, max: 1,
  connectionTimeoutMillis: 3000, query_timeout: 3000, statement_timeout: 2000,
  options: '-c default_transaction_read_only=on', application_name: 'orvia-round8-metadata-sampler' });
const delay = monitorEventLoopDelay({ resolution: 20 });
let stopped = false;
let wake: (() => void) | undefined;
const stop = () => { stopped = true; wake?.(); };
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
const sleep = (ms: number) => new Promise<void>(done => {
  const timer = setTimeout(() => { wake = undefined; done(); }, ms);
  wake = () => { clearTimeout(timer); wake = undefined; done(); };
});
// SQL is used only within PostgreSQL to classify operations. No query text,
// parameters, credentials, actor/scope values, or statement fragments are returned.
const sampleSql = `SELECT clock_timestamp() AS observed_at, pid, application_name, state,
  wait_event_type, wait_event, query_start, xact_start, pg_blocking_pids(pid) AS blocking_pids,
  CASE WHEN ltrim(query) ~* '^INSERT[[:space:]]+INTO[[:space:]]+app[.]audit_events([[:space:]]|[(])' THEN 'AUDIT_INSERT'
       WHEN ltrim(query) ~* '^SELECT([[:space:]]|$)' THEN 'SELECT'
       WHEN ltrim(query) ~* '^INSERT([[:space:]]|$)' THEN 'INSERT'
       WHEN ltrim(query) ~* '^UPDATE([[:space:]]|$)' THEN 'UPDATE'
       WHEN ltrim(query) ~* '^DELETE([[:space:]]|$)' THEN 'DELETE'
       ELSE 'OTHER' END AS operation_class
  FROM pg_stat_activity
  WHERE datname=current_database() AND pid<>pg_backend_pid()
    AND application_name LIKE 'orvia-%'
    AND (state <> 'idle' OR (wait_event_type IS NOT NULL AND wait_event_type <> 'Client'))
  ORDER BY pid`;
try {
  const identity = (await pool.query('SELECT installation_id,profile FROM bootstrap_profile WHERE singleton=1')).rows;
  if (identity.length !== 1 || identity[0].installation_id !== profile.installation_id || identity[0].profile !== profile.profile) throw new Error('Sampler installation identity mismatch');
  record({ kind: 'START', at: new Date().toISOString(), diagnostic_only: true, interval_ms: 400,
    maximum_duration_ms: duration, host_total_bytes: totalmem(), read_only: true });
  delay.enable();
  const deadline = performance.now() + duration;
  let previousUtilization = performance.eventLoopUtilization();
  while (!stopped && performance.now() < deadline) {
    const started = performance.now();
    const at = new Date().toISOString();
    try {
      const result = await pool.query(sampleSql);
      const utilization = performance.eventLoopUtilization(previousUtilization);
      previousUtilization = performance.eventLoopUtilization();
      record({ kind: 'SAMPLE', at, ended_at: new Date().toISOString(), elapsed_ms: Math.round(performance.now() - started),
        connections: result.rows, host_available_bytes: freemem(), sampler_event_loop_utilization: utilization.utilization,
        sampler_event_loop_delay_mean_ms: Number.isFinite(delay.mean) ? delay.mean / 1e6 : null,
        sampler_event_loop_delay_max_ms: delay.max / 1e6 });
      delay.reset();
    } catch (error) {
      // Never serialize a PG error/message: it may contain query values.
      record({ kind: 'SAMPLE_ERROR', at, elapsed_ms: Math.round(performance.now() - started),
        error_class: error instanceof Error ? error.name : 'UnknownError', host_available_bytes: freemem() });
      process.exitCode = 1;
      break;
    }
    if (!stopped) await sleep(Math.max(0, Math.min(400 - (performance.now() - started), deadline - performance.now())));
  }
  record({ kind: 'STOP', at: new Date().toISOString(), reason: stopped ? 'SIGNAL' : 'DURATION_LIMIT' });
} catch (error) {
  record({ kind: 'SETUP_ERROR', at: new Date().toISOString(), error_class: error instanceof Error ? error.name : 'UnknownError' });
  process.exitCode = 1;
} finally {
  delay.disable();
  process.removeListener('SIGTERM', stop);
  process.removeListener('SIGINT', stop);
  await pool.end();
}
