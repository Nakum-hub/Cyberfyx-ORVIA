'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, NoticeBox, SelectField, TextField } from '../../../components/shared/ui.tsx';
import { TypeToDelete } from '../../../components/shared/type-to-delete.tsx';
import { VendorArea, vendorCall, explain, can, VENDOR_ROLE_LABELS, type VendorSession } from '../../../components/vendor/vendor.tsx';

type Member = { user_id: string; name: string; email: string; role: string; active: boolean; deleted: boolean; mfa_enrolled: boolean; must_change_password: boolean; created_at: string };

function Team({ session }: { session: VendorSession }) {
  const [members, setMembers] = useState<Member[] | null>(null); const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: '' }); const [issued, setIssued] = useState<{ email: string; password: string } | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null); const [busy, setBusy] = useState(false);
  const load = useCallback(() => vendorCall<{ members: Member[] }>('/team').then(r => setMembers(r.members)).catch(e => setError(explain(e))), []);
  useEffect(() => { void load(); }, [load]);
  const manage = can(session, 'vendor.team.manage');
  async function create(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    try { const r = await vendorCall<{ member: Member; one_time_password: string }>('/team', form); setIssued({ email: r.member.email, password: r.one_time_password }); setForm({ name: '', email: '', role: '' }); await load(); }
    catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }
  const act = async (path: string, body: unknown = {}) => { setError(null); setBusy(true); try { await vendorCall(path, body); await load(); } catch (e) { setError(explain(e)); } finally { setBusy(false); } };
  const roles = [{ value: 'LEAD_AUDITOR', label: 'Lead auditor' }, { value: 'AUDITOR', label: 'Auditor' }, { value: 'AUDIT_REVIEWER', label: 'Audit reviewer' }, ...(session.role === 'VENDOR_SUPER_ADMIN' ? [{ value: 'VENDOR_ADMIN', label: 'Vendor administrator' }] : [])];
  return <>
    <div className="page-head"><h2>Vendor team</h2><p>Vendor logins exist only on this installation. Every login needs an authenticator; a new login gets a one-time password that its holder replaces at first sign-in.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    {issued && <NoticeBox tone="warn" title="One-time password — shown once"><p>Give it privately to {issued.email}. It stops working once they replace it.</p><code>{issued.password}</code><p><button type="button" onClick={() => setIssued(null)}>I have handed it over</button></p></NoticeBox>}
    {members ? <DataTable caption="Vendor logins" rowKey={m => m.user_id} rows={members} columns={[
      { key: 'name', header: 'Name', cell: m => m.name }, { key: 'email', header: 'Email', cell: m => m.email }, { key: 'role', header: 'Role', cell: m => VENDOR_ROLE_LABELS[m.role] ?? m.role },
      { key: 'state', header: 'State', cell: m => m.deleted ? 'Deleted' : !m.active ? 'Deactivated' : m.must_change_password ? 'Awaiting first sign-in' : m.mfa_enrolled ? 'Active' : 'Active, no authenticator yet' },
      { key: 'actions', header: 'Actions', cell: m => manage && !m.deleted && m.user_id !== session.actor_id && m.role !== 'VENDOR_SUPER_ADMIN' ? <span className="row">
        <button type="button" disabled={busy} onClick={() => void act(`/team/${m.user_id}/${m.active ? 'deactivate' : 'reactivate'}`)}>{m.active ? 'Deactivate' : 'Reactivate'}</button>
        <button type="button" className="danger" disabled={busy} onClick={() => setDeleting(m)}>Delete login</button></span> : '—' }]} /> : <p role="status">Loading…</p>}
    {manage && <form className="panel" onSubmit={create} style={{ maxWidth: 560 }} aria-label="Add vendor member">
      <h3>Add a vendor member</h3>
      <TextField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
      <TextField label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
      <SelectField label="Role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={roles} required />
      <button className="primary" type="submit" disabled={busy}>Create login</button>
    </form>}
    {deleting && <TypeToDelete title={`Delete ${deleting.name}'s login`} busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmation => { const m = deleting; setDeleting(null); void act(`/team/${m.user_id}/delete`, { confirmation }); }}>
      <p>The login can never sign in again. Records that name it are kept.</p></TypeToDelete>}
  </>;
}
export default function Page() { return <VendorArea capability="vendor.team.read">{s => <Team session={s} />}</VendorArea>; }
