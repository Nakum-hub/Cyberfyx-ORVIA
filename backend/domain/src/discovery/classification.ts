import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * EX04 value classification and EX12 access exposure.
 *
 * A run is requested here and carried out by the worker through the observer
 * role (services/worker/src/classification.ts). What it returns is counts per
 * column, a decision per column and the relation's grants. Exposure findings
 * are derived from those grants for relations holding a confirmed sensitive
 * column. Quality is measured by comparing a completed run with the reviewed
 * labels in force, column by column, and is kept as evidence.
 */
type Row = QueryResultRow;
type Column = ReturnType<typeof X.ClassifiedColumn.parse>;
type Grant = ReturnType<typeof X.RelationGrant.parse>;
type Finding = ReturnType<typeof X.ExposureFinding.parse>;
const HIGH_SENSITIVITY = new Set(['AADHAAR', 'PAN', 'PAYMENT_CARD']);
const WRITES = new Set(['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']);
const OBSERVER_ROLE = 'orvia_target_observer';

/** Findings for one relation: who can read its confirmed sensitive columns. */
export function exposureFindings(columns: Column[], grants: Grant[], owner: string | null): Finding[] {
  const sensitive = columns.filter(c => c.confidence === 'CONFIRMED' && c.category);
  if (!sensitive.length) return [];
  const findings: Finding[] = [];
  const byGrantee = new Map<string, { privileges: Set<string>; columns: Set<string> | null }>();
  for (const g of grants) {
    const entry = byGrantee.get(g.grantee) ?? { privileges: new Set<string>(), columns: new Set<string>() };
    for (const p of g.privileges) entry.privileges.add(p);
    if (g.columns === null) entry.columns = null; else if (entry.columns) for (const col of g.columns) entry.columns.add(col);
    byGrantee.set(g.grantee, entry);
  }
  for (const [grantee, entry] of byGrantee) {
    if (!entry.privileges.has('SELECT')) continue;
    const readable = sensitive.filter(c => entry.columns === null || entry.columns.has(c.column));
    if (!readable.length) continue;
    const categories = [...new Set(readable.map(c => c.category!))];
    const high = categories.some(c => HIGH_SENSITIVITY.has(c));
    const cols = readable.map(c => c.column);
    const writes = [...entry.privileges].filter(p => WRITES.has(p));
    if (grantee === 'PUBLIC') findings.push({ kind: 'PUBLIC_CAN_READ', severity: high ? 'HIGH' : 'MEDIUM', grantee, columns: cols, categories, detail: 'Every role that can connect may read these classified columns.' });
    else if (grantee === owner) findings.push({ kind: 'OWNER', severity: 'INFO', grantee, columns: cols, categories, detail: 'The owning role holds every privilege on the relation.' });
    else if (grantee === OBSERVER_ROLE) findings.push({ kind: 'ORVIA_OBSERVER', severity: 'INFO', grantee, columns: cols, categories, detail: 'This product\'s own read-only observer role, used to take this sample.' });
    else if (writes.length) findings.push({ kind: 'READ_WRITE_ROLE_CAN_READ', severity: high ? 'MEDIUM' : 'LOW', grantee, columns: cols, categories, detail: `A role that can also ${writes.join(', ').toLowerCase()} may read these classified columns; check it needs to.` });
    else findings.push({ kind: 'ROLE_CAN_READ', severity: 'LOW', grantee, columns: cols, categories, detail: 'A role that may read these classified columns; review that it needs to.' });
  }
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2, INFO: 3 };
  return findings.sort((a, b) => order[a.severity] - order[b.severity] || a.grantee.localeCompare(b.grantee)).slice(0, 200);
}

async function targetRow(c: Context, id: string) {
  const r = (await c.tx.query(`SELECT * FROM app.catalog_discovery_targets WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
function runView(r: Row) {
  const columns = (r.columns ?? []) as Column[]; const grants = (r.grants ?? []) as Grant[];
  return X.ClassificationRun.parse({
    id: r.id, target_id: r.target_id, schema_name: r.schema_name, relation_name: r.relation_name, sample_limit: r.sample_limit, state: r.state, requested_by: r.requested_by, requested_at: iso(r.requested_at),
    ruleset: r.ruleset, observed_at: iso(r.observed_at), relation_state: r.relation_state, rows_sampled: r.rows_sampled, columns, grants, owner: r.owner,
    findings: r.state === 'COMPLETED' ? exposureFindings(columns, grants, r.owner) : [], limits: r.limits ?? [], failure_code: r.failure_code,
  });
}
const RUN_SELECT = `SELECT r.*, t.schema_name, t.relation_name FROM app.classification_runs r JOIN app.catalog_discovery_targets t ON t.tenant_id=r.tenant_id AND t.legal_entity_id=r.legal_entity_id AND t.environment_id=r.environment_id AND t.id=r.target_id`;

export async function requestRun(c: Context, targetId: string, input: unknown) {
  const value = X.ClassificationRunRequest.parse(input);
  const target = await targetRow(c, targetId);
  if (target.state !== 'APPROVED') refuse(409, 'state', 'target_not_approved');
  const queued = (await c.tx.query(`SELECT 1 FROM app.classification_runs WHERE ${predicate} AND target_id=$4 AND state='QUEUED'`, [...scope(c), targetId])).rowCount;
  if (queued) refuse(409, 'target_id', 'a_run_is_already_queued');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.classification_runs(tenant_id,legal_entity_id,environment_id,id,target_id,sample_limit,requested_by) VALUES($1,$2,$3,$4,$5,$6,$7)`, [...scope(c), id, targetId, value.sample_limit, c.actor.actor_id]);
  await audit(c, 'classification.request', id);
  return runDetail(c, id);
}
export async function runDetail(c: Context, id: string) {
  const r = (await c.tx.query(`${RUN_SELECT} WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.id=$4`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return runView(r);
}
export async function runList(c: Context, targetId: string, page: Page) {
  await targetRow(c, targetId);
  const rows = (await c.tx.query(`${RUN_SELECT} WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.target_id=$4
    AND ($5::uuid IS NULL OR (r.requested_at, r.id) < (SELECT k.requested_at, k.id FROM app.classification_runs k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$5))
    ORDER BY r.requested_at DESC, r.id DESC LIMIT $6`, [...scope(c), targetId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(runView), next_cursor: paged.next_cursor };
}

async function currentLabels(c: Context, targetId: string) {
  return (await c.tx.query(`SELECT DISTINCT ON (column_name) column_name, expected, basis, labelled_by, labelled_at FROM app.classification_labels WHERE ${predicate} AND target_id=$4 ORDER BY column_name, sequence DESC`, [...scope(c), targetId])).rows;
}
export async function labelSet(c: Context, targetId: string) {
  await targetRow(c, targetId);
  return X.ClassificationLabelSet.parse({ target_id: targetId, labels: (await currentLabels(c, targetId)).map(l => ({ column: l.column_name, expected: l.expected, basis: l.basis, labelled_by: l.labelled_by, labelled_at: iso(l.labelled_at) })) });
}
export async function recordLabels(c: Context, targetId: string, input: unknown) {
  const value = X.ClassificationLabelsRecord.parse(input);
  await targetRow(c, targetId);
  if (new Set(value.labels.map(l => l.column)).size !== value.labels.length) refuse(400, 'labels', 'duplicate_column');
  for (const l of value.labels) await c.tx.query(`INSERT INTO app.classification_labels(tenant_id,legal_entity_id,environment_id,id,target_id,column_name,expected,basis,labelled_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [...scope(c), randomUUID(), targetId, l.column, l.expected, l.basis, c.actor.actor_id]);
  await audit(c, 'classification.label', targetId);
  return labelSet(c, targetId);
}

const qualityView = (r: Row) => X.ClassificationQuality.parse({ id: r.id, run_id: r.run_id, ruleset: r.ruleset, recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at), measurement: r.measurement });
/** Column-level precision and recall against the labels in force. POSSIBLE decisions are not counted as predictions, and are listed. */
export async function measureQuality(c: Context, runId: string) {
  const run = await runDetail(c, runId);
  if (run.state !== 'COMPLETED' || run.relation_state !== 'CLASSIFIED') refuse(409, 'state', 'only_a_completed_classification_is_measured');
  const labels = new Map((await currentLabels(c, run.target_id)).map(l => [l.column_name as string, l.expected as string]));
  if (!labels.size) refuse(409, 'labels', 'no_reviewed_labels');
  const labelled = run.columns.filter(col => labels.has(col.column));
  const predicted = (col: Column) => col.confidence === 'CONFIRMED' ? col.category! : 'NONE';
  const perCategory = X.ValueCategory.options.map(category => {
    const tp = labelled.filter(col => predicted(col) === category && labels.get(col.column) === category).length;
    const fp = labelled.filter(col => predicted(col) === category && labels.get(col.column) !== category).length;
    const fn = labelled.filter(col => predicted(col) !== category && labels.get(col.column) === category).length;
    return { category, true_positives: tp, false_positives: fp, false_negatives: fn, precision: tp + fp ? tp / (tp + fp) : null, recall: tp + fn ? tp / (tp + fn) : null };
  }).filter(x => x.true_positives + x.false_positives + x.false_negatives > 0);
  const correct = labelled.filter(col => predicted(col) === labels.get(col.column)).length;
  const measurement = {
    columns_labelled: labelled.length, columns_unlabelled: run.columns.filter(col => !labels.has(col.column)).map(col => col.column), correct, accuracy: labelled.length ? correct / labelled.length : 0,
    per_category: perCategory, possible_not_counted: labelled.filter(col => col.confidence === 'POSSIBLE').map(col => col.column), sample_rows: run.rows_sampled ?? 0,
    limits: [`Measured for ${run.ruleset} on a sample of ${run.rows_sampled} rows of ${run.schema_name}.${run.relation_name}; it describes this relation and these labels, not every source.`,
      'Labels are reviewed statements of each column\'s true category; a wrong label makes this measurement wrong.'],
  };
  const row = (await c.tx.query(`INSERT INTO app.classification_quality(tenant_id,legal_entity_id,environment_id,id,run_id,ruleset,measurement,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [...scope(c), randomUUID(), runId, run.ruleset, JSON.stringify(measurement), c.actor.actor_id])).rows[0];
  await audit(c, 'classification.measure', runId);
  return qualityView(row);
}
export async function qualityList(c: Context, runId: string, page: Page) {
  await runDetail(c, runId);
  const rows = (await c.tx.query(`SELECT * FROM app.classification_quality WHERE ${predicate} AND run_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`, [...scope(c), runId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(qualityView), next_cursor: paged.next_cursor };
}

/** The latest completed classification of each target with its exposure findings. */
export async function exposureList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM (SELECT DISTINCT ON (r.target_id) r.*, t.schema_name, t.relation_name FROM app.classification_runs r
      JOIN app.catalog_discovery_targets t ON t.tenant_id=r.tenant_id AND t.legal_entity_id=r.legal_entity_id AND t.environment_id=r.environment_id AND t.id=r.target_id
      WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.state='COMPLETED' ORDER BY r.target_id, r.observed_at DESC) latest
    WHERE ($4::uuid IS NULL OR target_id>$4) ORDER BY target_id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.target_id);
  return { items: paged.items.map(r => { const v = runView(r); return X.ExposureSummary.parse({ target_id: v.target_id, schema_name: v.schema_name, relation_name: v.relation_name, run_id: v.id, observed_at: v.observed_at,
    sensitive_columns: v.columns.filter(col => col.confidence === 'CONFIRMED').map(col => col.column), findings: v.findings }); }), next_cursor: paged.next_cursor };
}
