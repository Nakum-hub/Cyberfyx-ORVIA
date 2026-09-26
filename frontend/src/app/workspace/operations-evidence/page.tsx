'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { OperationsEvidence } from '../../../components/screens/privacy-operations/operations-extras.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><OperationsEvidence/>}</StaffArea>;}
