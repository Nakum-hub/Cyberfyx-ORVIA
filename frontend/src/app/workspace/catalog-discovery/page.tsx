'use client';
import { StaffArea } from '../../../components/shared/workspace.tsx';
import { CatalogDiscovery } from '../../../components/screens/governance/catalog-discovery.tsx';
export default function Page(){return <StaffArea capability="graph.read">{session=><CatalogDiscovery session={session}/>}</StaffArea>;}
