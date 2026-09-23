'use client';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { GraphSearch } from '../../../../components/screens/governance/inventory.tsx';
export default function Page(){return <StaffArea capability="graph.read">{()=><GraphSearch/>}</StaffArea>;}
