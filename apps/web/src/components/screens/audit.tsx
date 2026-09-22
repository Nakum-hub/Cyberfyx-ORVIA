'use client';
import { useState } from 'react';
import { call, currentIdentity, useQuery, usePagedQuery } from '../shared/api.ts';
import { formatTime, shortId, type Label } from '../shared/state-labels.ts';
import { describeFailure, type UiFailure } from '../shared/errors.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, SelectField, StateBadge, TextField } from '../shared/ui.tsx';

/**
 * M33 Audit Administration.
 *
 * Two things this screen will not do. It will not offer a way to edit or remove
 * a record, because there isn't one and the absence is the point. And it will
 * not present a category with no recorded events as the same thing as a
 * category this build cannot produce — the first means nobody has done it, the
 * second means nobody can, and only one of those is a gap.
 *
 * Reading this page is itself recorded. That is worth saying out loud on the
 * page, because an audit trail whose readers leave no trace is the one place a
 * quiet look costs nothing.
 */

const CATEGORY_LABELS: Record<string, string> = {
  ROLE_GRANTS: 'Role grants',
  OWNER_CHANGES: 'Owner changes',
  POLICY_PUBLICATION: 'Policy publication',
  CONNECTOR_CREDENTIALS_AND_SCOPE: 'Connector credentials and scope',
  SUPPORT_APPROVAL: 'Support approval',
  EXPORTS: 'Evidence exports',
  LICENCES: 'Licences',
  UPDATES: 'Updates',
};
const DOMAIN_LABELS: Record<string, Label> = {
  STAFF: { label: 'Staff', tone: 'info', meaning: 'An authenticated member of this organisation.' },
  PRINCIPAL: { label: 'Data principal', tone: 'neutral', meaning: 'A person acting on their own record through the portal.' },
  MACHINE: { label: 'Machine', tone: 'unknown', meaning: 'A local worker or agent operating under an enrolled machine identity.' },
};
const DISPUTE_LABELS: Record<string, string> = {
  WRONG_ACTOR: 'Wrong actor', WRONG_RESOURCE: 'Wrong resource', WRONG_OPERATION: 'Wrong operation',
  DUPLICATE_RECORD: 'Duplicate record', MISLEADING_WITHOUT_CONTEXT: 'Misleading without context',
};

export function AuditCoverageScreen() {
  const query = useQuery('audit_coverage');
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Audit coverage"
        lede="What the trail actually contains, measured from the trail itself. Nothing here is covered because a setting said so."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="audit coverage" isEmpty={() => false}>
        {data => (
          <>
            <DataTable
              caption="The eight categories that must be auditable, each measured from recorded events"
              rows={data.entries}
              rowKey={entry => entry.category}
              columns={[
                { key: 'category', header: 'Category', cell: entry => CATEGORY_LABELS[entry.category] ?? entry.category },
                { key: 'recorded', header: 'Recorded', cell: entry => entry.has_a_path
                  ? <span className="cell-primary">{entry.recorded}
                    <span className="cell-sub">{entry.recorded === 0 ? 'nothing yet' : `${formatTime(entry.first_seen_at)} to ${formatTime(entry.last_seen_at)}`}</span>
                  </span>
                  : <Badge label="No path" tone="unknown" meaning="This build has no route that could produce such an event, so there is nothing to audit rather than something unaudited." /> },
                { key: 'operations', header: 'From these operations', cell: entry => entry.operations.length
                  ? <code>{entry.operations.join(', ')}</code>
                  : <span className="cell-sub">None</span> },
                { key: 'note', header: 'What that means', cell: entry => entry.note },
              ]}
            />
            {data.entries.some(entry => !entry.has_a_path) && (
              <NoticeBox tone="info" title="Some categories have no path in this build">
                <p>A category with no path is not an auditing gap. It means this build contains no route through which such an act could be performed, so there is nothing that could have gone unrecorded. An entry would appear here the moment such a route existed.</p>
              </NoticeBox>
            )}
            <NoticeBox tone="info" title="What this report can and cannot tell you">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function AuditTrail() {
  const [operation, setOperation] = useState('');
  const [domain, setDomain] = useState('');
  const filter = { ...operation ? { operation } : {}, ...domain ? { actor_domain: domain } : {} };
  const query = usePagedQuery('list_audit_events', { limit: 25, query: filter });
  const [failure, setFailure] = useState<UiFailure | null>(null);
  const [busy, setBusy] = useState(false);
  /**
   * The export is the same filter the table is showing, so what a reader takes
   * away is what they were looking at. A match larger than the server's ceiling
   * is refused rather than shortened, and the refusal is shown here rather than
   * silently producing a shorter file.
   */
  const download = async () => {
    setBusy(true); setFailure(null);
    const actor = currentIdentity();
    try {
      const data = await call('export_audit_events', undefined, { query: filter });
      if (actor !== currentIdentity()) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'orvia-audit-trail.json'; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      if (actor === currentIdentity()) setFailure(describeFailure(error));
    } finally {
      if (actor === currentIdentity()) setBusy(false);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Audit trail"
        lede="Every recorded act, with the actor and the scope it happened in. Records are appended and never edited: a disputed entry is corrected by a second record that names it, and the first stays exactly as it was."
        actions={
          <button type="button" className="primary" disabled={busy} onClick={() => void download()}>
            {busy ? 'Preparing…' : 'Export what is shown'}
          </button>
        }
      />
      {failure ? <FailureState failure={failure} onRetry={() => void download()} /> : null}
      <NoticeBox tone="warn" title="Reading this page is itself recorded">
        <p>This read is an audited event like any other, so the trail includes who examined it and when. That is deliberate — an audit trail whose readers leave no trace is the one place a quiet look costs nothing.</p>
      </NoticeBox>
      <div className="filter-row">
        <TextField label="Operation" value={operation} onChange={setOperation} hint="Exact operation name, for example evidence.export" />
        <SelectField
          label="Actor domain" value={domain} onChange={setDomain}
          options={[{ value: '', label: 'Any' }, { value: 'STAFF', label: 'Staff' }, { value: 'PRINCIPAL', label: 'Data principal' }, { value: 'MACHINE', label: 'Machine' }]}
        />
      </div>
      <p className="muted" style={{ fontSize: 12.5, marginTop: 4 }}>
        An export carries every event the filter above matches. If that is more than one file can carry, the export is refused
        rather than shortened — narrow it by operation, actor or date and ask again.
      </p>
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded audit events" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded audit events, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'operation', header: 'Operation', cell: item => <code>{item.operation}</code> },
                { key: 'actor', header: 'Actor', cell: item => (
                  <span className="cell-primary">{shortId(item.actor_id)}
                    <span className="cell-sub"><StateBadge dictionary={DOMAIN_LABELS} value={item.actor_domain} /></span>
                  </span>
                ) },
                { key: 'resource', header: 'Resource', cell: item => item.resource_id
                  ? shortId(item.resource_id)
                  : <span className="cell-sub">Not specific to one record</span> },
                { key: 'request', header: 'Request', cell: item => shortId(item.request_id) },
                { key: 'created', header: 'Recorded', cell: item => formatTime(item.created_at) },
                { key: 'corrections', header: 'Disputed', cell: item => item.corrections
                  ? <Badge label={`${item.corrections} correction${item.corrections === 1 ? '' : 's'}`} tone="warn" meaning="A correction has been appended against this record. The record itself is unchanged." />
                  : <span className="cell-sub">No</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="How a wrong record is put right">
        <p>It is not edited. Somebody with audit administration authority appends a correction naming the record, which of {Object.values(DISPUTE_LABELS).length} reasons applies, and what they believe to be true. The original stays. A correction cannot itself be withdrawn, so disputing a record is a decision that stays on the record too.</p>
      </NoticeBox>
    </>
  );
}
