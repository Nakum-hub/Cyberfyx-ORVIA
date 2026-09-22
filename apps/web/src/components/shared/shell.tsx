'use client';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { PROFILES, PROFILE } from '@orvia/contracts';
import { CONTRACT_REVIEW_STATUS, CONTRACT_VERSION } from './api.ts';
import { useSession } from './session-context.tsx';
import { ROLE_LABELS, formatTime, shortId } from './state-labels.ts';

/**
 * `whenSignedOut` marks a destination that only makes sense without a session
 * in this area's actor domain, so an authenticated operator is not offered
 * "Staff sign in" beside their own actor summary and Sign out control.
 */
export type NavItem = { href: string; label: string; whenSignedOut?: boolean };
export type NavGroup = { group: string; items: NavItem[] };

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
      <span className="area">{area}</span>
      <span className="meta">profile={profile}</span>
      <span className="meta">data_profile={PROFILE}</span>
      <span className="meta">contract={CONTRACT_VERSION} ({CONTRACT_REVIEW_STATUS})</span>
    </div>
  );
}

function Chip({ term, value, code }: { term: string; value: ReactNode; code?: boolean }) {
  return (
    <span className="context-chip">
      <span className="k">{term}</span>
      <span className={code ? 'v code' : 'v'}>{value}</span>
    </span>
  );
}

/**
 * Organisation and environment identifiers are shortened for reading and kept in
 * full in the disclosure below. Nothing here invents a trading name the server
 * does not return.
 */
function ActorSummary({ detailed }: { detailed: boolean }) {
  const { session, status, signOut } = useSession();
  const profile = useProfileName();
  if (status === 'loading') return <div className="shell-context muted">Reading session…</div>;
  if (!session) return <div className="shell-context muted">No authenticated session</div>;
  const staff = session.actor_domain === 'STAFF';
  return (
    <div className="shell-context">
      <Chip term="Role" value={<>{ROLE_LABELS[session.role] ?? session.role}{staff && detailed ? <> · MFA {session.mfa_verified ? 'verified' : 'not verified'}</> : null}</>} />
      {detailed ? <Chip term="Organisation" value={shortId(session.scope.legal_entity_id)} code /> : null}
      <Chip term="Environment" value={profile} code />
      <span className="context-chip">
        <span className="k">Session</span>
        <span className="v" style={{ fontWeight: 500 }}>expires {formatTime(session.expires_at)}</span>
      </span>
      {/* Kept outside the chip: the chip value clips with an ellipsis, which
          would make this control unclickable at narrow widths. */}
      <button type="button" className="link" onClick={() => void signOut(session.actor_domain)}>Sign out</button>
    </div>
  );
}

function ScopeDetails() {
  const { session } = useSession();
  if (!session || session.actor_domain !== 'STAFF') return null;
  return (
    <details className="technical" style={{ marginTop: 0 }}>
      <summary>Session and scope identifiers</summary>
      <div className="technical-body">
        <dl className="facts">
          <div style={{ display: 'contents' }}><dt>Actor</dt><dd>{session.actor_id}</dd></div>
          <div style={{ display: 'contents' }}><dt>Tenant</dt><dd>{session.scope.tenant_id}</dd></div>
          <div style={{ display: 'contents' }}><dt>Organisation</dt><dd>{session.scope.legal_entity_id}</dd></div>
          <div style={{ display: 'contents' }}><dt>Environment</dt><dd>{session.scope.environment_id}</dd></div>
        </dl>
      </div>
    </details>
  );
}

function Nav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  return (
    <nav className="shell-nav" aria-label="Primary">
      {groups.map(group => (
        <div key={group.group}>
          <p className="group-label">{group.group}</p>
          <ul>
            {group.items.map(item => {
              const active = pathname === item.href
                || (item.href !== '/workspace' && item.href !== '/privacy' && pathname.startsWith(`${item.href}/`));
              return (
                <li key={item.href}>
                  <a href={item.href} aria-current={active ? 'page' : undefined}>{item.label}</a>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Shell({ area, lane, groups, domain, detailedActor, children }: {
  area: string; lane: string; groups: NavGroup[]; domain: 'STAFF' | 'PRINCIPAL'; detailedActor: boolean; children: ReactNode;
}) {
  const { session } = useSession();
  // Server-derived session only. Hiding a destination is presentation; the
  // sign-in route itself stays reachable and every request is still authorized
  // by the server.
  const signedIn = session?.actor_domain === domain;
  const visible = groups
    .map(group => ({ ...group, items: group.items.filter(item => !item.whenSignedOut || !signedIn) }))
    .filter(group => group.items.length > 0);
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <DemoBanner area={area} />
      <header className="shell-head">
        <div className="shell-title">
          <span className="mark">ORVIA</span>
          <span className="rule" aria-hidden="true" />
          <h1>{lane}</h1>
        </div>
        <ActorSummary detailed={detailedActor} />
      </header>
      <div className="shell-body">
        <Nav groups={visible} />
        <main className="shell-main" id="main" tabIndex={-1}>
          {children}
          {detailedActor ? <ScopeDetails /> : null}
        </main>
      </div>
      <footer className="shell-foot">
        Customer-local prototype on fictional Aster/Birch data. No production system, real recipient or vendor service is contacted from this interface.
      </footer>
    </div>
  );
}

export const WORKSPACE_NAV: NavGroup[] = [
  { group: 'Overview', items: [
    { href: '/workspace', label: 'Overview' },
    { href: '/workspace/demo', label: 'Guided demo' },
    { href: '/workspace/failures', label: 'Attention' },
    { href: '/workspace/coverage', label: 'Coverage' },
    { href: '/workspace/gaps', label: 'Gaps' },
  ] },
  { group: 'Privacy controls', items: [
    { href: '/workspace/configuration', label: 'Purposes & policies' },
    { href: '/workspace/principals', label: 'People & targets' },
    { href: '/workspace/control-map', label: 'Control map' },
    { href: '/workspace/inventory', label: 'Data inventory' },
    { href: '/workspace/inventory/search', label: 'Search inventory' },
    { href: '/workspace/retention', label: 'Retention' },
    { href: '/workspace/retention/holds', label: 'Legal holds' },
    { href: '/workspace/retention/outcomes', label: 'Retention outcomes' },
    { href: '/workspace/processors', label: 'Processors' },
    { href: '/workspace/assessments', label: 'Assessments' },
    { href: '/workspace/findings', label: 'Findings' },
    { href: '/workspace/incidents', label: 'Incidents' },
    { href: '/workspace/notification-rules', label: 'Notification rules' },
    { href: '/workspace/notifications', label: 'Notifications' },
    { href: '/workspace/message-templates', label: 'Message templates' },
    { href: '/workspace/policy-preview', label: 'Decision preview' },
  ] },
  { group: 'Operations', items: [
    { href: '/workspace/rights', label: 'Privacy requests' },
    { href: '/workspace/representation', label: 'Representation' },
    { href: '/workspace/workflows', label: 'Workflows' },
    { href: '/workspace/evidence', label: 'Evidence' },
  ] },
  { group: 'Assurance', items: [
    { href: '/workspace/test-lab', label: 'Test Lab' },
    { href: '/workspace/support-cases', label: 'Support cases' },
    { href: '/workspace/support-canaries', label: 'Forbidden content' },
    { href: '/workspace/audit-trail', label: 'Audit trail' },
    { href: '/workspace/audit-coverage', label: 'Audit coverage' },
  ] },
  { group: 'Installation', items: [
    { href: '/workspace/connections', label: 'Guided connections' },
    { href: '/workspace/readiness', label: 'Operational readiness' },
    { href: '/workspace/releases', label: 'Releases' },
    { href: '/workspace/updates', label: 'Updates' },
    { href: '/workspace/installed-versions', label: 'Installed versions' },
  ] },
];

export const PRIVACY_NAV: NavGroup[] = [
  { group: 'Your privacy', items: [
    { href: '/privacy', label: 'My choices' },
    { href: '/privacy/receipts', label: 'My receipts' },
  ] },
];

/** Staff workspace: shows organisation, role and MFA context. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  return <Shell area="Staff workspace" lane="Privacy Control Workspace" groups={WORKSPACE_NAV} domain="STAFF" detailedActor>{children}</Shell>;
}

/**
 * Privacy Centre: a data principal never sees staff identifiers, workflow
 * internals, connector details or another principal's data in this layout.
 */
export function PrivacyShell({ children }: { children: ReactNode }) {
  return <Shell area="Privacy Centre" lane="Privacy Centre" groups={PRIVACY_NAV} domain="PRINCIPAL" detailedActor={false}>{children}</Shell>;
}
