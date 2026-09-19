'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Capabilities } from '../../../components/screens/operations.tsx';
export default function Page(){return <StaffArea capability="capabilities.read">{()=><Capabilities/>}</StaffArea>;}
