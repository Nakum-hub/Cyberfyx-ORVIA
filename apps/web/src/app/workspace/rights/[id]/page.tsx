'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { RightsRequestDetail } from '../../../../components/screens/rights.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="rights.read">{()=><RightsRequestDetail key={id} id={id}/>}</StaffArea>;}
