'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { TestRunDetail } from '../../../../components/screens/test-lab.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="tests.read">{()=> <TestRunDetail key={id} id={id}/>}</StaffArea>;}
