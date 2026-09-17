'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { PROFILES, PROFILE } from '@orvia/contracts';
import { CONTRACT_REVIEW_STATUS, CONTRACT_VERSION } from './api.ts';
import { useSession } from './session-context.tsx';
import { ROLE_LABELS, formatTime } from './state-labels.ts';

/**
 * `whenSignedOut` marks a destination that only makes sense without a session
 * in this area's actor domain, so an authenticated operator is not offered
 * "Staff sign in" beside their own actor summary and Sign out control.
 */
export type NavItem = { href: string; label: string; whenSignedOut?: boolean };

/**
 * Profile identity is derived from the port this browser is actually talking to,
 * matched against the canonical profile table. It is never a hardcoded label.
 */
function useProfileName(): string {
  const [name, setName] = useState('unresolved');
  useEffect(() => {
    const port = globalThis.location.port;
    const match = Object.entries(PROFILES).find(([, profile]) => String(profile.app_port) === port);
    setName(match ? match[0] : `unrecognised port ${port || '(default)'}`);
  }, []);
  return name;
}

function DemoBanner({ area }: { area: string }) {
  const profile = useProfileName();
  return (
    <div className="demo-banner">
      <strong>Synthetic demonstration</strong>
      <span>{area}</span>
      <span className="meta">profile={profile}</span>
      <span className="meta">data_profile={PROFILE}</span>
      <span className="meta">contract={CONTRACT_VERSION} ({CONTRACT_REVIEW_STATUS})</span>
    </div>
  );
}

function ActorSummary({ detailed }: { detailed: boolean }) {
  const { session, status, signOut } = useSession();
  if (status === 'loading') return <div className="shell-actor">Reading session…</div>;
  if (!session) return <div className="shell-actor">No authenticated session</div>;
  const staff = session.actor_domain === 'STAFF';
  return (
    <div className="shell-actor">
      <div>
        <strong>{ROLE_LABELS[session.role] ?? session.role}</strong>
        {staff && detailed ? <> · MFA {session.mfa_verified ? 'verified' : 'not verified'}</> : null}
      </div>
      {detailed ? (
        <div>
          <code>actor {session.actor_id}</code><br />
          <code>organisation {session.scope.legal_entity_id}</code><br />
          <code>environment {session.scope.environment_id}</code>
        </div>
      ) : null}
      <div>Session expires {formatTime(session.expires_at)}</div>
      <button type="button" className="link" onClick={() => void signOut(session.actor_domain)}>Sign out</button>
    </div>
  );
}

function Nav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="shell-nav" aria-label="Primary">
      <ul>
        {items.map(item => {
          const active = pathname === item.href || (item.href !== '/workspace' && item.href !== '/privacy' && pathname.startsWith(`${item.href}/`));
          return (
            <li key={item.href}>
              <a href={item.href} aria-current={active ? 'page' : undefined}>{item.label}</a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function Shell({ area, lane, items, domain, detailedActor, children }: {
  area: string; lane: string; items: NavItem[]; domain: 'STAFF' | 'PRINCIPAL'; detailedActor: boolean; children: ReactNode;
}) {
  const { session } = useSession();
  // Server-derived session only. Hiding a destination is presentation; the
  // sign-in route itself stays reachable and every request is still authorized
  // by the server.
  const signedIn = session?.actor_domain === domain;
  const visible = items.filter(item => !item.whenSignedOut || !signedIn);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <DemoBanner area={area} />
      <header className="shell-head">
        <div className="shell-title">
          <h1>ORVIA</h1>
          <span className="lane">{lane}</span>
        </div>
        <ActorSummary detailed={detailedActor} />
      </header>
      <Nav items={visible} />
      <main className="shell-main" id="main" tabIndex={-1}>{children}</main>
      <footer className="shell-foot">
        Customer-local prototype on fictional Aster/Birch data. No production system, real recipient or vendor service is contacted from this interface.
      </footer>
    </div>
  );
}

export const WORKSPACE_NAV: NavItem[] = [
  { href: '/workspace', label: 'Overview' },
  { href: '/workspace/configuration', label: 'Configuration' },
  { href: '/workspace/principals', label: 'Principals' },
  { href: '/workspace/workflows', label: 'Workflows' },
  { href: '/workspace/failures', label: 'Failures' },
  { href: '/workspace/evidence', label: 'Evidence' },
  { href: '/workspace/control-map', label: 'Control map' },
  { href: '/workspace/policy-preview', label: 'Policy preview' },
  { href: '/workspace/capabilities', label: 'Capabilities' },
  { href: '/workspace/test-lab', label: 'Test Lab' },
  { href: '/workspace/sign-in', label: 'Staff sign in', whenSignedOut: true },
];

export const PRIVACY_NAV: NavItem[] = [
  { href: '/privacy', label: 'My choices' },
  { href: '/privacy/receipts', label: 'My receipts' },
];

/** Staff workspace: shows organisation, role and MFA context. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  return <Shell area="Staff workspace" lane="Workspace" items={WORKSPACE_NAV} domain="STAFF" detailedActor>{children}</Shell>;
}

/**
 * Privacy Centre: a data principal never sees staff identifiers, workflow
 * internals, connector details or another principal's data in this layout.
 */
export function PrivacyShell({ children }: { children: ReactNode }) {
  return <Shell area="Privacy Centre" lane="Privacy Centre" items={PRIVACY_NAV} domain="PRINCIPAL" detailedActor={false}>{children}</Shell>;
}
