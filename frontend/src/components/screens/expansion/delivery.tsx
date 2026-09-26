'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Area, Choice, Input, Many, WriteForm, all, nullable, text } from '../privacy-operations/registry-forms.tsx';

const STATE_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral'> = { AWAITING_REVIEW: 'warn', QUEUED: 'warn', RETRYING: 'warn', SENT: 'ok', EXHAUSTED: 'stop', REJECTED: 'neutral', CANCELLED: 'neutral' };
const label = (v: string) => v.toLowerCase().replaceAll('_', ' ');

/**
 * EX09 customer-controlled delivery. Transports are the customer's own SMTP
 * relay or webhook, enabled by a second person; messages are reviewed by
 * someone other than their author and sent by the local runner, which records
 * every attempt with its receipt.
 */
export function Delivery() {
  return (
    <>
      <PageHead eyebrow="Operations" title="Delivery"
        lede="Your own mail relay and webhooks, the messages sent through them, and every attempt with its receipt. Nothing is sent until a second person has enabled the transport and reviewed the message." />
      <Transports />
      <Routings />
      <Messages />
    </>
  );
}

function Transports() {
  const list = usePagedQuery('list_delivery_transports', { limit: 25 });
  const [kind, setKind] = useState('SMTP');
  const [secret, setSecret] = useState<string | null>(null);
  return (
    <Section title="Transports">
      <QueryBoundary query={list} label="transports" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Transports" rows={d.items} rowKey={t => t.id}
              columns={[
                { key: 'name', header: 'Transport', cell: t => <span className="cell-primary">{t.name}<span className="cell-sub">{t.kind === 'SMTP' ? `${t.host}:${t.port} · ${t.security === 'TLS' ? 'TLS' : 'plaintext (loopback only)'} · from ${t.from_address}${t.credential_env ? ` · credential ${t.credential_env}` : ''}` : t.url}</span></span> },
                { key: 'state', header: 'State', cell: t => <Badge label={label(t.state)} tone={t.state === 'ENABLED' ? 'ok' : t.state === 'PENDING' ? 'warn' : 'neutral'} /> },
                { key: 'by', header: 'Enabled by', cell: t => t.approved_by ? `${shortId(t.approved_by)} ${formatTime(t.approved_at!)}` : '—' },
                { key: 'act', header: '', cell: t => (
                  <span>
                    {t.state === 'PENDING' && <ActionButton operation="enable_delivery_transport" label="Enable" input={undefined as never} params={{ id: t.id }} onDone={() => list.refresh()} />}
                    {t.kind === 'WEBHOOK' && t.state === 'ENABLED' && !t.secret_revealed && <ActionButton operation="reveal_transport_signing_secret" label="Show signing key once" input={undefined as never} params={{ id: t.id }} onDone={r => { setSecret(r.secret); list.refresh(); }} />}
                    {t.state !== 'DISABLED' && <ActionButton operation="disable_delivery_transport" label="Disable" input={{ reason: 'Disabled from the delivery screen.' }} params={{ id: t.id }} onDone={() => list.refresh()} />}
                  </span>
                ) },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
      {secret && (
        <NoticeBox tone="warn" title="Copy this signing key now — it is shown once">
          <p><code>{secret}</code></p>
          <p>Your endpoint verifies <code>X-Orvia-Signature: sha256=HMAC-SHA256(key, X-Orvia-Timestamp + "." + body)</code>. The key is derived from this installation's secret and is not stored.</p>
          <button type="button" onClick={() => setSecret(null)}>I have copied it</button>
        </NoticeBox>
      )}
      <WriteForm operation="create_delivery_transport" label="Add a transport" onSaved={() => list.refresh()} describe={t => `${t.name} added; a second person must enable it`}
        build={f => kind === 'SMTP'
          ? { kind: 'SMTP', name: text(f, 'name'), host: text(f, 'host'), port: Number(text(f, 'port')), security: text(f, 'security') as 'TLS', from_address: text(f, 'from'), credential_env: nullable(f, 'credential') }
          : { kind: 'WEBHOOK', name: text(f, 'name'), url: text(f, 'url') }}>
        <Choice label="Kind" name="kind" value={kind} onChange={setKind} options={[{ value: 'SMTP', label: 'SMTP relay' }, { value: 'WEBHOOK', label: 'Webhook' }]} />
        <Input label="Name" name="name" minLength={3} maxLength={120} />
        {kind === 'SMTP' ? <>
          <Input label="Host" name="host" maxLength={253} />
          <Input label="Port" name="port" type="number" defaultValue="465" />
          <Choice label="Security" name="security" options={[{ value: 'TLS', label: 'TLS (certificate verified)' }, { value: 'NONE', label: 'Plaintext — loopback relay only' }]} />
          <Input label="Sender address" name="from" maxLength={254} />
          <Input label="Credential variable" name="credential" required={false} maxLength={76} hint="Name of an environment variable on this host holding user:password, such as ORVIA_TRANSPORT_RELAY. The password never enters ORVIA." />
        </> : <Input label="URL" name="url" maxLength={2000} hint="HTTPS, or HTTP to a loopback address. Redirects are not followed." />}
      </WriteForm>
    </Section>
  );
}

function Routings() {
  const list = usePagedQuery('list_alert_routings', { limit: 25 });
  const transports = useCollection('list_delivery_transports');
  return (
    <Section title="Compliance alert routing">
      <p className="cell-sub">Sends each new compliance alert of the chosen kinds to a recipient. The wording is fixed and reviewed once, when a second person enables the routing.</p>
      <QueryBoundary query={list} label="alert routings" isEmpty={d => !d.items.length}>
        {d => (
          <DataTable caption="Alert routings" rows={d.items} rowKey={r => r.id}
            columns={[
              { key: 'to', header: 'Recipient', cell: r => <span className="cell-primary">{r.recipient}<span className="cell-sub">{r.kinds.map(label).join(', ')} · "{r.subject_prefix}"</span></span> },
              { key: 'state', header: 'State', cell: r => <Badge label={label(r.state)} tone={r.state === 'ENABLED' ? 'ok' : r.state === 'PENDING' ? 'warn' : 'neutral'} /> },
              { key: 'act', header: '', cell: r => r.state === 'PENDING' ? <ActionButton operation="decide_alert_routing" label="Enable" input={{ action: 'ENABLE' }} params={{ id: r.id }} onDone={() => list.refresh()} />
                : r.state === 'ENABLED' ? <ActionButton operation="decide_alert_routing" label="Disable" input={{ action: 'DISABLE' }} params={{ id: r.id }} onDone={() => list.refresh()} /> : null },
            ]} />
        )}
      </QueryBoundary>
      <WriteForm operation="create_alert_routing" label="Route compliance alerts" onSaved={() => list.refresh()} describe={() => 'Routing added; a second person must enable it'}
        build={f => ({ transport_id: text(f, 'transport'), recipient: text(f, 'recipient'), kinds: all(f, 'kinds') as 'ERROR'[], subject_prefix: text(f, 'prefix') })}>
        <Choice label="Transport" name="transport" options={(transports.data?.items ?? []).filter(t => t.state === 'ENABLED').map(t => ({ value: t.id, label: t.name }))} />
        <Input label="Recipient" name="recipient" maxLength={254} hint="An email address for SMTP, or a label your webhook understands." />
        <Many legend="Alert kinds" name="kinds" options={[{ value: 'DRIFT_TO_FAIL', label: 'Drifted to fail' }, { value: 'RECOVERED', label: 'Recovered' }, { value: 'ERROR', label: 'Check could not run' }]} />
        <Input label="Subject prefix" name="prefix" minLength={3} maxLength={60} defaultValue="[ORVIA]" />
      </WriteForm>
    </Section>
  );
}

function Messages() {
  const list = usePagedQuery('list_outbound_messages', { limit: 25 });
  const transports = useCollection('list_delivery_transports');
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <Section title="Messages">
      <QueryBoundary query={list} label="messages" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Outbound messages" rows={d.items} rowKey={m => m.id}
              columns={[
                { key: 'subject', header: 'Message', cell: m => <span className="cell-primary">{m.subject}<span className="cell-sub">to {m.recipient} · {label(m.source_kind)}</span></span> },
                { key: 'state', header: 'Delivery', cell: m => <Badge label={label(m.delivery_state)} tone={STATE_TONE[m.delivery_state] ?? 'neutral'} /> },
                { key: 'attempts', header: 'Attempts', cell: m => m.attempts.length ? `${m.attempts.length}${m.attempts.some(a => a.possible_duplicate) ? ' (possible duplicate)' : ''}` : '—' },
                { key: 'act', header: '', cell: m => (
                  <span>
                    {m.review_state === 'DRAFT' && <ActionButton operation="review_outbound_message" label="Approve" input={{ decision: 'APPROVE', note: 'Content reviewed on the delivery screen.' }} params={{ id: m.id }} onDone={() => list.refresh()} />}
                    {m.review_state === 'DRAFT' && <ActionButton operation="review_outbound_message" label="Reject" input={{ decision: 'REJECT', note: 'Rejected on the delivery screen.' }} params={{ id: m.id }} onDone={() => list.refresh()} />}
                    {['QUEUED', 'RETRYING'].includes(m.delivery_state) && <ActionButton operation="withdraw_outbound_message" label="Withdraw" input={undefined as never} params={{ id: m.id }} onDone={() => list.refresh()} />}
                    <button type="button" onClick={() => setSelected(m.id)}>Open</button>
                  </span>
                ) },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
      {selected && <MessageDetail key={selected} id={selected} />}
      <WriteForm operation="compose_outbound_message" label="Compose a message" onSaved={() => list.refresh()} describe={() => 'Composed; someone else must review it before it is sent'}
        build={f => ({ transport_id: text(f, 'transport'), source_kind: 'MANUAL', source_id: null, recipient: text(f, 'recipient'), subject: text(f, 'subject'), body: text(f, 'body') })}>
        <Choice label="Transport" name="transport" options={(transports.data?.items ?? []).filter(t => t.state === 'ENABLED').map(t => ({ value: t.id, label: t.name }))} />
        <Input label="Recipient" name="recipient" maxLength={254} />
        <Input label="Subject" name="subject" minLength={3} maxLength={300} />
        <Area label="Body" name="body" minLength={10} maxLength={20000} />
      </WriteForm>
    </Section>
  );
}

function MessageDetail({ id }: { id: string }) {
  const m = useQuery('outbound_message', { params: { id } });
  return (
    <QueryBoundary query={m} label="message" isEmpty={() => false}>
      {x => (
        <div className="panel">
          <h3>{x.subject}</h3>
          <p className="cell-sub">To {x.recipient}. Written by {shortId(x.authored_by)} {formatTime(x.authored_at)}{x.reviewed_by ? `; reviewed by ${shortId(x.reviewed_by)} ${formatTime(x.reviewed_at!)}` : x.routing_id ? '; from a reviewed alert routing' : ''}.</p>
          <pre className="cell-sub" style={{ whiteSpace: 'pre-wrap' }}>{x.body}</pre>
          {x.attempts.length ? <DataTable caption="Delivery attempts" rows={x.attempts} rowKey={a => String(a.attempt)}
            columns={[
              { key: 'n', header: 'Attempt', cell: a => String(a.attempt) },
              { key: 'outcome', header: 'Outcome', cell: a => <Badge label={a.outcome === 'UNKNOWN' ? 'unknown effect' : label(a.outcome)} tone={a.outcome === 'SENT' ? 'ok' : a.outcome === 'UNKNOWN' ? 'warn' : 'stop'} /> },
              { key: 'code', header: 'Response', cell: a => a.response_code ?? a.error_code ?? '—' },
              { key: 'receipt', header: 'Receipt', cell: a => a.receipt ?? '—' },
              { key: 'dup', header: '', cell: a => a.possible_duplicate ? 'possible duplicate' : '' },
              { key: 'at', header: 'Finished', cell: a => formatTime(a.finished_at) },
            ]} /> : <p>No attempt yet.{x.next_attempt_at ? ` Next attempt after ${formatTime(x.next_attempt_at)}.` : ''}</p>}
        </div>
      )}
    </QueryBoundary>
  );
}
