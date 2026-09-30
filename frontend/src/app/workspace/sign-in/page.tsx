'use client';
import { useRef, useState, type FormEvent } from 'react';
import { staffAuthClient } from '@orvia/auth/client';
import { describeFailure } from '../../../components/shared/errors.ts';
import { call } from '../../../components/shared/api.ts';
import { useSession } from '../../../components/shared/session-context.tsx';
import { NoticeBox, TextField, useHydrated } from '../../../components/shared/ui.tsx';

export default function StaffSignIn() {
  const hydrated = useHydrated();
  const { session, reload } = useSession();
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [code,setCode] = useState(''); const [step,setStep] = useState<'password'|'challenge'|'replace'|'enroll'>('password');
  const [chosen,setChosen] = useState(''); const [confirm,setConfirm] = useState(''); const oneTime = useRef('');
  const [enrollment,setEnrollment] = useState<{totpURI:string;backupCodes:string[]} | null>(null);
  const [busy,setBusy] = useState(false); const [error,setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null);
    try {
      if (step === 'password') {
        const result = await staffAuthClient.signIn.email({email,password,rememberMe:false});
        if (result.error) throw new Error('Sign-in details were not accepted. Try again or check local service availability.');
        oneTime.current = password; setPassword('');
        const data = result.data;
        if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect === true) { oneTime.current = ''; setStep('challenge'); return; }
        // A login created by an administrator must replace its one-time password before anything else.
        const state = await fetch('/api/auth/staff/orvia/password-state', { credentials: 'same-origin', cache: 'no-store' });
        if (state.ok && (await state.json() as { must_change_password?: boolean }).must_change_password === true) { setStep('replace'); return; }
        oneTime.current = '';
        try { await call('session',undefined); reload(); }
        catch (error) { if(describeFailure(error).status === 403) setStep('enroll'); else throw error; }
      } else if (step === 'replace') {
        if (chosen.length < 16) throw new Error('Choose a password of at least 16 characters.');
        if (chosen !== confirm) throw new Error('The two passwords do not match.');
        const result = await staffAuthClient.changePassword({ currentPassword: oneTime.current, newPassword: chosen, revokeOtherSessions: false });
        setConfirm('');
        if (result.error) throw new Error('The new password was not accepted. Choose a different one of at least 16 characters.');
        oneTime.current = ''; setChosen(''); setStep('enroll');
      } else if (step === 'enroll' && !enrollment) {
        const result = await staffAuthClient.twoFactor.enable({password,method:'totp'});
        setPassword('');
        if (result.error || !result.data || result.data.method !== 'totp') throw new Error('Authenticator enrollment was not accepted. Check your current password and local services.');
        setEnrollment(result.data);
      } else {
        const result = await staffAuthClient.twoFactor.verifyTotp({code,trustDevice:false}); setCode('');
        if (result.error) throw new Error('The sign-in verification was not accepted. Check your authenticator and try again.');
        setEnrollment(null); reload();
      }
    } catch(error) { setError(error instanceof TypeError ? 'Local server unavailable. This sign-in outcome is unknown; check the session before trying again.' : error instanceof Error ? error.message : 'Sign in could not be completed.'); }
    finally { setBusy(false); }
  }
  if (session?.actor_domain === 'STAFF') return <NoticeBox tone="ok" title="Signed in"><p>Your staff session is established by the server.</p><a href="/workspace">Go to workspace</a></NoticeBox>;
  if (session?.actor_domain === 'PRINCIPAL') return <NoticeBox tone="stop" title="Separate staff session required"><p>Sign out of the principal session or use a separate browser context before signing in as staff.</p></NoticeBox>;
  return <><div className="page-head"><h2>Staff sign in</h2><p>Customer-local synthetic staff accounts. Privileged access requires an authenticator; no role selection grants authority.</p></div>
    <form className="panel" onSubmit={submit} style={{maxWidth:560}}>
      {step === 'password' ? <><TextField label="Staff email" type="email" value={email} onChange={setEmail} required autoComplete="username" /><TextField label="Password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" /></> : null}
      {step === 'replace' ? <><h3>Choose your own password</h3><p>Your administrator gave you a one-time password. Replace it now; it stops working once you do. Next you will set up your authenticator.</p><TextField label="New password" type="password" value={chosen} onChange={setChosen} required autoComplete="new-password" /><TextField label="Confirm new password" type="password" value={confirm} onChange={setConfirm} required autoComplete="new-password" /></> : null}
      {step === 'enroll' ? <><h3>Set up privileged MFA</h3><p>Password authentication alone does not authorize workspace access.</p>{!enrollment ? <TextField label="Current password for enrollment" type="password" value={password} onChange={setPassword} required autoComplete="current-password" /> : <><p>Open this local URI in your authenticator. Keep recovery codes private; this page clears them after verification.</p><details><summary>Show my authenticator enrollment and recovery codes</summary><code style={{overflowWrap:'anywhere'}}>{enrollment.totpURI}</code><ul>{enrollment.backupCodes.map(c => <li key={c}><code>{c}</code></li>)}</ul></details></>}</> : null}
      {step === 'challenge' || enrollment ? <TextField label="Authenticator code" value={code} onChange={setCode} required autoComplete="one-time-code" inputMode="numeric" maxLength={6} /> : null}
      {error ? <div className="notice notice-stop" role="alert">{error}</div> : null}
      <button className="primary" type="submit" disabled={!hydrated || busy}>{busy ? 'Checking…' : step === 'password' ? 'Sign in' : step === 'replace' ? 'Save new password' : step === 'enroll' && !enrollment ? 'Set up authenticator' : 'Verify authenticator'}</button>
      <button type="button" onClick={reload} disabled={busy}>Check my session</button>
      {step === 'password' ? <p className="muted">Owner who lost their password or authenticator? <a href="/workspace/recover">Recover the owner login</a> with a code issued on the ORVIA server.</p> : null}
    </form></>;
}
