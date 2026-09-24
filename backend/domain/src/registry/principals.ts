import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, exists, inForce, iso, packageAt, pageOf, predicate, recordEvidence, refuse, scope, type OperationsEnv, only } from '../operations/shared.ts';

/**
 * Data Principals and their relationship contexts (requirements s8).
 *
 * A person is a pseudonymous reference. Each organisational context (patient,
 * employee, customer...) is its own relationship row with its own dates and
 * evidence, so the contexts never blur into one "person record". Identities are
 * never merged on similarity; a merge is an explicit, audited, reversible act.
 */

/** The deterministic normalisation applied before a source key is digested. */
export const normaliseSourceKey = (value: string) => value.trim().toLowerCase();

export async function createPrincipalCategory(c: Context, input: unknown) {
  const value = R.PrincipalCategoryCreate.parse(input);
  const id = randomUUID();
  try {
    await c.tx.query(`INSERT INTO app.data_principal_categories(tenant_id,legal_entity_id,environment_id,id,name,description,regulatory_tags,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [...scope(c), id, value.name, value.description, value.regulatory_tags, c.actor.actor_id]);
  } catch (error) { if ((error as { code?: string }).code === '23505') refuse(409, 'name', 'category_exists'); throw error; }
  await audit(c, 'principal_category.create', id);
  return principalCategory(c, id);
}
async function principalCategory(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT * FROM app.data_principal_categories WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  return R.PrincipalCategory.parse({ id: row.id, name: row.name, description: row.description, regulatory_tags: row.regulatory_tags, active: row.active, recorded_at: iso(row.recorded_at) });
}
export async function principalCategoryList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.data_principal_categories WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => R.PrincipalCategory.parse({ id: r.id, name: r.name, description: r.description, regulatory_tags: r.regulatory_tags, active: r.active, recorded_at: iso(r.recorded_at) })), next_cursor: paged.next_cursor };
}
export async function createDataCategory(c: Context, input: unknown) {
  const value = R.DataCategoryCreate.parse(input);
  const id = randomUUID();
  try {
    await c.tx.query(`INSERT INTO app.personal_data_categories(tenant_id,legal_entity_id,environment_id,id,name,description,legacy_code,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`,
      [...scope(c), id, value.name, value.description, value.legacy_code, c.actor.actor_id]);
  } catch (error) { if ((error as { code?: string }).code === '23505') refuse(409, 'name', 'category_exists'); throw error; }
  await audit(c, 'data_category.create', id);
  return R.DataCategory.parse({ ...value, id, active: true, recorded_at: new Date().toISOString() });
}
export async function dataCategoryList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.personal_data_categories WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => R.DataCategory.parse({ id: r.id, name: r.name, description: r.description, legacy_code: r.legacy_code, active: r.active, recorded_at: iso(r.recorded_at) })), next_cursor: paged.next_cursor };
}

/** Inserts a subject reference; a key already held by another subject is refused, never merged. */
export async function addReference(c: Context, env: OperationsEnv, subjectId: string, reference: { system_id: string; target_reference: string; source_key: string | null }, provenance: Record<string, unknown>) {
  const digestValue = reference.source_key ? env.sourceKeyDigest(normaliseSourceKey(reference.source_key)) : null;
  const clash = (await c.tx.query(`SELECT subject_id FROM app.data_principal_references WHERE ${predicate} AND system_id=$4 AND (target_reference=$5 OR ($6::text IS NOT NULL AND source_key_digest=$6))`,
    [...scope(c), reference.system_id, reference.target_reference, digestValue])).rows[0];
  if (clash) return { inserted: false, existing_subject_id: clash.subject_id as string };
  await c.tx.query(`INSERT INTO app.data_principal_references(tenant_id,legal_entity_id,environment_id,id,subject_id,system_id,target_reference,source_key_digest,provenance) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [...scope(c), randomUUID(), subjectId, reference.system_id, reference.target_reference, digestValue, provenance]);
  return { inserted: true, existing_subject_id: null };
}

export async function createSubject(c: Context, env: OperationsEnv, input: unknown) {
  const value = R.SubjectCreate.parse(input);
  if (value.principal_id) {
    await exists(c, 'principal_references', value.principal_id, 'principal_id');
    if ((await c.tx.query(`SELECT 1 FROM app.data_principals WHERE ${predicate} AND principal_id=$4`, [...scope(c), value.principal_id])).rowCount) refuse(409, 'principal_id', 'principal_already_linked');
  }
  for (const ref of value.references) await exists(c, 'systems', ref.system_id, 'references.system_id');
  const id = randomUUID();
  const provenance = { source: 'OPERATOR', recorded_by: c.actor.actor_id, recorded_at: new Date().toISOString() };
  await c.tx.query(`INSERT INTO app.data_principals(tenant_id,legal_entity_id,environment_id,id,principal_id,provenance,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [...scope(c), id, value.principal_id, provenance, c.actor.actor_id]);
  for (const ref of value.references) {
    const result = await addReference(c, env, id, ref, provenance);
    if (!result.inserted) refuse(409, 'references', 'reference_held_by_another_data_principal');
  }
  await audit(c, 'data_principal.create', id);
  return subjectView(c, id);
}

type RelationshipRow = { id: string; subject_id: string; category_id: string; category_name: string; effective_from: Date | null; effective_to: Date | null; status: string;
  source_system_id: string | null; source_reference: string | null; evidence_state: string; evidence_reference: string | null; provenance: Record<string, unknown>; recorded_at: Date };
const relationshipView = (r: RelationshipRow) => R.Relationship.parse({ ...only(R.Relationship, r), effective_from: iso(r.effective_from), effective_to: iso(r.effective_to), recorded_at: iso(r.recorded_at) });
const RELATIONSHIPS = `SELECT r.*,k.name category_name FROM app.data_principal_relationships r JOIN app.data_principal_categories k
  ON k.tenant_id=r.tenant_id AND k.legal_entity_id=r.legal_entity_id AND k.environment_id=r.environment_id AND k.id=r.category_id`;

export async function subjectView(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT * FROM app.data_principals WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const refs = (await c.tx.query(`SELECT system_id,target_reference,source_key_digest FROM app.data_principal_references WHERE ${predicate} AND subject_id=$4 ORDER BY system_id,target_reference LIMIT 20`, [...scope(c), id])).rows;
  const relationships = (await c.tx.query(`${RELATIONSHIPS} WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.subject_id=$4 ORDER BY r.recorded_at LIMIT 50`, [...scope(c), id])).rows as RelationshipRow[];
  return R.Subject.parse({ id: row.id, principal_id: row.principal_id, status: row.status, merged_into: row.merged_into,
    references: refs.map(r => ({ system_id: r.system_id, target_reference: r.target_reference, has_source_key: r.source_key_digest !== null })),
    relationships: relationships.map(relationshipView), provenance: row.provenance, recorded_at: iso(row.recorded_at) });
}

export async function subjectList(c: Context, page: Page, query: unknown) {
  const q = (query ?? {}) as { category_id?: string; system_id?: string; target_reference?: string; principal_id?: string };
  const rows = (await c.tx.query(`SELECT p.id,p.principal_id,p.status,p.recorded_at,
      (SELECT count(*)::int FROM app.data_principal_relationships r WHERE r.tenant_id=p.tenant_id AND r.legal_entity_id=p.legal_entity_id AND r.environment_id=p.environment_id AND r.subject_id=p.id) relationship_count
    FROM app.data_principals p WHERE p.tenant_id=$1 AND p.legal_entity_id=$2 AND p.environment_id=$3
      AND ($4::uuid IS NULL OR EXISTS(SELECT 1 FROM app.data_principal_relationships r WHERE r.tenant_id=p.tenant_id AND r.legal_entity_id=p.legal_entity_id AND r.environment_id=p.environment_id AND r.subject_id=p.id AND r.category_id=$4))
      AND ($5::uuid IS NULL OR EXISTS(SELECT 1 FROM app.data_principal_references f WHERE f.tenant_id=p.tenant_id AND f.legal_entity_id=p.legal_entity_id AND f.environment_id=p.environment_id AND f.subject_id=p.id AND f.system_id=$5 AND ($6::text IS NULL OR f.target_reference=$6)))
      AND ($9::uuid IS NULL OR p.principal_id=$9)
      AND ($7::uuid IS NULL OR p.id>$7) ORDER BY p.id LIMIT $8`,
  [...scope(c), q.category_id ?? null, q.system_id ?? null, q.target_reference ?? null, page.cursor, page.limit + 1, q.principal_id ?? null])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => R.SubjectSummary.parse({ ...r, recorded_at: iso(r.recorded_at) })), next_cursor: paged.next_cursor };
}

/** Authorised linking of a further system key to an existing Data Principal. */
export async function addSubjectReference(c: Context, env: OperationsEnv, id: string, input: unknown) {
  const value = R.SubjectReferenceAdd.parse(input);
  const subject = (await c.tx.query(`SELECT status FROM app.data_principals WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!subject) refuse(404, 'id', 'not_found');
  if (subject.status === 'MERGED') refuse(409, 'id', 'subject_is_merged');
  await exists(c, 'systems', value.system_id, 'system_id');
  const result = await addReference(c, env, id, value, { source: 'OPERATOR', recorded_by: c.actor.actor_id, recorded_at: new Date().toISOString() });
  if (!result.inserted && result.existing_subject_id !== id) refuse(409, 'target_reference', 'reference_held_by_another_data_principal');
  await emit(c, 'data_principal_context_updated', 'data_principal', id, { reference_added: value.system_id });
  await audit(c, 'data_principal.reference_add', id);
  return subjectView(c, id);
}

/** An explicit merge decision. The merged reference is kept, marked, and can be unmerged. */
export async function mergeSubject(c: Context, id: string, input: unknown) {
  const value = R.SubjectMerge.parse(input);
  if (value.into_subject_id === id) refuse(400, 'into_subject_id', 'cannot_merge_into_itself');
  const rows = (await c.tx.query(`SELECT id,status FROM app.data_principals WHERE ${predicate} AND id=ANY($4::uuid[]) FOR UPDATE`, [...scope(c), [id, value.into_subject_id]])).rows;
  if (rows.length !== 2) refuse(404, 'id', 'not_found');
  if (rows.some(r => r.status !== 'ACTIVE')) refuse(409, 'status', 'both_must_be_active');
  await c.tx.query(`UPDATE app.data_principals SET status='MERGED',merged_into=$4 WHERE ${predicate} AND id=$5`, [...scope(c), value.into_subject_id, id]);
  await recordEvidence(c, { entity_kind: 'data_principal', entity_id: id, origin: 'OPERATOR', method: 'AUTHORISED_MERGE', content_digest: null, package_row_id: null, requirement_ids: [], summary: { into: value.into_subject_id, basis: value.basis }, fixture: false });
  await emit(c, 'data_principal_context_updated', 'data_principal', id, { merged_into: value.into_subject_id });
  await audit(c, 'data_principal.merge', id);
  return subjectView(c, id);
}
export async function unmergeSubject(c: Context, id: string, input: unknown) {
  const value = R.SubjectUnmerge.parse(input);
  const row = (await c.tx.query(`SELECT status,merged_into FROM app.data_principals WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status !== 'MERGED') refuse(409, 'status', 'not_merged');
  await c.tx.query(`UPDATE app.data_principals SET status='ACTIVE',merged_into=NULL WHERE ${predicate} AND id=$4`, [...scope(c), id]);
  await recordEvidence(c, { entity_kind: 'data_principal', entity_id: id, origin: 'OPERATOR', method: 'AUTHORISED_UNMERGE', content_digest: null, package_row_id: null, requirement_ids: [], summary: { was_merged_into: row.merged_into, reason: value.reason }, fixture: false });
  await emit(c, 'data_principal_context_updated', 'data_principal', id, { unmerged_from: row.merged_into });
  await audit(c, 'data_principal.unmerge', id);
  return subjectView(c, id);
}

export async function insertRelationship(c: Context, value: R.RelationshipCreateValue, provenance: Record<string, unknown>) {
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.data_principal_relationships(tenant_id,legal_entity_id,environment_id,id,subject_id,category_id,effective_from,effective_to,status,source_system_id,source_reference,evidence_state,evidence_reference,provenance,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
  [...scope(c), id, value.subject_id, value.category_id, value.effective_from, value.effective_to, value.status, value.source_system_id, value.source_reference, value.evidence_state, value.evidence_reference, provenance, c.actor.actor_id]);
  await emit(c, 'data_principal_context_created', 'data_principal_relationship', id, { subject_id: value.subject_id, category_id: value.category_id, status: value.status });
  return id;
}
export async function createRelationship(c: Context, input: unknown) {
  const value = R.RelationshipCreate.parse(input);
  const subject = (await c.tx.query(`SELECT status FROM app.data_principals WHERE ${predicate} AND id=$4`, [...scope(c), value.subject_id])).rows[0];
  if (!subject) refuse(404, 'subject_id', 'not_found');
  if (subject.status === 'MERGED') refuse(409, 'subject_id', 'subject_is_merged');
  await exists(c, 'data_principal_categories', value.category_id, 'category_id');
  await exists(c, 'systems', value.source_system_id, 'source_system_id');
  const id = await insertRelationship(c, value, { source: 'OPERATOR', recorded_by: c.actor.actor_id });
  await audit(c, 'relationship_context.create', id);
  return relationshipView((await c.tx.query(`${RELATIONSHIPS} WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.id=$4`, [...scope(c), id])).rows[0]);
}
export async function endRelationship(c: Context, id: string, input: unknown) {
  const value = R.RelationshipEnd.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.data_principal_relationships WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status === 'ENDED') refuse(409, 'status', 'already_ended');
  if (value.effective_to && row.effective_from && Date.parse(value.effective_to) < row.effective_from.getTime()) refuse(400, 'effective_to', 'before_start');
  // An end with no recorded date stays an end at an unknown time: it is never set to now.
  await c.tx.query(`UPDATE app.data_principal_relationships SET status='ENDED',effective_to=$4,evidence_reference=COALESCE($5,evidence_reference) WHERE ${predicate} AND id=$6`,
    [...scope(c), value.effective_to, value.evidence_reference, id]);
  await emit(c, 'data_principal_context_updated', 'data_principal_relationship', id, { status: 'ENDED', effective_to: value.effective_to, reason: value.reason });
  await audit(c, 'relationship_context.end', id);
  return relationshipView((await c.tx.query(`${RELATIONSHIPS} WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.id=$4`, [...scope(c), id])).rows[0]);
}

type RepresentativeRow = { id: string; subject_id: string; kind: string; representative_reference: string; authority_evidence_reference: string; mandate_id: string | null;
  effective_from: Date; effective_to: Date | null; verification: string; verified_at: Date | null; verified_by: string | null; restrictions: string[];
  activated_at: Date | null; activation_basis: string | null; recorded_at: Date; recorded_by: string };
const representativeView = (r: RepresentativeRow) => R.Representative.parse({ ...only(R.Representative, r), effective_from: iso(r.effective_from), effective_to: iso(r.effective_to), verified_at: iso(r.verified_at), activated_at: iso(r.activated_at), recorded_at: iso(r.recorded_at) });
async function representative(c: Context, id: string, lock = false) {
  const row = (await c.tx.query(`SELECT * FROM app.data_principal_representatives WHERE ${predicate} AND id=$4${lock ? ' FOR UPDATE' : ''}`, [...scope(c), id])).rows[0] as RepresentativeRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  return row;
}
export async function createRepresentative(c: Context, input: unknown) {
  const value = R.RepresentativeCreate.parse(input);
  const subject = (await c.tx.query(`SELECT principal_id FROM app.data_principals WHERE ${predicate} AND id=$4`, [...scope(c), value.subject_id])).rows[0];
  if (!subject) refuse(404, 'subject_id', 'not_found');
  // Where the person has a portal identity, the V1 mandate is the authority; this record must cite it.
  if (subject.principal_id && value.kind !== 'AUTHORISED_REPRESENTATIVE') {
    if (!value.mandate_id) refuse(400, 'mandate_id', 'portal_identity_requires_its_mandate');
    const mandate = (await c.tx.query(`SELECT kind,principal_id,state FROM app.representation_mandates WHERE ${predicate} AND id=$4`, [...scope(c), value.mandate_id])).rows[0];
    if (!mandate) refuse(404, 'mandate_id', 'not_found');
    if (mandate.principal_id !== subject.principal_id || mandate.kind !== (value.kind === 'NOMINEE' ? 'NOMINATION' : 'GUARDIAN') || mandate.state !== 'ACTIVE') refuse(409, 'mandate_id', 'mandate_does_not_match');
  }
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.data_principal_representatives(tenant_id,legal_entity_id,environment_id,id,subject_id,kind,representative_reference,authority_evidence_reference,mandate_id,effective_from,effective_to,restrictions,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
  [...scope(c), id, value.subject_id, value.kind, value.representative_reference, value.authority_evidence_reference, value.mandate_id, value.effective_from, value.effective_to, value.restrictions, c.actor.actor_id]);
  await audit(c, 'representative.create', id);
  return representativeView(await representative(c, id));
}
export async function representativeList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.data_principal_representatives WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(representativeView), next_cursor: paged.next_cursor };
}
export async function verifyRepresentative(c: Context, id: string, input: unknown) {
  const value = R.RepresentativeVerify.parse(input);
  const row = await representative(c, id, true);
  if (row.verification !== 'UNVERIFIED') refuse(409, 'verification', 'already_decided');
  if (row.recorded_by === c.actor.actor_id) throw new AccessError(403, 'FORBIDDEN', [{ field: 'verified_by', code: 'recorder_cannot_verify' }]);
  await c.tx.query(`UPDATE app.data_principal_representatives SET verification=$4,verified_at=clock_timestamp(),verified_by=$5,verification_evidence_reference=$6 WHERE ${predicate} AND id=$7`,
    [...scope(c), value.verification, c.actor.actor_id, value.evidence_reference, id]);
  await audit(c, 'representative.verify', id);
  return representativeView(await representative(c, id));
}
export async function activateNomination(c: Context, id: string, input: unknown) {
  const value = R.NominationActivate.parse(input);
  const row = await representative(c, id, true);
  if (row.kind !== 'NOMINEE') refuse(409, 'kind', 'only_a_nomination_is_activated');
  if (row.verification !== 'VERIFIED') refuse(409, 'verification', 'nomination_not_verified');
  if (row.activated_at) refuse(409, 'activated_at', 'already_activated');
  await c.tx.query(`UPDATE app.data_principal_representatives SET activated_at=clock_timestamp(),activation_basis=$4,activation_evidence_reference=$5 WHERE ${predicate} AND id=$6`,
    [...scope(c), value.basis, value.evidence_reference, id]);
  await audit(c, 'nomination.activate', id);
  return representativeView(await representative(c, id));
}

async function childStatusView(c: Context, row: Record<string, unknown> & { child_status: string; recorded_at: Date }) {
  const pkg = await packageAt(c, new Date());
  const restrictions = row.child_status === 'CHILD' || row.child_status === 'PERSON_WITH_DISABILITY_WITH_GUARDIAN'
    ? (pkg?.claims.requirements ?? []).filter(r => r.modules.includes('CHILDREN')).map(r => ({ requirement_id: r.requirement_id, statement: r.statement, legal_status: inForce(r, new Date()) ? 'APPLICABLE' : 'NOT_YET_IN_FORCE' }))
    : [];
  return R.ChildStatusView.parse({ subject_id: row.subject_id, child_status: row.child_status, basis: row.basis, evidence_reference: row.evidence_reference, guardian_id: row.guardian_id,
    verifiable_consent: row.verifiable_consent, verifiable_consent_evidence_reference: row.verifiable_consent_evidence_reference, id: row.id, recorded_at: iso(row.recorded_at), recorded_by: row.recorded_by, active_restrictions: restrictions });
}
export async function recordChildStatus(c: Context, input: unknown) {
  const value = R.ChildStatusRecord.parse(input);
  await exists(c, 'data_principals', value.subject_id, 'subject_id');
  if (value.child_status !== 'UNKNOWN' && value.evidence_reference === null) refuse(400, 'evidence_reference', 'status_requires_evidence');
  if (value.guardian_id) {
    const guardian = await representative(c, value.guardian_id);
    if (guardian.subject_id !== value.subject_id || guardian.kind !== 'GUARDIAN') refuse(409, 'guardian_id', 'not_this_subjects_guardian');
    if (value.verifiable_consent === 'ESTABLISHED' && guardian.verification !== 'VERIFIED') refuse(409, 'guardian_id', 'guardian_not_verified');
  }
  if (value.verifiable_consent === 'ESTABLISHED' && (!value.guardian_id || !value.verifiable_consent_evidence_reference)) refuse(400, 'verifiable_consent', 'established_consent_names_guardian_and_evidence');
  const id = randomUUID();
  const row = (await c.tx.query(`INSERT INTO app.child_status_records(tenant_id,legal_entity_id,environment_id,id,subject_id,child_status,basis,evidence_reference,guardian_id,verifiable_consent,verifiable_consent_evidence_reference,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
  [...scope(c), id, value.subject_id, value.child_status, value.basis, value.evidence_reference, value.guardian_id, value.verifiable_consent, value.verifiable_consent_evidence_reference, c.actor.actor_id])).rows[0];
  await audit(c, 'child_status.record', id);
  return childStatusView(c, row);
}
export async function childStatus(c: Context, subjectId: string) {
  const row = (await c.tx.query(`SELECT * FROM app.child_status_records WHERE ${predicate} AND subject_id=$4 ORDER BY recorded_at DESC LIMIT 1`, [...scope(c), subjectId])).rows[0];
  if (!row) refuse(404, 'subject_id', 'no_child_status_recorded');
  return childStatusView(c, row);
}

/** Each relationship context with the processing, consent and holds that belong to it. */
export async function subjectProcessing(c: Context, id: string) {
  await exists(c, 'data_principals', id, 'id');
  const s = scope(c);
  const now = new Date();
  const relationships = (await c.tx.query(`${RELATIONSHIPS} WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND r.subject_id=$4 ORDER BY r.recorded_at LIMIT 20`, [...s, id])).rows as RelationshipRow[];
  const subjectHolds = (await c.tx.query(`SELECT id,activity_id FROM app.retention_holds WHERE ${predicate} AND state='ACTIVE' AND (subject_id=$4 OR activity_id IS NOT NULL)`, [...s, id])).rows;
  const contexts = [];
  for (const rel of relationships) {
    const activities = (await c.tx.query(`SELECT a.id activity_id,a.name,v.purpose_version_id,pc.code condition_code,COALESCE(pc.unresolved,true) condition_unresolved,
        ARRAY(SELECT l2.system_id FROM app.registry_activity_links l2 WHERE l2.tenant_id=a.tenant_id AND l2.legal_entity_id=a.legal_entity_id AND l2.environment_id=a.environment_id AND l2.activity_id=a.id AND l2.link_kind='SYSTEM' AND l2.valid_to IS NULL) system_ids
      FROM app.registry_activity_links l JOIN app.registry_activities a ON a.tenant_id=l.tenant_id AND a.legal_entity_id=l.legal_entity_id AND a.environment_id=l.environment_id AND a.id=l.activity_id
      JOIN app.registry_activity_versions v ON v.tenant_id=a.tenant_id AND v.legal_entity_id=a.legal_entity_id AND v.environment_id=a.environment_id AND v.activity_id=a.id AND v.status='CURRENT'
      LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
      WHERE l.tenant_id=$1 AND l.legal_entity_id=$2 AND l.environment_id=$3 AND l.link_kind='PRINCIPAL_CATEGORY' AND l.principal_category_id=$4 AND l.valid_from<=$5 AND (l.valid_to IS NULL OR l.valid_to>$5) LIMIT 50`,
    [...s, rel.category_id, now])).rows;
    const activityIds = activities.map(a => a.activity_id);
    const consent = (await c.tx.query(`SELECT id record_id,activity_id,current_status status FROM app.consent_records WHERE ${predicate} AND subject_id=$4 AND activity_id=ANY($5::uuid[]) AND (relationship_id IS NULL OR relationship_id=$6) LIMIT 50`,
      [...s, id, activityIds, rel.id])).rows;
    contexts.push({ relationship_id: rel.id, category_id: rel.category_id, category_name: rel.category_name, status: rel.status, activities, consent,
      active_hold_ids: subjectHolds.filter(h => h.activity_id === null || activityIds.includes(h.activity_id)).map(h => h.id) });
  }
  return R.SubjectProcessing.parse({ subject_id: id, as_of: now.toISOString(), contexts });
}

