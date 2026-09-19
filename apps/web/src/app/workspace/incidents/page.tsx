'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Incidents } from '../../../components/screens/incidents.tsx';
export default function Page(){return <StaffArea capability="incident.read">{()=><Incidents/>}</StaffArea>;}
