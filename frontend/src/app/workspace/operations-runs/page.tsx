'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { WorkflowRuns } from '../../../components/screens/privacy-operations/workflow-runs.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><WorkflowRuns/>}</StaffArea>;}
