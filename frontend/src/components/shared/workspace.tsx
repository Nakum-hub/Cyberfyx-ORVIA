'use client';
import type { ReactNode } from 'react';
import { DomainGuard, hasCapability, type StaffSession } from './session-context.tsx';
import { NoticeBox } from './ui.tsx';

export function StaffArea({ capability, children }: { capability: string; children: (session: StaffSession) => ReactNode }) {
  return <DomainGuard domain="STAFF" signInHref="/workspace/sign-in">{session => {
    if (session.actor_domain !== 'STAFF') return null;
    if (!hasCapability(session, capability)) return <NoticeBox tone="stop" title="Not permitted for this session"><p>Your current server-derived capabilities do not include {capability}. The server enforces every request independently.</p></NoticeBox>;
    return children(session);
  }}</DomainGuard>;
}
