/** Synthetic contract examples for the DPDPA external audit exchange (revision 1.5 addendum). Never runtime responses. */
const at = '2026-09-16T10:00:00.000Z'; const later = '2026-10-16T10:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const d = (c: string) => c.repeat(64);
const indicator = { key: 'notices.published_versions', label: 'Published notice versions', value: 3, unit: 'count', as_of: at, basis: 'registry notice versions in PUBLISHED status; counted under your access in this installation' };
const gapRow = { requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', title: 'Itemised notice with every request for consent', provision_ids: ['ACT-S5(1)', 'RULES-R3'], modules: ['NOTICES', 'CONSENT'], in_force: true,
  applicability: 'APPLICABLE' as const, applicability_basis: '1 recorded decision(s); organisation-level decision applies.', evidence_expectations: ['Published notice version linked to the activity'],
  controls: [{ control_id: uuid(1500), title: 'Itemised notices published', standing: 'PENDING_REVIEW' as const, evidence_id: uuid(1501), files: 1 }], indicators: [indicator], gap_status: 'PENDING_REVIEW' as const };
const file = { id: uuid(1510), control_id: uuid(1500), grc_evidence_id: uuid(1501), file_name: 'notice.pdf', media_type: 'application/pdf' as const, size_bytes: 1024, sha256: d('a'),
  contains_personal_data: 'NO' as const, personal_data_confirmed: 'NO' as const, confirmed_by: uuid(1502), confirmed_at: at, shareable: 'SHAREABLE' as const, uploaded_by: uuid(1503), uploaded_at: at };
const summary = { id: uuid(1520), engagement_id: uuid(1530), state: 'APPROVED' as const, expires_at: later, effective_state: 'APPROVED' as const, prepared_by: uuid(1503), prepared_role: 'ORG_ADMIN',
  approved_by: uuid(1502), approved_at: at, manifest_fingerprint: d('b'), file_sha256: d('c'), revoked_at: null, revoke_reason: null, item_count: 1, exports: 1, created_at: at };
const importSummary = { id: uuid(1540), kind: 'FINDINGS' as const, document_digest: d('d'), signing_key_id: 'orvia-audit-synthetic', imported_at: at, imported_by: uuid(1503), issued_at: at, entries: 1, pdf_sha256: null };
const engagementBase = { id: uuid(1530), firm_name: 'Synthetic audit practice', engagement_reference: 'ENG-2026-01', scope_requirement_ids: ['DPDP-NOTICE-CONSENT-REQUEST'], period_from: '2026-01-01', period_to: '2026-06-30',
  processing_agreement: { status: 'NOT_RECORDED' as const, reference: null }, independence: { declared: true, statement: 'The audit firm declared its independence in the engagement letter.' }, empanelment_reference: null,
  state: 'ACTIVE' as const, created_by: uuid(1503), created_at: at };
const item = { item_id: uuid(1550), requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', kind: 'FILE' as const, title: 'Published itemised notice', evidence_file_id: uuid(1510), indicator: null, statement: null,
  contains_personal_data: 'NO' as const, exception_justification: null, exception_approved_by: null, added_by: uuid(1503), added_at: at };
const itemAdd = { requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', kind: 'FILE' as const, title: 'Published itemised notice', evidence_file_id: uuid(1510), indicator_key: null, statement: null };
const mandateCreate = { kind: 'ENGAGEMENT' as const, scope_requirement_ids: ['DPDP-NOTICE-CONSENT-REQUEST'], categories: ['INDICATORS' as const, 'CONTROL_STANDING' as const], schedule: 'WEEKLY' as const, valid_from: at, valid_to: later };
const mandate = { ...mandateCreate, id: uuid(1580), engagement_id: uuid(1530), state: 'ACTIVE' as const, open: true, prepared_by: uuid(1503), prepared_role: 'ORG_ADMIN', approved_by: uuid(1502), approved_role: 'ORG_SUPER_ADMIN',
  approved_at: at, state_changed_at: at, state_reason: null, reported_state: 'ACTIVE', last_check_in_at: at, next_collection_at: later, channel_problem: null, created_at: at };
const delivery = { id: uuid(1581), mandate_id: uuid(1580), sequence: 1, kind: 'SNAPSHOT' as const, request_id: null, period_from: at, period_to: at, entries: 4, categories: ['INDICATORS', 'CONTROL_STANDING'], digest: d('f'),
  state: 'ACCEPTED' as const, attempts: 1, last_error: null, reasons: [], created_at: at, completed_at: at };
const request = { id: uuid(1582), mandate_id: uuid(1580), kind: 'EVIDENCE_FILE' as const, requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', description: 'Signed copy of the notice approval record.', due_date: '2026-10-30',
  received_at: at, decision: 'AWAITING_CLIENT_APPROVAL' as const, decision_reason: 'EVIDENCE_FILES_NEED_A_CLIENT_APPROVER', decided_by: null, decided_at: null, delivery_id: null, package_id: null, reported_to_auditor: true, overdue: false, request: {} };
const submission = { id: uuid(1583), package_id: uuid(1520), engagement_id: uuid(1530), request_id: uuid(1582), file_sha256: d('c'), state: 'ACCEPTED' as const, attempts: 1, last_error: null, reasons: [], requested_by: uuid(1502), requested_at: at, completed_at: at };
const channelDocument = { id: uuid(1580), kind: 'FINDINGS', received_at: later, has_pdf: false, import_id: null, imported_at: null, summary: '1 finding(s)' };
const responseCreate = { import_id: uuid(1581), finding_id: uuid(1570), factual_accuracy: 'AGREED', agreement: 'PARTIALLY_AGREE', response: 'We will publish the itemised notice for the activity.', action_plan: 'Publish notice v4.',
  owner_role: 'Privacy office', due_date: '2026-12-31', dependencies: null, remediation_status: 'IN_PROGRESS', risk_acceptance: null };
const findingResponse = { id: uuid(1582), engagement_id: uuid(1530), import_id: uuid(1581), finding_id: uuid(1570), finding_title: 'Notice indicators show a gap', content: responseCreate, redactions: 0,
  prepared_by: uuid(1583), prepared_at: later, approved_by: uuid(1584), approved_at: later, state: 'ACCEPTED', attempts: 1, last_error: null, outcome: 'ACCEPTED', completed_at: later,
  personal_data_review: 'NONE_CONFIRMED' };
const EXAMPLES: Record<string, unknown> = {
  Indicator: indicator, GapRow: gapRow,
  GapRegister: { as_of: at, package: { id: uuid(1560), version: '1.0.0', distribution: 'TEST_FIXTURE' }, framework_id: uuid(1561), rows: [gapRow],
    by_module: [{ module: 'CONSENT', total: 1, gaps: 1, evidenced: 0, not_applicable: 0 }, { module: 'NOTICES', total: 1, gaps: 1, evidenced: 0, not_applicable: 0 }],
    totals: { NOT_APPLICABLE: 0, UNRESOLVED_APPLICABILITY: 0, NO_EVIDENCE: 0, STALE: 0, PENDING_REVIEW: 1, REJECTED: 0, EVIDENCED: 0 }, limits: ['Indicators are aggregate counts read from this installation\'s own records; they contain no personal data.'] },
  GapRegisterExport: { file_name: 'orvia-dpdpa-gap-register-2026-09-16.csv', csv: 'requirement_id,title\nDPDP-NOTICE-CONSENT-REQUEST,Itemised notice\n', rows: 1 },
  EvidenceFileSubmit: { description: 'Published notice (synthetic)', file_name: 'notice.pdf', content_base64: 'JVBERi0xLjQK', collected_at: at, valid_until: later, contains_personal_data: 'NO' },
  EvidenceFile: file, EvidenceFileList: { items: [file], next_cursor: null },
  EvidenceFileContent: { id: uuid(1510), file_name: 'notice.pdf', media_type: 'application/pdf', sha256: d('a'), content_base64: 'JVBERi0xLjQK' },
  PersonalDataConfirm: { personal_data: 'NO' },
  AuditEngagementCreate: { engagement_code: 'ABCDE-FGHJK-LMNPQ-RSTUV', firm_name: 'Synthetic audit practice', engagement_reference: 'ENG-2026-01', scope_requirement_ids: ['DPDP-NOTICE-CONSENT-REQUEST'],
    period_from: '2026-01-01', period_to: '2026-06-30', processing_agreement_reference: null, independence_statement: 'The audit firm declared its independence in the engagement letter.', empanelment_reference: null },
  AuditPackageSummary: summary, AuditImportSummary: importSummary,
  AuditEngagement: { ...engagementBase, packages: [summary], imports: [importSummary] }, AuditEngagementList: { items: [engagementBase], next_cursor: null },
  AuditPackageCreate: { expires_at: later }, PackageItemView: item,
  AuditPackage: { ...summary, items: [item], manifest: null, screening: [], redactions: 0 },
  AuditPackageItemAdd: itemAdd, AuditPackageExceptionAdd: { ...itemAdd, justification: 'Needed to evidence the sampled notice delivery for the audit.' },
  AuditPackageItemRemove: { item_id: uuid(1550) }, AuditPackageRevoke: { reason: 'Superseded by a corrected package.' },
  AuditPackageExport: { file_name: 'orvia-dpdpa-audit-package-ENG-2026-01-00000000.orvia-audit.json', package_base64: 'e30=', file_sha256: d('c'), manifest_fingerprint: d('b'), expires_at: later },
  AuditImportSubmit: { signed: { algorithm: 'Ed25519', signing_key_id: 'orvia-audit-synthetic', document: {}, signature: 'A'.repeat(86) }, pdf_base64: null },
  AuditImport: { ...importSummary, engagement_id: uuid(1530), document: { kind: 'FINDINGS', findings: [] }, finding_links: [{ finding_id: uuid(1570), grc_issue_id: uuid(1571) }] },
  AuditImportPdf: { file_name: 'orvia-audit-report-ENG-2026-01.pdf', pdf_base64: 'JVBERi0xLjQK', pdf_sha256: d('e') },
  FindingLinkCreate: { finding_id: uuid(1570) },
  // Revision 1.6: audit mandate and channel (synthetic).
  AuditMandateCreate: mandateCreate, AuditMandate: mandate, AuditMandateStateChange: { state: 'SUSPENDED', reason: 'Paused while the privacy team reviews the categories.' },
  ChannelDeliveryView: delivery, ChannelDeliveryContent: { ...delivery, document: { format: 'orvia.dpdpa-audit-delivery' }, signed: { algorithm: 'Ed25519' }, receipt: null },
  ChannelRequest: request, ChannelRequestDecision: { decision: 'REFUSED', reason: 'OUT_OF_PERIOD', package_id: null }, PackageSubmission: submission,
  AuditChannel: { engagement_id: uuid(1530), available: true, audit_service: { configured: true, address: 'https://audit.vendor.example.in' }, evidence_key_id: 'orvia-installation-' + '0'.repeat(32),
    mandates: [mandate], requests: [request], deliveries: [delivery], submissions: [submission], documents: [channelDocument], responses: [findingResponse], limits: [] },
  // Audit practice round trip (synthetic).
  ChannelDocumentView: channelDocument, FindingResponseCreate: responseCreate, FindingResponse: findingResponse, FindingResponseApproval: { personal_data: 'NONE_CONFIRMED' },
  AuditEngagementClose: { reason: 'Engagement completed and report received.' },
};
export function dpdpaAuditExample(name: string): unknown { return EXAMPLES[name]; }
