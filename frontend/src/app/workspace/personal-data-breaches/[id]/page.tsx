'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { PersonalDataBreachDetail } from '../../../../components/screens/privacy-operations/breaches-and-attention.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="incident.read">{()=><PersonalDataBreachDetail key={id} id={id}/>}</StaffArea>;}
