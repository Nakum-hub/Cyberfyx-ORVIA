'use client';
import { useState, type FormEvent } from 'react';
import { NoticeBox, TextField, useHydrated } from '../../../components/shared/ui.tsx';
import { BrandSignIn } from '../../../components/shared/brand-sign-in.tsx';

/**
 * Owner recovery (OPEN-07, migration 0074). When the organisation's owner has lost their password or authenticator, someone
 * with administrator access to the ORVIA server issues a one-time code there (`pnpm run owner:recovery-code`). The owner enters
 * it here with a new password; the old authenticator is removed and a new one is set up at the next sign-in. Cyberfyx cannot
 * recover a customer's owner login: there is no vendor recovery key.
 */
export default function OwnerRecovery() {
  const hydrated = useHydrated();
  const [f, setF] = useState({ email: '', code: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [done, setDone] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF(x => ({ ...x, [k]: v }));

  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setError(null);
    if (f.password.length < 16) return setError('The new password must be at least 16 characters.');
    if (f.password !== f.confirm) return setError('The passwords do not match.');
    setBusy(true);
    try {
      const response = await fetch('/api/v1/setup/owner-recovery', { method: 'POST', headers: { 'content-type': 'application/json' }, credentials: 'omit',
        body: JSON.stringify({ email: f.email.trim(), recovery_code: f.code, new_password: f.password }) });
      if (response.status === 200) { setDone(true); return; }
      const body = await response.json().catch(() => ({})) as { error?: { field_errors?: { code: string }[] } };
      const code = body.error?.field_errors?.[0]?.code;
      setError(code === 'recovery_not_accepted' ? 'Those details were not accepted. Check the email and the code. A code lasts 30 minutes, works once and locks after five wrong tries; if in doubt, ask for a new code to be issued on the ORVIA server.'
        : response.status === 400 ? 'Some details are not valid. Check the email address and that the password has 16 to 128 characters.' : 'Recovery could not be completed.');
    } catch { setError('The ORVIA server is not answering; recovery may not have completed. Try signing in with the new password.'); }
    finally { setBusy(false); }
  }

  if (done) return <BrandSignIn area="Recover the owner login"><NoticeBox tone="ok" title="Owner access recovered"><p>Sign in with your new password and set up a new authenticator: the old one was removed, and every earlier session of this login has ended. The recovery is recorded in the audit trail.</p><p><a href="/workspace/sign-in">Go to sign in</a></p></NoticeBox></BrandSignIn>;
  return (
    <BrandSignIn area="Recover the owner login">
      <form className="panel" onSubmit={submit} aria-label="Owner recovery">
        <p className="muted">For the organisation&apos;s owner only, when the password or authenticator is lost. You need the one-time code issued on the ORVIA server by someone with administrator access to it. Other staff: ask the owner or an administrator to reset your login instead.</p>
        <TextField label="Owner email" type="email" value={f.email} onChange={set('email')} required autoComplete="username" />
        <TextField label="Recovery code" value={f.code} onChange={set('code')} required autoComplete="off" />
        <TextField label="New password" type="password" value={f.password} onChange={set('password')} required autoComplete="new-password" hint="16 to 128 characters." />
        <TextField label="Confirm new password" type="password" value={f.confirm} onChange={set('confirm')} required autoComplete="new-password" />
        {error ? <NoticeBox tone="stop" title="Not recovered"><p>{error}</p></NoticeBox> : null}
        <button className="primary" type="submit" disabled={!hydrated || busy}>{busy ? 'Recovering…' : 'Recover owner login'}</button>
      </form>
    </BrandSignIn>
  );
}
