'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/workspace.tsx';
import { EvidenceDetail } from '../../../../components/operations.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="evidence.read">{session=><EvidenceDetail key={id} id={id} session={session}/>}</StaffArea>;}
