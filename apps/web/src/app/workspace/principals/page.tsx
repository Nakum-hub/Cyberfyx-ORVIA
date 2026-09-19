'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Principals } from '../../../components/screens/configuration.tsx';
export default function Page(){return <StaffArea capability="principals.read">{session=><Principals session={session}/>}</StaffArea>;}
