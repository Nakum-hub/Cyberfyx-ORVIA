import { randomUUID, verify } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { RegulatoryPackageDecision, RegulatoryPackageImport, ImpactReview, type RegulatoryPackageClaimsValue } from '../../../../shared/contracts/src/regulatory.ts';
import { canonicalJson, digest } from '../../../../shared/contracts/src/crypto.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { trustedRelease } from '../updates/updates.ts';
import { emit, inForce, iso, packageAt, packageById, pageOf, predicate, recordEvidence, refuse, scope, type PackageRow, type RequirementClaim, only } from '../operations/shared.ts';

/**
 * Regulatory packages (regulatory/DPDP_REGULATORY_CORE.md s11-s13).
 *
 * A package arrives through the same trust as a release: an Ed25519 signature by
 * the installation's configured vendor release key over the canonical claims.
 * Importing is not activating. A second person approves it, and it governs only
 * from its effective date; historical runs stay pinned to whatever governed then.
 */
function rejectPackage(reason: string): never { throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'package', code: reason }]); }

export function packageView(row: PackageRow, activeId: string | null) {
  const claims = row.claims;
  return S.schemas.RegulatoryPackage.parse({
    id: row.id, package_id: row.package_id, version: row.version, previous_version: row.previous_version, distribution: row.distribution,
    effective_from: iso(row.effective_from), state: row.state, active: row.id === activeId, package_digest: row.package_digest,
    imported_at: iso(row.imported_at), imported_by: row.imported_by, decided_at: iso(row.decided_at), decided_by: row.decided_by, decision_note: row.decision_note,
    source_count: claims.sources.length, requirement_count: claims.requirements.length,
    unverified_source_ids: claims.sources.filter(s => s.verification !== 'ARTIFACT_HASHED').map(s => s.source_id),
    open_verification_items: claims.open_verification_items, diff: row.diff,
  });
}

/** Requirement-level diff: what was added, what changed version and what was removed. */
export function diffRequirements(previous: RequirementClaim[] | null, next: RequirementClaim[], comparedWith: string | null) {
  const before = new Map((previous ?? []).map(r => [r.requirement_id, r]));
  const after = new Map(next.map(r => [r.requirement_id, r]));
  const changed = [], added = [], removed = [];
  for (const [id, requirement] of after) {
    const old = before.get(id);
    if (!old) added.push({ requirement_id: id, from_version: null, to_version: requirement.version });
    else if (old.version !== requirement.version || digest(old) !== digest(requirement)) changed.push({ requirement_id: id, from_version: old.version, to_version: requirement.version });
  }
  for (const [id, requirement] of before) if (!after.has(id)) removed.push({ requirement_id: id, from_version: requirement.version, to_version: null });
  return { compared_with_version: comparedWith, added, changed, removed };
}

const MODULE_IMPACT: Record<string, string> = {
  NOTICES: 'NOTICE', CONSENT: 'CONSENT', CONDITIONS: 'CONDITION', RIGHTS: 'RIGHTS', GRIEVANCE: 'RIGHTS', RETENTION: 'RETENTION', PROCESSORS: 'PROCESSOR',
  SAFEGUARDS: 'SAFEGUARD', BREACH: 'BREACH', CHILDREN: 'CHILD', SDF: 'SDF', TRANSFERS: 'ORGANISATION', CONTACT: 'ORGANISATION',
};

/**
 * s13 impact analysis. For each changed requirement, the customer configuration
 * it touches is found from recorded registry facts. Where the facts needed to
 * decide are missing, an UNRESOLVED item is created instead of assuming.
 */
async function computeImpacts(c: Context, packageRowId: string, requirementId: string, change: 'ADDED' | 'CHANGED' | 'REMOVED', modules: string[]) {
  const items: { kind: string; id: string | null; reason: string }[] = [];
  const s = scope(c);
  for (const module of modules) {
    const kind = MODULE_IMPACT[module] ?? 'ORGANISATION';
    if (module === 'CONSENT' || module === 'NOTICES' || module === 'CONDITIONS') {
      const rows = (await c.tx.query(`SELECT a.id FROM app.registry_activities a JOIN app.registry_activity_versions v ON v.tenant_id=a.tenant_id AND v.legal_entity_id=a.legal_entity_id AND v.environment_id=a.environment_id AND v.activity_id=a.id AND v.status='CURRENT'
        LEFT JOIN app.processing_conditions pc ON pc.tenant_id=v.tenant_id AND pc.legal_entity_id=v.legal_entity_id AND pc.environment_id=v.environment_id AND pc.id=v.condition_id
        WHERE a.tenant_id=$1 AND a.legal_entity_id=$2 AND a.environment_id=$3 AND a.status='ACTIVE' AND ($4=ANY(v.requirement_ids) OR pc.code='CONSENT' OR pc.id IS NULL OR pc.unresolved) LIMIT 50`, [...s, requirementId])).rows;
      for (const row of rows) items.push({ kind: 'ACTIVITY', id: row.id, reason: `Activity processing may be governed by ${requirementId} (${module.toLowerCase()}).` });
      if (module === 'NOTICES') for (const row of (await c.tx.query(`SELECT id FROM app.registry_notice_versions WHERE ${predicate} AND status='PUBLISHED' LIMIT 50`, s)).rows)
        items.push({ kind: 'NOTICE', id: row.id, reason: `Published notice content must be reviewed against ${requirementId}.` });
    } else if (module === 'RETENTION') {
      for (const row of (await c.tx.query(`SELECT id FROM app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND (requirement_id=$4 OR requirement_id IS NULL) LIMIT 50`, [...s, requirementId])).rows)
        items.push({ kind, id: row.id, reason: `Retention rule must be reviewed against ${requirementId}.` });
    } else if (module === 'PROCESSORS') {
      for (const row of (await c.tx.query(`SELECT id FROM app.processor_engagements WHERE ${predicate} AND status='ACTIVE' LIMIT 50`, s)).rows)
        items.push({ kind, id: row.id, reason: `Processor engagement obligations may change under ${requirementId}.` });
    } else if (module === 'BREACH') {
      for (const row of (await c.tx.query(`SELECT b.incident_id id FROM app.personal_data_breaches b JOIN app.incidents i ON i.tenant_id=b.tenant_id AND i.legal_entity_id=b.legal_entity_id AND i.environment_id=b.environment_id AND i.id=b.incident_id
        WHERE b.tenant_id=$1 AND b.legal_entity_id=$2 AND b.environment_id=$3 AND i.state<>'CLOSED' LIMIT 50`, s)).rows)
        items.push({ kind, id: row.id, reason: `Open breach stays pinned to its original package; review whether ${requirementId} changes future handling.` });
    } else if (module === 'SDF') {
      const profile = (await c.tx.query(`SELECT id,sdf_status FROM app.organisation_profile_versions WHERE ${predicate} ORDER BY version DESC LIMIT 1`, s)).rows[0];
      if (!profile || profile.sdf_status === 'UNKNOWN') items.push({ kind: 'UNRESOLVED', id: null, reason: `SDF status is not recorded, so the effect of ${requirementId} cannot be determined.` });
      else if (profile.sdf_status === 'DESIGNATED') items.push({ kind, id: profile.id, reason: `The organisation is a recorded SDF; ${requirementId} affects its obligations.` });
    } else if (module === 'CHILDREN') {
      for (const row of (await c.tx.query(`SELECT id,processes_child_data FROM app.registry_activities WHERE ${predicate} AND status='ACTIVE' AND processes_child_data<>'NO' LIMIT 50`, s)).rows)
        items.push(row.processes_child_data === 'YES' ? { kind: 'CHILD', id: row.id, reason: `Activity processes children's data; ${requirementId} applies to it.` }
          : { kind: 'UNRESOLVED', id: row.id, reason: `Whether this activity processes children's data is not recorded, so ${requirementId} cannot be decided for it.` });
    } else items.push({ kind, id: null, reason: `${requirementId} affects organisation-wide ${module.toLowerCase()} configuration.` });
  }
  if (!items.length) items.push({ kind: 'ORGANISATION', id: null, reason: `${requirementId} ${change.toLowerCase()}; no recorded configuration was found to be affected.` });
  for (const item of items) await c.tx.query(`INSERT INTO app.regulatory_impacts(tenant_id,legal_entity_id,environment_id,id,package_row_id,requirement_id,change,affected_kind,affected_id,reason)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [...s, randomUUID(), packageRowId, requirementId, change, item.kind, item.id, item.reason]);
  return items.length;
}

export async function importPackage(c: Context, input: unknown) {
  const value = RegulatoryPackageImport.parse(input);
  const claims = value.package.claims as RegulatoryPackageClaimsValue;
  const signer = trustedRelease();
  if (!signer) throw new AccessError(503, 'SERVICE_UNAVAILABLE');
  if (value.package.signing_key_id !== signer.keyId) rejectPackage('untrusted_origin');
  let valid = false;
  try { valid = verify(null, Buffer.from(canonicalJson(claims)), signer.key, Buffer.from(value.package.signature, 'base64url')); } catch { rejectPackage('malformed'); }
  if (!valid) rejectPackage('invalid_signature');
  const s = scope(c);
  const packageDigest = digest(claims);
  if ((await c.tx.query(`SELECT 1 FROM app.regulatory_packages WHERE ${predicate} AND (version=$4 OR package_digest=$5)`, [...s, claims.version, packageDigest])).rowCount) rejectPackage('replayed');
  const previous = claims.previous_version
    ? (await c.tx.query(`SELECT * FROM app.regulatory_packages WHERE ${predicate} AND version=$4`, [...s, claims.previous_version])).rows[0] as PackageRow | undefined
    : await packageAt(c, new Date(8.64e15));
  if (claims.previous_version && !previous) rejectPackage('previous_version_not_imported');
  const diff = diffRequirements(previous?.claims.requirements ?? null, claims.requirements as RequirementClaim[], previous?.version ?? null);
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.regulatory_packages(tenant_id,legal_entity_id,environment_id,id,package_id,version,previous_version,distribution,effective_from,signing_key_id,signature,package_digest,claims,diff,imported_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
  [...s, id, claims.package_id, claims.version, claims.previous_version, claims.distribution, claims.effective_from, value.package.signing_key_id, value.package.signature, packageDigest, claims, diff, c.actor.actor_id]);
  for (const source of claims.sources) await c.tx.query(`INSERT INTO app.regulatory_sources(tenant_id,legal_entity_id,environment_id,package_row_id,source_id,source_type,publisher,title,official_url,notification_reference,publication_date,artifact_digest,retrieved_at,verification,supersedes,corrects)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
  [...s, id, source.source_id, source.source_type, source.publisher, source.title, source.official_url, source.notification_reference, source.publication_date, source.artifact_digest, source.retrieved_at, source.verification, source.supersedes, source.corrects]);
  for (const p of claims.provisions) await c.tx.query(`INSERT INTO app.regulatory_provisions(tenant_id,legal_entity_id,environment_id,package_row_id,provision_id,source_id,reference,version,published_on,commences_on,status,commencement_basis,text_digest)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`, [...s, id, p.provision_id, p.source_id, p.reference, p.version, p.published_on, p.commences_on, p.status, p.commencement_basis, p.text_digest]);
  for (const r of claims.requirements) await c.tx.query(`INSERT INTO app.regulatory_requirements(tenant_id,legal_entity_id,environment_id,package_row_id,requirement_id,version,title,provision_ids,effective_from,modules,document)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`, [...s, id, r.requirement_id, r.version, r.title, r.provision_ids, r.effective_from, r.modules, r]);
  const byId = new Map((claims.requirements as RequirementClaim[]).map(r => [r.requirement_id, r]));
  const previousById = new Map((previous?.claims.requirements ?? []).map(r => [r.requirement_id, r]));
  let impacts = 0;
  for (const change of ['added', 'changed', 'removed'] as const) for (const item of diff[change]) {
    const requirement = byId.get(item.requirement_id) ?? previousById.get(item.requirement_id)!;
    impacts += await computeImpacts(c, id, item.requirement_id, change.toUpperCase() as 'ADDED', requirement.modules);
  }
  await recordEvidence(c, { entity_kind: 'regulatory_package', entity_id: id, origin: 'REGULATORY_PACKAGE', method: 'SIGNED_PACKAGE_IMPORT', content_digest: packageDigest,
    package_row_id: id, requirement_ids: [], summary: { version: claims.version, distribution: claims.distribution, sources: claims.sources.map(x => ({ source_id: x.source_id, artifact_digest: x.artifact_digest, verification: x.verification })), impacts }, fixture: claims.distribution === 'TEST_FIXTURE' });
  await emit(c, 'regulatory_package_imported', 'regulatory_package', id, { version: claims.version, distribution: claims.distribution, added: diff.added.length, changed: diff.changed.length, removed: diff.removed.length });
  await audit(c, 'regulatory_package.import', id);
  const active = await packageAt(c, new Date());
  return packageView(await packageById(c, id), active?.id ?? null);
}

export async function decidePackage(c: Context, id: string, input: unknown) {
  const value = RegulatoryPackageDecision.parse(input);
  const row = await packageById(c, id);
  if (row.state !== 'IMPORTED') refuse(409, 'state', 'already_decided');
  if (row.imported_by === c.actor.actor_id) throw new AccessError(403, 'FORBIDDEN', [{ field: 'decided_by', code: 'importer_cannot_decide' }]);
  if (value.decision === 'APPROVED' && row.claims.open_verification_items.length && !value.acknowledged_open_verification_items) refuse(409, 'acknowledged_open_verification_items', 'open_verification_items_not_acknowledged');
  await c.tx.query(`UPDATE app.regulatory_packages SET state=$4,decided_at=clock_timestamp(),decided_by=$5,decision_note=$6 WHERE ${predicate} AND id=$7`,
    [...scope(c), value.decision, c.actor.actor_id, value.note, id]);
  if (value.decision === 'APPROVED') await emit(c, 'regulatory_package_activated', 'regulatory_package', id, { version: row.version, effective_from: iso(row.effective_from) });
  await recordEvidence(c, { entity_kind: 'regulatory_package', entity_id: id, origin: 'OPERATOR', method: 'PACKAGE_DECISION', content_digest: digest({ package_digest: row.package_digest, decision: value.decision }),
    package_row_id: id, requirement_ids: [], summary: { decision: value.decision, note: value.note, acknowledged_open_verification_items: value.acknowledged_open_verification_items }, fixture: row.distribution === 'TEST_FIXTURE' });
  await audit(c, 'regulatory_package.' + value.decision.toLowerCase(), id);
  const active = await packageAt(c, new Date());
  return packageView(await packageById(c, id), active?.id ?? null);
}

export async function packageList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.regulatory_packages WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows as PackageRow[];
  const active = await packageAt(c, new Date());
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(r => packageView(r, active?.id ?? null)), next_cursor: paged.next_cursor };
}

export async function packageDetail(c: Context, id: string) {
  const row = await packageById(c, id);
  const active = await packageAt(c, new Date());
  const now = new Date();
  const claims = row.claims as unknown as RegulatoryPackageClaimsValue;
  return S.schemas.RegulatoryPackageDetail.parse({
    package: packageView(row, active?.id ?? null), sources: claims.sources, provisions: claims.provisions,
    requirements: claims.requirements.map(r => ({ ...r, in_force_now: inForce(r, now), legal_status_now: inForce(r, now) ? 'IN_FORCE' : 'NOT_YET_IN_FORCE' })),
    condition_vocabulary: claims.condition_vocabulary, release_notes: claims.release_notes,
  });
}

export async function activePackage(c: Context, query: unknown) {
  const asOf = (query as { as_of?: string } | undefined)?.as_of ? new Date((query as { as_of: string }).as_of) : new Date();
  const row = await packageAt(c, asOf);
  return S.schemas.ActivePackage.parse({ as_of: asOf.toISOString(), package: row ? packageView(row, row.id) : null,
    reason: row ? `Approved package ${row.version} is the latest in effect at this time.` : 'No approved regulatory package is in effect at this time; material workflows are refused until one is.' });
}

type ImpactRow = { id: string; package_row_id: string; requirement_id: string; change: string; affected_kind: string; affected_id: string | null; reason: string; state: string; reviewed_at: Date | null; reviewed_by: string | null; review_note: string | null; created_at: Date };
const impactView = (r: ImpactRow) => S.schemas.RegulatoryImpact.parse({ ...only(S.schemas.RegulatoryImpact, r), reviewed_at: iso(r.reviewed_at), created_at: iso(r.created_at) });
export async function impactList(c: Context, page: Page, query: unknown) {
  const packageRowId = (query as { package_row_id?: string } | undefined)?.package_row_id ?? null;
  const rows = (await c.tx.query(`SELECT * FROM app.regulatory_impacts WHERE ${predicate} AND ($4::uuid IS NULL OR package_row_id=$4) AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`,
    [...scope(c), packageRowId, page.cursor, page.limit + 1])).rows as ImpactRow[];
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(impactView), next_cursor: paged.next_cursor };
}
export async function reviewImpact(c: Context, id: string, input: unknown) {
  const value = ImpactReview.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.regulatory_impacts WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0] as ImpactRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  if (row.state !== 'OPEN') refuse(409, 'state', 'already_reviewed');
  const updated = (await c.tx.query(`UPDATE app.regulatory_impacts SET state=$4,reviewed_at=clock_timestamp(),reviewed_by=$5,review_note=$6 WHERE ${predicate} AND id=$7 RETURNING *`,
    [...scope(c), value.state, c.actor.actor_id, value.note, id])).rows[0] as ImpactRow;
  await audit(c, 'regulatory_impact.review', id);
  return impactView(updated);
}
