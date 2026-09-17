import type pg from 'pg';
import { connectDatabase } from '../../db/src/index.ts';
import { loadProfile } from './config.ts';

const RECENT="SELECT count(*) n FROM staff_auth.auth_audit WHERE created_at>clock_timestamp()-interval '61 seconds' AND operation IN ('/sign-in/email','/two-factor/verify-totp')";

/**
 * Deterministic spacing against the real `/two-factor/*` limit of 10 requests
 * per 60 seconds. Qualification suites run back to back and share one loopback
 * rate-limit bucket, so a fixture that signs in without waiting produced a 429
 * that looked like a product failure. This waits for the genuine idle window
 * instead: the limit itself is unchanged, nothing is retried, and no audit row
 * is ever cleared.
 */
export async function guardAuthWindow(threshold=8){
 const pool=connectDatabase(loadProfile()).pool;
 try{
  if(Number((await pool.query(RECENT)).rows[0].n)>=threshold)await waitForAuthWindow(pool);
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
