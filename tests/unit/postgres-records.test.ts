import test from 'node:test';
import assert from 'node:assert/strict';
import { postgresRecords, type Mapping, type Action, type Pool } from '../../connectors/src/postgres-records/adapter.ts';
import type { Authority } from '../../database/customer/src/runtime.ts';

const id = '00000000-0000-4000-8000-000000000001';
const mapping: Mapping = { schema: 'customer', table: 'people', writer_role: 'record_writer', observer_role: 'record_reader',
  tenant: 'tenant_id', legal_entity: 'legal_entity_id', environment: 'environment_id', reference: 'principal_ref',
  generation: 'epoch', version: 'revision', operation_id: 'last_op', operation_digest: 'last_digest', suppressed: 'suppressed', correction_columns: ['email', 'name'] };
const actor: Authority = { actor_id: id, actor_domain: 'MACHINE', role: 'AGENT', capabilities: ['target.execute'],
  scope: { tenant_id: id, legal_entity_id: id, environment_id: id }, expires_at: '2099-01-01T00:00:00.000Z' };
const observer: Authority = { ...actor, role: 'OBSERVER', capabilities: ['target.observe'] };
const action: Action = { operation_id: id, reference: "subject'; DROP TABLE customer.people;--", generation: id,
  expected_version: 3, kind: 'CORRECT', values: { email: 'synthetic@example.invalid' } };

// Explicit SQL transport double: these tests prove guards and SQL construction,
// not PostgreSQL execution, target permission deployment or real connectivity.
function fixture(options: { writableObserver?: boolean; stale?: boolean; commitLost?: boolean; affected?: number; unsafe?: boolean; afterRead?: () => void } = {}) {
  const calls: { sql: string; values?: unknown[]; observer: boolean }[] = [];
  const row: Record<string, unknown> = { epoch: id, revision: options.stale ? 4 : 3, last_op: null, last_digest: null, suppressed: false, email: 'before@example.invalid' };
  function pool(readOnly: boolean): Pool {
    return { connect: async () => ({ release() {}, async query(sql, values) {
      calls.push({ sql, values, observer: readOnly });
      if (sql.includes('SELECT current_user AS name')) return { rowCount: 1, rows: [{ name: readOnly ? mapping.observer_role : mapping.writer_role, rolsuper: options.unsafe ?? false }] };
      if (sql.includes('FROM pg_class')) return { rowCount: 1, rows: [{ relkind: 'r', owned: false, readable: true, writable: readOnly ? !!options.writableObserver : true }] };
      if (sql.startsWith('SELECT "epoch"')) { options.afterRead?.(); return { rowCount: 1, rows: [{ ...row }] }; }
      if (sql.startsWith('UPDATE')) {
        row.revision = Number(row.revision) + 1; row.last_op = values?.[6]; row.last_digest = values?.[7];
        if (sql.includes('"suppressed"=true')) row.suppressed = true; else row.email = values?.[8];
        return { rowCount: options.affected ?? 1, rows: [] };
      }
      if (sql === 'COMMIT' && options.commitLost && !readOnly) throw new Error('simulated lost acknowledgement');
      return { rows: [], rowCount: 0 };
    } }) };
  }
  const pools = { writer: pool(false), observer: pool(true) };
  return { adapter: postgresRecords(pools, mapping), pools, calls, row };
}
test('native PostgreSQL builder parameterizes scope and values; readback uses independent pool', async () => {
  const f = fixture();
  assert.equal((await f.adapter.execute(actor, action)).result, 'APPLIED_UNVERIFIED');
  const update = f.calls.find(c => c.sql.startsWith('UPDATE'))!;
  assert.equal(update.sql.includes(action.reference), false); assert.equal(update.sql.includes(action.values.email!), false);
  assert.deepEqual(update.values?.slice(0, 6), [id, id, id, action.reference, id, 3]);
  assert.equal((await f.adapter.verify(observer, action)).result, 'PASS');
  assert.ok(f.calls.some(c => c.sql === 'BEGIN READ ONLY' && c.observer));
  assert.equal(JSON.stringify(await f.adapter.verify(observer, action)).includes('synthetic@'), false);
});
test('same committed operation replays without another update; changed body is rejected', async () => {
  const f = fixture(); await f.adapter.execute(actor, action);
  assert.equal((await f.adapter.execute(actor, action)).replayed, true);
  await assert.rejects(() => f.adapter.execute(actor, { ...action, values: { email: 'different@example.invalid' } }), /IDEMPOTENCY_CONFLICT/);
  assert.equal(f.calls.filter(c => c.sql.startsWith('UPDATE')).length, 1);
});
test('stale generation/version refuses mutation', async () => {
  const f = fixture({ stale: true });
  await assert.rejects(() => f.adapter.execute(actor, action), /STALE_GENERATION_OR_VERSION/);
  assert.equal(f.calls.some(c => c.sql.startsWith('UPDATE')), false);
});
test('lost commit remains unknown while independent readback can confirm effect', async () => {
  const f = fixture({ commitLost: true });
  assert.equal((await f.adapter.execute(actor, action)).result, 'EFFECT_UNKNOWN');
  assert.equal((await f.adapter.verify(observer, action)).result, 'PASS');
});
test('suppression is one-way and not overwritten by correction', async () => {
  const f = fixture(); const stop: Action = { ...action, kind: 'SUPPRESS', values: {} };
  await f.adapter.execute(actor, stop); assert.equal((await f.adapter.verify(observer, stop)).result, 'PASS');
  await assert.rejects(() => f.adapter.execute(actor, { ...action, values: { suppressed: 'false' } }), /UNAPPROVED_COLUMN/);
});
test('privileged writer and writable observer fail closed', async () => {
  await assert.rejects(() => fixture({ unsafe: true }).adapter.execute(actor, action), /UNSAFE_TARGET_ROLE/);
  assert.equal((await fixture({ writableObserver: true }).adapter.verify(observer, action)).result, 'INCONCLUSIVE');
});
test('invalid mapping, shared credentials and unapproved columns are rejected', async () => {
  const f = fixture();
  assert.throws(() => postgresRecords(f.pools, { ...mapping, table: 'people;drop' }), /INVALID_MAPPING/);
  assert.throws(() => postgresRecords(f.pools, { ...mapping, correction_columns: ['epoch'] }), /INVALID_MAPPING/);
  assert.throws(() => postgresRecords({ writer: f.pools.writer, observer: f.pools.writer }, mapping), /INVALID_MAPPING/);
  await assert.rejects(() => f.adapter.execute(actor, { ...action, values: { unknown: 'x' } }), /UNAPPROVED_COLUMN/);
});
test('expired malformed and wrong machine authority is rejected before connecting', async () => {
  const f = fixture();
  for (const patch of [{ expires_at: 'invalid' }, { expires_at: '2020-01-01T00:00:00.000Z' }, { role: 'OWNER' }, { capabilities: [] }])
    await assert.rejects(() => f.adapter.execute({ ...actor, ...patch }, action), /AUTHORITY_REQUIRED/);
  assert.equal(f.calls.length, 0);
});
test('unexpected affected count rolls back; changed values never verify', async () => {
  const f = fixture({ affected: 2 });
  await assert.rejects(() => f.adapter.execute(actor, action), /TARGET_CHANGE_NOT_APPLIED/);
  assert.ok(f.calls.some(c => c.sql === 'ROLLBACK'));
  const other = fixture(); await other.adapter.execute(actor, action); other.row.email = 'changed';
  assert.equal((await other.adapter.verify(observer, action)).result, 'INCONCLUSIVE');
});

test('authority expiring during target lock wait cannot mutate or acknowledge replay', async t => {
  let now = Date.parse('2026-09-29T10:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const lease = { ...actor, expires_at: new Date(now + 1000).toISOString() };
  const f = fixture({ afterRead: () => { now += 1001; } });
  await assert.rejects(() => f.adapter.execute(lease, action), /AUTHORITY_REQUIRED/);
  assert.equal(f.calls.some(c => c.sql.startsWith('UPDATE')), false);
  assert.ok(f.calls.some(c => c.sql === 'ROLLBACK'));
  const replay = fixture({ afterRead: () => { now += 1001; } });
  await replay.adapter.execute(actor, action);
  await assert.rejects(() => replay.adapter.execute({ ...actor, expires_at: new Date(now + 1000).toISOString() }, action), /AUTHORITY_REQUIRED/);
  assert.equal(replay.calls.filter(c => c.sql.startsWith('UPDATE')).length, 1);
});

test('authority expiring during independent read cannot produce passing evidence', async t => {
  let now = Date.parse('2026-09-29T10:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const f = fixture({ afterRead: () => { now += 1001; } });
  await f.adapter.execute(actor, action);
  const lease = { ...observer, expires_at: new Date(now + 1000).toISOString() };
  assert.equal((await f.adapter.verify(lease, action)).result, 'INCONCLUSIVE');
});

test('pool wait expiry prevents target record reads for writer and observer', async t => {
  let now = Date.parse('2026-09-29T10:00:00Z');
  t.mock.method(Date, 'now', () => now);
  const f = fixture();
  const delayed = (pool: Pool): Pool => ({ connect: async () => { now += 1001; return pool.connect(); } });
  const adapter = postgresRecords({ writer: delayed(f.pools.writer), observer: delayed(f.pools.observer) }, mapping);
  await assert.rejects(() => adapter.execute({ ...actor, expires_at: new Date(now + 1000).toISOString() }, action), /AUTHORITY_REQUIRED/);
  assert.equal((await adapter.verify({ ...observer, expires_at: new Date(now + 1000).toISOString() }, action)).result, 'INCONCLUSIVE');
  assert.equal(f.calls.some(c => c.sql.startsWith('SELECT "epoch"')), false);
});
