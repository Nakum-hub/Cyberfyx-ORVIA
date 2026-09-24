'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RegulatoryPackages } from '../../../components/screens/privacy-operations/regulatory.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><RegulatoryPackages/>}</StaffArea>;}
