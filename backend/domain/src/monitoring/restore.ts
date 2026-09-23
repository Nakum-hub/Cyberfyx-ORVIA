import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/**
 * M32 Monitoring, FR-M32-03.
 *
 * The failure worth preventing is not a lost backup. It is a restore that
 * quietly reinstates consent somebody has since withdrawn: an archive taken on
 * Monday carries Monday's answers, and a system that resumes from it on Friday
 * is acting on permission that no longer exists. Nobody notices, because
 * everything looks restored.
 *
 * So ORVIA does not make backups. It does not create, encrypt, store or move an
 * archive -- that is the customer's own tooling under the customer's own key,
 * and claiming otherwise would be a claim about infrastructure this product has
 * never seen. What it does is the part only it can do:
 *
 *   - record a verifiable statement of what the state was when the snapshot was
 *     declared, digested over what it actually read; and
 *   - refuse to let a restore resume until every consent decision that changed
 *     between then and now has been looked at by a named person.
 *
 * Nothing bulk is stored to make the second part work. app.consent_events is
 * already an append-only history, so the state as at any moment is a query.
 */

const SNAPSHOT_LIMITS = [
  'This product did not make the archive, does not hold it and cannot read it. What is recorded here is what this installation saw at the moment the snapshot was declared.',
  'The key reference names where the customer keeps their key. Whether the archive is actually encrypted with it is not something this product observed or can observe.',
  'The digest covers the counts and the scope this statement describes. It proves this record has not changed; it proves nothing about the archive itself.',
];
const RESTORE_LIMITS = [
  'A restore stays in quarantine until every consent decision that changed since the snapshot has been decided by a named person. Releasing it is a separate authority from recording it.',
  'Deciding that the current state prevails leaves the withdrawal standing. Nothing here re-grants consent, and there is no field through which releasing a restore could.',
  'This reconciliation compares recorded consent decisions. It does not inspect the restored archive, and it cannot tell you whether anything else in it is stale.',
  'Conflicts are computed when this is read. A decision made after this moment appears the next time it is read.',
];

/** What the snapshot statement counts, per domain the customer says it covers. */
const DOMAIN_COUNTS: Record<S.BackupDomainValue, string> = {
  CONFIGURATION: `SELECT count(*)::int AS n FROM app.policy_versions WHERE ${predicate}`,
  WORKFLOW: `SELECT count(*)::int AS n FROM app.workflows WHERE ${predicate}`,
  EVIDENCE: `SELECT count(*)::int AS n FROM app.audit_events WHERE ${predicate}`,
  DOMAIN_RECORDS: `SELECT count(*)::int AS n FROM app.consent_aggregates WHERE ${predicate}`,
};

export async function declareSnapshot(c: Context, input: unknown) {
  const value = S.BackupSnapshotCreate.parse(input);
  const scope = scopeValues(c.actor);
  const counts: S.BackupSnapshotValue['counts'] = [];
  for (const domain of value.covers) {
    const row = (await c.tx.query(DOMAIN_COUNTS[domain], scope)).rows[0];
    counts.push({ domain, rows: Number(row.n) });
  }
  const id = randomUUID();
  // Digested over what was read, not over what was claimed.
  const stateDigest = digest({ covers: value.covers, counts, key_reference: value.key_reference });
  const row = requireOne((await c.tx.query(
    `INSERT INTO app.backup_snapshots(tenant_id,legal_entity_id,environment_id,id,key_reference,covers,state_digest,counts,note,taken_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [...scope, id, value.key_reference, value.covers, stateDigest, JSON.stringify(counts), value.note, c.actor.actor_id])).rows);
  await audit(c, 'backup_snapshot.declare', id);
  return snapshot(row);
}

const snapshot = (row: Record<string, unknown>) => S.BackupSnapshot.parse({
  id: row.id, taken_at: (row.taken_at as Date).toISOString(), key_reference: row.key_reference,
  covers: row.covers, counts: row.counts, state_digest: row.state_digest,
  note: row.note, taken_by: row.taken_by,
  archive_is_held_by_the_customer: true,
  encryption_was_not_verified_by_this_product: true,
  limits: SNAPSHOT_LIMITS,
});

export async function snapshotList(c: Context, page: Page) {
  const rows = await c.tx.query(
    `SELECT * FROM app.backup_snapshots WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(rows.rows.map(snapshot), page);
}

/**
 * Every consent decision whose current state differs from the state as at the
 * snapshot, with the acknowledgement if one has been made.
 *
 * The "as at" state is the most recent recorded event at or before the snapshot
 * moment. A pair with no event by then was NOT_GIVEN, and a restore cannot
 * reinstate something that was never given, so those are not conflicts.
 */
async function conflictsFor(c: Context, restoreId: string, takenAt: Date) {
  const rows = await c.tx.query(
    `WITH at_snapshot AS (
       SELECT DISTINCT ON (principal_id,purpose_id) principal_id,purpose_id,state
       FROM app.consent_events
       WHERE ${predicate} AND accepted_at <= $4
       ORDER BY principal_id,purpose_id,epoch DESC)
     SELECT s.principal_id,s.purpose_id,s.state AS state_at_snapshot,
            coalesce(a.state,'NOT_GIVEN') AS state_now,
            (SELECT count(*)::int FROM app.consent_events e
              WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3
                AND e.principal_id=s.principal_id AND e.purpose_id=s.purpose_id AND e.accepted_at > $4) AS since,
            k.decision,k.acknowledged_by,k.acknowledged_at
     FROM at_snapshot s
     LEFT JOIN app.consent_aggregates a
       ON a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3
      AND a.principal_id=s.principal_id AND a.purpose_id=s.purpose_id
     LEFT JOIN app.restore_acknowledgements k
       ON k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3
      AND k.restore_id=$5 AND k.principal_id=s.principal_id AND k.purpose_id=s.purpose_id
     WHERE s.state <> coalesce(a.state,'NOT_GIVEN')
     ORDER BY s.principal_id,s.purpose_id`,
    [...scopeValues(c.actor), takenAt, restoreId]);
  return rows.rows.map(row => ({
    principal_id: row.principal_id, purpose_id: row.purpose_id,
    state_at_snapshot: row.state_at_snapshot, state_now: row.state_now,
    decisions_since_snapshot: Number(row.since),
    decision: row.decision ?? null,
    acknowledged_by: row.acknowledged_by ?? null,
    acknowledged_at: row.acknowledged_at ? (row.acknowledged_at as Date).toISOString() : null,
  }));
}

async function reconciliation(c: Context, id: string) {
  const run = requireOne((await c.tx.query(
    `SELECT r.*,s.taken_at FROM app.restore_runs r
      JOIN app.backup_snapshots s ON s.tenant_id=r.tenant_id AND s.legal_entity_id=r.legal_entity_id
       AND s.environment_id=r.environment_id AND s.id=r.snapshot_id
     WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.id=$4`,
    [...scopeValues(c.actor), id])).rows);
  const conflicts = await conflictsFor(c, id, run.taken_at as Date);
  return S.RestoreReconciliation.parse({
    id: run.id, snapshot_id: run.snapshot_id,
    snapshot_taken_at: (run.taken_at as Date).toISOString(),
    reconciled_at: new Date().toISOString(),
    state: run.state, conflicts,
    outstanding: conflicts.filter(x => x.decision === null).length,
    released_at: run.released_at ? (run.released_at as Date).toISOString() : null,
    releasing_never_reinstates_a_withdrawal: true,
    note: run.note, limits: RESTORE_LIMITS,
  });
}

export async function startRestore(c: Context, input: unknown) {
  const value = S.RestoreRunCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.backup_snapshots WHERE ${predicate} AND id=$4`, [...scope, value.snapshot_id])).rows);
  const id = randomUUID();
  await c.tx.query(
    `INSERT INTO app.restore_runs(tenant_id,legal_entity_id,environment_id,id,snapshot_id,note,started_by)
     VALUES($1,$2,$3,$4,$5,$6,$7)`, [...scope, id, value.snapshot_id, value.note, c.actor.actor_id]);
  await audit(c, 'restore.quarantined', id);
  return reconciliation(c, id);
}

export const readRestore = (c: Context, id: string) => reconciliation(c, id);

/**
 * Quarantine only works if the person who may release a restore can find the
 * one waiting for them, and they are deliberately not the person who started
 * it. Each row is a full reconciliation because the outstanding count is the
 * thing that reader came for, and a restore is a rare enough event that
 * computing it per row costs nothing worth saving.
 */
export async function restoreList(c: Context, page: Page) {
  const rows = await c.tx.query(
    `SELECT id FROM app.restore_runs WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  const items = [];
  for (const row of rows.rows) items.push(await reconciliation(c, row.id as string));
  return paged(items, page);
}

/**
 * A person takes responsibility for one changed decision. `CURRENT_STATE_PREVAILS`
 * leaves the withdrawal standing, which is the answer in almost every case;
 * `RESTORED_STATE_PREVAILS` records that somebody decided otherwise and why,
 * which is exactly the decision that should be hard to make quietly.
 */
export async function acknowledgeConflict(c: Context, id: string, input: unknown) {
  const value = S.ConsentConflictAcknowledge.parse(input);
  const scope = scopeValues(c.actor);
  const run = requireOne((await c.tx.query(
    `SELECT r.state,s.taken_at FROM app.restore_runs r
      JOIN app.backup_snapshots s ON s.tenant_id=r.tenant_id AND s.legal_entity_id=r.legal_entity_id
       AND s.environment_id=r.environment_id AND s.id=r.snapshot_id
     WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.id=$4`, [...scope, id])).rows);
  if (run.state === 'RELEASED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'id', code: 'restore_already_released' }]);
  // Only a real conflict can be acknowledged. Acknowledging something that did
  // not change would let a restore be cleared by answering questions nobody asked.
  const conflict = (await conflictsFor(c, id, run.taken_at as Date))
    .find(x => x.principal_id === value.principal_id && x.purpose_id === value.purpose_id);
  if (!conflict) throw new AccessError(404, 'NOT_FOUND', [{ field: 'principal_id', code: 'no_such_conflict_in_this_restore' }]);
  if (conflict.decision !== null) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'principal_id', code: 'conflict_already_decided' }]);
  await c.tx.query(
    `INSERT INTO app.restore_acknowledgements(tenant_id,legal_entity_id,environment_id,id,restore_id,principal_id,purpose_id,state_at_snapshot,state_now,decision,basis,acknowledged_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
    [...scope, randomUUID(), id, value.principal_id, value.purpose_id,
      conflict.state_at_snapshot, conflict.state_now, value.decision, value.basis, c.actor.actor_id]);
  await audit(c, 'restore.conflict_acknowledged', id);
  return reconciliation(c, id);
}

/** Leaving quarantine. Refused while anything is outstanding, and refused twice. */
export async function releaseRestore(c: Context, id: string) {
  const current = await reconciliation(c, id);
  if (current.state === 'RELEASED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'id', code: 'restore_already_released' }]);
  if (current.outstanding > 0) {
    throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'conflicts', code: 'consent_decisions_changed_since_snapshot_are_outstanding' }]);
  }
  await c.tx.query(
    `UPDATE app.restore_runs SET state='RELEASED',released_at=clock_timestamp(),released_by=$5
     WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id, c.actor.actor_id]);
  await audit(c, 'restore.released', id);
  return reconciliation(c, id);
}
