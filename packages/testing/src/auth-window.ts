import type pg from 'pg';

// Integration setup shares the real loopback authentication rate-limit bucket.
// Wait for an idle window; never clear its rows, relax limits or retry writes.
export async function waitForAuthWindow(db:pg.Pool){
 const seconds=Number((await db.query("SELECT greatest(0,coalesce(ceil(extract(epoch FROM max(created_at)+interval '61 seconds'-clock_timestamp())),0)) seconds FROM staff_auth.auth_audit WHERE operation IN ('/sign-in/email','/two-factor/verify-totp')")).rows[0].seconds);
 if(seconds>65)throw new Error('Unexpected authentication audit clock; fixture setup stopped');
 let remaining=seconds;
 while(remaining>0){console.log(`Authentication fixture idle window: ${remaining}s remaining; controls unchanged.`);const next=Math.min(remaining,30);await new Promise(r=>setTimeout(r,next*1000));remaining-=next;}
}
