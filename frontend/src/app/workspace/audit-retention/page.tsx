'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { AuditRetentionScreen } from '../../../components/screens/operations/audit-retention.tsx';
export default function Page(){return <StaffArea capability="audit.read">{()=><AuditRetentionScreen/>}</StaffArea>;}
