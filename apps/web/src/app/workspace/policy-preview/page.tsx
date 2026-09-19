'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { PolicyPreview } from '../../../components/screens/operations.tsx';
export default function Page(){return <StaffArea capability="policy.preview">{session=><PolicyPreview session={session}/>}</StaffArea>;}
