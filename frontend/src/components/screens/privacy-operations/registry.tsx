'use client';
import { useState } from 'react';
import { useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, SelectField, StateBadge, TextField } from '../../shared/ui.tsx';
import { TASK_STATE_LABELS } from './operations-labels.ts';

/**
 * Data & Processing Registry.
 *
 * A person is shown with each relationship context kept apart, because what
 * may be processed about somebody as a customer is not what may be processed
 * about the same person as an employee. Unknown values are shown as unknown.
 */
const GAP_TEXT: Record<string, string> = {
  CONDITION_UNRESOLVED: 'Processing condition unresolved', NO_CONDITION: 'No processing condition', NO_NOTICE_FOR_CONSENT: 'Consent activity without a notice',
  NO_RETENTION_RULE: 'No retention rule', NO_SYSTEM: 'No system linked', NO_PRINCIPAL_CATEGORY: 'No Data Principal category', NO_DATA_CATEGORY: 'No personal data category',
  CHILD_DATA_UNKNOWN: 'Whether children’s data is processed is unknown', UNBOUND_SYSTEM: 'A linked system has no connector binding',
};

export function DataPrincipals() {
  const directory = useDirectory(['systems']);
  const [systemId, setSystemId] = useState('');
  const [reference, setReference] = useState('');
  const [search, setSearch] = useState<Record<string, string>>({});
  const list = usePagedQuery('list_data_principals', { limit: 25, query: search });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Registry" title="Data Principals"
        lede="People known to the registry, the systems that hold them, and each relationship context kept separate. Source identifiers are never stored; only a keyed digest is." />
      <form className="inline-form" onSubmit={event => { event.preventDefault(); setSearch({ ...(systemId ? { system_id: systemId } : {}), ...(reference ? { target_reference: reference } : {}) }); }}>
        <SelectField label="System" value={systemId} onChange={setSystemId} options={[{ value: '', label: 'Any system' }, ...(directory.data?.systems ?? []).map(s => ({ value: s.id, label: s.name }))]} />
        <TextField label="Record key in that system" value={reference} onChange={setReference} maxLength={120} />
        <button type="submit">Search</button>
      </form>
      <Freshness query={list} />
      <QueryBoundary query={list} label="Data Principals" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Data Principals" rows={data.items} rowKey={p => p.id}
              columns={[
                { key: 'id', header: 'Person', cell: p => <span className="cell-primary">{shortId(p.id)}<span className="cell-sub">{p.principal_id ? 'Has a Privacy Centre identity' : 'No portal identity'}</span></span> },
                { key: 'status', header: 'Status', cell: p => p.status === 'MERGED' ? <Badge label="Merged" tone="neutral" meaning="Merged into another record; history kept." /> : p.status.toLowerCase() },
                { key: 'contexts', header: 'Relationship contexts', cell: p => String(p.relationship_count) },
                { key: 'recorded', header: 'Recorded', cell: p => formatTime(p.recorded_at) },
                { key: 'open', header: '', cell: p => <button type="button" onClick={() => setSelected(p.id)}>Open</button> },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
      {selected && <PrincipalDetail id={selected} />}
    </>
  );
}

function PrincipalDetail({ id }: { id: string }) {
  const subject = useQuery('data_principal', { params: { id } });
  const processing = useQuery('data_principal_processing', { params: { id } });
  const directory = useDirectory(['systems']);
  return (
    <>
      <Section title="References and contexts">
        <QueryBoundary query={subject} label="Data Principal" isEmpty={() => false}>
          {data => (
            <>
              <DataTable caption="Where this person is held" rows={data.references} rowKey={r => `${r.system_id}:${r.target_reference}`}
                columns={[
                  { key: 'system', header: 'System', cell: r => directory.systemName(r.system_id) },
                  { key: 'ref', header: 'Record key', cell: r => r.target_reference },
                  { key: 'key', header: 'Source identifier', cell: r => r.has_source_key ? 'Keyed digest recorded' : 'None supplied' },
                ]} />
              <DataTable caption="Relationship contexts" rows={data.relationships} rowKey={r => r.id}
                columns={[
                  { key: 'cat', header: 'Context', cell: r => r.category_name },
                  { key: 'status', header: 'Status', cell: r => r.status === 'UNKNOWN' ? <Badge label="Unknown" tone="unknown" meaning="Whether this relationship is active is not recorded." /> : r.status.toLowerCase() },
                  { key: 'from', header: 'From', cell: r => r.effective_from ? formatTime(r.effective_from) : 'Unknown' },
                  { key: 'to', header: 'To', cell: r => r.effective_to ? formatTime(r.effective_to) : r.status === 'ENDED' ? 'Ended on an unrecorded date' : '—' },
                  { key: 'evidence', header: 'Evidence', cell: r => r.evidence_state.replaceAll('_', ' ').toLowerCase() },
                ]} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Processing, per context">
        <QueryBoundary query={processing} label="processing" isEmpty={data => !data.contexts.length}>
          {data => (
            <>
              {data.contexts.map(context => (
                <article key={context.relationship_id} className="panel">
                  <h3>{context.category_name} <span className="cell-sub">({context.status.toLowerCase()})</span></h3>
                  <ul>{context.activities.map(a => <li key={a.activity_id}>{a.name} — {a.condition_unresolved ? 'condition unresolved' : a.condition_code ?? 'no condition'}; systems: {a.system_ids.map(s => directory.systemName(s)).join(', ') || 'none'}</li>)}</ul>
                  {!context.activities.length && <p className="cell-sub">No activity is recorded for this context.</p>}
                  <p className="cell-sub">Consent records: {context.consent.length}. Active holds: {context.active_hold_ids.length}.</p>
                </article>
              ))}
            </>
          )}
        </QueryBoundary>
      </Section>
    </>
  );
}

export function ProcessingActivities() {
  const list = usePagedQuery('list_registry_activities', { limit: 25 });
  return (
    <>
      <PageHead eyebrow="Registry" title="Processing activities"
        lede="Each activity with its purpose version, processing condition, notices, systems and retention, and what is missing — stated as facts, never as a score." />
      <Freshness query={list} />
      <QueryBoundary query={list} label="processing activities" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Processing activities" rows={data.items} rowKey={a => a.id}
              columns={[
                { key: 'name', header: 'Activity', cell: a => <span className="cell-primary">{a.name}<span className="cell-sub">{a.owner_reference}</span></span> },
                { key: 'status', header: 'Status', cell: a => a.status.toLowerCase() },
                { key: 'version', header: 'Current version', cell: a => { const v = a.versions.find(x => x.status === 'CURRENT'); return v ? `v${v.version} from ${formatTime(v.effective_from)}` : 'None'; } },
                { key: 'children', header: 'Children’s data', cell: a => a.processes_child_data === 'UNKNOWN' ? <Badge label="Unknown" tone="unknown" meaning="Not recorded; nothing is assumed." /> : a.processes_child_data === 'YES' ? 'Yes' : 'No' },
                { key: 'links', header: 'Current links', cell: a => String(a.links.filter(l => l.valid_to === null).length) },
                { key: 'gaps', header: 'Missing', cell: a => a.gaps.length ? <ul>{a.gaps.map(g => <li key={g}>{GAP_TEXT[g] ?? g}</li>)}</ul> : 'Nothing missing' },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function OrganisationProfile() {
  const profile = useQuery('organisation_profile');
  const complete = useMutation('complete_sdf_obligation', true);
  const [evidence, setEvidence] = useState<Record<string, string>>({});
  return (
    <>
      <PageHead eyebrow="Registry" title="Organisation profile"
        lede="Facts about the organisation that decide which requirements apply. Significant Data Fiduciary status is recorded with its Government reference; unknown is a valid answer." />
      <Freshness query={profile} />
      <QueryBoundary query={profile} label="organisation profile" isEmpty={data => !data.current}>
        {data => {
          const current = data.current!;
          const designated = current.sdf_status === 'DESIGNATED';
          return (
            <>
              <Section title={`Version ${current.version}`}>
                <Facts items={[
                  { term: 'SDF status', value: current.sdf_status === 'UNKNOWN' ? <Badge label="Unknown" tone="unknown" meaning="Not recorded. SDF requirements are unresolved, not assumed not to apply." /> : designated ? `Designated — ${current.sdf_designation_reference ?? ''}` : 'Not designated' },
                  { term: 'Third Schedule class', value: current.facts.third_schedule_class.replaceAll('_', ' ').toLowerCase() },
                  { term: 'DPO contact', value: current.dpo_contact ?? 'Not recorded' }, { term: 'Grievance contact', value: current.grievance_contact ?? 'Not recorded' },
                  { term: 'Effective from', value: formatTime(current.effective_from) }, { term: 'Reason', value: current.reason },
                ]} />
              </Section>
              {designated && (
                <Section title="Significant Data Fiduciary obligations">
                  <DataTable caption="Obligations from the package in force" rows={current.sdf_obligations} rowKey={o => o.id}
                    columns={[
                      { key: 'kind', header: 'Obligation', cell: o => <span className="cell-primary">{o.kind.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{o.requirement_id}</span></span> },
                      { key: 'state', header: 'State', cell: o => <StateBadge dictionary={TASK_STATE_LABELS} value={o.state} /> },
                      { key: 'due', header: 'Due', cell: o => o.due_at ? <>{formatTime(o.due_at)}{o.overdue && <> <Badge label="Overdue" tone="stop" meaning="Past its due time." /></>}</> : 'No statutory period' },
                      { key: 'evidence', header: 'Evidence', cell: o => o.state !== 'OPEN' ? (o.evidence_reference ?? o.closure_reason ?? '') : (
                        <span>
                          <input aria-label="Evidence reference" value={evidence[o.id] ?? ''} maxLength={200} onChange={event => setEvidence({ ...evidence, [o.id]: event.target.value })} />
                          <button type="button" disabled={!(evidence[o.id] ?? '').trim()} onClick={async () => { complete.newInteraction(); if (await complete.run({ evidence_reference: evidence[o.id]! }, { params: { id: o.id } })) profile.refresh(); }}>Complete</button>
                        </span>) },
                    ]} />
                  {complete.failure && <FailureState failure={complete.failure} />}
                </Section>
              )}
              {!designated && <NoticeBox tone="info" title="SDF workflows are not shown"><p>No designation is recorded, so no Significant Data Fiduciary obligations exist for this organisation.</p></NoticeBox>}
              <Section title="History">
                <DataTable caption="Profile versions (append-only)" rows={data.history} rowKey={v => v.id}
                  columns={[{ key: 'v', header: 'Version', cell: v => String(v.version) }, { key: 'sdf', header: 'SDF status', cell: v => v.sdf_status }, { key: 'from', header: 'Effective', cell: v => formatTime(v.effective_from) }, { key: 'reason', header: 'Reason', cell: v => v.reason }]} />
              </Section>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
