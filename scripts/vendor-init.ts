/**
 * Protected installer step for the vendor's own VENDOR_SERVICE installation
 * (revision 1.5 addendum). Provisions, idempotently:
 *   - the installation's protected profile directory with its identity, the
 *     immutable installation kind record (installation.json), database role
 *     passwords, session secrets and the evidence vault key;
 *   - the vendor database and its two unprivileged roles;
 *   - the vendor migrations.
 * It refuses a customer profile and a database that holds the customer schema.
 *
 * Usage: pnpm run vendor:init confirm:vendor-a00
 * In development the vendor installation shares the codex-a00 PostgreSQL server
 * (its operator credential is read from that profile); a production vendor
 * installation runs on the vendor's own host with its own server.
 */
import { existsSync, readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { randomBytes, randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type pg from 'pg';
import { connectDatabase } from '../database/customer/src/index.ts';
import { PROFILES } from '../shared/contracts/src/index.ts';
import { applyVendorMigrations } from '../database/vendor/src/migrations.ts';
import { privateDirectory, writePrivateJson } from './local-private.ts';

export const VENDOR_ROLES = ['orvia_vendor_app', 'orvia_vendor_auth'] as const;
const secretFile = (path: string) => { if (!existsSync(path)) writeFileSync(path, randomBytes(32).toString('hex'), { flag: 'wx', mode: 0o600 }); const v = readFileSync(path, 'utf8').trim(); if (!/^[a-f0-9]{64}$/.test(v)) throw new Error('Invalid local credential'); return v; };

/** Creates the vendor roles if absent, refusing a privileged role of the same name. Passwords are read from the given directory. */
export async function ensureVendorRoles(operator: pg.Pool, authDirectory: string) {
  for (const role of VENDOR_ROLES) {
    const password = secretFile(resolve(authDirectory, `${role}-password`));
    const existing = await operator.query('SELECT rolsuper, rolbypassrls, rolcreatedb, rolcreaterole FROM pg_roles WHERE rolname = $1', [role]);
    if (existing.rowCount && Object.values(existing.rows[0]).some(Boolean)) throw new Error('Unsafe existing vendor role');
    if (!existing.rowCount) await operator.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`);
    else await operator.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
  }
}

export async function provisionVendor(profile: 'vendor-a00', root = process.cwd()) {
  const settings = PROFILES[profile];
  const directory = resolve(root, '.local/profiles', profile);
  privateDirectory(directory);
  const configFile = resolve(directory, 'config.json');
  if (!existsSync(configFile)) writePrivateJson(configFile, { profile, installation_id: randomUUID(), fixture_id: 'bootstrap-probe-v1', created_at: new Date().toISOString() });
  const config = JSON.parse(readFileSync(configFile, 'utf8')) as { profile: string; installation_id: string };
  if (config.profile !== profile) throw new Error('Profile identity mismatch');
  const installationFile = resolve(directory, 'installation.json');
  if (existsSync(installationFile)) {
    const recorded = JSON.parse(readFileSync(installationFile, 'utf8'));
    if (recorded.kind !== 'VENDOR_SERVICE' || recorded.installation_id !== config.installation_id) throw new Error('This profile is recorded as another installation kind; a fresh installation is required');
  } else writePrivateJson(installationFile, { kind: 'VENDOR_SERVICE', installation_id: config.installation_id, recorded_at: new Date().toISOString() });
  // Development only: the shared server's operator credential.
  const operatorFile = resolve(directory, 'postgres-password');
  if (!existsSync(operatorFile)) copyFileSync(resolve(root, '.local/profiles/codex-a00/postgres-password'), operatorFile);
  const operatorPassword = readFileSync(operatorFile, 'utf8').trim();
  const auth = resolve(directory, 'auth'); privateDirectory(auth);
  for (const name of ['vendor-secret', 'account-secret', 'vault-key']) secretFile(resolve(auth, name));
  const admin = connectDatabase({ postgres_port: settings.postgres_port, database: 'postgres', password: operatorPassword }).pool;
  try {
    await ensureVendorRoles(admin, auth);
    if (!(await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [settings.database])).rowCount) await admin.query(`CREATE DATABASE "${settings.database}"`);
  } finally { await admin.end(); }
  const pool = connectDatabase({ postgres_port: settings.postgres_port, database: settings.database, password: operatorPassword }).pool;
  const db = await pool.connect();
  try { return { installation_id: config.installation_id, applied: await applyVendorMigrations(db, config.installation_id) }; } finally { db.release(); await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:vendor-a00') throw new Error('Run with confirm:vendor-a00');
  const result = await provisionVendor('vendor-a00');
  console.log(`Vendor installation provisioned (VENDOR_SERVICE). Migrations applied now: ${result.applied.join(', ') || 'none (up to date)'}.`);
}
