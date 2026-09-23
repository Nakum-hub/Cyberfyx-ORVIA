import { randomBytes,randomUUID,generateKeyPairSync,createPublicKey,createHash } from 'node:crypto';
import { existsSync,readFileSync,writeFileSync,readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadProfile } from '../shared/testing/src/config.ts';
import { connectDatabase } from '../database/customer/src/index.ts';
import { privateDirectory,writePrivateJson } from './local-private.ts';
import { safeError } from '../shared/testing/src/evidence.ts';
import { serviceRoles,MachineIdentity } from '../backend/auth/src/machine.ts';
import { WorkerEnrollment,AgentEnrollment,SenderEnrollment,type WorkerEnrollmentConfig,type AgentEnrollmentConfig,type SenderEnrollmentConfig } from '../backend/auth/src/machine-profile.ts';
import type { AuthFixture } from './auth-bootstrap.ts';

const profile=loadProfile();
if(process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named synthetic profile confirmation required');
const owners={orvia_worker:'worker',orvia_agent_control:'agent',orvia_machine_auth:'machine-auth',orvia_target_agent:'agent',orvia_target_observer:'observer',orvia_sender:'sender'} as const;
for(const folder of ['worker','agent','observer','machine-auth','sender'])privateDirectory(resolve(profile.directory,folder));
for(const role of serviceRoles){const path=resolve(profile.directory,owners[role],role+'-password');if(!existsSync(path))writeFileSync(path,randomBytes(32).toString('hex'),{flag:'wx',mode:0o600});}
const signingPath=resolve(profile.directory,'worker/signing-key.pem');
if(!existsSync(signingPath))writeFileSync(signingPath,generateKeyPairSync('ed25519').privateKey.export({type:'pkcs8',format:'pem'}),{flag:'wx',mode:0o600});
const publicKey=createPublicKey(readFileSync(signingPath)).export({type:'spki',format:'pem'}).toString();
const workerPath=resolve(profile.directory,'worker/enrollment.json');const agentPath=resolve(profile.directory,'agent/enrollment.json');
const worker: WorkerEnrollmentConfig=existsSync(workerPath)?WorkerEnrollment.parse(JSON.parse(readFileSync(workerPath,'utf8'))):{installation_id:profile.installation_id,signing_key_id:randomUUID(),identities:[]};
const agent: AgentEnrollmentConfig=existsSync(agentPath)?AgentEnrollment.parse(JSON.parse(readFileSync(agentPath,'utf8'))):{installation_id:profile.installation_id,signing_key_id:worker.signing_key_id,public_key:publicKey,identities:[]};
const senderPath=resolve(profile.directory,'sender/enrollment.json');
const sender: SenderEnrollmentConfig=existsSync(senderPath)?SenderEnrollment.parse(JSON.parse(readFileSync(senderPath,'utf8'))):{installation_id:profile.installation_id,identities:[]};
const observerPath=resolve(profile.directory,'observer/enrollment.json');
const observer:AgentEnrollmentConfig=existsSync(observerPath)?AgentEnrollment.parse(JSON.parse(readFileSync(observerPath,'utf8'))):{installation_id:profile.installation_id,signing_key_id:worker.signing_key_id,public_key:publicKey,identities:[]};
if(worker.installation_id!==profile.installation_id||agent.installation_id!==profile.installation_id||agent.public_key!==publicKey||agent.signing_key_id!==worker.signing_key_id)throw new Error('Existing enrollment does not match installation/key');
const fixture=JSON.parse(readFileSync(resolve(profile.directory,'auth/bootstrap.json'),'utf8')) as AuthFixture;
const scopes=[...new Map(Object.values(fixture.users).map(user=>[JSON.stringify(user.scope),user.scope])).values()];
const pool=connectDatabase(profile).pool;
try {
 const tx=await pool.connect();try {
  await tx.query('BEGIN');await tx.query('SELECT pg_advisory_xact_lock(728103)');
  const identity=await tx.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1');
  if(identity.rows[0]?.installation_id!==profile.installation_id)throw new Error('Installation mismatch');
  for(const role of serviceRoles) {
   const existing=await tx.query('SELECT rolsuper,rolbypassrls,rolcreatedb,rolcreaterole FROM pg_roles WHERE rolname=$1',[role]);
   if(existing.rowCount&&Object.values(existing.rows[0]).some(Boolean))throw new Error('Unsafe existing service role');
   const secret=readFileSync(resolve(profile.directory,owners[role],role+'-password'),'utf8').trim();if(!/^[a-f0-9]{64}$/.test(secret))throw new Error('Invalid local secret');
   if(!existing.rowCount)await tx.query(`CREATE ROLE ${role} LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOBYPASSRLS PASSWORD '${secret}'`);
  }
  await tx.query('GRANT USAGE ON SCHEMA machine_auth TO orvia_machine_auth,orvia_worker,orvia_agent_control,orvia_app,orvia_sender');
  await tx.query('GRANT SELECT ON machine_auth.sender_systems TO orvia_app,orvia_sender');
  await tx.query('GRANT SELECT ON machine_auth.identities TO orvia_machine_auth');
  await tx.query('GRANT SELECT(id,kind,installation_id,tenant_id,legal_entity_id,environment_id,active,expires_at) ON machine_auth.identities TO orvia_worker,orvia_agent_control,orvia_sender');
  await tx.query('GRANT USAGE ON SCHEMA app TO orvia_worker,orvia_agent_control,orvia_machine_auth,orvia_sender');
  await tx.query('GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA app TO orvia_worker,orvia_agent_control,orvia_app,orvia_machine_auth,orvia_sender');
  await tx.query('GRANT SELECT ON app.service_conditions,app.processing_decisions,app.send_records,app.send_attempts TO orvia_app');
  await tx.query('GRANT INSERT ON app.processing_decisions,app.send_records,app.send_attempts TO orvia_app');
  await tx.query('GRANT SELECT,INSERT,UPDATE ON app.send_queue TO orvia_sender');
  await tx.query('GRANT INSERT ON app.audit_events TO orvia_sender');
  await tx.query('GRANT SELECT ON app.purpose_versions,app.notice_versions,app.policy_versions,app.policy_systems,app.policy_approvals,app.systems,app.target_mappings,app.consent_aggregates,app.consent_events,app.workflows,app.outbox_events,app.action_plans,app.agent_commands,app.command_receipts,app.observations,app.obligations TO orvia_worker');
  await tx.query('GRANT INSERT ON app.action_plans,app.agent_commands,app.observations,app.obligations,app.audit_events TO orvia_worker');
  await tx.query('GRANT UPDATE ON app.action_plans,app.workflows,app.outbox_events TO orvia_worker');
  await tx.query('GRANT SELECT ON app.policy_versions,app.policy_approvals,app.target_mappings,app.consent_aggregates,app.systems TO orvia_agent_control');
  await tx.query('GRANT INSERT ON app.audit_events TO orvia_agent_control');
  await tx.query('GRANT SELECT ON app.action_plans,app.agent_commands,app.command_receipts,app.observations,app.obligations TO orvia_app');
  await tx.query('GRANT INSERT ON app.command_receipts TO orvia_app');
  const expires_at=new Date(Date.now()+3600000).toISOString();
  for(const scope of scopes) {
   const existingAgent=agent.identities.find(i=>JSON.stringify(i.scope)===JSON.stringify(scope));
   const agentIdentity=MachineIdentity.parse({id:existingAgent?.id??randomUUID(),kind:'AGENT',scope,installation_id:profile.installation_id,expires_at});
   const existingWorker=worker.identities.find(i=>JSON.stringify(i.scope)===JSON.stringify(scope));
   const workerIdentity=MachineIdentity.parse({id:existingWorker?.id??randomUUID(),kind:'WORKER',scope,installation_id:profile.installation_id,expires_at});
   const existingSender=sender.identities.find(i=>JSON.stringify(i.scope)===JSON.stringify(scope));
   const senderIdentity=MachineIdentity.parse({id:existingSender?.id??randomUUID(),kind:'SENDER',scope,installation_id:profile.installation_id,expires_at});
   const senderToken=randomBytes(32).toString('hex');
   const observerIdentity=MachineIdentity.parse({id:observer.identities.find(i=>JSON.stringify(i.scope)===JSON.stringify(scope))?.id??randomUUID(),kind:'OBSERVER',scope,installation_id:profile.installation_id,expires_at});
   const observerToken=randomBytes(32).toString('hex');
   const token=randomBytes(32).toString('hex');
   const systems=(await tx.query('SELECT id,connector FROM app.systems WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3',[scope.tenant_id,scope.legal_entity_id,scope.environment_id])).rows;
   agent.identities=agent.identities.filter(i=>i.id!==agentIdentity.id);agent.identities.push({...agentIdentity,token,systems});
   worker.identities=worker.identities.filter(i=>i.id!==workerIdentity.id);worker.identities.push({...workerIdentity,agent_id:agentIdentity.id});
   sender.identities=sender.identities.filter(i=>i.id!==senderIdentity.id);sender.identities.push({...senderIdentity,token:senderToken});
   observer.identities=observer.identities.filter(i=>i.id!==observerIdentity.id);observer.identities.push({...observerIdentity,token:observerToken,systems});
   for(const i of [agentIdentity,workerIdentity,senderIdentity,observerIdentity])await tx.query(`INSERT INTO machine_auth.identities(id,installation_id,tenant_id,legal_entity_id,environment_id,kind,token_digest,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)
    ON CONFLICT(id) DO UPDATE SET token_digest=EXCLUDED.token_digest,expires_at=EXCLUDED.expires_at`,[i.id,i.installation_id,scope.tenant_id,scope.legal_entity_id,scope.environment_id,i.kind,i.kind==='WORKER'?null:createHash('sha256').update(i.kind==='AGENT'?token:i.kind==='OBSERVER'?observerToken:senderToken).digest('hex'),expires_at]);
   for(const system of systems.filter(s=>s.connector!=='LEGACY_MANUAL'))await tx.query('INSERT INTO machine_auth.sender_systems VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',[senderIdentity.id,scope.tenant_id,scope.legal_entity_id,scope.environment_id,system.id]);
  }
  writePrivateJson(workerPath,worker);writePrivateJson(agentPath,agent);writePrivateJson(senderPath,sender);writePrivateJson(observerPath,observer);
  await tx.query('COMMIT');
 }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
 const database=profile.database+'_targets';
 if(!/^(orvia_codex_a00|orvia_ui_b00|orvia_rehearsal)_targets$/.test(database))throw new Error('Unknown target database');
 if(!(await pool.query('SELECT 1 FROM pg_database WHERE datname=$1',[database])).rowCount)await pool.query(`CREATE DATABASE ${database}`);
 await pool.query(`REVOKE CONNECT ON DATABASE ${database} FROM PUBLIC`);
 await pool.query(`GRANT CONNECT ON DATABASE ${database} TO orvia_target_agent,orvia_target_observer`);
 const target=connectDatabase({...profile,database}).pool;
 try {
  const tx=await target.connect();try {
   await tx.query('BEGIN');await tx.query('SELECT pg_advisory_xact_lock(728104)');
   const initialized=await tx.query("SELECT to_regclass('public.target_identity') AS name");
   const migrations=readdirSync('services/synthetic-target/migrations').filter(name=>/^\d{4}_[a-z_]+\.sql$/.test(name)).sort();
   if(!initialized.rows[0].name) {
    await tx.query(readFileSync('services/synthetic-target/migrations/0001_target.sql','utf8'));
    await tx.query('INSERT INTO target_identity VALUES($1,$2)',[profile.installation_id,profile.profile]);
    await tx.query('INSERT INTO target_migrations VALUES($1,$2)',['0001_target.sql',createHash('sha256').update(readFileSync('services/synthetic-target/migrations/0001_target.sql')).digest('hex')]);
   }
   const identity=await tx.query('SELECT * FROM target_identity');
   if(identity.rowCount!==1||identity.rows[0].installation_id!==profile.installation_id||identity.rows[0].profile!==profile.profile)throw new Error('Target installation mismatch');
   for(const migration of migrations) {
    const sql=readFileSync(resolve('services/synthetic-target/migrations',migration),'utf8');const checksum=createHash('sha256').update(sql).digest('hex');
    const old=(await tx.query('SELECT checksum FROM target_migrations WHERE id=$1',[migration])).rows[0];
    if(old&&old.checksum!==checksum)throw new Error('Target migration drift');
    if(!old){await tx.query(sql);await tx.query('INSERT INTO target_migrations VALUES($1,$2)',[migration,checksum]);}
   }
   await tx.query('REVOKE CREATE ON SCHEMA public FROM PUBLIC');
   await tx.query('GRANT USAGE ON SCHEMA public TO orvia_target_agent,orvia_target_observer');
   await tx.query('GRANT SELECT,UPDATE ON marketing_memberships TO orvia_target_agent');
   await tx.query('GRANT SELECT,INSERT ON command_ledger TO orvia_target_agent');
   await tx.query('GRANT SELECT ON marketing_memberships,command_ledger TO orvia_target_observer');
   await tx.query('GRANT EXECUTE ON FUNCTION target_scope TO orvia_target_agent,orvia_target_observer');
   const mappings=await pool.query(`SELECT m.*,s.connector FROM app.target_mappings m JOIN app.systems s ON(s.tenant_id=m.tenant_id AND s.legal_entity_id=m.legal_entity_id AND s.environment_id=m.environment_id AND s.id=m.system_id) WHERE s.connector IN ('SYNTHETIC_CRM','ORVIA_REST_SIMULATOR')`);
   for(const row of mappings.rows)await tx.query(`INSERT INTO marketing_memberships(tenant_id,legal_entity_id,environment_id,resource_id,principal_id,purpose_id,system_id,subject_reference,connector,generation) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) ON CONFLICT(resource_id) DO NOTHING`,[row.tenant_id,row.legal_entity_id,row.environment_id,row.id,row.principal_id,row.purpose_id,row.system_id,row.target_subject_reference,row.connector,row.target_generation]);
   await tx.query('COMMIT');
  }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
 }finally{await target.end();}
 console.log('Local machine enrollment and isolated synthetic targets provisioned; credentials remain protected; existing target restrictions preserved.');
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
