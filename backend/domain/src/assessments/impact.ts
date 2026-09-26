import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, packageAt, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * EX06 general impact assessments.
 *
 * A template version is immutable and is published by someone other than its
 * author. An assessment answers one published version about one subject. It is
 * submitted only when every required question is answered, with evidence where
 * the question demands it; answers that meet a question's finding rule raise a
 * finding. Approval needs a person who neither created nor submitted it, and
 * any finding not resolved (or accepted, with an expiry, by a second person)
 * blocks it. A retest is a new revision; the approved predecessor is superseded
 * only when the new revision is approved, so history never disappears.
 */
type FindingState = ReturnType<typeof X.ImpactFindingState.parse>;
const SUBJECT_TABLE: Record<string, string | null> = {
  ORGANISATION: null, ACTIVITY: 'registry_activities', SYSTEM: 'systems', PROCESSOR: 'processors', PROCESSOR_ENGAGEMENT: 'processor_engagements', AI_SYSTEM: 'ai_systems',
};
const DAY = 86_400_000;
/** A database row exactly as the driver returns it. */
type Row = QueryResultRow;

async function lock(c: Context, kind: string, id: string) {
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), kind, id])]);
}
const templateView = (r: Row) => X.ImpactTemplate.parse({
  id: r.id, template_key: r.template_key, version: r.version, kind: r.kind, name: r.name, description: r.description, questions: r.questions,
  requirement_ids: r.requirement_ids, review_interval_days: r.review_interval_days, status: r.status, recorded_by: r.recorded_by,
  recorded_at: iso(r.recorded_at), published_by: r.published_by, published_at: iso(r.published_at),
});
async function templateRow(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT * FROM app.impact_templates WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'template_id', 'not_found');
  return r as Row;
}

export async function createTemplate(c: Context, input: unknown) {
  const value = X.ImpactTemplateCreate.parse(input);
  if (value.requirement_ids.length) {
    const pkg = await packageAt(c, new Date());
    for (const id of value.requirement_ids) if (!pkg?.claims.requirements.some(r => r.requirement_id === id)) refuse(409, 'requirement_ids', 'requirement_not_in_active_package');
  }
  const key = value.template_key ?? randomUUID();
  await lock(c, 'impact-template', key);
  let version = 1;
  if (value.template_key) {
    const prior = (await c.tx.query(`SELECT max(version) v, bool_or(kind<>$5) kind_changed FROM app.impact_templates WHERE ${predicate} AND template_key=$4`, [...scope(c), key, value.kind])).rows[0];
    if (!prior?.v) refuse(404, 'template_key', 'not_found');
    if (prior.kind_changed) refuse(409, 'kind', 'a_template_keeps_its_kind');
    version = Number(prior.v) + 1;
  }
  const row = (await c.tx.query(`INSERT INTO app.impact_templates(tenant_id,legal_entity_id,environment_id,id,template_key,version,kind,name,description,questions,requirement_ids,review_interval_days,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
  [...scope(c), randomUUID(), key, version, value.kind, value.name, value.description, JSON.stringify(value.questions), value.requirement_ids, value.review_interval_days, c.actor.actor_id])).rows[0];
  await audit(c, 'impact_template.create', row.id);
  return templateView(row);
}

export async function publishTemplate(c: Context, id: string, input: unknown) {
  const value = X.ImpactTemplatePublish.parse(input);
  const current = await templateRow(c, id);
  await lock(c, 'impact-template', current.template_key);
  if (value.action === 'PUBLISH') {
    if (current.status !== 'DRAFT') refuse(409, 'status', 'only_a_draft_is_published');
    if (current.recorded_by === c.actor.actor_id) refuse(409, 'published_by', 'author_cannot_publish');
    // The previously published version of the same template is retired: one version is current.
    await c.tx.query(`UPDATE app.impact_templates SET status='RETIRED',retired_at=clock_timestamp() WHERE ${predicate} AND template_key=$4 AND status='PUBLISHED'`, [...scope(c), current.template_key]);
    const row = (await c.tx.query(`UPDATE app.impact_templates SET status='PUBLISHED',published_by=$5,published_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id])).rows[0];
    await audit(c, 'impact_template.publish', id);
    return templateView(row);
  }
  if (current.status !== 'PUBLISHED') refuse(409, 'status', 'only_a_published_version_is_retired');
  const row = (await c.tx.query(`UPDATE app.impact_templates SET status='RETIRED',retired_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'impact_template.retire', id);
  return templateView(row);
}

export async function templateList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.impact_templates WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(templateView), next_cursor: paged.next_cursor };
}

async function assessmentRow(c: Context, id: string, forUpdate = false) {
  const r = (await c.tx.query(`SELECT * FROM app.impact_assessments WHERE ${predicate} AND id=$4${forUpdate ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}

export async function createAssessment(c: Context, input: unknown) {
  const value = X.ImpactAssessmentCreate.parse(input);
  const template = await templateRow(c, value.template_id);
  if (template.status !== 'PUBLISHED') refuse(409, 'template_id', 'template_not_published');
  const table = SUBJECT_TABLE[value.subject_kind]!;
  if (table) await exists(c, table, value.subject_id, 'subject_id');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.impact_assessments(tenant_id,legal_entity_id,environment_id,id,template_id,revision,subject_kind,subject_id,title,owner_reference,due_at,created_by)
    VALUES($1,$2,$3,$4,$5,1,$6,$7,$8,$9,$10,$11)`, [...scope(c), id, value.template_id, value.subject_kind, value.subject_id, value.title, value.owner_reference, value.due_at, c.actor.actor_id]);
  await audit(c, 'impact_assessment.create', id);
  return assessmentView(c, id);
}

async function currentAnswers(c: Context, id: string) {
  return (await c.tx.query(`SELECT DISTINCT ON (question_key) question_key,value,evidence_reference,carried_forward,respondent,answered_by,answered_at FROM app.impact_answers
    WHERE ${predicate} AND assessment_id=$4 ORDER BY question_key, sequence DESC`, [...scope(c), id])).rows as Row[];
}

export async function recordAnswers(c: Context, id: string, input: unknown) {
  const value = X.ImpactAnswersRecord.parse(input);
  await lock(c, 'impact-assessment', id);
  const a = await assessmentRow(c, id);
  if (a.status !== 'DRAFT') refuse(409, 'status', 'answers_change_only_in_draft');
  const template = templateView(await templateRow(c, a.template_id));
  for (const answer of value.answers) {
    const q = template.questions.find(x => x.key === answer.question_key);
    if (!q) refuse(400, 'question_key', 'not_a_question_of_this_template');
    if (q.answer_type === 'YES_NO' && !['YES', 'NO'].includes(answer.value)) refuse(400, 'value', 'answer_is_yes_or_no');
    if (q.answer_type === 'CHOICE' && !q.choices.includes(answer.value)) refuse(400, 'value', 'answer_is_one_of_the_choices');
    if (q.answer_type === 'NUMBER' && !Number.isFinite(Number(answer.value))) refuse(400, 'value', 'answer_is_a_number');
    await c.tx.query(`INSERT INTO app.impact_answers(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,value,evidence_reference,answered_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...scope(c), randomUUID(), id, answer.question_key, answer.value, answer.evidence_reference, c.actor.actor_id]);
  }
  await audit(c, 'impact_assessment.answer', id);
  return assessmentView(c, id);
}

function missingFor(t: { questions: { key: string; required: boolean; evidence_required: boolean }[] }, answers: Row[]) {
  const missing: { question_key: string; reason: 'NOT_ANSWERED' | 'EVIDENCE_MISSING' }[] = [];
  for (const q of t.questions) {
    const a = answers.find(x => x.question_key === q.key);
    if (q.required && !a) missing.push({ question_key: q.key, reason: 'NOT_ANSWERED' });
    else if (a && q.evidence_required && !a.evidence_reference) missing.push({ question_key: q.key, reason: 'EVIDENCE_MISSING' });
  }
  return missing;
}

export async function submitAssessment(c: Context, id: string) {
  await lock(c, 'impact-assessment', id);
  const a = await assessmentRow(c, id, true);
  if (a.status !== 'DRAFT') refuse(409, 'status', 'only_a_draft_is_submitted');
  const template = templateView(await templateRow(c, a.template_id));
  const answers = await currentAnswers(c, id);
  if (missingFor(template, answers).length) refuse(409, 'answers', 'required_answers_or_evidence_missing');
  const days = Math.ceil((Date.parse(a.due_at) - Date.now()) / DAY);
  for (const q of template.questions) {
    const answer = answers.find(x => x.question_key === q.key);
    if (!answer || q.finding_when === null || answer.value !== q.finding_when) continue;
    await c.tx.query(`INSERT INTO app.impact_findings(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,source,title,severity,owner_reference,due_at,created_by)
      VALUES($1,$2,$3,$4,$5,$6,'ANSWER_RULE',$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
    [...scope(c), randomUUID(), id, q.key, `Answer "${answer.value}" to: ${q.text}`.slice(0, 300), q.finding_severity, a.owner_reference,
      new Date(Date.now() + Math.max(days, 14) * DAY).toISOString(), c.actor.actor_id]);
  }
  await c.tx.query(`UPDATE app.impact_assessments SET status='SUBMITTED',submitted_by=$5,submitted_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id]);
  await audit(c, 'impact_assessment.submit', id);
  return assessmentView(c, id);
}

type FindingRow = Row & { events: Row[] };
function findingState(f: FindingRow, now: number): FindingState {
  const decisive = f.events.filter(e => e.kind !== 'ESCALATED').at(0);
  if (!decisive || decisive.kind === 'REOPENED') return 'OPEN';
  if (decisive.kind === 'REMEDIATION_PLANNED') return 'REMEDIATION_PLANNED';
  if (decisive.kind === 'RESOLVED') return 'RESOLVED';
  return Date.parse(decisive.acceptance_expires_at) <= now ? 'ACCEPTANCE_EXPIRED' : 'RISK_ACCEPTED';
}
async function findings(c: Context, assessmentId: string | null, findingId: string | null = null) {
  const rows = (await c.tx.query(`SELECT * FROM app.impact_findings WHERE ${predicate} AND ($4::uuid IS NULL OR assessment_id=$4) AND ($5::uuid IS NULL OR id=$5) ORDER BY created_at LIMIT 100`, [...scope(c), assessmentId, findingId])).rows as FindingRow[];
  const now = Date.now();
  for (const f of rows) f.events = (await c.tx.query(`SELECT * FROM app.impact_finding_events WHERE ${predicate} AND finding_id=$4 ORDER BY sequence DESC LIMIT 100`, [...scope(c), f.id])).rows;
  return rows.map(f => {
    const state = findingState(f, now);
    const open = !['RESOLVED', 'RISK_ACCEPTED'].includes(state);
    return X.ImpactFinding.parse({
      id: f.id, assessment_id: f.assessment_id, question_key: f.question_key, source: f.source, title: f.title, severity: f.severity, owner_reference: f.owner_reference,
      due_at: iso(f.due_at), grc_risk_id: f.grc_risk_id, grc_control_id: f.grc_control_id, state, overdue: open && Date.parse(f.due_at) < now, blocks_approval: open,
      events: f.events.map(e => ({ id: e.id, kind: e.kind, note: e.note, evidence_reference: e.evidence_reference, acceptance_expires_at: iso(e.acceptance_expires_at), actor_id: e.actor_id, recorded_at: iso(e.recorded_at) })),
      created_by: f.created_by, created_at: iso(f.created_at),
    });
  });
}

export async function assessmentView(c: Context, id: string) {
  const a = await assessmentRow(c, id);
  const template = templateView(await templateRow(c, a.template_id));
  const answers = await currentAnswers(c, id);
  const list = await findings(c, id);
  const missing = missingFor(template, answers);
  const blockers: string[] = [];
  if (a.status !== 'SUBMITTED') blockers.push(`The assessment is ${a.status.toLowerCase()}, not submitted.`);
  for (const f of list.filter(x => x.blocks_approval)) blockers.push(`Finding "${f.title.slice(0, 120)}" is ${f.state.toLowerCase().replaceAll('_', ' ')}.`);
  const attested = answers.filter(x => x.respondent === 'SUPPLIER').length;
  if (attested) blockers.push(`${attested} answer(s) are supplier attestations not yet confirmed by staff.`);
  const now = Date.now();
  return X.ImpactAssessmentDetail.parse({
    id: a.id, template, revision: a.revision, previous_id: a.previous_id, subject_kind: a.subject_kind, subject_id: a.subject_id, title: a.title, owner_reference: a.owner_reference,
    due_at: iso(a.due_at), status: a.status, overdue: ['DRAFT', 'SUBMITTED'].includes(a.status) && Date.parse(a.due_at) < now,
    review_due: a.status === 'APPROVED' && a.next_review_at !== null && Date.parse(a.next_review_at) < now, next_review_at: iso(a.next_review_at),
    created_by: a.created_by, created_at: iso(a.created_at), submitted_by: a.submitted_by, submitted_at: iso(a.submitted_at), decided_by: a.decided_by, decided_at: iso(a.decided_at), decision_note: a.decision_note,
    answers: answers.map(x => ({ question_key: x.question_key, value: x.value, evidence_reference: x.evidence_reference, carried_forward: x.carried_forward, respondent: x.respondent, answered_by: x.answered_by, answered_at: iso(x.answered_at) })),
    missing, findings: list, approval_blockers: blockers.slice(0, 20),
  });
}

export async function decideAssessment(c: Context, id: string, input: unknown) {
  const value = X.ImpactDecision.parse(input);
  await lock(c, 'impact-assessment', id);
  const a = await assessmentRow(c, id, true);
  if (a.status !== 'SUBMITTED') refuse(409, 'status', 'only_a_submitted_assessment_is_decided');
  if (a.created_by === c.actor.actor_id || a.submitted_by === c.actor.actor_id) refuse(409, 'decided_by', 'reviewer_must_be_independent');
  if (value.decision === 'APPROVED' && (await findings(c, id)).some(f => f.blocks_approval)) refuse(409, 'findings', 'unresolved_findings_block_approval');
  if (value.decision === 'APPROVED' && (await currentAnswers(c, id)).some(x => x.respondent === 'SUPPLIER')) refuse(409, 'answers', 'supplier_attestations_not_confirmed');
  const template = await templateRow(c, a.template_id);
  const nextReview = value.decision === 'APPROVED' ? new Date(Date.now() + template.review_interval_days * DAY).toISOString() : null;
  await c.tx.query(`UPDATE app.impact_assessments SET status=$5,decided_by=$6,decided_at=clock_timestamp(),decision_note=$7,next_review_at=$8 WHERE ${predicate} AND id=$4`,
    [...scope(c), id, value.decision, c.actor.actor_id, value.note, nextReview]);
  // Approval of a revision supersedes the predecessor it retests.
  if (value.decision === 'APPROVED' && a.previous_id) await c.tx.query(`UPDATE app.impact_assessments SET status='SUPERSEDED' WHERE ${predicate} AND id=$4 AND status='APPROVED'`, [...scope(c), a.previous_id]);
  await audit(c, `impact_assessment.${value.decision.toLowerCase()}`, id);
  return assessmentView(c, id);
}

export async function reviseAssessment(c: Context, id: string, input: unknown) {
  const value = X.ImpactRevise.parse(input);
  await lock(c, 'impact-assessment', id);
  const a = await assessmentRow(c, id, true);
  if (!['APPROVED', 'REJECTED'].includes(a.status)) refuse(409, 'status', 'only_a_decided_assessment_is_revised');
  const successor = (await c.tx.query(`SELECT 1 FROM app.impact_assessments WHERE ${predicate} AND previous_id=$4`, [...scope(c), id])).rowCount;
  if (successor) refuse(409, 'id', 'already_revised');
  // A retest uses the template version currently published, which may be newer.
  const template = await templateRow(c, a.template_id);
  const current = (await c.tx.query(`SELECT id FROM app.impact_templates WHERE ${predicate} AND template_key=$4 AND status='PUBLISHED'`, [...scope(c), template.template_key])).rows[0];
  if (!current) refuse(409, 'template_id', 'no_published_template_version');
  const newId = randomUUID();
  await c.tx.query(`INSERT INTO app.impact_assessments(tenant_id,legal_entity_id,environment_id,id,template_id,revision,previous_id,subject_kind,subject_id,title,owner_reference,due_at,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...scope(c), newId, current.id, a.revision + 1, id, a.subject_kind, a.subject_id, a.title, a.owner_reference, value.due_at, c.actor.actor_id]);
  // Prior answers to questions that still exist are carried forward, marked as such, to be confirmed or changed.
  const keys = new Set(templateView(await templateRow(c, current.id)).questions.map(q => q.key));
  for (const answer of await currentAnswers(c, id)) {
    if (!keys.has(answer.question_key)) continue;
    // A carried-forward answer is recorded by the staff member starting the retest; a supplier attestation
    // is not carried forward as confirmed — only confirmed (staff) answers are carried.
    if (answer.respondent !== 'STAFF') continue;
    await c.tx.query(`INSERT INTO app.impact_answers(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,value,evidence_reference,carried_forward,answered_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,true,$9)`,
      [...scope(c), randomUUID(), newId, answer.question_key, answer.value, answer.evidence_reference, c.actor.actor_id]);
  }
  await audit(c, 'impact_assessment.revise', newId);
  return assessmentView(c, newId);
}

export async function createFinding(c: Context, id: string, input: unknown) {
  const value = X.ImpactFindingCreate.parse(input);
  await lock(c, 'impact-assessment', id);
  const a = await assessmentRow(c, id);
  if (['SUPERSEDED'].includes(a.status)) refuse(409, 'status', 'assessment_superseded');
  await exists(c, 'grc_risks', value.grc_risk_id, 'grc_risk_id');
  await exists(c, 'grc_controls', value.grc_control_id, 'grc_control_id');
  if (value.question_key) {
    const template = templateView(await templateRow(c, a.template_id));
    if (!template.questions.some(q => q.key === value.question_key)) refuse(400, 'question_key', 'not_a_question_of_this_template');
  }
  const source = a.status === 'SUBMITTED' && a.created_by !== c.actor.actor_id && a.submitted_by !== c.actor.actor_id ? 'REVIEWER' : 'MANUAL';
  await c.tx.query(`INSERT INTO app.impact_findings(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,source,title,severity,owner_reference,due_at,grc_risk_id,grc_control_id,created_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
  [...scope(c), randomUUID(), id, value.question_key, source, value.title, value.severity, value.owner_reference, value.due_at, value.grc_risk_id, value.grc_control_id, c.actor.actor_id]);
  await audit(c, 'impact_finding.create', id);
  return assessmentView(c, id);
}

export async function recordFindingEvent(c: Context, id: string, input: unknown) {
  const value = X.ImpactFindingEventRecord.parse(input);
  const finding = (await c.tx.query(`SELECT * FROM app.impact_findings WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!finding) refuse(404, 'id', 'not_found');
  await lock(c, 'impact-assessment', finding.assessment_id);
  const [current] = await findings(c, null, id);
  const state = current!.state;
  if (value.kind === 'RISK_ACCEPTED') {
    // Accepting a risk is an approver's decision, taken by someone other than whoever raised it.
    if (!c.actor.capabilities.includes('grc.approve')) refuse(409, 'kind', 'risk_acceptance_needs_an_approver');
    if (finding.created_by === c.actor.actor_id) refuse(409, 'actor_id', 'raiser_cannot_accept_the_risk');
    if (Date.parse(value.acceptance_expires_at!) <= Date.now()) refuse(400, 'acceptance_expires_at', 'expiry_is_in_the_future');
  }
  if (value.kind === 'REOPENED' && !['RESOLVED', 'RISK_ACCEPTED', 'ACCEPTANCE_EXPIRED'].includes(state)) refuse(409, 'kind', 'only_a_closed_finding_is_reopened');
  if (value.kind !== 'REOPENED' && ['RESOLVED', 'RISK_ACCEPTED'].includes(state)) refuse(409, 'kind', 'finding_is_closed');
  await c.tx.query(`INSERT INTO app.impact_finding_events(tenant_id,legal_entity_id,environment_id,id,finding_id,kind,note,evidence_reference,acceptance_expires_at,actor_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [...scope(c), randomUUID(), id, value.kind, value.note, value.evidence_reference, value.acceptance_expires_at, c.actor.actor_id]);
  await audit(c, `impact_finding.${value.kind.toLowerCase()}`, id);
  return (await findings(c, null, id))[0]!;
}

/**
 * Records one escalation per overdue open finding and due date. Idempotent:
 * the escalation note carries the due date, and the database refuses a second.
 */
export async function escalationSweep(c: Context) {
  const candidates = (await c.tx.query(`SELECT id FROM app.impact_findings WHERE ${predicate} AND due_at < clock_timestamp() ORDER BY due_at LIMIT 200`, scope(c))).rows;
  const escalated: string[] = [];
  for (const { id } of candidates) {
    const [f] = await findings(c, null, id);
    if (!f || !f.blocks_approval) continue;
    const note = `Overdue since ${f.due_at}`;
    const r = await c.tx.query(`INSERT INTO app.impact_finding_events(tenant_id,legal_entity_id,environment_id,id,finding_id,kind,note,actor_id) VALUES($1,$2,$3,$4,$5,'ESCALATED',$6,$7) ON CONFLICT DO NOTHING`,
      [...scope(c), randomUUID(), id, note, c.actor.actor_id]);
    if (r.rowCount) escalated.push(id);
  }
  if (escalated.length) await audit(c, 'impact_finding.escalation_sweep');
  return X.ImpactEscalationSweep.parse({ escalated: escalated.length, finding_ids: escalated });
}

export async function assessmentList(c: Context, page: Page, query: unknown) {
  const q = X.ImpactAssessmentQuery.parse(query ?? {});
  const rows = (await c.tx.query(`SELECT a.*, t.name template_name, t.kind FROM app.impact_assessments a JOIN app.impact_templates t ON t.tenant_id=a.tenant_id AND t.legal_entity_id=a.legal_entity_id AND t.environment_id=a.environment_id AND t.id=a.template_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND ($4::uuid IS NULL OR a.id>$4) AND ($6::text IS NULL OR a.status=$6) AND ($7::text IS NULL OR a.subject_kind=$7) AND ($8::uuid IS NULL OR a.subject_id=$8)
    ORDER BY a.id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1, q.status ?? null, q.subject_kind ?? null, q.subject_id ?? null])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const now = Date.now();
  const items = [];
  for (const a of paged.items) {
    const open = (await findings(c, a.id)).filter(f => f.blocks_approval).length;
    items.push(X.ImpactAssessmentSummary.parse({ id: a.id, template_name: a.template_name, kind: a.kind, revision: a.revision, subject_kind: a.subject_kind, subject_id: a.subject_id, title: a.title,
      status: a.status, due_at: iso(a.due_at), overdue: ['DRAFT', 'SUBMITTED'].includes(a.status) && Date.parse(a.due_at) < now,
      review_due: a.status === 'APPROVED' && a.next_review_at !== null && Date.parse(a.next_review_at) < now, open_findings: open }));
  }
  return { items, next_cursor: paged.next_cursor };
}
