import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';
import { createDataAsset } from '../graph/graph.ts';

/**
 * M29 Customer Onboarding, FR-M29-04.
 *
 * One typed import path, built fully. OPEN-11's interim rule is explicit:
 * implement one approved typed path before writing another parser, and no
 * arbitrary upload-to-table tool. So there is one import kind, the rows are a
 * declared shape rather than a file, and the contract schema *is* the parser --
 * there is no separate parsing step that could accept something the schema
 * would not.
 *
 * The clause that shapes everything else is the last one in the requirement: a
 * source snapshot is never live control evidence. An inventory a customer
 * exports from their CRM records what that system's operator believed at the
 * moment of export. It is not something ORVIA observed, and it is emphatically
 * not evidence that any restriction is in force. So every asset created from an
 * import is written with provenance ASSERTED and review_state UNREVIEWED, and
 * the graph schema already refuses to let an ASSERTED record carry an
 * observation time or a freshness window at all. The import cannot manufacture
 * an observation even by trying.
 *
 * Quarantine is the only entry state. Rows land, are previewed against the
 * inventory as it stands now, and every conflict is decided by a named person
 * before anything is applied. Purge really deletes the rows, because
 * quarantined input that was never accepted is exactly what a customer should
 * be able to take back -- and the batch survives saying it was purged and why,
 * so a purged import never becomes indistinguishable from one that never
 * arrived.
 */

const LIMITS = [
  'Everything applied from an import is a customer statement, recorded as asserted and unreviewed. It is not something this product observed, and it is not evidence that any control is in force anywhere.',
  'Conflicts are computed against the inventory as it stands when this is read. An asset added after a preview appears the next time the preview is taken, and the conflicts are recomputed again at apply.',
  'Purging deletes the quarantined rows and keeps the record that they were submitted. A purge is visible; it is not the same as nothing having arrived.',
  'This path accepts one declared row shape and nothing else. There is no general upload, and a second import format is a contract change rather than a configuration one.',
];

type BatchRow = {
  id: string; kind: string; source_reference: string; captured_at: Date; row_count: number;
  content_digest: string; state: string; submitted_at: Date; submitted_by: string;
  settled_at: Date | null; settled_by: string | null; purge_reason: string | null;
};

/**
 * What this row would do to the inventory as it stands. A name already used
 * within the same system is the collision that matters: importing it again
 * would silently create a second record of one stored thing, and the operator
 * would never know which one their retention decisions applied to.
 */
async function classify(c: Context, row: S.ImportedAssetRowValue) {
  const existing = (await c.tx.query(
    `SELECT id,document FROM app.data_assets
      WHERE ${predicate} AND system_id=$4 AND document->>'name'=$5 AND tombstoned_at IS NULL LIMIT 1`,
    [...scopeValues(c.actor), row.system_id, row.name])).rows[0];
  if (!existing) return { conflict: 'NEW' as const, existing_asset_id: null };
  const document = existing.document as { kind: string; description: string };
  // Same name, same kind, same description is the same statement made twice --
  // worth flagging, but not a disagreement. A different kind or description is
  // the source and the inventory saying different things about one thing.
  const identical = document.kind === row.kind && document.description === row.description;
  return {
    conflict: identical ? ('MATCHES_EXISTING' as const) : ('CONFLICTS_WITH_EXISTING' as const),
    existing_asset_id: existing.id as string,
  };
}

async function readBatch(c: Context, id: string) {
  const batch = requireOne((await c.tx.query(
    `SELECT * FROM app.import_batches WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows) as BatchRow;
  const rows = await c.tx.query(
    `SELECT * FROM app.import_rows WHERE ${predicate} AND batch_id=$4 ORDER BY line_number`,
    [...scopeValues(c.actor), id]);
  return present(batch, rows.rows);
}

function present(batch: BatchRow, rows: Record<string, unknown>[]) {
  const previews = rows.map(row => ({
    line_number: Number(row.line_number),
    row: row.parsed,
    conflict: row.conflict,
    existing_asset_id: row.existing_asset_id ?? null,
    decision: row.decision ?? null,
    decided_by: row.decided_by ?? null,
    decided_at: row.decided_at ? (row.decided_at as Date).toISOString() : null,
    created_asset_id: row.created_asset_id ?? null,
  }));
  return S.ImportBatch.parse({
    id: batch.id, kind: batch.kind, source_reference: batch.source_reference,
    captured_at: batch.captured_at.toISOString(), row_count: Number(batch.row_count),
    content_digest: batch.content_digest, state: batch.state,
    submitted_at: batch.submitted_at.toISOString(), submitted_by: batch.submitted_by,
    settled_at: batch.settled_at ? batch.settled_at.toISOString() : null,
    settled_by: batch.settled_by, purge_reason: batch.purge_reason,
    rows: previews,
    undecided_conflicts: previews.filter(r => r.conflict !== 'NEW' && r.decision === null).length,
    imported_rows_are_asserted_never_observed: true,
    a_source_snapshot_is_not_evidence_that_any_control_is_in_force: true,
    purging_removes_the_rows_and_keeps_this_record: true,
    limits: LIMITS,
  });
}

export async function submitImport(c: Context, input: unknown) {
  const value = S.ImportSubmit.parse(input);
  const scope = scopeValues(c.actor);
  // Every system named must already exist here. An import that could name a
  // system this installation has never configured would be creating inventory
  // about somewhere nobody has declared.
  for (const system of new Set(value.rows.map(row => row.system_id))) {
    const known = (await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, system])).rows[0];
    if (!known) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'rows', code: 'unknown_system_in_import' }]);
  }
  const id = randomUUID();
  await c.tx.query(
    `INSERT INTO app.import_batches(tenant_id,legal_entity_id,environment_id,id,kind,source_reference,captured_at,row_count,content_digest,submitted_by)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [...scope, id, value.kind, value.source_reference, value.captured_at, value.rows.length, digest(value.rows), c.actor.actor_id]);
  for (const row of value.rows) {
    const { conflict, existing_asset_id } = await classify(c, row);
    await c.tx.query(
      `INSERT INTO app.import_rows(tenant_id,legal_entity_id,environment_id,id,batch_id,line_number,parsed,conflict,existing_asset_id)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [...scope, randomUUID(), id, row.line_number, JSON.stringify(row), conflict, existing_asset_id]);
  }
  await audit(c, 'import.quarantined', id);
  return readBatch(c, id);
}

export async function importList(c: Context, page: Page) {
  const batches = await c.tx.query(
    `SELECT * FROM app.import_batches WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`,
    [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  const items = [];
  for (const batch of batches.rows) {
    const rows = await c.tx.query(
      `SELECT * FROM app.import_rows WHERE ${predicate} AND batch_id=$4 ORDER BY line_number`,
      [...scopeValues(c.actor), batch.id]);
    items.push(present(batch as BatchRow, rows.rows));
  }
  return paged(items, page);
}

export const readImport = (c: Context, id: string) => readBatch(c, id);

/** A named person takes responsibility for one conflicting row. */
export async function decideImportRow(c: Context, id: string, input: unknown) {
  const value = S.ImportRowDecide.parse(input);
  const scope = scopeValues(c.actor);
  const batch = requireOne((await c.tx.query(
    `SELECT state FROM app.import_batches WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (batch.state !== 'QUARANTINED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'id', code: 'import_already_settled' }]);
  const row = (await c.tx.query(
    `SELECT id,conflict,decision FROM app.import_rows WHERE ${predicate} AND batch_id=$4 AND line_number=$5`,
    [...scope, id, value.line_number])).rows[0];
  if (!row) throw new AccessError(404, 'NOT_FOUND', [{ field: 'line_number', code: 'no_such_row_in_this_import' }]);
  // Only a conflict needs deciding. Letting a clean row be "decided" would make
  // the undecided count meaningless as a measure of what is still in the way.
  if (row.conflict === 'NEW') throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'line_number', code: 'row_is_not_in_conflict' }]);
  if (row.decision !== null) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'line_number', code: 'row_already_decided' }]);
  await c.tx.query(
    `UPDATE app.import_rows SET decision=$5,decided_at=clock_timestamp(),decided_by=$6 WHERE ${predicate} AND id=$4`,
    [...scope, row.id, value.decision, c.actor.actor_id]);
  await audit(c, 'import.row_decided', id);
  return readBatch(c, id);
}

/**
 * Quarantine to inventory. Conflicts are recomputed here rather than trusted
 * from the preview: the inventory can change between previewing and applying,
 * and applying against a stale picture is how a duplicate gets created by
 * somebody who thought they had checked.
 */
export async function applyImport(c: Context, id: string) {
  const scope = scopeValues(c.actor);
  const batch = requireOne((await c.tx.query(
    `SELECT state FROM app.import_batches WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (batch.state !== 'QUARANTINED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'id', code: 'import_already_settled' }]);
  const rows = (await c.tx.query(
    `SELECT id,line_number,parsed,decision FROM app.import_rows WHERE ${predicate} AND batch_id=$4 ORDER BY line_number`,
    [...scope, id])).rows;

  for (const row of rows) {
    const { conflict, existing_asset_id } = await classify(c, row.parsed as S.ImportedAssetRowValue);
    if (conflict !== row.conflict || existing_asset_id !== (row.existing_asset_id ?? null)) {
      await c.tx.query(`UPDATE app.import_rows SET conflict=$5,existing_asset_id=$6 WHERE ${predicate} AND id=$4`,
        [...scope, row.id, conflict, existing_asset_id]);
      row.conflict = conflict;
    }
    if (conflict !== 'NEW' && row.decision === null) {
      throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'rows', code: 'conflicting_rows_are_undecided' }]);
    }
  }

  for (const row of rows) {
    if (row.decision === 'SKIP_ROW') continue;
    const parsed = row.parsed as S.ImportedAssetRowValue;
    // Through the ordinary creation path, so an imported asset is subject to
    // exactly the constraints a hand-entered one is. ASSERTED is not a default
    // here; it is the only thing an import is entitled to claim.
    const asset = await createDataAsset(c, {
      system_id: parsed.system_id, kind: parsed.kind, parent_id: null,
      name: parsed.name, description: parsed.description,
      provenance: 'ASSERTED', valid_from: new Date().toISOString(),
      categories: parsed.categories,
    }) as { id: string };
    await c.tx.query(`UPDATE app.import_rows SET created_asset_id=$5 WHERE ${predicate} AND id=$4`, [...scope, row.id, asset.id]);
  }

  await c.tx.query(
    `UPDATE app.import_batches SET state='APPLIED',settled_at=clock_timestamp(),settled_by=$5 WHERE ${predicate} AND id=$4`,
    [...scope, id, c.actor.actor_id]);
  await audit(c, 'import.applied', id);
  return readBatch(c, id);
}

/**
 * Taking quarantined input back. The rows go; the record that they arrived
 * stays. Deleting the batch as well would leave nothing to distinguish a purge
 * from an import that was never submitted, which is precisely the distinction
 * somebody reviewing this later needs.
 */
export async function purgeImport(c: Context, id: string, input: unknown) {
  const value = S.ImportPurge.parse(input);
  const scope = scopeValues(c.actor);
  const batch = requireOne((await c.tx.query(
    `SELECT state FROM app.import_batches WHERE ${predicate} AND id=$4`, [...scope, id])).rows);
  if (batch.state !== 'QUARANTINED') throw new AccessError(409, 'IDEMPOTENCY_CONFLICT', [{ field: 'id', code: 'import_already_settled' }]);
  await c.tx.query(`DELETE FROM app.import_rows WHERE ${predicate} AND batch_id=$4`, [...scope, id]);
  await c.tx.query(
    `UPDATE app.import_batches SET state='PURGED',settled_at=clock_timestamp(),settled_by=$5,purge_reason=$6 WHERE ${predicate} AND id=$4`,
    [...scope, id, c.actor.actor_id, value.reason]);
  await audit(c, 'import.purged', id);
  return readBatch(c, id);
}
