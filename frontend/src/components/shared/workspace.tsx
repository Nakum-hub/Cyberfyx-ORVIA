'use client';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { ENTITLEMENTS } from '@orvia/contracts';
import { DomainGuard, hasCapability, type StaffSession } from './session-context.tsx';
import { NoticeBox } from './ui.tsx';
import { useQuery } from './api.ts';
import { WORKSPACE_NAV } from './shell.tsx';

const PLAN_NAME: Record<string, string> = { FOUNDATION: 'Foundation', CONTROL: 'Control', ENTERPRISE: 'Enterprise' };

/**
 * Rev 1.11: on a screen whose new work the plan in force does not cover, say so before anyone reaches for a button the
 * server will refuse. Reading what is already recorded always stays available. The server still decides every request.
 */
function PlanNotice() {
  const pathname = usePathname();
  const item = WORKSPACE_NAV.flatMap(group => group.items).find(i => i.entitlement && (pathname === i.href || pathname.startsWith(`${i.href}/`)));
  const plan = useQuery('plan', { enabled: Boolean(item) });
  if (!item?.entitlement || !plan.data || plan.data.usable.includes(item.entitlement)) return null;
  const info = ENTITLEMENTS[item.entitlement];
  return (
    <NoticeBox tone="info" title={`${info.label} is part of ${PLAN_NAME[info.tier]}`}>
      <p>{info.value} Your current plan does not include new work here{plan.data.lifecycle === 'EXPIRED' ? ' while the licence is expired' : ''}; anything already recorded stays readable and exportable. <a href="/workspace/plan">Your plan</a></p>
    </NoticeBox>
  );
}

export function StaffArea({ capability, children }: { capability: string; children: (session: StaffSession) => ReactNode }) {
  return <DomainGuard domain="STAFF" signInHref="/workspace/sign-in">{session => {
    if (session.actor_domain !== 'STAFF') return null;
    if (!hasCapability(session, capability)) return <NoticeBox tone="stop" title="Not permitted for this session"><p>Your current server-derived capabilities do not include {capability}. The server enforces every request independently.</p></NoticeBox>;
    return <><PlanNotice />{children(session)}</>;
  }}</DomainGuard>;
}
