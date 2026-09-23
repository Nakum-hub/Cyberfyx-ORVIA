'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { EvidenceDetail } from '../../../../components/screens/controls/evidence.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="evidence.read">{session=><EvidenceDetail key={id} id={id} session={session}/>}</StaffArea>;}
