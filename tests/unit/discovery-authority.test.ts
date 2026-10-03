import test from 'node:test';
import assert from 'node:assert/strict';
import type pg from 'pg';
import type { Authority } from '../../database/customer/src/runtime.ts';
import { observePostgresCatalog } from '../../connectors/src/discovery/postgres-catalog.ts';
import { classifyPostgresRelation } from '../../connectors/src/discovery/postgres-classify.ts';

const id = '00000000-0000-4000-8000-000000000001';
const start = Date.parse('2026-09-29T10:00:00Z');
const actor = (): Authority => ({ actor_id: id, actor_domain: 'MACHINE', role: 'OBSERVER',
  capabilities: ['target.observe'], expires_at: new Date(start + 1000).toISOString(),
  scope: { tenant_id: id, legal_entity_id: id, environment_id: id } });
const relation = () => ({ schema: 'customer', relation: 'people' });
// SQL transport double. This suite proves authority timing and input snapshots,
// not real PostgreSQL permissions, conformance, or classification accuracy.
function fixture(options: { connect?: () => void; query?: (sql: string) => void; rollbackFails?: boolean; missing?: boolean; empty?: boolean } = {}) {
  const calls: { sql: string; values?: unknown[] }[] = [];
  let connections = 0, releases = 0;
  const pool = { async connect() {
    connections++; options.connect?.();
    return { release() { releases++; }, async query(sql: string, values?: unknown[]) {
      calls.push({ sql, values }); options.query?.(sql);
      if (sql === 'ROLLBACK' && options.rollbackFails) throw new Error('rollback unavailable');
      let rows: Record<string, unknown>[] = [];
      if (sql.includes('SELECT current_user')) rows = [{ name: 'orvia_target_observer', rolsuper: false, rolbypassrls: false }];
      else if (sql.includes('SELECT c.oid')) rows = options.missing ? [] : [{ oid: 42, owner: 'customer_owner', can_read: true, can_mutate: false }];
      else if (sql.includes('AS data_type')) rows = [{ name: 'email', data_type: 'text', nullable: true, can_read: true, can_mutate: false }];
      else if (sql.includes('AS type FROM')) rows = options.empty ? [] : [{ name: 'email', type: 'text' }];
      else if (sql.startsWith('SELECT "email"')) rows = [{ email: 'synthetic@example.invalid' }];
      return { rows, rowCount: rows.length };
    } };
  } } as unknown as pg.Pool;
  return { pool, calls, connections: () => connections, releases: () => releases };
}
const paths = [
  { name: 'catalog', run: (p: pg.Pool, a: Authority, r = relation()) => observePostgresCatalog(p, a, [r]) },
  { name: 'classification', run: (p: pg.Pool, a: Authority, r = relation()) => classifyPostgresRelation(p, a, r, 10) },
];
for (const path of paths) {
  test(`${path.name}: invalid or expired observer authority never connects`, async t => {
    t.mock.method(Date, 'now', () => start);
    const f = fixture();
    for (const patch of [{ expires_at: 'invalid' }, { expires_at: new Date(start).toISOString() },
      { role: 'AGENT' }, { actor_domain: 'STAFF' as const }, { capabilities: [] }])
      await assert.rejects(() => path.run(f.pool, { ...actor(), ...patch }), /Current observer/);
    assert.equal(f.connections(), 0);
  });
  test(`${path.name}: pool wait expiry releases the connection without a target read`, async t => {
    let now = start; t.mock.method(Date, 'now', () => now);
    const f = fixture({ connect: () => { now += 1001; } });
    await assert.rejects(() => path.run(f.pool, actor()), /Current observer/);
    assert.deepEqual(f.calls.map(c => c.sql), ['ROLLBACK']);
    assert.equal(f.releases(), 1);
  });
  test(`${path.name}: expiry at every SQL wait prevents a successful observation`, async t => {
    let now = start; t.mock.method(Date, 'now', () => now);
    const healthy = fixture();
    const result = await path.run(healthy.pool, actor());
    assert.ok(result);
    assert.equal(JSON.stringify(result).includes('synthetic@example.invalid'), false);
    const stages = healthy.calls.map(c => c.sql);
    for (let i = 0; i < stages.length; i++) {
      now = start; let count = 0;
      const f = fixture({ query: () => { if (count++ === i) now += 1001; } });
      await assert.rejects(() => path.run(f.pool, actor()), /Current observer/, `expiry after statement ${i}`);
      assert.equal(f.releases(), 1);
      const afterExpiry = f.calls.slice(i + 1).filter(c => /pg_catalog|^SELECT "email"/.test(c.sql));
      assert.deepEqual(afterExpiry, [], `no target reads after expiry at statement ${i}`);
    }
  });
  test(`${path.name}: caller mutation during pool wait cannot extend lease or change relation`, async t => {
    let now = start; t.mock.method(Date, 'now', () => now);
    const a = actor(), r = relation();
    const f = fixture({ connect: () => { now += 1001; a.expires_at = '2099-01-01T00:00:00Z'; r.relation = 'other'; } });
    await assert.rejects(() => path.run(f.pool, a, r), /Current observer/);
    const original = actor(), approved = relation(); now = start;
    const valid = fixture({ connect: () => { approved.relation = 'other'; original.scope.tenant_id = 'changed'; } });
    const result = await path.run(valid.pool, original, approved);
    const item = Array.isArray(result) ? result[0]! : result;
    assert.equal(item.relation, 'people'); assert.equal(item.scope.tenant_id, id);
  });
  test(`${path.name}: rollback failure preserves the authority error and releases`, async t => {
    let now = start; t.mock.method(Date, 'now', () => now);
    const f = fixture({ connect: () => { now += 1001; }, rollbackFails: true });
    await assert.rejects(() => path.run(f.pool, actor()), /Current observer/);
    assert.equal(f.releases(), 1);
  });
}
for (const state of ['missing', 'empty'] as const) {
  test(`classification: ${state} result cannot bypass expiry during commit`, async t => {
    let now = start; t.mock.method(Date, 'now', () => now);
    const f = fixture({ [state]: true, query: sql => { if (sql === 'COMMIT') now += 1001; } });
    await assert.rejects(() => classifyPostgresRelation(f.pool, actor(), relation(), 10), /Current observer/);
    assert.equal(f.releases(), 1);
  });
}
