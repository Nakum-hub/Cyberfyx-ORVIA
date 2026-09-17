'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { Failures } from '../../../components/operations.tsx';
export default function Page(){return <StaffArea capability="workflow.read">{()=><Failures/>}</StaffArea>;}
