import { z } from 'zod';
import { ActionState, Digest, ExecutionReport, Id, Locale, LongText, Reference, SafeText, TargetReference, Time, Version, page } from './primitives.ts';
import { ApplicabilityDecision, BreachTaskKind } from './regulatory.ts';
import { RegistryNoticeVersion } from './registry.ts';

// ---------------------------------------------------------------------------
// Operational workflows (integrations/CONNECTORS_EXECUTION_AND_VERIFICATION.md,
// security/SECURITY_EVIDENCE_AND_AUDIT.md).
//
// Requested, dispatched, target-accepted, target-completed, independently
// verified, failed, inconclusive and unsupported are kept apart all the way to
// the wire. A target's own success response is never reported as verified.
// ---------------------------------------------------------------------------

export const RunKind = z.enum(['CONSENT_WITHDRAWAL', 'RIGHTS_EXECUTION', 'CORRECTION', 'RETENTION_ERASURE', 'PROCESSOR_DISPOSITION']);
export const RunStatus = z.enum(['EVALUATING', 'DRY_RUN_READY', 'AWAITING_APPROVAL', 'APPROVED', 'RUNNING', 'COMPLETED_VERIFIED', 'COMPLETED_WITH_EXCEPTIONS', 'PARTIALLY_FAILED', 'CANCELLED', 'BLOCKED']);
export const ActionType = z.enum(['SUPPRESS', 'ERASE', 'ANONYMISE', 'CORRECT', 'READ_REFERENCE', 'DISPOSITION_CONFIRMATION']);
/** integrations s13: every count a bulk job must account for. */
export const RunCounts = z.strictObject({
  total_discovered: z.number().int().min(0), eligible: z.number().int().min(0), blocked: z.number().int().min(0), unresolved: z.number().int().min(0),
  submitted: z.number().int().min(0), succeeded: z.number().int().min(0), verified: z.number().int().min(0),
  failed: z.number().int().min(0), inconclusive: z.number().int().min(0), not_supported: z.number().int().min(0), pending: z.number().int().min(0),
});
export const Verification = z.strictObject({
  id: Id, method: z.enum(['INDEPENDENT_READ_BACK', 'TARGET_AUDIT_EVIDENCE', 'AUTHORITATIVE_COMPLETION_EVENT', 'AUTHORITATIVE_OPERATION_RESPONSE', 'NONE_AVAILABLE']),
  verifier: SafeText, expected: z.record(z.string(), z.unknown()), observed: z.record(z.string(), z.unknown()),
  result: z.enum(['PASS', 'FAIL', 'INCONCLUSIVE']), failure_reason: SafeText.nullable(), verified_at: Time, evidence_id: Id.nullable(),
});
export const DownstreamAction = z.strictObject({
  id: Id, run_id: Id, ordinal: z.number().int().min(0), subject_id: Id.nullable(), system_id: Id.nullable(), engagement_id: Id.nullable(),
  target_reference: TargetReference.nullable(), action_type: ActionType, state: ActionState,
  /** The shared execution vocabulary, derived and never stored separately. */
  execution: ExecutionReport,
  target_result: z.enum(['NONE', 'ACCEPTED_BY_TARGET', 'COMPLETED_BY_TARGET', 'FAILED', 'TIMEOUT_EFFECT_UNKNOWN', 'NOT_SUPPORTED', 'NOT_FOUND']),
  verification: z.enum(['NOT_VERIFIED', 'VERIFIED', 'FAILED', 'INCONCLUSIVE', 'NOT_POSSIBLE']),
  block_reason: SafeText.nullable(), hold_ids: z.array(Id).max(50), attempts: z.number().int().min(0), last_error_code: z.string().max(60).nullable(),
  verifications: z.array(Verification).max(20), payload_digest: Digest.nullable(), updated_at: Time,
}).superRefine((a, c) => {
  if ((a.state === 'verified') !== (a.verification === 'VERIFIED')) c.addIssue({ code: 'custom', message: 'Verified means an independent verification passed, and nothing else' });
});
export const RunPreview = z.strictObject({
  action_types: z.array(ActionType).max(6),
  target_systems: z.array(z.strictObject({ system_id: Id, adapter: z.enum(['SYNTHETIC_RECORDS_TEST_ADAPTER', 'MANUAL_ONLY', 'UNBOUND']), supported: z.boolean(), can_verify: z.boolean(), action_count: z.number().int().min(0) })).max(50),
  population_count: z.number().int().min(0), eligible: z.number().int().min(0), blocked: z.number().int().min(0), unresolved: z.number().int().min(0),
  unsupported: z.number().int().min(0), verifiable: z.number().int().min(0),
  blocking_hold_ids: z.array(Id).max(100), rule_references: z.array(SafeText).max(20), requirement_ids: z.array(z.string().max(80)).max(20),
  irreversible: z.boolean(), warning: SafeText.nullable(),
});
export const RunApproval = z.strictObject({ id: Id, scope_hash: Digest, decision: z.enum(['APPROVED', 'REJECTED']), note: SafeText, approver_id: Id, decided_at: Time });
export const WorkflowRun = z.strictObject({
  id: Id, kind: RunKind, status: RunStatus, workflow_version: Version,
  package: z.strictObject({ id: Id, version: Version, distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']) }),
  configuration: z.record(z.string(), z.unknown()), trigger: z.record(z.string(), z.unknown()),
  subject_id: Id.nullable(), rights_request_id: Id.nullable(), retention_rule_id: Id.nullable(), engagement_id: Id.nullable(), consent_event_id: Id.nullable(),
  approval_required: z.boolean(), approval: RunApproval.nullable(), scope_hash: Digest.nullable(),
  evaluation_complete: z.boolean(), counts: RunCounts, preview: RunPreview.nullable(), block_reason: SafeText.nullable(),
  created_at: Time, created_by: Id, started_at: Time.nullable(), ended_at: Time.nullable(),
  /** Unknown or unreached targets remain visible in the final state. */
  open_exceptions: z.array(SafeText).max(20),
});
export const CorrectionInput = z.strictObject({ field: z.string().regex(/^[a-z][a-z0-9_]{0,40}$/), data_category_id: Id, value: z.string().min(1).max(500) });
export const RightsRunCreate = z.strictObject({ rights_request_id: Id, subject_id: Id, corrections: z.array(CorrectionInput).max(20) });
export const RetentionRunCreate = z.strictObject({ retention_rule_id: Id });
export const RunEvaluate = z.strictObject({ limit: z.number().int().min(1).max(1000) });
export const RunDecision = z.strictObject({ decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().min(10).max(500), scope_hash: Digest });
export const RunExecute = z.strictObject({ limit: z.number().int().min(1).max(200) });
export const RunCancel = z.strictObject({ reason: z.string().min(10).max(500) });
export const RunQuery = z.strictObject({ kind: RunKind.optional(), status: RunStatus.optional() });
export const ActionQuery = z.strictObject({ state: ActionState.optional() });
export const EvidencePackage = z.strictObject({
  package_kind: z.literal('ORVIA_WORKFLOW_EVIDENCE_PACKAGE'), generated_at: Time,
  run: WorkflowRun, regulatory_package: z.strictObject({ id: Id, version: Version, distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']), package_digest: Digest, effective_from: Time }),
  trigger: z.record(z.string(), z.unknown()), applicability: z.array(ApplicabilityDecision).max(100),
  approvals: z.array(RunApproval).max(5), actions: z.array(DownstreamAction).max(5000),
  holds: z.array(z.strictObject({ id: Id, hold_type: z.string().max(40), authority_reference: SafeText, state: z.string().max(20) })).max(100),
  communications: z.array(z.strictObject({ source: z.string().max(60), reference: SafeText, recorded_at: Time })).max(100),
  evidence: z.array(z.strictObject({ id: Id, entity_kind: z.string().max(60), method: z.string().max(60), content_digest: Digest.nullable(), recorded_at: Time, fixture: z.boolean() })).max(5000),
  final_state: RunStatus, fixture_content: z.boolean(),
  integrity_digest: Digest,
  integrity_limit: z.literal('The digest detects change relative to this export; it does not prove the target effects it describes beyond the recorded verifications.'),
});

export const EstateReference = z.strictObject({ system_id: Id, target_reference: TargetReference });
export const EstateRelationship = z.strictObject({
  category_id: Id, status: z.enum(['ACTIVE', 'ENDED', 'UNKNOWN']), effective_from: Time.nullable(), effective_to: Time.nullable(),
  source_reference: SafeText.nullable(), evidence_state: z.enum(['KNOWN', 'UNKNOWN', 'EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION']), evidence_reference: SafeText.nullable(),
});
export const EstateConsent = z.strictObject({
  activity_id: Id, event: z.enum(['REQUESTED', 'PRESENTED', 'GRANTED', 'DECLINED', 'WITHDRAWN']), occurred_at: Time.nullable(),
  evidence_state: z.enum(['EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION']), evidence_reference: SafeText.nullable(), source_reference: SafeText,
});
export const EstateNoticeDelivery = z.strictObject({ notice_version_id: Id, channel: z.string().min(2).max(60), presented_at: Time, source_reference: Reference, evidence_reference: SafeText.nullable(), result: z.enum(['PRESENTED', 'DELIVERED', 'FAILED', 'UNKNOWN']) });
/** One row of an existing estate. Missing history is expressed as missing, never supplied. */
export const EstateRow = z.strictObject({
  row_key: z.string().min(1).max(200), source_key: z.string().min(1).max(320).nullable(),
  references: z.array(EstateReference).min(1).max(10), relationships: z.array(EstateRelationship).max(10),
  consent: z.array(EstateConsent).max(20), notice_deliveries: z.array(EstateNoticeDelivery).max(10),
});
export type EstateRowValue = z.infer<typeof EstateRow>;
export const BulkJobCreate = z.strictObject({ source_label: z.string().min(2).max(120), mapping_version: z.string().regex(/^[A-Za-z0-9_.-]{1,40}$/) });
export const BulkJobAppend = z.strictObject({ first_ordinal: z.number().int().min(0), rows: z.array(EstateRow).min(1).max(500) });
export const BulkJobProcess = z.strictObject({ limit: z.number().int().min(1).max(1000) });
export const BulkJob = z.strictObject({
  id: Id, kind: z.literal('ESTATE_IMPORT'), source_label: SafeText, mapping_version: z.string().max(40),
  status: z.enum(['RECEIVING', 'PROCESSING', 'COMPLETED', 'COMPLETED_WITH_ERRORS']), cursor: z.number().int().min(-1),
  counts: z.strictObject({ received: z.number().int().min(0), applied: z.number().int().min(0), duplicate: z.number().int().min(0), error: z.number().int().min(0), pending: z.number().int().min(0) }),
  errors: z.array(z.strictObject({ ordinal: z.number().int().min(0), error_code: z.string().max(60) })).max(50),
  created_at: Time, updated_at: Time,
});

export const BreachRegister = z.strictObject({
  incident_id: Id, affected_count: z.number().int().min(0).nullable(), affected_count_state: z.enum(['UNKNOWN', 'ESTIMATED', 'ESTABLISHED']),
  data_category_ids: z.array(Id).max(40), activity_ids: z.array(Id).max(40), system_ids: z.array(Id).max(40), engagement_ids: z.array(Id).max(40),
  facts: z.strictObject({ nature: SafeText, extent: SafeText, timing: SafeText, location: SafeText, likely_impact: SafeText }),
  mitigation: SafeText.nullable(),
}).superRefine((b, c) => { if ((b.affected_count_state === 'UNKNOWN') !== (b.affected_count === null)) c.addIssue({ code: 'custom', message: 'An unknown count is recorded as unknown, and a known one is recorded' }); });
export const BreachUpdate = z.strictObject({
  affected_count: z.number().int().min(0).nullable(), affected_count_state: z.enum(['UNKNOWN', 'ESTIMATED', 'ESTABLISHED']),
  mitigation: SafeText.nullable(), facts: z.strictObject({ nature: SafeText, extent: SafeText, timing: SafeText, location: SafeText, likely_impact: SafeText }),
}).superRefine((b, c) => { if ((b.affected_count_state === 'UNKNOWN') !== (b.affected_count === null)) c.addIssue({ code: 'custom', message: 'An unknown count is recorded as unknown, and a known one is recorded' }); });
export const BreachTaskComplete = z.strictObject({ communication_evidence_reference: Reference, note: z.string().min(10).max(500) });
export const BreachTask = z.strictObject({
  id: Id, requirement_id: z.string().max(80), requirement_version: z.number().int(), package_row_id: Id, kind: BreachTaskKind,
  timer_rule: SafeText, due_at: Time.nullable(), legal_status: z.enum(['APPLICABLE', 'NOT_YET_IN_FORCE', 'UNRESOLVED']), unresolved_reason: SafeText.nullable(),
  state: z.enum(['OPEN', 'COMPLETED', 'NOT_APPLICABLE']), overdue: z.boolean(), completed_at: Time.nullable(),
  communication_evidence_reference: SafeText.nullable(), completion_note: SafeText.nullable(), created_at: Time,
});
export const Breach = z.strictObject({
  incident_id: Id, package: z.strictObject({ id: Id, version: Version, distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']) }), pinned_at: Time,
  detected_at: Time, became_aware_at: Time.nullable(), incident_state: z.string().max(20),
  affected_count: z.number().int().nullable(), affected_count_state: z.enum(['UNKNOWN', 'ESTIMATED', 'ESTABLISHED']),
  data_category_ids: z.array(Id).max(40), activity_ids: z.array(Id).max(40), system_ids: z.array(Id).max(40), engagement_ids: z.array(Id).max(40),
  facts: z.strictObject({ nature: SafeText, extent: SafeText, timing: SafeText, location: SafeText, likely_impact: SafeText }), mitigation: SafeText.nullable(),
  tasks: z.array(BreachTask).max(50), recorded_at: Time,
});
export const CaseProfile = z.strictObject({
  rights_request_id: Id, right_type: z.string().max(20), received_at: Time,
  package: z.strictObject({ id: Id, version: Version, distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']) }).nullable(),
  subject_id: Id.nullable(), due_at: Time.nullable(), due_basis: SafeText, legal_status: z.enum(['APPLICABLE', 'NOT_YET_IN_FORCE', 'UNRESOLVED', 'NO_ACTIVE_PACKAGE']),
  requirement_id: z.string().max(80).nullable(), overdue: z.boolean(), run_ids: z.array(Id).max(50), recorded_at: Time,
});
export const CaseProfileOpen = z.strictObject({ subject_id: Id.nullable() });

export const AttentionKind = z.enum([
  'RIGHTS_CASE_DUE', 'BREACH_TASK_DUE', 'ACTION_FAILED', 'ACTION_INCONCLUSIVE', 'ACTION_NOT_SUPPORTED', 'ACTION_AWAITING_VERIFICATION', 'RUN_AWAITING_APPROVAL',
  'CONDITION_UNRESOLVED', 'ACTIVITY_MAPPING_MISSING', 'SYSTEM_UNBOUND', 'CONSENT_EVIDENCE_MISSING', 'RELATIONSHIP_EVIDENCE_MISSING',
  'REGULATORY_IMPACT_OPEN', 'APPLICABILITY_UNRESOLVED', 'RETENTION_UNRESOLVED', 'HOLD_REVIEW_DUE', 'SDF_OBLIGATION_DUE', 'IMPORT_ROWS_FAILED', 'NO_ACTIVE_PACKAGE',
  'WITHDRAWAL_NOT_PROPAGATED',
]);
export const AttentionItem = z.strictObject({
  kind: AttentionKind, severity: z.enum(['OVERDUE', 'DUE_SOON', 'FAILED', 'INCONCLUSIVE', 'UNRESOLVED', 'MISSING', 'NOT_SUPPORTED', 'REVIEW_REQUIRED', 'OPEN']),
  entity_kind: z.string().max(40), entity_id: Id.nullable(), count: z.number().int().min(1), detail: SafeText, due_at: Time.nullable(),
});
export type AttentionItemValue = z.infer<typeof AttentionItem>;
export const OperationsAttention = z.strictObject({ as_of: Time, items: z.array(AttentionItem).max(200), derived_from_records: z.literal(true), limits: z.array(SafeText).max(8) });
export const OperationsCoverageMeasure = z.strictObject({
  dimension: z.enum(['ACTIVITY_CONDITION_RESOLVED', 'CONSENT_ACTIVITY_NOTICE_LINKED', 'ACTIVITY_RETENTION_LINKED', 'ACTIVITY_SYSTEM_BOUND', 'CONSENT_EVIDENCE_KNOWN', 'ACTION_VERIFIED']),
  counted: SafeText, numerator: z.number().int().min(0), denominator: z.number().int().min(0), excluded: z.number().int().min(0), exclusion_reasons: z.array(SafeText).max(8),
}).superRefine((m, c) => { if (m.numerator > m.denominator) c.addIssue({ code: 'custom', message: 'A numerator cannot exceed its denominator' }); });
export const OperationsCoverage = z.strictObject({ as_of: Time, measures: z.array(OperationsCoverageMeasure).max(10), no_compliance_score: z.literal(true) });
export const OperationalEvent = z.strictObject({ id: Id, event_type: z.string().max(60), subject_kind: z.string().max(40), subject_id: Id.nullable(), payload: z.record(z.string(), z.unknown()), occurred_at: Time, actor_id: Id, correlation_id: Id.nullable() });
export const EvidenceRecord = z.strictObject({
  id: Id, entity_kind: z.string().max(60), entity_id: Id, origin: z.enum(['SYSTEM', 'CONNECTOR', 'OPERATOR', 'IMPORT', 'REGULATORY_PACKAGE']), method: z.string().max(60),
  actor_id: Id, recorded_at: Time, content_digest: Digest.nullable(), integrity_state: z.enum(['DIGEST_RECORDED', 'NO_CONTROLLED_BYTES']),
  package_row_id: Id.nullable(), requirement_ids: z.array(z.string().max(80)).max(20), summary: z.record(z.string(), z.unknown()), supersedes: Id.nullable(), fixture: z.boolean(),
});
export const EvidenceQuery = z.strictObject({ requirement_id: z.string().regex(/^DPDP-[A-Z0-9-]{2,60}$/).optional(), entity_id: Id.optional() });
export const NotificationSweep = z.strictObject({
  swept_at: Time, examined: z.number().int().min(0), created: z.number().int().min(0),
  unresolved: z.array(z.strictObject({ source: z.string().max(60), source_id: Id, reason: SafeText })).max(100),
});

/** What a Data Principal is shown: the published notice, its channels and its effective date. */
export const PortalNotice = z.strictObject({
  notice_id: Id, name: SafeText, version_id: Id, version: z.number().int().positive(), locale: Locale, title: SafeText, content: LongText,
  channels: RegistryNoticeVersion.shape.channels, effective_from: Time, superseded: z.boolean(),
});
export const PortalNoticeQuery = z.strictObject({ locale: Locale.optional() });
export const OwnRequestEvent = z.strictObject({ to_state: z.string().max(40), recorded_at: Time, note: SafeText.nullable() });

export const operationsSchemas = {
  WorkflowRun, DownstreamAction, Verification, RunPreview, RunApproval, RightsRunCreate, RetentionRunCreate, RunEvaluate, RunDecision, RunExecute, RunCancel, RunQuery, ActionQuery, EvidencePackage,
  BulkJobCreate, BulkJobAppend, BulkJobProcess, BulkJob, BreachRegister, BreachUpdate, BreachTaskComplete, Breach, CaseProfile, CaseProfileOpen,
  OperationsAttention, OperationsCoverage, OperationalEvent, EvidenceRecord, EvidenceQuery, NotificationSweep, PortalNotice, PortalNoticeQuery, OwnRequestEvent,
  WorkflowRunList: page(WorkflowRun), DownstreamActionList: page(DownstreamAction), BulkJobList: page(BulkJob), BreachList: page(Breach), CaseProfileList: page(CaseProfile),
  OperationalEventList: page(OperationalEvent), EvidenceRecordList: page(EvidenceRecord), PortalNoticeList: page(PortalNotice), OwnRequestEventList: page(OwnRequestEvent),
};
