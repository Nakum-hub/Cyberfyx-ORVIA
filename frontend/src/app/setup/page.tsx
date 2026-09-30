'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { NoticeBox, TextField, useHydrated } from '../../components/shared/ui.tsx';

type State = 'OPEN' | 'NO_CODE_ISSUED' | 'LOCKED' | 'EXPIRED' | 'COMPLETED';
const CLOSED: Record<Exclude<State, 'OPEN'>, { title: string; body: string }> = {
  COMPLETED: { title: 'This installation is already set up', body: 'Sign in with your staff login.' },
  NO_CODE_ISSUED: { title: 'No setup code has been issued', body: 'Run the installer\'s setup-code step on the machine where ORVIA is installed, then come back.' },
  LOCKED: { title: 'Setup is locked', body: 'Too many wrong setup codes were entered. Issue a new code from the installer on the ORVIA machine.' },
  EXPIRED: { title: 'The setup code has expired', body: 'Issue a new code from the installer on the ORVIA machine; each code is valid for 24 hours.' },
};

/**
 * First-run setup: whoever holds the installer's one-time code creates the
 * organisation, its owner and its administrator, with passwords of their own.
 */
export default function FirstRunSetup() {
  const hydrated = useHydrated();
  const [state, setState] = useState<State | null>(null);
  const [f, setF] = useState({ code: '', org: '', ownerName: '', ownerEmail: '', ownerPassword: '', ownerConfirm: '', adminName: '', adminEmail: '', adminPassword: '', adminConfirm: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));
  useEffect(() => { fetch('/api/v1/setup', { cache: 'no-store' }).then(r => r.json()).then((d: { state: State }) => setState(d.state)).catch(() => setError('The local ORVIA server is not answering.')); }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(null);
    if (f.ownerPassword.length < 16 || f.adminPassword.length < 16) return setError('Each password must be at least 16 characters.');
    if (f.ownerPassword !== f.ownerConfirm) return setError('The owner passwords do not match.');
    if (f.adminPassword !== f.adminConfirm) return setError('The administrator passwords do not match.');
    if (f.ownerEmail.trim().toLowerCase() === f.adminEmail.trim().toLowerCase()) return setError('The owner and the administrator need different email addresses.');
    setBusy(true);
    try {
      const response = await fetch('/api/v1/setup', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit', body: JSON.stringify({
        setup_code: f.code, organisation_name: f.org,
        owner: { name: f.ownerName, email: f.ownerEmail.trim(), password: f.ownerPassword },
        admin: { name: f.adminName, email: f.adminEmail.trim(), password: f.adminPassword } }) });
      if (response.status === 201) { setDone(true); return; }
      const body = await response.json().catch(() => ({})) as { error?: { field_errors?: { code: string }[] } };
      const code = body.error?.field_errors?.[0]?.code;
      setError(code === 'setup_code_not_accepted' ? 'That setup code was not accepted. Check it on the installer console; after five wrong attempts setup locks.'
        : code === 'setup_code_locked' ? CLOSED.LOCKED.body : code === 'setup_code_expired' ? CLOSED.EXPIRED.body
        : code === 'email_in_use' ? 'One of these email addresses is already used by a login.' : code === 'setup_already_completed' ? CLOSED.COMPLETED.body
        : response.status === 400 ? 'Some details are not valid. Check the email addresses and that each password has 16 to 128 characters.' : 'Setup could not be completed.');
    } catch { setError('The local ORVIA server is not answering; setup may not have completed. Reload to check.'); }
    finally { setBusy(false); }
  }

  if (done) return <NoticeBox tone="ok" title="ORVIA is set up"><p>Sign in as the owner and set up your authenticator. Give the administrator their password privately; they set up their own authenticator at first sign-in.</p><a href="/workspace/sign-in">Go to staff sign in</a></NoticeBox>;
  if (state === null) return error ? <NoticeBox tone="stop" title="Cannot reach ORVIA"><p>{error}</p></NoticeBox> : <p>Checking this installation…</p>;
  if (state !== 'OPEN') return <NoticeBox tone={state === 'COMPLETED' ? 'ok' : 'warn'} title={CLOSED[state].title}><p>{CLOSED[state].body}</p>{state === 'COMPLETED' && <a href="/workspace/sign-in">Go to staff sign in</a>}</NoticeBox>;
  return (
    <>
      <div className="page-head"><h2>Set up ORVIA</h2><p>Create your organisation&apos;s owner and administrator logins. You need the one-time setup code shown by the installer on the ORVIA machine.</p></div>
      <form className="panel" onSubmit={submit} style={{ maxWidth: 640 }} aria-label="First-run setup">
        <TextField label="Setup code" value={f.code} onChange={set('code')} required autoComplete="off" />
        <TextField label="Organisation name" value={f.org} onChange={set('org')} required />
        <h3>Owner (super administrator)</h3>
        <TextField label="Owner name" value={f.ownerName} onChange={set('ownerName')} required />
        <TextField label="Owner email" type="email" value={f.ownerEmail} onChange={set('ownerEmail')} required autoComplete="off" />
        <TextField label="Owner password" type="password" value={f.ownerPassword} onChange={set('ownerPassword')} required autoComplete="new-password" />
        <TextField label="Confirm owner password" type="password" value={f.ownerConfirm} onChange={set('ownerConfirm')} required autoComplete="new-password" />
        <h3>Administrator</h3>
        <TextField label="Administrator name" value={f.adminName} onChange={set('adminName')} required />
        <TextField label="Administrator email" type="email" value={f.adminEmail} onChange={set('adminEmail')} required autoComplete="off" />
        <TextField label="Administrator password" type="password" value={f.adminPassword} onChange={set('adminPassword')} required autoComplete="new-password" />
        <TextField label="Confirm administrator password" type="password" value={f.adminConfirm} onChange={set('adminConfirm')} required autoComplete="new-password" />
        {error && <div className="notice notice-stop" role="alert">{error}</div>}
        <button className="primary" type="submit" disabled={!hydrated || busy}>{busy ? 'Setting up…' : 'Create owner and administrator'}</button>
      </form>
    </>
  );
}
