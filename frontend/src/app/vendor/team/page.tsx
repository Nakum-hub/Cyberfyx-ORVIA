'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { DataTable, NoticeBox, SelectField, TextField } from '../../../components/shared/ui.tsx';
import { TypeToDelete } from '../../../components/shared/type-to-delete.tsx';
import { VendorArea, vendorCall, explain, can, VENDOR_ROLE_LABELS, type VendorSession } from '../../../components/vendor/vendor.tsx';

type Member = { user_id: string; name: string; email: string; role: string; active: boolean; deleted: boolean; mfa_enrolled: boolean; must_change_password: boolean; password_set: boolean; setup_code_expires_at: string | null; created_at: string };

function Team({ session }: { session: VendorSession }) {
  const [members, setMembers] = useState<Member[] | null>(null); const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: '', password_mode: 'SETUP_CODE', password: '' }); const [issued, setIssued] = useState<{ email: string; secret: string; kind: 'password' | 'code'; expires: string | null } | null>(null);
  const [deleting, setDeleting] = useState<Member | null>(null); const [busy, setBusy] = useState(false);
  const [licence, setLicence] = useState<{ state: string; member_seats: number | null; members_active: number; valid_to: string | null; note: string } | null>(null);
  const [licenceText, setLicenceText] = useState('');
  const load = useCallback(() => Promise.all([
    vendorCall<{ members: Member[] }>('/team').then(r => setMembers(r.members)),
    vendorCall<{ state: string; member_seats: number | null; members_active: number; valid_to: string | null; note: string }>('/service-licence').then(setLicence),
  ]).catch(e => setError(explain(e))), []);
  async function importLicence(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    try { const parsed = JSON.parse(licenceText) as { licence?: unknown }; await vendorCall('/service-licence', { licence: parsed.licence ?? parsed }); setLicenceText(''); await load(); }
    catch (e) { setError(e instanceof SyntaxError ? 'That is not a licence file. Paste the whole file exactly as issued.' : explain(e)); } finally { setBusy(false); }
  }
  useEffect(() => { void load(); }, [load]);
  const manage = can(session, 'vendor.team.manage');
  async function create(event: FormEvent) {
    event.preventDefault(); setError(null); setBusy(true);
    try {
      const body = { name: form.name, email: form.email, role: form.role, password_mode: form.password_mode, ...(form.password_mode === 'ADMIN_SET' ? { password: form.password } : {}) };
      const r = await vendorCall<{ member: Member; one_time_password: string | null; setup_code: string | null; setup_code_expires_at: string | null }>('/team', body);
      if (r.setup_code) setIssued({ email: r.member.email, secret: r.setup_code, kind: 'code', expires: r.setup_code_expires_at });
      else if (r.one_time_password) setIssued({ email: r.member.email, secret: r.one_time_password, kind: 'password', expires: null });
      setForm({ name: '', email: '', role: '', password_mode: 'SETUP_CODE', password: '' }); await load();
    }
    catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }
  async function issueCode(m: Member) {
    setError(null); setBusy(true);
    try { const r = await vendorCall<{ setup_code: string; expires_at: string }>(`/team/${m.user_id}/setup-code`, { valid_hours: 72 }); setIssued({ email: m.email, secret: r.setup_code, kind: 'code', expires: r.expires_at }); await load(); }
    catch (e) { setError(explain(e)); } finally { setBusy(false); }
  }
  const act = async (path: string, body: unknown = {}) => { setError(null); setBusy(true); try { await vendorCall(path, body); await load(); } catch (e) { setError(explain(e)); } finally { setBusy(false); } };
  const roles = [{ value: 'LEAD_AUDITOR', label: 'Lead auditor' }, { value: 'AUDITOR', label: 'Auditor' }, { value: 'AUDIT_REVIEWER', label: 'Audit reviewer' }, ...(session.role === 'VENDOR_SUPER_ADMIN' ? [{ value: 'VENDOR_ADMIN', label: 'Vendor administrator' }] : [])];
  return <>
    <div className="page-head"><h2>Vendor team</h2><p>Vendor logins live in this central vendor service, so a member who reinstalls ORVIA on their device just signs in again. Every login needs an authenticator. A new member's first password is set by you now, or by the member once with a one-time setup code.</p></div>
    {error && <div className="notice notice-stop" role="alert">{error}</div>}
    {licence && <NoticeBox tone={licence.state === 'ACTIVE' ? 'info' : 'warn'} title={licence.state === 'ACTIVE' ? `Vendor service licence: ${licence.members_active} of ${licence.member_seats} member logins in use` : licence.state === 'EXPIRED' ? 'Vendor service licence expired' : 'No vendor service licence imported'}>
      <p>{licence.note}{licence.valid_to ? ` Valid until ${new Date(licence.valid_to).toLocaleDateString()}.` : ''} This licence is the company's own and is separate from the licences issued to client organisations.</p>
      {session.role === 'VENDOR_SUPER_ADMIN' && <form onSubmit={importLicence}><label className="field"><span className="label">Import a vendor service licence</span>
        <textarea rows={3} value={licenceText} onChange={e => setLicenceText(e.target.value)} spellCheck={false} maxLength={8000} required /></label>
        <button type="submit" disabled={busy}>Import</button></form>}
    </NoticeBox>}
    {issued && <NoticeBox tone="warn" title={issued.kind === 'code' ? 'Setup code — shown once' : 'One-time password — shown once'}>
      {issued.kind === 'code'
        ? <p>Give it privately to {issued.email}. They open <a href="/vendor/account-setup">Set your password</a>, enter their work email and this code, and choose their password. It works once{issued.expires ? <> and expires {new Date(issued.expires).toLocaleString()}</> : null}.</p>
        : <p>Give it privately to {issued.email}. It stops working once they replace it.</p>}
      <code>{issued.secret}</code><p><button type="button" onClick={() => setIssued(null)}>I have handed it over</button></p></NoticeBox>}
    {members ? <DataTable caption="Vendor logins" rowKey={m => m.user_id} rows={members} columns={[
      { key: 'name', header: 'Name', cell: m => m.name }, { key: 'email', header: 'Email', cell: m => m.email }, { key: 'role', header: 'Role', cell: m => VENDOR_ROLE_LABELS[m.role] ?? m.role },
      { key: 'state', header: 'State', cell: m => m.deleted ? 'Deleted' : !m.active ? 'Deactivated' : !m.password_set ? (m.setup_code_expires_at ? `Waiting to set password (code expires ${new Date(m.setup_code_expires_at).toLocaleDateString()})` : 'No password yet: issue a setup code') : m.must_change_password ? 'Awaiting first sign-in' : m.mfa_enrolled ? 'Active' : 'Active, no authenticator yet' },
      { key: 'actions', header: 'Actions', cell: m => manage && !m.deleted && m.user_id !== session.actor_id && m.role !== 'VENDOR_SUPER_ADMIN' ? <span className="row">
        <button type="button" disabled={busy} onClick={() => void act(`/team/${m.user_id}/${m.active ? 'deactivate' : 'reactivate'}`)}>{m.active ? 'Deactivate' : 'Reactivate'}</button>
        {m.active && <button type="button" disabled={busy} onClick={() => void issueCode(m)}>{m.password_set ? 'Reset with setup code' : 'Issue setup code'}</button>}
        <button type="button" className="danger" disabled={busy} onClick={() => setDeleting(m)}>Delete login</button></span> : '—' }]} /> : <p role="status">Loading…</p>}
    {manage && <form className="panel" onSubmit={create} style={{ maxWidth: 560 }} aria-label="Add vendor member">
      <h3>Add a vendor member</h3>
      <TextField label="Name" value={form.name} onChange={v => setForm(f => ({ ...f, name: v }))} required />
      <TextField label="Email" type="email" value={form.email} onChange={v => setForm(f => ({ ...f, email: v }))} required />
      <SelectField label="Role" value={form.role} onChange={v => setForm(f => ({ ...f, role: v }))} options={roles} required />
      <SelectField label="First password" value={form.password_mode} onChange={v => setForm(f => ({ ...f, password_mode: v }))} required options={[
        { value: 'SETUP_CODE', label: 'The member sets it with a one-time setup code' }, { value: 'ADMIN_SET', label: 'I set it now' }, { value: 'ONE_TIME_PASSWORD', label: 'Generate a one-time password they must change' }]} />
      {form.password_mode === 'ADMIN_SET' && <TextField label="Password (at least 12 characters)" type="password" value={form.password} onChange={v => setForm(f => ({ ...f, password: v }))} required />}
      <button className="primary" type="submit" disabled={busy}>Create login</button>
    </form>}
    {deleting && <TypeToDelete title={`Delete ${deleting.name}'s login`} busy={busy} onCancel={() => setDeleting(null)} onConfirm={confirmation => { const m = deleting; setDeleting(null); void act(`/team/${m.user_id}/delete`, { confirmation }); }}>
      <p>The login can never sign in again. Records that name it are kept.</p></TypeToDelete>}
  </>;
}
export default function Page() { return <VendorArea capability="vendor.team.read">{s => <Team session={s} />}</VendorArea>; }
