'use client';
import { useEffect, useState } from 'react';
import { DataTable, Metric, NoticeBox } from '../../components/shared/ui.tsx';
import { useVendorSession, vendorCall, explain, can, VENDOR_ROLE_LABELS } from '../../components/vendor/vendor.tsx';

/**
 * Vendor home. Leadership (super administrator, administrator) sees the practice
 * at a glance: counts read from the vendor database by vendor.overview(), never
 * evidence content, which stays with each engagement team. Auditors and client
 * accounts are sent to their own work.
 */
type Overview = { as_of: string; organisations: number; licence_states: Record<string, number>; licences_expiring_60_days: number; engagements_by_state: Record<string, number>; engagements_without_lead: number;
  engagements_without_independence: number; channels: { with_active_mandate: number; silent_over_48_hours: number; chain_broken: number; deliveries_30_days: number };
  requests: { open: number; overdue_with_clients: number }; packages_30_days: Record<string, number>; packages_quarantined: number; findings_open_by_severity: Record<string, number>; findings_overdue: number;
  reports_signed: number; reports_awaiting_review: number; support_open_by_urgency: Record<string, number>; retention_due: number };
const list = (r: Record<string, number>, order: string[]) => order.filter(k => r[k]).map(k => `${k.replaceAll('_', ' ').toLowerCase()} ${r[k]}`).join(' · ') || 'none';

function LeadershipOverview() {
  const [o, setO] = useState<Overview | null>(null); const [error, setError] = useState<string | null>(null);
  useEffect(() => { vendorCall<Overview>('/overview').then(setO).catch(e => setError(explain(e))); }, []);
  if (error) return <NoticeBox tone="stop" title="Overview unavailable"><p>{error}</p></NoticeBox>;
  if (!o) return <p role="status">Reading the overview…</p>;
  const attention = [
    o.channels.chain_broken ? { what: 'Evidence chain broken', count: o.channels.chain_broken, where: 'An engagement received a delivery that does not follow the previous one; its team must review it.' } : null,
    o.channels.silent_over_48_hours ? { what: 'Client channel silent over 48 hours', count: o.channels.silent_over_48_hours, where: 'A client installation with a mandate has not checked in; contact the client.' } : null,
    o.requests.overdue_with_clients ? { what: 'Requests overdue with clients', count: o.requests.overdue_with_clients, where: 'Unanswered past due; they become scope limitations in the report.' } : null,
    o.findings_overdue ? { what: 'Findings past their remediation date', count: o.findings_overdue, where: 'Follow up with the client or record a retest.' } : null,
    o.packages_quarantined ? { what: 'Packages quarantined', count: o.packages_quarantined, where: 'Personal data without a processing agreement; record the agreement or leave them unread.' } : null,
    o.engagements_without_lead ? { what: 'Open engagements without a lead auditor', count: o.engagements_without_lead, where: 'Assign a lead auditor.' } : null,
    o.engagements_without_independence ? { what: 'Open engagements without an independence declaration', count: o.engagements_without_independence, where: 'The lead auditor declares it before any report.' } : null,
    o.reports_awaiting_review ? { what: 'Reports awaiting reviewer approval', count: o.reports_awaiting_review, where: 'The engagement reviewer approves before signing.' } : null,
    o.licences_expiring_60_days ? { what: 'Clients with a licence expiring within 60 days', count: o.licences_expiring_60_days, where: 'Renew in Licences.' } : null,
    o.retention_due ? { what: 'Closed engagements due for evidence purge', count: o.retention_due, where: 'Run the retention sweep.' } : null,
  ].filter((x): x is { what: string; count: number; where: string } => x !== null);
  return <>
    <section className="section" aria-label="Needs attention"><div className="section-head"><h3>Needs attention</h3></div>
      {attention.length ? <DataTable caption="Items needing attention" rowKey={a => a.what} rows={attention} columns={[{ key: 'w', header: 'What', cell: a => a.what }, { key: 'c', header: 'Count', cell: a => a.count }, { key: 'n', header: 'Next step', cell: a => a.where }]} />
        : <p className="muted">Nothing needs attention in the records as of {o.as_of.slice(0, 16).replace('T', ' ')} UTC.</p>}
    </section>
    <section className="section" aria-label="Practice"><div className="section-head"><h3>Practice</h3><span className="muted">As of {o.as_of.slice(0, 16).replace('T', ' ')} UTC</span></div>
      <div className="grid-4">
        <Metric label="Client organisations" value={o.organisations} note={`Licences: ${list(o.licence_states, ['ACTIVE', 'EXPIRED', 'SUSPENDED', 'NONE'])}`} link={{ href: '/vendor/organisations', label: 'Organisations' }} />
        <Metric label="Engagements" value={Object.values(o.engagements_by_state).reduce((a, b) => a + b, 0)} note={list(o.engagements_by_state, ['PLANNING', 'FIELDWORK', 'REPORTING', 'CLOSED'])} link={{ href: '/vendor/engagements', label: 'Open engagements' }} />
        <Metric label="Clients sending evidence under a mandate" value={o.channels.with_active_mandate} tone={o.channels.chain_broken ? 'stop' : 'neutral'} note={o.channels.chain_broken ? `${o.channels.chain_broken} with a broken evidence chain` : 'Evidence chains intact'} />
        <Metric label="Evidence deliveries accepted" value={o.channels.deliveries_30_days} note="Last 30 days" />
        <Metric label="Packages received" value={Object.values(o.packages_30_days).reduce((a, b) => a + b, 0)} note={`Last 30 days: ${list(o.packages_30_days, ['CHANNEL', 'UPLOAD'])}`} />
        <Metric label="Open auditor requests" value={o.requests.open} tone={o.requests.overdue_with_clients ? 'warn' : 'neutral'} note={o.requests.overdue_with_clients ? `${o.requests.overdue_with_clients} overdue with clients` : 'None overdue with clients'} />
        <Metric label="Open findings" value={Object.values(o.findings_open_by_severity).reduce((a, b) => a + b, 0)} tone={o.findings_open_by_severity.CRITICAL || o.findings_open_by_severity.HIGH ? 'warn' : 'neutral'} note={list(o.findings_open_by_severity, ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'])} />
        <Metric label="Reports signed" value={o.reports_signed} note={o.reports_awaiting_review ? `${o.reports_awaiting_review} awaiting reviewer approval` : 'None awaiting review'} />
        <Metric label="Open support cases" value={Object.values(o.support_open_by_urgency).reduce((a, b) => a + b, 0)} note={list(o.support_open_by_urgency, ['HIGH', 'NORMAL', 'LOW'])} link={{ href: '/vendor/support', label: 'Support cases' }} />
      </div>
      <p className="muted">Counts are read from this installation&apos;s records when the page opens. Evidence content is visible only to each engagement&apos;s team.</p>
    </section>
  </>;
}

export default function VendorHome() {
  const { status, session } = useVendorSession();
  if (status === 'loading') return <p role="status">Reading your vendor session…</p>;
  if (!session) return <>
    <div className="page-head"><h2>ORVIA vendor installation</h2><p>DPDPA audits, client organisations, licences and support. Client installations are never reachable from here.</p></div>
    <NoticeBox tone="info" title="Sign in"><p><a href="/vendor/sign-in">Vendor / auditor sign in</a></p><p><a href="/vendor/sign-in?account=client">Client account sign in (upload an audit package)</a></p></NoticeBox>
  </>;
  return <>
    <div className="page-head"><h2>Welcome, {session.name}</h2><p>{VENDOR_ROLE_LABELS[session.role] ?? session.role}</p></div>
    {can(session, 'vendor.overview.read') ? <><p><a href="/vendor/engagements">Open engagements</a> · <a href="/vendor/organisations">Organisations</a> · <a href="/vendor/team">Vendor team</a></p><LeadershipOverview /></>
      : <NoticeBox tone="info" title="Where to start"><p>{session.actor_domain === 'CLIENT_ACCOUNT' ? <a href="/vendor/upload">Upload an audit evidence package</a> : <a href="/vendor/engagements">Open your engagements</a>}</p></NoticeBox>}
  </>;
}
