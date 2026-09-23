import { randomUUID } from 'node:crypto';
import * as S from '../../../../shared/contracts/src/index.ts';
import { AccessError } from '../../../authorization/src/index.ts';
import { audit, predicate, scopeValues, requireOne, paged, type Context, type Page } from '../shared/transaction.ts';

/** Bounded traversal and result limits. A bound that is reached is reported as
 *  truncated; it is never presented as a complete answer. */
const MAX_SEARCH_HITS = 50;
const MAX_NEIGHBOURHOOD_NODES = 200;
const MAX_IMPACT_PER_DIMENSION = 100;
/** 'simple' avoids stemming: asset and field names are identifiers, not prose. */
const SEARCH_CONFIGURATION = 'simple';
const REDACTED = '[REDACTED]';

type NodeKind = S.GraphNodeKindValue;
type Endpoint = { kind: NodeKind; id: string };

const time = (value: Date | null | undefined) => value?.toISOString() ?? null;

// --- inventory ---------------------------------------------------------------

export async function createDataAsset(c: Context, input: unknown) {
  const value = S.DataAssetCreate.parse(input);
  const scope = scopeValues(c.actor);
  requireOne((await c.tx.query(`SELECT id FROM app.systems WHERE ${predicate} AND id=$4`, [...scope, value.system_id])).rows);
  if (value.parent_id) {
    const parent = requireOne((await c.tx.query(`SELECT system_id FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scope, value.parent_id])).rows);
    // A child asset describes part of the same stored thing; crossing systems
    // would silently assert an undeclared copy relationship.
    if (parent.system_id !== value.system_id) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'parent_id', code: 'parent_in_other_system' }]);
  }
  if (new Set(value.categories.map(category => category.code)).size !== value.categories.length) throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'categories', code: 'duplicate_category' }]);
  const id = randomUUID();
  // An OBSERVED record must state when it was read and how long that reading is
  // trusted. A customer declaration carries neither, and the contract, the column
  // constraint and this branch all agree on that.
  const observed = value.provenance === 'OBSERVED';
  const now = new Date();
  const last_seen_at = observed ? now.toISOString() : null;
  const fresh_until = observed ? new Date(now.getTime() + 86_400_000).toISOString() : null;
  const document = S.DataAsset.parse({
    ...value, id, review_state: 'UNREVIEWED', recorded_at: now.toISOString(), valid_to: null,
    last_seen_at, fresh_until, owner_actor_id: c.actor.actor_id, tombstoned_at: null, tombstone_reason: null,
  });
  await c.tx.query(`INSERT INTO app.data_assets(tenant_id,legal_entity_id,environment_id,id,system_id,parent_id,kind,provenance,owner_actor_id,recorded_at,valid_from,last_seen_at,fresh_until,document,search)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,to_tsvector('${SEARCH_CONFIGURATION}',$15))`,
  [...scope, id, value.system_id, value.parent_id, value.kind, value.provenance, c.actor.actor_id, document.recorded_at, value.valid_from, last_seen_at, fresh_until, document, `${value.name} ${value.description}`]);
  for (const category of value.categories) {
    await c.tx.query('INSERT INTO app.data_asset_categories(tenant_id,legal_entity_id,environment_id,asset_id,code,basis,review_state,assigned_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8)',
      [...scope, id, category.code, category.basis, category.review_state, c.actor.actor_id]);
  }
  await audit(c, 'data_asset.create', id);
  return document;
}

async function assetDocuments(c: Context, rows: { id: string; document: unknown }[]) {
  if (!rows.length) return [];
  const categories = await c.tx.query(`SELECT asset_id,code,basis,review_state FROM app.data_asset_categories WHERE ${predicate} AND asset_id=ANY($4::uuid[]) ORDER BY asset_id,code`, [...scopeValues(c.actor), rows.map(row => row.id)]);
  const byAsset = new Map<string, unknown[]>();
  for (const row of categories.rows) {
    if (!byAsset.has(row.asset_id)) byAsset.set(row.asset_id, []);
    byAsset.get(row.asset_id)!.push({ code: row.code, basis: row.basis, review_state: row.review_state });
  }
  return rows.map(row => S.DataAsset.parse({ ...row.document as object, categories: byAsset.get(row.id) ?? [] }));
}

export async function dataAssetList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT id,document FROM app.data_assets WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(await assetDocuments(c, result.rows), page);
}

export async function readDataAsset(c: Context, id: string) {
  const row = requireOne((await c.tx.query(`SELECT id,document FROM app.data_assets WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id])).rows);
  return (await assetDocuments(c, [row]))[0]!;
}

/** Justified erasure of the personal payload. The row, its identity and every
 *  relationship that referenced it survive so that older evidence still resolves;
 *  the tombstone records why the payload is gone. It cannot be rewritten or lifted. */
export async function tombstoneAsset(c: Context, id: string, input: unknown) {
  const value = S.AssetTombstone.parse(input);
  const scope = scopeValues(c.actor);
  const existing = requireOne((await c.tx.query(`SELECT document,tombstoned_at FROM app.data_assets WHERE ${predicate} AND id=$4 FOR UPDATE`, [...scope, id])).rows);
  if (existing.tombstoned_at) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const reason = `${value.reason} [integrity reference: ${value.integrity_reference}]`.slice(0, 500);
  const document = S.DataAsset.parse({ ...existing.document, name: REDACTED, description: REDACTED, categories: [], tombstoned_at: new Date().toISOString(), tombstone_reason: reason });
  await c.tx.query(`UPDATE app.data_assets SET document=$4,tombstoned_at=$5,tombstone_reason=$6,search=NULL WHERE ${predicate} AND id=$7`,
    [...scope, document, document.tombstoned_at, reason, id]);
  await c.tx.query(`DELETE FROM app.data_asset_categories WHERE ${predicate} AND asset_id=$4`, [...scope, id]);
  await audit(c, 'data_asset.tombstone', id);
  return document;
}

export async function createActivity(c: Context, input: unknown) {
  const value = S.ProcessingActivityCreate.parse(input);
  const scope = scopeValues(c.actor);
  const purpose = requireOne((await c.tx.query(`SELECT code FROM app.purpose_versions WHERE ${predicate} AND id=$4`, [...scope, value.purpose_id])).rows);
  // The condition an activity claims must match the purpose it serves, exactly as
  // policy creation already requires. Consent is not a default for all activity.
  if ((purpose.code === 'promotional_marketing') !== (value.lawful_condition === 'AFFIRMATIVE_MARKETING_CONSENT')) {
    throw new AccessError(400, 'VALIDATION_ERROR', [{ field: 'lawful_condition', code: 'condition_does_not_match_purpose' }]);
  }
  const id = randomUUID();
  const document = S.ProcessingActivity.parse({ ...value, id, review_state: 'UNREVIEWED', recorded_at: new Date().toISOString(), owner_actor_id: c.actor.actor_id });
  await c.tx.query(`INSERT INTO app.processing_activities(tenant_id,legal_entity_id,environment_id,id,purpose_id,lawful_condition,owner_actor_id,recorded_at,document,search)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,to_tsvector('${SEARCH_CONFIGURATION}',$10))`,
  [...scope, id, value.purpose_id, value.lawful_condition, c.actor.actor_id, document.recorded_at, document, `${value.name} ${value.description}`]);
  await audit(c, 'processing_activity.create', id);
  return document;
}

export async function activityList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT document FROM app.processing_activities WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(row => S.ProcessingActivity.parse(row.document)), page);
}

// --- typed relationships -----------------------------------------------------

const ENDPOINT_TABLES: Record<NodeKind, string> = { DATA_ASSET: 'data_assets', PROCESSING_ACTIVITY: 'processing_activities', SYSTEM: 'systems', PURPOSE: 'purpose_versions' };
/** Which typed column carries each endpoint kind on each side of the edge. */
const ENDPOINT_COLUMNS: Record<'from' | 'to', Partial<Record<NodeKind, string>>> = {
  from: { DATA_ASSET: 'from_asset_id', PROCESSING_ACTIVITY: 'from_activity_id' },
  to: { DATA_ASSET: 'to_asset_id', PROCESSING_ACTIVITY: 'to_activity_id', SYSTEM: 'to_system_id', PURPOSE: 'to_purpose_id' },
};

async function requireNode(c: Context, endpoint: Endpoint) {
  requireOne((await c.tx.query(`SELECT id FROM app.${ENDPOINT_TABLES[endpoint.kind]} WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), endpoint.id])).rows);
}

function relationshipDocument(row: Record<string, unknown>) {
  const endpoints = S.RELATIONSHIP_ENDPOINTS[row.relationship_type as keyof typeof S.RELATIONSHIP_ENDPOINTS];
  const from = { kind: endpoints.from, id: (row[ENDPOINT_COLUMNS.from[endpoints.from]!] ?? '') as string };
  const to = { kind: endpoints.to, id: (row[ENDPOINT_COLUMNS.to[endpoints.to]!] ?? '') as string };
  return S.GraphRelationship.parse({
    id: row.id, relationship_type: row.relationship_type, from, to, provenance: row.provenance,
    review_state: row.review_state, confidence_basis: row.confidence_basis, owner_actor_id: row.owner_actor_id,
    recorded_at: time(row.recorded_at as Date), valid_from: time(row.valid_from as Date),
    valid_to: time(row.valid_to as Date | null), last_seen_at: time(row.last_seen_at as Date | null),
  });
}

export async function createRelationship(c: Context, input: unknown) {
  const value = S.GraphRelationshipCreate.parse(input);
  const scope = scopeValues(c.actor);
  // Both endpoints are resolved inside the caller's scope before the edge exists,
  // so an edge can never reference a node the caller cannot see.
  await requireNode(c, value.from);
  await requireNode(c, value.to);
  const fromColumn = ENDPOINT_COLUMNS.from[value.from.kind]!;
  const toColumn = ENDPOINT_COLUMNS.to[value.to.kind]!;
  const duplicate = await c.tx.query(`SELECT id FROM app.graph_relationships WHERE ${predicate} AND relationship_type=$4 AND ${fromColumn}=$5 AND ${toColumn}=$6 AND valid_to IS NULL`, [...scope, value.relationship_type, value.from.id, value.to.id]);
  if (duplicate.rowCount) throw new AccessError(409, 'IDEMPOTENCY_CONFLICT');
  const id = randomUUID();
  const last_seen_at = value.provenance === 'OBSERVED' ? new Date().toISOString() : null;
  const inserted = requireOne((await c.tx.query(`INSERT INTO app.graph_relationships(tenant_id,legal_entity_id,environment_id,id,relationship_type,${fromColumn},${toColumn},provenance,confidence_basis,owner_actor_id,valid_from,last_seen_at)
    VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
  [...scope, id, value.relationship_type, value.from.id, value.to.id, value.provenance, value.confidence_basis, c.actor.actor_id, value.valid_from, last_seen_at])).rows);
  await audit(c, 'graph_relationship.create', id);
  return relationshipDocument(inserted);
}

export async function relationshipList(c: Context, page: Page) {
  const result = await c.tx.query(`SELECT * FROM app.graph_relationships WHERE ${predicate} AND ($4::uuid IS NULL OR id>$4) ORDER BY id LIMIT $5`, [...scopeValues(c.actor), page.cursor, page.limit + 1]);
  return paged(result.rows.map(relationshipDocument), page);
}

// --- bounded search and traversal --------------------------------------------

export async function graphSearch(c: Context, query: unknown) {
  const { q } = S.GraphSearchQuery.parse(query);
  const scope = scopeValues(c.actor);
  // plainto_tsquery treats the input as literal terms, so a caller cannot inject
  // tsquery operators to widen the search beyond the words they typed.
  const result = await c.tx.query(
    `SELECT id,label,kind,provenance,review_state,tombstoned,rank FROM (
       SELECT id,document->>'name' AS label,'DATA_ASSET' AS kind,provenance,review_state,tombstoned_at IS NOT NULL AS tombstoned,
              ts_rank_cd(search,plainto_tsquery('${SEARCH_CONFIGURATION}',$4)) AS rank
         FROM app.data_assets WHERE ${predicate} AND search @@ plainto_tsquery('${SEARCH_CONFIGURATION}',$4)
       UNION ALL
       SELECT id,document->>'name',    'PROCESSING_ACTIVITY',NULL,review_state,false,
              ts_rank_cd(search,plainto_tsquery('${SEARCH_CONFIGURATION}',$4))
         FROM app.processing_activities WHERE ${predicate} AND search @@ plainto_tsquery('${SEARCH_CONFIGURATION}',$4)
     ) hits ORDER BY rank DESC,id LIMIT $5`, [...scope, q, MAX_SEARCH_HITS + 1]);
  const truncated = result.rows.length > MAX_SEARCH_HITS;
  return S.GraphSearchResult.parse({
    query_terms: q.split(/\s+/).filter(Boolean).slice(0, 16),
    hits: result.rows.slice(0, MAX_SEARCH_HITS).map(row => ({
      id: row.id, kind: row.kind, label: row.label, provenance: row.provenance, review_state: row.review_state,
      tombstoned: row.tombstoned, rank: Math.min(1, Number(row.rank)),
    })),
    truncated,
    limits: [
      'Searches the locally declared and observed inventory only; it is not a discovery scan of the estate.',
      ...truncated ? [`More than ${MAX_SEARCH_HITS} records matched; this result is incomplete.`] : [],
    ],
  });
}

/** One outward step from a set of nodes, in both edge directions, within scope. */
async function step(c: Context, nodes: Endpoint[]) {
  const assets = nodes.filter(n => n.kind === 'DATA_ASSET').map(n => n.id);
  const activities = nodes.filter(n => n.kind === 'PROCESSING_ACTIVITY').map(n => n.id);
  const systems = nodes.filter(n => n.kind === 'SYSTEM').map(n => n.id);
  const purposes = nodes.filter(n => n.kind === 'PURPOSE').map(n => n.id);
  const result = await c.tx.query(`SELECT * FROM app.graph_relationships WHERE ${predicate} AND (
      from_asset_id=ANY($4::uuid[]) OR to_asset_id=ANY($4::uuid[])
   OR from_activity_id=ANY($5::uuid[]) OR to_activity_id=ANY($5::uuid[])
   OR to_system_id=ANY($6::uuid[]) OR to_purpose_id=ANY($7::uuid[])) ORDER BY id LIMIT $8`,
  [...scopeValues(c.actor), assets, activities, systems, purposes, MAX_NEIGHBOURHOOD_NODES + 1]);
  return result.rows.map(relationshipDocument);
}

async function labelNodes(c: Context, nodes: Endpoint[]) {
  const labelled: S.GraphNodeValue[] = [];
  for (const kind of ['DATA_ASSET', 'PROCESSING_ACTIVITY', 'SYSTEM', 'PURPOSE'] as const) {
    const ids = nodes.filter(node => node.kind === kind).map(node => node.id);
    if (!ids.length) continue;
    const provenance = kind === 'DATA_ASSET' ? 'provenance' : 'NULL';
    const review = kind === 'DATA_ASSET' || kind === 'PROCESSING_ACTIVITY' ? 'review_state' : 'NULL';
    const tombstoned = kind === 'DATA_ASSET' ? 'tombstoned_at IS NOT NULL' : 'false';
    const result = await c.tx.query(`SELECT id,document->>'name' AS label,${provenance} AS provenance,${review} AS review_state,${tombstoned} AS tombstoned
      FROM app.${ENDPOINT_TABLES[kind]} WHERE ${predicate} AND id=ANY($4::uuid[]) ORDER BY id`, [...scopeValues(c.actor), ids]);
    for (const row of result.rows) labelled.push(S.GraphNode.parse({ kind, id: row.id, label: row.label ?? 'Unnamed record', provenance: row.provenance, review_state: row.review_state, tombstoned: row.tombstoned }));
  }
  return labelled;
}

export async function neighbourhood(c: Context, id: string, query: unknown) {
  const { depth } = S.NeighbourhoodQuery.parse(query);
  const maximumDepth = Number(depth);
  const root = await resolveNode(c, id);
  const seen = new Map<string, Endpoint>([[`${root.kind}:${root.id}`, root]]);
  const edges = new Map<string, S.GraphRelationshipValue>();
  let frontier: Endpoint[] = [root];
  let truncated = false;
  for (let level = 0; level < maximumDepth && frontier.length && !truncated; level++) {
    const found = await step(c, frontier);
    if (found.length > MAX_NEIGHBOURHOOD_NODES) truncated = true;
    const next: Endpoint[] = [];
    for (const edge of found.slice(0, MAX_NEIGHBOURHOOD_NODES)) {
      edges.set(edge.id, edge);
      for (const endpoint of [edge.from, edge.to]) {
        const key = `${endpoint.kind}:${endpoint.id}`;
        if (seen.has(key)) continue;
        if (seen.size >= MAX_NEIGHBOURHOOD_NODES) { truncated = true; break; }
        seen.set(key, endpoint);
        next.push(endpoint);
      }
    }
    frontier = next;
  }
  return S.GraphNeighbourhood.parse({
    root, depth: maximumDepth, nodes: await labelNodes(c, [...seen.values()]), edges: [...edges.values()], truncated,
    limits: [
      'Bounded traversal of locally recorded relationships; absence of an edge is not proof that no data flow exists.',
      ...truncated ? ['The traversal bound was reached; this neighbourhood is incomplete.'] : [],
    ],
  });
}

/** Resolve an id to whichever graph node kind actually owns it in this scope. */
async function resolveNode(c: Context, id: string): Promise<Endpoint> {
  for (const kind of ['DATA_ASSET', 'PROCESSING_ACTIVITY', 'SYSTEM', 'PURPOSE'] as const) {
    const result = await c.tx.query(`SELECT id FROM app.${ENDPOINT_TABLES[kind]} WHERE ${predicate} AND id=$4`, [...scopeValues(c.actor), id]);
    if (result.rowCount === 1) return { kind, id };
  }
  throw new AccessError(404, 'NOT_FOUND');
}

// --- change impact -----------------------------------------------------------

/** FR-M03-03: changing a system, purpose, activity or asset must identify the
 *  policies, workflows, tests, assets and owners that depend on it. Dimensions
 *  this release does not model are named as unavailable rather than returned
 *  empty, because an empty list and an unasked question are different answers. */
export async function impact(c: Context, id: string) {
  const scope = scopeValues(c.actor);
  const node = await resolveNode(c, id);
  const purposes = new Set<string>();
  const systems = new Set<string>();
  const assets = new Set<string>();
  const activities = new Set<string>();
  if (node.kind === 'PURPOSE') purposes.add(node.id);
  if (node.kind === 'SYSTEM') systems.add(node.id);
  if (node.kind === 'DATA_ASSET') assets.add(node.id);
  if (node.kind === 'PROCESSING_ACTIVITY') activities.add(node.id);

  // Two bounded hops are enough to reach the purpose and system sets that the
  // dependent controls are keyed by, without an unbounded whole-graph walk.
  let frontier: Endpoint[] = [node];
  for (let level = 0; level < 2 && frontier.length; level++) {
    const next: Endpoint[] = [];
    for (const edge of await step(c, frontier)) {
      for (const endpoint of [edge.from, edge.to]) {
        const target = endpoint.kind === 'PURPOSE' ? purposes : endpoint.kind === 'SYSTEM' ? systems : endpoint.kind === 'DATA_ASSET' ? assets : activities;
        if (target.has(endpoint.id)) continue;
        target.add(endpoint.id);
        next.push(endpoint);
      }
    }
    frontier = next;
  }
  // An activity fixes the purpose it serves even when no edge has been declared.
  if (activities.size) {
    const owned = await c.tx.query(`SELECT purpose_id FROM app.processing_activities WHERE ${predicate} AND id=ANY($4::uuid[])`, [...scope, [...activities]]);
    for (const row of owned.rows) purposes.add(row.purpose_id);
  }
  if (assets.size) {
    const owned = await c.tx.query(`SELECT system_id FROM app.data_assets WHERE ${predicate} AND id=ANY($4::uuid[])`, [...scope, [...assets]]);
    for (const row of owned.rows) systems.add(row.system_id);
  }
  const purposeList = [...purposes];
  const systemList = [...systems];
  const policies = await c.tx.query(`SELECT DISTINCT v.version_id FROM app.policy_versions v
    LEFT JOIN app.policy_systems s ON s.tenant_id=v.tenant_id AND s.legal_entity_id=v.legal_entity_id AND s.environment_id=v.environment_id AND s.policy_version_id=v.version_id
    WHERE v.tenant_id=$1 AND v.legal_entity_id=$2 AND v.environment_id=$3 AND (v.purpose_id=ANY($4::uuid[]) OR s.system_id=ANY($5::uuid[])) ORDER BY v.version_id LIMIT $6`,
  [...scope, purposeList, systemList, MAX_IMPACT_PER_DIMENSION + 1]);
  const workflows = await c.tx.query(`SELECT id FROM app.workflows WHERE ${predicate} AND purpose_id=ANY($4::uuid[]) ORDER BY id LIMIT $5`, [...scope, purposeList, MAX_IMPACT_PER_DIMENSION + 1]);
  const workflowIds = workflows.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.id);
  const tests = workflowIds.length
    ? await c.tx.query(`SELECT DISTINCT run_id FROM app.test_run_links WHERE ${predicate} AND workflow_id=ANY($4::uuid[]) ORDER BY run_id LIMIT $5`, [...scope, workflowIds, MAX_IMPACT_PER_DIMENSION + 1])
    : { rows: [] as { run_id: string }[] };
  const storedAssets = systemList.length
    ? await c.tx.query(`SELECT id,owner_actor_id FROM app.data_assets WHERE ${predicate} AND (system_id=ANY($4::uuid[]) OR id=ANY($5::uuid[])) ORDER BY id LIMIT $6`, [...scope, systemList, [...assets], MAX_IMPACT_PER_DIMENSION + 1])
    : await c.tx.query(`SELECT id,owner_actor_id FROM app.data_assets WHERE ${predicate} AND id=ANY($4::uuid[]) ORDER BY id LIMIT $5`, [...scope, [...assets], MAX_IMPACT_PER_DIMENSION + 1]);
  const owners = [...new Set(storedAssets.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.owner_actor_id as string))].sort();

  // WP16/WP15 landed after this module, so two of the dimensions that were once
  // reported as unavailable can now be answered for real.
  const processors = systemList.length
    ? await c.tx.query(`SELECT DISTINCT processor_id FROM app.processor_systems WHERE ${predicate} AND system_id=ANY($4::uuid[]) ORDER BY processor_id LIMIT $5`, [...scope, systemList, MAX_IMPACT_PER_DIMENSION + 1])
    : { rows: [] as { processor_id: string }[] };
  const retention = assets.size
    ? await c.tx.query(`SELECT DISTINCT id FROM app.retention_constraints WHERE ${predicate} AND data_asset_id=ANY($4::uuid[]) ORDER BY id LIMIT $5`, [...scope, [...assets], MAX_IMPACT_PER_DIMENSION + 1])
    : { rows: [] as { id: string }[] };
  // WP17 landed after this module, so incident impact is now real too.
  const incidents = (systemList.length || purposeList.length)
    ? await c.tx.query(`SELECT DISTINCT incident_id FROM app.incident_scope WHERE ${predicate}
        AND ((kind='SYSTEM' AND subject_id=ANY($4::uuid[])) OR (kind='PURPOSE' AND subject_id=ANY($5::uuid[])))
        ORDER BY incident_id LIMIT $6`, [...scope, systemList, purposeList, MAX_IMPACT_PER_DIMENSION + 1])
    : { rows: [] as { incident_id: string }[] };
  const dimensions = [
    ['POLICY_VERSIONS', policies.rows.length] as const,
    ['INCIDENTS', incidents.rows.length] as const,
    ['WORKFLOWS', workflows.rows.length] as const,
    ['TEST_RUNS', tests.rows.length] as const,
    ['DATA_ASSETS', storedAssets.rows.length] as const,
    ['PROCESSORS', processors.rows.length] as const,
    ['RETENTION_CONSTRAINTS', retention.rows.length] as const,
  ];
  return S.ImpactAssessment.parse({
    node, assessed_at: new Date().toISOString(),
    affected: {
      policy_version_ids: policies.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.version_id),
      workflow_ids: workflowIds,
      test_run_ids: tests.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.run_id),
      data_asset_ids: storedAssets.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.id),
      owner_actor_ids: owners.slice(0, MAX_IMPACT_PER_DIMENSION),
      processor_ids: processors.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.processor_id),
      retention_constraint_ids: retention.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.id),
      incident_ids: incidents.rows.slice(0, MAX_IMPACT_PER_DIMENSION).map(row => row.incident_id),
    },
    truncated_dimensions: dimensions.filter(([, count]) => count > MAX_IMPACT_PER_DIMENSION).map(([name]) => name),
    // Nothing is left unassessed: every dimension this module names is computed.
    // The field is retained so a future dimension can be declared unavailable
    // rather than silently returned as empty.
    unavailable_dimensions: [],
    limits: [
      'Impact is derived from recorded relationships and declared ownership; an undeclared dependency cannot be found.',
      'Processor, retention and incident impact covers only links that have been declared or recorded locally.',
    ],
  });
}
