'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { SupportCases } from '../../../components/screens/support.tsx';
export default function Page(){return <StaffArea capability="support.read">{()=><SupportCases/>}</StaffArea>;}
