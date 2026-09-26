// EX06 general impact assessments through the real HTTP boundary.
// Under test: versioned templates published by someone other than the author;
// required answers and evidence enforced at submission; answer rules raising
// findings; unresolved findings blocking approval; an independent approver; risk
// acceptance by a second person with an expiry; retest as a new revision that
// supersedes the predecessor only when approved; idempotent escalation;
// append-only history at the database; tenant isolation and read-only roles.
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('impact-assessments');
const { h, check, ok, codes, db } = t;
const Detail = S.schemas.ImpactAssessmentDetail;

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const questions = [
    { key: 'shares_data', text: 'Is personal data shared with a third party?', answer_type: 'YES_NO', choices: [], required: true, evidence_required: true, finding_when: 'YES', finding_severity: 'HIGH', guidance: null },
    { key: 'purpose', text: 'Describe the purpose of processing.', answer_type: 'TEXT', choices: [], required: true, evidence_required: false, finding_when: null, finding_severity: null, guidance: null },
    { key: 'volume', text: 'How many people are affected?', answer_type: 'CHOICE', choices: ['Small', 'Large'], required: false, evidence_required: false, finding_when: 'Large', finding_severity: 'LOW', guidance: null },
  ];
  const templateBody = (template_key: string | null = null) => ({ template_key, kind: 'DPIA', name: unique('Synthetic DPIA'), description: 'Synthetic DPIA template for validation.', questions, requirement_ids: [], review_interval_days: 180 });

  t.setPhase('templates');
  check('a question rule must trigger on a valid answer', (await admin.call('/api/v1/admin/impact-templates', { ...templateBody(), questions: [{ ...questions[0], finding_when: 'MAYBE' }] }, key())).status, 400);
  const template = await ok(admin.call('/api/v1/admin/impact-templates', templateBody(), key()), S.schemas.ImpactTemplate);
  check('a new template starts as a draft, version 1', [template.status, template.version], ['DRAFT', 1]);
  check('an organisation admin cannot publish', (await admin.call(`/api/v1/admin/impact-templates/${template.id}/publication`, { action: 'PUBLISH' }, key())).status, 403);
  const draftAssessment = await codes(admin.call('/api/v1/admin/impact-assessments', { template_id: template.id, subject_kind: 'ORGANISATION', subject_id: null, title: 'Too early', owner_reference: 'Privacy team', due_at: hoursFromNow(24 * 14) }, key()));
  check('an assessment cannot use a draft template', draftAssessment, { status: 409, codes: ['template_not_published'] });
  const published = await ok(owner.call(`/api/v1/admin/impact-templates/${template.id}/publication`, { action: 'PUBLISH' }, key()), S.schemas.ImpactTemplate);
  check('a super admin who did not author it publishes it', [published.status, published.published_by !== published.recorded_by], ['PUBLISHED', true]);
  const own = await ok(owner.call('/api/v1/admin/impact-templates', templateBody(), key()), S.schemas.ImpactTemplate);
  check('the author cannot publish their own template', await codes(owner.call(`/api/v1/admin/impact-templates/${own.id}/publication`, { action: 'PUBLISH' }, key())), { status: 409, codes: ['author_cannot_publish'] });
  const v2 = await ok(admin.call('/api/v1/admin/impact-templates', templateBody(template.template_key), key()), S.schemas.ImpactTemplate);
  check('the same key records the next version', [v2.template_key, v2.version], [template.template_key, 2]);
  check('a template keeps its kind across versions', await codes(admin.call('/api/v1/admin/impact-templates', { ...templateBody(template.template_key), kind: 'PIA' }, key())), { status: 409, codes: ['a_template_keeps_its_kind'] });

  t.setPhase('assessment and submission');
  check('an assessment of a missing subject is refused', (await admin.call('/api/v1/admin/impact-assessments', { template_id: template.id, subject_kind: 'ACTIVITY', subject_id: '00000000-0000-4000-8000-000000000999', title: 'Missing subject', owner_reference: 'Privacy team', due_at: hoursFromNow(24 * 14) }, key())).status, 404);
  const created = await ok(admin.call('/api/v1/admin/impact-assessments', { template_id: template.id, subject_kind: 'ORGANISATION', subject_id: null, title: unique('Organisation DPIA'), owner_reference: 'Privacy team', due_at: hoursFromNow(24 * 14) }, key()), Detail);
  check('a new assessment is a draft that names what is missing', [created.status, created.missing.map(m => m.question_key).sort()], ['DRAFT', ['purpose', 'shares_data']]);
  check('it cannot be submitted incomplete', await codes(admin.call(`/api/v1/admin/impact-assessments/${created.id}/submission`, {}, key())), { status: 409, codes: ['required_answers_or_evidence_missing'] });
  check('an answer outside the choices is refused', await codes(admin.call(`/api/v1/admin/impact-assessments/${created.id}/answers`, { answers: [{ question_key: 'volume', value: 'Enormous', evidence_reference: null }] }, key())), { status: 400, codes: ['answer_is_one_of_the_choices'] });
  let a = await ok(admin.call(`/api/v1/admin/impact-assessments/${created.id}/answers`, { answers: [{ question_key: 'shares_data', value: 'YES', evidence_reference: null }, { question_key: 'purpose', value: 'Order fulfilment for customers.', evidence_reference: null }] }, key()), Detail);
  check('an answer without the evidence its question requires is still missing', a.missing, [{ question_key: 'shares_data', reason: 'EVIDENCE_MISSING' }]);
  a = await ok(admin.call(`/api/v1/admin/impact-assessments/${created.id}/answers`, { answers: [{ question_key: 'shares_data', value: 'YES', evidence_reference: 'Data-flow register DF-7' }] }, key()), Detail);
  a = await ok(admin.call(`/api/v1/admin/impact-assessments/${created.id}/submission`, {}, key()), Detail);
  check('submission raises one finding from the answer rule, which blocks approval', [a.status, a.findings.length, a.findings[0]?.source, a.findings[0]?.severity, a.findings[0]?.blocks_approval], ['SUBMITTED', 1, 'ANSWER_RULE', 'HIGH', true]);
  check('answers cannot change after submission', (await admin.call(`/api/v1/admin/impact-assessments/${created.id}/answers`, { answers: [{ question_key: 'shares_data', value: 'NO', evidence_reference: 'x-ref' }] }, key())).status, 409);

  t.setPhase('approval and findings');
  check('an organisation admin cannot decide', (await admin.call(`/api/v1/admin/impact-assessments/${created.id}/decision`, { decision: 'APPROVED', note: 'Trying to approve without authority.' }, key())).status, 403);
  check('an unresolved finding blocks approval', await codes(owner.call(`/api/v1/admin/impact-assessments/${created.id}/decision`, { decision: 'APPROVED', note: 'Approving with an open finding must fail.' }, key())), { status: 409, codes: ['unresolved_findings_block_approval'] });
  const findingId = a.findings[0]!.id;
  check('a resolution without evidence is refused by the contract', (await admin.call(`/api/v1/admin/impact-findings/${findingId}/events`, { kind: 'RESOLVED', note: 'Resolved without any evidence.', evidence_reference: null, acceptance_expires_at: null }, key())).status, 400);
  const planned = await ok(admin.call(`/api/v1/admin/impact-findings/${findingId}/events`, { kind: 'REMEDIATION_PLANNED', note: 'Agreement with the recipient is being drafted.', evidence_reference: null, acceptance_expires_at: null }, key()), S.schemas.ImpactFinding);
  check('a planned remediation still blocks approval', [planned.state, planned.blocks_approval], ['REMEDIATION_PLANNED', true]);
  check('an admin without approval authority cannot accept the risk', await codes(admin.call(`/api/v1/admin/impact-findings/${findingId}/events`, { kind: 'RISK_ACCEPTED', note: 'Accepting the risk without authority.', evidence_reference: null, acceptance_expires_at: hoursFromNow(24) }, key())), { status: 409, codes: ['risk_acceptance_needs_an_approver'] });
  const accepted = await ok(owner.call(`/api/v1/admin/impact-findings/${findingId}/events`, { kind: 'RISK_ACCEPTED', note: 'Accepted until the agreement is signed.', evidence_reference: null, acceptance_expires_at: hoursFromNow(24 * 30) }, key()), S.schemas.ImpactFinding);
  check('a second person accepts the risk with an expiry; it no longer blocks', [accepted.state, accepted.blocks_approval], ['RISK_ACCEPTED', false]);
  const approved = await ok(owner.call(`/api/v1/admin/impact-assessments/${created.id}/decision`, { decision: 'APPROVED', note: 'Reviewed; residual risk accepted with an expiry.' }, key()), Detail);
  check('an independent approver approves and a review date is set from the template', [approved.status, approved.decided_by !== approved.submitted_by, approved.next_review_at !== null && Math.abs(Date.parse(approved.next_review_at) - Date.now() - 180 * 86_400_000) < 3_600_000], ['APPROVED', true, true]);
  check('a decision is taken once', (await reviewer.call(`/api/v1/admin/impact-assessments/${created.id}/decision`, { decision: 'REJECTED', note: 'A second decision must be refused.' }, key())).status, 409);

  t.setPhase('independence');
  const selfMade = await ok(owner.call('/api/v1/admin/impact-assessments', { template_id: template.id, subject_kind: 'ORGANISATION', subject_id: null, title: unique('Self-reviewed DPIA'), owner_reference: 'Privacy team', due_at: hoursFromNow(24 * 14) }, key()), Detail);
  await ok(owner.call(`/api/v1/admin/impact-assessments/${selfMade.id}/answers`, { answers: [{ question_key: 'shares_data', value: 'NO', evidence_reference: 'Data-flow register DF-8' }, { question_key: 'purpose', value: 'Internal analytics only.', evidence_reference: null }] }, key()), Detail);
  await ok(owner.call(`/api/v1/admin/impact-assessments/${selfMade.id}/submission`, {}, key()), Detail);
  check('the creator and submitter cannot approve their own assessment', await codes(owner.call(`/api/v1/admin/impact-assessments/${selfMade.id}/decision`, { decision: 'APPROVED', note: 'Self approval must be refused.' }, key())), { status: 409, codes: ['reviewer_must_be_independent'] });
  const rejected = await ok(reviewer.call(`/api/v1/admin/impact-assessments/${selfMade.id}/decision`, { decision: 'REJECTED', note: 'Purpose description is too thin to assess.' }, key()), Detail);
  check('a different super admin records the rejection', rejected.status, 'REJECTED');

  t.setPhase('retest');
  const revision = await ok(admin.call(`/api/v1/admin/impact-assessments/${created.id}/revision`, { reason: 'Annual retest of the organisation DPIA.', due_at: hoursFromNow(24 * 14) }, key()), Detail);
  check('a retest is a new draft revision carrying prior answers forward', [revision.status, revision.revision, revision.previous_id, revision.answers.every(x => x.carried_forward)], ['DRAFT', 2, created.id, true]);
  check('a decided assessment is revised once', (await admin.call(`/api/v1/admin/impact-assessments/${created.id}/revision`, { reason: 'A second revision must be refused.', due_at: hoursFromNow(24) }, key())).status, 409);
  const revSubmitted = await ok(admin.call(`/api/v1/admin/impact-assessments/${revision.id}/submission`, {}, key()), Detail);
  const revFinding = revSubmitted.findings.find(f => f.source === 'ANSWER_RULE')!;
  await ok(reviewer.call(`/api/v1/admin/impact-findings/${revFinding.id}/events`, { kind: 'RISK_ACCEPTED', note: 'Accepted for the retest period only.', evidence_reference: null, acceptance_expires_at: hoursFromNow(24 * 30) }, key()), S.schemas.ImpactFinding);
  await ok(reviewer.call(`/api/v1/admin/impact-assessments/${revision.id}/decision`, { decision: 'APPROVED', note: 'Retest reviewed and approved.' }, key()), Detail);
  const predecessor = await ok(admin.call(`/api/v1/admin/impact-assessments/${created.id}`), Detail);
  check('approving the retest supersedes the predecessor, which is kept', predecessor.status, 'SUPERSEDED');

  t.setPhase('escalation');
  const late = await ok(admin.call(`/api/v1/admin/impact-assessments/${revision.id}/findings`, { question_key: null, title: 'Retention period for DPIA records not documented', severity: 'MEDIUM', owner_reference: 'Records team', due_at: hoursFromNow(-1), grc_risk_id: null, grc_control_id: null }, key()), Detail);
  const lateFinding = late.findings.find(f => f.title.startsWith('Retention period'))!;
  check('an overdue open finding is flagged', [lateFinding.overdue, lateFinding.state], [true, 'OPEN']);
  const sweep = await ok(admin.call('/api/v1/admin/impact-findings/escalation-sweep', {}, key()), S.schemas.ImpactEscalationSweep);
  check('the sweep escalates the overdue finding', sweep.finding_ids.includes(lateFinding.id), true);
  const again = await ok(admin.call('/api/v1/admin/impact-findings/escalation-sweep', {}, key()), S.schemas.ImpactEscalationSweep);
  check('a second sweep escalates it no more', again.finding_ids.includes(lateFinding.id), false);
  check('an open finding cannot be reopened', (await admin.call(`/api/v1/admin/impact-findings/${lateFinding.id}/events`, { kind: 'REOPENED', note: 'Reopening an open finding must fail.', evidence_reference: null, acceptance_expires_at: null }, key())).status, 409);

  t.setPhase('history and isolation');
  const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((e: { code?: string }) => e.code ?? 'rejected');
  check('an answer cannot be edited at the database', await direct(`UPDATE app.impact_answers SET value='NO' WHERE assessment_id=$1`, [created.id]), '23514');
  check('an assessment cannot be deleted at the database', await direct(`DELETE FROM app.impact_assessments WHERE id=$1`, [selfMade.id]), '23514');
  check('a published template version cannot be rewritten at the database', await direct(`UPDATE app.impact_templates SET name='Rewritten' WHERE id=$1`, [template.id]), '23514');
  check('an approved assessment cannot be moved back to draft at the database', await direct(`UPDATE app.impact_assessments SET status='DRAFT' WHERE id=$1`, [revision.id]), '23514');
  check('another tenant cannot read the assessment', (await birch.call(`/api/v1/admin/impact-assessments/${created.id}`)).status, 404);
  check('an auditor can read assessments', (await auditor.call('/api/v1/admin/impact-assessments?limit=10')).status, 200);
  check('an auditor cannot create one', (await auditor.call('/api/v1/admin/impact-assessments', { template_id: template.id, subject_kind: 'ORGANISATION', subject_id: null, title: 'Auditor attempt', owner_reference: 'x-ref', due_at: hoursFromNow(24) }, key())).status, 403);
  const listed = await ok(admin.call('/api/v1/admin/impact-assessments?status=SUPERSEDED&limit=100'), S.schemas.ImpactAssessmentList);
  check('the list filters by status', listed.items.every(i => i.status === 'SUPERSEDED') && listed.items.some(i => i.id === created.id), true);
});
