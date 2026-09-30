'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, EmptyState, Facts, NoticeBox, SelectField, TextField } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, type VendorSession } from '../../../components/vendor/vendor.tsx';

/**
 * Audit practice settings (task AUDIT-PRACTICE-01): criteria versions, the risk
 * methodology and the activation gates a real engagement needs. Recording and
 * approving are separate people; the gates are recorded only by the super
 * administrator, and a development audit key can never pass the key gate.
 */
type State = { criteria: { id: string; version: string; distribution: string; requirements: number; digest: string; recorded_by: string; approved_by: string | null; approved_at: string | null; created_at: string }[];
  methodologies: { id: string; version: string; digest: string; recorded_by: string; approved_by: string | null; approved_at: string | null; definition: { matrix: string[][]; residual_steps: Record<string, number>; considerations: string[]; severity_rules: string } }[];
  activations: { id: string; gate: string; reference: string; recorded_at: string }[]; gates_missing: string[]; real_use_allowed: boolean; audit_key: { key_id: string; development: boolean } | null; statement: string };
const words = (v: string) => v.replaceAll('_', ' ').toLowerCase();
const GATES: Record<string, string> = { ENGAGEMENT_LETTER_TEMPLATE_APPROVED: 'Engagement letter template approved by management', PROCESSING_AGREEMENT_TEMPLATE_APPROVED: 'Processing agreement template approved by management', PRODUCTION_CRITERIA: 'Production criteria from the official, signed regulatory package', PRODUCTION_AUDIT_KEY: 'Production audit signing key' };
const LEGACY: Record<string, string> = { ENGAGEMENT_LETTER_TEMPLATE_APPROVED: 'LEGAL_REVIEW_ENGAGEMENT_LETTER', PROCESSING_AGREEMENT_TEMPLATE_APPROVED: 'LEGAL_REVIEW_PROCESSING_AGREEMENT' };
const DEFAULT_MATRIX = [1, 2, 3, 4, 5].map(l => [1, 2, 3, 4, 5].map(i => { const s = l * i; return s <= 4 ? 'LOW' : s <= 9 ? 'MEDIUM' : s <= 16 ? 'HIGH' : 'CRITICAL'; }));

function Practice({ session }: { session: VendorSession }) {
  const [s, setS] = useState<State | null>(null); const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState<string | null>(null);
  const load = useCallback(async () => { try { setLoadError(null); setS(await vendorCall<State>('/practice')); } catch (e) { setLoadError(explain(e)); } }, []);
  useEffect(() => { void load(); }, [load]);
  const run = async (work: () => Promise<unknown>, ok: string) => { setBusy(true); setError(null); setDone(null); try { await work(); await load(); setDone(ok); } catch (e) { setError(explain(e)); } finally { setBusy(false); } };
  const [cv, setCv] = useState(''); const [mv, setMv] = useState(''); const [pkgFile, setPkgFile] = useState<File | null>(null); const [gate, setGate] = useState({ gate: '', reference: '' });
  if (!s) return loadError ? <NoticeBox tone="stop" title="Practice settings unavailable"><p>{loadError}</p><button type="button" onClick={() => void load()}>Try again</button></NoticeBox> : <p role="status">Loading practice settings…</p>;
  return <>
    <div className="page-head"><p className="eyebrow">Audits</p><h2>Audit practice</h2><p>{s.statement}</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}{done && <div className="notice notice-ok" role="status">{done}</div>}
    <section className="section" aria-label="Activation gates"><div className="section-head"><h3>Activation for real engagements</h3></div>
      <Facts items={[{ term: 'Real engagements', value: s.real_use_allowed ? 'Allowed (each still needs production criteria and its own acceptance)' : 'Refused until every gate below is recorded' },
        { term: 'Audit signing key', value: s.audit_key ? `${s.audit_key.key_id}${s.audit_key.development ? ' — DEVELOPMENT key: every signed output is marked and cannot be relied on' : ''}` : 'Not available' },
        ...Object.entries(GATES).map(([g, label]) => { const a = s.activations.find(x => x.gate === g || x.gate === LEGACY[g]);
          return { term: label, value: a ? `Recorded ${a.recorded_at.slice(0, 10)}${a.gate !== g ? ' (as a legal review)' : ''}: ${a.reference}` : 'Missing' }; })]} />
      {can(session, 'practice.activate') && s.gates_missing.length > 0 && <form className="panel" aria-label="Record activation gate" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall('/practice/activations', gate), 'Gate recorded.'); }}>
        <SelectField label="Gate" value={gate.gate} onChange={v => setGate(x => ({ ...x, gate: v }))} options={s.gates_missing.map(g => ({ value: g, label: GATES[g] ?? words(g) }))} required />
        <TextField label="Reference" value={gate.reference} onChange={v => setGate(x => ({ ...x, reference: v }))} required hint="The approved template version and its SHA-256 (docs/audit-practice/templates), the package signature or the key ceremony record. Recording a gate is an attestation by you." />
        <button type="submit" disabled={busy}>Record gate</button></form>}
    </section>
    <section className="section" aria-label="Criteria versions"><div className="section-head"><h3>Criteria versions</h3></div>
      <p className="muted">The ORVIA DPDP baseline can be recorded as TEST_FIXTURE criteria for synthetic engagements. Production criteria come only from the signed official regulatory package, uploaded below.</p>
      {s.criteria.length ? <DataTable caption="Criteria versions" rowKey={x => x.id} rows={s.criteria} columns={[{ key: 'v', header: 'Version', cell: x => x.version }, { key: 'd', header: 'Distribution', cell: x => words(x.distribution) }, { key: 'n', header: 'Requirements', cell: x => x.requirements },
        { key: 'g', header: 'Digest', cell: x => <code>{x.digest.slice(0, 16)}…</code> },
        { key: 'a', header: 'Approval', cell: x => x.approved_by ? `Approved ${x.approved_at?.slice(0, 10)}` : can(session, 'practice.approve') && x.recorded_by !== session.actor_id ? <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/criteria/${x.id}/approve`, {}), 'Criteria approved.')}>Approve</button> : 'Awaiting a different approver' }]} />
        : <EmptyState title="No criteria recorded" />}
      {can(session, 'practice.manage') && <form className="panel" aria-label="Record test-fixture criteria" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall('/practice/criteria', { version: cv }), 'Criteria recorded.'); }}>
        <TextField label="Criteria version label" value={cv} onChange={setCv} required hint="Letters, digits, dot, dash or underscore." /><button type="submit" disabled={busy}>Record test-fixture criteria</button></form>}
      {can(session, 'practice.manage') && <form className="panel" aria-label="Record production criteria" onSubmit={(ev: FormEvent) => { ev.preventDefault();
        void run(async () => { if (!pkgFile) throw new Error('Choose the signed package file.'); let body: unknown; try { body = JSON.parse(await pkgFile.text()); } catch { throw new Error('The file is not a signed package (JSON).'); }
          return vendorCall('/practice/criteria/production', body); }, 'Production criteria recorded. A different reviewer must approve them before the gate can be recorded.'); }}>
        <p className="muted">Upload the official regulatory package built from the official PDFs and signed with the Cyberfyx release key (docs/regulatory/DPDP_CONFORMANCE.md). Only a PRODUCTION package with a valid signature from this service&apos;s release key is accepted. A different reviewer then approves it.</p>
        <label className="field"><span className="label">Signed package file (.json)</span><input type="file" accept="application/json,.json" onChange={e => setPkgFile(e.target.files?.[0] ?? null)} required /></label>
        <button type="submit" disabled={busy}>Record production criteria</button></form>}
    </section>
    <section className="section" aria-label="Risk methodology"><div className="section-head"><h3>Risk methodology</h3></div>
      <p className="muted">Engagements compute inherent risk from this matrix (likelihood × impact) and lower it by the steps shown for an assessed control. A new version is recorded with the standard 5 × 5 matrix below; it applies only to engagements configured with it.</p>
      {s.methodologies.length ? <DataTable caption="Methodology versions" rowKey={x => x.id} rows={s.methodologies} columns={[{ key: 'v', header: 'Version', cell: x => x.version },
        { key: 'm', header: 'Matrix (likelihood rows 1-5)', cell: x => <code>{x.definition.matrix.map(r => r.map(c => c[0]).join('')).join(' / ')}</code> },
        { key: 'r', header: 'Residual steps', cell: x => Object.entries(x.definition.residual_steps).map(([k, v]) => `${words(k)} −${v}`).join(', ') },
        { key: 'a', header: 'Approval', cell: x => x.approved_by ? `Approved ${x.approved_at?.slice(0, 10)}` : can(session, 'practice.approve') && x.recorded_by !== session.actor_id ? <button type="button" disabled={busy} onClick={() => void run(() => vendorCall(`/methodologies/${x.id}/approve`, {}), 'Methodology approved.')}>Approve</button> : 'Awaiting a different approver' }]} />
        : <EmptyState title="No methodology recorded" />}
      {can(session, 'practice.manage') && <form className="panel" aria-label="Record methodology" onSubmit={(ev: FormEvent) => { ev.preventDefault(); void run(() => vendorCall('/practice/methodologies', { version: mv,
        likelihood_scale: [1, 2, 3, 4, 5].map(value => ({ value, label: ['Rare', 'Unlikely', 'Possible', 'Likely', 'Almost certain'][value - 1], description: `Likelihood level ${value}.` })),
        impact_scale: [1, 2, 3, 4, 5].map(value => ({ value, label: ['Minimal', 'Minor', 'Moderate', 'Major', 'Severe'][value - 1], description: `Impact level ${value} on Data Principals.` })),
        matrix: DEFAULT_MATRIX, residual_steps: { EFFECTIVE: 2, PARTIALLY_EFFECTIVE: 1, INEFFECTIVE: 0, NOT_ASSESSED: 0 },
        severity_rules: 'Severity follows the residual rating of the risk the finding evidences, raised one level where many Data Principals or a long duration are affected.',
        considerations: ['Number of Data Principals affected', 'Duration of the condition', 'Uncertainty in the evidence'] }), 'Methodology recorded.'); }}>
        <TextField label="Methodology version label" value={mv} onChange={setMv} required /><button type="submit" disabled={busy}>Record methodology</button></form>}
    </section>
  </>;
}
export default function Page() { return <VendorArea capability="engagements.read">{s => <Practice session={s} />}</VendorArea>; }
