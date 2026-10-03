'use client';
import { usePathname } from 'next/navigation';
import { useIdleSignOut } from './idle-sign-out.ts';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { PROFILES, PROFILE, ENTITLEMENTS, type EntitlementCodeValue } from '@orvia/contracts';
import { CONTRACT_REVIEW_STATUS, CONTRACT_VERSION, useQuery } from './api.ts';
import { useSession } from './session-context.tsx';
import { ROLE_LABELS, formatTime, shortId } from './state-labels.ts';
import { BrandMark } from './brand-mark.tsx';
import { SectionTabs } from './section-tabs.tsx';

/**
 * `whenSignedOut` marks a destination that only makes sense without a session
 * in this area's actor domain, so an authenticated operator is not offered
 * "Staff sign in" beside their own actor summary and Sign out control.
 */
export type NavItem = { href: string; label: string; whenSignedOut?: boolean;
  /** Rev 1.11: the entitlement new work on this screen needs. The screen stays reachable (reading is never gated); when the
   *  plan in force does not cover it, the item names the plan that does. */
  entitlement?: EntitlementCodeValue };
const PLAN_NAME: Record<string, string> = { FOUNDATION: 'Foundation', CONTROL: 'Control', ENTERPRISE: 'Enterprise' };
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

function TestEnvironmentBanner({ area }: { area: string }) {
  const profile = useProfileName();
  return (
    <div className="environment-banner">
      <strong>Synthetic test environment</strong>
      <span className="area">{area}</span>
      <details className="environment-details">
        <summary>Environment details</summary>
        <div>
          <span className="meta">profile={profile}</span>
          <span className="meta">data_profile={PROFILE}</span>
          <span className="meta">contract={CONTRACT_VERSION} ({CONTRACT_REVIEW_STATUS})</span>
        </div>
      </details>
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
      <details className="session-details">
        <summary>Session details</summary>
        <div className="session-details-body">
          {detailed ? <Chip term="Organisation" value={shortId(session.scope.legal_entity_id)} code /> : null}
          <Chip term="Environment" value={profile} code />
          <Chip term="Session" value={<>expires {formatTime(session.expires_at)}</>} />
          {detailed ? <ScopeDetails /> : null}
        </div>
      </details>
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

function Nav({ groups, usable }: { groups: NavGroup[]; usable: ReadonlySet<string> | null }) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const isActive = (href: string) => pathname === href
    || (href !== '/workspace' && pathname.startsWith(`${href}/`));
  return (
    <nav className="shell-nav" aria-label="Primary">
      {groups.map((group, index) => {
        const current = group.items.some(item => isActive(item.href));
        const open = current || (index === 0 && pathname.endsWith('/sign-in')) || expanded[group.group] === true;
        return (
        <div className="nav-group" key={group.group}>
          <button type="button" className="group-label" aria-expanded={open}
            aria-controls={`nav-group-${index}`} aria-disabled={current || undefined}
            onClick={() => { if (!current) setExpanded(value => ({ ...value, [group.group]: !open })); }}>
            {group.group}<span className="nav-chevron" aria-hidden="true" />
          </button>
          <ul id={`nav-group-${index}`} hidden={!open}>
            {group.items.map(item => {
              const active = isActive(item.href);
              return (
                <li key={item.href}>
                  <a href={item.href} aria-current={active ? 'page' : undefined}>{item.label}
                    {item.entitlement && usable && !usable.has(item.entitlement)
                      ? <span className="nav-plan" title={`${ENTITLEMENTS[item.entitlement].value} New work here needs the ${PLAN_NAME[ENTITLEMENTS[item.entitlement].tier]} plan; what is already recorded stays readable.`}> · {PLAN_NAME[ENTITLEMENTS[item.entitlement].tier]}</span>
                      : null}</a>
                </li>
              );
            })}
          </ul>
        </div>
      ); })}
    </nav>
  );
}

function Shell({ area, lane, groups, domain, detailedActor, bare = [], children }: {
  area: string; lane: string; groups: NavGroup[]; domain: 'STAFF' | 'PRINCIPAL'; detailedActor: boolean; bare?: string[]; children: ReactNode;
}) {
  const { session, signOut } = useSession();
  const pathname = usePathname();
  // Server-derived session only. Hiding a destination is presentation; the
  // sign-in route itself stays reachable and every request is still authorized
  // by the server.
  const signedIn = session?.actor_domain === domain;
  const visible = groups
    .map(group => ({ ...group, items: group.items.filter(item => !item.whenSignedOut || !signedIn) }))
    .filter(group => group.items.length > 0);
  const plan = useQuery('plan', { enabled: signedIn && domain === 'STAFF' });
  const usable = plan.data ? new Set<string>(plan.data.usable) : null;
  const endSession = useCallback(() => signOut(domain), [signOut, domain]);
  useIdleSignOut(signedIn, endSession, bare[0] ?? '/');
  // Signed out, sign-in routes render the full-screen branded sign-in (BrandSignIn) without the workspace frame; once
  // signed in, the same route shows its confirmation inside the normal frame.
  if (bare.includes(pathname) && (!signedIn || pathname === bare[0])) return <>{children}</>;
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <TestEnvironmentBanner area={area} />
      <header className="shell-head">
        <div className="shell-title">
          <BrandMark />
          <span className="rule" aria-hidden="true" />
          <h1>{lane}</h1>
        </div>
        <ActorSummary detailed={detailedActor} />
      </header>
      {plan.data ? <PlanBanner plan={plan.data} /> : null}
      <div className="shell-body">
        <Nav groups={visible} usable={usable} />
        <main className="shell-main" id="main" tabIndex={-1}>
          <SectionTabs />
          {children}
        </main>
      </div>
      <footer className="shell-foot">
        Customer-local evaluation build with synthetic records. No production system, real recipient or vendor service is contacted from this interface.
      </footer>
    </div>
  );
}

type PlanData = NonNullable<ReturnType<typeof useQuery<'plan'>>['data']>;
/** One line, only when something about the plan needs attention. No pop-ups and no countdowns. */
function PlanBanner({ plan }: { plan: PlanData }) {
  const until = (value: string | null) => value ? formatTime(value) : '';
  const message = !plan.licensed ? 'No licence imported: reading, exports and the protective controls work; other new work needs a licence.'
    : plan.lifecycle === 'EXPIRED' ? 'Plan expired: paid features are read-only. Legal duties, reading and exports continue.'
    : plan.lifecycle === 'GRACE' ? `Plan ended ${until(plan.valid_to)}; everything keeps working until ${until(plan.grace_until)}.`
    : plan.trial ? `Trial of ${PLAN_NAME[plan.edition!] ?? plan.edition} until ${until(plan.valid_to)}${plan.falls_back_to ? `, then back to ${PLAN_NAME[plan.falls_back_to] ?? plan.falls_back_to}` : ''}.`
    : null;
  if (!message) return null;
  return <div className="plan-banner" role="status">{message} <a href="/workspace/plan">Your plan</a></div>;
}

export const WORKSPACE_NAV: NavGroup[] = [
  { group: 'Overview', items: [
    { href: '/workspace/sign-in', label: 'Staff sign in', whenSignedOut: true },
    { href: '/workspace', label: 'Overview' },
    { href: '/workspace/failures', label: 'Attention' },
    { href: '/workspace/coverage', label: 'Coverage', entitlement: 'COVERAGE_REPORTING' },
    { href: '/workspace/gaps', label: 'Gaps', entitlement: 'COVERAGE_REPORTING' },
  ] },
  { group: 'Privacy controls', items: [
    { href: '/workspace/configuration', label: 'Purposes & policies' },
    { href: '/workspace/website-consent', label: 'Website consent' },
    { href: '/workspace/privacy-centre', label: 'Privacy Centre', entitlement: 'INTAKE_AND_PORTAL' },
    { href: '/workspace/contact-preferences', label: 'Contact preferences' },
    { href: '/workspace/principals', label: 'People & targets' },
    { href: '/workspace/control-map', label: 'Control map', entitlement: 'REALTIME_ENFORCEMENT' },
    { href: '/workspace/inventory', label: 'Data inventory' },
    { href: '/workspace/records-of-processing', label: 'Records of processing' },
    { href: '/workspace/catalog-discovery', label: 'Catalog observations', entitlement: 'DISCOVERY_CLASSIFICATION' },
    { href: '/workspace/inventory/search', label: 'Search inventory' },
    { href: '/workspace/imports', label: 'Local imports' },
    { href: '/workspace/retention', label: 'Retention' },
    { href: '/workspace/retention/holds', label: 'Legal holds' },
    { href: '/workspace/retention/outcomes', label: 'Retention outcomes' },
    { href: '/workspace/processors', label: 'Processors' },
    { href: '/workspace/ai-governance', label: 'AI governance', entitlement: 'SECURITY_AI_GOVERNANCE' },
    { href: '/workspace/grc', label: 'Frameworks & controls', entitlement: 'GRC_AUDIT' },
    { href: '/workspace/dpdpa-audit', label: 'DPDPA external audit', entitlement: 'AUDIT_EXCHANGE' },
    { href: '/workspace/compliance', label: 'Continuous compliance', entitlement: 'CONTINUOUS_COMPLIANCE' },
    { href: '/workspace/assessments', label: 'Processor assessments', entitlement: 'ASSESSMENTS' },
    { href: '/workspace/impact-assessments', label: 'Impact assessments', entitlement: 'ASSESSMENTS' },
    { href: '/workspace/third-parties', label: 'Third parties', entitlement: 'THIRD_PARTY_LIFECYCLE' },
    { href: '/workspace/findings', label: 'Findings' },
    { href: '/workspace/incidents', label: 'Incidents' },
    { href: '/workspace/notification-rules', label: 'Notification rules' },
    { href: '/workspace/notifications', label: 'Notifications' },
    { href: '/workspace/message-templates', label: 'Message templates' },
    { href: '/workspace/delivery', label: 'Delivery', entitlement: 'DELIVERY_TRANSPORTS' },
    { href: '/workspace/policy-preview', label: 'Decision preview', entitlement: 'REALTIME_ENFORCEMENT' },
  ] },
  { group: 'Operations', items: [
    { href: '/workspace/files', label: 'Files' },
    { href: '/workspace/rights', label: 'Privacy requests' },
    { href: '/workspace/representation', label: 'Representation' },
    { href: '/workspace/workflows', label: 'Workflows', entitlement: 'WORKFLOW_AUTOMATION' },
    { href: '/workspace/evidence', label: 'Evidence' },
    { href: '/workspace/reports', label: 'Reports' },
  ] },
  { group: 'DPDP operations', items: [
    { href: '/workspace/operations-attention', label: 'Operations attention' },
    { href: '/workspace/operations-runs', label: 'Operational runs' },
    { href: '/workspace/operations-evidence', label: 'Evidence and events' },
    { href: '/workspace/personal-data-breaches', label: 'Personal-data breaches' },
    { href: '/workspace/data-principals', label: 'Data Principals' },
    { href: '/workspace/registry-setup', label: 'Registry set-up' },
    { href: '/workspace/processing-activities', label: 'Processing activities' },
    { href: '/workspace/registry-notices', label: 'Notices' },
    { href: '/workspace/consent-records', label: 'Consent records' },
    { href: '/workspace/organisation-intake', label: 'Website & app intake' },
    { href: '/workspace/registry-retention', label: 'Retention rules & holds' },
    { href: '/workspace/processor-engagements', label: 'Processor engagements' },
    { href: '/workspace/estate-imports', label: 'Existing-data onboarding' },
    { href: '/workspace/organisation-profile', label: 'Organisation profile' },
  ] },
  { group: 'Regulatory core', items: [
    { href: '/workspace/regulatory', label: 'Regulatory packages' },
    { href: '/workspace/regulatory/applicability', label: 'Applicability' },
    { href: '/workspace/regulatory/impacts', label: 'Package change impact' },
  ] },
  { group: 'Assurance', items: [
    { href: '/workspace/test-lab', label: 'Test Lab', entitlement: 'PRIVACY_TEST_ENGINE' },
    { href: '/workspace/support-cases', label: 'Support cases' },
    { href: '/workspace/support-canaries', label: 'Forbidden content' },
    { href: '/workspace/audit-trail', label: 'Audit trail' },
    { href: '/workspace/audit-coverage', label: 'Audit coverage' },
    { href: '/workspace/audit-retention', label: 'Audit retention' },
  ] },
  { group: 'Installation', items: [
    { href: '/workspace/plan', label: 'Your plan' },
    { href: '/workspace/team', label: 'Team' },
    { href: '/workspace/my-login', label: 'My login' },
    { href: '/workspace/preflight', label: 'Before go-live' },
    { href: '/workspace/connections', label: 'Guided connections', entitlement: 'WORKFLOW_AUTOMATION' },
    { href: '/workspace/readiness', label: 'Operational readiness' },
    { href: '/workspace/restores', label: 'Backups and restores' },
    { href: '/workspace/vendor-visibility', label: 'What the vendor can see' },
    { href: '/workspace/releases', label: 'Releases' },
    { href: '/workspace/updates', label: 'Updates' },
    { href: '/workspace/installed-versions', label: 'Installed versions' },
  ] },
];


/** First-run setup: the ORVIA frame without navigation or a signed-in person, since nobody can sign in yet. */
export function SetupShell({ children }: { children: ReactNode }) {
  return (
    <div className="shell">
      <a className="skip-link" href="#main">Skip to main content</a>
      <TestEnvironmentBanner area="First-run setup" />
      <header className="shell-head">
        <div className="shell-title">
          <BrandMark />
          <span className="rule" aria-hidden="true" />
          <h1>First-run setup</h1>
        </div>
      </header>
      <div className="shell-body">
        <main className="shell-main" id="main" tabIndex={-1}>{children}</main>
      </div>
      <footer className="shell-foot">
        Customer-local evaluation build with synthetic records. No production system, real recipient or vendor service is contacted from this interface.
      </footer>
    </div>
  );
}

/** Staff workspace: shows organisation, role and MFA context. */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  return <Shell area="Staff workspace" lane="Privacy Control Workspace" groups={WORKSPACE_NAV} domain="STAFF" detailedActor bare={['/workspace/sign-in', '/workspace/recover']}>{children}</Shell>;
}

