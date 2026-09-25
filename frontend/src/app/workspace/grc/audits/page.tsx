'use client';
import {StaffArea} from '../../../../components/shared/workspace.tsx';
import {GrcAuditWorkspace} from '../../../../components/screens/governance/grc-audits.tsx';
export default function Page(){return <StaffArea capability="grc.read">{session=><GrcAuditWorkspace session={session}/>}</StaffArea>;}
