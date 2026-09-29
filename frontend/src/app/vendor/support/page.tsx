'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, SelectField, TextField } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, type VendorSession } from '../../../components/vendor/vendor.tsx';

type Case = { id: string; organisation_name: string; category: string; summary: string; urgency: string; state: string; created_at: string };
/** Support cases hold a category, a summary and an urgency; there is no remote session and no operational data. */
function Support({ session }: { session: VendorSession }) {
  const [cases, setCases] = useState<Case[] | null>(null); const [orgs, setOrgs] = useState<{ id: string; name: string }[]>([]); const [error, setError] = useState<string | null>(null);
  const [f, setF] = useState({ organisation_id: '', category: '', summary: '', urgency: 'NORMAL' }); const [busy, setBusy] = useState(false);
  const load = useCallback(() => vendorCall<{ items: Case[] }>('/support-cases').then(r => setCases(r.items)).catch(e => setError(explain(e))), []);
  useEffect(() => { void load(); vendorCall<{ items: { id: string; name: string }[] }>('/organisations').then(r => setOrgs(r.items)).catch(() => {}); }, [load]);
  async function create(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null); try { await vendorCall('/support-cases', f); setF({ organisation_id: '', category: '', summary: '', urgency: 'NORMAL' }); await load(); } catch (e) { setError(explain(e)); } finally { setBusy(false); } }
  return <>
    <div className="page-head"><h2>Support cases</h2><p>No remote sessions into client installations and no upload of their operational data. A client shares anything else only through its own approved support exchange.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    {cases ? <DataTable caption="Support cases" rowKey={c => c.id} rows={cases} columns={[{ key: 'o', header: 'Organisation', cell: c => c.organisation_name }, { key: 'c', header: 'Category', cell: c => c.category.replaceAll('_', ' ') },
      { key: 's', header: 'Summary', cell: c => c.summary }, { key: 'u', header: 'Urgency', cell: c => c.urgency }, { key: 't', header: 'State', cell: c => c.state.replaceAll('_', ' ') }]} /> : <p role="status">Loading…</p>}
    {can(session, 'support.manage') && <form className="panel" onSubmit={create} style={{ maxWidth: 560 }} aria-label="Open support case">
      <SelectField label="Organisation" value={f.organisation_id} onChange={v => setF(x => ({ ...x, organisation_id: v }))} options={orgs.map(o => ({ value: o.id, label: o.name }))} required />
      <SelectField label="Category" value={f.category} onChange={v => setF(x => ({ ...x, category: v }))} options={['INSTALLATION', 'LICENCE', 'UPGRADE', 'AUDIT_EXCHANGE', 'OTHER'].map(v => ({ value: v, label: v.replaceAll('_', ' ') }))} required />
      <TextField label="Summary" value={f.summary} onChange={v => setF(x => ({ ...x, summary: v }))} required />
      <SelectField label="Urgency" value={f.urgency} onChange={v => setF(x => ({ ...x, urgency: v }))} options={['LOW', 'NORMAL', 'HIGH'].map(v => ({ value: v, label: v }))} required />
      <button className="primary" type="submit" disabled={busy}>Open case</button></form>}
  </>;
}
export default function Page() { return <VendorArea capability="support.read">{s => <Support session={s} />}</VendorArea>; }
