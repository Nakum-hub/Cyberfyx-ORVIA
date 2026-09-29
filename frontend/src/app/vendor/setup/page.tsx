'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { NoticeBox, TextField } from '../../../components/shared/ui.tsx';

type State = 'OPEN' | 'NO_CODE_ISSUED' | 'LOCKED' | 'EXPIRED' | 'COMPLETED';
const CLOSED: Record<Exclude<State, 'OPEN'>, { title: string; body: string }> = {
  COMPLETED: { title: 'This vendor installation is already set up', body: 'Sign in with your vendor login.' },
  NO_CODE_ISSUED: { title: 'No setup code has been issued', body: 'Run pnpm run vendor:setup-code on the machine where the vendor installation runs, then come back.' },
  LOCKED: { title: 'Setup is locked', body: 'Too many wrong setup codes were entered. Issue a new code on the vendor machine.' },
  EXPIRED: { title: 'The setup code has expired', body: 'Issue a new code on the vendor machine; each code is valid for 24 hours.' },
};

/** First-run setup of the vendor installation: the holder of the one-time code creates the vendor super administrator and administrator. */
export default function VendorFirstRun() {
  const [state, setState] = useState<State | null>(null);
  const [f, setF] = useState({ code: '', ownerName: '', ownerEmail: '', ownerPassword: '', adminName: '', adminEmail: '', adminPassword: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));
  useEffect(() => { fetch('/api/v1/vendor/setup', { cache: 'no-store' }).then(r => r.json()).then((d: { state: State }) => setState(d.state)).catch(() => setError('The vendor installation is not answering.')); }, []);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(null);
    if (f.ownerPassword.length < 16 || f.adminPassword.length < 16) return setError('Each password must be at least 16 characters.');
    if (f.ownerEmail.trim().toLowerCase() === f.adminEmail.trim().toLowerCase()) return setError('The two logins need different email addresses.');
    setBusy(true);
    try {
      const r = await fetch('/api/v1/vendor/setup', { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ setup_code: f.code,
        owner: { name: f.ownerName, email: f.ownerEmail.trim(), password: f.ownerPassword }, admin: { name: f.adminName, email: f.adminEmail.trim(), password: f.adminPassword } }) });
      if (r.status === 201) { setDone(true); return; }
      const code = ((await r.json().catch(() => ({}))) as { error?: { field_errors?: { code: string }[] } }).error?.field_errors?.[0]?.code;
      setError(code === 'setup_code_not_accepted' ? 'That setup code was not accepted; after five wrong attempts setup locks.' : code === 'email_in_use' ? 'One of these email addresses is already used.' : 'Setup could not be completed.');
    } catch { setError('The vendor installation is not answering; setup may not have completed. Reload to check.'); } finally { setBusy(false); }
  }
  if (done) return <NoticeBox tone="ok" title="Vendor installation set up"><p>Sign in as the super administrator and set up your authenticator.</p><a href="/vendor/sign-in">Go to vendor sign in</a></NoticeBox>;
  if (state === null) return error ? <NoticeBox tone="stop" title="Cannot reach the vendor installation"><p>{error}</p></NoticeBox> : <p>Checking this installation…</p>;
  if (state !== 'OPEN') return <NoticeBox tone={state === 'COMPLETED' ? 'ok' : 'warn'} title={CLOSED[state].title}><p>{CLOSED[state].body}</p>{state === 'COMPLETED' && <a href="/vendor/sign-in">Go to vendor sign in</a>}</NoticeBox>;
  return <>
    <div className="page-head"><h2>Set up the vendor installation</h2><p>Create the vendor super administrator and administrator. You need the one-time code shown on the vendor machine.</p></div>
    <form className="panel" onSubmit={submit} style={{ maxWidth: 640 }} aria-label="Vendor first-run setup">
      <TextField label="Setup code" value={f.code} onChange={set('code')} required autoComplete="off" />
      <h3>Vendor super administrator</h3>
      <TextField label="Super administrator name" value={f.ownerName} onChange={set('ownerName')} required />
      <TextField label="Super administrator email" type="email" value={f.ownerEmail} onChange={set('ownerEmail')} required autoComplete="off" />
      <TextField label="Super administrator password" type="password" value={f.ownerPassword} onChange={set('ownerPassword')} required autoComplete="new-password" />
      <h3>Vendor administrator</h3>
      <TextField label="Administrator name" value={f.adminName} onChange={set('adminName')} required />
      <TextField label="Administrator email" type="email" value={f.adminEmail} onChange={set('adminEmail')} required autoComplete="off" />
      <TextField label="Administrator password" type="password" value={f.adminPassword} onChange={set('adminPassword')} required autoComplete="new-password" />
      {error && <div className="notice notice-stop" role="alert">{error}</div>}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Setting up…' : 'Create vendor logins'}</button>
    </form>
  </>;
}
