import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import type { RuntimeConfig } from '../../auth/src/config.ts';
import { Evaluate,Decision,SendRequest,SendResult } from '../../contracts/src/index.ts';
import { digest } from '../../contracts/src/crypto.ts';
import { processingDecision } from '../../policy-sdk/src/index.ts';
import { targetTransaction } from '../../connectors/src/shared/target-db.ts';
import { AccessError } from '../../authz/src/index.ts';
import { lockConsent,predicate,scopeValues,requireOne,audit,type Context } from '@orvia/domain/transaction';
import type { TargetObserver } from './target-observer.ts';

async function evaluateCurrent(c: Context, config: RuntimeConfig, observer: pg.Pool, observe: TargetObserver, value: {principal_reference_id:string;purpose_id:string;system_id:string;message_class:'MARKETING'|'ORDER_SERVICE';order_reference:string|null}, preview: boolean) {
 const scope=scopeValues(c.actor);
 await lockConsent(c.tx,c.actor.scope,value.principal_reference_id,value.purpose_id);
 await c.tx.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))',[JSON.stringify([...scope,'publication',value.purpose_id])]);
 const purpose=requireOne((await c.tx.query(`SELECT code FROM app.purpose_versions WHERE ${predicate} AND id=$4`,[...scope,value.purpose_id])).rows);
 const mapping=requireOne((await c.tx.query(`SELECT * FROM app.target_mappings WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5 AND system_id=$6`,[...scope,value.principal_reference_id,value.purpose_id,value.system_id])).rows);
 const policy=(await c.tx.query(`SELECT * FROM app.policy_versions WHERE ${predicate} AND purpose_id=$4 AND status='PUBLISHED'`,[...scope,value.purpose_id])).rows[0];
 const aggregate=(await c.tx.query(`SELECT * FROM app.consent_aggregates WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5`,[...scope,value.principal_reference_id,value.purpose_id])).rows[0];
 const unresolved=await c.tx.query(`SELECT 1 FROM app.workflows WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5 AND state<>'COMPLETED' LIMIT 1`,[...scope,value.principal_reference_id,value.purpose_id]);
 const service=await c.tx.query(`SELECT expires_at FROM app.service_conditions WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5 AND system_id=$6 AND policy_version_id=$7 AND active AND expires_at>clock_timestamp() AND ($8::text IS NULL AND $9 OR order_reference=$8) ORDER BY expires_at DESC LIMIT 1`,[...scope,value.principal_reference_id,value.purpose_id,value.system_id,policy?.version_id??null,value.order_reference,preview]);
 let target: {generation:string;marketing_restricted:boolean;quarantined:boolean}|undefined;let targetUnavailable=false;
 try {
  target=await targetTransaction(observer,c.actor,async tx=>(await tx.query(`SELECT generation,marketing_restricted,quarantined FROM marketing_memberships WHERE tenant_id=$1 AND legal_entity_id=$2 AND environment_id=$3 AND resource_id=$4 AND principal_id=$5 AND purpose_id=$6 AND system_id=$7 AND subject_reference=$8`,[...scope,mapping.id,value.principal_reference_id,value.purpose_id,value.system_id,mapping.target_subject_reference])).rows[0]);
  const system=requireOne((await c.tx.query(`SELECT connector FROM app.systems WHERE ${predicate} AND id=$4`,[...scope,value.system_id])).rows);
  if(system.connector==='ORVIA_REST_SIMULATOR') {
   // The only connector implemented today. A future real connector adds its
   // own case here and supplies its own TargetObserver at the wiring layer;
   // this module never hard-codes a specific connector's client.
   const observed=await observe(config,c.actor.scope,mapping.id);
   if(target)target={...target,generation:String(observed.generation),marketing_restricted:observed.marketing_restricted};
  }
 }
 catch{targetUnavailable=true;}
 const input={message_class:value.message_class,purpose_code:purpose.code,condition:policy?.document.condition??null,published:!!policy&&policy.document.system_ids.includes(value.system_id),notice_matches:!!aggregate&&!!policy&&aggregate.notice_version_id===policy.notice_version_id,consent_state:aggregate?.state??'NOT_GIVEN',target_current:!!target&&Number(target.generation)===Number(mapping.target_generation),target_restricted:target?.marketing_restricted??true,quarantined:target?.quarantined??true,unresolved_suppression:!!unresolved.rowCount,service_condition_current:!!service.rowCount};
 let result=targetUnavailable?{decision:'INDETERMINATE' as const,reason_codes:['TARGET_OBSERVATION_UNAVAILABLE']}:await processingDecision(config,input);
 const boundary=(await c.tx.query('SELECT clock_timestamp() AS at')).rows[0].at as Date;
 if(result.decision==='ALLOW'&&value.message_class==='ORDER_SERVICE'&&(!service.rowCount||service.rows[0].expires_at<=boundary))result={decision:'BLOCK',reason_codes:['SERVICE_CONDITION_EXPIRED']};
 if(Date.parse(c.actor.expires_at)<=boundary.getTime())throw new AccessError(401,'UNAUTHENTICATED');
 const decisionId=randomUUID();const now=boundary.toISOString();const epoch=Number(aggregate?.epoch??0);
 await c.tx.query(`INSERT INTO app.processing_decisions VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,[...scope,decisionId,c.actor.actor_id,value.principal_reference_id,value.purpose_id,value.system_id,policy?.version_id??null,epoch,Number(mapping.target_generation),result.decision,JSON.stringify(result.reason_codes),preview,now]);
 await audit(c,preview?'policy.preview':'send.decision',decisionId);
 return {...result,decision_id:decisionId,policy_version_id:policy?.version_id??null,consent_epoch:epoch,evaluated_at:now};
}
export async function preview(c: Context, config: RuntimeConfig, observer: pg.Pool, observe: TargetObserver, input: unknown) {
 const value=Evaluate.parse(input);
 const result=await evaluateCurrent(c,config,observer,observe,{principal_reference_id:value.principal_id,purpose_id:value.purpose_id,system_id:value.system_id,message_class:value.action==='MARKETING_SEND'?'MARKETING':'ORDER_SERVICE',order_reference:null},true);
 return Decision.parse({...result,preview_only:true});
}
export async function admitSend(c: Context, config: RuntimeConfig, observer: pg.Pool, observe: TargetObserver, input: unknown) {
 const value=SendRequest.parse(input);const scope=scopeValues(c.actor);
 requireOne((await c.tx.query(`SELECT system_id FROM machine_auth.sender_systems WHERE ${predicate} AND identity_id=$4 AND system_id=$5`,[...scope,c.actor.actor_id,value.system_id])).rows);
 await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scope,c.actor.actor_id,'send-attempt',value.attempt_id])]);
 const old=(await c.tx.query(`SELECT digest,result FROM app.send_attempts WHERE ${predicate} AND actor_id=$4 AND id=$5`,[...scope,c.actor.actor_id,value.attempt_id])).rows[0];
 if(old){if(old.digest!==digest(value))throw new AccessError(409,'IDEMPOTENCY_CONFLICT');await audit(c,'send.replayed',value.attempt_id);return SendResult.parse(old.result);}
 const decision=await evaluateCurrent(c,config,observer,observe,value,false);const sendId=decision.decision==='ALLOW'?randomUUID():null;
 if(sendId)await c.tx.query(`INSERT INTO app.send_records VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true)`,[...scope,sendId,decision.decision_id,c.actor.actor_id,value.principal_reference_id,value.purpose_id,value.system_id,value.attempt_id,value.message_class,decision.evaluated_at]);
 const result=SendResult.parse({attempt_id:value.attempt_id,decision:decision.decision,send_record_id:sendId,admitted_at:sendId?decision.evaluated_at:null,evaluated_epoch:decision.consent_epoch,reason_codes:decision.reason_codes});
 await c.tx.query(`INSERT INTO app.send_attempts(tenant_id,legal_entity_id,environment_id,id,actor_id,principal_id,purpose_id,system_id,digest,result) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[...scope,value.attempt_id,c.actor.actor_id,value.principal_reference_id,value.purpose_id,value.system_id,digest(value),result]);
 await audit(c,'send.'+decision.decision.toLowerCase(),value.attempt_id);return result;
}
