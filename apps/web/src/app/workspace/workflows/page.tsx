'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { Workflows } from '../../../components/operations.tsx';
export default function Page(){return <StaffArea capability="workflow.read">{()=><Workflows/>}</StaffArea>;}
