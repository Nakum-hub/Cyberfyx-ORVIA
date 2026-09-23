'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Mandates } from '../../../components/screens/governance/rights.tsx';
export default function Page(){return <StaffArea capability="rights.read">{()=><Mandates/>}</StaffArea>;}
