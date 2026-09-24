'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RegistryRetention } from '../../../components/screens/privacy-operations/registry-operations.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><RegistryRetention/>}</StaffArea>;}
