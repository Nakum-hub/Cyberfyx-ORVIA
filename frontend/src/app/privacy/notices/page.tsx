'use client';
import { DomainGuard } from '../../../components/shared/session-context.tsx';
import { PrivacyNotices } from '../../../components/screens/privacy-operations/privacy-centre.tsx';
export default function Page(){return <DomainGuard domain="PRINCIPAL" signInHref="/privacy/sign-in">{()=><PrivacyNotices/>}</DomainGuard>;}
