'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { TestLab } from '../../../components/screens/test-lab.tsx';
export default function Page(){return <StaffArea capability="tests.read">{session=><TestLab session={session}/>}</StaffArea>;}
