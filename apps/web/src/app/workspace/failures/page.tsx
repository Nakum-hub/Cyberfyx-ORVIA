'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { Attention } from '../../../components/operations.tsx';
export default function Page(){return <StaffArea capability="workflow.read">{()=><Attention/>}</StaffArea>;}
