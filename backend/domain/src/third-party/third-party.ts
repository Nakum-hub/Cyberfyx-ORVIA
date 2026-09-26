import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * EX08 third-party lifecycle.
 *
 * An agreement records what was agreed with a processor; the standing compares
 * it with what is recorded as happening (engagements, the activities linked to
 * them, their purposes, sub-processors and dispositions) and states each gap as
 * a fact. A declaration is never treated as an observed flow, and a processor's
 * statement about disposition is never treated as verified. A risk tier fixes
 * how often vendor due diligence must be re-approved (EX06 VENDOR_DUE_DILIGENCE).
 */
type Row = QueryResultRow;
const DAY = 86_400_000;
const EXPIRING_DAYS = 30;

const agreementView = (r: Row, now = Date.now()) => X.Agreement.parse({
  id: r.id, processor_id: r.processor_id, kind: r.kind, reference: r.reference, signed_at: iso(r.signed_at), effective_from: iso(r.effective_from), expires_at: iso(r.expires_at),
  allowed_purpose_ids: r.allowed_purpose_ids, allowed_regions: r.allowed_regions, subprocessors_allowed: r.subprocessors_allowed, onward_transfer_allowed: r.onward_transfer_allowed,
  evidence_reference: r.evidence_reference, supersedes_id: r.supersedes_id, status: r.status, terminated_at: iso(r.terminated_at), termination_reason: r.termination_reason,
  in_force: r.status === 'ACTIVE' && !r.superseded && Date.parse(r.effective_from) <= now && (r.expires_at === null || Date.parse(r.expires_at) > now),
  superseded: Boolean(r.superseded), recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at),
});
const AGREEMENT_SELECT = `SELECT a.*, EXISTS(SELECT 1 FROM app.processor_agreements s WHERE s.tenant_id=a.tenant_id AND s.legal_entity_id=a.legal_entity_id AND s.environment_id=a.environment_id AND s.supersedes_id=a.id) superseded FROM app.processor_agreements a`;

async function processorRow(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT id, document->>'name' AS name, document->>'region' AS region FROM app.processors WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'processor_id', 'not_found');
  return r as Row;
}

export async function createAgreement(c: Context, input: unknown) {
  const value = X.AgreementCreate.parse(input);
  await processorRow(c, value.processor_id);
  for (const purpose of value.allowed_purpose_ids) await exists(c, 'registry_purposes', purpose, 'allowed_purpose_ids');
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'processor-agreements', value.processor_id])]);
  if (value.supersedes_id) {
    const prior = (await c.tx.query(`${AGREEMENT_SELECT} WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.id=$4`, [...scope(c), value.supersedes_id])).rows[0];
    if (!prior || prior.processor_id !== value.processor_id) refuse(409, 'supersedes_id', 'not_an_agreement_of_this_processor');
    if (prior.superseded) refuse(409, 'supersedes_id', 'already_superseded');
  }
  const row = (await c.tx.query(`INSERT INTO app.processor_agreements(tenant_id,legal_entity_id,environment_id,id,processor_id,kind,reference,signed_at,effective_from,expires_at,allowed_purpose_ids,allowed_regions,subprocessors_allowed,onward_transfer_allowed,evidence_reference,supersedes_id,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *, false AS superseded`,
  [...scope(c), randomUUID(), value.processor_id, value.kind, value.reference, value.signed_at, value.effective_from, value.expires_at, value.allowed_purpose_ids, value.allowed_regions,
    value.subprocessors_allowed, value.onward_transfer_allowed, value.evidence_reference, value.supersedes_id, c.actor.actor_id])).rows[0];
  await audit(c, 'processor_agreement.create', row.id);
  return agreementView(row);
}

export async function terminateAgreement(c: Context, id: string, input: unknown) {
  const value = X.AgreementTerminate.parse(input);
  const row = (await c.tx.query(`UPDATE app.processor_agreements SET status='TERMINATED',terminated_at=clock_timestamp(),termination_reason=$5 WHERE ${predicate} AND id=$4 AND status='ACTIVE' RETURNING *`, [...scope(c), id, value.reason])).rows[0];
  if (!row) {
    const existing = (await c.tx.query(`SELECT status FROM app.processor_agreements WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
    if (!existing) refuse(404, 'id', 'not_found');
    refuse(409, 'status', 'already_terminated');
  }
  await audit(c, 'processor_agreement.terminate', id);
  const view = (await c.tx.query(`${AGREEMENT_SELECT} WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.id=$4`, [...scope(c), id])).rows[0]!;
  return agreementView(view);
}

export async function agreementList(c: Context, page: Page, query: unknown) {
  const q = X.AgreementQuery.parse(query ?? {});
  const rows = (await c.tx.query(`${AGREEMENT_SELECT} WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND ($4::uuid IS NULL OR a.id>$4) AND ($6::uuid IS NULL OR a.processor_id=$6) ORDER BY a.id LIMIT $5`,
    [...scope(c), page.cursor, page.limit + 1, q.processor_id ?? null])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => agreementView(r)), next_cursor: paged.next_cursor };
}

export async function setTier(c: Context, processorId: string, input: unknown) {
  const value = X.TierSet.parse(input);
  await processorRow(c, processorId);
  const row = (await c.tx.query(`INSERT INTO app.processor_tiers(tenant_id,legal_entity_id,environment_id,id,processor_id,tier,reassessment_interval_days,reason,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [...scope(c), randomUUID(), processorId, value.tier, value.reassessment_interval_days, value.reason, c.actor.actor_id])).rows[0];
  await audit(c, 'processor_tier.set', processorId);
  return X.Tier.parse({ id: row.id, processor_id: row.processor_id, tier: row.tier, reassessment_interval_days: row.reassessment_interval_days, reason: row.reason, recorded_by: row.recorded_by, recorded_at: iso(row.recorded_at) });
}

/** The standing of one processor: agreements, tier, due diligence and every derived gap. */
export async function standing(c: Context, processorId: string) {
  const now = Date.now();
  const p = await processorRow(c, processorId);
  const s = scope(c);
  const agreements = (await c.tx.query(`${AGREEMENT_SELECT} WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.processor_id=$4 ORDER BY a.effective_from DESC LIMIT 100`, [...s, processorId])).rows.map(r => agreementView(r, now));
  const inForce = agreements.filter(a => a.in_force).sort((a, b) => Date.parse(b.effective_from) - Date.parse(a.effective_from))[0] ?? null;
  const tierRow = (await c.tx.query(`SELECT * FROM app.processor_tiers WHERE ${predicate} AND processor_id=$4 ORDER BY sequence DESC LIMIT 1`, [...s, processorId])).rows[0];
  const tier = tierRow ? X.Tier.parse({ id: tierRow.id, processor_id: tierRow.processor_id, tier: tierRow.tier, reassessment_interval_days: tierRow.reassessment_interval_days, reason: tierRow.reason, recorded_by: tierRow.recorded_by, recorded_at: iso(tierRow.recorded_at) }) : null;
  const engagements = (await c.tx.query(`SELECT id,service_description,status,subprocessor_of,disposition_state FROM app.processor_engagements WHERE ${predicate} AND processor_id=$4 LIMIT 500`, [...s, processorId])).rows;
  const active = engagements.filter(e => e.status === 'ACTIVE');
  const violations: ReturnType<typeof X.ThirdPartyViolation.parse>[] = [];
  const push = (kind: string, detail: string, engagement_id: string | null = null, agreement_id: string | null = null) => { if (violations.length < 200) violations.push(X.ThirdPartyViolation.parse({ kind, detail, engagement_id, agreement_id })); };

  if (active.length && !inForce) push('NO_AGREEMENT_IN_FORCE', `${active.length} active engagement(s) with no agreement in force.`);
  if (inForce?.expires_at && Date.parse(inForce.expires_at) - now < EXPIRING_DAYS * DAY) push('AGREEMENT_EXPIRING', `Agreement ${inForce.reference} expires ${inForce.expires_at}.`, null, inForce.id);
  if (inForce && inForce.allowed_regions.length && !inForce.allowed_regions.includes(String(p.region ?? '').toUpperCase()))
    push('REGION_NOT_PERMITTED', `The processor's recorded region "${p.region}" is not among the agreement's permitted regions (${inForce.allowed_regions.join(', ')}).`, null, inForce.id);
  if (inForce && inForce.allowed_purpose_ids.length) {
    // Purposes of the activities linked to each active engagement, as currently versioned.
    const linked = (await c.tx.query(`SELECT l.engagement_id, pv.purpose_id, ra.name activity_name FROM app.registry_activity_links l
      JOIN app.registry_activities ra ON ra.tenant_id=l.tenant_id AND ra.legal_entity_id=l.legal_entity_id AND ra.environment_id=l.environment_id AND ra.id=l.activity_id
      JOIN app.registry_activity_versions v ON v.tenant_id=l.tenant_id AND v.legal_entity_id=l.legal_entity_id AND v.environment_id=l.environment_id AND v.activity_id=l.activity_id AND v.status='CURRENT'
      JOIN app.registry_purpose_versions pv ON pv.tenant_id=v.tenant_id AND pv.legal_entity_id=v.legal_entity_id AND pv.environment_id=v.environment_id AND pv.id=v.purpose_version_id
      WHERE l.tenant_id=$1 AND l.legal_entity_id=$2 AND l.environment_id=$3 AND l.link_kind='PROCESSOR_ENGAGEMENT' AND l.valid_to IS NULL AND l.engagement_id=ANY($4::uuid[])`, [...s, active.map(e => e.id)])).rows;
    for (const l of linked) if (!inForce.allowed_purpose_ids.includes(l.purpose_id)) push('PURPOSE_NOT_PERMITTED', `Activity "${l.activity_name}" uses this processor for a purpose the agreement does not permit.`, l.engagement_id, inForce.id);
  }
  if (inForce && !inForce.subprocessors_allowed) {
    const subs = (await c.tx.query(`SELECT id,service_description FROM app.processor_engagements WHERE ${predicate} AND status='ACTIVE' AND subprocessor_of=ANY($4::uuid[])`, [...s, active.map(e => e.id)])).rows;
    for (const sub of subs) push('SUBPROCESSOR_NOT_PERMITTED', `Sub-processor engagement "${sub.service_description}" exists but the agreement does not permit sub-processors.`, sub.id, inForce.id);
  }
  if (!tier) push('NO_TIER', 'No risk tier is recorded, so no reassessment interval applies.');
  const dd = (await c.tx.query(`SELECT a.id, a.decided_at FROM app.impact_assessments a JOIN app.impact_templates t ON t.tenant_id=a.tenant_id AND t.legal_entity_id=a.legal_entity_id AND t.environment_id=a.environment_id AND t.id=a.template_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND t.kind='VENDOR_DUE_DILIGENCE' AND a.status='APPROVED'
      AND ((a.subject_kind='PROCESSOR' AND a.subject_id=$4) OR (a.subject_kind='PROCESSOR_ENGAGEMENT' AND a.subject_id=ANY($5::uuid[])))
    ORDER BY a.decided_at DESC LIMIT 1`, [...s, processorId, engagements.map(e => e.id)])).rows[0];
  const reassessmentDue = dd && tier ? new Date(Date.parse(dd.decided_at) + tier.reassessment_interval_days * DAY).toISOString() : null;
  if (active.length && !dd) push('DUE_DILIGENCE_MISSING', 'No approved vendor due-diligence assessment exists for this processor.');
  if (reassessmentDue && Date.parse(reassessmentDue) < now) push('REASSESSMENT_DUE', `Vendor due diligence was due for reassessment on ${reassessmentDue}.`);
  for (const e of engagements.filter(e => e.status === 'TERMINATED' && ['PENDING', 'PROCESSOR_CONFIRMED', 'UNKNOWN'].includes(e.disposition_state)))
    push('DISPOSITION_NOT_VERIFIED', `Return or deletion for "${e.service_description}" is ${e.disposition_state === 'PROCESSOR_CONFIRMED' ? 'attested by the processor but not verified' : e.disposition_state.toLowerCase()}.`, e.id);

  return X.ThirdPartyStanding.parse({
    processor_id: processorId, processor_name: p.name ?? 'Unnamed processor', region: p.region ?? 'Not recorded', as_of: new Date(now).toISOString(), tier, agreements, agreement_in_force: inForce,
    active_engagement_ids: active.map(e => e.id).slice(0, 100), last_due_diligence: dd ? { assessment_id: dd.id, approved_at: iso(dd.decided_at) } : null, reassessment_due_at: reassessmentDue, violations,
  });
}

export async function standingList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT id FROM app.processors WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const r of paged.items) {
    const st = await standing(c, r.id);
    items.push(X.ThirdPartySummary.parse({ processor_id: st.processor_id, processor_name: st.processor_name, tier: st.tier?.tier ?? null, agreement_in_force: st.agreement_in_force !== null,
      active_engagements: st.active_engagement_ids.length, violations: [...new Set(st.violations.map(v => v.kind))].slice(0, 20), reassessment_due_at: st.reassessment_due_at }));
  }
  return { items, next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------------------
// Supplier questionnaire links (staff side).
// ---------------------------------------------------------------------------
export const tokenDigest = (token: string) => createHash('sha256').update(token, 'utf8').digest('hex');
const linkView = (r: Row, now = Date.now()) => X.SupplierLink.parse({
  id: r.id, assessment_id: r.assessment_id, expires_at: iso(r.expires_at), state: r.revoked_at ? 'REVOKED' : Date.parse(r.expires_at) <= now ? 'EXPIRED' : 'ACTIVE',
  revoked_at: iso(r.revoked_at), revocation_reason: r.revocation_reason, last_used_at: iso(r.last_used_at), created_by: r.created_by, created_at: iso(r.created_at),
});

export async function createSupplierLink(c: Context, input: unknown) {
  const value = X.SupplierLinkCreate.parse(input);
  const a = (await c.tx.query(`SELECT a.status, a.subject_kind, t.kind FROM app.impact_assessments a JOIN app.impact_templates t ON t.tenant_id=a.tenant_id AND t.legal_entity_id=a.legal_entity_id AND t.environment_id=a.environment_id AND t.id=a.template_id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.id=$4`, [...scope(c), value.assessment_id])).rows[0];
  if (!a) refuse(404, 'assessment_id', 'not_found');
  if (a.kind !== 'VENDOR_DUE_DILIGENCE' || !['PROCESSOR', 'PROCESSOR_ENGAGEMENT'].includes(a.subject_kind)) refuse(409, 'assessment_id', 'only_vendor_due_diligence_of_a_processor');
  if (a.status !== 'DRAFT') refuse(409, 'assessment_id', 'assessment_not_open_for_answers');
  const expires = Date.parse(value.expires_at);
  if (expires <= Date.now() || expires > Date.now() + 30 * DAY) refuse(400, 'expires_at', 'expiry_within_thirty_days');
  const token = randomBytes(32).toString('hex');
  const row = (await c.tx.query(`INSERT INTO app.supplier_links(tenant_id,legal_entity_id,environment_id,id,assessment_id,token_digest,expires_at,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope(c), randomUUID(), value.assessment_id, tokenDigest(token), value.expires_at, c.actor.actor_id])).rows[0];
  await audit(c, 'supplier_link.issue', row.id);
  // The token travels in the URL fragment, which browsers never send to a server.
  return X.SupplierLinkIssued.parse({ link: linkView(row), token, path: `/supplier#token=${token}` });
}

export async function revokeSupplierLink(c: Context, id: string, input: unknown) {
  const value = X.SupplierLinkRevoke.parse(input);
  const row = (await c.tx.query(`UPDATE app.supplier_links SET revoked_at=clock_timestamp(),revoked_by=$5,revocation_reason=$6 WHERE ${predicate} AND id=$4 AND revoked_at IS NULL RETURNING *`, [...scope(c), id, c.actor.actor_id, value.reason])).rows[0];
  if (!row) {
    const existing = (await c.tx.query(`SELECT 1 FROM app.supplier_links WHERE ${predicate} AND id=$4`, [...scope(c), id])).rowCount;
    if (!existing) refuse(404, 'id', 'not_found');
    refuse(409, 'revoked_at', 'already_revoked');
  }
  await audit(c, 'supplier_link.revoke', id);
  return linkView(row);
}

export async function supplierLinkList(c: Context, page: Page, query: unknown) {
  const q = X.SupplierLinkQuery.parse(query ?? {});
  const rows = (await c.tx.query(`SELECT * FROM app.supplier_links WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) AND ($6::uuid IS NULL OR assessment_id=$6) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1, q.assessment_id ?? null])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => linkView(r)), next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------------------
// Supplier side: runs as the link's own restricted actor; RLS limits every read
// and write to the one assessment the link names and to the supplier's answers.
// ---------------------------------------------------------------------------
async function supplierAssessment(c: Context) {
  const a = (await c.tx.query(`SELECT a.id, a.title, a.status, t.name template_name, t.questions, l.expires_at FROM app.impact_assessments a
    JOIN app.impact_templates t ON t.tenant_id=a.tenant_id AND t.legal_entity_id=a.legal_entity_id AND t.environment_id=a.environment_id AND t.id=a.template_id
    JOIN app.supplier_links l ON l.tenant_id=a.tenant_id AND l.legal_entity_id=a.legal_entity_id AND l.environment_id=a.environment_id AND l.assessment_id=a.id AND l.id=$4
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3`, [...scope(c), c.actor.actor_id])).rows[0];
  if (!a) refuse(404, 'token', 'not_found');
  return a as Row;
}
async function questionnaireView(c: Context, a: Row) {
  const answers = (await c.tx.query(`SELECT DISTINCT ON (question_key) question_key,value,evidence_reference,answered_at FROM app.impact_answers WHERE ${predicate} AND assessment_id=$4 AND respondent='SUPPLIER' ORDER BY question_key, sequence DESC`, [...scope(c), a.id])).rows;
  return X.SupplierQuestionnaire.parse({
    title: a.title, template_name: a.template_name, expires_at: iso(a.expires_at), editable: a.status === 'DRAFT',
    questions: (a.questions as { key: string; text: string; answer_type: string; choices: string[]; required: boolean; evidence_required: boolean; guidance: string | null }[]).map(q =>
      ({ key: q.key, text: q.text, answer_type: q.answer_type, choices: q.choices, required: q.required, evidence_required: q.evidence_required, guidance: q.guidance })),
    answers: answers.map(x => ({ question_key: x.question_key, value: x.value, evidence_reference: x.evidence_reference, answered_at: iso(x.answered_at) })),
  });
}
export async function supplierQuestionnaire(c: Context) {
  const a = await supplierAssessment(c);
  await c.tx.query(`UPDATE app.supplier_links SET last_used_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), c.actor.actor_id]);
  return questionnaireView(c, a);
}
export async function supplierAnswer(c: Context, input: unknown) {
  const value = X.SupplierAnswers.parse(input);
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'impact-assessment', (await supplierAssessment(c)).id])]);
  const a = await supplierAssessment(c);
  if (a.status !== 'DRAFT') refuse(409, 'status', 'assessment_no_longer_accepts_answers');
  const questions = a.questions as { key: string; answer_type: string; choices: string[] }[];
  for (const answer of value.answers) {
    const q = questions.find(x => x.key === answer.question_key);
    if (!q) refuse(400, 'question_key', 'not_a_question_of_this_questionnaire');
    if (q.answer_type === 'YES_NO' && !['YES', 'NO'].includes(answer.value)) refuse(400, 'value', 'answer_is_yes_or_no');
    if (q.answer_type === 'CHOICE' && !q.choices.includes(answer.value)) refuse(400, 'value', 'answer_is_one_of_the_choices');
    if (q.answer_type === 'NUMBER' && !Number.isFinite(Number(answer.value))) refuse(400, 'value', 'answer_is_a_number');
    await c.tx.query(`INSERT INTO app.impact_answers(tenant_id,legal_entity_id,environment_id,id,assessment_id,question_key,value,evidence_reference,respondent,answered_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,'SUPPLIER',$9)`,
      [...scope(c), randomUUID(), a.id, answer.question_key, answer.value, answer.evidence_reference, c.actor.actor_id]);
  }
  await c.tx.query(`UPDATE app.supplier_links SET last_used_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), c.actor.actor_id]);
  await audit(c, 'supplier_link.answer', c.actor.actor_id);
  return questionnaireView(c, a);
}
