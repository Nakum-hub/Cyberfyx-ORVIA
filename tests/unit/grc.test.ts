import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import * as S from '../../shared/contracts/src/grc.ts';
const now=new Date('2026-09-25T12:00:00.000Z');
const owner=randomUUID(),submitter=randomUUID(),reviewer=randomUUID();
const control=S.GrcControl.parse({id:randomUUID(),title:'Synthetic access review',description:'Review access',owner_reference:'IT',review_interval_days:30,mappings:[{framework_id:randomUUID(),requirement_code:'AC-1'}],recorded_at:now.toISOString(),recorded_by:owner});
const evidence=S.GrcEvidence.parse({id:randomUUID(),control_id:control.id,description:'Synthetic evidence',local_reference:'local:evidence-1',content_sha256:'a'.repeat(64),collected_at:'2026-09-24T12:00:00.000Z',valid_until:'2026-12-24T12:00:00.000Z',recorded_at:now.toISOString(),recorded_by:submitter,provenance:'MANUAL_SUBMISSION'});
const review=S.GrcEvidenceReview.parse({id:randomUUID(),control_id:control.id,evidence_id:evidence.id,decision:'ACCEPT',reason:'Reviewed synthetic evidence',recorded_at:now.toISOString(),recorded_by:reviewer});
test('missing evidence is unknown, not a pass',()=>assert.equal(S.controlStanding(control,null,null,now).state,'UNKNOWN'));
test('submission alone remains pending',()=>assert.equal(S.controlStanding(control,evidence,null,now).state,'PENDING_REVIEW'));
test('independent acceptance remains explicitly manual',()=>{
  const result=S.controlStanding(control,evidence,review,now);
  assert.equal(result.state,'MANUAL_REVIEW_ACCEPTED');assert.equal(result.automated_effect_verified,false);
});
test('rejection does not turn into acceptance',()=>assert.equal(S.controlStanding(control,evidence,{...review,decision:'REJECT'},now).state,'REJECTED'));
test('control interval caps evidence validity at exact boundary',()=>assert.equal(S.controlStanding(control,evidence,review,new Date('2026-10-24T12:00:00.000Z')).state,'STALE'));
test('declared earlier expiry is enforced at exact boundary',()=>assert.equal(S.controlStanding(control,{...evidence,valid_until:now.toISOString()},review,now).state,'STALE'));
test('future-dated evidence cannot establish acceptance',()=>assert.equal(S.controlStanding(control,{...evidence,collected_at:'2026-09-26T00:00:00.000Z'},review,now).state,'STALE'));
test('self-review and control-author review cannot establish acceptance',()=>{
  for(const recorded_by of [owner,submitter])assert.equal(S.controlStanding(control,evidence,{...review,recorded_by},now).state,'PENDING_REVIEW');
});
test('review for superseded evidence cannot be applied to replacement',()=>assert.throws(()=>S.controlStanding(control,{...evidence,id:randomUUID()},review,now)));
test('evidence from another control is rejected',()=>assert.throws(()=>S.controlStanding(control,{...evidence,control_id:randomUUID()},null,now)));
test('duplicate requirements and mappings are rejected',()=>{
  assert.equal(S.GrcFrameworkCreate.safeParse({name:'Synthetic',version:'1',source_reference:'Synthetic',requirements:[{code:'A',description:'A'},{code:'A',description:'B'}]}).success,false);
  const {title,description,owner_reference,review_interval_days}=control;
  assert.equal(S.GrcControlCreate.safeParse({title,description,owner_reference,review_interval_days,mappings:[control.mappings[0],control.mappings[0]]}).success,false);
});

const risk=S.GrcRisk.parse({id:randomUUID(),title:'Synthetic risk',description:'Overbroad access',owner_reference:'IT',likelihood:3,impact:4,review_due_at:'2026-10-01T00:00:00.000Z',control_ids:[control.id],recorded_at:now.toISOString(),recorded_by:owner});
const treatment=S.GrcRiskTreatment.parse({id:randomUUID(),risk_id:risk.id,response:'ACCEPT',plan:'Temporary acceptance pending review',due_at:'2026-10-01T00:00:00.000Z',acceptance_expires_at:'2026-10-01T00:00:00.000Z',recorded_at:now.toISOString(),recorded_by:submitter});
const riskReview=S.GrcRiskReview.parse({id:randomUUID(),risk_id:risk.id,treatment_id:treatment.id,decision:'ACCEPT',reason:'Synthetic independent review',recorded_at:now.toISOString(),recorded_by:reviewer});
test('risk score derives only from declared factors; no evidence claim',()=>{
  const result=S.riskStanding(risk,null,null,now);
  assert.equal(result.state,'OPEN');assert.equal(result.declared_score,12);assert.equal(result.mitigation_effect_verified,false);
});
test('acceptance requires independent review and expires at its boundary',()=>{
  assert.equal(S.riskStanding(risk,treatment,null,now).state,'REVIEW_PENDING');
  assert.equal(S.riskStanding(risk,treatment,riskReview,now).state,'RISK_ACCEPTED');
  const expired=S.riskStanding(risk,treatment,riskReview,new Date(treatment.acceptance_expires_at!));
  assert.equal(expired.state,'ACCEPTANCE_EXPIRED');assert.equal(expired.review_overdue,true);
});
test('reviewed mitigation plan is not resolved risk',()=>{
  const result=S.riskStanding(risk,{...treatment,response:'MITIGATE',acceptance_expires_at:null},riskReview,now);
  assert.equal(result.state,'PLAN_REVIEWED');assert.equal(result.mitigation_effect_verified,false);
});
test('risk owner cannot self-accept a treatment',()=>assert.equal(S.riskStanding(risk,treatment,{...riskReview,recorded_by:owner},now).state,'REVIEW_PENDING'));
test('replacement treatment cannot inherit old review',()=>assert.throws(()=>S.riskStanding(risk,{...treatment,id:randomUUID()},riskReview,now)));
test('risk acceptance expiry is mandatory and forbidden for other responses',()=>{
  assert.equal(S.GrcRiskTreatmentCreate.safeParse({response:'ACCEPT',plan:'Risk accepted',due_at:now.toISOString(),acceptance_expires_at:null}).success,false);
  assert.equal(S.GrcRiskTreatmentCreate.safeParse({response:'MITIGATE',plan:'Mitigation plan',due_at:now.toISOString(),acceptance_expires_at:now.toISOString()}).success,false);
});
