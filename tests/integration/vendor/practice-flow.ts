// Drives the audit practice (task AUDIT-PRACTICE-01) through the vendor HTTP
// surface for integration and browser tests: practice set-up, engagement
// acceptance, planning and the work programme, and per-requirement fieldwork.
// Synthetic data only; every call goes through the same routes staff use.
type Json = (path: string, body?: unknown) => Promise<{ status: number; data: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any -- test responses carry arbitrary fields
export type Session = { json: Json };
const V = '/api/v1/vendor';
export class FlowError extends Error {}
export async function ok(p: Promise<{ status: number; data: any }>, what: string, expected = [200, 201]) { // eslint-disable-line @typescript-eslint/no-explicit-any -- as above
  const r = await p; if (!expected.includes(r.status)) throw new FlowError(`${what}: ${r.status} ${JSON.stringify(r.data).slice(0, 400)}`); return r.data;
}

/** Approves criteria the 0.6.0 way: reads the retained evidence, then approves naming its digest, a review reference and the open items shown. */
export async function approveCriteria(approver: Session, id: string, review_reference = 'Synthetic review of the retained criteria evidence (automated test).') {
  const evidence = await ok(approver.json(`${V}/criteria/${id}/evidence`), 'read criteria evidence');
  return ok(approver.json(`${V}/criteria/${id}/approve`, { expected_digest: evidence.digest, review_reference, acknowledged_open_items_digest: evidence.open_items_digest }), 'approve criteria');
}

/** A 5x5 matrix rated by likelihood x impact: up to 4 LOW, up to 9 MEDIUM, up to 16 HIGH, above that CRITICAL. */
export const METHODOLOGY = (version = 'RM-TEST-1') => ({
  version,
  likelihood_scale: [1, 2, 3, 4, 5].map(value => ({ value, label: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'][value - 1], description: `Likelihood level ${value} (synthetic methodology).` })),
  impact_scale: [1, 2, 3, 4, 5].map(value => ({ value, label: ['Minimal', 'Minor', 'Moderate', 'Major', 'Severe'][value - 1], description: `Impact level ${value} on Data Principals (synthetic methodology).` })),
  matrix: [1, 2, 3, 4, 5].map(l => [1, 2, 3, 4, 5].map(i => { const s = l * i; return s <= 4 ? 'LOW' : s <= 9 ? 'MEDIUM' : s <= 16 ? 'HIGH' : 'CRITICAL'; })),
  residual_steps: { EFFECTIVE: 2, PARTIALLY_EFFECTIVE: 1, INEFFECTIVE: 0, NOT_ASSESSED: 0 },
  severity_rules: 'Severity follows the residual rating of the risk the finding evidences, raised one level where many Data Principals or a long duration are affected.',
  considerations: ['Number of Data Principals affected', 'Duration of the condition', 'Uncertainty in the evidence'],
});

/** Practice level: a TEST_FIXTURE criteria version and an approved methodology. Recorder and approver are different people. */
export async function setupPractice(recorder: Session, approver: Session, suffix = '1') {
  let state = await ok(recorder.json(`${V}/practice/criteria`, { version: `DPDP-FIXTURE-${suffix}` }), 'record criteria');
  const criteria = state.criteria.find((c: { version: string }) => c.version === `DPDP-FIXTURE-${suffix}`);
  await approveCriteria(approver, criteria.id);
  state = await ok(recorder.json(`${V}/practice/methodologies`, METHODOLOGY(`RM-TEST-${suffix}`)), 'record methodology');
  const methodology = state.methodologies.find((m: { version: string }) => m.version === `RM-TEST-${suffix}`);
  await ok(approver.json(`${V}/methodologies/${methodology.id}/approve`, {}), 'approve methodology');
  return { criteria_id: criteria.id as string, methodology_id: methodology.id as string };
}
export const ACCEPTANCE = {
  service_type: 'EVIDENCE_AUDIT', objectives: 'Form an evidence-based opinion on the scoped DPDP requirements for the audit period (synthetic).',
  intended_users: 'Board of the synthetic client organisation', client_responsibilities: 'Provide access to ORVIA evidence under the mandate and answer requests by their due dates.',
  auditor_responsibilities: 'Plan and perform procedures, evaluate evidence, and report findings and limitations independently.', confidentiality: 'Engagement records are kept on the vendor installation and purged after the retention period.',
  evidence_handling: 'Personal-data-free evidence over the audit channel; sealed packages only under a processing agreement.', scope_restrictions: null,
  competence: 'Lead auditor and reviewer trained on the DPDP Act and the ORVIA evidence model (synthetic).', sdf_applicability_basis: null, eligibility_evidence: null, licence_independence: true,
};
/** Engagement acceptance: configured by an administrator, prepared by an administrator, decided by the reviewer, independence declared by the lead. */
export async function acceptEngagement(o: { admin: Session; reviewer: Session; lead: Session; engagementId: string; criteria_id: string; methodology_id: string; commercial_owner_id?: string | null }) {
  await ok(o.admin.json(`${V}/engagements/${o.engagementId}/configure`, { use_kind: 'SYNTHETIC', criteria_version_id: o.criteria_id, methodology_id: o.methodology_id, commercial_owner_id: o.commercial_owner_id ?? null, implementation_owner_id: null }), 'configure');
  await ok(o.admin.json(`${V}/engagements/${o.engagementId}/acceptance`, ACCEPTANCE), 'prepare acceptance');
  await ok(o.reviewer.json(`${V}/engagements/${o.engagementId}/acceptance/decide`, { decision: 'ACCEPTED', rationale: 'No open conflicts; competence and terms are adequate for a synthetic engagement.' }), 'decide acceptance');
  const e = await ok(o.lead.json(`${V}/engagements/${o.engagementId}`), 'read engagement');
  if (!e.independence.declared) await ok(o.lead.json(`${V}/engagements/${o.engagementId}/independence`, { statement: 'The audit team is independent of the client organisation and holds no conflicting interest.', conflict_check: 'NO_CONFLICT', conflict_note: null, empanelment_reference: null }), 'independence');
}
export type PlanOptions = { lead: Session; auditor: Session; reviewer: Session; engagementId: string; requirements: string[]; period: { from: string; to: string }; leadId: string;
  nature?: Record<string, 'DESIGN' | 'IMPLEMENTATION' | 'OPERATING_EFFECTIVENESS'>; likelihood?: Record<string, number>; recordLevel?: Record<string, boolean> };
/** Understanding, applicability, scope, risk and the work programme, each reviewed by the engagement reviewer. Returns procedure ids by requirement. */
export async function planEngagement(o: PlanOptions) {
  let file = await ok(o.auditor.json(`${V}/engagements/${o.engagementId}/understanding`, { business_overview: 'Synthetic retailer processing customer contact and order data in India.', processing_activities: ['Marketing consent', 'Order fulfilment'],
    systems: ['ORVIA', 'CRM (synthetic)'], data_categories: ['Contact details'], third_parties: ['Delivery partner (synthetic)'], sdf_status: { status: 'NOT_NOTIFIED', source: 'Client statement; no Government notification found (synthetic)' }, prior_audits: null,
    existing_records: ['ORVIA RoPA export (synthetic)'] }), 'understanding');
  await ok(o.reviewer.json(`${V}/understanding/${file.understanding.at(-1).id}/review`, {}), 'review understanding');
  for (const r of o.requirements) {
    file = await ok(o.auditor.json(`${V}/engagements/${o.engagementId}/applicability`, { requirement_id: r, provision_ids: [], criterion_type: 'STATUTORY', applicability: 'APPLICABLE', effective_from: null,
      rationale: 'Consent is a ground of processing for the scoped activities (synthetic).', evidence_refs: ['Understanding v1'], unresolved_question: null }), `applicability ${r}`);
    await ok(o.reviewer.json(`${V}/applicability/${file.applicability.at(-1).id}/review`, {}), `review applicability ${r}`);
  }
  file = await ok(o.lead.json(`${V}/engagements/${o.engagementId}/scope`, { entities: ['Synthetic client (India)'], processes: ['Consent capture and withdrawal'], systems: ['ORVIA'], locations: ['India'], period_from: o.period.from, period_to: o.period.to,
    requirement_ids: o.requirements, exclusions: [], limitations: [], change_reason: null, impact_assessment: null }), 'scope');
  await ok(o.reviewer.json(`${V}/scope/${file.scope.at(-1).id}/approve`, {}), 'approve scope');
  const procedures: Record<string, string> = {};
  for (const r of o.requirements) {
    file = await ok(o.auditor.json(`${V}/engagements/${o.engagementId}/risks`, { requirement_id: r, risk: 'Consent may be relied on without the itemised notice or a working withdrawal (synthetic).', likelihood: o.likelihood?.[r] ?? 2, impact: 3,
      affected_people: 'Customers giving marketing consent', affected_scope: 'Marketing activities', duration: 'Whole audit period', uncertainty: 'Moderate; evidence is system-generated', control_reference: 'ORVIA consent controls', control_effectiveness: 'NOT_ASSESSED',
      rationale: 'Likelihood and impact from the understanding and prior control tests (synthetic).' }), `risk ${r}`);
    const risk = file.risks.at(-1);
    await ok(o.reviewer.json(`${V}/risks/${risk.id}/review`, {}), `review risk ${r}`);
    const nature = o.nature?.[r] ?? 'DESIGN';
    file = await ok(o.lead.json(`${V}/engagements/${o.engagementId}/procedures`, { requirement_id: r, provision_ids: [], risk_assessment_id: risk.id, control_reference: 'ORVIA consent controls', objective: `Test the ${nature.toLowerCase().replaceAll('_', ' ')} of the control for ${r}.`,
      procedure_type: nature === 'OPERATING_EFFECTIVENESS' ? 'REPERFORMANCE' : 'INSPECTION', test_nature: nature, requires_record_level: o.recordLevel?.[r] ?? false, owner_id: o.leadId, planned_start: o.period.from, planned_end: o.period.to, depends_on: [],
      evidence_expectation: 'Published notice versions and consent evidence for sampled activities.', completion_criteria: 'Working paper reviewed with a conclusion supported by evaluated evidence.', retest_of_finding_id: null }), `procedure ${r}`);
    procedures[r] = file.procedures.at(-1).id;
  }
  file = await ok(o.reviewer.json(`${V}/engagements/${o.engagementId}/plan/approve`, {}), 'approve plan');
  return { procedures, file };
}
/** Registers and evaluates one piece of evidence for a procedure; returns its id. */
export async function evidenceFor(o: { auditor: Session; engagementId: string; procedureId: string; register: unknown; sufficient?: boolean; reliability?: 'HIGH' | 'MEDIUM' | 'LOW'; contradicts?: boolean }) {
  const file = await ok(o.auditor.json(`${V}/engagements/${o.engagementId}/evidence`, o.register), 'register evidence');
  const evidence = file.evidence.at(-1);
  await ok(o.auditor.json(`${V}/evidence/${evidence.id}/evaluations`, { procedure_id: o.procedureId, relevance: 'RELEVANT', reliability: o.reliability ?? 'MEDIUM', sufficiency: o.sufficient === false ? 'INSUFFICIENT' : 'SUFFICIENT',
    contradicts: o.contradicts ?? false, rationale: 'Evaluated against the procedure objective (synthetic).' }), 'evaluate evidence');
  return evidence.id as string;
}
/** A working paper by the preparer, reviewed by the reviewer; returns the paper id. */
export async function paper(o: { preparer: Session; reviewer: Session; procedureId: string; conclusion: string; evidence: string[]; exceptions?: number; population_id?: string | null; review?: boolean }) {
  const file = await ok(o.preparer.json(`${V}/procedures/${o.procedureId}/working-papers`, { performed: 'Inspected the evidence listed against the procedure objective (synthetic).', criteria: 'Requirement statement in the engagement criteria.',
    population_id: o.population_id ?? null, results: o.conclusion === 'EFFECTIVE' ? 'No exceptions found.' : 'Exceptions found as described.', exceptions: o.exceptions ?? (o.conclusion === 'EXCEPTIONS_NOTED' ? 1 : 0),
    exception_details: (o.exceptions ?? (o.conclusion === 'EXCEPTIONS_NOTED' ? 1 : 0)) > 0 ? 'One system without read-back verification (synthetic).' : null, conclusion: o.conclusion, evidence_ids: o.evidence }), 'working paper');
  const wp = file.working_papers.filter((w: { procedure_id: string }) => w.procedure_id === o.procedureId).at(-1);
  if (o.review !== false) await ok(o.reviewer.json(`${V}/working-papers/${wp.id}/review`, {}), 'review working paper');
  return wp.id as string;
}
