'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, TextField } from '../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, type VendorSession } from '../../../components/vendor/vendor.tsx';

type Org = { id: string; name: string; registered_address: string | null; licence_state: string; created_at: string };
function Organisations({ session }: { session: VendorSession }) {
  const [items, setItems] = useState<Org[] | null>(null); const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(''); const [address, setAddress] = useState(''); const [busy, setBusy] = useState(false);
  const load = useCallback(() => vendorCall<{ items: Org[] }>('/organisations').then(r => setItems(r.items)).catch(e => setError(explain(e))), []);
  useEffect(() => { void load(); }, [load]);
  async function create(event: FormEvent) { event.preventDefault(); setBusy(true); setError(null);
    try { const o = await vendorCall<Org>('/organisations', { name, registered_address: address.trim() || null }); globalThis.location.assign(`/vendor/organisations/${o.id}`); } catch (e) { setError(explain(e)); } finally { setBusy(false); } }
  return <>
    <div className="page-head"><h2>Organisations</h2><p>Client organisations: business details, designated contacts, licences and vendor accounts only. No operational data, no staff monitoring, no remote sessions.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    {items ? <DataTable caption="Client organisations" rowKey={o => o.id} rows={items} columns={[{ key: 'name', header: 'Organisation', cell: o => <a href={`/vendor/organisations/${o.id}`}>{o.name}</a> },
      { key: 'licence', header: 'Licence', cell: o => o.licence_state }, { key: 'created', header: 'Added', cell: o => o.created_at.slice(0, 10) }]} /> : <p role="status">Loading…</p>}
    {can(session, 'organisations.manage') && <form className="panel" onSubmit={create} style={{ maxWidth: 560 }} aria-label="Add organisation"><h3>Add an organisation</h3>
      <TextField label="Organisation name" value={name} onChange={setName} required /><TextField label="Registered address" value={address} onChange={setAddress} />
      <button className="primary" type="submit" disabled={busy}>Add organisation</button></form>}
  </>;
}
export default function Page() { return <VendorArea capability="organisations.read">{s => <Organisations session={s} />}</VendorArea>; }
