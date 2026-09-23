'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ObligationRules } from '../../../components/screens/governance/incidents.tsx';
export default function Page(){return <StaffArea capability="incident.read">{()=><ObligationRules/>}</StaffArea>;}
