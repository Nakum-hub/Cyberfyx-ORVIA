'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { SupportCanaries } from '../../../components/screens/support.tsx';
export default function Page(){return <StaffArea capability="support.read">{()=><SupportCanaries/>}</StaffArea>;}
