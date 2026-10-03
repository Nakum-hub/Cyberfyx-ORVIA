'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { PrivacyCentre } from '../../../components/screens/privacy-operations/privacy-centre-module.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><PrivacyCentre/>}</StaffArea>;}
