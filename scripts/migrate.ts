import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { connectDatabase } from '../packages/db/src/index.ts';
import { loadProfile } from '../packages/testing/src/config.ts';
import { safeError,writeEvidence } from '../packages/testing/src/evidence.ts';
const profile=loadProfile();
const {pool}=connectDatabase(profile);
const sql=readFileSync('packages/db/migrations/0000_bootstrap.sql','utf8');
const checksum=createHash('sha256').update(sql).digest('hex');
try{
  const client=await pool.connect();
  try{
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(728100)');
    await client.query('CREATE TABLE IF NOT EXISTS bootstrap_migrations (id text PRIMARY KEY, checksum text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())');
    const existing=await client.query('SELECT checksum FROM bootstrap_migrations WHERE id=$1',['0000_bootstrap']);
    if(existing.rowCount){if(existing.rows[0].checksum!==checksum)throw new Error('Migration checksum mismatch');}
    else{
      await client.query(sql);
      await client.query('INSERT INTO bootstrap_profile VALUES (1,$1,$2,$3)',[profile.installation_id,profile.profile,profile.fixture_id]);
      await client.query('INSERT INTO bootstrap_migrations (id,checksum) VALUES ($1,$2)',['0000_bootstrap',checksum]);
    }
    const identity=await client.query('SELECT installation_id,profile,fixture_id FROM bootstrap_profile WHERE singleton=1');
    if(identity.rows[0]?.installation_id!==profile.installation_id||identity.rows[0]?.profile!==profile.profile||identity.rows[0]?.fixture_id!==profile.fixture_id)throw new Error('Database profile mismatch');
    await client.query('COMMIT');
    writeEvidence('migration',{profile:profile.profile,migration:'0000_bootstrap',checksum,result:existing.rowCount?'ALREADY_APPLIED':'APPLIED',transaction:'single PostgreSQL transaction; advisory lock serializes this runner'});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
