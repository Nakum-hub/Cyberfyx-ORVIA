'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Configuration } from '../../../components/screens/configuration.tsx';
export default function Page(){return <StaffArea capability="configuration.read">{session=><Configuration session={session}/>}</StaffArea>;}
