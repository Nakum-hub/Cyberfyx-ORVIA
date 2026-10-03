/**
 * Customer-held owner recovery (OPEN-07; owner decision 2026-09-30). Run on the installation's own server by someone with
 * administrator access to it, when the organisation's owner has lost their password or authenticator.
 *
 * Issues a one-time recovery code for the ACTIVE OWNER login with that email, and nobody else. The code is printed on this
 * console only; the database keeps its SHA-256 digest. It is valid for 30 minutes, locks after five wrong attempts, and a new
 * issue replaces the old one. The owner then opens /workspace/recover, enters their email, the code and a new password; the old
 * authenticator is removed and every earlier session ends. Issuing and using the code are both recorded in the audit trail.
 * Cyberfyx holds no recovery key: this works only with access to the customer's own server (migration 0074).
 *
 * Usage: pnpm run owner:recovery-code confirm:<profile> <owner email>
 */
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../database/customer/src/index.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { setupCodeDigest } from '../backend/api/src/setup.ts';
import { runtimeConfig } from '../backend/auth/src/config.ts';
import { newSetupCode } from './setup-code.ts';

/** Issues a code for the owner with this email on the profile's installation database (or another, for tests). Returns the code. */
export async function issueOwnerRecoveryCode(email: string, profileName?: string, database?: string) {
  const profile = loadProfile(profileName);
  const pool = connectDatabase({ ...profile, ...(database ? { database } : {}) }).pool;
  try {
    const code = newSetupCode();
    await pool.query('SELECT app.owner_recovery_issue($1, $2)', [email, setupCodeDigest(code)]);
    return code;
  } catch (error) {
    const e = error as { code?: string; message?: string };
    if (e.code === 'P0001' && e.message === 'not_an_active_owner') throw new Error('No active owner login has that email on this installation. Nothing was issued.', { cause: error });
    throw error;
  } finally { await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const profile = loadProfile();
  const [confirm, email] = process.argv.slice(2);
  try {
    if (confirm !== `confirm:${profile.profile}`) throw new Error(`Run with confirm:${profile.profile} <owner email>`);
    if (!email || !/^[^@\s]+@[^@\s]+$/.test(email)) throw new Error('Give the owner login email as the second argument.');
    const code = await issueOwnerRecoveryCode(email, profile.profile);
    console.log(`\n  Owner recovery code for ${email} (valid 30 minutes, one use):\n\n      ${code}\n\n  The owner opens ${new URL('/workspace/recover', runtimeConfig().origin).href},\n  enters their email, this code and a new password, then sets up a new authenticator at sign-in.\n  Give the code to the owner in person or by a channel you trust. It is not saved anywhere else.\n`);
  } catch (error) { console.error(error instanceof Error ? error.message : 'Failed.'); process.exitCode = 1; }
}
