'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { OrganisationIntake } from '../../../components/screens/privacy-operations/organisation-intake.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><OrganisationIntake/>}</StaffArea>;}
