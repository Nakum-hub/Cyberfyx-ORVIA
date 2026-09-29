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
export function vendorMigrationIds() {
  return readdirSync(VENDOR_MIGRATION_DIRECTORY).filter(file => /^\d{4}_[a-z_]+\.sql$/.test(file)).sort().map(file => file.slice(0, -4));
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
    if (options.through && !ids.includes(options.through)) throw new Error('Unknown vendor migration');
    for (const id of ids) {
      const sql = readFileSync(`${VENDOR_MIGRATION_DIRECTORY}/${id}.sql`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM public.vendor_migrations WHERE id = $1', [id]);
      if (existing.rowCount) { if (existing.rows[0].checksum !== checksum) throw new Error(`Vendor migration checksum mismatch: ${id}`); }
      else { await client.query(sql); await client.query('INSERT INTO public.vendor_migrations (id, checksum) VALUES ($1, $2)', [id, checksum]); applied.push(id); }
      if (options.through === id) break;
    }
    await client.query('COMMIT');
  } catch (error) { await client.query('ROLLBACK'); throw error; }
  return applied;
}
