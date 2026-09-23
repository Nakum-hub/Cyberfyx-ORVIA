'use client';
import { useParams } from 'next/navigation';
import { StaffArea } from '../../../../components/shared/workspace.tsx';
import { AssetDetail } from '../../../../components/screens/governance/inventory.tsx';
export default function Page(){const {id}=useParams<{id:string}>();return <StaffArea capability="graph.read">{()=><AssetDetail key={id} id={id}/>}</StaffArea>;}
