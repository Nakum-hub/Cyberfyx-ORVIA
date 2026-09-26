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
export const ImpactAnswer = z.strictObject({ question_key: z.string(), value: z.string().max(4000), evidence_reference: SafeText.nullable(), carried_forward: z.boolean(),
  /** SUPPLIER answers are attestations until a staff member records the answer themselves. */
  respondent: z.enum(['STAFF', 'SUPPLIER']), answered_by: Id, answered_at: Time });
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

// EX08 — third-party lifecycle ---------------------------------------------------
export const AgreementKind = z.enum(['DPA', 'MSA', 'SCC', 'NDA', 'OTHER']);
export const RegionCode = z.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/);
export const AgreementCreate = z.strictObject({
  processor_id: Id, kind: AgreementKind, reference: Reference, signed_at: Time, effective_from: Time, expires_at: Time.nullable(),
  allowed_purpose_ids: z.array(Id).max(50), allowed_regions: z.array(RegionCode).max(50),
  subprocessors_allowed: z.boolean(), onward_transfer_allowed: z.boolean(), evidence_reference: Reference, supersedes_id: Id.nullable(),
}).superRefine((a, c) => {
  if (a.expires_at !== null && Date.parse(a.expires_at) <= Date.parse(a.effective_from)) c.addIssue({ code: 'custom', path: ['expires_at'], message: 'An agreement expires after it takes effect' });
  if (Date.parse(a.signed_at) > Date.parse(a.effective_from) + 366 * 86_400_000) c.addIssue({ code: 'custom', path: ['signed_at'], message: 'Signing date is implausibly far after the effective date' });
});
export const Agreement = z.strictObject({
  id: Id, processor_id: Id, kind: AgreementKind, reference: SafeText, signed_at: Time, effective_from: Time, expires_at: Time.nullable(),
  allowed_purpose_ids: z.array(Id).max(50), allowed_regions: z.array(z.string()).max(50), subprocessors_allowed: z.boolean(), onward_transfer_allowed: z.boolean(),
  evidence_reference: SafeText, supersedes_id: Id.nullable(), status: z.enum(['ACTIVE', 'TERMINATED']), terminated_at: Time.nullable(), termination_reason: SafeText.nullable(),
  /** ACTIVE and in its effective period now. */
  in_force: z.boolean(), superseded: z.boolean(), recorded_by: Id, recorded_at: Time,
});
export const AgreementTerminate = z.strictObject({ reason: z.string().min(10).max(500) });
export const AgreementQuery = z.strictObject({ processor_id: Id.optional() });
export const TierSet = z.strictObject({ tier: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']), reassessment_interval_days: z.number().int().min(30).max(1095), reason: z.string().min(10).max(500) });
export const Tier = TierSet.extend({ id: Id, processor_id: Id, recorded_by: Id, recorded_at: Time });
export const ThirdPartyViolationKind = z.enum(['NO_AGREEMENT_IN_FORCE', 'AGREEMENT_EXPIRING', 'REGION_NOT_PERMITTED', 'PURPOSE_NOT_PERMITTED', 'SUBPROCESSOR_NOT_PERMITTED',
  'NO_TIER', 'DUE_DILIGENCE_MISSING', 'REASSESSMENT_DUE', 'DISPOSITION_NOT_VERIFIED']);
export const ThirdPartyViolation = z.strictObject({ kind: ThirdPartyViolationKind, detail: z.string().max(500), engagement_id: Id.nullable(), agreement_id: Id.nullable() });
export const ThirdPartyStanding = z.strictObject({
  processor_id: Id, processor_name: SafeText, region: SafeText, as_of: Time, tier: Tier.nullable(), agreements: z.array(Agreement).max(100), agreement_in_force: Agreement.nullable(),
  active_engagement_ids: z.array(Id).max(100), last_due_diligence: z.strictObject({ assessment_id: Id, approved_at: Time }).nullable(), reassessment_due_at: Time.nullable(),
  /** Facts derived from recorded engagements and agreements; a declaration is never treated as an observed flow. */
  violations: z.array(ThirdPartyViolation).max(200),
});
export const ThirdPartySummary = z.strictObject({ processor_id: Id, processor_name: SafeText, tier: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).nullable(), agreement_in_force: z.boolean(),
  active_engagements: z.number().int().min(0), violations: z.array(ThirdPartyViolationKind).max(20), reassessment_due_at: Time.nullable() });
export const SupplierLinkCreate = z.strictObject({ assessment_id: Id, expires_at: Time });
export const SupplierLink = z.strictObject({ id: Id, assessment_id: Id, expires_at: Time, state: z.enum(['ACTIVE', 'EXPIRED', 'REVOKED']), revoked_at: Time.nullable(), revocation_reason: SafeText.nullable(),
  last_used_at: Time.nullable(), created_by: Id, created_at: Time });
/** The token is returned once, at issue, and is never stored or shown again. */
export const SupplierLinkIssued = z.strictObject({ link: SupplierLink, token: z.string().regex(/^[a-f0-9]{64}$/), path: z.string().max(200) });
export const SupplierLinkRevoke = z.strictObject({ reason: z.string().min(10).max(500) });
export const SupplierLinkQuery = z.strictObject({ assessment_id: Id.optional() });
export const SupplierQuestionnaire = z.strictObject({
  title: z.string().max(160), template_name: SafeText, expires_at: Time, editable: z.boolean(),
  questions: z.array(z.strictObject({ key: z.string(), text: z.string().max(500), answer_type: z.enum(['YES_NO', 'TEXT', 'CHOICE', 'NUMBER']), choices: z.array(z.string()).max(20), required: z.boolean(), evidence_required: z.boolean(), guidance: z.string().max(1000).nullable() })).max(100),
  answers: z.array(z.strictObject({ question_key: z.string(), value: z.string().max(4000), evidence_reference: SafeText.nullable(), answered_at: Time })).max(100),
});
export const SupplierAnswers = ImpactAnswersRecord;

// EX10 policy lifecycle and issues; EX11 continuous control tests ----------------
export const GrcPolicyCreate = z.strictObject({
  policy_key: Id.nullable(), title: z.string().min(3).max(160), body: z.string().min(20).max(50000), owner_reference: SafeText,
  review_interval_days: z.number().int().min(30).max(1095), control_ids: z.array(Id).max(100), requirement_ids: z.array(z.string().max(80)).max(50), change_summary: z.string().min(10).max(500),
});
export const GrcPolicy = z.strictObject({
  id: Id, policy_key: Id, version: z.number().int().positive(), title: z.string().max(160), body: z.string().max(50000), owner_reference: SafeText, review_interval_days: z.number().int(),
  control_ids: z.array(Id).max(100), requirement_ids: z.array(z.string().max(80)).max(50), change_summary: SafeText, status: z.enum(['DRAFT', 'PUBLISHED', 'RETIRED']),
  recorded_by: Id, recorded_at: Time, approved_by: Id.nullable(), published_at: Time.nullable(), retired_at: Time.nullable(), next_review_at: Time.nullable(),
  review_due: z.boolean(), acknowledgements: z.number().int().min(0), acknowledged_by_me: z.boolean(),
});
export const GrcPolicyDecision = z.strictObject({ action: z.enum(['PUBLISH', 'RETIRE']) });
export const IssueSeverity = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const IssueSourceKind = z.enum(['MANUAL', 'AUDIT_REQUEST', 'CONTROL_TEST', 'IMPACT_FINDING', 'POLICY_REVIEW']);
export const IssueCreate = z.strictObject({
  source_kind: IssueSourceKind.exclude(['CONTROL_TEST']), source_id: Id.nullable(), title: z.string().min(3).max(300), severity: IssueSeverity,
  owner_reference: SafeText, due_at: Time, control_id: Id.nullable(), risk_id: Id.nullable(),
}).superRefine((i, c) => { if ((i.source_kind === 'MANUAL') !== (i.source_id === null)) c.addIssue({ code: 'custom', path: ['source_id'], message: 'Only a manual issue has no source; every other names it' }); });
export const IssueEventRecord = z.strictObject({
  kind: z.enum(['REMEDIATION_PLANNED', 'REMEDIATED', 'VERIFIED', 'RISK_ACCEPTED', 'REOPENED']), note: z.string().min(10).max(1000), evidence_reference: Reference.nullable(),
  verification_method: z.enum(['CONTROL_TEST', 'INDEPENDENT_REVIEW']).nullable(), control_test_run_id: Id.nullable(), acceptance_expires_at: Time.nullable(),
}).superRefine((e, c) => {
  if ((e.kind === 'VERIFIED') !== (e.verification_method !== null)) c.addIssue({ code: 'custom', path: ['verification_method'], message: 'A verification states how it was verified, and only a verification does' });
  if (e.verification_method === 'CONTROL_TEST' && e.control_test_run_id === null) c.addIssue({ code: 'custom', path: ['control_test_run_id'], message: 'A control-test verification names the passing run' });
  if ((e.kind === 'RISK_ACCEPTED') !== (e.acceptance_expires_at !== null)) c.addIssue({ code: 'custom', path: ['acceptance_expires_at'], message: 'Only a risk acceptance expires, and it always does' });
  if (e.kind === 'REMEDIATED' && e.evidence_reference === null) c.addIssue({ code: 'custom', path: ['evidence_reference'], message: 'A remediation cites its evidence' });
});
export const IssueEvent = z.strictObject({ id: Id, kind: z.enum(['REMEDIATION_PLANNED', 'REMEDIATED', 'VERIFIED', 'RISK_ACCEPTED', 'REOPENED', 'ESCALATED', 'RECURRED']), note: z.string().max(1000),
  evidence_reference: SafeText.nullable(), verification_method: z.enum(['CONTROL_TEST', 'INDEPENDENT_REVIEW']).nullable(), control_test_run_id: Id.nullable(), acceptance_expires_at: Time.nullable(), actor_id: Id, recorded_at: Time });
export const IssueState = z.enum(['OPEN', 'REMEDIATION_PLANNED', 'REMEDIATED', 'VERIFIED', 'RISK_ACCEPTED', 'ACCEPTANCE_EXPIRED']);
export const Issue = z.strictObject({
  id: Id, source_kind: IssueSourceKind, source_id: Id.nullable(), title: z.string().max(300), severity: IssueSeverity, owner_reference: SafeText, due_at: Time,
  control_id: Id.nullable(), risk_id: Id.nullable(), state: IssueState, overdue: z.boolean(), events: z.array(IssueEvent).max(200), created_by: Id, created_at: Time,
});
export const IssueQuery = z.strictObject({ state: IssueState.optional(), source_kind: IssueSourceKind.optional() });
export const ControlCheckKind = z.enum(['SYSTEMS_HAVE_CONNECTOR_BINDING', 'CONSENT_EVENTS_HAVE_EVIDENCE', 'RETENTION_RULES_SOURCED', 'PROCESSORS_HAVE_AGREEMENT',
  'WITHDRAWALS_PROPAGATED', 'ASSESSMENTS_CURRENT', 'FORCED_ROW_SECURITY', 'AUDIT_TRAIL_APPEND_ONLY', 'GRC_EVIDENCE_CURRENT']);
export const ControlTestCreate = z.strictObject({ control_id: Id, name: z.string().min(3).max(160), check_kind: ControlCheckKind, maximum_violations: z.number().int().min(0).max(100000), interval_minutes: z.number().int().min(5).max(43200) });
export const ControlTestRun = z.strictObject({
  id: Id, test_id: Id, trigger: z.enum(['SCHEDULE', 'MANUAL']), result: z.enum(['PASS', 'FAIL', 'ERROR']), violations: z.number().int().nullable(),
  /** Identifiers (or table names) of up to ten offending records; never record contents. */
  sample: z.array(z.string().max(120)).max(10), error_code: z.string().max(80).nullable(), observation_digest: z.string().max(64).nullable(), actor_id: Id, observed_at: Time,
});
export const ControlTestStanding = z.enum(['PASSING', 'FAILING', 'ERROR', 'STALE', 'NEVER_RUN', 'DISABLED']);
export const ControlTest = z.strictObject({
  id: Id, control_id: Id, name: z.string().max(160), check_kind: ControlCheckKind, maximum_violations: z.number().int(), interval_minutes: z.number().int(), enabled: z.boolean(),
  next_run_at: Time, created_by: Id, created_at: Time, latest_run: ControlTestRun.nullable(), standing: ControlTestStanding, open_issue_id: Id.nullable(),
});
export const ControlTestDetail = z.strictObject({ test: ControlTest, runs: z.array(ControlTestRun).max(100) });
export const ControlTestToggle = z.strictObject({ enabled: z.boolean() });
export const ComplianceAlert = z.strictObject({ id: Id, test_id: Id, run_id: Id, kind: z.enum(['DRIFT_TO_FAIL', 'RECOVERED', 'ERROR']), detail: z.string().max(500), created_at: Time,
  /** Derived from the messages an enabled alert routing raised for it; NOT_DELIVERED when none did. */
  delivery_state: z.enum(['NOT_DELIVERED', 'QUEUED', 'SENT', 'FAILED']) });
export const ControlTestSweep = z.strictObject({ ran: z.number().int().min(0), failing: z.number().int().min(0), errors: z.number().int().min(0), alerts: z.number().int().min(0), issues_escalated: z.number().int().min(0) });
export const ComplianceReport = z.strictObject({
  as_of: Time,
  summary: z.strictObject({ tests: z.number().int(), passing: z.number().int(), failing: z.number().int(), error: z.number().int(), stale: z.number().int(), never_run: z.number().int(), disabled: z.number().int(),
    open_issues: z.number().int(), overdue_issues: z.number().int(), policies_published: z.number().int(), policies_review_due: z.number().int() }),
  frameworks: z.array(z.strictObject({ framework_id: Id, name: SafeText, version: z.string().max(80), requirements: z.number().int(), requirements_mapped: z.number().int(), unmapped_codes: z.array(z.string().max(80)).max(100) })).max(100),
  controls: z.array(z.strictObject({ control_id: Id, title: SafeText, requirements: z.array(z.string().max(200)).max(100), tests: z.array(z.strictObject({ test_id: Id, name: z.string().max(160), standing: ControlTestStanding, last_observed_at: Time.nullable() })).max(50),
    open_issues: z.number().int() })).max(100),
  /** Stated on every report: tests examine this installation's records only. */
  limits: z.array(z.string().max(300)).max(10),
});
export const RegulatoryFrameworkImport = z.strictObject({ name: z.string().min(3).max(120) });

// EX05 data mapping and records of processing; bounded exports ---------------
export const Region = z.string().regex(/^[A-Z]{2}(-[A-Z0-9]{1,3})?$/);
export const SystemLocationCreate = z.strictObject({ region: Region, hosting_description: z.string().min(3).max(300), basis: z.string().min(10).max(500), valid_from: Time });
export const SystemLocation = z.strictObject({ id: Id, system_id: Id, region: Region, hosting_description: z.string().max(300), basis: SafeText, valid_from: Time, valid_to: Time.nullable(), recorded_by: Id, recorded_at: Time });
export const RopaGapKind = z.enum(['NO_CONDITION', 'CONDITION_UNRESOLVED', 'NO_SYSTEM', 'NO_DATA_CATEGORY', 'NO_PRINCIPAL_CATEGORY', 'NO_RETENTION_RULE', 'UNBOUND_SYSTEM',
  'LOCATION_UNDECLARED', 'RECIPIENT_REGION_NOT_A_CODE', 'RECIPIENT_ENDED', 'CATEGORY_INACTIVE', 'PURPOSE_VERSION_NOT_CURRENT', 'GRAPH_SYSTEM_NOT_DECLARED', 'DECLARED_SYSTEM_NOT_IN_GRAPH',
  'OBSERVATION_STALE', 'NOT_OBSERVED']);
export const RopaGapSeverity = z.enum(['MISSING', 'STALE', 'CONFLICT', 'INFO']);
export const RopaGap = z.strictObject({ kind: RopaGapKind, severity: RopaGapSeverity, detail: z.string().max(300), target_id: Id.nullable() });
const Named = z.strictObject({ id: Id, name: z.string().max(300), basis: z.string().max(500), since: Time });
export const RopaEntry = z.strictObject({
  activity_id: Id, name: z.string().max(300), description: z.string().max(2000), owner_reference: SafeText, status: z.string().max(20), processes_child_data: z.string().max(20),
  purpose: z.strictObject({ purpose_id: Id, name: z.string().max(300), version: z.number().int(), description: z.string().max(4000), current: z.boolean() }).nullable(),
  condition: z.strictObject({ code: z.string().max(80), label: z.string().max(300), unresolved: z.boolean() }).nullable(),
  notices: z.array(z.strictObject({ id: Id, title: z.string().max(300), version: z.number().int(), locale: z.string().max(20) })).max(50),
  principal_categories: z.array(Named).max(100), data_categories: z.array(Named).max(100),
  /** Each system states what it rests on: the registry declaration, the connector binding, the declared location and any graph reading. */
  systems: z.array(z.strictObject({ id: Id, name: z.string().max(300), connector: z.string().max(80), basis: z.string().max(500), since: Time, binding_adapter: z.string().max(80).nullable(),
    location: z.strictObject({ region: Region, hosting_description: z.string().max(300) }).nullable(),
    observed: z.strictObject({ last_seen_at: Time, fresh_until: Time, fresh: z.boolean() }).nullable() })).max(100),
  recipients: z.array(z.strictObject({ engagement_id: Id, processor_id: Id, processor_name: z.string().max(300), role: z.string().max(40), region: z.string().max(300), subprocessor_of: Id.nullable(), status: z.string().max(20), since: Time })).max(100),
  transfers: z.array(z.strictObject({ via: z.enum(['SYSTEM', 'RECIPIENT']), target_id: Id, name: z.string().max(300), region: Region, cross_border: z.boolean() })).max(200),
  retention: z.array(z.strictObject({ rule_id: Id, name: z.string().max(300), trigger: z.string().max(80), duration_days: z.number().int().nullable() })).max(100),
  safeguards: z.array(z.strictObject({ id: Id, kind: z.string().max(80), description: z.string().max(1000), evidence_state: z.string().max(40) })).max(100),
  graph: z.strictObject({ activity_id: Id.nullable(), systems: z.array(z.strictObject({ system_id: Id, provenance: z.enum(['ASSERTED', 'OBSERVED']), review_state: z.string().max(20) })).max(100) }),
  gaps: z.array(RopaGap).max(300),
});
export const RopaSummary = z.strictObject({
  as_of: Time, home_region: Region, activities: z.number().int().min(0), activities_with_gaps: z.number().int().min(0),
  gaps: z.array(z.strictObject({ kind: RopaGapKind, severity: RopaGapSeverity, count: z.number().int().min(0) })).max(20),
  cross_border_transfers: z.number().int().min(0), systems_declared_only: z.number().int().min(0),
  /** Stated on every summary: what the record rests on and what it is not. */
  limits: z.array(z.string().max(400)).max(10),
});
export const RopaImpactKind = z.enum(['SYSTEM', 'PROCESSOR', 'DATA_CATEGORY', 'PRINCIPAL_CATEGORY', 'PURPOSE']);
export const RopaImpactQuery = z.strictObject({ kind: RopaImpactKind, target_id: Id });
export const RopaImpact = z.strictObject({
  kind: RopaImpactKind, target_id: Id,
  activities: z.array(z.strictObject({ activity_id: Id, name: z.string().max(300), via: z.enum(['REGISTRY_LINK', 'GRAPH', 'SUBPROCESSOR', 'PURPOSE_VERSION']) })).max(500),
  retention_rule_ids: z.array(Id).max(500), engagement_ids: z.array(Id).max(500), graph_asset_count: z.number().int().min(0), consent_record_count: z.number().int().min(0).nullable(),
  /** False when a list reached its bound; the counts above are then lower bounds. */
  complete: z.boolean(),
});
export const RopaVersionCreate = z.strictObject({ note: z.string().min(10).max(500) });
export const RopaVersionApprove = z.strictObject({ note: z.string().min(10).max(500) });
export const RopaVersion = z.strictObject({
  id: Id, version: z.number().int().positive(), note: SafeText, as_of: Time, content_digest: z.string().length(64), activity_count: z.number().int(), gap_count: z.number().int(),
  recorded_by: Id, recorded_at: Time, approved_by: Id.nullable(), approved_at: Time.nullable(), approval_note: SafeText.nullable(),
});
export const RopaDiffQuery = z.strictObject({ against: Id });
export const RopaDiff = z.strictObject({
  from_version: z.number().int(), to_version: z.number().int(),
  added: z.array(z.strictObject({ activity_id: Id, name: z.string().max(300) })).max(1000),
  removed: z.array(z.strictObject({ activity_id: Id, name: z.string().max(300) })).max(1000),
  changed: z.array(z.strictObject({ activity_id: Id, name: z.string().max(300), fields: z.array(z.string().max(40)).max(20) })).max(1000),
  complete: z.boolean(),
});
export const ExportKind = z.enum(['ROPA_VERSION_CSV', 'AUDIT_EVENTS_JSONL']);
export const DataExportCreate = z.strictObject({
  kind: ExportKind, ropa_version_id: Id.nullable(),
  audit_filter: z.strictObject({ operation: z.string().min(1).max(120).optional(), actor_id: Id.optional(), actor_domain: z.string().max(20).optional(), from: Time.optional(), to: Time.optional() }).nullable(),
}).superRefine((e, c) => {
  if ((e.kind === 'ROPA_VERSION_CSV') !== (e.ropa_version_id !== null)) c.addIssue({ code: 'custom', path: ['ropa_version_id'], message: 'A record-of-processing export names its version, and only it does' });
  if (e.kind !== 'AUDIT_EVENTS_JSONL' && e.audit_filter !== null) c.addIssue({ code: 'custom', path: ['audit_filter'], message: 'Only an audit export takes an audit filter' });
});
export const DataExportManifest = z.strictObject({
  kind: ExportKind, as_of: Time, filter: z.record(z.string(), z.string()), expected_rows: z.number().int(), rows: z.number().int(), columns: z.array(z.string().max(60)).max(40),
  chunks: z.array(z.strictObject({ sequence: z.number().int(), row_count: z.number().int(), sha256: z.string().length(64) })).max(2000),
  /** SHA-256 over the chunk digests in order, joined by newlines. */
  digest: z.string().length(64), complete: z.literal(true), limits: z.array(z.string().max(400)).max(10),
});
export const DataExport = z.strictObject({
  id: Id, kind: ExportKind, source_id: Id.nullable(), as_of: Time, expected_rows: z.number().int(), state: z.enum(['RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED']),
  rows_written: z.number().int(), chunks: z.number().int(), failure_code: z.string().max(80).nullable(), manifest: DataExportManifest.nullable(),
  created_at: Time, finished_at: Time.nullable(), expires_at: Time, expired: z.boolean(),
});
export const DataExportChunkQuery = z.strictObject({ sequence: z.coerce.number().int().min(1).max(2000) });
export const DataExportChunk = z.strictObject({ job_id: Id, sequence: z.number().int(), row_count: z.number().int(), sha256: z.string().length(64), content: z.string() });

// EX03 rights response packages -------------------------------------------------
export const PackageSection = z.strictObject({
  section_id: z.string().max(120), source: z.enum(['SYSTEM', 'ORVIA_CONSENT', 'ORVIA_REQUEST']), system_id: Id.nullable(), title: z.string().max(300),
  read_state: z.enum(['READ', 'NOT_FOUND', 'UNAVAILABLE', 'NOT_SUPPORTED', 'HELD_BY_ORVIA']), read_at: Time, read_by: z.string().max(120),
  record_state: z.strictObject({ suppressed: z.boolean(), erased: z.boolean(), anonymised: z.boolean() }).nullable(),
  fields: z.record(z.string().max(120), z.string().max(4000)),
});
export const PackageFieldRef = z.strictObject({ section_id: z.string().max(120), field: z.string().max(120) });
export const PackageSuggestion = PackageFieldRef.extend({ reason: z.literal('POSSIBLE_THIRD_PARTY'), detail: z.string().max(300) });
export const PackageRedaction = PackageFieldRef.extend({ reason: z.enum(['THIRD_PARTY', 'LEGAL_PRIVILEGE', 'SECURITY', 'OTHER']), note: z.string().min(3).max(300) });
export const PackageKept = PackageFieldRef.extend({ justification: z.string().min(10).max(300) });
export const DeliveryState = z.enum(['NOT_RELEASED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'EXHAUSTED']);
export const ResponsePackage = z.strictObject({
  id: Id, request_id: Id, version: z.number().int(), state: z.enum(['DRAFT', 'REVIEWED', 'RELEASED', 'WITHDRAWN']),
  sections: z.array(PackageSection).max(200), suggestions: z.array(PackageSuggestion).max(500),
  redactions: z.array(PackageRedaction).max(500).nullable(), kept: z.array(PackageKept).max(500).nullable(),
  released_content: z.array(z.strictObject({ title: z.string().max(300), read_state: z.string().max(20), fields: z.record(z.string().max(120), z.string().max(4000)) })).max(200).nullable(),
  content_digest: z.string().length(64).nullable(), unreadable_acknowledged: z.boolean().nullable(),
  prepared_by: Id, prepared_at: Time, reviewed_by: Id.nullable(), reviewed_at: Time.nullable(), released_by: Id.nullable(), released_at: Time.nullable(),
  delivery_expires_at: Time.nullable(), max_downloads: z.number().int().nullable(), downloads: z.number().int(), delivery_state: DeliveryState,
  revoked_at: Time.nullable(), revocation_reason: SafeText.nullable(), purged_at: Time.nullable(),
});
export const ResponsePackageReview = z.strictObject({ redactions: z.array(PackageRedaction).max(500), kept: z.array(PackageKept).max(500), unreadable_acknowledged: z.boolean() });
export const ResponsePackageRelease = z.strictObject({ expires_at: Time, max_downloads: z.number().int().min(1).max(10) });
export const ResponsePackageRevoke = z.strictObject({ reason: z.string().min(10).max(500) });
export const OwnResponsePackage = z.strictObject({
  request_id: Id, version: z.number().int(), released_at: Time, expires_at: Time, downloads_remaining: z.number().int().min(0), content_digest: z.string().length(64),
  content: z.array(z.strictObject({ title: z.string().max(300), read_state: z.string().max(20), fields: z.record(z.string().max(120), z.string().max(4000)) })).max(200),
  /** Stated with every copy: what it contains and what it does not. */
  limits: z.array(z.string().max(400)).max(10),
});

// EX04 value classification and EX12 access exposure --------------------------
export const ValueCategory = z.enum(['EMAIL', 'PHONE_IN', 'PAN', 'AADHAAR', 'PAYMENT_CARD', 'IFSC', 'IPV4']);
export const ClassificationRunRequest = z.strictObject({ sample_limit: z.number().int().min(1).max(1000) });
export const ClassifiedColumn = z.strictObject({
  column: z.string().max(63), sampled: z.number().int().min(0), non_empty: z.number().int().min(0), matches: z.record(ValueCategory, z.number().int().min(0)),
  category: ValueCategory.nullable(), confidence: z.enum(['CONFIRMED', 'POSSIBLE', 'NONE']), share: z.number().min(0).max(1),
});
export const RelationGrant = z.strictObject({ grantee: z.string().max(63), privileges: z.array(z.string().max(20)).max(20), columns: z.array(z.string().max(63)).max(60).nullable() });
export const ExposureFinding = z.strictObject({
  kind: z.enum(['PUBLIC_CAN_READ', 'READ_WRITE_ROLE_CAN_READ', 'ROLE_CAN_READ', 'OWNER', 'ORVIA_OBSERVER']), severity: z.enum(['HIGH', 'MEDIUM', 'LOW', 'INFO']),
  grantee: z.string().max(63), columns: z.array(z.string().max(63)).max(60), categories: z.array(ValueCategory).max(7), detail: z.string().max(300),
});
export const ClassificationRun = z.strictObject({
  id: Id, target_id: Id, schema_name: z.string().max(63), relation_name: z.string().max(63), sample_limit: z.number().int(), state: z.enum(['QUEUED', 'COMPLETED', 'FAILED']),
  requested_by: Id, requested_at: Time, ruleset: z.string().max(60).nullable(), observed_at: Time.nullable(), relation_state: z.enum(['CLASSIFIED', 'MISSING', 'EMPTY']).nullable(),
  rows_sampled: z.number().int().nullable(), columns: z.array(ClassifiedColumn).max(60), grants: z.array(RelationGrant).max(200), owner: z.string().max(63).nullable(),
  findings: z.array(ExposureFinding).max(200), limits: z.array(z.string().max(400)).max(10), failure_code: z.string().max(80).nullable(),
});
export const ClassificationLabelsRecord = z.strictObject({ labels: z.array(z.strictObject({ column: z.string().regex(/^[a-z][a-z0-9_]{0,62}$/), expected: z.union([ValueCategory, z.literal('NONE')]), basis: z.string().min(10).max(300) })).min(1).max(60) });
export const ClassificationLabel = z.strictObject({ column: z.string().max(63), expected: z.union([ValueCategory, z.literal('NONE')]), basis: SafeText, labelled_by: Id, labelled_at: Time });
export const ClassificationLabelSet = z.strictObject({ target_id: Id, labels: z.array(ClassificationLabel).max(200) });
export const ClassificationQuality = z.strictObject({
  id: Id, run_id: Id, ruleset: z.string().max(60), recorded_by: Id, recorded_at: Time,
  measurement: z.strictObject({
    columns_labelled: z.number().int(), columns_unlabelled: z.array(z.string().max(63)).max(60), correct: z.number().int(), accuracy: z.number().min(0).max(1),
    per_category: z.array(z.strictObject({ category: ValueCategory, true_positives: z.number().int(), false_positives: z.number().int(), false_negatives: z.number().int(), precision: z.number().min(0).max(1).nullable(), recall: z.number().min(0).max(1).nullable() })).max(7),
    possible_not_counted: z.array(z.string().max(63)).max(60), sample_rows: z.number().int(), limits: z.array(z.string().max(400)).max(10),
  }),
});
export const ExposureSummary = z.strictObject({ target_id: Id, schema_name: z.string().max(63), relation_name: z.string().max(63), run_id: Id, observed_at: Time, sensitive_columns: z.array(z.string().max(63)).max(60), findings: z.array(ExposureFinding).max(200) });

// EX09 customer-controlled delivery ----------------------------------------------
export const DeliveryTransportCreate = z.strictObject({
  kind: z.enum(['SMTP', 'WEBHOOK']), name: z.string().min(3).max(120),
  host: z.string().min(1).max(253).optional(), port: z.number().int().min(1).max(65535).optional(), security: z.enum(['TLS', 'NONE']).optional(),
  from_address: z.string().max(254).optional(), credential_env: z.string().regex(/^ORVIA_TRANSPORT_[A-Z0-9_]{1,60}$/).nullable().optional(), url: z.string().url().max(2000).optional(),
}).superRefine((t, c) => {
  const smtp = t.host !== undefined && t.port !== undefined && t.security !== undefined && t.from_address !== undefined;
  if (t.kind === 'SMTP' && (!smtp || t.url !== undefined)) c.addIssue({ code: 'custom', path: ['host'], message: 'An SMTP transport names host, port, security and sender, and no URL' });
  if (t.kind === 'WEBHOOK' && (t.url === undefined || t.host !== undefined || t.credential_env)) c.addIssue({ code: 'custom', path: ['url'], message: 'A webhook names a URL only; it is signed with a derived key' });
});
export const DeliveryTransport = z.strictObject({
  id: Id, kind: z.enum(['SMTP', 'WEBHOOK']), name: z.string().max(120), host: z.string().max(253).nullable(), port: z.number().int().nullable(), security: z.enum(['TLS', 'NONE']).nullable(),
  from_address: z.string().max(254).nullable(), credential_env: z.string().max(80).nullable(), url: z.string().max(2000).nullable(), state: z.enum(['PENDING', 'ENABLED', 'DISABLED']),
  created_by: Id, created_at: Time, approved_by: Id.nullable(), approved_at: Time.nullable(), disabled_at: Time.nullable(), disable_reason: SafeText.nullable(), secret_revealed: z.boolean(),
});
export const TransportDisable = z.strictObject({ reason: z.string().min(10).max(500) });
export const SigningSecret = z.strictObject({ transport_id: Id, secret: z.string().length(64), algorithm: z.literal('HMAC-SHA256'), signed_content: z.string().max(120), header: z.literal('X-Orvia-Signature') });
export const AlertRoutingCreate = z.strictObject({ transport_id: Id, recipient: z.string().min(3).max(254), kinds: z.array(z.enum(['DRIFT_TO_FAIL', 'RECOVERED', 'ERROR'])).min(1).max(3), subject_prefix: z.string().min(3).max(60).regex(/^[^\r\n]*$/) });
export const AlertRouting = z.strictObject({ id: Id, transport_id: Id, recipient: z.string().max(254), kinds: z.array(z.string().max(20)).max(3), subject_prefix: z.string().max(60), state: z.enum(['PENDING', 'ENABLED', 'DISABLED']),
  created_by: Id, created_at: Time, approved_by: Id.nullable(), approved_at: Time.nullable(), disabled_at: Time.nullable() });
export const RoutingDecision = z.strictObject({ action: z.enum(['ENABLE', 'DISABLE']) });
export const OutboundMessageCreate = z.strictObject({
  transport_id: Id, source_kind: z.enum(['NOTIFICATION_TASK', 'COMPLIANCE_ALERT', 'MANUAL']), source_id: Id.nullable(), recipient: z.string().min(3).max(254),
  subject: z.string().min(3).max(300).regex(/^[^\r\n]*$/), body: z.string().min(10).max(20000),
}).superRefine((m, c) => { if ((m.source_kind === 'MANUAL') !== (m.source_id === null)) c.addIssue({ code: 'custom', path: ['source_id'], message: 'Only a manual message has no source' }); });
export const OutboundMessageReview = z.strictObject({ decision: z.enum(['APPROVE', 'REJECT']), note: z.string().min(3).max(500) });
export const OutboundDeliveryState = z.enum(['AWAITING_REVIEW', 'REJECTED', 'QUEUED', 'RETRYING', 'SENT', 'EXHAUSTED', 'CANCELLED']);
export const OutboundMessage = z.strictObject({
  id: Id, transport_id: Id, source_kind: z.string().max(40), source_id: Id.nullable(), routing_id: Id.nullable(), recipient: z.string().max(254), subject: z.string().max(300), body: z.string().max(20000), content_digest: z.string().length(64),
  review_state: z.enum(['DRAFT', 'APPROVED', 'REJECTED']), authored_by: Id, authored_at: Time, reviewed_by: Id.nullable(), reviewed_at: Time.nullable(), review_note: SafeText.nullable(),
  delivery_state: OutboundDeliveryState, next_attempt_at: Time.nullable(), outcome_at: Time.nullable(),
  attempts: z.array(z.strictObject({ attempt: z.number().int(), started_at: Time, finished_at: Time, outcome: z.enum(['SENT', 'FAILED', 'UNKNOWN']), response_code: z.string().max(20).nullable(), receipt: z.string().max(300).nullable(), error_code: z.string().max(60).nullable(), possible_duplicate: z.boolean() })).max(5),
});

// EX02 website consent management ------------------------------------------------
const CmpKey = z.string().regex(/^[a-z][a-z_]{1,30}$/);
const HostPattern = z.string().regex(/^(\*\.)?[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*(:\d{1,5})?$/);
export const CmpOrigin = z.string().regex(/^(https:\/\/[a-z0-9.-]+(:\d{1,5})?|http:\/\/(127\.0\.0\.1|localhost)(:\d{1,5})?)$/);
export const CmpTexts = z.strictObject({ title: z.string().min(3).max(120), body: z.string().min(20).max(2000), accept_all: z.string().min(2).max(40), reject_all: z.string().min(2).max(40), choose: z.string().min(2).max(40), save: z.string().min(2).max(40) });
export const CmpConfigDocument = z.strictObject({
  categories: z.array(z.strictObject({ key: CmpKey, label: z.string().min(2).max(60), description: z.string().min(10).max(500), required: z.boolean() })).min(2).max(10),
  trackers: z.array(z.strictObject({ name: z.string().min(2).max(120), category: CmpKey, hosts: z.array(HostPattern).max(20), cookies: z.array(z.string().regex(/^[A-Za-z0-9_.-]{1,60}\*?$/)).max(20) })).max(100),
  texts: z.record(z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/), CmpTexts).refine(t => 'en' in t, 'English text is required'),
  /** Where the opt-in rule comes from. A rule without a source is not a rule. */
  rule: z.strictObject({ basis: z.literal('OPT_IN'), requirement_id: z.string().max(80).nullable(), source_reference: z.string().min(5).max(300), honour_gpc: z.boolean() }),
}).superRefine((d, c) => {
  const keys = d.categories.map(x => x.key);
  if (new Set(keys).size !== keys.length) c.addIssue({ code: 'custom', path: ['categories'], message: 'Category keys are unique' });
  if (d.categories.filter(x => x.required).length !== 1) c.addIssue({ code: 'custom', path: ['categories'], message: 'Exactly one category is strictly necessary' });
  for (const [i, t] of d.trackers.entries()) if (!keys.includes(t.category)) c.addIssue({ code: 'custom', path: ['trackers', i, 'category'], message: 'A tracker belongs to a declared category' });
});
export const CmpSiteCreate = z.strictObject({ name: z.string().min(3).max(120), origins: z.array(CmpOrigin).min(1).max(10) });
export const CmpSite = z.strictObject({ id: Id, site_key: Id, name: z.string().max(120), origins: z.array(z.string().max(300)).max(10), state: z.enum(['PENDING', 'ENABLED', 'DISABLED']),
  created_by: Id, created_at: Time, approved_by: Id.nullable(), approved_at: Time.nullable(), disabled_at: Time.nullable(), sdk_path: z.string().max(200) });
export const CmpConfigCreate = z.strictObject({ document: CmpConfigDocument });
export const CmpConfig = z.strictObject({ id: Id, site_id: Id, version: z.number().int(), document: CmpConfigDocument, content_digest: z.string().length(64), state: z.enum(['DRAFT', 'PUBLISHED', 'RETIRED']),
  authored_by: Id, authored_at: Time, published_by: Id.nullable(), published_at: Time.nullable(), retired_at: Time.nullable() });
export const CmpConfigDecision = z.strictObject({ action: z.enum(['PUBLISH', 'RETIRE']) });
export const CmpConsentSubmit = z.strictObject({ visitor_id: Id, config_version: z.number().int().positive(), choices: z.record(CmpKey, z.boolean()), gpc: z.boolean(), language: z.string().regex(/^[a-z]{2}(-[A-Z]{2})?$/) });
export const CmpConsentReceipt = z.strictObject({ receipt_id: Id, recorded_at: Time, config_version: z.number().int() });
export const CmpConsentStats = z.strictObject({ site_id: Id, visitors: z.number().int(), records: z.number().int(), gpc_visitors: z.number().int(), latest_at: Time.nullable(),
  by_category: z.array(z.strictObject({ key: z.string().max(31), granted: z.number().int(), refused: z.number().int() })).max(10), limits: z.array(z.string().max(300)).max(5) });
export const CmpScanRequest = z.strictObject({ url: z.string().url().max(2000) });
const ScanObservation = z.strictObject({ hosts: z.array(z.string().max(300)).max(200), cookies: z.array(z.string().max(120)).max(200) });
export const CmpScan = z.strictObject({
  id: Id, site_id: Id, url: z.string().max(2000), state: z.enum(['QUEUED', 'COMPLETED', 'FAILED']), requested_by: Id, requested_at: Time, observed_at: Time.nullable(), config_version: z.number().int().nullable(),
  results: z.strictObject({ sdk_loaded: z.boolean(), banner_shown: z.boolean(), before_consent: ScanObservation, after_consent: ScanObservation, after_refusal: ScanObservation }).nullable(),
  findings: z.array(z.strictObject({ kind: z.enum(['SDK_MISSING', 'TRACKER_BEFORE_CONSENT', 'TRACKER_AFTER_REFUSAL', 'COOKIE_BEFORE_CONSENT', 'UNDECLARED_HOST', 'UNDECLARED_COOKIE', 'DECLARED_NOT_SEEN']),
    severity: z.enum(['HIGH', 'MEDIUM', 'INFO']), subject: z.string().max(300), detail: z.string().max(300) })).max(200),
  failure_code: z.string().max(80).nullable(), limits: z.array(z.string().max(300)).max(5),
});

export const expansionSchemas = {
  ImpactQuestion, ImpactTemplateCreate, ImpactTemplate, ImpactTemplatePublish, ImpactTemplateList: page(ImpactTemplate),
  ImpactAssessmentCreate, ImpactAnswersRecord, ImpactDecision, ImpactRevise, ImpactFindingCreate, ImpactFindingEventRecord, ImpactFinding,
  ImpactAssessmentDetail, ImpactAssessmentSummary, ImpactAssessmentList: page(ImpactAssessmentSummary), ImpactAssessmentQuery, ImpactEscalationSweep,
  AgreementCreate, Agreement, AgreementList: page(Agreement), AgreementTerminate, AgreementQuery, TierSet, Tier, ThirdPartyViolation, ThirdPartyStanding, ThirdPartySummary, ThirdPartySummaryList: page(ThirdPartySummary),
  SupplierLinkCreate, SupplierLink, SupplierLinkList: page(SupplierLink), SupplierLinkIssued, SupplierLinkRevoke, SupplierLinkQuery, SupplierQuestionnaire, SupplierAnswers,
  GrcPolicyCreate, GrcPolicy, GrcPolicyList: page(GrcPolicy), GrcPolicyDecision, IssueCreate, IssueEventRecord, Issue, IssueList: page(Issue), IssueQuery,
  ControlTestCreate, ControlTest, ControlTestList: page(ControlTest), ControlTestDetail, ControlTestRun, ControlTestToggle, ComplianceAlert, ComplianceAlertList: page(ComplianceAlert), ControlTestSweep, ComplianceReport, RegulatoryFrameworkImport,
  SystemLocationCreate, SystemLocation, SystemLocationList: page(SystemLocation), RopaGap, RopaEntry, RopaEntryList: page(RopaEntry), RopaSummary, RopaImpactQuery, RopaImpact,
  RopaVersionCreate, RopaVersionApprove, RopaVersion, RopaVersionList: page(RopaVersion), RopaDiffQuery, RopaDiff,
  DataExportCreate, DataExportManifest, DataExport, DataExportList: page(DataExport), DataExportChunkQuery, DataExportChunk,
  PackageSection, PackageSuggestion, PackageRedaction, PackageKept, ResponsePackage, ResponsePackageList: page(ResponsePackage), ResponsePackageReview, ResponsePackageRelease, ResponsePackageRevoke, OwnResponsePackage,
  ClassificationRunRequest, ClassifiedColumn, RelationGrant, ExposureFinding, ClassificationRun, ClassificationRunList: page(ClassificationRun), ClassificationLabelsRecord, ClassificationLabel, ClassificationLabelSet,
  ClassificationQuality, ClassificationQualityList: page(ClassificationQuality), ExposureSummary, ExposureSummaryList: page(ExposureSummary),
  DeliveryTransportCreate, DeliveryTransport, DeliveryTransportList: page(DeliveryTransport), TransportDisable, SigningSecret, AlertRoutingCreate, AlertRouting, AlertRoutingList: page(AlertRouting), RoutingDecision,
  OutboundMessageCreate, OutboundMessageReview, OutboundMessage, OutboundMessageList: page(OutboundMessage),
  CmpConfigDocument, CmpSiteCreate, CmpSite, CmpSiteList: page(CmpSite), CmpConfigCreate, CmpConfig, CmpConfigList: page(CmpConfig), CmpConfigDecision, CmpConsentSubmit, CmpConsentReceipt, CmpConsentStats,
  CmpScanRequest, CmpScan, CmpScanList: page(CmpScan),
};
