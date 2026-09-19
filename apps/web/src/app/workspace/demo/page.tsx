'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { GuidedDemo } from '../../../components/screens/guided-demo.tsx';
export default function Page(){return <StaffArea capability="overview.read">{session=><GuidedDemo session={session}/>}</StaffArea>;}
