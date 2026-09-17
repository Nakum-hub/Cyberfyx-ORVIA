'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { PolicyPreview } from '../../../components/operations.tsx';
export default function Page(){return <StaffArea capability="policy.preview">{session=><PolicyPreview session={session}/>}</StaffArea>;}
