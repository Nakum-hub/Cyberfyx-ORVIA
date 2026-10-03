'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { hasCapability, useSession } from '../../shared/session-context.tsx';
import { NoticeBox, PageHead, Section } from '../../shared/ui.tsx';
import { OrganisationIntake } from './organisation-intake.tsx';
import { DataPrincipals } from './registry.tsx';
import { ConsentRecords } from './consent-records.tsx';
import { RegistryNotices } from './registry-setup.tsx';
import { RightsCaseProfiles } from './operations-extras.tsx';
import { RightsRequests } from '../governance/rights.tsx';
import { PreferenceAdmin } from '../expansion/preferences.tsx';

/**
 * The Privacy Centre module (owner decisions 2026-10-03, revision 1.7 addendum). ORVIA is used by the organisation's
 * staff only (in ORVIA's terms the organisation is the customer). The organisation's own users — its Data Principals —
 * never sign in to ORVIA. Their privacy data (consent given or withdrawn,
 * requests, contact preferences) reaches ORVIA from the organisation's own platforms — its website, e-commerce store or
 * app sends each change with an intake key, and exports arrive as files — and staff maintain it here under the DPDP Act.
 * Each tab is the existing screen for that record type; the server checks every request against the person's role.
 */
const TABS: { id: string; label: string; capability: string; render: () => ReactNode }[] = [
  { id: 'overview', label: 'Overview', capability: 'registry.read', render: () => <Overview /> },
  { id: 'sources', label: 'Sources', capability: 'registry.read', render: () => <OrganisationIntake /> },
  { id: 'principals', label: 'Data Principals', capability: 'registry.read', render: () => <DataPrincipals /> },
  { id: 'consents', label: 'Consents', capability: 'registry.read', render: () => <ConsentRecords /> },
  { id: 'requests', label: 'Requests', capability: 'rights.read', render: () => <><RightsRequests /><RightsCaseProfiles /></> },
  { id: 'notices', label: 'Notices', capability: 'registry.read', render: () => <RegistryNotices /> },
  { id: 'preferences', label: 'Contact preferences', capability: 'configuration.read', render: () => <PreferenceAdmin /> },
];

export function PrivacyCentre() {
  const { session } = useSession();
  const [tab, setTab] = useState('overview');
  // The selected tab lives in the address (#requests) so a link or a reload opens the same tab.
  useEffect(() => {
    const read = () => { const id = window.location.hash.slice(1); if (TABS.some(t => t.id === id)) setTab(id); };
    read(); window.addEventListener('hashchange', read); return () => window.removeEventListener('hashchange', read);
  }, []);
  const choose = (id: string) => { setTab(id); window.history.replaceState(null, '', `#${id}`); };
  const current = TABS.find(t => t.id === tab) ?? TABS[0]!;
  return (
    <>
      <PageHead eyebrow="Privacy controls" title="Privacy Centre"
        lede="The privacy of the people whose data you process — your users, buyers and members (your Data Principals) — in one place: consent given and withdrawn, privacy requests, notices and contact preferences. It arrives from your own website, store or app and from files you approve; your staff maintain it here." />
      <p className="pc-actions"><a className="button primary" href="/workspace/files#import">Import data</a> <span className="cell-sub">Upload a consent or privacy-request export from your own systems; ORVIA organises it into the right modules after you approve it.</span></p>
      <div className="tabs" role="tablist" aria-label="Privacy Centre">
        {TABS.map(t => (
          <button key={t.id} type="button" role="tab" id={`pc-tab-${t.id}`} aria-selected={t.id === current.id} aria-controls="pc-panel"
            onClick={() => choose(t.id)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" id="pc-panel" aria-labelledby={`pc-tab-${current.id}`}>
        {hasCapability(session, current.capability)
          ? current.render()
          : <NoticeBox tone="stop" title="Not available for your role"><p>Your role does not include this part of the Privacy Centre ({current.capability}).</p></NoticeBox>}
      </div>
    </>
  );
}

function Overview() {
  return (
    <>
      <Section title="Where your Data Principals' privacy data comes from">
        <ul>
          <li><strong>Your website, store or app (live).</strong> When a person gives or withdraws consent, changes a contact preference or makes a privacy request on your platform, your platform&apos;s server sends it to ORVIA with an intake key. Set up keys in <a href="#sources">Sources</a>.</li>
          <li><strong>Files.</strong> Exports from your platforms (user lists, consent logs, existing records) arrive through the inbox folder or by upload in <a href="/workspace/files">Files</a>, and are used only after a staff member approves them.</li>
          <li><strong>Staff.</strong> Requests received by email, phone or in person are recorded by your staff in <a href="#requests">Requests</a> and <a href="#consents">Consents</a>.</li>
        </ul>
      </Section>
      <Section title="What your staff maintain here">
        <p>Each person&apos;s consent and its history (<a href="#consents">Consents</a>), privacy requests and their statutory deadlines (<a href="#requests">Requests</a>), the notices that apply (<a href="#notices">Notices</a>), contact preferences, and the records of the people themselves (<a href="#principals">Data Principals</a>). Withdrawals are enforced in your connected systems by the protective controls on every plan.</p>
      </Section>
      <NoticeBox tone="info" title="Your Data Principals do not sign in to ORVIA">
        <p>ORVIA is used by your organisation&apos;s staff. The people whose data you process keep using your own website, store or app, as Rule 14(1) of the DPDP Rules, 2025 expects.</p>
      </NoticeBox>
    </>
  );
}
