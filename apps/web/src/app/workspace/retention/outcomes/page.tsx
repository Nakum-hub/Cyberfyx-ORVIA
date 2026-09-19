'use client';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { RetentionOutcomes } from '../../../../components/screens/retention.tsx';
export default function Page(){return <StaffArea capability="retention.read">{()=><RetentionOutcomes/>}</StaffArea>;}
