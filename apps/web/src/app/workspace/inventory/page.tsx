'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { Inventory } from '../../../components/screens/inventory.tsx';
export default function Page(){return <StaffArea capability="graph.read">{()=><Inventory/>}</StaffArea>;}
