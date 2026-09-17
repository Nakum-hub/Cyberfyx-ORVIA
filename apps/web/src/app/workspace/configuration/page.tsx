'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { Configuration } from '../../../components/configuration.tsx';
export default function Page(){return <StaffArea capability="configuration.read">{session=><Configuration session={session}/>}</StaffArea>;}
