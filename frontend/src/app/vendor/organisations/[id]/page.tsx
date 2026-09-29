'use client';
import { use, useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, Facts, NoticeBox, SelectField, TextField } from '../../../../components/shared/ui.tsx';
import { VendorArea, vendorCall, explain, can, type VendorSession } from '../../../../components/vendor/vendor.tsx';

type Org = { id: string; name: string; registered_address: string | null; licence_state: string; created_at: string;
  contacts: { id: string; name: string; email: string; designation: string }[]; accounts: { user_id: string; name: string; email: string; active: boolean; mfa_enrolled: boolean; created_at: string }[];
  licences: { licence_id: string; installation_id: string; plan_option: string; member_seats: number; valid_from: string; valid_to: string; issued_at: string }[] };
function Detail({ id, session }: { id: string; session: VendorSession }) {
  const [org, setOrg] = useState<Org | null>(null); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '', designation: '' }); const [account, setAccount] = useState({ name: '', email: '' }); const [issued, setIssued] = useState<string | null>(null);
  const load = useCallback(() => vendorCall<Org>(`/organisations/${id}`).then(setOrg).catch(e => setError(explain(e))), [id]);
  useEffect(() => { void load(); }, [load]);
  const manage = can(session, 'organisations.manage');
  const run = async (work: () => Promise<void>) => { setBusy(true); setError(null); try { await work(); await load(); } catch (e) { setError(explain(e)); } finally { setBusy(false); } };
  if (!org) return error ? <NoticeBox tone="stop" title="Organisation unavailable"><p>{error}</p></NoticeBox> : <p role="status">Loading…</p>;
  return <>
    <div className="page-head"><p className="eyebrow"><a href="/vendor/organisations">Organisations</a></p><h2>{org.name}</h2></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    <Facts items={[{ term: 'Registered address', value: org.registered_address ?? 'Not recorded' }, { term: 'Licence', value: org.licence_state }, { term: 'Added', value: org.created_at.slice(0, 10) }]} />
    <h3>Designated contacts</h3>
    <DataTable caption="Designated contacts" rowKey={c => c.id} rows={org.contacts} columns={[{ key: 'n', header: 'Name', cell: c => c.name }, { key: 'e', header: 'Email', cell: c => c.email }, { key: 'd', header: 'Designation', cell: c => c.designation.replaceAll('_', ' ') }]} />
    {manage && <form className="panel" aria-label="Add contact" onSubmit={(e: FormEvent) => { e.preventDefault(); void run(async () => { await vendorCall(`/organisations/${id}/contacts`, contact); setContact({ name: '', email: '', designation: '' }); }); }}>
      <TextField label="Contact name" value={contact.name} onChange={v => setContact(c => ({ ...c, name: v }))} required /><TextField label="Contact email" type="email" value={contact.email} onChange={v => setContact(c => ({ ...c, email: v }))} required />
      <SelectField label="Designation" value={contact.designation} onChange={v => setContact(c => ({ ...c, designation: v }))} required options={['PRIMARY', 'BILLING', 'SECURITY', 'DPO', 'AUDIT_LIAISON'].map(v => ({ value: v, label: v.replaceAll('_', ' ') }))} />
      <button type="submit" disabled={busy}>Add contact</button></form>}
    <h3>Vendor accounts (audit package upload)</h3>
    <p className="muted">These logins can only upload audit evidence packages with an engagement code. They are not logins of the client&apos;s own ORVIA installation, which the vendor never holds.</p>
    {issued && <NoticeBox tone="warn" title="One-time password — shown once"><code>{issued}</code><p><button type="button" onClick={() => setIssued(null)}>I have handed it over</button></p></NoticeBox>}
    <DataTable caption="Vendor accounts" rowKey={a => a.user_id} rows={org.accounts} columns={[{ key: 'n', header: 'Name', cell: a => a.name }, { key: 'e', header: 'Email', cell: a => a.email }, { key: 's', header: 'State', cell: a => a.active ? (a.mfa_enrolled ? 'Active' : 'Awaiting first sign-in') : 'Inactive' }]} />
    {manage && <form className="panel" aria-label="Create vendor account" onSubmit={(e: FormEvent) => { e.preventDefault(); void run(async () => { const r = await vendorCall<{ one_time_password: string }>(`/organisations/${id}/accounts`, account); setIssued(r.one_time_password); setAccount({ name: '', email: '' }); }); }}>
      <TextField label="Account holder name" value={account.name} onChange={v => setAccount(a => ({ ...a, name: v }))} required /><TextField label="Account email" type="email" value={account.email} onChange={v => setAccount(a => ({ ...a, email: v }))} required />
      <button type="submit" disabled={busy}>Create vendor account</button></form>}
    <h3>Licences</h3>
    <DataTable caption="Licences issued" rowKey={l => l.licence_id} rows={org.licences} columns={[{ key: 'i', header: 'Installation', cell: l => <code>{l.installation_id.slice(0, 8)}</code> }, { key: 'p', header: 'Plan option', cell: l => l.plan_option },
      { key: 's', header: 'Member seats', cell: l => l.member_seats }, { key: 'v', header: 'Valid', cell: l => `${l.valid_from.slice(0, 10)} → ${l.valid_to.slice(0, 10)}` }]} />
  </>;
}
export default function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = use(params); return <VendorArea capability="organisations.read">{s => <Detail id={id} session={s} />}</VendorArea>; }
