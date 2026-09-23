'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { AuditCoverageScreen } from '../../../components/screens/operations/audit.tsx';
export default function Page(){return <StaffArea capability="audit.read">{()=><AuditCoverageScreen/>}</StaffArea>;}
