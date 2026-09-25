import { z } from 'zod';

// Separate source module; all public DTOs must be registered in the canonical
// contract before exposing routes. A review is never an automated observation.
const Id = z.uuid();
const Time = z.iso.datetime();
const Text = z.string().trim().min(1).max(500);
export const GrcFrameworkCreate = z.strictObject({
  name: Text, version: z.string().trim().min(1).max(80), source_reference: Text,
  requirements: z.array(z.strictObject({ code: z.string().trim().min(1).max(80), description: Text })).min(1).max(100),
}).superRefine((v,c) => {
  if (new Set(v.requirements.map(r=>r.code)).size !== v.requirements.length)
    c.addIssue({code:'custom',path:['requirements'],message:'Requirement codes must be unique within a framework version.'});
});
export const GrcFramework = GrcFrameworkCreate.safeExtend({id:Id,recorded_at:Time,recorded_by:Id});
export const GrcControlCreate = z.strictObject({
  title:Text, description:Text, owner_reference:Text, review_interval_days:z.number().int().min(1).max(365),
  mappings:z.array(z.strictObject({framework_id:Id,requirement_code:z.string().trim().min(1).max(80)})).min(1).max(100),
}).superRefine((v,c)=>{
  if(new Set(v.mappings.map(m=>`${m.framework_id}:${m.requirement_code}`)).size!==v.mappings.length)
    c.addIssue({code:'custom',path:['mappings'],message:'Duplicate requirement mapping.'});
});
export const GrcControl = GrcControlCreate.safeExtend({id:Id,recorded_at:Time,recorded_by:Id});
export const GrcEvidenceSubmit = z.strictObject({
  description:Text, local_reference:Text, content_sha256:z.string().regex(/^[a-f0-9]{64}$/),
  collected_at:Time, valid_until:Time,
}).superRefine((v,c)=>{
  if(Date.parse(v.valid_until)<=Date.parse(v.collected_at))
    c.addIssue({code:'custom',path:['valid_until'],message:'Evidence validity must end after collection.'});
});
export const GrcEvidence = GrcEvidenceSubmit.safeExtend({id:Id,control_id:Id,recorded_at:Time,recorded_by:Id,provenance:z.literal('MANUAL_SUBMISSION')});
export const GrcEvidenceReviewCreate = z.strictObject({evidence_id:Id,decision:z.enum(['ACCEPT','REJECT']),reason:Text});
export const GrcEvidenceReview = GrcEvidenceReviewCreate.extend({id:Id,control_id:Id,recorded_at:Time,recorded_by:Id});
export const GrcControlStanding = z.strictObject({
  control_id:Id,as_of:Time,state:z.enum(['UNKNOWN','PENDING_REVIEW','REJECTED','STALE','MANUAL_REVIEW_ACCEPTED']),
  evidence_id:Id.nullable(),review_id:Id.nullable(),automated_effect_verified:z.literal(false),
});
export type EvidenceRecord = z.infer<typeof GrcEvidence>;
export type ReviewRecord = z.infer<typeof GrcEvidenceReview>;
export const GrcControlDetail=z.strictObject({control:GrcControl,evidence:GrcEvidence.nullable(),review:GrcEvidenceReview.nullable(),standing:GrcControlStanding});
const page=<T extends z.ZodType>(schema:T)=>z.strictObject({items:z.array(schema).max(100),next_cursor:z.string().max(200).nullable()});

export const GrcRiskCreate=z.strictObject({title:Text,description:Text,owner_reference:Text,
  likelihood:z.number().int().min(1).max(5),impact:z.number().int().min(1).max(5),
  review_due_at:Time,control_ids:z.array(Id).max(100),
}).superRefine((v,c)=>{if(new Set(v.control_ids).size!==v.control_ids.length)c.addIssue({code:'custom',path:['control_ids'],message:'Duplicate control.'});});
export const GrcRisk=GrcRiskCreate.safeExtend({id:Id,recorded_at:Time,recorded_by:Id});
export const GrcRiskTreatmentCreate=z.strictObject({
  response:z.enum(['MITIGATE','AVOID','TRANSFER','ACCEPT']),plan:Text,due_at:Time,
  acceptance_expires_at:Time.nullable(),
}).superRefine((v,c)=>{
  if((v.response==='ACCEPT')!==(v.acceptance_expires_at!==null))c.addIssue({code:'custom',path:['acceptance_expires_at'],message:'Only risk acceptance requires an expiry.'});
});
export const GrcRiskTreatment=GrcRiskTreatmentCreate.safeExtend({id:Id,risk_id:Id,recorded_at:Time,recorded_by:Id});
export const GrcRiskReviewCreate=z.strictObject({treatment_id:Id,decision:z.enum(['ACCEPT','REJECT']),reason:Text});
export const GrcRiskReview=GrcRiskReviewCreate.extend({id:Id,risk_id:Id,recorded_at:Time,recorded_by:Id});
export const GrcRiskStanding=z.strictObject({risk_id:Id,as_of:Time,
  state:z.enum(['OPEN','REVIEW_PENDING','PLAN_REJECTED','PLAN_REVIEWED','RISK_ACCEPTED','ACCEPTANCE_EXPIRED']),
  declared_score:z.number().int().min(1).max(25),review_overdue:z.boolean(),treatment_overdue:z.boolean(),
  treatment_id:Id.nullable(),review_id:Id.nullable(),mitigation_effect_verified:z.literal(false),
});
export function riskStanding(risk:z.infer<typeof GrcRisk>,treatment:z.infer<typeof GrcRiskTreatment>|null,review:z.infer<typeof GrcRiskReview>|null,now:Date){
  if(!Number.isFinite(now.getTime()))throw new Error('Invalid evaluation time');
  if(treatment&&treatment.risk_id!==risk.id)throw new Error('Treatment belongs to another risk');
  if(review&&(!treatment||review.risk_id!==risk.id||review.treatment_id!==treatment.id))throw new Error('Review belongs to another treatment');
  let state:z.infer<typeof GrcRiskStanding>['state']='OPEN';
  if(treatment){
    state='REVIEW_PENDING';
    if(review&&review.recorded_by!==risk.recorded_by&&review.recorded_by!==treatment.recorded_by){
      if(review.decision==='REJECT')state='PLAN_REJECTED';
      else if(treatment.response!=='ACCEPT')state='PLAN_REVIEWED';
      else state=treatment.acceptance_expires_at&&Date.parse(treatment.acceptance_expires_at)>now.getTime()?'RISK_ACCEPTED':'ACCEPTANCE_EXPIRED';
    }
  }
  return GrcRiskStanding.parse({risk_id:risk.id,as_of:now.toISOString(),state,
    declared_score:risk.likelihood*risk.impact,review_overdue:Date.parse(risk.review_due_at)<=now.getTime(),
    treatment_overdue:!!treatment&&Date.parse(treatment.due_at)<=now.getTime(),
    treatment_id:treatment?.id??null,review_id:review?.id??null,mitigation_effect_verified:false});
}
export const GrcRiskDetail=z.strictObject({risk:GrcRisk,treatment:GrcRiskTreatment.nullable(),review:GrcRiskReview.nullable(),standing:GrcRiskStanding});
export const GrcEvidenceHistoryRecord=GrcEvidence.safeExtend({review:GrcEvidenceReview.nullable()});
export const GrcTreatmentHistoryRecord=GrcRiskTreatment.safeExtend({review:GrcRiskReview.nullable()});
export const grcSchemas={GrcFrameworkCreate,GrcFramework,GrcControlCreate,GrcControl,GrcEvidenceSubmit,GrcEvidence,GrcEvidenceReviewCreate,GrcEvidenceReview,GrcControlStanding,GrcControlDetail,GrcFrameworkList:page(GrcFramework),GrcControlList:page(GrcControl),GrcRiskCreate,GrcRisk,GrcRiskTreatmentCreate,GrcRiskTreatment,GrcRiskReviewCreate,GrcRiskReview,GrcRiskStanding,GrcRiskDetail,GrcRiskList:page(GrcRisk),GrcEvidenceHistoryRecord,GrcTreatmentHistoryRecord,GrcEvidenceHistoryList:page(GrcEvidenceHistoryRecord),GrcTreatmentHistoryList:page(GrcTreatmentHistoryRecord)};

/** A new submission supersedes old evidence; an older acceptance cannot mask
 * a pending/rejected replacement. Caller loads the latest persisted records.
 * Database sequence, not a client timestamp, determines which record is latest. */
export function controlStanding(control:z.infer<typeof GrcControl>, evidence:EvidenceRecord|null, review:ReviewRecord|null, now:Date) {
  if(!Number.isFinite(now.getTime()))throw new Error('Invalid evaluation time');
  if(evidence && evidence.control_id!==control.id)throw new Error('Evidence belongs to another control');
  if(review && (!evidence || review.evidence_id!==evidence.id || review.control_id!==control.id))throw new Error('Review belongs to another submission');
  let state:z.infer<typeof GrcControlStanding>['state']='UNKNOWN';
  if(evidence){
    const expiry=Math.min(Date.parse(evidence.valid_until),Date.parse(evidence.collected_at)+control.review_interval_days*86400000);
    if(Date.parse(evidence.collected_at)>now.getTime() || expiry<=now.getTime())state='STALE';
    else if(!review)state='PENDING_REVIEW';
    else if(review.recorded_by===evidence.recorded_by || review.recorded_by===control.recorded_by)state='PENDING_REVIEW';
    else state=review.decision==='REJECT'?'REJECTED':'MANUAL_REVIEW_ACCEPTED';
  }
  return GrcControlStanding.parse({control_id:control.id,as_of:now.toISOString(),state,evidence_id:evidence?.id??null,review_id:review?.id??null,automated_effect_verified:false});
}
