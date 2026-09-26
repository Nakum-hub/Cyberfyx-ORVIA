'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { RecordsOfProcessing } from '../../../components/screens/expansion/records-of-processing.tsx';
export default function Page(){return <StaffArea capability="registry.read">{()=><RecordsOfProcessing/>}</StaffArea>;}
