/**
 * Real people as Data Principals (owner decision 2026-10-01, revision 1.9 addendum; migration 0082). Run on the installation's
 * own server by someone with administrator access to it, once the installation is qualified for real data
 * (docs/engineering/PRODUCTION_READINESS.md, docs/GO_LIVE.md step C1).
 *
 * Until this runs, the installation records only synthetic people (@aster.example / @birch.example). Running it records the
 * qualification reference and who ran it, and from then on real email addresses are accepted and labelled real. It cannot be
 * undone, and the development and test profiles refuse it. Identifiers are email only.
 *
 * Usage:
 *   pnpm run principals:admit-real confirm:<profile> status
 *   pnpm run principals:admit-real confirm:<profile> admit "<qualification reference>" "<your name and role>"
 */
import { pathToFileURL } from 'node:url';
import { connectDatabase } from '../database/customer/src/index.ts';
import { loadProfile } from '../shared/testing/src/config.ts';

/** Whether this installation admits real people, since when and on what reference. */
export async function realPrincipalState(profileName?: string, database?: string) {
  const profile = loadProfile(profileName);
  const pool = connectDatabase({ ...profile, ...(database ? { database } : {}) }).pool;
  try { return (await pool.query('SELECT * FROM app.principal_admission_state()')).rows[0] as { real_permitted: boolean; real_permitted_at: Date | null; qualification_reference: string | null }; }
  finally { await pool.end(); }
}

/** Admits real people on the profile's installation database (or another, for tests). Returns the time it took effect. */
export async function admitRealPrincipals(reference: string, recordedBy: string, profileName?: string, database?: string) {
  const profile = loadProfile(profileName);
  const pool = connectDatabase({ ...profile, ...(database ? { database } : {}) }).pool;
  try { return (await pool.query('SELECT app.admit_real_principals($1, $2) AS at', [reference, recordedBy])).rows[0].at as Date; }
  catch (error) {
    const e = error as { code?: string; message?: string };
    if (e.message === 'test_profile_cannot_admit_real_principals') throw new Error('This is a development or test installation; it never admits real people.', { cause: error });
    if (e.message === 'real_principals_already_admitted') throw new Error('Real people are already admitted on this installation. Nothing changed.', { cause: error });
    if (e.code === '23514') throw new Error('The qualification reference needs 8 to 500 characters and your name and role must be given.', { cause: error });
    throw error;
  } finally { await pool.end(); }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const profile = loadProfile();
  const [confirm, action, reference, by] = process.argv.slice(2);
  try {
    if (confirm !== `confirm:${profile.profile}`) throw new Error(`Run with confirm:${profile.profile} status | admit "<qualification reference>" "<your name and role>"`);
    if (action === 'status') {
      const s = await realPrincipalState(profile.profile);
      console.log(s.real_permitted ? `Real people admitted since ${s.real_permitted_at!.toISOString()} on reference: ${s.qualification_reference}` : 'Synthetic people only. Real people are not admitted on this installation.');
    } else if (action === 'admit') {
      if (!reference || !by) throw new Error('Give the qualification reference and your name and role.');
      const at = await admitRealPrincipals(reference, by, profile.profile);
      console.log(`\n  Real people admitted on this installation from ${at.toISOString()}.\n  Recorded with reference "${reference}" by ${by}, in the audit trail of every environment.\n  This cannot be undone. Synthetic addresses remain labelled synthetic.\n`);
    } else throw new Error('Choose status or admit.');
  } catch (error) { console.error(error instanceof Error ? error.message : 'Failed.'); process.exitCode = 1; }
}
