'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RegistryNotices } from '../../../components/screens/privacy-operations/registry-setup.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><RegistryNotices/>}</StaffArea>;}
