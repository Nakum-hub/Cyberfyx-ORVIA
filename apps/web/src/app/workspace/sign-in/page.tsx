'use client';
import { useState, type FormEvent } from 'react';
import { staffAuthClient } from '@orvia/auth/client';
import { call } from '../../../components/api.ts';
import { useSession } from '../../../components/session-context.tsx';
import { NoticeBox, TextField } from '../../../components/ui.tsx';

export default function StaffSignIn() {
  const { session, reload } = useSession();
  const [email,setEmail] = useState(''); const [password,setPassword] = useState('');
  const [code,setCode] = useState(''); const [step,setStep] = useState<'password'|'challenge'|'enroll'>('password');
  const [enrollment,setEnrollment] = useState<{totpURI:string;backupCodes:string[]} | null>(null);
  const [busy,setBusy] = useState(false); const [error,setError] = useState<string | null>(null);
  async function submit(event: FormEvent) {
    event.preventDefault(); if (busy) return; setBusy(true); setError(null);
    try {
      if (step === 'password') {
        const result = await staffAuthClient.signIn.email({email,password,rememberMe:false});
        if (result.error) throw new Error('Sign-in details were not accepted. Try again or check local service availability.');
        setPassword('');
        const data = result.data;
        if (data && 'twoFactorRedirect' in data && data.twoFactorRedirect === true) { setStep('challenge'); return; }
        try { await call('session',undefined); reload(); }
        catch { setStep('enroll'); }
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
      {step === 'enroll' ? <><h3>Set up privileged MFA</h3><p>Password authentication alone does not authorize workspace access.</p>{!enrollment ? <TextField label="Current password for enrollment" type="password" value={password} onChange={setPassword} required autoComplete="current-password" /> : <><p>Open this local URI in your authenticator. Keep recovery codes private; this page clears them after verification.</p><details><summary>Show my authenticator enrollment and recovery codes</summary><code style={{overflowWrap:'anywhere'}}>{enrollment.totpURI}</code><ul>{enrollment.backupCodes.map(c => <li key={c}><code>{c}</code></li>)}</ul></details></>}</> : null}
      {step === 'challenge' || enrollment ? <TextField label="Authenticator code" value={code} onChange={setCode} required autoComplete="one-time-code" inputMode="numeric" maxLength={6} /> : null}
      {error ? <div className="notice notice-stop" role="alert">{error}</div> : null}
      <button className="primary" type="submit" disabled={busy}>{busy ? 'Checking…' : step === 'password' ? 'Sign in' : step === 'enroll' && !enrollment ? 'Set up authenticator' : 'Verify authenticator'}</button>
      <button type="button" onClick={reload} disabled={busy}>Check my session</button>
    </form></>;
}
