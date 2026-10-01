import { z } from 'zod';
import { RequirementId, ProvisionId, Severity, RequirementResult } from './audit-primitives.ts';
import { RegulatoryPackageImport } from './regulatory.ts';

/**
 * Canonical contract of the evidence-based DPDPA audit practice on the vendor's
 * VENDOR_SERVICE installation (task AUDIT-PRACTICE-01). Vendor-internal, like
 * vendor-audit.ts: never served by a customer installation.
 *
 * The practice separates what the auditor asserts from what the evidence
 * supports. Ratings are computed from the approved methodology, never taken
 * from the request; favourable conclusions need reviewed, sufficient evidence;
 * and every review or approval is made by someone other than the preparer.
 */
const Id = z.uuid();
const Time = z.iso.datetime();
const Day = z.iso.date();
const Text = (min: number, max: number) => z.string().trim().min(min).max(max);
const Short = z.string().trim().min(1).max(300);
const List = (max: number, item = Short) => z.array(item).max(max);

// ---------------------------------------------------------------- practice level
export const CriteriaDistribution = z.enum(['TEST_FIXTURE', 'PRODUCTION']);
export const CriteriaFixtureRecord = z.strictObject({ version: z.string().regex(/^[0-9A-Za-z._-]{1,40}$/) });
/** Vendor contract 0.5.0: production criteria come only from the official regulatory package signed with the vendor release key. */
export const CriteriaPackageRecord = RegulatoryPackageImport;
export const RiskRating = z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);
export const ControlEffectiveness = z.enum(['NOT_ASSESSED', 'EFFECTIVE', 'PARTIALLY_EFFECTIVE', 'INEFFECTIVE']);
const Scale = z.array(z.strictObject({ value: z.number().int().min(1).max(5), label: Text(2, 60), description: Text(5, 400) })).length(5)
  .refine(s => s.every((x, i) => x.value === i + 1), 'Scale values run 1 to 5 in order');
export const MethodologyRecord = z.strictObject({
  version: z.string().regex(/^[0-9A-Za-z._-]{1,40}$/), likelihood_scale: Scale, impact_scale: Scale,
  /** matrix[likelihood - 1][impact - 1] */
  matrix: z.array(z.array(RiskRating).length(5)).length(5),
  /** How many rating steps an assessed control removes from the inherent rating; never below LOW. */
  residual_steps: z.strictObject({ EFFECTIVE: z.number().int().min(0).max(3), PARTIALLY_EFFECTIVE: z.number().int().min(0).max(3), INEFFECTIVE: z.literal(0), NOT_ASSESSED: z.literal(0) }),
  severity_rules: Text(20, 8000), considerations: List(12, Text(3, 300)).min(1),
});
// 0.47.0: management approves the engagement letter and processing agreement templates (owner decision 2026-09-30, no external
// legal review). Gates recorded under the former legal-review names stay readable as history and still satisfy the new gate.
export const PracticeGate = z.enum(['ENGAGEMENT_LETTER_TEMPLATE_APPROVED', 'PROCESSING_AGREEMENT_TEMPLATE_APPROVED', 'PRODUCTION_CRITERIA', 'PRODUCTION_AUDIT_KEY']);
export const RecordedPracticeGate = z.enum([...PracticeGate.options, 'LEGAL_REVIEW_ENGAGEMENT_LETTER', 'LEGAL_REVIEW_PROCESSING_AGREEMENT']);
export const ActivationRecord = z.strictObject({ gate: PracticeGate, reference: Text(3, 300) });
export const PracticeState = z.strictObject({
  criteria: z.array(z.strictObject({ id: Id, version: z.string(), distribution: CriteriaDistribution, requirements: z.number().int(), digest: z.string(), recorded_by: Id, approved_by: Id.nullable(), approved_at: Time.nullable(), created_at: Time })).max(200),
  methodologies: z.array(z.strictObject({ id: Id, version: z.string(), digest: z.string(), definition: z.unknown(), recorded_by: Id, approved_by: Id.nullable(), approved_at: Time.nullable(), created_at: Time })).max(200),
  activations: z.array(z.strictObject({ id: Id, gate: RecordedPracticeGate, reference: z.string(), recorded_by: Id, recorded_at: Time })).max(200),
  gates_missing: z.array(PracticeGate), real_use_allowed: z.boolean(),
  audit_key: z.strictObject({ key_id: z.string(), development: z.boolean() }).nullable(),
  statement: z.string().max(600),
});

// ---------------------------------------------------------------- acceptance and independence
export const ServiceType = z.enum(['READINESS_ADVISORY', 'EVIDENCE_AUDIT', 'STATUTORY_SDF_AUDIT_CLAIM']);
export const EngagementConfigure = z.strictObject({ use_kind: z.enum(['SYNTHETIC', 'REAL']), criteria_version_id: Id, methodology_id: Id, commercial_owner_id: Id.nullable(), implementation_owner_id: Id.nullable() });
export const AcceptancePrepare = z.strictObject({
  service_type: ServiceType, objectives: Text(10, 4000), intended_users: Text(3, 2000), client_responsibilities: Text(10, 4000), auditor_responsibilities: Text(10, 4000),
  confidentiality: Text(10, 4000), evidence_handling: Text(10, 4000), scope_restrictions: Text(1, 4000).nullable(), competence: Text(10, 4000),
  sdf_applicability_basis: Text(10, 4000).nullable(), eligibility_evidence: Text(10, 4000).nullable(),
  /** The engagement's findings and conclusions do not depend on buying, renewing or expanding an ORVIA licence. */
  licence_independence: z.literal(true),
}).superRefine((v, c) => {
  if (v.service_type === 'STATUTORY_SDF_AUDIT_CLAIM' && (!v.sdf_applicability_basis || !v.eligibility_evidence))
    c.addIssue({ code: 'custom', message: 'A statutory SDF audit claim needs the recorded SDF applicability basis and the auditor eligibility evidence', path: ['sdf_applicability_basis'] });
});
export const AcceptanceDecide = z.strictObject({ decision: z.enum(['ACCEPTED', 'DECLINED']), rationale: Text(10, 4000) });
export const ConflictKind = z.enum(['PRIOR_IMPLEMENTATION', 'PRIOR_CONSULTING', 'COMMERCIAL_RELATIONSHIP', 'PERSONAL_RELATIONSHIP', 'FINANCIAL_INTEREST', 'OTHER']);
export const ConflictRecord = z.strictObject({ kind: ConflictKind, person_id: Id.nullable(), description: Text(10, 4000) });
export const ConflictReview = z.strictObject({ status: z.enum(['SAFEGUARDED', 'DISQUALIFYING']), safeguard: Text(10, 4000).nullable() })
  .refine(v => v.status !== 'SAFEGUARDED' || v.safeguard !== null, { message: 'A safeguarded conflict states its safeguard', path: ['safeguard'] });

// ---------------------------------------------------------------- understanding, applicability, scope, risk, plan
export const UnderstandingRecord = z.strictObject({
  business_overview: Text(10, 4000), processing_activities: List(100).min(1), systems: List(100), data_categories: List(60), third_parties: List(100),
  sdf_status: z.strictObject({ status: z.enum(['NOTIFIED_SDF', 'NOT_NOTIFIED', 'UNKNOWN']), source: Text(3, 500) }),
  prior_audits: Text(1, 2000).nullable(),
  /** Records the client already keeps and the auditor relies on (RoPA exports, GRC registers), by reference only. */
  existing_records: List(50),
});
export const CriterionType = z.enum(['STATUTORY', 'CONTRACTUAL', 'ADVISORY']);
export const ApplicabilityRecord = z.strictObject({
  requirement_id: RequirementId, provision_ids: z.array(ProvisionId).max(10), criterion_type: CriterionType, applicability: z.enum(['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED']),
  effective_from: Day.nullable(), rationale: Text(10, 4000), evidence_refs: List(20), unresolved_question: Text(10, 2000).nullable(),
}).refine(v => (v.applicability === 'UNRESOLVED') === (v.unresolved_question !== null), { message: 'Only an unresolved decision, and every unresolved decision, states its open question', path: ['unresolved_question'] });
export const ScopePropose = z.strictObject({
  entities: List(50).min(1), processes: List(100).min(1), systems: List(100), locations: List(50), period_from: Day, period_to: Day,
  requirement_ids: z.array(RequirementId).min(1).max(200), exclusions: List(50), limitations: List(50),
  change_reason: Text(10, 4000).nullable(), impact_assessment: Text(10, 4000).nullable(),
});
export const RiskAssess = z.strictObject({
  requirement_id: RequirementId, risk: Text(10, 2000), likelihood: z.number().int().min(1).max(5), impact: z.number().int().min(1).max(5),
  affected_people: Text(3, 1000), affected_scope: Text(3, 1000), duration: Text(3, 500), uncertainty: Text(3, 1000),
  control_reference: Text(1, 300).nullable(), control_effectiveness: ControlEffectiveness, rationale: Text(10, 4000),
});
export const ProcedureType = z.enum(['INSPECTION', 'OBSERVATION', 'WALKTHROUGH', 'INQUIRY', 'RECONCILIATION', 'REPERFORMANCE', 'ANALYTICAL']);
export const TestNature = z.enum(['DESIGN', 'IMPLEMENTATION', 'OPERATING_EFFECTIVENESS']);
export const ProcedureAdd = z.strictObject({
  requirement_id: RequirementId, provision_ids: z.array(ProvisionId).max(10), risk_assessment_id: Id.nullable(), control_reference: Text(1, 300).nullable(),
  objective: Text(10, 2000), procedure_type: ProcedureType, test_nature: TestNature, requires_record_level: z.boolean(), owner_id: Id,
  planned_start: Day, planned_end: Day, depends_on: z.array(Id).max(20), evidence_expectation: Text(10, 2000), completion_criteria: Text(10, 2000),
  retest_of_finding_id: Id.nullable(),
});
export const ProcedureNotPerformed = z.strictObject({ reason: Text(10, 2000) });

// ---------------------------------------------------------------- evidence, requests, sampling, working papers
export const EvidenceType = z.enum(['MANAGEMENT_ASSERTION', 'DOCUMENT', 'SYSTEM_GENERATED', 'OBSERVATION', 'REPERFORMANCE', 'INDEPENDENT_CORROBORATION']);
export const EvidenceRegister = z.discriminatedUnion('source', [
  z.strictObject({ source: z.literal('PACKAGE_ITEM'), package_id: Id, item_id: Id, evidence_type: EvidenceType.nullable(), valid_until: Time.nullable(), description: Text(1, 4000).nullable() }),
  z.strictObject({ source: z.literal('CHANNEL_ENTRY'), delivery_id: Id, entry_key: z.string().regex(/^[a-z0-9_.]{3,80}$/), valid_until: Time.nullable(), description: Text(1, 4000).nullable() }),
  z.strictObject({ source: z.literal('AUDITOR_RECORD'), evidence_type: z.enum(['OBSERVATION', 'REPERFORMANCE', 'INDEPENDENT_CORROBORATION', 'MANAGEMENT_ASSERTION']), title: Text(1, 300),
    description: Text(10, 4000), collection_method: Text(3, 500), collected_at: Time, period_from: Time.nullable(), period_to: Time.nullable(), valid_until: Time.nullable() }),
]);
export const EvidenceEvaluate = z.strictObject({
  procedure_id: Id, relevance: z.enum(['RELEVANT', 'PARTIALLY_RELEVANT', 'NOT_RELEVANT']), reliability: z.enum(['HIGH', 'MEDIUM', 'LOW']),
  sufficiency: z.enum(['SUFFICIENT', 'INSUFFICIENT']), contradicts: z.boolean(), rationale: Text(10, 2000),
});
export const PracticeRequestCreate = z.strictObject({ requirement_id: RequirementId, procedure_id: Id.nullable(), owner_role: Text(2, 120), description: Text(1, 2000), due_date: Day });
export const PracticeResultRecord = z.strictObject({ requirement_id: RequirementId, result: RequirementResult, rationale: Text(10, 2000) });
export const RequestEventRecord = z.strictObject({
  event: z.enum(['CLARIFICATION_REQUESTED', 'CLARIFICATION_GIVEN', 'RESPONSE_RECEIVED', 'ACCEPTED', 'RESUBMISSION_REQUESTED', 'UNABLE_TO_OBTAIN', 'ESCALATED', 'WITHDRAWN']),
  note: Text(3, 4000), evidence_id: Id.nullable(),
});
export const PopulationRecord = z.discriminatedUnion('source_kind', [
  z.strictObject({ source_kind: z.literal('CHANNEL_SAMPLE'), delivery_id: Id, entry_key: z.string().regex(/^sample\.[a-z0-9_.]{3,76}$/), definition: Text(10, 2000),
    completeness: z.enum(['COMPLETE', 'INCOMPLETE', 'UNVERIFIED']), completeness_basis: Text(10, 2000), completeness_evidence_id: Id.nullable(), size_rationale: Text(10, 2000), exclusions: Text(1, 2000).nullable() }),
  z.strictObject({ source_kind: z.enum(['CLIENT_LISTING', 'PACKAGE_ITEM', 'AUDITOR_OBSERVED']), definition: Text(10, 2000), source: Text(3, 1000), period_from: Day.nullable(), period_to: Day.nullable(),
    population_size: z.number().int().min(0).nullable(), completeness: z.enum(['COMPLETE', 'INCOMPLETE', 'UNVERIFIED']), completeness_basis: Text(10, 2000), completeness_evidence_id: Id.nullable(),
    sample_method: z.enum(['SEEDED_RANDOM', 'JUDGEMENTAL', 'ALL_ITEMS']), sample_size: z.number().int().min(0), size_rationale: Text(10, 2000), seed: z.string().regex(/^[a-f0-9]{32,64}$/).nullable(),
    exclusions: Text(1, 2000).nullable(), tested: z.number().int().min(0), passed: z.number().int().min(0), exceptions: z.number().int().min(0), evidence_id: Id.nullable() }),
]);
export const WorkingPaperConclusion = z.enum(['EFFECTIVE', 'EXCEPTIONS_NOTED', 'INEFFECTIVE', 'NOT_TESTED', 'UNABLE_TO_TEST']);
export const WorkingPaperRecord = z.strictObject({
  performed: Text(10, 8000), criteria: Text(3, 2000), population_id: Id.nullable(), results: Text(3, 8000), exceptions: z.number().int().min(0),
  exception_details: Text(1, 8000).nullable(), conclusion: WorkingPaperConclusion, evidence_ids: z.array(Id).max(100),
});
export const ReviewNoteRaise = z.strictObject({ note: Text(3, 4000) });
export const ReviewNoteRespond = z.strictObject({ response: Text(3, 4000) });

// ---------------------------------------------------------------- findings, responses, retests, closure
export const PracticeFindingCreate = z.strictObject({
  requirement_id: RequirementId, provision_ids: z.array(ProvisionId).max(10), criterion_type: CriterionType, severity: Severity, title: Text(1, 200),
  observation: Text(1, 4000), affected_scope: Text(3, 2000), cause: Text(3, 4000), consequence: Text(3, 4000), severity_rationale: Text(10, 4000),
  recommendation: Text(1, 4000), orvia_guidance: Text(1, 4000).nullable(), due_date: Day, working_paper_ids: z.array(Id).min(1).max(20), evidence_ids: z.array(Id).max(50),
});
export const ManagementResponseRecord = z.strictObject({
  factual_accuracy: z.enum(['AGREED', 'DISPUTED']), agreement: z.enum(['AGREE', 'PARTIALLY_AGREE', 'DISAGREE']), response: Text(3, 4000), action_plan: Text(1, 4000).nullable(),
  owner_role: Text(2, 120).nullable(), due_date: Day.nullable(), dependencies: Text(1, 2000).nullable(),
  remediation_status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED_CLAIMED', 'RISK_ACCEPTANCE_PROPOSED']), reference: Text(3, 300),
});
export const RetestRecord = z.strictObject({ working_paper_id: Id });
export const RiskAcceptanceRecord = z.strictObject({ management_response_id: Id, accepting_authority: Text(3, 300), justification: Text(20, 4000), expires_on: Day, review_on: Day });
export const ClosureType = z.enum(['VERIFIED_REMEDIATION', 'RISK_ACCEPTED', 'ENGAGEMENT_WITHDRAWN', 'ADMINISTRATIVE']);
export const FindingClose = z.strictObject({ closure_type: ClosureType, reason: Text(10, 2000) });

// ---------------------------------------------------------------- report and holds
export const PracticeReportDraft = z.strictObject({
  opinion_as_of: Day, executive_summary: Text(20, 8000), method: Text(1, 4000), opinion: Text(1, 4000), limitations: z.array(Text(1, 1000)).min(1).max(20),
  supersedes_report_id: Id.nullable(), correction_reason: Text(10, 2000).nullable(),
}).refine(v => (v.supersedes_report_id === null) === (v.correction_reason === null), { message: 'A correction names the report it supersedes and why', path: ['correction_reason'] });
export const LegalHoldAuthorise = z.strictObject({ reason: Text(10, 2000), expires_on: Day.nullable() });
export const LegalHoldRelease = z.strictObject({ reason: Text(10, 2000) });

// ---------------------------------------------------------------- the engagement file
const Reviewed = { reviewed_by: Id.nullable(), reviewed_at: Time.nullable() };
export const EngagementFile = z.strictObject({
  engagement_id: Id, use_kind: z.enum(['SYNTHETIC', 'REAL']),
  criteria: z.strictObject({ id: Id, version: z.string(), distribution: CriteriaDistribution, digest: z.string() }).nullable(),
  methodology: z.strictObject({ id: Id, version: z.string(), digest: z.string(), approved: z.boolean() }).nullable(),
  commercial_owner_id: Id.nullable(), implementation_owner_id: Id.nullable(),
  acceptance: z.strictObject({ service_type: ServiceType, objectives: z.string(), intended_users: z.string(), client_responsibilities: z.string(), auditor_responsibilities: z.string(),
    confidentiality: z.string(), evidence_handling: z.string(), scope_restrictions: z.string().nullable(), competence: z.string(), sdf_applicability_basis: z.string().nullable(),
    eligibility_evidence: z.string().nullable(), licence_independence: z.boolean(), prepared_by: Id, prepared_at: Time, decision: z.enum(['ACCEPTED', 'DECLINED']).nullable(),
    decided_by: Id.nullable(), decided_at: Time.nullable(), decision_rationale: z.string().nullable() }).nullable(),
  conflicts: z.array(z.strictObject({ id: Id, kind: ConflictKind, person_id: Id.nullable(), description: z.string(), status: z.enum(['OPEN', 'SAFEGUARDED', 'DISQUALIFYING']), safeguard: z.string().nullable(), recorded_by: Id, recorded_at: Time, ...Reviewed })).max(200),
  understanding: z.array(z.strictObject({ id: Id, version: z.number().int(), content: z.unknown(), redactions: z.number().int(), prepared_by: Id, prepared_at: Time, ...Reviewed })).max(100),
  applicability: z.array(z.strictObject({ id: Id, requirement_id: z.string(), provision_ids: z.array(z.string()), criterion_type: CriterionType, applicability: z.enum(['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED']),
    effective_from: Day.nullable(), rationale: z.string(), evidence_refs: z.array(z.string()), unresolved_question: z.string().nullable(), decided_by: Id, decided_at: Time, current: z.boolean(), ...Reviewed })).max(1000),
  scope: z.array(z.strictObject({ id: Id, version: z.number().int(), entities: z.array(z.string()), processes: z.array(z.string()), systems: z.array(z.string()), locations: z.array(z.string()),
    period_from: Day, period_to: Day, requirement_ids: z.array(z.string()), exclusions: z.array(z.string()), limitations: z.array(z.string()), change_reason: z.string().nullable(), impact_assessment: z.string().nullable(),
    change: z.strictObject({ added: z.array(z.string()), removed: z.array(z.string()), procedures_affected: z.number().int() }).nullable(),
    prepared_by: Id, prepared_at: Time, approved_by: Id.nullable(), approved_at: Time.nullable() })).max(100),
  risks: z.array(z.strictObject({ id: Id, requirement_id: z.string(), risk: z.string(), likelihood: z.number().int(), impact: z.number().int(), affected_people: z.string(), affected_scope: z.string(), duration: z.string(),
    uncertainty: z.string(), control_reference: z.string().nullable(), control_effectiveness: ControlEffectiveness, inherent_rating: RiskRating, residual_rating: RiskRating, rationale: z.string(), assessed_by: Id, assessed_at: Time, ...Reviewed })).max(1000),
  plan: z.strictObject({ procedures_digest: z.string(), approved: z.boolean(), approval: z.strictObject({ id: Id, procedures_digest: z.string(), prepared_by: Id, approved_by: Id, approved_at: Time }).nullable(), problems: z.array(z.string()).max(200) }),
  procedures: z.array(z.strictObject({ id: Id, requirement_id: z.string(), provision_ids: z.array(z.string()), risk_assessment_id: Id.nullable(), control_reference: z.string().nullable(), objective: z.string(),
    procedure_type: ProcedureType, test_nature: TestNature, requires_record_level: z.boolean(), owner_id: Id, planned_start: Day, planned_end: Day, depends_on: z.array(Id), evidence_expectation: z.string(),
    completion_criteria: z.string(), retest_of_finding_id: Id.nullable(), state: z.enum(['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'NOT_PERFORMED']), not_performed_reason: z.string().nullable(), created_by: Id, created_at: Time })).max(2000),
  evidence: z.array(z.strictObject({ id: Id, source: z.enum(['PACKAGE_ITEM', 'CHANNEL_ENTRY', 'AUDITOR_RECORD']), package_id: Id.nullable(), item_id: Id.nullable(), delivery_id: Id.nullable(), entry_key: z.string().nullable(),
    evidence_type: EvidenceType, title: z.string(), description: z.string().nullable(), redactions: z.number().int(), period_from: Time.nullable(), period_to: Time.nullable(), collection_method: z.string(), collected_at: Time,
    valid_until: Time.nullable(), stale: z.boolean(), sha256: z.string().nullable(), provenance: z.string(), registered_by: Id, registered_at: Time, accessed: z.number().int(),
    evaluations: z.array(z.strictObject({ id: Id, procedure_id: Id, relevance: z.string(), reliability: z.string(), sufficiency: z.string(), contradicts: z.boolean(), rationale: z.string(), evaluated_by: Id, evaluated_at: Time })).max(100) })).max(5000),
  requests: z.array(z.strictObject({ id: Id, requirement_id: z.string(), procedure_id: Id.nullable(), owner_role: z.string().nullable(), description: z.string(), due_date: Day, status: z.string(), overdue: z.boolean(), escalated_at: Time.nullable(),
    events: z.array(z.strictObject({ id: Id, event: z.string(), note: z.string(), evidence_id: Id.nullable(), actor_id: Id, recorded_at: Time })).max(200) })).max(1000),
  populations: z.array(z.strictObject({ id: Id, procedure_id: Id, definition: z.string(), source: z.string(), source_kind: z.string(), period_from: Day.nullable(), period_to: Day.nullable(), population_size: z.number().int().nullable(),
    completeness: z.enum(['COMPLETE', 'INCOMPLETE', 'UNVERIFIED']), completeness_basis: z.string(), sample_method: z.string(), sample_size: z.number().int(), size_rationale: z.string(), selection_digest: z.string().nullable(),
    seed: z.string().nullable(), exclusions: z.string().nullable(), tested: z.number().int(), passed: z.number().int(), exceptions: z.number().int(), evidence_id: Id.nullable(), recorded_by: Id, recorded_at: Time })).max(2000),
  working_papers: z.array(z.strictObject({ id: Id, procedure_id: Id, version: z.number().int(), current: z.boolean(), performed: z.string(), criteria: z.string(), population_id: Id.nullable(), results: z.string(), exceptions: z.number().int(),
    exception_details: z.string().nullable(), conclusion: WorkingPaperConclusion, evidence_ids: z.array(Id), redactions: z.number().int(), digest: z.string(), prepared_by: Id, prepared_at: Time, ...Reviewed,
    notes: z.array(z.strictObject({ id: Id, note: z.string(), raised_by: Id, raised_at: Time, response: z.string().nullable(), resolved_by: Id.nullable(), resolved_at: Time.nullable() })).max(200) })).max(4000),
  findings: z.array(z.strictObject({ id: Id, requirement_id: z.string(), provision_ids: z.array(z.string()), criterion_type: CriterionType.nullable(), severity: Severity, title: z.string(), observation: z.string(),
    affected_scope: z.string().nullable(), cause: z.string().nullable(), consequence: z.string().nullable(), severity_rationale: z.string().nullable(), recommendation: z.string(), orvia_guidance: z.string().nullable(),
    due_date: Day, status: z.enum(['OPEN', 'CLIENT_RESPONDED', 'RETEST_PASSED', 'RETEST_FAILED', 'CLOSED']), working_paper_ids: z.array(Id), evidence_ids: z.array(Id),
    closure_type: ClosureType.nullable(), closure_reason: z.string().nullable(), closed_by: Id.nullable(), closed_at: Time.nullable(), created_at: Time,
    responses: z.array(z.strictObject({ id: Id, source: z.enum(['CHANNEL', 'RECORDED_BY_AUDITOR']), factual_accuracy: z.string(), agreement: z.string(), response: z.string(), action_plan: z.string().nullable(), owner_role: z.string().nullable(),
      due_date: Day.nullable(), dependencies: z.string().nullable(), remediation_status: z.string(), reference: z.string().nullable(), received_at: Time })).max(100),
    retests: z.array(z.strictObject({ id: Id, working_paper_id: Id, evidence_ids: z.array(Id), result: z.enum(['PASSED', 'FAILED']), performed_by: Id, reviewed_by: Id, recorded_at: Time })).max(50),
    risk_acceptances: z.array(z.strictObject({ id: Id, management_response_id: Id, accepting_authority: z.string(), justification: z.string(), expires_on: Day, review_on: Day, expired: z.boolean(), recorded_by: Id, recorded_at: Time })).max(20) })).max(500),
  conclusions: z.array(z.strictObject({ requirement_id: z.string(), recorded: RequirementResult.nullable(), supported_favourable: z.boolean(), open_statutory_findings: z.number().int(),
    current_working_papers: z.number().int(), unreviewed_working_papers: z.number().int() })).max(200),
  holds: z.array(z.strictObject({ id: Id, reason: z.string(), authorised_by: Id, authorised_at: Time, expires_on: Day.nullable(), released_by: Id.nullable(), released_at: Time.nullable(), release_reason: z.string().nullable(), active: z.boolean() })).max(100),
  traceability: z.array(z.strictObject({ requirement_id: z.string(), provision_ids: z.array(z.string()), applicability: z.string().nullable(), risks: z.array(Id), procedures: z.array(Id), evidence: z.array(Id),
    working_papers: z.array(Id), result: RequirementResult.nullable(), findings: z.array(Id), retests: z.array(Id), conclusion: z.string() })).max(200),
});
export type EngagementFile = z.infer<typeof EngagementFile>;
