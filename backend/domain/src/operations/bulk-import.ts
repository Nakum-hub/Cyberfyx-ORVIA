import { randomUUID } from 'node:crypto';
import * as O from '../../../../shared/contracts/src/operations.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { addReference, insertRelationship } from '../registry/principals.ts';
import { appendConsentEvent } from '../registry/consent.ts';
import { insertDelivery } from '../registry/notices.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { emit, iso, pageOf, predicate, refuse, scope, type OperationsEnv } from './shared.ts';

/**
 * Existing-estate onboarding (data/EXISTING_DATA_MIGRATION_AND_BACKFILL.md s4-s9).
 *
 * Rows are received in chunks, then processed in bounded, checkpointed batches.
 * Each row is applied in its own savepoint, so a bad row is isolated with an
 * error code and the rest proceed. Re-running a job, or importing the same file
 * again, resolves every row to the subject that already holds its key: nothing
 * is duplicated, and people are never merged on similarity. Missing history
 * (consent without a timestamp, notice delivery without a source) is stored as
 * missing or refused; it is never supplied.
 */
type JobRow = { id: string; source_label: string; mapping_version: string; status: string; cursor: number; counts: Record<string, number>; created_at: Date; updated_at: Date };

export async function readJob(c: Context, id: string) { return jobView(c, id); }
async function jobView(c: Context, id: string) {
  const s = scope(c);
  const job = (await c.tx.query(`SELECT * FROM app.bulk_jobs WHERE ${predicate} AND id=$4`, [...s, id])).rows[0] as JobRow | undefined;
  if (!job) refuse(404, 'id', 'not_found');
  const counts = (await c.tx.query(`SELECT count(*)::int received,count(*) FILTER (WHERE state='APPLIED')::int applied,count(*) FILTER (WHERE state='DUPLICATE')::int duplicate,
    count(*) FILTER (WHERE state='ERROR')::int error,count(*) FILTER (WHERE state='PENDING')::int pending FROM app.bulk_job_rows WHERE ${predicate} AND job_id=$4`, [...s, id])).rows[0];
  const errors = (await c.tx.query(`SELECT ordinal,error_code FROM app.bulk_job_rows WHERE ${predicate} AND job_id=$4 AND state='ERROR' ORDER BY ordinal LIMIT 50`, [...s, id])).rows;
  return O.BulkJob.parse({ id: job.id, kind: 'ESTATE_IMPORT', source_label: job.source_label, mapping_version: job.mapping_version, status: job.status, cursor: job.cursor, counts, errors,
    created_at: iso(job.created_at), updated_at: iso(job.updated_at) });
}

export async function createJob(c: Context, input: unknown) {
  const value = O.BulkJobCreate.parse(input);
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.bulk_jobs(tenant_id,legal_entity_id,environment_id,id,kind,source_label,mapping_version,status,created_by) VALUES($1,$2,$3,$4,'ESTATE_IMPORT',$5,$6,'RECEIVING',$7)`,
    [...scope(c), id, value.source_label, value.mapping_version, c.actor.actor_id]);
  await audit(c, 'bulk_job.create', id);
  return jobView(c, id);
}

/** Rows are accepted in order; a chunk that repeats received ordinals is accepted only if identical. */
export async function appendRows(c: Context, id: string, input: unknown) {
  const value = O.BulkJobAppend.parse(input);
  const s = scope(c);
  const job = (await c.tx.query(`SELECT status FROM app.bulk_jobs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!job) refuse(404, 'id', 'not_found');
  if (job.status !== 'RECEIVING') refuse(409, 'status', 'job_no_longer_receiving');
  for (const [index, row] of value.rows.entries()) {
    const ordinal = value.first_ordinal + index;
    const rowDigest = digest(row);
    const existing = (await c.tx.query(`SELECT row_digest FROM app.bulk_job_rows WHERE ${predicate} AND job_id=$4 AND ordinal=$5`, [...s, id, ordinal])).rows[0];
    if (existing) { if (existing.row_digest !== rowDigest) refuse(409, 'rows', 'ordinal_already_received_with_other_content'); continue; }
    await c.tx.query(`INSERT INTO app.bulk_job_rows(tenant_id,legal_entity_id,environment_id,job_id,ordinal,payload,row_digest) VALUES($1,$2,$3,$4,$5,$6,$7)`, [...s, id, ordinal, row, rowDigest]);
  }
  await c.tx.query(`UPDATE app.bulk_jobs SET updated_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...s, id]);
  await audit(c, 'bulk_job.append', id);
  return jobView(c, id);
}

async function applyRow(c: Context, env: OperationsEnv, job: JobRow, ordinal: number, row: O.EstateRowValue): Promise<{ state: 'APPLIED' | 'DUPLICATE'; subject_id: string }> {
  const s = scope(c);
  const provenance = { source: 'IMPORT', source_label: job.source_label, source_key: row.row_key, job_id: job.id, row_ordinal: ordinal, mapping_version: job.mapping_version, imported_at: new Date().toISOString() };
  // A row belongs to the subject that already holds any of its keys; two different holders is a conflict, not a merge.
  const holders = new Set<string>();
  for (const ref of row.references) {
    const system = (await c.tx.query(`SELECT 1 FROM app.systems WHERE ${predicate} AND id=$4`, [...s, ref.system_id])).rowCount;
    if (!system) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'references.system_id', code: 'UNKNOWN_SYSTEM' }]);
    const holder = (await c.tx.query(`SELECT subject_id FROM app.data_principal_references WHERE ${predicate} AND system_id=$4 AND target_reference=$5`, [...s, ref.system_id, ref.target_reference])).rows[0];
    if (holder) holders.add(holder.subject_id);
  }
  if (holders.size > 1) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'references', code: 'KEYS_HELD_BY_DIFFERENT_PRINCIPALS' }]);
  let subjectId = [...holders][0];
  const duplicate = subjectId !== undefined;
  if (!subjectId) {
    subjectId = randomUUID();
    await c.tx.query(`INSERT INTO app.data_principals(tenant_id,legal_entity_id,environment_id,id,provenance,recorded_by) VALUES($1,$2,$3,$4,$5,$6)`, [...s, subjectId, provenance, c.actor.actor_id]);
  }
  for (const ref of row.references) {
    const result = await addReference(c, env, subjectId, { ...ref, source_key: row.source_key }, provenance);
    if (!result.inserted && result.existing_subject_id !== subjectId) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'source_key', code: 'SOURCE_KEY_HELD_BY_ANOTHER_PRINCIPAL' }]);
  }
  if (duplicate) {
    // A replayed row adds nothing already recorded from the same row key and job mapping.
    const seen = (await c.tx.query(`SELECT 1 FROM app.data_principal_relationships WHERE ${predicate} AND subject_id=$4 AND provenance->>'source_key'=$5 AND provenance->>'mapping_version'=$6 LIMIT 1`,
      [...s, subjectId, row.row_key, job.mapping_version])).rowCount;
    if (seen || !row.relationships.length) return { state: 'DUPLICATE', subject_id: subjectId };
  }
  for (const rel of row.relationships) {
    const category = (await c.tx.query(`SELECT 1 FROM app.data_principal_categories WHERE ${predicate} AND id=$4`, [...s, rel.category_id])).rowCount;
    if (!category) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'relationships.category_id', code: 'UNKNOWN_CATEGORY' }]);
    if (rel.status === 'ACTIVE' && rel.effective_to) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'relationships', code: 'ACTIVE_RELATIONSHIP_WITH_END' }]);
    if (rel.evidence_state === 'EVIDENCE_AVAILABLE' && !rel.evidence_reference) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'relationships', code: 'EVIDENCE_WITHOUT_REFERENCE' }]);
    await insertRelationship(c, { subject_id: subjectId, category_id: rel.category_id, effective_from: rel.effective_from, effective_to: rel.effective_to, status: rel.status, source_system_id: row.references[0]!.system_id,
      source_reference: rel.source_reference, evidence_state: rel.evidence_state, evidence_reference: rel.evidence_reference }, provenance);
  }
  for (const consent of row.consent) {
    const version = (await c.tx.query(`SELECT v.purpose_version_id,pc.code FROM app.registry_activity_versions v LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
      WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.activity_id=$4 AND v.status='CURRENT'`, [...s, consent.activity_id])).rows[0];
    if (!version) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'consent.activity_id', code: 'UNKNOWN_ACTIVITY' }]);
    if (version.code !== 'CONSENT') throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'consent.activity_id', code: 'CONSENT_NOT_THE_CONDITION' }]);
    if (consent.occurred_at === null && consent.evidence_state !== 'EVIDENCE_MISSING') throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'consent', code: 'UNKNOWN_TIME_MUST_BE_EVIDENCE_MISSING' }]);
    if ((consent.evidence_state === 'EVIDENCE_AVAILABLE') !== (consent.evidence_reference !== null)) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'consent', code: 'EVIDENCE_REFERENCE_MISMATCH' }]);
    let record = (await c.tx.query(`SELECT id FROM app.consent_records WHERE ${predicate} AND subject_id=$4 AND activity_id=$5 AND relationship_id IS NULL`, [...s, subjectId, consent.activity_id])).rows[0];
    if (!record) {
      record = { id: randomUUID() };
      await c.tx.query(`INSERT INTO app.consent_records(tenant_id,legal_entity_id,environment_id,id,subject_id,activity_id,purpose_version_id,channel,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,'IMPORTED_HISTORY',$8)`,
        [...s, record.id, subjectId, consent.activity_id, version.purpose_version_id, c.actor.actor_id]);
    }
    await appendConsentEvent(c, record.id, { event: consent.event, occurred_at: consent.occurred_at, evidence_state: consent.evidence_state, evidence_reference: consent.evidence_reference, notice_version_id: null },
      'IMPORT', { ...provenance, source_reference: consent.source_reference });
  }
  for (const delivery of row.notice_deliveries) {
    await insertDelivery(c, { notice_version_id: delivery.notice_version_id, subject_id: subjectId, relationship_id: null, population_reference: null, channel: delivery.channel, presented_at: delivery.presented_at,
      source_system_id: row.references[0]!.system_id, source_reference: delivery.source_reference, evidence_reference: delivery.evidence_reference, result: delivery.result }, provenance);
  }
  if (!duplicate) await emit(c, 'data_principal_context_created', 'data_principal', subjectId, { job_id: job.id, row_ordinal: ordinal });
  return { state: duplicate ? 'DUPLICATE' : 'APPLIED', subject_id: subjectId };
}

async function processRows(c: Context, env: OperationsEnv, job: JobRow, rows: { ordinal: number; payload: O.EstateRowValue }[]) {
  const s = scope(c);
  for (const row of rows) {
    await c.tx.query('SAVEPOINT import_row');
    try {
      const result = await applyRow(c, env, job, row.ordinal, row.payload);
      await c.tx.query('RELEASE SAVEPOINT import_row');
      await c.tx.query(`UPDATE app.bulk_job_rows SET state=$4,subject_id=$5,error_code=NULL,attempts=attempts+1,processed_at=clock_timestamp() WHERE ${predicate} AND job_id=$6 AND ordinal=$7`, [...s, result.state, result.subject_id, job.id, row.ordinal]);
    } catch (error) {
      await c.tx.query('ROLLBACK TO SAVEPOINT import_row');
      const code = error instanceof AccessError ? (error.fieldErrors?.[0]?.code ?? error.code) : ((error as { code?: string }).code === '23514' || (error as { code?: string }).code === '22P02' ? 'ROW_REJECTED_BY_CONSTRAINT' : 'ROW_FAILED');
      if (!(error instanceof AccessError) && !['23514', '22P02', '23503', '23505'].includes((error as { code?: string }).code ?? '')) throw error;
      await c.tx.query(`UPDATE app.bulk_job_rows SET state='ERROR',error_code=$4,attempts=attempts+1,processed_at=clock_timestamp() WHERE ${predicate} AND job_id=$5 AND ordinal=$6`, [...s, code.slice(0, 60), job.id, row.ordinal]);
    }
  }
}

/** One bounded batch from the persisted cursor. Resumable after interruption. */
export async function processJob(c: Context, env: OperationsEnv, id: string, input: unknown) {
  const value = O.BulkJobProcess.parse(input);
  const s = scope(c);
  const job = (await c.tx.query(`SELECT * FROM app.bulk_jobs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0] as JobRow | undefined;
  if (!job) refuse(404, 'id', 'not_found');
  if (job.status === 'COMPLETED') return jobView(c, id);
  const rows = (await c.tx.query(`SELECT ordinal,payload FROM app.bulk_job_rows WHERE ${predicate} AND job_id=$4 AND ordinal>$5 AND state='PENDING' ORDER BY ordinal LIMIT $6`, [...s, id, job.cursor, value.limit])).rows;
  await processRows(c, env, job, rows.map(r => ({ ordinal: r.ordinal, payload: O.EstateRow.parse(r.payload) })));
  const cursor = rows.at(-1)?.ordinal ?? job.cursor;
  const remaining = Number((await c.tx.query(`SELECT count(*) n FROM app.bulk_job_rows WHERE ${predicate} AND job_id=$4 AND state='PENDING'`, [...s, id])).rows[0].n);
  const errors = Number((await c.tx.query(`SELECT count(*) n FROM app.bulk_job_rows WHERE ${predicate} AND job_id=$4 AND state='ERROR'`, [...s, id])).rows[0].n);
  const status = remaining === 0 ? (errors ? 'COMPLETED_WITH_ERRORS' : 'COMPLETED') : 'PROCESSING';
  await c.tx.query(`UPDATE app.bulk_jobs SET cursor=$4,status=$5,updated_at=clock_timestamp() WHERE ${predicate} AND id=$6`, [...s, cursor, status, id]);
  if (status !== 'PROCESSING') await emit(c, 'bulk_job_completed', 'bulk_job', id, { status, errors });
  await audit(c, 'bulk_job.process', id);
  return jobView(c, id);
}

/** Failed rows are re-queued for another attempt; rows that already applied are never replayed. */
export async function replayErrors(c: Context, id: string) {
  const s = scope(c);
  const job = (await c.tx.query(`SELECT status FROM app.bulk_jobs WHERE ${predicate} AND id=$4 FOR UPDATE`, [...s, id])).rows[0];
  if (!job) refuse(404, 'id', 'not_found');
  const reset = await c.tx.query(`UPDATE app.bulk_job_rows SET state='PENDING',error_code=NULL WHERE ${predicate} AND job_id=$4 AND state='ERROR'`, [...s, id]);
  if (reset.rowCount) await c.tx.query(`UPDATE app.bulk_jobs SET status='PROCESSING',cursor=-1,updated_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...s, id]);
  await audit(c, 'bulk_job.replay', id);
  return jobView(c, id);
}

export async function jobList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT id FROM app.bulk_jobs WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await jobView(c, row.id));
  return { items, next_cursor: paged.next_cursor };
}
