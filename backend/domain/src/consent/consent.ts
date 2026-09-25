import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, lockConsent, type Context, type Page } from '../shared/transaction.ts';

export async function ownChoices(c: Context, page: Page) {
  const scope=scopeValues(c.actor);
  const purposes=await c.tx.query(`SELECT p.id,p.document,n.document notice,n.published_at,
      a.state consent_state,a.epoch consent_epoch FROM app.purpose_versions p
    JOIN app.policy_versions v ON (v.tenant_id=p.tenant_id AND v.legal_entity_id=p.legal_entity_id AND v.environment_id=p.environment_id AND v.purpose_id=p.id AND v.status='PUBLISHED')
    JOIN app.notice_versions n ON (n.tenant_id=v.tenant_id AND n.legal_entity_id=v.legal_entity_id AND n.environment_id=v.environment_id AND n.version_id=v.notice_version_id)
    LEFT JOIN app.consent_aggregates a ON (a.tenant_id=p.tenant_id AND a.legal_entity_id=p.legal_entity_id AND a.environment_id=p.environment_id AND a.purpose_id=p.id AND a.principal_id=$6)
    WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3 AND p.code='promotional_marketing' AND p.status='PUBLISHED'
    AND ($4::uuid IS NULL OR p.id>$4) ORDER BY p.id LIMIT $5`,[...scope,page.cursor,page.limit+1,c.actor.principal_id]);
  const selected=purposes.rows.slice(0,page.limit);
  if(!selected.length)return {items:[],next_cursor:null};
  const chosen=requireOne((await c.tx.query(`SELECT preferred_language FROM app.principal_references WHERE ${predicate} AND id=$4`,[...scope,c.actor.principal_id])).rows);
  const published=await c.tx.query(`SELECT purpose_id,array_agg(DISTINCT language ORDER BY language) languages
    FROM app.notice_versions WHERE ${predicate} AND purpose_id=ANY($4::uuid[]) AND published_at IS NOT NULL
    GROUP BY purpose_id`,[...scope,selected.map(row=>row.id)]);
  const languages=new Map<string,string[]>(published.rows.map(row=>[row.purpose_id,row.languages]));
  const interactions=selected.map(row=>({id:randomUUID(),purpose_id:row.id,expected_epoch:Number(row.consent_epoch??0),notice_version_id:row.notice.version_id}));
  await c.tx.query(`INSERT INTO app.consent_interactions
    (tenant_id,legal_entity_id,environment_id,id,principal_id,purpose_id,actor_id,expected_epoch,notice_version_id,expires_at,used_at)
    SELECT $1,$2,$3,i.id,$5,i.purpose_id,$6,i.expected_epoch,i.notice_version_id,now()+interval '10 minutes',NULL
    FROM jsonb_to_recordset($4::jsonb) AS i(id uuid,purpose_id uuid,expected_epoch bigint,notice_version_id uuid)`,
    [...scope,JSON.stringify(interactions),c.actor.principal_id,c.actor.actor_id]);
  const items=selected.map((row,index)=>{
    const available=languages.get(row.id)??[];const requested=chosen.preferred_language as string;
    const served=available.includes(requested)?requested:available.includes('en')?'en':null;
    // Requested and served languages remain distinct when English is a fallback.
    const language=S.LanguageAvailability.parse({requested_language:requested,served_language:served,
      available_in_requested_language:served===requested,published_languages:available});
    return S.ConsentChoice.parse({purpose_id:row.id,purpose_name:row.document.name,
      consent_status:row.consent_state??'NOT_GIVEN',consent_epoch:Number(row.consent_epoch??0),
      notice:{...row.notice,published_at:row.published_at.toISOString(),data_categories:row.notice.data_categories??null,
        contact:row.notice.contact??null,itemisation_was_not_recorded:row.notice.data_categories===undefined||row.notice.data_categories===null},
      language,interaction_id:interactions[index]!.id});
  });
  return {items,next_cursor:purposes.rows.length>page.limit?Buffer.from(items.at(-1)!.purpose_id).toString('base64url'):null};
}
export async function changeConsent(c: Context, purposeId: string, kind: 'grant'|'withdraw', input: unknown) {
  const value=kind==='grant'?S.Grant.parse(input):S.Withdraw.parse(input);const scope=scopeValues(c.actor);
  const purpose=requireOne((await c.tx.query(`SELECT code FROM app.purpose_versions WHERE ${predicate} AND id=$4`,[...scope,purposeId])).rows);
  if(purpose.code!=='promotional_marketing')throw new AccessError(400,'VALIDATION_ERROR');
  await lockConsent(c.tx,c.actor.scope,c.actor.principal_id!,purposeId);
  // All current-consent decisions (including later send admission) use this same
  // aggregate row lock. INSERT handles the absent initial row under concurrency.
  await c.tx.query(`INSERT INTO app.consent_aggregates(tenant_id,legal_entity_id,environment_id,principal_id,purpose_id) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING`,[...scope,c.actor.principal_id,purposeId]);
  const aggregate=requireOne((await c.tx.query(`SELECT * FROM app.consent_aggregates WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5 FOR UPDATE`,[...scope,c.actor.principal_id,purposeId])).rows);
  if(Number(aggregate.epoch)!==value.expected_epoch)throw new AccessError(409,'EPOCH_CONFLICT');
  const interaction=(await c.tx.query(`SELECT * FROM app.consent_interactions WHERE ${predicate} AND id=$4 AND principal_id=$5 AND purpose_id=$6 AND actor_id=$7 AND used_at IS NULL FOR UPDATE`,[...scope,value.interaction_id,c.actor.principal_id,purposeId,c.actor.actor_id])).rows[0];
  if(!interaction||Number(interaction.expected_epoch)!==value.expected_epoch)throw new AccessError(409,'EPOCH_CONFLICT');
  // Coordinate with publication without granting a principal UPDATE authority on
  // policy rows (PostgreSQL row-locking reads also require UPDATE RLS access).
  await c.tx.query('SELECT pg_advisory_xact_lock_shared(hashtextextended($1,0))',[JSON.stringify([...scope,'publication',purposeId])]);
  const policy=requireOne((await c.tx.query(`SELECT version_id,notice_version_id FROM app.policy_versions WHERE ${predicate} AND purpose_id=$4 AND status='PUBLISHED'`,[...scope,purposeId])).rows);
  if(kind==='grant'&&('notice_version_id' in value)&&(value.notice_version_id!==policy.notice_version_id||value.notice_version_id!==interaction.notice_version_id))throw new AccessError(409,'EPOCH_CONFLICT');
  // The aggregate, interaction and shared publication locks are now held. This
  // guarded, single-use update is the freshness boundary, before business writes.
  // The outer authorized idempotency replay returns before reaching this path.
  const consumed=await c.tx.query(`WITH consumption AS MATERIALIZED (SELECT clock_timestamp() AS at)
    UPDATE app.consent_interactions SET used_at=consumption.at FROM consumption
    WHERE ${predicate} AND id=$4 AND principal_id=$5 AND purpose_id=$6 AND actor_id=$7
    AND expected_epoch=$8 AND used_at IS NULL AND expires_at>consumption.at RETURNING used_at`,[...scope,value.interaction_id,c.actor.principal_id,purposeId,c.actor.actor_id,value.expected_epoch]);
  if(consumed.rowCount!==1)throw new AccessError(409,'EPOCH_CONFLICT');
  const epoch=Number(aggregate.epoch)+1;const state=kind==='grant'?'GRANTED':'WITHDRAWN';
  const eventId=randomUUID();const receiptId=randomUUID();const workflowId=kind==='withdraw'?randomUUID():null;
  const acceptedAt=consumed.rows[0].used_at.toISOString();const noticeVersion=kind==='grant'?policy.notice_version_id:aggregate.notice_version_id;
  const receipt=S.Receipt.parse({receipt_id:receiptId,event_id:eventId,purpose_id:purposeId,consent_status:state,consent_epoch:epoch,accepted_at:acceptedAt,workflow_id:workflowId,propagation_status:workflowId?'ACCEPTED':'NOT_REQUIRED'});
  await c.tx.query(`UPDATE app.consent_aggregates SET epoch=$6,state=$7,notice_version_id=$8,updated_at=$9 WHERE ${predicate} AND principal_id=$4 AND purpose_id=$5`,[...scope,c.actor.principal_id,purposeId,epoch,state,noticeVersion,acceptedAt]);
  await c.tx.query('INSERT INTO app.consent_events VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)',[...scope,eventId,c.actor.principal_id,purposeId,c.actor.actor_id,epoch,state,value.interaction_id,noticeVersion,policy.version_id,receiptId,receipt,acceptedAt]);
  if(workflowId) {
    await c.tx.query(`INSERT INTO app.workflows VALUES($1,$2,$3,$4,$5,$6,$7,'ACCEPTED',$8,$8)`,[...scope,workflowId,eventId,c.actor.principal_id,purposeId,acceptedAt]);
    await c.tx.query('INSERT INTO app.outbox_events VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,NULL)',[...scope,randomUUID(),eventId,c.actor.principal_id,purposeId,workflowId,acceptedAt]);
  }
  await audit(c,`consent.${kind}`,eventId);return receipt;
}
export async function ownReceipt(c: Context, id: string) {
  const scope=scopeValues(c.actor);
  const event=requireOne((await c.tx.query(`SELECT receipt,purpose_id FROM app.consent_events WHERE ${predicate} AND receipt_id=$4 AND principal_id=$5`,[...scope,id,c.actor.principal_id])).rows);
  const receipt=S.Receipt.parse(event.receipt);
  const aggregate=requireOne((await c.tx.query(`SELECT epoch,state FROM app.consent_aggregates WHERE ${predicate} AND purpose_id=$4 AND principal_id=$5`,[...scope,event.purpose_id,c.actor.principal_id])).rows);
  const workflow=receipt.workflow_id?requireOne((await c.tx.query(`SELECT state,updated_at FROM app.workflows WHERE ${predicate} AND id=$4 AND principal_id=$5`,[...scope,receipt.workflow_id,c.actor.principal_id])).rows):null;
  const stale=workflow&&(Number(aggregate.epoch)!==receipt.consent_epoch||(workflow.state==='COMPLETED'&&Date.now()-workflow.updated_at.getTime()>=300000));
  return S.ReceiptView.parse({receipt,current:{consent_status:aggregate.state,consent_epoch:Number(aggregate.epoch),propagation_status:stale?'NEEDS_ATTENTION':workflow?.state??'NOT_REQUIRED',as_of:new Date().toISOString()}});
}
export async function ownHistory(c: Context, purpose: string, page: Page) {
  requireOne((await c.tx.query(`SELECT id FROM app.purpose_versions WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),purpose])).rows);
  const rows=await c.tx.query(`SELECT receipt FROM app.consent_events WHERE ${predicate} AND purpose_id=$4 AND principal_id=$5 AND ($6::uuid IS NULL OR receipt_id>$6) ORDER BY receipt_id LIMIT $7`,[...scopeValues(c.actor),purpose,c.actor.principal_id,page.cursor,page.limit+1]);
  const items=rows.rows.slice(0,page.limit).map(row=>S.Receipt.parse(row.receipt));
  return {items,next_cursor:rows.rows.length>page.limit?Buffer.from(items.at(-1)!.receipt_id).toString('base64url'):null};
}
