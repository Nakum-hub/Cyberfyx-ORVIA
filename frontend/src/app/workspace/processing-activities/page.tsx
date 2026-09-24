'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ProcessingActivities } from '../../../components/screens/privacy-operations/registry.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><ProcessingActivities/>}</StaffArea>;}
