'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { ConnectionDetail } from '../../../../components/screens/onboarding/onboarding.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="configuration.read">{()=> <ConnectionDetail key={id} id={id}/>}</StaffArea>;}
