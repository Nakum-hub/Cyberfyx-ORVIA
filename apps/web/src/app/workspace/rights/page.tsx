'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RightsRequests } from '../../../components/screens/rights.tsx';
export default function Page(){return <StaffArea capability="rights.read">{()=><RightsRequests/>}</StaffArea>;}
