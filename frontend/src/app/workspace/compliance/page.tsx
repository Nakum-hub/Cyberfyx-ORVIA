'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Compliance } from '../../../components/screens/expansion/compliance.tsx';
export default function Page(){return <StaffArea capability="grc.read">{()=><Compliance/>}</StaffArea>;}
