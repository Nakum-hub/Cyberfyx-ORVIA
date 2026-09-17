'use client';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { schemas } from '@orvia/contracts';
import { staffAuthClient, principalAuthClient } from '@orvia/auth/client';
import { call, identityKey, setIdentity } from './api.ts';
import { describeFailure, type UiFailure } from './errors.ts';
import { FailureState, Loading, NoticeBox } from './ui.tsx';

export type Session = ReturnType<typeof schemas.Session.parse>;
export type StaffSession = Extract<Session, { actor_domain: 'STAFF' }>;
export type PrincipalSession = Extract<Session, { actor_domain: 'PRINCIPAL' }>;

export type SessionState = {
  status: 'loading' | 'authenticated' | 'unauthenticated' | 'error';
  session: Session | null;
  failure: UiFailure | null;
  reload: () => void;
  signOut: (domain: 'STAFF' | 'PRINCIPAL') => Promise<void>;
};

const SessionContext = createContext<SessionState | null>(null);

/**
 * The server session is the only source of identity, role and capability.
 * Nothing here reads a role from local storage, a query parameter or a selector;
 * hiding a control in this interface is presentation, never authority.
 */
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{ status: SessionState['status']; session: Session | null; failure: UiFailure | null }>(
    { status: 'loading', session: null, failure: null });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    (async () => {
      try {
        const session = await call('session', undefined, { signal: controller.signal });
        if (cancelled) return;
        setIdentity(identityKey(session));
        setState({ status: 'authenticated', session, failure: null });
      } catch (error) {
        if (cancelled) return;
        const failure = describeFailure(error);
        if (failure.kind === 'ABORTED') return;
        setIdentity('anonymous');
        setState({
          status: failure.code === 'UNAUTHENTICATED' ? 'unauthenticated' : failure.code === 'FORBIDDEN' ? 'authenticated' : 'error',
          session: null,
          failure,
        });
      }
    })();
    return () => { cancelled = true; controller.abort(); };
  }, [tick]);

  const reload = useCallback(() => setTick(value => value + 1), []);

  const signOut = useCallback(async (domain: 'STAFF' | 'PRINCIPAL') => {
    const client = domain === 'STAFF' ? staffAuthClient : principalAuthClient;
    try { await client.signOut(); } catch { /* the reload below reads the authoritative result */ }
    // Dropping identity first invalidates every cached response and in-flight read.
    setIdentity('anonymous');
    setState({ status: 'unauthenticated', session: null, failure: null });
    setTick(value => value + 1);
  }, []);

  const value = useMemo<SessionState>(() => ({ ...state, reload, signOut }), [state, reload, signOut]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const context = useContext(SessionContext);
  if (!context) throw new Error('useSession requires SessionProvider');
  return context;
}

export function hasCapability(session: Session | null, capability: string): boolean {
  return session ? (session.capabilities as readonly string[]).includes(capability) : false;
}

/**
 * Renders children only for a live session in the expected actor domain.
 * A staff session that has not completed MFA reaches the 403 branch, because the
 * server refuses to issue a business session until the challenge is complete.
 */
export function DomainGuard({ domain, signInHref, children }: { domain: 'STAFF' | 'PRINCIPAL'; signInHref: string; children: (session: Session) => ReactNode }) {
  const { status, session, failure, reload } = useSession();
  if (status === 'loading') return <Loading label="Reading the authenticated session from the server." />;
  if (status === 'unauthenticated' || (!session && failure?.code === 'UNAUTHENTICATED')) {
    return (
      <NoticeBox tone="info" title="Sign in required">
        <p>This area needs an authenticated {domain === 'STAFF' ? 'staff' : 'data principal'} session.</p>
        <p><a href={signInHref}>Go to sign in</a></p>
      </NoticeBox>
    );
  }
  if (!session && failure) {
    return (
      <>
        <FailureState failure={failure} onRetry={reload} />
        <p><a href={signInHref}>Go to sign in</a></p>
      </>
    );
  }
  if (!session) return <Loading label="Reading the authenticated session from the server." />;
  if (session.actor_domain !== domain) {
    return (
      <NoticeBox tone="stop" title="Wrong actor domain for this area">
        <p>
          This session is a {session.actor_domain === 'STAFF' ? 'staff' : 'data principal'} session.
          Staff and principal journeys are separate; use a separate browser context for each.
        </p>
        <p><a href={signInHref}>Go to the correct sign in</a></p>
      </NoticeBox>
    );
  }
  return <>{children(session)}</>;
}
