import type pg from 'pg';
import { randomUUID } from 'node:crypto';
import { AccessError } from '../../../authorization/src/index.ts';
import { predicate, scopeValues, type Context } from '../shared/transaction.ts';

/** Helpers shared by the regulatory core, the registry and the operational workflows. */

export const iso = (value: Date | string | null | undefined) => value === null || value === undefined ? null : new Date(value).toISOString();
export const scope = (c: Context) => scopeValues(c.actor);
export { predicate };

/** A refusal that names the field and the reason, so a caller can act on it. */
export function refuse(status: 400 | 404 | 409, field: string, code: string): never {
  throw new AccessError(status, status === 400 ? 'VALIDATION_ERROR' : status === 404 ? 'NOT_FOUND' : 'EPOCH_CONFLICT', [{ field, code }]);
}

export type OperationalEventType =
  'data_principal_context_created' | 'data_principal_context_updated' | 'processing_activity_created' | 'processing_activity_updated' | 'purpose_changed'
  | 'notice_version_published' | 'consent_granted' | 'consent_withdrawn' | 'consent_changed' | 'rights_request_received' | 'rights_request_updated' | 'rights_request_closed'
  | 'retention_trigger_reached' | 'erasure_action_requested' | 'erasure_action_executed' | 'erasure_action_verified' | 'erasure_action_failed' | 'processor_relationship_changed'
  | 'personal_data_breach_created' | 'personal_data_breach_updated' | 'regulatory_package_imported' | 'regulatory_package_activated' | 'requirement_applicability_changed'
  | 'verification_failed' | 'evidence_recorded' | 'sdf_status_changed' | 'bulk_job_completed';

/** The event model: every state change that other work reacts to is appended here. */
export async function emit(c: Context, type: OperationalEventType, subjectKind: string, subjectId: string | null, payload: Record<string, unknown>, correlationId: string | null = null) {
  await c.tx.query(`INSERT INTO app.operational_events(tenant_id,legal_entity_id,environment_id,id,event_type,subject_kind,subject_id,payload,actor_id,correlation_id)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [...scope(c), randomUUID(), type, subjectKind, subjectId, payload, c.actor.actor_id, correlationId]);
}

export type EvidenceInput = {
  entity_kind: string; entity_id: string; origin: 'SYSTEM' | 'CONNECTOR' | 'OPERATOR' | 'IMPORT' | 'REGULATORY_PACKAGE'; method: string;
  content_digest: string | null; package_row_id: string | null; requirement_ids: string[]; summary: Record<string, unknown>; fixture: boolean; supersedes?: string | null;
};
/** Evidence is appended with its origin, method, actor and integrity reference, and is never edited. */
export async function recordEvidence(c: Context, value: EvidenceInput) {
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.evidence_records(tenant_id,legal_entity_id,environment_id,id,entity_kind,entity_id,origin,method,actor_id,content_digest,integrity_state,package_row_id,requirement_ids,summary,supersedes,fixture)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
  [...scope(c), id, value.entity_kind, value.entity_id, value.origin, value.method, c.actor.actor_id, value.content_digest,
    value.content_digest ? 'DIGEST_RECORDED' : 'NO_CONTROLLED_BYTES', value.package_row_id, value.requirement_ids, value.summary, value.supersedes ?? null, value.fixture]);
  await emit(c, 'evidence_recorded', value.entity_kind, value.entity_id, { evidence_id: id, method: value.method });
  return id;
}

export type PackageRow = {
  id: string; package_id: string; version: string; previous_version: string | null; distribution: 'PRODUCTION' | 'TEST_FIXTURE';
  effective_from: Date; signing_key_id: string; signature: string; package_digest: string; claims: Record<string, unknown> & { requirements: RequirementClaim[]; condition_vocabulary: { code: string; label: string; requirement_ids: string[] }[]; open_verification_items: string[]; sources: { source_id: string; verification: string }[] };
  diff: { compared_with_version: string | null; added: unknown[]; changed: unknown[]; removed: unknown[] };
  state: 'IMPORTED' | 'APPROVED' | 'REJECTED'; imported_at: Date; imported_by: string; decided_at: Date | null; decided_by: string | null; decision_note: string | null;
};
export type RequirementClaim = {
  requirement_id: string; version: number; title: string; provision_ids: string[]; statement: string; applicability: unknown; evidence_expectations: string[];
  modules: string[]; timer: { kind: 'NONE' } | { kind: 'WITHOUT_DELAY'; runs_from: string } | { kind: 'HOURS'; runs_from: string; hours: number };
  breach_task_kind: string | null; sdf_obligation_kind: string | null; rights_timer_scope: string[]; effective_from: string; test_refs: string[];
};

const versionOrder = `string_to_array(version,'.')::numeric[]`;
/**
 * The package in force at a moment: the approved package with the latest
 * effective date not after that moment. It is always computed, never a stored
 * flag, so a later package cannot rewrite which one governed an earlier moment.
 */
export async function packageAt(c: Context, at: Date | string): Promise<PackageRow | null> {
  const rows = (await c.tx.query(`SELECT * FROM app.regulatory_packages WHERE ${predicate} AND state='APPROVED' AND effective_from<=$4
    ORDER BY effective_from DESC,${versionOrder} DESC LIMIT 1`, [...scope(c), new Date(at)])).rows;
  return (rows[0] as PackageRow | undefined) ?? null;
}
/** Material workflow runs are pinned to a package; without one the run is refused. */
export async function requirePackage(c: Context, at: Date | string = new Date()) {
  const row = await packageAt(c, at);
  if (!row) refuse(409, 'regulatory_package', 'no_active_regulatory_package');
  return row;
}
export async function packageById(c: Context, id: string): Promise<PackageRow> {
  const row = (await c.tx.query(`SELECT * FROM app.regulatory_packages WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'package_id', 'not_found');
  return row as PackageRow;
}
/** In force means the package's requirement effective date has been reached. */
export function inForce(requirement: Pick<RequirementClaim, 'effective_from'>, at: Date | string) {
  return Date.parse(requirement.effective_from + 'T00:00:00.000Z') <= new Date(at).getTime();
}
export function packageSummary(row: PackageRow) { return { id: row.id, version: row.version, distribution: row.distribution }; }

/** Keyset paging used by every list in this extension. */
export function pageOf<T>(rows: T[], limit: number, key: (row: T) => string) {
  const items = rows.slice(0, limit);
  return { items, next_cursor: rows.length > limit && items.length ? Buffer.from(key(items.at(-1)!)).toString('base64url') : null };
}
export async function exists(c: Context, table: string, id: string | null, field: string) {
  if (id === null) return;
  const found = await c.tx.query(`SELECT 1 FROM app.${table} WHERE ${predicate} AND id=$4`, [...scope(c), id]);
  if (!found.rowCount) refuse(404, field, 'not_found');
}

/** Runtime collaborators the API layer supplies: keyed digests and the connector target pools. */
export type OperationsEnv = {
  /** Keyed digest of a normalised source identifier. The raw identifier is never stored. */
  sourceKeyDigest(value: string): string;
  targets: { agent: pg.Pool; observer: pg.Pool } | null;
};

/** Only the fields a response schema declares, so a strict contract never sees tenancy or audit columns. */
export function only(schema: { shape: Record<string, unknown> }, row: Record<string, unknown>) {
  return Object.fromEntries(Object.keys(schema.shape).filter(k => k in row).map(k => [k, row[k]]));
}
