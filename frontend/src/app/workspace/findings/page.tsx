'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Findings } from '../../../components/screens/governance/processors.tsx';
export default function Page(){return <StaffArea capability="processor.read">{()=><Findings/>}</StaffArea>;}
