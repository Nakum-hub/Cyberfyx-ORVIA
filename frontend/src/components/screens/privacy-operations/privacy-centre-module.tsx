'use client';
import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '../../shared/api.ts';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { formatTime } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, QueryBoundary, Section } from '../../shared/ui.tsx';

/**
 * The Privacy Centre module (owner decision 2026-10-03, revision 1.7 amended): managed from the Workspace like every other
 * module and included on every plan (INTAKE_AND_PORTAL, Foundation). Staff switch it on or off, publish its address on the
 * organisation's own website or app, and handle what customers do there in the existing Privacy requests and Consent records
 * screens. Customers never use the staff Workspace: they sign in to the Privacy Centre pages with their own customer account,
 * a separate authentication domain, and only while it is on.
 */
const CUSTOMER_PAGES = [
  { path: '/privacy', name: 'My choices', what: 'Their current consent for each purpose, with grant and withdraw.' },
  { path: '/privacy/rights', name: 'My rights', what: 'Access, correction, erasure, grievance and nomination requests and their progress.' },
  { path: '/privacy/preferences', name: 'Contact preferences', what: 'How the organisation may contact them.' },
  { path: '/privacy/notices', name: 'Privacy notices', what: 'The published notices that apply to them, in their language.' },
  { path: '/privacy/receipts', name: 'My receipts', what: 'An immutable receipt for every decision they made.' },
];

export function PrivacyCentre() {
  return (
    <>
      <PageHead eyebrow="Privacy controls" title="Privacy Centre"
        lede="An optional customer-facing site served from this installation, where your customers see and change their consent and make privacy requests. You manage it here; your customers reach it from the link you publish on your website or app." />
      <PrivacyCentreSwitch />
      <CustomerAddress />
      <Section title="What your customers see">
        <DataTable caption="Privacy Centre pages" rows={CUSTOMER_PAGES} rowKey={p => p.path}
          columns={[
            { key: 'name', header: 'Page', cell: p => <span className="cell-primary">{p.name}<span className="cell-sub mono">{p.path}</span></span> },
            { key: 'what', header: 'What the customer can do', cell: p => p.what },
          ]} />
      </Section>
      <Section title="Where its work arrives">
        <p>Consent changes made in the Privacy Centre appear in <a href="/workspace/consent-records">Consent records</a>; requests appear in <a href="/workspace/rights">Privacy requests</a> with their statutory deadlines, exactly like requests from your website or app (<a href="/workspace/organisation-intake">Website &amp; app intake</a>). Customer accounts are your <a href="/workspace/data-principals">Data Principals</a>.</p>
      </Section>
    </>
  );
}

function CustomerAddress() {
  const [origin, setOrigin] = useState('');
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const address = origin ? `${origin}/privacy` : '';
  return (
    <Section title="Address for your customers">
      <p className="muted">Publish this link on your website or app (for example in your privacy policy and account settings). Staff cannot sign in there, and customers cannot sign in to this Workspace.</p>
      {address ? <p><code>{address}</code> <button type="button" onClick={() => void navigator.clipboard?.writeText(address)}>Copy link</button></p> : null}
      <NoticeBox tone="info" title="Before you publish it">
        <p>Serve this installation over HTTPS at an address your customers recognise, and keep the Privacy Centre on only while the link is published.</p>
      </NoticeBox>
    </Section>
  );
}

function PrivacyCentreSwitch() {
  const { session } = useSession();
  const setting = useQuery('privacy_centre_setting');
  const change = useMutation('change_privacy_centre', true);
  const [reason, setReason] = useState('');
  return (
    <Section title="On or off">
      <p className="muted">Most organisations with their own website or app do not need it. While it is off, no customer can sign in to it.</p>
      <Freshness query={setting} />
      <QueryBoundary query={setting} label="Privacy Centre setting">
        {s => (
          <div className="panel">
            <p><Badge label={s.enabled ? 'On' : 'Off'} tone={s.enabled ? 'ok' : 'neutral'} /> {s.changed_at ? <>since {formatTime(s.changed_at)}: {s.reason}</> : 'Off since installation; it has never been turned on.'}</p>
            <p className="muted">Customer accounts in this organisation: {s.customer_accounts}. {s.enabled ? '' : 'While it is off none of them can sign in.'}</p>
            {hasCapability(session, 'connection.enable') ? (
              <span className="row">
                <input aria-label="Reason for the change" placeholder="Reason (at least 10 characters)" value={reason} maxLength={500} onChange={e => setReason(e.target.value)} />
                <button type="button" disabled={reason.trim().length < 10 || change.status === 'pending'} onClick={async () => {
                  change.newInteraction();
                  if (await change.run({ enabled: !s.enabled, reason: reason.trim() })) { setReason(''); setting.refresh(); }
                }}>{s.enabled ? 'Turn the Privacy Centre off' : 'Turn the Privacy Centre on'}</button>
              </span>
            ) : <p className="muted">Only an organisation super administrator can change this.</p>}
            {change.failure && <FailureState failure={change.failure} />}
          </div>
        )}
      </QueryBoundary>
    </Section>
  );
}
