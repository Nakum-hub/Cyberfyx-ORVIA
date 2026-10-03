import type pg from 'pg';
import { connectDatabase } from '../../../database/customer/src/index.ts';
import { loadProfile } from './config.ts';

// Conservative across all staff buckets: no decoding or disclosure of protected
// keys. Some endpoints have a larger budget; unnecessary spacing is safe.
const BUDGET=`SELECT coalesce(max(count) FILTER (WHERE "lastRequest">extract(epoch FROM clock_timestamp())*1000-60000),0) count, coalesce(bool_or(count<0 OR "lastRequest"<0 OR "lastRequest">extract(epoch FROM clock_timestamp())*1000+4000),false) invalid_clock FROM staff_auth."rateLimit"`;
const IDLE=`SELECT greatest(0,coalesce(ceil((max("lastRequest")+61000-extract(epoch FROM clock_timestamp())*1000)/1000),0)) seconds FROM staff_auth."rateLimit"`;
export async function guardAuthWindow(threshold=6){
 const pool=connectDatabase(loadProfile()).pool;
 try{
  const {count,invalid_clock}=(await pool.query(BUDGET)).rows[0];
  if(invalid_clock!==false)throw new Error('Unexpected authentication bucket clock; fixture setup stopped');
  const budget=Number(count);
  if(!Number.isInteger(budget)||budget<0)throw new Error('Unexpected authentication bucket count; fixture setup stopped');
  if(budget>=threshold)await waitForAuthWindow(pool);
 }finally{await pool.end();}
}
export async function waitForAuthWindow(db:pg.Pool){
 const seconds=Number((await db.query(IDLE)).rows[0].seconds);
 if(!Number.isFinite(seconds)||seconds<0||seconds>65)throw new Error('Unexpected authentication bucket clock; fixture setup stopped');
 let remaining=seconds;
 while(remaining>0){console.log(`Authentication fixture idle window: ${remaining}s remaining; controls unchanged.`);const next=Math.min(remaining,30);await new Promise(r=>setTimeout(r,next*1000));remaining-=next;}
}
