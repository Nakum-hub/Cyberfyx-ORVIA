'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RestoresScreen } from '../../../components/screens/restores.tsx';
export default function Page(){return <StaffArea capability="health.read">{()=><RestoresScreen/>}</StaffArea>;}
