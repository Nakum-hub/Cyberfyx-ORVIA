'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { PreflightScreen } from '../../../components/screens/preflight.tsx';
export default function Page(){return <StaffArea capability="health.read">{()=><PreflightScreen/>}</StaffArea>;}
