'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Team } from '../../../components/screens/expansion/team.tsx';
export default function Page(){return <StaffArea capability="staff.manage">{()=><Team/>}</StaffArea>;}
