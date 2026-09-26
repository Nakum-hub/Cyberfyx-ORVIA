import { createHash, randomUUID } from 'node:crypto';
import type { QueryResultRow } from 'pg';
import * as X from '../../../../shared/contracts/src/expansion.ts';
import { audit, type Context, type Page } from '../shared/transaction.ts';
import { exists, iso, pageOf, predicate, refuse, scope } from '../operations/shared.ts';
import { purposeImpact } from '../registry/processing.ts';

/**
 * EX05 data mapping and records of processing.
 *
 * An entry is derived, never typed in: it joins the processing registry
 * (reviewed declarations with their basis), connector bindings, declared system
 * locations, processor engagements, retention rules and safeguards with the
 * privacy graph, where an OBSERVED asset carries a reading time and a freshness
 * bound and an ASSERTED one does not. Declarations and readings are shown side
 * by side and never merged, and where they disagree the entry says so.
 *
 * Entries are assembled in bulk for a set of activities, so a page or a snapshot
 * costs a fixed number of queries rather than one per link. A snapshot is
 * bounded; above the bound it is refused rather than shortened.
 */
type Row = QueryResultRow;
type Entry = ReturnType<typeof X.RopaEntry.parse>;
type Gap = ReturnType<typeof X.RopaGap.parse>;
/** DPDP applies to processing in India; a location or recipient elsewhere is a cross-border transfer. */
export const HOME_REGION = 'IN';
const REGION = /^[A-Z]{2}(-[A-Z0-9]{1,3})?$/;
const SNAPSHOT_CEILING = 5000;
const SEVERITY: Record<Gap['kind'], Gap['severity']> = {
  NO_CONDITION: 'MISSING', CONDITION_UNRESOLVED: 'MISSING', NO_SYSTEM: 'MISSING', NO_DATA_CATEGORY: 'MISSING', NO_PRINCIPAL_CATEGORY: 'MISSING', NO_RETENTION_RULE: 'MISSING',
  UNBOUND_SYSTEM: 'MISSING', LOCATION_UNDECLARED: 'MISSING', RECIPIENT_REGION_NOT_A_CODE: 'MISSING',
  RECIPIENT_ENDED: 'STALE', CATEGORY_INACTIVE: 'STALE', PURPOSE_VERSION_NOT_CURRENT: 'STALE', OBSERVATION_STALE: 'STALE',
  GRAPH_SYSTEM_NOT_DECLARED: 'CONFLICT', DECLARED_SYSTEM_NOT_IN_GRAPH: 'CONFLICT', NOT_OBSERVED: 'INFO',
};
const byId = (rows: Row[], key = 'id') => new Map(rows.map(r => [String(r[key]), r]));
const group = (rows: Row[], key: string) => { const m = new Map<string, Row[]>(); for (const r of rows) { const k = String(r[key]); (m.get(k) ?? m.set(k, []).get(k)!).push(r); } return m; };

/** Builds entries for the given activities, in the order given. */
async function buildEntries(c: Context, ids: string[]): Promise<Entry[]> {
  if (!ids.length) return [];
  const s = scope(c); const q = (sql: string, extra: unknown[] = []) => c.tx.query(sql, [...s, ...extra]).then(r => r.rows);
  const activities = byId(await q(`SELECT * FROM app.registry_activities WHERE ${predicate} AND id=ANY($4::uuid[])`, [ids]));
  const versions = byId(await q(`SELECT * FROM app.registry_activity_versions WHERE ${predicate} AND activity_id=ANY($4::uuid[]) AND status='CURRENT'`, [ids]), 'activity_id');
  const links = group(await q(`SELECT * FROM app.registry_activity_links WHERE ${predicate} AND activity_id=ANY($4::uuid[]) AND valid_to IS NULL AND valid_from<=clock_timestamp() ORDER BY valid_from, id`, [ids]), 'activity_id');
  const allLinks = [...links.values()].flat();
  const targets = (column: string) => [...new Set(allLinks.map(l => l[column]).filter(Boolean).map(String))];
  const purposeVersionIds = [...new Set([...versions.values()].map(v => v.purpose_version_id))];
  const purposeVersions = byId(await q(`SELECT v.*, p.name FROM app.registry_purpose_versions v JOIN app.registry_purposes p ON p.tenant_id=v.tenant_id AND p.legal_entity_id=v.legal_entity_id AND p.environment_id=v.environment_id AND p.id=v.purpose_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND v.id=ANY($4::uuid[])`, [purposeVersionIds]));
  const conditions = byId(await q(`SELECT id, code, label, unresolved FROM app.processing_conditions WHERE ${predicate} AND id=ANY($4::uuid[])`, [[...versions.values()].map(v => v.condition_id).filter(Boolean)]));
  const notices = byId(await q(`SELECT id, title, version, locale FROM app.registry_notice_versions WHERE ${predicate} AND id=ANY($4::uuid[])`, [[...versions.values()].flatMap(v => v.notice_version_ids ?? [])]));
  const principalCategories = byId(await q(`SELECT id, name, active FROM app.data_principal_categories WHERE ${predicate} AND id=ANY($4::uuid[])`, [targets('principal_category_id')]));
  const dataCategories = byId(await q(`SELECT id, name, active FROM app.personal_data_categories WHERE ${predicate} AND id=ANY($4::uuid[])`, [targets('data_category_id')]));
  const graphIds = [...activities.values()].map(a => a.graph_activity_id).filter(Boolean);
  const graphEdges = await q(`SELECT g.to_activity_id, a.system_id, g.provenance, g.review_state FROM app.graph_relationships g JOIN app.data_assets a ON a.tenant_id=g.tenant_id AND a.legal_entity_id=g.legal_entity_id AND a.environment_id=g.environment_id AND a.id=g.from_asset_id
    WHERE g.tenant_id=$1 AND g.legal_entity_id=$2 AND g.environment_id=$3 AND g.relationship_type='ASSET_PROCESSED_BY_ACTIVITY' AND g.to_activity_id=ANY($4::uuid[])
      AND g.valid_from<=clock_timestamp() AND (g.valid_to IS NULL OR g.valid_to>clock_timestamp()) AND a.tombstoned_at IS NULL AND g.review_state<>'REJECTED'`, [graphIds]);
  const graphByActivity = group(graphEdges, 'to_activity_id');
  const systemIds = [...new Set([...targets('system_id'), ...graphEdges.map(e => String(e.system_id))])];
  const systems = byId(await q(`SELECT id, connector, document->>'name' AS name FROM app.systems WHERE ${predicate} AND id=ANY($4::uuid[])`, [systemIds]));
  const bindings = byId(await q(`SELECT DISTINCT ON (system_id) system_id, adapter FROM app.connector_bindings WHERE ${predicate} AND system_id=ANY($4::uuid[]) AND valid_to IS NULL ORDER BY system_id, valid_from DESC`, [systemIds]), 'system_id');
  const locations = byId(await q(`SELECT system_id, region, hosting_description FROM app.system_locations WHERE ${predicate} AND system_id=ANY($4::uuid[]) AND valid_to IS NULL`, [systemIds]), 'system_id');
  const observed = byId(await q(`SELECT DISTINCT ON (system_id) system_id, last_seen_at, fresh_until FROM app.data_assets WHERE ${predicate} AND system_id=ANY($4::uuid[]) AND provenance='OBSERVED' AND tombstoned_at IS NULL
    ORDER BY system_id, last_seen_at DESC`, [systemIds]), 'system_id');
  const engagements = byId(await q(`SELECT e.*, p.role, p.document->>'name' AS processor_name, p.document->>'region' AS region FROM app.processor_engagements e JOIN app.processors p ON p.tenant_id=e.tenant_id AND p.legal_entity_id=e.legal_entity_id AND p.environment_id=e.environment_id AND p.id=e.processor_id
    WHERE e.tenant_id=$1 AND e.legal_entity_id=$2 AND e.environment_id=$3 AND e.id=ANY($4::uuid[])`, [targets('engagement_id')]));
  const rules = await q(`SELECT id, name, trigger, duration_days, activity_id FROM app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND (activity_id=ANY($4::uuid[]) OR id=ANY($5::uuid[]))`, [ids, targets('retention_rule_id')]);
  const safeguards = byId(await q(`SELECT id, kind, description, evidence_state FROM app.security_safeguards WHERE ${predicate} AND id=ANY($4::uuid[])`, [targets('safeguard_id')]));
  const now = Date.now();

  return ids.flatMap(id => {
    const a = activities.get(id); if (!a) return [];
    const v = versions.get(id); const live = links.get(id) ?? [];
    const gaps: Gap[] = [];
    const gap = (kind: Gap['kind'], detail: string, target: string | null = null) => gaps.push({ kind, severity: SEVERITY[kind], detail: detail.slice(0, 300), target_id: target });
    const pv = v ? purposeVersions.get(String(v.purpose_version_id)) : undefined;
    const purposeCurrent = Boolean(pv && pv.status === 'ACTIVE' && (pv.effective_to === null || Date.parse(pv.effective_to) > now));
    if (pv && !purposeCurrent) gap('PURPOSE_VERSION_NOT_CURRENT', `Purpose version ${pv.version} is no longer in effect.`, pv.id);
    const cond = v?.condition_id ? conditions.get(String(v.condition_id)) : undefined;
    if (!cond) gap('NO_CONDITION', 'No processing condition is recorded.'); else if (cond.unresolved) gap('CONDITION_UNRESOLVED', `Condition ${cond.code} is unresolved.`, cond.id);
    const named = (kind: string, column: string, source: Map<string, Row>) => live.filter(l => l.link_kind === kind).flatMap(l => {
      const t = source.get(String(l[column])); if (!t) return [];
      if (t.active === false) gap('CATEGORY_INACTIVE', `${t.name} is no longer active but is still linked.`, t.id);
      return [{ id: t.id, name: t.name, basis: l.basis, since: iso(l.valid_from)! }];
    });
    const principal = named('PRINCIPAL_CATEGORY', 'principal_category_id', principalCategories);
    const data = named('DATA_CATEGORY', 'data_category_id', dataCategories);
    if (!principal.length) gap('NO_PRINCIPAL_CATEGORY', 'No data principal category is linked.');
    if (!data.length) gap('NO_DATA_CATEGORY', 'No personal data category is linked.');
    const transfers: Entry['transfers'] = [];
    const declaredSystems = live.filter(l => l.link_kind === 'SYSTEM');
    const systemItems = declaredSystems.flatMap(l => {
      const sys = systems.get(String(l.system_id)); if (!sys) return [];
      const binding = bindings.get(sys.id); const loc = locations.get(sys.id); const obs = observed.get(sys.id);
      if (!binding) gap('UNBOUND_SYSTEM', `${sys.name} has no connector binding.`, sys.id);
      if (!loc) gap('LOCATION_UNDECLARED', `${sys.name} has no declared location.`, sys.id);
      else transfers.push({ via: 'SYSTEM', target_id: sys.id, name: sys.name, region: loc.region, cross_border: !loc.region.startsWith(HOME_REGION) });
      const fresh = obs ? Date.parse(obs.fresh_until) > now : false;
      if (!obs) gap('NOT_OBSERVED', `${sys.name} is declared; nothing in the graph has been read from it.`, sys.id);
      else if (!fresh) gap('OBSERVATION_STALE', `The last reading of ${sys.name} expired ${iso(obs.fresh_until)}.`, sys.id);
      return [{ id: sys.id, name: sys.name ?? sys.id, connector: sys.connector, basis: l.basis, since: iso(l.valid_from)!, binding_adapter: binding?.adapter ?? null,
        location: loc ? { region: loc.region, hosting_description: loc.hosting_description } : null, observed: obs ? { last_seen_at: iso(obs.last_seen_at)!, fresh_until: iso(obs.fresh_until)!, fresh } : null }];
    });
    if (!declaredSystems.length) gap('NO_SYSTEM', 'No system is linked.');
    const recipients = live.filter(l => l.link_kind === 'PROCESSOR_ENGAGEMENT').flatMap(l => {
      const e = engagements.get(String(l.engagement_id)); if (!e) return [];
      const ended = e.status !== 'ACTIVE' || (e.effective_to !== null && Date.parse(e.effective_to) <= now);
      if (ended) gap('RECIPIENT_ENDED', `The engagement of ${e.processor_name} has ended but is still linked.`, e.id);
      const region = String(e.region ?? '').trim().toUpperCase();
      if (REGION.test(region)) transfers.push({ via: 'RECIPIENT', target_id: e.id, name: e.processor_name, region, cross_border: !region.startsWith(HOME_REGION) });
      else gap('RECIPIENT_REGION_NOT_A_CODE', `${e.processor_name}'s recorded region "${String(e.region ?? '').slice(0, 60)}" is not a region code.`, e.processor_id);
      return [{ engagement_id: e.id, processor_id: e.processor_id, processor_name: e.processor_name, role: e.role, region: String(e.region ?? ''), subprocessor_of: e.subprocessor_of, status: ended ? 'ENDED' : 'ACTIVE', since: iso(l.valid_from)! }];
    });
    const linkedRules = new Set(live.filter(l => l.link_kind === 'RETENTION_RULE').map(l => String(l.retention_rule_id)));
    const retention = rules.filter(r => r.activity_id === id || linkedRules.has(r.id)).map(r => ({ rule_id: r.id, name: r.name, trigger: r.trigger, duration_days: r.duration_days }));
    if (!retention.length) gap('NO_RETENTION_RULE', 'No active retention rule applies to this activity.');
    const guards = live.filter(l => l.link_kind === 'SAFEGUARD').flatMap(l => { const g = safeguards.get(String(l.safeguard_id)); return g ? [{ id: g.id, kind: g.kind, description: g.description, evidence_state: g.evidence_state }] : []; });
    const graphSystems = a.graph_activity_id ? (graphByActivity.get(String(a.graph_activity_id)) ?? []) : [];
    const declaredIds = new Set(declaredSystems.map(l => String(l.system_id)));
    const graphIdsHere = new Set(graphSystems.map(g => String(g.system_id)));
    for (const sid of graphIdsHere) if (!declaredIds.has(sid)) gap('GRAPH_SYSTEM_NOT_DECLARED', `The graph places this activity on ${systems.get(sid)?.name ?? sid}, which the registry does not declare.`, sid);
    if (a.graph_activity_id && graphIdsHere.size) for (const sid of declaredIds) if (!graphIdsHere.has(sid)) gap('DECLARED_SYSTEM_NOT_IN_GRAPH', `The registry declares ${systems.get(sid)?.name ?? sid}; the linked graph activity does not reach it.`, sid);
    return [X.RopaEntry.parse({
      activity_id: a.id, name: a.name, description: a.description, owner_reference: a.owner_reference, status: a.status, processes_child_data: a.processes_child_data,
      purpose: pv ? { purpose_id: pv.purpose_id, name: pv.name, version: pv.version, description: pv.description, current: purposeCurrent } : null,
      condition: cond ? { code: cond.code, label: cond.label, unresolved: cond.unresolved } : null,
      notices: (v?.notice_version_ids ?? []).flatMap((n: string) => { const x = notices.get(n); return x ? [{ id: x.id, title: x.title, version: x.version, locale: x.locale }] : []; }).slice(0, 50),
      principal_categories: principal.slice(0, 100), data_categories: data.slice(0, 100), systems: systemItems.slice(0, 100), recipients: recipients.slice(0, 100), transfers: transfers.slice(0, 200),
      retention: retention.slice(0, 100), safeguards: guards.slice(0, 100),
      graph: { activity_id: a.graph_activity_id, systems: graphSystems.map(g => ({ system_id: g.system_id, provenance: g.provenance, review_state: g.review_state })).slice(0, 100) },
      gaps: gaps.slice(0, 300),
    })];
  });
}

export async function ropaEntry(c: Context, id: string) {
  const [entry] = await buildEntries(c, [id]);
  if (!entry) refuse(404, 'id', 'not_found');
  return entry;
}
export async function ropaEntries(c: Context, page: Page) {
  // Newest first, so an activity just registered is on the first page.
  const rows = (await c.tx.query(`SELECT x.id FROM app.registry_activities x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3 AND x.status='ACTIVE'
    AND ($4::uuid IS NULL OR (x.recorded_at, x.id) < (SELECT k.recorded_at, k.id FROM app.registry_activities k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4))
    ORDER BY x.recorded_at DESC, x.id DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: await buildEntries(c, paged.items.map(r => r.id)), next_cursor: paged.next_cursor };
}
async function allEntries(c: Context) {
  const ids = (await c.tx.query(`SELECT id FROM app.registry_activities WHERE ${predicate} AND status='ACTIVE' ORDER BY id LIMIT $4`, [...scope(c), SNAPSHOT_CEILING + 1])).rows.map(r => r.id as string);
  if (ids.length > SNAPSHOT_CEILING) refuse(409, 'activities', 'above_snapshot_ceiling');
  const entries: Entry[] = [];
  for (let i = 0; i < ids.length; i += 500) entries.push(...await buildEntries(c, ids.slice(i, i + 500)));
  return entries;
}
const LIMITS = [
  'Every entry is derived from records held by this installation: registry declarations (with the basis each one states), connector bindings, declared locations and the privacy graph.',
  'A declared link is a reviewed statement, not an observation. Only a graph asset marked OBSERVED carries a reading time, and it is shown as fresh only until its stated bound.',
  `A transfer is flagged cross-border when a declared location or recipient region is outside ${HOME_REGION}. Whether a transfer is permitted is a legal question this record does not answer.`,
];
export async function ropaSummary(c: Context) {
  const entries = await allEntries(c);
  const counts = new Map<string, { kind: Gap['kind']; severity: Gap['severity']; count: number }>();
  for (const e of entries) for (const kind of new Set(e.gaps.map(g => g.kind))) { const x = counts.get(kind) ?? { kind, severity: SEVERITY[kind], count: 0 }; x.count++; counts.set(kind, x); }
  return X.RopaSummary.parse({
    as_of: new Date().toISOString(), home_region: HOME_REGION, activities: entries.length, activities_with_gaps: entries.filter(e => e.gaps.some(g => g.severity !== 'INFO')).length,
    gaps: [...counts.values()].sort((a, b) => b.count - a.count), cross_border_transfers: entries.reduce((n, e) => n + e.transfers.filter(t => t.cross_border).length, 0),
    systems_declared_only: new Set(entries.flatMap(e => e.systems.filter(s => !s.observed).map(s => s.id))).size, limits: LIMITS,
  });
}

// ---------------------------------------------------------------- change impact
export async function ropaImpact(c: Context, query: unknown) {
  const q = X.RopaImpactQuery.parse(query);
  const s = scope(c); const BOUND = 500;
  const found = new Map<string, 'REGISTRY_LINK' | 'GRAPH' | 'SUBPROCESSOR' | 'PURPOSE_VERSION'>();
  const add = (ids: string[], via: 'REGISTRY_LINK' | 'GRAPH' | 'SUBPROCESSOR' | 'PURPOSE_VERSION') => { for (const id of ids) if (!found.has(id)) found.set(id, via); };
  const linked = async (column: string, values: string[]) => values.length ? (await c.tx.query(`SELECT DISTINCT activity_id FROM app.registry_activity_links WHERE ${predicate} AND ${column}=ANY($4::uuid[]) AND valid_to IS NULL LIMIT ${BOUND + 1}`, [...s, values])).rows.map(r => r.activity_id as string) : [];
  let rules: string[] = []; let engagements: string[] = []; let assets = 0; let consent: number | null = null;
  const table: Record<string, string> = { SYSTEM: 'systems', PROCESSOR: 'processors', DATA_CATEGORY: 'personal_data_categories', PRINCIPAL_CATEGORY: 'data_principal_categories', PURPOSE: 'registry_purposes' };
  await exists(c, table[q.kind]!, q.target_id, 'target_id');
  if (q.kind === 'SYSTEM') {
    add(await linked('system_id', [q.target_id]), 'REGISTRY_LINK');
    assets = Number((await c.tx.query(`SELECT count(*) n FROM app.data_assets WHERE ${predicate} AND system_id=$4 AND tombstoned_at IS NULL`, [...s, q.target_id])).rows[0].n);
    add((await c.tx.query(`SELECT DISTINCT r.id FROM app.registry_activities r JOIN app.graph_relationships g ON g.tenant_id=r.tenant_id AND g.legal_entity_id=r.legal_entity_id AND g.environment_id=r.environment_id AND g.to_activity_id=r.graph_activity_id
      JOIN app.data_assets a ON a.tenant_id=g.tenant_id AND a.legal_entity_id=g.legal_entity_id AND a.environment_id=g.environment_id AND a.id=g.from_asset_id
      WHERE r.tenant_id=$1 AND r.legal_entity_id=$2 AND r.environment_id=$3 AND a.system_id=$4 AND a.tombstoned_at IS NULL AND g.relationship_type='ASSET_PROCESSED_BY_ACTIVITY' AND (g.valid_to IS NULL OR g.valid_to>clock_timestamp()) LIMIT ${BOUND + 1}`, [...s, q.target_id])).rows.map(r => r.id), 'GRAPH');
    rules = (await c.tx.query(`SELECT id FROM app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND system_id=$4 LIMIT ${BOUND + 1}`, [...s, q.target_id])).rows.map(r => r.id);
  } else if (q.kind === 'PROCESSOR') {
    const direct = (await c.tx.query(`SELECT id FROM app.processor_engagements WHERE ${predicate} AND processor_id=$4 LIMIT ${BOUND + 1}`, [...s, q.target_id])).rows.map(r => r.id as string);
    // A sub-processor engaged under this processor's engagement is reached through it.
    const sub = direct.length ? (await c.tx.query(`SELECT id FROM app.processor_engagements WHERE ${predicate} AND subprocessor_of=ANY($4::uuid[]) LIMIT ${BOUND + 1}`, [...s, direct])).rows.map(r => r.id as string) : [];
    engagements = [...direct, ...sub];
    add(await linked('engagement_id', direct), 'REGISTRY_LINK');
    add(await linked('engagement_id', sub), 'SUBPROCESSOR');
  } else if (q.kind === 'DATA_CATEGORY' || q.kind === 'PRINCIPAL_CATEGORY') {
    const column = q.kind === 'DATA_CATEGORY' ? 'data_category_id' : 'principal_category_id';
    add(await linked(column, [q.target_id]), 'REGISTRY_LINK');
    rules = (await c.tx.query(`SELECT id FROM app.retention_rules WHERE ${predicate} AND status='ACTIVE' AND ${column}=$4 LIMIT ${BOUND + 1}`, [...s, q.target_id])).rows.map(r => r.id);
  } else {
    const impact = await purposeImpact(c, q.target_id);
    add(impact.activity_ids, 'PURPOSE_VERSION'); rules = impact.retention_rule_ids; consent = impact.consent_record_count;
  }
  const ids = [...found.keys()];
  const names = new Map((await c.tx.query(`SELECT id, name FROM app.registry_activities WHERE ${predicate} AND id=ANY($4::uuid[])`, [...s, ids.slice(0, BOUND)])).rows.map(r => [r.id, r.name]));
  return X.RopaImpact.parse({
    kind: q.kind, target_id: q.target_id, activities: ids.slice(0, BOUND).map(id => ({ activity_id: id, name: names.get(id) ?? id, via: found.get(id)! })),
    retention_rule_ids: rules.slice(0, BOUND), engagement_ids: engagements.slice(0, BOUND), graph_asset_count: assets, consent_record_count: consent,
    complete: ids.length <= BOUND && rules.length <= BOUND && engagements.length <= BOUND && (q.kind !== 'PURPOSE' || ids.length < 100),
  });
}

// ---------------------------------------------------------------- locations
const locationView = (r: Row) => X.SystemLocation.parse({ id: r.id, system_id: r.system_id, region: r.region, hosting_description: r.hosting_description, basis: r.basis, valid_from: iso(r.valid_from), valid_to: iso(r.valid_to), recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at) });
export async function declareLocation(c: Context, systemId: string, input: unknown) {
  const value = X.SystemLocationCreate.parse(input);
  await exists(c, 'systems', systemId, 'id');
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'system-location', systemId])]);
  const current = (await c.tx.query(`SELECT * FROM app.system_locations WHERE ${predicate} AND system_id=$4 AND valid_to IS NULL`, [...scope(c), systemId])).rows[0];
  if (current && Date.parse(value.valid_from) <= Date.parse(current.valid_from)) refuse(409, 'valid_from', 'after_the_current_declaration');
  if (current) await c.tx.query(`UPDATE app.system_locations SET valid_to=$5 WHERE ${predicate} AND id=$4`, [...scope(c), current.id, value.valid_from]);
  const row = (await c.tx.query(`INSERT INTO app.system_locations(tenant_id,legal_entity_id,environment_id,id,system_id,region,hosting_description,basis,valid_from,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [...scope(c), randomUUID(), systemId, value.region, value.hosting_description, value.basis, value.valid_from, c.actor.actor_id])).rows[0];
  await audit(c, 'system_location.declare', systemId);
  return locationView(row);
}
export async function locationList(c: Context, systemId: string, page: Page) {
  await exists(c, 'systems', systemId, 'id');
  const rows = (await c.tx.query(`SELECT * FROM app.system_locations WHERE ${predicate} AND system_id=$4 AND ($5::uuid IS NULL OR id>$5) ORDER BY id LIMIT $6`, [...scope(c), systemId, page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(locationView), next_cursor: paged.next_cursor };
}

// ---------------------------------------------------------------- versions
const versionView = (r: Row) => X.RopaVersion.parse({ id: r.id, version: r.version, note: r.note, as_of: iso(r.as_of), content_digest: r.content_digest, activity_count: r.activity_count, gap_count: r.gap_count,
  recorded_by: r.recorded_by, recorded_at: iso(r.recorded_at), approved_by: r.approved_by, approved_at: iso(r.approved_at), approval_note: r.approval_note });
/** Canonical JSON: keys sorted, so the digest depends on content and not on property order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value && typeof value === 'object') return `{${Object.keys(value).sort().map(k => `${JSON.stringify(k)}:${canonical((value as Record<string, unknown>)[k])}`).join(',')}}`;
  return JSON.stringify(value);
}
export async function createRopaVersion(c: Context, input: unknown) {
  const value = X.RopaVersionCreate.parse(input);
  await c.tx.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))', [JSON.stringify([...scope(c), 'ropa-version'])]);
  const asOf = new Date().toISOString();
  const entries = await allEntries(c);
  const digest = createHash('sha256').update(canonical(entries)).digest('hex');
  const next = Number((await c.tx.query(`SELECT coalesce(max(version),0)+1 v FROM app.ropa_versions WHERE ${predicate}`, scope(c))).rows[0].v);
  const row = (await c.tx.query(`INSERT INTO app.ropa_versions(tenant_id,legal_entity_id,environment_id,id,version,note,as_of,content,content_digest,activity_count,gap_count,recorded_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
    [...scope(c), randomUUID(), next, value.note, asOf, JSON.stringify(entries), digest, entries.length, entries.reduce((n, e) => n + e.gaps.filter(g => g.severity !== 'INFO').length, 0), c.actor.actor_id])).rows[0];
  await audit(c, 'ropa_version.record', row.id);
  return versionView(row);
}
export async function approveRopaVersion(c: Context, id: string, input: unknown) {
  const value = X.RopaVersionApprove.parse(input);
  const row = (await c.tx.query(`SELECT * FROM app.ropa_versions WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  if (row.approved_by) refuse(409, 'approved_by', 'already_approved');
  if (row.recorded_by === c.actor.actor_id) refuse(409, 'approved_by', 'recorder_cannot_approve');
  const updated = (await c.tx.query(`UPDATE app.ropa_versions SET approved_by=$5, approved_at=clock_timestamp(), approval_note=$6 WHERE ${predicate} AND id=$4 RETURNING *`, [...scope(c), id, c.actor.actor_id, value.note])).rows[0];
  await audit(c, 'ropa_version.approve', id);
  return versionView(updated);
}
export async function ropaVersionList(c: Context, page: Page) {
  const rows = (await c.tx.query(`SELECT id,version,note,as_of,content_digest,activity_count,gap_count,recorded_by,recorded_at,approved_by,approved_at,approval_note FROM app.ropa_versions x WHERE x.tenant_id=$1 AND x.legal_entity_id=$2 AND x.environment_id=$3
    AND ($4::uuid IS NULL OR x.version < (SELECT k.version FROM app.ropa_versions k WHERE k.tenant_id=$1 AND k.legal_entity_id=$2 AND k.environment_id=$3 AND k.id=$4)) ORDER BY x.version DESC LIMIT $5`, [...scope(c), page.cursor, page.limit + 1])).rows;
  const paged = pageOf(rows, page.limit, r => r.id);
  return { items: paged.items.map(versionView), next_cursor: paged.next_cursor };
}
export async function versionContent(c: Context, id: string) {
  const row = (await c.tx.query(`SELECT * FROM app.ropa_versions WHERE ${predicate} AND id=$4`, [...scope(c), id])).rows[0];
  if (!row) refuse(404, 'id', 'not_found');
  return { row, entries: row.content as Entry[] };
}
const FIELDS: (keyof Entry)[] = ['name', 'description', 'owner_reference', 'status', 'processes_child_data', 'purpose', 'condition', 'notices', 'principal_categories', 'data_categories', 'systems', 'recipients', 'transfers', 'retention', 'safeguards', 'graph', 'gaps'];
export async function ropaDiff(c: Context, id: string, query: unknown) {
  const q = X.RopaDiffQuery.parse(query);
  const to = await versionContent(c, id); const from = await versionContent(c, q.against);
  const before = new Map(from.entries.map(e => [e.activity_id, e])); const after = new Map(to.entries.map(e => [e.activity_id, e]));
  const added = to.entries.filter(e => !before.has(e.activity_id)).map(e => ({ activity_id: e.activity_id, name: e.name }));
  const removed = from.entries.filter(e => !after.has(e.activity_id)).map(e => ({ activity_id: e.activity_id, name: e.name }));
  const changed = to.entries.flatMap(e => {
    const b = before.get(e.activity_id); if (!b) return [];
    const fields = FIELDS.filter(f => canonical(e[f]) !== canonical(b[f]));
    return fields.length ? [{ activity_id: e.activity_id, name: e.name, fields: fields as string[] }] : [];
  });
  return X.RopaDiff.parse({ from_version: from.row.version, to_version: to.row.version, added: added.slice(0, 1000), removed: removed.slice(0, 1000), changed: changed.slice(0, 1000),
    complete: added.length <= 1000 && removed.length <= 1000 && changed.length <= 1000 });
}
