import type pg from 'pg';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from './config.ts';

/**
 * The product limits `/sign-in/email` and `/two-factor/*` to 10 requests per 60
 * seconds each, as **separate** buckets. Counting them together left too little
 * headroom, because every staff sign-in spends one request from each bucket and
 * enrollment spends a second `/two-factor/*` request. This measures each bucket
 * on its own.
 */
const RECENT=`SELECT
  count(*) FILTER (WHERE operation='/sign-in/email') sign_in,
  count(*) FILTER (WHERE operation LIKE '/two-factor/%') two_factor
 FROM staff_auth.auth_audit WHERE created_at>clock_timestamp()-interval '61 seconds'`;

/**
 * Deterministic spacing against the real limit. Qualification suites run back to
 * back and share one loopback bucket, so a fixture that signs in without waiting
 * produced a 429 that looked like a product failure. This waits for the genuine
 * idle window instead: the limit itself is unchanged, nothing is retried, and no
 * audit row is ever cleared.
 *
 * The threshold is 6 of 10 so that a sign-in, an enrollment and a reviewer
 * re-authentication can all complete after the check without reaching the limit.
 */
export async function guardAuthWindow(threshold=6){
 const pool=connectDatabase(loadProfile()).pool;
 try{
  const {sign_in,two_factor}=(await pool.query(RECENT)).rows[0];
  if(Number(sign_in)>=threshold||Number(two_factor)>=threshold)await waitForAuthWindow(pool);
 }finally{await pool.end();}
}

// Integration setup shares the real loopback authentication rate-limit bucket.
// Wait for an idle window; never clear its rows, relax limits or retry writes.
export async function waitForAuthWindow(db:pg.Pool){
 const seconds=Number((await db.query("SELECT greatest(0,coalesce(ceil(extract(epoch FROM max(created_at)+interval '61 seconds'-clock_timestamp())),0)) seconds FROM staff_auth.auth_audit WHERE operation IN ('/sign-in/email','/two-factor/verify-totp')")).rows[0].seconds);
 if(seconds>65)throw new Error('Unexpected authentication audit clock; fixture setup stopped');
 let remaining=seconds;
 while(remaining>0){console.log(`Authentication fixture idle window: ${remaining}s remaining; controls unchanged.`);const next=Math.min(remaining,30);await new Promise(r=>setTimeout(r,next*1000));remaining-=next;}
}
