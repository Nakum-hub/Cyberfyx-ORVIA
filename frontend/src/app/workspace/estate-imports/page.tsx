'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { EstateImports } from '../../../components/screens/privacy-operations/registry-operations.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><EstateImports/>}</StaffArea>;}
