// EX08 third-party lifecycle through the real HTTP boundary.
// Under test: agreements with purpose/region/sub-processor restrictions and
// expiry compared with recorded engagements; supersession and termination;
// risk tiers driving reassessment from approved vendor due diligence (EX06);
// supplier questionnaire links (one-time token, expiring, revocable, one draft
// assessment, own answers only) with supplier answers blocking approval until a
// staff member confirms them; row-level policies checked at the database.
import { randomUUID } from 'node:crypto';
import * as S from '../../../shared/contracts/src/index.ts';
import { operationsSuite, key, hoursFromNow, unique } from '../../../shared/testing/src/operations-fixture.ts';

const t = operationsSuite('third-party');
const { h, check, ok, codes, db } = t;
const Standing = S.schemas.ThirdPartyStanding;
const kinds = (s: { violations: { kind: string }[] }) => [...new Set(s.violations.map(v => v.kind))].sort();

await t.run(async () => {
  const admin = await h.login('admin'); const owner = await h.login('owner'); const reviewer = await h.login('reviewer'); const auditor = await h.login('auditor'); const birch = await h.login('birch');
  const s = t.scope();
  const supplier = (token: string | null, extra: Record<string, string> = {}) => ({
    get: () => fetch(`${h.config.origin}/api/v1/supplier/questionnaire`, { headers: { ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra } }),
    answer: (answers: unknown) => fetch(`${h.config.origin}/api/v1/supplier/questionnaire/answers`, { method: 'POST', headers: { 'content-type': 'application/json', origin: h.config.origin, ...(token ? { authorization: `Bearer ${token}` } : {}), ...extra }, body: JSON.stringify({ answers }) }),
  });

  t.setPhase('setup');
  const v1Purpose = await ok(admin.call('/api/v1/admin/purposes', { legal_entity_id: s.legal_entity_id, environment_id: s.environment_id, code: 'order_service_demo', name: unique('TP V1 purpose'), description: 'Synthetic V1 purpose authorising the processor.' }, key()), S.schemas.Purpose);
  const processor = await ok(admin.call('/api/v1/admin/processors', { name: unique('TP vendor'), role: 'PROCESSOR', authorised_purpose_ids: [v1Purpose.id], authorised_categories: ['CONTACT_DETAILS'], region: 'IN',
    contract_reference: 'DPA TP-1', owner_reference: 'Vendor management', incident_contact: 'incidents@vendor.example', subprocessors_permitted: true }, key()), S.schemas.Processor);
  let st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('a processor with no engagements and no tier reports only the missing tier', kinds(st), ['NO_TIER']);
  const system = await t.boundSystem('TP CRM');
  const setup = await t.activity({ condition: 'CONSENT', systems: [system.id] });
  const engagement = await ok(admin.call('/api/v1/admin/processor-engagements', { processor_id: processor.id, service_description: unique('Mail delivery'), subprocessor_of: null, effective_from: hoursFromNow(-24),
    contract_evidence_reference: null, safeguard_evidence_reference: null, links: [{ link_kind: 'SYSTEM', target_id: system.id }] }, key()), S.schemas.Engagement);
  await ok(admin.call(`/api/v1/admin/registry-activities/${setup.activity.id}/links`, { link_kind: 'PROCESSOR_ENGAGEMENT', target_id: engagement.id, channel: null, basis: 'Declared by the activity owner.', valid_from: hoursFromNow(-1) }, key()), S.schemas.Activity);
  st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('an active engagement without an agreement or due diligence is named', kinds(st), ['DUE_DILIGENCE_MISSING', 'NO_AGREEMENT_IN_FORCE', 'NO_TIER']);

  t.setPhase('agreement restrictions');
  const otherPurpose = await ok(admin.call('/api/v1/admin/registry-purposes', { name: unique('Other purpose'), owner_reference: 'Synthetic owner', description: 'A purpose the processor is not engaged for.', effective_from: hoursFromNow(-48), change_reason: 'Initial registration', evidence_reference: null, v1_purpose_id: null }, key()), S.schemas.RegistryPurpose);
  const sub = await ok(admin.call('/api/v1/admin/processor-engagements', { processor_id: processor.id, service_description: unique('Sub-processing'), subprocessor_of: engagement.id, effective_from: hoursFromNow(-24),
    contract_evidence_reference: null, safeguard_evidence_reference: null, links: [] }, key()), S.schemas.Engagement);
  check('an agreement that expires before it starts is refused by the contract', (await admin.call('/api/v1/admin/processor-agreements', { processor_id: processor.id, kind: 'DPA', reference: 'DPA TP-0', signed_at: hoursFromNow(-48), effective_from: hoursFromNow(-24), expires_at: hoursFromNow(-30),
    allowed_purpose_ids: [], allowed_regions: [], subprocessors_allowed: true, onward_transfer_allowed: false, evidence_reference: 'Signed copy', supersedes_id: null }, key())).status, 400);
  const narrow = await ok(admin.call('/api/v1/admin/processor-agreements', { processor_id: processor.id, kind: 'DPA', reference: 'DPA TP-1', signed_at: hoursFromNow(-48), effective_from: hoursFromNow(-24), expires_at: hoursFromNow(24 * 10),
    allowed_purpose_ids: [otherPurpose.id], allowed_regions: ['US'], subprocessors_allowed: false, onward_transfer_allowed: false, evidence_reference: 'Signed copy DPA TP-1', supersedes_id: null }, key()), S.schemas.Agreement);
  check('the agreement is in force', narrow.in_force, true);
  st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('processing outside the agreement is stated as facts: region, purpose, sub-processor, expiry', kinds(st), ['AGREEMENT_EXPIRING', 'DUE_DILIGENCE_MISSING', 'NO_TIER', 'PURPOSE_NOT_PERMITTED', 'REGION_NOT_PERMITTED', 'SUBPROCESSOR_NOT_PERMITTED']);
  check('the purpose finding names the engagement and the sub-processor finding names the sub-engagement',
    [st.violations.find(v => v.kind === 'PURPOSE_NOT_PERMITTED')?.engagement_id, st.violations.find(v => v.kind === 'SUBPROCESSOR_NOT_PERMITTED')?.engagement_id], [engagement.id, sub.id]);
  const corrected = await ok(admin.call('/api/v1/admin/processor-agreements', { processor_id: processor.id, kind: 'DPA', reference: 'DPA TP-2', signed_at: hoursFromNow(-2), effective_from: hoursFromNow(-1), expires_at: hoursFromNow(24 * 365),
    allowed_purpose_ids: [setup.purpose.id], allowed_regions: ['IN'], subprocessors_allowed: true, onward_transfer_allowed: false, evidence_reference: 'Signed copy DPA TP-2', supersedes_id: narrow.id }, key()), S.schemas.Agreement);
  st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('a superseding agreement replaces the old one, which is kept', [st.agreement_in_force?.id, st.agreements.find(a => a.id === narrow.id)?.superseded, st.agreements.find(a => a.id === narrow.id)?.in_force], [corrected.id, true, false]);
  check('with the corrected agreement only the tier and due diligence remain', kinds(st), ['DUE_DILIGENCE_MISSING', 'NO_TIER']);
  check('an agreement is superseded once', await codes(admin.call('/api/v1/admin/processor-agreements', { processor_id: processor.id, kind: 'DPA', reference: 'DPA TP-3', signed_at: hoursFromNow(-2), effective_from: hoursFromNow(-1), expires_at: null,
    allowed_purpose_ids: [], allowed_regions: [], subprocessors_allowed: true, onward_transfer_allowed: false, evidence_reference: 'x-ref', supersedes_id: narrow.id }, key())), { status: 409, codes: ['already_superseded'] });
  const direct = (sql: string, values: unknown[]) => db.query(sql, values).then(() => 'accepted').catch((e: { code?: string }) => e.code ?? 'rejected');
  check('an agreement\'s terms cannot be rewritten at the database', await direct(`UPDATE app.processor_agreements SET allowed_regions='{}' WHERE id=$1`, [corrected.id]), '23514');

  t.setPhase('tier and due diligence');
  await ok(admin.call(`/api/v1/admin/processors/${processor.id}/tier`, { tier: 'HIGH', reassessment_interval_days: 180, reason: 'Handles customer contact data at volume.' }, key()), S.schemas.Tier);
  const questions = [
    { key: 'certified', text: 'Do you hold a current security certification?', answer_type: 'YES_NO', choices: [], required: true, evidence_required: true, finding_when: 'NO', finding_severity: 'MEDIUM', guidance: null },
    { key: 'region', text: 'Where is data stored?', answer_type: 'CHOICE', choices: ['IN', 'Outside IN'], required: true, evidence_required: false, finding_when: 'Outside IN', finding_severity: 'HIGH', guidance: null },
    { key: 'internal_note', text: 'Internal reviewer note.', answer_type: 'TEXT', choices: [], required: false, evidence_required: false, finding_when: null, finding_severity: null, guidance: null },
  ];
  const dpia = await ok(admin.call('/api/v1/admin/impact-templates', { template_key: null, kind: 'DPIA', name: unique('Not vendor'), description: 'A DPIA template, not vendor due diligence.', questions, requirement_ids: [], review_interval_days: 365 }, key()), S.schemas.ImpactTemplate);
  const ddTemplate = await ok(admin.call('/api/v1/admin/impact-templates', { template_key: null, kind: 'VENDOR_DUE_DILIGENCE', name: unique('Vendor due diligence'), description: 'Synthetic vendor due-diligence questionnaire.', questions, requirement_ids: [], review_interval_days: 365 }, key()), S.schemas.ImpactTemplate);
  for (const tp of [dpia, ddTemplate]) await ok(reviewer.call(`/api/v1/admin/impact-templates/${tp.id}/publication`, { action: 'PUBLISH' }, key()), S.schemas.ImpactTemplate);
  const newAssessment = (template_id: string) => ok(admin.call('/api/v1/admin/impact-assessments', { template_id, subject_kind: 'PROCESSOR', subject_id: processor.id, title: unique('Vendor review'), owner_reference: 'Vendor management', due_at: hoursFromNow(24 * 14) }, key()), S.schemas.ImpactAssessmentDetail);
  const notVendor = await newAssessment(dpia.id);
  check('a supplier link is only for vendor due diligence', await codes(admin.call('/api/v1/admin/supplier-links', { assessment_id: notVendor.id, expires_at: hoursFromNow(24) }, key())), { status: 409, codes: ['only_vendor_due_diligence_of_a_processor'] });
  const dd = await newAssessment(ddTemplate.id);
  const other = await newAssessment(ddTemplate.id);
  check('a link cannot outlive thirty days', await codes(admin.call('/api/v1/admin/supplier-links', { assessment_id: dd.id, expires_at: hoursFromNow(24 * 45) }, key())), { status: 400, codes: ['expiry_within_thirty_days'] });
  const issued = await ok(admin.call('/api/v1/admin/supplier-links', { assessment_id: dd.id, expires_at: hoursFromNow(24 * 7) }, key()), S.schemas.SupplierLinkIssued);
  check('the token is returned once, in a fragment path, and only its digest is stored',
    [issued.path === `/supplier#token=${issued.token}`, (await db.query('SELECT token_digest=encode(sha256(convert_to($2,\'UTF8\')),\'hex\') ok, token_digest<>$2 hashed FROM app.supplier_links WHERE id=$1', [issued.link.id, issued.token])).rows[0]], [true, { ok: true, hashed: true }]);
  const listed = await ok(admin.call(`/api/v1/admin/supplier-links?assessment_id=${dd.id}`), S.schemas.SupplierLinkList);
  check('a listed link never carries its token', JSON.stringify(listed).includes(issued.token), false);

  t.setPhase('supplier answers');
  const sup = supplier(issued.token);
  check('no token is unauthenticated', (await supplier(null).get()).status, 401);
  check('a wrong token is unauthenticated', (await supplier('b'.repeat(64)).get()).status, 401);
  check('a request carrying a cookie is refused', (await supplier(issued.token, { cookie: 'x=y' }).get()).status, 401);
  check('a cross-origin write is refused', (await supplier(issued.token, { origin: 'https://evil.invalid' }).answer([{ question_key: 'certified', value: 'YES', evidence_reference: 'ISO 27001 certificate C-9' }])).status, 403);
  let q = S.schemas.SupplierQuestionnaire.parse(await (await sup.get()).json());
  check('the supplier sees the questions of its one assessment', [q.title, q.questions.map(x => x.key), q.editable], [dd.title, ['certified', 'region', 'internal_note'], true]);
  check('an answer outside the choices is refused', (await sup.answer([{ question_key: 'region', value: 'Moon', evidence_reference: null }])).status, 400);
  const answered = await sup.answer([{ question_key: 'certified', value: 'YES', evidence_reference: 'ISO 27001 certificate C-9' }, { question_key: 'region', value: 'IN', evidence_reference: null }]);
  q = S.schemas.SupplierQuestionnaire.parse(await answered.json());
  check('supplier answers are recorded', q.answers.map(a => [a.question_key, a.value]).sort(), [['certified', 'YES'], ['region', 'IN']]);
  await ok(admin.call(`/api/v1/admin/impact-assessments/${dd.id}/answers`, { answers: [{ question_key: 'internal_note', value: 'Reviewer only: vendor was slow to respond.', evidence_reference: null }] }, key()), S.schemas.ImpactAssessmentDetail);
  q = S.schemas.SupplierQuestionnaire.parse(await (await sup.get()).json());
  check('the supplier never sees staff answers', q.answers.some(a => a.question_key === 'internal_note'), false);
  let staffView = await ok(admin.call(`/api/v1/admin/impact-assessments/${dd.id}`), S.schemas.ImpactAssessmentDetail);
  check('staff see supplier answers labelled as supplier attestations', staffView.answers.filter(a => a.respondent === 'SUPPLIER').map(a => a.question_key).sort(), ['certified', 'region']);

  t.setPhase('policies at the database');
  const asSupplier = async <T>(work: (q: (sql: string, v?: unknown[]) => Promise<{ rows: Record<string, unknown>[] }>) => Promise<T>) => {
    const client = await db.connect();
    try {
      await client.query('BEGIN'); await client.query('SET LOCAL ROLE orvia_app');
      await client.query(`SELECT set_config('orvia.tenant_id',$1,true),set_config('orvia.legal_entity_id',$2,true),set_config('orvia.environment_id',$3,true),set_config('orvia.actor_id',$4,true),set_config('orvia.actor_domain','MACHINE',true),set_config('orvia.role','SUPPLIER',true),set_config('orvia.capabilities','supplier.respond',true)`,
        [s.tenant_id, s.legal_entity_id, s.environment_id, issued.link.id]);
      return await work((sql, v) => client.query(sql, v));
    } finally { await client.query('ROLLBACK'); client.release(); }
  };
  check('the supplier actor sees exactly one assessment', await asSupplier(async q => (await q('SELECT id FROM app.impact_assessments')).rows.map(r => r.id)), [dd.id]);
  check('the supplier actor sees no findings, agreements or other links', await asSupplier(async q => [(await q('SELECT count(*)::int n FROM app.impact_findings')).rows[0]!.n, (await q('SELECT count(*)::int n FROM app.processor_agreements')).rows[0]!.n, (await q('SELECT count(*)::int n FROM app.supplier_links')).rows[0]!.n]), [0, 0, 1]);
  check('the supplier actor cannot answer another assessment', await asSupplier(q => q(`INSERT INTO app.impact_answers(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,value,respondent,answered_by) VALUES($1,$2,$3,$4,$5,'certified','YES','SUPPLIER',$6)`,
    [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID(), other.id, issued.link.id]).then(() => 'accepted').catch((e: { code?: string }) => e.code)), '42501');
  check('the supplier actor cannot write a staff-labelled answer', await asSupplier(q => q(`INSERT INTO app.impact_answers(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,value,respondent,answered_by) VALUES($1,$2,$3,$4,$5,'certified','YES','STAFF',$6)`,
    [s.tenant_id, s.legal_entity_id, s.environment_id, randomUUID(), dd.id, issued.link.id]).then(() => 'accepted').catch((e: { code?: string }) => e.code)), '42501');

  t.setPhase('attestation blocks approval');
  await ok(admin.call(`/api/v1/admin/impact-assessments/${dd.id}/submission`, {}, key()), S.schemas.ImpactAssessmentDetail);
  check('after submission the supplier can no longer answer', (await sup.answer([{ question_key: 'region', value: 'IN', evidence_reference: null }])).status, 409);
  check('supplier attestations block approval', await codes(owner.call(`/api/v1/admin/impact-assessments/${dd.id}/decision`, { decision: 'APPROVED', note: 'Approving unconfirmed attestations must fail.' }, key())), { status: 409, codes: ['supplier_attestations_not_confirmed'] });
  staffView = await ok(admin.call(`/api/v1/admin/impact-assessments/${dd.id}`), S.schemas.ImpactAssessmentDetail);
  check('the blocker is stated', staffView.approval_blockers.some(b => b.includes('supplier attestations')), true);
  // Staff confirm by recording the answer themselves: a new revision carries only confirmed answers.
  await ok(owner.call(`/api/v1/admin/impact-assessments/${dd.id}/decision`, { decision: 'REJECTED', note: 'Attestations need staff confirmation; retest.' }, key()), S.schemas.ImpactAssessmentDetail);
  const retest = await ok(admin.call(`/api/v1/admin/impact-assessments/${dd.id}/revision`, { reason: 'Confirm supplier attestations.', due_at: hoursFromNow(24 * 7) }, key()), S.schemas.ImpactAssessmentDetail);
  check('supplier attestations are not carried forward as confirmed', retest.answers.map(a => a.question_key), ['internal_note']);
  await ok(admin.call(`/api/v1/admin/impact-assessments/${retest.id}/answers`, { answers: [{ question_key: 'certified', value: 'YES', evidence_reference: 'Certificate C-9 checked against the issuer register' }, { question_key: 'region', value: 'IN', evidence_reference: null }] }, key()), S.schemas.ImpactAssessmentDetail);
  await ok(admin.call(`/api/v1/admin/impact-assessments/${retest.id}/submission`, {}, key()), S.schemas.ImpactAssessmentDetail);
  const approved = await ok(owner.call(`/api/v1/admin/impact-assessments/${retest.id}/decision`, { decision: 'APPROVED', note: 'Staff-confirmed due diligence approved.' }, key()), S.schemas.ImpactAssessmentDetail);
  st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('approved due diligence clears the gap and sets the reassessment date from the tier',
    [kinds(st), st.last_due_diligence?.assessment_id, Math.abs(Date.parse(st.reassessment_due_at!) - Date.parse(approved.decided_at!) - 180 * 86_400_000) < 60_000], [[], retest.id, true]);

  t.setPhase('link lifecycle');
  const revoked = await ok(admin.call(`/api/v1/admin/supplier-links/${issued.link.id}/revocation`, { reason: 'Questionnaire closed for this cycle.' }, key()), S.schemas.SupplierLink);
  check('a revoked link is refused', [revoked.state, (await sup.get()).status], ['REVOKED', 401]);
  check('a link is revoked once', (await admin.call(`/api/v1/admin/supplier-links/${issued.link.id}/revocation`, { reason: 'A second revocation must fail.' }, key())).status, 409);
  const shortLived = await ok(admin.call('/api/v1/admin/supplier-links', { assessment_id: other.id, expires_at: new Date(Date.now() + 3000).toISOString() }, key()), S.schemas.SupplierLinkIssued);
  check('a fresh link works', (await supplier(shortLived.token).get()).status, 200);
  await new Promise(resolve => setTimeout(resolve, 3500));
  check('an expired link is refused', (await supplier(shortLived.token).get()).status, 401);
  check('a link\'s expiry cannot be extended at the database', await direct(`UPDATE app.supplier_links SET expires_at=expires_at+interval '1 day' WHERE id=$1`, [shortLived.link.id]), '23514');

  t.setPhase('termination, disposition and isolation');
  await ok(admin.call(`/api/v1/admin/processor-engagements/${sub.id}/termination`, { terminated_at: hoursFromNow(0), reason: 'Sub-processing ended at contract end.', disposition_required: true }, key()), S.schemas.Engagement);
  await ok(admin.call(`/api/v1/admin/processor-engagements/${sub.id}/disposition`, { outcome: 'PROCESSOR_CONFIRMED', evidence_reference: 'Vendor deletion letter DL-5', verification_method: 'PROCESSOR_STATEMENT' }, key()), S.schemas.Engagement);
  st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('a processor statement about deletion is reported as not verified', st.violations.some(v => v.kind === 'DISPOSITION_NOT_VERIFIED' && v.engagement_id === sub.id), true);
  await ok(admin.call(`/api/v1/admin/processor-agreements/${corrected.id}/termination`, { reason: 'Agreement terminated for validation.' }, key()), S.schemas.Agreement);
  st = await ok(admin.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`), Standing);
  check('terminating the agreement leaves active processing without an agreement', st.violations.some(v => v.kind === 'NO_AGREEMENT_IN_FORCE'), true);
  check('an agreement is terminated once', (await admin.call(`/api/v1/admin/processor-agreements/${corrected.id}/termination`, { reason: 'A second termination must fail.' }, key())).status, 409);
  const summary = await ok(admin.call('/api/v1/admin/third-party-standing?limit=100'), S.schemas.ThirdPartySummaryList);
  check('the overview lists the processor with its gaps', summary.items.find(i => i.processor_id === processor.id)?.violations.includes('NO_AGREEMENT_IN_FORCE'), true);
  check('another tenant cannot read the standing', (await birch.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`)).status, 404);
  check('an auditor can read standing but cannot record an agreement', [(await auditor.call(`/api/v1/admin/processors/${processor.id}/third-party-standing`)).status,
    (await auditor.call('/api/v1/admin/processor-agreements', { processor_id: processor.id, kind: 'NDA', reference: 'NDA-1', signed_at: hoursFromNow(-1), effective_from: hoursFromNow(-1), expires_at: null, allowed_purpose_ids: [], allowed_regions: [], subprocessors_allowed: false, onward_transfer_allowed: false, evidence_reference: 'x-ref', supersedes_id: null }, key())).status], [200, 403]);
});
