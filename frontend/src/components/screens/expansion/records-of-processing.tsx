'use client';
import { useState } from 'react';
import { call, newIdempotencyKey, readOnce, useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { useSession } from '../../shared/session-context.tsx';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Choice, Input, WriteForm, localNow, text, time } from '../privacy-operations/registry-forms.tsx';

const GAP_TEXT: Record<string, string> = {
  NO_CONDITION: 'No processing condition', CONDITION_UNRESOLVED: 'Condition unresolved', NO_SYSTEM: 'No system', NO_DATA_CATEGORY: 'No data category', NO_PRINCIPAL_CATEGORY: 'No principal category',
  NO_RETENTION_RULE: 'No retention rule', UNBOUND_SYSTEM: 'System without a binding', LOCATION_UNDECLARED: 'Location undeclared', RECIPIENT_REGION_NOT_A_CODE: 'Recipient region is not a code',
  RECIPIENT_ENDED: 'Ended recipient still linked', CATEGORY_INACTIVE: 'Inactive category still linked', PURPOSE_VERSION_NOT_CURRENT: 'Purpose version no longer in effect',
  GRAPH_SYSTEM_NOT_DECLARED: 'Graph places it on an undeclared system', DECLARED_SYSTEM_NOT_IN_GRAPH: 'Declared system not in the graph', OBSERVATION_STALE: 'Reading expired', NOT_OBSERVED: 'Declared only, never read',
};
const TONE: Record<string, 'stop' | 'warn' | 'neutral'> = { MISSING: 'stop', CONFLICT: 'stop', STALE: 'warn', INFO: 'neutral' };
const hasCapability = (capabilities: string[] | undefined, capability: string) => Boolean(capabilities?.includes(capability));

/**
 * Records of processing (EX05). Every entry is derived from the registry, the
 * graph and independent readings; what is declared and what was read are shown
 * separately, and where they disagree the entry says so.
 */
export function RecordsOfProcessing() {
  const summary = useQuery('ropa_summary');
  const entries = usePagedQuery('list_ropa_entries', { limit: 25 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Governance" title="Records of processing"
        lede="Each processing activity with its purpose, condition, categories, systems, locations, recipients, transfers and retention, derived from what is recorded and read. Missing, stale and conflicting links are named." />
      <Freshness query={summary} />
      <QueryBoundary query={summary} label="summary" isEmpty={() => false}>
        {r => (
          <Section title="Summary">
            <Facts items={[
              { term: 'Activities', value: `${r.activities} (${r.activities_with_gaps} with gaps)` },
              { term: 'Cross-border transfers', value: `${r.cross_border_transfers} (outside ${r.home_region})` },
              { term: 'Systems declared but never read', value: String(r.systems_declared_only) },
              { term: 'As of', value: formatTime(r.as_of) },
            ]} />
            {r.gaps.length > 0 && <DataTable caption="Gaps by kind" rows={r.gaps} rowKey={g => g.kind}
              columns={[
                { key: 'kind', header: 'Gap', cell: g => <Badge label={GAP_TEXT[g.kind] ?? g.kind} tone={TONE[g.severity] ?? 'neutral'} /> },
                { key: 'sev', header: 'Kind', cell: g => g.severity.toLowerCase() },
                { key: 'n', header: 'Activities', cell: g => String(g.count) },
              ]} />}
            <ul className="cell-sub">{r.limits.map(l => <li key={l}>{l}</li>)}</ul>
          </Section>
        )}
      </QueryBoundary>
      <Section title="Activities">
        <QueryBoundary query={entries} label="activities" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Records of processing" rows={d.items} rowKey={e => e.activity_id}
                columns={[
                  { key: 'name', header: 'Activity', cell: e => <span className="cell-primary">{e.name}<span className="cell-sub">{e.purpose ? `${e.purpose.name} v${e.purpose.version}` : 'No purpose'} · {e.condition?.code ?? 'no condition'}</span></span> },
                  { key: 'systems', header: 'Systems', cell: e => e.systems.length ? e.systems.map(s => s.name).join(', ') : '—' },
                  { key: 'recipients', header: 'Recipients', cell: e => e.recipients.length ? e.recipients.map(r => r.processor_name).join(', ') : '—' },
                  { key: 'transfers', header: 'Cross-border', cell: e => { const n = e.transfers.filter(t => t.cross_border).length; return n ? <Badge label={`${n} transfer(s)`} tone="warn" /> : 'None' } },
                  { key: 'gaps', header: 'Gaps', cell: e => { const n = e.gaps.filter(g => g.severity !== 'INFO').length; return n ? <Badge label={`${n} gap(s)`} tone="stop" /> : <Badge label="None" tone="ok" />; } },
                  { key: 'open', header: '', cell: e => <button type="button" onClick={() => setSelected(e.activity_id)}>Open</button> },
                ]} />
              <Pagination query={entries} />
            </>
          )}
        </QueryBoundary>
        {selected && <EntryDetail key={selected} id={selected} onChanged={() => { entries.refresh(); summary.refresh(); }} />}
      </Section>
      <Impact />
      <Versions />
      <Exports />
    </>
  );
}

function EntryDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const entry = useQuery('ropa_entry', { params: { id } });
  const [system, setSystem] = useState('');
  const refresh = () => { entry.refresh(); onChanged(); };
  return (
    <QueryBoundary query={entry} label="record of processing" isEmpty={() => false}>
      {e => (
        <div className="panel">
          <h3>{e.name}</h3>
          <p className="cell-sub">{e.description}</p>
          <Facts items={[
            { term: 'Owner', value: e.owner_reference }, { term: 'Purpose', value: e.purpose ? `${e.purpose.name}, version ${e.purpose.version}${e.purpose.current ? '' : ' (no longer in effect)'}` : 'None' },
            { term: 'Condition', value: e.condition ? `${e.condition.code}${e.condition.unresolved ? ' (unresolved)' : ''}` : 'None' },
            { term: 'Principal categories', value: e.principal_categories.map(c => c.name).join(', ') || 'None' }, { term: 'Data categories', value: e.data_categories.map(c => c.name).join(', ') || 'None' },
            { term: 'Children\'s data', value: e.processes_child_data.toLowerCase() }, { term: 'Retention', value: e.retention.map(r => `${r.name} (${r.duration_days === null ? 'no period' : `${r.duration_days} days`})`).join(', ') || 'None' },
          ]} />
          <DataTable caption="Systems" rows={e.systems} rowKey={s => s.id}
            columns={[
              { key: 'name', header: 'System', cell: s => <span className="cell-primary">{s.name}<span className="cell-sub">Declared: {s.basis}</span></span> },
              { key: 'binding', header: 'Binding', cell: s => s.binding_adapter ?? <Badge label="None" tone="stop" /> },
              { key: 'location', header: 'Location', cell: s => s.location ? `${s.location.region} — ${s.location.hosting_description}` : <Badge label="Undeclared" tone="stop" /> },
              { key: 'observed', header: 'Read', cell: s => s.observed ? <Badge label={`${s.observed.fresh ? 'read' : 'reading expired'} ${formatTime(s.observed.last_seen_at)}`} tone={s.observed.fresh ? 'ok' : 'warn'} /> : 'Declared only' },
            ]} />
          {e.recipients.length > 0 && <DataTable caption="Recipients" rows={e.recipients} rowKey={r => r.engagement_id}
            columns={[
              { key: 'name', header: 'Processor', cell: r => <span className="cell-primary">{r.processor_name}<span className="cell-sub">{r.role.toLowerCase()}{r.subprocessor_of ? ` · sub-processor of ${shortId(r.subprocessor_of)}` : ''}</span></span> },
              { key: 'region', header: 'Recorded region', cell: r => r.region },
              { key: 'status', header: 'Engagement', cell: r => <Badge label={r.status.toLowerCase()} tone={r.status === 'ACTIVE' ? 'ok' : 'warn'} /> },
            ]} />}
          {e.transfers.length > 0 && <DataTable caption="Transfers" rows={e.transfers} rowKey={t => `${t.via}:${t.target_id}`}
            columns={[
              { key: 'via', header: 'Via', cell: t => t.via.toLowerCase() }, { key: 'name', header: 'To', cell: t => t.name },
              { key: 'region', header: 'Region', cell: t => t.region }, { key: 'cb', header: 'Cross-border', cell: t => t.cross_border ? <Badge label="Yes" tone="warn" /> : 'No' },
            ]} />}
          {e.gaps.length ? <DataTable caption="Gaps" rows={e.gaps} rowKey={g => `${g.kind}:${g.target_id ?? ''}`}
            columns={[
              { key: 'kind', header: 'Gap', cell: g => <Badge label={GAP_TEXT[g.kind] ?? g.kind} tone={TONE[g.severity] ?? 'neutral'} /> },
              { key: 'detail', header: 'Detail', cell: g => g.detail },
            ]} /> : <NoticeBox tone="ok" title="No gaps"><p>Nothing recorded is missing, stale or in conflict for this activity.</p></NoticeBox>}
          <WriteForm operation="declare_system_location" label="Declare a system location" params={system ? { id: system } : undefined} onSaved={() => { setSystem(''); refresh(); }} describe={l => `Location ${l.region} declared`}
            build={f => { if (!system) throw new Error('Choose the system.'); return { region: text(f, 'region').toUpperCase(), hosting_description: text(f, 'hosting'), basis: text(f, 'basis'), valid_from: time(f, 'from') }; }}>
            <Choice label="System" name="system" value={system} onChange={setSystem} options={e.systems.map(s => ({ value: s.id, label: s.name }))} />
            <Input label="Region" name="region" maxLength={6} hint="A country code such as IN, or a state code such as IN-KA." />
            <Input label="Hosting" name="hosting" minLength={3} maxLength={300} hint="Where and by whom the system is hosted." />
            <Input label="Basis" name="basis" minLength={10} maxLength={500} hint="What the declaration rests on, such as the hosting contract." />
            <Input label="From" name="from" type="datetime-local" defaultValue={localNow()} />
          </WriteForm>
        </div>
      )}
    </QueryBoundary>
  );
}

function Impact() {
  const [kind, setKind] = useState('SYSTEM');
  const [target, setTarget] = useState('');
  const systems = useCollection('list_systems');
  const processors = useCollection('list_processors');
  const purposes = useCollection('list_registry_purposes');
  const categories = useCollection('list_data_categories');
  const principals = useCollection('list_principal_categories');
  const options = kind === 'SYSTEM' ? (systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name })) : kind === 'PROCESSOR' ? (processors.data?.items ?? []).map(p => ({ value: p.id, label: p.name }))
    : kind === 'PURPOSE' ? (purposes.data?.items ?? []).map(p => ({ value: p.id, label: p.name })) : kind === 'DATA_CATEGORY' ? (categories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))
      : (principals.data?.items ?? []).map(c => ({ value: c.id, label: c.name }));
  const impact = useQuery('ropa_impact', { query: { kind: kind as 'SYSTEM', target_id: target }, enabled: Boolean(target) });
  return (
    <Section title="Change impact">
      <div className="grid-2">
        <Choice label="Changing a" name="impact_kind" value={kind} onChange={v => { setKind(v); setTarget(''); }} options={[{ value: 'SYSTEM', label: 'System' }, { value: 'PROCESSOR', label: 'Processor' }, { value: 'PURPOSE', label: 'Purpose' }, { value: 'DATA_CATEGORY', label: 'Data category' }, { value: 'PRINCIPAL_CATEGORY', label: 'Principal category' }]} />
        <Choice label="Which one" name="impact_target" value={target} onChange={setTarget} options={options} />
      </div>
      {target && (
        <QueryBoundary query={impact} label="impact" isEmpty={() => false}>
          {i => (
            <>
              <p>{i.activities.length} activit{i.activities.length === 1 ? 'y' : 'ies'}, {i.retention_rule_ids.length} retention rule(s), {i.engagement_ids.length} engagement(s){kind === 'SYSTEM' ? `, ${i.graph_asset_count} graph asset(s)` : ''}{i.consent_record_count !== null ? `, ${i.consent_record_count} consent record(s)` : ''}.{i.complete ? '' : ' Lists reached their bound; counts are lower bounds.'}</p>
              {i.activities.length > 0 && <DataTable caption="Affected activities" rows={i.activities} rowKey={a => a.activity_id}
                columns={[{ key: 'name', header: 'Activity', cell: a => a.name }, { key: 'via', header: 'Reached through', cell: a => a.via.toLowerCase().replaceAll('_', ' ') }]} />}
            </>
          )}
        </QueryBoundary>
      )}
    </Section>
  );
}

function Versions() {
  const versions = usePagedQuery('list_ropa_versions', { limit: 25 });
  const [base, setBase] = useState(''); const [compare, setCompare] = useState('');
  const diff = useQuery('ropa_version_diff', { params: { id: compare }, query: { against: base }, enabled: Boolean(base && compare && base !== compare) });
  return (
    <Section title="Versions">
      <WriteForm operation="create_ropa_version" label="Record a version" onSaved={() => versions.refresh()} describe={v => `Version ${v.version} recorded with ${v.activity_count} activities`}
        build={f => ({ note: text(f, 'note') })}>
        <Input label="Note" name="note" minLength={10} maxLength={500} hint="Why this version is being recorded, such as a quarterly review." />
      </WriteForm>
      <QueryBoundary query={versions} label="versions" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Recorded versions" rows={d.items} rowKey={v => v.id}
              columns={[
                { key: 'v', header: 'Version', cell: v => <span className="cell-primary">Version {v.version}<span className="cell-sub">{v.note}</span></span> },
                { key: 'at', header: 'Recorded', cell: v => `${formatTime(v.recorded_at)} by ${shortId(v.recorded_by)}` },
                { key: 'n', header: 'Contents', cell: v => `${v.activity_count} activities, ${v.gap_count} gaps` },
                { key: 'digest', header: 'Digest', cell: v => <code>{v.content_digest.slice(0, 12)}</code> },
                { key: 'approval', header: 'Approval', cell: v => v.approved_by ? `Approved ${formatTime(v.approved_at!)}` : <ActionButton operation="approve_ropa_version" label="Approve" input={{ note: 'Reviewed against the registry and approved.' }} params={{ id: v.id }} onDone={() => versions.refresh()} /> },
              ]} />
            <Pagination query={versions} />
            {d.items.length > 1 && (
              <div className="grid-2">
                <Choice label="Compare version" name="diff_to" value={compare} onChange={setCompare} options={d.items.map(v => ({ value: v.id, label: `Version ${v.version}` }))} />
                <Choice label="Against version" name="diff_from" value={base} onChange={setBase} options={d.items.map(v => ({ value: v.id, label: `Version ${v.version}` }))} />
              </div>
            )}
          </>
        )}
      </QueryBoundary>
      {base && compare && base !== compare && (
        <QueryBoundary query={diff} label="differences" isEmpty={() => false}>
          {x => (
            <DataTable caption={`Changes from version ${x.from_version} to ${x.to_version}`} rows={[...x.added.map(a => ({ ...a, change: 'added', fields: [] as string[] })), ...x.removed.map(a => ({ ...a, change: 'removed', fields: [] as string[] })), ...x.changed.map(a => ({ ...a, change: 'changed' }))]}
              rowKey={r => `${r.change}:${r.activity_id}`}
              columns={[{ key: 'name', header: 'Activity', cell: r => r.name }, { key: 'change', header: 'Change', cell: r => r.change }, { key: 'fields', header: 'What changed', cell: r => r.fields.join(', ') || '—' }]} />
          )}
        </QueryBoundary>
      )}
    </Section>
  );
}

async function sha256(text: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function Exports() {
  const { session } = useSession();
  const capabilities = session?.actor_domain === 'STAFF' ? session.capabilities : [];
  const jobs = usePagedQuery('list_data_exports', { limit: 25 });
  const versions = useCollection('list_ropa_versions');
  const [kind, setKind] = useState('ROPA_VERSION_CSV');
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'ok' | 'stop'; text: string } | null>(null);
  const drive = async (id: string) => {
    setBusy(id); setMessage(null);
    try {
      for (let i = 0; i < 2000; i++) {
        const job = await call('advance_data_export', undefined as never, { params: { id }, idempotency_key: newIdempotencyKey() });
        jobs.refresh();
        if (job.state !== 'RUNNING') { setMessage(job.state === 'COMPLETED' ? { tone: 'ok', text: `Export complete: ${job.rows_written} rows in ${job.chunks} chunk(s).` } : { tone: 'stop', text: `Export ${job.state.toLowerCase()}${job.failure_code ? `: ${job.failure_code.replaceAll('_', ' ')}` : ''}.` }); break; }
      }
    } catch { setMessage({ tone: 'stop', text: 'The export stopped at its last saved chunk. Continue it to resume from there.' }); }
    finally { setBusy(null); }
  };
  const download = async (id: string) => {
    setBusy(id); setMessage(null);
    try {
      const job = await readOnce('data_export', { params: { id } });
      if (!job.manifest) throw new Error('not complete');
      const parts: string[] = [];
      for (const chunk of job.manifest.chunks) {
        const part = await readOnce('data_export_chunk', { params: { id }, query: { sequence: String(chunk.sequence) } });
        if (await sha256(part.content) !== chunk.sha256) throw new Error('digest');
        parts.push(part.content);
      }
      if (await sha256(job.manifest.chunks.map(c => c.sha256).join('\n')) !== job.manifest.digest) throw new Error('digest');
      const extension = job.kind === 'ROPA_VERSION_CSV' ? 'csv' : 'jsonl';
      for (const [name, body, type] of [[`orvia-export-${id}.${extension}`, parts.join(''), extension === 'csv' ? 'text/csv' : 'application/x-ndjson'], [`orvia-export-${id}.manifest.json`, JSON.stringify(job.manifest, null, 2), 'application/json']] as const) {
        const url = URL.createObjectURL(new Blob([body], { type })); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); URL.revokeObjectURL(url);
      }
      setMessage({ tone: 'ok', text: `Downloaded and checked every chunk against the manifest (digest ${job.manifest.digest.slice(0, 12)}).` });
    } catch { setMessage({ tone: 'stop', text: 'The download did not match its manifest or could not be completed; nothing was saved as complete.' }); }
    finally { setBusy(null); }
  };
  return (
    <Section title="Exports">
      <p className="cell-sub">Exports are written in bounded chunks under your own permissions and only you can see them. One is downloadable only once a recount proves it carries every matched row. Chunks are kept for seven days.</p>
      <WriteForm operation="create_data_export" label="Start an export" onSaved={j => { jobs.refresh(); void drive(j.id); }} describe={j => `Export started: ${j.expected_rows} row(s) to write`}
        build={f => kind === 'ROPA_VERSION_CSV' ? { kind: 'ROPA_VERSION_CSV', ropa_version_id: text(f, 'version'), audit_filter: null }
          : { kind: 'AUDIT_EVENTS_JSONL', ropa_version_id: null, audit_filter: { ...text(f, 'operation') ? { operation: text(f, 'operation') } : {}, ...text(f, 'from') ? { from: time(f, 'from') } : {}, ...text(f, 'to') ? { to: time(f, 'to') } : {} } }}>
        <Choice label="What to export" name="kind" value={kind} onChange={setKind}
          options={[{ value: 'ROPA_VERSION_CSV', label: 'A record-of-processing version (CSV)' }, ...hasCapability(capabilities, 'audit.export') ? [{ value: 'AUDIT_EVENTS_JSONL', label: 'Audit events (JSON lines)' }] : []]} />
        {kind === 'ROPA_VERSION_CSV' && <Choice label="Version" name="version" options={(versions.data?.items ?? []).map(v => ({ value: v.id, label: `Version ${v.version}${v.approved_by ? ' (approved)' : ''}` }))} />}
        {kind === 'AUDIT_EVENTS_JSONL' && <>
          <Input label="Operation" name="operation" required={false} maxLength={120} hint="Blank for every operation." />
          <Input label="From" name="from" type="datetime-local" required={false} />
          <Input label="To" name="to" type="datetime-local" required={false} />
        </>}
      </WriteForm>
      {message && <NoticeBox tone={message.tone} title={message.tone === 'ok' ? 'Done' : 'Not complete'}><p>{message.text}</p></NoticeBox>}
      <QueryBoundary query={jobs} label="exports" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Your exports" rows={d.items} rowKey={j => j.id}
              columns={[
                { key: 'kind', header: 'Export', cell: j => <span className="cell-primary">{j.kind === 'ROPA_VERSION_CSV' ? 'Record of processing' : 'Audit events'}<span className="cell-sub">as of {formatTime(j.as_of)}</span></span> },
                { key: 'progress', header: 'Progress', cell: j => `${j.rows_written} of ${j.expected_rows} rows · ${j.chunks} chunk(s)` },
                { key: 'state', header: 'State', cell: j => <Badge label={j.expired ? 'expired' : j.state.toLowerCase()} tone={j.state === 'COMPLETED' && !j.expired ? 'ok' : j.state === 'RUNNING' ? 'warn' : 'neutral'} /> },
                { key: 'act', header: '', cell: j => (
                  <span>
                    {j.state === 'RUNNING' && <button type="button" disabled={busy !== null} onClick={() => void drive(j.id)}>{busy === j.id ? 'Working…' : 'Continue'}</button>}
                    {j.state === 'RUNNING' && busy === null && <ActionButton operation="stop_data_export" label="Stop" input={undefined as never} params={{ id: j.id }} onDone={() => jobs.refresh()} />}
                    {j.state === 'COMPLETED' && !j.expired && <button type="button" disabled={busy !== null} onClick={() => void download(j.id)}>{busy === j.id ? 'Checking…' : 'Download'}</button>}
                  </span>
                ) },
              ]} />
            <Pagination query={jobs} />
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}
