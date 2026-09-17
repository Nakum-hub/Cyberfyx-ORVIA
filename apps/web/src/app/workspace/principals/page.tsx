'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { Principals } from '../../../components/configuration.tsx';
export default function Page(){return <StaffArea capability="principals.read">{session=><Principals session={session}/>}</StaffArea>;}
