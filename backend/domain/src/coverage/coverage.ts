import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M18 Coverage and Failure Center.
 *
 * Two habits this module refuses. First, a percentage without a denominator:
 * every measure states exactly what it counted and what it excluded. Second,
 * adding up states that overlap: a copy can be both unobserved and without a
 * retention basis, so the attention counts describe overlapping sets and say so.
 *
 * Coverage is computed on read rather than stored, because a cached coverage
 * number is a number that can be true about a past the operator cannot see.
 */

const time = (value: Date) => value.toISOString();
const count = (rows: { n: number }[]) => Number(rows[0]?.n ?? 0);

// --- coverage ----------------------------------------------------------------

export async function coverageReport(c: Context) {
  const scope = scopeValues(c.actor);
  const now = new Date();
  const one = async (sql: string, params: unknown[] = []) => count((await c.tx.query(sql, [...scope, ...params])).rows as { n: number }[]);

  // Tombstoned copies are excluded from every inventory measure: their payload
  // is gone by design, so counting them as uncovered would be misleading.
  const tombstoned = await one(`SELECT count(*)::int AS n FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NOT NULL`);
  const assets = await one(`SELECT count(*)::int AS n FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NULL`);
  const reviewed = await one(`SELECT count(*)::int AS n FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NULL AND review_state='ACCEPTED'`);
  const observed = await one(`SELECT count(*)::int AS n FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NULL AND provenance='OBSERVED' AND fresh_until>now()`);
  const withBasis = await one(`SELECT count(DISTINCT a.id)::int AS n FROM app.data_assets a
    JOIN app.retention_constraints r ON r.tenant_id=a.tenant_id AND r.legal_entity_id=a.legal_entity_id AND r.environment_id=a.environment_id AND r.data_asset_id=a.id
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.tombstoned_at IS NULL`);
  const mappings = await one(`SELECT count(*)::int AS n FROM app.target_mappings WHERE ${predicate}`);
  const currentObservations = await one(`SELECT count(DISTINCT a.resource_id)::int AS n FROM app.observations o
    JOIN app.action_plans a ON a.tenant_id=o.tenant_id AND a.legal_entity_id=o.legal_entity_id AND a.environment_id=o.environment_id AND a.id=o.action_id
    WHERE o.tenant_id=$1 AND o.legal_entity_id=$2 AND o.environment_id=$3
      AND o.observation->>'state'='OBSERVED_SATISFIED' AND (o.observation->>'fresh_until')::timestamptz>now()`);
  const requests = await one(`SELECT count(*)::int AS n FROM app.rights_requests WHERE ${predicate} AND state NOT IN ('REJECTED','RECEIVED','PENDING_VERIFICATION')`);
  const executed = await one(`SELECT count(*)::int AS n FROM app.rights_requests WHERE ${predicate} AND execution='COMPLETE'`);

  const measures = [
    { dimension: 'INVENTORY_REVIEWED' as const, counted: 'Recorded data copies, excluding those already erased.', numerator: reviewed, denominator: assets, excluded: tombstoned,
      exclusion_reasons: tombstoned ? ['Copies carrying a tombstone are excluded; their payload was deliberately erased.'] : [] },
    { dimension: 'INVENTORY_OBSERVED' as const, counted: 'Recorded data copies with a current independent observation.', numerator: observed, denominator: assets, excluded: tombstoned,
      exclusion_reasons: tombstoned ? ['Copies carrying a tombstone are excluded; their payload was deliberately erased.'] : [] },
    { dimension: 'RETENTION_BASIS' as const, counted: 'Recorded data copies with at least one reviewed retention constraint.', numerator: withBasis, denominator: assets, excluded: tombstoned,
      exclusion_reasons: tombstoned ? ['Copies carrying a tombstone are excluded; their payload was deliberately erased.'] : [] },
    { dimension: 'CONTROL_OBSERVATION' as const, counted: 'Declared principal-to-target mappings with a current satisfied observation.', numerator: currentObservations, denominator: mappings, excluded: 0, exclusion_reasons: [] },
    { dimension: 'RIGHTS_EXECUTION' as const, counted: 'Privacy requests past verification, excluding rejected and not-yet-verified ones.', numerator: executed, denominator: requests, excluded: 0, exclusion_reasons: [] },
  ].map(measure => S.CoverageMeasure.parse({ ...measure, as_of: time(now) }));

  // These counts describe overlapping sets. A copy with no basis that has also
  // never been observed appears in both, which is why they are never summed.
  const failed = await one(`SELECT count(*)::int AS n FROM app.rights_requests WHERE ${predicate} AND execution='FAILED'`);
  const manual = await one(`SELECT count(*)::int AS n FROM app.rights_requests WHERE ${predicate} AND execution='MANUAL_REQUIRED'`);
  const unknownEffect = await one(`SELECT count(DISTINCT data_asset_id)::int AS n FROM app.retention_outcomes WHERE ${predicate} AND result='EFFECT_UNKNOWN'`);
  const pending = await one(`SELECT count(*)::int AS n FROM app.rights_requests WHERE ${predicate} AND state IN ('RECEIVED','PENDING_VERIFICATION','SCOPING','AWAITING_APPROVAL')`);
  const unverified = Math.max(0, assets - observed);

  const attention = [
    { state: 'FAILED' as const, count: failed, overlaps_with: ['MANUAL_REQUIRED' as const, 'EFFECT_UNKNOWN' as const] },
    { state: 'MANUAL_REQUIRED' as const, count: manual, overlaps_with: ['FAILED' as const, 'UNVERIFIED' as const] },
    { state: 'EFFECT_UNKNOWN' as const, count: unknownEffect, overlaps_with: ['UNVERIFIED' as const] },
    { state: 'PENDING' as const, count: pending, overlaps_with: [] },
    { state: 'UNVERIFIED' as const, count: unverified, overlaps_with: ['MANUAL_REQUIRED' as const, 'EFFECT_UNKNOWN' as const] },
  ].map(entry => S.AttentionCount.parse(entry));

  return S.CoverageReport.parse({
    scope: c.actor.scope, as_of: time(now), measures, attention,
    limits: [
      'Every denominator counts only what has been recorded locally. A system nobody declared and no connector read is absent from both sides of the ratio, so coverage is not a measure of the estate.',
      'The attention counts describe overlapping sets. A record may appear in several, so they must never be added together into a single total.',
      'Coverage is computed at read time from current rows; it is not a stored figure and does not describe any earlier moment.',
    ],
  });
}

// --- gaps --------------------------------------------------------------------

type Finding = { source: string; subject_kind: string; subject_id: string; severity: string; description: string };

/** Every finding comes from a real row. Nothing here is a guess or a placeholder. */
async function findings(c: Context): Promise<Finding[]> {
  const scope = scopeValues(c.actor);
  const found: Finding[] = [];
  const rows = async (sql: string) => (await c.tx.query(sql, scope)).rows;

  for (const row of await rows(`SELECT a.id FROM app.data_assets a
    WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.tombstoned_at IS NULL
      AND NOT EXISTS(SELECT 1 FROM app.retention_constraints r WHERE r.tenant_id=a.tenant_id AND r.legal_entity_id=a.legal_entity_id
        AND r.environment_id=a.environment_id AND r.data_asset_id=a.id) ORDER BY a.id`)) {
    found.push({ source: 'NO_RETENTION_BASIS', subject_kind: 'DATA_ASSET', subject_id: row.id, severity: 'HIGH',
      description: 'This copy has no reviewed retention basis, so nothing establishes how long it may be kept or when it may be deleted.' });
  }
  for (const row of await rows(`SELECT id FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NULL AND provenance='ASSERTED' ORDER BY id`)) {
    found.push({ source: 'NEVER_OBSERVED', subject_kind: 'DATA_ASSET', subject_id: row.id, severity: 'MEDIUM',
      description: 'This copy is a declaration that no scoped connector read has ever confirmed.' });
  }
  for (const row of await rows(`SELECT id FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NULL AND provenance='OBSERVED' AND fresh_until<=now() ORDER BY id`)) {
    found.push({ source: 'STALE_OBSERVATION', subject_kind: 'DATA_ASSET', subject_id: row.id, severity: 'MEDIUM',
      description: 'The last independent observation of this copy is outside its freshness window and no longer supports a current claim.' });
  }
  for (const row of await rows(`SELECT id FROM app.data_assets WHERE ${predicate} AND tombstoned_at IS NULL AND review_state='UNREVIEWED' ORDER BY id`)) {
    found.push({ source: 'UNREVIEWED_INVENTORY', subject_kind: 'DATA_ASSET', subject_id: row.id, severity: 'LOW',
      description: 'This copy has never been reviewed by an accountable person.' });
  }
  for (const row of await rows(`SELECT id FROM app.rights_requests WHERE ${predicate} AND scope='UNRESOLVED_DESTINATIONS' AND state<>'REJECTED' ORDER BY id`)) {
    found.push({ source: 'UNRESOLVED_DESTINATION', subject_kind: 'RIGHTS_REQUEST', subject_id: row.id, severity: 'HIGH',
      description: 'This request names destinations that no plan can reach, so some data was never acted on.' });
  }
  for (const row of await rows(`SELECT id FROM app.rights_requests WHERE ${predicate} AND execution='FAILED' ORDER BY id`)) {
    found.push({ source: 'FAILED_EXECUTION', subject_kind: 'RIGHTS_REQUEST', subject_id: row.id, severity: 'CRITICAL',
      description: 'Every planned action for this request failed, so no system effect should be assumed.' });
  }
  return found;
}

/**
 * Re-deriving refreshes an existing open gap rather than stacking a duplicate,
 * so a long-standing problem keeps its original detection date and cannot be
 * made to look new. A closed gap is never reopened: a recurrence is a new gap.
 */
export async function deriveGaps(c: Context) {
  const scope = scopeValues(c.actor);
  const now = new Date();
  const detected = await findings(c);
  let opened = 0;
  let refreshed = 0;
  for (const finding of detected) {
    const existing = await c.tx.query(`SELECT id FROM app.coverage_gaps WHERE ${predicate} AND source=$4 AND subject_kind=$5 AND subject_id=$6 AND state IN ('OPEN','IN_PROGRESS')`,
      [...scope, finding.source, finding.subject_kind, finding.subject_id]);
    if (existing.rowCount) {
      await c.tx.query(`UPDATE app.coverage_gaps SET last_seen_at=$4 WHERE ${predicate} AND id=$5`, [...scope, now, existing.rows[0].id]);
      refreshed += 1;
      continue;
    }
    // A closed gap stays closed. Re-detecting the same finding opens a new one
    // with its own detection date, which is what makes a recurrence visible.
    await c.tx.query(`INSERT INTO app.coverage_gaps(tenant_id,legal_entity_id,environment_id,id,source,subject_kind,subject_id,severity,description,detected_at,last_seen_at)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$10)`,
    [...scope, randomUUID(), finding.source, finding.subject_kind, finding.subject_id, finding.severity, finding.description, now]);
    opened += 1;
  }
  await audit(c, 'coverage.derive_gaps');
  return S.GapDerivation.parse({
    derived_at: time(now), opened, refreshed, examined: detected.length,
    limits: [
      'Gaps are derived from locally recorded rows only. A problem in a system nobody declared cannot be found here.',
      'An absent gap is not evidence of correctness; it means no recorded row met a detection rule.',
    ],
  });
}

function gapDocument(row: Record<string, unknown>) {
  return S.Gap.parse({
    id: row.id, source: row.source, subject_kind: row.subject_kind, subject_id: row.subject_id,
    detected_at: time(row.detected_at as Date), last_seen_at: time(row.last_seen_at as Date),
    state: row.state, severity: row.severity, owner_reference: row.owner_reference ?? null,
    due_at: row.due_at ? time(row.due_at as Date) : null,
    evidence_reference: row.evidence_reference ?? null, resolution_note: row.resolution_note ?? null,
    description: row.description,
  });
}

export async function gapList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT * FROM app.coverage_gaps WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(gapDocument), page);
}

/** FR-M18-03: a gap without an owner and a deadline is a note, not an action. */
export async function assignGap(c: Context, id: string, input: unknown) {
  const value = S.GapAssignment.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT state FROM app.coverage_gaps WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (['RESOLVED', 'ACCEPTED_RISK'].includes(row.state)) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const updated = requireOne((await c.tx.query(`UPDATE app.coverage_gaps SET severity=$4,owner_reference=$5,due_at=$6,state='IN_PROGRESS' WHERE ${predicate} AND id=$7 RETURNING *`,
    [...scope, value.severity, value.owner_reference, value.due_at, id])).rows);
  await audit(c, 'coverage.gap_assigned', id);
  return gapDocument(updated);
}

export async function closeGap(c: Context, id: string, input: unknown) {
  const value = S.GapClosure.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT state,owner_reference FROM app.coverage_gaps WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (['RESOLVED', 'ACCEPTED_RISK'].includes(row.state)) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  // Accepting a risk is somebody's decision, so it needs a named owner first.
  if (value.state === 'ACCEPTED_RISK' && !row.owner_reference) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'state', code: 'accepted_risk_requires_an_assigned_owner' }]);
  const updated = requireOne((await c.tx.query(`UPDATE app.coverage_gaps SET state=$4,resolution_note=$5,evidence_reference=$6 WHERE ${predicate} AND id=$7 RETURNING *`,
    [...scope, value.state, value.note, value.evidence_reference, id])).rows);
  await audit(c, 'coverage.gap_' + value.state.toLowerCase(), id);
  return gapDocument(updated);
}

/**
 * FR-M18-04. Advisory guidance keyed on the gap's own source. It suggests where
 * an operator might look. It never certifies a cause, never closes anything and
 * never produces a decision, and the response says so in its own fields.
 */
const RUNBOOK: Record<string, { rule: string; suggestion: string }> = {
  NO_RETENTION_BASIS: { rule: 'RB-RETENTION-001', suggestion: 'Record a reviewed retention constraint for this copy, citing the source it comes from, or confirm the copy should not exist.' },
  NEVER_OBSERVED: { rule: 'RB-OBSERVE-001', suggestion: 'Check whether a connector covers this system and whether its scoped read permission includes this copy.' },
  STALE_OBSERVATION: { rule: 'RB-OBSERVE-002', suggestion: 'Re-run the scoped read for this copy, then confirm whether the freshness window is appropriate for how fast this data changes.' },
  UNREVIEWED_INVENTORY: { rule: 'RB-INVENTORY-001', suggestion: 'Have an accountable person review this copy and accept or reject the record.' },
  UNRESOLVED_DESTINATION: { rule: 'RB-RIGHTS-001', suggestion: 'Identify who owns the unreachable destination and agree a manual procedure, or record that no procedure exists.' },
  FAILED_EXECUTION: { rule: 'RB-RIGHTS-002', suggestion: 'Inspect the recorded outcome for each planned system before retrying; a failure is not evidence that nothing changed.' },
};

export async function gapGuidance(c: Context, id: string) {
  const row = requireOne((await c.tx.query(`SELECT source FROM app.coverage_gaps WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows);
  const match = RUNBOOK[row.source as string];
  return S.Guidance.parse({
    gap_id: id, matched_rule: match?.rule ?? null, suggestion: match?.suggestion ?? null,
    authority: 'ADVISORY_ONLY',
    caveats: [
      'This is a suggestion for a person to consider. It does not establish the cause of this gap.',
      'Following it does not close this gap; closure requires evidence or a recorded, owned acceptance of risk.',
      ...match ? [] : ['No runbook rule matches this gap, so no suggestion is offered. That is not a statement that nothing is wrong.'],
    ],
  });
}
