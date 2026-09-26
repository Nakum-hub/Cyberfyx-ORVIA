'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RightsRequests } from '../../../components/screens/governance/rights.tsx';
import { RightsCaseProfiles } from '../../../components/screens/privacy-operations/operations-extras.tsx';
export default function Page(){return <StaffArea capability="rights.read">{()=><><RightsRequests/><RightsCaseProfiles/></>}</StaffArea>;}
