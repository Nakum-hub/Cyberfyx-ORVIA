'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Plan } from '../../../components/screens/expansion/plan.tsx';
export default function Page(){return <StaffArea capability="overview.read">{()=><Plan/>}</StaffArea>;}
