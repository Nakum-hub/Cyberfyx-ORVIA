/**
 * Mixed-workload capacity probe (EX14 cross-cutting).
 *
 * Builds a scratch database with the current application schema (schema-only
 * dump and restore inside the profile's database container), seeds one scope
 * with a million audit events, a hundred thousand principals and two hundred
 * thousand privacy requests, then runs concurrent clients through the
 * application role with row-level security enforced, exactly as requests do:
 * keyset page reads, point reads, writes and bounded export chunks. It records
 * throughput and latency percentiles per operation and drops the scratch
 * database. Synthetic rows only; no customer or fixture record is touched.
 *
 * Diagnostic evidence for this host. It is not a capacity qualification: that
 * needs the declared deployment hardware and agreed service targets.
 * Usage: pnpm run capacity:mixed confirm:codex-a00 [seconds] [clients]
 */
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../database/customer/src/index.ts';
import { runtimePool, scopedTransaction, type Authority } from '../database/customer/src/runtime.ts';
import { runtimeConfig } from '../backend/auth/src/config.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { writeEvidence } from '../shared/testing/src/evidence.ts';

type Op = 'list_requests' | 'read_request' | 'list_audit' | 'write_request' | 'write_audit' | 'export_chunk';
const MIX: [Op, number][] = [['list_requests', 40], ['read_request', 20], ['list_audit', 15], ['write_request', 10], ['write_audit', 10], ['export_chunk', 5]];
const percentile = (sorted: number[], p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))]! : null;

export async function runMixed(seconds = 45, clients = 16) {
  const profile = loadProfile();
  if (profile.profile !== 'codex-a00') throw new Error('The mixed-workload probe runs only on the isolated codex-a00 profile');
  const container = `${profile.compose_project}-postgres-1`;
  const scratch = `orvia_capacity_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const bootstrap = connectDatabase({ ...profile, database: 'postgres' }).pool;
  const config = runtimeConfig();
  const exec = (args: string[], input?: Buffer) => { const r = spawnSync('docker', ['exec', '-i', '-e', `PGPASSWORD=${profile.password}`, container, ...args], { input, maxBuffer: 256 * 1024 * 1024 }); if (r.status !== 0) throw new Error(`${args[0]} failed`); return r.stdout as Buffer; };
  const t = randomUUID(), l = randomUUID(), e = randomUUID(); const actor = randomUUID();
  const timings: Record<string, unknown> = {};
  let app: ReturnType<typeof runtimePool> | null = null;
  try {
    await bootstrap.query(`CREATE DATABASE ${scratch}`);
    let started = Date.now();
    const schema = exec(['pg_dump', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', profile.database, '--schema-only', '-Fc', '--no-owner']);
    exec(['pg_restore', '-U', 'orvia_migrator', '-h', '127.0.0.1', '-d', scratch, '--no-owner', '--exit-on-error'], schema);
    timings.schema_ms = Date.now() - started;
    const seed = connectDatabase({ ...profile, database: scratch }).pool;
    seed.options.query_timeout = 600_000;
    started = Date.now();
    try {
      await seed.query('INSERT INTO app.organisations(id,name) VALUES($1,$2)', [t, 'Capacity probe (synthetic)']);
      await seed.query('INSERT INTO app.legal_entities VALUES($1,$2,$3)', [t, l, 'Synthetic legal entity']);
      await seed.query('INSERT INTO app.environments VALUES($1,$2,$3,$4)', [t, l, e, 'Synthetic environment']);
      await seed.query(`INSERT INTO app.principal_references SELECT $1,$2,$3,md5('p'||n)::uuid,'Synthetic principal '||n,'p'||n||'@aster.example',true FROM generate_series(1,100000) n`, [t, l, e]);
      for (let first = 1; first <= 1_000_000; first += 250_000)
        await seed.query(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id,created_at)
          SELECT md5('a'||n)::uuid,$1,$2,$3,$4,'STAFF',(ARRAY['rights_request.create','consent.grant','consent.withdraw','export','systems.create'])[1+n%5],NULL,md5('r'||n)::uuid,now()-n*interval '1 second'
          FROM generate_series($5::int,$5::int+249999) n`, [t, l, e, actor, first]);
      await seed.query(`INSERT INTO app.rights_requests(tenant_id,legal_entity_id,environment_id,id,right_type,principal_id,mandate_id,state,identity,identity_grade,authority,execution,response,scope,received_at,updated_at,document)
        SELECT $1,$2,$3,md5('q'||n)::uuid,(ARRAY['ACCESS','CORRECTION','ERASURE'])[1+n%3],md5('p'||(1+n%100000))::uuid,NULL,'RECEIVED','NOT_ASSESSED',NULL,'SELF','NOT_STARTED','NOT_PREPARED','NOT_DETERMINED',now()-n*interval '10 seconds',now()-n*interval '10 seconds',
          jsonb_build_object('state','RECEIVED','description','Synthetic capacity request','submitted_channel','RECORDED_MANUAL_INTAKE') FROM generate_series(1,200000) n`, [t, l, e]);
      await seed.query('ANALYZE');
      timings.seed_ms = Date.now() - started;
      timings.database_bytes = Number((await seed.query('SELECT pg_database_size(current_database()) b')).rows[0].b);
    } finally { await seed.end(); }
    app = runtimePool({ ...config, database: scratch } as ReturnType<typeof runtimeConfig>, 'orvia_app');
    app.options.max = clients + 2;
    const authority: Authority = { actor_id: actor, actor_domain: 'STAFF', role: 'ORG_SUPER_ADMIN', scope: { tenant_id: t, legal_entity_id: l, environment_id: e },
      capabilities: ['rights.read', 'rights.write', 'audit.read', 'audit.export'], expires_at: new Date(Date.now() + 3_600_000).toISOString() };
    const pool = app;
    const scoped = <T>(work: (q: (sql: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>) => Promise<T>) => scopedTransaction(pool, authority, tx => work((sql, v) => tx.query(sql, v)));
    const S = 'tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3';
    const run: Record<Op, (q: (sql: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>) => Promise<unknown>> = {
      list_requests: q => q(`SELECT id,state,received_at FROM app.rights_requests WHERE ${S} AND received_at < now()-($4::int*interval '1 minute') ORDER BY received_at DESC, id DESC LIMIT 50`, [t, l, e, Math.floor(Math.random() * 30000)]),
      read_request: q => q(`SELECT * FROM app.rights_requests WHERE ${S} AND id=md5('q'||$4::text)::uuid`, [t, l, e, 1 + Math.floor(Math.random() * 200000)]),
      list_audit: q => q(`SELECT id,operation,created_at FROM app.audit_events WHERE ${S} AND created_at < now()-($4::int*interval '1 second') ORDER BY created_at DESC, id DESC LIMIT 50`, [t, l, e, Math.floor(Math.random() * 1_000_000)]),
      write_request: q => q(`INSERT INTO app.rights_requests(tenant_id,legal_entity_id,environment_id,id,right_type,principal_id,mandate_id,state,identity,identity_grade,authority,execution,response,scope,received_at,updated_at,document)
        VALUES($1,$2,$3,$4,'ACCESS',md5('p'||$5::text)::uuid,NULL,'RECEIVED','NOT_ASSESSED',NULL,'SELF','NOT_STARTED','NOT_PREPARED','NOT_DETERMINED',now(),now(),'{"state":"RECEIVED","description":"Synthetic write","submitted_channel":"RECORDED_MANUAL_INTAKE"}')`, [t, l, e, randomUUID(), 1 + Math.floor(Math.random() * 100000)]),
      write_audit: q => q(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id) VALUES($4,$1,$2,$3,$5,'STAFF','capacity.probe',NULL,$6)`, [t, l, e, randomUUID(), actor, randomUUID()]),
      export_chunk: q => q(`SELECT e.* FROM app.audit_events e WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.operation=$4 AND e.created_at < now()-($5::int*interval '1 second') ORDER BY e.created_at, e.id LIMIT 2000`, [t, l, e, 'consent.withdraw', Math.floor(Math.random() * 900_000)]),
    };
    // Plans for the two list shapes, taken through the same scoped path, so a slow result shows its cause.
    const plans: Record<string, string[]> = {};
    for (const [name, sql, values] of [
      ['list_requests', `EXPLAIN (ANALYZE, BUFFERS) SELECT id,state,received_at FROM app.rights_requests WHERE ${S} AND received_at < now()-interval '100 minutes' ORDER BY received_at DESC, id DESC LIMIT 50`, [t, l, e]],
      ['list_audit', `EXPLAIN (ANALYZE, BUFFERS) SELECT id,operation,created_at FROM app.audit_events WHERE ${S} AND created_at < now()-interval '5 days' ORDER BY created_at DESC, id DESC LIMIT 50`, [t, l, e]],
    ] as const) plans[name] = (await scoped(q => q(sql, [...values]))).rows.map(r => String(r['QUERY PLAN']));
    const total = MIX.reduce((n, [, w]) => n + w, 0);
    const pick = (): Op => { let r = Math.random() * total; for (const [op, w] of MIX) { r -= w; if (r < 0) return op; } return 'list_requests'; };
    const samples: Record<Op, number[]> = { list_requests: [], read_request: [], list_audit: [], write_request: [], write_audit: [], export_chunk: [] };
    const errors: Record<string, number> = {};
    const deadline = Date.now() + seconds * 1000;
    const worker = async () => {
      while (Date.now() < deadline) {
        const op = pick(); const s = performance.now();
        try { await scoped(run[op]); samples[op].push(performance.now() - s); } catch (error) { const code = String((error as { code?: string }).code ?? 'ERROR'); errors[`${op}:${code}`] = (errors[`${op}:${code}`] ?? 0) + 1; }
      }
    };
    started = Date.now();
    await Promise.all(Array.from({ length: clients }, worker));
    const elapsed = (Date.now() - started) / 1000;
    const operations = Object.fromEntries(Object.entries(samples).map(([op, xs]) => { const sorted = [...xs].sort((a, b) => a - b); return [op, { count: xs.length, per_second: Math.round(xs.length / elapsed), p50_ms: round(percentile(sorted, 0.5)), p95_ms: round(percentile(sorted, 0.95)), p99_ms: round(percentile(sorted, 0.99)), max_ms: round(sorted.at(-1) ?? null) }]; }));
    await app.end(); app = null;
    await bootstrap.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`);
    const dropped = (await bootstrap.query('SELECT 1 FROM pg_database WHERE datname=$1', [scratch])).rowCount === 0;
    const memoryLimit = spawnSync('docker', ['inspect', '-f', '{{.HostConfig.Memory}}', container]).stdout?.toString().trim();
    const evidence = { profile: profile.profile, scratch_database_dropped: dropped, database_container_memory_bytes: Number(memoryLimit) || null, seconds, clients, seeded: { audit_events: 1_000_000, principal_references: 100_000, rights_requests: 200_000 }, timings,
      plans, operations_per_second: Math.round(Object.values(samples).reduce((n, xs) => n + xs.length, 0) / elapsed), operations, errors,
      path: 'orvia_app role with scoped settings and forced row-level security, as request handlers run',
      limits: ['Diagnostic evidence on this development host with synthetic rows in one scope. It is not a capacity qualification: that needs the declared deployment hardware, representative data distribution and agreed service targets.',
        'HTTP, authentication and policy decision time are not included; they add to each operation.',
        'Statements are cancelled by the server at 9 seconds and by the client at 10; a cancelled statement is counted as an error, not a sample.'] };
    return evidence;
  } finally {
    if (app) await app.end().catch(() => {});
    // Best effort on the failure path; the success path above verifies the drop and records it.
    await bootstrap.query(`DROP DATABASE IF EXISTS ${scratch} WITH (FORCE)`).catch(error => console.error(`Scratch database ${scratch} was not dropped: ${String(error)}`));
    await bootstrap.end();
  }
}
const round = (x: number | null) => x === null ? null : Math.round(x * 10) / 10;

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:codex-a00') throw new Error('Run with confirm:codex-a00');
  const evidence = await runMixed(Number(process.argv[3] ?? 45), Number(process.argv[4] ?? 16));
  writeEvidence('capacity-mixed', evidence);
  console.log(JSON.stringify(evidence, null, 2));
}
