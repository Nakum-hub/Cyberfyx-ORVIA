// Protected installer: create allowlisted, unprivileged roles before migrations
// reference them. Schema/table authority is granted only by migrations/setup.
import { existsSync,readFileSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { randomBytes } from 'node:crypto';
import { loadProfile } from '../packages/testing/src/config.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { runtimeRoles } from '../packages/auth/src/config.ts';
import { serviceRoles } from '../packages/auth/src/machine.ts';
import { privateDirectory } from './local-private.ts';
import { safeError } from '../packages/testing/src/evidence.ts';
const profile=loadProfile();
if(process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named synthetic profile confirmation required');
const folders={orvia_worker:'worker',orvia_agent_control:'agent',orvia_machine_auth:'machine-auth',orvia_target_agent:'agent',orvia_target_observer:'observer',orvia_sender:'sender'} as const;
const roles=[...runtimeRoles.map(role=>({role,folder:'auth'})),...serviceRoles.map(role=>({role,folder:folders[role]}))];
const {pool}=connectDatabase(profile);
try{
 const tx=await pool.connect();try{
  await tx.query('BEGIN');await tx.query('SELECT pg_advisory_xact_lock(728100)');
  if((await tx.query('SELECT current_database() name')).rows[0].name!==profile.database)throw new Error('Database mismatch');
  const initialized=(await tx.query("SELECT to_regclass('public.bootstrap_profile') present")).rows[0].present;
  if(initialized){const row=(await tx.query('SELECT * FROM bootstrap_profile WHERE singleton=1')).rows[0];if(row?.installation_id!==profile.installation_id||row?.profile!==profile.profile||row?.fixture_id!==profile.fixture_id)throw new Error('Profile mismatch');}
  else if((await tx.query("SELECT 1 FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') LIMIT 1")).rowCount)throw new Error('Unrecognized populated database');
  for(const {role,folder} of roles){
   const directory=resolve(profile.directory,folder);privateDirectory(directory);
   const file=resolve(directory,role+'-password');if(!existsSync(file))writeFileSync(file,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});
   const password=readFileSync(file,'utf8').trim();if(!/^[a-f0-9]{64}$/.test(password))throw new Error('Invalid local credential');
   const existing=await tx.query('SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=$1',[role]);
   if(existing.rowCount&&Object.values(existing.rows[0]).some(Boolean))throw new Error('Unsafe existing role');
   if(!existing.rowCount)await tx.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${password}'`);
  }
  await tx.query('COMMIT');console.log('Allowlisted unprivileged roles present; credentials remain protected locally.');
 }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
