'use client';
import { DomainGuard } from '../../../components/shared/session-context.tsx';
import { MyLogin } from '../../../components/screens/expansion/my-login.tsx';
export default function Page(){return <DomainGuard domain="STAFF" signInHref="/workspace/sign-in">{()=><MyLogin/>}</DomainGuard>;}
