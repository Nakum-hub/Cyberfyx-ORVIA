'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { IncidentDetail } from '../../../../components/screens/governance/incidents.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="incident.read">{()=><IncidentDetail key={id} id={id}/>}</StaffArea>;}
