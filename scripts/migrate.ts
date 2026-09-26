import { connectDatabase } from '../database/customer/src/index.ts';
import { applyMigrations } from '../database/customer/src/migrations.ts';
import { loadProfile } from '../shared/testing/src/config.ts';
import { safeError,writeEvidence } from '../shared/testing/src/evidence.ts';
const bootstrapOnly=process.argv[2]==='bootstrap-only';
if(process.argv.length>2&&!bootstrapOnly)throw new Error('Only bootstrap-only or no migration option allowed');
const profile=loadProfile();
const {pool}=connectDatabase(profile);
try{
  const client=await pool.connect();
  try{
    const applied=await applyMigrations(client,profile,{bootstrapOnly});
    writeEvidence('migration',{profile:profile.profile,migrations:applied,result:applied.length?'APPLIED':'ALREADY_APPLIED',transaction:'single PostgreSQL transaction; advisory lock serializes this runner'});
  }finally{client.release();}
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
