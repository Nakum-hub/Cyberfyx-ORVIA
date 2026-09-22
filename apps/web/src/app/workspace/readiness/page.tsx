'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Readiness } from '../../../components/screens/readiness.tsx';
export default function Page(){return <StaffArea capability="health.read">{()=><Readiness/>}</StaffArea>;}
