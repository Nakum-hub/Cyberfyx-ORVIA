'use client';
import { useState, type FormEvent } from 'react';
import type { schemas, GraphNodeValue } from '@orvia/contracts';
import { usePagedQuery, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TechnicalDetails, TextField } from '../../shared/ui.tsx';
import { RetentionEligibility } from './retention.tsx';

type DataAsset = ReturnType<typeof schemas.DataAsset.parse>;
type GraphNode = GraphNodeValue;

/**
 * M03 Privacy Control Graph.
 *
 * Every reading here is the customer's own declared or observed inventory. The
 * screen never implies that the list is a complete picture of the estate, never
 * merges a declaration with an observation, and always renders the server's own
 * stated limits rather than an encouraging summary of them.
 */

const PROVENANCE_LABELS: Record<string, Label> = {
  ASSERTED: { label: 'Declared', tone: 'neutral', meaning: 'Recorded because someone stated it. Nothing has read the system to confirm it.' },
  OBSERVED: { label: 'Observed', tone: 'ok', meaning: 'A scoped connector read actually saw this, and the reading carries a freshness bound.' },
};
const REVIEW_LABELS: Record<string, Label> = {
  UNREVIEWED: { label: 'Not reviewed', tone: 'warn', meaning: 'Recorded but not yet reviewed by an accountable person.' },
  IN_REVIEW: { label: 'In review', tone: 'info', meaning: 'Currently being reviewed.' },
  ACCEPTED: { label: 'Reviewed', tone: 'ok', meaning: 'Reviewed and accepted by an accountable person.' },
  REJECTED: { label: 'Rejected', tone: 'stop', meaning: 'Reviewed and rejected; it does not describe this estate.' },
};
const ASSET_KIND_LABELS: Record<string, string> = {
  DATASET: 'Dataset', FIELD: 'Field', DERIVED_COPY: 'Derived copy', EXPORT: 'Export', BACKUP_COPY: 'Backup copy',
};
const NODE_KIND_LABELS: Record<string, string> = {
  DATA_ASSET: 'Data asset', PROCESSING_ACTIVITY: 'Processing activity', SYSTEM: 'System', PURPOSE: 'Purpose',
};
const RELATIONSHIP_LABELS: Record<string, string> = {
  ASSET_STORED_IN_SYSTEM: 'is stored in', ASSET_PROCESSED_BY_ACTIVITY: 'is processed by',
  ACTIVITY_SERVES_PURPOSE: 'serves', ASSET_COPIED_TO: 'is copied to',
};

/** The server's stated limits, shown as it wrote them. */
function Limits({ limits }: { limits: readonly string[] }) {
  if (!limits.length) return null;
  return (
    <NoticeBox tone="info" title="What this answer does and does not cover">
      <ul>{limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
    </NoticeBox>
  );
}

function assetName(asset: DataAsset) {
  return asset.tombstoned_at ? 'Erased record' : asset.name;
}

/* ================================================================== *
 * Inventory
 * ================================================================== */

export function Inventory() {
  const query = usePagedQuery('list_data_assets', { limit: 20 });
  const directory = useDirectory(['systems']);
  return (
    <>
      <PageHead
        eyebrow="Estate"
        title="Data inventory"
        lede="The data assets recorded in your current scope. A declared record is something a person stated; an observed record is something a scoped connector actually read, and only an observed record carries a freshness bound."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded data assets" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded data assets, in server cursor order"
              rows={data.items}
              rowKey={asset => asset.id}
              columns={[
                { key: 'name', header: 'Asset', cell: asset => (
                  <a className="cell-primary" href={`/workspace/inventory/${asset.id}`}>
                    {assetName(asset)}
                    <span className="cell-sub">{ASSET_KIND_LABELS[asset.kind] ?? asset.kind} · {shortId(asset.id)}</span>
                  </a>
                ) },
                { key: 'system', header: 'System', cell: asset => directory.systemName(asset.system_id) },
                { key: 'provenance', header: 'How it is known', cell: asset => <StateBadge dictionary={PROVENANCE_LABELS} value={asset.provenance} /> },
                { key: 'review', header: 'Review', cell: asset => <StateBadge dictionary={REVIEW_LABELS} value={asset.review_state} /> },
                { key: 'seen', header: 'Last read', cell: asset => asset.last_seen_at
                  ? formatTime(asset.last_seen_at)
                  : <span className="cell-sub">Never read — declared only</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="What this inventory is">
        <p>This is the inventory your organisation has recorded locally. ORVIA does not scan your estate to discover systems, so an asset that nobody has declared and no connector has read does not appear here. An empty row is not evidence that no such data exists.</p>
      </NoticeBox>
    </>
  );
}

/* ================================================================== *
 * Asset detail: relationships, traversal and change impact
 * ================================================================== */

export function AssetDetail({ id }: { id: string }) {
  const [depth, setDepth] = useState<'1' | '2' | '3'>('1');
  const asset = useQuery('data_asset', { params: { id } });
  const directory = useDirectory(['systems', 'purposes']);
  const neighbourhood = useQuery('graph_neighbourhood', { params: { id }, query: { depth } });
  const record = asset.data;
  return (
    <>
      <PageHead
        eyebrow="Estate"
        title={record ? assetName(record) : `Data asset ${shortId(id)}`}
        lede="What this record says, how it is known, and what else depends on it."
      />
      {record?.tombstoned_at && (
        <NoticeBox tone="neutral" title="This record's personal payload has been erased">
          <p>The description and category assignments were deliberately deleted. The record and its relationships remain so that earlier evidence still resolves, and the reason for the erasure is kept.</p>
          <Facts items={[
            { term: 'Erased at', value: formatTime(record.tombstoned_at) },
            { term: 'Justification', value: record.tombstone_reason ?? '—' },
          ]} />
        </NoticeBox>
      )}
      {record && (
        <Section title="What this record says">
          <Facts items={[
            { term: 'Kind', value: ASSET_KIND_LABELS[record.kind] ?? record.kind },
            { term: 'System', value: directory.systemName(record.system_id) },
            { term: 'How it is known', value: <StateBadge dictionary={PROVENANCE_LABELS} value={record.provenance} /> },
            { term: 'Review state', value: <StateBadge dictionary={REVIEW_LABELS} value={record.review_state} /> },
            { term: 'Last read', value: record.last_seen_at ? formatTime(record.last_seen_at) : 'Never read — this is a declaration, not an observation' },
            { term: 'Reading trusted until', value: record.fresh_until ? formatTime(record.fresh_until) : 'Not applicable to a declaration' },
            { term: 'Categories', value: record.categories.length
              ? record.categories.map(category => `${category.code} (${category.basis})`).join('; ')
              : 'None assigned. A field name alone never assigns a category.' },
          ]} />
        </Section>
      )}

      <Section
        title="What it is connected to"
        aside={
          <label className="inline-field">
            <span>Steps out</span>
            <select value={depth} onChange={event => setDepth(event.target.value as '1' | '2' | '3')}>
              <option value="1">1</option><option value="2">2</option><option value="3">3</option>
            </select>
          </label>
        }
      >
        <QueryBoundary query={neighbourhood} label="recorded relationships" isEmpty={data => !data.edges.length}>
          {data => (
            <>
              <DataTable
                caption={`Relationships within ${data.depth} step${data.depth === 1 ? '' : 's'}`}
                rows={data.edges}
                rowKey={edge => edge.id}
                columns={[
                  { key: 'from', header: 'From', cell: edge => <NodeLabel node={data.nodes.find(node => node.id === edge.from.id) ?? null} fallback={edge.from} /> },
                  { key: 'type', header: 'Relationship', cell: edge => RELATIONSHIP_LABELS[edge.relationship_type] ?? edge.relationship_type },
                  { key: 'to', header: 'To', cell: edge => <NodeLabel node={data.nodes.find(node => node.id === edge.to.id) ?? null} fallback={edge.to} /> },
                  { key: 'provenance', header: 'How it is known', cell: edge => <StateBadge dictionary={PROVENANCE_LABELS} value={edge.provenance} /> },
                  { key: 'basis', header: 'Basis', cell: edge => edge.confidence_basis },
                ]}
              />
              {data.truncated && <NoticeBox tone="warn" title="This neighbourhood is incomplete"><p>The traversal bound was reached, so relationships beyond it are not shown.</p></NoticeBox>}
              <Limits limits={data.limits} />
            </>
          )}
        </QueryBoundary>
      </Section>

      <RetentionEligibility id={id} />
      <ImpactPanel id={id} />
    </>
  );
}

function NodeLabel({ node, fallback }: { node: GraphNode | null; fallback: { kind: string; id: string } }) {
  if (!node) return <span className="cell-sub">{NODE_KIND_LABELS[fallback.kind] ?? fallback.kind} {shortId(fallback.id)}</span>;
  return (
    <span className="cell-primary">
      {node.tombstoned ? 'Erased record' : node.label}
      <span className="cell-sub">{NODE_KIND_LABELS[node.kind] ?? node.kind}</span>
    </span>
  );
}

/* ================================================================== *
 * Change impact
 * ================================================================== */

const UNAVAILABLE_COPY: Record<string, string> = {
  NOTIFICATION_OBLIGATIONS: 'Notification obligations are not traced to individual copies in this release and were not assessed.',
};

export function ImpactPanel({ id }: { id: string }) {
  // Deliberately explicit: an operator asks for the assessment rather than
  // having a bounded multi-hop traversal run on every render.
  const [requested, setRequested] = useState(false);
  const query = useQuery('graph_impact', { params: { id }, enabled: requested });
  return (
    <Section title="What would be affected by a change here">
      {!requested && (
        <>
          <p>Ask ORVIA which recorded controls depend on this node. The answer covers only relationships that have actually been recorded.</p>
          <button type="button" onClick={() => setRequested(true)}>Assess change impact</button>
        </>
      )}
      {requested && (
        <QueryBoundary query={query} label="change impact" isEmpty={() => false}>
          {data => (
            <>
              <Facts items={[
                { term: 'Assessed at', value: formatTime(data.assessed_at) },
                { term: 'Policy versions affected', value: countText(data.affected.policy_version_ids.length, data.truncated_dimensions.includes('POLICY_VERSIONS')) },
                { term: 'Workflows affected', value: countText(data.affected.workflow_ids.length, data.truncated_dimensions.includes('WORKFLOWS')) },
                { term: 'Test runs affected', value: countText(data.affected.test_run_ids.length, data.truncated_dimensions.includes('TEST_RUNS')) },
                { term: 'Data assets affected', value: countText(data.affected.data_asset_ids.length, data.truncated_dimensions.includes('DATA_ASSETS')) },
                { term: 'Accountable owners', value: countText(data.affected.owner_actor_ids.length, data.truncated_dimensions.includes('OWNERS')) },
                { term: 'Processors affected', value: countText(data.affected.processor_ids.length, data.truncated_dimensions.includes('PROCESSORS')) },
                { term: 'Retention constraints affected', value: countText(data.affected.retention_constraint_ids.length, data.truncated_dimensions.includes('RETENTION_CONSTRAINTS')) },
                { term: 'Incidents affected', value: countText(data.affected.incident_ids.length, data.truncated_dimensions.includes('INCIDENTS')) },
              ]} />
              {data.unavailable_dimensions.length > 0 && (
                <NoticeBox tone="unknown" title="Not assessed in this release">
                  <ul>{data.unavailable_dimensions.map(dimension => <li key={dimension}>{UNAVAILABLE_COPY[dimension] ?? dimension}</li>)}</ul>
                  <p>These are unanswered questions, not answers of &ldquo;none&rdquo;.</p>
                </NoticeBox>
              )}
              <Limits limits={data.limits} />
              <TechnicalDetails items={[
                { term: 'Node', value: `${NODE_KIND_LABELS[data.node.kind] ?? data.node.kind} ${data.node.id}` },
                { term: 'Affected policy versions', value: data.affected.policy_version_ids.join(', ') || '—' },
                { term: 'Affected workflows', value: data.affected.workflow_ids.join(', ') || '—' },
              ]} />
            </>
          )}
        </QueryBoundary>
      )}
    </Section>
  );
}

function countText(count: number, truncated: boolean) {
  if (truncated) return `${count} or more (the result limit was reached)`;
  return String(count);
}

/* ================================================================== *
 * Search
 * ================================================================== */

export function GraphSearch() {
  const [draft, setDraft] = useState('');
  const [term, setTerm] = useState('');
  const query = useQuery('graph_search', { enabled: term.length >= 2, query: { q: term } });
  const submit = (event: FormEvent) => { event.preventDefault(); setTerm(draft.trim()); };
  return (
    <>
      <PageHead eyebrow="Estate" title="Search the inventory" lede="Keyword search across recorded data assets and processing activities in your current scope." />
      <form onSubmit={submit}>
        <TextField label="Search terms" value={draft} onChange={setDraft} hint="At least two characters. Terms are matched literally." maxLength={120} />
        <button type="submit" disabled={draft.trim().length < 2}>Search</button>
      </form>
      {term.length >= 2 && (
        <QueryBoundary query={query} label="matching records" isEmpty={data => !data.hits.length}>
          {data => (
            <>
              <DataTable
                caption={`Records matching ${data.query_terms.join(' ')}`}
                rows={data.hits}
                rowKey={hit => hit.id}
                columns={[
                  { key: 'label', header: 'Record', cell: hit => (hit.kind === 'DATA_ASSET'
                    ? <a className="cell-primary" href={`/workspace/inventory/${hit.id}`}>{hit.tombstoned ? 'Erased record' : hit.label}<span className="cell-sub">{shortId(hit.id)}</span></a>
                    : <span className="cell-primary">{hit.label}<span className="cell-sub">{shortId(hit.id)}</span></span>) },
                  { key: 'kind', header: 'Kind', cell: hit => NODE_KIND_LABELS[hit.kind] ?? hit.kind },
                  { key: 'provenance', header: 'How it is known', cell: hit => hit.provenance
                    ? <StateBadge dictionary={PROVENANCE_LABELS} value={hit.provenance} />
                    : <span className="cell-sub">Not applicable</span> },
                  { key: 'review', header: 'Review', cell: hit => hit.review_state
                    ? <StateBadge dictionary={REVIEW_LABELS} value={hit.review_state} />
                    : <span className="cell-sub">—</span> },
                ]}
              />
              {data.truncated && <NoticeBox tone="warn" title="More records matched than are shown"><p>The result limit was reached. Narrow the search terms to see the rest.</p></NoticeBox>}
              <Limits limits={data.limits} />
            </>
          )}
        </QueryBoundary>
      )}
    </>
  );
}
