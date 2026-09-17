'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { TestLab } from '../../../components/test-lab.tsx';
export default function Page(){return <StaffArea capability="tests.read">{session=><TestLab session={session}/>}</StaffArea>;}
