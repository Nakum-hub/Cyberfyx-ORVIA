'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ProcessorEngagements } from '../../../components/screens/privacy-operations/registry-operations.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><ProcessorEngagements/>}</StaffArea>;}
