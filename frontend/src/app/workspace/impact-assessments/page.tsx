'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ImpactAssessments } from '../../../components/screens/expansion/impact-assessments.tsx';
export default function Page(){return <StaffArea capability="grc.read">{()=><ImpactAssessments/>}</StaffArea>;}
