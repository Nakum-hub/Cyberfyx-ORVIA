// Authorization policy cold start and restart (cross-cutting qualification, local runtime).
// Restarts the profile's OPA container and measures what a request would meet:
// the policy is unreachable for a moment, readiness stays false until an allow
// and a deny control both answer within the production deadline, request-time
// authorization fails closed with 503 while the engine is down, and warm
// decisions stay far inside the deadline. Nothing is relaxed to pass.
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { runtimeConfig } from '../../../backend/auth/src/config.ts';
import { authorizationReady, requireCapability, AccessError } from '../../../backend/authorization/src/index.ts';
import { PROFILES } from '../../../shared/contracts/src/index.ts';
import { writeEvidence } from '../../../shared/testing/src/evidence.ts';

const config = runtimeConfig();
const container = `${PROFILES[config.profile as keyof typeof PROFILES].compose_project}-opa-1`;
const results: { name: string; result: 'PASS' | 'FAIL'; actual?: unknown }[] = [];
const check = (name: string, actual: unknown, expected: unknown) => { try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); } catch { results.push({ name, result: 'FAIL', actual }); console.log(`FAIL ${name} ${JSON.stringify({ expected, actual })}`); process.exitCode = 1; } };
const docker = (...args: string[]) => { const r = spawnSync('docker', args, { encoding: 'utf8' }); if (r.status !== 0) throw new Error(`docker ${args[0]} failed`); };
const auditor = { actor_id: '00000000-0000-4000-8000-000000000001', actor_domain: 'STAFF' as const, role: 'AUDITOR', scope: { tenant_id: '00000000-0000-4000-8000-000000000002', legal_entity_id: '00000000-0000-4000-8000-000000000003', environment_id: '00000000-0000-4000-8000-000000000004' }, capabilities: ['grc.read'], expires_at: new Date(Date.now() + 3600_000).toISOString(), mfa_verified: false };
const outcome = async () => { try { await requireCapability(config, auditor, 'STAFF', 'grc.read'); return 'ALLOWED'; } catch (e) { return e instanceof AccessError ? `${e.status}` : 'ERROR'; } };
const measurements: Record<string, unknown> = {};
try {
  check('the warm policy is ready before the test', (await authorizationReady(config)).ready, true);
  docker('stop', container);
  check('with the engine stopped, readiness is false', (await authorizationReady(config)).ready, false);
  check('with the engine stopped, request authorization fails closed', await outcome(), '503');
  const started = Date.now();
  docker('start', container);
  const attempts: { at_ms: number; ready: boolean; error: string | null; allow_ms: number | null }[] = [];
  for (let i = 0; i < 300; i++) { const r = await authorizationReady(config); attempts.push({ at_ms: Date.now() - started, ready: r.ready, error: r.error, allow_ms: r.allow_ms }); if (r.ready) break; await new Promise(res => setTimeout(res, 100)); }
  const firstReady = attempts.find(a => a.ready);
  measurements.cold_start = { attempts_until_ready: attempts.length, ms_until_ready: firstReady?.at_ms ?? null, first_ready_allow_ms: firstReady?.allow_ms ?? null, errors_before_ready: [...new Set(attempts.filter(a => !a.ready).map(a => a.error))] };
  check('the engine becomes ready within thirty seconds of starting', Boolean(firstReady && firstReady.at_ms < 30_000), true);
  check('until then readiness was false, never a partial allow', attempts.filter(a => !a.ready).every(a => a.error !== null), true);
  check('once ready, request authorization allows the permitted read', await outcome(), 'ALLOWED');
  const warm: number[] = [];
  for (let i = 0; i < 50; i++) { const r = await authorizationReady(config); if (r.allow_ms !== null) warm.push(r.allow_ms); }
  warm.sort((a, b) => a - b);
  measurements.warm = { samples: warm.length, p50_ms: warm[Math.floor(warm.length * 0.5)], p95_ms: warm[Math.floor(warm.length * 0.95)], max_ms: warm.at(-1) };
  check('warm decisions stay far inside the 2000 ms deadline (p95 under 250 ms)', (warm[Math.floor(warm.length * 0.95)] ?? Infinity) < 250, true);
  check('the deny control still denies', (await authorizationReady(config)).deny_ms !== null, true);
} finally {
  spawnSync('docker', ['start', container]);
  writeEvidence('opa-cold-start', { suite: 'opa-cold-start', results, measurements, host: 'local codex-a00 runtime', limitation: 'Measured on this host; deployment hardware and container limits must be qualified separately.' });
  console.log(JSON.stringify(measurements));
  console.log(`\n${results.length} assertions, ${results.filter(r => r.result === 'FAIL').length} failures.`);
}
