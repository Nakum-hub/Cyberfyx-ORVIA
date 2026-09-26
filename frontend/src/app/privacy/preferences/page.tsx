'use client';
import { DomainGuard } from '../../../components/shared/session-context.tsx';
import { PortalPreferences } from '../../../components/screens/expansion/preferences.tsx';
export default function Page(){return <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">{()=><PortalPreferences/>}</DomainGuard>;}
