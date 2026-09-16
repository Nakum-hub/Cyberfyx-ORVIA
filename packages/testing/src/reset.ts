import { connectDatabase } from '../../db/src/index.ts';
import { connectTemporal } from '../../../apps/worker/src/probe-client.ts';
import { loadProfile } from './config.ts';
import { writeEvidence } from './evidence.ts';

export async function resetBootstrap(name:string,confirmation:string){
  // Local operator credential is required; never exposed as a web endpoint.
  const profile=loadProfile(name);
  if(confirmation!==profile.reset)throw new Error('Named synthetic reset confirmation required');
  const {connection,client:temporal}=await connectTemporal(profile);
  try{for await(const execution of temporal.workflow.list({query:'ExecutionStatus = "Running"',pageSize:1})){if(execution)throw new Error('Active workflows block reset');}}
  finally{await connection.close();}
  const {pool}=connectDatabase(profile);
  try{
    const client=await pool.connect();
    try{
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(728100)');
      await client.query('LOCK TABLE bootstrap_profile,bootstrap_probes IN ACCESS EXCLUSIVE MODE');
      const identity=await client.query('SELECT installation_id,profile,fixture_id,current_database() AS database FROM bootstrap_profile WHERE singleton=1');
      const row=identity.rows[0];
      if(row?.installation_id!==profile.installation_id||row?.profile!==profile.profile||row?.fixture_id!==profile.fixture_id||row?.database!==profile.database)throw new Error('Reset identity mismatch');
      const tables=await client.query("SELECT tablename FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY tablename");
      if(JSON.stringify(tables.rows.map(r=>r.tablename))!==JSON.stringify(['bootstrap_migrations','bootstrap_probes','bootstrap_profile']))throw new Error('Non-bootstrap schema blocks this reset');
      const count=await client.query('SELECT count(*)::integer AS count FROM bootstrap_probes');
      // Persist intent before touching rows. An artifact failure aborts the transaction.
      const intent=writeEvidence('reset-intent',{profile:name,installation_id:profile.installation_id,scope:'bootstrap_probes only',rows:count.rows[0].count,caller:'local operator possessing profile credential'});
      const result=await client.query('DELETE FROM bootstrap_probes');
      await client.query('COMMIT');
      writeEvidence('reset-result',{profile:name,intent,rows_deleted:result.rowCount,result:'COMMITTED',limitations:['Temporal histories, profile identity and migrations are retained. A01+ schema disables this command.']});
      return result.rowCount;
    }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
  }finally{await pool.end();}
}
