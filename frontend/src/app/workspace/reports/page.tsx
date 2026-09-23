'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ReportsScreen } from '../../../components/screens/governance/reports.tsx';
export default function Page(){return <StaffArea capability="evidence.export">{()=><ReportsScreen/>}</StaffArea>;}
