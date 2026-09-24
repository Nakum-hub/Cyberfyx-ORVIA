/**
 * Contract examples for the operations extension that the generic sampler cannot
 * build, because each of these schemas relates two fields (a channel link names
 * a channel, a share names exactly one recipient, missing evidence has no time).
 * They are synthetic contract examples only and are never a runtime fallback.
 */
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const at = '2026-09-16T10:00:00.000Z';
const requirement = {
  requirement_id: 'DPDP-BREACH-BOARD-REPORT', version: 1, title: 'Detailed breach report to the Board',
  provision_ids: ['RULES-2025-R7-2-B'], statement: 'Within seventy-two hours of becoming aware of a personal data breach, furnish the Board with the detailed information the rule lists.',
  applicability: { always: true as const }, evidence_expectations: ['Report reference and submission time'], modules: ['BREACH' as const],
  timer: { kind: 'HOURS' as const, runs_from: 'AWARENESS' as const, hours: 72 }, breach_task_kind: 'BOARD_DETAILED_REPORT' as const, sdf_obligation_kind: null,
  rights_timer_scope: [], effective_from: '2027-05-13', test_refs: ['tests/integration/operations/breach.test.ts'],
};
const claims = {
  package_id: uuid(700), version: '1.0.0', previous_version: null, audience: 'ORVIA_CUSTOMER_INSTALLATION' as const, distribution: 'TEST_FIXTURE' as const,
  effective_from: at, created_at: at,
  sources: [{ source_id: 'FIXTURE-RULES', source_type: 'RULES' as const, publisher: 'Synthetic fixture publisher', title: 'Synthetic fixture rules', official_url: 'https://fixture.invalid/rules',
    notification_reference: null, publication_date: null, artifact_digest: null, retrieved_at: null, verification: 'TEST_FIXTURE' as const, supersedes: null, corrects: null }],
  provisions: [{ provision_id: 'RULES-2025-R7-2-B', source_id: 'FIXTURE-RULES', reference: 'Rule 7(2)(b)', version: 1, published_on: null, commences_on: '2027-05-13',
    status: 'NOT_COMMENCED' as const, commencement_basis: 'Synthetic fixture commencement.', text_digest: null }],
  requirements: [requirement], condition_vocabulary: [{ code: 'CONSENT', label: 'Consent of the Data Principal', requirement_ids: ['DPDP-BREACH-BOARD-REPORT'] }],
  release_notes: [], open_verification_items: [],
};
export function operationsExample(name: string): unknown {
  switch (name) {
    case 'SubjectReferenceAdd': return { system_id: uuid(711), target_reference: 'syn_legacy_0001', source_key: null };
    case 'RegulatoryPackageImport': return { package: { algorithm: 'Ed25519', claims, signing_key_id: uuid(701), signature: 'A'.repeat(86) } };
    case 'ApplicabilityEvaluation': return { package_row_id: uuid(702), package_version: '1.0.0', as_of: at, decisions: [],
      summary: { APPLICABLE: 0, NOT_APPLICABLE: 0, UNRESOLVED: 0, NOT_YET_IN_FORCE: 0, SUPERSEDED: 0, EXEMPT_WITH_RECORDED_BASIS: 0 } };
    case 'ConditionCreate': return { code: 'CONSENT', label: 'Consent of the Data Principal', effective_from: at, justification_reference: null, evidence_requirements: 'Consent record with notice version.', unresolved_reason: null };
    case 'SafeguardCreate': return { kind: 'ACCESS_CONTROL', description: 'Role-based access to the customer records store.', control_reference: null, evidence_state: 'EVIDENCE_MISSING', evidence_reference: null };
    case 'ActivityLinkCreate': return { link_kind: 'SYSTEM', target_id: uuid(703), channel: null, basis: 'Reviewed data-flow declaration.', valid_from: at };
    case 'NoticeDeliveryRecord': return { notice_version_id: uuid(704), subject_id: uuid(705), relationship_id: null, population_reference: null, channel: 'EMAIL',
      presented_at: at, source_system_id: null, source_reference: 'Source delivery log SYN-001', evidence_reference: null, result: 'DELIVERED' };
    case 'ConsentEventRecord': return { event: 'WITHDRAWN', occurred_at: at, evidence_state: 'EVIDENCE_AVAILABLE', evidence_reference: 'Portal receipt SYN-001', notice_version_id: null };
    case 'SharingLinkCreate': return { activity_id: uuid(706), data_category_id: uuid(707), principal_category_id: null, engagement_id: uuid(708), recipient_reference: null,
      purpose_version_id: uuid(709), system_id: null, valid_from: at, evidence_reference: null };
    case 'RetentionHoldCreate': return { hold_type: 'OTHER_LAW_RETENTION', authority_reference: 'Customer legal register entry SYN-LR-01', reason: 'Records must be kept under a customer-recorded statutory obligation.',
      subject_id: uuid(710), activity_id: null, system_id: null, data_category_id: null, starts_at: at, ends_at: null, review_at: at, owner_reference: 'Legal team', evidence_reference: null, requirement_id: null };
    case 'BulkJobCreate': return { source_label: 'Legacy customer store export', mapping_version: 'mapping-1.0' };
    case 'BulkJobAppend': return { first_ordinal: 0, rows: [{ row_key: 'legacy-0001', source_key: null, references: [{ system_id: uuid(711), target_reference: 'syn_legacy_0001' }], relationships: [], consent: [], notice_deliveries: [] }] };
    case 'EngagementDisposition': return { outcome: 'PROCESSOR_CONFIRMED', evidence_reference: 'Processor deletion certificate SYN-DC-01', verification_method: 'PROCESSOR_STATEMENT' };
    default: return undefined;
  }
}
