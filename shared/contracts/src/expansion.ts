import { z } from 'zod';
import { Id, Reference, SafeText, Time, page } from './primitives.ts';

// ---------------------------------------------------------------------------
// Expanded V1 delivery families (docs/engineering/V1_EXPANDED_BASELINE.md).
// Each section is one family; nothing here is a certification, a legal
// conclusion or an observed external effect unless a field says so.
// ---------------------------------------------------------------------------

// EX06 — general impact assessments -------------------------------------------
export const ImpactKind = z.enum(['PIA', 'DPIA', 'SDF_DPIA', 'AI', 'VENDOR_DUE_DILIGENCE', 'OTHER']);
export const ImpactQuestion = z.strictObject({
  key: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/), text: z.string().min(3).max(500),
  answer_type: z.enum(['YES_NO', 'TEXT', 'CHOICE', 'NUMBER']), choices: z.array(z.string().min(1).max(120)).max(20),
  required: z.boolean(), evidence_required: z.boolean(),
  /** An answer equal to this value raises a finding when the assessment is submitted. */
  finding_when: z.string().min(1).max(120).nullable(), finding_severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).nullable(),
  guidance: z.string().max(1000).nullable(),
}).superRefine((q, c) => {
  if ((q.answer_type === 'CHOICE') !== (q.choices.length > 0)) c.addIssue({ code: 'custom', path: ['choices'], message: 'Only a choice question lists choices, and it always does' });
  if ((q.finding_when === null) !== (q.finding_severity === null)) c.addIssue({ code: 'custom', path: ['finding_severity'], message: 'A finding rule names both the answer and the severity' });
  if (q.answer_type === 'YES_NO' && q.finding_when !== null && !['YES', 'NO'].includes(q.finding_when)) c.addIssue({ code: 'custom', path: ['finding_when'], message: 'A yes/no rule triggers on YES or NO' });
  if (q.answer_type === 'CHOICE' && q.finding_when !== null && !q.choices.includes(q.finding_when)) c.addIssue({ code: 'custom', path: ['finding_when'], message: 'A choice rule triggers on one of the choices' });
});
export const ImpactTemplateCreate = z.strictObject({
  /** Null starts a new template; an existing key records its next version. */
  template_key: Id.nullable(), kind: ImpactKind, name: z.string().min(1).max(120), description: z.string().min(10).max(2000),
  questions: z.array(ImpactQuestion).min(1).max(100), requirement_ids: z.array(z.string().max(80)).max(30),
  review_interval_days: z.number().int().min(1).max(1095),
}).superRefine((t, c) => { if (new Set(t.questions.map(q => q.key)).size !== t.questions.length) c.addIssue({ code: 'custom', path: ['questions'], message: 'Question keys are unique within a version' }); });
export const ImpactTemplate = z.strictObject({
  id: Id, template_key: Id, version: z.number().int().positive(), kind: ImpactKind, name: SafeText, description: z.string().max(2000),
  questions: z.array(ImpactQuestion).max(100), requirement_ids: z.array(z.string().max(80)).max(30), review_interval_days: z.number().int(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'RETIRED']), recorded_by: Id, recorded_at: Time, published_by: Id.nullable(), published_at: Time.nullable(),
});
export const ImpactTemplatePublish = z.strictObject({ action: z.enum(['PUBLISH', 'RETIRE']) });

export const ImpactSubjectKind = z.enum(['ORGANISATION', 'ACTIVITY', 'SYSTEM', 'PROCESSOR', 'PROCESSOR_ENGAGEMENT', 'AI_SYSTEM']);
export const ImpactAssessmentCreate = z.strictObject({
  template_id: Id, subject_kind: ImpactSubjectKind, subject_id: Id.nullable(), title: z.string().min(1).max(160), owner_reference: SafeText, due_at: Time,
}).superRefine((a, c) => { if ((a.subject_kind === 'ORGANISATION') !== (a.subject_id === null)) c.addIssue({ code: 'custom', path: ['subject_id'], message: 'An organisation-wide assessment names no subject; every other names one' }); });
export const ImpactAnswerInput = z.strictObject({ question_key: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/), value: z.string().min(1).max(4000), evidence_reference: Reference.nullable() });
export const ImpactAnswersRecord = z.strictObject({ answers: z.array(ImpactAnswerInput).min(1).max(100) });
export const ImpactDecision = z.strictObject({ decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().min(10).max(1000) });
export const ImpactRevise = z.strictObject({ reason: z.string().min(10).max(500), due_at: Time });
export const ImpactFindingCreate = z.strictObject({
  question_key: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/).nullable(), title: z.string().min(3).max(300), severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
  owner_reference: SafeText, due_at: Time, grc_risk_id: Id.nullable(), grc_control_id: Id.nullable(),
});
export const ImpactFindingEventRecord = z.strictObject({
  kind: z.enum(['REMEDIATION_PLANNED', 'RESOLVED', 'RISK_ACCEPTED', 'REOPENED']), note: z.string().min(10).max(1000),
  evidence_reference: Reference.nullable(), acceptance_expires_at: Time.nullable(),
}).superRefine((e, c) => {
  if ((e.kind === 'RISK_ACCEPTED') !== (e.acceptance_expires_at !== null)) c.addIssue({ code: 'custom', path: ['acceptance_expires_at'], message: 'Only a risk acceptance expires, and it always does' });
  if (e.kind === 'RESOLVED' && e.evidence_reference === null) c.addIssue({ code: 'custom', path: ['evidence_reference'], message: 'A resolution cites the evidence of remediation' });
});
export const ImpactFindingEvent = z.strictObject({ id: Id, kind: z.enum(['REMEDIATION_PLANNED', 'RESOLVED', 'RISK_ACCEPTED', 'ESCALATED', 'REOPENED']), note: z.string().max(1000),
  evidence_reference: SafeText.nullable(), acceptance_expires_at: Time.nullable(), actor_id: Id, recorded_at: Time });
export const ImpactFindingState = z.enum(['OPEN', 'REMEDIATION_PLANNED', 'RESOLVED', 'RISK_ACCEPTED', 'ACCEPTANCE_EXPIRED']);
export const ImpactFinding = z.strictObject({
  id: Id, assessment_id: Id, question_key: z.string().nullable(), source: z.enum(['ANSWER_RULE', 'REVIEWER', 'MANUAL']), title: z.string().max(300),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), owner_reference: SafeText, due_at: Time, grc_risk_id: Id.nullable(), grc_control_id: Id.nullable(),
  state: ImpactFindingState, overdue: z.boolean(), blocks_approval: z.boolean(), events: z.array(ImpactFindingEvent).max(100), created_by: Id, created_at: Time,
});
export const ImpactAnswer = z.strictObject({ question_key: z.string(), value: z.string().max(4000), evidence_reference: SafeText.nullable(), carried_forward: z.boolean(), answered_by: Id, answered_at: Time });
export const ImpactAssessmentStatus = z.enum(['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'SUPERSEDED']);
export const ImpactAssessmentDetail = z.strictObject({
  id: Id, template: ImpactTemplate, revision: z.number().int().positive(), previous_id: Id.nullable(),
  subject_kind: ImpactSubjectKind, subject_id: Id.nullable(), title: z.string().max(160), owner_reference: SafeText, due_at: Time,
  status: ImpactAssessmentStatus, overdue: z.boolean(), review_due: z.boolean(), next_review_at: Time.nullable(),
  created_by: Id, created_at: Time, submitted_by: Id.nullable(), submitted_at: Time.nullable(), decided_by: Id.nullable(), decided_at: Time.nullable(), decision_note: z.string().max(1000).nullable(),
  answers: z.array(ImpactAnswer).max(100),
  /** Required questions without an answer, or without evidence where evidence is required. */
  missing: z.array(z.strictObject({ question_key: z.string(), reason: z.enum(['NOT_ANSWERED', 'EVIDENCE_MISSING']) })).max(100),
  findings: z.array(ImpactFinding).max(100),
  /** Why the assessment cannot be approved now; empty when it can. */
  approval_blockers: z.array(z.string().max(200)).max(20),
});
export const ImpactAssessmentSummary = z.strictObject({
  id: Id, template_name: SafeText, kind: ImpactKind, revision: z.number().int(), subject_kind: ImpactSubjectKind, subject_id: Id.nullable(), title: z.string().max(160),
  status: ImpactAssessmentStatus, due_at: Time, overdue: z.boolean(), review_due: z.boolean(), open_findings: z.number().int().min(0),
});
export const ImpactAssessmentQuery = z.strictObject({ status: ImpactAssessmentStatus.optional(), subject_kind: ImpactSubjectKind.optional(), subject_id: Id.optional() });
export const ImpactEscalationSweep = z.strictObject({ escalated: z.number().int().min(0), finding_ids: z.array(Id).max(200) });

export const expansionSchemas = {
  ImpactQuestion, ImpactTemplateCreate, ImpactTemplate, ImpactTemplatePublish, ImpactTemplateList: page(ImpactTemplate),
  ImpactAssessmentCreate, ImpactAnswersRecord, ImpactDecision, ImpactRevise, ImpactFindingCreate, ImpactFindingEventRecord, ImpactFinding,
  ImpactAssessmentDetail, ImpactAssessmentSummary, ImpactAssessmentList: page(ImpactAssessmentSummary), ImpactAssessmentQuery, ImpactEscalationSweep,
};
