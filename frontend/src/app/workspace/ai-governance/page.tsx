'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { AiGovernance } from '../../../components/screens/governance/ai-governance.tsx';
export default function Page(){return <StaffArea capability="ai_governance.read">{session=><AiGovernance session={session}/>}</StaffArea>;}
