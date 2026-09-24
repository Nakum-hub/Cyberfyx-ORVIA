'use client';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { Applicability } from '../../../../components/screens/privacy-operations/regulatory.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><Applicability/>}</StaffArea>;}
