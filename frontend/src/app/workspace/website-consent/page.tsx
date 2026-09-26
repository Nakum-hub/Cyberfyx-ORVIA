'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { WebsiteConsent } from '../../../components/screens/expansion/website-consent.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><WebsiteConsent/>}</StaffArea>;}
