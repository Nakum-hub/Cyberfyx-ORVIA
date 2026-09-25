'use client';
import {StaffArea} from '../../../components/shared/workspace.tsx';
import {GrcWorkspace} from '../../../components/screens/governance/grc.tsx';
export default function Page(){return <StaffArea capability="grc.read">{session=><GrcWorkspace session={session}/>}</StaffArea>;}
