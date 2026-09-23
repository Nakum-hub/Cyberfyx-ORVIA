import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../shared/testing/src/config.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import type { AuthFixture } from './auth-bootstrap.ts';
import { safeError } from '../shared/testing/src/evidence.ts';
const profile=loadProfile();if(process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named synthetic profile confirmation required');
const fixture=JSON.parse(readFileSync(resolve(profile.directory,'auth/bootstrap.json'),'utf8')) as AuthFixture;
if(fixture.installation_id!==profile.installation_id||fixture.fixture_id!=='aster-birch-v1'||!fixture.users.alice||!fixture.users.admin)throw new Error('Complete synthetic fixture required');
const {pool}=connectDatabase(profile);
try{const tx=await pool.connect();try{
 await tx.query('BEGIN');const row=(await tx.query('SELECT * FROM bootstrap_profile WHERE singleton=1')).rows[0];
 if(row?.installation_id!==profile.installation_id||row?.profile!==profile.profile)throw new Error('Installation mismatch');
 const s=fixture.users.owner!.scope;
 await tx.query('INSERT INTO app.test_fixture_profiles VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',[s.tenant_id,s.legal_entity_id,s.environment_id,profile.installation_id,profile.profile,fixture.fixture_id]);
 await tx.query('COMMIT');console.log('Fixed Aster synthetic regression scope enrolled; no test result or production authority created.');
}catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
