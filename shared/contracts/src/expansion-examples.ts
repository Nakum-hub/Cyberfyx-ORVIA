/**
 * Contract examples for the expanded V1 families that the generic sampler cannot
 * build, because their schemas relate fields to each other. Synthetic contract
 * examples only; never a runtime fallback.
 */
const uuid = (n: number) => `00000000-0000-4000-8000-${n.toString(16).padStart(12, '0')}`;
const at = '2026-09-16T10:00:00.000Z';
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
    default: return undefined;
  }
}
