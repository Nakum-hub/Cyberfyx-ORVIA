'use client';
import { use, useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { DataTable, Facts, NoticeBox, SelectField, TextAreaField, TextField } from '../../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, saveFile, fromBase64, VENDOR_ROLE_LABELS, type VendorSession } from '../../../../components/vendor/vendor.tsx';

type Engagement = { id: string; organisation_name: string; reference: string; state: string; period_from: string; period_to: string; scope_requirement_ids: string[]; on_team: boolean;
  team: { user_id: string; name: string; role: string; engagement_role: string }[]; processing_agreement: { recorded: boolean; reference: string | null; recorded_at: string | null };
  independence: { declared: boolean; statement: string | null; conflict_check: string | null; conflict_note: string | null; declared_at: string | null }; empanelment_reference: string | null; retention_days: number; closed_at: string | null; purged_at: string | null };
type Pkg = { id: string; client_package_id: string; uploaded_at: string; file_sha256: string; manifest_fingerprint: string; expires_at: string; contains_personal_data: boolean; state: string; quarantine_reason: string | null; scan_engine: string; item_count?: number };
type Item = { item_id: string; requirement_id: string; kind: string; title: string; file_name: string | null; media_type: string; size_bytes: number; sha256: string; contains_personal_data: boolean; content_available: boolean;
  reviews: { id: string; decision: string; note: string; sampling: string | null; reviewed_at: string }[] };
type Row = { requirement_id: string; expected_evidence: string[]; received_items: number; accepted_items: number; rejected_items: number; more_requested: number; result: string | null; rationale: string | null };
type Finding = { id: string; requirement_id: string; provision_ids: string[]; severity: string; title: string; observation: string; recommendation: string; due_date: string; status: string; events: { id: string; event: string; note: string; recorded_at: string }[] };
type Report = { id: string; version: number; state: string; opinion_as_of: string; method: string; opinion: string; limitations: string[]; drafted_by: string; approved_by: string | null; pdf_sha256: string | null };

function useAction(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const run = useCallback(async (work: () => Promise<unknown>) => { setBusy(true); setError(null); try { await work(); await reload(); } catch (e) { setError(explain(e)); } finally { setBusy(false); } }, [reload]);
  return { busy, error, run };
}
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section className="section" aria-label={title}><div className="section-head"><h3>{title}</h3></div>{children}</section>;

function Detail({ id, session }: { id: string; session: VendorSession }) {
  const [e, setE] = useState<Engagement | null>(null); const [inbox, setInbox] = useState<{ packages: Pkg[]; refusals: { id: string; reasons: string[]; refused_at: string }[] } | null>(null);
  const [rows, setRows] = useState<Row[]>([]); const [findings, setFindings] = useState<Finding[]>([]); const [requests, setRequests] = useState<{ id: string; requirement_id: string; description: string; due_date: string }[]>([]);
  const [reports, setReports] = useState<Report[]>([]); const [log, setLog] = useState<{ id: string; action: string; recorded_at: string; item_id: string | null }[]>([]);
  const [open, setOpen] = useState<{ pkg: Pkg; items: Item[] } | null>(null); const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => {
    try {
      const eng = await vendorCall<Engagement>(`/engagements/${id}`); setE(eng);
      if (eng.on_team) {
        const [i, c, f, r, l] = await Promise.all([vendorCall<typeof inbox>(`/engagements/${id}/inbox`), vendorCall<{ rows: Row[] }>(`/engagements/${id}/checklist`), vendorCall<{ items: Finding[]; requests: typeof requests }>(`/engagements/${id}/findings`),
          vendorCall<{ items: Report[] }>(`/engagements/${id}/reports`), vendorCall<{ items: typeof log }>(`/engagements/${id}/access-log`)]);
        setInbox(i); setRows(c.rows); setFindings(f.items); setRequests(f.requests); setReports(r.items); setLog(l.items);
      }
    } catch (err) { setLoadError(explain(err)); }
  }, [id]);
  useEffect(() => { void load(); }, [load]);
  const { busy, error, run } = useAction(load);
  const [team, setTeam] = useState({ user_id: '', engagement_role: '' }); const [members, setMembers] = useState<{ user_id: string; name: string; role: string; active: boolean }[]>([]);
  useEffect(() => { if (can(session, 'vendor.team.read')) vendorCall<{ members: typeof members }>('/team').then(r => setMembers(r.members.filter(m => m.active))).catch(() => {}); }, [session]);
  const [ind, setInd] = useState({ statement: '', conflict: 'NO_CONFLICT', note: '', empanelment: '' }); const [pa, setPa] = useState('');
  const [review, setReview] = useState({ item_id: '', decision: '', note: '', sampling: '' }); const [result, setResult] = useState({ requirement_id: '', result: '', rationale: '' });
  const [finding, setFinding] = useState({ requirement_id: '', provision_ids: '', severity: '', title: '', observation: '', recommendation: '', due_date: '' });
  const [request, setRequest] = useState({ requirement_id: '', description: '', due_date: '' }); const [event, setEvent] = useState({ finding_id: '', event: '', note: '' });
  const [draft, setDraft] = useState({ opinion_as_of: new Date().toISOString().slice(0, 10), method: '', opinion: '', limitations: '' });
  if (!e) return loadError ? <NoticeBox tone="stop" title="Engagement unavailable"><p>{loadError}</p></NoticeBox> : <p role="status">Loading…</p>;
  const isLead = e.team.some(t => t.user_id === session.actor_id && t.engagement_role === 'LEAD'); const isReviewer = e.team.some(t => t.user_id === session.actor_id && t.engagement_role === 'REVIEWER');
  const scope = e.scope_requirement_ids.map(r => ({ value: r, label: r }));
  const openPackage = (p: Pkg) => run(async () => { const d = await vendorCall<{ items: Item[] } & Pkg>(`/packages/${p.id}`); setOpen({ pkg: p, items: d.items }); });
  const download = (p: Pkg, i: Item) => run(async () => { const c = await vendorCall<{ content_base64: string; media_type: string; file_name: string | null }>(`/packages/${p.id}/content?item=${i.item_id}`); saveFile(c.file_name ?? `${i.item_id}.${i.kind === 'INDICATOR' ? 'json' : 'txt'}`, fromBase64(c.content_base64), c.media_type); });
  const exportSigned = (path: string) => run(async () => { const r = await vendorCall<{ file_name: string; signed: unknown }>(path, {}); saveFile(r.file_name, JSON.stringify(r.signed, null, 2), 'application/json'); });
  return <>
    <div className="page-head"><p className="eyebrow"><a href="/vendor/engagements">Engagements</a></p><h2>{e.reference} — {e.organisation_name}</h2><p>DPDPA audit, period {e.period_from} to {e.period_to}. State: {e.state}.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    <Block title="Engagement">
      <Facts items={[{ term: 'Requirements in scope', value: e.scope_requirement_ids.join(', ') },
        { term: 'Processing agreement', value: e.processing_agreement.recorded ? `Recorded: ${e.processing_agreement.reference}` : 'Not recorded — packages containing personal data stay quarantined' },
        { term: 'Independence', value: e.independence.declared ? `${e.independence.statement} (${e.independence.conflict_check?.replaceAll('_', ' ')}${e.independence.conflict_note ? `: ${e.independence.conflict_note}` : ''})` : 'Not yet declared' },
        { term: 'Board empanelment reference', value: e.empanelment_reference ?? 'None entered — no empanelment is claimed' },
        { term: 'Evidence retention', value: `${e.retention_days} days after closure${e.purged_at ? `; purged ${e.purged_at.slice(0, 10)}` : ''}` }]} />
      <DataTable caption="Engagement team" rowKey={t => t.user_id} rows={e.team} columns={[{ key: 'n', header: 'Name', cell: t => t.name }, { key: 'r', header: 'Vendor role', cell: t => VENDOR_ROLE_LABELS[t.role] ?? t.role }, { key: 'e', header: 'On this engagement', cell: t => t.engagement_role }]} />
      {can(session, 'engagements.manage') && e.state !== 'CLOSED' && <>
        <form className="panel" aria-label="Add team member" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/team`, team)); }}>
          <SelectField label="Member" value={team.user_id} onChange={v => setTeam(t => ({ ...t, user_id: v }))} options={members.filter(m => ['LEAD_AUDITOR', 'AUDITOR', 'AUDIT_REVIEWER'].includes(m.role)).map(m => ({ value: m.user_id, label: `${m.name} (${VENDOR_ROLE_LABELS[m.role]})` }))} required />
          <SelectField label="Engagement role" value={team.engagement_role} onChange={v => setTeam(t => ({ ...t, engagement_role: v }))} options={[{ value: 'LEAD', label: 'Lead' }, { value: 'AUDITOR', label: 'Auditor' }, { value: 'REVIEWER', label: 'Reviewer' }]} required />
          <button type="submit" disabled={busy}>Add to team</button></form>
        {!e.processing_agreement.recorded && <form className="panel" aria-label="Record processing agreement" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/processing-agreement`, { reference: pa })); }}>
          <TextField label="Processing agreement reference" value={pa} onChange={setPa} required hint="Record only when a signed processing agreement with the client exists (the vendor acts as the client's Data Processor)." />
          <button type="submit" disabled={busy}>Record processing agreement</button></form>}
        <button type="button" className="danger" disabled={busy} onClick={() => void run(() => vendorCall(`/engagements/${id}/close`, {}))}>Close engagement</button></>}
      {isLead && !e.independence.declared && <form className="panel" aria-label="Declare independence" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/independence`, { statement: ind.statement, conflict_check: ind.conflict, conflict_note: ind.note.trim() || null, empanelment_reference: ind.empanelment.trim() || null })); }}>
        <TextAreaField label="Independence statement" value={ind.statement} onChange={v => setInd(x => ({ ...x, statement: v }))} required />
        <SelectField label="Conflict check" value={ind.conflict} onChange={v => setInd(x => ({ ...x, conflict: v }))} options={[{ value: 'NO_CONFLICT', label: 'No conflict' }, { value: 'CONFLICT_MITIGATED', label: 'Conflict identified and mitigated' }]} required />
        <TextField label="Conflict note" value={ind.note} onChange={v => setInd(x => ({ ...x, note: v }))} />
        <TextField label="Board empanelment reference (optional)" value={ind.empanelment} onChange={v => setInd(x => ({ ...x, empanelment: v }))} hint="Only if the auditor is empanelled by the Data Protection Board (Rule 13 audits). Never entered means never claimed." />
        <button type="submit" disabled={busy}>Declare independence</button></form>}
    </Block>
    {!e.on_team ? <NoticeBox tone="info" title="Evidence is for the engagement team only"><p>You are not on this engagement&apos;s team, so its evidence, findings and reports are not shown.</p></NoticeBox> : <>
      <ChannelBlock id={id} scope={e.scope_requirement_ids} closed={e.state === 'CLOSED'} />
      <Block title="Evidence inbox">
        <p className="muted">Each upload was verified before storage: manifest fingerprint, per-item SHA-256 and size, file type by content, expiry, engagement and scope, and a malware screen. Files are encrypted at rest with a key per package; every view and download is logged.</p>
        <DataTable caption="Received packages" rowKey={p => p.id} rows={inbox?.packages ?? []} columns={[{ key: 'u', header: 'Received', cell: p => p.uploaded_at.slice(0, 16).replace('T', ' ') },
          { key: 's', header: 'State', cell: p => p.state + (p.quarantine_reason ? ` (${p.quarantine_reason.replaceAll('_', ' ').toLowerCase()})` : '') }, { key: 'n', header: 'Items', cell: p => p.item_count ?? '—' },
          { key: 'f', header: 'Manifest fingerprint', cell: p => <code>{p.manifest_fingerprint.slice(0, 16)}…</code> }, { key: 'o', header: '', cell: p => <button type="button" disabled={busy} onClick={() => void openPackage(p)}>Open</button> }]} />
        {(inbox?.refusals.length ?? 0) > 0 && <DataTable caption="Refused uploads (no content kept)" rowKey={r => r.id} rows={inbox!.refusals} columns={[{ key: 't', header: 'When', cell: r => r.refused_at.slice(0, 16).replace('T', ' ') }, { key: 'r', header: 'Reasons', cell: r => r.reasons.join(', ') }]} />}
        {open && <div className="panel"><h4>Package {open.pkg.client_package_id.slice(0, 8)} — {open.pkg.state}</h4>
          <DataTable caption="Items" rowKey={i => i.item_id} rows={open.items} columns={[{ key: 'r', header: 'Requirement', cell: i => i.requirement_id }, { key: 't', header: 'Item', cell: i => `${i.title} (${i.kind.toLowerCase()})` },
            { key: 'p', header: 'Personal data', cell: i => i.contains_personal_data ? 'Yes (approved exception)' : 'No' }, { key: 'v', header: 'Reviews', cell: i => i.reviews.map(r => r.decision).join(', ') || '—' },
            { key: 'd', header: '', cell: i => i.content_available ? <button type="button" disabled={busy} onClick={() => void download(open.pkg, i)}>Download</button> : 'Not available' }]} />
          {open.pkg.state === 'ACCEPTED' && <form aria-label="Review item" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(async () => { const d = await vendorCall<{ items: Item[] }>(`/packages/${open.pkg.id}/reviews`, { item_id: review.item_id, decision: review.decision, note: review.note, sampling: review.sampling.trim() || null }); setOpen({ pkg: open.pkg, items: d.items }); setReview({ item_id: '', decision: '', note: '', sampling: '' }); }); }}>
            <SelectField label="Item to review" value={review.item_id} onChange={v => setReview(r => ({ ...r, item_id: v }))} options={open.items.map(i => ({ value: i.item_id, label: `${i.requirement_id} — ${i.title}` }))} required />
            <SelectField label="Decision" value={review.decision} onChange={v => setReview(r => ({ ...r, decision: v }))} options={[{ value: 'ACCEPT', label: 'Accept' }, { value: 'REJECT', label: 'Reject' }, { value: 'REQUEST_MORE', label: 'Request more' }]} required />
            <TextField label="Review note" value={review.note} onChange={v => setReview(r => ({ ...r, note: v }))} required />
            <TextField label="Sampling record" value={review.sampling} onChange={v => setReview(r => ({ ...r, sampling: v }))} />
            <button type="submit" disabled={busy}>Record review</button></form>}</div>}
      </Block>
      <Block title="DPDPA checklist">
        <DataTable caption="Expected versus received evidence per requirement" rowKey={r => r.requirement_id} rows={rows} columns={[{ key: 'r', header: 'Requirement', cell: r => r.requirement_id },
          { key: 'e', header: 'Expected evidence', cell: r => r.expected_evidence.join('; ') }, { key: 'n', header: 'Received / accepted / rejected / more', cell: r => `${r.received_items} / ${r.accepted_items} / ${r.rejected_items} / ${r.more_requested}` },
          { key: 's', header: 'Result', cell: r => r.result ? `${r.result.replaceAll('_', ' ')} — ${r.rationale}` : 'Not recorded' }]} />
        {e.state !== 'CLOSED' && <form className="panel" aria-label="Record requirement result" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/results`, result)); }}>
          <SelectField label="Requirement" value={result.requirement_id} onChange={v => setResult(r => ({ ...r, requirement_id: v }))} options={scope} required />
          <SelectField label="Result" value={result.result} onChange={v => setResult(r => ({ ...r, result: v }))} options={['MEETS', 'PARTIALLY_MEETS', 'DOES_NOT_MEET', 'NOT_APPLICABLE', 'NOT_TESTED'].map(v => ({ value: v, label: v.replaceAll('_', ' ') }))} required />
          <TextField label="Rationale" value={result.rationale} onChange={v => setResult(r => ({ ...r, rationale: v }))} required />
          <button type="submit" disabled={busy}>Record result</button></form>}
      </Block>
      <Block title="Requests and findings">
        <DataTable caption="Requests to the client" rowKey={r => r.id} rows={requests} columns={[{ key: 'r', header: 'Requirement', cell: r => r.requirement_id }, { key: 'd', header: 'Request', cell: r => r.description }, { key: 'u', header: 'Due', cell: r => r.due_date }]} />
        <form className="panel" aria-label="Add request" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/requests`, request)); }}>
          <SelectField label="Request for requirement" value={request.requirement_id} onChange={v => setRequest(r => ({ ...r, requirement_id: v }))} options={scope} required />
          <TextField label="What is requested" value={request.description} onChange={v => setRequest(r => ({ ...r, description: v }))} required />
          <TextField label="Request due (YYYY-MM-DD)" value={request.due_date} onChange={v => setRequest(r => ({ ...r, due_date: v }))} required />
          <button type="submit" disabled={busy}>Add request</button>
          <button type="button" disabled={busy || !requests.length} onClick={() => void exportSigned(`/engagements/${id}/requests/export`)}>Export signed request list</button></form>
        <DataTable caption="Findings" rowKey={f => f.id} rows={findings} columns={[{ key: 's', header: 'Severity', cell: f => f.severity }, { key: 'r', header: 'Requirement', cell: f => `${f.requirement_id} (${f.provision_ids.join(', ') || 'no provision cited'})` },
          { key: 't', header: 'Finding', cell: f => <><strong>{f.title}</strong><br />{f.observation}<br /><em>Recommendation:</em> {f.recommendation}</> }, { key: 'd', header: 'Due', cell: f => f.due_date },
          { key: 'u', header: 'Status', cell: f => `${f.status.replaceAll('_', ' ')}${f.events.length ? ` (${f.events.length} event${f.events.length > 1 ? 's' : ''})` : ''}` }]} />
        <form className="panel" aria-label="Raise finding" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/findings`, { ...finding, provision_ids: finding.provision_ids.split(/[\s,]+/).filter(Boolean) })); }}>
          <SelectField label="Finding requirement" value={finding.requirement_id} onChange={v => setFinding(f => ({ ...f, requirement_id: v }))} options={scope} required />
          <TextField label="Provisions cited" value={finding.provision_ids} onChange={v => setFinding(f => ({ ...f, provision_ids: v }))} hint="Provision IDs of this requirement, e.g. ACT-S5(1)" />
          <SelectField label="Severity" value={finding.severity} onChange={v => setFinding(f => ({ ...f, severity: v }))} options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(v => ({ value: v, label: v }))} required />
          <TextField label="Finding title" value={finding.title} onChange={v => setFinding(f => ({ ...f, title: v }))} required />
          <TextAreaField label="Observation" value={finding.observation} onChange={v => setFinding(f => ({ ...f, observation: v }))} required />
          <TextAreaField label="Recommendation" value={finding.recommendation} onChange={v => setFinding(f => ({ ...f, recommendation: v }))} required />
          <TextField label="Finding due (YYYY-MM-DD)" value={finding.due_date} onChange={v => setFinding(f => ({ ...f, due_date: v }))} required />
          <button type="submit" disabled={busy}>Raise finding</button>
          <button type="button" disabled={busy || !findings.length} onClick={() => void exportSigned(`/engagements/${id}/findings/export`)}>Export signed findings file</button></form>
        {findings.length > 0 && <form className="panel" aria-label="Record finding event" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/findings/${event.finding_id}/events`, { event: event.event, note: event.note })); }}>
          <SelectField label="Finding" value={event.finding_id} onChange={v => setEvent(x => ({ ...x, finding_id: v }))} options={findings.map(f => ({ value: f.id, label: f.title }))} required />
          <SelectField label="Event" value={event.event} onChange={v => setEvent(x => ({ ...x, event: v }))} options={[{ value: 'CLIENT_RESPONSE', label: 'Client response received' }, { value: 'RETEST_PASSED', label: 'Re-test passed' }, { value: 'RETEST_FAILED', label: 'Re-test failed' }, { value: 'CLOSED', label: 'Close (after a passed re-test)' }]} required />
          <TextField label="Event note" value={event.note} onChange={v => setEvent(x => ({ ...x, note: v }))} required />
          <button type="submit" disabled={busy}>Record event</button></form>}
      </Block>
      <Block title="Report">
        <p className="muted">The lead auditor drafts; the engagement&apos;s audit reviewer, a different person, approves; then it is signed with the vendor audit key and issued as a PDF with signed JSON. Certification wording is refused.</p>
        <DataTable caption="Report versions" rowKey={r => r.id} rows={reports} columns={[{ key: 'v', header: 'Version', cell: r => r.version }, { key: 's', header: 'State', cell: r => r.state }, { key: 'a', header: 'Opinion as of', cell: r => r.opinion_as_of },
          { key: 'x', header: 'Actions', cell: r => <span className="row">
            {r.state === 'DRAFT' && isReviewer && <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/reports/${r.id}/approve`, {}))}>Approve as reviewer</button>}
            {r.state === 'APPROVED' && <button type="button" disabled={busy} onClick={() => void run(async () => { const s = await vendorCall<{ file_name: string; signed: unknown }>(`/reports/${r.id}/sign`, {}); saveFile(s.file_name, JSON.stringify(s.signed, null, 2), 'application/json'); })}>Sign and download JSON</button>}
            {r.state === 'SIGNED' && <button type="button" disabled={busy} onClick={() => void run(async () => { const p = await vendorCall<{ file_name: string; pdf_base64: string }>(`/reports/${r.id}/pdf`); saveFile(p.file_name, fromBase64(p.pdf_base64), 'application/pdf'); })}>Download PDF</button>}</span> }]} />
        {isLead && e.state !== 'CLOSED' && <form className="panel" aria-label="Draft report" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/reports`, { opinion_as_of: draft.opinion_as_of, method: draft.method, opinion: draft.opinion, limitations: draft.limitations.split('\n').map(s => s.trim()).filter(Boolean) })); }}>
          <TextField label="Opinion as of (YYYY-MM-DD)" value={draft.opinion_as_of} onChange={v => setDraft(d => ({ ...d, opinion_as_of: v }))} required />
          <TextAreaField label="Method" value={draft.method} onChange={v => setDraft(d => ({ ...d, method: v }))} required />
          <TextAreaField label="Opinion" value={draft.opinion} onChange={v => setDraft(d => ({ ...d, opinion: v }))} required />
          <TextAreaField label="Limitations (one per line)" value={draft.limitations} onChange={v => setDraft(d => ({ ...d, limitations: v }))} required />
          <button type="submit" disabled={busy}>Save draft report</button></form>}
      </Block>
      <Block title="Evidence access log">
        <DataTable caption="Every view and download" rowKey={l => l.id} rows={log.slice(0, 50)} columns={[{ key: 't', header: 'When', cell: l => l.recorded_at.slice(0, 19).replace('T', ' ') }, { key: 'a', header: 'Action', cell: l => l.action.replaceAll('_', ' ').toLowerCase() }]} />
      </Block>
    </>}
  </>;
}
type Channel = { available: boolean; health: { installation_key_id: string | null; pinned_at: string | null; last_check_in_at: string | null; check_ins: number; chain_state: string; chain_problem: string | null; next_sequence: number } | null;
  mandate: { mandate_id: string; kind: string; state: string; valid_from: string; valid_to: string; open: boolean; received_at: string; document: { categories: string[]; scope_requirement_ids: string[]; schedule: string; organisation_name: string; approval: { preparer_role: string; approver_role: string; approved_at: string } } } | null;
  requests: { id: string; kind: string; requirement_id: string | null; categories: string[]; population: string | null; sample_size: number | null; description: string; due_date: string; status: string; status_reason: string | null; delivery_id: string | null; package_id: string | null; overdue: boolean }[];
  deliveries: { delivery_id: string; sequence: number; kind: string; request_id: string | null; generated_at: string | null; period_from: string | null; period_to: string | null; entries: number; outcome: string; reasons: string[]; received_at: string; purged: boolean }[];
  events: { kind: string; outcome: string; recorded_at: string }[] };
type Entry = { category: string; requirement_id: string | null; key: string; label: string; value: string | number | boolean | null; unit: string; basis: string; detail: Record<string, string | number | boolean | null> | null };
const CATEGORIES = ['INDICATORS', 'CONTROL_STANDING', 'CONTROL_TESTS', 'NOTICE_VERSIONS', 'POLICY_VERSIONS', 'ACTIVITY_LOG_DIGEST'];
const POPULATIONS: Record<string, string> = { CONSENT_EVENTS_WITH_EVIDENCE: 'Consent events — evidence available', BREACH_TASKS_WITHIN_TIMER: 'Breach intimation tasks — completed within the timer',
  GRIEVANCES_RESOLVED_WITHIN_90_DAYS: 'Grievances — closed within 90 days', WITHDRAWAL_RUNS_VERIFIED: 'Withdrawal propagation runs — independently verified' };
/**
 * Evidence from the client's mandate (revision 1.6): what the client authorised,
 * whether its installation is checking in and the delivery chain is intact, every
 * delivery ORVIA generated there and signed, and the requests the team issues.
 * Samples are drawn by the server's seed, so neither side chooses the records.
 */
function ChannelBlock({ id, scope, closed }: { id: string; scope: string[]; closed: boolean }) {
  const [ch, setCh] = useState<Channel | null>(null); const [entries, setEntries] = useState<{ id: string; list: Entry[]; limits: string[] } | null>(null); const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setCh(await vendorCall<Channel>(`/engagements/${id}/channel`)); } catch (err) { setLoadError(explain(err)); } }, [id]);
  useEffect(() => { void load(); }, [load]);
  const { busy, error, run } = useAction(load);
  const [r, setR] = useState({ kind: 'COLLECT_NOW', requirement_id: '', categories: ['INDICATORS'] as string[], population: 'CONSENT_EVENTS_WITH_EVIDENCE', sample_size: '25', description: '', due_date: new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10) });
  if (!ch) return loadError ? <NoticeBox tone="stop" title="Channel unavailable"><p>{loadError}</p></NoticeBox> : <p role="status">Reading the audit channel…</p>;
  if (!ch.available) return <Block title="Client mandate and evidence"><p className="muted">This engagement was created before the audit channel existed; evidence arrives only as uploaded files.</p></Block>;
  const h = ch.health!; const m = ch.mandate;
  const show = (deliveryId: string) => run(async () => { const d = await vendorCall<{ document: { entries: Entry[]; limits: string[] } | null }>(`/channel-deliveries/${deliveryId}`); setEntries({ id: deliveryId, list: d.document?.entries ?? [], limits: d.document?.limits ?? ['Content purged under the retention period; digest and receipt remain.'] }); });
  return <Block title="Client mandate and evidence">
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    <Facts items={[
      { term: 'Mandate', value: m ? `${m.state.toLowerCase()}${m.open ? ' (open)' : ''} · ${m.kind === 'CONTINUOUS_ASSURANCE' ? 'continuous assurance' : 'engagement'} · ${m.valid_from.slice(0, 10)} to ${m.valid_to.slice(0, 10)}` : 'Not yet received — the client drafts and approves it in their ORVIA' },
      ...(m ? [{ term: 'Authorised by the client', value: `${m.document.approval.preparer_role.replaceAll('_', ' ').toLowerCase()} prepared, ${m.document.approval.approver_role.replaceAll('_', ' ').toLowerCase()} approved on ${m.document.approval.approved_at.slice(0, 10)}` },
        { term: 'Evidence authorised', value: `${m.document.categories.map(c => c.replaceAll('_', ' ').toLowerCase()).join(', ')} · ${m.document.schedule.toLowerCase()} · ${m.document.scope_requirement_ids.join(', ')}` }] : []),
      { term: 'Client installation key', value: h.installation_key_id ? `${h.installation_key_id} (pinned ${h.pinned_at?.slice(0, 10)})` : 'Not yet pinned — no check-in so far' },
      { term: 'Last check-in', value: h.last_check_in_at ? `${h.last_check_in_at.slice(0, 16).replace('T', ' ')} UTC (${h.check_ins} in total)` : 'Never' },
      { term: 'Evidence chain', value: h.chain_state === 'BROKEN' ? `BROKEN — ${h.chain_problem}. Deliveries after the break are kept; treat the gap as a limitation.` : h.chain_state === 'INTACT' ? `Intact through delivery ${h.next_sequence - 1}` : 'No delivery yet' }]} />
    <h4>Requests to the client</h4>
    <DataTable caption="Requests issued over the channel" rowKey={x => x.id} rows={ch.requests} columns={[
      { key: 'k', header: 'Request', cell: x => <span className="cell-primary">{x.kind.replaceAll('_', ' ').toLowerCase()}{x.requirement_id ? ` · ${x.requirement_id}` : ''}<span className="cell-sub">{x.description}{x.population ? ` — ${POPULATIONS[x.population] ?? x.population}, ${x.sample_size} records` : ''}</span></span> },
      { key: 'd', header: 'Due', cell: x => <>{x.due_date}{x.overdue && <span className="cell-sub">overdue — a limitation if unanswered at the opinion date</span>}</> },
      { key: 's', header: 'Status', cell: x => <>{x.status.replaceAll('_', ' ').toLowerCase()}{x.status_reason && <span className="cell-sub">{x.status_reason.replaceAll('_', ' ').toLowerCase()}</span>}{x.package_id && <span className="cell-sub">answered with a sealed package (see the inbox)</span>}</> },
      { key: 'x', header: '', cell: x => <span className="row">{x.delivery_id && <button type="button" disabled={busy} onClick={() => void show(x.delivery_id!)}>View answer</button>}
        {x.status === 'PENDING' && <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/channel-requests/${x.id}/withdraw`, {}))}>Withdraw</button>}</span> }]} />
    {!closed && <form className="panel" aria-label="Issue request" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall(`/engagements/${id}/channel/requests`, { kind: r.kind, requirement_id: r.requirement_id || null,
      categories: r.kind === 'COLLECT_NOW' ? r.categories : [], population: r.kind === 'SAMPLE_COUNT' ? r.population : null, sample_size: r.kind === 'SAMPLE_COUNT' ? Number(r.sample_size) : null, description: r.description, due_date: r.due_date })); }}>
      <SelectField label="Request" value={r.kind} onChange={v => setR(x => ({ ...x, kind: v }))} options={[{ value: 'COLLECT_NOW', label: 'Collect current evidence now (answered automatically)' }, { value: 'SAMPLE_COUNT', label: 'Test a sample drawn by the server\'s seed (answered automatically)' }, { value: 'EVIDENCE_FILE', label: 'Ask for a document (a client approver answers)' }]} required />
      <SelectField label="Requirement" value={r.requirement_id} onChange={v => setR(x => ({ ...x, requirement_id: v }))} options={[{ value: '', label: 'All in scope' }, ...scope.map(q => ({ value: q, label: q }))]} />
      {r.kind === 'COLLECT_NOW' && <fieldset><legend>Categories</legend>{CATEGORIES.map(c => <label key={c} className="row"><input type="checkbox" checked={r.categories.includes(c)} onChange={() => setR(x => ({ ...x, categories: x.categories.includes(c) ? x.categories.filter(y => y !== c) : [...x.categories, c] }))} /> {c.replaceAll('_', ' ').toLowerCase()}</label>)}</fieldset>}
      {r.kind === 'SAMPLE_COUNT' && <><SelectField label="Population" value={r.population} onChange={v => setR(x => ({ ...x, population: v }))} options={Object.entries(POPULATIONS).map(([value, label]) => ({ value, label }))} required />
        <TextField label="Sample size" value={r.sample_size} onChange={v => setR(x => ({ ...x, sample_size: v }))} required inputMode="numeric" /></>}
      <TextAreaField label="What you need and why" value={r.description} onChange={v => setR(x => ({ ...x, description: v }))} required />
      <TextField label="Due date (YYYY-MM-DD)" value={r.due_date} onChange={v => setR(x => ({ ...x, due_date: v }))} required />
      <button type="submit" disabled={busy}>Issue request</button>
      <p className="muted">Requests are signed with the audit key and collected by the client&apos;s installation at its next check-in. Anything outside the mandate, or any document, goes to the client&apos;s approver; you see the outcome here.</p></form>}
    <h4>Evidence timeline</h4>
    <DataTable caption="Deliveries from the client installation" rowKey={d => d.delivery_id} rows={ch.deliveries} columns={[{ key: 'n', header: '#', cell: d => d.sequence },
      { key: 'k', header: 'Kind', cell: d => d.kind === 'SNAPSHOT' ? 'scheduled snapshot' : 'answer to a request' }, { key: 'p', header: 'Period', cell: d => d.period_from ? `${d.period_from.slice(0, 10)} → ${d.period_to?.slice(0, 10)}` : '—' },
      { key: 'e', header: 'Entries', cell: d => d.entries }, { key: 'o', header: 'Outcome', cell: d => <>{d.outcome.toLowerCase()}{d.reasons.length > 0 && <span className="cell-sub">{d.reasons.join(', ').toLowerCase()}</span>}</> },
      { key: 'r', header: 'Received', cell: d => d.received_at.slice(0, 16).replace('T', ' ') }, { key: 'x', header: '', cell: d => d.outcome === 'ACCEPTED' ? <button type="button" disabled={busy} onClick={() => void show(d.delivery_id)}>{d.purged ? 'Purged' : 'View'}</button> : null }]} />
    {entries && <div className="panel"><h4>Delivery content</h4>
      <ul className="cell-sub">{entries.limits.map(l => <li key={l}>{l}</li>)}</ul>
      <DataTable caption="Evidence entries, signed by the client installation" rowKey={x => `${x.category}-${x.key}-${x.requirement_id}-${JSON.stringify(x.detail)}`} rows={entries.list} columns={[
        { key: 'c', header: 'Category', cell: x => x.category.replaceAll('_', ' ').toLowerCase() }, { key: 'q', header: 'Requirement', cell: x => x.requirement_id ?? '—' },
        { key: 'l', header: 'Evidence', cell: x => <span className="cell-primary">{x.label}<span className="cell-sub">{x.basis}</span></span> },
        { key: 'v', header: 'Value', cell: x => <>{String(x.value ?? '—')} {x.unit}{x.detail && <span className="cell-sub">{Object.entries(x.detail).map(([k, v]) => `${k.replaceAll('_', ' ')}: ${v ?? '—'}`).join(' · ')}</span>}</> }]} /></div>}
  </Block>;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <VendorArea capability="engagements.read">{s => <Detail id={id} session={s} />}</VendorArea>; }
