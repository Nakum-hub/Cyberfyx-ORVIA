'use client';
import { useCallback, useEffect, useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { useMutation, usePagedQuery } from '../../components/shared/api.ts';
import { MutationFeedback } from '../../components/shared/mutation-feedback.tsx';
import { newerReceipt } from '../../components/shared/derive.ts';
import { DomainGuard } from '../../components/shared/session-context.tsx';
import { CONSENT_LABELS, PROPAGATION_LABELS, formatTime, shortId } from '../../components/shared/state-labels.ts';
import {
  Badge, CheckboxField, ConfirmDialog, EmptyState, Facts, Freshness, Pagination,
  NoticeBox, PageHead, QueryBoundary, StateBadge, StoryCell, TechnicalDetails, TextField,
} from '../../components/shared/ui.tsx';

type Choice = ReturnType<typeof schemas.ConsentChoice.parse>;
type Receipt = ReturnType<typeof schemas.Receipt.parse>;

export default function PrivacyCentrePage() {
  return (
    <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">
      {() => <Choices />}
    </DomainGuard>
  );
}

const DECISION_ORDER: Record<string, number> = { GRANTED: 0, WITHDRAWN: 1, NOT_GIVEN: 2 };

function Choices() {
  const choices = usePagedQuery('own_consents', { limit: 25 });
  const [receipts, setReceipts] = useState<Record<string, Receipt>>({});
  const [filter, setFilter] = useState('');

  // Every accepted decision consumes its interaction, so authoritative choices
  // are re-read before the next decision can be made.
  const recordReceipt = useCallback((purposeId: string, receipt: Receipt) => {
    setReceipts(previous => (newerReceipt(previous[purposeId] ?? null, receipt) ? { ...previous, [purposeId]: receipt } : previous));
    choices.refresh();
  }, [choices]);

  return (
    <>
      <PageHead
        eyebrow="Privacy Centre"
        title="My choices"
        lede="These are the consent decisions recorded for you in this organisation. Granting is an affirmative, purpose-specific act. Withdrawing is always available, takes one confirmation and never requires accepting a new notice."
      />
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
        {data => {
          const counts = data.items.reduce<Record<string, number>>((totals, item) => {
            totals[item.consent_status] = (totals[item.consent_status] ?? 0) + 1;
            return totals;
          }, {});
          const needle = filter.trim().toLowerCase();
          // Decisions this person has actually made are shown first, and the
          // filter only narrows the page already read into this screen.
          const visible = [...data.items]
            .filter(item => !needle || item.purpose_name.toLowerCase().includes(needle))
            .sort((a, b) => (DECISION_ORDER[a.consent_status] ?? 3) - (DECISION_ORDER[b.consent_status] ?? 3));
          return (
            <>
              <div className="panel panel-quiet">
                <div className="row row-between">
                  <div className="row" style={{ gap: 'var(--s4)' }}>
                    <span><strong>{counts['GRANTED'] ?? 0}</strong> granted</span>
                    <span><strong>{counts['WITHDRAWN'] ?? 0}</strong> withdrawn</span>
                    <span><strong>{counts['NOT_GIVEN'] ?? 0}</strong> not decided</span>
                  </div>
                  <span className="muted" style={{ fontSize: 12.5 }}>on this page of {data.items.length} purpose(s)</span>
                </div>
                <div style={{ marginTop: 'var(--s3)', maxWidth: 420 }}>
                  <TextField label="Find a purpose" value={filter} onChange={setFilter} hint="Filters the purposes already read into this screen." />
                </div>
              </div>
              {visible.map(choice => (
                <ChoiceCard
                  key={choice.purpose_id}
                  choice={choice}
                  receipt={receipts[choice.purpose_id] ?? null}
                  onReceipt={receipt => recordReceipt(choice.purpose_id, receipt)}
                  onRecover={() => choices.refresh()}
                />
              ))}
              {!visible.length ? <EmptyState title="No purpose on this page matches that text"><p>Clear the filter, or use the pages below to read more of your record.</p></EmptyState> : null}
            </>
          );
        }}
      </QueryBoundary>
      <Pagination query={choices}/>
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
  const busy = grant.status === 'pending' || withdraw.status === 'pending' || grant.unsettled || withdraw.unsettled;
  const failure = grant.failure ?? withdraw.failure;
  useEffect(()=>{setAffirmed(false);grant.reset();withdraw.reset();},[choice.interaction_id,grant.reset,withdraw.reset]);

  const submitGrant = async () => {
    if (!choice.notice || !affirmed || busy) return;
    const result = await grant.run(
      { expected_epoch: choice.consent_epoch, notice_version_id: choice.notice.version_id, interaction_id: choice.interaction_id, affirmative: true },
      { params: { purpose_id: choice.purpose_id } });
    if (result) { setAffirmed(false); onReceipt(result); }
  };

  const submitWithdraw = async () => {
    if(busy)return;
    const result = await withdraw.run(
      { expected_epoch: choice.consent_epoch, interaction_id: choice.interaction_id },
      { params: { purpose_id: choice.purpose_id } });
    setConfirming(false);
    if (result) onReceipt(result);
  };

  return (
    <section className="panel" aria-labelledby={`purpose-${choice.purpose_id}`}>
      <div className="row row-between" style={{ marginBottom: 'var(--s4)' }}>
        <h3 id={`purpose-${choice.purpose_id}`} style={{ fontSize: 18, margin: 0 }}>{choice.purpose_name}</h3>
        <StateBadge dictionary={CONSENT_LABELS} value={choice.consent_status} large />
      </div>

      <div className="story" style={{ marginBottom: 'var(--s4)' }}>
        <div className="story-grid">
          <StoryCell term="Your current choice" value={<StateBadge dictionary={CONSENT_LABELS} value={choice.consent_status} />} />
          <StoryCell term="Notice version" value={choice.notice ? shortId(choice.notice.version_id) : 'No published notice'} small />
          <StoryCell term="Notice published" value={formatTime(choice.notice?.published_at ?? null)} small />
          <StoryCell term="Decision version" value={`Change ${choice.consent_epoch}`} small />
        </div>
      </div>

      {choice.notice ? (
        <details className="reveal" style={{ marginBottom: 'var(--s4)' }}>
          <summary><strong>{choice.notice.title}</strong> — read the notice you are being asked about</summary>
          <div className="notice-body" style={{ marginTop: 'var(--s3)' }}>{choice.notice.content}</div>
          <p className="muted mono">content_digest {choice.notice.content_digest}</p>
        </details>
      ) : (
        <NoticeBox tone="warn" title="No published notice">
          <p>Consent cannot be granted for this purpose until a notice version is published.</p>
        </NoticeBox>
      )}

      <MutationFeedback mutation={grant} onReplayed={result=>onReceipt(result as Receipt)}/>
      <MutationFeedback mutation={withdraw} onReplayed={result=>onReceipt(result as Receipt)}/>
      {failure?.code === 'EPOCH_CONFLICT' ? <p><button type="button" onClick={onRecover}>Read my current decision again</button> The epoch, notice or interaction may have changed or expired. Read again before making a new decision.</p> : null}
      {grant.unsettled || withdraw.unsettled ? <p><button type="button" onClick={onRecover}>Read my authoritative current state</button> Reading current state does not settle the preserved request.</p> : null}

      {choice.consent_status === 'GRANTED' ? (
        <>
          <p>
            You can withdraw at any time. Withdrawal takes one confirmation and does not ask you to accept
            anything new. Downstream restriction and independent verification are tracked separately and are
            shown on your receipt.
          </p>
          <button type="button" className="primary" disabled={busy} onClick={() => setConfirming(true)}>
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
          tone="primary"
          busy={withdraw.status === 'pending'}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void submitWithdraw()}
        >
          <p>
            Withdrawing records your refusal of future marketing for <strong>{choice.purpose_name}</strong>. You are not being asked
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
    <div className="notice notice-ok" role="status" style={{ marginTop: 'var(--s4)' }}>
      <h3>Decision recorded — receipt {receipt.receipt_id}</h3>
      <p>This is your proof. These facts never change, even if you change your mind again later.</p>
      <Facts tight items={[
        { term: 'Recorded decision', value: <StateBadge dictionary={CONSENT_LABELS} value={receipt.consent_status} /> },
        { term: 'Decision version', value: <>Change {receipt.consent_epoch}</> },
        { term: 'Accepted at', value: formatTime(receipt.accepted_at) },
        { term: 'Downstream work', value: <StateBadge dictionary={PROPAGATION_LABELS} value={receipt.propagation_status} /> },
      ]} />
      <p style={{ marginTop: 'var(--s3)' }}>
        <a href={`/privacy/receipt/${receipt.receipt_id}`}>Open this receipt</a> to see it beside the separately
        refreshed current state.
      </p>
      <p className="muted" style={{ marginBottom: 0, fontSize: 12.5 }}>
        <Badge label="Receipt is immutable" tone="info" meaning="ORVIA never rewrites an accepted receipt. A later decision adds a new one." />
      </p>
      <TechnicalDetails items={[
        { term: 'Receipt id', value: receipt.receipt_id },
        { term: 'Consent event id', value: receipt.event_id },
        { term: 'Purpose', value: receipt.purpose_id },
        { term: 'Consent epoch', value: String(receipt.consent_epoch) },
        { term: 'Workflow', value: receipt.workflow_id ?? 'none — no propagation was required' },
      ]} />
    </div>
  );
}
