import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M15 Retention Management.
 *
 * Three rules shape everything here, and each exists because the opposite is a
 * common and expensive mistake:
 *
 *  - No recorded basis is not permission to delete. An unknown obligation is a
 *    blocker, not a default of "go ahead".
 *  - Constraints that disagree are a conflict for a reviewer, not an arithmetic
 *    problem to be solved by taking the longest duration.
 *  - A backup cannot be read back, so it is never reported as erased.
 */

const DAY_MS = 86_400_000;
const time = (value: Date) => value.toISOString();

// --- constraints -------------------------------------------------------------

export async function createConstraint(c: Context, input: unknown) {
  const value = S.RetentionConstraintCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, value.data_asset_id])).rows);
  requireOne((await c.tx.query(`SELECT id FROM app.purpose_versions WHERE ${predicate} AND id=$4`, [...scope, value.purpose_id])).rows);
  const id = randomUUID();
  const document = S.RetentionConstraint.parse({ ...value, id, recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id });
  await c.tx.query(`INSERT INTO app.retention_constraints(tenant_id,legal_entity_id,environment_id,id,data_asset_id,purpose_id,trigger,basis,minimum_days,maximum_days,recorded_by,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
  [...scope, id, value.data_asset_id, value.purpose_id, value.trigger, value.basis, value.minimum_days, value.maximum_days, c.actor.actor_id, document]);
  await audit(c, 'retention_constraint.create', id);
  return document;
}

export async function constraintList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document FROM app.retention_constraints WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.RetentionConstraint.parse(row.document)), page);
}

// --- legal holds -------------------------------------------------------------

export async function createHold(c: Context, input: unknown) {
  const value = S.LegalHoldCreate.parse(input);
  const scope = scopeValues(c.actor);
  const assets = [...new Set(value.data_asset_ids)];
  if (assets.length !== value.data_asset_ids.length) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'data_asset_ids', code: 'duplicate_asset' }]);
  // Every copy the hold claims to cover must exist in this scope, so a hold can
  // never be recorded over a set nobody can enumerate.
  for (const asset of assets) requireOne((await c.tx.query(`SELECT id FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, asset])).rows);
  const id = randomUUID();
  const document = S.LegalHold.parse({ ...value, data_asset_ids: assets, id, state: 'ACTIVE', recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id, released_at: null, release_reason: null });
  await c.tx.query(`INSERT INTO app.legal_holds(tenant_id,legal_entity_id,environment_id,id,state,issued_at,review_at,recorded_by,document)
    VALUES($1,$2,$3,$4,'ACTIVE',$5,$6,$7,$8)`, [...scope, id, value.issued_at, value.review_at, c.actor.actor_id, document]);
  for (const asset of assets) await c.tx.query('INSERT INTO app.legal_hold_assets(tenant_id,legal_entity_id,environment_id,hold_id,data_asset_id) VALUES($1,$2,$3,$4,$5)', [...scope, id, asset]);
  await audit(c, 'legal_hold.create', id);
  return document;
}

export async function holdList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document,state,released_at,release_reason FROM app.legal_holds WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.LegalHold.parse({ ...row.document, state: row.state, released_at: row.released_at ? time(row.released_at) : null, release_reason: row.release_reason })), page);
}

/** A released hold stays released. Re-imposing one needs a new hold with its own
 *  authority reference, so each period of restraint is separately justified. */
export async function releaseHold(c: Context, id: string, input: unknown) {
  const value = S.HoldRelease.parse(input);
  const scope = scopeValues(c.actor);
  const row = requireOne((await c.tx.query(`SELECT * FROM app.legal_holds WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (row.state !== 'ACTIVE') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const released_at = new Date().toISOString();
  const document = S.LegalHold.parse({ ...row.document, state: 'RELEASED', released_at, release_reason: value.reason });
  await c.tx.query(`UPDATE app.legal_holds SET state='RELEASED',released_at=$4,release_reason=$5,document=$6 WHERE ${predicate} AND id=$7`, [...scope, released_at, value.reason, document, id]);
  await audit(c, 'legal_hold.release', id);
  return document;
}

// --- eligibility -------------------------------------------------------------

type ConstraintRow = { id: string; trigger: string; basis: string; minimum_days: number | null; maximum_days: number | null };

/** The date a trigger actually occurred for this copy. Only the triggers ORVIA can
 *  evidence locally are computed; the rest are honestly unknown. */
async function triggerDate(c: Context, assetId: string, trigger: string): Promise<Date | null> {
  const scope = scopeValues(c.actor);
  if (trigger === 'RECORD_CREATED') {
    const row = requireOne((await c.tx.query(`SELECT valid_from FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, assetId])).rows);
    return row.valid_from as Date;
  }
  if (trigger === 'LAST_INTERACTION') {
    const row = (await c.tx.query(`SELECT last_seen_at FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, assetId])).rows[0];
    return (row?.last_seen_at as Date | null) ?? null;
  }
  // CONSENT_WITHDRAWN, CONTRACT_ENDED and LEGAL_EVENT depend on facts this
  // release does not link to a copy. An unknown trigger date never elapses.
  return null;
}

export async function evaluateEligibility(c: Context, assetId: string) {
  const scope = scopeValues(c.actor);
  const asset = requireOne((await c.tx.query(`SELECT kind,tombstoned_at FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, assetId])).rows);
  const constraints = (await c.tx.query(`SELECT id,trigger,basis,minimum_days,maximum_days FROM app.retention_constraints WHERE ${predicate} AND data_asset_id=$4 ORDER BY id`, [...scope, assetId])).rows as ConstraintRow[];
  const holds = await c.tx.query(`SELECT h.id FROM app.legal_holds h JOIN app.legal_hold_assets a
    ON a.tenant_id=h.tenant_id AND a.legal_entity_id=h.legal_entity_id AND a.environment_id=h.environment_id AND a.hold_id=h.id
    WHERE h.tenant_id=$1 AND h.legal_entity_id=$2 AND h.environment_id=$3 AND a.data_asset_id=$4 AND h.state='ACTIVE' ORDER BY h.id`, [...scope, assetId]);
  const decision = (await c.tx.query(`SELECT governing_constraint_id FROM app.retention_decisions WHERE ${predicate} AND data_asset_id=$4 AND NOT superseded`, [...scope, assetId])).rows[0];
  const quarantined = (await c.tx.query(`SELECT 1 FROM app.retention_outcomes WHERE ${predicate} AND data_asset_id=$4 AND result='RESTORED_TO_QUARANTINE'
    AND recorded_at>COALESCE((SELECT max(recorded_at) FROM app.retention_outcomes WHERE ${predicate} AND data_asset_id=$4 AND result<>'RESTORED_TO_QUARANTINE'),'-infinity'::timestamptz) LIMIT 1`, [...scope, assetId]));

  const blockers: string[] = [];
  const reasons: string[] = [];
  const now = Date.now();

  if (asset.tombstoned_at) { blockers.push('ALREADY_TOMBSTONED'); reasons.push('This copy has already been erased and carries a tombstone.'); }
  if (holds.rowCount) { blockers.push('ACTIVE_LEGAL_HOLD'); reasons.push(`${holds.rowCount} active legal hold${holds.rowCount === 1 ? '' : 's'} cover this copy. A hold outranks any retention schedule.`); }
  // The rule that matters most: silence is not consent to delete.
  if (constraints.length === 0) { blockers.push('NO_RECORDED_BASIS'); reasons.push('No reviewed retention basis is recorded for this copy, so deletion is not permitted. Absence of a rule is not permission.'); }
  if (quarantined.rowCount) { blockers.push('AWAITING_QUARANTINE_RECONCILIATION'); reasons.push('This copy was restored into quarantine and its current restrictions have not been reconciled.'); }

  // Constraints disagree when one would already permit deletion and another
  // still requires retention. That is a decision for a reviewer, not a maximum().
  const windows = new Map<string, { earliest: Date | null; expired: boolean; elapsed: boolean }>();
  for (const constraint of constraints) {
    const start = await triggerDate(c, assetId, constraint.trigger);
    const earliest = start && constraint.minimum_days !== null ? new Date(start.getTime() + constraint.minimum_days * DAY_MS) : null;
    const elapsed = earliest !== null && earliest.getTime() <= now;
    const expired = start !== null && constraint.maximum_days !== null && start.getTime() + constraint.maximum_days * DAY_MS <= now;
    windows.set(constraint.id, { earliest, expired, elapsed: constraint.minimum_days === null ? start !== null : elapsed });
  }
  const permits = constraints.filter(constraint => windows.get(constraint.id)!.expired);
  const retains = constraints.filter(constraint => !windows.get(constraint.id)!.elapsed);
  let governing: string | null = decision?.governing_constraint_id ?? null;
  if (permits.length && retains.length && !governing) {
    blockers.push('UNRESOLVED_CONSTRAINT_CONFLICT');
    reasons.push('Recorded constraints disagree: one permits deletion while another still requires retention. A reviewer must decide which governs; the longest duration is not applied automatically.');
  }
  if (constraints.length && !permits.length && !blockers.includes('UNRESOLVED_CONSTRAINT_CONFLICT')) {
    const unknown = constraints.some(constraint => windows.get(constraint.id)!.earliest === null && constraint.minimum_days !== null);
    blockers.push(retains.length ? 'MINIMUM_NOT_ELAPSED' : 'MAXIMUM_NOT_REACHED');
    reasons.push(unknown
      ? 'A recorded constraint depends on a trigger date this release cannot establish for this copy, so its period has not been shown to have elapsed.'
      : 'The recorded retention period has not yet elapsed for this copy.');
  }
  if (governing) {
    // A reviewed decision only settles a conflict; it never overrides a hold or
    // creates permission where no constraint permits deletion.
    const chosen = constraints.find(constraint => constraint.id === governing);
    if (!chosen) governing = null;
    else if (!windows.get(chosen.id)!.expired) {
      if (!blockers.includes('MINIMUM_NOT_ELAPSED') && !blockers.includes('MAXIMUM_NOT_REACHED')) {
        blockers.push('MAXIMUM_NOT_REACHED');
        reasons.push('The reviewed governing constraint has not yet reached its maximum retention period.');
      }
      governing = null;
    }
  }
  if (!blockers.length && !governing) governing = permits[0]?.id ?? null;
  if (!blockers.length && !governing) { blockers.push('NO_RECORDED_BASIS'); reasons.push('No constraint permits deletion of this copy.'); }
  if (!blockers.length) reasons.push('A reviewed constraint permits deletion of this copy and nothing currently blocks it.');

  const earliest = [...windows.values()].map(window => window.earliest).filter((value): value is Date => value !== null).sort((a, b) => a.getTime() - b.getTime())[0] ?? null;
  return S.Eligibility.parse({
    data_asset_id: assetId, evaluated_at: new Date().toISOString(), eligible: blockers.length === 0,
    blockers: [...new Set(blockers)].slice(0, 8),
    applicable_constraint_ids: constraints.map(constraint => constraint.id).slice(0, 20),
    active_hold_ids: holds.rows.map(row => row.id).slice(0, 20),
    governing_constraint_id: blockers.length ? null : governing,
    earliest_deletion_at: earliest ? time(earliest) : null,
    reasons: reasons.slice(0, 16),
    limits: [
      'Eligibility is computed from locally recorded constraints and holds only. An obligation nobody recorded cannot be seen here.',
      'Backup copies are never reported as erased, because a backup cannot be independently read back.',
    ],
  });
}

/** Record which constraint governs when recorded constraints disagree. */
export async function recordRetentionDecision(c: Context, assetId: string, input: unknown) {
  const value = S.RetentionDecisionRecord.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, assetId])).rows);
  const constraint = requireOne((await c.tx.query(`SELECT data_asset_id FROM app.retention_constraints WHERE ${predicate} AND id=$4`, [...scope, value.governing_constraint_id])).rows);
  // A decision can only choose between constraints that actually apply here.
  if (constraint.data_asset_id !== assetId) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'governing_constraint_id', code: 'constraint_applies_to_another_copy' }]);
  await c.tx.query(`UPDATE app.retention_decisions SET superseded=true WHERE ${predicate} AND data_asset_id=$4 AND NOT superseded`, [...scope, assetId]);
  await c.tx.query(`INSERT INTO app.retention_decisions(tenant_id,legal_entity_id,environment_id,id,data_asset_id,governing_constraint_id,reason,decided_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8)`, [...scope, randomUUID(), assetId, value.governing_constraint_id, value.reason, c.actor.actor_id]);
  await audit(c, 'retention_decision.record', assetId);
  return evaluateEligibility(c, assetId);
}

// --- outcomes ----------------------------------------------------------------

/** Record what actually happened to one copy. Eligibility is re-checked here, so
 *  a plan approved yesterday cannot act on a copy a hold covers today. */
export async function recordRetentionOutcome(c: Context, assetId: string, input: unknown) {
  const value = S.RetentionOutcomeRecord.parse(input);
  const scope = scopeValues(c.actor);
  const asset = requireOne((await c.tx.query(`SELECT kind FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, assetId])).rows);
  const destructive = ['SUPPRESSED', 'DELETED'].includes(value.result);
  // A backup cannot be read back, so its erasure can never be observed. Refusing
  // this explicitly gives the operator a named reason rather than a bare failure.
  if (asset.kind === 'BACKUP_COPY' && destructive) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'result', code: 'backup_erasure_is_not_independently_verifiable' }]);
  if (destructive) {
    const eligibility = await evaluateEligibility(c, assetId);
    if (!eligibility.eligible) throw new AccessError(409, 'EPOCH_CONFLICT', eligibility.blockers.map(blocker => ({ field: 'result', code: blocker.toLowerCase() })));
  }
  const id = randomUUID();
  const document = S.RetentionOutcome.parse({
    data_asset_id: assetId, copy_class: asset.kind, ...value,
    recorded_at: new Date().toISOString(), recorded_by: c.actor.actor_id,
  });
  await c.tx.query(`INSERT INTO app.retention_outcomes(tenant_id,legal_entity_id,environment_id,id,data_asset_id,copy_class,result,method,evidence_reference,note,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
  [...scope, id, assetId, asset.kind, value.result, value.method, value.evidence_reference, value.note, c.actor.actor_id]);
  await audit(c, 'retention_outcome.' + value.result.toLowerCase(), assetId);
  return document;
}

export async function retentionOutcomeList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT id,data_asset_id,copy_class,result,method,evidence_reference,note,recorded_at,recorded_by
    FROM app.retention_outcomes WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  // Paging is by the outcome's own row id, which the wire shape does not carry:
  // an outcome is identified by the copy it describes and when it was recorded.
  const rows = result.rows.slice(0, page.limit);
  return {
    items: rows.map(row => S.RetentionOutcome.parse({
      data_asset_id: row.data_asset_id, copy_class: row.copy_class, result: row.result, method: row.method,
      evidence_reference: row.evidence_reference, note: row.note, recorded_at: time(row.recorded_at), recorded_by: row.recorded_by,
    })),
    next_cursor: result.rows.length > page.limit ? Buffer.from(rows.at(-1)!.id as string).toString('base64url') : null,
  };
}
