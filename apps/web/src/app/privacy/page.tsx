'use client';
import { useCallback, useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { useMutation, useQuery } from '../../components/api.ts';
import { newerReceipt } from '../../components/derive.ts';
import { DomainGuard } from '../../components/session-context.tsx';
import { CONSENT_LABELS, PROPAGATION_LABELS, formatTime } from '../../components/state-labels.ts';
import {
  CheckboxField, ConfirmDialog, EmptyState, Facts, FailureState, Freshness,
  NoticeBox, QueryBoundary, StateBadge,
} from '../../components/ui.tsx';

type Choice = ReturnType<typeof schemas.ConsentChoice.parse>;
type Receipt = ReturnType<typeof schemas.Receipt.parse>;

export default function PrivacyCentrePage() {
  return (
    <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">
      {() => <Choices />}
    </DomainGuard>
  );
}

function Choices() {
  const choices = useQuery('own_consents', { limit: 25 });
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});

  // Every accepted decision consumes its interaction, so authoritative choices
  // are re-read before the next decision can be made.
  const recordReceipt = useCallback((purposeId: string, receipt: Receipt) => {
    setReceipts(previous => (newerReceipt(previous[purposeId] ?? null, receipt) ? { ...previous, [purposeId]: receipt } : previous));
    choices.refresh();
  }, [choices]);

  return (
    <>
      <div className="page-head">
        <h2>My choices</h2>
        <p>
          These are the consent decisions recorded for you in this organisation. Granting is an affirmative,
          purpose-specific act. Withdrawing is always available and never requires accepting a new notice.
        </p>
      </div>
      <Freshness query={choices} />
      <QueryBoundary
        query={choices}
        label="own consent choices"
        isEmpty={data => data.items.length === 0}
        empty={
          <EmptyState title="No published purpose is available to you yet">
            <p>
              Nothing is recorded against your record in this scope. A purpose appears here once staff publish its
              notice and policy.
            </p>
          </EmptyState>
        }
      >
        {data => (
          <>
            {data.items.map(choice => (
              <ChoiceCard
                key={choice.purpose_id}
                choice={choice}
                receipt={receipts[choice.purpose_id] ?? null}
                onReceipt={receipt => recordReceipt(choice.purpose_id, receipt)}
                onRecover={() => choices.refresh()}
              />
            ))}
            {data.next_cursor ? <p className="muted">More purposes exist beyond this page.</p> : null}
          </>
        )}
      </QueryBoundary>
    </>
  );
}

function ChoiceCard({ choice, receipt, onReceipt, onRecover }: {
  choice: Choice; receipt: Receipt | null; onReceipt: (receipt: Receipt) => void; onRecover: () => void;
}) {
  const grant = useMutation('grant', true);
  const withdraw = useMutation('withdraw', true);
  const [affirmed, setAffirmed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const busy = grant.status === 'pending' || withdraw.status === 'pending';
  const failure = grant.failure ?? withdraw.failure;

  const submitGrant = async () => {
    if (!choice.notice || !affirmed) return;
    const result = await grant.run(
      { expected_epoch: choice.consent_epoch, notice_version_id: choice.notice.version_id, interaction_id: choice.interaction_id, affirmative: true },
      { params: { purpose_id: choice.purpose_id } });
    if (result) { setAffirmed(false); onReceipt(result); }
  };

  const submitWithdraw = async () => {
    const result = await withdraw.run(
      { expected_epoch: choice.consent_epoch, interaction_id: choice.interaction_id },
      { params: { purpose_id: choice.purpose_id } });
    setConfirming(false);
    if (result) onReceipt(result);
  };

  return (
    <section className="panel" aria-labelledby={`purpose-${choice.purpose_id}`}>
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <h3 id={`purpose-${choice.purpose_id}`}>{choice.purpose_name}</h3>
        <StateBadge dictionary={CONSENT_LABELS} value={choice.consent_status} />
      </div>

      <Facts items={[
        { term: 'Current decision', value: <StateBadge dictionary={CONSENT_LABELS} value={choice.consent_status} /> },
        { term: 'Consent version (epoch)', value: <span className="mono">{choice.consent_epoch}</span> },
        { term: 'Notice version', value: <span className="mono">{choice.notice ? choice.notice.version_id : 'No published notice'}</span> },
        { term: 'Notice published', value: formatTime(choice.notice?.published_at ?? null) },
      ]} />

      {choice.notice ? (
        <details style={{ marginTop: 12 }}>
          <summary><strong>{choice.notice.title}</strong> — read the notice you are being asked about</summary>
          <div className="notice-body" style={{ marginTop: 8 }}>{choice.notice.content}</div>
          <p className="muted mono">content_digest {choice.notice.content_digest}</p>
        </details>
      ) : (
        <NoticeBox tone="warn" title="No published notice">
          <p>Consent cannot be granted for this purpose until a notice version is published.</p>
        </NoticeBox>
      )}

      {failure ? (
        <>
          <FailureState failure={failure} />
          {failure.code === 'EPOCH_CONFLICT' ? (
            <p>
              <button type="button" onClick={onRecover}>Read my current decision again</button>
            </p>
          ) : null}
          {failure.outcomeUnknown ? (
            <NoticeBox tone="warn" title="Outcome unknown — do not assume this failed">
              <p>
                The request left this browser but no answer was seen. It may already have been recorded. Read the
                authoritative state before deciding again.
              </p>
              <p><button type="button" onClick={onRecover}>Read my authoritative current state</button></p>
            </NoticeBox>
          ) : null}
        </>
      ) : null}

      {choice.consent_status === 'GRANTED' ? (
        <>
          <p>
            You can withdraw at any time. Withdrawal takes one confirmation and does not ask you to accept
            anything new.
          </p>
          <button type="button" className="danger" disabled={busy} onClick={() => setConfirming(true)}>
            Withdraw consent
          </button>
        </>
      ) : (
        <form onSubmit={event => { event.preventDefault(); void submitGrant(); }}>
          <fieldset disabled={!choice.notice || busy}>
            <legend>Give consent for this purpose</legend>
            <CheckboxField
              label={<>I have read this notice and I affirmatively consent to <strong>{choice.purpose_name}</strong>.</>}
              checked={affirmed}
              onChange={setAffirmed}
            />
            <button type="submit" className="primary" disabled={!affirmed || busy}>
              {grant.status === 'pending' ? 'Recording…' : 'Give consent'}
            </button>
          </fieldset>
        </form>
      )}

      {confirming ? (
        <ConfirmDialog
          title="Withdraw consent"
          confirmLabel="Withdraw consent"
          tone="danger"
          busy={withdraw.status === 'pending'}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void submitWithdraw()}
        >
          <p>
            Withdrawing stops future processing for <strong>{choice.purpose_name}</strong>. You are not being asked
            to accept a new notice.
          </p>
          <p className="muted">Your existing receipts stay unchanged; withdrawal adds a new one.</p>
        </ConfirmDialog>
      ) : null}

      {receipt ? <ReceiptSummary receipt={receipt} /> : null}
    </section>
  );
}

/**
 * Immutable receipt facts exactly as the server accepted them. Current
 * propagation state is deliberately not merged in here: it is read separately on
 * the receipt page.
 */
function ReceiptSummary({ receipt }: { receipt: Receipt }) {
  return (
    <div className="notice notice-ok" role="status">
      <h3>Decision recorded — receipt {receipt.receipt_id}</h3>
      <Facts items={[
        { term: 'Recorded decision', value: <StateBadge dictionary={CONSENT_LABELS} value={receipt.consent_status} /> },
        { term: 'Consent version (epoch)', value: <span className="mono">{receipt.consent_epoch}</span> },
        { term: 'Accepted at', value: formatTime(receipt.accepted_at) },
        { term: 'Propagation at acceptance', value: <StateBadge dictionary={PROPAGATION_LABELS} value={receipt.propagation_status} /> },
        { term: 'Receipt id', value: <span className="mono">{receipt.receipt_id}</span> },
        { term: 'Event id', value: <span className="mono">{receipt.event_id}</span> },
      ]} />
      <p>
        These receipt facts never change. <a href={`/privacy/receipt/${receipt.receipt_id}`}>Open this receipt</a> to
        see it beside the separately refreshed current state.
      </p>
    </div>
  );
}
