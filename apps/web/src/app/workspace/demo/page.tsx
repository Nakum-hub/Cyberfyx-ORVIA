'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { GuidedDemo } from '../../../components/guided-demo.tsx';
export default function Page(){return <StaffArea capability="overview.read">{session=><GuidedDemo session={session}/>}</StaffArea>;}
