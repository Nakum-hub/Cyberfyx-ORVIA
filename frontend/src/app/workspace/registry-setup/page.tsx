'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RegistrySetup } from '../../../components/screens/privacy-operations/registry-setup.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><RegistrySetup/>}</StaffArea>;}
