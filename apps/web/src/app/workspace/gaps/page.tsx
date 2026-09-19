'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Gaps } from '../../../components/screens/coverage.tsx';
export default function Page(){return <StaffArea capability="coverage.read">{()=><Gaps/>}</StaffArea>;}
