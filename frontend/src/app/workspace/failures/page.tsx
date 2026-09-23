'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Attention } from '../../../components/screens/controls/attention.tsx';
export default function Page(){return <StaffArea capability="workflow.read">{()=><Attention/>}</StaffArea>;}
