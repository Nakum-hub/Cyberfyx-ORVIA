'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { WorkflowRunDetail } from '../../../../components/screens/privacy-operations/workflow-runs.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="registry.read">{()=><WorkflowRunDetail key={id} id={id}/>}</StaffArea>;}
