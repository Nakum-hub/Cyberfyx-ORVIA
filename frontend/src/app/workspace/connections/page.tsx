'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ConnectionsScreen } from '../../../components/screens/onboarding/onboarding.tsx';
export default function Page(){return <StaffArea capability="configuration.read">{()=><ConnectionsScreen/>}</StaffArea>;}
