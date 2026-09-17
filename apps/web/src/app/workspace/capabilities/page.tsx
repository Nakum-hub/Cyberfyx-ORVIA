'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { Capabilities } from '../../../components/operations.tsx';
export default function Page(){return <StaffArea capability="capabilities.read">{()=><Capabilities/>}</StaffArea>;}
