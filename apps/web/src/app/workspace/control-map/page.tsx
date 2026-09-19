'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ControlMap } from '../../../components/screens/operations.tsx';
export default function Page(){return <StaffArea capability="configuration.read">{()=><ControlMap/>}</StaffArea>;}
