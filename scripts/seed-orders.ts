import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { loadProfile } from '../packages/testing/src/config.ts';
import { connectDatabase } from '../packages/db/src/index.ts';
import { safeError } from '../packages/testing/src/evidence.ts';
import { writePrivateJson } from './local-private.ts';
const profile=loadProfile();
if(process.argv[2]!==`confirm:${profile.profile}`)throw new Error('Named synthetic profile confirmation required');
const pool=connectDatabase(profile).pool;
try {
 const tx=await pool.connect();try {
  await tx.query('BEGIN');await tx.query('SELECT pg_advisory_xact_lock(728105)');
  if((await tx.query('SELECT installation_id FROM bootstrap_profile WHERE singleton=1')).rows[0]?.installation_id!==profile.installation_id)throw new Error('Profile mismatch');
  const configured=await tx.query(`SELECT m.*,p.version_id FROM app.target_mappings m JOIN app.policy_versions p ON(p.tenant_id=m.tenant_id AND p.legal_entity_id=m.legal_entity_id AND p.environment_id=m.environment_id AND p.purpose_id=m.purpose_id AND p.status='PUBLISHED') WHERE p.document->>'condition'='APPROVED_SYNTHETIC_ORDER_SERVICE' AND p.document->'system_ids' @> to_jsonb(ARRAY[m.system_id::text])`);
  const orders=[];
  for(const row of configured.rows) {
   const id=randomUUID();const reference='syn_order_'+id.replaceAll('-','');const expires=new Date(Date.now()+3600000).toISOString();
   await tx.query(`INSERT INTO app.service_conditions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true,true)`,[row.tenant_id,row.legal_entity_id,row.environment_id,id,row.principal_id,row.purpose_id,row.system_id,row.version_id,reference,expires]);
   await tx.query(`INSERT INTO app.audit_events(id,tenant_id,legal_entity_id,environment_id,actor_id,actor_domain,operation,resource_id,request_id) VALUES($1,$2,$3,$4,$5,'MACHINE','fixture.synthetic-order',$6,$7)`,[randomUUID(),row.tenant_id,row.legal_entity_id,row.environment_id,profile.installation_id,id,randomUUID()]);
   orders.push({principal_id:row.principal_id,purpose_id:row.purpose_id,system_id:row.system_id,order_reference:reference,expires_at:expires});
  }
  await tx.query('COMMIT');
  writePrivateJson(resolve(profile.directory,'sender/orders.json'),{fixture_id:'aster-birch-v1',synthetic:true,orders});
  console.log(`Created ${orders.length} explicit synthetic order conditions for already approved policies; no legal exemption or real transport.`);
 }catch(error){await tx.query('ROLLBACK');throw error;}finally{tx.release();}
}catch(error){console.error(safeError(error));process.exitCode=1;}finally{await pool.end();}
