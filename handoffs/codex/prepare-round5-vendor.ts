import { loadProfile } from '../../shared/testing/src/config.ts';
import { connectDatabase } from '../../database/customer/src/index.ts';
import { applyVendorMigrations } from '../../database/vendor/src/migrations.ts';
const profile=loadProfile('vendor-a00');
const pool=connectDatabase(profile).pool;
try { const client=await pool.connect(); try { console.log(JSON.stringify({applied:await applyVendorMigrations(client,profile.installation_id)})); } finally {client.release();} } finally {await pool.end();}
