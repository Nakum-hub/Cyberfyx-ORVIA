import { z } from 'zod';
import { RequirementId, ProvisionId, Severity, RequirementResult, PersonalDataFlag, EvidenceCategory, SamplePopulation } from './audit-primitives.ts';

/**
 * Canonical contract of the vendor area on the vendor's own VENDOR_SERVICE
 * installation (revision 1.5 addendum). Vendor-internal: it is never served by
 * a customer installation, where every /api/v1/vendor path is a 404.
 */
export const VENDOR_AUDIT_CONTRACT_VERSION = '0.3.0' as const;
const Id = z.uuid();
const Time = z.iso.datetime();
const Day = z.iso.date();
const Name = z.string().trim().min(1).max(100);
const Email = z.string().email().max(254);
const Password = z.string().min(16).max(128);
/** Installation kinds (revision 1.5 addendum) and the protected installation record written by the installer. */
export const InstallationKind = z.enum(['CUSTOMER_INSTALLATION', 'VENDOR_SERVICE']);
export type InstallationKind = z.infer<typeof InstallationKind>;
export const InstallationRecord = z.strictObject({ kind: InstallationKind, installation_id: Id, recorded_at: Time });
export const VendorRoleName = z.enum(['VENDOR_SUPER_ADMIN', 'VENDOR_ADMIN', 'LEAD_AUDITOR', 'AUDITOR', 'AUDIT_REVIEWER']);

export const VendorFirstRunState = z.strictObject({ state: z.enum(['OPEN', 'NO_CODE_ISSUED', 'LOCKED', 'EXPIRED', 'COMPLETED']) });
export const VendorFirstRunSetup = z.strictObject({ setup_code: z.string().min(8).max(40), owner: z.strictObject({ name: Name, email: Email, password: Password }), admin: z.strictObject({ name: Name, email: Email, password: Password }) });
export const VendorSession = z.strictObject({ actor_domain: z.enum(['VENDOR_STAFF', 'CLIENT_ACCOUNT']), actor_id: Id, role: z.union([VendorRoleName, z.literal('CLIENT_ACCOUNT')]),
  capabilities: z.array(z.string().max(60)).max(40), organisation_id: Id.nullable(), name: z.string().max(100), email: z.string().max(254), expires_at: Time });

export const VendorMember = z.strictObject({ user_id: Id, name: z.string().max(100), email: z.string().max(254), role: VendorRoleName, active: z.boolean(), deleted: z.boolean(), mfa_enrolled: z.boolean(), must_change_password: z.boolean(), created_at: Time });
export const VendorTeam = z.strictObject({ members: z.array(VendorMember).max(1000) });
export const VendorMemberCreate = z.strictObject({ name: Name, email: Email, role: z.enum(['VENDOR_ADMIN', 'LEAD_AUDITOR', 'AUDITOR', 'AUDIT_REVIEWER']) });
export const VendorMemberCreated = z.strictObject({ member: VendorMember, one_time_password: z.string().min(24).max(64) });
export const DeleteConfirm = z.strictObject({ confirmation: z.literal('DELETE') });

export const ContactDesignation = z.enum(['PRIMARY', 'BILLING', 'SECURITY', 'DPO', 'AUDIT_LIAISON']);
export const OrganisationCreate = z.strictObject({ name: z.string().trim().min(2).max(160), registered_address: z.string().trim().max(400).nullable() });
export const OrganisationContactCreate = z.strictObject({ name: Name, email: Email, designation: ContactDesignation });
export const ClientAccountCreate = z.strictObject({ name: Name, email: Email });
export const Organisation = z.strictObject({ id: Id, name: z.string(), registered_address: z.string().nullable(), licence_state: z.enum(['NONE', 'ACTIVE', 'EXPIRED', 'SUSPENDED']), created_at: Time,
  contacts: z.array(z.strictObject({ id: Id, name: z.string(), email: z.string(), designation: ContactDesignation })).max(50),
  accounts: z.array(z.strictObject({ user_id: Id, name: z.string(), email: z.string(), active: z.boolean(), mfa_enrolled: z.boolean(), created_at: Time })).max(50),
  licences: z.array(z.strictObject({ licence_id: Id, installation_id: Id, plan_option: z.string(), member_seats: z.number().int(), valid_from: Time, valid_to: Time, issued_at: Time })).max(200) });
export const OrganisationList = z.strictObject({ items: z.array(Organisation.omit({ contacts: true, accounts: true, licences: true })).max(1000) });
export const ClientAccountCreated = z.strictObject({ user_id: Id, one_time_password: z.string().min(24).max(64) });

export const LicenceIssueRequest = z.strictObject({ organisation_id: Id, installation_id: Id, option: z.string().min(1).max(40), entitlements: z.array(z.string().max(60)).max(40), environments: z.number().int().min(1).max(20), valid_from: Time, valid_to: Time });
export const LicenceIssued = z.strictObject({ licence: z.unknown(), plan: z.strictObject({ tier: z.string(), option: z.string(), member_seats: z.number().int() }) });

export const EngagementCreate = z.strictObject({ organisation_id: Id, reference: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,79}$/),
  scope_requirement_ids: z.array(RequirementId).min(1).max(200), period_from: Day, period_to: Day, retention_days: z.number().int().min(1).max(3650).default(90) });
export const EngagementCreated = z.strictObject({ engagement_id: Id, engagement_code: z.string().regex(/^[A-Z2-9]{5}(-[A-Z2-9]{5}){3}$/), note: z.string().max(300) });
export const EngagementTeamAdd = z.strictObject({ user_id: Id, engagement_role: z.enum(['LEAD', 'AUDITOR', 'REVIEWER']) });
export const IndependenceDeclare = z.strictObject({ statement: z.string().trim().min(20).max(2000), conflict_check: z.enum(['NO_CONFLICT', 'CONFLICT_MITIGATED']), conflict_note: z.string().trim().max(2000).nullable(), empanelment_reference: z.string().trim().min(1).max(120).nullable() });
export const ProcessingAgreementRecord = z.strictObject({ reference: z.string().trim().min(3).max(200) });
export const TeamMember = z.strictObject({ user_id: Id, name: z.string(), role: VendorRoleName, engagement_role: z.enum(['LEAD', 'AUDITOR', 'REVIEWER']) });
export const EngagementSummary = z.strictObject({ id: Id, organisation_id: Id, organisation_name: z.string(), reference: z.string(), state: z.enum(['PLANNING', 'FIELDWORK', 'REPORTING', 'CLOSED']),
  period_from: Day, period_to: Day, scope_requirement_ids: z.array(z.string()), created_at: Time, on_team: z.boolean() });
export const Engagement = EngagementSummary.extend({
  team: z.array(TeamMember).max(50), processing_agreement: z.strictObject({ recorded: z.boolean(), reference: z.string().nullable(), recorded_at: Time.nullable() }),
  independence: z.strictObject({ declared: z.boolean(), statement: z.string().nullable(), conflict_check: z.enum(['NO_CONFLICT', 'CONFLICT_MITIGATED']).nullable(), conflict_note: z.string().nullable(), declared_at: Time.nullable() }),
  empanelment_reference: z.string().nullable(), retention_days: z.number().int(), closed_at: Time.nullable(), purged_at: Time.nullable() });
export const EngagementList = z.strictObject({ items: z.array(EngagementSummary).max(1000) });

export const InboxItem = z.strictObject({ item_id: Id, requirement_id: z.string(), kind: z.enum(['FILE', 'INDICATOR', 'STATEMENT']), title: z.string(), file_name: z.string().nullable(), media_type: z.string(),
  size_bytes: z.number().int(), sha256: z.string(), contains_personal_data: z.boolean(), content_available: z.boolean(),
  reviews: z.array(z.strictObject({ id: Id, decision: z.enum(['ACCEPT', 'REJECT', 'REQUEST_MORE']), note: z.string(), sampling: z.string().nullable(), reviewer_id: Id, reviewed_at: Time })).max(100) });
export const InboxPackage = z.strictObject({ id: Id, engagement_id: Id, client_package_id: Id, uploaded_at: Time, file_sha256: z.string(), manifest_fingerprint: z.string(), expires_at: Time,
  contains_personal_data: z.boolean(), state: z.enum(['ACCEPTED', 'QUARANTINED', 'REVOKED', 'PURGED']), quarantine_reason: z.string().nullable(), scan_engine: z.string(), items: z.array(InboxItem).max(500) });
export const InboxPackageSummary = InboxPackage.omit({ items: true }).extend({ item_count: z.number().int() });
export const PackageRefusal = z.strictObject({ id: Id, file_sha256: z.string(), reasons: z.array(z.string()), refused_at: Time });
export const EngagementInbox = z.strictObject({ packages: z.array(InboxPackageSummary).max(1000), refusals: z.array(PackageRefusal).max(1000) });
export const ItemContent = z.strictObject({ item_id: Id, media_type: z.string(), file_name: z.string().nullable(), sha256: z.string(), content_base64: z.string() });
export const ItemReviewRecord = z.strictObject({ item_id: Id, decision: z.enum(['ACCEPT', 'REJECT', 'REQUEST_MORE']), note: z.string().trim().min(1).max(2000), sampling: z.string().trim().max(2000).nullable() });
export const RequirementResultRecord = z.strictObject({ requirement_id: RequirementId, result: RequirementResult, rationale: z.string().trim().min(1).max(2000) });
export const ChecklistRow = z.strictObject({ requirement_id: z.string(), expected_evidence: z.array(z.string()).max(20), received_items: z.number().int(), channel_entries: z.number().int(), accepted_items: z.number().int(), rejected_items: z.number().int(),
  more_requested: z.number().int(), result: RequirementResult.nullable(), rationale: z.string().nullable(), recorded_at: Time.nullable() });
export const Checklist = z.strictObject({ engagement_id: Id, rows: z.array(ChecklistRow).max(200), expectations_source: z.string().max(200) });
export const AuditRequestCreate = z.strictObject({ requirement_id: RequirementId, description: z.string().trim().min(1).max(2000), due_date: Day });
export const FindingCreate = z.strictObject({ requirement_id: RequirementId, provision_ids: z.array(ProvisionId).max(10), severity: Severity, title: z.string().trim().min(1).max(200),
  observation: z.string().trim().min(1).max(4000), recommendation: z.string().trim().min(1).max(4000), due_date: Day });
export const FindingEventRecord = z.strictObject({ event: z.enum(['CLIENT_RESPONSE', 'RETEST_PASSED', 'RETEST_FAILED', 'CLOSED']), note: z.string().trim().min(1).max(4000) });
export const Finding = z.strictObject({ id: Id, engagement_id: Id, requirement_id: z.string(), provision_ids: z.array(z.string()), severity: Severity, title: z.string(), observation: z.string(), recommendation: z.string(),
  due_date: Day, status: z.enum(['OPEN', 'CLIENT_RESPONDED', 'RETEST_PASSED', 'RETEST_FAILED', 'CLOSED']), created_at: Time,
  events: z.array(z.strictObject({ id: Id, event: z.string(), note: z.string(), recorded_at: Time })).max(200) });
export const FindingList = z.strictObject({ items: z.array(Finding).max(500), requests: z.array(z.strictObject({ id: Id, requirement_id: z.string(), description: z.string(), due_date: Day, created_at: Time })).max(500) });
export const ReportDraft = z.strictObject({ opinion_as_of: Day, method: z.string().trim().min(1).max(4000), opinion: z.string().trim().min(1).max(4000), limitations: z.array(z.string().trim().min(1).max(1000)).min(1).max(20) });
export const Report = z.strictObject({ id: Id, engagement_id: Id, version: z.number().int(), state: z.enum(['DRAFT', 'APPROVED', 'SIGNED', 'SUPERSEDED']), opinion_as_of: Day, method: z.string(), opinion: z.string(),
  limitations: z.array(z.string()), drafted_by: Id, drafted_at: Time, approved_by: Id.nullable(), approved_at: Time.nullable(), pdf_sha256: z.string().nullable(), signed_document_id: Id.nullable() });
export const ReportList = z.strictObject({ items: z.array(Report).max(100) });
export const SignedFile = z.strictObject({ file_name: z.string().max(120), signed: z.unknown() });
export const ReportPdf = z.strictObject({ file_name: z.string().max(120), pdf_base64: z.string(), pdf_sha256: z.string() });
export const AccessLog = z.strictObject({ items: z.array(z.strictObject({ id: Id, package_id: Id, item_id: Id.nullable(), actor_id: Id, action: z.string(), recorded_at: Time })).max(1000) });
export const RetentionSweep = z.strictObject({ purged: z.array(z.strictObject({ engagement_id: Id, packages: z.number().int(), items: z.number().int(), bytes: z.number().int() })).max(1000) });
export const UploadResult = z.strictObject({ outcome: z.enum(['ACCEPTED', 'QUARANTINED', 'REFUSED']), package_id: Id.nullable(), reasons: z.array(z.string().max(80)).max(20), manifest_fingerprint: z.string().nullable() });
export const OwnUploads = z.strictObject({ items: z.array(z.strictObject({ id: Id, engagement_reference: z.string().nullable(), client_package_id: Id.nullable(), state: z.string(), uploaded_at: Time, outcome: z.string() })).max(100) });
export const SupportCaseCreate = z.strictObject({ organisation_id: Id, category: z.enum(['INSTALLATION', 'LICENCE', 'UPGRADE', 'AUDIT_EXCHANGE', 'OTHER']), summary: z.string().trim().min(3).max(500), urgency: z.enum(['LOW', 'NORMAL', 'HIGH']) });
export const SupportCase = SupportCaseCreate.extend({ id: Id, state: z.enum(['OPEN', 'WAITING_ON_CLIENT', 'RESOLVED']), created_at: Time, organisation_name: z.string() });
export const SupportCaseList = z.strictObject({ items: z.array(SupportCase).max(1000) });
export { PersonalDataFlag };

// Audit mandate channel (revision 1.6 addendum): what the engagement team sees and issues.
export const ChannelRequestCreate = z.strictObject({ kind: z.enum(['COLLECT_NOW', 'SAMPLE_COUNT', 'EVIDENCE_FILE']), requirement_id: RequirementId.nullable(),
  categories: z.array(EvidenceCategory).max(7), population: SamplePopulation.nullable(), sample_size: z.number().int().min(1).max(500).nullable(),
  description: z.string().trim().min(1).max(2000), due_date: Day });
export const ChannelRequestView = z.strictObject({ id: Id, kind: z.string(), requirement_id: z.string().nullable(), categories: z.array(z.string()), population: z.string().nullable(), sample_size: z.number().int().nullable(),
  seed: z.string().nullable(), description: z.string(), due_date: Day, issued_by: Id, issued_at: Time, status: z.enum(['PENDING', 'DELIVERED', 'AWAITING_CLIENT_APPROVAL', 'REFUSED', 'WITHDRAWN']),
  status_reason: z.string().nullable(), acknowledged_at: Time.nullable(), delivery_id: Id.nullable(), package_id: Id.nullable(), overdue: z.boolean() });
export const ChannelDeliverySummary = z.strictObject({ delivery_id: Id, sequence: z.number().int(), kind: z.enum(['SNAPSHOT', 'RESPONSE']), request_id: Id.nullable(), generated_at: Time.nullable(),
  period_from: Time.nullable(), period_to: Time.nullable(), entries: z.number().int(), outcome: z.enum(['ACCEPTED', 'REFUSED']), reasons: z.array(z.string()), received_at: Time, purged: z.boolean() });
export const ChannelView = z.strictObject({ engagement_id: Id, available: z.boolean(),
  health: z.strictObject({ installation_key_id: z.string().nullable(), pinned_at: Time.nullable(), last_check_in_at: Time.nullable(), check_ins: z.number().int(),
    chain_state: z.enum(['NOT_STARTED', 'INTACT', 'BROKEN']), chain_problem: z.string().nullable(), next_sequence: z.number().int() }).nullable(),
  mandate: z.strictObject({ mandate_id: Id, kind: z.string(), state: z.string(), valid_from: Time, valid_to: Time, open: z.boolean(), received_at: Time, document: z.unknown() }).nullable(),
  mandate_history: z.array(z.strictObject({ mandate_id: Id, state: z.string(), received_at: Time })).max(500),
  requests: z.array(ChannelRequestView).max(1000), deliveries: z.array(ChannelDeliverySummary).max(1000),
  documents: z.array(z.strictObject({ document_id: Id, kind: z.string(), offered_at: Time, acknowledged_at: Time.nullable(), channel_state: z.enum(['OFFERED', 'TOO_LARGE_FOR_CHANNEL']), encoded_bytes: z.number().int().nullable() })).max(500),
  events: z.array(z.strictObject({ kind: z.string(), outcome: z.string(), recorded_at: Time })).max(100) });
export const ChannelDeliveryDetail = ChannelDeliverySummary.extend({ document: z.unknown().nullable(), signed: z.unknown().nullable(), receipt: z.unknown() });
export const VendorOverview = z.strictObject({
  as_of: Time, organisations: z.number().int(), licence_states: z.record(z.string(), z.number().int()), licences_expiring_60_days: z.number().int(),
  engagements_by_state: z.record(z.string(), z.number().int()), engagements_without_lead: z.number().int(), engagements_without_independence: z.number().int(),
  channels: z.strictObject({ with_active_mandate: z.number().int(), silent_over_48_hours: z.number().int(), chain_broken: z.number().int(), deliveries_30_days: z.number().int() }),
  requests: z.strictObject({ open: z.number().int(), overdue_with_clients: z.number().int() }),
  packages_30_days: z.record(z.string(), z.number().int()), packages_quarantined: z.number().int(),
  findings_open_by_severity: z.record(z.string(), z.number().int()), findings_overdue: z.number().int(),
  reports_signed: z.number().int(), reports_awaiting_review: z.number().int(), support_open_by_urgency: z.record(z.string(), z.number().int()), retention_due: z.number().int() });
