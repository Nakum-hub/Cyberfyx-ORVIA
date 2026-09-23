import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M17 Privacy Incident Explorer.
 *
 * Occurrence, detection and awareness are three different moments. Different
 * duties run from different ones, so conflating them silently moves a deadline —
 * which is why they are stored and reported separately and why a correction to
 * any of them is an appended, reviewed record that names every deadline it moved.
 *
 * ORVIA ships no notification hours. Every deadline comes from a rule the
 * customer recorded and activated, naming its own source. Severity is recorded
 * configured policy with a stated basis, not an inference about the law.
 */

const HOUR_MS = 3_600_000;
const SEVERITY_ORDER = ['NEGLIGIBLE', 'LOW', 'MEDIUM', 'HIGH', 'SEVERE'];
const time = (value: Date | null) => value?.toISOString() ?? null;

// --- rule packs ---------------------------------------------------------------

export async function createObligationRule(c: Context, input: unknown) {
  const value = S.ObligationRuleCreate.parse(input);
  const scope = scopeValues(c.actor);
  const id = randomUUID();
  const document = S.ObligationRule.parse({ ...value, id, active: true, recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id });
  await c.tx.query(`INSERT INTO app.obligation_rules(tenant_id,legal_entity_id,environment_id,id,runs_from,hours,minimum_severity,applies_when_scope_uncertain,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
  [...scope, id, value.runs_from, value.hours, value.minimum_severity, value.applies_when_scope_uncertain, c.actor.actor_id, document]);
  await audit(c, 'obligation_rule.create', id);
  return document;
}

export async function obligationRuleList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document,active FROM app.obligation_rules WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.ObligationRule.parse({ ...row.document, active: row.active })), page);
}

// --- incidents -----------------------------------------------------------------

type IncidentRow = {
  id: string; state: string; severity: string; occurred_at: Date | null; detected_at: Date;
  became_aware_at: Date | null; principal_scope_certain: boolean; contained_at: Date | null;
  closed_at: Date | null; closure_note: string | null; recorded_at: Date; recorded_by: string;
  document: Record<string, unknown>;
};

function incidentDocument(row: IncidentRow, scope: { systems: string[]; purposes: string[]; processors: string[] }) {
  // Fields are selected explicitly rather than spread: the stored document also
  // carries operational notes the wire shape deliberately does not expose.
  return S.Incident.parse({
    summary: row.document.summary, occurrence_basis: row.document.occurrence_basis,
    severity_basis: row.document.severity_basis, principal_scope: row.document.principal_scope,
    id: row.id, state: row.state, severity: row.severity,
    occurred_at: time(row.occurred_at), detected_at: row.detected_at.toISOString(), became_aware_at: time(row.became_aware_at),
    principal_scope_certain: row.principal_scope_certain,
    affected_system_ids: scope.systems, affected_purpose_ids: scope.purposes, affected_processor_ids: scope.processors,
    recorded_at: row.recorded_at.toISOString(), recorded_by: row.recorded_by,
    contained_at: time(row.contained_at), closed_at: time(row.closed_at), closure_note: row.closure_note,
  });
}

async function incidentScope(c: Context, id: string) {
  const rows = await c.tx.query(`SELECT kind,subject_id FROM app.incident_scope WHERE ${predicate} AND incident_id=$4 ORDER BY kind,subject_id`, [...scopeValues(c.actor), id]);
  return {
    systems: rows.rows.filter(row => row.kind === 'SYSTEM').map(row => row.subject_id as string),
    purposes: rows.rows.filter(row => row.kind === 'PURPOSE').map(row => row.subject_id as string),
    processors: rows.rows.filter(row => row.kind === 'PROCESSOR').map(row => row.subject_id as string),
  };
}

export async function createIncident(c: Context, input: unknown) {
  const value = S.IncidentCreate.parse(input);
  const scope = scopeValues(c.actor);
  for (const [table, ids] of [['systems', value.affected_system_ids], ['purpose_versions', value.affected_purpose_ids], ['processors', value.affected_processor_ids]] as const) {
    for (const subject of ids) requireOne((await c.tx.query(`SELECT id FROM app.${table} WHERE ${predicate} AND id=$4`, [...scope, subject])).rows);
  }
  const id = randomUUID();
  const document = { summary: value.summary, occurrence_basis: value.occurrence_basis, severity_basis: value.severity_basis, principal_scope: value.principal_scope };
  await c.tx.query(`INSERT INTO app.incidents(tenant_id,legal_entity_id,environment_id,id,state,severity,occurred_at,detected_at,became_aware_at,principal_scope_certain,recorded_by,document)
    VALUES($1,$2,$3,$4,'OPEN',$5,$6,$7,$8,$9,$10,$11)`,
  [...scope, id, value.severity, value.occurred_at, value.detected_at, value.became_aware_at, value.principal_scope_certain, c.actor.actor_id, document]);
  for (const [kind, ids] of [['SYSTEM', value.affected_system_ids], ['PURPOSE', value.affected_purpose_ids], ['PROCESSOR', value.affected_processor_ids]] as const) {
    for (const subject of [...new Set(ids)]) await c.tx.query('INSERT INTO app.incident_scope(tenant_id,legal_entity_id,environment_id,incident_id,kind,subject_id) VALUES($1,$2,$3,$4,$5,$6)', [...scope, id, kind, subject]);
  }
  await applyRules(c, id);
  await audit(c, 'incident.create', id);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as IncidentRow;
  return incidentDocument(row, await incidentScope(c, id));
}

export async function incidentList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  const items = [];
  for (const row of result.rows) items.push(incidentDocument(row as IncidentRow, await incidentScope(c, row.id)));
  return paged(items, page);
}

/**
 * Create or recompute one notification obligation per active rule the incident
 * meets. A rule whose clock runs from a moment that is not yet established
 * produces an obligation with no deadline rather than a guessed one.
 */
async function applyRules(c: Context, incidentId: string) {
  const scope = scopeValues(c.actor);
  const incident = requireOne((await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND id=$4`, [...scope, incidentId])).rows) as IncidentRow;
  const rules = await c.tx.query(`SELECT id,runs_from,hours,minimum_severity,applies_when_scope_uncertain FROM app.obligation_rules WHERE ${predicate} AND active ORDER BY id`, [...scope]);
  const moved: string[] = [];
  for (const rule of rules.rows) {
    const meetsSeverity = SEVERITY_ORDER.indexOf(incident.severity) >= SEVERITY_ORDER.indexOf(rule.minimum_severity);
    // A rule that does not apply while scope is uncertain is not simply skipped:
    // it is recorded as not applicable so the decision stays visible.
    const applies = meetsSeverity && (incident.principal_scope_certain || rule.applies_when_scope_uncertain);
    const start = rule.runs_from === 'OCCURRED_AT' ? incident.occurred_at
      : rule.runs_from === 'BECAME_AWARE_AT' ? incident.became_aware_at
        : incident.detected_at;
    const due = applies && start ? new Date(start.getTime() + Number(rule.hours) * HOUR_MS) : null;
    const existing = await c.tx.query(`SELECT id,state,due_at FROM app.notification_obligations WHERE ${predicate} AND incident_id=$4 AND rule_id=$5`, [...scope, incidentId, rule.id]);
    if (!existing.rowCount) {
      await c.tx.query(`INSERT INTO app.notification_obligations(tenant_id,legal_entity_id,environment_id,id,incident_id,rule_id,state,clock_started_at,due_at)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...scope, randomUUID(), incidentId, rule.id, applies ? 'PENDING_REVIEW' : 'NOT_APPLICABLE', applies && start ? start : null, due]);
      continue;
    }
    const row = existing.rows[0];
    // A dispatched notification has already left; its deadline is history.
    if (row.state === 'DISPATCHED') continue;
    const changed = (row.due_at?.getTime() ?? null) !== (due?.getTime() ?? null);
    if (changed) moved.push(row.id as string);
    await c.tx.query(`UPDATE app.notification_obligations SET state=$4,clock_started_at=$5,due_at=$6 WHERE ${predicate} AND id=$7`,
      [...scope, applies ? (row.state === 'NOT_APPLICABLE' ? 'PENDING_REVIEW' : row.state) : 'NOT_APPLICABLE', applies && start ? start : null, due, row.id]);
  }
  return moved;
}

/** FR-M17-01: corrections append and never silently restart a clock. */
export async function correctIncident(c: Context, id: string, input: unknown) {
  const value = S.IncidentCorrection.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows) as IncidentRow;
  if (row.state === 'CLOSED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  let previous: string | null;
  if (value.field === 'OCCURRED_AT' || value.field === 'BECAME_AWARE_AT') {
    const parsed = Date.parse(value.new_value);
    if (!Number.isFinite(parsed)) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'new_value', code: 'not_a_time' }]);
    const column = value.field === 'OCCURRED_AT' ? 'occurred_at' : 'became_aware_at';
    previous = time(value.field === 'OCCURRED_AT' ? row.occurred_at : row.became_aware_at);
    // The orderings still hold after a correction; the database enforces them too.
    if (value.field === 'OCCURRED_AT' && parsed > row.detected_at.getTime()) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'new_value', code: 'occurrence_after_detection' }]);
    if (value.field === 'BECAME_AWARE_AT' && parsed < row.detected_at.getTime()) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'new_value', code: 'awareness_before_detection' }]);
    await c.tx.query(`UPDATE app.incidents SET ${column}=$4 WHERE ${predicate} AND id=$5`, [...scope, new Date(parsed), id]);
  } else if (value.field === 'SEVERITY') {
    if (!SEVERITY_ORDER.includes(value.new_value)) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'new_value', code: 'not_a_severity' }]);
    previous = row.severity;
    await c.tx.query(`UPDATE app.incidents SET severity=$4,document=jsonb_set(document,'{severity_basis}',to_jsonb($5::text)) WHERE ${predicate} AND id=$6`, [...scope, value.new_value, value.reason, id]);
  } else {
    previous = (row.document.principal_scope as string) ?? null;
    await c.tx.query(`UPDATE app.incidents SET document=jsonb_set(document,'{principal_scope}',to_jsonb($4::text)) WHERE ${predicate} AND id=$5`, [...scope, value.new_value, id]);
  }
  // Recompute after the correction and record exactly which deadlines moved, so
  // a clock change is always visible rather than discovered later.
  const moved = await applyRules(c, id);
  await c.tx.query(`INSERT INTO app.incident_corrections(tenant_id,legal_entity_id,environment_id,id,incident_id,field,previous_value,new_value,reason,reviewer_reference,affected_deadlines,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [...scope, randomUUID(), id, value.field, previous, value.new_value, value.reason, value.reviewer_reference, moved, c.actor.actor_id]);
  await audit(c, 'incident.correct', id);
  return incidentAssessment(c, id);
}

export async function containIncident(c: Context, id: string, input: unknown) {
  const value = S.IncidentContainment.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT state,document FROM app.incidents WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (row.state !== 'OPEN') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  await c.tx.query(`UPDATE app.incidents SET state='CONTAINED',contained_at=clock_timestamp(),document=jsonb_set(document,'{containment_note}',to_jsonb($4::text)) WHERE ${predicate} AND id=$5`, [...scope, value.note, id]);
  await audit(c, 'incident.contain', id);
  const updated = requireOne((await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as IncidentRow;
  return incidentDocument(updated, await incidentScope(c, id));
}

/** FR-M17-04: an incident cannot be closed while a notification is still owed. */
export async function closeIncident(c: Context, id: string, input: unknown) {
  const value = S.IncidentClosure.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT state FROM app.incidents WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (row.state === 'CLOSED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const outstanding = await c.tx.query(`SELECT count(*)::int AS n FROM app.notification_obligations WHERE ${predicate} AND incident_id=$4
    AND state IN ('PENDING_REVIEW','DRAFTED','APPROVED')`, [...scope, id]);
  if (Number(outstanding.rows[0].n) > 0) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'state', code: 'notifications_still_owed' }]);
  await c.tx.query(`UPDATE app.incidents SET state='CLOSED',closed_at=clock_timestamp(),closure_note=$4 WHERE ${predicate} AND id=$5`, [...scope, value.note, id]);
  await audit(c, 'incident.close', id);
  const updated = requireOne((await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as IncidentRow;
  return incidentDocument(updated, await incidentScope(c, id));
}

// --- notification obligations ---------------------------------------------------

const NOTIFICATION_TRANSITIONS: Record<string, readonly string[]> = {
  NOT_APPLICABLE: ['PENDING_REVIEW'],
  PENDING_REVIEW: ['DRAFTED', 'NOT_APPLICABLE', 'MANUAL_PACKAGE_REQUIRED'],
  DRAFTED: ['APPROVED', 'PENDING_REVIEW', 'MANUAL_PACKAGE_REQUIRED'],
  APPROVED: ['DISPATCHED', 'DRAFTED', 'MANUAL_PACKAGE_REQUIRED'],
  DISPATCHED: ['DELIVERY_UNCONFIRMED'],
  DELIVERY_UNCONFIRMED: [],
  MANUAL_PACKAGE_REQUIRED: ['DRAFTED'],
};

function obligationDocument(row: Record<string, unknown>, rule: { recipient: string; regime_reference: string; runs_from: string }) {
  const due = row.due_at as Date | null;
  return S.NotificationObligation.parse({
    id: row.id, incident_id: row.incident_id, rule_id: row.rule_id,
    recipient: rule.recipient, regime_reference: rule.regime_reference, runs_from: rule.runs_from,
    state: row.state, clock_started_at: time(row.clock_started_at as Date | null), due_at: time(due),
    overdue: due !== null && due.getTime() < Date.now() && !['DISPATCHED', 'NOT_APPLICABLE'].includes(row.state as string),
    dispatch_evidence: row.dispatch_evidence ?? null, unavailable_reason: row.unavailable_reason ?? null,
  });
}

async function obligationsFor(c: Context, incidentId: string) {
  const rows = await c.tx.query(`SELECT o.*,r.document AS rule FROM app.notification_obligations o
    JOIN app.obligation_rules r ON r.tenant_id=o.tenant_id AND r.legal_entity_id=o.legal_entity_id AND r.environment_id=o.environment_id AND r.id=o.rule_id
    WHERE o.tenant_id=$1 AND o.legal_entity_id=$2 AND o.environment_id=$3 AND o.incident_id=$4 ORDER BY o.id`, [...scopeValues(c.actor), incidentId]);
  return rows.rows.map(row => obligationDocument(row, row.rule as { recipient: string; regime_reference: string; runs_from: string }));
}

export async function incidentAssessment(c: Context, id: string) {
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.incidents WHERE ${predicate} AND id=$4`, [...scope, id])).rows) as IncidentRow;
  const corrections = await c.tx.query(`SELECT * FROM app.incident_corrections WHERE ${predicate} AND incident_id=$4 ORDER BY recorded_at,id`, [...scope, id]);
  return S.IncidentAssessment.parse({
    incident: incidentDocument(row, await incidentScope(c, id)),
    obligations: await obligationsFor(c, id),
    corrections: corrections.rows.map(correction => S.IncidentCorrectionRecord.parse({
      id: correction.id, incident_id: correction.incident_id, field: correction.field,
      previous_value: correction.previous_value, new_value: correction.new_value, reason: correction.reason,
      reviewer_reference: correction.reviewer_reference, recorded_at: correction.recorded_at.toISOString(),
      recorded_by: correction.recorded_by, affected_deadlines: correction.affected_deadlines,
    })),
    assessed_at: new Date().toISOString(),
    limits: [
      'Occurrence, detection and awareness are separate recorded moments. A duty runs from whichever one its rule names, so they are never treated as interchangeable.',
      'Every deadline comes from a rule this organisation recorded and activated, with its own named source. ORVIA ships no notification periods of its own.',
      'Severity is recorded configured policy with a stated basis. It is not a determination of what any law requires.',
      'ORVIA dispatches nothing. A dispatch is recorded by a person and named its evidence; where no supported channel exists, a manual package is required instead.',
    ],
  });
}

export async function transitionNotification(c: Context, id: string, input: unknown) {
  const value = S.NotificationTransition.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT o.*,r.document AS rule FROM app.notification_obligations o
    JOIN app.obligation_rules r ON r.tenant_id=o.tenant_id AND r.legal_entity_id=o.legal_entity_id AND r.environment_id=o.environment_id AND r.id=o.rule_id
    WHERE o.tenant_id=$1 AND o.legal_entity_id=$2 AND o.environment_id=$3 AND o.id=$4 FOR UPDATE OF o`, [...scope, id])).rows);
  const permitted = NOTIFICATION_TRANSITIONS[row.state as string] ?? [];
  if (!permitted.includes(value.to)) throw new AccessError(409, 'EPOCH_CONFLICT');
  // Dispatch is a claim that something left the building, so it names evidence.
  await c.tx.query(`UPDATE app.notification_obligations SET state=$4,dispatch_evidence=COALESCE($5,dispatch_evidence),unavailable_reason=COALESCE($6,unavailable_reason) WHERE ${predicate} AND id=$7`,
    [...scope, value.to, value.dispatch_evidence, value.unavailable_reason, id]);
  await audit(c, 'notification.' + value.to.toLowerCase(), id);
  const updated = requireOne((await c.tx.query(`SELECT * FROM app.notification_obligations WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  return obligationDocument(updated, row.rule as { recipient: string; regime_reference: string; runs_from: string });
}
