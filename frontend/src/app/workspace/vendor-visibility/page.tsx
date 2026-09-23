'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { VendorVisibilityScreen } from '../../../components/screens/operations/vendor-visibility.tsx';
export default function Page(){return <StaffArea capability="health.read">{()=><VendorVisibilityScreen/>}</StaffArea>;}
