import { createHash, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as S from '../../../../shared/contracts/src/index.ts';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';
import { auditEvent, filterClauses, withCorrections } from '../audit/audit.ts';
import { versionContent } from '../mapping/ropa.ts';

/**
 * Bounded, resumable exports.
 *
 * A job fixes what it will export when it is created: a record-of-processing
 * version (itself immutable), or the audit events matching a filter up to the
 * creation instant, whose count is taken then. Each step writes one bounded
 * chunk and advances the cursor in the same transaction, so an interrupted
 * export resumes from its last committed chunk and never writes a row twice.
 * On the last step the source is counted again: only if every matched row was
 * written does the job complete with a manifest of chunk digests. Otherwise it
 * fails and nothing is downloadable, so a partial file cannot pass for a whole
 * one. Steps run under the requester's own authority, which is why an export
 * can contain only what its requester may read, and only they can continue or
 * download it.
 */
type Row = QueryResultRow;
const CEILING = 2_000_000;
const AUDIT_BATCH = 2000;
const ROPA_BATCH = 200;
const TTL_DAYS = 7;
const ROPA_COLUMNS = ['activity_id', 'activity', 'owner', 'purpose', 'purpose_version', 'condition', 'item_kind', 'item_id', 'item_name', 'detail', 'provenance'];
const LIMITS: Record<string, string[]> = {
  ROPA_VERSION_CSV: [
    'Rows are taken from the named record-of-processing version, which is immutable; the export is that version, not the registry as it is now.',
    'A cell that would begin with =, +, - or @ is prefixed with an apostrophe so a spreadsheet does not evaluate it.',
  ],
  AUDIT_EVENTS_JSONL: [
    'Rows are the audit events matching the filter that were recorded at or before the stated instant. Events recorded later are outside this export.',
    'The source was counted again after the last chunk; the export completed only because every matched event was written.',
  ],
};
const sha = (text: string) => createHash('sha256').update(text).digest('hex');
const cell = (value: unknown) => {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};

function view(r: Row) {
  return X.DataExport.parse({
    id: r.id, kind: r.kind, source_id: r.source_id, as_of: iso(r.as_of), expected_rows: r.expected_rows, state: r.state, rows_written: r.rows_written, chunks: r.chunks,
    failure_code: r.failure_code, manifest: r.manifest, created_at: iso(r.created_at), finished_at: iso(r.finished_at), expires_at: iso(r.expires_at), expired: Date.parse(r.expires_at) <= Date.now(),
  });
}
async function jobRow(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.export_jobs WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
function auditFilter(job: Row) { return S.AuditQuery.parse(job.filter ?? {}); }
async function auditCount(c: Context, job: { filter: unknown; as_of: string | Date }) {
  const values: unknown[] = [...scope(c), job.as_of];
  const clauses = filterClauses(S.AuditQuery.parse(job.filter ?? {}), values);
  return Number((await c.tx.query(`SELECT count(*)::int n FROM app.audit_events e WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.created_at<=$4${clauses}`, values)).rows[0].n);
}

export async function createExport(c: Context, input: unknown) {
  const value = X.DataExportCreate.parse(input);
  // The instant is the database's, so rows are compared on one clock.
  const asOf = ((await c.tx.query(`SELECT to_char(date_trunc('milliseconds', clock_timestamp()) AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS t`)).rows[0]!.t) as string;
  let expected: number; let filter: Record<string, unknown> = {};
  if (value.kind === 'AUDIT_EVENTS_JSONL') {
    if (!c.actor.capabilities.includes('audit.export')) refuse(409, 'kind', 'audit_export_needs_audit_export_authority');
    const parsed = S.AuditQuery.safeParse(value.audit_filter ?? {});
    if (!parsed.success) refuse(400, 'audit_filter', 'not_a_valid_audit_filter');
    filter = parsed.data;
    expected = await auditCount(c, { filter, as_of: asOf });
  } else {
    if (!c.actor.capabilities.includes('registry.read')) refuse(409, 'kind', 'ropa_export_needs_registry_read');
    const { entries } = await versionContent(c, value.ropa_version_id!);
    expected = entries.reduce((n, e) => n + ropaRows(e).length, 0);
  }
  if (expected > CEILING) refuse(400, 'filter', 'matched_set_above_export_ceiling');
  const row = (await c.tx.query(`INSERT INTO app.export_jobs(tenant_id,legal_entity_id,environment_id,id,kind,source_id,filter,as_of,expected_rows,requested_by,expires_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$8::timestamptz+make_interval(days=>${TTL_DAYS})) RETURNING *`,
  [...scope(c), randomUUID(), value.kind, value.ropa_version_id, JSON.stringify(filter), asOf, expected, c.actor.actor_id])).rows[0];
  await audit(c, 'data_export.create', row.id);
  return view(row);
}

type RopaEntry = ReturnType<typeof X.RopaEntry.parse>;
function ropaRows(e: RopaEntry): unknown[][] {
  const base = [e.activity_id, e.name, e.owner_reference, e.purpose?.name ?? '', e.purpose ? String(e.purpose.version) : '', e.condition?.code ?? ''];
  const rows: unknown[][] = [[...base, 'ACTIVITY', e.activity_id, e.name, e.description, 'DECLARED']];
  for (const x of e.principal_categories) rows.push([...base, 'PRINCIPAL_CATEGORY', x.id, x.name, x.basis, 'DECLARED']);
  for (const x of e.data_categories) rows.push([...base, 'DATA_CATEGORY', x.id, x.name, x.basis, 'DECLARED']);
  for (const x of e.systems) rows.push([...base, 'SYSTEM', x.id, x.name, [x.binding_adapter ? `bound: ${x.binding_adapter}` : 'unbound', x.location ? `location ${x.location.region}` : 'location undeclared'].join('; '),
    x.observed ? `DECLARED; OBSERVED ${x.observed.last_seen_at}${x.observed.fresh ? '' : ' (stale)'}` : 'DECLARED']);
  for (const x of e.recipients) rows.push([...base, 'RECIPIENT', x.engagement_id, x.processor_name, `${x.role}; region ${x.region}; ${x.status.toLowerCase()}`, 'DECLARED']);
  for (const x of e.transfers) rows.push([...base, 'TRANSFER', x.target_id, x.name, `${x.region}${x.cross_border ? ' (cross-border)' : ''}`, 'DERIVED']);
  for (const x of e.retention) rows.push([...base, 'RETENTION_RULE', x.rule_id, x.name, `${x.trigger}; ${x.duration_days === null ? 'no period' : `${x.duration_days} days`}`, 'DECLARED']);
  for (const x of e.safeguards) rows.push([...base, 'SAFEGUARD', x.id, x.kind, `${x.description} (${x.evidence_state})`, 'DECLARED']);
  for (const x of e.gaps) rows.push([...base, 'GAP', x.target_id ?? '', x.kind, x.detail, `DERIVED ${x.severity}`]);
  return rows;
}

/** Writes the next bounded chunk, or finalises the job when the source is exhausted. */
export async function advanceExport(c: Context, id: string) {
  const job = await jobRow(c, id, true);
  if (job.state !== 'RUNNING') return view(job);
  let content: string; let rowCount: number; let cursor: string | null = job.cursor; let exhausted: boolean;
  if (job.kind === 'AUDIT_EVENTS_JSONL') {
    const values: unknown[] = [...scope(c), job.as_of];
    const clauses = filterClauses(auditFilter(job), values);
    const [afterAt, afterId] = cursor ? cursor.split('|') : [null, null];
    values.push(afterAt, afterId, AUDIT_BATCH);
    const n = values.length;
    const rows = (await c.tx.query(`SELECT e.*, ${withCorrections}, to_char(e.created_at AT TIME ZONE 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"') AS cursor_at FROM app.audit_events e WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.created_at<=$4${clauses}
      AND ($${n - 2}::timestamptz IS NULL OR (e.created_at,e.id)>($${n - 2}::timestamptz,$${n - 1}::uuid)) ORDER BY e.created_at, e.id LIMIT $${n}`, values)).rows;
    content = rows.map(r => JSON.stringify(auditEvent(r as Parameters<typeof auditEvent>[0]))).join('\n') + (rows.length ? '\n' : '');
    rowCount = rows.length;
    if (rows.length) { const last = rows.at(-1)!; cursor = `${last.cursor_at}|${last.id}`; }
    exhausted = rows.length < AUDIT_BATCH;
  } else {
    const { entries } = await versionContent(c, job.source_id);
    const start = Number(cursor ?? 0);
    const slice = entries.slice(start, start + ROPA_BATCH);
    const lines = slice.flatMap(ropaRows).map(r => r.map(cell).join(','));
    content = (start === 0 ? ROPA_COLUMNS.join(',') + '\n' : '') + lines.map(l => l + '\n').join('');
    rowCount = lines.length;
    cursor = String(start + slice.length);
    exhausted = start + slice.length >= entries.length;
  }
  if (rowCount > 0 || job.chunks === 0) {
    const sequence = job.chunks + 1;
    await c.tx.query(`INSERT INTO app.export_chunks(tenant_id,legal_entity_id,environment_id,job_id,sequence,row_count,sha256,content) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [...scope(c), id, sequence, rowCount, sha(content), content]);
    job.chunks = sequence; job.rows_written += rowCount;
  }
  if (!exhausted) {
    const updated = (await c.tx.query(`UPDATE app.export_jobs SET cursor=$5, rows_written=$6, chunks=$7 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, cursor, job.rows_written, job.chunks])).rows[0];
    return view(updated);
  }
  // The source is exhausted: count it again and complete only if every matched row was written.
  const recount = job.kind === 'AUDIT_EVENTS_JSONL' ? await auditCount(c, job as { filter: unknown; as_of: Date }) : job.expected_rows;
  if (recount !== job.rows_written || job.expected_rows !== job.rows_written) {
    const failed = (await c.tx.query(`UPDATE app.export_jobs SET cursor=$5, rows_written=$6, chunks=$7, state='FAILED', failure_code=$8, finished_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`,
      [...scope(c), id, cursor, job.rows_written, job.chunks, 'source_changed_during_export'])).rows[0];
    await audit(c, 'data_export.fail', id);
    return view(failed);
  }
  const chunks = (await c.tx.query(`SELECT sequence, row_count, sha256 FROM app.export_chunks WHERE ${predicate} AND job_id=$4 ORDER BY sequence`, [...scope(c), id])).rows;
  const manifest = X.DataExportManifest.parse({
    kind: job.kind, as_of: iso(job.as_of), filter: Object.fromEntries(Object.entries(job.filter ?? {}).map(([k, v]) => [k, String(v)])), expected_rows: job.expected_rows, rows: job.rows_written,
    columns: job.kind === 'ROPA_VERSION_CSV' ? ROPA_COLUMNS : ['id', 'operation', 'actor_id', 'actor_domain', 'resource_id', 'request_id', 'created_at', 'corrections'],
    chunks, digest: sha(chunks.map(ch => ch.sha256).join('\n')), complete: true, limits: LIMITS[job.kind]!,
  });
  const done = (await c.tx.query(`UPDATE app.export_jobs SET cursor=$5, rows_written=$6, chunks=$7, state='COMPLETED', manifest=$8, finished_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`,
    [...scope(c), id, cursor, job.rows_written, job.chunks, JSON.stringify(manifest)])).rows[0];
  await audit(c, 'data_export.complete', id);
  return view(done);
}
export async function stopExport(c: Context, id: string) {
  const job = await jobRow(c, id, true);
  if (job.state !== 'RUNNING') refuse(409, 'state', 'only_a_running_export_is_stopped');
  const row = (await c.tx.query(`UPDATE app.export_jobs SET state='CANCELLED', finished_at=clock_timestamp() WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id])).rows[0];
  await audit(c, 'data_export.stop', id);
  return view(row);
}
export async function exportView(c: Context, id: string) { return view(await jobRow(c, id)); }
export async function exportList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.export_jobs WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(view), next_cursor: paged.next_cursor };
}
export async function exportChunk(c: Context, id: string, query: unknown) {
  const q = X.DataExportChunkQuery.parse(query);
  const job = await jobRow(c, id);
  if (job.state !== 'COMPLETED') refuse(409, 'state', 'only_a_completed_export_is_downloaded');
  if (Date.parse(job.expires_at) <= Date.now()) refuse(409, 'expires_at', 'export_expired');
  const chunk = (await c.tx.query(`SELECT * FROM app.export_chunks WHERE ${predicate} AND job_id=$4 AND sequence=$5`, [...scope(c), id, q.sequence])).rows[0];
  if (!chunk) refuse(404, 'sequence', 'not_found');
  await audit(c, 'data_export.download', id);
  return X.DataExportChunk.parse({ job_id: id, sequence: chunk.sequence, row_count: chunk.row_count, sha256: chunk.sha256, content: chunk.content });
}
/** Runner: removes the chunk copies of expired jobs. The job and its manifest remain. */
export async function purgeExpiredExports(c: Context) {
  const r = await c.tx.query(`DELETE FROM app.export_chunks k USING app.export_jobs j WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3
    AND j.tenant_id=k.tenant_id AND j.legal_entity_id=k.legal_entity_id AND j.environment_id=k.environment_id AND j.id=k.job_id AND j.expires_at<clock_timestamp()`, scope(c));
  return r.rowCount ?? 0;
}
