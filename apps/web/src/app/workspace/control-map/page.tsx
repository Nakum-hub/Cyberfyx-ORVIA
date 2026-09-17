'use client';
import { StaffArea } from '../../../components/workspace.tsx';
import { ControlMap } from '../../../components/operations.tsx';
export default function Page(){return <StaffArea capability="configuration.read">{()=><ControlMap/>}</StaffArea>;}
