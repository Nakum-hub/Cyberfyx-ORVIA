/**
 * Contract examples for the expanded V1 families that the generic sampler cannot
 * build, because their schemas relate fields to each other. Synthetic contract
 * examples only; never a runtime fallback.
 */
const at0 = '2026-09-16T10:00:00.000Z';
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const at = at0;
const preferenceTopic = { id: uuid(1200), code: 'product_news', name: 'Product news', description: 'Occasional news about products you use.', channels: ['EMAIL' as const, 'SMS' as const], purpose_id: null, state: 'ACTIVE' as const, created_by: uuid(1202), created_at: at0, retired_at: null };
const question = { key: 'shares_with_third_parties', text: 'Is personal data shared with a third party?', answer_type: 'YES_NO' as const, choices: [],
  required: true, evidence_required: true, finding_when: 'YES', finding_severity: 'MEDIUM' as const, guidance: null };
const templateCreate = { template_key: null, kind: 'DPIA' as const, name: 'Synthetic DPIA', description: 'Synthetic assessment template for contract examples.',
  questions: [question], requirement_ids: [], review_interval_days: 365 };
const template = { ...templateCreate, id: uuid(900), template_key: uuid(901), version: 1, status: 'PUBLISHED' as const, recorded_by: uuid(902), recorded_at: at, published_by: uuid(903), published_at: at };
const finding = { id: uuid(910), assessment_id: uuid(905), question_key: 'shares_with_third_parties', source: 'ANSWER_RULE' as const, title: 'Answer "YES" to: Is personal data shared with a third party?',
  severity: 'MEDIUM' as const, owner_reference: 'Synthetic owner', due_at: at, grc_risk_id: null, grc_control_id: null, state: 'OPEN' as const, overdue: false, blocks_approval: true,
  events: [], created_by: uuid(902), created_at: at };
const assessment = { id: uuid(905), template, revision: 1, previous_id: null, subject_kind: 'ORGANISATION' as const, subject_id: null, title: 'Synthetic organisation DPIA',
  owner_reference: 'Synthetic owner', due_at: at, status: 'SUBMITTED' as const, overdue: false, review_due: false, next_review_at: null,
  created_by: uuid(902), created_at: at, submitted_by: uuid(902), submitted_at: at, decided_by: null, decided_at: null, decision_note: null,
  answers: [{ question_key: 'shares_with_third_parties', value: 'YES', evidence_reference: 'Synthetic data-flow register', carried_forward: false, respondent: 'STAFF' as const, answered_by: uuid(902), answered_at: at }],
  missing: [], findings: [finding], approval_blockers: ['Finding "Answer "YES" to: Is personal data shared with a third party?" is open.'] };

const location = { id: uuid(950), system_id: uuid(951), region: 'IN-KA', hosting_description: 'Customer-operated data centre, Bengaluru', basis: 'Declared by the platform owner from the hosting contract.', valid_from: at, valid_to: null, recorded_by: uuid(902), recorded_at: at };
const ropaEntry = { activity_id: uuid(960), name: 'Order fulfilment', description: 'Synthetic activity for contract examples.', owner_reference: 'Synthetic owner', status: 'ACTIVE', processes_child_data: 'NO',
  purpose: { purpose_id: uuid(961), name: 'Service delivery', version: 1, description: 'Synthetic purpose.', current: true }, condition: { code: 'CONTRACT', label: 'Synthetic condition', unresolved: false },
  notices: [], principal_categories: [{ id: uuid(962), name: 'Customers', basis: 'Synthetic declaration.', since: at }], data_categories: [{ id: uuid(963), name: 'Contact details', basis: 'Synthetic declaration.', since: at }],
  systems: [{ id: uuid(951), name: 'Synthetic CRM', connector: 'SYNTHETIC_CRM', basis: 'Synthetic declaration.', since: at, binding_adapter: 'SYNTHETIC_RECORDS_TEST_ADAPTER', location: { region: 'IN-KA', hosting_description: 'Customer-operated data centre, Bengaluru' }, observed: null }],
  recipients: [], transfers: [{ via: 'SYSTEM' as const, target_id: uuid(951), name: 'Synthetic CRM', region: 'IN-KA', cross_border: false }], retention: [], safeguards: [],
  graph: { activity_id: null, systems: [] }, gaps: [{ kind: 'NO_RETENTION_RULE' as const, severity: 'MISSING' as const, detail: 'No active retention rule applies to this activity.', target_id: null }] };
const exportJob = { id: uuid(970), kind: 'ROPA_VERSION_CSV' as const, source_id: uuid(971), as_of: at, expected_rows: 1, state: 'COMPLETED' as const, rows_written: 1, chunks: 1, failure_code: null,
  manifest: { kind: 'ROPA_VERSION_CSV' as const, as_of: at, filter: {}, expected_rows: 1, rows: 1, columns: ['activity_id'], chunks: [{ sequence: 1, row_count: 1, sha256: 'a'.repeat(64) }], digest: 'b'.repeat(64), complete: true as const, limits: ['Synthetic example.'] },
  created_at: at, finished_at: at, expires_at: at, expired: false };

const section = { section_id: `system:${uuid(951)}:1`, source: 'SYSTEM' as const, system_id: uuid(951), title: 'Synthetic CRM record', read_state: 'READ' as const, read_at: at, read_by: 'orvia_target_observer independent read',
  record_state: { suppressed: false, erased: false, anonymised: false }, fields: { name: 'Synthetic Person', email: 'person@example.invalid' } };
const responsePackage = { id: uuid(980), request_id: uuid(981), version: 1, state: 'RELEASED' as const, sections: [section], suggestions: [], redactions: [], kept: [],
  released_content: [{ title: 'Synthetic CRM record', read_state: 'READ', fields: { name: 'Synthetic Person', email: 'person@example.invalid' } }], content_digest: 'c'.repeat(64), unreadable_acknowledged: false,
  prepared_by: uuid(902), prepared_at: at, reviewed_by: uuid(903), reviewed_at: at, released_by: uuid(903), released_at: at, delivery_expires_at: at, max_downloads: 3, downloads: 0, delivery_state: 'ACTIVE' as const,
  revoked_at: null, revocation_reason: null, purged_at: null };

const counts = { EMAIL: 0, PHONE_IN: 0, PAN: 0, AADHAAR: 0, PAYMENT_CARD: 0, IFSC: 0, IPV4: 0 };
const classifiedColumn = { column: 'contact_email', sampled: 100, non_empty: 98, matches: { ...counts, EMAIL: 97 }, category: 'EMAIL' as const, confidence: 'CONFIRMED' as const, share: 0.99 };
const exposureFinding = { kind: 'PUBLIC_CAN_READ' as const, severity: 'HIGH' as const, grantee: 'PUBLIC', columns: ['contact_email'], categories: ['EMAIL' as const], detail: 'Every role can read classified columns.' };
const classificationRun = { id: uuid(990), target_id: uuid(991), schema_name: 'public', relation_name: 'customer_profiles', sample_limit: 100, state: 'COMPLETED' as const, requested_by: uuid(902), requested_at: at,
  ruleset: 'value-classifiers v1', observed_at: at, relation_state: 'CLASSIFIED' as const, rows_sampled: 100, columns: [classifiedColumn], grants: [{ grantee: 'PUBLIC', privileges: ['SELECT'], columns: null }], owner: 'owner_role',
  findings: [exposureFinding], limits: ['Synthetic example.'], failure_code: null };
const quality = { id: uuid(992), run_id: uuid(990), ruleset: 'value-classifiers v1', recorded_by: uuid(902), recorded_at: at, measurement: { columns_labelled: 1, columns_unlabelled: [], correct: 1, accuracy: 1,
  per_category: [{ category: 'EMAIL' as const, true_positives: 1, false_positives: 0, false_negatives: 0, precision: 1, recall: 1 }], possible_not_counted: [], sample_rows: 100, limits: ['Synthetic example.'] } };
const exposure = { target_id: uuid(991), schema_name: 'public', relation_name: 'customer_profiles', run_id: uuid(990), observed_at: at, sensitive_columns: ['contact_email'], findings: [exposureFinding] };

const transport = { id: uuid(1000), kind: 'SMTP' as const, name: 'Customer relay', host: 'smtp.customer.example', port: 465, security: 'TLS' as const, from_address: 'privacy@customer.example', credential_env: 'ORVIA_TRANSPORT_RELAY', url: null,
  state: 'ENABLED' as const, created_by: uuid(902), created_at: at, approved_by: uuid(903), approved_at: at, disabled_at: null, disable_reason: null, secret_revealed: false };
const routing = { id: uuid(1001), transport_id: uuid(1000), recipient: 'compliance@customer.example', kinds: ['DRIFT_TO_FAIL'], subject_prefix: '[ORVIA]', state: 'ENABLED' as const, created_by: uuid(902), created_at: at, approved_by: uuid(903), approved_at: at, disabled_at: null };
const outbound = { id: uuid(1002), transport_id: uuid(1000), source_kind: 'MANUAL', source_id: null, routing_id: null, recipient: 'dpo@customer.example', subject: 'Synthetic notice', body: 'Synthetic message body for contract examples.', content_digest: 'd'.repeat(64),
  review_state: 'APPROVED' as const, authored_by: uuid(902), authored_at: at, reviewed_by: uuid(903), reviewed_at: at, review_note: 'Reviewed.', delivery_state: 'SENT' as const, next_attempt_at: null, outcome_at: at,
  attempts: [{ attempt: 1, started_at: at, finished_at: at, outcome: 'SENT' as const, response_code: '250', receipt: '250 OK queued', error_code: null, possible_duplicate: false }] };

const cmpDocument = { categories: [{ key: 'necessary', label: 'Necessary', description: 'Needed for the site to work.', required: true }, { key: 'analytics', label: 'Analytics', description: 'Helps us understand site use.', required: false }],
  trackers: [{ name: 'Synthetic analytics', category: 'analytics', hosts: ['analytics.example'], cookies: ['_syn*'] }],
  texts: { en: { title: 'Your choices', body: 'We use cookies only with your consent, except those strictly necessary.', accept_all: 'Accept all', reject_all: 'Reject all', choose: 'Choose', save: 'Save choices' } },
  rule: { basis: 'OPT_IN' as const, requirement_id: null, source_reference: 'Synthetic source reference', honour_gpc: true } };
const cmpSite = { id: uuid(1100), site_key: uuid(1101), name: 'Synthetic site', origins: ['https://www.customer.example'], state: 'ENABLED' as const, created_by: uuid(902), created_at: at, approved_by: uuid(903), approved_at: at, disabled_at: null, sdk_path: `/cmp/${uuid(1101)}/orvia-cmp.js` };
const cmpConfig = { id: uuid(1102), site_id: uuid(1100), version: 1, document: cmpDocument, content_digest: 'f'.repeat(64), state: 'PUBLISHED' as const, authored_by: uuid(902), authored_at: at, published_by: uuid(903), published_at: at, retired_at: null };
const cmpScan = { id: uuid(1103), site_id: uuid(1100), url: 'https://www.customer.example/', state: 'COMPLETED' as const, requested_by: uuid(902), requested_at: at, observed_at: at, config_version: 1,
  results: { sdk_loaded: true, banner_shown: true, before_consent: { hosts: [], cookies: [] }, after_consent: { hosts: ['analytics.example'], cookies: ['_syn_id'] }, after_refusal: { hosts: [], cookies: [] } }, findings: [], failure_code: null, limits: ['Synthetic example.'] };

export function expansionExample(name: string): unknown {
  switch (name) {
    case 'ImpactQuestion': return question;
    case 'ImpactTemplateCreate': return templateCreate;
    case 'ImpactTemplate': return template;
    case 'ImpactTemplateList': return { items: [template], next_cursor: null };
    case 'ImpactAssessmentCreate': return { template_id: uuid(900), subject_kind: 'ORGANISATION', subject_id: null, title: 'Synthetic organisation DPIA', owner_reference: 'Synthetic owner', due_at: at };
    case 'ImpactFindingEventRecord': return { kind: 'RESOLVED', note: 'Contract signed with the recipient; sharing is covered.', evidence_reference: 'Synthetic agreement AG-1', acceptance_expires_at: null };
    case 'ImpactAnswersRecord': return { answers: [{ question_key: 'shares_with_third_parties', value: 'YES', evidence_reference: 'Synthetic data-flow register' }] };
    case 'ImpactFindingCreate': return { question_key: null, title: 'Reviewer finding on retention', severity: 'LOW', owner_reference: 'Synthetic owner', due_at: at, grc_risk_id: null, grc_control_id: null };
    case 'ImpactFinding': return finding;
    case 'SupplierAnswers': return { answers: [{ question_key: 'shares_with_third_parties', value: 'NO', evidence_reference: null }] };
    case 'AgreementCreate': return { processor_id: uuid(920), kind: 'DPA', reference: 'Synthetic DPA SYN-1', signed_at: at, effective_from: at, expires_at: '2027-09-16T10:00:00.000Z',
      allowed_purpose_ids: [], allowed_regions: ['IN', 'IN-KA'], subprocessors_allowed: false, onward_transfer_allowed: false, evidence_reference: 'Signed copy in the contract register', supersedes_id: null };
    case 'SupplierLinkIssued': return { link: { id: uuid(930), assessment_id: uuid(905), expires_at: '2026-09-30T10:00:00.000Z', state: 'ACTIVE', revoked_at: null, revocation_reason: null, last_used_at: null, created_by: uuid(902), created_at: at },
      token: 'a'.repeat(64), path: `/supplier#token=${'a'.repeat(64)}` };
    case 'ImpactAssessmentDetail': return assessment;
    case 'SystemLocationCreate': return { region: 'IN-KA', hosting_description: 'Customer-operated data centre, Bengaluru', basis: 'Declared by the platform owner from the hosting contract.', valid_from: at };
    case 'SystemLocation': return location;
    case 'SystemLocationList': return { items: [location], next_cursor: null };
    case 'RopaEntry': return ropaEntry;
    case 'RopaEntryList': return { items: [ropaEntry], next_cursor: null };
    case 'RopaSummary': return { as_of: at, home_region: 'IN', activities: 1, activities_with_gaps: 1, gaps: [{ kind: 'NO_RETENTION_RULE', severity: 'MISSING', count: 1 }], cross_border_transfers: 0, systems_declared_only: 1, limits: ['Synthetic example.'] };
    case 'DataExportCreate': return { kind: 'ROPA_VERSION_CSV', ropa_version_id: uuid(971), audit_filter: null };
    case 'DataExportManifest': return exportJob.manifest;
    case 'DataExport': return exportJob;
    case 'DataExportList': return { items: [exportJob], next_cursor: null };
    case 'DataExportChunkQuery': return { sequence: 1 };
    case 'PackageSection': return section;
    case 'ResponsePackage': return responsePackage;
    case 'ResponsePackageList': return { items: [responsePackage], next_cursor: null };
    case 'OwnResponsePackage': return { request_id: uuid(981), version: 1, released_at: at, expires_at: at, downloads_remaining: 2, content_digest: 'c'.repeat(64), content: responsePackage.released_content, limits: ['Synthetic example.'] };
    case 'ClassifiedColumn': return classifiedColumn;
    case 'ExposureFinding': return exposureFinding;
    case 'ClassificationRun': return classificationRun;
    case 'ClassificationRunList': return { items: [classificationRun], next_cursor: null };
    case 'ClassificationLabelsRecord': return { labels: [{ column: 'contact_email', expected: 'EMAIL', basis: 'Reviewed against the application schema.' }] };
    case 'ClassificationLabelSet': return { target_id: uuid(991), labels: [{ column: 'contact_email', expected: 'EMAIL', basis: 'Reviewed against the application schema.', labelled_by: uuid(902), labelled_at: at }] };
    case 'ClassificationQuality': return quality;
    case 'ClassificationQualityList': return { items: [quality], next_cursor: null };
    case 'ExposureSummary': return exposure;
    case 'ExposureSummaryList': return { items: [exposure], next_cursor: null };
    case 'DeliveryTransportCreate': return { kind: 'SMTP', name: 'Customer relay', host: 'smtp.customer.example', port: 465, security: 'TLS', from_address: 'privacy@customer.example', credential_env: 'ORVIA_TRANSPORT_RELAY' };
    case 'DeliveryTransport': return transport;
    case 'DeliveryTransportList': return { items: [transport], next_cursor: null };
    case 'SigningSecret': return { transport_id: uuid(1000), secret: 'e'.repeat(64), algorithm: 'HMAC-SHA256', signed_content: 'X-Orvia-Timestamp + "." + request body', header: 'X-Orvia-Signature' };
    case 'AlertRoutingCreate': return { transport_id: uuid(1000), recipient: 'compliance@customer.example', kinds: ['DRIFT_TO_FAIL'], subject_prefix: '[ORVIA]' };
    case 'AlertRouting': return routing;
    case 'AlertRoutingList': return { items: [routing], next_cursor: null };
    case 'OutboundMessageCreate': return { transport_id: uuid(1000), source_kind: 'MANUAL', source_id: null, recipient: 'dpo@customer.example', subject: 'Synthetic notice', body: 'Synthetic message body for contract examples.' };
    case 'OutboundMessage': return outbound;
    case 'OutboundMessageList': return { items: [outbound], next_cursor: null };
    case 'CmpConfigDocument': return cmpDocument;
    case 'PreferenceTopicCreate': return { code: 'product_news', name: 'Product news', description: 'Occasional news about products you use.', channels: ['EMAIL', 'SMS'], purpose_id: null };
    case 'PreferenceTopic': return preferenceTopic;
    case 'PreferenceTopicList': return { items: [preferenceTopic], next_cursor: null };
    case 'PreferenceCentre': return { principal_id: uuid(1201), topics: [{ topic: preferenceTopic, consent: 'NOT_REQUIRED', channels: [{ channel: 'EMAIL', choice: 'NO_CHOICE', as_of: null, decision: { permitted: false, reason: 'NO_CHOICE', decided_at: at, event_id: null } }] }], history: [] };
    case 'CmpSiteCreate': return { name: 'Synthetic site', origins: ['https://www.customer.example'] };
    case 'CmpSite': return cmpSite;
    case 'CmpSiteList': return { items: [cmpSite], next_cursor: null };
    case 'CmpConfigCreate': return { document: cmpDocument };
    case 'CmpConfig': return cmpConfig;
    case 'CmpConfigList': return { items: [cmpConfig], next_cursor: null };
    case 'CmpConsentSubmit': return { visitor_id: uuid(1104), config_version: 1, choices: { necessary: true, analytics: false }, gpc: false, language: 'en' };
    case 'CmpScanRequest': return { url: 'https://www.customer.example/' };
    case 'CmpScan': return cmpScan;
    case 'CmpScanList': return { items: [cmpScan], next_cursor: null };
    default: return undefined;
  }
}
