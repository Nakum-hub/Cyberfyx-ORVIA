'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Assessments } from '../../../components/screens/processors.tsx';
export default function Page(){return <StaffArea capability="processor.read">{()=><Assessments/>}</StaffArea>;}
