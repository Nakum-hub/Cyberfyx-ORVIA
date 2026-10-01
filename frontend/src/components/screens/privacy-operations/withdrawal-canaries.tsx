'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery } from '../../shared/api.ts';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Choice, Input, WriteForm, text } from './registry-forms.tsx';

const SOURCE: Record<string, string> = {
  SEND_ADMISSION: 'a sender asked ORVIA to admit a message', OUTBOUND_MESSAGE: 'an ORVIA transport message was addressed to it',
  CONSENT_RECORDED: 'consent was recorded for it', REPORTED_RECEIPT: 'its mailbox or phone received a message',
};
const localToIso = (form: FormData, key: string) => { const v = text(form, key); if (!v) throw new Error('Enter when it was received.'); return new Date(v).toISOString(); };

/**
 * Withdrawal canaries (migration 0079). Decoy people the organisation plants in its own systems, who never consented. Any
 * marketing to them, any message to them from ORVIA, or any consent recorded for them is evidence that withdrawal is not being
 * honoured somewhere. Only people with sensitive registry access see which people are canaries.
 */
export function WithdrawalCanaries() {
  const { session } = useSession();
  if (!hasCapability(session, 'registry.sensitive.read')) return null;
  return <Canaries />;
}

function Canaries() {
  const { session } = useSession();
  const canaries = usePagedQuery('list_withdrawal_canaries', { limit: 50 });
  const hits = usePagedQuery('list_canary_hits', { limit: 25, query: { open: 'true' } });
  const principals = useCollection('list_principals');
  const [reportId, setReportId] = useState('');
  const refresh = () => { canaries.refresh(); hits.refresh(); };
  return (
    <Section title="Withdrawal canaries">
      <NoticeBox tone="info" title="A decoy person who never consented">
        <p>Create a synthetic person in your marketing lists and systems who has never given consent, and register them here. If any system markets to them, any ORVIA message is addressed to them, or anyone records consent for them, it shows up below and in Operations attention: proof that withdrawal or consent is not being honoured somewhere. If the decoy mailbox receives a message, record it with its evidence.</p>
      </NoticeBox>
      <Freshness query={hits} />
      <h3>Unreviewed hits</h3>
      <QueryBoundary query={hits} label="canary hits" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Unreviewed canary hits" rows={d.items} rowKey={h => h.id}
              columns={[
                { key: 'c', header: 'Canary', cell: h => <span className="cell-primary">{h.canary_label}<span className="cell-sub">{formatTime(h.observed_at)}</span></span> },
                { key: 's', header: 'What happened', cell: h => <><Badge label={SOURCE[h.source] ?? h.source} tone="stop" /><span className="cell-sub">{h.detail}</span></> },
                { key: 'a', header: 'By', cell: h => `${h.actor_domain.toLowerCase()} ${shortId(h.actor_id)}${h.system_id ? ` · system ${shortId(h.system_id)}` : ''}` },
                { key: 'r', header: 'Review', cell: h => (
                  <WriteForm operation="review_canary_hit" label="Record review" params={{ id: h.id }} onSaved={refresh} describe={() => 'Reviewed'} build={f => ({ note: text(f, 'note') })}>
                    <Input label="What was found and done" name="note" maxLength={1000} hint="For example: traced to the newsletter tool ignoring the suppression list; ticket raised." />
                  </WriteForm>) },
              ]} />
            <Pagination query={hits} />
          </>
        )}
      </QueryBoundary>
      <h3>Canaries</h3>
      <QueryBoundary query={canaries} label="canaries" isEmpty={d => !d.items.length}>
        {d => (
          <DataTable caption="Withdrawal canaries" rows={d.items} rowKey={k => k.id}
            columns={[
              { key: 'l', header: 'Canary', cell: k => <span className="cell-primary">{k.label}<span className="cell-sub">{k.principal_email} · planted in {k.planted_in}</span></span> },
              { key: 's', header: 'State', cell: k => <Badge label={k.state.toLowerCase()} tone={k.state === 'ACTIVE' ? 'ok' : k.state === 'PENDING' ? 'warn' : 'neutral'} /> },
              { key: 'h', header: 'Open hits', cell: k => k.open_hits ? <Badge label={String(k.open_hits)} tone="stop" /> : '0' },
              { key: 'a', header: '', cell: k => k.state === 'PENDING'
                ? (k.created_by === session?.actor_id ? <span className="cell-sub">Another person must activate it</span> : <ActionButton operation="activate_withdrawal_canary" label="Activate" input={undefined as never} params={{ id: k.id }} onDone={refresh} />)
                : k.state === 'ACTIVE' ? <ActionButton operation="retire_withdrawal_canary" label="Retire" input={undefined as never} params={{ id: k.id }} onDone={refresh} /> : null },
            ]} />
        )}
      </QueryBoundary>
      <div className="grid-2">
        <WriteForm operation="create_withdrawal_canary" label="Register a canary" onSaved={refresh} describe={k => `${k.label} registered; another person must activate it`}
          build={f => ({ label: text(f, 'label'), principal_id: text(f, 'principal'), planted_in: text(f, 'planted') })}>
          <Input label="Label" name="label" hint="For staff only, for example: Decoy shopper A." />
          <Choice label="Decoy person" name="principal" options={(principals.data?.items ?? []).map(p => ({ value: p.id, label: `${p.display_name} (${p.email})` }))} hint="A synthetic person with no consent. Activation is refused if they hold any granted consent." />
          <Input label="Where it is planted" name="planted" maxLength={500} hint="Which lists and systems contain this decoy, so a hit can be traced." />
        </WriteForm>
        <WriteForm operation="record_canary_receipt" label="Record a message the decoy received" params={reportId ? { id: reportId } : undefined} onSaved={refresh} describe={() => 'Hit recorded'}
          build={f => { if (!reportId) throw new Error('Choose the canary.'); return { detail: text(f, 'detail'), evidence_reference: text(f, 'evidence'), observed_at: localToIso(f, 'at'), system_id: null }; }}>
          <Choice label="Canary" name="canary" value={reportId} onChange={setReportId} options={(canaries.data?.items ?? []).filter(k => k.state === 'ACTIVE').map(k => ({ value: k.id, label: k.label }))} />
          <Input label="What arrived" name="detail" maxLength={1000} hint="Sender, subject and channel." />
          <Input label="Evidence" name="evidence" maxLength={500} hint="Where the message is kept, for example a mailbox export." />
          <Input label="Received at" name="at" type="datetime-local" />
        </WriteForm>
      </div>
    </Section>
  );
}
