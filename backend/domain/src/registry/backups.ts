import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * EX07 backup-copy obligations (master §§50, 52, 91; migration 0076).
 *
 * Most backups cannot be edited to remove one person. The master therefore asks for two things instead of a pretend erasure:
 * a recorded treatment per system (technical restriction, isolation controls, retention schedule, restore procedure and the
 * customer-approved legal treatment), and a minimal, protected ledger of erasures that a restore would undo. The ledger says when
 * a person's data will have aged out of a system's backups under the recorded schedule. That date is not proof of erasure, and
 * nothing here reports a backup as erased. When a system is restored from an older backup, everyone erased there since is marked
 * for re-erasure and stays visible until someone records that it was re-applied.
 */

type TreatmentRow = { id: string; system_id: string; system_name: string | null; technical_restriction: string; isolation_controls: string; retention_days: number;
  restore_procedure_reference: string; legal_treatment: string; status: 'PROPOSED' | 'CURRENT' | 'SUPERSEDED'; recorded_by: string; recorded_at: Date;
  approved_by: string | null; approved_at: Date | null; superseded_at: Date | null };
const TREATMENT = `SELECT t.*, s.document->>'name' AS system_name FROM app.backup_treatments t
  LEFT JOIN app.systems s ON s.tenant_id=t.tenant_id AND s.legal_entity_id=t.legal_entity_id AND s.environment_id=t.environment_id AND s.id=t.system_id
  WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3`;
const treatmentView = (r: TreatmentRow) => R.BackupTreatment.parse({ id: r.id, system_id: r.system_id, system_name: r.system_name ?? 'Unnamed system',
  technical_restriction: r.technical_restriction, isolation_controls: r.isolation_controls, retention_days: r.retention_days, restore_procedure_reference: r.restore_procedure_reference,
  legal_treatment: r.legal_treatment, status: r.status, recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), superseded_at: iso(r.superseded_at) });

export async function backupTreatmentList(c: Context, page: Page) {
  const rows = (await c.tx.query(`${TREATMENT} AND ($4::uuid IS NULL OR t.id>$4) ORDER BY t.id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const p = pageOf(rows, page.limit, r => r.id);
  return { items: p.items.map(treatmentView), next_cursor: p.next_cursor };
}

export async function createBackupTreatment(c: Context, input: unknown) {
  const v = R.BackupTreatmentCreate.parse(input);
  if (!(await c.tx.query(`SELECT 1 FROM app.systems WHERE ${predicate} AND id=$4`, [...scope(c), v.system_id])).rowCount) refuse(404, 'system_id', 'not_found');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.backup_treatments(tenant_id,legal_entity_id,environment_id,id,system_id,technical_restriction,isolation_controls,retention_days,restore_procedure_reference,legal_treatment,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [...scope(c), id, v.system_id, v.technical_restriction, v.isolation_controls, v.retention_days, v.restore_procedure_reference, v.legal_treatment, c.actor.actor_id]);
  await audit(c, 'backup_treatment.recorded', id);
  return treatmentView((await c.tx.query(`${TREATMENT} AND t.id=$4`, [...scope(c), id])).rows[0]);
}

/** A second person approves a proposed treatment; it becomes the system's current one and supersedes the previous. */
export async function approveBackupTreatment(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT * FROM app.backup_treatments WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status !== 'PROPOSED') refuse(409, 'id', 'only_a_proposed_treatment_can_be_approved');
  if (row.recorded_by === c.actor.actor_id) refuse(409, 'approved_by', 'approver_must_differ_from_recorder');
  await c.tx.query(`UPDATE app.backup_treatments SET status='SUPERSEDED', superseded_at=clock_timestamp() WHERE ${predicate} AND system_id=$4 AND status='CURRENT'`, [...scope(c), row.system_id]);
  await c.tx.query(`UPDATE app.backup_treatments SET status='CURRENT', approved_by=$5, approved_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id]);
  await audit(c, 'backup_treatment.approved', id);
  return treatmentView((await c.tx.query(`${TREATMENT} AND t.id=$4`, [...scope(c), id])).rows[0]);
}

/**
 * Called when an erasure or anonymisation is independently verified. If the system has a current backup treatment, one ledger
 * row records when the person's data will have aged out of its backups. Idempotent per action.
 */
export async function recordErasureInBackups(c: Context, action: { id: string; subject_id: string | null; system_id: string | null }) {
  if (!action.subject_id || !action.system_id) return false;
  const t = (await c.tx.query(`SELECT id, retention_days FROM app.backup_treatments WHERE ${predicate} AND system_id=$4 AND status='CURRENT'`, [...scope(c), action.system_id])).rows[0];
  if (!t) return false;
  // No ON CONFLICT: it would apply the ledger's read policy to the new row, and the person running an erasure need not be able to
  // read the ledger. A repeated verification of the same action hits the unique key instead and is already recorded.
  await c.tx.query('SAVEPOINT erasure_ledger');
  try {
    await c.tx.query(`INSERT INTO app.erasure_ledger(tenant_id,legal_entity_id,environment_id,id,subject_id,system_id,action_id,treatment_id,erased_at,backups_clear_after)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,clock_timestamp(),clock_timestamp() + make_interval(days => $9))`,
    [...scope(c), randomUUID(), action.subject_id, action.system_id, action.id, t.id, t.retention_days]);
    await c.tx.query('RELEASE SAVEPOINT erasure_ledger');
    return true;
  } catch (error) {
    await c.tx.query('ROLLBACK TO SAVEPOINT erasure_ledger');
    if ((error as { code?: string }).code === '23505') return false;
    throw error;
  }
}

/**
 * Per system with any verified erasure or any treatment: its treatment state and ledger counts. Counts only, so readers of
 * retention see where backup handling is unknown without seeing who is in the ledger.
 */
export async function backupCoverage(c: Context) {
  const rows = (await c.tx.query(`WITH systems AS (
      SELECT DISTINCT a.system_id FROM app.downstream_actions a WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3
        AND a.action_type IN ('ERASE','ANONYMISE') AND a.verification='VERIFIED' AND a.system_id IS NOT NULL
      UNION SELECT t.system_id FROM app.backup_treatments t WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3)
    SELECT s.system_id, sy.document->>'name' AS system_name,
      CASE WHEN EXISTS(SELECT 1 FROM app.backup_treatments t WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 AND t.system_id=s.system_id AND t.status='CURRENT') THEN 'CURRENT'
           WHEN EXISTS(SELECT 1 FROM app.backup_treatments t WHERE t.tenant_id=$1 AND t.legal_entity_id=$2 AND t.environment_id=$3 AND t.system_id=s.system_id AND t.status='PROPOSED') THEN 'PROPOSED' ELSE 'NONE' END AS treatment,
      (SELECT count(*)::int FROM app.downstream_actions a WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.system_id=s.system_id AND a.action_type IN ('ERASE','ANONYMISE') AND a.verification='VERIFIED') AS verified_erasures,
      k.in_backups, k.reapply_required, k.earliest_clear_after AS earliest
    FROM systems s LEFT JOIN app.systems sy ON sy.tenant_id=$1 AND sy.legal_entity_id=$2 AND sy.environment_id=$3 AND sy.id=s.system_id
      CROSS JOIN LATERAL app.erasure_ledger_counts(s.system_id) k
    ORDER BY sy.document->>'name' NULLS LAST, s.system_id LIMIT 500`, scope(c))).rows;
  // Ledger counts come through app.erasure_ledger_counts: numbers only, so a reader of retention records who may not read the
  // ledger still sees true counts rather than zeros, and never who.
  const systems = rows.map(r => R.BackupCoverageSystem.parse({ system_id: r.system_id, system_name: r.system_name ?? 'Unnamed system', treatment: r.treatment,
    verified_erasures: r.verified_erasures, in_backups: r.in_backups, reapply_required: r.reapply_required, earliest_clear_after: iso(r.earliest) }));
  return R.BackupCoverage.parse({ systems, unknown_backup_handling: systems.filter(s => s.treatment !== 'CURRENT' && s.verified_erasures > 0).length, a_backup_expiry_date_is_not_proof_of_erasure: true });
}

/** A system was restored from a backup taken at a given time: everyone erased there since is marked for re-erasure. */
export async function recordSystemRestore(c: Context, input: unknown) {
  const v = R.SystemRestoreRecord.parse(input);
  if (!(await c.tx.query(`SELECT 1 FROM app.systems WHERE ${predicate} AND id=$4`, [...scope(c), v.system_id])).rowCount) refuse(404, 'system_id', 'not_found');
  if (Date.parse(v.backup_taken_at) > Date.parse(v.restored_at)) refuse(400, 'backup_taken_at', 'backup_must_precede_the_restore');
  if (Date.parse(v.restored_at) > Date.now() + 300_000) refuse(400, 'restored_at', 'must_not_be_in_the_future');
  const id = randomUUID();
  // If the ledger has already purged erasures made after this backup was taken, it cannot name everyone the restore brought back.
  const through = (await c.tx.query(`SELECT max(purged_through) AS t FROM app.erasure_ledger_purges WHERE ${predicate} AND system_id=$4`, [...scope(c), v.system_id])).rows[0].t as Date | null;
  const incomplete = !!through && Date.parse(v.backup_taken_at) < through.getTime();
  await c.tx.query(`INSERT INTO app.system_restores(tenant_id,legal_entity_id,environment_id,id,system_id,backup_taken_at,restored_at,evidence_reference,recorded_by,ledger_purged_through,ledger_coverage)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [...scope(c), id, v.system_id, v.backup_taken_at, v.restored_at, v.evidence_reference, c.actor.actor_id, incomplete ? through : null, incomplete ? 'INCOMPLETE' : 'COMPLETE']);
  const marked = Number((await c.tx.query('SELECT app.mark_reerasure_after_restore($1) AS n', [id])).rows[0].n);
  await audit(c, 'system_restore.recorded', id);
  return restoreView(c, id, marked);
}
async function restoreView(c: Context, id: string, marked: number) {
  const r = (await c.tx.query(`SELECT s.*, v.reviewed_at, v.evidence_reference AS review_evidence FROM app.system_restores s
    LEFT JOIN app.restore_coverage_reviews v ON v.tenant_id=s.tenant_id AND v.legal_entity_id=s.legal_entity_id AND v.environment_id=s.environment_id AND v.restore_id=s.id
    WHERE s.tenant_id=$1 AND s.legal_entity_id=$2 AND s.environment_id=$3 AND s.id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return R.SystemRestore.parse({ id, system_id: r.system_id, backup_taken_at: iso(r.backup_taken_at), restored_at: iso(r.restored_at), evidence_reference: r.evidence_reference,
    recorded_at: iso(r.recorded_at), marked_for_reerasure: marked, ledger_coverage: r.ledger_coverage, ledger_purged_through: iso(r.ledger_purged_through),
    coverage_review: r.reviewed_at ? { evidence_reference: r.review_evidence, reviewed_at: iso(r.reviewed_at) } : null });
}
/** Recorded restores, newest first; filter to INCOMPLETE ledger coverage and to those not yet reviewed. */
export async function systemRestoreList(c: Context, page: Page, query: unknown) {
  const q = R.SystemRestoreQuery.parse(query ?? {});
  const rows = (await c.tx.query(`SELECT s.id FROM app.system_restores s WHERE s.tenant_id=$1 AND s.legal_entity_id=$2 AND s.environment_id=$3
      AND ($4::text IS NULL OR s.ledger_coverage=$4)
      AND (NOT $5 OR NOT EXISTS (SELECT 1 FROM app.restore_coverage_reviews v WHERE v.tenant_id=s.tenant_id AND v.legal_entity_id=s.legal_entity_id AND v.environment_id=s.environment_id AND v.restore_id=s.id))
      AND ($6::uuid IS NULL OR (s.recorded_at, s.id) < (SELECT k.recorded_at, k.id FROM app.system_restores k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$6))
    ORDER BY s.recorded_at DESC, s.id DESC LIMIT $7`, [...scope(c), q.coverage ?? null, q.unreviewed === 'true', page.cursor, page.limit + 1])).rows;
  const p = pageOf(rows, page.limit, r => r.id);
  const items = []; for (const r of p.items) items.push(await restoreView(c, r.id, Number((await c.tx.query('SELECT app.restore_marked_count($1) AS n', [r.id])).rows[0].n)));
  return { items, next_cursor: p.next_cursor };
}
/** A restore older than the ledger was reviewed by hand: record how. Only an INCOMPLETE restore takes one, once (migration 0090). */
export async function reviewRestoreCoverage(c: Context, id: string, input: unknown) {
  const v = R.RestoreCoverageReview.parse(input);
  const r = (await c.tx.query(`SELECT ledger_coverage FROM app.system_restores WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  if (r.ledger_coverage !== 'INCOMPLETE') refuse(409, 'ledger_coverage', 'restore_ledger_coverage_is_complete');
  if ((await c.tx.query(`SELECT 1 FROM app.restore_coverage_reviews WHERE ${predicate} AND restore_id=$4`, [...scope(c), id])).rowCount) refuse(409, 'coverage_review', 'already_reviewed');
  await c.tx.query(`INSERT INTO app.restore_coverage_reviews(tenant_id,legal_entity_id,environment_id,restore_id,evidence_reference,reviewed_by) VALUES($1,$2,$3,$4,$5,$6)`,
    [...scope(c), id, v.evidence_reference, c.actor.actor_id]);
  await audit(c, 'system_restore.coverage_reviewed', id);
  return restoreView(c, id, Number((await c.tx.query('SELECT app.restore_marked_count($1) AS n', [id])).rows[0].n));
}

const ledgerView = (r: Record<string, unknown>) => R.ErasureLedgerEntry.parse({ id: r.id, subject_id: r.subject_id, system_id: r.system_id, erased_at: iso(r.erased_at as Date),
  backups_clear_after: iso(r.backups_clear_after as Date), state: r.state, restore_id: r.restore_id ?? null, reapplied_at: iso(r.reapplied_at as Date | null), reapplied_evidence: r.reapplied_evidence ?? null });

export async function erasureLedger(c: Context, page: Page, query: unknown) {
  const q = R.ErasureLedgerQuery.parse(query ?? {});
  const rows = (await c.tx.query(`SELECT * FROM app.erasure_ledger WHERE ${predicate} AND ($4::uuid IS NULL OR system_id=$4) AND ($5::text IS NULL OR state=$5)
    AND ($6::uuid IS NULL OR id>$6) ORDER BY id LIMIT $7`, [...scope(c), q.system_id ?? null, q.state ?? null, page.cursor, page.limit + 1])).rows;
  const p = pageOf(rows, page.limit, r => r.id);
  return { items: p.items.map(ledgerView), next_cursor: p.next_cursor };
}

/** Records that a re-erasure after a restore was re-applied. A person's statement with its evidence: not an independent read-back. */
export async function confirmReerasure(c: Context, id: string, input: unknown) {
  const v = R.ReerasureConfirm.parse(input);
  const row = (await c.tx.query(`SELECT state FROM app.erasure_ledger WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.state !== 'REAPPLY_REQUIRED') refuse(409, 'id', 'no_reerasure_is_required');
  await c.tx.query(`UPDATE app.erasure_ledger SET state='REAPPLIED', reapplied_by=$5, reapplied_at=clock_timestamp(), reapplied_evidence=$6 WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id, v.evidence_reference]);
  await audit(c, 'erasure_ledger.reerasure_confirmed', id);
  return ledgerView((await c.tx.query(`SELECT * FROM app.erasure_ledger WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0]);
}

/** Runner: rows past their clear date age out; aged-out rows 30 days past it are purged (the ledger's own retention). */
export async function backupLedgerSweep(c: Context) {
  const aged = (await c.tx.query(`UPDATE app.erasure_ledger SET state='BACKUPS_AGED_OUT' WHERE ${predicate} AND state='IN_BACKUPS' AND backups_clear_after <= clock_timestamp()`, scope(c))).rowCount ?? 0;
  // Each purge records, per system, the latest erasure it removed (migration 0090), so a later restore from an older backup is
  // known to predate what the ledger can still name.
  const purged = Number((await c.tx.query(`WITH gone AS (
      DELETE FROM app.erasure_ledger WHERE ${predicate} AND state='BACKUPS_AGED_OUT' AND backups_clear_after < clock_timestamp() - interval '30 days' RETURNING system_id, erased_at),
    marks AS (INSERT INTO app.erasure_ledger_purges(tenant_id,legal_entity_id,environment_id,id,system_id,purged_through,purged_rows)
      SELECT $1,$2,$3,gen_random_uuid(),system_id,max(erased_at),count(*)::int FROM gone GROUP BY system_id RETURNING purged_rows)
    SELECT coalesce(sum(purged_rows),0)::int AS n FROM marks`, scope(c))).rows[0].n);
  return { aged, purged };
}
