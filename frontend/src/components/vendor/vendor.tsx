'use client';
import { usePathname } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { vendorAuthClient, accountAuthClient } from '@orvia/auth/client';
import { NoticeBox } from '../shared/ui.tsx';

/**
 * The vendor area of the vendor's own VENDOR_SERVICE installation (revision 1.5
 * addendum), inside the same ORVIA application and design system. Identity,
 * role and capability come only from /api/v1/vendor/session; hiding a
 * destination here is presentation, every request is authorised by the server.
 */
export type VendorSession = { actor_domain: 'VENDOR_STAFF' | 'CLIENT_ACCOUNT'; actor_id: string; role: string; capabilities: string[]; organisation_id: string | null; name: string; email: string; expires_at: string };
export class VendorApiError extends Error { constructor(public status: number, public code: string, public fields: { field: string; code: string }[]) { super(code); } }

export async function vendorCall<T = unknown>(path: string, body?: unknown, init: { raw?: BodyInit; headers?: Record<string, string> } = {}): Promise<T> {
  const post = body !== undefined || init.raw !== undefined;
  const response = await fetch(`/api/v1/vendor${path}`, { method: post ? 'POST' : 'GET', credentials: 'same-origin', cache: 'no-store',
    headers: post ? { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID().replaceAll('-', ''), ...init.headers } : init.headers,
    body: init.raw ?? (post ? JSON.stringify(body) : undefined) });
  const data = await response.json().catch(() => null) as (T & { error?: { code: string; field_errors?: { field: string; code: string }[] } }) | null;
  if (!response.ok && !(response.status === 422 && data && 'outcome' in (data as object))) throw new VendorApiError(response.status, data?.error?.code ?? 'UNAVAILABLE', data?.error?.field_errors ?? []);
  return data as T;
}
export function explain(error: unknown) {
  if (error instanceof VendorApiError) {
    const detail = error.fields.map(f => `${f.field}: ${f.code.replaceAll('_', ' ')}`).join('; ');
    if (error.status === 401) return 'Your vendor session has ended. Sign in again.';
    if (error.status === 403) return detail ? `Not permitted (${detail}).` : 'Not permitted for your role, or MFA is not complete.';
    if (error.status === 429) return 'Too many attempts. Wait ten minutes and try again.';
    return detail ? `Refused: ${detail}.` : `Request refused (${error.code}).`;
  }
  return 'The vendor installation is not answering; the outcome is unknown. Reload before trying again.';
}
/** Saves a server-produced file in the browser, byte for byte. */
export function saveFile(name: string, bytes: Uint8Array | string, type: string) {
  const blob = new Blob([typeof bytes === 'string' ? bytes : new Uint8Array(bytes)], { type });
  const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

type State = { status: 'loading' | 'signed-in' | 'signed-out' | 'mfa-required' | 'error'; session: VendorSession | null; reload: () => void; signOut: () => Promise<void> };
const Context = createContext<State | null>(null);
export function VendorSessionProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Omit<State, 'reload' | 'signOut'>>({ status: 'loading', session: null });
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let cancelled = false;
    vendorCall<VendorSession>('/session').then(session => { if (!cancelled) setS({ status: 'signed-in', session }); })
      .catch(error => { if (cancelled) return; setS({ status: error instanceof VendorApiError ? (error.status === 401 ? 'signed-out' : error.status === 403 ? 'mfa-required' : 'error') : 'error', session: null }); });
    return () => { cancelled = true; };
  }, [tick]);
  const reload = useCallback(() => setTick(t => t + 1), []);
  const signOut = useCallback(async () => { await Promise.allSettled([vendorAuthClient.signOut(), accountAuthClient.signOut()]); setTick(t => t + 1); }, []);
  const value = useMemo(() => ({ ...s, reload, signOut }), [s, reload, signOut]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useVendorSession() { const c = useContext(Context); if (!c) throw new Error('useVendorSession requires VendorSessionProvider'); return c; }
export const can = (s: VendorSession | null, capability: string) => !!s?.capabilities.includes(capability);

const NAV: { group: string; items: { href: string; label: string; capability: string }[] }[] = [
  { group: 'Audits', items: [
    { href: '/vendor/engagements', label: 'Engagements', capability: 'engagements.read' },
    { href: '/vendor/retention', label: 'Evidence retention', capability: 'engagements.manage' }] },
  { group: 'Clients', items: [
    { href: '/vendor/organisations', label: 'Organisations', capability: 'organisations.read' },
    { href: '/vendor/licences', label: 'Licences', capability: 'licences.issue' },
    { href: '/vendor/support', label: 'Support cases', capability: 'support.read' },
    { href: '/vendor/payments', label: 'Payments', capability: 'payments.read' }] },
  { group: 'Vendor', items: [{ href: '/vendor/team', label: 'Vendor team', capability: 'vendor.team.read' }] },
  { group: 'Client upload', items: [{ href: '/vendor/upload', label: 'Upload audit package', capability: 'packages.upload' }] },
];
const ROLE: Record<string, string> = { VENDOR_SUPER_ADMIN: 'Vendor super administrator', VENDOR_ADMIN: 'Vendor administrator', LEAD_AUDITOR: 'Lead auditor', AUDITOR: 'Auditor', AUDIT_REVIEWER: 'Audit reviewer', CLIENT_ACCOUNT: 'Client account' };

function Shell({ children }: { children: ReactNode }) {
  const { session, signOut } = useVendorSession(); const pathname = usePathname();
  const groups = NAV.map(g => ({ ...g, items: g.items.filter(i => can(session, i.capability)) })).filter(g => g.items.length);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <div className="environment-banner"><strong>Vendor installation</strong><span className="area">VENDOR_SERVICE</span><span className="meta">No client installation is reachable from here; clients carry audit packages to this installation as files.</span></div>
      <header className="shell-head">
        <div className="shell-title"><span className="mark">ORVIA</span><span className="rule" aria-hidden="true" /><h1>Vendor &amp; audit</h1></div>
        {session ? <div className="shell-context"><span className="context-chip"><span className="k">Role</span><span className="v">{ROLE[session.role] ?? session.role}</span></span>
          <span className="context-chip"><span className="k">Signed in</span><span className="v">{session.name}</span></span>
          <button type="button" className="link" onClick={() => void signOut()}>Sign out</button></div> : <div className="shell-context muted">No vendor session</div>}
      </header>
      <div className="shell-body">
        <nav className="shell-nav" aria-label="Vendor">
          {groups.length ? groups.map(g => <div key={g.group}><p className="group-label">{g.group}</p><ul>{g.items.map(i => <li key={i.href}><a href={i.href} aria-current={pathname === i.href || pathname.startsWith(`${i.href}/`) ? 'page' : undefined}>{i.label}</a></li>)}</ul></div>)
            : <div><p className="group-label">Vendor</p><ul><li><a href="/vendor/sign-in">Vendor / auditor sign in</a></li><li><a href="/vendor/sign-in?account=client">Client account sign in</a></li></ul></div>}
        </nav>
        <main className="shell-main" id="main" tabIndex={-1}>{children}</main>
      </div>
      <footer className="shell-foot">The vendor installation holds no client organisation&apos;s operational data. Audit opinions are not compliance determinations; only the Data Protection Board of India decides compliance.</footer>
    </div>
  );
}
export function VendorShell({ children }: { children: ReactNode }) { return <VendorSessionProvider><Shell>{children}</Shell></VendorSessionProvider>; }

/** Renders children for a signed-in vendor session holding the capability. */
export function VendorArea({ capability, children }: { capability: string; children: (s: VendorSession) => ReactNode }) {
  const { status, session, reload } = useVendorSession();
  if (status === 'loading') return <p role="status">Reading your vendor session…</p>;
  if (status === 'signed-out') return <NoticeBox tone="info" title="Sign in required"><p><a href="/vendor/sign-in">Vendor / auditor sign in</a> · <a href="/vendor/sign-in?account=client">Client account sign in</a></p></NoticeBox>;
  if (status === 'mfa-required') return <NoticeBox tone="warn" title="Complete your sign-in"><p>Replace your one-time password and set up your authenticator first.</p><p><a href="/vendor/sign-in">Continue sign in</a></p></NoticeBox>;
  if (!session) return <NoticeBox tone="stop" title="Vendor installation unavailable"><p>The session could not be read.</p><button type="button" onClick={reload}>Try again</button></NoticeBox>;
  if (!can(session, capability)) return <NoticeBox tone="stop" title="Not available for your role"><p>Your role ({ROLE[session.role] ?? session.role}) does not include this area.</p></NoticeBox>;
  return <>{children(session)}</>;
}
export { ROLE as VENDOR_ROLE_LABELS };
