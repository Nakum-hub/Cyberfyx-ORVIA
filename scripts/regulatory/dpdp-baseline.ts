/**
 * DPDP baseline regulatory package content (vendor-side authoring input).
 *
 * Authority (regulatory/REGULATORY_SOURCE_SET.md): only official Government of
 * India publications. Every requirement below cites provisions of the Digital
 * Personal Data Protection Act, 2023 (Act No. 22 of 2023) or the Digital Personal
 * Data Protection Rules, 2025 (G.S.R. 846(E)), and its effective date follows the
 * commencement notification G.S.R. 843(E) and Rule 1 of the Rules.
 *
 * Statements are operational paraphrases, not the statutory text. The executable
 * package is produced only by scripts/regulatory-package.ts, which refuses to
 * build a PRODUCTION package until every source artifact below has been
 * retrieved from its official URL and hashed.
 */
export const PUBLICATION_DATE = '2025-11-13';
/** Rule 1 and G.S.R. 843(E): one year and eighteen months after publication. */
export const ONE_YEAR_AFTER = '2026-11-13';
export const EIGHTEEN_MONTHS_AFTER = '2027-05-13';

export const officialSources = [
  { source_id: 'DPDP-ACT-2023', source_type: 'ACT', publisher: 'Ministry of Electronics and Information Technology, Government of India',
    title: 'The Digital Personal Data Protection Act, 2023 (No. 22 of 2023)', official_url: 'https://www.meity.gov.in/static/uploads/2024/06/2bf1f0e9f04e6fb4f8fef35e82c42aa5.pdf',
    notification_reference: 'Act No. 22 of 2023', publication_date: '2023-08-11', supersedes: null, corrects: null },
  { source_id: 'GSR-843E-2025', source_type: 'COMMENCEMENT_NOTIFICATION', publisher: 'Ministry of Electronics and Information Technology, Government of India',
    title: 'Notification under section 1(2) of the Digital Personal Data Protection Act, 2023 appointing commencement dates', official_url: 'https://www.meity.gov.in/static/uploads/2025/11/c56ceae6c383460ca69577428d36828b.pdf',
    notification_reference: 'G.S.R. 843(E)', publication_date: PUBLICATION_DATE, supersedes: null, corrects: null },
  { source_id: 'GSR-844E-2025', source_type: 'BOARD_NOTIFICATION', publisher: 'Ministry of Electronics and Information Technology, Government of India',
    title: 'Notification under section 18 of the Digital Personal Data Protection Act, 2023 establishing the Data Protection Board of India', official_url: 'https://www.meity.gov.in/static/uploads/2025/11/cc217843dc3bcb37b2b05bcc3b4e031f.pdf',
    notification_reference: 'G.S.R. 844(E)', publication_date: PUBLICATION_DATE, supersedes: null, corrects: null },
  { source_id: 'DPDP-RULES-2025', source_type: 'RULES', publisher: 'Ministry of Electronics and Information Technology, Government of India',
    title: 'The Digital Personal Data Protection Rules, 2025', official_url: 'https://www.meity.gov.in/static/uploads/2025/11/53450e6e5dc0bfa85ebd78686cadad39.pdf',
    notification_reference: 'G.S.R. 846(E)', publication_date: PUBLICATION_DATE, supersedes: null, corrects: null },
] as const;

const act = (id: string, reference: string, commences: string) => ({ provision_id: `ACT-${id}`, source_id: 'DPDP-ACT-2023', reference: `Digital Personal Data Protection Act, 2023, ${reference}`, commences_on: commences,
  commencement_basis: `G.S.R. 843(E) appoints ${commences} for this provision.` });
const rule = (id: string, reference: string, commences: string) => ({ provision_id: `RULES-${id}`, source_id: 'DPDP-RULES-2025', reference: `Digital Personal Data Protection Rules, 2025, ${reference}`, commences_on: commences,
  commencement_basis: `Rule 1 of the Rules: ${commences === PUBLICATION_DATE ? 'in force on publication' : commences === ONE_YEAR_AFTER ? 'one year after publication' : 'eighteen months after publication'}.` });
export const provisions = [
  act('S4', 'section 4 (grounds for processing personal data)', EIGHTEEN_MONTHS_AFTER),
  act('S5(1)', 'section 5(1) (notice before or with a request for consent)', EIGHTEEN_MONTHS_AFTER),
  act('S5(2)', 'section 5(2) (notice where consent was given before commencement)', EIGHTEEN_MONTHS_AFTER),
  act('S6(1)', 'section 6(1) (free, specific, informed, unconditional and unambiguous consent)', EIGHTEEN_MONTHS_AFTER),
  act('S6(4)', 'section 6(4) (right to withdraw consent with comparable ease)', EIGHTEEN_MONTHS_AFTER),
  act('S6(6)', 'section 6(6) (cessation of processing on withdrawal, including by processors)', EIGHTEEN_MONTHS_AFTER),
  act('S7', 'section 7 (certain legitimate uses)', EIGHTEEN_MONTHS_AFTER),
  act('S8(2)', 'section 8(2) (engaging a Data Processor only under a valid contract)', EIGHTEEN_MONTHS_AFTER),
  act('S8(3)', 'section 8(3) (completeness, accuracy and consistency)', EIGHTEEN_MONTHS_AFTER),
  act('S8(5)', 'section 8(5) (reasonable security safeguards)', EIGHTEEN_MONTHS_AFTER),
  act('S8(6)', 'section 8(6) (intimation of personal data breach)', EIGHTEEN_MONTHS_AFTER),
  act('S8(7)', 'section 8(7) (erasure when consent is withdrawn or the purpose is no longer served)', EIGHTEEN_MONTHS_AFTER),
  act('S8(8)', 'section 8(8) (specified purpose deemed no longer served)', EIGHTEEN_MONTHS_AFTER),
  act('S8(9)', 'section 8(9) (business contact information)', EIGHTEEN_MONTHS_AFTER),
  act('S8(10)', 'section 8(10) (effective grievance redressal mechanism)', EIGHTEEN_MONTHS_AFTER),
  act('S9(1)', 'section 9(1) (verifiable consent of the parent or lawful guardian)', EIGHTEEN_MONTHS_AFTER),
  act('S9(3)', 'section 9(3) (no tracking, behavioural monitoring or targeted advertising directed at children)', EIGHTEEN_MONTHS_AFTER),
  act('S10(2)', 'section 10(2) (additional obligations of a Significant Data Fiduciary)', EIGHTEEN_MONTHS_AFTER),
  act('S11', 'section 11 (right to access information about personal data)', EIGHTEEN_MONTHS_AFTER),
  act('S12', 'section 12 (right to correction and erasure)', EIGHTEEN_MONTHS_AFTER),
  act('S13', 'section 13 (right of grievance redressal)', EIGHTEEN_MONTHS_AFTER),
  act('S14', 'section 14 (right to nominate)', EIGHTEEN_MONTHS_AFTER),
  act('S16', 'section 16 (processing outside India)', EIGHTEEN_MONTHS_AFTER),
  act('S18', 'section 18 (establishment of the Data Protection Board of India)', PUBLICATION_DATE),
  rule('R3', 'rule 3 (notice given by a Data Fiduciary to a Data Principal)', EIGHTEEN_MONTHS_AFTER),
  rule('R6', 'rule 6 (reasonable security safeguards)', EIGHTEEN_MONTHS_AFTER),
  rule('R7(1)', 'rule 7(1) (intimation of breach to each affected Data Principal)', EIGHTEEN_MONTHS_AFTER),
  rule('R7(2)(a)', 'rule 7(2)(a) (intimation of breach to the Board without delay)', EIGHTEEN_MONTHS_AFTER),
  rule('R7(2)(b)', 'rule 7(2)(b) (detailed information to the Board within seventy-two hours)', EIGHTEEN_MONTHS_AFTER),
  rule('R8(1)', 'rule 8(1) and the Third Schedule (time period for specified purpose to be deemed no longer served)', EIGHTEEN_MONTHS_AFTER),
  rule('R8(3)', 'rule 8(3) (minimum retention of personal data, traffic data and logs for one year)', EIGHTEEN_MONTHS_AFTER),
  rule('R9', 'rule 9 (contact information of the person able to answer questions)', EIGHTEEN_MONTHS_AFTER),
  rule('R10', 'rule 10 (verifiable consent for processing personal data of a child)', EIGHTEEN_MONTHS_AFTER),
  rule('R13', 'rule 13 (additional obligations of a Significant Data Fiduciary)', EIGHTEEN_MONTHS_AFTER),
  rule('R14', 'rule 14 (rights of Data Principals, grievance redressal period and nomination)', EIGHTEEN_MONTHS_AFTER),
  rule('R15', 'rule 15 (transfer of personal data outside the territory of India)', EIGHTEEN_MONTHS_AFTER),
  { provision_id: 'GSR-844E', source_id: 'GSR-844E-2025', reference: 'G.S.R. 844(E): establishment of the Data Protection Board of India', commences_on: PUBLICATION_DATE, commencement_basis: 'Effective from the date of publication of the notification.' },
];

const CONSENT = { fact: 'activity.condition_code', equals: 'CONSENT' } as const;
const SDF = { fact: 'organisation.sdf_status', equals: 'DESIGNATED' } as const;
const CHILD = { fact: 'activity.processes_child_data', equals: true } as const;
const LEGITIMATE_USES = ['S7_A_VOLUNTARY_PROVISION', 'S7_B_STATE_BENEFIT', 'S7_C_STATE_FUNCTION', 'S7_D_LEGAL_OBLIGATION_TO_DISCLOSE', 'S7_E_JUDGMENT_OR_ORDER',
  'S7_F_MEDICAL_EMERGENCY', 'S7_G_EPIDEMIC', 'S7_H_DISASTER', 'S7_I_EMPLOYMENT'];
const none = { breach_task_kind: null, sdf_obligation_kind: null, rights_timer_scope: [] as string[] };
const tests = (...names: string[]) => names.map(name => `tests/integration/operations/${name}.test.ts`);

export const requirements = [
  { requirement_id: 'DPDP-NOTICE-CONSENT-REQUEST', title: 'Itemised notice with every request for consent', provision_ids: ['ACT-S5(1)', 'RULES-R3'],
    statement: 'Where consent is the ground, give the Data Principal a notice, understandable independently of other information, itemising the personal data and purposes and the means to withdraw, exercise rights and complain to the Board, before or at the time of requesting consent.',
    applicability: CONSENT, evidence_expectations: ['Published notice version linked to the activity', 'Notice delivery evidence per Data Principal or population'], modules: ['NOTICES', 'CONSENT'], timer: { kind: 'NONE' }, ...none, test_refs: tests('notices') },
  { requirement_id: 'DPDP-NOTICE-LEGACY-CONSENT', title: 'Notice for consent given before commencement', provision_ids: ['ACT-S5(2)'],
    statement: 'Where a Data Principal gave consent before the commencement of the Act, give the notice as soon as reasonably practicable; processing may continue until consent is withdrawn.',
    applicability: CONSENT, evidence_expectations: ['Notice delivery evidence for existing consent holders, or a recorded evidence gap'], modules: ['NOTICES', 'CONSENT'], timer: { kind: 'NONE' }, ...none, test_refs: tests('estate-import') },
  { requirement_id: 'DPDP-CONSENT-VALIDITY', title: 'Valid consent and withdrawal with comparable ease', provision_ids: ['ACT-S6(1)', 'ACT-S6(4)'],
    statement: 'Consent must be free, specific, informed, unconditional and unambiguous with a clear affirmative action, limited to the necessary personal data, and withdrawable with ease comparable to giving it.',
    applicability: CONSENT, evidence_expectations: ['Consent event history with notice version', 'Withdrawal channel on the notice'], modules: ['CONSENT'], timer: { kind: 'NONE' }, ...none, test_refs: tests('consent-withdrawal') },
  { requirement_id: 'DPDP-CONSENT-WITHDRAWAL-CESSATION', title: 'Cease processing after withdrawal, including through processors', provision_ids: ['ACT-S6(6)'],
    statement: 'On withdrawal of consent, the Data Fiduciary and its Data Processors must cease processing the personal data within a reasonable time, unless processing without consent is required or authorised under the Act or other law.',
    applicability: CONSENT, evidence_expectations: ['Withdrawal propagation run with per-system outcomes', 'Independent verification of suppression'], modules: ['CONSENT', 'PROCESSORS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('consent-withdrawal') },
  { requirement_id: 'DPDP-LEGITIMATE-USES', title: 'Processing for a certain legitimate use', provision_ids: ['ACT-S4', 'ACT-S7'],
    statement: 'Processing without consent is lawful only for one of the legitimate uses the Act lists; the use relied on must be recorded for the activity.',
    applicability: { fact: 'activity.condition_code', in: LEGITIMATE_USES }, evidence_expectations: ['Processing condition with justification reference'], modules: ['CONDITIONS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('applicability') },
  { requirement_id: 'DPDP-PROCESSOR-CONTRACT', title: 'Processors engaged only under a valid contract', provision_ids: ['ACT-S8(2)'],
    statement: 'A Data Processor may process personal data on behalf of the Data Fiduciary only under a valid contract.',
    applicability: { fact: 'activity.has_processor', equals: true }, evidence_expectations: ['Contract evidence reference on the processor engagement'], modules: ['PROCESSORS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('processors') },
  { requirement_id: 'DPDP-ACCURACY', title: 'Accuracy where data is used for a decision or disclosed', provision_ids: ['ACT-S8(3)'],
    statement: 'Ensure completeness, accuracy and consistency of personal data used to make a decision affecting the Data Principal or disclosed to another Data Fiduciary.',
    applicability: { always: true }, evidence_expectations: ['Correction propagation with independent verification'], modules: ['RIGHTS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('correction') },
  { requirement_id: 'DPDP-SECURITY-SAFEGUARDS', title: 'Reasonable security safeguards', provision_ids: ['ACT-S8(5)', 'RULES-R6'],
    statement: 'Protect personal data in the Data Fiduciary\'s possession or control, including processing by processors, by reasonable security safeguards to prevent a personal data breach.',
    applicability: { always: true }, evidence_expectations: ['Safeguard records with available evidence, never an unevidenced implemented status'], modules: ['SAFEGUARDS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('registry') },
  { requirement_id: 'DPDP-BREACH-PRINCIPAL-INTIMATION', title: 'Intimate each affected Data Principal of a breach without delay', provision_ids: ['ACT-S8(6)', 'RULES-R7(1)'],
    statement: 'On becoming aware of a personal data breach, intimate each affected Data Principal without delay, describing the breach, its likely consequences, mitigation, safety measures they may take and a contact.',
    applicability: { always: true }, evidence_expectations: ['Communication evidence reference per intimation'], modules: ['BREACH'], timer: { kind: 'WITHOUT_DELAY', runs_from: 'AWARENESS' },
    breach_task_kind: 'PRINCIPAL_INTIMATION', sdf_obligation_kind: null, rights_timer_scope: [], test_refs: tests('breach') },
  { requirement_id: 'DPDP-BREACH-BOARD-INTIMATION', title: 'Intimate the Board of a breach without delay', provision_ids: ['ACT-S8(6)', 'RULES-R7(2)(a)'],
    statement: 'On becoming aware of a personal data breach, intimate the Board without delay with a description of the breach including its nature, extent, timing, location and likely impact.',
    applicability: { always: true }, evidence_expectations: ['Board intimation reference and time'], modules: ['BREACH'], timer: { kind: 'WITHOUT_DELAY', runs_from: 'AWARENESS' },
    breach_task_kind: 'BOARD_INTIMATION', sdf_obligation_kind: null, rights_timer_scope: [], test_refs: tests('breach') },
  { requirement_id: 'DPDP-BREACH-BOARD-REPORT', title: 'Detailed breach information to the Board within 72 hours', provision_ids: ['RULES-R7(2)(b)'],
    statement: 'Within seventy-two hours of becoming aware of a breach, or a longer period the Board allows on request, give the Board updated and detailed information including facts, mitigation, findings about the cause, remedial measures and a report on intimations given to Data Principals.',
    applicability: { always: true }, evidence_expectations: ['Detailed report reference and submission time', 'Any Board-allowed extension recorded as evidence'], modules: ['BREACH'], timer: { kind: 'HOURS', runs_from: 'AWARENESS', hours: 72 },
    breach_task_kind: 'BOARD_DETAILED_REPORT', sdf_obligation_kind: null, rights_timer_scope: [], test_refs: tests('breach') },
  { requirement_id: 'DPDP-ERASURE-PURPOSE-SERVED', title: 'Erase when consent is withdrawn or the purpose is no longer served', provision_ids: ['ACT-S8(7)'],
    statement: 'Unless retention is necessary for compliance with any law, erase personal data and cause processors to erase it once consent is withdrawn or it is reasonable to assume the specified purpose is no longer served, whichever is earlier.',
    applicability: { always: true }, evidence_expectations: ['Retention evaluation with holds honoured', 'Erasure actions independently verified'], modules: ['RETENTION', 'PROCESSORS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('retention-scale') },
  { requirement_id: 'DPDP-RETENTION-THIRD-SCHEDULE', title: 'Deemed end of purpose for Third Schedule classes', provision_ids: ['ACT-S8(8)', 'RULES-R8(1)'],
    statement: 'For the classes of Data Fiduciary and purposes in the Third Schedule, the specified purpose is deemed no longer served when the Data Principal has not approached the Data Fiduciary for the period that Schedule sets.',
    applicability: { fact: 'organisation.third_schedule_class', in: ['E_COMMERCE_ENTITY', 'ONLINE_GAMING_INTERMEDIARY', 'SOCIAL_MEDIA_INTERMEDIARY'] },
    evidence_expectations: ['Retention rule citing this requirement with the period configured by the customer from the Schedule'], modules: ['RETENTION'], timer: { kind: 'NONE' }, ...none, test_refs: tests('applicability') },
  { requirement_id: 'DPDP-LOG-RETENTION-MINIMUM', title: 'Minimum one-year retention of processing logs', provision_ids: ['RULES-R8(3)'],
    statement: 'Retain personal data, associated traffic data and other logs related to processing for a minimum of one year from the processing, for the purposes the Rules specify, after which they may be erased unless another law requires otherwise.',
    applicability: { always: true }, evidence_expectations: ['An official-exemption hold citing this requirement over the log stores it covers'], modules: ['RETENTION'], timer: { kind: 'NONE' }, ...none, test_refs: tests('retention-scale') },
  { requirement_id: 'DPDP-CONTACT-PUBLICATION', title: 'Publish the contact able to answer questions', provision_ids: ['ACT-S8(9)', 'RULES-R9'],
    statement: 'Publish the business contact information of the Data Protection Officer, where applicable, or a person able to answer questions about processing, and state it in every response to a Data Principal.',
    applicability: { always: true }, evidence_expectations: ['DPO or grievance contact on the organisation profile'], modules: ['CONTACT'], timer: { kind: 'NONE' }, ...none, test_refs: tests('sdf') },
  { requirement_id: 'DPDP-GRIEVANCE-RESPONSE', title: 'Respond to grievances within the published period, not exceeding 90 days', provision_ids: ['ACT-S8(10)', 'ACT-S13', 'RULES-R14'],
    statement: 'Maintain an effective grievance redressal mechanism and respond to grievances within the period published under it, which may not exceed ninety days.',
    applicability: { always: true }, evidence_expectations: ['Grievance case with due time and closure evidence'], modules: ['GRIEVANCE'], timer: { kind: 'HOURS', runs_from: 'RECEIPT', hours: 2160 },
    breach_task_kind: null, sdf_obligation_kind: null, rights_timer_scope: ['GRIEVANCE'], test_refs: tests('rights') },
  { requirement_id: 'DPDP-RIGHTS-MEANS', title: 'Publish the means and particulars for exercising rights', provision_ids: ['RULES-R14'],
    statement: 'Publish on the website or app the means by which a Data Principal may make a request to exercise rights and the particulars, such as identifiers, needed to identify them.',
    applicability: { always: true }, evidence_expectations: ['Rights channel on every published notice'], modules: ['RIGHTS', 'NOTICES'], timer: { kind: 'NONE' }, ...none, test_refs: tests('notices') },
  { requirement_id: 'DPDP-RIGHT-ACCESS', title: 'Access to a summary of processing and sharing', provision_ids: ['ACT-S11'],
    statement: 'On request, provide a summary of the personal data processed and the processing activities, and the identities of all Data Fiduciaries and Data Processors it was shared with, with a description of what was shared.',
    applicability: { always: true }, evidence_expectations: ['Rights run using the data-sharing register', 'Released response reference'], modules: ['RIGHTS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('rights') },
  { requirement_id: 'DPDP-RIGHT-CORRECTION-ERASURE', title: 'Correction, completion, updating and erasure on request', provision_ids: ['ACT-S12'],
    statement: 'On request, correct inaccurate or misleading personal data, complete incomplete data, update it, and erase data no longer necessary for the purpose unless retention is necessary for a specified purpose or for compliance with law.',
    applicability: { always: true }, evidence_expectations: ['Per-system outcomes with independent verification', 'Holds honoured and visible'], modules: ['RIGHTS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('rights', 'correction') },
  { requirement_id: 'DPDP-RIGHT-NOMINATION', title: 'Nomination of another individual', provision_ids: ['ACT-S14', 'RULES-R14'],
    statement: 'Let a Data Principal nominate an individual to exercise their rights in the event of death or incapacity, using the means the Data Fiduciary publishes.',
    applicability: { always: true }, evidence_expectations: ['Nomination record with authority evidence and verification'], modules: ['RIGHTS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('registry') },
  { requirement_id: 'DPDP-CHILD-VERIFIABLE-CONSENT', title: 'Verifiable consent of a parent before processing a child\'s data', provision_ids: ['ACT-S9(1)', 'RULES-R10'],
    statement: 'Before processing a child\'s personal data, obtain the verifiable consent of the parent, with due diligence that the person identifying as the parent is an identifiable adult, subject to the exemptions the Rules provide.',
    applicability: CHILD, evidence_expectations: ['Child status record with verified guardian and verifiable consent evidence'], modules: ['CHILDREN'], timer: { kind: 'NONE' }, ...none, test_refs: tests('registry') },
  { requirement_id: 'DPDP-CHILD-NO-TRACKING', title: 'No tracking, behavioural monitoring or targeted advertising directed at children', provision_ids: ['ACT-S9(3)'],
    statement: 'Do not undertake tracking or behavioural monitoring of children or targeted advertising directed at children, subject to the exemptions the Rules provide.',
    applicability: CHILD, evidence_expectations: ['Activity review record'], modules: ['CHILDREN'], timer: { kind: 'NONE' }, ...none, test_refs: tests('registry') },
  { requirement_id: 'DPDP-SDF-DPO', title: 'Significant Data Fiduciary: Data Protection Officer based in India', provision_ids: ['ACT-S10(2)'],
    statement: 'A Significant Data Fiduciary appoints a Data Protection Officer based in India, responsible to its board and the point of contact for grievance redressal.',
    applicability: SDF, evidence_expectations: ['Appointment evidence'], modules: ['SDF'], timer: { kind: 'NONE' }, breach_task_kind: null, sdf_obligation_kind: 'DPO_APPOINTMENT', rights_timer_scope: [], test_refs: tests('sdf') },
  { requirement_id: 'DPDP-SDF-AUDITOR', title: 'Significant Data Fiduciary: independent data auditor', provision_ids: ['ACT-S10(2)'],
    statement: 'A Significant Data Fiduciary appoints an independent data auditor to evaluate its compliance.',
    applicability: SDF, evidence_expectations: ['Auditor appointment evidence'], modules: ['SDF'], timer: { kind: 'NONE' }, breach_task_kind: null, sdf_obligation_kind: 'INDEPENDENT_AUDITOR_APPOINTMENT', rights_timer_scope: [], test_refs: tests('sdf') },
  { requirement_id: 'DPDP-SDF-DPIA', title: 'Significant Data Fiduciary: Data Protection Impact Assessment every twelve months', provision_ids: ['ACT-S10(2)', 'RULES-R13'],
    statement: 'A Significant Data Fiduciary undertakes a Data Protection Impact Assessment once in every period of twelve months and furnishes the significant observations to the Board.',
    applicability: SDF, evidence_expectations: ['Assessment report reference per period'], modules: ['SDF'], timer: { kind: 'HOURS', runs_from: 'DESIGNATION', hours: 8760 },
    breach_task_kind: null, sdf_obligation_kind: 'PERIODIC_DPIA', rights_timer_scope: [], test_refs: tests('sdf') },
  { requirement_id: 'DPDP-SDF-AUDIT', title: 'Significant Data Fiduciary: audit every twelve months', provision_ids: ['ACT-S10(2)', 'RULES-R13'],
    statement: 'A Significant Data Fiduciary has an audit carried out once in every period of twelve months and furnishes the significant observations to the Board.',
    applicability: SDF, evidence_expectations: ['Audit report reference per period'], modules: ['SDF'], timer: { kind: 'HOURS', runs_from: 'DESIGNATION', hours: 8760 },
    breach_task_kind: null, sdf_obligation_kind: 'PERIODIC_AUDIT', rights_timer_scope: [], test_refs: tests('sdf') },
  { requirement_id: 'DPDP-SDF-ALGORITHMIC-DILIGENCE', title: 'Significant Data Fiduciary: due diligence on algorithmic software', provision_ids: ['RULES-R13'],
    statement: 'A Significant Data Fiduciary observes due diligence to verify that algorithmic software it deploys for processing personal data is not likely to pose a risk to the rights of Data Principals.',
    applicability: SDF, evidence_expectations: ['Due diligence record'], modules: ['SDF'], timer: { kind: 'NONE' }, breach_task_kind: null, sdf_obligation_kind: 'ALGORITHMIC_DUE_DILIGENCE', rights_timer_scope: [], test_refs: tests('sdf') },
  { requirement_id: 'DPDP-SDF-TRANSFER-RESTRICTION', title: 'Significant Data Fiduciary: specified data kept within India', provision_ids: ['RULES-R13'],
    statement: 'A Significant Data Fiduciary takes measures to ensure that personal data the Central Government specifies, on the recommendation of its committee, is processed subject to the restriction that it and its traffic data are not transferred outside India.',
    applicability: SDF, evidence_expectations: ['Review record against any categories the Central Government has specified'], modules: ['SDF', 'TRANSFERS'], timer: { kind: 'NONE' }, breach_task_kind: null, sdf_obligation_kind: 'TRANSFER_RESTRICTION_REVIEW', rights_timer_scope: [], test_refs: tests('sdf') },
  { requirement_id: 'DPDP-CROSS-BORDER', title: 'Transfers outside India subject to Central Government restriction', provision_ids: ['ACT-S16', 'RULES-R15'],
    statement: 'Personal data may be transferred outside India except to a country or territory the Central Government restricts by notification, and subject to requirements it specifies by order. This package carries no such notification or order.',
    applicability: { always: true }, evidence_expectations: ['Data-sharing register entries identifying recipients and systems'], modules: ['TRANSFERS'], timer: { kind: 'NONE' }, ...none, test_refs: tests('processors') },
  { requirement_id: 'DPDP-BOARD-COMPLAINT-CHANNEL', title: 'Data Protection Board of India established', provision_ids: ['ACT-S18', 'GSR-844E'],
    statement: 'The Data Protection Board of India is established; notices must give the manner in which a Data Principal may make a complaint to it.',
    applicability: { always: true }, evidence_expectations: ['Board complaint channel on every published notice'], modules: ['NOTICES'], timer: { kind: 'NONE' }, ...none, test_refs: tests('notices') },
];

export const conditionVocabulary = [
  { code: 'CONSENT', label: 'Consent of the Data Principal (sections 4 and 6)', requirement_ids: ['DPDP-CONSENT-VALIDITY', 'DPDP-NOTICE-CONSENT-REQUEST'] },
  ...LEGITIMATE_USES.map(code => ({ code, label: `Certain legitimate use, section 7(${code.split('_')[1]!.toLowerCase()})`, requirement_ids: ['DPDP-LEGITIMATE-USES'] })),
];

/** Items the approving reviewer must see before approving, carried inside the signed package. */
export const openVerificationItems = [
  'Publication date: the Gazette masthead reads 13 November 2025 while the PIB release and the eGazette document code indicate 14 November 2025; commencement dates here are computed from 13 November 2025 and must be confirmed against the Gazette.',
  'Corrigendum G.S.R. 892(E) to the Rules (reported as amending rule 1 wording and the Fourth Schedule) was not retrieved from an official host and is not included; its effect must be checked before approval.',
  'The Third Schedule periods and the Fourth Schedule child-data exemptions are not encoded as executable durations or exemptions; a customer rule or exemption must cite them explicitly.',
];
