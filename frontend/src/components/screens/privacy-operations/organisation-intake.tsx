'use client';
import { useState } from 'react';
import { useCollection, useMutation, usePagedQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { Choice, Input, WriteForm, text } from './registry-forms.tsx';

const SUBMISSION: Record<string, { label: string; tone: 'ok' | 'warn' | 'stop' | 'neutral' | 'info' }> = {
  RECEIVED: { label: 'Received, not yet applied', tone: 'info' }, APPLIED: { label: 'Applied', tone: 'ok' },
  NEEDS_STAFF: { label: 'Needs staff', tone: 'warn' }, HANDLED: { label: 'Handled by staff', tone: 'neutral' },
};
const YES_NO = [{ value: 'yes', label: 'Yes' }, { value: 'no', label: 'No' }];
const yes = (form: FormData, key: string) => { const v = text(form, key); if (v !== 'yes' && v !== 'no') throw new Error('Answer every yes/no question.'); return v === 'yes'; };

/**
 * How the organisation's customers reach ORVIA (revision 1.7). Rule 14(1) of the DPDP Rules, 2025 puts the means of making a
 * request on the organisation's own website or app, so that is the main route in: the organisation's application sends what
 * its signed-in customers did, with a key created here. The separate Privacy Centre is optional and off unless switched on.
 */
export function OrganisationIntake() {
  return (
    <>
      <PageHead eyebrow="Registry" title="Website & app intake"
        lede="Your customers use your own website or app to give or withdraw consent and to make privacy requests. Your application sends each one here, and it is handled in this Workspace like any other." />
      <NoticeBox tone="info" title="Why it works this way">
        <p>Rule 14(1) of the DPDP Rules, 2025 asks you to publish the means of making a request on your own website or app. Customers do not need to visit a separate ORVIA site or keep a second password. Requests that arrive by email or phone are still recorded by staff on the Privacy requests and Consent records pages.</p>
      </NoticeBox>
      <NoticeBox tone="info" title="Optional Privacy Centre">
        <p>If you also want a customer-facing Privacy Centre served from this installation, turn it on in the <a href="/workspace/privacy-centre">Privacy Centre</a> module.</p>
      </NoticeBox>
      <IntakeKeys />
      <Submissions />
      <DeveloperGuide />
    </>
  );
}

function IntakeKeys() {
  const list = usePagedQuery('list_intake_clients', { limit: 50 });
  const systems = useCollection('list_systems');
  const revoke = useMutation('revoke_intake_client', true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<{ name: string; key: string } | null>(null);
  const systemOptions = (systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }));
  return (
    <Section title="Intake keys">
      <p className="muted">One key per application of yours (for example your customer account site or mobile app backend). The key is a server secret: requests sent from a web browser are refused, so it must stay on your server. Revoke a key at once if it may have leaked, and create a new one.</p>
      {shown ? (
        <NoticeBox tone="warn" title={`Key for ${shown.name}: copy it now`}>
          <p>This is the only time the key is shown. ORVIA keeps only a fingerprint of it.</p>
          <p><code style={{ wordBreak: 'break-all' }}>{shown.key}</code></p>
          <button type="button" onClick={() => setShown(null)}>I have stored it securely</button>
        </NoticeBox>
      ) : null}
      <Freshness query={list} />
      <QueryBoundary query={list} label="intake keys" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Intake keys" rows={d.items} rowKey={k => k.id}
              columns={[
                { key: 'name', header: 'Application', cell: k => <span className="cell-primary">{k.name}<span className="cell-sub">Customer identifiers are its identifiers in system {k.system_name}</span></span> },
                { key: 'accepts', header: 'Accepts', cell: k => [k.accepts_consent && 'consent changes', k.accepts_rights && 'rights requests'].filter(Boolean).join(', ') },
                { key: 'identity', header: 'Signs customers in', cell: k => k.authenticates_customers ? 'Yes: identity starts established when the identifier matches' : 'No: staff review identity' },
                { key: 'use', header: 'Use', cell: k => <>{k.submissions} received<span className="cell-sub">{k.last_used_at ? `last ${formatTime(k.last_used_at)}` : 'never used'}</span></> },
                { key: 'state', header: 'State', cell: k => k.revoked_at ? <><Badge label="revoked" tone="stop" /><span className="cell-sub">{formatTime(k.revoked_at)}: {k.revocation_reason}</span></> : (
                  <span className="row">
                    <Badge label="active" tone="ok" />
                    <input aria-label="Revocation reason" placeholder="Reason (at least 10 characters)" value={reasons[k.id] ?? ''} maxLength={500} onChange={e => setReasons({ ...reasons, [k.id]: e.target.value })} />
                    <button type="button" disabled={(reasons[k.id] ?? '').trim().length < 10} onClick={async () => { revoke.newInteraction(); if (await revoke.run({ reason: reasons[k.id]!.trim() }, { params: { id: k.id } })) list.refresh(); }}>Revoke</button>
                  </span>) },
              ]} />
            {revoke.failure && <FailureState failure={revoke.failure} />}
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
      <WriteForm operation="create_intake_client" label="Create an intake key" onSaved={r => { setShown({ name: r.client.name, key: r.key }); list.refresh(); }}
        describe={r => `key created for ${r.client.name}; copy it from the box above`}
        build={f => ({ name: text(f, 'name'), system_id: text(f, 'system'), authenticates_customers: yes(f, 'auth'), accepts_consent: yes(f, 'consent'), accepts_rights: yes(f, 'rights') })}>
        <Input label="Application name" name="name" maxLength={120} hint="For example: Customer account website." />
        <Choice label="Registered system this application is" name="system" options={systemOptions} hint="Customer identifiers sent with this key are matched against Data Principal references in this system." />
        <Choice label="Does this application sign its customers in before sending anything for them?" name="auth" options={YES_NO} hint="Answer yes only if it does. With yes, a rights request for a matched customer starts with identity established; with no, staff review identity." />
        <Choice label="Accept consent changes?" name="consent" options={YES_NO} />
        <Choice label="Accept rights requests?" name="rights" options={YES_NO} />
      </WriteForm>
    </Section>
  );
}

function Submissions() {
  const [status, setStatus] = useState('');
  const list = usePagedQuery('list_intake_submissions', { limit: 25, query: status ? { status } : undefined });
  const handle = useMutation('handle_intake_submission', true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <Section title="Received from your applications">
      <p className="muted">Every submission is kept. ORVIA applies it within about a minute: a consent change goes onto the person&apos;s consent record (a withdrawal then reaches every linked system), and a rights request appears on the Privacy requests page. One that cannot be applied waits here for staff with the reason.</p>
      <label className="row">Show <select value={status} onChange={e => setStatus(e.target.value)} aria-label="Filter by status">
        <option value="">All</option><option value="NEEDS_STAFF">Needs staff</option><option value="RECEIVED">Received, not yet applied</option><option value="APPLIED">Applied</option><option value="HANDLED">Handled by staff</option>
      </select></label>
      <Freshness query={list} />
      <QueryBoundary query={list} label="submissions" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Submissions" rows={d.items} rowKey={s => s.id}
              columns={[
                { key: 'what', header: 'What', cell: s => <span className="cell-primary">{s.summary}<span className="cell-sub">customer {s.customer_reference} · {s.client_name}</span></span> },
                { key: 'when', header: 'Received', cell: s => formatTime(s.received_at) },
                { key: 'status', header: 'Status', cell: s => <><Badge label={SUBMISSION[s.status]!.label} tone={SUBMISSION[s.status]!.tone} />{s.outcome_reason && <span className="cell-sub">{s.outcome_reason}</span>}{s.handled_note && <span className="cell-sub">Staff: {s.handled_note}</span>}</> },
                { key: 'result', header: 'Result', cell: s => s.consent_record_id ? <a href="/workspace/consent-records">Consent record {shortId(s.consent_record_id)}</a> : s.rights_request_id ? <a href="/workspace/rights">Request {shortId(s.rights_request_id)}</a> : '—' },
                { key: 'handle', header: '', cell: s => s.status !== 'NEEDS_STAFF' ? null : (
                  <span className="row">
                    <input aria-label="What staff did" placeholder="What you did (at least 10 characters)" value={notes[s.id] ?? ''} maxLength={500} onChange={e => setNotes({ ...notes, [s.id]: e.target.value })} />
                    <button type="button" disabled={(notes[s.id] ?? '').trim().length < 10} onClick={async () => { handle.newInteraction(); if (await handle.run({ note: notes[s.id]!.trim() }, { params: { id: s.id } })) list.refresh(); }}>Mark handled</button>
                  </span>) },
              ]} />
            {handle.failure && <FailureState failure={handle.failure} />}
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

function DeveloperGuide() {
  return (
    <Section title="For your developers">
      <p className="muted">Your application&apos;s server calls this installation directly. Nothing passes through Cyberfyx.</p>
      <ul>
        <li><code>POST /api/v1/intake/consents</code> with <code>{'{ customer_reference, activity_id, decision: "GRANTED" | "WITHDRAWN", occurred_at, notice_version_id, evidence_reference }'}</code></li>
        <li><code>POST /api/v1/intake/rights-requests</code> with <code>{'{ customer_reference, right_type: "ACCESS" | "CORRECTION" | "ERASURE" | "GRIEVANCE" | "NOMINATION", description, display_name, email }'}</code></li>
        <li><code>GET /api/v1/intake/submissions/{'{id}'}</code> to see whether it was applied, the consent status or the request state.</li>
      </ul>
      <p className="muted">Send <code>Authorization: Bearer &lt;key&gt;</code>, <code>Content-Type: application/json</code> and a unique <code>Idempotency-Key</code> (16 to 128 letters, digits, - or _) on each submission; resending with the same key returns the same submission. A 202 response means received, not completed. The full guide is in the ORVIA documentation, <code>docs/integration/ORGANISATION_INTAKE.md</code>.</p>
    </Section>
  );
}
