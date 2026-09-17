// Protected synthetic operator helper. Never imported by application routes.
import type pg from 'pg';
import type { loadProfile } from './config.ts';
import { digest } from '../../contracts/src/crypto.ts';
import { randomUUID } from 'node:crypto';
import { lockConsent } from '../../domain/src/transaction.ts';
export type TargetSnapshot={resource_id:string;generation:number;last_applied_epoch:number;marketing_restricted:boolean};
type Profile=ReturnType<typeof loadProfile>;
async function context(db:pg.PoolClient,target:pg.PoolClient,profile:Profile,run:string){
 const owner=(await db.query('SELECT * FROM bootstrap_profile WHERE singleton=1')).rows[0];
 const identity=(await target.query('SELECT * FROM target_identity')).rows;
 if(owner?.installation_id!==profile.installation_id||owner?.profile!==profile.profile||identity.length!==1||identity[0].installation_id!==profile.installation_id||identity[0].profile!==profile.profile)throw new Error('Recovery profile mismatch');
 const row=(await db.query("SELECT * FROM app.test_runs WHERE id=$1 AND state='RUNNING' AND document->'request'->>'scenario'='TARGET_RESTORE_QUARANTINE' FOR UPDATE",[run])).rows[0];
 if(!row?.context.snapshot)throw new Error('Recovery requires a persisted run-owned snapshot');
 const mapping=(await db.query('SELECT * FROM app.target_mappings WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND id=$4',[row.tenant_id,row.legal_entity_id,row.environment_id,row.context.snapshot.resource_id])).rows[0];
 if(!mapping||mapping.id!==row.context.resource_id)throw new Error('Recovery resource mismatch');
 await lockConsent(db,{tenant_id:row.tenant_id,legal_entity_id:row.legal_entity_id,environment_id:row.environment_id},mapping.principal_id,mapping.purpose_id);
 const aggregate=(await db.query('SELECT epoch,state FROM app.consent_aggregates WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND principal_id=$4 AND purpose_id=$5',[row.tenant_id,row.legal_entity_id,row.environment_id,mapping.principal_id,mapping.purpose_id])).rows[0];
 if(aggregate?.state!=='WITHDRAWN')throw new Error('Restore fixture requires current authoritative withdrawal');
 return {row,mapping,aggregate};
}
export async function restoreTarget(profile:Profile,control:pg.Pool,target:pg.Pool,run:string,snapshot:TargetSnapshot){
 const c=await control.connect();const t=await target.connect();try{
  await c.query('BEGIN');await t.query('BEGIN');const {row,mapping}=await context(c,t,profile,run);
  if(digest(snapshot)!==digest(row.context.snapshot)||row.context.restored_generation)throw new Error('Snapshot mismatch or already restored');
  const current=(await t.query('SELECT generation FROM marketing_memberships WHERE resource_id=$1 FOR UPDATE',[mapping.id])).rows[0];
  if(!current||Number(current.generation)!==Number(mapping.target_generation))throw new Error('Recovery generation mismatch');
  const generation=Number(current.generation)+1;
  await t.query('UPDATE marketing_memberships SET quarantined=true,generation=$2,marketing_restricted=$3,last_applied_epoch=$4,changed_at=clock_timestamp() WHERE resource_id=$1',[mapping.id,generation,snapshot.marketing_restricted,snapshot.last_applied_epoch]);
  // Target commits in quarantine first. If the control commit fails, generation
  // mismatch and quarantine both deny processing; no distributed atomicity claim.
  await t.query('COMMIT');
  await c.query('UPDATE app.target_mappings SET target_generation=$2 WHERE id=$1',[mapping.id,generation]);
  await c.query("UPDATE app.test_runs SET context=context||$2::jsonb WHERE id=$1",[run,JSON.stringify({restored_generation:generation,restore_state:'QUARANTINED'})]);
  await c.query("INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id) VALUES($1,$2,$3,$4,$5,'MACHINE','test.target-quarantined',$6,$7)",[randomUUID(),row.tenant_id,row.legal_entity_id,row.environment_id,profile.installation_id,mapping.id,randomUUID()]);
  await c.query('COMMIT');return generation;
 }catch(error){await c.query('ROLLBACK');await t.query('ROLLBACK');throw error;}finally{c.release();t.release();}
}
export async function activateRestoredTarget(profile:Profile,control:pg.Pool,target:pg.Pool,run:string){
 const c=await control.connect();const t=await target.connect();try{
  await c.query('BEGIN');await t.query('BEGIN');const {row,mapping,aggregate}=await context(c,t,profile,run);
  const resource=(await t.query('SELECT * FROM marketing_memberships WHERE resource_id=$1 FOR UPDATE',[mapping.id])).rows[0];
  if(!resource?.quarantined||!resource.marketing_restricted||Number(resource.generation)!==Number(mapping.target_generation)||Number(resource.generation)!==row.context.restored_generation||Number(resource.last_applied_epoch)!==Number(aggregate.epoch))throw new Error('Current accepted restriction must be reconciled before activation');
  await t.query('UPDATE marketing_memberships SET quarantined=false,changed_at=clock_timestamp() WHERE resource_id=$1',[mapping.id]);await t.query('COMMIT');
  await c.query("UPDATE app.test_runs SET context=context||'{\"restore_state\":\"RECONCILED_ACTIVE\"}'::jsonb WHERE id=$1",[run]);
  await c.query("INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id) VALUES($1,$2,$3,$4,$5,'MACHINE','test.target-reactivated',$6,$7)",[randomUUID(),row.tenant_id,row.legal_entity_id,row.environment_id,profile.installation_id,mapping.id,randomUUID()]);await c.query('COMMIT');
 }catch(error){await c.query('ROLLBACK');await t.query('ROLLBACK');throw error;}finally{c.release();t.release();}
}
