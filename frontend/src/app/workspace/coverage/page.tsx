'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Coverage } from '../../../components/screens/governance/coverage.tsx';
export default function Page(){return <StaffArea capability="coverage.read">{()=><Coverage/>}</StaffArea>;}
