/** Reproducible database-only million-row keyset probe. All rows live in a
 * transaction-local temporary table; no customer or fixture record is written.
 * This is diagnostic evidence, not a production capacity certification. */
import { randomUUID } from 'node:crypto';
import { loadProfile } from '../shared/testing/src/config.ts';
import { writeEvidence } from '../shared/testing/src/evidence.ts';
import { connectDatabase } from '../database/customer/src/index.ts';

const profile = loadProfile();
if (profile.profile !== 'codex-a00') throw new Error('Capacity probe requires the isolated codex-a00 profile');
const { pool } = connectDatabase(profile);
pool.options.query_timeout = 120000;
const client = await pool.connect();
const tenant = randomUUID();
const legal = randomUUID();
const environment = randomUUID();
const otherTenant = randomUUID();
const anchor = new Date('2026-09-25T00:00:00.000Z');
const started = performance.now();
try {
  const requiredIndexes = [
    'consent_events_scope_time_id', 'audit_events_scope_time_id',
    'rights_requests_scope_time_id', 'coverage_gaps_scope_time_id',
    'incidents_scope_time_id',
  ];
  const installed = (await client.query<{ indexname: string }>(
    `SELECT indexname FROM pg_indexes WHERE schemaname='app' AND indexname=ANY($1::text[])`,
    [requiredIndexes])).rows.map(row => row.indexname);
  if (requiredIndexes.some(name => !installed.includes(name)))
    throw new Error('Run customer migrations before the capacity probe');
  await client.query('BEGIN');
  await client.query(`CREATE TEMP TABLE capacity_events (
    tenant_id uuid NOT NULL, legal_entity_id uuid NOT NULL,
    environment_id uuid NOT NULL, id uuid NOT NULL,
    accepted_at timestamptz NOT NULL, state text NOT NULL
  ) ON COMMIT DROP`);
  for (let first = 1; first <= 1_000_000; first += 50_000) {
    await client.query(`INSERT INTO capacity_events
      SELECT $1::uuid, $2::uuid, $3::uuid, md5(n::text)::uuid,
             $4::timestamptz - n * interval '1 millisecond',
             CASE WHEN n % 7 = 0 THEN 'WITHDRAWN' ELSE 'GRANTED' END
      FROM generate_series($5::int, $6::int) AS n`,
      [tenant, legal, environment, anchor, first, Math.min(first + 49_999, 1_000_000)]);
  }
  await client.query(`INSERT INTO capacity_events
    SELECT $1::uuid, $2::uuid, $3::uuid, md5(('other-' || n)::text)::uuid,
           $4::timestamptz - n * interval '1 millisecond', 'GRANTED'
    FROM generate_series(1, 1000) AS n`, [otherTenant, legal, environment, anchor]);
  const loadedMs = Math.round(performance.now() - started);
  await client.query(`CREATE INDEX capacity_scope_time_id ON capacity_events
    (tenant_id, legal_entity_id, environment_id, accepted_at DESC, id DESC)`);
  await client.query('ANALYZE capacity_events');
  const indexMs = Math.round(performance.now() - started) - loadedMs;
  const sql = `SELECT id, accepted_at, state FROM capacity_events
    WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3
      AND (accepted_at, id) < ($4::timestamptz, $5::uuid)
    ORDER BY accepted_at DESC, id DESC LIMIT 101`;
  const sample = async (ordinal: number) => {
    const cursorAt = new Date(anchor.getTime() - ordinal);
    const cursorId = (await client.query<{ id: string }>(
      'SELECT md5($1::text)::uuid AS id', [ordinal])).rows[0]!.id;
    const before = performance.now();
    const rows = await client.query(sql, [tenant, legal, environment, cursorAt, cursorId]);
    const elapsedMs = Math.round((performance.now() - before) * 100) / 100;
    const plan = (await client.query<{ 'QUERY PLAN': unknown }>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`,
      [tenant, legal, environment, cursorAt, cursorId])).rows[0]?.['QUERY PLAN'];
    return { ordinal, rows: rows.rowCount, elapsed_ms: elapsedMs, plan };
  };
  const first = await sample(0);
  const deep = await sample(900_000);
  const count = Number((await client.query(
    `SELECT count(*)::int AS n FROM capacity_events
     WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3`,
    [tenant, legal, environment])).rows[0].n);
  const otherCount = Number((await client.query(
    `SELECT count(*)::int AS n FROM capacity_events WHERE tenant_id=$1`,
    [otherTenant])).rows[0].n);
  if (count !== 1_000_000 || otherCount !== 1000 || first.rows !== 101 || deep.rows !== 101)
    throw new Error('Capacity probe row count or keyset page mismatch');
  writeEvidence('capacity-probe', {
    task_id: 'A00', profile: profile.profile, fixture_kind: 'TRANSACTION_LOCAL_SYNTHETIC',
    database: 'PostgreSQL temporary table', target_records_per_organisation: 1_000_000,
    installed_indexes: installed,
    scope_rows: count, other_scope_rows: otherCount, page_size: 100,
    loaded_ms: loadedMs, index_ms: indexMs, first, deep,
    limitations: ['Database-only query and index probe; no API, RLS, concurrent load, report generation, export, backup or recovery measurement.',
      'Temporary rows are rolled back and never become customer records.'],
    result: 'MEASURED',
  });
} finally {
  await client.query('ROLLBACK').catch(() => undefined);
  client.release();
  await pool.end();
}
