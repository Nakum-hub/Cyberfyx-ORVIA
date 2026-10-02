'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Files } from '../../../components/screens/onboarding/files.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><Files/>}</StaffArea>;}
