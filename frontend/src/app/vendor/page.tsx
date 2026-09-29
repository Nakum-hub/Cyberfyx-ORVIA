'use client';
import { NoticeBox } from '../../components/shared/ui.tsx';
import { useVendorSession, VENDOR_ROLE_LABELS } from '../../components/vendor/vendor.tsx';

export default function VendorHome() {
  const { status, session } = useVendorSession();
  if (status === 'loading') return <p role="status">Reading your vendor session…</p>;
  if (!session) return <>
    <div className="page-head"><h2>ORVIA vendor installation</h2><p>DPDPA audits, client organisations, licences and support. Client installations are never reachable from here.</p></div>
    <NoticeBox tone="info" title="Sign in"><p><a href="/vendor/sign-in">Vendor / auditor sign in</a></p><p><a href="/vendor/sign-in?account=client">Client account sign in (upload an audit package)</a></p></NoticeBox>
  </>;
  return <>
    <div className="page-head"><h2>Welcome, {session.name}</h2><p>{VENDOR_ROLE_LABELS[session.role] ?? session.role}</p></div>
    <NoticeBox tone="info" title="Where to start"><p>{session.actor_domain === 'CLIENT_ACCOUNT' ? <a href="/vendor/upload">Upload an audit evidence package</a> : <a href="/vendor/engagements">Open engagements</a>}</p></NoticeBox>
  </>;
}
