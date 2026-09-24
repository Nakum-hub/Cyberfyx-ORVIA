'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { PersonalDataBreaches } from '../../../components/screens/privacy-operations/breaches-and-attention.tsx';
export default function Page(){return <StaffArea capability="incident.read">{()=><PersonalDataBreaches/>}</StaffArea>;}
