'use client';
import { useState, type FormEvent } from 'react';
import { principalAuthClient } from '@orvia/auth/client';
import { useSession } from '../../../components/session-context.tsx';
import { NoticeBox, TextField } from '../../../components/ui.tsx';

/**
 * Data principal sign in. Credentials go to the local Better Auth principal
 * mount only; nothing is stored in this browser by this interface, and the
 * session cookie is set and read by the server.
 */
export default function PrincipalSignInPage() {
  const { status, session, reload } = useSession();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const result = await principalAuthClient.signIn.email({ email, password });
      if (result.error) {
        setError(result.error.status === 401 || result.error.status === 403
          ? 'Those sign-in details were not accepted.'
          : 'Sign in could not be completed. The server did not accept this attempt.');
        return;
      }
      setPassword('');
      reload();
    } catch {
      setError('The browser could not reach the local ORVIA server. The outcome of this attempt is unknown.');
    } finally {
      setBusy(false);
    }
  };

  if (status === 'authenticated' && session?.actor_domain === 'PRINCIPAL') {
    return (
      <NoticeBox tone="ok" title="Signed in">
        <p>This browser holds an authenticated data principal session.</p>
        <p><a href="/privacy">Go to my choices</a></p>
      </NoticeBox>
    );
  }

  return (
    <>
      <div className="page-head">
        <h2>Sign in to the Privacy Centre</h2>
        <p>Use a synthetic data principal account for this demonstration. Staff accounts cannot sign in here.</p>
      </div>
      <form className="panel" onSubmit={submit} noValidate style={{ maxWidth: 460 }}>
        <TextField label="Email" type="email" value={email} onChange={setEmail} required autoComplete="username" />
        <TextField label="Password" type="password" value={password} onChange={setPassword} required autoComplete="current-password" />
        {error ? <div className="notice notice-stop" role="alert"><p>{error}</p></div> : null}
        <button type="submit" className="primary" disabled={busy || !email || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <NoticeBox tone="info" title="Separate journeys">
        <p>
          Staff and principal sessions are separate authentication domains. If this browser already holds a staff
          session, sign out of it or use a separate browser context before signing in here.
        </p>
      </NoticeBox>
    </>
  );
}
