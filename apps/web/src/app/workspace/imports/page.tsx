'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ImportsScreen } from '../../../components/screens/imports.tsx';
export default function Page(){return <StaffArea capability="graph.read">{()=><ImportsScreen/>}</StaffArea>;}
