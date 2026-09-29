'use client';
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { schemas } from '@orvia/contracts';
import { ApiError } from '@orvia/contracts/client';
import { call } from '../../shared/api.ts';
import { Badge, DataTable, Facts, NoticeBox, PageHead, Section, SelectField, TextAreaField, TextField } from '../../shared/ui.tsx';

/**
 * DPDPA external audit, client side (revision 1.5 addendum). The gap register
 * shows, for every requirement of the package in force, applicability, the
 * evidence expected, the standing of mapped controls and ORVIA's own aggregate
 * indicators. Evidence leaves only (a) under an audit mandate a second owner or
 * administrator approved, as personal-data-free evidence ORVIA generates, signs and
 * sends to the one audit address in the trust file (revision 1.6), or (b) as a
 * sealed package approved the same way, carried as a file or sent over that channel.
 */
type Gap = ReturnType<typeof schemas.GapRegister.parse>;
type File = ReturnType<typeof schemas.EvidenceFile.parse>;
type Engagement = ReturnType<typeof schemas.AuditEngagement.parse>;
type Pkg = ReturnType<typeof schemas.AuditPackage.parse>;
const key = () => crypto.randomUUID().replaceAll('-', '');
const TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral' | 'info'> = { EVIDENCED: 'ok', NOT_APPLICABLE: 'neutral', PENDING_REVIEW: 'info', STALE: 'warn', REJECTED: 'stop', NO_EVIDENCE: 'stop', UNRESOLVED_APPLICABILITY: 'warn' };
const explain = (e: unknown) => e instanceof ApiError ? (e.envelope.error.field_errors?.map(f => `${f.field}: ${f.code.replaceAll('_', ' ')}`).join('; ') || e.envelope.error.message) : e instanceof Error ? e.message : 'The request could not be completed; the outcome is unknown.';
const toBase64 = async (blob: Blob) => { const bytes = new Uint8Array(await blob.arrayBuffer()); let s = ''; for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(s); };
const save = (name: string, data: BlobPart, type: string) => { const url = URL.createObjectURL(new Blob([data], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
const fromBase64 = (b64: string) => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

function useRunner(reload: () => Promise<void>) {
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [note, setNote] = useState<string | null>(null);
  const run = useCallback(async (work: () => Promise<unknown>, done?: string) => { setBusy(true); setError(null); setNote(null); try { await work(); if (done) setNote(done); await reload(); } catch (e) { setError(explain(e)); } finally { setBusy(false); } }, [reload]);
  return { busy, error, note, run };
}
const Messages = ({ error, note }: { error: string | null; note: string | null }) => <>{error && <div className="notice notice-stop" role="alert">{error}</div>}{note && <div className="notice notice-ok" role="status">{note}</div>}</>;

export function DpdpaAudit({ capabilities }: { capabilities: readonly string[] }) {
  const [gap, setGap] = useState<Gap | null>(null); const [files, setFiles] = useState<File[]>([]); const [engagements, setEngagements] = useState<Omit<Engagement, 'packages' | 'imports'>[]>([]);
  const [openId, setOpenId] = useState<string | null>(null); const [loadError, setLoadError] = useState<string | null>(null);
  const prepare = capabilities.includes('audit_exchange.prepare'); const upload = capabilities.includes('grc.write');
  const load = useCallback(async () => {
    try {
      const [g, f, e] = await Promise.all([call('dpdpa_gap_register', undefined), call('list_evidence_files', undefined, { limit: 100 }), call('list_audit_engagements', undefined, { limit: 100 })]);
      setGap(g); setFiles(f.items); setEngagements(e.items);
    } catch (e) { setLoadError(explain(e)); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  const { busy, error, note, run } = useRunner(load);
  const [ev, setEv] = useState({ control_id: '', description: '', personal: 'UNKNOWN', valid: '90' }); const [chosen, setChosen] = useState<Blob & { name?: string } | null>(null);
  const [eng, setEng] = useState({ code: '', firm: '', reference: '', scope: '', from: '', to: '', pa: '', independence: '', empanelment: '' });
  if (!gap) return loadError ? <NoticeBox tone="stop" title="DPDPA audit unavailable"><p>{loadError}</p></NoticeBox> : <p role="status">Reading the gap register…</p>;
  const controls = gap.rows.flatMap(r => r.controls.map(c => ({ value: c.control_id, label: `${r.requirement_id} — ${c.title}` })));
  return <>
    <PageHead eyebrow="GRC" title="DPDPA external audit" lede="Readiness against the DPDP Act and Rules, the audit mandate you sign for your external auditor, and every piece of evidence that leaves. Evidence leaves only under a mandate or a sealed package, each approved by a second owner or administrator; everything that left is listed under Vendor visibility." />
    <Messages error={error} note={note} />
    <Section title="Gap register" aside={<button type="button" disabled={busy} onClick={() => void run(async () => { const r = await call('export_dpdpa_gap_register', undefined, { idempotency_key: key() }); save(r.file_name, r.csv, 'text/csv'); }, 'Gap register exported.')}>Export CSV</button>}>
      <Facts items={[{ term: 'Regulatory package', value: gap.package ? `${gap.package.version} (${gap.package.distribution === 'TEST_FIXTURE' ? 'test fixture' : 'production'})` : 'None in force' },
        { term: 'DPDP framework imported', value: gap.framework_id ? 'Yes' : 'No — import it in Frameworks & controls to see evidence standing' },
        { term: 'Totals', value: Object.entries(gap.totals).filter(([, n]) => n > 0).map(([s, n]) => `${s.replaceAll('_', ' ').toLowerCase()}: ${n}`).join(' · ') || 'No requirements' }]} />
      <ul className="cell-sub">{gap.limits.map(l => <li key={l}>{l}</li>)}</ul>
      <DataTable caption="Summary by module" rowKey={m => m.module} rows={gap.by_module} columns={[{ key: 'm', header: 'Module', cell: m => m.module }, { key: 't', header: 'Requirements', cell: m => m.total },
        { key: 'g', header: 'Gaps', cell: m => m.gaps }, { key: 'e', header: 'Evidenced', cell: m => m.evidenced }, { key: 'n', header: 'Not applicable', cell: m => m.not_applicable }]} />
      <DataTable caption="Requirements" rowKey={r => r.requirement_id} rows={gap.rows} columns={[
        { key: 'r', header: 'Requirement', cell: r => <span className="cell-primary">{r.requirement_id}<span className="cell-sub">{r.title} · {r.provision_ids.join(', ')}</span></span> },
        { key: 'a', header: 'Applicability', cell: r => <span title={r.applicability_basis}>{r.applicability.replaceAll('_', ' ').toLowerCase()}</span> },
        { key: 'x', header: 'Evidence expected', cell: r => <ul className="cell-sub">{r.evidence_expectations.map(x => <li key={x}>{x}</li>)}</ul> },
        { key: 'c', header: 'Controls', cell: r => r.controls.length ? r.controls.map(c => <span key={c.control_id} className="cell-sub">{c.title}: {c.standing.replaceAll('_', ' ').toLowerCase()} ({c.files} file{c.files === 1 ? '' : 's'})</span>) : '—' },
        { key: 'i', header: 'ORVIA indicators', cell: r => r.indicators.length ? r.indicators.map(i => <span key={i.key} className="cell-sub" title={i.basis}>{i.label}: {i.value ?? '—'}</span>) : '—' },
        { key: 'g', header: 'Gap status', cell: r => <Badge label={r.gap_status.replaceAll('_', ' ').toLowerCase()} tone={TONE[r.gap_status] ?? 'neutral'} /> }]} />
    </Section>
    <Section title="Evidence files">
      <p className="muted">PDF, PNG, JPEG, TXT, CSV, DOCX or XLSX up to 20 MB; the type is checked from the file&apos;s content and its SHA-256 is computed here. Mark whether it contains personal data; a different person confirms. Unconfirmed or &ldquo;unknown&rdquo; files cannot be shared.</p>
      <DataTable caption="Evidence files" rowKey={f => f.id} rows={files} columns={[{ key: 'n', header: 'File', cell: f => <span className="cell-primary">{f.file_name}<span className="cell-sub">{f.media_type} · {f.size_bytes} bytes · <code>{f.sha256.slice(0, 12)}…</code></span></span> },
        { key: 'p', header: 'Personal data', cell: f => `${f.contains_personal_data.toLowerCase()}${f.personal_data_confirmed ? ` (confirmed ${f.personal_data_confirmed.toLowerCase()})` : ' (unconfirmed)'}` },
        { key: 's', header: 'Sharing', cell: f => <Badge label={f.shareable.replaceAll('_', ' ').toLowerCase()} tone={f.shareable === 'SHAREABLE' ? 'ok' : 'warn'} /> },
        { key: 'x', header: '', cell: f => prepare && !f.personal_data_confirmed ? <span className="row">
          <button type="button" disabled={busy} onClick={() => void run(() => call('confirm_evidence_personal_data', { personal_data: 'NO' }, { params: { id: f.id }, idempotency_key: key() }), 'Confirmed: no personal data.')}>Confirm no personal data</button>
          <button type="button" disabled={busy} onClick={() => void run(() => call('confirm_evidence_personal_data', { personal_data: 'YES' }, { params: { id: f.id }, idempotency_key: key() }), 'Confirmed: contains personal data.')}>Confirm contains personal data</button></span> : null }]} />
      {upload && (controls.length ? <form className="panel" aria-label="Add evidence file" onSubmit={(e: FormEvent) => { e.preventDefault(); if (!chosen) return; void run(async () => {
        await call('submit_evidence_file', { description: ev.description, file_name: (chosen as { name?: string }).name ?? 'evidence', content_base64: await toBase64(chosen), collected_at: new Date(Date.now() - 60000).toISOString(),
          valid_until: new Date(Date.now() + Number(ev.valid) * 86400000).toISOString(), contains_personal_data: ev.personal as 'YES' | 'NO' | 'UNKNOWN' }, { params: { id: ev.control_id }, idempotency_key: key() }); setChosen(null); }, 'Evidence file stored and submitted for review.'); }}>
        <SelectField label="Control" value={ev.control_id} onChange={v => setEv(x => ({ ...x, control_id: v }))} options={controls} required />
        <TextField label="Description" value={ev.description} onChange={v => setEv(x => ({ ...x, description: v }))} required />
        <label>Evidence file<input type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.csv,.docx,.xlsx" onChange={e => setChosen(e.target.files?.[0] ?? null)} required style={{ display: 'block', marginTop: 'var(--s2)' }} /></label>
        <SelectField label="Contains personal data" value={ev.personal} onChange={v => setEv(x => ({ ...x, personal: v }))} options={[{ value: 'NO', label: 'No' }, { value: 'YES', label: 'Yes' }, { value: 'UNKNOWN', label: 'Unknown' }]} required />
        <TextField label="Valid for (days)" value={ev.valid} onChange={v => setEv(x => ({ ...x, valid: v }))} required inputMode="numeric" />
        <button className="primary" type="submit" disabled={busy || !chosen}>Store evidence file</button></form>
        : <NoticeBox tone="info" title="No DPDP controls yet"><p>Import the DPDP framework and map a control to a requirement in <a href="/workspace/grc">Frameworks &amp; controls</a> to attach evidence files.</p></NoticeBox>)}
    </Section>
    <Section title="External audit engagements">
      <DataTable caption="Engagements" rowKey={e => e.id} rows={engagements} columns={[{ key: 'r', header: 'Reference', cell: e => e.engagement_reference }, { key: 'f', header: 'Audit firm', cell: e => e.firm_name },
        { key: 'p', header: 'Period', cell: e => `${e.period_from} → ${e.period_to}` }, { key: 'a', header: 'Processing agreement', cell: e => e.processing_agreement.status.replaceAll('_', ' ').toLowerCase() },
        { key: 'o', header: '', cell: e => <button type="button" onClick={() => setOpenId(e.id)}>Open</button> }]} />
      {prepare && <form className="panel" aria-label="Record engagement" onSubmit={(e: FormEvent) => { e.preventDefault(); void run(async () => { const r = await call('create_audit_engagement', { engagement_code: eng.code.trim().toUpperCase(), firm_name: eng.firm, engagement_reference: eng.reference.trim(),
        scope_requirement_ids: eng.scope.split(/[\s,]+/).filter(Boolean), period_from: eng.from, period_to: eng.to, processing_agreement_reference: eng.pa.trim() || null, independence_statement: eng.independence.trim() || null, empanelment_reference: eng.empanelment.trim() || null }, { idempotency_key: key() }); setOpenId(r.id); }, 'Engagement recorded.'); }}>
        <h4>Record an engagement from your auditor</h4>
        <TextField label="Engagement code" value={eng.code} onChange={v => setEng(x => ({ ...x, code: v }))} required hint="Given to you privately by the audit firm. Only its digest is stored." />
        <TextField label="Audit firm" value={eng.firm} onChange={v => setEng(x => ({ ...x, firm: v }))} required />
        <TextField label="Engagement reference" value={eng.reference} onChange={v => setEng(x => ({ ...x, reference: v }))} required />
        <TextField label="Requirements in scope" value={eng.scope} onChange={v => setEng(x => ({ ...x, scope: v }))} required hint="DPDP requirement IDs, as agreed with the auditor" />
        <TextField label="Audit period from (YYYY-MM-DD)" value={eng.from} onChange={v => setEng(x => ({ ...x, from: v }))} required />
        <TextField label="Audit period to (YYYY-MM-DD)" value={eng.to} onChange={v => setEng(x => ({ ...x, to: v }))} required />
        <TextField label="Processing agreement reference" value={eng.pa} onChange={v => setEng(x => ({ ...x, pa: v }))} hint="Only if a processing agreement with the audit firm is signed; without one, packages must hold no personal data." />
        <TextAreaField label="Auditor's independence declaration" value={eng.independence} onChange={v => setEng(x => ({ ...x, independence: v }))} />
        <TextField label="Auditor's eligibility reference (optional)" value={eng.empanelment} onChange={v => setEng(x => ({ ...x, empanelment: v }))} hint="Only if the auditor states one. ORVIA records it as stated and never decides statutory eligibility." />
        <button className="primary" type="submit" disabled={busy}>Record engagement</button></form>}
    </Section>
    {openId && <EngagementDetail key={openId} id={openId} files={files} capabilities={capabilities} onChange={load} />}
  </>;
}

function EngagementDetail({ id, files, capabilities, onChange }: { id: string; files: File[]; capabilities: readonly string[]; onChange: () => Promise<void> }) {
  const [e, setE] = useState<Engagement | null>(null); const [pkg, setPkg] = useState<Pkg | null>(null); const [imp, setImp] = useState<ReturnType<typeof schemas.AuditImport.parse> | null>(null);
  const load = useCallback(async () => { const eng = await call('audit_engagement', undefined, { params: { id } }); setE(eng); await onChange();
    const draft = eng.packages.find(p => p.state === 'DRAFT'); if (draft) setPkg(await call('audit_package', undefined, { params: { id: draft.id } })); }, [id, onChange]);
  useEffect(() => { void load(); }, [load]);
  const { busy, error, note, run } = useRunner(load);
  const [item, setItem] = useState({ requirement_id: '', kind: 'FILE', title: '', file: '', indicator: '', statement: '', justification: '' }); const [expires, setExpires] = useState('14');
  const [signed, setSigned] = useState<Blob | null>(null); const [pdf, setPdf] = useState<Blob | null>(null);
  const approve = capabilities.includes('audit_exchange.approve'); const prepare = capabilities.includes('audit_exchange.prepare');
  if (!e) return <p role="status">Opening engagement…</p>;
  const scope = e.scope_requirement_ids.map(r => ({ value: r, label: r }));
  const itemBody = () => ({ requirement_id: item.requirement_id, kind: item.kind as 'FILE' | 'INDICATOR' | 'STATEMENT', title: item.title, evidence_file_id: item.kind === 'FILE' ? item.file : null, indicator_key: item.kind === 'INDICATOR' ? item.indicator : null, statement: item.kind === 'STATEMENT' ? item.statement : null });
  const P = ({ children }: { children: ReactNode }) => <div className="panel">{children}</div>;
  return <Section title={`Engagement ${e.engagement_reference} — ${e.firm_name}`}>
    <Messages error={error} note={note} />
    <Facts items={[{ term: 'Scope', value: e.scope_requirement_ids.join(', ') }, { term: 'Processing agreement', value: e.processing_agreement.reference ?? 'Not recorded' },
      { term: 'Independence', value: e.independence.statement ?? 'Not declared' }, { term: 'Auditor eligibility reference', value: e.empanelment_reference ?? 'None stated' }]} />
    <DataTable caption="Evidence packages" rowKey={p => p.id} rows={e.packages} columns={[{ key: 'c', header: 'Created', cell: p => p.created_at.slice(0, 16).replace('T', ' ') },
      { key: 's', header: 'State', cell: p => p.effective_state.toLowerCase() }, { key: 'i', header: 'Items', cell: p => p.item_count }, { key: 'e', header: 'Exports', cell: p => p.exports },
      { key: 'f', header: 'Fingerprint', cell: p => p.manifest_fingerprint ? <code>{p.manifest_fingerprint.slice(0, 16)}…</code> : '—' },
      { key: 'x', header: '', cell: p => <span className="row">
        {p.state === 'DRAFT' && <button type="button" onClick={() => void run(async () => setPkg(await call('audit_package', undefined, { params: { id: p.id } })))}>Open draft</button>}
        {p.effective_state === 'APPROVED' && approve && <button type="button" disabled={busy} onClick={() => void run(async () => { const x = await call('export_audit_package', undefined, { params: { id: p.id }, idempotency_key: key() }); save(x.file_name, fromBase64(x.package_base64), 'application/json'); }, 'Package file saved. Carry it to your auditor\'s upload page.')}>Export file</button>}
        {p.state !== 'REVOKED' && approve && <button type="button" className="danger" disabled={busy} onClick={() => void run(() => call('revoke_audit_package', { reason: 'Revoked by the organisation.' }, { params: { id: p.id }, idempotency_key: key() }), 'Package revoked; the next package you send tells the auditor.')}>Revoke</button>}</span> }]} />
    {prepare && e.state === 'ACTIVE' && !e.packages.some(p => p.state === 'DRAFT') && <P><form aria-label="New package" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(async () => setPkg(await call('create_audit_package', { expires_at: new Date(Date.now() + Number(expires) * 86400000).toISOString() }, { params: { id }, idempotency_key: key() }))); }}>
      <TextField label="Package expires after (days)" value={expires} onChange={setExpires} required inputMode="numeric" /><button type="submit" disabled={busy}>Prepare a new package</button></form></P>}
    {pkg && pkg.state === 'DRAFT' && <P>
      <h4>Draft package</h4>
      <DataTable caption="Items" rowKey={i => i.item_id} rows={pkg.items} columns={[{ key: 'r', header: 'Requirement', cell: i => i.requirement_id }, { key: 't', header: 'Item', cell: i => `${i.title} (${i.kind.toLowerCase()})` },
        { key: 'p', header: 'Personal data', cell: i => i.contains_personal_data === 'YES' ? `yes — exception: ${i.exception_justification}` : 'no' },
        { key: 'x', header: '', cell: i => prepare ? <button type="button" disabled={busy} onClick={() => void run(async () => setPkg(await call('withdraw_audit_package_item', { item_id: i.item_id }, { params: { id: pkg.id }, idempotency_key: key() })))}>Remove</button> : null }]} />
      {pkg.screening.length > 0 && <NoticeBox tone="warn" title="Screening blocks approval"><ul>{pkg.screening.map(s => <li key={s.item_id + s.problem}>{s.problem.replaceAll('_', ' ').toLowerCase()}</li>)}</ul></NoticeBox>}
      {pkg.redactions > 0 && <NoticeBox tone="info" title="Statement redacted"><p>{pkg.redactions} contact detail(s) or identifier(s) were removed before the statement was added.</p></NoticeBox>}
      <form aria-label="Add package item" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(async () => setPkg(await call('add_audit_package_item', itemBody(), { params: { id: pkg.id }, idempotency_key: key() })), 'Item added.'); }}>
        <SelectField label="Requirement" value={item.requirement_id} onChange={v => setItem(x => ({ ...x, requirement_id: v }))} options={scope} required />
        <SelectField label="Item kind" value={item.kind} onChange={v => setItem(x => ({ ...x, kind: v }))} options={[{ value: 'FILE', label: 'Evidence file' }, { value: 'INDICATOR', label: 'ORVIA indicator' }, { value: 'STATEMENT', label: 'Written statement' }]} required />
        <TextField label="Item title" value={item.title} onChange={v => setItem(x => ({ ...x, title: v }))} required />
        {item.kind === 'FILE' && <SelectField label="Evidence file" value={item.file} onChange={v => setItem(x => ({ ...x, file: v }))} options={files.map(f => ({ value: f.id, label: `${f.file_name} (${f.shareable.replaceAll('_', ' ').toLowerCase()})` }))} required />}
        {item.kind === 'INDICATOR' && <TextField label="Indicator key" value={item.indicator} onChange={v => setItem(x => ({ ...x, indicator: v }))} required hint="As shown in the gap register, e.g. notices.published_versions. The value is computed now by ORVIA." />}
        {item.kind === 'STATEMENT' && <TextAreaField label="Statement" value={item.statement} onChange={v => setItem(x => ({ ...x, statement: v }))} required />}
        <button type="submit" disabled={busy}>Add item</button>
      </form>
      {approve && <form aria-label="Add personal-data exception" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(async () => setPkg(await call('add_audit_package_exception', { ...itemBody(), justification: item.justification }, { params: { id: pkg.id }, idempotency_key: key() })), 'Exception approved and item added.'); }}>
        <h4>Approve a personal-data exception (not the preparer)</h4>
        <TextAreaField label="Justification" value={item.justification} onChange={v => setItem(x => ({ ...x, justification: v }))} required hint="Why this personal data is necessary for the audit. The auditor's installation quarantines it unless a processing agreement is recorded." />
        <button type="submit" disabled={busy}>Approve exception and add the item above</button></form>}
      {approve && <button className="primary" type="button" disabled={busy || pkg.screening.length > 0 || pkg.items.length === 0} onClick={() => void run(async () => setPkg(await call('approve_audit_package', undefined, { params: { id: pkg.id }, idempotency_key: key() })), 'Package approved and sealed.')}>Approve and seal package</button>}
    </P>}
    <MandatePanel engagement={e} capabilities={capabilities} />
    <h4>Files from your auditor</h4>
    <DataTable caption="Signed files imported" rowKey={i => i.id} rows={e.imports} columns={[{ key: 'k', header: 'Kind', cell: i => i.kind.replaceAll('_', ' ').toLowerCase() }, { key: 'd', header: 'Issued', cell: i => i.issued_at.slice(0, 10) },
      { key: 'n', header: 'Entries', cell: i => i.entries }, { key: 'x', header: '', cell: i => <span className="row">
        <button type="button" onClick={() => void run(async () => setImp(await call('audit_import', undefined, { params: { id: i.id } })))}>Open</button>
        {i.kind === 'REPORT' && <button type="button" onClick={() => void run(async () => { const p = await call('audit_import_pdf', undefined, { params: { id: i.id } }); save(p.file_name, fromBase64(p.pdf_base64), 'application/pdf'); })}>Download report PDF</button>}</span> }]} />
    {imp?.kind === 'FINDINGS' && <P><h4>Findings</h4>{((imp.document as { findings: { finding_id: string; severity: string; requirement_id: string; title: string; recommendation: string; due_date: string }[] }).findings).map(f => {
      const link = imp.finding_links.find(l => l.finding_id === f.finding_id);
      return <div key={f.finding_id} className="cell-sub"><strong>[{f.severity}] {f.requirement_id}: {f.title}</strong> — {f.recommendation} (due {f.due_date}){' '}
        {link ? <a href="/workspace/findings">Tracked as a GRC issue</a> : prepare && <button type="button" disabled={busy} onClick={() => void run(async () => setImp(await call('link_audit_finding', { finding_id: f.finding_id }, { params: { id: imp.id }, idempotency_key: key() })), 'Finding tracked as a GRC issue.')}>Track remediation</button>}</div>; })}</P>}
    {prepare && <form className="panel" aria-label="Import signed file" onSubmit={(ev: FormEvent) => { ev.preventDefault(); if (!signed) return; void run(async () => { const doc = JSON.parse(await signed.text()); await call('receive_signed_audit_document', { signed: doc, pdf_base64: pdf ? await toBase64(pdf) : null }, { params: { id }, idempotency_key: key() }); setSigned(null); setPdf(null); }, 'Signed file verified and imported.'); }}>
      <label>Signed file (request list, findings or report JSON)<input type="file" accept=".json,application/json" onChange={ev => setSigned(ev.target.files?.[0] ?? null)} required style={{ display: 'block', marginTop: 'var(--s2)' }} /></label>
      <label>Report PDF (for a report only)<input type="file" accept=".pdf,application/pdf" onChange={ev => setPdf(ev.target.files?.[0] ?? null)} style={{ display: 'block', marginTop: 'var(--s2)' }} /></label>
      <button type="submit" disabled={busy || !signed}>Verify and import</button>
      <p className="muted">The signature is verified with the auditor&apos;s audit key in this installation&apos;s trust file; an altered or unknown file is refused. A report is stored with its PDF, whose hash the signature covers.</p></form>}
  </Section>;
}

type Channel = ReturnType<typeof schemas.AuditChannel.parse>;
const CATEGORY_LABEL: Record<string, string> = { INDICATORS: 'ORVIA indicators (counts and dates)', CONTROL_STANDING: 'Standing of mapped controls', CONTROL_TESTS: 'Scheduled control test results',
  NOTICE_VERSIONS: 'Published notice versions (identifiers and digests)', POLICY_VERSIONS: 'Policy versions', ACTIVITY_LOG_DIGEST: 'Audit trail digest (counts and a hash, no people)', SAMPLE_COUNTS: 'Answers to auditor samples (counts only)' };
const DECISION_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral' | 'info'> = { DELIVERED: 'ok', ANSWER_AUTOMATICALLY: 'info', AWAITING_CLIENT_APPROVAL: 'warn', REFUSED: 'neutral' };
/**
 * The audit mandate (revision 1.6): one authorisation, drafted by one person and
 * approved by a different owner or administrator, under which ORVIA itself
 * generates, signs and sends personal-data-free evidence on schedule and answers
 * the auditor's requests inside it. Requests for files wait here for a person.
 */
function MandatePanel({ engagement, capabilities }: { engagement: Engagement; capabilities: readonly string[] }) {
  const [ch, setCh] = useState<Channel | null>(null); const [loadError, setLoadError] = useState<string | null>(null);
  const load = useCallback(async () => { try { setCh(await call('audit_channel', undefined, { params: { id: engagement.id } })); } catch (e) { setLoadError(explain(e)); } }, [engagement.id]);
  useEffect(() => { void load(); }, [load]);
  const { busy, error, note, run } = useRunner(load);
  const prepare = capabilities.includes('audit_exchange.prepare'); const approve = capabilities.includes('audit_exchange.approve');
  const [form, setForm] = useState({ kind: 'ENGAGEMENT', scope: engagement.scope_requirement_ids, categories: ['INDICATORS', 'CONTROL_STANDING', 'CONTROL_TESTS', 'NOTICE_VERSIONS', 'ACTIVITY_LOG_DIGEST', 'SAMPLE_COUNTS'], schedule: 'WEEKLY', days: '90' });
  const [reason, setReason] = useState(''); const [answer, setAnswer] = useState<Record<string, { package_id: string; reason: string }>>({});
  if (!ch) return loadError ? <NoticeBox tone="stop" title="Audit channel unavailable"><p>{loadError}</p></NoticeBox> : <p role="status">Reading the audit channel…</p>;
  const current = ch.mandates.find(m => ['ACTIVE', 'SUSPENDED'].includes(m.state)); const draft = ch.mandates.find(m => m.state === 'DRAFT');
  const sendable = engagement.packages.filter(p => p.effective_state === 'APPROVED');
  const toggle = (list: string[], value: string) => list.includes(value) ? list.filter(x => x !== value) : [...list, value];
  return <div className="panel" aria-label="Audit mandate and channel">
    <h4>Audit mandate</h4>
    <Messages error={error} note={note} />
    <Facts items={[{ term: 'Audit service', value: ch.audit_service.configured ? ch.audit_service.address : 'Not configured in the trust file — evidence moves only as files' },
      { term: 'Installation evidence key', value: ch.evidence_key_id ?? 'Created by ORVIA when the first mandate is serviced' },
      { term: 'Mandate in force', value: current ? `${current.state.toLowerCase()} · ${current.kind === 'CONTINUOUS_ASSURANCE' ? 'continuous assurance' : 'engagement'} · until ${current.valid_to.slice(0, 10)}` : 'None' },
      { term: 'Last check-in', value: current?.last_check_in_at ? current.last_check_in_at.slice(0, 16).replace('T', ' ') : '—' },
      ...(current?.channel_problem ? [{ term: 'Channel problem', value: current.channel_problem.replaceAll('_', ' ').toLowerCase() }] : [])]} />
    <ul className="cell-sub">{ch.limits.map(l => <li key={l}>{l}</li>)}</ul>
    {current && <p className="muted">Under this mandate ORVIA sends, {current.schedule === 'DAILY' ? 'daily' : 'weekly'}: {current.categories.map(c => CATEGORY_LABEL[c] ?? c).join('; ')}. Scope: {current.scope_requirement_ids.join(', ')}. Nothing personal is ever sent automatically.</p>}
    {approve && current && <div className="row">
      <TextField label="Reason" value={reason} onChange={setReason} hint="Recorded with the change and reported to the auditor." />
      {current.state === 'ACTIVE' && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void run(() => call('change_audit_mandate_state', { state: 'SUSPENDED', reason }, { params: { id: current.id }, idempotency_key: key() }), 'Mandate suspended; nothing more is sent until you resume it.')}>Suspend</button>}
      {current.state === 'SUSPENDED' && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void run(() => call('change_audit_mandate_state', { state: 'ACTIVE', reason }, { params: { id: current.id }, idempotency_key: key() }), 'Mandate resumed.')}>Resume</button>}
      <button type="button" className="danger" disabled={busy || reason.trim().length < 3} onClick={() => void run(() => call('change_audit_mandate_state', { state: 'REVOKED', reason }, { params: { id: current.id }, idempotency_key: key() }), 'Mandate revoked; the auditor is told at the next check-in.')}>Revoke</button></div>}
    {draft && <NoticeBox tone="info" title="Mandate waiting for approval"><p>Drafted by {draft.prepared_role.replaceAll('_', ' ').toLowerCase()} for {draft.categories.length} categories, until {draft.valid_to.slice(0, 10)}. An owner or administrator other than the preparer approves it.</p>
      {approve && <button className="primary" type="button" disabled={busy} onClick={() => void run(() => call('approve_audit_mandate', undefined, { params: { id: draft.id }, idempotency_key: key() }), 'Mandate approved. ORVIA begins sending evidence at its next check-in.')}>Approve mandate</button>}</NoticeBox>}
    {prepare && !current && !draft && engagement.state === 'ACTIVE' && ch.available && <form aria-label="Draft mandate" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => call('create_audit_mandate', { kind: form.kind as 'ENGAGEMENT' | 'CONTINUOUS_ASSURANCE', scope_requirement_ids: form.scope,
      categories: form.categories as ReturnType<typeof schemas.AuditMandateCreate.parse>['categories'], schedule: form.schedule as 'DAILY' | 'WEEKLY', valid_from: new Date(Date.now() - 60_000).toISOString(), valid_to: new Date(Date.now() + Number(form.days) * 86_400_000).toISOString() }, { params: { id: engagement.id }, idempotency_key: key() }), 'Mandate drafted; a different owner or administrator approves it.'); }}>
      <p className="muted">Sign once instead of preparing evidence for every question. ORVIA generates the evidence below from its own records, signs it with this installation&apos;s key so it cannot be edited or chosen, and sends it only to the audit address in your trust file. Requests for documents still come to you.</p>
      <SelectField label="Kind" value={form.kind} onChange={v => setForm(x => ({ ...x, kind: v }))} options={[{ value: 'ENGAGEMENT', label: 'This audit engagement' }, { value: 'CONTINUOUS_ASSURANCE', label: 'Continuous assurance (separate service)' }]} required />
      <fieldset><legend>Requirements</legend>{engagement.scope_requirement_ids.map(r => <label key={r} className="row"><input type="checkbox" checked={form.scope.includes(r)} onChange={() => setForm(x => ({ ...x, scope: toggle(x.scope, r) }))} /> {r}</label>)}</fieldset>
      <fieldset><legend>Evidence ORVIA may send</legend>{Object.entries(CATEGORY_LABEL).map(([c, label]) => <label key={c} className="row"><input type="checkbox" checked={form.categories.includes(c)} onChange={() => setForm(x => ({ ...x, categories: toggle(x.categories, c) }))} /> {label}</label>)}</fieldset>
      <SelectField label="Schedule" value={form.schedule} onChange={v => setForm(x => ({ ...x, schedule: v }))} options={[{ value: 'WEEKLY', label: 'Weekly' }, { value: 'DAILY', label: 'Daily' }]} required />
      <TextField label="Lasts (days)" value={form.days} onChange={v => setForm(x => ({ ...x, days: v }))} required inputMode="numeric" hint="An engagement mandate ends within 120 days after the audit period; continuous assurance lasts at most 400 days." />
      <button className="primary" type="submit" disabled={busy || !form.scope.length || !form.categories.length}>Draft mandate</button></form>}
    <h4>Auditor requests</h4>
    <DataTable caption="Requests from your auditor" rowKey={r => r.id} rows={ch.requests} columns={[
      { key: 'k', header: 'Request', cell: r => <span className="cell-primary">{r.kind.replaceAll('_', ' ').toLowerCase()}{r.requirement_id ? ` · ${r.requirement_id}` : ''}<span className="cell-sub">{r.description}</span></span> },
      { key: 'd', header: 'Due', cell: r => <>{r.due_date}{r.overdue && <Badge label="overdue" tone="stop" />}</> },
      { key: 's', header: 'Status', cell: r => <><Badge label={r.decision === 'ANSWER_AUTOMATICALLY' ? 'answering' : r.decision.replaceAll('_', ' ').toLowerCase()} tone={DECISION_TONE[r.decision] ?? 'neutral'} />{r.decision_reason && <span className="cell-sub">{r.decision_reason.replaceAll('_', ' ').toLowerCase()}</span>}</> },
      { key: 'x', header: '', cell: r => r.decision === 'AWAITING_CLIENT_APPROVAL' && !r.package_id && approve ? <span className="row">
        <SelectField label="Approved package" value={answer[r.id]?.package_id ?? ''} onChange={v => setAnswer(a => ({ ...a, [r.id]: { reason: a[r.id]?.reason ?? '', package_id: v } }))} options={sendable.map(p => ({ value: p.id, label: `${p.item_count} item(s), sealed ${p.approved_at?.slice(0, 10)}` }))} />
        <button type="button" disabled={busy || !answer[r.id]?.package_id} onClick={() => void run(() => call('decide_audit_channel_request', { decision: 'PACKAGE', reason: null, package_id: answer[r.id]!.package_id }, { params: { id: r.id }, idempotency_key: key() }), 'The package will be sent to the auditor at the next check-in.')}>Send package</button>
        <TextField label="Reason to decline" value={answer[r.id]?.reason ?? ''} onChange={v => setAnswer(a => ({ ...a, [r.id]: { package_id: a[r.id]?.package_id ?? '', reason: v } }))} />
        <button type="button" disabled={busy || (answer[r.id]?.reason ?? '').trim().length < 3} onClick={() => void run(() => call('decide_audit_channel_request', { decision: 'REFUSED', reason: answer[r.id]!.reason.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 80), package_id: null }, { params: { id: r.id }, idempotency_key: key() }), 'Declined; the auditor sees your reason.')}>Decline</button></span> : null }]} />
    <h4>What ORVIA sent</h4>
    <DataTable caption="Evidence deliveries" rowKey={d => d.id} rows={ch.deliveries} columns={[{ key: 'n', header: '#', cell: d => d.sequence }, { key: 'k', header: 'Kind', cell: d => d.kind === 'SNAPSHOT' ? 'scheduled snapshot' : 'answer to a request' },
      { key: 'c', header: 'Categories', cell: d => d.categories.map(c => c.replaceAll('_', ' ').toLowerCase()).join(', ') }, { key: 'e', header: 'Entries', cell: d => d.entries },
      { key: 's', header: 'Outcome', cell: d => <><Badge label={d.state.toLowerCase()} tone={d.state === 'ACCEPTED' ? 'ok' : d.state === 'REFUSED' || d.state === 'FAILED' ? 'stop' : 'warn'} />{d.reasons.length > 0 && <span className="cell-sub">{d.reasons.join(', ').toLowerCase()}</span>}</> },
      { key: 't', header: 'Generated', cell: d => d.created_at.slice(0, 16).replace('T', ' ') }, { key: 'h', header: 'Digest', cell: d => <code>{d.digest.slice(0, 12)}…</code> }]} />
    {approve && sendable.length > 0 && ch.audit_service.configured && current && <p className="muted">A sealed package can also be sent over the channel instead of carried as a file:{' '}
      {sendable.map(p => <button key={p.id} type="button" disabled={busy} onClick={() => void run(() => call('submit_audit_package_over_channel', undefined, { params: { id: p.id }, idempotency_key: key() }), 'Package queued; it is sent at the next check-in.')}>Send package sealed {p.approved_at?.slice(0, 10)}</button>)}</p>}
    {approve && engagement.state === 'ACTIVE' && <p><button type="button" className="danger" disabled={busy || reason.trim().length < 3} onClick={() => void run(() => call('close_audit_engagement', { reason }, { params: { id: engagement.id }, idempotency_key: key() }), 'Engagement closed; its mandate has ended and nothing more is sent.')}>Close engagement (uses the reason above)</button></p>}
  </div>;
}
