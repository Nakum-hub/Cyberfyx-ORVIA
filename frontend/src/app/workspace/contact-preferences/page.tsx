'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { PreferenceAdmin } from '../../../components/screens/expansion/preferences.tsx';
export default function Page(){return <StaffArea capability="configuration.read">{()=><PreferenceAdmin/>}</StaffArea>;}
