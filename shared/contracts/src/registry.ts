import { z } from 'zod';
import { Digest, Id, KnowledgeState, Locale, LongText, Reference, SafeText, TargetReference, Time, page } from './primitives.ts';

// ---------------------------------------------------------------------------
// Data & Processing Registry (architecture/DOMAIN_DATA_MODEL_AND_SCHEMA.md).
//
// Every customer fact is either recorded with its source or stored as unknown.
// Nothing here defaults a legal fact: no consent, retention period, relationship
// end, SDF designation or child status is ever filled in because it is absent.
// ---------------------------------------------------------------------------

export const SdfStatus = z.enum(['UNKNOWN', 'NOT_DESIGNATED', 'DESIGNATED']);
export const ThirdScheduleClass = z.enum(['UNKNOWN', 'NONE', 'E_COMMERCE_ENTITY', 'ONLINE_GAMING_INTERMEDIARY', 'SOCIAL_MEDIA_INTERMEDIARY']);
export const OrganisationProfileSet = z.strictObject({
  sdf_status: SdfStatus, sdf_designation_reference: Reference.nullable(),
  dpo_contact: Reference.nullable(), grievance_contact: Reference.nullable(), independent_auditor_reference: Reference.nullable(),
  facts: z.strictObject({ third_schedule_class: ThirdScheduleClass }),
  effective_from: Time, reason: z.string().min(10).max(500),
});
export const SdfObligation = z.strictObject({
  id: Id, requirement_id: z.string().max(80), kind: z.enum(['DPO_APPOINTMENT', 'INDEPENDENT_AUDITOR_APPOINTMENT', 'PERIODIC_DPIA', 'PERIODIC_AUDIT', 'ALGORITHMIC_DUE_DILIGENCE', 'TRANSFER_RESTRICTION_REVIEW']),
  period_start: Time, due_at: Time.nullable(), legal_status: z.enum(['APPLICABLE', 'NOT_YET_IN_FORCE']),
  state: z.enum(['OPEN', 'COMPLETED', 'NOT_APPLICABLE']), overdue: z.boolean(),
  completed_at: Time.nullable(), evidence_reference: SafeText.nullable(), closure_reason: SafeText.nullable(), package_row_id: Id,
});
export const SdfObligationComplete = z.strictObject({ evidence_reference: Reference });
export const OrganisationProfile = z.strictObject({
  id: Id, version: z.number().int().positive(), sdf_status: SdfStatus, sdf_designation_reference: SafeText.nullable(),
  dpo_contact: SafeText.nullable(), grievance_contact: SafeText.nullable(), independent_auditor_reference: SafeText.nullable(),
  facts: z.strictObject({ third_schedule_class: ThirdScheduleClass }),
  effective_from: Time, reason: SafeText, recorded_at: Time, recorded_by: Id,
  sdf_obligations: z.array(SdfObligation).max(100),
});
export const OrganisationProfileView = z.strictObject({ current: OrganisationProfile.nullable(), history: z.array(OrganisationProfile.omit({ sdf_obligations: true })).max(100) });

export const PrincipalCategoryCreate = z.strictObject({ name: z.string().min(1).max(120), description: SafeText, regulatory_tags: z.array(z.string().regex(/^[A-Z0-9_]{2,40}$/)).max(10) });
export const PrincipalCategory = PrincipalCategoryCreate.extend({ id: Id, active: z.boolean(), recorded_at: Time });
export const DataCategoryCreate = z.strictObject({
  name: z.string().min(1).max(120), description: SafeText,
  legacy_code: z.enum(['CONTACT_DETAILS', 'IDENTIFIERS', 'MARKETING_PREFERENCES', 'ORDER_RECORDS', 'SUPPORT_NOTES']).nullable(),
});
export const DataCategory = DataCategoryCreate.extend({ id: Id, active: z.boolean(), recorded_at: Time });

export const SubjectReferenceInput = z.strictObject({
  system_id: Id, target_reference: TargetReference,
  /** A source identifier such as an e-mail address. Used only to derive a keyed digest; never stored. */
  source_key: z.string().min(1).max(320).nullable(),
});
export const SubjectCreate = z.strictObject({ principal_id: Id.nullable(), references: z.array(SubjectReferenceInput).max(20) });
export const RelationshipStatus = z.enum(['ACTIVE', 'ENDED', 'UNKNOWN']);
export const RelationshipCreate = z.strictObject({
  subject_id: Id, category_id: Id, effective_from: Time.nullable(), effective_to: Time.nullable(), status: RelationshipStatus,
  source_system_id: Id.nullable(), source_reference: SafeText.nullable(), evidence_state: KnowledgeState, evidence_reference: SafeText.nullable(),
}).superRefine((r, c) => {
  if (r.status === 'ACTIVE' && r.effective_to !== null) c.addIssue({ code: 'custom', message: 'An active relationship has no end' });
  if (r.evidence_state === 'EVIDENCE_AVAILABLE' && r.evidence_reference === null) c.addIssue({ code: 'custom', message: 'Available evidence is referenced' });
});
export type RelationshipCreateValue = z.infer<typeof RelationshipCreate>;
export const RelationshipEnd = z.strictObject({ effective_to: Time.nullable(), evidence_reference: SafeText.nullable(), reason: z.string().min(10).max(500) });
export const Relationship = z.strictObject({
  id: Id, subject_id: Id, category_id: Id, category_name: SafeText, effective_from: Time.nullable(), effective_to: Time.nullable(), status: RelationshipStatus,
  source_system_id: Id.nullable(), source_reference: SafeText.nullable(), evidence_state: KnowledgeState, evidence_reference: SafeText.nullable(),
  provenance: z.record(z.string(), z.unknown()), recorded_at: Time,
});
export const Subject = z.strictObject({
  id: Id, principal_id: Id.nullable(), status: z.enum(['ACTIVE', 'INACTIVE', 'MERGED']), merged_into: Id.nullable(),
  references: z.array(z.strictObject({ system_id: Id, target_reference: TargetReference, has_source_key: z.boolean() })).max(20),
  relationships: z.array(Relationship).max(50), provenance: z.record(z.string(), z.unknown()), recorded_at: Time,
});
export const SubjectSummary = z.strictObject({ id: Id, principal_id: Id.nullable(), status: z.enum(['ACTIVE', 'INACTIVE', 'MERGED']), relationship_count: z.number().int().min(0), recorded_at: Time });
export const SubjectReferenceAdd = SubjectReferenceInput;
export const SubjectMerge = z.strictObject({ into_subject_id: Id, basis: z.string().min(10).max(500) });
export const SubjectUnmerge = z.strictObject({ reason: z.string().min(10).max(500) });
export const SubjectQuery = z.strictObject({ category_id: Id.optional(), system_id: Id.optional(), target_reference: TargetReference.optional(), principal_id: Id.optional() });
/** Everything processed under each of one person's relationship contexts, kept apart. */
export const SubjectProcessing = z.strictObject({
  subject_id: Id, as_of: Time,
  contexts: z.array(z.strictObject({
    relationship_id: Id, category_id: Id, category_name: SafeText, status: RelationshipStatus,
    activities: z.array(z.strictObject({ activity_id: Id, name: SafeText, purpose_version_id: Id, condition_code: z.string().nullable(), condition_unresolved: z.boolean(), system_ids: z.array(Id).max(50) })).max(50),
    consent: z.array(z.strictObject({ record_id: Id, activity_id: Id, status: z.string().max(20) })).max(50),
    active_hold_ids: z.array(Id).max(50),
  })).max(20),
});

export const RepresentativeKind = z.enum(['GUARDIAN', 'NOMINEE', 'AUTHORISED_REPRESENTATIVE']);
export const RepresentativeCreate = z.strictObject({
  subject_id: Id, kind: RepresentativeKind, representative_reference: Reference, authority_evidence_reference: Reference,
  mandate_id: Id.nullable(), effective_from: Time, effective_to: Time.nullable(), restrictions: z.array(SafeText).max(10),
});
export const RepresentativeVerify = z.strictObject({ verification: z.enum(['VERIFIED', 'REJECTED']), evidence_reference: Reference });
export const NominationActivate = z.strictObject({ basis: z.enum(['DEATH', 'INCAPACITY']), evidence_reference: Reference });
export const Representative = z.strictObject({
  id: Id, subject_id: Id, kind: RepresentativeKind, representative_reference: SafeText, authority_evidence_reference: SafeText,
  mandate_id: Id.nullable(), effective_from: Time, effective_to: Time.nullable(), verification: z.enum(['UNVERIFIED', 'VERIFIED', 'REJECTED']),
  verified_at: Time.nullable(), verified_by: Id.nullable(), restrictions: z.array(SafeText).max(10),
  activated_at: Time.nullable(), activation_basis: z.enum(['DEATH', 'INCAPACITY']).nullable(), recorded_at: Time, recorded_by: Id,
});
export const ChildStatus = z.enum(['UNKNOWN', 'CHILD', 'NOT_CHILD', 'PERSON_WITH_DISABILITY_WITH_GUARDIAN']);
export const ChildStatusRecord = z.strictObject({
  subject_id: Id, child_status: ChildStatus, basis: SafeText, evidence_reference: SafeText.nullable(), guardian_id: Id.nullable(),
  verifiable_consent: z.enum(['NOT_REQUIRED_RECORDED', 'NOT_ESTABLISHED', 'ESTABLISHED', 'UNKNOWN']), verifiable_consent_evidence_reference: SafeText.nullable(),
});
export const ChildStatusView = ChildStatusRecord.extend({ id: Id, recorded_at: Time, recorded_by: Id,
  /** Restrictions the active package attaches to this status. Empty when unknown: nothing is inferred. */
  active_restrictions: z.array(z.strictObject({ requirement_id: z.string().max(80), statement: z.string().max(2000), legal_status: z.enum(['APPLICABLE', 'NOT_YET_IN_FORCE']) })).max(20) });

export const RegistryPurposeCreate = z.strictObject({
  name: z.string().min(1).max(120), owner_reference: SafeText, description: z.string().min(10).max(2000),
  effective_from: Time, change_reason: SafeText, evidence_reference: SafeText.nullable(), v1_purpose_id: Id.nullable(),
});
export const RegistryPurposeRevise = z.strictObject({ description: z.string().min(10).max(2000), status: z.enum(['ACTIVE', 'RETIRED']), effective_from: Time, change_reason: z.string().min(10).max(500), evidence_reference: SafeText.nullable() });
export const RegistryPurposeVersion = z.strictObject({
  id: Id, version: z.number().int().positive(), description: z.string().max(2000), status: z.enum(['ACTIVE', 'RETIRED']),
  effective_from: Time, effective_to: Time.nullable(), change_reason: SafeText, evidence_reference: SafeText.nullable(), v1_purpose_id: Id.nullable(), recorded_at: Time, recorded_by: Id,
});
export const PurposeImpact = z.strictObject({
  activity_ids: z.array(Id).max(100), notice_version_ids: z.array(Id).max(100), retention_rule_ids: z.array(Id).max(100),
  consent_record_count: z.number().int().min(0), open_run_ids: z.array(Id).max(100),
});
export const RegistryPurpose = z.strictObject({ id: Id, name: SafeText, owner_reference: SafeText, versions: z.array(RegistryPurposeVersion).max(100), impact: PurposeImpact.nullable() });
export type RegistryPurposeValue = z.infer<typeof RegistryPurpose>;

export const ConditionCreate = z.strictObject({
  code: z.string().regex(/^[A-Z0-9_]{2,40}$/), label: SafeText, effective_from: Time,
  justification_reference: SafeText.nullable(), evidence_requirements: SafeText,
  /** Required for code UNRESOLVED: why the basis is not yet established. */
  unresolved_reason: SafeText.nullable(),
});
export const Condition = z.strictObject({
  id: Id, code: z.string().max(40), label: SafeText, requirement_ids: z.array(z.string().max(80)).max(6), package_row_id: Id.nullable(),
  effective_from: Time, effective_to: Time.nullable(), unresolved: z.boolean(), unresolved_reason: SafeText.nullable(),
  evidence_requirements: SafeText, justification_reference: SafeText.nullable(), recorded_at: Time,
});

export const SafeguardKind = z.enum(['ACCESS_CONTROL', 'ENCRYPTION', 'OBFUSCATION_MASKING', 'TOKENISATION', 'LOGGING_MONITORING', 'BACKUP_AVAILABILITY', 'PROCESSOR_SAFEGUARD', 'ORGANISATIONAL_MEASURE']);
export const SafeguardCreate = z.strictObject({
  kind: SafeguardKind, description: SafeText, control_reference: SafeText.nullable(),
  evidence_state: z.enum(['EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION']), evidence_reference: SafeText.nullable(),
}).superRefine((s, c) => { if ((s.evidence_state === 'EVIDENCE_AVAILABLE') !== (s.evidence_reference !== null)) c.addIssue({ code: 'custom', message: 'Only available evidence carries a reference, and it always does' }); });
export const Safeguard = z.strictObject({ id: Id, kind: SafeguardKind, description: SafeText, control_reference: SafeText.nullable(), evidence_state: z.enum(['EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION']), evidence_reference: SafeText.nullable(), recorded_at: Time });

export const ActivityLinkKind = z.enum(['PRINCIPAL_CATEGORY', 'DATA_CATEGORY', 'SYSTEM', 'PROCESSOR_ENGAGEMENT', 'CHANNEL', 'RETENTION_RULE', 'SAFEGUARD']);
export const ActivityCreate = z.strictObject({
  name: z.string().min(1).max(120), description: SafeText, owner_reference: SafeText,
  processes_child_data: z.enum(['UNKNOWN', 'YES', 'NO']), graph_activity_id: Id.nullable(),
  purpose_version_id: Id, condition_id: Id.nullable(), notice_version_ids: z.array(Id).max(20), requirement_ids: z.array(z.string().max(80)).max(30),
  effective_from: Time, change_reason: SafeText,
});
export const ActivityRevise = z.strictObject({
  purpose_version_id: Id, condition_id: Id.nullable(), notice_version_ids: z.array(Id).max(20), requirement_ids: z.array(z.string().max(80)).max(30),
  evidence_state: KnowledgeState, effective_from: Time, change_reason: z.string().min(10).max(500),
});
export const ActivityLinkCreate = z.strictObject({ link_kind: ActivityLinkKind, target_id: Id.nullable(), channel: SafeText.nullable(), basis: SafeText, valid_from: Time })
  .superRefine((l, c) => { if ((l.link_kind === 'CHANNEL') !== (l.channel !== null) || (l.link_kind === 'CHANNEL') === (l.target_id !== null)) c.addIssue({ code: 'custom', message: 'A channel link names a channel; every other link names a target' }); });
export const LinkClose = z.strictObject({ valid_to: Time, reason: z.string().min(10).max(500) });
export const ActivityLink = z.strictObject({ id: Id, activity_id: Id, link_kind: ActivityLinkKind, target_id: Id.nullable(), channel: SafeText.nullable(), basis: SafeText, valid_from: Time, valid_to: Time.nullable() });
export const ActivityVersion = z.strictObject({
  id: Id, version: z.number().int().positive(), purpose_version_id: Id, condition_id: Id.nullable(), notice_version_ids: z.array(Id).max(20),
  requirement_ids: z.array(z.string().max(80)).max(30), evidence_state: KnowledgeState, effective_from: Time, effective_to: Time.nullable(),
  status: z.enum(['CURRENT', 'SUPERSEDED']), change_reason: SafeText, recorded_at: Time, recorded_by: Id,
});
export const Activity = z.strictObject({
  id: Id, name: SafeText, description: SafeText, owner_reference: SafeText, status: z.enum(['ACTIVE', 'RETIRED']),
  processes_child_data: z.enum(['UNKNOWN', 'YES', 'NO']), graph_activity_id: Id.nullable(),
  versions: z.array(ActivityVersion).max(100), links: z.array(ActivityLink).max(200),
  /** Missing parts of the registry entry, stated factually. Never a score. */
  gaps: z.array(z.enum(['CONDITION_UNRESOLVED', 'NO_CONDITION', 'NO_NOTICE_FOR_CONSENT', 'NO_RETENTION_RULE', 'NO_SYSTEM', 'NO_PRINCIPAL_CATEGORY', 'NO_DATA_CATEGORY', 'CHILD_DATA_UNKNOWN', 'UNBOUND_SYSTEM'])).max(10),
  recorded_at: Time,
});
export const ActivityQuery = z.strictObject({ system_id: Id.optional(), data_category_id: Id.optional(), as_of: Time.optional() });

export const NoticeChannels = z.strictObject({
  withdrawal: z.string().min(10).max(500), rights: z.string().min(10).max(500),
  grievance: z.string().min(10).max(500), board_complaint: z.string().min(10).max(500),
});
export const RegistryNoticeCreate = z.strictObject({ name: z.string().min(1).max(120), audience_category_ids: z.array(Id).min(1).max(20) });
export const RegistryNoticeVersionCreate = z.strictObject({
  locale: Locale, title: z.string().min(1).max(120), content: LongText,
  purpose_version_ids: z.array(Id).min(1).max(20), data_category_ids: z.array(Id).min(1).max(40),
  channels: NoticeChannels, template_reference: SafeText.nullable(), v1_notice_version_id: Id.nullable(),
  /** The version of another locale of this notice that this one translates; null or absent for an original. */
  translates_version_id: Id.nullable().optional(),
});
/** Publishing a version whose purposes or data categories differ from other current locales needs this set to true. */
export const NoticePublish = z.strictObject({ effective_from: Time, acknowledge_locale_drift: z.boolean().optional() });
export const RegistryNoticeVersion = z.strictObject({
  id: Id, notice_id: Id, version: z.number().int().positive(), locale: Locale, title: SafeText, content: LongText, content_digest: Digest,
  purpose_version_ids: z.array(Id).max(20), data_category_ids: z.array(Id).max(40), channels: NoticeChannels,
  template_reference: SafeText.nullable(), v1_notice_version_id: Id.nullable(), translates_version_id: Id.nullable(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SUPERSEDED']), effective_from: Time.nullable(), effective_to: Time.nullable(),
  published_at: Time.nullable(), superseded_by: Id.nullable(), recorded_at: Time,
});
export type RegistryNoticeVersionValue = z.infer<typeof RegistryNoticeVersion>;
export const RegistryNotice = z.strictObject({ id: Id, name: SafeText, audience_category_ids: z.array(Id).max(20), versions: z.array(RegistryNoticeVersion).max(100) });
/** Eighth Schedule language drift: each current locale of a notice against the most recently published one. */
export const NoticeLocaleState = z.enum(['REFERENCE', 'IN_STEP', 'SCOPE_MISMATCH', 'BEHIND_ITS_SOURCE', 'MAY_BE_BEHIND']);
export const NoticeLocaleDrift = z.strictObject({ locale: Locale, version_id: Id, version: z.number().int().positive(), published_at: Time, effective_from: Time,
  translates_version_id: Id.nullable(), state: NoticeLocaleState, missing_purpose_version_ids: z.array(Id).max(20), extra_purpose_version_ids: z.array(Id).max(20),
  missing_data_category_ids: z.array(Id).max(40), extra_data_category_ids: z.array(Id).max(40), detail: SafeText });
export const NoticeDrift = z.strictObject({ notice_id: Id, name: SafeText, reference_locale: Locale.nullable(), locales: z.array(NoticeLocaleDrift).max(23), out_of_step: z.number().int().min(0),
  languages_without_notice: z.array(Locale).max(23) });
export const NoticeDriftReport = z.strictObject({ notices: z.array(NoticeDrift).max(200), notices_out_of_step: z.number().int().min(0), limits: z.array(SafeText).max(5) });
export const NoticeAtQuery = z.strictObject({ as_of: Time, locale: Locale });
export const NoticeAt = z.strictObject({ notice_id: Id, as_of: Time, locale: Locale, version: RegistryNoticeVersion.nullable(), reason: SafeText });
export const NoticeDeliveryRecord = z.strictObject({
  notice_version_id: Id, subject_id: Id.nullable(), relationship_id: Id.nullable(), population_reference: SafeText.nullable(),
  channel: z.string().min(2).max(60), presented_at: Time, source_system_id: Id.nullable(), source_reference: Reference,
  evidence_reference: SafeText.nullable(), result: z.enum(['PRESENTED', 'DELIVERED', 'FAILED', 'UNKNOWN']),
}).superRefine((d, c) => { if ((d.subject_id === null) === (d.population_reference === null)) c.addIssue({ code: 'custom', message: 'Delivery evidence is about one subject or one named population' }); });
export const NoticeDelivery = z.strictObject({
  id: Id, notice_version_id: Id, subject_id: Id.nullable(), relationship_id: Id.nullable(), population_reference: SafeText.nullable(),
  channel: SafeText, presented_at: Time, source_system_id: Id.nullable(), source_reference: SafeText, evidence_reference: SafeText.nullable(),
  result: z.enum(['PRESENTED', 'DELIVERED', 'FAILED', 'UNKNOWN']), provenance: z.record(z.string(), z.unknown()), recorded_at: Time,
});

export const ConsentStatus = z.enum(['UNKNOWN', 'REQUESTED', 'PRESENTED', 'GRANTED', 'DECLINED', 'WITHDRAWN', 'EXPIRED']);
export const ConsentEventKind = z.enum(['REQUESTED', 'PRESENTED', 'GRANTED', 'DECLINED', 'MODIFIED', 'WITHDRAWN', 'EXPIRED']);
export const ConsentRecordCreate = z.strictObject({
  subject_id: Id, relationship_id: Id.nullable(), activity_id: Id, channel: z.string().min(2).max(60),
  expiry_policy: SafeText.nullable(), v1_principal_id: Id.nullable(), v1_purpose_id: Id.nullable(),
});
export const ConsentEventRecord = z.strictObject({
  event: ConsentEventKind, occurred_at: Time.nullable(),
  evidence_state: z.enum(['EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION']), evidence_reference: SafeText.nullable(),
  notice_version_id: Id.nullable(),
}).superRefine((e, c) => {
  if ((e.evidence_state === 'EVIDENCE_AVAILABLE') !== (e.evidence_reference !== null)) c.addIssue({ code: 'custom', message: 'Only available evidence carries a reference, and it always does' });
  if (e.occurred_at === null && e.evidence_state !== 'EVIDENCE_MISSING') c.addIssue({ code: 'custom', message: 'An unknown time is recorded only as missing evidence' });
});
export const ConsentEvent = z.strictObject({
  id: Id, event: ConsentEventKind, occurred_at: Time.nullable(), recorded_at: Time, actor_id: Id, source: z.enum(['OPERATOR', 'IMPORT', 'V1_PORTAL', 'SOURCE_SYSTEM', 'CONSENT_MANAGER']),
  evidence_state: z.enum(['EVIDENCE_AVAILABLE', 'EVIDENCE_MISSING', 'NEEDS_VERIFICATION']), evidence_reference: SafeText.nullable(),
  notice_version_id: Id.nullable(), package_row_id: Id.nullable(), run_id: Id.nullable(), v1_event_id: Id.nullable(),
});
export const ConsentRecord = z.strictObject({
  id: Id, subject_id: Id, relationship_id: Id.nullable(), activity_id: Id, purpose_version_id: Id, current_status: ConsentStatus,
  notice_version_id: Id.nullable(), channel: SafeText, expiry_policy: SafeText.nullable(), v1_principal_id: Id.nullable(), v1_purpose_id: Id.nullable(),
  events: z.array(ConsentEvent).max(100), withdrawal_run_ids: z.array(Id).max(20), updated_at: Time,
  /** 0.47.0: the Consent Manager through which the consent was given, if any. */
  consent_manager: z.strictObject({ id: Id, name: SafeText, board_registration_number: SafeText, status: z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']), artefact_reference: SafeText }).nullable(),
});
/** Consent Managers, DPDP Act s.6(7)-(9) and rule 4 (0.47.0). */
export const ConsentManagerStatus = z.enum(['ACTIVE', 'SUSPENDED', 'CANCELLED']);
export const ConsentManagerCreate = z.strictObject({ name: z.string().min(2).max(200), board_registration_number: z.string().min(3).max(80), registered_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), evidence_reference: z.string().min(3).max(500) });
export const ConsentManagerStatusChange = z.strictObject({ status: z.enum(['SUSPENDED', 'CANCELLED']), reason: z.string().min(10).max(500) });
export const ConsentManager = z.strictObject({ id: Id, name: SafeText, board_registration_number: SafeText, registered_on: z.string(), status: ConsentManagerStatus, status_reason: SafeText.nullable(),
  evidence_reference: SafeText, linked_records: z.number().int().min(0), recorded_at: Time, status_changed_at: Time.nullable() });
export const ConsentManagerLink = z.strictObject({ consent_manager_id: Id, artefact_reference: z.string().min(3).max(200) });
export const ConsentManagerWithdrawal = z.strictObject({ consent_manager_id: Id, artefact_reference: z.string().min(3).max(200), occurred_at: Time, evidence_reference: z.string().min(3).max(500) });
export const ConsentSync = z.strictObject({ examined_records: z.number().int().min(0), mirrored_events: z.number().int().min(0), withdrawal_runs: z.array(Id).max(100) });

/**
 * Organisation website/app intake and the optional Privacy Centre (revision 1.7, contract 0.48.0).
 * Rule 14(1): the means of making a request are published on the organisation's own website or app. The organisation's
 * application sends consent changes and rights requests for its signed-in customers with a key created in the Workspace.
 */
export const IntakeRightType = z.enum(['ACCESS', 'CORRECTION', 'ERASURE', 'GRIEVANCE', 'NOMINATION']);
export const IntakeClientCreate = z.strictObject({ name: z.string().min(2).max(120), system_id: Id, authenticates_customers: z.boolean(), accepts_consent: z.boolean(), accepts_rights: z.boolean() })
  .refine(v => v.accepts_consent || v.accepts_rights, { message: 'A key accepts consent changes, rights requests or both', path: ['accepts_rights'] });
export const IntakeClient = z.strictObject({ id: Id, name: SafeText, system_id: Id, system_name: SafeText, authenticates_customers: z.boolean(), accepts_consent: z.boolean(), accepts_rights: z.boolean(),
  created_at: Time, revoked_at: Time.nullable(), revocation_reason: SafeText.nullable(), last_used_at: Time.nullable(), submissions: z.number().int().min(0) });
/** Returned once, when the key is created. Only its SHA-256 digest is kept; a lost key is revoked and replaced. */
export const IntakeClientCreated = z.strictObject({ client: IntakeClient, key: z.string().regex(/^[a-f0-9]{64}$/), shown_once: z.literal(true) });
export const IntakeClientRevoke = z.strictObject({ reason: z.string().min(10).max(500) });
export const IntakeSubmissionStatus = z.enum(['RECEIVED', 'APPLIED', 'NEEDS_STAFF', 'HANDLED']);
export const IntakeSubmission = z.strictObject({ id: Id, client_id: Id, client_name: SafeText, kind: z.enum(['CONSENT', 'RIGHTS']), customer_reference: TargetReference,
  summary: SafeText, status: IntakeSubmissionStatus, outcome_reason: SafeText.nullable(), consent_record_id: Id.nullable(), rights_request_id: Id.nullable(),
  received_at: Time, processed_at: Time.nullable(), handled_note: SafeText.nullable(), handled_at: Time.nullable() });
export const IntakeSubmissionQuery = z.strictObject({ status: IntakeSubmissionStatus.optional() });
export const IntakeSubmissionHandle = z.strictObject({ note: z.string().min(10).max(500) });
export const PrivacyCentreSetting = z.strictObject({ enabled: z.boolean(), reason: SafeText.nullable(), changed_at: Time.nullable(), changed_by: Id.nullable(),
  /** Customer accounts that exist for this organisation; with the Privacy Centre off none of them can sign in. */
  customer_accounts: z.number().int().min(0) });
export const PrivacyCentreChange = z.strictObject({ enabled: z.boolean(), reason: z.string().min(10).max(500) });
/** Sent by the organisation's application server. The customer is identified by their identifier in that application. */
export const IntakeConsentSubmit = z.strictObject({ customer_reference: TargetReference, activity_id: Id, decision: z.enum(['GRANTED', 'WITHDRAWN']), occurred_at: Time,
  notice_version_id: Id.nullable(), evidence_reference: z.string().min(3).max(500) });
export const IntakeRightsSubmit = z.strictObject({ customer_reference: TargetReference, right_type: IntakeRightType, description: z.string().min(10).max(2000),
  display_name: z.string().min(1).max(100), email: z.email().max(254) });
export const IntakeReceipt = z.strictObject({ submission_id: Id, kind: z.enum(['CONSENT', 'RIGHTS']), status: IntakeSubmissionStatus, received_at: Time, processed_at: Time.nullable(),
  outcome_reason: SafeText.nullable(), consent: z.strictObject({ record_id: Id, current_status: SafeText }).nullable(), rights_request: z.strictObject({ id: Id, state: SafeText }).nullable(),
  /** A receipt records that ORVIA received the submission. It is not proof that anything downstream has changed. */
  receipt_is_not_completion: z.literal(true) });

/**
 * EX07 backup-copy obligations (contract 0.50.0; master §§50, 52, 91). A backup treatment records, per system, the five facts the
 * master requires for backups that cannot be selectively edited. The erasure ledger records, for each verified erasure on such a
 * system, when that person's data will have aged out of its backups. That date is never proof of erasure.
 */
export const BackupTreatmentCreate = z.strictObject({ system_id: Id, technical_restriction: z.string().min(10).max(1000), isolation_controls: z.string().min(10).max(1000),
  retention_days: z.number().int().min(1).max(3650), restore_procedure_reference: z.string().min(3).max(500), legal_treatment: z.string().min(10).max(1000) });
export const BackupTreatment = z.strictObject({ id: Id, system_id: Id, system_name: SafeText, technical_restriction: LongText, isolation_controls: LongText, retention_days: z.number().int(),
  restore_procedure_reference: SafeText, legal_treatment: LongText, status: z.enum(['PROPOSED', 'CURRENT', 'SUPERSEDED']), recorded_by: Id, recorded_at: Time,
  approved_by: Id.nullable(), approved_at: Time.nullable(), superseded_at: Time.nullable() });
export const BackupCoverageSystem = z.strictObject({ system_id: Id, system_name: SafeText, treatment: z.enum(['NONE', 'PROPOSED', 'CURRENT']), verified_erasures: z.number().int().min(0),
  in_backups: z.number().int().min(0), reapply_required: z.number().int().min(0), earliest_clear_after: Time.nullable() });
export const BackupCoverage = z.strictObject({ systems: z.array(BackupCoverageSystem).max(500),
  /** Systems with verified erasures and no current backup treatment: their backup handling is unknown and stays visibly unverified. */
  unknown_backup_handling: z.number().int().min(0), a_backup_expiry_date_is_not_proof_of_erasure: z.literal(true) });
export const SystemRestoreRecord = z.strictObject({ system_id: Id, backup_taken_at: Time, restored_at: Time, evidence_reference: z.string().min(3).max(500) });
/**
 * 0.55.0 (migration 0090): `ledger_coverage` is INCOMPLETE when the backup was taken before erasures the ledger has already
 * purged; the restore then cannot name everyone it brought back, and `marked_for_reerasure` is not the whole answer until a
 * person records how the restored data was reviewed by hand (`coverage_review`).
 */
export const SystemRestore = z.strictObject({ id: Id, system_id: Id, backup_taken_at: Time, restored_at: Time, evidence_reference: SafeText, recorded_at: Time, marked_for_reerasure: z.number().int().min(0),
  ledger_coverage: z.enum(['COMPLETE', 'INCOMPLETE']), ledger_purged_through: Time.nullable(),
  coverage_review: z.strictObject({ evidence_reference: SafeText, reviewed_at: Time }).nullable() });
export const SystemRestoreQuery = z.strictObject({ coverage: z.enum(['COMPLETE', 'INCOMPLETE']).optional(), unreviewed: z.enum(['true']).optional() });
export const RestoreCoverageReview = z.strictObject({ evidence_reference: z.string().min(3).max(500) });
export const ErasureLedgerState = z.enum(['IN_BACKUPS', 'BACKUPS_AGED_OUT', 'REAPPLY_REQUIRED', 'REAPPLIED']);
export const ErasureLedgerEntry = z.strictObject({ id: Id, subject_id: Id, system_id: Id, erased_at: Time, backups_clear_after: Time, state: ErasureLedgerState,
  restore_id: Id.nullable(), reapplied_at: Time.nullable(), reapplied_evidence: SafeText.nullable() });
export const ErasureLedgerQuery = z.strictObject({ system_id: Id.optional(), state: ErasureLedgerState.optional() });
export const ReerasureConfirm = z.strictObject({ evidence_reference: z.string().min(3).max(500) });

export const EngagementLinkInput = z.strictObject({ link_kind: z.enum(['DATA_CATEGORY', 'PRINCIPAL_CATEGORY', 'SYSTEM']), target_id: Id });
export const EngagementCreate = z.strictObject({
  processor_id: Id, service_description: SafeText, subprocessor_of: Id.nullable(), effective_from: Time,
  contract_evidence_reference: SafeText.nullable(), safeguard_evidence_reference: SafeText.nullable(), links: z.array(EngagementLinkInput).max(50),
});
export const EngagementTerminate = z.strictObject({ terminated_at: Time, reason: z.string().min(10).max(500), disposition_required: z.boolean() });
export const Engagement = z.strictObject({
  id: Id, processor_id: Id, service_description: SafeText, subprocessor_of: Id.nullable(), effective_from: Time, effective_to: Time.nullable(),
  status: z.enum(['ACTIVE', 'TERMINATED']), contract_evidence_reference: SafeText.nullable(), safeguard_evidence_reference: SafeText.nullable(),
  disposition_state: z.enum(['NOT_APPLICABLE', 'PENDING', 'PROCESSOR_CONFIRMED', 'VERIFIED', 'UNKNOWN']),
  terminated_at: Time.nullable(), termination_reason: SafeText.nullable(),
  links: z.array(EngagementLinkInput.extend({ valid_from: Time, valid_to: Time.nullable() })).max(50),
  activity_ids: z.array(Id).max(100), disposition_run_id: Id.nullable(), recorded_at: Time,
});
/** A processor's confirmation is what it says; only independent evidence makes it verified. */
export const EngagementDisposition = z.strictObject({ outcome: z.enum(['PROCESSOR_CONFIRMED', 'VERIFIED']), evidence_reference: Reference, verification_method: z.enum(['PROCESSOR_STATEMENT', 'INDEPENDENT_AUDIT_EVIDENCE']) })
  .superRefine((d, c) => { if ((d.outcome === 'VERIFIED') !== (d.verification_method === 'INDEPENDENT_AUDIT_EVIDENCE')) c.addIssue({ code: 'custom', message: 'Only independent audit evidence verifies a disposition; a processor statement is a confirmation' }); });
export const EngagementQuery = z.strictObject({ activity_id: Id.optional(), as_of: Time.optional() });
export const SharingLinkCreate = z.strictObject({
  activity_id: Id, data_category_id: Id, principal_category_id: Id.nullable(), engagement_id: Id.nullable(), recipient_reference: SafeText.nullable(),
  purpose_version_id: Id, system_id: Id.nullable(), valid_from: Time, evidence_reference: SafeText.nullable(),
}).superRefine((s, c) => { if ((s.engagement_id === null) === (s.recipient_reference === null)) c.addIssue({ code: 'custom', message: 'A share names exactly one recipient: an engagement or a recorded recipient' }); });
export const SharingLink = z.strictObject({
  id: Id, activity_id: Id, data_category_id: Id, principal_category_id: Id.nullable(), engagement_id: Id.nullable(), recipient_reference: SafeText.nullable(),
  purpose_version_id: Id, system_id: Id.nullable(), valid_from: Time, valid_to: Time.nullable(), evidence_reference: SafeText.nullable(),
});
export const SharingQuery = z.strictObject({ activity_id: Id.optional(), subject_id: Id.optional() });

export const RetentionTriggerKind = z.enum(['RELATIONSHIP_ENDED', 'CONSENT_WITHDRAWN', 'PURPOSE_RETIRED']);
export const RetentionRuleCreate = z.strictObject({
  name: z.string().min(1).max(120), activity_id: Id.nullable(), principal_category_id: Id, data_category_id: Id.nullable(), system_id: Id.nullable(),
  trigger: RetentionTriggerKind, duration_days: z.number().int().min(0).max(36500).nullable(),
  duration_source: z.enum(['CUSTOMER_CONFIGURATION', 'REGULATORY_REQUIREMENT', 'EXTERNAL_LAW_REFERENCE']).nullable(),
  source_reference: SafeText.nullable(), requirement_id: z.string().max(80).nullable(),
  approval_required: z.boolean(), erasure_action: z.enum(['ERASE', 'ANONYMISE', 'SUPPRESS']), effective_from: Time,
}).superRefine((r, c) => {
  if ((r.duration_days === null) !== (r.duration_source === null)) c.addIssue({ code: 'custom', message: 'A duration always names where it came from' });
  if (r.duration_days !== null && r.source_reference === null) c.addIssue({ code: 'custom', message: 'A duration always cites its source' });
  if (r.duration_source === 'REGULATORY_REQUIREMENT' && r.requirement_id === null) c.addIssue({ code: 'custom', message: 'A regulatory duration cites the requirement' });
});
export const RetentionRuleRevise = z.strictObject({
  duration_days: z.number().int().min(0).max(36500).nullable(), duration_source: z.enum(['CUSTOMER_CONFIGURATION', 'REGULATORY_REQUIREMENT', 'EXTERNAL_LAW_REFERENCE']).nullable(),
  source_reference: SafeText.nullable(), requirement_id: z.string().max(80).nullable(), approval_required: z.boolean(),
  erasure_action: z.enum(['ERASE', 'ANONYMISE', 'SUPPRESS']), effective_from: Time, reason: z.string().min(10).max(500),
});
export const RetentionRule = z.strictObject({
  id: Id, rule_key: Id, version: z.number().int().positive(), name: SafeText, activity_id: Id.nullable(), principal_category_id: Id,
  data_category_id: Id.nullable(), system_id: Id.nullable(), trigger: RetentionTriggerKind, duration_days: z.number().int().nullable(),
  duration_source: z.enum(['CUSTOMER_CONFIGURATION', 'REGULATORY_REQUIREMENT', 'EXTERNAL_LAW_REFERENCE']).nullable(), source_reference: SafeText.nullable(),
  requirement_id: z.string().max(80).nullable(), approval_required: z.boolean(), erasure_action: z.enum(['ERASE', 'ANONYMISE', 'SUPPRESS']),
  effective_from: Time, effective_to: Time.nullable(), status: z.enum(['ACTIVE', 'RETIRED']),
  /** A rule without a sourced duration never makes anything eligible. */
  resolved: z.boolean(), recorded_at: Time,
});
export const RetentionHoldType = z.enum(['OFFICIAL_EXEMPTION', 'OTHER_LAW_RETENTION', 'OPERATIONAL_HOLD']);
export const RetentionHoldCreate = z.strictObject({
  hold_type: RetentionHoldType, authority_reference: Reference, reason: z.string().min(10).max(500),
  subject_id: Id.nullable(), activity_id: Id.nullable(), system_id: Id.nullable(), data_category_id: Id.nullable(),
  starts_at: Time, ends_at: Time.nullable(), review_at: Time, owner_reference: SafeText, evidence_reference: SafeText.nullable(), requirement_id: z.string().max(80).nullable(),
}).superRefine((h, c) => {
  if ([h.subject_id, h.activity_id, h.system_id, h.data_category_id].every(v => v === null)) c.addIssue({ code: 'custom', message: 'A hold names what it covers; there is no hold-everything' });
  if (h.hold_type === 'OFFICIAL_EXEMPTION' && h.requirement_id === null) c.addIssue({ code: 'custom', message: 'An official exemption cites the requirement it rests on' });
});
export const RetentionHoldRelease = z.strictObject({ reason: z.string().min(10).max(500) });
export const RetentionHold = z.strictObject({
  id: Id, hold_type: RetentionHoldType, authority_reference: SafeText, reason: SafeText, subject_id: Id.nullable(), activity_id: Id.nullable(),
  system_id: Id.nullable(), data_category_id: Id.nullable(), starts_at: Time, ends_at: Time.nullable(), review_at: Time, owner_reference: SafeText,
  evidence_reference: SafeText.nullable(), requirement_id: z.string().max(80).nullable(), state: z.enum(['ACTIVE', 'RELEASED']),
  released_at: Time.nullable(), release_reason: SafeText.nullable(), review_overdue: z.boolean(), recorded_at: Time,
});
export const RetentionHoldQuery = z.strictObject({ subject_id: Id.optional(), active: z.enum(['true', 'false']).optional() });

/** Rule 8(2): the 48-hour intimation before Third Schedule erasure, recorded by staff with its evidence (0.47.0). */
export const ErasureChannel = z.enum(['USER_ACCOUNT', 'EMAIL', 'SMS', 'POSTAL', 'OTHER']);
export const ErasureIntimationRecord = z.strictObject({ subject_id: Id, rule_id: Id, intimated_at: Time, channel: ErasureChannel, evidence_reference: z.string().min(3).max(500) });
export const ErasureReEngagement = z.strictObject({ re_engaged_at: Time, basis: z.enum(['LOGGED_IN', 'INITIATED_CONTACT', 'EXERCISED_RIGHTS']) });
export const ErasureIntimation = z.strictObject({
  id: Id, subject_id: Id, rule_id: Id, erasure_due_at: Time, intimated_at: Time, channel: ErasureChannel, evidence_reference: SafeText,
  /** The earliest time erasure may run: the due time, or 48 hours after a late intimation. */
  erasable_from: Time, re_engaged_at: Time.nullable(), re_engagement_basis: z.enum(['LOGGED_IN', 'INITIATED_CONTACT', 'EXERCISED_RIGHTS']).nullable(), recorded_at: Time,
});
export const ErasureIntimationDue = z.strictObject({
  subject_id: Id, rule_id: Id, rule_name: SafeText, erasure_due_at: Time, intimate_by: Time, overdue: z.boolean(), intimation_id: Id.nullable(), intimated_at: Time.nullable(),
});
export const ErasureIntimationQuery = z.strictObject({ subject_id: Id.optional() });

/** integrations/CONNECTORS_EXECUTION_AND_VERIFICATION.md s9: a machine-readable, factual declaration. */
export const ConnectorCapabilities = z.strictObject({
  adapter_kind: z.enum(['TEST_ADAPTER', 'MANUAL']),
  discover_metadata: z.boolean(), read_reference: z.boolean(), correct: z.boolean(), erase: z.boolean(), anonymise: z.boolean(),
  suppress: z.boolean(), retrieve_evidence: z.boolean(), verify: z.boolean(), bulk: z.boolean(), idempotency: z.boolean(),
  rate_limit: SafeText, consistency: z.enum(['IMMEDIATE', 'EVENTUAL', 'NOT_DECLARED']), irreversible_actions: z.array(z.enum(['ERASE', 'ANONYMISE'])).max(2),
  verification_method: z.enum(['INDEPENDENT_READ_BACK', 'NONE_AVAILABLE']),
  limitation: SafeText,
});
export const ConnectorBindingCreate = z.strictObject({
  system_id: Id, adapter: z.enum(['SYNTHETIC_RECORDS_TEST_ADAPTER', 'MANUAL_ONLY']),
  system_of_record_for: z.array(Id).max(40), holds_data_categories: z.array(Id).max(40),
});
export const ConnectorBinding = z.strictObject({
  id: Id, system_id: Id, adapter: z.enum(['SYNTHETIC_RECORDS_TEST_ADAPTER', 'MANUAL_ONLY']), capabilities: ConnectorCapabilities, capability_version: z.string().max(20),
  system_of_record_for: z.array(Id).max(40), holds_data_categories: z.array(Id).max(40), valid_from: Time, valid_to: Time.nullable(),
});

export const registrySchemas = {
  OrganisationProfileSet, OrganisationProfile, OrganisationProfileView, SdfObligation, SdfObligationComplete,
  PrincipalCategoryCreate, PrincipalCategory, DataCategoryCreate, DataCategory,
  SubjectCreate, SubjectReferenceAdd, Subject, SubjectSummary, SubjectMerge, SubjectUnmerge, SubjectQuery, SubjectProcessing,
  RelationshipCreate, RelationshipEnd, Relationship,
  RepresentativeCreate, RepresentativeVerify, NominationActivate, Representative, ChildStatusRecord, ChildStatusView,
  RegistryPurposeCreate, RegistryPurposeRevise, RegistryPurpose, ConditionCreate, Condition, SafeguardCreate, Safeguard,
  ActivityCreate, ActivityRevise, ActivityLinkCreate, LinkClose, ActivityLink, Activity, ActivityQuery,
  RegistryNoticeCreate, RegistryNoticeVersionCreate, NoticePublish, RegistryNoticeVersion, RegistryNotice, NoticeLocaleDrift, NoticeDrift, NoticeDriftReport, NoticeAtQuery, NoticeAt, NoticeDeliveryRecord, NoticeDelivery,
  ConsentRecordCreate, ConsentEventRecord, ConsentRecord, ConsentSync,
  EngagementCreate, EngagementTerminate, EngagementDisposition, Engagement, EngagementQuery, SharingLinkCreate, SharingLink, SharingQuery,
  RetentionRuleCreate, RetentionRuleRevise, RetentionRule, RetentionHoldCreate, RetentionHoldRelease, RetentionHold, RetentionHoldQuery,
  ConnectorBindingCreate, ConnectorBinding,
  PrincipalCategoryList: page(PrincipalCategory), DataCategoryList: page(DataCategory), SubjectList: page(SubjectSummary),
  RepresentativeList: page(Representative), RegistryPurposeList: page(RegistryPurpose), ConditionList: page(Condition), SafeguardList: page(Safeguard),
  ActivityList: page(Activity), RegistryNoticeList: page(RegistryNotice), NoticeDeliveryList: page(NoticeDelivery), ConsentRecordList: page(ConsentRecord),
  EngagementList: page(Engagement), SharingLinkList: page(SharingLink), RetentionRuleList: page(RetentionRule), RetentionHoldList: page(RetentionHold), ErasureIntimationList: page(ErasureIntimation), ErasureIntimationDueList: page(ErasureIntimationDue),
  ErasureIntimationRecord, ErasureReEngagement, ErasureIntimation, ErasureIntimationDue, ErasureIntimationQuery,
  ConsentManagerCreate, ConsentManagerStatusChange, ConsentManager, ConsentManagerLink, ConsentManagerWithdrawal, ConsentManagerList: page(ConsentManager),
  ConnectorBindingList: page(ConnectorBinding),
  IntakeClientCreate, IntakeClient, IntakeClientCreated, IntakeClientRevoke, IntakeSubmission, IntakeSubmissionQuery, IntakeSubmissionHandle, PrivacyCentreSetting, PrivacyCentreChange,
  IntakeConsentSubmit, IntakeRightsSubmit, IntakeReceipt, IntakeClientList: page(IntakeClient), IntakeSubmissionList: page(IntakeSubmission),
  BackupTreatmentCreate, BackupTreatment, BackupCoverage, SystemRestoreRecord, SystemRestore, SystemRestoreQuery, RestoreCoverageReview, ErasureLedgerEntry, ErasureLedgerQuery, ReerasureConfirm,
  BackupTreatmentList: page(BackupTreatment), ErasureLedgerList: page(ErasureLedgerEntry), SystemRestoreList: page(SystemRestore),
};
