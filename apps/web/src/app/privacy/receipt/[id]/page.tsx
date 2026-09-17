'use client';
import { useParams } from 'next/navigation';
import { useQuery } from '../../../../components/api.ts';
import { receiptIntegrity } from '../../../../components/derive.ts';
import { DomainGuard } from '../../../../components/session-context.tsx';
import { CONSENT_LABELS, PROPAGATION_LABELS, formatTime } from '../../../../components/state-labels.ts';
import { Facts, Freshness, NoticeBox, QueryBoundary, StateBadge } from '../../../../components/ui.tsx';

export default function ReceiptPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  return (
    <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">
      {() => <ReceiptDetail id={id} />}
    </DomainGuard>
  );
}

function ReceiptDetail({ id }: { id: string }) {
  // Propagation is polled only while it is still moving; NEEDS_ATTENTION pauses
  // automatic polling and leaves an explicit refresh, as the contract requires.
  const query = useQuery('own_receipt', {
    params: { id },
    pollWhile: data => data.current.propagation_status === 'ACCEPTED' || data.current.propagation_status === 'RUNNING',
  });

  return (
    <>
      <div className="page-head">
        <h2>Consent receipt</h2>
        <p>
          The receipt records what was accepted at the time. The current state below is a separate, later read of
          your authoritative record. The two are never merged.
        </p>
      </div>
      <p><a href="/privacy">Back to my choices</a> · <a href="/privacy/receipts">All my receipts</a></p>
      <Freshness query={query} asOf={query.data?.current.as_of ?? null} />
      <QueryBoundary query={query} label="own consent receipt">
        {view => {
          const integrity = receiptIntegrity(view);
          return (
            <>
              {!integrity.consistent ? (
                <NoticeBox tone="stop" title="Reported inconsistency between receipt and current state">
                  <p>{integrity.message}</p>
                  <p>
                    This interface reports the server values unchanged rather than adjusting them to look
                    consistent. Raise this with the backend lane before relying on this record.
                  </p>
                </NoticeBox>
              ) : null}
              {integrity.superseded ? (
                <NoticeBox tone="info" title="This receipt has been superseded">
                  <p>
                    A later decision exists for this purpose. This receipt stays exactly as it was accepted; the
                    current state below is the one that governs processing now.
                  </p>
                </NoticeBox>
              ) : null}

              <section className="panel">
                <h3>Receipt facts (immutable)</h3>
                <Facts items={[
                  { term: 'Receipt id', value: <span className="mono">{view.receipt.receipt_id}</span> },
                  { term: 'Consent event id', value: <span className="mono">{view.receipt.event_id}</span> },
                  { term: 'Purpose', value: <span className="mono">{view.receipt.purpose_id}</span> },
                  { term: 'Decision recorded', value: <StateBadge dictionary={CONSENT_LABELS} value={view.receipt.consent_status} /> },
                  { term: 'Consent version (epoch)', value: <span className="mono">{view.receipt.consent_epoch}</span> },
                  { term: 'Accepted at', value: formatTime(view.receipt.accepted_at) },
                  { term: 'Propagation accepted as', value: <StateBadge dictionary={PROPAGATION_LABELS} value={view.receipt.propagation_status} /> },
                  { term: 'Workflow reference', value: <span className="mono">{view.receipt.workflow_id ?? 'none — no propagation was required'}</span> },
                ]} />
              </section>

              <section className="panel">
                <h3>Current state (read separately just now)</h3>
                <Facts items={[
                  { term: 'Current decision', value: <StateBadge dictionary={CONSENT_LABELS} value={view.current.consent_status} /> },
                  { term: 'Current consent version (epoch)', value: <span className="mono">{view.current.consent_epoch}</span> },
                  { term: 'Propagation status now', value: <StateBadge dictionary={PROPAGATION_LABELS} value={view.current.propagation_status} /> },
                  { term: 'Server as of', value: formatTime(view.current.as_of) },
                ]} />
                <p className="muted">
                  Propagation describes downstream work accepted by ORVIA. It is not a claim that every external
                  system has been verified.
                </p>
              </section>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
