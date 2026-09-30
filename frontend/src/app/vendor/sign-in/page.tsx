'use client';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { vendorAuthClient, accountAuthClient } from '@orvia/auth/client';
import { NoticeBox, TextField, useHydrated } from '../../../components/shared/ui.tsx';
import { useVendorSession, VENDOR_ROLE_LABELS } from '../../../components/vendor/vendor.tsx';

/**
 * One sign-in page for the vendor installation, reached from the ORVIA
 * interface or from the vendor website's "Vendor / Auditor login" link: the
 * same deployment and the same session either way. Vendor staff sign in only
 * here, never on a client installation. ?account=client switches to a client
 * organisation's vendor-account login, which can only upload audit packages.
 */
export default function VendorSignIn() {
  const hydrated = useHydrated();
  const { session, status } = useVendorSession();
  const [client, setClient] = useState(false);
  useEffect(() => { setClient(new URLSearchParams(globalThis.location.search).get('account') === 'client'); }, []);
  const auth = client ? accountAuthClient : vendorAuthClient; const base = client ? '/api/auth/account' : '/api/auth/vendor';
  const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [code, setCode] = useState('');
  const [step, setStep] = useState<'password' | 'challenge' | 'replace' | 'enroll'>('password');
  const [chosen, setChosen] = useState(''); const [confirm, setConfirm] = useState(''); const oneTime = useRef('');
  const [enrollment, setEnrollment] = useState<{ totpURI: string; backupCodes: string[] } | null>(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null);
    try {
      if (step === 'password') {
        const result = await auth.signIn.email({ email, password, rememberMe: false });
        if (result.error) throw new Error('Sign-in details were not accepted.');
        const data = result.data;
        if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect === true) { setPassword(''); setStep('challenge'); return; }
        oneTime.current = password;
        const state = await fetch(`${base}/orvia/password-state`, { credentials: 'same-origin', cache: 'no-store' });
        if (state.ok && (await state.json() as { must_change_password?: boolean }).must_change_password === true) { setPassword(''); setStep('replace'); return; }
        oneTime.current = ''; setStep('enroll');
      } else if (step === 'replace') {
        if (chosen.length < 16) throw new Error('Choose a password of at least 16 characters.');
        if (chosen !== confirm) throw new Error('The two passwords do not match.');
        const result = await auth.changePassword({ currentPassword: oneTime.current, newPassword: chosen, revokeOtherSessions: false });
        setConfirm('');
        if (result.error) throw new Error('The new password was not accepted.');
        oneTime.current = ''; setPassword(chosen); setChosen(''); setStep('enroll');
      } else if (step === 'enroll' && !enrollment) {
        const result = await auth.twoFactor.enable({ password, method: 'totp' });
        setPassword('');
        if (result.error || !result.data || result.data.method !== 'totp') throw new Error('Authenticator set-up was not accepted. Check your password.');
        setEnrollment(result.data);
      } else {
        const result = await auth.twoFactor.verifyTotp({ code, trustDevice: false }); setCode('');
        if (result.error) throw new Error('The authenticator code was not accepted.');
        setEnrollment(null);
        // The destination reads its session. A reload here starts a read on the
        // departing document, which WebKit can refuse during navigation.
        globalThis.location.assign(client ? '/vendor/upload' : '/vendor/engagements');
      }
    } catch (e) { setError(e instanceof TypeError ? 'The vendor installation is not answering; the outcome is unknown.' : e instanceof Error ? e.message : 'Sign in could not be completed.'); }
    finally { setBusy(false); }
  }
  if (status === 'signed-in' && session) return <NoticeBox tone="ok" title="Signed in"><p>{session.name} — {VENDOR_ROLE_LABELS[session.role] ?? session.role}</p><a href={session.actor_domain === 'CLIENT_ACCOUNT' ? '/vendor/upload' : '/vendor/engagements'}>Continue</a></NoticeBox>;
  return <>
    <div className="page-head"><h2>{client ? 'Client account sign in' : 'Vendor / auditor sign in'}</h2>
      <p>{client ? 'For client organisations uploading an audit evidence package with the engagement code their auditor gave them.' : 'Vendor staff and auditors sign in here, on the vendor\'s own installation only. An authenticator is required for every vendor login.'}</p>
      <p>{client ? <a href="/vendor/sign-in">Vendor staff sign in instead</a> : <a href="/vendor/sign-in?account=client">Client account sign in instead</a>}</p></div>
    <form className="panel" onSubmit={submit} style={{ maxWidth: 560 }} aria-label={client ? 'Client account sign in' : 'Vendor sign in'}>
      {step === 'password' ? <><TextField label="Email" type="email" value={email} onChange={setEmail} required autoComplete="username" /><TextField label="Password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" /></> : null}
      {step === 'replace' ? <><h3>Choose your own password</h3><p>Replace the one-time password you were given. Next you will set up your authenticator.</p><TextField label="New password" type="password" value={chosen} onChange={setChosen} required autoComplete="new-password" /><TextField label="Confirm new password" type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" /></> : null}
      {step === 'enroll' ? <><h3>Set up your authenticator</h3>{!enrollment ? <TextField label="Current password for authenticator set-up" type="password" value={password} onChange={setPassword} required autoComplete="current-password" /> : <><p>Add this to your authenticator app, then enter the code it shows. Keep the recovery codes private.</p><details><summary>Show authenticator set-up and recovery codes</summary><code style={{ overflowWrap: 'anywhere' }}>{enrollment.totpURI}</code><ul>{enrollment.backupCodes.map(c => <li key={c}><code>{c}</code></li>)}</ul></details></>}</> : null}
      {step === 'challenge' || enrollment ? <TextField label="Authenticator code" value={code} onChange={setCode} required autoComplete="one-time-code" inputMode="numeric" maxLength={6} /> : null}
      {error ? <div className="notice notice-stop" role="alert">{error}</div> : null}
      <button className="primary" type="submit" disabled={!hydrated || busy}>{busy ? 'Checking…' : step === 'password' ? 'Sign in' : step === 'replace' ? 'Save new password' : step === 'enroll' && !enrollment ? 'Set up authenticator' : 'Verify authenticator'}</button>
    </form>
    <p className="meta">New vendor installation? <a href="/vendor/setup">First-run setup</a></p>
  </>;
}
