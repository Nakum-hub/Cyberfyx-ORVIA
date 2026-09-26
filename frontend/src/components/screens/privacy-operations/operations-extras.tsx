'use client';
import { useState, type ChangeEvent } from 'react';
import { schemas } from '@orvia/contracts';
import { useCollection, useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { Choice, Input, WriteForm, localNow, nullable, text, time } from './registry-forms.tsx';
import { LEGAL_STATUS_LABELS } from './operations-labels.ts';

const LOCALES = schemas.RegistryNoticeVersionCreate.shape.locale.options;
/** One estate row, exactly as the append operation validates it. */
const EstateRow = schemas.BulkJobAppend.shape.rows.element;

// ---------------------------------------------------------------------------
// Rights execution: the DPDP case profile (deadline from the package in force at
// receipt) and the execution run across linked systems. Only a request that V1
// has moved into execution can run; the server refuses otherwise.
// ---------------------------------------------------------------------------
export function RightsExecution({ requestId }: { requestId: string }) {
  const profile = useQuery('case_profile', { params: { id: requestId } });
  const categories = useCollection('list_data_categories');
  const none = profile.failure?.status === 404;
  const categoryOptions = (categories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }));
  return (
    <Section title="DPDP execution">
      {none ? (
        <WriteForm operation="open_case_profile" label="Open DPDP case profile" params={{ id: requestId }} onSaved={() => profile.refresh()}
          describe={p => p.due_at ? `due ${formatTime(p.due_at)}` : p.due_basis} build={f => ({ subject_id: nullable(f, 'subject') })}>
          <Input label="Data Principal identifier" name="subject" required={false} maxLength={36} hint="The registry person this request concerns, if known." />
        </WriteForm>
      ) : (
        <QueryBoundary query={profile} label="case profile" isEmpty={() => false}>
          {p => (
            <>
              <p>
                Due {p.due_at ? formatTime(p.due_at) : 'not computed'} — {p.due_basis}.{' '}
                {LEGAL_STATUS_LABELS[p.legal_status] && <Badge label={LEGAL_STATUS_LABELS[p.legal_status]!.label} tone={LEGAL_STATUS_LABELS[p.legal_status]!.tone} meaning={LEGAL_STATUS_LABELS[p.legal_status]!.meaning} />}
                {p.overdue && <> <Badge label="Overdue" tone="stop" /></>}
              </p>
              {p.package?.distribution === 'TEST_FIXTURE' && <NoticeBox tone="warn" title="Test fixture package"><p>This deadline comes from a synthetic test package, not the official Rules.</p></NoticeBox>}
              {p.run_ids.length > 0 && <p>Runs: {p.run_ids.map(id => <a key={id} href={`/workspace/operations-runs/${id}`}>{shortId(id)} </a>)}</p>}
              <WriteForm operation="create_rights_run" label="Start execution across systems" onSaved={r => globalThis.location.assign(`/workspace/operations-runs/${r.id}`)}
                build={f => {
                  const corrections = [0, 1, 2].map(i => ({ field: text(f, `field${i}`), data_category_id: text(f, `category${i}`), value: text(f, `value${i}`) }));
                  for (const c of corrections) if ([c.field, c.data_category_id, c.value].some(Boolean) && ![c.field, c.data_category_id, c.value].every(Boolean)) throw new Error('A correction names the field, its data category and the corrected value.');
                  if (p.right_type === 'CORRECTION' && !corrections.some(c => c.field)) throw new Error('A correction request names the corrected values.');
                  return { rights_request_id: requestId, subject_id: text(f, 'subject') || p.subject_id || '', corrections: corrections.filter(c => c.field) };
                }}>
                <Input label="Data Principal identifier" name="subject" required={!p.subject_id} maxLength={36} defaultValue={p.subject_id ?? undefined} />
                {[0, 1, 2].map(i => (
                  <fieldset key={i} className="field">
                    <legend className="label">Correction {i + 1} (correction requests only)</legend>
                    <Input label={`Field ${i + 1}`} name={`field${i}`} required={false} maxLength={41} hint="e.g. email" />
                    <Choice label={`Data category ${i + 1}`} name={`category${i}`} required={false} placeholder="None" options={categoryOptions} />
                    <Input label={`Corrected value ${i + 1}`} name={`value${i}`} required={false} maxLength={500} />
                  </fieldset>
                ))}
              </WriteForm>
            </>
          )}
        </QueryBoundary>
      )}
    </Section>
  );
}

export function RightsCaseProfiles() {
  const list = usePagedQuery('list_case_profiles', { limit: 25 });
  return (
    <Section title="DPDP case deadlines">
      <Freshness query={list} />
      <QueryBoundary query={list} label="case profiles" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Rights cases with a DPDP profile" rows={d.items} rowKey={p => p.rights_request_id}
              columns={[
                { key: 'request', header: 'Request', cell: p => <a className="cell-primary" href={`/workspace/rights/${p.rights_request_id}`}>{shortId(p.rights_request_id)}<span className="cell-sub">{p.right_type.toLowerCase()}</span></a> },
                { key: 'due', header: 'Due', cell: p => p.due_at ? <>{formatTime(p.due_at)}{p.overdue && <> <Badge label="Overdue" tone="stop" /></>}</> : <Badge label="Not computed" tone="unknown" meaning={p.due_basis} /> },
                { key: 'status', header: 'Legal status', cell: p => LEGAL_STATUS_LABELS[p.legal_status]?.label ?? p.legal_status },
                { key: 'runs', header: 'Runs', cell: p => String(p.run_ids.length) },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Estate import: a job is created, rows are uploaded in chunks of up to 500
// from a JSON array or JSON Lines file, and applied from a checkpoint. Every row
// is validated against the contract before anything is sent; a file with any
// invalid row sends nothing.
// ---------------------------------------------------------------------------
type EstateRows = ReturnType<typeof EstateRow.parse>[];
export function EstateImportUpload({ onChanged }: { onChanged: () => void }) {
  const [job, setJob] = useState<string | null>(null);
  const [rows, setRows] = useState<EstateRows | null>(null);
  const [problems, setProblems] = useState<string[]>([]);
  const [progress, setProgress] = useState<string | null>(null);
  const append = useMutation('append_bulk_job_rows', true);
  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    setRows(null); setProblems([]); setProgress(null);
    const file = event.target.files?.[0]; if (!file) return;
    const content = await file.text();
    let raw: unknown[];
    try { raw = content.trimStart().startsWith('[') ? JSON.parse(content) as unknown[] : content.split(/\r?\n/).filter(l => l.trim()).map(l => JSON.parse(l) as unknown); }
    catch { setProblems(['The file is not a JSON array or JSON Lines.']); return; }
    const found: string[] = []; const valid: EstateRows = [];
    raw.forEach((row, i) => { const r = EstateRow.safeParse(row); if (r.success) valid.push(r.data); else if (found.length < 20) found.push(`Row ${i + 1}: ${r.error.issues.slice(0, 2).map(x => `${x.path.join('.') || 'row'} ${x.message}`).join('; ')}`); });
    if (found.length) { setProblems(found); return; }
    if (!valid.length) { setProblems(['The file has no rows.']); return; }
    setRows(valid);
  };
  const upload = async () => {
    if (!job || !rows) return;
    for (let first = 0; first < rows.length; first += 500) {
      setProgress(`Uploading rows ${first + 1}–${Math.min(first + 500, rows.length)} of ${rows.length}…`);
      append.newInteraction();
      if (!await append.run({ first_ordinal: first, rows: rows.slice(first, first + 500) }, { params: { id: job } })) { setProgress(`Stopped at row ${first + 1}; rows before it were received. Retry resumes from the same rows.`); return; }
    }
    setProgress(`All ${rows.length} rows received. Apply them from the job below.`); onChanged();
  };
  return (
    <Section title="Import an existing estate">
      <WriteForm operation="create_bulk_job" label="Create import job" onSaved={j => { setJob(j.id); onChanged(); }} describe={j => `job ${shortId(j.id)}; now choose the file`}
        build={f => ({ source_label: text(f, 'label'), mapping_version: text(f, 'mapping') })}>
        <Input label="Source" name="label" minLength={2} maxLength={120} hint="e.g. CRM export 2026-09" />
        <Input label="Mapping version" name="mapping" maxLength={40} defaultValue="v1" />
      </WriteForm>
      {job && (
        <div className="panel">
          <h3>Rows for job {shortId(job)}</h3>
          <label className="field"><span className="label">Estate file (JSON array or JSON Lines)</span>
            <input type="file" accept=".json,.jsonl,application/json" onChange={read} /></label>
          {problems.length > 0 && <NoticeBox tone="stop" title="Nothing was sent: the file has invalid rows"><ul>{problems.map(p => <li key={p}>{p}</li>)}</ul></NoticeBox>}
          {rows && <p>{rows.length} valid row(s) ready.</p>}
          <button type="button" className="primary" disabled={!rows || append.status === 'pending'} onClick={upload}>Upload rows</button>
          {progress && <p role="status">{progress}</p>}
          {append.failure && <FailureState failure={append.failure} />}
        </div>
      )}
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Notice history and delivery evidence.
// ---------------------------------------------------------------------------
export function NoticeHistory() {
  const notices = useCollection('list_registry_notices');
  const deliveries = usePagedQuery('list_notice_deliveries', { limit: 25 });
  const systems = useCollection('list_systems');
  const [ask, setAsk] = useState<{ id: string; as_of: string; locale: string } | null>(null);
  const answer = useQuery('notice_at_time', { params: { id: ask?.id ?? '' }, query: ask ? { as_of: ask.as_of, locale: ask.locale } : {}, enabled: Boolean(ask) });
  const versions = (notices.data?.items ?? []).flatMap(n => n.versions.filter(v => v.status !== 'DRAFT').map(v => ({ value: v.id, label: `${n.name} v${v.version} (${v.locale})` })));
  return (
    <>
      <Section title="Which version applied at a time">
        <form className="panel" aria-label="Which version applied" onSubmit={event => {
          event.preventDefault(); const f = new FormData(event.currentTarget);
          setAsk({ id: text(f, 'notice'), locale: text(f, 'locale'), as_of: time(f, 'at') });
        }}>
          <Choice label="Notice" name="notice" options={(notices.data?.items ?? []).map(n => ({ value: n.id, label: n.name }))} />
          <Choice label="Language" name="locale" defaultValue="en" options={LOCALES.map(l => ({ value: l, label: l }))} />
          <Input label="At" name="at" type="datetime-local" defaultValue={localNow()} />
          <button type="submit">Look up</button>
        </form>
        {ask && (
          <QueryBoundary query={answer} label="notice at that time" isEmpty={() => false}>
            {a => a.version ? <p role="status">Version {a.version.version} (“{a.version.title}”), in effect from {a.version.effective_from ? formatTime(a.version.effective_from) : '—'}. {a.reason}</p>
              : <p role="status">No version applied. {a.reason}</p>}
          </QueryBoundary>
        )}
      </Section>
      <Section title="Presentation and delivery evidence">
        <QueryBoundary query={deliveries} label="notice deliveries" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Notice deliveries" rows={d.items} rowKey={x => x.id}
                columns={[
                  { key: 'version', header: 'Version', cell: x => versions.find(v => v.value === x.notice_version_id)?.label ?? shortId(x.notice_version_id) },
                  { key: 'to', header: 'To', cell: x => x.subject_id ? `person ${shortId(x.subject_id)}` : x.population_reference },
                  { key: 'channel', header: 'Channel', cell: x => x.channel },
                  { key: 'at', header: 'Presented', cell: x => formatTime(x.presented_at) },
                  { key: 'result', header: 'Result', cell: x => x.result === 'FAILED' ? <Badge label="Failed" tone="stop" /> : x.result === 'UNKNOWN' ? <Badge label="Unknown" tone="unknown" /> : x.result.toLowerCase() },
                  { key: 'source', header: 'Source', cell: x => x.source_reference },
                ]} />
              <Pagination query={deliveries} />
            </>
          )}
        </QueryBoundary>
        <WriteForm operation="record_notice_delivery" label="Record a delivery" onSaved={() => deliveries.refresh()} describe={x => x.result.toLowerCase()}
          build={f => {
            const subject = nullable(f, 'subject'); const population = nullable(f, 'population');
            if ((subject === null) === (population === null)) throw new Error('Delivery evidence is about one person or one named population.');
            return { notice_version_id: text(f, 'version'), subject_id: subject, relationship_id: null, population_reference: population, channel: text(f, 'channel'), presented_at: time(f, 'at'),
              source_system_id: nullable(f, 'system'), source_reference: text(f, 'source'), evidence_reference: nullable(f, 'evidence'), result: text(f, 'result') as 'PRESENTED' };
          }}>
          <Choice label="Notice version" name="version" options={versions} />
          <Input label="Data Principal identifier" name="subject" required={false} maxLength={36} />
          <Input label="Population" name="population" required={false} maxLength={500} hint="Instead of one person, e.g. all web sign-ups in September." />
          <Input label="Channel" name="channel" maxLength={60} />
          <Input label="Presented at" name="at" type="datetime-local" defaultValue={localNow()} />
          <Choice label="Source system" name="system" required={false} placeholder="None" options={(systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }))} />
          <Input label="Source reference" name="source" minLength={3} maxLength={500} />
          <Input label="Evidence reference" name="evidence" required={false} maxLength={500} />
          <Choice label="Result" name="result" options={['PRESENTED', 'DELIVERED', 'FAILED', 'UNKNOWN'].map(r => ({ value: r, label: r.toLowerCase() }))} />
        </WriteForm>
      </Section>
    </>
  );
}

// ---------------------------------------------------------------------------
// Regulatory package import and applicability exemptions.
// ---------------------------------------------------------------------------
export function PackageImport({ onSaved }: { onSaved: () => void }) {
  const [signed, setSigned] = useState<unknown>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const read = async (event: ChangeEvent<HTMLInputElement>) => {
    setSigned(null); setProblem(null);
    const file = event.target.files?.[0]; if (!file) return;
    try { const parsed = JSON.parse(await file.text()) as { package?: unknown }; setSigned(parsed.package ?? parsed); }
    catch { setProblem('The file is not JSON.'); }
  };
  return (
    <Section title="Import a signed package">
      <WriteForm operation="import_regulatory_package" label="Import package" onSaved={onSaved}
        describe={p => `version ${p.version} imported; a second super admin must approve it before it takes effect`}
        build={() => { if (!signed) throw new Error(problem ?? 'Choose the signed package file.'); return { package: signed as never }; }}>
        <label className="field"><span className="label">Signed package file</span><input type="file" accept=".json,application/json" onChange={read} /></label>
        <p className="cell-sub">The signature and origin are verified by the server. Nothing takes effect until a different super admin approves it.</p>
      </WriteForm>
    </Section>
  );
}

export function ApplicabilityOverride({ decisions, onSaved }: { decisions: { id: string; requirement_id: string; result: string; scope_kind: string }[]; onSaved: () => void }) {
  return (
    <Section title="Record an exemption">
      <WriteForm operation="override_applicability" label="Record exemption" onSaved={onSaved}
        describe={() => 'recorded as exempt with its basis; the original decision is kept'}
        build={f => ({ decision_id: text(f, 'decision'), basis: text(f, 'basis') })}>
        <Choice label="Decision" name="decision" options={decisions.filter(d => d.result !== 'EXEMPT_WITH_RECORDED_BASIS').map(d => ({ value: d.id, label: `${d.requirement_id} (${d.scope_kind.toLowerCase()}): ${d.result.replaceAll('_', ' ').toLowerCase()}` }))} />
        <Input label="Basis" name="basis" minLength={10} maxLength={500} hint="The exemption and its authority. This is a recorded decision, not legal advice." />
      </WriteForm>
    </Section>
  );
}

// ---------------------------------------------------------------------------
// Evidence records and operational events.
// ---------------------------------------------------------------------------
export function OperationsEvidence() {
  const [filter, setFilter] = useState<Record<string, string>>({});
  const evidence = usePagedQuery('list_evidence_records', { limit: 25, query: filter });
  const events = usePagedQuery('list_operational_events', { limit: 25 });
  return (
    <>
      <PageHead eyebrow="DPDP operations" title="Evidence and events"
        lede="Append-only evidence records, with a content digest where ORVIA controls the bytes, and the operational events that drove the workflows." />
      <form className="inline-form" aria-label="Filter evidence" onSubmit={event => {
        event.preventDefault(); const f = new FormData(event.currentTarget);
        setFilter({ ...(text(f, 'requirement') ? { requirement_id: text(f, 'requirement') } : {}), ...(text(f, 'entity') ? { entity_id: text(f, 'entity') } : {}) });
      }}>
        <Input label="Requirement" name="requirement" required={false} maxLength={64} hint="e.g. DPDP-CONSENT-VALIDITY" />
        <Input label="Record identifier" name="entity" required={false} maxLength={36} />
        <button type="submit">Filter</button>
      </form>
      <Section title="Evidence records">
        <Freshness query={evidence} />
        <QueryBoundary query={evidence} label="evidence records" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Evidence records" rows={d.items} rowKey={e => e.id}
                columns={[
                  { key: 'what', header: 'About', cell: e => <span className="cell-primary">{e.entity_kind.replaceAll('_', ' ')} {shortId(e.entity_id)}<span className="cell-sub">{e.method}</span></span> },
                  { key: 'origin', header: 'Origin', cell: e => <>{e.origin.toLowerCase()}{e.fixture && <> <Badge label="Test fixture" tone="warn" /></>}</> },
                  { key: 'integrity', header: 'Integrity', cell: e => e.content_digest ? <span className="mono">{e.content_digest.slice(0, 16)}…</span> : 'No controlled bytes' },
                  { key: 'req', header: 'Requirements', cell: e => e.requirement_ids.join(', ') || '—' },
                  { key: 'at', header: 'Recorded', cell: e => formatTime(e.recorded_at) },
                ]} />
              <Pagination query={evidence} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Operational events">
        <QueryBoundary query={events} label="operational events" isEmpty={d => !d.items.length}>
          {d => (
            <>
              <DataTable caption="Operational events" rows={d.items} rowKey={e => e.id}
                columns={[
                  { key: 'type', header: 'Event', cell: e => e.event_type.replaceAll('_', ' ') },
                  { key: 'subject', header: 'About', cell: e => `${e.subject_kind.replaceAll('_', ' ')} ${e.subject_id ? shortId(e.subject_id) : ''}` },
                  { key: 'at', header: 'Occurred', cell: e => formatTime(e.occurred_at) },
                ]} />
              <Pagination query={events} />
            </>
          )}
        </QueryBoundary>
      </Section>
    </>
  );
}
