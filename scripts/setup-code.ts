/**
 * Issues the one-time first-run setup code for this installation (run by the
 * installer on the customer's machine). The code is printed on this console and
 * written to <profile>/auth/setup-code.txt (mode 0600); only its SHA-256 digest
 * is stored in the database. It expires after 24 hours and locks after five
 * wrong attempts; issuing a new one replaces the old. Refused once an owner
 * exists, so it cannot be used to take over a set-up installation.
 *
 * Usage: pnpm run setup:code confirm:<profile>
 */
import { randomInt } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { writeFileSync } from 'node:fs';
import { connectDatabase } from '../database/customer/src/index.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { setupCodeDigest } from '../backend/api/src/setup.ts';
import { runtimeConfig } from '../backend/auth/src/config.ts';
import { privateDirectory } from './local-private.ts';

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
export function newSetupCode() {
  return Array.from({ length: 4 }, () => Array.from({ length: 5 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('')).join('-');
}

/** Issues a code for the profile's installation database (or another database on it, for tests). Returns the code. */
export async function issueSetupCode(profileName?: string, database?: string, writeFile = true) {
  const profile = loadProfile(profileName);
  const pool = connectDatabase({ ...profile, ...(database ? { database } : {}) }).pool;
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(728130)');
      if ((await client.query("SELECT 1 FROM staff_auth.authority WHERE role='ORG_SUPER_ADMIN' LIMIT 1")).rowCount) throw new Error('This installation already has an owner; first-run setup is closed.');
      const code = newSetupCode();
      await client.query(`INSERT INTO app.installation_setup(singleton, code_digest, expires_at) VALUES (1, $1, clock_timestamp() + interval '24 hours')
        ON CONFLICT (singleton) DO UPDATE SET code_digest=EXCLUDED.code_digest, issued_at=clock_timestamp(), expires_at=EXCLUDED.expires_at, failed_attempts=0, used_at=NULL`, [setupCodeDigest(code)]);
      await client.query('COMMIT');
      if (writeFile) { const directory = resolve(profile.directory, 'auth'); privateDirectory(directory); writeFileSync(resolve(directory, 'setup-code.txt'), `${code}\n`, { mode: 0o600 }); }
      return code;
    } catch (error) { await client.query('ROLLBACK').catch(() => {}); throw error; } finally { client.release(); }
  } finally { await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const profile = loadProfile();
  if (process.argv[2] !== `confirm:${profile.profile}`) throw new Error(`Run with confirm:${profile.profile}`);
  const code = await issueSetupCode(profile.profile);
  console.log(`\n  First-run setup code (valid 24 hours, one use):\n\n      ${code}\n\n  Open ORVIA in your browser at ${new URL('/setup', runtimeConfig().origin).href} and enter it.\n  It is also saved in the installation's protected auth/setup-code.txt.\n`);
}
