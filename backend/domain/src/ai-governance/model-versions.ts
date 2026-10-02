import { randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';

/**
 * Custom-model version governance (migration 0080). The organisation records each version of its own model: training datasets,
 * the training purpose and basis, the data cut-off, evaluation evidence and known limits. Approval needs a different person, an
 * AI use with no open finding, and every training dataset mapped to an activity serving the training purpose. Deployment needs
 * an approved version and a currently approved AI use. After deployment, consent withdrawn for the training purpose after the
 * cut-off is counted for a retraining decision. ORVIA runs, trains and evaluates no model, and never claims one forgot anybody.
 */
type Row = QueryResultRow;
const LIMITS = [
  'This is a record of the organisation\'s model and its evidence; ORVIA did not train, run or evaluate the model.',
  'Withdrawals counted after the training data cut-off show who may still be represented in the model. Whether to retrain is the organisation\'s decision; no model is claimed to have forgotten anyone.',
];

async function withdrawals(c: Context, purposeId: string, since: Date) {
  return Number((await c.tx.query(`SELECT count(*)::int AS n FROM app.consent_aggregates WHERE ${predicate} AND purpose_id=$4 AND state='WITHDRAWN' AND updated_at>$5`, [...scope(c), purposeId, since])).rows[0].n);
}
async function view(c: Context, r: Row) {
  const n = r.state === 'DEPLOYED' || r.state === 'APPROVED' ? await withdrawals(c, r.training_purpose_id, r.training_data_as_of) : 0;
  return X.AiModelVersion.parse({ id: r.id, ai_system_id: r.ai_system_id, version_label: r.version_label, model_kind: r.model_kind, training_asset_ids: r.training_asset_ids, training_purpose_id: r.training_purpose_id,
    training_basis: r.training_basis, training_data_as_of: iso(r.training_data_as_of), evaluation_reference: r.evaluation_reference, evaluation_summary: r.evaluation_summary, known_limitations: r.known_limitations,
    state: r.state, recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), deployed_by: r.deployed_by, deployed_at: iso(r.deployed_at), retired_at: iso(r.retired_at),
    withdrawals_since_training_data: n, retraining_review_due: r.state === 'DEPLOYED' && n > 0, limits: LIMITS });
}
async function row(c: Context, id: string, lock = false) {
  const r = (await c.tx.query(`SELECT * FROM app.ai_model_versions WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0];
  if (!r) refuse(404, 'id', 'not_found');
  return r as Row;
}
/** The AI use's governance state: an open finding blocks approval; deployment needs a current approval. */
async function aiFlags(c: Context, aiSystemId: string) {
  const events = (await c.tx.query(`SELECT kind, state FROM app.ai_governance_events WHERE ${predicate} AND ai_system_id=$4 ORDER BY recorded_at DESC, id DESC`, [...scope(c), aiSystemId])).rows;
  const findingOpen = events.some(e => e.kind === 'MONITORING' && e.state === 'FINDING');
  const approvalAt = events.findIndex(e => e.kind === 'APPROVAL');
  const approval = approvalAt >= 0 ? events[approvalAt] : undefined;
  const invalidated = approval ? events.slice(0, approvalAt).some(e => ['RISK_ASSESSMENT', 'POLICY', 'CONTROL', 'INCIDENT'].includes(e.kind) || (e.kind === 'MONITORING' && e.state === 'FINDING')) : false;
  return { finding_open: findingOpen, approved: approval?.state === 'APPROVED' && !invalidated && !findingOpen };
}

export async function modelVersionList(c: Context, aiSystemId: string, page: Page) {
  if (!(await c.tx.query(`SELECT 1 FROM app.ai_systems WHERE ${predicate} AND id=$4`, [...scope(c), aiSystemId])).rowCount) refuse(404, 'id', 'not_found');
  const rows = (await c.tx.query(`SELECT * FROM app.ai_model_versions WHERE ${predicate} AND ai_system_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`, [...scope(c), aiSystemId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = []; for (const r of paged.items) items.push(await view(c, r));
  return { items, next_cursor: paged.next_cursor };
}

export async function recordModelVersion(c: Context, aiSystemId: string, input: unknown) {
  const v = X.AiModelVersionCreate.parse(input);
  if (!(await c.tx.query(`SELECT 1 FROM app.ai_systems WHERE ${predicate} AND id=$4`, [...scope(c), aiSystemId])).rowCount) refuse(404, 'id', 'not_found');
  if (!(await c.tx.query(`SELECT 1 FROM app.purpose_versions WHERE ${predicate} AND id=$4`, [...scope(c), v.training_purpose_id])).rowCount) refuse(404, 'training_purpose_id', 'not_found');
  for (const asset of v.training_asset_ids) if (!(await c.tx.query(`SELECT 1 FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope(c), asset])).rowCount) refuse(404, 'training_asset_ids', 'not_found');
  if (Date.parse(v.training_data_as_of) > Date.now() + 60_000) refuse(400, 'training_data_as_of', 'in_the_future');
  if ((await c.tx.query(`SELECT 1 FROM app.ai_model_versions WHERE ${predicate} AND ai_system_id=$4 AND version_label=$5`, [...scope(c), aiSystemId, v.version_label])).rowCount) refuse(409, 'version_label', 'already_recorded');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.ai_model_versions(tenant_id,legal_entity_id,environment_id,id,ai_system_id,version_label,model_kind,training_asset_ids,training_purpose_id,training_basis,training_data_as_of,evaluation_reference,evaluation_summary,known_limitations,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`, [...scope(c), id, aiSystemId, v.version_label, v.model_kind, [...new Set(v.training_asset_ids)], v.training_purpose_id, v.training_basis, v.training_data_as_of,
    v.evaluation_reference, v.evaluation_summary, v.known_limitations, c.actor.actor_id]);
  await audit(c, 'ai_model_version.record', id);
  return view(c, await row(c, id));
}

export async function approveModelVersion(c: Context, id: string) {
  const r = await row(c, id, true);
  if (r.state !== 'DRAFT') refuse(409, 'state', 'only_a_draft_is_approved');
  if (r.recorded_by === c.actor.actor_id) refuse(409, 'approved_by', 'approver_must_differ_from_recorder');
  if ((await aiFlags(c, r.ai_system_id)).finding_open) refuse(409, 'ai_system_id', 'the_ai_use_has_an_open_finding');
  // DPDP purpose limitation: every dataset the model learned from must be mapped to an activity serving the training purpose.
  const unmapped: string[] = [];
  for (const asset of r.training_asset_ids as string[]) {
    const mapped = await c.tx.query(`SELECT 1 FROM app.graph_relationships a JOIN app.graph_relationships p ON p.tenant_id=a.tenant_id AND p.legal_entity_id=a.legal_entity_id AND p.environment_id=a.environment_id
        AND p.relationship_type='ACTIVITY_SERVES_PURPOSE' AND p.from_activity_id=a.to_activity_id AND p.to_purpose_id=$5 AND p.valid_to IS NULL
      WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.relationship_type='ASSET_PROCESSED_BY_ACTIVITY' AND a.from_asset_id=$4 AND a.valid_to IS NULL LIMIT 1`, [...scope(c), asset, r.training_purpose_id]);
    if (!mapped.rowCount) unmapped.push(asset);
  }
  if (unmapped.length) throw new AccessError(409, 'EPOCH_CONFLICT', [{ field: 'training_asset_ids', code: 'training_data_not_mapped_to_training_purpose' }, ...unmapped.slice(0, 30).map(a => ({ field: 'unmapped_asset_id', code: a }))]);
  await c.tx.query(`UPDATE app.ai_model_versions SET state='APPROVED', approved_by=$5, approved_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id]);
  await audit(c, 'ai_model_version.approve', id);
  return view(c, await row(c, id));
}

export async function deployModelVersion(c: Context, id: string) {
  const r = await row(c, id, true);
  if (r.state !== 'APPROVED') refuse(409, 'state', 'only_an_approved_version_is_deployed');
  if (!(await aiFlags(c, r.ai_system_id)).approved) refuse(409, 'ai_system_id', 'the_ai_use_is_not_currently_approved');
  const previous = (await c.tx.query(`SELECT id FROM app.ai_model_versions WHERE ${predicate} AND ai_system_id=$4 AND state='DEPLOYED' FOR UPDATE`, [...scope(c), r.ai_system_id])).rows[0];
  if (previous) await c.tx.query(`UPDATE app.ai_model_versions SET state='RETIRED', retired_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), previous.id]);
  await c.tx.query(`UPDATE app.ai_model_versions SET state='DEPLOYED', deployed_by=$5, deployed_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id, c.actor.actor_id]);
  await audit(c, 'ai_model_version.deploy', id);
  return view(c, await row(c, id));
}

export async function retireModelVersion(c: Context, id: string) {
  const r = await row(c, id, true);
  if (r.state === 'RETIRED') refuse(409, 'state', 'already_retired');
  await c.tx.query(`UPDATE app.ai_model_versions SET state='RETIRED', retired_at=clock_timestamp() WHERE ${predicate} AND id=$4`, [...scope(c), id]);
  await audit(c, 'ai_model_version.retire', id);
  return view(c, await row(c, id));
}

/** Deployed versions with consent withdrawn for their training purpose after their data cut-off. */
export async function modelsNeedingRetrainingReview(c: Context) {
  const rows = (await c.tx.query(`SELECT * FROM app.ai_model_versions WHERE ${predicate} AND state='DEPLOYED' LIMIT 200`, scope(c))).rows;
  const out: { id: string; ai_system_id: string; version_label: string; withdrawals: number }[] = [];
  for (const r of rows) { const n = await withdrawals(c, r.training_purpose_id, r.training_data_as_of); if (n > 0) out.push({ id: r.id, ai_system_id: r.ai_system_id, version_label: r.version_label, withdrawals: n }); }
  return out;
}
