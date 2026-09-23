'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { InstallationVersions } from '../../../components/screens/operations/updates.tsx';
export default function Page(){return <StaffArea capability="update.read">{()=><InstallationVersions/>}</StaffArea>;}
