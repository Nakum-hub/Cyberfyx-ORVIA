// Audit practice (task AUDIT-PRACTICE-01) on the vendor installation: practice
// set-up and activation gates, engagement acceptance and independence,
// applicability and scope revisions, risk methodology, the approved work
// programme, the evidence register, request lifecycle, populations and
// sampling, working papers and review, structured findings, retests, risk
// acceptance, closure types, snapshot-bound reports, corrections and legal
// holds - with the refusals each rule exists for. Isolated synthetic vendor
// database per run; every call goes through the vendor HTTP surface.
process.env.ORVIA_PROFILE = 'vendor-a00';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { writeFileSync, mkdirSync } from 'node:fs';
import { vendorHarness } from './harness.ts';
import { acceptEngagement, evidenceFor, paper, ok, ACCEPTANCE, METHODOLOGY } from './practice-flow.ts';
import { packageFileBytes, sha256, verifyAuditDocument, type AuditPackageManifest } from '../../../shared/contracts/src/audit-exchange.ts';
import { engagementCodeDigest } from '../../../backend/vendor/audit/service.ts';
import { rate } from '../../../backend/vendor/audit/practice.ts';
import { installationTrust } from '../../../scripts/credentials.ts';

const results: { name: string; result: 'PASS' | 'FAIL'; detail?: string }[] = [];
function check(name: string, actual: unknown, expected: unknown) {
  try { assert.deepEqual(actual, expected); results.push({ name, result: 'PASS' }); console.log(`PASS ${name}`); }
  catch { results.push({ name, result: 'FAIL', detail: `${JSON.stringify(actual)?.slice(0, 300)} != ${JSON.stringify(expected)?.slice(0, 300)}` }); console.log(`FAIL ${name}: ${JSON.stringify(actual)?.slice(0, 400)}`); }
}
const code = (r: { status: number; data: { error?: { field_errors?: { code: string }[] } } }) => [r.status, r.data?.error?.field_errors?.[0]?.code ?? null];
const h = await vendorHarness();
const V = '/api/v1/vendor';
const today = new Date().toISOString().slice(0, 10);
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);
try {
  // ---------------------------------------------------------------- people
  const anon = h.session(); const setup = await h.issueSetupCode();
  const owner = { email: 'owner@practice.example', password: `Owner-${randomUUID()}`, domain: 'vendor' as const } as { email: string; password: string; totp?: string; domain: 'vendor' };
  const admin = { email: 'admin@practice.example', password: `Admin-${randomUUID()}`, domain: 'vendor' as const } as typeof owner;
  await anon.json(`${V}/setup`, { setup_code: setup, owner: { name: 'Practice Owner', email: owner.email, password: owner.password }, admin: { name: 'Practice Admin', email: admin.email, password: admin.password } });
  const own = await h.login(owner); const adm = await h.login(admin);
  const member = async (name: string, role: string) => { const r = await adm.json(`${V}/team`, { name, email: `${name.toLowerCase().replace(/\W/g, '')}@practice.example`, role });
    const u = { email: r.data.member.email, password: r.data.one_time_password, domain: 'vendor' as const, id: r.data.member.user_id as string } as { email: string; password: string; totp?: string; domain: 'vendor'; id: string };
    return { u, s: await h.login(u) }; };
  const L = await member('Lead Auditor', 'LEAD_AUDITOR'); const A = await member('Field Auditor', 'AUDITOR');
  // Authenticator enrolment is limited to 10 calls a minute (backend/auth/src/server.ts); the suite waits rather than bypassing it.
  await new Promise(r => setTimeout(r, 61_000));
  const R = await member('Audit Reviewer', 'AUDIT_REVIEWER'); const R2 = await member('Second Reviewer', 'AUDIT_REVIEWER');
  const lead = L.s, auditor = A.s, reviewer = R.s, reviewer2 = R2.s;
  const org = (await adm.json(`${V}/organisations`, { name: 'Cedar Synthetic Ltd', registered_address: null })).data.id as string;
  const scope = ['DPDP-NOTICE-CONSENT-REQUEST', 'DPDP-CONSENT-VALIDITY'];
  const newEngagement = async (reference: string, requirements = scope) => {
    const e = await adm.json(`${V}/engagements`, { organisation_id: org, reference, scope_requirement_ids: requirements, period_from: '2026-01-01', period_to: '2026-06-30', retention_days: 30 });
    await adm.json(`${V}/engagements/${e.data.engagement_id}/team`, { user_id: L.u.id, engagement_role: 'LEAD' });
    await adm.json(`${V}/engagements/${e.data.engagement_id}/team`, { user_id: A.u.id, engagement_role: 'AUDITOR' });
    return { id: e.data.engagement_id as string, code: e.data.engagement_code as string };
  };

  // ---------------------------------------------------------------- A. practice level and activation gates
  let state = (await adm.json(`${V}/practice`)).data;
  check('practice: real use is refused until every gate is recorded', [state.real_use_allowed, state.gates_missing.length, state.audit_key.development], [false, 4, true]);
  check('practice: an auditor cannot record criteria', (await auditor.json(`${V}/practice/criteria`, { version: 'X-1' })).status, 403);
  state = await ok(lead.json(`${V}/practice/criteria`, { version: 'DPDP-FIXTURE-A' }), 'criteria');
  const fixture = state.criteria[0];
  check('practice: baseline recorded as TEST_FIXTURE criteria with its digest', [fixture.distribution, fixture.requirements > 20, /^[a-f0-9]{64}$/.test(fixture.digest)], ['TEST_FIXTURE', true, true]);
  check('practice: an administrator cannot approve criteria', (await adm.json(`${V}/criteria/${fixture.id}/approve`, {})).status, 403);
  await ok(reviewer.json(`${V}/criteria/${fixture.id}/approve`, {}), 'approve criteria');
  const bad = METHODOLOGY('RM-BAD'); bad.matrix[4]![4] = 'LOW';
  check('methodology: a matrix whose rating falls as risk rises is refused', code(await lead.json(`${V}/practice/methodologies`, bad)), [400, 'ratings_must_not_decrease_with_likelihood_or_impact']);
  state = await ok(lead.json(`${V}/practice/methodologies`, METHODOLOGY('RM-A')), 'methodology');
  const unapproved = state.methodologies.find((m: { version: string }) => m.version === 'RM-A');
  const e0 = await newEngagement('ENG-PRAC-0');
  check('configure: an unapproved methodology is refused', code(await adm.json(`${V}/engagements/${e0.id}/configure`, { use_kind: 'SYNTHETIC', criteria_version_id: fixture.id, methodology_id: unapproved.id, commercial_owner_id: null, implementation_owner_id: null })), [409, 'methodology_not_approved']);
  check('methodology: a reviewer who did not record it approves it', (await reviewer.json(`${V}/methodologies/${unapproved.id}/approve`, {})).status, 200);
  check('configure: a REAL engagement on test-fixture criteria is refused', code(await adm.json(`${V}/engagements/${e0.id}/configure`, { use_kind: 'REAL', criteria_version_id: fixture.id, methodology_id: unapproved.id, commercial_owner_id: null, implementation_owner_id: null })), [409, 'real_engagement_needs_production_criteria']);
  check('gates: only the super administrator records a gate', (await adm.json(`${V}/practice/activations`, { gate: 'ENGAGEMENT_LETTER_TEMPLATE_APPROVED', reference: 'Synthetic reference' })).status, 403);
  check('gates: a former legal-review gate name is refused by the contract', (await own.json(`${V}/practice/activations`, { gate: 'LEGAL_REVIEW_ENGAGEMENT_LETTER', reference: 'Synthetic reference' })).status, 400);
  check('gates: the database refuses a new row under a legacy gate name', await h.operator.query("INSERT INTO vendor.practice_activations (id, gate, reference, recorded_by) VALUES (gen_random_uuid(), 'LEGAL_REVIEW_PROCESSING_AGREEMENT', 'Synthetic', gen_random_uuid())").then(() => 'inserted', (e: Error) => e.message), 'legacy_gate_name');
  check('gates: all four gates are missing on a fresh vendor database', (await h.operator.query('SELECT vendor.practice_gates_missing() AS g')).rows[0].g, ['ENGAGEMENT_LETTER_TEMPLATE_APPROVED', 'PROCESSING_AGREEMENT_TEMPLATE_APPROVED', 'PRODUCTION_AUDIT_KEY', 'PRODUCTION_CRITERIA']);
  check('gates: a development audit key cannot pass the production key gate', code(await own.json(`${V}/practice/activations`, { gate: 'PRODUCTION_AUDIT_KEY', reference: 'Key ceremony 1' })), [409, 'audit_key_is_a_development_key']);
  check('gates: production criteria gate needs approved production criteria', code(await own.json(`${V}/practice/activations`, { gate: 'PRODUCTION_CRITERIA', reference: 'Package 1' })), [409, 'no_approved_production_criteria']);

  // ---------------------------------------------------------------- A. acceptance and independence
  const practice = { criteria_id: fixture.id as string, methodology_id: unapproved.id as string };
  check('fieldwork before acceptance is refused', code(await auditor.json(`${V}/engagements/${e0.id}/understanding`, { business_overview: 'Synthetic overview text.', processing_activities: ['x'], systems: [], data_categories: [], third_parties: [], sdf_status: { status: 'UNKNOWN', source: 'n/a' }, prior_audits: null, existing_records: [] })), [409, 'engagement_not_accepted']);
  check('channel requests before acceptance are refused', code(await auditor.json(`${V}/engagements/${e0.id}/channel/requests`, { kind: 'COLLECT_NOW', requirement_id: null, categories: ['INDICATORS'], population: null, sample_size: null, description: 'Collect now', due_date: inDays(7) })), [409, 'engagement_not_accepted']);
  await ok(adm.json(`${V}/engagements/${e0.id}/configure`, { use_kind: 'SYNTHETIC', criteria_version_id: fixture.id, methodology_id: unapproved.id, commercial_owner_id: R2.u.id, implementation_owner_id: null }), 'configure e0');
  check('independence: a commercial owner cannot be the engagement reviewer', code(await adm.json(`${V}/engagements/${e0.id}/team`, { user_id: R2.u.id, engagement_role: 'REVIEWER' })), [409, 'reviewer_holds_a_commercial_or_implementation_role_or_conflict']);
  await adm.json(`${V}/engagements/${e0.id}/team`, { user_id: R.u.id, engagement_role: 'REVIEWER' });
  check('acceptance: a statutory SDF claim needs applicability basis and eligibility evidence', (await adm.json(`${V}/engagements/${e0.id}/acceptance`, { ...ACCEPTANCE, service_type: 'STATUTORY_SDF_AUDIT_CLAIM' })).status, 400);
  check('acceptance: the statutory SDF audit is not offered (decision D1), even with basis and evidence', code(await adm.json(`${V}/engagements/${e0.id}/acceptance`, { ...ACCEPTANCE, service_type: 'STATUTORY_SDF_AUDIT_CLAIM', sdf_applicability_basis: 'Notified as an SDF (synthetic).', eligibility_evidence: 'Independence record (synthetic).' })), [409, 'statutory_sdf_audit_not_offered']);
  check('acceptance: the database refuses a statutory SDF acceptance too', await h.operator.query("INSERT INTO vendor.engagement_acceptances (engagement_id, service_type, objectives, intended_users, client_responsibilities, auditor_responsibilities, confidentiality, evidence_handling, scope_restrictions, competence, sdf_applicability_basis, eligibility_evidence, licence_independence, prepared_by) SELECT $1, 'STATUTORY_SDF_AUDIT_CLAIM', 'Synthetic objectives.', 'Board', 'Synthetic client duties.', 'Synthetic auditor duties.', 'Synthetic.', 'Synthetic.', NULL, 'Synthetic.', 'Basis.', 'Evidence.', true, gen_random_uuid()", [e0.id]).then(() => 'inserted', (e: Error) => e.message), 'statutory_sdf_audit_not_offered');
  check('acceptance: licence independence cannot be declared false', (await adm.json(`${V}/engagements/${e0.id}/acceptance`, { ...ACCEPTANCE, licence_independence: false })).status, 400);
  await ok(adm.json(`${V}/engagements/${e0.id}/acceptance`, ACCEPTANCE), 'prepare e0');
  const conflict = await ok(auditor.json(`${V}/engagements/${e0.id}/conflicts`, { kind: 'PRIOR_IMPLEMENTATION', person_id: A.u.id, description: 'The field auditor configured ORVIA for this client last year (synthetic).' }), 'conflict');
  check('acceptance: an administrator cannot decide it', (await adm.json(`${V}/engagements/${e0.id}/acceptance/decide`, { decision: 'ACCEPTED', rationale: 'Administrator attempting to accept.' })).status, 403);
  check('acceptance: refused while a conflict is open', code(await reviewer.json(`${V}/engagements/${e0.id}/acceptance/decide`, { decision: 'ACCEPTED', rationale: 'Attempt with an open conflict recorded.' })), [409, 'open_or_disqualifying_conflict']);
  check('conflict: a safeguard must be stated', (await reviewer.json(`${V}/conflicts/${conflict.conflicts[0].id}/review`, { status: 'SAFEGUARDED', safeguard: null })).status, 400);
  await ok(reviewer.json(`${V}/conflicts/${conflict.conflicts[0].id}/review`, { status: 'SAFEGUARDED', safeguard: 'The field auditor performs no procedure on the ORVIA configuration they built; the reviewer re-performs those.' }), 'safeguard');
  check('independence: a person with prior implementation work stays barred from review authority', (await h.operator.query('SELECT vendor.review_barred($1,$2) AS b', [e0.id, A.u.id])).rows[0].b, true);
  await h.operator.query("UPDATE vendor.engagements SET use_kind='REAL' WHERE id=$1", [e0.id]);
  check('acceptance: a REAL engagement is refused while activation gates are missing', code(await reviewer.json(`${V}/engagements/${e0.id}/acceptance/decide`, { decision: 'ACCEPTED', rationale: 'Attempt to accept a real engagement.' })), [409, 'practice_not_activated_for_real_engagements']);
  await h.operator.query("UPDATE vendor.engagements SET use_kind='SYNTHETIC' WHERE id=$1", [e0.id]);
  const accepted = await ok(reviewer.json(`${V}/engagements/${e0.id}/acceptance/decide`, { decision: 'ACCEPTED', rationale: 'Conflict safeguarded; competence and terms adequate (synthetic).' }), 'accept e0');
  check('acceptance: recorded with the decider and rationale', [accepted.acceptance.decision, accepted.acceptance.decided_by], ['ACCEPTED', R.u.id]);
  check('acceptance: terms and configuration are fixed once decided', [code(await adm.json(`${V}/engagements/${e0.id}/configure`, { use_kind: 'SYNTHETIC', criteria_version_id: fixture.id, methodology_id: unapproved.id, commercial_owner_id: null, implementation_owner_id: null })),
    await h.operator.query("UPDATE vendor.engagement_acceptances SET objectives='Changed objectives text here' WHERE engagement_id=$1", [e0.id]).then(() => 'UPDATED', e => e.message)], [[409, 'engagement_configuration_fixed_after_acceptance'], 'acceptance_decided']);
  check('independence: engagement file is team-only; an administrator sees acceptance but no fieldwork', await adm.json(`${V}/engagements/${e0.id}/file`).then(r => [r.status, r.data.acceptance?.decision, r.data.understanding.length]), [200, 'ACCEPTED', 0]);

  // ---------------------------------------------------------------- B/C. understanding, applicability, scope
  const e = await newEngagement('ENG-PRAC-1', [...scope, 'DPDP-NOTICE-LEGACY-CONSENT']);
  await adm.json(`${V}/engagements/${e.id}/team`, { user_id: R.u.id, engagement_role: 'REVIEWER' });
  await acceptEngagement({ admin: adm, reviewer, lead, engagementId: e.id, ...practice });
  // Scope of the definer helpers (Codex review R6), as the application role itself, bound the way the application binds a person;
  // no capability is granted, so only team membership can make the answer visible.
  const asApp = async (actor: string, sql: string, params: unknown[]) => {
    const c = await h.runtime.pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(`SELECT set_config('vendor.actor_id',$1,true), set_config('vendor.actor_domain','VENDOR_STAFF',true), set_config('vendor.role','AUDITOR',true),
        set_config('vendor.capabilities','',true), set_config('vendor.organisation_id','',true)`, [actor]);
      return (await c.query(sql, params)).rows[0] as Record<string, unknown>;
    } catch (error) { return { error: (error as { code?: string }).code }; }
    finally { await c.query('ROLLBACK').catch(() => {}); c.release(); }
  };
  check('scope: the acceptance helper answers a team member and not a person outside the team (application role)',
    [(await asApp(L.u.id, 'SELECT vendor.engagement_accepted($1) AS v', [e.id])).v, (await asApp(R2.u.id, 'SELECT vendor.engagement_accepted($1) AS v', [e.id])).v], [true, false]);
  check('scope: the conclusion-support helper says nothing to a person outside the team (application role)', (await asApp(R2.u.id, 'SELECT vendor.requirement_supported($1,$2) AS v', [e.id, scope[0]])).v, false);
  check('scope: the application role cannot call the internal review-bar helper', (await asApp(L.u.id, 'SELECT vendor.review_barred($1,$2) AS v', [e.id, L.u.id])).error, '42501');
  check('scope: no vendor definer function is executable by PUBLIC',
    (await h.operator.query("SELECT count(*)::int AS n FROM pg_proc p WHERE p.pronamespace='vendor'::regnamespace AND p.prosecdef AND has_function_privilege('public', p.oid, 'EXECUTE')")).rows[0].n, 0);
  let file = await ok(auditor.json(`${V}/engagements/${e.id}/understanding`, { business_overview: 'Synthetic retailer; contact the DPO at dpo@cedar.example or +91 98765 43210.', processing_activities: ['Marketing consent'], systems: ['ORVIA'], data_categories: ['Contact details'],
    third_parties: [], sdf_status: { status: 'UNKNOWN', source: 'Not established (synthetic)' }, prior_audits: null, existing_records: [] }), 'understanding');
  check('understanding: contact details are redacted before storage', [file.understanding[0].redactions, JSON.stringify(file.understanding[0].content).includes('dpo@cedar.example')], [2, false]);
  check('understanding: the preparer cannot review it', (await auditor.json(`${V}/understanding/${file.understanding[0].id}/review`, {})).status, 403);
  check('applicability: an unresolved decision must state its question', (await auditor.json(`${V}/engagements/${e.id}/applicability`, { requirement_id: scope[0], provision_ids: [], criterion_type: 'STATUTORY', applicability: 'UNRESOLVED', effective_from: null, rationale: 'Pending client confirmation.', evidence_refs: [], unresolved_question: null })).status, 400);
  check('applicability: provisions must be cited by the requirement', code(await auditor.json(`${V}/engagements/${e.id}/applicability`, { requirement_id: scope[0], provision_ids: ['RULES-R7'], criterion_type: 'STATUTORY', applicability: 'APPLICABLE', effective_from: null, rationale: 'Consent is a ground here.', evidence_refs: [], unresolved_question: null })), [400, 'not_cited_by_requirement']);
  for (const r of scope) await ok(auditor.json(`${V}/engagements/${e.id}/applicability`, { requirement_id: r, provision_ids: [], criterion_type: 'STATUTORY', applicability: 'APPLICABLE', effective_from: '2027-05-13', rationale: 'Consent is a ground of processing (synthetic).', evidence_refs: ['Understanding v1'], unresolved_question: null }), 'applicability');
  file = await ok(auditor.json(`${V}/engagements/${e.id}/applicability`, { requirement_id: 'DPDP-NOTICE-LEGACY-CONSENT', provision_ids: [], criterion_type: 'STATUTORY', applicability: 'UNRESOLVED', effective_from: null, rationale: 'Pre-commencement consent holders not yet identified.', evidence_refs: [], unresolved_question: 'Does the client hold consent given before commencement?' }), 'unresolved');
  check('scope: a requirement without an applicability decision cannot be scoped', code(await lead.json(`${V}/engagements/${e.id}/scope`, { entities: ['Cedar'], processes: ['Consent'], systems: [], locations: [], period_from: '2026-01-01', period_to: '2026-06-30', requirement_ids: ['DPDP-GRIEVANCE-RESPONSE'], exclusions: [], limitations: [], change_reason: null, impact_assessment: null })), [409, 'applicability_not_decided']);
  file = await ok(lead.json(`${V}/engagements/${e.id}/scope`, { entities: ['Cedar'], processes: ['Consent'], systems: ['ORVIA'], locations: ['India'], period_from: '2026-01-01', period_to: '2026-06-30', requirement_ids: [...scope, 'DPDP-NOTICE-LEGACY-CONSENT'], exclusions: [], limitations: [], change_reason: null, impact_assessment: null }), 'scope v1');
  check('scope: unresolved applicability is carried as a stated limitation', file.scope[0].limitations.some((l: string) => l.includes('DPDP-NOTICE-LEGACY-CONSENT') && l.includes('unresolved')), true);
  check('scope: the lead cannot approve the scope', (await lead.json(`${V}/scope/${file.scope[0].id}/approve`, {})).status, 403);
  await ok(reviewer.json(`${V}/scope/${file.scope[0].id}/approve`, {}), 'approve scope v1');
  check('scope: a direct edit of the engagement scope is refused', await h.operator.query("UPDATE vendor.engagements SET scope_requirement_ids = ARRAY['DPDP-CONSENT-VALIDITY'] WHERE id=$1", [e.id]).then(() => 'UPDATED', x => x.message), 'scope_changes_only_through_an_approved_scope_version');
  check('scope: a revision needs a reason and an impact assessment', code(await lead.json(`${V}/engagements/${e.id}/scope`, { entities: ['Cedar'], processes: ['Consent'], systems: ['ORVIA'], locations: ['India'], period_from: '2026-01-01', period_to: '2026-06-30', requirement_ids: scope, exclusions: [], limitations: [], change_reason: null, impact_assessment: null })), [400, 'scope_change_needs_reason_and_impact_assessment']);
  file = await ok(lead.json(`${V}/engagements/${e.id}/scope`, { entities: ['Cedar'], processes: ['Consent'], systems: ['ORVIA'], locations: ['India'], period_from: '2026-01-01', period_to: '2026-06-30', requirement_ids: scope, exclusions: ['Legacy consent holders'], limitations: [],
    change_reason: 'Client confirmed no consent predates commencement in scope systems.', impact_assessment: 'Removes one requirement; no procedure had been planned for it; report scope narrows accordingly.' }), 'scope v2');
  await ok(reviewer.json(`${V}/scope/${file.scope[1].id}/approve`, {}), 'approve scope v2');
  const engRow = (await h.operator.query('SELECT scope_requirement_ids FROM vendor.engagements WHERE id=$1', [e.id])).rows[0];
  file = (await lead.json(`${V}/engagements/${e.id}/file`)).data;
  check('scope: the approved revision becomes the engagement scope, with its change shown', [engRow.scope_requirement_ids, file.scope[1].change.removed], [scope, ['DPDP-NOTICE-LEGACY-CONSENT']]);

  // ---------------------------------------------------------------- D. risk methodology and work programme
  const m = (await h.operator.query('SELECT matrix, factors FROM vendor.methodologies WHERE id=$1', [practice.methodology_id])).rows[0];
  check('risk: ratings come from the approved matrix and residual steps', [rate(m, 5, 4, 'EFFECTIVE'), rate(m, 2, 3, 'NOT_ASSESSED')], [{ inherent: 'CRITICAL', residual: 'MEDIUM' }, { inherent: 'MEDIUM', residual: 'MEDIUM' }]);
  file = await ok(auditor.json(`${V}/engagements/${e.id}/risks`, { requirement_id: scope[1], risk: 'Withdrawal may not reach every system (synthetic).', likelihood: 4, impact: 4, affected_people: 'Every withdrawing customer', affected_scope: 'Marketing', duration: 'Audit period', uncertainty: 'Moderate',
    control_reference: 'Withdrawal workflow', control_effectiveness: 'NOT_ASSESSED', rationale: 'Two connectors lack read-back (synthetic).' }), 'risk high');
  check('risk: a client-supplied rating is never used; computed HIGH', [file.risks[0].inherent_rating, file.risks[0].residual_rating], ['HIGH', 'HIGH']);
  await ok(reviewer.json(`${V}/risks/${file.risks[0].id}/review`, {}), 'review risk');
  file = await ok(auditor.json(`${V}/engagements/${e.id}/risks`, { requirement_id: scope[0], risk: 'Notice may not itemise purposes (synthetic).', likelihood: 2, impact: 3, affected_people: 'Customers', affected_scope: 'Marketing', duration: 'Audit period', uncertainty: 'Low',
    control_reference: null, control_effectiveness: 'NOT_ASSESSED', rationale: 'Published notice reviewed last year (synthetic).' }), 'risk medium');
  await ok(reviewer.json(`${V}/risks/${file.risks[1].id}/review`, {}), 'review risk 2');
  const proc = async (requirement: string, nature: string, recordLevel = false, extra: Record<string, unknown> = {}) => (await ok(lead.json(`${V}/engagements/${e.id}/procedures`, { requirement_id: requirement, provision_ids: [], risk_assessment_id: null, control_reference: null,
    objective: `Test ${nature.toLowerCase()} for ${requirement} (synthetic).`, procedure_type: nature === 'OPERATING_EFFECTIVENESS' ? 'REPERFORMANCE' : 'INSPECTION', test_nature: nature, requires_record_level: recordLevel, owner_id: L.u.id, planned_start: '2026-07-01', planned_end: '2026-07-31', depends_on: [],
    evidence_expectation: 'Evidence per the requirement expectations.', completion_criteria: 'Reviewed working paper with a supported conclusion.', retest_of_finding_id: null, ...extra }), 'procedure')).procedures.at(-1).id as string;
  const pNotice = await proc(scope[0]!, 'DESIGN');
  const pDesign = await proc(scope[1]!, 'DESIGN');
  file = (await lead.json(`${V}/engagements/${e.id}/file`)).data;
  check('plan: a high residual risk without an operating-effectiveness procedure blocks approval', [file.plan.problems.some((p: string) => p.includes('operating-effectiveness')), code(await reviewer.json(`${V}/engagements/${e.id}/plan/approve`, {}))], [true, [409, 'plan_incomplete']]);
  check('plan: record-level testing is always operating effectiveness', code(await lead.json(`${V}/engagements/${e.id}/procedures`, { requirement_id: scope[1], provision_ids: [], risk_assessment_id: null, control_reference: null, objective: 'Record-level design test attempt.', procedure_type: 'INSPECTION', test_nature: 'DESIGN', requires_record_level: true, owner_id: L.u.id, planned_start: '2026-07-01', planned_end: '2026-07-31', depends_on: [], evidence_expectation: 'Evidence expected here.', completion_criteria: 'Completion criteria text.', retest_of_finding_id: null })), [400, 'record_level_testing_is_operating_effectiveness']);
  const pOE = await proc(scope[1]!, 'OPERATING_EFFECTIVENESS', true);
  check('fieldwork: a working paper before the programme is approved is refused', code(await auditor.json(`${V}/procedures/${pNotice}/working-papers`, { performed: 'Attempted before approval.', criteria: 'Requirement.', population_id: null, results: 'n/a', exceptions: 0, exception_details: null, conclusion: 'NOT_TESTED', evidence_ids: [] })), [409, 'work_programme_not_approved']);
  check('plan: the author of the programme cannot approve it', code(await lead.json(`${V}/engagements/${e.id}/plan/approve`, {})), [403, null]);
  await ok(reviewer.json(`${V}/engagements/${e.id}/plan/approve`, {}), 'approve plan');
  const pExtra = await proc(scope[0]!, 'IMPLEMENTATION');
  check('plan: a procedure added after approval un-approves the programme until re-approved', [(await lead.json(`${V}/engagements/${e.id}/file`)).data.plan.approved, code(await auditor.json(`${V}/procedures/${pNotice}/working-papers`, { performed: 'Attempted after a change.', criteria: 'Requirement.', population_id: null, results: 'n/a', exceptions: 0, exception_details: null, conclusion: 'NOT_TESTED', evidence_ids: [] }))], [false, [409, 'work_programme_not_approved']]);
  await ok(auditor.json(`${V}/procedures/${pExtra}/not-performed`, { reason: 'Superseded by the design procedure; recorded rather than deleted.' }), 'not performed');
  await ok(reviewer.json(`${V}/engagements/${e.id}/plan/approve`, {}), 're-approve plan');

  // ---------------------------------------------------------------- E. evidence register, evaluation and requests
  const uploaderAcct = await adm.json(`${V}/organisations/${org}/accounts`, { name: 'Cedar Uploader', email: 'uploader@cedar.example' });
  await new Promise(r => setTimeout(r, 61_000));
  const uploader = await h.login({ email: 'uploader@cedar.example', password: uploaderAcct.data.one_time_password, domain: 'account' });
  const statement = Buffer.from('Management states that every notice is itemised (synthetic).'); const doc = Buffer.from('%PDF-1.4\n1 0 obj << /Type /Catalog >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n', 'latin1');
  const items = [{ item_id: randomUUID(), requirement_id: scope[0]!, kind: 'STATEMENT' as const, title: 'Management statement on notices', file_name: null, media_type: 'text/plain' as const, bytes: statement },
    { item_id: randomUUID(), requirement_id: scope[0]!, kind: 'FILE' as const, title: 'Published notice v3', file_name: 'notice.pdf', media_type: 'application/pdf' as const, bytes: doc }];
  const manifest: AuditPackageManifest = { format: 'orvia.dpdpa-audit-package', format_version: 1, package_id: randomUUID(), installation_id: randomUUID(), organisation_name: 'Cedar Synthetic Ltd', engagement_code_digest: engagementCodeDigest(e.code), firm_name: 'ORVIA audit practice',
    engagement_reference: 'ENG-PRAC-1', audit_period: { from: '2026-01-01', to: '2026-06-30' }, scope_requirement_ids: [scope[0]!], regulatory_package: null, approval: { preparer_role: 'MEMBER', approver_role: 'ORG_ADMIN', distinct_people: true, approved_at: new Date(Date.now() - 60000).toISOString() },
    created_at: new Date(Date.now() - 120000).toISOString(), expires_at: new Date(Date.now() + 7 * 86400000).toISOString(),
    items: items.map(i => ({ item_id: i.item_id, requirement_id: i.requirement_id, kind: i.kind, title: i.title, file_name: i.file_name, media_type: i.media_type, size_bytes: i.bytes.length, sha256: sha256(i.bytes), contains_personal_data: 'NO' as const, personal_data_exception: null })), revoked_package_ids: [] };
  const up = await uploader.send(`${V}/uploads`, { method: 'POST', body: new Uint8Array(packageFileBytes(manifest, new Map(items.map(i => [i.item_id, i.bytes])))), headers: { 'content-type': 'application/vnd.orvia.audit-package+json', 'x-orvia-engagement-code': e.code } });
  const packageId = (await up.json()).package_id as string;
  check('evidence: a management statement cannot be registered as a document', code(await auditor.json(`${V}/engagements/${e.id}/evidence`, { source: 'PACKAGE_ITEM', package_id: packageId, item_id: items[0]!.item_id, evidence_type: 'DOCUMENT', valid_until: null, description: null })), [400, 'type_does_not_fit_the_item']);
  file = await ok(auditor.json(`${V}/engagements/${e.id}/evidence`, { source: 'PACKAGE_ITEM', package_id: packageId, item_id: items[0]!.item_id, evidence_type: null, valid_until: null, description: null }), 'assertion');
  const assertionId = file.evidence.at(-1).id as string;
  check('evidence: provenance, hash and access are recorded', [file.evidence.at(-1).evidence_type, file.evidence.at(-1).sha256, file.evidence.at(-1).provenance.includes('selected and released by the client'), file.evidence.at(-1).accessed > 0], ['MANAGEMENT_ASSERTION', sha256(statement), true, true]);
  check('evidence: an assertion is never high-reliability', code(await auditor.json(`${V}/evidence/${assertionId}/evaluations`, { procedure_id: pNotice, relevance: 'RELEVANT', reliability: 'HIGH', sufficiency: 'SUFFICIENT', contradicts: false, rationale: 'Attempted high reliability.' })), [400, 'an_assertion_is_not_high_reliability_evidence']);
  await ok(auditor.json(`${V}/evidence/${assertionId}/evaluations`, { procedure_id: pNotice, relevance: 'RELEVANT', reliability: 'MEDIUM', sufficiency: 'SUFFICIENT', contradicts: false, rationale: 'Management statement on notices (synthetic).' }), 'evaluate assertion');
  const wpBody = (conclusion: string, evidence: string[], extra: Record<string, unknown> = {}) => ({ performed: 'Inspected the listed evidence (synthetic).', criteria: 'Requirement statement.', population_id: null, results: 'As described.', exceptions: 0, exception_details: null, conclusion, evidence_ids: evidence, ...extra });
  check('working paper: assertions alone cannot support EFFECTIVE', code(await auditor.json(`${V}/procedures/${pNotice}/working-papers`, wpBody('EFFECTIVE', [assertionId]))), [409, 'assertions_or_interviews_alone_are_not_proof']);
  const stale = await evidenceFor({ auditor, engagementId: e.id, procedureId: pNotice, register: { source: 'AUDITOR_RECORD', evidence_type: 'OBSERVATION', title: 'Notice observed on the website', description: 'Observed the published notice on the synthetic site.', collection_method: 'Observation', collected_at: new Date(Date.now() - 3 * 86400000).toISOString(), period_from: null, period_to: null, valid_until: new Date(Date.now() - 86400000).toISOString() } });
  check('working paper: stale evidence cannot support EFFECTIVE', code(await auditor.json(`${V}/procedures/${pNotice}/working-papers`, wpBody('EFFECTIVE', [assertionId, stale]))), [409, 'assertions_or_interviews_alone_are_not_proof']);
  const noticeDoc = await evidenceFor({ auditor, engagementId: e.id, procedureId: pNotice, register: { source: 'PACKAGE_ITEM', package_id: packageId, item_id: items[1]!.item_id, evidence_type: null, valid_until: null, description: 'Notice v3, published 2026-01-05 (synthetic).' }, reliability: 'HIGH' });
  const contra = await evidenceFor({ auditor, engagementId: e.id, procedureId: pNotice, register: { source: 'AUDITOR_RECORD', evidence_type: 'INDEPENDENT_CORROBORATION', title: 'Archived notice without purposes', description: 'Web archive copy lacks the purpose list (synthetic).', collection_method: 'Independent archive lookup', collected_at: new Date().toISOString(), period_from: null, period_to: null, valid_until: null }, contradicts: true });
  check('working paper: contradictory evidence blocks EFFECTIVE', code(await auditor.json(`${V}/procedures/${pNotice}/working-papers`, wpBody('EFFECTIVE', [noticeDoc, contra]))), [409, 'contradictory_evidence_unresolved']);
  file = await ok(auditor.json(`${V}/procedures/${pNotice}/working-papers`, wpBody('EFFECTIVE', [noticeDoc, assertionId], { performed: 'Inspected notice v3; asked the DPO (dpo@cedar.example) to confirm the version.' })), 'wp effective');
  const wpNotice = file.working_papers.filter((w: { procedure_id: string }) => w.procedure_id === pNotice).at(-1);
  check('working paper: free text is screened and versioned with a digest', [wpNotice.redactions, wpNotice.performed.includes('@'), wpNotice.version, /^[a-f0-9]{64}$/.test(wpNotice.digest)], [1, false, 1, true]);
  // Requests
  file = await ok(auditor.json(`${V}/engagements/${e.id}/requests`, { requirement_id: scope[1], procedure_id: pOE, owner_role: 'Privacy operations lead', description: 'Provide the connector read-back configuration.', due_date: '2026-07-10' }), 'request');
  const req = file.requests.at(-1);
  check('requests: an overdue open request is flagged', [req.status, req.overdue], ['OPEN', today > '2026-07-10']);
  check('requests: accepting before any response is refused', code(await auditor.json(`${V}/requests/${req.id}/events`, { event: 'ACCEPTED', note: 'Accept attempt.', evidence_id: null })), [409, 'not_allowed_from_open']);
  await ok(auditor.json(`${V}/requests/${req.id}/events`, { event: 'CLARIFICATION_REQUESTED', note: 'Client asked which connectors are meant.', evidence_id: null }), 'clarify');
  await ok(auditor.json(`${V}/requests/${req.id}/events`, { event: 'CLARIFICATION_GIVEN', note: 'All marketing connectors.', evidence_id: null }), 'clarified');
  check('requests: a response links registered evidence', code(await auditor.json(`${V}/requests/${req.id}/events`, { event: 'RESPONSE_RECEIVED', note: 'Response without evidence.', evidence_id: null })), [400, 'a_response_links_the_registered_evidence']);
  await ok(auditor.json(`${V}/requests/${req.id}/events`, { event: 'RESPONSE_RECEIVED', note: 'Configuration screenshot received.', evidence_id: assertionId }), 'responded');
  await ok(auditor.json(`${V}/requests/${req.id}/events`, { event: 'RESUBMISSION_REQUESTED', note: 'Screenshot does not show the read-back setting.', evidence_id: null }), 'resubmit');
  file = await ok(auditor.json(`${V}/requests/${req.id}/events`, { event: 'UNABLE_TO_OBTAIN', note: 'Client could not export the configuration by the deadline.', evidence_id: null }), 'unable');
  check('requests: lifecycle recorded with every event', [file.requests.at(-1).status, file.requests.at(-1).events.map((x: { event: string }) => x.event)], ['UNABLE_TO_OBTAIN', ['CLARIFICATION_REQUESTED', 'CLARIFICATION_GIVEN', 'RESPONSE_RECEIVED', 'RESUBMISSION_REQUESTED', 'UNABLE_TO_OBTAIN']]);

  // ---------------------------------------------------------------- F. populations and sampling
  const sysEvidence = await evidenceFor({ auditor, engagementId: e.id, procedureId: pOE, register: { source: 'AUDITOR_RECORD', evidence_type: 'MANAGEMENT_ASSERTION', title: 'Interview with the privacy lead', description: 'Privacy lead stated all connectors verify withdrawals.', collection_method: 'Interview', collected_at: new Date().toISOString(), period_from: null, period_to: null, valid_until: null } });
  check('sampling: operating effectiveness needs a tested population', code(await auditor.json(`${V}/procedures/${pOE}/working-papers`, wpBody('EFFECTIVE', [noticeDoc]))), [409, 'no_relevant_sufficient_current_evidence']);
  const reperf = await evidenceFor({ auditor, engagementId: e.id, procedureId: pOE, register: { source: 'AUDITOR_RECORD', evidence_type: 'REPERFORMANCE', title: 'Re-performed withdrawal on 25 sampled records', description: 'Re-performed read-back for 25 records selected by seed (synthetic).', collection_method: 'Re-performance', collected_at: new Date().toISOString(), period_from: null, period_to: null, valid_until: null } });
  const listing = await evidenceFor({ auditor, engagementId: e.id, procedureId: pOE, register: { source: 'AUDITOR_RECORD', evidence_type: 'INDEPENDENT_CORROBORATION', title: 'Withdrawal count reconciled to the workflow log', description: 'Population count reconciled to the independent workflow log total (synthetic).', collection_method: 'Reconciliation', collected_at: new Date().toISOString(), period_from: null, period_to: null, valid_until: null } });
  const popBase = { source_kind: 'CLIENT_LISTING', definition: 'Consent withdrawal runs in the audit period (synthetic).', source: 'Workflow run listing', period_from: '2026-01-01', period_to: '2026-06-30', population_size: 400, completeness_basis: 'Reconciled to the workflow log total.', sample_method: 'SEEDED_RANDOM', sample_size: 25,
    size_rationale: 'High residual risk: 25 items per the methodology table.', seed: 'a'.repeat(32), exclusions: null, tested: 25, passed: 25, exceptions: 0, evidence_id: reperf };
  check('sampling: passed plus exceptions must equal tested', (await auditor.json(`${V}/procedures/${pOE}/populations`, { ...popBase, completeness: 'UNVERIFIED', completeness_evidence_id: null, passed: 24 })).status, 409);
  check('sampling: a complete population names its completeness evidence', code(await auditor.json(`${V}/procedures/${pOE}/populations`, { ...popBase, completeness: 'COMPLETE', completeness_evidence_id: null })), [400, 'complete_population_needs_completeness_evidence']);
  check('sampling: an assertion does not prove completeness', code(await auditor.json(`${V}/procedures/${pOE}/populations`, { ...popBase, completeness: 'COMPLETE', completeness_evidence_id: sysEvidence })), [400, 'an_assertion_does_not_prove_completeness']);
  file = await ok(auditor.json(`${V}/procedures/${pOE}/populations`, { ...popBase, completeness: 'UNVERIFIED', completeness_evidence_id: null }), 'population unverified');
  const popUnverified = file.populations.at(-1).id;
  check('sampling: a sample from an unverified population cannot support EFFECTIVE', code(await auditor.json(`${V}/procedures/${pOE}/working-papers`, wpBody('EFFECTIVE', [reperf], { population_id: popUnverified }))), [409, 'population_completeness_not_established']);
  file = await ok(auditor.json(`${V}/procedures/${pOE}/populations`, { ...popBase, completeness: 'COMPLETE', completeness_evidence_id: listing }), 'population complete');
  const popComplete = file.populations.at(-1).id;
  check('sampling: interviews alone are not proof even with a population', code(await auditor.json(`${V}/procedures/${pOE}/working-papers`, wpBody('EFFECTIVE', [sysEvidence], { population_id: popComplete }))), [409, 'assertions_or_interviews_alone_are_not_proof']);
  // A record-level procedure with only system-generated aggregates.
  const pAgg = await proc(scope[1]!, 'OPERATING_EFFECTIVENESS', true);
  await ok(reviewer.json(`${V}/engagements/${e.id}/plan/approve`, {}), 're-approve after aggregate procedure');
  const agg = await evidenceFor({ auditor, engagementId: e.id, procedureId: pAgg, register: { source: 'AUDITOR_RECORD', evidence_type: 'MANAGEMENT_ASSERTION', title: 'Aggregate count', description: 'A count only (synthetic).', collection_method: 'Count', collected_at: new Date().toISOString(), period_from: null, period_to: null, valid_until: null } });
  const docAgg = await evidenceFor({ auditor, engagementId: e.id, procedureId: pAgg, register: { source: 'PACKAGE_ITEM', package_id: packageId, item_id: items[1]!.item_id, evidence_type: 'DOCUMENT', valid_until: null, description: null } }).catch(() => noticeDoc);
  await ok(auditor.json(`${V}/evidence/${docAgg}/evaluations`, { procedure_id: pAgg, relevance: 'RELEVANT', reliability: 'MEDIUM', sufficiency: 'SUFFICIENT', contradicts: false, rationale: 'Document relevant to the aggregate procedure.' }), 'eval doc for agg');
  await ok(auditor.json(`${V}/evidence/${listing}/evaluations`, { procedure_id: pAgg, relevance: 'RELEVANT', reliability: 'HIGH', sufficiency: 'SUFFICIENT', contradicts: false, rationale: 'Reconciliation relevant to completeness.' }), 'eval listing for agg');
  const popAgg = (await ok(auditor.json(`${V}/procedures/${pAgg}/populations`, { ...popBase, evidence_id: agg, completeness: 'COMPLETE', completeness_evidence_id: listing }), 'pop agg')).populations.at(-1).id;
  check('sampling: aggregates are no substitute for record-level testing', code(await auditor.json(`${V}/procedures/${pAgg}/working-papers`, wpBody('EFFECTIVE', [agg, docAgg], { population_id: popAgg }))), [409, 'aggregates_are_no_substitute_for_record_level_testing']);
  await ok(auditor.json(`${V}/procedures/${pAgg}/working-papers`, wpBody('UNABLE_TO_TEST', [], { results: 'Record-level evidence could not be obtained; see the request log.' })), 'wp unable');
  // The operating-effectiveness paper with exceptions: an adverse conclusion.
  file = await ok(auditor.json(`${V}/procedures/${pOE}/populations`, { ...popBase, completeness: 'COMPLETE', completeness_evidence_id: listing, passed: 23, exceptions: 2 }), 'pop with exceptions');
  const popEx = file.populations.at(-1).id;
  check('working paper: a sample with exceptions cannot be EFFECTIVE', code(await auditor.json(`${V}/procedures/${pOE}/working-papers`, wpBody('EFFECTIVE', [reperf], { population_id: popEx }))), [409, 'sample_exceptions_recorded']);
  file = await ok(auditor.json(`${V}/procedures/${pOE}/working-papers`, wpBody('EXCEPTIONS_NOTED', [reperf], { population_id: popEx, exceptions: 2, exception_details: 'Two sampled withdrawals had no read-back in the CRM connector.' })), 'wp exceptions');
  const wpOE = file.working_papers.filter((w: { procedure_id: string }) => w.procedure_id === pOE).at(-1);
  check('working paper: evidence not evaluated for this procedure cannot support it', code(await auditor.json(`${V}/procedures/${pDesign}/working-papers`, wpBody('EFFECTIVE', [noticeDoc]))), [409, 'no_relevant_sufficient_current_evidence']);
  await ok(auditor.json(`${V}/procedures/${pDesign}/working-papers`, wpBody('NOT_TESTED', [], { results: 'Design covered by the operating-effectiveness procedure.' })), 'wp design not tested');

  // ---------------------------------------------------------------- review notes and independent review
  check('review: the preparer cannot review their own paper', code(await auditor.json(`${V}/working-papers/${wpOE.id}/review`, {})), [403, null]);
  file = await ok(reviewer.json(`${V}/working-papers/${wpOE.id}/notes`, { note: 'State which connector failed and whether it is in scope.' }), 'note');
  const note = file.working_papers.find((w: { id: string }) => w.id === wpOE.id).notes[0];
  check('review: an open review note blocks review', code(await reviewer.json(`${V}/working-papers/${wpOE.id}/review`, {})), [409, 'open_review_notes']);
  check('review: only the preparer answers a note', code(await lead.json(`${V}/review-notes/${note.id}/respond`, { response: 'Lead answering instead.' })), [403, 'only_the_preparer_responds']);
  await ok(auditor.json(`${V}/review-notes/${note.id}/respond`, { response: 'The CRM connector, in scope.' }), 'respond');
  await ok(reviewer.json(`${V}/review-notes/${note.id}/resolve`, {}), 'resolve');
  const allPapers = (await lead.json(`${V}/engagements/${e.id}/file`)).data.working_papers.filter((w: { current: boolean; reviewed_by: string | null }) => w.current && !w.reviewed_by);
  for (const w of allPapers) await ok(reviewer.json(`${V}/working-papers/${w.id}/review`, {}), `review ${w.id}`);
  check('review: a reviewed working paper version is immutable', await h.operator.query("UPDATE vendor.working_papers SET results='changed' WHERE id=$1", [wpOE.id]).then(() => 'UPDATED', x => x.message), 'working_paper_versions_are_immutable');

  // ---------------------------------------------------------------- G. findings, responses, retests, risk acceptance, closure
  const findingBody = { requirement_id: scope[1], provision_ids: ['ACT-S6(4)'], criterion_type: 'STATUTORY', severity: 'HIGH', title: 'Withdrawal not verified in the CRM connector', observation: 'Two of 25 sampled withdrawals had no read-back.', affected_scope: 'CRM marketing connector',
    cause: 'Read-back verification was not configured for the CRM connector.', consequence: 'Withdrawn customers may keep receiving marketing.', severity_rationale: 'High residual risk; every withdrawing customer is exposed.', recommendation: 'Configure read-back verification for the CRM connector and re-run pending withdrawals.',
    orvia_guidance: null, due_date: inDays(60), working_paper_ids: [wpOE.id], evidence_ids: [reperf] };
  check('finding: rests on an adverse working paper for its requirement', code(await auditor.json(`${V}/engagements/${e.id}/findings`, { ...findingBody, working_paper_ids: [wpNotice.id] })), [409, 'a_finding_rests_on_an_adverse_working_paper_for_its_requirement']);
  check('finding: a recommendation is never a command', code(await auditor.json(`${V}/engagements/${e.id}/findings`, { ...findingBody, recommendation: 'Run `psql -c "UPDATE consent SET state=1"` on the CRM.' })), [400, 'recommendation_must_not_contain_commands_or_code']);
  file = await ok(auditor.json(`${V}/engagements/${e.id}/findings`, findingBody), 'finding');
  const f1 = file.findings.at(-1);
  file = await ok(auditor.json(`${V}/engagements/${e.id}/findings`, { ...findingBody, severity: 'LOW', title: 'Connector inventory incomplete', criterion_type: 'ADVISORY', provision_ids: [], observation: 'Inventory omits one test connector.', cause: 'Manual inventory.', consequence: 'Minor tracking gap.', severity_rationale: 'Low; advisory only.', recommendation: 'Keep the inventory in ORVIA.' }), 'finding 2');
  const f2 = file.findings.at(-1);
  check('finding: carries criteria, condition, cause, consequence and severity rationale', [f1.criterion_type, !!f1.cause, !!f1.consequence, !!f1.severity_rationale, f1.working_paper_ids], ['STATUTORY', true, true, true, [wpOE.id]]);
  check('finding: the legacy event route cannot set retest or closure', code(await auditor.json(`${V}/findings/${f1.id}/events`, { event: 'RETEST_PASSED', note: 'Attempt via note.' })), [409, 'use_the_retest_or_closure_action']);
  check('finding: status cannot be set to RETEST_PASSED without a retest', await h.operator.query("UPDATE vendor.findings SET status='RETEST_PASSED' WHERE id=$1", [f1.id]).then(() => 'UPDATED', x => x.message), 'retest_passed_requires_a_reviewed_passing_retest');
  check('MEETS refused while a statutory finding is open', code(await auditor.json(`${V}/engagements/${e.id}/results`, { requirement_id: scope[1], result: 'MEETS', rationale: 'Attempt despite the open finding.' })), [409, 'favourable_conclusion_needs_reviewed_effective_work_and_no_open_statutory_finding']);
  // Retest round trip (the channel variant is exercised in the cross-installation suite).
  const pRetest = await proc(scope[1]!, 'OPERATING_EFFECTIVENESS', false, { retest_of_finding_id: f1.id });
  check('retest: needs a management response first', code(await reviewer.json(`${V}/findings/${f1.id}/retests`, { working_paper_id: wpOE.id })), [409, 'retest_needs_a_management_response']);
  await ok(auditor.json(`${V}/findings/${f1.id}/responses`, { factual_accuracy: 'AGREED', agreement: 'AGREE', response: 'Read-back configured on the CRM connector.', action_plan: 'Configure and re-run.', owner_role: 'Privacy operations lead', due_date: inDays(30), dependencies: null, remediation_status: 'COMPLETED_CLAIMED', reference: 'Client letter REF-7 (synthetic)' }), 'response');
  check('retest: a paper that is not a retest procedure for this finding is refused', code(await reviewer.json(`${V}/findings/${f1.id}/retests`, { working_paper_id: wpOE.id })), [409, 'not_a_retest_procedure_for_this_finding']);
  // A retest resting on evidence collected before the finding.
  const oldEvidence = reperf;
  await ok(auditor.json(`${V}/evidence/${oldEvidence}/evaluations`, { procedure_id: pRetest, relevance: 'RELEVANT', reliability: 'HIGH', sufficiency: 'SUFFICIENT', contradicts: false, rationale: 'Old re-performance evaluated for the retest.' }), 'eval old');
  await ok(auditor.json(`${V}/evidence/${listing}/evaluations`, { procedure_id: pRetest, relevance: 'RELEVANT', reliability: 'HIGH', sufficiency: 'SUFFICIENT', contradicts: false, rationale: 'Reconciliation relevant for the retest population.' }), 'eval listing retest');
  const popRetest = (await ok(auditor.json(`${V}/procedures/${pRetest}/populations`, { ...popBase, completeness: 'COMPLETE', completeness_evidence_id: listing, seed: 'b'.repeat(32) }), 'pop retest')).populations.at(-1).id;
  const wpOld = await paper({ preparer: auditor, reviewer, procedureId: pRetest, conclusion: 'EFFECTIVE', evidence: [oldEvidence], population_id: popRetest });
  check('retest: evidence collected before the finding cannot pass it', code(await reviewer.json(`${V}/findings/${f1.id}/retests`, { working_paper_id: wpOld })), [409, 'retest_needs_evidence_collected_after_the_finding']);
  const fresh = await evidenceFor({ auditor, engagementId: e.id, procedureId: pRetest, register: { source: 'AUDITOR_RECORD', evidence_type: 'REPERFORMANCE', title: 'Re-performed read-back after remediation', description: 'Re-performed 25 fresh withdrawals; all verified (synthetic).', collection_method: 'Re-performance', collected_at: new Date().toISOString(), period_from: null, period_to: null, valid_until: null }, reliability: 'HIGH' });
  const wpFresh = await paper({ preparer: auditor, reviewer, procedureId: pRetest, conclusion: 'EFFECTIVE', evidence: [fresh], population_id: popRetest });
  check('retest: a reviewer outside the engagement cannot even see the finding', code(await reviewer2.json(`${V}/findings/${f1.id}/retests`, { working_paper_id: wpFresh })), [404, 'not_found']);
  file = await ok(reviewer.json(`${V}/findings/${f1.id}/retests`, { working_paper_id: wpFresh }), 'retest');
  const f1r = file.findings.find((x: { id: string }) => x.id === f1.id);
  check('retest: RETEST_PASSED only with the retest procedure, fresh evidence and a different reviewer', [f1r.status, f1r.retests[0].result, f1r.retests[0].performed_by !== f1r.retests[0].reviewed_by, f1r.retests[0].evidence_ids], ['RETEST_PASSED', 'PASSED', true, [fresh]]);
  check('closure: an auditor cannot close as verified remediation', code(await auditor.json(`${V}/findings/${f1.id}/close`, { closure_type: 'VERIFIED_REMEDIATION', reason: 'Auditor closing the finding.' })), [403, null]);
  file = await ok(reviewer.json(`${V}/findings/${f1.id}/close`, { closure_type: 'VERIFIED_REMEDIATION', reason: 'Retest passed on fresh re-performance evidence.' }), 'close verified');
  check('closure: verified remediation recorded and final', [file.findings.find((x: { id: string }) => x.id === f1.id).closure_type, code(await reviewer.json(`${V}/findings/${f1.id}/close`, { closure_type: 'ADMINISTRATIVE', reason: 'Second closure attempt.' }))], ['VERIFIED_REMEDIATION', [409, 'closed']]);
  // Risk acceptance on the advisory finding.
  file = await ok(auditor.json(`${V}/findings/${f2.id}/responses`, { factual_accuracy: 'AGREED', agreement: 'PARTIALLY_AGREE', response: 'The test connector is decommissioned next quarter.', action_plan: null, owner_role: 'IT lead', due_date: null, dependencies: null, remediation_status: 'NOT_STARTED', reference: 'Client email REF-8 (synthetic)' }), 'response 2');
  const resp2 = file.findings.find((x: { id: string }) => x.id === f2.id).responses[0];
  check('risk acceptance: refused unless the client proposed it', code(await reviewer.json(`${V}/findings/${f2.id}/risk-acceptances`, { management_response_id: resp2.id, accepting_authority: 'Board risk committee', justification: 'Connector retires soon; tracking gap is minor.', expires_on: inDays(90), review_on: inDays(60) })), [409, 'client_has_not_proposed_risk_acceptance']);
  file = await ok(auditor.json(`${V}/findings/${f2.id}/responses`, { factual_accuracy: 'AGREED', agreement: 'PARTIALLY_AGREE', response: 'We propose to accept the risk until decommissioning.', action_plan: null, owner_role: 'IT lead', due_date: null, dependencies: null, remediation_status: 'RISK_ACCEPTANCE_PROPOSED', reference: 'Board minute BM-3 (synthetic)' }), 'response 3');
  const resp3 = file.findings.find((x: { id: string }) => x.id === f2.id).responses.at(-1);
  check('risk acceptance: at most one year', code(await reviewer.json(`${V}/findings/${f2.id}/risk-acceptances`, { management_response_id: resp3.id, accepting_authority: 'Board risk committee', justification: 'Connector retires soon; tracking gap is minor.', expires_on: inDays(400), review_on: inDays(60) })), [400, 'at_most_one_year']);
  check('closure: risk accepted needs an acceptance record', await h.operator.query("UPDATE vendor.findings SET status='CLOSED', closure_type='RISK_ACCEPTED', closed_at=now() WHERE id=$1", [f2.id]).then(() => 'UPDATED', x => x.message), 'risk_acceptance_record_required');
  await ok(reviewer.json(`${V}/findings/${f2.id}/risk-acceptances`, { management_response_id: resp3.id, accepting_authority: 'Board risk committee', justification: 'Connector retires soon; tracking gap is minor and advisory.', expires_on: inDays(90), review_on: inDays(60) }), 'risk acceptance');
  file = await ok(reviewer.json(`${V}/findings/${f2.id}/close`, { closure_type: 'RISK_ACCEPTED', reason: 'Accepted by the Board risk committee until decommissioning.' }), 'close risk accepted');
  check('risk acceptance: the finding stays on file, closed as risk accepted', [file.findings.length, file.findings.find((x: { id: string }) => x.id === f2.id).closure_type, file.findings.find((x: { id: string }) => x.id === f2.id).risk_acceptances.length], [2, 'RISK_ACCEPTED', 1]);

  // ---------------------------------------------------------------- H. conclusions, report binding, corrections
  await ok(auditor.json(`${V}/engagements/${e.id}/results`, { requirement_id: scope[0], result: 'MEETS', rationale: 'Itemised notice evidenced by the published version and management statement.' }), 'meets');
  const draftBody = { opinion_as_of: today, executive_summary: 'Synthetic engagement: notice requirement met; withdrawal requirement partially met, with a remediated high finding and an accepted advisory finding.', method: 'Risk-based procedures per the approved programme; seeded samples; re-performance.',
    opinion: 'Based on the procedures performed, one requirement is met and one is partially met as described in the findings.', limitations: ['Record-level evidence for one procedure could not be obtained.'], supersedes_report_id: null, correction_reason: null };
  let draft = await ok(lead.json(`${V}/engagements/${e.id}/reports`, draftBody), 'draft');
  check('report: approval refused while a scoped requirement has no conclusion', code(await reviewer.json(`${V}/reports/${draft.id}/approve`, {})), [409, `no_conclusion_for_${scope[1]}`]);
  await ok(auditor.json(`${V}/engagements/${e.id}/results`, { requirement_id: scope[1], result: 'PARTIALLY_MEETS', rationale: 'Two sampled withdrawals lacked read-back before remediation; retest passed.' }), 'partial');
  draft = await ok(lead.json(`${V}/engagements/${e.id}/reports`, draftBody), 'redraft');
  let approved = await ok(reviewer.json(`${V}/reports/${draft.id}/approve`, {}), 'approve');
  const bound = (await h.operator.query('SELECT approved_snapshot_digest, snapshot IS NOT NULL AS has FROM vendor.reports WHERE id=$1', [draft.id])).rows[0];
  check('report: approval binds the snapshot digest', [approved.state, bound.has, /^[a-f0-9]{64}$/.test(bound.approved_snapshot_digest)], ['APPROVED', true, true]);
  check('report: the bound digest cannot be changed', await h.operator.query("UPDATE vendor.reports SET approved_snapshot_digest=repeat('0',64) WHERE id=$1", [draft.id]).then(() => 'UPDATED', x => x.message), 'snapshot_is_bound_at_approval');
  await ok(auditor.json(`${V}/engagements/${e.id}/results`, { requirement_id: scope[1], result: 'DOES_NOT_MEET', rationale: 'Changed after approval to test the binding.' }), 'change after approval');
  check('report: signing refuses a snapshot changed after approval', code(await lead.json(`${V}/reports/${draft.id}/sign`, {})), [409, 'snapshot_changed_since_approval']);
  await ok(auditor.json(`${V}/engagements/${e.id}/results`, { requirement_id: scope[1], result: 'PARTIALLY_MEETS', rationale: 'Two sampled withdrawals lacked read-back before remediation; retest passed.' }), 'restore');
  draft = await ok(lead.json(`${V}/engagements/${e.id}/reports`, draftBody), 'redraft 2');
  approved = await ok(reviewer.json(`${V}/reports/${draft.id}/approve`, {}), 'approve 2');
  const signed = await ok(lead.json(`${V}/reports/${draft.id}/sign`, {}), 'sign');
  const trust = installationTrust('codex-a00')!;
  const document = verifyAuditDocument(signed.signed, trust.audit!) as Record<string, unknown> & { watermarks: string[]; coverage: unknown[]; criteria: { distribution: string } };
  check('report: signed document carries the snapshot digest, criteria, coverage and visible marks', [document.snapshot_digest, document.criteria.distribution, document.coverage.length, document.watermarks.length, document.use_kind],
    [bound.approved_snapshot_digest === document.snapshot_digest ? document.snapshot_digest : (await h.operator.query('SELECT approved_snapshot_digest FROM vendor.reports WHERE id=$1', [draft.id])).rows[0].approved_snapshot_digest, 'TEST_FIXTURE', 2, 3, 'SYNTHETIC']);
  const pdf = Buffer.from((await lead.json(`${V}/reports/${draft.id}/pdf`)).data.pdf_base64, 'base64').toString('latin1');
  check('report: the PDF shows the synthetic, test-fixture and development-key marks and the executive summary', ['SYNTHETIC ENGAGEMENT', 'TEST-FIXTURE CRITERIA', 'DEVELOPMENT SIGNING KEY', 'Executive summary', 'Management response'].map(x => pdf.includes(x)), [true, true, true, true, true]);
  check('report: accepted risk and unobtainable evidence stay visible', [pdf.includes('Risk accepted by'), (document.limitations as string[]).some(l => l.includes('could not be obtained'))], [true, true]);
  // Correction
  check('correction: only a signed report is corrected', code(await lead.json(`${V}/engagements/${e.id}/reports`, { ...draftBody, supersedes_report_id: e0.id, correction_reason: 'Correcting a report that does not exist.' })), [404, 'not_found']);
  const correction = await ok(lead.json(`${V}/engagements/${e.id}/reports`, { ...draftBody, supersedes_report_id: draft.id, correction_reason: 'Corrected the audit period stated in the executive summary.' }), 'correction draft');
  await ok(reviewer.json(`${V}/reports/${correction.id}/approve`, {}), 'approve correction');
  const corrected = await ok(lead.json(`${V}/reports/${correction.id}/sign`, {}), 'sign correction');
  const cdoc = verifyAuditDocument(corrected.signed, trust.audit!) as Record<string, unknown>;
  const states = (await lead.json(`${V}/engagements/${e.id}/reports`)).data.items.map((r: { id: string; state: string }) => [r.id === draft.id ? 'original' : r.id === correction.id ? 'correction' : 'other', r.state]).filter((x: string[]) => x[0] !== 'other');
  check('correction: the corrected report names what it supersedes and the original is superseded', [cdoc.supersedes_report_id, states.sort()], [draft.id, [['correction', 'SIGNED'], ['original', 'SUPERSEDED']]]);

  // ---------------------------------------------------------------- retention holds
  check('hold: an administrator cannot authorise a legal hold', (await adm.json(`${V}/engagements/${e.id}/holds`, { reason: 'Regulatory inquiry (synthetic).', expires_on: null })).status, 403);
  const hold = await ok(own.json(`${V}/engagements/${e.id}/holds`, { reason: 'Regulatory inquiry received (synthetic).', expires_on: null }), 'hold');
  await adm.json(`${V}/engagements/${e.id}/close`, {});
  await h.operator.query('ALTER TABLE vendor.engagements DISABLE TRIGGER USER'); await h.operator.query("UPDATE vendor.engagements SET closed_at = closed_at - interval '31 days' WHERE id=$1", [e.id]); await h.operator.query('ALTER TABLE vendor.engagements ENABLE TRIGGER USER');
  check('hold: retention does not purge an engagement under an active hold', (await adm.json(`${V}/retention/sweep`, {})).data.purged.map((p: { engagement_id: string }) => p.engagement_id).includes(e.id), false);
  await ok(own.json(`${V}/holds/${hold.items[0].id}/release`, { reason: 'Inquiry closed; no further hold needed.' }), 'release');
  check('hold: once released, retention purges the evidence', (await adm.json(`${V}/retention/sweep`, {})).data.purged.map((p: { engagement_id: string }) => p.engagement_id).includes(e.id), true);
  check('findings: every finding ends closed with a recorded closure type', (await h.operator.query("SELECT count(*)::int AS n FROM vendor.findings WHERE engagement_id=$1 AND status<>'CLOSED'", [e.id])).rows[0].n, 0);
} catch (error) { results.push({ name: 'suite', result: 'FAIL', detail: String((error as Error).stack ?? error).slice(0, 800) }); console.error(error); }
finally {
  await h.close();
  const failed = results.filter(r => r.result === 'FAIL').length;
  mkdirSync('handoffs/code/artifacts', { recursive: true });
  writeFileSync(`handoffs/code/artifacts/audit-practice-${new Date().toISOString().replace(/[:.]/g, '-')}.json`, JSON.stringify({ suite: 'audit-practice', database: h.database, passed: results.length - failed, failed, results }, null, 2));
  console.log(`\naudit-practice: ${results.length - failed}/${results.length} passed`);
  process.exitCode = failed ? 1 : 0;
}
