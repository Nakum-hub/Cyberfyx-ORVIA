import { randomUUID } from 'node:crypto';
import type pg from 'pg';
import * as P from '../../../shared/contracts/src/vendor-practice.ts';
import * as V from '../../../shared/contracts/src/vendor-audit.ts';
import { sha256 } from '../../../shared/contracts/src/audit-exchange.ts';
import { canonicalJson } from '../../../shared/contracts/src/crypto.ts';
import { redactContactDetails } from '../../../shared/contracts/src/redaction.ts';
import { requirements as baselineRequirements, officialSources } from '../../../scripts/regulatory/dpdp-baseline.ts';
import { AccessError } from '../../authorization/src/index.ts';
import { signAuditDocument } from './signing.ts';
import { renderPdf, type PdfLine } from './pdf.ts';
import { type Ctx, type Keys, iso, day, refuse, guarded, audit, engagementRow, onTeam, requireTeam, header, storeSigned, assertWording, reportRow, reportView } from './service.ts';

/**
 * The evidence-based DPDPA audit practice (task AUDIT-PRACTICE-01) on the
 * vendor's VENDOR_SERVICE installation. It extends the revision 1.5/1.6
 * engagement with:
 *
 *   practice    criteria versions, an approved risk methodology, and the
 *               activation gates a real engagement needs;
 *   acceptance  service type, terms, conflicts and an independent decision;
 *   planning    understanding, provision-level applicability, scope versions,
 *               risk assessments and an approved work programme;
 *   fieldwork   an evidence register with evaluations, request lifecycle,
 *               populations and samples, working papers with review notes;
 *   outcomes    structured findings, management responses, retests, risk
 *               acceptance, closure types, a report bound to its approved
 *               snapshot, corrections and legal holds.
 *
 * Vendor migrations 0008-0009 enforce the separation of duties and the
 * integrity rules; the checks here add the workflow and evidence rules and
 * give each refusal a specific reason. Free text entering the engagement file
 * is screened for contact details and identifiers first.
 */
const digestOf = (value: unknown) => sha256(Buffer.from(canonicalJson(value), 'utf8'));
const DEV_KEY_PREFIX = 'orvia-audit-dev-';
const RATINGS = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
type Rating = typeof RATINGS[number];

/** Screens free text (and every string inside an object) for contact details; returns the cleaned value and the number of redactions. */
function clean<T>(value: T): { value: T; redactions: number } {
  let redactions = 0;
  const walk = (v: unknown): unknown => {
    if (typeof v === 'string') { const r = redactContactDetails(v); redactions += r.redactions; return r.text; }
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, walk(x)]));
    return v;
  };
  return { value: walk(value) as T, redactions };
}
/** A recommendation is advice for people to act on, never something a system could run. */
const COMMAND_LIKE = [/`/, /^\s*(\$|#|>)\s/m, /\b(sudo|rm\s+-|curl\s|wget\s|chmod\s|psql\s|bash\s|powershell)\b/i, /\b(DROP|TRUNCATE|ALTER)\s+(TABLE|DATABASE|SCHEMA)\b/i, /\bDELETE\s+FROM\b/i, /\bUPDATE\s+\w+\s+SET\b/i, /<script/i];
function assertAdvisory(field: string, text: string) { if (COMMAND_LIKE.some(p => p.test(text))) refuse(400, field, 'recommendation_must_not_contain_commands_or_code'); }

// ---------------------------------------------------------------- practice level
function auditKeyState(keys?: Keys) {
  try { const k = keys?.audit(); return k ? { key_id: k.key_id, development: k.key_id.startsWith(DEV_KEY_PREFIX) } : null; } catch { return null; }
}
export async function practiceState(c: Ctx, keys?: Keys) {
  const criteria = (await c.tx.query('SELECT id, version, distribution, jsonb_array_length(requirements) AS n, digest, recorded_by, approved_by, approved_at, created_at FROM vendor.criteria_versions ORDER BY created_at DESC LIMIT 200')).rows;
  const methodologies = (await c.tx.query('SELECT * FROM vendor.methodologies ORDER BY created_at DESC LIMIT 200')).rows;
  const activations = (await c.tx.query('SELECT * FROM vendor.practice_activations ORDER BY recorded_at DESC LIMIT 200')).rows;
  const missing = (await c.tx.query('SELECT vendor.practice_gates_missing() AS g')).rows[0].g as string[];
  return P.PracticeState.parse({
    criteria: criteria.map(r => ({ id: r.id, version: r.version, distribution: r.distribution, requirements: r.n, digest: r.digest, recorded_by: r.recorded_by, approved_by: r.approved_by, approved_at: iso(r.approved_at), created_at: iso(r.created_at) })),
    methodologies: methodologies.map(r => ({ id: r.id, version: r.version, digest: r.digest, definition: methodologyDefinition(r), recorded_by: r.recorded_by, approved_by: r.approved_by, approved_at: iso(r.approved_at), created_at: iso(r.created_at) })),
    activations: activations.map(r => ({ id: r.id, gate: r.gate, reference: r.reference, recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at) })),
    gates_missing: missing, real_use_allowed: missing.length === 0, audit_key: auditKeyState(keys),
    statement: missing.length ? `Real client engagements are refused until every gate is recorded: ${missing.map(g => GATE_LABELS[g] ?? g).join('; ')}. Synthetic engagements carry a visible SYNTHETIC mark and test-fixture criteria.` : 'All activation gates are recorded. Each real engagement still needs production criteria and its own acceptance decision.',
  });
}
const methodologyDefinition = (r: pg.QueryResultRow) => ({ likelihood_scale: r.likelihood_scale, impact_scale: r.impact_scale, matrix: r.matrix, severity_rules: r.severity_rules, ...r.factors });

/** Records the ORVIA DPDP baseline as a TEST_FIXTURE criteria version. Production criteria come only from the official, signed regulatory package. */
export async function recordCriteriaFixture(c: Ctx, input: unknown) {
  const v = P.CriteriaFixtureRecord.parse(input);
  const requirements = baselineRequirements.map(r => ({ requirement_id: r.requirement_id, title: r.title, provision_ids: [...r.provision_ids], statement: r.statement, evidence_expectations: [...r.evidence_expectations] }));
  const sources = officialSources.map(s => ({ source_id: s.source_id, title: s.title, notification_reference: s.notification_reference, official_url: s.official_url, retrieved_and_hashed: false }));
  const id = randomUUID(); const digest = digestOf({ version: v.version, distribution: 'TEST_FIXTURE', sources, requirements });
  return guarded(async () => {
    await c.tx.query(`INSERT INTO vendor.criteria_versions (id, version, distribution, sources, requirements, digest, recorded_by) VALUES ($1,$2,'TEST_FIXTURE',$3,$4,$5,$6)`, [id, v.version, JSON.stringify(sources), JSON.stringify(requirements), digest, c.actor.actor_id]);
    await audit(c, 'vendor.practice.criteria-recorded', id); return practiceState(c);
  });
}
export async function approveCriteria(c: Ctx, id: string) {
  const r = (await c.tx.query('SELECT * FROM vendor.criteria_versions WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (r.approved_by) refuse(409, 'criteria', 'already_approved');
  if (r.recorded_by === c.actor.actor_id) refuse(409, 'approved_by', 'approver_must_differ_from_recorder');
  return guarded(async () => { await c.tx.query('UPDATE vendor.criteria_versions SET approved_by=$2, approved_at=clock_timestamp() WHERE id=$1', [id, c.actor.actor_id]);
    await audit(c, 'vendor.practice.criteria-approved', id); return practiceState(c); });
}
export async function recordMethodology(c: Ctx, input: unknown) {
  const v = P.MethodologyRecord.parse(input);
  // Ratings never fall as likelihood or impact rises.
  for (let l = 0; l < 5; l++) for (let i = 0; i < 5; i++) {
    const here = RATINGS.indexOf(v.matrix[l]![i]!);
    if ((l > 0 && RATINGS.indexOf(v.matrix[l - 1]![i]!) > here) || (i > 0 && RATINGS.indexOf(v.matrix[l]![i - 1]!) > here)) refuse(400, 'matrix', 'ratings_must_not_decrease_with_likelihood_or_impact');
  }
  const cleaned = clean({ severity_rules: v.severity_rules, considerations: v.considerations });
  const factors = { residual_steps: v.residual_steps, considerations: cleaned.value.considerations };
  const id = randomUUID(); const digest = digestOf({ version: v.version, likelihood_scale: v.likelihood_scale, impact_scale: v.impact_scale, matrix: v.matrix, severity_rules: cleaned.value.severity_rules, factors });
  return guarded(async () => {
    await c.tx.query(`INSERT INTO vendor.methodologies (id, version, likelihood_scale, impact_scale, matrix, severity_rules, factors, digest, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [id, v.version, JSON.stringify(v.likelihood_scale), JSON.stringify(v.impact_scale), JSON.stringify(v.matrix), cleaned.value.severity_rules, JSON.stringify(factors), digest, c.actor.actor_id]);
    await audit(c, 'vendor.practice.methodology-recorded', id); return practiceState(c);
  });
}
export async function approveMethodology(c: Ctx, id: string) {
  const r = (await c.tx.query('SELECT * FROM vendor.methodologies WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (r.approved_by) refuse(409, 'methodology', 'already_approved');
  if (r.recorded_by === c.actor.actor_id) refuse(409, 'approved_by', 'approver_must_differ_from_recorder');
  return guarded(async () => { await c.tx.query('UPDATE vendor.methodologies SET approved_by=$2, approved_at=clock_timestamp() WHERE id=$1', [id, c.actor.actor_id]);
    await audit(c, 'vendor.practice.methodology-approved', id); return practiceState(c); });
}
const GATE_LABELS: Record<string, string> = { ENGAGEMENT_LETTER_TEMPLATE_APPROVED: 'engagement letter template approved by management',
  PROCESSING_AGREEMENT_TEMPLATE_APPROVED: 'processing agreement template approved by management', PRODUCTION_AUDIT_KEY: 'production audit signing key',
  PRODUCTION_CRITERIA: 'production criteria from the official, signed regulatory package' };
export async function recordActivation(c: Ctx, input: unknown, keys: Keys) {
  const v = P.ActivationRecord.parse(input);
  if (v.gate === 'PRODUCTION_AUDIT_KEY') { const k = auditKeyState(keys); if (!k || k.development) refuse(409, 'gate', 'audit_key_is_a_development_key'); }
  if (v.gate === 'PRODUCTION_CRITERIA' && !(await c.tx.query("SELECT 1 FROM vendor.criteria_versions WHERE distribution='PRODUCTION' AND approved_by IS NOT NULL")).rowCount) refuse(409, 'gate', 'no_approved_production_criteria');
  if ((await c.tx.query('SELECT 1 FROM vendor.practice_activations WHERE gate=$1', [v.gate])).rowCount) refuse(409, 'gate', 'already_recorded');
  const cleaned = clean(v.reference);
  return guarded(async () => { const id = randomUUID(); await c.tx.query('INSERT INTO vendor.practice_activations (id, gate, reference, recorded_by) VALUES ($1,$2,$3,$4)', [id, v.gate, cleaned.value, c.actor.actor_id]);
    await audit(c, 'vendor.practice.gate-recorded', id); return practiceState(c, keys); });
}

// ---------------------------------------------------------------- engagement configuration, acceptance, conflicts
async function criteriaFor(c: Ctx, e: pg.QueryResultRow) {
  if (!e.criteria_version_id) refuse(409, 'engagement', 'criteria_not_configured');
  const r = (await c.tx.query('SELECT * FROM vendor.criteria_versions WHERE id=$1', [e.criteria_version_id])).rows[0] ?? refuse(409, 'engagement', 'criteria_not_found');
  return { row: r, requirements: new Map((r.requirements as { requirement_id: string; provision_ids: string[]; title: string; evidence_expectations: string[] }[]).map(x => [x.requirement_id, x])) };
}
async function requireAccepted(c: Ctx, id: string) {
  const e = await engagementRow(c, id);
  if (!(await c.tx.query('SELECT vendor.engagement_accepted($1) AS ok', [id])).rows[0].ok) refuse(409, 'engagement', 'engagement_not_accepted');
  if (e.state === 'CLOSED') refuse(409, 'engagement', 'closed');
  return e;
}
async function approvedScope(c: Ctx, id: string) {
  return (await c.tx.query('SELECT * FROM vendor.scope_versions WHERE engagement_id=$1 AND approved_by IS NOT NULL ORDER BY version DESC LIMIT 1', [id])).rows[0] as pg.QueryResultRow | undefined;
}
async function requireInScope(c: Ctx, id: string, requirement: string) {
  const s = await approvedScope(c, id);
  if (!s) refuse(409, 'scope', 'no_approved_scope');
  if (!(s!.requirement_ids as string[]).includes(requirement)) refuse(400, 'requirement_id', 'outside_approved_scope');
  return s!;
}
export async function configureEngagement(c: Ctx, id: string, input: unknown) {
  const v = P.EngagementConfigure.parse(input); const e = await engagementRow(c, id);
  const criteria = (await c.tx.query('SELECT * FROM vendor.criteria_versions WHERE id=$1', [v.criteria_version_id])).rows[0] ?? refuse(404, 'criteria_version_id', 'not_found');
  const known = new Set((criteria.requirements as { requirement_id: string }[]).map(r => r.requirement_id));
  if ((e.scope_requirement_ids as string[]).some(r => !known.has(r))) refuse(409, 'criteria_version_id', 'criteria_do_not_cover_the_commissioned_scope');
  if (v.use_kind === 'REAL' && criteria.distribution !== 'PRODUCTION') refuse(409, 'criteria_version_id', 'real_engagement_needs_production_criteria');
  const m = (await c.tx.query('SELECT approved_by FROM vendor.methodologies WHERE id=$1', [v.methodology_id])).rows[0] ?? refuse(404, 'methodology_id', 'not_found');
  if (!m.approved_by) refuse(409, 'methodology_id', 'methodology_not_approved');
  for (const [field, person] of [['commercial_owner_id', v.commercial_owner_id], ['implementation_owner_id', v.implementation_owner_id]] as const)
    if (person && !(await guarded(() => c.tx.query('SELECT 1 FROM vendor.team() WHERE user_id=$1', [person]))).rowCount) refuse(404, field, 'not_a_vendor_staff_member');
  // A commercial or implementation owner already sitting as reviewer must be replaced first.
  for (const person of [v.commercial_owner_id, v.implementation_owner_id]) if (person && (await onTeamAs(c, id, person, 'REVIEWER'))) refuse(409, 'commercial_owner_id', 'owner_is_the_engagement_reviewer');
  return guarded(async () => {
    await c.tx.query('UPDATE vendor.engagements SET use_kind=$2, criteria_version_id=$3, methodology_id=$4, commercial_owner_id=$5, implementation_owner_id=$6 WHERE id=$1', [id, v.use_kind, v.criteria_version_id, v.methodology_id, v.commercial_owner_id, v.implementation_owner_id]);
    await audit(c, 'vendor.engagement.configured', id); return engagementFile(c, id);
  });
}
const onTeamAs = async (c: Ctx, id: string, person: string, role: string) => (await c.tx.query('SELECT 1 FROM vendor.engagement_team WHERE engagement_id=$1 AND user_id=$2 AND engagement_role=$3', [id, person, role])).rowCount! > 0;
export async function prepareAcceptance(c: Ctx, id: string, input: unknown) {
  const v = P.AcceptancePrepare.parse(input); const e = await engagementRow(c, id);
  if (e.state === 'CLOSED') refuse(409, 'engagement', 'closed');
  if (!e.criteria_version_id || !e.methodology_id) refuse(409, 'engagement', 'configure_criteria_and_methodology_first');
  const t = clean({ objectives: v.objectives, intended_users: v.intended_users, client_responsibilities: v.client_responsibilities, auditor_responsibilities: v.auditor_responsibilities, confidentiality: v.confidentiality,
    evidence_handling: v.evidence_handling, scope_restrictions: v.scope_restrictions, competence: v.competence, sdf_applicability_basis: v.sdf_applicability_basis, eligibility_evidence: v.eligibility_evidence }).value;
  assertWording(...Object.values(t).filter((x): x is string => typeof x === 'string'));
  return guarded(async () => {
    await c.tx.query(`INSERT INTO vendor.engagement_acceptances (engagement_id, service_type, objectives, intended_users, client_responsibilities, auditor_responsibilities, confidentiality, evidence_handling, scope_restrictions, competence,
      sdf_applicability_basis, eligibility_evidence, licence_independence, prepared_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,$13)`,
      [id, v.service_type, t.objectives, t.intended_users, t.client_responsibilities, t.auditor_responsibilities, t.confidentiality, t.evidence_handling, t.scope_restrictions, t.competence, t.sdf_applicability_basis, t.eligibility_evidence, c.actor.actor_id]);
    await audit(c, 'vendor.engagement.acceptance-prepared', id); return engagementFile(c, id);
  });
}
export async function decideAcceptance(c: Ctx, id: string, input: unknown) {
  const v = P.AcceptanceDecide.parse(input); await engagementRow(c, id);
  const a = (await c.tx.query('SELECT * FROM vendor.engagement_acceptances WHERE engagement_id=$1', [id])).rows[0] ?? refuse(409, 'acceptance', 'not_prepared');
  if (a.decision) refuse(409, 'acceptance', 'already_decided');
  const rationale = clean(v.rationale).value;
  return guarded(async () => {
    await c.tx.query('UPDATE vendor.engagement_acceptances SET decision=$2, decided_by=$3, decided_at=clock_timestamp(), decision_rationale=$4 WHERE engagement_id=$1', [id, v.decision, c.actor.actor_id, rationale]);
    await audit(c, v.decision === 'ACCEPTED' ? 'vendor.engagement.accepted' : 'vendor.engagement.declined', id); return engagementFile(c, id);
  });
}
export async function recordConflict(c: Ctx, id: string, input: unknown) {
  const v = P.ConflictRecord.parse(input); await engagementRow(c, id);
  const description = clean(v.description).value;
  return guarded(async () => { const conflict = randomUUID();
    await c.tx.query('INSERT INTO vendor.engagement_conflicts (id, engagement_id, kind, person_id, description, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)', [conflict, id, v.kind, v.person_id, description, c.actor.actor_id]);
    await audit(c, 'vendor.engagement.conflict-recorded', conflict); return engagementFile(c, id); });
}
export async function reviewConflict(c: Ctx, conflictId: string, input: unknown) {
  const v = P.ConflictReview.parse(input);
  const r = (await c.tx.query('SELECT * FROM vendor.engagement_conflicts WHERE id=$1', [conflictId])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (r.status !== 'OPEN') refuse(409, 'conflict', 'already_reviewed');
  if (r.recorded_by === c.actor.actor_id || r.person_id === c.actor.actor_id) refuse(409, 'reviewed_by', 'reviewer_must_be_independent_of_the_conflict');
  // A barred person already sitting as reviewer must be replaced before the conflict can be safeguarded.
  if (v.status === 'SAFEGUARDED' && r.person_id && ['PRIOR_IMPLEMENTATION', 'PRIOR_CONSULTING', 'COMMERCIAL_RELATIONSHIP'].includes(r.kind) && (await onTeamAs(c, r.engagement_id, r.person_id, 'REVIEWER')))
    refuse(409, 'person_id', 'barred_person_is_the_engagement_reviewer');
  const safeguard = v.safeguard === null ? null : clean(v.safeguard).value;
  return guarded(async () => { await c.tx.query('UPDATE vendor.engagement_conflicts SET status=$2, safeguard=$3, reviewed_by=$4, reviewed_at=clock_timestamp() WHERE id=$1', [conflictId, v.status, safeguard, c.actor.actor_id]);
    await audit(c, 'vendor.engagement.conflict-reviewed', conflictId); return engagementFile(c, r.engagement_id); });
}

// ---------------------------------------------------------------- understanding, applicability, scope
export async function recordUnderstanding(c: Ctx, id: string, input: unknown) {
  const v = P.UnderstandingRecord.parse(input); await requireTeam(c, id); await requireAccepted(c, id);
  const cleaned = clean(v);
  return guarded(async () => {
    const version = (await c.tx.query('SELECT coalesce(max(version),0)+1 AS v FROM vendor.understanding_versions WHERE engagement_id=$1', [id])).rows[0].v;
    const uid = randomUUID();
    await c.tx.query('INSERT INTO vendor.understanding_versions (id, engagement_id, version, content, redactions, prepared_by) VALUES ($1,$2,$3,$4,$5,$6)', [uid, id, version, JSON.stringify(cleaned.value), cleaned.redactions, c.actor.actor_id]);
    await audit(c, 'vendor.practice.understanding-recorded', uid); return engagementFile(c, id);
  });
}
/** Reviews one row of an engagement-level record (understanding, applicability, risk). The database checks the reviewer is independent. */
async function reviewRow(c: Ctx, table: 'understanding_versions' | 'applicability_decisions' | 'risk_assessments', rowId: string, preparer: string) {
  const r = (await c.tx.query(`SELECT * FROM vendor.${table} WHERE id=$1`, [rowId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, r.engagement_id, 'REVIEWER');
  if (r.reviewed_by) refuse(409, 'reviewed_by', 'already_reviewed');
  if (r[preparer] === c.actor.actor_id) refuse(409, 'reviewed_by', 'reviewer_must_differ_from_preparer');
  return guarded(async () => { await c.tx.query(`UPDATE vendor.${table} SET reviewed_by=$2, reviewed_at=clock_timestamp() WHERE id=$1`, [rowId, c.actor.actor_id]);
    await audit(c, `vendor.practice.${table.replaceAll('_', '-')}-reviewed`, rowId); return engagementFile(c, r.engagement_id); });
}
export const reviewUnderstanding = (c: Ctx, id: string) => reviewRow(c, 'understanding_versions', id, 'prepared_by');
export const reviewApplicability = (c: Ctx, id: string) => reviewRow(c, 'applicability_decisions', id, 'decided_by');
export const reviewRisk = (c: Ctx, id: string) => reviewRow(c, 'risk_assessments', id, 'assessed_by');
export async function recordApplicability(c: Ctx, id: string, input: unknown) {
  const v = P.ApplicabilityRecord.parse(input); await requireTeam(c, id); const e = await requireAccepted(c, id);
  const { row, requirements } = await criteriaFor(c, e);
  const req = requirements.get(v.requirement_id) ?? refuse(400, 'requirement_id', 'not_in_the_engagement_criteria');
  if (v.provision_ids.some(p => !req.provision_ids.includes(p))) refuse(400, 'provision_ids', 'not_cited_by_requirement');
  if (v.criterion_type === 'STATUTORY' && !req.provision_ids.length) refuse(400, 'criterion_type', 'statutory_criterion_needs_a_provision');
  const t = clean({ rationale: v.rationale, evidence_refs: v.evidence_refs, unresolved_question: v.unresolved_question }).value;
  return guarded(async () => { const aid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.applicability_decisions (id, engagement_id, criteria_version_id, requirement_id, provision_ids, criterion_type, applicability, effective_from, rationale, evidence_refs, unresolved_question, decided_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [aid, id, row.id, v.requirement_id, v.provision_ids.length ? v.provision_ids : req.provision_ids, v.criterion_type, v.applicability, v.effective_from, t.rationale, t.evidence_refs, t.unresolved_question, c.actor.actor_id]);
    await audit(c, 'vendor.practice.applicability-recorded', aid); return engagementFile(c, id); });
}
async function currentApplicability(c: Ctx, id: string) {
  return new Map((await c.tx.query('SELECT DISTINCT ON (requirement_id) * FROM vendor.applicability_decisions WHERE engagement_id=$1 ORDER BY requirement_id, decided_at DESC, id DESC', [id])).rows.map(r => [r.requirement_id as string, r]));
}
export async function proposeScope(c: Ctx, id: string, input: unknown) {
  const v = P.ScopePropose.parse(input); await requireTeam(c, id); const e = await requireAccepted(c, id);
  if (v.period_to < v.period_from) refuse(400, 'period_to', 'before_period_from');
  const { requirements } = await criteriaFor(c, e);
  const unknown = v.requirement_ids.filter(r => !requirements.has(r));
  if (unknown.length) refuse(400, 'requirement_ids', 'not_in_the_engagement_criteria');
  const applicability = await currentApplicability(c, id);
  const requirementIds = [...new Set(v.requirement_ids)];
  for (const r of requirementIds) {
    const a = applicability.get(r);
    if (!a) refuse(409, 'requirement_ids', 'applicability_not_decided');
    if (a!.applicability === 'NOT_APPLICABLE') refuse(409, 'requirement_ids', 'requirement_decided_not_applicable');
  }
  // Unresolved applicability is carried into the scope as a stated limitation, never dropped.
  const carried = requirementIds.filter(r => applicability.get(r)!.applicability === 'UNRESOLVED').map(r => `Applicability of ${r} is unresolved: ${applicability.get(r)!.unresolved_question}`);
  const t = clean({ entities: v.entities, processes: v.processes, systems: v.systems, locations: v.locations, exclusions: v.exclusions, limitations: [...v.limitations, ...carried].slice(0, 50), change_reason: v.change_reason, impact_assessment: v.impact_assessment }).value;
  const previous = (await c.tx.query('SELECT max(version) AS v FROM vendor.scope_versions WHERE engagement_id=$1', [id])).rows[0].v as number | null;
  if (previous && (!v.change_reason || !v.impact_assessment)) refuse(400, 'impact_assessment', 'scope_change_needs_reason_and_impact_assessment');
  return guarded(async () => { const sid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.scope_versions (id, engagement_id, version, entities, processes, systems, locations, period_from, period_to, requirement_ids, exclusions, limitations, change_reason, impact_assessment, prepared_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [sid, id, (previous ?? 0) + 1, t.entities, t.processes, t.systems, t.locations, v.period_from, v.period_to, requirementIds, t.exclusions, t.limitations, t.change_reason, t.impact_assessment, c.actor.actor_id]);
    await audit(c, 'vendor.practice.scope-proposed', sid); return engagementFile(c, id); });
}
export async function approveScope(c: Ctx, scopeId: string) {
  const s = (await c.tx.query('SELECT * FROM vendor.scope_versions WHERE id=$1', [scopeId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, s.engagement_id, 'REVIEWER'); await requireAccepted(c, s.engagement_id);
  if (s.approved_by) refuse(409, 'scope', 'already_approved');
  if (s.prepared_by === c.actor.actor_id) refuse(409, 'approved_by', 'approver_must_differ_from_preparer');
  const latest = (await c.tx.query('SELECT max(version) AS v FROM vendor.scope_versions WHERE engagement_id=$1', [s.engagement_id])).rows[0].v;
  if (latest !== s.version) refuse(409, 'scope', 'a_later_scope_version_exists');
  return guarded(async () => {
    await c.tx.query('UPDATE vendor.scope_versions SET approved_by=$2, approved_at=clock_timestamp() WHERE id=$1', [scopeId, c.actor.actor_id]);
    // The engagement's scope follows the approved version, so the channel, packages and report all use it.
    await c.tx.query('UPDATE vendor.engagements SET scope_requirement_ids=$2, period_from=$3, period_to=$4 WHERE id=$1', [s.engagement_id, s.requirement_ids, s.period_from, s.period_to]);
    await audit(c, 'vendor.practice.scope-approved', scopeId); return engagementFile(c, s.engagement_id);
  });
}

// ---------------------------------------------------------------- risk and work programme
async function methodologyFor(c: Ctx, e: pg.QueryResultRow) {
  const m = (await c.tx.query('SELECT * FROM vendor.methodologies WHERE id=$1', [e.methodology_id])).rows[0];
  if (!m?.approved_by) refuse(409, 'methodology', 'methodology_not_approved');
  return m!;
}
/** Inherent rating from the approved matrix; residual rating lowered by the steps the methodology gives an assessed control, never below LOW. */
export function rate(m: { matrix: Rating[][]; factors: { residual_steps: Record<string, number> } }, likelihood: number, impact: number, effectiveness: string) {
  const inherent = m.matrix[likelihood - 1]![impact - 1]!;
  const residual = RATINGS[Math.max(0, RATINGS.indexOf(inherent) - (m.factors.residual_steps[effectiveness] ?? 0))]!;
  return { inherent, residual };
}
export async function assessRisk(c: Ctx, id: string, input: unknown) {
  const v = P.RiskAssess.parse(input); await requireTeam(c, id); const e = await requireAccepted(c, id);
  await requireInScope(c, id, v.requirement_id);
  const m = await methodologyFor(c, e); const { inherent, residual } = rate(m as never, v.likelihood, v.impact, v.control_effectiveness);
  const t = clean({ risk: v.risk, affected_people: v.affected_people, affected_scope: v.affected_scope, duration: v.duration, uncertainty: v.uncertainty, control_reference: v.control_reference, rationale: v.rationale }).value;
  return guarded(async () => { const rid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.risk_assessments (id, engagement_id, methodology_id, requirement_id, risk, likelihood, impact, affected_people, affected_scope, duration, uncertainty, control_reference, control_effectiveness, inherent_rating, residual_rating, rationale, assessed_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)`, [rid, id, m.id, v.requirement_id, t.risk, v.likelihood, v.impact, t.affected_people, t.affected_scope, t.duration, t.uncertainty, t.control_reference, v.control_effectiveness, inherent, residual, t.rationale, c.actor.actor_id]);
    await audit(c, 'vendor.practice.risk-assessed', rid); return engagementFile(c, id); });
}
export async function addProcedure(c: Ctx, id: string, input: unknown) {
  const v = P.ProcedureAdd.parse(input); await requireTeam(c, id); const e = await requireAccepted(c, id);
  if (v.planned_end < v.planned_start) refuse(400, 'planned_end', 'before_planned_start');
  if (v.retest_of_finding_id) {
    const f = (await c.tx.query('SELECT * FROM vendor.findings WHERE id=$1 AND engagement_id=$2', [v.retest_of_finding_id, id])).rows[0] ?? refuse(404, 'retest_of_finding_id', 'not_found');
    if (f.requirement_id !== v.requirement_id) refuse(400, 'requirement_id', 'retest_must_test_the_finding_requirement');
    if (f.status === 'CLOSED') refuse(409, 'retest_of_finding_id', 'finding_closed');
  } else await requireInScope(c, id, v.requirement_id);
  const { requirements } = await criteriaFor(c, e);
  if (v.provision_ids.some(p => !(requirements.get(v.requirement_id)?.provision_ids ?? []).includes(p))) refuse(400, 'provision_ids', 'not_cited_by_requirement');
  if (v.risk_assessment_id && !(await c.tx.query('SELECT 1 FROM vendor.risk_assessments WHERE id=$1 AND engagement_id=$2 AND requirement_id=$3', [v.risk_assessment_id, id, v.requirement_id])).rowCount) refuse(400, 'risk_assessment_id', 'not_a_risk_on_this_requirement');
  if (!(await c.tx.query('SELECT 1 FROM vendor.engagement_team WHERE engagement_id=$1 AND user_id=$2', [id, v.owner_id])).rowCount) refuse(400, 'owner_id', 'owner_not_on_engagement_team');
  if (v.depends_on.length && (await c.tx.query('SELECT count(*)::int AS n FROM vendor.procedures WHERE engagement_id=$1 AND id = ANY($2)', [id, v.depends_on])).rows[0].n !== new Set(v.depends_on).size) refuse(400, 'depends_on', 'unknown_procedure');
  if (v.requires_record_level && v.test_nature !== 'OPERATING_EFFECTIVENESS') refuse(400, 'requires_record_level', 'record_level_testing_is_operating_effectiveness');
  const t = clean({ objective: v.objective, control_reference: v.control_reference, evidence_expectation: v.evidence_expectation, completion_criteria: v.completion_criteria }).value;
  return guarded(async () => { const pid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.procedures (id, engagement_id, requirement_id, provision_ids, risk_assessment_id, control_reference, objective, procedure_type, test_nature, requires_record_level, owner_id, planned_start, planned_end, depends_on,
      evidence_expectation, completion_criteria, retest_of_finding_id, created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
      [pid, id, v.requirement_id, v.provision_ids, v.risk_assessment_id, t.control_reference, t.objective, v.procedure_type, v.test_nature, v.requires_record_level, v.owner_id, v.planned_start, v.planned_end, [...new Set(v.depends_on)],
        t.evidence_expectation, t.completion_criteria, v.retest_of_finding_id, c.actor.actor_id]);
    await audit(c, 'vendor.practice.procedure-added', pid); return engagementFile(c, id); });
}
export async function procedureNotPerformed(c: Ctx, procedureId: string, input: unknown) {
  const v = P.ProcedureNotPerformed.parse(input); const p = await procedureRow(c, procedureId); await requireAccepted(c, p.engagement_id);
  if (p.state === 'COMPLETED' || p.state === 'NOT_PERFORMED') refuse(409, 'procedure', `already_${String(p.state).toLowerCase()}`);
  return guarded(async () => { await c.tx.query("UPDATE vendor.procedures SET state='NOT_PERFORMED', not_performed_reason=$2 WHERE id=$1", [procedureId, clean(v.reason).value]);
    await audit(c, 'vendor.practice.procedure-not-performed', procedureId); return engagementFile(c, p.engagement_id); });
}
async function procedureRow(c: Ctx, id: string) {
  const p = (await c.tx.query('SELECT * FROM vendor.procedures WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, p.engagement_id); return p;
}
/** The planned programme (not retests) in a canonical form; its digest is what the reviewer approves. */
async function planState(c: Ctx, id: string) {
  const procedures = (await c.tx.query('SELECT * FROM vendor.procedures WHERE engagement_id=$1 AND retest_of_finding_id IS NULL ORDER BY id', [id])).rows;
  const digest = digestOf(procedures.map(p => ({ id: p.id, requirement_id: p.requirement_id, provision_ids: p.provision_ids, risk_assessment_id: p.risk_assessment_id, control_reference: p.control_reference, objective: p.objective,
    procedure_type: p.procedure_type, test_nature: p.test_nature, requires_record_level: p.requires_record_level, owner_id: p.owner_id, planned_start: day(p.planned_start), planned_end: day(p.planned_end), depends_on: [...p.depends_on].sort(),
    evidence_expectation: p.evidence_expectation, completion_criteria: p.completion_criteria })));
  const approval = (await c.tx.query('SELECT * FROM vendor.plan_approvals WHERE engagement_id=$1 ORDER BY approved_at DESC, id DESC LIMIT 1', [id])).rows[0];
  const problems: string[] = [];
  const scope = await approvedScope(c, id);
  if (!scope) problems.push('No approved scope version.');
  const risks = (await c.tx.query('SELECT * FROM vendor.risk_assessments WHERE engagement_id=$1', [id])).rows;
  for (const r of (scope?.requirement_ids ?? []) as string[]) {
    const onReq = risks.filter(x => x.requirement_id === r);
    if (!onReq.some(x => x.reviewed_by)) problems.push(`${r}: no reviewed risk assessment.`);
    const procs = procedures.filter(p => p.requirement_id === r);
    if (!procs.length) problems.push(`${r}: no procedure planned.`);
    if (onReq.some(x => x.residual_rating === 'HIGH' || x.residual_rating === 'CRITICAL') && !procs.some(p => p.test_nature === 'OPERATING_EFFECTIVENESS'))
      problems.push(`${r}: a high or critical residual risk has no operating-effectiveness procedure.`);
  }
  for (const p of procedures) if (scope && !(scope.requirement_ids as string[]).includes(p.requirement_id)) problems.push(`Procedure ${p.id.slice(0, 8)} tests ${p.requirement_id}, which is outside the approved scope.`);
  return { digest, approval, approved: !!approval && approval.procedures_digest === digest, problems: problems.slice(0, 200), procedures };
}
export async function approvePlan(c: Ctx, id: string) {
  await requireTeam(c, id, 'REVIEWER'); await requireAccepted(c, id);
  const plan = await planState(c, id);
  if (plan.approved) refuse(409, 'plan', 'already_approved');
  if (plan.problems.length) refuse(409, 'plan', 'plan_incomplete');
  if (plan.procedures.some(p => p.created_by === c.actor.actor_id)) refuse(409, 'approved_by', 'approver_must_not_have_written_the_programme');
  const lead = (await c.tx.query("SELECT user_id FROM vendor.engagement_team WHERE engagement_id=$1 AND engagement_role='LEAD'", [id])).rows[0] ?? refuse(409, 'plan', 'engagement_has_no_lead');
  return guarded(async () => { const aid = randomUUID();
    await c.tx.query('INSERT INTO vendor.plan_approvals (id, engagement_id, procedures_digest, prepared_by, approved_by) VALUES ($1,$2,$3,$4,$5)', [aid, id, plan.digest, lead.user_id, c.actor.actor_id]);
    const e = await engagementRow(c, id);
    if (e.state === 'PLANNING') await c.tx.query("UPDATE vendor.engagements SET state='FIELDWORK' WHERE id=$1", [id]);
    await audit(c, 'vendor.practice.plan-approved', aid); return engagementFile(c, id); });
}

// ---------------------------------------------------------------- evidence register and evaluation
const ITEM_TYPES: Record<string, string[]> = { FILE: ['DOCUMENT', 'MANAGEMENT_ASSERTION'], INDICATOR: ['SYSTEM_GENERATED'], STATEMENT: ['MANAGEMENT_ASSERTION'] };
export async function registerEvidence(c: Ctx, id: string, input: unknown) {
  const v = P.EvidenceRegister.parse(input); await requireTeam(c, id); await requireAccepted(c, id);
  const eid = randomUUID();
  let row: Record<string, unknown>;
  if (v.source === 'PACKAGE_ITEM') {
    const p = (await c.tx.query('SELECT * FROM vendor.packages WHERE id=$1 AND engagement_id=$2', [v.package_id, id])).rows[0] ?? refuse(404, 'package_id', 'not_found');
    if (p.state !== 'ACCEPTED') refuse(409, 'package_id', `package_${String(p.state).toLowerCase()}`);
    const i = (await c.tx.query('SELECT * FROM vendor.package_items WHERE package_id=$1 AND item_id=$2', [v.package_id, v.item_id])).rows[0] ?? refuse(404, 'item_id', 'not_found');
    const allowed = ITEM_TYPES[i.kind] ?? ['MANAGEMENT_ASSERTION'];
    const type = v.evidence_type ?? allowed[0]!;
    if (!allowed.includes(type)) refuse(400, 'evidence_type', 'type_does_not_fit_the_item');
    row = { source: 'PACKAGE_ITEM', package_id: v.package_id, item_id: v.item_id, evidence_type: type, title: i.title, description: v.description, collection_method: 'Sealed evidence package assembled and approved by the client',
      collected_at: p.uploaded_at, sha256: i.sha256, provenance: `Client package ${p.client_package_id} (manifest ${String(p.manifest_fingerprint).slice(0, 16)}), item ${i.item_id}; selected and released by the client`,
      period_from: p.manifest?.period?.from ?? null, period_to: p.manifest?.period?.to ?? null };
  } else if (v.source === 'CHANNEL_ENTRY') {
    const d = (await c.tx.query('SELECT d.*, ch.installation_key_id, ch.chain_state FROM vendor.channel_deliveries d LEFT JOIN vendor.channels ch ON ch.engagement_id = d.engagement_id WHERE d.delivery_id=$1 AND d.engagement_id=$2', [v.delivery_id, id])).rows[0] ?? refuse(404, 'delivery_id', 'not_found');
    if (d.outcome !== 'ACCEPTED' || !d.document) refuse(409, 'delivery_id', d.purged_at ? 'delivery_purged' : 'delivery_refused');
    const entry = (d.document.entries as { key: string; label: string }[]).find(x => x.key === v.entry_key) ?? refuse(404, 'entry_key', 'not_in_this_delivery');
    row = { source: 'CHANNEL_ENTRY', delivery_id: v.delivery_id, entry_key: v.entry_key, evidence_type: 'SYSTEM_GENERATED', title: entry.label, description: v.description,
      collection_method: `Generated by ORVIA from the client's records under the audit mandate (${d.kind === 'RESPONSE' ? 'answer to an auditor request' : 'scheduled snapshot'})`,
      collected_at: d.generated_at, sha256: digestOf(entry), provenance: `Delivery ${d.sequence} signed by ${d.installation_key_id ?? 'the installation'}; chain ${String(d.chain_state ?? 'UNKNOWN').toLowerCase()} at registration`,
      period_from: d.period_from, period_to: d.period_to };
  } else {
    row = { source: 'AUDITOR_RECORD', evidence_type: v.evidence_type, title: v.title, description: v.description, collection_method: v.collection_method, collected_at: v.collected_at,
      sha256: null, provenance: 'Recorded by the audit team', period_from: v.period_from, period_to: v.period_to };
  }
  const t = clean({ title: row.title as string, description: (row.description as string | null) ?? null, collection_method: row.collection_method as string });
  return guarded(async () => {
    await c.tx.query(`INSERT INTO vendor.evidence (id, engagement_id, source, package_id, item_id, delivery_id, entry_key, evidence_type, title, description, redactions, period_from, period_to, collection_method, collected_at, valid_until, sha256, provenance, registered_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`, [eid, id, row.source, row.package_id ?? null, row.item_id ?? null, row.delivery_id ?? null, row.entry_key ?? null, row.evidence_type,
      String(t.value.title).slice(0, 300), t.value.description, t.redactions, row.period_from ?? null, row.period_to ?? null, t.value.collection_method, row.collected_at, v.valid_until, row.sha256, row.provenance, c.actor.actor_id]);
    if (row.source === 'PACKAGE_ITEM') await c.tx.query("INSERT INTO vendor.evidence_access_log (id, engagement_id, package_id, item_id, actor_id, action) VALUES ($1,$2,$3,$4,$5,'VIEW_MANIFEST')", [randomUUID(), id, row.package_id, row.item_id, c.actor.actor_id]);
    await audit(c, 'vendor.practice.evidence-registered', eid); return engagementFile(c, id);
  });
}
async function evidenceRow(c: Ctx, id: string) {
  const e = (await c.tx.query('SELECT * FROM vendor.evidence WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, e.engagement_id); return e;
}
export async function evaluateEvidence(c: Ctx, evidenceId: string, input: unknown) {
  const v = P.EvidenceEvaluate.parse(input); const e = await evidenceRow(c, evidenceId); await requireAccepted(c, e.engagement_id);
  const p = (await c.tx.query('SELECT * FROM vendor.procedures WHERE id=$1 AND engagement_id=$2', [v.procedure_id, e.engagement_id])).rows[0] ?? refuse(404, 'procedure_id', 'not_found');
  // A management assertion is never high-reliability evidence on its own.
  if (e.evidence_type === 'MANAGEMENT_ASSERTION' && v.reliability === 'HIGH') refuse(400, 'reliability', 'an_assertion_is_not_high_reliability_evidence');
  return guarded(async () => { const vid = randomUUID();
    await c.tx.query('INSERT INTO vendor.evidence_evaluations (id, evidence_id, procedure_id, relevance, reliability, sufficiency, contradicts, rationale, evaluated_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)',
      [vid, evidenceId, p.id, v.relevance, v.reliability, v.sufficiency, v.contradicts, clean(v.rationale).value, c.actor.actor_id]);
    await audit(c, 'vendor.practice.evidence-evaluated', vid); return engagementFile(c, e.engagement_id); });
}

// ---------------------------------------------------------------- requests
export async function createPracticeRequest(c: Ctx, id: string, input: unknown) {
  const v = P.PracticeRequestCreate.parse(input); await requireTeam(c, id); await requireAccepted(c, id);
  await requireInScope(c, id, v.requirement_id);
  if (v.procedure_id && !(await c.tx.query('SELECT 1 FROM vendor.procedures WHERE id=$1 AND engagement_id=$2 AND requirement_id=$3', [v.procedure_id, id, v.requirement_id])).rowCount) refuse(400, 'procedure_id', 'not_a_procedure_on_this_requirement');
  const t = clean({ owner_role: v.owner_role, description: v.description }).value;
  return guarded(async () => { const rid = randomUUID();
    await c.tx.query('INSERT INTO vendor.audit_requests (id, engagement_id, requirement_id, description, due_date, created_by, procedure_id, owner_role) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [rid, id, v.requirement_id, t.description, v.due_date, c.actor.actor_id, v.procedure_id, t.owner_role]);
    await audit(c, 'vendor.audit.request-created', rid); return engagementFile(c, id); });
}
const REQUEST_FLOW: Record<string, { from: string[]; to: string | null }> = {
  CLARIFICATION_REQUESTED: { from: ['OPEN', 'RESUBMISSION_REQUESTED'], to: 'CLARIFICATION_REQUESTED' },
  CLARIFICATION_GIVEN: { from: ['CLARIFICATION_REQUESTED'], to: 'OPEN' },
  RESPONSE_RECEIVED: { from: ['OPEN', 'CLARIFICATION_REQUESTED', 'RESUBMISSION_REQUESTED'], to: 'RESPONDED' },
  ACCEPTED: { from: ['RESPONDED'], to: 'ACCEPTED' },
  RESUBMISSION_REQUESTED: { from: ['RESPONDED'], to: 'RESUBMISSION_REQUESTED' },
  UNABLE_TO_OBTAIN: { from: ['OPEN', 'CLARIFICATION_REQUESTED', 'RESPONDED', 'RESUBMISSION_REQUESTED'], to: 'UNABLE_TO_OBTAIN' },
  ESCALATED: { from: ['OPEN', 'CLARIFICATION_REQUESTED', 'RESUBMISSION_REQUESTED'], to: null },
  WITHDRAWN: { from: ['OPEN', 'CLARIFICATION_REQUESTED', 'RESUBMISSION_REQUESTED'], to: 'WITHDRAWN' },
};
export async function recordRequestEvent(c: Ctx, requestId: string, input: unknown) {
  const v = P.RequestEventRecord.parse(input);
  const r = (await c.tx.query('SELECT * FROM vendor.audit_requests WHERE id=$1', [requestId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, r.engagement_id); await requireAccepted(c, r.engagement_id);
  const flow = REQUEST_FLOW[v.event]!;
  if (!flow.from.includes(r.status)) refuse(409, 'event', `not_allowed_from_${String(r.status).toLowerCase()}`);
  if (v.event === 'RESPONSE_RECEIVED' && !v.evidence_id) refuse(400, 'evidence_id', 'a_response_links_the_registered_evidence');
  if (v.evidence_id && !(await c.tx.query('SELECT 1 FROM vendor.evidence WHERE id=$1 AND engagement_id=$2', [v.evidence_id, r.engagement_id])).rowCount) refuse(404, 'evidence_id', 'not_found');
  const note = clean(v.note);
  return guarded(async () => {
    await c.tx.query('INSERT INTO vendor.request_events (id, request_id, event, note, redactions, evidence_id, actor_id) VALUES ($1,$2,$3,$4,$5,$6,$7)', [randomUUID(), requestId, v.event, note.value, note.redactions, v.evidence_id, c.actor.actor_id]);
    if (flow.to) await c.tx.query('UPDATE vendor.audit_requests SET status=$2 WHERE id=$1', [requestId, flow.to]);
    if (v.event === 'ESCALATED') await c.tx.query('UPDATE vendor.audit_requests SET escalated_at=clock_timestamp() WHERE id=$1', [requestId]);
    await audit(c, `vendor.audit.request-${v.event.toLowerCase().replaceAll('_', '-')}`, requestId); return engagementFile(c, r.engagement_id);
  });
}

// ---------------------------------------------------------------- populations and samples
async function completenessEvidence(c: Ctx, engagementId: string, procedureId: string, evidenceId: string | null, completeness: string) {
  if (completeness !== 'COMPLETE') return null;
  if (!evidenceId) refuse(400, 'completeness_evidence_id', 'complete_population_needs_completeness_evidence');
  const e = (await c.tx.query('SELECT * FROM vendor.evidence WHERE id=$1 AND engagement_id=$2', [evidenceId, engagementId])).rows[0] ?? refuse(404, 'completeness_evidence_id', 'not_found');
  if (e.evidence_type === 'MANAGEMENT_ASSERTION') refuse(400, 'completeness_evidence_id', 'an_assertion_does_not_prove_completeness');
  const ok = (await c.tx.query("SELECT 1 FROM vendor.evidence_evaluations WHERE evidence_id=$1 AND procedure_id=$2 AND sufficiency='SUFFICIENT' AND relevance='RELEVANT' AND NOT contradicts", [evidenceId, procedureId])).rowCount;
  if (!ok) refuse(400, 'completeness_evidence_id', 'completeness_evidence_not_evaluated_sufficient_for_this_procedure');
  return evidenceId;
}
export async function recordPopulation(c: Ctx, procedureId: string, input: unknown) {
  const v = P.PopulationRecord.parse(input); const p = await procedureRow(c, procedureId); await requireAccepted(c, p.engagement_id);
  let row: Record<string, unknown>;
  if (v.source_kind === 'CHANNEL_SAMPLE') {
    const d = (await c.tx.query("SELECT * FROM vendor.channel_deliveries WHERE delivery_id=$1 AND engagement_id=$2 AND outcome='ACCEPTED'", [v.delivery_id, p.engagement_id])).rows[0] ?? refuse(404, 'delivery_id', 'not_found');
    if (!d.document || d.kind !== 'RESPONSE') refuse(409, 'delivery_id', 'not_a_sample_answer');
    const request = (await c.tx.query("SELECT * FROM vendor.channel_requests WHERE id=$1 AND kind='SAMPLE_COUNT'", [d.request_id])).rows[0] ?? refuse(409, 'delivery_id', 'not_a_sample_answer');
    const entry = (d.document.entries as { key: string; detail: Record<string, unknown> | null }[]).find(x => x.key === v.entry_key) ?? refuse(404, 'entry_key', 'not_in_this_delivery');
    const detail = entry.detail ?? {};
    const evidence = (await c.tx.query('SELECT id FROM vendor.evidence WHERE engagement_id=$1 AND delivery_id=$2 AND entry_key=$3', [p.engagement_id, v.delivery_id, v.entry_key])).rows[0] ?? refuse(409, 'entry_key', 'register_the_channel_entry_as_evidence_first');
    const selected = Number(detail.selected ?? 0); const passed = Number(detail.passed ?? 0); const failed = Number(detail.failed ?? 0);
    if (detail.seed !== request.seed) refuse(409, 'entry_key', 'sample_does_not_answer_this_seed');
    row = { definition: v.definition, source: `ORVIA installation sample for auditor request ${request.id} (${request.population})`, source_kind: 'CHANNEL_SAMPLE', period_from: day(d.period_from), period_to: day(d.period_to),
      population_size: Number(detail.population_size ?? 0), completeness: v.completeness, completeness_basis: v.completeness_basis, sample_method: 'SEEDED_RANDOM', sample_size: Number(request.sample_size),
      size_rationale: v.size_rationale, selection_digest: detail.selection_sha256 ?? null, seed: request.seed, exclusions: v.exclusions, tested: selected, passed, exceptions: failed, evidence_id: evidence.id,
      completeness_evidence_id: await completenessEvidence(c, p.engagement_id, procedureId, v.completeness_evidence_id, v.completeness) };
  } else {
    if (v.evidence_id && !(await c.tx.query('SELECT 1 FROM vendor.evidence WHERE id=$1 AND engagement_id=$2', [v.evidence_id, p.engagement_id])).rowCount) refuse(404, 'evidence_id', 'not_found');
    if (v.sample_method === 'ALL_ITEMS' && v.population_size !== null && v.sample_size !== v.population_size) refuse(400, 'sample_size', 'all_items_means_the_whole_population');
    row = { ...v, completeness_evidence_id: await completenessEvidence(c, p.engagement_id, procedureId, v.completeness_evidence_id, v.completeness) };
  }
  const t = clean({ definition: row.definition as string, completeness_basis: row.completeness_basis as string, size_rationale: row.size_rationale as string, exclusions: (row.exclusions as string | null) ?? null }).value;
  return guarded(async () => { const pop = randomUUID();
    await c.tx.query(`INSERT INTO vendor.populations (id, engagement_id, procedure_id, definition, source, source_kind, period_from, period_to, population_size, completeness, completeness_basis, sample_method, sample_size, size_rationale,
      selection_digest, seed, exclusions, tested, passed, exceptions, evidence_id, completeness_evidence_id, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)`,
      [pop, p.engagement_id, procedureId, t.definition, clean(row.source as string).value, row.source_kind, row.period_from ?? null, row.period_to ?? null, row.population_size ?? null, row.completeness, t.completeness_basis, row.sample_method,
        row.sample_size, t.size_rationale, row.selection_digest ?? null, row.seed ?? null, t.exclusions, row.tested, row.passed, row.exceptions, row.evidence_id ?? null, row.completeness_evidence_id ?? null, c.actor.actor_id]);
    await audit(c, 'vendor.practice.population-recorded', pop); return engagementFile(c, p.engagement_id); });
}

// ---------------------------------------------------------------- working papers and review
const AUDITOR_RECORD_LEVEL = ['REPERFORMANCE', 'OBSERVATION', 'INDEPENDENT_CORROBORATION'];
/** Why the evidence cannot support an EFFECTIVE conclusion for this procedure, or null when it can. */
export async function effectiveProblem(c: Ctx, procedure: pg.QueryResultRow, evidenceIds: string[], populationId: string | null, exceptions: number): Promise<string | null> {
  if (exceptions > 0) return 'exceptions_recorded';
  if (!evidenceIds.length) return 'no_evidence';
  const evidence = (await c.tx.query('SELECT * FROM vendor.evidence WHERE id = ANY($1)', [evidenceIds])).rows;
  const evaluations = (await c.tx.query('SELECT * FROM vendor.evidence_evaluations WHERE evidence_id = ANY($1) AND procedure_id=$2', [evidenceIds, procedure.id])).rows;
  if (evaluations.some(x => x.contradicts)) return 'contradictory_evidence_unresolved';
  const now = Date.now();
  const usable = evidence.filter(e => (!e.valid_until || new Date(e.valid_until).getTime() >= now) &&
    evaluations.some(x => x.evidence_id === e.id && x.relevance === 'RELEVANT' && x.sufficiency === 'SUFFICIENT' && x.reliability !== 'LOW'));
  if (!usable.length) return 'no_relevant_sufficient_current_evidence';
  if (usable.every(e => e.evidence_type === 'MANAGEMENT_ASSERTION')) return 'assertions_or_interviews_alone_are_not_proof';
  if (procedure.test_nature === 'OPERATING_EFFECTIVENESS' || procedure.requires_record_level) {
    if (!populationId) return 'operating_effectiveness_needs_a_tested_population';
    const pop = (await c.tx.query('SELECT * FROM vendor.populations WHERE id=$1', [populationId])).rows[0];
    if (pop.completeness !== 'COMPLETE') return 'population_completeness_not_established';
    if (pop.tested === 0) return 'no_records_tested';
    if (pop.exceptions > 0) return 'sample_exceptions_recorded';
  }
  // Aggregated counts from the client installation are not record-level testing by the auditor.
  if (procedure.requires_record_level && !usable.some(e => AUDITOR_RECORD_LEVEL.includes(e.evidence_type))) return 'aggregates_are_no_substitute_for_record_level_testing';
  return null;
}
export async function recordWorkingPaper(c: Ctx, procedureId: string, input: unknown) {
  const v = P.WorkingPaperRecord.parse(input); const p = await procedureRow(c, procedureId); await requireAccepted(c, p.engagement_id);
  if (p.state === 'NOT_PERFORMED') refuse(409, 'procedure', 'not_performed');
  if (!p.retest_of_finding_id && !(await planState(c, p.engagement_id)).approved) refuse(409, 'plan', 'work_programme_not_approved');
  const ids = [...new Set(v.evidence_ids)];
  if (ids.length && (await c.tx.query('SELECT count(*)::int AS n FROM vendor.evidence WHERE engagement_id=$1 AND id = ANY($2)', [p.engagement_id, ids])).rows[0].n !== ids.length) refuse(404, 'evidence_ids', 'not_found');
  if (v.population_id && !(await c.tx.query('SELECT 1 FROM vendor.populations WHERE id=$1 AND procedure_id=$2', [v.population_id, procedureId])).rowCount) refuse(404, 'population_id', 'not_a_population_of_this_procedure');
  if (v.exceptions > 0 && !v.exception_details) refuse(400, 'exception_details', 'exceptions_need_details');
  if (v.conclusion === 'EFFECTIVE') { const problem = await effectiveProblem(c, p, ids, v.population_id, v.exceptions); if (problem) refuse(409, 'conclusion', problem); }
  if ((v.conclusion === 'EXCEPTIONS_NOTED' || v.conclusion === 'INEFFECTIVE') && !ids.length) refuse(400, 'evidence_ids', 'an_adverse_conclusion_cites_its_evidence');
  const cleaned = clean({ performed: v.performed, criteria: v.criteria, results: v.results, exception_details: v.exception_details });
  const content = { procedure_id: procedureId, ...cleaned.value, population_id: v.population_id, exceptions: v.exceptions, conclusion: v.conclusion, evidence_ids: ids };
  return guarded(async () => {
    const version = (await c.tx.query('SELECT coalesce(max(version),0)+1 AS v FROM vendor.working_papers WHERE procedure_id=$1', [procedureId])).rows[0].v;
    const wid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.working_papers (id, engagement_id, procedure_id, version, performed, criteria, population_id, results, exceptions, exception_details, conclusion, evidence_ids, redactions, digest, prepared_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [wid, p.engagement_id, procedureId, version, cleaned.value.performed, cleaned.value.criteria, v.population_id, cleaned.value.results, v.exceptions, cleaned.value.exception_details,
      v.conclusion, ids, cleaned.redactions, digestOf({ ...content, version }), c.actor.actor_id]);
    await c.tx.query("UPDATE vendor.procedures SET state='IN_PROGRESS' WHERE id=$1 AND state IN ('PLANNED','COMPLETED')", [procedureId]);
    await audit(c, 'vendor.practice.working-paper-recorded', wid); return engagementFile(c, p.engagement_id);
  });
}
async function paperRow(c: Ctx, id: string) {
  const w = (await c.tx.query('SELECT * FROM vendor.working_papers WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, w.engagement_id); return w;
}
export async function raiseReviewNote(c: Ctx, paperId: string, input: unknown) {
  const v = P.ReviewNoteRaise.parse(input); const w = await paperRow(c, paperId); await requireTeam(c, w.engagement_id, 'REVIEWER');
  if (w.reviewed_by) refuse(409, 'working_paper', 'already_reviewed');
  if (w.prepared_by === c.actor.actor_id) refuse(409, 'raised_by', 'reviewer_must_differ_from_preparer');
  return guarded(async () => { const nid = randomUUID(); await c.tx.query('INSERT INTO vendor.review_notes (id, working_paper_id, note, raised_by) VALUES ($1,$2,$3,$4)', [nid, paperId, clean(v.note).value, c.actor.actor_id]);
    await audit(c, 'vendor.practice.review-note-raised', nid); return engagementFile(c, w.engagement_id); });
}
export async function respondReviewNote(c: Ctx, noteId: string, input: unknown) {
  const v = P.ReviewNoteRespond.parse(input);
  const n = (await c.tx.query('SELECT n.*, w.prepared_by, w.engagement_id FROM vendor.review_notes n JOIN vendor.working_papers w ON w.id = n.working_paper_id WHERE n.id=$1', [noteId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, n.engagement_id);
  if (n.prepared_by !== c.actor.actor_id) refuse(403, 'response', 'only_the_preparer_responds');
  if (n.resolved_at) refuse(409, 'note', 'already_resolved');
  return guarded(async () => { await c.tx.query('UPDATE vendor.review_notes SET response=$2 WHERE id=$1', [noteId, clean(v.response).value]);
    await audit(c, 'vendor.practice.review-note-answered', noteId); return engagementFile(c, n.engagement_id); });
}
export async function resolveReviewNote(c: Ctx, noteId: string) {
  const n = (await c.tx.query('SELECT n.*, w.engagement_id FROM vendor.review_notes n JOIN vendor.working_papers w ON w.id = n.working_paper_id WHERE n.id=$1', [noteId])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, n.engagement_id);
  if (n.raised_by !== c.actor.actor_id) refuse(403, 'resolved_by', 'only_the_reviewer_who_raised_it_resolves');
  if (n.resolved_at) refuse(409, 'note', 'already_resolved');
  if (!n.response) refuse(409, 'note', 'preparer_has_not_responded');
  return guarded(async () => { await c.tx.query('UPDATE vendor.review_notes SET resolved_by=$2, resolved_at=clock_timestamp() WHERE id=$1', [noteId, c.actor.actor_id]);
    await audit(c, 'vendor.practice.review-note-resolved', noteId); return engagementFile(c, n.engagement_id); });
}
export async function reviewWorkingPaper(c: Ctx, paperId: string) {
  const w = await paperRow(c, paperId); await requireTeam(c, w.engagement_id, 'REVIEWER'); await requireAccepted(c, w.engagement_id);
  if (w.reviewed_by) refuse(409, 'working_paper', 'already_reviewed');
  if (w.prepared_by === c.actor.actor_id) refuse(409, 'reviewed_by', 'reviewer_must_differ_from_preparer');
  const latest = (await c.tx.query('SELECT max(version) AS v FROM vendor.working_papers WHERE procedure_id=$1', [w.procedure_id])).rows[0].v;
  if (latest !== w.version) refuse(409, 'working_paper', 'a_later_version_exists');
  return guarded(async () => {
    await c.tx.query('UPDATE vendor.working_papers SET reviewed_by=$2, reviewed_at=clock_timestamp() WHERE id=$1', [paperId, c.actor.actor_id]);
    await c.tx.query("UPDATE vendor.procedures SET state='COMPLETED' WHERE id=$1", [w.procedure_id]);
    await audit(c, 'vendor.practice.working-paper-reviewed', paperId); return engagementFile(c, w.engagement_id);
  });
}

// ---------------------------------------------------------------- findings, responses, retests, closure
async function findingRow(c: Ctx, id: string) {
  const f = (await c.tx.query('SELECT * FROM vendor.findings WHERE id=$1', [id])).rows[0] ?? refuse(404, 'id', 'not_found');
  await requireTeam(c, f.engagement_id); return f;
}
export async function createPracticeFinding(c: Ctx, id: string, input: unknown) {
  const v = P.PracticeFindingCreate.parse(input); await requireTeam(c, id); const e = await requireAccepted(c, id);
  await requireInScope(c, id, v.requirement_id);
  const { requirements } = await criteriaFor(c, e);
  if (v.provision_ids.some(p => !(requirements.get(v.requirement_id)?.provision_ids ?? []).includes(p))) refuse(400, 'provision_ids', 'not_cited_by_requirement');
  if (v.criterion_type === 'STATUTORY' && !v.provision_ids.length) refuse(400, 'provision_ids', 'a_statutory_finding_cites_its_provision');
  const papers = (await c.tx.query('SELECT w.*, p.requirement_id FROM vendor.working_papers w JOIN vendor.procedures p ON p.id = w.procedure_id WHERE w.engagement_id=$1 AND w.id = ANY($2)', [id, v.working_paper_ids])).rows;
  if (papers.length !== new Set(v.working_paper_ids).size) refuse(404, 'working_paper_ids', 'not_found');
  if (!papers.some(w => w.requirement_id === v.requirement_id && ['EXCEPTIONS_NOTED', 'INEFFECTIVE', 'UNABLE_TO_TEST'].includes(w.conclusion))) refuse(409, 'working_paper_ids', 'a_finding_rests_on_an_adverse_working_paper_for_its_requirement');
  if (v.evidence_ids.length && (await c.tx.query('SELECT count(*)::int AS n FROM vendor.evidence WHERE engagement_id=$1 AND id = ANY($2)', [id, v.evidence_ids])).rows[0].n !== new Set(v.evidence_ids).size) refuse(404, 'evidence_ids', 'not_found');
  assertAdvisory('recommendation', v.recommendation); if (v.orvia_guidance) assertAdvisory('orvia_guidance', v.orvia_guidance);
  const t = clean({ title: v.title, observation: v.observation, affected_scope: v.affected_scope, cause: v.cause, consequence: v.consequence, severity_rationale: v.severity_rationale, recommendation: v.recommendation, orvia_guidance: v.orvia_guidance }).value;
  assertWording(t.title, t.observation, t.recommendation, t.cause, t.consequence);
  return guarded(async () => { const fid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.findings (id, engagement_id, requirement_id, provision_ids, severity, title, observation, recommendation, due_date, created_by, affected_scope, cause, consequence, severity_rationale, methodology_id, working_paper_ids, evidence_ids, criterion_type, orvia_guidance)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)`, [fid, id, v.requirement_id, v.provision_ids, v.severity, t.title, t.observation, t.recommendation, v.due_date, c.actor.actor_id, t.affected_scope, t.cause, t.consequence,
      t.severity_rationale, e.methodology_id, [...new Set(v.working_paper_ids)], [...new Set(v.evidence_ids)], v.criterion_type, t.orvia_guidance]);
    await audit(c, 'vendor.audit.finding-created', fid); return engagementFile(c, id); });
}
export async function recordManagementResponse(c: Ctx, findingId: string, input: unknown) {
  const v = P.ManagementResponseRecord.parse(input); const f = await findingRow(c, findingId); await requireAccepted(c, f.engagement_id);
  if (f.status === 'CLOSED') refuse(409, 'finding', 'closed');
  const t = clean({ response: v.response, action_plan: v.action_plan, owner_role: v.owner_role, dependencies: v.dependencies, reference: v.reference }).value;
  return guarded(async () => { const rid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.management_responses (id, finding_id, source, factual_accuracy, agreement, response, action_plan, owner_role, due_date, dependencies, remediation_status, reference, recorded_by)
      VALUES ($1,$2,'RECORDED_BY_AUDITOR',$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [rid, findingId, v.factual_accuracy, v.agreement, t.response, t.action_plan, t.owner_role, v.due_date, t.dependencies, v.remediation_status, t.reference, c.actor.actor_id]);
    if (f.status === 'OPEN') await c.tx.query("UPDATE vendor.findings SET status='CLIENT_RESPONDED' WHERE id=$1", [findingId]);
    await c.tx.query('INSERT INTO vendor.finding_events (id, finding_id, event, note, actor_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), findingId, 'CLIENT_RESPONSE', `Management response recorded by the auditor (reference ${t.reference}).`, c.actor.actor_id]);
    await audit(c, 'vendor.audit.management-response-recorded', rid); return engagementFile(c, f.engagement_id); });
}
/** A retest: a reviewed working paper on a retest procedure for this finding, citing evidence collected after the finding was raised. */
export async function recordRetest(c: Ctx, findingId: string, input: unknown) {
  const v = P.RetestRecord.parse(input); const f = await findingRow(c, findingId); await requireAccepted(c, f.engagement_id);
  await requireTeam(c, f.engagement_id, 'REVIEWER');
  if (!['CLIENT_RESPONDED', 'RETEST_FAILED'].includes(f.status)) refuse(409, 'finding', 'retest_needs_a_management_response');
  const w = (await c.tx.query('SELECT w.*, p.retest_of_finding_id FROM vendor.working_papers w JOIN vendor.procedures p ON p.id = w.procedure_id WHERE w.id=$1', [v.working_paper_id])).rows[0] ?? refuse(404, 'working_paper_id', 'not_found');
  if (w.retest_of_finding_id !== findingId) refuse(409, 'working_paper_id', 'not_a_retest_procedure_for_this_finding');
  if (!w.reviewed_by) refuse(409, 'working_paper_id', 'retest_working_paper_not_reviewed');
  if (w.reviewed_by !== c.actor.actor_id) refuse(409, 'reviewed_by', 'the_reviewer_of_the_retest_records_it');
  const latest = (await c.tx.query('SELECT max(version) AS v FROM vendor.working_papers WHERE procedure_id=$1', [w.procedure_id])).rows[0].v;
  if (latest !== w.version) refuse(409, 'working_paper_id', 'a_later_version_exists');
  const result = w.conclusion === 'EFFECTIVE' ? 'PASSED' : ['EXCEPTIONS_NOTED', 'INEFFECTIVE'].includes(w.conclusion) ? 'FAILED' : refuse(409, 'working_paper_id', 'retest_was_not_performed');
  const evidence = (await c.tx.query('SELECT * FROM vendor.evidence WHERE id = ANY($1)', [w.evidence_ids])).rows;
  const raised = new Date(f.created_at).getTime();
  const fresh = evidence.filter(e => new Date(e.collected_at).getTime() > raised && new Date(e.registered_at).getTime() > raised);
  if (!fresh.length) refuse(409, 'working_paper_id', 'retest_needs_evidence_collected_after_the_finding');
  if (result === 'PASSED' && fresh.length !== evidence.length) refuse(409, 'working_paper_id', 'a_passing_retest_rests_only_on_fresh_evidence');
  return guarded(async () => { const rid = randomUUID();
    await c.tx.query('INSERT INTO vendor.retests (id, finding_id, working_paper_id, evidence_ids, result, performed_by, reviewed_by) VALUES ($1,$2,$3,$4,$5,$6,$7)', [rid, findingId, w.id, fresh.map(e => e.id), result, w.prepared_by, c.actor.actor_id]);
    await c.tx.query('UPDATE vendor.findings SET status=$2 WHERE id=$1', [findingId, result === 'PASSED' ? 'RETEST_PASSED' : 'RETEST_FAILED']);
    await c.tx.query('INSERT INTO vendor.finding_events (id, finding_id, event, note, actor_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), findingId, result === 'PASSED' ? 'RETEST_PASSED' : 'RETEST_FAILED', `Retest recorded from reviewed working paper version ${w.version}.`, c.actor.actor_id]);
    await audit(c, 'vendor.audit.retest-recorded', rid); return engagementFile(c, f.engagement_id); });
}
export async function recordRiskAcceptance(c: Ctx, findingId: string, input: unknown) {
  const v = P.RiskAcceptanceRecord.parse(input); const f = await findingRow(c, findingId); await requireAccepted(c, f.engagement_id);
  await requireTeam(c, f.engagement_id, 'REVIEWER');
  if (f.status === 'CLOSED') refuse(409, 'finding', 'closed');
  const r = (await c.tx.query('SELECT * FROM vendor.management_responses WHERE id=$1 AND finding_id=$2', [v.management_response_id, findingId])).rows[0] ?? refuse(404, 'management_response_id', 'not_found');
  if (r.remediation_status !== 'RISK_ACCEPTANCE_PROPOSED') refuse(409, 'management_response_id', 'client_has_not_proposed_risk_acceptance');
  const today = new Date().toISOString().slice(0, 10); const limit = new Date(Date.now() + 366 * 86_400_000).toISOString().slice(0, 10);
  if (v.expires_on <= today) refuse(400, 'expires_on', 'must_be_in_the_future');
  if (v.expires_on > limit) refuse(400, 'expires_on', 'at_most_one_year');
  if (v.review_on > v.expires_on) refuse(400, 'review_on', 'after_expiry');
  const t = clean({ accepting_authority: v.accepting_authority, justification: v.justification }).value;
  return guarded(async () => { const aid = randomUUID();
    await c.tx.query('INSERT INTO vendor.risk_acceptances (id, finding_id, management_response_id, accepting_authority, justification, expires_on, review_on, recorded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)', [aid, findingId, r.id, t.accepting_authority, t.justification, v.expires_on, v.review_on, c.actor.actor_id]);
    await audit(c, 'vendor.audit.risk-acceptance-recorded', aid); return engagementFile(c, f.engagement_id); });
}
export async function closeFinding(c: Ctx, findingId: string, input: unknown) {
  const v = P.FindingClose.parse(input); const f = await findingRow(c, findingId);
  const e = await engagementRow(c, f.engagement_id);
  if (f.status === 'CLOSED') refuse(409, 'finding', 'closed');
  if (v.closure_type === 'ENGAGEMENT_WITHDRAWN') { if (e.state !== 'CLOSED') refuse(409, 'closure_type', 'engagement_not_withdrawn'); }
  else { await requireAccepted(c, f.engagement_id); await requireTeam(c, f.engagement_id, 'REVIEWER'); }
  if (v.closure_type === 'VERIFIED_REMEDIATION' && f.status !== 'RETEST_PASSED') refuse(409, 'closure_type', 'verified_remediation_requires_a_passing_retest');
  return guarded(async () => {
    await c.tx.query("UPDATE vendor.findings SET status='CLOSED', closure_type=$2, closure_reason=$3, closed_by=$4, closed_at=clock_timestamp() WHERE id=$1", [findingId, v.closure_type, clean(v.reason).value, c.actor.actor_id]);
    await c.tx.query('INSERT INTO vendor.finding_events (id, finding_id, event, note, actor_id) VALUES ($1,$2,$3,$4,$5)', [randomUUID(), findingId, 'CLOSED', `Closed: ${v.closure_type.replaceAll('_', ' ').toLowerCase()}.`, c.actor.actor_id]);
    await audit(c, 'vendor.audit.finding-closed', findingId); return engagementFile(c, f.engagement_id);
  });
}
export async function recordPracticeResult(c: Ctx, id: string, input: unknown) {
  const v = P.PracticeResultRecord.parse(input); await requireTeam(c, id); await requireAccepted(c, id);
  await requireInScope(c, id, v.requirement_id);
  if (v.result === 'NOT_APPLICABLE') { const a = (await currentApplicability(c, id)).get(v.requirement_id); if (a?.applicability !== 'NOT_APPLICABLE' || !a.reviewed_by) refuse(409, 'result', 'not_applicable_needs_a_reviewed_applicability_decision'); }
  const rationale = clean(v.rationale).value; assertWording(rationale);
  return guarded(async () => {
    await c.tx.query('INSERT INTO vendor.requirement_results (id, engagement_id, requirement_id, result, rationale, recorded_by) VALUES ($1,$2,$3,$4,$5,$6)', [randomUUID(), id, v.requirement_id, v.result, rationale, c.actor.actor_id]);
    await audit(c, 'vendor.audit.result-recorded', id); return engagementFile(c, id);
  });
}

// ---------------------------------------------------------------- report: snapshot binding, corrections
async function latestResults(c: Ctx, id: string) {
  return (await c.tx.query('SELECT DISTINCT ON (requirement_id) requirement_id, result, rationale FROM vendor.requirement_results WHERE engagement_id=$1 ORDER BY requirement_id, recorded_at DESC, id DESC', [id])).rows as { requirement_id: string; result: string; rationale: string }[];
}
/** Everything a signed report depends on, in canonical form. Approval stores its digest; signing refuses if it has changed. */
export async function reportSnapshot(c: Ctx, report: pg.QueryResultRow) {
  const id = report.engagement_id; const e = await engagementRow(c, id);
  const criteria = e.criteria_version_id ? (await c.tx.query('SELECT version, distribution, digest FROM vendor.criteria_versions WHERE id=$1', [e.criteria_version_id])).rows[0] : null;
  const methodology = e.methodology_id ? (await c.tx.query('SELECT version, digest FROM vendor.methodologies WHERE id=$1', [e.methodology_id])).rows[0] : null;
  const scope = await approvedScope(c, id); const plan = await planState(c, id);
  const papers = (await c.tx.query('SELECT DISTINCT ON (procedure_id) id, procedure_id, version, digest, conclusion, reviewed_by IS NOT NULL AS reviewed FROM vendor.working_papers WHERE engagement_id=$1 ORDER BY procedure_id, version DESC', [id])).rows;
  const findings = (await c.tx.query('SELECT id, requirement_id, severity, status, criterion_type, closure_type FROM vendor.findings WHERE engagement_id=$1 ORDER BY id', [id])).rows;
  const retests = (await c.tx.query('SELECT r.id, r.result FROM vendor.retests r JOIN vendor.findings f ON f.id = r.finding_id WHERE f.engagement_id=$1 ORDER BY r.id', [id])).rows;
  const acceptances = (await c.tx.query('SELECT a.id, a.expires_on FROM vendor.risk_acceptances a JOIN vendor.findings f ON f.id = a.finding_id WHERE f.engagement_id=$1 ORDER BY a.id', [id])).rows;
  const unable = (await c.tx.query("SELECT id FROM vendor.audit_requests WHERE engagement_id=$1 AND status='UNABLE_TO_OBTAIN' ORDER BY id", [id])).rows.map(r => r.id);
  const populations = (await c.tx.query("SELECT id, completeness FROM vendor.populations WHERE engagement_id=$1 ORDER BY id", [id])).rows;
  return {
    engagement: { id, reference: e.reference, use_kind: e.use_kind, code_digest: e.code_digest },
    criteria, methodology, scope: scope ? { version: scope.version, requirement_ids: scope.requirement_ids, period: { from: day(scope.period_from), to: day(scope.period_to) }, entities: scope.entities, processes: scope.processes, systems: scope.systems, locations: scope.locations, exclusions: scope.exclusions, limitations: scope.limitations } : null,
    plan_digest: plan.approval?.procedures_digest ?? null,
    results: await latestResults(c, id), working_papers: papers.map(w => ({ id: w.id, version: w.version, digest: w.digest, conclusion: w.conclusion, reviewed: w.reviewed })),
    findings: findings.map(f => ({ id: f.id, requirement_id: f.requirement_id, severity: f.severity, status: f.status, criterion_type: f.criterion_type, closure_type: f.closure_type })),
    retests, risk_acceptances: acceptances.map(a => ({ id: a.id, expires_on: day(a.expires_on) })), requests_unable_to_obtain: unable, populations,
    report: { id: report.id, version: report.version, opinion_as_of: day(report.opinion_as_of), executive_summary: report.executive_summary, method: report.method, opinion: report.opinion, limitations: report.limitations,
      supersedes_report_id: report.supersedes_report_id, correction_reason: report.correction_reason },
  };
}
export async function draftPracticeReport(c: Ctx, id: string, input: unknown) {
  const v = P.PracticeReportDraft.parse(input); await requireTeam(c, id, 'LEAD'); const e = await requireAccepted(c, id);
  if (!e.independence_statement) refuse(409, 'independence', 'declaration_required');
  if (!(await planState(c, id)).approved) refuse(409, 'plan', 'work_programme_not_approved');
  if (v.supersedes_report_id) {
    const old = (await c.tx.query('SELECT * FROM vendor.reports WHERE id=$1 AND engagement_id=$2', [v.supersedes_report_id, id])).rows[0] ?? refuse(404, 'supersedes_report_id', 'not_found');
    if (old.state !== 'SIGNED') refuse(409, 'supersedes_report_id', 'only_a_signed_report_is_corrected');
  }
  const t = clean({ executive_summary: v.executive_summary, method: v.method, opinion: v.opinion, limitations: v.limitations, correction_reason: v.correction_reason }).value;
  assertWording(t.executive_summary, t.method, t.opinion, ...t.limitations);
  return guarded(async () => {
    const version = (await c.tx.query('SELECT coalesce(max(version),0)+1 AS v FROM vendor.reports WHERE engagement_id=$1', [id])).rows[0].v;
    await c.tx.query("UPDATE vendor.reports SET state='SUPERSEDED' WHERE engagement_id=$1 AND state IN ('DRAFT','APPROVED')", [id]);
    const rid = randomUUID();
    await c.tx.query(`INSERT INTO vendor.reports (id, engagement_id, version, state, opinion_as_of, method, opinion, limitations, drafted_by, executive_summary, supersedes_report_id, correction_reason) VALUES ($1,$2,$3,'DRAFT',$4,$5,$6,$7,$8,$9,$10,$11)`,
      [rid, id, version, v.opinion_as_of, t.method, t.opinion, t.limitations, c.actor.actor_id, t.executive_summary, v.supersedes_report_id, t.correction_reason]);
    if (e.state !== 'REPORTING') await c.tx.query("UPDATE vendor.engagements SET state='REPORTING' WHERE id=$1", [id]);
    await audit(c, 'vendor.audit.report-drafted', rid);
    return reportView((await c.tx.query('SELECT * FROM vendor.reports WHERE id=$1', [rid])).rows[0]!);
  });
}
/** What stops approval: an unconcluded scoped requirement, an unreviewed working paper, an open review note, or a changed programme. */
async function approvalProblems(c: Ctx, id: string) {
  const problems: string[] = [];
  const scope = await approvedScope(c, id);
  const results = new Map((await latestResults(c, id)).map(r => [r.requirement_id, r]));
  for (const r of (scope?.requirement_ids ?? []) as string[]) if (!results.has(r)) problems.push(`no_conclusion_for_${r}`);
  const unreviewed = (await c.tx.query('SELECT count(*)::int AS n FROM (SELECT DISTINCT ON (procedure_id) reviewed_by FROM vendor.working_papers WHERE engagement_id=$1 ORDER BY procedure_id, version DESC) w WHERE reviewed_by IS NULL', [id])).rows[0].n;
  if (unreviewed) problems.push('working_papers_awaiting_review');
  if ((await c.tx.query('SELECT 1 FROM vendor.review_notes n JOIN vendor.working_papers w ON w.id = n.working_paper_id WHERE w.engagement_id=$1 AND n.resolved_at IS NULL', [id])).rowCount) problems.push('open_review_notes');
  if (!(await planState(c, id)).approved) problems.push('work_programme_changed_since_approval');
  return problems;
}
export async function approvePracticeReport(c: Ctx, reportId: string) {
  const r = await reportRow(c, reportId); await requireAccepted(c, r.engagement_id);
  if (r.state !== 'DRAFT') refuse(409, 'report', 'not_a_draft');
  if (r.drafted_by === c.actor.actor_id) refuse(409, 'approved_by', 'reviewer_must_differ_from_drafter');
  if (!(await onTeam(c, r.engagement_id, 'REVIEWER'))) refuse(403, 'approved_by', 'engagement_reviewer_required');
  const problems = await approvalProblems(c, r.engagement_id);
  if (problems.length) refuse(409, 'report', problems[0]!);
  const snapshot = await reportSnapshot(c, r);
  return guarded(async () => {
    await c.tx.query("UPDATE vendor.reports SET state='APPROVED', approved_by=$2, approved_at=clock_timestamp(), snapshot=$3, approved_snapshot_digest=$4 WHERE id=$1", [reportId, c.actor.actor_id, JSON.stringify(snapshot), digestOf(snapshot)]);
    await audit(c, 'vendor.audit.report-approved', reportId); return reportView((await c.tx.query('SELECT * FROM vendor.reports WHERE id=$1', [reportId])).rows[0]!);
  });
}
/** Visible marks for anything that is not a real, production-qualified audit. */
export function watermarks(e: pg.QueryResultRow, criteria: { distribution: string } | null, keyId: string) {
  return [
    ...(e.use_kind !== 'REAL' ? ['SYNTHETIC ENGAGEMENT - not an audit of a real organisation; not for reliance.'] : []),
    ...(criteria?.distribution !== 'PRODUCTION' ? ['TEST-FIXTURE CRITERIA - the requirements used are not the official regulatory package.'] : []),
    ...(keyId.startsWith(DEV_KEY_PREFIX) ? ['DEVELOPMENT SIGNING KEY - this signature does not identify a production audit practice.'] : []),
  ];
}
export async function signPracticeReport(c: Ctx, reportId: string, keys: Keys) {
  const r = await reportRow(c, reportId);
  if (r.state !== 'APPROVED') refuse(409, 'report', 'approval_required');
  if (!r.approved_snapshot_digest) refuse(409, 'report', 'approved_without_a_snapshot');
  const snapshot = await reportSnapshot(c, r);
  if (digestOf(snapshot) !== r.approved_snapshot_digest) refuse(409, 'report', 'snapshot_changed_since_approval');
  const e = await engagementRow(c, r.engagement_id); const key = keys.audit();
  const marks = watermarks(e, snapshot.criteria, key.key_id);
  const file = await engagementFile(c, r.engagement_id);
  const scopeIds = snapshot.scope!.requirement_ids as string[];
  const results = scopeIds.map(req => { const x = snapshot.results.find(y => y.requirement_id === req)!; return { requirement_id: req, result: x.result, rationale: x.rationale }; });
  const unable = file.requests.filter(q => q.status === 'UNABLE_TO_OBTAIN').map(q => `Evidence requested for ${q.requirement_id} could not be obtained: ${q.description.slice(0, 200)}`);
  const unverified = file.populations.filter(p => p.completeness !== 'COMPLETE').map(p => `Population for procedure ${p.procedure_id.slice(0, 8)} has ${p.completeness.toLowerCase()} completeness; conclusions drawn from it are limited accordingly.`);
  const channelUnanswered = (await c.tx.query(`SELECT kind, requirement_id, due_date, status FROM vendor.channel_requests WHERE engagement_id=$1 AND status IN ('PENDING','AWAITING_CLIENT_APPROVAL','REFUSED') AND due_date < $2::date ORDER BY due_date, id`, [r.engagement_id, day(r.opinion_as_of)])).rows
    .map(u => `Auditor request (${String(u.kind).replaceAll('_', ' ').toLowerCase()}${u.requirement_id ? `, ${u.requirement_id}` : ''}) due ${day(u.due_date)} was ${u.status === 'REFUSED' ? 'declined' : 'not answered'} by the client by the opinion date.`);
  const limitations = [...marks, ...(r.limitations as string[]), ...(snapshot.scope!.limitations as string[]), ...unable, ...unverified, ...channelUnanswered];
  if (limitations.length > 20) limitations.splice(19, limitations.length - 19, `${limitations.length - 19} further limitations are recorded in the engagement file.`);
  const coverage = scopeIds.map(req => { const t = file.traceability.find(x => x.requirement_id === req)!; return { requirement_id: req, procedures: t.procedures.length, working_papers: t.working_papers.length, evidence: t.evidence.length, conclusion: t.conclusion }; });
  const findingEntries = file.findings.map(f => ({ finding_id: f.id, requirement_id: f.requirement_id, severity: f.severity, title: f.title, status: f.status, closure_type: f.closure_type, criterion_type: f.criterion_type }));
  const reliance = e.use_kind === 'REAL' ? 'Prepared for the intended users named in the engagement terms; no other party may rely on it.' : 'Synthetic engagement produced to exercise the audit workflow; no party may rely on it.';
  const snapshotDigest = r.approved_snapshot_digest as string;
  const pdf = renderPdf(practiceReportLines(e, r, results, file, marks, coverage, limitations, reliance, snapshotDigest, snapshot.criteria), `${e.reference} - audit report as of ${day(r.opinion_as_of)} - version ${r.version}`);
  const pdfSha = sha256(pdf);
  const document = { kind: 'REPORT' as const, ...header(e), report_id: r.id, version: r.version, opinion_as_of: day(r.opinion_as_of)!, scope: { requirement_ids: scopeIds, period: snapshot.scope!.period as { from: string; to: string } }, method: r.method, results,
    findings: findingEntries.map(f => ({ finding_id: f.finding_id, requirement_id: f.requirement_id, severity: f.severity, title: f.title, status: f.status, ...(f.closure_type ? { closure_type: f.closure_type } : {}) })),
    opinion: r.opinion, limitations, independence_statement: e.independence_statement, empanelment_reference: e.empanelment_reference, drafted_by_role: 'LEAD_AUDITOR' as const, approved_by_role: 'AUDIT_REVIEWER' as const, pdf_sha256: pdfSha,
    executive_summary: r.executive_summary, snapshot_digest: snapshotDigest, use_kind: e.use_kind, watermarks: marks,
    criteria: snapshot.criteria ? { version: snapshot.criteria.version, distribution: snapshot.criteria.distribution, digest: snapshot.criteria.digest } : undefined,
    coverage, reliance, ...(r.supersedes_report_id ? { supersedes_report_id: r.supersedes_report_id, correction_reason: r.correction_reason } : {}) };
  const signed = signAuditDocument(document, key);
  const docId = await storeSigned(c, r.engagement_id, 'REPORT', signed);
  await guarded(async () => {
    await c.tx.query("UPDATE vendor.reports SET state='SIGNED', signed_document_id=$2, pdf=$3, pdf_sha256=$4 WHERE id=$1", [reportId, docId, pdf, pdfSha]);
    if (r.supersedes_report_id) await c.tx.query("UPDATE vendor.reports SET state='SUPERSEDED' WHERE id=$1 AND state='SIGNED'", [r.supersedes_report_id]);
  });
  return V.SignedFile.parse({ file_name: `orvia-audit-report-${e.reference.replace(/[^A-Za-z0-9_-]/g, '_')}-v${r.version}.json`, signed });
}
export function practiceReportLines(e: pg.QueryResultRow, r: pg.QueryResultRow, results: { requirement_id: string; result: string; rationale: string }[], file: P.EngagementFile, marks: string[],
  coverage: { requirement_id: string; procedures: number; working_papers: number; evidence: number; conclusion: string }[], limitations: string[], reliance: string, snapshotDigest: string, criteria: { version: string; distribution: string } | null): PdfLine[] {
  const acceptance = file.acceptance;
  const lines: PdfLine[] = [
    ...marks.map(text => ({ text, style: 'heading' as const })),
    { text: 'DPDPA audit report', style: 'title' },
    { text: `${e.organisation_name} - engagement ${e.reference}` },
    { text: `Opinion as of ${day(r.opinion_as_of)}. Audit period ${day(e.period_from)} to ${day(e.period_to)}. Report version ${r.version}.` },
    { text: 'This is an audit opinion, as of the date stated, on the scope stated below. It is not a determination of compliance: only the Data Protection Board of India decides compliance with the Digital Personal Data Protection Act, 2023 and the Rules made under it.', style: 'small' },
    ...(r.supersedes_report_id ? [{ text: `This report corrects and supersedes report ${r.supersedes_report_id}. Reason: ${r.correction_reason}`, style: 'heading' as const }] : []),
    { text: 'Executive summary', style: 'heading' }, { text: r.executive_summary },
    { text: 'Engagement', style: 'heading' },
    { text: `Service: ${acceptance ? acceptance.service_type.replaceAll('_', ' ').toLowerCase() : 'not recorded'}. Criteria: ${criteria ? `${criteria.version} (${criteria.distribution.replaceAll('_', ' ').toLowerCase()})` : 'not recorded'}.` },
    ...(acceptance ? [{ text: `Objectives: ${acceptance.objectives}`, style: 'small' as const }, { text: `Intended users: ${acceptance.intended_users}`, style: 'small' as const }] : []),
    { text: 'Scope', style: 'heading' }, { text: (e.scope_requirement_ids as string[]).join(', ') },
    { text: 'Method', style: 'heading' }, { text: r.method },
    { text: 'Coverage', style: 'heading' },
    ...coverage.map(x => ({ text: `${x.requirement_id}: ${x.procedures} procedure(s), ${x.working_papers} working paper(s), ${x.evidence} evidence item(s) - ${x.conclusion}`, style: 'small' as const })),
    { text: 'Results by requirement', style: 'heading' },
    ...results.flatMap(x => [{ text: `${x.requirement_id}: ${x.result.replaceAll('_', ' ')}` }, { text: x.rationale, style: 'small' as const }]),
    { text: 'Findings', style: 'heading' },
    ...(file.findings.length ? file.findings.flatMap(f => [
      { text: `[${f.severity}] ${f.requirement_id} - ${f.title} (${f.status.replaceAll('_', ' ')}${f.closure_type ? `: ${f.closure_type.replaceAll('_', ' ').toLowerCase()}` : ''})` },
      { text: `Condition: ${f.observation}`, style: 'small' as const },
      ...(f.cause ? [{ text: `Cause: ${f.cause}`, style: 'small' as const }] : []),
      ...(f.consequence ? [{ text: `Consequence: ${f.consequence}`, style: 'small' as const }] : []),
      ...(f.severity_rationale ? [{ text: `Severity rationale: ${f.severity_rationale}`, style: 'small' as const }] : []),
      { text: `Recommendation (advice only; it is not an instruction any system carries out): ${f.recommendation}`, style: 'small' as const },
      ...f.responses.slice(-1).map(m => ({ text: `Management response (${m.agreement.replaceAll('_', ' ').toLowerCase()}, facts ${m.factual_accuracy.toLowerCase()}): ${m.response}`, style: 'small' as const })),
      ...f.risk_acceptances.map(a => ({ text: `Risk accepted by ${a.accepting_authority} until ${a.expires_on} (review ${a.review_on}). The finding remains reported.`, style: 'small' as const })),
    ]) : [{ text: 'No findings were raised.' }]),
    { text: 'Opinion', style: 'heading' }, { text: r.opinion },
    { text: 'Limitations', style: 'heading' }, ...limitations.map(x => ({ text: `- ${x}` })),
    { text: 'Reliance', style: 'heading' }, { text: reliance },
    { text: 'Independence', style: 'heading' }, { text: e.independence_statement },
    { text: 'No finding or conclusion in this report depends on the purchase, renewal or expansion of any ORVIA licence.', style: 'small' },
    ...(e.empanelment_reference ? [{ text: `Eligibility reference stated by the auditor (not verified by ORVIA): ${e.empanelment_reference}`, style: 'small' as const }] : []),
    { text: `Drafted by the lead auditor and approved by a different audit reviewer against engagement snapshot ${snapshotDigest.slice(0, 16)}; signing refuses any change made after approval. The signed JSON issued with this PDF carries its SHA-256.`, style: 'small' },
  ];
  assertAttestationWordingSafe(lines);
  return lines;
}
function assertAttestationWordingSafe(lines: PdfLine[]) { assertWording(...lines.filter(l => l.style !== 'heading' && l.style !== 'title').map(l => l.text)); }

// ---------------------------------------------------------------- holds
export async function authoriseHold(c: Ctx, id: string, input: unknown) {
  const v = P.LegalHoldAuthorise.parse(input); await engagementRow(c, id);
  return guarded(async () => { const hid = randomUUID(); await c.tx.query('INSERT INTO vendor.legal_holds (id, engagement_id, reason, authorised_by, expires_on) VALUES ($1,$2,$3,$4,$5)', [hid, id, clean(v.reason).value, c.actor.actor_id, v.expires_on]);
    await audit(c, 'vendor.retention.hold-authorised', hid); return holdsView(c, id); });
}
export async function releaseHold(c: Ctx, holdId: string, input: unknown) {
  const v = P.LegalHoldRelease.parse(input);
  const h = (await c.tx.query('SELECT * FROM vendor.legal_holds WHERE id=$1', [holdId])).rows[0] ?? refuse(404, 'id', 'not_found');
  if (h.released_at) refuse(409, 'hold', 'already_released');
  return guarded(async () => { await c.tx.query('UPDATE vendor.legal_holds SET released_by=$2, released_at=clock_timestamp(), release_reason=$3 WHERE id=$1', [holdId, c.actor.actor_id, clean(v.reason).value]);
    await audit(c, 'vendor.retention.hold-released', holdId); return holdsView(c, h.engagement_id); });
}
async function holdsView(c: Ctx, id: string) {
  const today = new Date().toISOString().slice(0, 10);
  return { items: (await c.tx.query('SELECT * FROM vendor.legal_holds WHERE engagement_id=$1 ORDER BY authorised_at DESC', [id])).rows.map(h => ({ id: h.id, reason: h.reason, authorised_by: h.authorised_by, authorised_at: iso(h.authorised_at),
    expires_on: day(h.expires_on), released_by: h.released_by, released_at: iso(h.released_at), release_reason: h.release_reason, active: !h.released_at && (!h.expires_on || day(h.expires_on)! >= today) })) };
}

// ---------------------------------------------------------------- the engagement file
export async function engagementFile(c: Ctx, id: string): Promise<P.EngagementFile> {
  const e = await engagementRow(c, id);
  const teamMember = await onTeam(c, id);
  const criteria = e.criteria_version_id ? (await c.tx.query('SELECT id, version, distribution, digest FROM vendor.criteria_versions WHERE id=$1', [e.criteria_version_id])).rows[0] : null;
  const methodology = e.methodology_id ? (await c.tx.query('SELECT id, version, digest, approved_by FROM vendor.methodologies WHERE id=$1', [e.methodology_id])).rows[0] : null;
  const acceptance = (await c.tx.query('SELECT * FROM vendor.engagement_acceptances WHERE engagement_id=$1', [id])).rows[0];
  const conflicts = (await c.tx.query('SELECT * FROM vendor.engagement_conflicts WHERE engagement_id=$1 ORDER BY recorded_at', [id])).rows;
  const holds = (await holdsView(c, id)).items;
  const base = { engagement_id: id, use_kind: e.use_kind, criteria: criteria ? { id: criteria.id, version: criteria.version, distribution: criteria.distribution, digest: criteria.digest } : null,
    methodology: methodology ? { id: methodology.id, version: methodology.version, digest: methodology.digest, approved: !!methodology.approved_by } : null,
    commercial_owner_id: e.commercial_owner_id, implementation_owner_id: e.implementation_owner_id,
    acceptance: acceptance ? { ...pick(acceptance, ['service_type', 'objectives', 'intended_users', 'client_responsibilities', 'auditor_responsibilities', 'confidentiality', 'evidence_handling', 'scope_restrictions', 'competence', 'sdf_applicability_basis', 'eligibility_evidence', 'licence_independence', 'prepared_by', 'decision', 'decided_by', 'decision_rationale']),
      prepared_at: iso(acceptance.prepared_at), decided_at: iso(acceptance.decided_at) } : null,
    conflicts: conflicts.map(x => ({ id: x.id, kind: x.kind, person_id: x.person_id, description: x.description, status: x.status, safeguard: x.safeguard, recorded_by: x.recorded_by, recorded_at: iso(x.recorded_at), reviewed_by: x.reviewed_by, reviewed_at: iso(x.reviewed_at) })),
    holds };
  const empty = { understanding: [], applicability: [], scope: [], risks: [], plan: { procedures_digest: digestOf([]), approved: false, approval: null, problems: [] }, procedures: [], evidence: [], requests: [], populations: [], working_papers: [], findings: [], conclusions: [], traceability: [] };
  // Staff who can see the engagement but are not on its team see the acceptance record only; the file itself is team-only.
  if (!teamMember) return P.EngagementFile.parse({ ...base, ...empty });
  const q = async (sql: string) => (await c.tx.query(sql, [id])).rows;
  const understanding = await q('SELECT * FROM vendor.understanding_versions WHERE engagement_id=$1 ORDER BY version');
  const applicability = await q('SELECT * FROM vendor.applicability_decisions WHERE engagement_id=$1 ORDER BY decided_at, id');
  const current = new Map<string, string>(); for (const a of applicability) current.set(a.requirement_id, a.id);
  const scope = await q('SELECT * FROM vendor.scope_versions WHERE engagement_id=$1 ORDER BY version');
  const risks = await q('SELECT * FROM vendor.risk_assessments WHERE engagement_id=$1 ORDER BY assessed_at, id');
  const plan = await planState(c, id);
  const procedures = await q('SELECT * FROM vendor.procedures WHERE engagement_id=$1 ORDER BY created_at, id');
  const evidence = await q('SELECT e.*, (SELECT count(*)::int FROM vendor.evidence_access_log l WHERE l.engagement_id = e.engagement_id AND l.package_id = e.package_id AND l.item_id = e.item_id) AS accessed FROM vendor.evidence e WHERE e.engagement_id=$1 ORDER BY registered_at, id');
  const evaluations = await q('SELECT v.* FROM vendor.evidence_evaluations v JOIN vendor.evidence e ON e.id = v.evidence_id WHERE e.engagement_id=$1 ORDER BY evaluated_at');
  const requests = await q('SELECT * FROM vendor.audit_requests WHERE engagement_id=$1 ORDER BY created_at, id');
  const requestEvents = await q('SELECT x.* FROM vendor.request_events x JOIN vendor.audit_requests r ON r.id = x.request_id WHERE r.engagement_id=$1 ORDER BY recorded_at');
  const populations = await q('SELECT * FROM vendor.populations WHERE engagement_id=$1 ORDER BY recorded_at, id');
  const papers = await q('SELECT * FROM vendor.working_papers WHERE engagement_id=$1 ORDER BY procedure_id, version');
  const notes = await q('SELECT n.* FROM vendor.review_notes n JOIN vendor.working_papers w ON w.id = n.working_paper_id WHERE w.engagement_id=$1 ORDER BY raised_at');
  const findings = await q('SELECT * FROM vendor.findings WHERE engagement_id=$1 ORDER BY created_at, id');
  const responses = await q('SELECT m.* FROM vendor.management_responses m JOIN vendor.findings f ON f.id = m.finding_id WHERE f.engagement_id=$1 ORDER BY received_at');
  const retests = await q('SELECT r.* FROM vendor.retests r JOIN vendor.findings f ON f.id = r.finding_id WHERE f.engagement_id=$1 ORDER BY recorded_at');
  const acceptances = await q('SELECT a.* FROM vendor.risk_acceptances a JOIN vendor.findings f ON f.id = a.finding_id WHERE f.engagement_id=$1 ORDER BY recorded_at');
  const results = new Map((await latestResults(c, id)).map(r => [r.requirement_id, r]));
  const latestPaper = new Map<string, pg.QueryResultRow>(); for (const w of papers) latestPaper.set(w.procedure_id, w);
  const now = Date.now(); const today = new Date().toISOString().slice(0, 10);
  const scopeIds = ((scope.filter(s => s.approved_by).at(-1)?.requirement_ids ?? e.scope_requirement_ids) as string[]);
  const supported = new Map<string, boolean>();
  for (const r of scopeIds) supported.set(r, (await c.tx.query('SELECT vendor.requirement_supported($1,$2) AS ok', [id, r])).rows[0].ok);
  return P.EngagementFile.parse({ ...base,
    understanding: understanding.map(u => ({ id: u.id, version: u.version, content: u.content, redactions: u.redactions, prepared_by: u.prepared_by, prepared_at: iso(u.prepared_at), reviewed_by: u.reviewed_by, reviewed_at: iso(u.reviewed_at) })),
    applicability: applicability.map(a => ({ id: a.id, requirement_id: a.requirement_id, provision_ids: a.provision_ids, criterion_type: a.criterion_type, applicability: a.applicability, effective_from: day(a.effective_from), rationale: a.rationale,
      evidence_refs: a.evidence_refs, unresolved_question: a.unresolved_question, decided_by: a.decided_by, decided_at: iso(a.decided_at), current: current.get(a.requirement_id) === a.id, reviewed_by: a.reviewed_by, reviewed_at: iso(a.reviewed_at) })),
    scope: scope.map((s, i) => { const prev = i ? scope[i - 1]! : null; const added = prev ? (s.requirement_ids as string[]).filter(r => !(prev.requirement_ids as string[]).includes(r)) : [];
      const removed = prev ? (prev.requirement_ids as string[]).filter(r => !(s.requirement_ids as string[]).includes(r)) : [];
      return { id: s.id, version: s.version, entities: s.entities, processes: s.processes, systems: s.systems, locations: s.locations, period_from: day(s.period_from), period_to: day(s.period_to), requirement_ids: s.requirement_ids,
        exclusions: s.exclusions, limitations: s.limitations, change_reason: s.change_reason, impact_assessment: s.impact_assessment,
        change: prev ? { added, removed, procedures_affected: procedures.filter(p => removed.includes(p.requirement_id)).length } : null,
        prepared_by: s.prepared_by, prepared_at: iso(s.prepared_at), approved_by: s.approved_by, approved_at: iso(s.approved_at) }; }),
    risks: risks.map(r => ({ ...pick(r, ['id', 'requirement_id', 'risk', 'likelihood', 'impact', 'affected_people', 'affected_scope', 'duration', 'uncertainty', 'control_reference', 'control_effectiveness', 'inherent_rating', 'residual_rating', 'rationale', 'assessed_by', 'reviewed_by']),
      assessed_at: iso(r.assessed_at), reviewed_at: iso(r.reviewed_at) })),
    plan: { procedures_digest: plan.digest, approved: plan.approved, approval: plan.approval ? { id: plan.approval.id, procedures_digest: plan.approval.procedures_digest, prepared_by: plan.approval.prepared_by, approved_by: plan.approval.approved_by, approved_at: iso(plan.approval.approved_at) } : null, problems: plan.problems },
    procedures: procedures.map(p => ({ ...pick(p, ['id', 'requirement_id', 'provision_ids', 'risk_assessment_id', 'control_reference', 'objective', 'procedure_type', 'test_nature', 'requires_record_level', 'owner_id', 'depends_on', 'evidence_expectation', 'completion_criteria', 'retest_of_finding_id', 'state', 'not_performed_reason', 'created_by']),
      planned_start: day(p.planned_start), planned_end: day(p.planned_end), created_at: iso(p.created_at) })),
    evidence: evidence.map(x => ({ ...pick(x, ['id', 'source', 'package_id', 'item_id', 'delivery_id', 'entry_key', 'evidence_type', 'title', 'description', 'redactions', 'collection_method', 'sha256', 'provenance', 'registered_by', 'accessed']),
      period_from: iso(x.period_from), period_to: iso(x.period_to), collected_at: iso(x.collected_at), valid_until: iso(x.valid_until), stale: !!x.valid_until && new Date(x.valid_until).getTime() < now, registered_at: iso(x.registered_at),
      evaluations: evaluations.filter(v => v.evidence_id === x.id).map(v => ({ ...pick(v, ['id', 'procedure_id', 'relevance', 'reliability', 'sufficiency', 'contradicts', 'rationale', 'evaluated_by']), evaluated_at: iso(v.evaluated_at) })) })),
    requests: requests.map(r => ({ id: r.id, requirement_id: r.requirement_id, procedure_id: r.procedure_id, owner_role: r.owner_role, description: r.description, due_date: day(r.due_date), status: r.status,
      overdue: ['OPEN', 'CLARIFICATION_REQUESTED', 'RESUBMISSION_REQUESTED'].includes(r.status) && day(r.due_date)! < today, escalated_at: iso(r.escalated_at),
      events: requestEvents.filter(x => x.request_id === r.id).map(x => ({ id: x.id, event: x.event, note: x.note, evidence_id: x.evidence_id, actor_id: x.actor_id, recorded_at: iso(x.recorded_at) })) })),
    populations: populations.map(p => ({ ...pick(p, ['id', 'procedure_id', 'definition', 'source', 'source_kind', 'population_size', 'completeness', 'completeness_basis', 'sample_method', 'sample_size', 'size_rationale', 'selection_digest', 'seed', 'exclusions', 'tested', 'passed', 'exceptions', 'evidence_id', 'recorded_by']),
      period_from: day(p.period_from), period_to: day(p.period_to), recorded_at: iso(p.recorded_at) })),
    working_papers: papers.map(w => ({ ...pick(w, ['id', 'procedure_id', 'version', 'performed', 'criteria', 'population_id', 'results', 'exceptions', 'exception_details', 'conclusion', 'evidence_ids', 'redactions', 'digest', 'prepared_by', 'reviewed_by']),
      current: latestPaper.get(w.procedure_id)?.id === w.id, prepared_at: iso(w.prepared_at), reviewed_at: iso(w.reviewed_at),
      notes: notes.filter(n => n.working_paper_id === w.id).map(n => ({ id: n.id, note: n.note, raised_by: n.raised_by, raised_at: iso(n.raised_at), response: n.response, resolved_by: n.resolved_by, resolved_at: iso(n.resolved_at) })) })),
    findings: findings.map(f => ({ ...pick(f, ['id', 'requirement_id', 'provision_ids', 'criterion_type', 'severity', 'title', 'observation', 'affected_scope', 'cause', 'consequence', 'severity_rationale', 'recommendation', 'orvia_guidance', 'status', 'working_paper_ids', 'evidence_ids', 'closure_type', 'closure_reason', 'closed_by']),
      due_date: day(f.due_date), closed_at: iso(f.closed_at), created_at: iso(f.created_at),
      responses: responses.filter(m => m.finding_id === f.id).map(m => ({ ...pick(m, ['id', 'source', 'factual_accuracy', 'agreement', 'response', 'action_plan', 'owner_role', 'dependencies', 'remediation_status', 'reference']), due_date: day(m.due_date), received_at: iso(m.received_at) })),
      retests: retests.filter(r => r.finding_id === f.id).map(r => ({ ...pick(r, ['id', 'working_paper_id', 'evidence_ids', 'result', 'performed_by', 'reviewed_by']), recorded_at: iso(r.recorded_at) })),
      risk_acceptances: acceptances.filter(a => a.finding_id === f.id).map(a => ({ ...pick(a, ['id', 'management_response_id', 'accepting_authority', 'justification', 'recorded_by']), expires_on: day(a.expires_on), review_on: day(a.review_on), expired: day(a.expires_on)! < today, recorded_at: iso(a.recorded_at) })) })),
    conclusions: scopeIds.map(r => { const onReq = procedures.filter(p => p.requirement_id === r && !p.retest_of_finding_id); const current = onReq.map(p => latestPaper.get(p.id)).filter(Boolean) as pg.QueryResultRow[];
      return { requirement_id: r, recorded: (results.get(r)?.result ?? null) as never, supported_favourable: supported.get(r) ?? false,
        open_statutory_findings: findings.filter(f => f.requirement_id === r && f.status !== 'CLOSED' && (f.criterion_type ?? 'STATUTORY') === 'STATUTORY').length,
        current_working_papers: current.length, unreviewed_working_papers: current.filter(w => !w.reviewed_by).length }; }),
    traceability: scopeIds.map(r => { const a = applicability.find(x => x.id === current.get(r)); const procs = procedures.filter(p => p.requirement_id === r);
      const wps = papers.filter(w => procs.some(p => p.id === w.procedure_id) && latestPaper.get(w.procedure_id)?.id === w.id);
      const evidenceIds = [...new Set(wps.flatMap(w => w.evidence_ids as string[]))]; const fs = findings.filter(f => f.requirement_id === r);
      const result = results.get(r)?.result ?? null;
      const conclusion = !procs.length ? 'NOT PLANNED' : !wps.length ? 'NOT TESTED' : wps.some(w => !w.reviewed_by) ? 'AWAITING REVIEW' : result ? String(result).replaceAll('_', ' ') : 'NO CONCLUSION RECORDED';
      return { requirement_id: r, provision_ids: a?.provision_ids ?? [], applicability: a?.applicability ?? null, risks: risks.filter(x => x.requirement_id === r).map(x => x.id), procedures: procs.map(p => p.id), evidence: evidenceIds,
        working_papers: wps.map(w => w.id), result, findings: fs.map(f => f.id), retests: retests.filter(x => fs.some(f => f.id === x.finding_id)).map(x => x.id), conclusion }; }),
  });
}
function pick<T extends Record<string, unknown>>(row: T, keys: string[]) { return Object.fromEntries(keys.map(k => [k, row[k] ?? null])); }
/** The current audit key never leaves the server; only whether it is a development key. */
export const auditKeyIsDevelopment = (keys: Keys) => auditKeyState(keys)?.development ?? true;
export { AccessError };
