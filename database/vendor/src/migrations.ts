import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type pg from 'pg';

/**
 * Migrations of the vendor database (VENDOR_SERVICE installation). Separate
 * from the customer migration runner: the vendor migrations refuse a database
 * that holds the customer `app` schema, and this runner refuses a database
 * that belongs to another vendor installation.
 */
export const VENDOR_MIGRATION_DIRECTORY = 'database/vendor/migrations';
// A filename rename is not a new migration. Preserve its original position and
// accept the historical ledger identity only when the immutable SQL hash agrees.
const fulfilmentId = '0011_licence_fulfilment';
const legacyFulfilmentId = '0003_licence_fulfilment';
const canonicalId = (id: string) => id === legacyFulfilmentId ? fulfilmentId : id;
const executionKey = (id: string) => id === fulfilmentId ? legacyFulfilmentId
  : id === '0018_service_licence_import_serialization' ? '0103_service_licences~0018' : id;
export function vendorMigrationIds() {
  return readdirSync(VENDOR_MIGRATION_DIRECTORY).filter(file => /^\d{4}_[a-z_]+\.sql$/.test(file)).map(file => file.slice(0, -4))
    .sort((a, b) => executionKey(a).localeCompare(executionKey(b)));
}

export async function applyVendorMigrations(client: pg.PoolClient | pg.Client, installationId: string, options: { through?: string } = {}) {
  const applied: string[] = [];
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(728140)');
    if ((await client.query("SELECT to_regnamespace('app') IS NOT NULL AS customer")).rows[0].customer) throw new Error('Refusing vendor migrations in a customer database');
    await client.query('CREATE TABLE IF NOT EXISTS public.vendor_migrations (id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    await client.query('CREATE TABLE IF NOT EXISTS public.vendor_bootstrap (singleton integer PRIMARY KEY CHECK (singleton = 1), installation_id uuid NOT NULL)');
    await client.query('REVOKE ALL ON public.vendor_migrations, public.vendor_bootstrap FROM PUBLIC');
    await client.query('INSERT INTO public.vendor_bootstrap VALUES (1, $1) ON CONFLICT (singleton) DO NOTHING', [installationId]);
    if ((await client.query('SELECT installation_id FROM public.vendor_bootstrap WHERE singleton = 1')).rows[0]?.installation_id !== installationId) throw new Error('Vendor database belongs to another installation');
    const ids = vendorMigrationIds();
    const through = options.through ? canonicalId(options.through) : undefined;
    if (through && !ids.includes(through)) throw new Error('Unknown vendor migration');
    for (const id of ids) {
      const sql = readFileSync(`${VENDOR_MIGRATION_DIRECTORY}/${id}.sql`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const aliases = id === fulfilmentId ? [id, legacyFulfilmentId] : [id];
      const existing = await client.query('SELECT id, checksum FROM public.vendor_migrations WHERE id = ANY($1::text[])', [aliases]);
      if (existing.rowCount) { if (existing.rows.some(row => row.checksum !== checksum)) throw new Error(`Vendor migration checksum mismatch: ${id}`); }
      else { await client.query(sql); await client.query('INSERT INTO public.vendor_migrations (id, checksum) VALUES ($1, $2)', [id, checksum]); applied.push(id); }
      if (through === id) break;
    }
    // Invariant of a complete vendor schema: every table forces row-level security, however it was reached.
    if (!options.through) {
      const unforced = (await client.query(`SELECT n.nspname || '.' || c.relname AS name FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname IN ('vendor','vendor_auth','account_auth') AND c.relkind = 'r' AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity) ORDER BY 1`)).rows.map(r => r.name as string);
      if (unforced.length) throw new Error(`Vendor tables without forced row-level security: ${unforced.join(', ')}`);
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  return applied;
}
