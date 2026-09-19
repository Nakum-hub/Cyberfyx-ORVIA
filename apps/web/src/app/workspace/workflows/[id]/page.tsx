'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { WorkflowDetail } from '../../../../components/screens/operations.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="workflow.read">{session=><WorkflowDetail key={id} id={id} session={session}/>}</StaffArea>;}
