import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M16 Processor and Vendor Management.
 *
 * The distinction this module exists to hold: telling a processor something,
 * that processor saying something back, and somebody independently checking are
 * three different facts. They are stored as separate rows of one append-only
 * coordination log and reported as three separate booleans, never rolled into a
 * single "compliant" flag. A processor's own statement can never be verification.
 */

const time = (value: Date) => value.toISOString();

// --- processors --------------------------------------------------------------

export async function createProcessor(c: Context, input: unknown) {
  const value = S.ProcessorCreate.parse(input);
  const scope = scopeValues(c.actor);
  const purposes = [...new Set(value.authorised_purpose_ids)];
  if (purposes.length !== value.authorised_purpose_ids.length) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'authorised_purpose_ids', code: 'duplicate_purpose' }]);
  for (const purpose of purposes) requireOne((await c.tx.query(`SELECT id FROM app.purpose_versions WHERE ${predicate} AND id=$4`, [...scope, purpose])).rows);
  // A sub-processor that may itself sub-contract is a chain nobody has reviewed.
  if (value.role === 'SUB_PROCESSOR' && value.subprocessors_permitted) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'subprocessors_permitted', code: 'sub_processor_chain_requires_its_own_review' }]);
  const id = randomUUID();
  const document = S.Processor.parse({ ...value, authorised_purpose_ids: purposes, id, recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id });
  await c.tx.query(`INSERT INTO app.processors(tenant_id,legal_entity_id,environment_id,id,role,subprocessors_permitted,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [...scope, id, value.role, value.subprocessors_permitted, c.actor.actor_id, document]);
  for (const purpose of purposes) await c.tx.query('INSERT INTO app.processor_purposes(tenant_id,legal_entity_id,environment_id,processor_id,purpose_id) VALUES($1,$2,$3,$4,$5)', [...scope, id, purpose]);
  await audit(c, 'processor.create', id);
  return document;
}

export async function processorList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document FROM app.processors WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.Processor.parse(row.document)), page);
}

export async function linkProcessorSystem(c: Context, id: string, input: unknown) {
  const value = S.ProcessorLinkCreate.parse(input);
  const scope = scopeValues(c.actor);
  const processor = requireOne((await c.tx.query(`SELECT document FROM app.processors WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  requireOne((await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, value.system_id])).rows);
  const existing = await c.tx.query(`SELECT 1 FROM app.processor_systems WHERE ${predicate} AND processor_id=$4 AND system_id=$5`, [...scope, id, value.system_id]);
  if (existing.rowCount) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  await c.tx.query('INSERT INTO app.processor_systems(tenant_id,legal_entity_id,environment_id,processor_id,system_id,basis) VALUES($1,$2,$3,$4,$5,$6)', [...scope, id, value.system_id, value.basis]);
  await audit(c, 'processor.link_system', id);
  return S.Processor.parse(processor.document);
}

// --- coordination ------------------------------------------------------------

/** FR-M16-02. One fact per row, append-only, each with its own method. */
export async function recordCoordination(c: Context, id: string, input: unknown) {
  const value = S.CoordinationRecord.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.processors WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (value.processor_id !== id) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'processor_id', code: 'processor_does_not_match_path' }]);
  // Acknowledgement and verification are about something that was raised. Without
  // a recorded notification there is nothing for them to be about.
  if (value.fact !== 'NOTIFIED') {
    const notified = await c.tx.query(`SELECT 1 FROM app.processor_coordination WHERE ${predicate} AND processor_id=$4 AND fact='NOTIFIED' AND subject=$5`, [...scope, id, value.subject]);
    if (!notified.rowCount) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'fact', code: 'nothing_was_recorded_as_notified_for_this_subject' }]);
  }
  const recordId = randomUUID();
  const document = S.Coordination.parse({ ...value, id: recordId, recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id });
  await c.tx.query(`INSERT INTO app.processor_coordination(tenant_id,legal_entity_id,environment_id,id,processor_id,fact,method,subject,evidence_reference,note,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [...scope, recordId, id, value.fact, value.method, value.subject, value.evidence_reference, value.note, c.actor.actor_id]);
  await audit(c, 'processor.coordination.' + value.fact.toLowerCase(), id);
  return document;
}

/**
 * FR-M16-01/02. What is actually established, reported as three separate facts
 * plus the authorisation mismatches nobody declared. There is no combined score,
 * because a processor that was told and replied has still never been checked.
 */
export async function processorStanding(c: Context, id: string) {
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.processors WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  const facts = await c.tx.query(`SELECT DISTINCT fact FROM app.processor_coordination WHERE ${predicate} AND processor_id=$4`, [...scope, id]);
  const recorded = new Set(facts.rows.map(row => row.fact as string));
  const open = await c.tx.query(`SELECT count(*)::int AS n FROM app.assessment_findings f
    JOIN app.assessments a ON a.tenant_id=f.tenant_id AND a.legal_entity_id=f.legal_entity_id AND a.environment_id=f.environment_id AND a.id=f.assessment_id
    WHERE f.tenant_id=$1 AND f.legal_entity_id=$2 AND f.environment_id=$3 AND a.processor_id=$4 AND f.state='OPEN'`, [...scope, id]);
  const overdue = await c.tx.query(`SELECT count(*)::int AS n FROM app.assessment_findings f
    JOIN app.assessments a ON a.tenant_id=f.tenant_id AND a.legal_entity_id=f.legal_entity_id AND a.environment_id=f.environment_id AND a.id=f.assessment_id
    WHERE f.tenant_id=$1 AND f.legal_entity_id=$2 AND f.environment_id=$3 AND a.processor_id=$4 AND f.state='OPEN' AND f.due_at<now()`, [...scope, id]);
  // A system linked to this processor that serves a purpose it was never
  // authorised for is a real finding, derived rather than asserted.
  const unauthorised = await c.tx.query(`SELECT DISTINCT ps.system_id FROM app.processor_systems ps
    JOIN app.policy_systems pol ON pol.tenant_id=ps.tenant_id AND pol.legal_entity_id=ps.legal_entity_id AND pol.environment_id=ps.environment_id AND pol.system_id=ps.system_id
    JOIN app.policy_versions v ON v.tenant_id=pol.tenant_id AND v.legal_entity_id=pol.legal_entity_id AND v.environment_id=pol.environment_id AND v.version_id=pol.policy_version_id
    WHERE ps.tenant_id=$1 AND ps.legal_entity_id=$2 AND ps.environment_id=$3 AND ps.processor_id=$4
      AND NOT EXISTS(SELECT 1 FROM app.processor_purposes pp WHERE pp.tenant_id=ps.tenant_id AND pp.legal_entity_id=ps.legal_entity_id
        AND pp.environment_id=ps.environment_id AND pp.processor_id=ps.processor_id AND pp.purpose_id=v.purpose_id)
    ORDER BY ps.system_id`, [...scope, id]);
  return S.ProcessorStanding.parse({
    processor_id: id, as_of: new Date().toISOString(),
    notified: recorded.has('NOTIFIED'), acknowledged: recorded.has('ACKNOWLEDGED'), verified: recorded.has('VERIFIED'),
    open_findings: Number(open.rows[0].n), overdue_remediations: Number(overdue.rows[0].n),
    unauthorised_system_links: unauthorised.rows.map(row => row.system_id).slice(0, 20),
    limits: [
      'Notified, acknowledged and verified are three separate facts and are never combined into a single standing. Only verification is evidence that a control was checked.',
      'A processor statement is an attributable claim about what they did. It is recorded as an acknowledgement, never as verification.',
      'Nothing here is collected from the processor automatically; every fact was recorded locally by a person.',
    ],
  });
}

// --- assessments and findings -------------------------------------------------

export async function createAssessment(c: Context, input: unknown) {
  const value = S.AssessmentCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.processors WHERE ${predicate} AND id=$4`, [...scope, value.processor_id])).rows);
  for (const system of value.scope_system_ids) requireOne((await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, system])).rows);
  const id = randomUUID();
  const document = S.Assessment.parse({ ...value, id, state: 'OPEN', recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id, completed_at: null, conclusion: null });
  await c.tx.query(`INSERT INTO app.assessments(tenant_id,legal_entity_id,environment_id,id,processor_id,kind,state,due_at,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,'OPEN',$7,$8,$9)`, [...scope, id, value.processor_id, value.kind, value.due_at, c.actor.actor_id, document]);
  await audit(c, 'assessment.create', id);
  return document;
}

export async function assessmentList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document,state,completed_at,conclusion FROM app.assessments WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.Assessment.parse({ ...row.document, state: row.state, completed_at: row.completed_at ? time(row.completed_at) : null, conclusion: row.conclusion })), page);
}

/** FR-M16-04: an assessment cannot be completed while its own findings are open. */
export async function completeAssessment(c: Context, id: string, input: unknown) {
  const value = S.AssessmentCompletion.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.assessments WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (row.state !== 'OPEN') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const open = await c.tx.query(`SELECT count(*)::int AS n FROM app.assessment_findings WHERE ${predicate} AND assessment_id=$4 AND state='OPEN'`, [...scope, id]);
  if (Number(open.rows[0].n) > 0) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'state', code: 'findings_remain_open' }]);
  const completed_at = new Date().toISOString();
  const document = S.Assessment.parse({ ...row.document, state: 'COMPLETED', completed_at, conclusion: value.conclusion });
  await c.tx.query(`UPDATE app.assessments SET state='COMPLETED',completed_at=$4,conclusion=$5,document=$6 WHERE ${predicate} AND id=$7`, [...scope, completed_at, value.conclusion, document, id]);
  await audit(c, 'assessment.complete', id);
  return document;
}

export async function createFinding(c: Context, input: unknown) {
  const value = S.FindingCreate.parse(input);
  const scope = scopeValues(c.actor);
  const assessment = requireOne((await c.tx.query(`SELECT state FROM app.assessments WHERE ${predicate} AND id=$4`, [...scope, value.assessment_id])).rows);
  // A completed assessment is a closed statement. A new finding belongs to a new
  // assessment, so the earlier conclusion is not quietly contradicted.
  if (assessment.state !== 'OPEN') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'assessment_id', code: 'assessment_is_not_open' }]);
  for (const system of value.affected_system_ids) requireOne((await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, system])).rows);
  const id = randomUUID();
  const document = S.Finding.parse({ ...value, id, state: 'OPEN', recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id, closed_at: null, closure_evidence: null, retest_reference: null, closure_note: null });
  await c.tx.query(`INSERT INTO app.assessment_findings(tenant_id,legal_entity_id,environment_id,id,assessment_id,severity,state,owner_reference,due_at,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,'OPEN',$7,$8,$9,$10)`, [...scope, id, value.assessment_id, value.severity, value.owner_reference, value.due_at, c.actor.actor_id, document]);
  await audit(c, 'finding.create', id);
  return document;
}

export async function findingList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document,state,closed_at,closure_evidence,retest_reference,closure_note FROM app.assessment_findings WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.Finding.parse({
    ...row.document, state: row.state, closed_at: row.closed_at ? time(row.closed_at) : null,
    closure_evidence: row.closure_evidence, retest_reference: row.retest_reference, closure_note: row.closure_note,
  })), page);
}

/** FR-M16-03: closure needs defined evidence or a retest. Neither is optional. */
export async function closeFinding(c: Context, id: string, input: unknown) {
  const value = S.FindingClosure.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.assessment_findings WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (row.state !== 'OPEN') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const closed_at = new Date().toISOString();
  const document = S.Finding.parse({
    ...row.document, state: value.state, closed_at,
    closure_evidence: value.state === 'REMEDIATED' ? value.closure_evidence : null,
    retest_reference: value.state === 'REMEDIATED' ? value.retest_reference : null,
    closure_note: value.note,
  });
  await c.tx.query(`UPDATE app.assessment_findings SET state=$4,closed_at=$5,closure_evidence=$6,retest_reference=$7,closure_note=$8,document=$9 WHERE ${predicate} AND id=$10`,
    [...scope, value.state, closed_at, document.closure_evidence, document.retest_reference, value.note, document, id]);
  await audit(c, 'finding.' + value.state.toLowerCase(), id);
  return document;
}
