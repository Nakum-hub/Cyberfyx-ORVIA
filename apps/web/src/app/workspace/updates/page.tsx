'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { UpdatePlans } from '../../../components/screens/updates.tsx';
export default function Page(){return <StaffArea capability="update.read">{()=><UpdatePlans/>}</StaffArea>;}
