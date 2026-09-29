'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { DpdpaAudit } from '../../../components/screens/expansion/dpdpa-audit.tsx';
export default function Page() { return <StaffArea capability="audit_exchange.read">{session => <DpdpaAudit capabilities={session.capabilities} />}</StaffArea>; }
