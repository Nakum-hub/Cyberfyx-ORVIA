'use client';
import { useState } from 'react';
import { schemas } from '@orvia/contracts';
import { useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { Area, Choice, Input, Many, WriteForm, all, localNow, nullable, text, time } from './registry-forms.tsx';
import { NoticeHistory } from './operations-extras.tsx';

const LOCALES = schemas.RegistryNoticeVersionCreate.shape.locale.options;
const LEGACY_CODES = ['CONTACT_DETAILS', 'IDENTIFIERS', 'MARKETING_PREFERENCES', 'ORDER_RECORDS', 'SUPPORT_NOTES'] as const;

/**
 * Registry set-up: the Data Principal categories, personal data categories,
 * purposes and processing conditions every activity is built from.
 *
 * A processing condition is only resolved when its code is in the vocabulary of
 * the regulatory package in force; the server decides that, and this screen
 * offers that vocabulary rather than inviting a guessed code.
 */
export function RegistrySetup() {
  const principalCategories = useCollection('list_principal_categories');
  const dataCategories = useCollection('list_data_categories');
  const purposes = useCollection('list_registry_purposes');
  const conditions = useCollection('list_processing_conditions');
  // Tables page on the server; the collections above only feed the choice lists.
  const principalPage = usePagedQuery('list_principal_categories', { limit: 25 });
  const dataPage = usePagedQuery('list_data_categories', { limit: 25 });
  const purposePage = usePagedQuery('list_registry_purposes', { limit: 25 });
  const conditionPage = usePagedQuery('list_processing_conditions', { limit: 25 });
  const active = useQuery('active_regulatory_package');
  const packageId = active.data?.package?.id;
  const detail = useQuery('regulatory_package', { params: { id: packageId ?? '' }, enabled: Boolean(packageId) });
  const vocabulary = detail.data?.condition_vocabulary ?? [];
  const [conditionCode, setConditionCode] = useState('');
  return (
    <>
      <PageHead eyebrow="Registry" title="Registry set-up"
        lede="The categories, purposes and processing conditions that activities, notices and retention rules are built from. Every change is versioned; nothing here is deleted." />

      <Section title="Data Principal categories">
        <Freshness query={principalPage} />
        <QueryBoundary query={principalPage} label="Data Principal categories" isEmpty={d => !d.items.length}>
          {d => <><DataTable caption="Relationship contexts a person can be held under" rows={d.items} rowKey={c => c.id}
            columns={[
              { key: 'name', header: 'Category', cell: c => <span className="cell-primary">{c.name}<span className="cell-sub">{c.description}</span></span> },
              { key: 'tags', header: 'Regulatory tags', cell: c => c.regulatory_tags.join(', ') || 'None' },
              { key: 'active', header: 'Status', cell: c => c.active ? 'active' : 'inactive' },
            ]} /><Pagination query={principalPage} /></>}
        </QueryBoundary>
        <WriteForm operation="create_principal_category" label="Add a Data Principal category" onSaved={() => { principalCategories.refresh(); principalPage.refresh(); }} describe={c => c.name}
          build={f => ({ name: text(f, 'name'), description: text(f, 'description'), regulatory_tags: text(f, 'tags').split(',').map(t => t.trim().toUpperCase()).filter(Boolean) })}>
          <Input label="Name" name="name" />
          <Input label="Description" name="description" maxLength={500} />
          <Input label="Regulatory tags" name="tags" required={false} hint="Optional, comma-separated, e.g. CHILD, EMPLOYEE (A–Z, 0–9, underscore)." maxLength={400} />
        </WriteForm>
      </Section>

      <Section title="Personal data categories">
        <Freshness query={dataPage} />
        <QueryBoundary query={dataPage} label="personal data categories" isEmpty={d => !d.items.length}>
          {d => <><DataTable caption="Kinds of personal data processed" rows={d.items} rowKey={c => c.id}
            columns={[
              { key: 'name', header: 'Category', cell: c => <span className="cell-primary">{c.name}<span className="cell-sub">{c.description}</span></span> },
              { key: 'legacy', header: 'Consent-control category', cell: c => c.legacy_code?.replaceAll('_', ' ').toLowerCase() ?? 'Not mapped' },
            ]} /><Pagination query={dataPage} /></>}
        </QueryBoundary>
        <WriteForm operation="create_data_category" label="Add a personal data category" onSaved={() => { dataCategories.refresh(); dataPage.refresh(); }} describe={c => c.name}
          build={f => ({ name: text(f, 'name'), description: text(f, 'description'), legacy_code: (nullable(f, 'legacy') as typeof LEGACY_CODES[number] | null) })}>
          <Input label="Name" name="name" />
          <Input label="Description" name="description" maxLength={500} />
          <Choice label="Consent-control category" name="legacy" required={false} placeholder="Not mapped" hint="Optional link to the category the consent-control engine enforces."
            options={LEGACY_CODES.map(c => ({ value: c, label: c.replaceAll('_', ' ').toLowerCase() }))} />
        </WriteForm>
      </Section>

      <Section title="Purposes">
        <Freshness query={purposePage} />
        <QueryBoundary query={purposePage} label="purposes" isEmpty={d => !d.items.length}>
          {d => <><DataTable caption="Registry purposes and their current version" rows={d.items} rowKey={p => p.id}
            columns={[
              { key: 'name', header: 'Purpose', cell: p => <span className="cell-primary">{p.name}<span className="cell-sub">{p.owner_reference}</span></span> },
              { key: 'version', header: 'Current version', cell: p => { const v = p.versions.find(x => x.effective_to === null) ?? p.versions.at(-1); return v ? `v${v.version} · ${v.status.toLowerCase()} from ${formatTime(v.effective_from)}` : 'None'; } },
              { key: 'description', header: 'Description', cell: p => p.versions.at(-1)?.description ?? '' },
            ]} /><Pagination query={purposePage} /></>}
        </QueryBoundary>
        <WriteForm operation="create_registry_purpose" label="Register a purpose" onSaved={() => { purposes.refresh(); purposePage.refresh(); }} describe={p => p.name}
          build={f => ({ name: text(f, 'name'), owner_reference: text(f, 'owner'), description: text(f, 'description'), effective_from: time(f, 'from'),
            change_reason: text(f, 'reason'), evidence_reference: nullable(f, 'evidence'), v1_purpose_id: null })}>
          <Input label="Name" name="name" />
          <Input label="Owner" name="owner" maxLength={500} hint="The accountable person or team." />
          <Area label="Description" name="description" minLength={10} />
          <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} />
          <Input label="Reason for recording" name="reason" maxLength={500} />
          <Input label="Evidence reference" name="evidence" required={false} maxLength={500} />
        </WriteForm>
        <PurposeRevision purposes={(purposes.data?.items ?? []).map(p => ({ value: p.id, label: p.name }))} onSaved={() => { purposes.refresh(); purposePage.refresh(); }} />
      </Section>

      <Section title="Processing conditions">
        {!active.data?.package && active.status !== 'loading' && (
          <NoticeBox tone="warn" title="No regulatory package is in force">
            <p>A condition recorded now is stored as unresolved, because it cannot be traced to an official provision. Destructive work that depends on it is blocked until it is resolved.</p>
          </NoticeBox>
        )}
        <Freshness query={conditionPage} />
        <QueryBoundary query={conditionPage} label="processing conditions" isEmpty={d => !d.items.length}>
          {d => <><DataTable caption="Processing conditions" rows={d.items} rowKey={c => c.id}
            columns={[
              { key: 'code', header: 'Condition', cell: c => <span className="cell-primary">{c.label}<span className="cell-sub">{c.code}</span></span> },
              { key: 'state', header: 'Traced to', cell: c => c.unresolved ? <Badge label="Unresolved" tone="unknown" meaning={c.unresolved_reason ?? 'Not traced to an official provision.'} /> : c.requirement_ids.join(', ') },
              { key: 'evidence', header: 'Evidence expected', cell: c => c.evidence_requirements },
              { key: 'from', header: 'From', cell: c => formatTime(c.effective_from) },
            ]} /><Pagination query={conditionPage} /></>}
        </QueryBoundary>
        <WriteForm operation="create_processing_condition" label="Record a processing condition" onSaved={() => { conditions.refresh(); conditionPage.refresh(); }}
          describe={c => c.unresolved ? `${c.code}, recorded as unresolved: ${c.unresolved_reason ?? ''}` : `${c.code}, traced to ${c.requirement_ids.join(', ')}`}
          build={f => {
            const code = text(f, 'code');
            const reason = nullable(f, 'unresolved');
            if (code === 'UNRESOLVED' && !reason) throw new Error('An unresolved condition states why the basis is not yet established.');
            return { code, label: text(f, 'label'), effective_from: time(f, 'from'), justification_reference: nullable(f, 'justification'), evidence_requirements: text(f, 'evidence'), unresolved_reason: reason };
          }}>
          <Choice label="Condition" name="code" value={conditionCode} onChange={setConditionCode}
            hint={vocabulary.length ? 'From the vocabulary of the regulatory package in force.' : 'No package vocabulary is available; only an unresolved condition can be recorded.'}
            options={[...vocabulary.map(v => ({ value: v.code, label: `${v.label} (${v.code})` })), { value: 'UNRESOLVED', label: 'Not yet established (unresolved)' }]} />
          <Input label="Label" name="label" maxLength={500} />
          <Input label="Evidence expected" name="evidence" maxLength={500} hint="What evidence must exist for processing to rely on this condition." />
          <Input label="Justification reference" name="justification" required={false} maxLength={500} />
          {conditionCode === 'UNRESOLVED' && <Input label="Why it is unresolved" name="unresolved" maxLength={500} />}
          <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} />
        </WriteForm>
      </Section>
      <SafeguardsAndConnectors dataCategories={(dataCategories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
    </>
  );
}

const SAFEGUARD_KINDS = ['ACCESS_CONTROL', 'ENCRYPTION', 'OBFUSCATION_MASKING', 'TOKENISATION', 'LOGGING_MONITORING', 'BACKUP_AVAILABILITY', 'PROCESSOR_SAFEGUARD', 'ORGANISATIONAL_MEASURE'] as const;

/**
 * Safeguards are references to controls kept elsewhere, with the state of their
 * evidence. A connector binding says which adapter may act in a system; the only
 * automated adapter in this build is the synthetic test adapter, and it is
 * labelled as such. A manual-only binding reports every action as not supported.
 */
function SafeguardsAndConnectors({ dataCategories }: { dataCategories: { value: string; label: string }[] }) {
  const safeguards = useCollection('list_security_safeguards');
  const bindings = useCollection('list_connector_bindings');
  const systems = useCollection('list_systems');
  const systemName = (id: string) => systems.data?.items.find(s => s.id === id)?.name ?? id.slice(0, 8);
  return (
    <>
      <Section title="Security safeguards">
        <QueryBoundary query={safeguards} label="safeguards" isEmpty={d => !d.items.length}>
          {d => <DataTable caption="Safeguards" rows={d.items} rowKey={g => g.id}
            columns={[
              { key: 'kind', header: 'Safeguard', cell: g => <span className="cell-primary">{g.kind.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{g.description}</span></span> },
              { key: 'control', header: 'Control', cell: g => g.control_reference ?? '—' },
              { key: 'evidence', header: 'Evidence', cell: g => g.evidence_state === 'EVIDENCE_AVAILABLE' ? g.evidence_reference : <Badge label={g.evidence_state.replaceAll('_', ' ').toLowerCase()} tone="warn" /> },
            ]} />}
        </QueryBoundary>
        <WriteForm operation="create_security_safeguard" label="Record a safeguard" onSaved={() => safeguards.refresh()} describe={g => g.kind.replaceAll('_', ' ').toLowerCase()}
          build={f => {
            const evidence = text(f, 'evidence') as 'EVIDENCE_AVAILABLE' | 'EVIDENCE_MISSING' | 'NEEDS_VERIFICATION'; const reference = nullable(f, 'reference');
            if ((evidence === 'EVIDENCE_AVAILABLE') !== (reference !== null)) throw new Error('Only available evidence carries a reference, and it always does.');
            return { kind: text(f, 'kind') as typeof SAFEGUARD_KINDS[number], description: text(f, 'description'), control_reference: nullable(f, 'control'), evidence_state: evidence, evidence_reference: reference };
          }}>
          <Choice label="Kind" name="kind" options={SAFEGUARD_KINDS.map(k => ({ value: k, label: k.replaceAll('_', ' ').toLowerCase() }))} />
          <Input label="Description" name="description" maxLength={500} />
          <Input label="Control reference" name="control" required={false} maxLength={500} />
          <Choice label="Evidence" name="evidence" options={[{ value: 'EVIDENCE_AVAILABLE', label: 'Available' }, { value: 'NEEDS_VERIFICATION', label: 'Needs verification' }, { value: 'EVIDENCE_MISSING', label: 'Missing' }]} />
          <Input label="Evidence reference" name="reference" required={false} maxLength={500} />
        </WriteForm>
      </Section>
      <Section title="Connector bindings">
        <NoticeBox tone="warn" title="No live customer connector exists in this build">
          <p>The only automated adapter is the synthetic records test adapter, which acts on an isolated synthetic database. Bind a real system as manual-only until a real connector is built and qualified for it.</p>
        </NoticeBox>
        <QueryBoundary query={bindings} label="connector bindings" isEmpty={d => !d.items.length}>
          {d => <DataTable caption="Connector bindings" rows={d.items} rowKey={b => b.id}
            columns={[
              { key: 'system', header: 'System', cell: b => systemName(b.system_id) },
              { key: 'adapter', header: 'Adapter', cell: b => b.adapter === 'SYNTHETIC_RECORDS_TEST_ADAPTER' ? <Badge label="Synthetic test adapter" tone="warn" meaning="Acts only on the isolated synthetic records database." /> : <Badge label="Manual only" tone="neutral" meaning="Every automated action is reported not supported." /> },
              { key: 'can', header: 'Declared capabilities', cell: b => Object.entries(b.capabilities).filter(([, v]) => v === true).map(([k]) => k.replaceAll('_', ' ')).join(', ') || 'None' },
              { key: 'verify', header: 'Verification', cell: b => b.capabilities.verification_method === 'INDEPENDENT_READ_BACK' ? 'Independent read-back' : 'None available' },
              { key: 'valid', header: 'Valid', cell: b => `${formatTime(b.valid_from)} – ${b.valid_to ? formatTime(b.valid_to) : 'current'}` },
            ]} />}
        </QueryBoundary>
        <WriteForm operation="bind_connector" label="Bind a connector" onSaved={() => bindings.refresh()} describe={b => `${systemName(b.system_id)} bound (${b.adapter.toLowerCase().replaceAll('_', ' ')})`}
          build={f => ({ system_id: text(f, 'system'), adapter: text(f, 'adapter') as 'MANUAL_ONLY' | 'SYNTHETIC_RECORDS_TEST_ADAPTER', system_of_record_for: all(f, 'record'), holds_data_categories: all(f, 'holds') })}>
          <Choice label="System" name="system" options={(systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }))} />
          <Choice label="Adapter" name="adapter" options={[{ value: 'MANUAL_ONLY', label: 'Manual only' }, { value: 'SYNTHETIC_RECORDS_TEST_ADAPTER', label: 'Synthetic test adapter (isolated test data only)' }]} />
          <Many legend="System of record for" name="record" options={dataCategories} hint="Corrections are written here first." />
          <Many legend="Holds these personal data categories" name="holds" options={dataCategories} />
        </WriteForm>
      </Section>
    </>
  );
}

function PurposeRevision({ purposes, onSaved }: { purposes: { value: string; label: string }[]; onSaved: () => void }) {
  const [id, setId] = useState('');
  return (
    <WriteForm operation="revise_registry_purpose" label="Revise or retire a purpose" params={id ? { id } : undefined} onSaved={onSaved}
      describe={p => `${p.name} is now at version ${p.versions.length}${p.impact ? `; ${p.impact.activity_ids.length} activities and ${p.impact.consent_record_count} consent records are affected` : ''}`}
      build={f => {
        if (!id) throw new Error('Choose the purpose to revise.');
        return { description: text(f, 'description'), status: text(f, 'status') as 'ACTIVE' | 'RETIRED', effective_from: time(f, 'from'), change_reason: text(f, 'reason'), evidence_reference: nullable(f, 'evidence') };
      }}>
      <Choice label="Purpose" name="purpose" value={id} onChange={setId} options={purposes} />
      <Area label="Description of the new version" name="description" minLength={10} />
      <Choice label="Status" name="status" options={[{ value: 'ACTIVE', label: 'Active' }, { value: 'RETIRED', label: 'Retired' }]} />
      <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} />
      <Input label="Reason for change" name="reason" minLength={10} maxLength={500} />
      <Input label="Evidence reference" name="evidence" required={false} maxLength={500} />
    </WriteForm>
  );
}

/**
 * Registry notices: a notice is written per audience, versioned per locale, and
 * published from an effective date. A published version is never edited; a new
 * version supersedes it.
 */
export function RegistryNotices() {
  const notices = useCollection('list_registry_notices');
  const principalCategories = useCollection('list_principal_categories');
  const dataCategories = useCollection('list_data_categories');
  const purposes = useCollection('list_registry_purposes');
  const [noticeId, setNoticeId] = useState('');
  const [publishId, setPublishId] = useState('');
  const refresh = () => notices.refresh();
  const versions = (notices.data?.items ?? []).flatMap(n => n.versions.map(v => ({ ...v, notice_name: n.name })));
  const purposeVersions = (purposes.data?.items ?? []).flatMap(p => p.versions.filter(v => v.status === 'ACTIVE' && v.effective_to === null).map(v => ({ value: v.id, label: `${p.name} (v${v.version})` })));
  return (
    <>
      <PageHead eyebrow="Registry" title="Notices"
        lede="The notice text each audience is shown, per language, with the purposes and data it covers and how to withdraw, exercise rights and complain. Published versions are immutable." />
      <Freshness query={notices} />
      <QueryBoundary query={notices} label="notices" isEmpty={d => !d.items.length}>
        {() => <DataTable caption="Notice versions" rows={versions} rowKey={v => v.id}
          columns={[
            { key: 'notice', header: 'Notice', cell: v => <span className="cell-primary">{v.notice_name}<span className="cell-sub">v{v.version} · {v.locale}</span></span> },
            { key: 'title', header: 'Title', cell: v => v.title },
            { key: 'status', header: 'Status', cell: v => v.status === 'DRAFT' ? <Badge label="Draft" tone="warn" meaning="Not shown to anybody until published." /> : v.status.toLowerCase() },
            { key: 'from', header: 'In effect', cell: v => v.effective_from ? `${formatTime(v.effective_from)} – ${v.effective_to ? formatTime(v.effective_to) : 'current'}` : '—' },
            { key: 'digest', header: 'Content digest', cell: v => <span className="mono">{v.content_digest.slice(0, 16)}…</span> },
          ]} />}
      </QueryBoundary>

      <div className="grid-2">
        <WriteForm operation="create_registry_notice" label="Create a notice" onSaved={refresh} describe={n => n.name}
          build={f => ({ name: text(f, 'name'), audience_category_ids: all(f, 'audience') })}>
          <Input label="Name" name="name" />
          <Many legend="Audience (Data Principal categories)" name="audience" options={(principalCategories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
        </WriteForm>

        <WriteForm operation="publish_notice_version" label="Publish a draft version" params={publishId ? { id: publishId } : undefined} onSaved={() => { setPublishId(''); refresh(); }}
          describe={n => `${n.name} updated`}
          build={f => { if (!publishId) throw new Error('Choose the draft version to publish.'); return { effective_from: time(f, 'from') }; }}>
          <Choice label="Draft version" name="version" value={publishId} onChange={setPublishId}
            options={versions.filter(v => v.status === 'DRAFT').map(v => ({ value: v.id, label: `${v.notice_name} v${v.version} (${v.locale})` }))} />
          <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} hint="The version in force for this locale is superseded from this time." />
        </WriteForm>
      </div>

      <WriteForm operation="create_notice_version" label="Draft a notice version" params={noticeId ? { id: noticeId } : undefined} onSaved={refresh}
        describe={n => `${n.name} now has ${n.versions.length} version(s)`}
        build={f => {
          if (!noticeId) throw new Error('Choose the notice this version belongs to.');
          return { locale: text(f, 'locale') as typeof LOCALES[number], title: text(f, 'title'), content: text(f, 'content'),
            purpose_version_ids: all(f, 'purposes'), data_category_ids: all(f, 'categories'),
            channels: { withdrawal: text(f, 'withdrawal'), rights: text(f, 'rights'), grievance: text(f, 'grievance'), board_complaint: text(f, 'board') },
            template_reference: nullable(f, 'template'), v1_notice_version_id: null };
        }}>
        <Choice label="Notice" name="notice" value={noticeId} onChange={setNoticeId} options={(notices.data?.items ?? []).map(n => ({ value: n.id, label: n.name }))} />
        <Choice label="Language" name="locale" options={LOCALES.map(l => ({ value: l, label: l }))} />
        <Input label="Title" name="title" />
        <Area label="Notice text" name="content" maxLength={10000} />
        <Many legend="Purposes covered" name="purposes" options={purposeVersions} />
        <Many legend="Personal data covered" name="categories" options={(dataCategories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
        <Area label="How to withdraw consent" name="withdrawal" minLength={10} maxLength={500} />
        <Area label="How to exercise rights" name="rights" minLength={10} maxLength={500} />
        <Area label="How to raise a grievance" name="grievance" minLength={10} maxLength={500} />
        <Area label="How to complain to the Board" name="board" minLength={10} maxLength={500} />
        <Input label="Template reference" name="template" required={false} maxLength={500} />
      </WriteForm>
      <NoticeHistory />
    </>
  );
}

