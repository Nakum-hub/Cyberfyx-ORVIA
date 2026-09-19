'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Attention } from '../../../components/screens/operations.tsx';
export default function Page(){return <StaffArea capability="workflow.read">{()=><Attention/>}</StaffArea>;}
