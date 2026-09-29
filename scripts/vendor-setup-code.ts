/**
 * Issues the one-time first-run setup code of the vendor's VENDOR_SERVICE
 * installation (same flow as a customer installation's setup:code). Printed on
 * this console and written to <profile>/auth/setup-code.txt (0600); only its
 * SHA-256 digest is stored. Expires after 24 hours, locks after five wrong
 * attempts, refused once a vendor super administrator exists.
 *
 * Usage: pnpm run vendor:setup-code confirm:vendor-a00
 */
import { randomInt } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../database/customer/src/index.ts';
import { PROFILES } from '../shared/contracts/src/index.ts';
import { setupCodeDigest } from '../backend/api/src/vendor/routes.ts';
import { privateDirectory } from './local-private.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const newCode = () => Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')).join('-');

export async function issueVendorSetupCode(database: string = PROFILES['vendor-a00'].database, writeFile = true, root = process.cwd()) {
  const directory = resolve(root, '.local/profiles/vendor-a00');
  const pool = connectDatabase({ postgres_port: PROFILES['vendor-a00'].postgres_port, database, password: readFileSync(resolve(directory, 'postgres-password'), 'utf8').trim() }).pool;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(728131)');
      if ((await client.query("SELECT kind FROM vendor.installation_identity")).rows[0]?.kind !== 'VENDOR_SERVICE') throw new Error('Not a vendor installation database');
      if ((await client.query("SELECT 1 FROM vendor_auth.authority WHERE role='VENDOR_SUPER_ADMIN' LIMIT 1")).rowCount) throw new Error('This vendor installation already has a super administrator; first-run setup is closed.');
      const code = newCode();
      await client.query(`INSERT INTO vendor.installation_setup(singleton, code_digest, expires_at) VALUES (1, $1, clock_timestamp() + interval '24 hours')
        ON CONFLICT (singleton) DO UPDATE SET code_digest=EXCLUDED.code_digest, issued_at=clock_timestamp(), expires_at=EXCLUDED.expires_at, failed_attempts=0, used_at=NULL`, [setupCodeDigest(code)]);
      await client.query('COMMIT');
      if (writeFile) { privateDirectory(resolve(directory, 'auth')); writeFileSync(resolve(directory, 'auth', 'setup-code.txt'), `${code}\n`, { mode: 0o600 }); }
      return code;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  } finally { await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  if (process.argv[2] !== 'confirm:vendor-a00') throw new Error('Run with confirm:vendor-a00');
  const code = await issueVendorSetupCode();
  console.log(`\n  Vendor first-run setup code (valid 24 hours, one use):\n\n      ${code}\n\n  Open ORVIA in your browser at http://127.0.0.1:${PROFILES['vendor-a00'].app_port}/vendor/setup and enter it.\n`);
}
