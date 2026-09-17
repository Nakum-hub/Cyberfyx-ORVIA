'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery } from '../../../components/api.ts';
import { DomainGuard } from '../../../components/session-context.tsx';
import { CONSENT_LABELS, PROPAGATION_LABELS, formatTime } from '../../../components/state-labels.ts';
import { DataTable, EmptyState, Freshness, Pagination, QueryBoundary, SelectField, StateBadge } from '../../../components/ui.tsx';

export default function ReceiptsPage() {
  return (
    <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">
      {() => <History />}
    </DomainGuard>
  );
}

function History() {
  const choices = useCollection('own_consents');
  const [purposeId, setPurposeId] = useState('');
  const history = usePagedQuery('own_history', { params: purposeId ? { purpose_id: purposeId } : undefined, enabled: purposeId !== '', limit: 50 });

  return (
    <>
      <div className="page-head">
        <h2>My receipts</h2>
        <p>Every decision you have made for a purpose, in the order the server recorded it. Receipts are never rewritten.</p>
      </div>

      <section className="panel">
        <QueryBoundary query={choices} label="own consent choices" isEmpty={data => data.items.length === 0}>
          {data => (
            <SelectField
              label="Purpose"
              value={purposeId}
              onChange={setPurposeId}
              options={data.items.map(item => ({ value: item.purpose_id, label: item.purpose_name }))}
              hint="Choose a purpose to read its full decision history."
            />
          )}
        </QueryBoundary>
      </section>

      {purposeId ? (
        <section className="panel">
          <Freshness query={history} />
          <QueryBoundary
            query={history}
            label="own consent history"
            isEmpty={data => data.items.length === 0}
            empty={<EmptyState title="No decision recorded yet"><p>You have not granted or withdrawn consent for this purpose.</p></EmptyState>}
          >
            {data => (
              <>
                <DataTable
                  caption="This page of recorded decisions, sorted by consent epoch"
                  rows={[...data.items].sort((a, b) => a.consent_epoch - b.consent_epoch)}
                  rowKey={row => row.receipt_id}
                  columns={[
                    { key: 'epoch', header: 'Epoch', cell: row => <span className="mono">{row.consent_epoch}</span> },
                    { key: 'status', header: 'Decision', cell: row => <StateBadge dictionary={CONSENT_LABELS} value={row.consent_status} /> },
                    { key: 'accepted', header: 'Accepted at', cell: row => formatTime(row.accepted_at) },
                    { key: 'propagation', header: 'Propagation at acceptance', cell: row => <StateBadge dictionary={PROPAGATION_LABELS} value={row.propagation_status} /> },
                    { key: 'receipt', header: 'Receipt', cell: row => <a className="mono" href={`/privacy/receipt/${row.receipt_id}`}>{row.receipt_id}</a> },
                  ]}
                />

              </>
            )}
          </QueryBoundary>
          <Pagination query={history}/>
        </section>
      ) : null}
    </>
  );
}
