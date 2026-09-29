import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from '../../../shared/testing/src/config.ts';
import { applyVendorMigrations } from '../../../database/vendor/src/migrations.ts';

const profile = loadProfile('codex-a00');
const bootstrap = connectDatabase({ ...profile, database: 'postgres' }).pool;
const created: string[] = [];
const results: { name: string; result: string }[] = [];
const id = '0011_licence_fulfilment';
const legacy = '0003_licence_fulfilment';
try {
  for (const old of [false, true]) {
    const name = `orvia_vendor_test_${randomUUID().replaceAll('-', '')}`;
    assert.match(name, /^orvia_vendor_test_[a-f0-9]{32}$/);
    await bootstrap.query(`CREATE DATABASE "${name}"`); created.push(name);
    const pool = connectDatabase({ ...profile, database: name }).pool;
    const client = await pool.connect();
    const installation = randomUUID();
    try {
      if (old) {
        await applyVendorMigrations(client, installation, { through: legacy });
        // Reconstruct the exact historical ledger identity in this new scratch
        // database; SQL bytes/checksum and application schema remain unchanged.
        await client.query('UPDATE public.vendor_migrations SET id=$1 WHERE id=$2', [legacy, id]);
      }
      const applied = await applyVendorMigrations(client, installation);
      assert.equal(applied.includes(id), !old);
      const ledger = (await client.query('SELECT id, checksum, applied_at FROM public.vendor_migrations WHERE id=ANY($1::text[])', [[id, legacy]])).rows;
      assert.equal(ledger.length, 1);
      assert.equal(ledger[0].id, old ? legacy : id);
      assert.deepEqual(await applyVendorMigrations(client, installation), []);
      assert.deepEqual((await client.query('SELECT id, checksum, applied_at FROM public.vendor_migrations WHERE id=ANY($1::text[])', [[id, legacy]])).rows, ledger);
      assert.equal((await client.query("SELECT count(*)::int AS n FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('vendor','vendor_auth','account_auth') AND c.relkind='r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity)")).rows[0].n, 0);
      results.push({ name: old ? 'upgrade from legacy ledger; no reapplication, stable ledger, forced RLS' : 'fresh database; canonical ledger, repeat no-op, forced RLS', result: 'PASS' });
    } finally { client.release(); await pool.end(); }
  }
} catch (error) {
  results.push({ name: 'database proof', result: `ERROR:${String((error as { code?: string }).code ?? 'UNKNOWN')}` });
  process.exitCode = 1;
} finally {
  for (const name of created) await bootstrap.query(`DROP DATABASE "${name}"`).catch(() => { process.exitCode = 1; });
  await bootstrap.end();
  mkdirSync('handoffs/codex/artifacts', { recursive: true });
  writeFileSync('handoffs/codex/artifacts/MIGRATION-PREFIX-database.json', JSON.stringify({ synthetic: true, results }, null, 2) + '\n');
  console.log(JSON.stringify(results));
}
