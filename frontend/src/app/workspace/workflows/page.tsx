'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Workflows } from '../../../components/screens/controls/workflows.tsx';
export default function Page(){return <StaffArea capability="workflow.read">{()=><Workflows/>}</StaffArea>;}
