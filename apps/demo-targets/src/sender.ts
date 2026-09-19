import type pg from 'pg';
import { randomUUID } from 'node:crypto';
import { SendRequest,SendResult } from '../../../packages/contracts/src/index.ts';
import { digest } from '../../../packages/contracts/src/crypto.ts';
import type { RuntimeConfig } from '../../../packages/auth/src/config.ts';
import type { SenderEnrollmentConfig } from '../../../packages/auth/src/machine-profile.ts';
import { machineAuthority } from '../../../packages/auth/src/machine.ts';
import { scopedTransaction } from '../../../packages/db/src/runtime.ts';
import { scopeValues,predicate,audit } from '../../../packages/domain/src/shared/transaction.ts';
type Sender=SenderEnrollmentConfig['identities'][number];
export async function enqueue(pool: pg.Pool, identity: Sender, input: unknown) {
 const value=SendRequest.parse(input);const actor=machineAuthority(identity);
 return scopedTransaction(pool,actor,async tx=>{
  const scope=scopeValues(actor);const allowed=await tx.query(`SELECT system_id FROM machine_auth.sender_systems WHERE ${predicate} AND identity_id=$4 AND system_id=$5`,[...scope,identity.id,value.system_id]);
  if(allowed.rowCount!==1)throw new Error('Sender system is not enrolled');
  await tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scope,identity.id,value.attempt_id,'queue'])]);
  const existing=(await tx.query(`SELECT digest FROM app.send_queue WHERE ${predicate} AND actor_id=$4 AND id=$5`,[...scope,identity.id,value.attempt_id])).rows[0];
  if(existing&&existing.digest!==digest(value))throw new Error('Queued attempt identity conflict');
  if(!existing)await tx.query('INSERT INTO app.send_queue(tenant_id,legal_entity_id,environment_id,id,actor_id,request,digest) VALUES($1,$2,$3,$4,$5,$6,$7)',[...scope,value.attempt_id,identity.id,value,digest(value)]);
  await audit({tx,actor,requestId:randomUUID()},'send.queued',value.attempt_id);return value.attempt_id;
 });
}
export async function drain(pool: pg.Pool, config: RuntimeConfig, identity: Sender) {
 const actor=machineAuthority(identity);return scopedTransaction(pool,actor,async tx=>{
  const scope=scopeValues(actor);const rows=await tx.query(`SELECT id,request FROM app.send_queue WHERE ${predicate} AND actor_id=$4 AND result IS NULL ORDER BY queued_at,id LIMIT 20 FOR UPDATE SKIP LOCKED`,[...scope,identity.id]);const results=[];
  for(const row of rows.rows) {
   const response=await fetch(config.origin+'/api/v1/machine/simulator/send',{method:'POST',headers:{authorization:`Bearer ${identity.token}`,'content-type':'application/json','idempotency-key':row.id},body:JSON.stringify(SendRequest.parse(row.request)),signal:AbortSignal.timeout(5000)});
   if(!response.ok)throw new Error('Send admission unavailable; queue retained for identical replay');
   const result=SendResult.parse(await response.json());
   await tx.query(`UPDATE app.send_queue SET result=$6,finished_at=now() WHERE ${predicate} AND actor_id=$4 AND id=$5`,[...scope,identity.id,row.id,result]);
   await audit({tx,actor,requestId:randomUUID()},'send.queue-admitted',row.id);results.push(result);
  }
  return results;
 });
}
