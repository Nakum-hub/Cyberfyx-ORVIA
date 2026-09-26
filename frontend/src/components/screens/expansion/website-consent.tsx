'use client';
import { useState } from 'react';
import { usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Area, Input, WriteForm, text } from '../privacy-operations/registry-forms.tsx';

const TEMPLATE = {
  categories: [
    { key: 'necessary', label: 'Necessary', description: 'Needed for the site to work; always on.', required: true },
    { key: 'analytics', label: 'Analytics', description: 'Helps us understand how the site is used.', required: false },
    { key: 'marketing', label: 'Marketing', description: 'Used to show you relevant offers elsewhere.', required: false },
  ],
  trackers: [{ name: 'Example analytics', category: 'analytics', hosts: ['analytics.example.com'], cookies: ['_ga*'] }],
  texts: { en: { title: 'Your privacy choices', body: 'We use cookies that are not strictly necessary only if you agree. You can change your choice at any time.', accept_all: 'Accept all', reject_all: 'Reject all', choose: 'Choose', save: 'Save choices' } },
  rule: { basis: 'OPT_IN', requirement_id: null, source_reference: 'Record the legal source of the opt-in rule here.', honour_gpc: true },
};
const SEVERITY_TONE: Record<string, 'stop' | 'warn' | 'neutral'> = { HIGH: 'stop', MEDIUM: 'warn', INFO: 'neutral' };

/**
 * EX02 website consent management. A site's origins are approved by a second
 * person; a banner version is published by someone other than its author; the
 * banner script is served by this installation. Visitor records are
 * pseudonymous. Scans visit one approved page in a local browser.
 */
export function WebsiteConsent() {
  const sites = usePagedQuery('list_cmp_sites', { limit: 25 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Consent" title="Website consent"
        lede="The consent banner for your websites: which origins may use it, what it says, what visitors chose, and what a scan of the page actually loaded before and after a choice." />
      <Section title="Sites">
        <QueryBoundary query={sites} label="sites" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Sites" rows={d.items} rowKey={s => s.id}
                columns={[
                  { key: 'name', header: 'Site', cell: s => <span className="cell-primary">{s.name}<span className="cell-sub">{s.origins.join(', ')}</span></span> },
                  { key: 'state', header: 'State', cell: s => <Badge label={s.state.toLowerCase()} tone={s.state === 'ENABLED' ? 'ok' : s.state === 'PENDING' ? 'warn' : 'neutral'} /> },
                  { key: 'act', header: '', cell: s => (
                    <span>
                      {s.state === 'PENDING' && <ActionButton operation="enable_cmp_site" label="Approve origins" input={undefined as never} params={{ id: s.id }} onDone={() => sites.refresh()} />}
                      <button type="button" onClick={() => setSelected(s.id)}>Open</button>
                    </span>
                  ) },
                ]} />
              <Pagination query={sites} />
            </>
          )}
        </QueryBoundary>
        <WriteForm operation="create_cmp_site" label="Add a site" onSaved={s => { sites.refresh(); setSelected(s.id); }} describe={s => `${s.name} added; a second person must approve its origins`}
          build={f => ({ name: text(f, 'name'), origins: text(f, 'origins').split(/[\s,]+/).filter(Boolean) })}>
          <Input label="Name" name="name" minLength={3} maxLength={120} />
          <Input label="Origins" name="origins" maxLength={2000} hint="Comma-separated, such as https://www.example.com. HTTPS, or HTTP to a loopback address for testing." />
        </WriteForm>
      </Section>
      {selected && <SiteDetail key={selected} id={selected} onChanged={() => sites.refresh()} />}
    </>
  );
}

function SiteDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const sites = usePagedQuery('list_cmp_sites', { limit: 100 });
  const configs = usePagedQuery('list_cmp_configs', { limit: 25, params: { id } });
  const stats = useQuery('cmp_consent_stats', { params: { id } });
  const scans = usePagedQuery('list_cmp_scans', { limit: 10, params: { id } });
  const site = sites.data?.items.find(s => s.id === id);
  const published = configs.data?.items.find(c => c.state === 'PUBLISHED');
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return (
    <Section title={site ? site.name : 'Site'}>
      {site && (
        <>
          <Facts items={[{ term: 'Origins', value: site.origins.join(', ') }, { term: 'State', value: site.state.toLowerCase() }, { term: 'Approved by', value: site.approved_by ? `${shortId(site.approved_by)} ${formatTime(site.approved_at!)}` : 'Not yet' }]} />
          <NoticeBox tone="info" title="Embed on the site">
            <p>Add this to the page head, then mark each non-essential script as <code>type="text/plain" data-orvia-category="…"</code> with its address in <code>data-src</code>:</p>
            <p><code>{`<script src="${origin}${site.sdk_path}"></script>`}</code></p>
            <p>Visitors can reopen their choices with <code>OrviaCMP.open()</code>, for example from a footer link.</p>
          </NoticeBox>
          {site.state !== 'DISABLED' && <ActionButton operation="disable_cmp_site" label="Disable this site" input={undefined as never} params={{ id }} onDone={onChanged} />}
        </>
      )}
      <h3>Banner versions</h3>
      <QueryBoundary query={configs} label="banner versions" isEmpty={d => !d.items.length}>
        {d => (
          <DataTable caption="Banner versions" rows={d.items} rowKey={c => c.id}
            columns={[
              { key: 'v', header: 'Version', cell: c => <span className="cell-primary">Version {c.version}<span className="cell-sub">{c.document.categories.map(x => x.label).join(', ')} · rule: {c.document.rule.source_reference}</span></span> },
              { key: 'state', header: 'State', cell: c => c.state.toLowerCase() },
              { key: 'act', header: '', cell: c => c.state === 'DRAFT' ? <ActionButton operation="decide_cmp_config" label="Publish" input={{ action: 'PUBLISH' }} params={{ id: c.id }} onDone={() => configs.refresh()} />
                : c.state === 'PUBLISHED' ? <ActionButton operation="decide_cmp_config" label="Retire" input={{ action: 'RETIRE' }} params={{ id: c.id }} onDone={() => configs.refresh()} /> : null },
            ]} />
        )}
      </QueryBoundary>
      <WriteForm key={published?.id ?? 'template'} operation="create_cmp_config" label="Record a banner version" params={{ id }} onSaved={() => configs.refresh()} describe={c => `Version ${c.version} recorded; someone else must publish it`}
        build={f => { let document: unknown; try { document = JSON.parse(text(f, 'document')); } catch { throw new Error('The banner definition is not valid JSON.'); } return { document: document as typeof TEMPLATE & { rule: { basis: 'OPT_IN' } } }; }}>
        <Area label="Banner definition" name="document" minLength={50} maxLength={40000} defaultValue={JSON.stringify(published?.document ?? TEMPLATE, null, 2)}
          hint="Categories (exactly one strictly necessary), declared trackers with their hosts and cookies, texts per language (English required), and the rule with its legal source." />
      </WriteForm>
      <h3>Visitor choices</h3>
      <QueryBoundary query={stats} label="visitor choices" isEmpty={() => false}>
        {s => (
          <>
            <p>{s.visitors} visitor(s), {s.records} record(s){s.gpc_visitors ? `, ${s.gpc_visitors} with a Global Privacy Control signal` : ''}.{s.latest_at ? ` Latest ${formatTime(s.latest_at)}.` : ''}</p>
            {s.by_category.length > 0 && <DataTable caption="Latest choice by category" rows={s.by_category} rowKey={x => x.key}
              columns={[{ key: 'k', header: 'Category', cell: x => x.key }, { key: 'g', header: 'Granted', cell: x => String(x.granted) }, { key: 'r', header: 'Refused', cell: x => String(x.refused) }]} />}
            <ul className="cell-sub">{s.limits.map(l => <li key={l}>{l}</li>)}</ul>
          </>
        )}
      </QueryBoundary>
      <h3>Scans</h3>
      {site?.state === 'ENABLED' && (
        <WriteForm operation="request_cmp_scan" label="Scan a page" params={{ id }} onSaved={() => scans.refresh()} describe={() => 'Queued for the local scanner'} build={f => ({ url: text(f, 'url') })}>
          <Input label="Page address" name="url" maxLength={2000} defaultValue={site.origins[0] ? `${site.origins[0]}/` : ''} hint="Must be on one of the approved origins." />
        </WriteForm>
      )}
      <QueryBoundary query={scans} label="scans" isEmpty={d => !d.items.length}>
        {d => (
          <>
            {d.items.map(scan => (
              <div key={scan.id} className="panel">
                <p><strong>{scan.url}</strong> — {scan.state.toLowerCase()}{scan.observed_at ? `, ${formatTime(scan.observed_at)}` : ''}{scan.failure_code ? ` (${scan.failure_code.toLowerCase().replaceAll('_', ' ')})` : ''}</p>
                {scan.results && <p className="cell-sub">Banner {scan.results.banner_shown ? 'shown' : 'not shown'}. Before a choice: {scan.results.before_consent.hosts.length} host(s). After accepting: {scan.results.after_consent.hosts.length}. After refusing: {scan.results.after_refusal.hosts.length}.</p>}
                {scan.findings.length > 0 && <DataTable caption={`Scan findings for ${scan.url}`} rows={scan.findings} rowKey={f => `${f.kind}:${f.subject}`}
                  columns={[
                    { key: 's', header: 'Severity', cell: f => <Badge label={f.severity.toLowerCase()} tone={SEVERITY_TONE[f.severity] ?? 'neutral'} /> },
                    { key: 'k', header: 'Finding', cell: f => f.kind.toLowerCase().replaceAll('_', ' ') },
                    { key: 'subj', header: 'Host or cookie', cell: f => f.subject },
                    { key: 'd', header: 'Detail', cell: f => f.detail },
                  ]} />}
              </div>
            ))}
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}
