import {randomUUID} from 'node:crypto';
import * as S from '../../../../shared/contracts/src/grc-audits.ts';
import {AccessError} from '../../../authorization/src/index.ts';
import {audit,predicate,scopeValues,requireOne,paged,type Context,type Page} from '../shared/transaction.ts';
import {grcDetail} from './grc.ts';

function guard(c:Context,cap:string){if(c.actor.actor_domain!=='STAFF'||!c.actor.capabilities.includes(cap)||!Number.isFinite(Date.parse(c.actor.expires_at))||Date.parse(c.actor.expires_at)<=Date.now())throw new AccessError(403,'FORBIDDEN');}
const recorded=(c:Context)=>({id:randomUUID(),recorded_by:c.actor.actor_id,recorded_at:new Date().toISOString()});
async function engagement(c:Context,id:string,open=false){
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scopeValues(c.actor),'grc-audit',id])]);
  const plan=S.GrcAudit.parse(requireOne((await c.tx.query(`SELECT document FROM app.grc_audits WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows).document);
  const rows=await c.tx.query(`SELECT document FROM app.grc_audit_closures WHERE ${predicate} AND audit_id=$4`,[...scopeValues(c.actor),id]);
  const closure=rows.rows.length?S.GrcAuditClosure.parse(rows.rows[0].document):null;
  if(open&&closure)throw new AccessError(409,'EPOCH_CONFLICT');
  return {audit:plan,closure};
}
async function request(c:Context,id:string,open=false){
  const r=S.GrcAuditRequest.parse(requireOne((await c.tx.query(`SELECT document FROM app.grc_audit_requests WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id])).rows).document);
  const plan=await engagement(c,r.audit_id,open);return {request:r,...plan};
}
export async function createGrcAudit(c:Context,input:unknown){
  guard(c,'grc.write');const value=S.GrcAuditCreate.parse(input);
  if(Date.parse(value.due_at)<=Date.now())throw new AccessError(400,'VALIDATION_ERROR');
  // Immutable control mappings define the exact audit scope.
  for(const id of [...value.control_ids].sort())await grcDetail(c,id);
  const doc=S.GrcAudit.parse({...value,...recorded(c)});
  await c.tx.query('INSERT INTO app.grc_audits(tenant_id,legal_entity_id,environment_id,id,document) VALUES($1,$2,$3,$4,$5)',[...scopeValues(c.actor),doc.id,doc]);
  await audit(c,'grc.audit.created',doc.id);return doc;
}
export async function grcAuditList(c:Context,page:Page){guard(c,'grc.read');const rows=await c.tx.query(`SELECT document FROM app.grc_audits WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);return paged(rows.rows.map(r=>S.GrcAudit.parse(r.document)),page);}
export async function grcAuditDetail(c:Context,id:string){guard(c,'grc.read');return S.GrcAuditDetail.parse(await engagement(c,id));}
export async function createGrcAuditRequest(c:Context,id:string,input:unknown){
  guard(c,'grc.write');const value=S.GrcAuditRequestCreate.parse(input),plan=await engagement(c,id,true);
  if(!plan.audit.control_ids.includes(value.control_id)||Date.parse(value.due_at)>Date.parse(plan.audit.due_at)||Date.parse(value.due_at)<=Date.now())throw new AccessError(400,'VALIDATION_ERROR');
  const count=Number((await c.tx.query(`SELECT count(*) n FROM app.grc_audit_requests WHERE ${predicate} AND audit_id=$4`,[...scopeValues(c.actor),id])).rows[0].n);
  if(count>=100)throw new AccessError(409,'EPOCH_CONFLICT');
  const doc=S.GrcAuditRequest.parse({...value,...recorded(c),audit_id:id});
  await c.tx.query('INSERT INTO app.grc_audit_requests(tenant_id,legal_entity_id,environment_id,id,audit_id,document) VALUES($1,$2,$3,$4,$5,$6)',[...scopeValues(c.actor),doc.id,id,doc]);
  await audit(c,'grc.audit.requested',doc.id);return doc;
}
export async function grcAuditRequests(c:Context,id:string,page:Page){guard(c,'grc.read');await engagement(c,id);if(page.cursor)requireOne((await c.tx.query(`SELECT id FROM app.grc_audit_requests WHERE ${predicate} AND audit_id=$4 AND id=$5`,[...scopeValues(c.actor),id,page.cursor])).rows);const rows=await c.tx.query(`SELECT document FROM app.grc_audit_requests WHERE ${predicate} AND audit_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`,[...scopeValues(c.actor),id,page.cursor,page.limit+1]);return paged(rows.rows.map(r=>S.GrcAuditRequest.parse(r.document)),page);}
async function responseDetail(c:Context,req:ReturnType<typeof S.GrcAuditRequest.parse>){
  const rows=await c.tx.query(`SELECT document FROM app.grc_audit_responses WHERE ${predicate} AND request_id=$4 ORDER BY sequence DESC LIMIT 1`,[...scopeValues(c.actor),req.id]);
  const response=rows.rows.length?S.GrcAuditResponse.parse(rows.rows[0].document):null;
  const reviews=response?await c.tx.query(`SELECT document FROM app.grc_audit_response_reviews WHERE ${predicate} AND response_id=$4`,[...scopeValues(c.actor),response.id]):null;
  const review=reviews?.rows.length?S.GrcAuditResponseReview.parse(reviews.rows[0].document):null;
  let state:'OPEN'|'REVIEW_PENDING'|'REJECTED'|'ACCEPTED'|'STALE'=response?'REVIEW_PENDING':'OPEN';
  if(response){const ctl=await grcDetail(c,req.control_id);if(ctl.evidence?.id!==response.evidence_id||ctl.standing.state!=='MANUAL_REVIEW_ACCEPTED')state='STALE';else if(review)state=review.decision==='ACCEPT'?'ACCEPTED':'REJECTED';}
  return S.GrcAuditRequestDetail.parse({request:req,response,review,state,as_of:new Date().toISOString()});
}
export async function grcAuditRequestDetail(c:Context,id:string){guard(c,'grc.read');return responseDetail(c,(await request(c,id)).request);}
export async function grcAuditResponseHistory(c:Context,id:string,page:Page){
  guard(c,'grc.read');await request(c,id);let before:string|null=null;
  if(page.cursor)before=String(requireOne((await c.tx.query(`SELECT sequence FROM app.grc_audit_responses WHERE ${predicate} AND request_id=$4 AND id=$5`,[...scopeValues(c.actor),id,page.cursor])).rows).sequence);
  const rows=await c.tx.query(`SELECT e.document,r.document review FROM app.grc_audit_responses e LEFT JOIN app.grc_audit_response_reviews r ON r.tenant_id=e.tenant_id AND r.legal_entity_id=e.legal_entity_id AND r.environment_id=e.environment_id AND r.response_id=e.id WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.request_id=$4 AND ($5::bigint IS NULL OR e.sequence<$5) ORDER BY e.sequence DESC LIMIT $6`,[...scopeValues(c.actor),id,before,page.limit+1]);
  return paged(rows.rows.map(r=>S.GrcAuditResponseHistoryRecord.parse({...r.document,review:r.review??null})),page);
}
export async function respondGrcAuditRequest(c:Context,id:string,input:unknown){
  guard(c,'grc.write');const value=S.GrcAuditResponseCreate.parse(input),req=await request(c,id,true),ctl=await grcDetail(c,req.request.control_id);
  if(ctl.evidence?.id!==value.evidence_id||ctl.standing.state!=='MANUAL_REVIEW_ACCEPTED')throw new AccessError(409,'EPOCH_CONFLICT');
  const doc=S.GrcAuditResponse.parse({...value,...recorded(c),request_id:id,evidence_snapshot:ctl.evidence});
  await c.tx.query('INSERT INTO app.grc_audit_responses(tenant_id,legal_entity_id,environment_id,id,request_id,evidence_id,document) VALUES($1,$2,$3,$4,$5,$6,$7)',[...scopeValues(c.actor),doc.id,id,value.evidence_id,doc]);
  await audit(c,'grc.audit.responded',doc.id);return doc;
}
export async function reviewGrcAuditResponse(c:Context,id:string,input:unknown){
  guard(c,'grc.approve');const value=S.GrcAuditResponseReviewCreate.parse(input),req=await request(c,id,true),detail=await responseDetail(c,req.request);
  if(!detail.response||detail.response.id!==value.response_id||detail.review||(value.decision==='ACCEPT'&&detail.state==='STALE'))throw new AccessError(409,'EPOCH_CONFLICT');
  if([req.audit.recorded_by,req.request.recorded_by,detail.response.recorded_by,detail.response.evidence_snapshot.recorded_by].includes(c.actor.actor_id))throw new AccessError(403,'FORBIDDEN');
  if((await grcDetail(c,req.request.control_id)).control.recorded_by===c.actor.actor_id)throw new AccessError(403,'FORBIDDEN');
  const doc=S.GrcAuditResponseReview.parse({...value,...recorded(c),request_id:id});
  await c.tx.query('INSERT INTO app.grc_audit_response_reviews(tenant_id,legal_entity_id,environment_id,id,response_id,document) VALUES($1,$2,$3,$4,$5,$6)',[...scopeValues(c.actor),doc.id,value.response_id,doc]);
  await audit(c,'grc.audit.response_reviewed',doc.id);return doc;
}
export async function closeGrcAudit(c:Context,id:string,input:unknown){
  guard(c,'grc.approve');const value=S.GrcAuditCloseCreate.parse(input),plan=await engagement(c,id,true);
  if(plan.audit.recorded_by===c.actor.actor_id)throw new AccessError(403,'FORBIDDEN');
  // Lock every scoped control in deterministic order before checking evidence.
  for(const controlId of [...plan.audit.control_ids].sort())if((await grcDetail(c,controlId)).control.recorded_by===c.actor.actor_id)throw new AccessError(403,'FORBIDDEN');
  const rows=await c.tx.query(`SELECT document FROM app.grc_audit_requests WHERE ${predicate} AND audit_id=$4 ORDER BY id`,[...scopeValues(c.actor),id]);
  const requests=rows.rows.map(r=>S.GrcAuditRequest.parse(r.document));
  if(!requests.length||plan.audit.control_ids.some(controlId=>!requests.some(r=>r.control_id===controlId)))throw new AccessError(409,'EPOCH_CONFLICT');
  const responses:string[]=[];
  for(const req of requests){const detail=await responseDetail(c,req);if(detail.state!=='ACCEPTED'||!detail.response)throw new AccessError(409,'EPOCH_CONFLICT');if([req.recorded_by,detail.response.recorded_by,detail.response.evidence_snapshot.recorded_by].includes(c.actor.actor_id))throw new AccessError(403,'FORBIDDEN');responses.push(detail.response.id);}
  const doc=S.GrcAuditClosure.parse({...value,...recorded(c),audit_id:id,accepted_response_ids:responses,certification_asserted:false});
  await c.tx.query('INSERT INTO app.grc_audit_closures(tenant_id,legal_entity_id,environment_id,id,audit_id,document) VALUES($1,$2,$3,$4,$5,$6)',[...scopeValues(c.actor),doc.id,id,doc]);
  await audit(c,'grc.audit.closed',doc.id);return doc;
}
