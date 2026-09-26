'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Delivery } from '../../../components/screens/expansion/delivery.tsx';
export default function Page(){return <StaffArea capability="notification.read">{()=><Delivery/>}</StaffArea>;}
