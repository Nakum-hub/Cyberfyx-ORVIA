import { z } from 'zod';
import { Applicability, Day, Digest, Id, SafeText, Time, Version } from './primitives.ts';

// ---------------------------------------------------------------------------
// Regulatory Core (regulatory/DPDP_REGULATORY_CORE.md).
//
// The runtime consumes a signed, approved package, never loose sources. Only an
// official Government of India source may establish executable behaviour, a
// provision is never represented as in force before its commencement date, and
// applicability can only be one of the shared vocabulary values. A missing
// customer fact makes the answer UNRESOLVED; it is never guessed.
// ---------------------------------------------------------------------------

/** Hosts from which an executable source may come. Anything else is context, not authority. */
export const OFFICIAL_SOURCE_HOSTS = ['meity.gov.in', 'egazette.gov.in', 'indiacode.nic.in', 'dpdp.gov.in'] as const;
export function isOfficialSourceUrl(value: string) {
  let url: URL;
  try { url = new URL(value); } catch { return false; }
  return url.protocol === 'https:' && OFFICIAL_SOURCE_HOSTS.some(host => url.hostname === host || url.hostname.endsWith('.' + host));
}

export const SourceType = z.enum(['ACT', 'RULES', 'COMMENCEMENT_NOTIFICATION', 'GAZETTE_NOTIFICATION', 'CORRIGENDUM', 'BOARD_NOTIFICATION', 'MEITY_DIRECTION']);
export const SourceVerification = z.enum(['ARTIFACT_HASHED', 'NOT_RETRIEVED', 'TEST_FIXTURE']);
export const RegulatorySource = z.strictObject({
  source_id: z.string().regex(/^[A-Z0-9][A-Z0-9_.-]{1,80}$/), source_type: SourceType,
  publisher: SafeText, title: SafeText, official_url: z.url().max(500),
  notification_reference: SafeText.nullable(), publication_date: Day.nullable(),
  artifact_digest: Digest.nullable(), retrieved_at: Time.nullable(), verification: SourceVerification,
  supersedes: z.string().max(80).nullable(), corrects: z.string().max(80).nullable(),
}).superRefine((s, c) => {
  if ((s.verification === 'ARTIFACT_HASHED') !== (s.artifact_digest !== null && s.retrieved_at !== null)) c.addIssue({ code: 'custom', message: 'A hashed source records its digest and retrieval time; an unretrieved one records neither' });
});
export const ProvisionStatus = z.enum(['PUBLISHED', 'NOT_COMMENCED', 'IN_FORCE', 'AMENDED', 'SUPERSEDED']);
export const RegulatoryProvision = z.strictObject({
  provision_id: z.string().regex(/^[A-Z0-9][A-Za-z0-9_.()-]{1,80}$/), source_id: z.string().max(80),
  reference: SafeText, version: z.number().int().positive(),
  published_on: Day.nullable(), commences_on: Day.nullable(),
  /** The status as published in the package. The runtime still re-derives in-force from commences_on. */
  status: ProvisionStatus, commencement_basis: SafeText, text_digest: Digest.nullable(),
});

/** Facts an applicability expression may read. Each is either recorded or unknown. */
export const ApplicabilityFact = z.enum([
  'organisation.sdf_status', 'organisation.third_schedule_class',
  'activity.condition_code', 'activity.processes_child_data', 'activity.has_processor', 'activity.has_active_relationships',
]);
const FactTest = z.union([
  z.strictObject({ fact: ApplicabilityFact, equals: z.union([z.string().max(60), z.boolean()]) }),
  z.strictObject({ fact: ApplicabilityFact, in: z.array(z.string().max(60)).min(1).max(20) }),
  z.strictObject({ always: z.literal(true) }),
]);
const Level1 = z.union([FactTest,
  z.strictObject({ all: z.array(FactTest).min(1).max(10) }),
  z.strictObject({ any: z.array(FactTest).min(1).max(10) }),
  z.strictObject({ not: FactTest })]);
/** Two levels of nesting is enough for every requirement in the package and keeps the language closed. */
export const ApplicabilityExpression = z.union([Level1,
  z.strictObject({ all: z.array(Level1).min(1).max(10) }),
  z.strictObject({ any: z.array(Level1).min(1).max(10) })]);
export type ApplicabilityExpressionValue = z.infer<typeof ApplicabilityExpression>;

export const TimerAnchor = z.enum(['AWARENESS', 'RECEIPT', 'DESIGNATION', 'PERIOD_START']);
export const RequirementTimer = z.union([
  z.strictObject({ kind: z.literal('NONE') }),
  z.strictObject({ kind: z.literal('WITHOUT_DELAY'), runs_from: TimerAnchor }),
  z.strictObject({ kind: z.literal('HOURS'), runs_from: TimerAnchor, hours: z.number().int().min(1).max(87600) }),
]);
export const RequirementModule = z.enum(['NOTICES', 'CONSENT', 'CONDITIONS', 'RIGHTS', 'GRIEVANCE', 'RETENTION', 'PROCESSORS', 'SAFEGUARDS', 'BREACH', 'CHILDREN', 'SDF', 'TRANSFERS', 'CONTACT']);
export const BreachTaskKind = z.enum(['PRINCIPAL_INTIMATION', 'BOARD_INTIMATION', 'BOARD_DETAILED_REPORT', 'PROCESSOR_COORDINATION', 'CONTAINMENT', 'REMEDIATION']);
export const SdfObligationKind = z.enum(['DPO_APPOINTMENT', 'INDEPENDENT_AUDITOR_APPOINTMENT', 'PERIODIC_DPIA', 'PERIODIC_AUDIT', 'ALGORITHMIC_DUE_DILIGENCE', 'TRANSFER_RESTRICTION_REVIEW']);
export const RightsTimerScope = z.enum(['ACCESS', 'CORRECTION', 'ERASURE', 'GRIEVANCE', 'NOMINATION']);
export const RegulatoryRequirement = z.strictObject({
  requirement_id: z.string().regex(/^DPDP-[A-Z0-9-]{2,60}$/), version: z.number().int().positive(),
  title: SafeText, provision_ids: z.array(z.string().max(80)).min(1).max(12),
  statement: z.string().min(10).max(2000),
  applicability: ApplicabilityExpression,
  evidence_expectations: z.array(SafeText).min(1).max(10),
  modules: z.array(RequirementModule).min(1).max(6),
  timer: RequirementTimer,
  /** Which operational record a timer drives, where the requirement drives one. */
  breach_task_kind: BreachTaskKind.nullable(), sdf_obligation_kind: SdfObligationKind.nullable(),
  rights_timer_scope: z.array(RightsTimerScope).max(5),
  effective_from: Day,
  test_refs: z.array(z.string().max(120)).min(1).max(10),
});
export const ConditionCode = z.strictObject({ code: z.string().regex(/^[A-Z0-9_]{2,40}$/), label: SafeText, requirement_ids: z.array(z.string().max(80)).min(1).max(6) });
export const RegulatoryPackageClaims = z.strictObject({
  package_id: Id, version: Version, previous_version: Version.nullable(),
  audience: z.literal('ORVIA_CUSTOMER_INSTALLATION'),
  distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']),
  effective_from: Time, created_at: Time,
  sources: z.array(RegulatorySource).min(1).max(40),
  provisions: z.array(RegulatoryProvision).min(1).max(200),
  requirements: z.array(RegulatoryRequirement).min(1).max(100),
  condition_vocabulary: z.array(ConditionCode).min(1).max(20),
  release_notes: z.array(SafeText).max(20),
  open_verification_items: z.array(SafeText).max(20),
}).superRefine((p, c) => {
  const sources = new Set(p.sources.map(s => s.source_id));
  const provisions = new Set(p.provisions.map(r => r.provision_id));
  if (sources.size !== p.sources.length) c.addIssue({ code: 'custom', message: 'Each source appears once' });
  if (provisions.size !== p.provisions.length) c.addIssue({ code: 'custom', message: 'Each provision appears once' });
  if (new Set(p.requirements.map(r => r.requirement_id)).size !== p.requirements.length) c.addIssue({ code: 'custom', message: 'Each requirement appears once' });
  for (const provision of p.provisions) if (!sources.has(provision.source_id)) c.addIssue({ code: 'custom', message: `Provision ${provision.provision_id} cites an unknown source` });
  // No executable requirement without an official-source link.
  for (const requirement of p.requirements) for (const id of requirement.provision_ids) if (!provisions.has(id)) c.addIssue({ code: 'custom', message: `Requirement ${requirement.requirement_id} cites an unknown provision` });
  for (const code of p.condition_vocabulary) for (const id of code.requirement_ids) if (!p.requirements.some(r => r.requirement_id === id)) c.addIssue({ code: 'custom', message: `Condition ${code.code} cites an unknown requirement` });
  if (p.distribution === 'PRODUCTION') {
    for (const source of p.sources) {
      if (!isOfficialSourceUrl(source.official_url)) c.addIssue({ code: 'custom', message: `Source ${source.source_id} is not from an official Government of India host` });
      if (source.verification !== 'ARTIFACT_HASHED') c.addIssue({ code: 'custom', message: `Source ${source.source_id} was not retrieved and hashed` });
    }
  } else if (p.sources.some(s => s.verification !== 'TEST_FIXTURE')) c.addIssue({ code: 'custom', message: 'A test fixture package carries only fixture sources' });
});
export type RegulatoryPackageClaimsValue = z.infer<typeof RegulatoryPackageClaims>;
export const SignedRegulatoryPackage = z.strictObject({
  algorithm: z.literal('Ed25519'), claims: RegulatoryPackageClaims,
  signing_key_id: Id, signature: z.string().regex(/^[A-Za-z0-9_-]{86}$/),
});
export const RegulatoryPackageImport = z.strictObject({ package: SignedRegulatoryPackage });
export const RequirementChange = z.strictObject({ requirement_id: z.string().max(80), from_version: z.number().int().nullable(), to_version: z.number().int().nullable() });
export const PackageDiff = z.strictObject({
  compared_with_version: Version.nullable(),
  added: z.array(RequirementChange).max(100), changed: z.array(RequirementChange).max(100), removed: z.array(RequirementChange).max(100),
});
export const RegulatoryPackage = z.strictObject({
  id: Id, package_id: Id, version: Version, previous_version: Version.nullable(),
  distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']), effective_from: Time,
  state: z.enum(['IMPORTED', 'APPROVED', 'REJECTED']),
  /** Computed now from approval and effective date, never stored. */
  active: z.boolean(), package_digest: Digest,
  imported_at: Time, imported_by: Id, decided_at: Time.nullable(), decided_by: Id.nullable(), decision_note: SafeText.nullable(),
  source_count: z.number().int().min(0), requirement_count: z.number().int().min(0),
  unverified_source_ids: z.array(z.string().max(80)).max(40),
  open_verification_items: z.array(SafeText).max(20), diff: PackageDiff,
});
export const RequirementView = RegulatoryRequirement.extend({ in_force_now: z.boolean(), legal_status_now: z.enum(['IN_FORCE', 'NOT_YET_IN_FORCE']) });
export const RegulatoryPackageDetail = z.strictObject({
  package: RegulatoryPackage, sources: z.array(RegulatorySource).max(40), provisions: z.array(RegulatoryProvision).max(200),
  requirements: z.array(RequirementView).max(100), condition_vocabulary: z.array(ConditionCode).max(20), release_notes: z.array(SafeText).max(20),
});
export const RegulatoryPackageDecision = z.strictObject({
  decision: z.enum(['APPROVED', 'REJECTED']), note: z.string().min(10).max(500),
  /** Approving with open verification items is a named, deliberate act. */
  acknowledged_open_verification_items: z.boolean(),
});
export const ActivePackageQuery = z.strictObject({ as_of: Time.optional() });
export const ActivePackage = z.strictObject({ as_of: Time, package: RegulatoryPackage.nullable(), reason: SafeText });
export const ApplicabilityEvaluate = z.strictObject({ scope_kind: z.enum(['ORGANISATION', 'ACTIVITY']), scope_id: Id.nullable(), as_of: Time.nullable() });
export const ApplicabilityDecision = z.strictObject({
  id: Id, package_row_id: Id, requirement_id: z.string().max(80), requirement_version: z.number().int(),
  scope_kind: z.enum(['ORGANISATION', 'ACTIVITY']), scope_id: Id.nullable(), result: Applicability,
  inputs: z.record(z.string(), z.union([z.string(), z.boolean(), z.null()])), trace: z.array(SafeText).max(40),
  as_of: Time, evaluated_at: Time, actor_id: Id, override_of: Id.nullable(), override_basis: SafeText.nullable(),
});
export const ApplicabilityEvaluation = z.strictObject({
  package_row_id: Id, package_version: Version, as_of: Time,
  decisions: z.array(ApplicabilityDecision).max(100),
  summary: z.record(Applicability, z.number().int().min(0)),
});
export const ApplicabilityOverride = z.strictObject({ decision_id: Id, basis: z.string().min(10).max(500) });
export const ImpactChange = z.enum(['ADDED', 'CHANGED', 'REMOVED']);
export const ImpactKind = z.enum(['ACTIVITY', 'NOTICE', 'CONDITION', 'CONSENT', 'RIGHTS', 'RETENTION', 'PROCESSOR', 'SAFEGUARD', 'BREACH', 'SDF', 'CHILD', 'ORGANISATION', 'UNRESOLVED']);
export const RegulatoryImpact = z.strictObject({
  id: Id, package_row_id: Id, requirement_id: z.string().max(80), change: ImpactChange,
  affected_kind: ImpactKind, affected_id: Id.nullable(), reason: SafeText,
  state: z.enum(['OPEN', 'ACTIONED', 'NOT_AFFECTED']), reviewed_at: Time.nullable(), reviewed_by: Id.nullable(), review_note: SafeText.nullable(), created_at: Time,
});
export const ImpactReview = z.strictObject({ state: z.enum(['ACTIONED', 'NOT_AFFECTED']), note: z.string().min(10).max(500) });
export const ImpactQuery = z.strictObject({ package_row_id: Id.optional() });
export const regulatorySchemas = {
  RegulatorySource, RegulatoryProvision, RegulatoryRequirement, RegulatoryPackageClaims, SignedRegulatoryPackage, RegulatoryPackageImport,
  RegulatoryPackage, RegulatoryPackageDetail, RegulatoryPackageDecision, ActivePackageQuery, ActivePackage,
  ApplicabilityEvaluate, ApplicabilityDecision, ApplicabilityEvaluation, ApplicabilityOverride, RegulatoryImpact, ImpactReview, ImpactQuery,
  RegulatoryPackageList: z.strictObject({ items: z.array(RegulatoryPackage).max(100), next_cursor: z.string().max(200).nullable() }),
  ApplicabilityDecisionList: z.strictObject({ items: z.array(ApplicabilityDecision).max(100), next_cursor: z.string().max(200).nullable() }),
  RegulatoryImpactList: z.strictObject({ items: z.array(RegulatoryImpact).max(100), next_cursor: z.string().max(200).nullable() }),
};
