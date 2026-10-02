'use client';
import { useState, type FormEvent } from 'react';
import { NoticeBox, TextField } from '../../../components/shared/ui.tsx';

/**
 * Revision 1.13: a vendor member sets their password once, with the one-time setup code an administrator gave them (also
 * used for an administrator-initiated reset). After this the member only signs in: reinstalling ORVIA on their device does
 * not ask for a password again, because the account lives in the central vendor service.
 */
export default function AccountSetup() {
  const [f, setF] = useState({ email: '', code: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(null);
    if (f.password.length < 12) return setError('Your password must be at least 12 characters.');
    if (f.password !== f.confirm) return setError('The two passwords do not match.');
    setBusy(true);
    try {
      const r = await fetch('/api/v1/vendor/account-setup', { method: 'POST', credentials: 'omit', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: f.email.trim(), setup_code: f.code.trim(), new_password: f.password }) });
      if (r.ok) { setDone(true); return; }
      setError(r.status === 403 ? 'That email and setup code were not accepted. Check both; codes work once, expire, and lock after five wrong attempts. Ask your administrator for a new code if needed.' : 'Your password could not be set. Try again.');
    } catch { setError('The vendor service is not answering. Try again in a moment.'); } finally { setBusy(false); }
  }
  if (done) return <NoticeBox tone="ok" title="Password set"><p>Sign in with your work email and new password, then set up your authenticator. Next time, including after reinstalling ORVIA, you only sign in.</p><a href="/vendor/sign-in">Go to vendor sign in</a></NoticeBox>;
  return <>
    <div className="page-head"><h2>Set your password</h2><p>Use the one-time setup code your administrator gave you. Already set your password? <a href="/vendor/sign-in">Sign in</a> instead.</p></div>
    <form className="panel" onSubmit={submit} style={{ maxWidth: 520 }} aria-label="Set your vendor password">
      <TextField label="Work email" type="email" value={f.email} onChange={set('email')} required autoComplete="username" />
      <TextField label="Setup code" value={f.code} onChange={set('code')} required autoComplete="off" />
      <TextField label="New password (at least 12 characters)" type="password" value={f.password} onChange={set('password')} required autoComplete="new-password" />
      <TextField label="Repeat the new password" type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" />
      {error && <NoticeBox tone="stop" title="Not set"><p>{error}</p></NoticeBox>}
      <button className="primary" type="submit" disabled={busy}>Set password</button>
    </form>
  </>;
}
