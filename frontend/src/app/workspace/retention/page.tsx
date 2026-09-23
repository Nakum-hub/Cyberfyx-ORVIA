'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RetentionConstraints } from '../../../components/screens/governance/retention.tsx';
export default function Page(){return <StaffArea capability="retention.read">{()=><RetentionConstraints/>}</StaffArea>;}
