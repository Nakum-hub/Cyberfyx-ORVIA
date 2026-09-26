'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ThirdParties } from '../../../components/screens/expansion/third-parties.tsx';
export default function Page(){return <StaffArea capability="processor.read">{()=><ThirdParties/>}</StaffArea>;}
