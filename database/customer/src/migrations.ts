import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type pg from 'pg';

export type InstallationIdentity = { installation_id: string; profile: string; fixture_id: string };
export const MIGRATION_DIRECTORY = 'database/customer/migrations';

/** Migration identifiers in apply order. */
export function migrationIds() {
  return readdirSync(MIGRATION_DIRECTORY).filter(file => /^\d{4}_[a-z_]+\.sql$/.test(file)).sort().map(file => file.slice(0, -4));
}

/**
 * Applies pending migrations in one transaction under the migration advisory
 * lock, refusing a changed checksum or a database belonging to another
 * installation. `through` stops after the named migration; it exists so an
 * upgrade from an earlier release can be exercised, and the operator command
 * never passes it.
 */
export async function applyMigrations(client: pg.PoolClient | pg.Client, identity: InstallationIdentity, options: { bootstrapOnly?: boolean; through?: string } = {}) {
  const applied: string[] = [];
  await client.query('BEGIN');
  try {
    await client.query('SELECT pg_advisory_xact_lock(728100)');
    await client.query('CREATE TABLE IF NOT EXISTS bootstrap_migrations (id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const ids = migrationIds();
    if (options.through && !ids.includes(options.through)) throw new Error('Unknown migration');
    for (const id of ids) {
      if (options.bootstrapOnly && id !== '0000_bootstrap') continue;
      const sql = readFileSync(`${MIGRATION_DIRECTORY}/${id}.sql`, 'utf8');
      const checksum = createHash('sha256').update(sql).digest('hex');
      const existing = await client.query('SELECT checksum FROM bootstrap_migrations WHERE id=$1', [id]);
      if (existing.rowCount) { if (existing.rows[0].checksum !== checksum) throw new Error('Migration checksum mismatch'); }
      else {
        if (id !== '0000_bootstrap') {
          const current = await client.query('SELECT installation_id,profile,fixture_id FROM bootstrap_profile WHERE singleton=1');
          if (current.rows[0]?.installation_id !== identity.installation_id || current.rows[0]?.profile !== identity.profile || current.rows[0]?.fixture_id !== identity.fixture_id) throw new Error('Database profile mismatch');
        }
        await client.query(sql);
        if (id === '0000_bootstrap') await client.query('INSERT INTO bootstrap_profile VALUES (1,$1,$2,$3)', [identity.installation_id, identity.profile, identity.fixture_id]);
        await client.query('INSERT INTO bootstrap_migrations (id,checksum) VALUES ($1,$2)', [id, checksum]);
        applied.push(id);
      }
      if (id === options.through) break;
    }
    const current = await client.query('SELECT installation_id,profile,fixture_id FROM bootstrap_profile WHERE singleton=1');
    if (current.rows[0]?.installation_id !== identity.installation_id || current.rows[0]?.profile !== identity.profile || current.rows[0]?.fixture_id !== identity.fixture_id) throw new Error('Database profile mismatch');
    await client.query('COMMIT');
    return applied;
  } catch (error) { await client.query('ROLLBACK'); throw error; }
}
