import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/grc.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit,predicate,scopeValues,requireOne,paged,type Context,type Page } from '../shared/transaction.ts';

function guard(c:Context,cap:string){
  if(c.actor.actor_domain!=='STAFF'||!c.actor.capabilities.includes(cap)||!Number.isFinite(Date.parse(c.actor.expires_at))||Date.parse(c.actor.expires_at)<=Date.now())throw new AccessError(403,'FORBIDDEN');
}
const tables={frameworks:'grc_frameworks',controls:'grc_controls'} as const;
export async function grcList(c:Context,kind:keyof typeof tables,page:Page){
  guard(c,'grc.read');
  const schema=kind==='frameworks'?S.GrcFramework:S.GrcControl;
  const rows=await c.tx.query(`SELECT document FROM app.${tables[kind]} WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,[...scopeValues(c.actor),page.cursor,page.limit+1]);
  return paged(rows.rows.map(r=>schema.parse(r.document)),page);
}
export async function createGrcFramework(c:Context,input:unknown){
  guard(c,'grc.write');
  const value=S.GrcFrameworkCreate.parse(input);
  const doc=S.GrcFramework.parse({...value,id:randomUUID(),recorded_at:new Date().toISOString(),recorded_by:c.actor.actor_id});
  const row=await c.tx.query(`INSERT INTO app.grc_frameworks(tenant_id,legal_entity_id,environment_id,id,document) VALUES($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING RETURNING id`,[...scopeValues(c.actor),doc.id,doc]);
  if(!row.rowCount)throw new AccessError(409,'EPOCH_CONFLICT');
  await audit(c,'grc.framework.created',doc.id);return doc;
}
export async function createGrcControl(c:Context,input:unknown){
  guard(c,'grc.write');const value=S.GrcControlCreate.parse(input);
  for(const mapping of value.mappings){
    const r=await c.tx.query(`SELECT document FROM app.grc_frameworks WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),mapping.framework_id]);
    const framework=S.GrcFramework.parse(requireOne(r.rows).document);
    if(!framework.requirements.some(r=>r.code===mapping.requirement_code))throw new AccessError(400,'VALIDATION_ERROR');
  }
  const doc=S.GrcControl.parse({...value,id:randomUUID(),recorded_at:new Date().toISOString(),recorded_by:c.actor.actor_id});
  await c.tx.query(`INSERT INTO app.grc_controls(tenant_id,legal_entity_id,environment_id,id,document) VALUES($1,$2,$3,$4,$5)`,[...scopeValues(c.actor),doc.id,doc]);
  await audit(c,'grc.control.created',doc.id);return doc;
}
async function control(c:Context,id:string,lock=false){
  // All submissions/reviews serialize on the same scoped control, so a review
  // cannot approve evidence superseded while the reviewer was deciding.
  if(lock)await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[JSON.stringify([...scopeValues(c.actor),'grc-control',id])]);
  const r=await c.tx.query(`SELECT document FROM app.grc_controls WHERE ${predicate} AND id=$4`,[...scopeValues(c.actor),id]);
  return S.GrcControl.parse(requireOne(r.rows).document);
}
async function latest(c:Context,id:string){
  const r=await c.tx.query(`SELECT document FROM app.grc_evidence WHERE ${predicate} AND control_id=$4 ORDER BY sequence DESC LIMIT 1`,[...scopeValues(c.actor),id]);
  return r.rows.length?S.GrcEvidence.parse(r.rows[0].document):null;
}
export async function submitGrcEvidence(c:Context,id:string,input:unknown){
  guard(c,'grc.write');const value=S.GrcEvidenceSubmit.parse(input);await control(c,id,true);
  const now=new Date();
  if(Date.parse(value.collected_at)>now.getTime()||Date.parse(value.valid_until)<=now.getTime())throw new AccessError(400,'VALIDATION_ERROR');
  const doc=S.GrcEvidence.parse({...value,id:randomUUID(),control_id:id,recorded_at:now.toISOString(),recorded_by:c.actor.actor_id,provenance:'MANUAL_SUBMISSION'});
  await c.tx.query(`INSERT INTO app.grc_evidence(tenant_id,legal_entity_id,environment_id,id,control_id,document) VALUES($1,$2,$3,$4,$5,$6)`,[...scopeValues(c.actor),doc.id,id,doc]);
  await audit(c,'grc.evidence.submitted',doc.id);return doc;
}
export async function reviewGrcEvidence(c:Context,id:string,input:unknown){
  guard(c,'grc.approve');const value=S.GrcEvidenceReviewCreate.parse(input);
  const ctl=await control(c,id,true),evidence=await latest(c,id);
  if(!evidence||evidence.id!==value.evidence_id)throw new AccessError(409,'EPOCH_CONFLICT');
  if(c.actor.actor_id===evidence.recorded_by||c.actor.actor_id===ctl.recorded_by)throw new AccessError(403,'FORBIDDEN');
  const now=new Date();
  if(value.decision==='ACCEPT'&&S.controlStanding(ctl,evidence,null,now).state==='STALE')throw new AccessError(409,'EPOCH_CONFLICT');
  const doc=S.GrcEvidenceReview.parse({...value,id:randomUUID(),control_id:id,recorded_at:now.toISOString(),recorded_by:c.actor.actor_id});
  const r=await c.tx.query(`INSERT INTO app.grc_reviews(tenant_id,legal_entity_id,environment_id,id,evidence_id,document) VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING RETURNING id`,[...scopeValues(c.actor),doc.id,evidence.id,doc]);
  if(!r.rowCount)throw new AccessError(409,'EPOCH_CONFLICT');
  await audit(c,'grc.evidence.reviewed',doc.id);return doc;
}
export async function grcStanding(c:Context,id:string){
  return (await grcDetail(c,id)).standing;
}
export async function grcDetail(c:Context,id:string){
  guard(c,'grc.read');const ctl=await control(c,id,true),evidence=await latest(c,id);
  const r=evidence?await c.tx.query(`SELECT document FROM app.grc_reviews WHERE ${predicate} AND evidence_id=$4`,[...scopeValues(c.actor),evidence.id]):null;
  const review=r?.rows.length?S.GrcEvidenceReview.parse(r.rows[0].document):null;
  return S.GrcControlDetail.parse({control:ctl,evidence,review,standing:S.controlStanding(ctl,evidence,review,new Date())});
}

export async function grcEvidenceHistory(c:Context,id:string,page:Page){
  guard(c,'grc.read');await control(c,id);
  let before:string|null=null;
  if(page.cursor)before=String(requireOne((await c.tx.query(`SELECT sequence FROM app.grc_evidence WHERE ${predicate} AND control_id=$4 AND id=$5`,[...scopeValues(c.actor),id,page.cursor])).rows).sequence);
  const rows=await c.tx.query(`SELECT e.document,r.document AS review FROM app.grc_evidence e
    LEFT JOIN app.grc_reviews r ON r.tenant_id=e.tenant_id AND r.legal_entity_id=e.legal_entity_id AND r.environment_id=e.environment_id AND r.evidence_id=e.id
    WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.control_id=$4
    AND ($5::bigint IS NULL OR e.sequence<$5) ORDER BY e.sequence DESC LIMIT $6`,[...scopeValues(c.actor),id,before,page.limit+1]);
  return paged(rows.rows.map(row=>S.GrcEvidenceHistoryRecord.parse({...row.document,review:row.review??null})),page);
}
