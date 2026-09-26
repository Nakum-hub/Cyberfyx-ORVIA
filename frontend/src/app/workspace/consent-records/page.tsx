'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { ConsentRecords } from '../../../components/screens/privacy-operations/consent-records.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><ConsentRecords/>}</StaffArea>;}
