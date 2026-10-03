import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import type pg from 'pg';
import { applyVendorMigrations, vendorMigrationIds } from '../../database/vendor/src/migrations.ts';

const installation = '11111111-1111-4111-8111-111111111111';
const current = '0011_licence_fulfilment';
const old = '0003_licence_fulfilment';
const hash = (id: string) => createHash('sha256').update(readFileSync(`database/vendor/migrations/${id}.sql`, 'utf8')).digest('hex');
// Runner control-flow test only. Real PostgreSQL fresh/upgrade proof is separate.
function database(ledger: Map<string, string>) {
  const appliedSql: string[] = [];
  const calls: string[] = [];
  return { ledger, appliedSql, calls, async query(sql: string, args: unknown[] = []) {
    calls.push(sql);
    let rows: Record<string, unknown>[] = [];
    if (sql.includes("to_regnamespace('app') IS NOT NULL AS customer")) rows = [{ customer: false }];
    else if (sql.startsWith('SELECT installation_id')) rows = [{ installation_id: installation }];
    else if (sql.startsWith('SELECT id, checksum')) rows = (args[0] as string[]).filter(id => ledger.has(id)).map(id => ({ id, checksum: ledger.get(id) }));
    else if (sql.startsWith('INSERT INTO public.vendor_migrations')) ledger.set(args[0] as string, args[1] as string);
    else if (sql.startsWith('--')) appliedSql.push(sql);
    return { rows, rowCount: rows.length };
  } };
}
test('fresh runner uses unique prefixes and preserves the fulfilment dependency order', async () => {
  const ids = vendorMigrationIds();
  assert.equal(ids[ids.indexOf('0018_service_licence_import_serialization')-1],'0103_service_licences');
  assert.equal(new Set(ids.map(id => id.slice(0, 4))).size, ids.length);
  assert.equal(ids[ids.indexOf(current) - 1], '0002_checkout_attempts');
  assert.equal(ids[ids.indexOf(current) + 1], '0003_vendor_service');
  const db = database(new Map());
  assert.deepEqual(await applyVendorMigrations(db as unknown as pg.Client, installation), ids);
  assert.equal(db.ledger.get(current), hash(current));
  assert.equal(db.ledger.has(old), false);
});
test('legacy ledger is preserved and its SQL is never reapplied, including an old through target', async () => {
  const ledger = new Map(vendorMigrationIds().map(id => [id === current ? old : id, hash(id)]));
  const db = database(ledger);
  assert.deepEqual(await applyVendorMigrations(db as unknown as pg.Client, installation), []);
  assert.deepEqual(await applyVendorMigrations(db as unknown as pg.Client, installation, { through: old }), []);
  assert.equal(db.appliedSql.length, 0);
  assert.equal(ledger.has(current), false);
  assert.equal(ledger.get(old), hash(current));
});
test('either alias with a different checksum refuses and rolls back', async () => {
  for (const bad of [old, current]) {
    const ledger = new Map(vendorMigrationIds().map(id => [id, hash(id)]));
    ledger.set(old, hash(current)); ledger.set(bad, 'wrong');
    const db = database(ledger);
    await assert.rejects(applyVendorMigrations(db as unknown as pg.Client, installation), /checksum mismatch/);
    assert.equal(db.calls.at(-1), 'ROLLBACK');
    assert.equal(db.appliedSql.length, 0);
  }
});
