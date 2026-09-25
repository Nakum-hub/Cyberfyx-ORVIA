import { randomUUID } from 'node:crypto';
import * as R from '../../../../shared/contracts/src/registry.ts';
import * as O from '../../../../shared/contracts/src/operations.ts';
import { digest } from '../../../../shared/contracts/src/crypto.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { emit, exists, iso, pageOf, predicate, refuse, scope, only } from '../operations/shared.ts';

/**
 * Notice operations (requirements s11). A version's content is fixed once
 * recorded; publication sets its effective date and supersedes the previous
 * version for the same locale, closing that one's period at the same instant.
 * The question "which notice applied at time T" is answered from those periods.
 */

type VersionRow = { id: string; notice_id: string; version: number; locale: string; title: string; content: string; content_digest: string; purpose_version_ids: string[]; data_category_ids: string[];
  channels: R.RegistryNoticeVersionValue['channels']; template_reference: string | null; v1_notice_version_id: string | null; status: string; effective_from: Date | null; effective_to: Date | null;
  published_at: Date | null; superseded_by: string | null; recorded_at: Date };
const versionView = (v: VersionRow) => R.RegistryNoticeVersion.parse({ id: v.id, notice_id: v.notice_id, version: v.version, locale: v.locale, title: v.title, content: v.content, content_digest: v.content_digest,
  purpose_version_ids: v.purpose_version_ids, data_category_ids: v.data_category_ids, channels: v.channels, template_reference: v.template_reference, v1_notice_version_id: v.v1_notice_version_id,
  status: v.status, effective_from: iso(v.effective_from), effective_to: iso(v.effective_to), published_at: iso(v.published_at), superseded_by: v.superseded_by, recorded_at: iso(v.recorded_at) });

async function noticeView(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT * FROM app.registry_notices WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  const versions = (await c.tx.query(`SELECT * FROM app.registry_notice_versions WHERE ${predicate} AND notice_id=$4 ORDER BY locale,version LIMIT 100`, [...scope(c), id])).rows as VersionRow[];
  return R.RegistryNotice.parse({ id: row.id, name: row.name, audience_category_ids: row.audience_category_ids, versions: versions.map(versionView) });
}

export async function createNotice(c: Context, input: unknown) {
  const value = R.RegistryNoticeCreate.parse(input);
  for (const category of value.audience_category_ids) await exists(c, 'data_principal_categories', category, 'audience_category_ids');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.registry_notices(tenant_id,legal_entity_id,environment_id,id,name,audience_category_ids,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7)`,
    [...scope(c), id, value.name, value.audience_category_ids, c.actor.actor_id]);
  await audit(c, 'registry_notice.create', id);
  return noticeView(c, id);
}

export async function createNoticeVersion(c: Context, id: string, input: unknown) {
  const value = R.RegistryNoticeVersionCreate.parse(input);
  await exists(c, 'registry_notices', id, 'id');
  for (const purpose of value.purpose_version_ids) await exists(c, 'registry_purpose_versions', purpose, 'purpose_version_ids');
  for (const category of value.data_category_ids) await exists(c, 'personal_data_categories', category, 'data_category_ids');
  if (value.v1_notice_version_id && !(await c.tx.query(`SELECT 1 FROM app.notice_versions WHERE ${predicate} AND version_id=$4`, [...scope(c), value.v1_notice_version_id])).rowCount) refuse(404, 'v1_notice_version_id', 'not_found');
  const next = Number((await c.tx.query(`SELECT COALESCE(max(version),0)+1 n FROM app.registry_notice_versions WHERE ${predicate} AND notice_id=$4 AND locale=$5`, [...scope(c), id, value.locale])).rows[0].n);
  const contentDigest = digest({ locale: value.locale, title: value.title, content: value.content, channels: value.channels, purpose_version_ids: value.purpose_version_ids, data_category_ids: value.data_category_ids });
  await c.tx.query(`INSERT INTO app.registry_notice_versions(tenant_id,legal_entity_id,environment_id,id,notice_id,version,locale,title,content,content_digest,purpose_version_ids,data_category_ids,channels,template_reference,v1_notice_version_id,status,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'DRAFT',$16)`,
  [...scope(c), randomUUID(), id, next, value.locale, value.title, value.content, contentDigest, value.purpose_version_ids, value.data_category_ids, value.channels, value.template_reference, value.v1_notice_version_id, c.actor.actor_id]);
  await audit(c, 'registry_notice.version', id);
  return noticeView(c, id);
}

export async function publishNoticeVersion(c: Context, versionId: string, input: unknown) {
  const value = R.NoticePublish.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.registry_notice_versions WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), versionId])).rows[0] as VersionRow | undefined;
  if (!row) refuse(404, 'id', 'not_found');
  if (row.status !== 'DRAFT') refuse(409, 'status', 'only_a_draft_is_published');
  const previous = (await c.tx.query(`SELECT * FROM app.registry_notice_versions WHERE ${predicate} AND notice_id=$4 AND locale=$5 AND status='PUBLISHED' FOR UPDATE`, [...scope(c), row.notice_id, row.locale])).rows[0] as VersionRow | undefined;
  if (previous) {
    if (Date.parse(value.effective_from) <= previous.effective_from!.getTime()) refuse(400, 'effective_from', 'must_follow_the_version_it_supersedes');
    await c.tx.query(`UPDATE app.registry_notice_versions SET status='SUPERSEDED',superseded_by=$4,effective_to=$5 WHERE ${predicate} AND id=$6`, [...scope(c), versionId, value.effective_from, previous.id]);
  }
  await c.tx.query(`UPDATE app.registry_notice_versions SET status='PUBLISHED',published_at=clock_timestamp(),published_by=$4,effective_from=$5 WHERE ${predicate} AND id=$6`,
    [...scope(c), c.actor.actor_id, value.effective_from, versionId]);
  await emit(c, 'notice_version_published', 'registry_notice_version', versionId, { notice_id: row.notice_id, locale: row.locale, version: row.version, supersedes: previous?.id ?? null, content_digest: row.content_digest });
  await audit(c, 'registry_notice.publish', versionId);
  return noticeView(c, row.notice_id);
}

export async function noticeList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT id FROM app.registry_notices WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  const items = [];
  for (const row of paged.items) items.push(await noticeView(c, row.id));
  return { items, next_cursor: paged.next_cursor };
}

/** The version whose effective period contains the chosen moment, or none with the reason. */
export async function noticeAt(c: Context, id: string, query: unknown) {
  const value = R.NoticeAtQuery.parse(query);
  await exists(c, 'registry_notices', id, 'id');
  const row = (await c.tx.query(`SELECT * FROM app.registry_notice_versions WHERE ${predicate} AND notice_id=$4 AND locale=$5 AND published_at IS NOT NULL AND effective_from<=$6 AND (effective_to IS NULL OR effective_to>$6)`,
    [...scope(c), id, value.locale, value.as_of])).rows[0] as VersionRow | undefined;
  return R.NoticeAt.parse({ notice_id: id, as_of: value.as_of, locale: value.locale, version: row ? versionView(row) : null,
    reason: row ? `Version ${row.version} was in effect at that time.` : 'No published version of this notice was in effect in this locale at that time.' });
}

type DeliveryRow = { id: string; notice_version_id: string; subject_id: string | null; relationship_id: string | null; population_reference: string | null; channel: string; presented_at: Date;
  source_system_id: string | null; source_reference: string; evidence_reference: string | null; result: string; provenance: Record<string, unknown>; recorded_at: Date };
const deliveryView = (d: DeliveryRow) => R.NoticeDelivery.parse({ ...only(R.NoticeDelivery, d), presented_at: iso(d.presented_at), recorded_at: iso(d.recorded_at) });

/**
 * Delivery evidence is recorded only from a source record that says the notice
 * was presented, and only for a version that was in effect at that moment.
 */
export async function insertDelivery(c: Context, value: { notice_version_id: string; subject_id: string | null; relationship_id: string | null; population_reference: string | null; channel: string; presented_at: string;
  source_system_id: string | null; source_reference: string; evidence_reference: string | null; result: string }, provenance: Record<string, unknown>) {
  const version = (await c.tx.query(`SELECT effective_from,effective_to,status FROM app.registry_notice_versions WHERE ${predicate} AND id=$4`, [...scope(c), value.notice_version_id])).rows[0];
  if (!version) refuse(404, 'notice_version_id', 'not_found');
  if (version.status === 'DRAFT') refuse(409, 'notice_version_id', 'draft_was_never_presented');
  const at = Date.parse(value.presented_at);
  if (at < version.effective_from.getTime() || (version.effective_to && at >= version.effective_to.getTime())) refuse(409, 'presented_at', 'version_not_in_effect_at_that_time');
  const id = randomUUID();
  await c.tx.query(`INSERT INTO app.notice_delivery_evidence(tenant_id,legal_entity_id,environment_id,id,notice_version_id,subject_id,relationship_id,population_reference,channel,presented_at,source_system_id,source_reference,evidence_reference,result,provenance,recorded_by)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`,
  [...scope(c), id, value.notice_version_id, value.subject_id, value.relationship_id, value.population_reference, value.channel, value.presented_at, value.source_system_id, value.source_reference, value.evidence_reference, value.result, provenance, c.actor.actor_id]);
  return id;
}
export async function recordDelivery(c: Context, input: unknown) {
  const value = R.NoticeDeliveryRecord.parse(input);
  await exists(c, 'data_principals', value.subject_id, 'subject_id');
  await exists(c, 'systems', value.source_system_id, 'source_system_id');
  if (value.relationship_id) {
    const rel = (await c.tx.query(`SELECT subject_id FROM app.data_principal_relationships WHERE ${predicate} AND id=$4`, [...scope(c), value.relationship_id])).rows[0];
    if (!rel) refuse(404, 'relationship_id', 'not_found');
    if (rel.subject_id !== value.subject_id) refuse(409, 'relationship_id', 'relationship_of_another_subject');
  }
  const id = await insertDelivery(c, value, { source: 'OPERATOR', recorded_by: c.actor.actor_id });
  await audit(c, 'notice_delivery.record', id);
  return deliveryView((await c.tx.query(`SELECT * FROM app.notice_delivery_evidence WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0]);
}
export async function deliveryList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT * FROM app.notice_delivery_evidence WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(deliveryView), next_cursor: paged.next_cursor };
}

/** Privacy Centre: the notices currently published, as a Data Principal is shown them. */
export async function portalNotices(c: Context, page: Page, query: unknown) {
  const locale = (query as { locale?: string } | undefined)?.locale ?? null;
  const rows = (await c.tx.query(`SELECT v.*,n.name FROM app.registry_notice_versions v JOIN app.registry_notices n ON n.tenant_id=v.tenant_id AND n.legal_entity_id=v.legal_entity_id AND n.environment_id=v.environment_id AND n.id=v.notice_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.status='PUBLISHED' AND v.effective_from<=clock_timestamp() AND ($4::text IS NULL OR v.locale=$4)
      AND ($5::uuid IS NULL OR v.id>$5) ORDER BY v.id LIMIT $6`, [...scope(c), locale, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(v => O.PortalNotice.parse({ notice_id: v.notice_id, name: v.name, version_id: v.id, version: v.version, locale: v.locale, title: v.title, content: v.content,
    channels: v.channels, effective_from: iso(v.effective_from), superseded: false })), next_cursor: paged.next_cursor };
}
