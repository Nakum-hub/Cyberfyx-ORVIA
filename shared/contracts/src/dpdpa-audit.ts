import { z } from 'zod';
import { EvidenceMediaType, PersonalDataFlag, RequirementId, Severity } from './audit-exchange.ts';
import { EvidenceCategory, MandateKind, MandateSchedule, MandateState } from './audit-channel.ts';

/**
 * Client side of the DPDPA external audit exchange (revision 1.5 addendum):
 * gap register, local evidence files, engagements, sealed evidence packages and
 * verified imports of the vendor's signed files. Registered in the canonical
 * customer contract by index.ts.
 */
const Id = z.uuid();
const Time = z.iso.datetime();
const Day = z.iso.date();
const page = <T extends z.ZodType>(item: T) => z.strictObject({ items: z.array(item).max(200), next_cursor: z.string().nullable() });

export const GapStatus = z.enum(['NOT_APPLICABLE', 'UNRESOLVED_APPLICABILITY', 'NO_EVIDENCE', 'STALE', 'PENDING_REVIEW', 'REJECTED', 'EVIDENCED']);
export type GapStatus = z.infer<typeof GapStatus>;
export const Applicability = z.enum(['APPLICABLE', 'NOT_APPLICABLE', 'UNRESOLVED']);
export type Applicability = z.infer<typeof Applicability>;
export type Standing = 'UNKNOWN' | 'PENDING_REVIEW' | 'REJECTED' | 'STALE' | 'MANUAL_REVIEW_ACCEPTED';

/**
 * Gap status from applicability and the standings of the controls mapped to the
 * requirement. Unresolved applicability is itself a gap. With several controls
 * the best-evidenced one decides, except that any accepted control is enough.
 */
export function deriveGapStatus(applicability: Applicability, standings: Standing[]): GapStatus {
  if (applicability === 'NOT_APPLICABLE') return 'NOT_APPLICABLE';
  if (applicability === 'UNRESOLVED') return 'UNRESOLVED_APPLICABILITY';
  if (standings.includes('MANUAL_REVIEW_ACCEPTED')) return 'EVIDENCED';
  if (standings.includes('PENDING_REVIEW')) return 'PENDING_REVIEW';
  if (standings.includes('REJECTED')) return 'REJECTED';
  if (standings.includes('STALE')) return 'STALE';
  return 'NO_EVIDENCE';
}
/** Applicability from recorded decisions: the organisation-level decision wins; otherwise any applicable activity makes the requirement applicable. */
export function deriveApplicability(decisions: { scope_kind: 'ORGANISATION' | 'ACTIVITY'; result: string }[]): Applicability {
  const map = (r: string): Applicability => r === 'APPLICABLE' ? 'APPLICABLE' : ['NOT_APPLICABLE', 'EXEMPT_WITH_RECORDED_BASIS', 'NOT_YET_IN_FORCE'].includes(r) ? 'NOT_APPLICABLE' : 'UNRESOLVED';
  const org = decisions.find(d => d.scope_kind === 'ORGANISATION');
  if (org) return map(org.result);
  const activity = decisions.filter(d => d.scope_kind === 'ACTIVITY').map(d => map(d.result));
  if (activity.includes('APPLICABLE')) return 'APPLICABLE';
  if (activity.length && activity.every(a => a === 'NOT_APPLICABLE')) return 'NOT_APPLICABLE';
  return 'UNRESOLVED';
}

export const Indicator = z.strictObject({ key: z.string().regex(/^[a-z0-9_.]{3,80}$/), label: z.string().max(200), value: z.union([z.number().int(), z.string().max(80), z.null()]),
  unit: z.string().max(40), as_of: Time, basis: z.string().max(300) });
export type Indicator = z.infer<typeof Indicator>;
export const GapRow = z.strictObject({ requirement_id: RequirementId, title: z.string().max(300), provision_ids: z.array(z.string().max(40)).max(20), modules: z.array(z.string().max(40)).max(20),
  in_force: z.boolean(), applicability: Applicability, applicability_basis: z.string().max(300), evidence_expectations: z.array(z.string().max(300)).max(20),
  controls: z.array(z.strictObject({ control_id: Id, title: z.string().max(500), standing: z.enum(['UNKNOWN', 'PENDING_REVIEW', 'REJECTED', 'STALE', 'MANUAL_REVIEW_ACCEPTED']), evidence_id: Id.nullable(), files: z.number().int() })).max(50),
  indicators: z.array(Indicator).max(10), gap_status: GapStatus });
export const GapRegister = z.strictObject({ as_of: Time, package: z.strictObject({ id: Id, version: z.string(), distribution: z.enum(['PRODUCTION', 'TEST_FIXTURE']) }).nullable(),
  framework_id: Id.nullable(), rows: z.array(GapRow).max(200),
  by_module: z.array(z.strictObject({ module: z.string().max(40), total: z.number().int(), gaps: z.number().int(), evidenced: z.number().int(), not_applicable: z.number().int() })).max(40),
  totals: z.record(GapStatus, z.number().int()), limits: z.array(z.string().max(300)).max(10) });
export const GapRegisterExport = z.strictObject({ file_name: z.string().max(120), csv: z.string().max(2_000_000), rows: z.number().int() });

export const EvidenceFileSubmit = z.strictObject({ description: z.string().trim().min(1).max(500), file_name: z.string().regex(/^[A-Za-z0-9 ._()-]{1,200}$/), content_base64: z.string().min(4).max(28_000_000),
  collected_at: Time, valid_until: Time, contains_personal_data: PersonalDataFlag });
export const EvidenceFile = z.strictObject({ id: Id, control_id: Id, grc_evidence_id: Id, file_name: z.string(), media_type: EvidenceMediaType, size_bytes: z.number().int(), sha256: z.string(),
  contains_personal_data: PersonalDataFlag, personal_data_confirmed: z.enum(['YES', 'NO']).nullable(), confirmed_by: Id.nullable(), confirmed_at: Time.nullable(),
  shareable: z.enum(['SHAREABLE', 'BLOCKED_UNCONFIRMED', 'EXCEPTION_REQUIRED']), uploaded_by: Id, uploaded_at: Time });
export const EvidenceFileList = page(EvidenceFile);
export const EvidenceFileContent = z.strictObject({ id: Id, file_name: z.string(), media_type: EvidenceMediaType, sha256: z.string(), content_base64: z.string() });
export const PersonalDataConfirm = z.strictObject({ personal_data: z.enum(['YES', 'NO']) });

export const AuditEngagementCreate = z.strictObject({ engagement_code: z.string().regex(/^[A-Za-z2-9]{5}(-[A-Za-z2-9]{5}){3}$/), firm_name: z.string().trim().min(2).max(160),
  engagement_reference: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9/_.-]{0,79}$/), scope_requirement_ids: z.array(RequirementId).min(1).max(200), period_from: Day, period_to: Day,
  processing_agreement_reference: z.string().trim().min(3).max(200).nullable(), independence_statement: z.string().trim().min(20).max(2000).nullable(), empanelment_reference: z.string().trim().min(1).max(120).nullable() });
export const AuditPackageSummary = z.strictObject({ id: Id, engagement_id: Id, state: z.enum(['DRAFT', 'APPROVED', 'REVOKED']), expires_at: Time, effective_state: z.enum(['DRAFT', 'APPROVED', 'REVOKED', 'EXPIRED']),
  prepared_by: Id, prepared_role: z.string(), approved_by: Id.nullable(), approved_at: Time.nullable(), manifest_fingerprint: z.string().nullable(), file_sha256: z.string().nullable(),
  revoked_at: Time.nullable(), revoke_reason: z.string().nullable(), item_count: z.number().int(), exports: z.number().int(), created_at: Time });
export const AuditImportSummary = z.strictObject({ id: Id, kind: z.enum(['REQUEST_LIST', 'FINDINGS', 'REPORT']), document_digest: z.string(), signing_key_id: z.string(), imported_at: Time, imported_by: Id,
  issued_at: Time, entries: z.number().int(), pdf_sha256: z.string().nullable() });
export const AuditEngagement = z.strictObject({ id: Id, firm_name: z.string(), engagement_reference: z.string(), scope_requirement_ids: z.array(z.string()), period_from: Day, period_to: Day,
  processing_agreement: z.strictObject({ status: z.enum(['RECORDED', 'NOT_RECORDED']), reference: z.string().nullable() }),
  independence: z.strictObject({ declared: z.boolean(), statement: z.string().nullable() }), empanelment_reference: z.string().nullable(),
  state: z.enum(['ACTIVE', 'CLOSED']), created_by: Id, created_at: Time, packages: z.array(AuditPackageSummary).max(500), imports: z.array(AuditImportSummary).max(500) });
export const AuditEngagementList = page(AuditEngagement.omit({ packages: true, imports: true }));
export const AuditPackageCreate = z.strictObject({ expires_at: Time });
export const PackageItemView = z.strictObject({ item_id: Id, requirement_id: z.string(), kind: z.enum(['FILE', 'INDICATOR', 'STATEMENT']), title: z.string(), evidence_file_id: Id.nullable(),
  indicator: z.unknown().nullable(), statement: z.string().nullable(), contains_personal_data: z.enum(['YES', 'NO']), exception_justification: z.string().nullable(), exception_approved_by: Id.nullable(), added_by: Id, added_at: Time });
export const AuditPackage = AuditPackageSummary.extend({ items: z.array(PackageItemView).max(500), manifest: z.unknown().nullable(),
  screening: z.array(z.strictObject({ item_id: Id, problem: z.enum(['PERSONAL_DATA_UNCONFIRMED', 'PERSONAL_DATA_WITHOUT_EXCEPTION', 'OUTSIDE_ENGAGEMENT_SCOPE']) })).max(500),
  redactions: z.number().int() });
export const AuditPackageItemAdd = z.strictObject({ requirement_id: RequirementId, kind: z.enum(['FILE', 'INDICATOR', 'STATEMENT']), title: z.string().trim().min(1).max(200),
  evidence_file_id: Id.nullable(), indicator_key: z.string().regex(/^[a-z0-9_.]{3,80}$/).nullable(), statement: z.string().trim().min(1).max(20000).nullable() });
export const AuditPackageExceptionAdd = AuditPackageItemAdd.extend({ justification: z.string().trim().min(20).max(1000) });
export const AuditPackageItemRemove = z.strictObject({ item_id: Id });
export const AuditPackageRevoke = z.strictObject({ reason: z.string().trim().min(3).max(500) });
export const AuditPackageExport = z.strictObject({ file_name: z.string().max(160), package_base64: z.string(), file_sha256: z.string(), manifest_fingerprint: z.string(), expires_at: Time });
export const AuditImportSubmit = z.strictObject({ signed: z.unknown(), pdf_base64: z.string().max(28_000_000).nullable() });
export const AuditImport = AuditImportSummary.extend({ engagement_id: Id, document: z.unknown(), finding_links: z.array(z.strictObject({ finding_id: Id, grc_issue_id: Id })).max(500) });
export const AuditImportPdf = z.strictObject({ file_name: z.string().max(160), pdf_base64: z.string(), pdf_sha256: z.string() });
export const FindingLinkCreate = z.strictObject({ finding_id: Id });
export const AuditFindingSeverity = Severity;

// Audit mandate and channel (revision 1.6 addendum).
export const AuditMandateCreate = z.strictObject({ kind: MandateKind, scope_requirement_ids: z.array(RequirementId).min(1).max(200), categories: z.array(EvidenceCategory).min(1).max(7),
  schedule: MandateSchedule, valid_from: Time, valid_to: Time });
export const AuditMandate = z.strictObject({ id: Id, engagement_id: Id, kind: MandateKind, scope_requirement_ids: z.array(z.string()), categories: z.array(EvidenceCategory), schedule: MandateSchedule,
  valid_from: Time, valid_to: Time, state: MandateState, open: z.boolean(), prepared_by: Id, prepared_role: z.string(), approved_by: Id.nullable(), approved_role: z.string().nullable(), approved_at: Time.nullable(),
  state_changed_at: Time.nullable(), state_reason: z.string().nullable(), reported_state: z.string().nullable(), last_check_in_at: Time.nullable(), next_collection_at: Time.nullable(),
  channel_problem: z.string().nullable(), created_at: Time });
export const AuditMandateStateChange = z.strictObject({ state: z.enum(['ACTIVE', 'SUSPENDED', 'REVOKED']), reason: z.string().trim().min(3).max(500) });
export const ChannelDeliveryView = z.strictObject({ id: Id, mandate_id: Id, sequence: z.number().int(), kind: z.enum(['SNAPSHOT', 'RESPONSE']), request_id: Id.nullable(), period_from: Time, period_to: Time,
  entries: z.number().int(), categories: z.array(z.string()), digest: z.string(), state: z.enum(['QUEUED', 'UNKNOWN', 'ACCEPTED', 'REFUSED', 'FAILED']), attempts: z.number().int(), last_error: z.string().nullable(),
  reasons: z.array(z.string()), created_at: Time, completed_at: Time.nullable() });
export const ChannelDeliveryContent = ChannelDeliveryView.extend({ document: z.unknown(), signed: z.unknown(), receipt: z.unknown().nullable() });
export const ChannelRequest = z.strictObject({ id: Id, mandate_id: Id, kind: z.enum(['COLLECT_NOW', 'SAMPLE_COUNT', 'EVIDENCE_FILE']), requirement_id: z.string().nullable(), description: z.string(), due_date: Day,
  received_at: Time, decision: z.enum(['ANSWER_AUTOMATICALLY', 'AWAITING_CLIENT_APPROVAL', 'DELIVERED', 'REFUSED']), decision_reason: z.string().nullable(), decided_by: Id.nullable(), decided_at: Time.nullable(),
  delivery_id: Id.nullable(), package_id: Id.nullable(), reported_to_auditor: z.boolean(), overdue: z.boolean(), request: z.unknown() });
export const ChannelRequestDecision = z.strictObject({ decision: z.enum(['REFUSED', 'PACKAGE']), reason: z.string().trim().min(3).max(80).nullable(), package_id: Id.nullable() });
export const PackageSubmission = z.strictObject({ id: Id, package_id: Id, engagement_id: Id, request_id: Id.nullable(), file_sha256: z.string(), state: z.enum(['QUEUED', 'UNKNOWN', 'ACCEPTED', 'QUARANTINED', 'REFUSED', 'FAILED']),
  attempts: z.number().int(), last_error: z.string().nullable(), reasons: z.array(z.string()), requested_by: Id, requested_at: Time, completed_at: Time.nullable() });
export const AuditChannel = z.strictObject({ engagement_id: Id, available: z.boolean(), audit_service: z.strictObject({ configured: z.boolean(), address: z.string().nullable() }), evidence_key_id: z.string().nullable(),
  mandates: z.array(AuditMandate).max(100), requests: z.array(ChannelRequest).max(500), deliveries: z.array(ChannelDeliveryView).max(500), submissions: z.array(PackageSubmission).max(200), limits: z.array(z.string().max(300)).max(10) });
export const AuditEngagementClose = z.strictObject({ reason: z.string().trim().min(3).max(500) });

export const dpdpaAuditSchemas = { AuditMandateCreate, AuditMandate, AuditMandateStateChange, ChannelDeliveryView, ChannelDeliveryContent, ChannelRequest, ChannelRequestDecision, PackageSubmission, AuditChannel, AuditEngagementClose, GapRow, GapRegister, GapRegisterExport, Indicator, EvidenceFileSubmit, EvidenceFile, EvidenceFileList, EvidenceFileContent, PersonalDataConfirm,
  AuditEngagementCreate, AuditPackageSummary, AuditImportSummary, AuditEngagement, AuditEngagementList, AuditPackageCreate, PackageItemView, AuditPackage, AuditPackageItemAdd, AuditPackageExceptionAdd,
  AuditPackageItemRemove, AuditPackageRevoke, AuditPackageExport, AuditImportSubmit, AuditImport, AuditImportPdf, FindingLinkCreate };

type Route = { maximum_body_bytes?: number; id: string; method: 'get' | 'post'; path: string; authority: 'STAFF'; request?: string; response: string; status: 200 | 201; params?: string; paginated?: boolean; idempotency?: boolean; capability: string };
const A = '/api/v1/admin';
const get = (id: string, path: string, response: string, capability: string, paginated = false): Route => ({ id, method: 'get', path: A + path, authority: 'STAFF', response, status: 200, capability, ...paginated ? { paginated } : {}, ...path.includes('{id}') ? { params: 'IdPath' } : {} });
const post = (id: string, path: string, request: string | undefined, response: string, capability: string, status: 200 | 201 = 201, maximum?: number): Route => ({ id, method: 'post', path: A + path, authority: 'STAFF', ...request ? { request } : {}, response, status, idempotency: true, capability, ...path.includes('{id}') ? { params: 'IdPath' } : {}, ...maximum ? { maximum_body_bytes: maximum } : {} });
export const dpdpaAuditRoutes: Route[] = [
  get('dpdpa_gap_register', '/dpdpa-audit/gaps', 'GapRegister', 'audit_exchange.read'),
  post('export_dpdpa_gap_register', '/dpdpa-audit/gaps/export', undefined, 'GapRegisterExport', 'audit_exchange.read', 200),
  post('submit_evidence_file', '/grc/controls/{id}/evidence-files', 'EvidenceFileSubmit', 'EvidenceFile', 'grc.write', 201, 28_500_000),
  get('list_evidence_files', '/evidence-files', 'EvidenceFileList', 'audit_exchange.read', true),
  get('evidence_file', '/evidence-files/{id}', 'EvidenceFile', 'audit_exchange.read'),
  get('evidence_file_content', '/evidence-files/{id}/content', 'EvidenceFileContent', 'audit_exchange.read'),
  post('confirm_evidence_personal_data', '/evidence-files/{id}/personal-data-confirmation', 'PersonalDataConfirm', 'EvidenceFile', 'audit_exchange.prepare', 200),
  get('list_audit_engagements', '/audit-engagements', 'AuditEngagementList', 'audit_exchange.read', true),
  post('create_audit_engagement', '/audit-engagements', 'AuditEngagementCreate', 'AuditEngagement', 'audit_exchange.prepare'),
  get('audit_engagement', '/audit-engagements/{id}', 'AuditEngagement', 'audit_exchange.read'),
  post('create_audit_package', '/audit-engagements/{id}/packages', 'AuditPackageCreate', 'AuditPackage', 'audit_exchange.prepare'),
  get('audit_package', '/audit-packages/{id}', 'AuditPackage', 'audit_exchange.read'),
  post('add_audit_package_item', '/audit-packages/{id}/items', 'AuditPackageItemAdd', 'AuditPackage', 'audit_exchange.prepare', 200, 65536),
  post('add_audit_package_exception', '/audit-packages/{id}/exception-items', 'AuditPackageExceptionAdd', 'AuditPackage', 'audit_exchange.approve', 200, 65536),
  post('withdraw_audit_package_item', '/audit-packages/{id}/items/removal', 'AuditPackageItemRemove', 'AuditPackage', 'audit_exchange.prepare', 200),
  post('approve_audit_package', '/audit-packages/{id}/approval', undefined, 'AuditPackage', 'audit_exchange.approve', 200),
  post('export_audit_package', '/audit-packages/{id}/export', undefined, 'AuditPackageExport', 'audit_exchange.approve', 200),
  post('revoke_audit_package', '/audit-packages/{id}/revocation', 'AuditPackageRevoke', 'AuditPackage', 'audit_exchange.approve', 200),
  post('receive_signed_audit_document', '/audit-engagements/{id}/signed-documents', 'AuditImportSubmit', 'AuditImport', 'audit_exchange.prepare', 201, 28_500_000),
  get('audit_import', '/audit-imports/{id}', 'AuditImport', 'audit_exchange.read'),
  get('audit_import_pdf', '/audit-imports/{id}/pdf', 'AuditImportPdf', 'audit_exchange.read'),
  post('link_audit_finding', '/audit-imports/{id}/finding-links', 'FindingLinkCreate', 'AuditImport', 'audit_exchange.prepare', 200),
  // Revision 1.6: audit mandate and outbound channel.
  get('audit_channel', '/audit-engagements/{id}/channel', 'AuditChannel', 'audit_exchange.read'),
  post('close_audit_engagement', '/audit-engagements/{id}/closure', 'AuditEngagementClose', 'AuditEngagement', 'audit_exchange.approve', 200),
  post('create_audit_mandate', '/audit-engagements/{id}/mandates', 'AuditMandateCreate', 'AuditMandate', 'audit_exchange.prepare'),
  post('approve_audit_mandate', '/audit-mandates/{id}/approval', undefined, 'AuditMandate', 'audit_exchange.approve', 200),
  post('change_audit_mandate_state', '/audit-mandates/{id}/state', 'AuditMandateStateChange', 'AuditMandate', 'audit_exchange.approve', 200),
  get('audit_channel_delivery', '/audit-channel-deliveries/{id}', 'ChannelDeliveryContent', 'audit_exchange.read'),
  post('decide_audit_channel_request', '/audit-channel-requests/{id}/decision', 'ChannelRequestDecision', 'ChannelRequest', 'audit_exchange.approve', 200),
  post('submit_audit_package_over_channel', '/audit-packages/{id}/channel-submission', undefined, 'PackageSubmission', 'audit_exchange.approve', 201),
];
