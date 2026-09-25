import {randomUUID} from 'node:crypto';
import * as S from '../../../../shared/contracts/src/grc.ts';
import {AccessError} from '../../../authorization/src/index.ts';
import {audit,predicate,scopeValues,requireOne,paged,type Context,type Page} from '../shared/transaction.ts';

function guard(c:Context,cap:string){if(c.actor.actor_domain!=='STAFF'||!c.actor.capabilities.includes(cap)||!Number.isFinite(Date.parse(c.actor.expires_at))||Date.parse(c.actor.expires_at)<=Date.now())throw new AccessError(403,'FORBIDDEN');}
export async function createGrcRisk(c:Context,input:unknown){
  guard(c,'grc.write');const value=S.GrcRiskCreate.parse(input);
  for(const id of value.control_ids)requireOne((await c.tx.query(`SELECT id FROM app.grc_controls WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows);
  const doc=S.GrcRisk.parse({...value,id:randomUUID(),recorded_at:new Date().toISOString(),recorded_by:c.actor.actor_id});
  await c.tx.query('INSERT INTO app.grc_risks(tenant_id,legal_entity_id,environment_id,id,document) VALUES($1,$2,$3,$4,$5)',[...scopeValues(c.actor),doc.id,doc]);
  await audit(c,'grc.risk.created',doc.id);return doc;
}
export async function grcRiskList(c:Context,page:Page){
  guard(c,'grc.read');const r=await c.tx.query(`SELECT document FROM app.grc_risks WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
  return paged(r.rows.map(row=>S.GrcRisk.parse(row.document)),page);
}
async function risk(c:Context,id:string){
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scopeValues(c.actor),'grc-risk',id])]);
  return S.GrcRisk.parse(requireOne((await c.tx.query(`SELECT document FROM app.grc_risks WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows).document);
}
async function latest(c:Context,id:string){
  const r=await c.tx.query(`SELECT document FROM app.grc_risk_treatments WHERE ${predicate} AND risk_id=$4 ORDER BY sequence DESC LIMIT 1`,[...scopeValues(c.actor),id]);
  return r.rows.length?S.GrcRiskTreatment.parse(r.rows[0].document):null;
}
export async function proposeGrcRiskTreatment(c:Context,id:string,input:unknown){
  guard(c,'grc.write');const value=S.GrcRiskTreatmentCreate.parse(input);await risk(c,id);
  const now=new Date();
  if(Date.parse(value.due_at)<=now.getTime()||(value.acceptance_expires_at&&Date.parse(value.acceptance_expires_at)<=now.getTime()))throw new AccessError(400,'VALIDATION_ERROR');
  const doc=S.GrcRiskTreatment.parse({...value,id:randomUUID(),risk_id:id,recorded_at:now.toISOString(),recorded_by:c.actor.actor_id});
  await c.tx.query('INSERT INTO app.grc_risk_treatments(tenant_id,legal_entity_id,environment_id,id,risk_id,document) VALUES($1,$2,$3,$4,$5,$6)',[...scopeValues(c.actor),doc.id,id,doc]);
  await audit(c,'grc.risk.treatment_proposed',doc.id);return doc;
}
export async function reviewGrcRiskTreatment(c:Context,id:string,input:unknown){
  guard(c,'grc.approve');const value=S.GrcRiskReviewCreate.parse(input),record=await risk(c,id),treatment=await latest(c,id);
  if(!treatment||treatment.id!==value.treatment_id)throw new AccessError(409,'EPOCH_CONFLICT');
  if(record.recorded_by===c.actor.actor_id||treatment.recorded_by===c.actor.actor_id)throw new AccessError(403,'FORBIDDEN');
  const now=new Date();
  if(value.decision==='ACCEPT'&&(Date.parse(treatment.due_at)<=now.getTime()||(treatment.acceptance_expires_at&&Date.parse(treatment.acceptance_expires_at)<=now.getTime())))throw new AccessError(409,'EPOCH_CONFLICT');
  const doc=S.GrcRiskReview.parse({...value,id:randomUUID(),risk_id:id,recorded_at:now.toISOString(),recorded_by:c.actor.actor_id});
  const r=await c.tx.query('INSERT INTO app.grc_risk_reviews(tenant_id,legal_entity_id,environment_id,id,treatment_id,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id',[...scopeValues(c.actor),doc.id,treatment.id,doc]);
  if(!r.rowCount)throw new AccessError(409,'EPOCH_CONFLICT');
  await audit(c,'grc.risk.treatment_reviewed',doc.id);return doc;
}
export async function grcRiskDetail(c:Context,id:string){
  guard(c,'grc.read');const record=await risk(c,id),treatment=await latest(c,id);
  const rows=treatment?await c.tx.query(`SELECT document FROM app.grc_risk_reviews WHERE ${predicate} AND treatment_id=$4`,[...scopeValues(c.actor),treatment.id]):null;
  const review=rows?.rows.length?S.GrcRiskReview.parse(rows.rows[0].document):null;
  return S.GrcRiskDetail.parse({risk:record,treatment,review,standing:S.riskStanding(record,treatment,review,new Date())});
}

export async function grcTreatmentHistory(c:Context,id:string,page:Page){
  guard(c,'grc.read');await risk(c,id);
  let before:string|null=null;
  if(page.cursor)before=String(requireOne((await c.tx.query(`SELECT sequence FROM app.grc_risk_treatments WHERE ${predicate} AND risk_id=$4 AND id=$5`,[...scopeValues(c.actor),id,page.cursor])).rows).sequence);
  const rows=await c.tx.query(`SELECT t.document,r.document AS review FROM app.grc_risk_treatments t
    LEFT JOIN app.grc_risk_reviews r ON r.tenant_id=t.tenant_id AND r.legal_entity_id=t.legal_entity_id AND r.environment_id=t.environment_id AND r.treatment_id=t.id
    WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 AND t.risk_id=$4
    AND ($5::bigint IS NULL OR t.sequence<$5) ORDER BY t.sequence DESC LIMIT $6`,[...scopeValues(c.actor),id,before,page.limit+1]);
  return paged(rows.rows.map(row=>S.GrcTreatmentHistoryRecord.parse({...row.document,review:row.review??null})),page);
}
