'use client';
import { useQuery } from '../../components/api.ts';
import { StaffArea } from '../../components/workspace.tsx';
import { Facts, Freshness, QueryBoundary } from '../../components/ui.tsx';

export default function WorkspacePage() {
  return <StaffArea capability="overview.read">{session => <Overview capabilities={session.capabilities} />}</StaffArea>;
}
function Overview({ capabilities }: { capabilities: string[] }) {
  const query = useQuery('overview');
  return <><div className="page-head"><h2>Workspace overview</h2><p>Current records in your authenticated organisation and environment.</p></div>
    <Freshness query={query} asOf={query.data?.as_of} />
    <QueryBoundary query={query} label="current workspace overview">{data => <>
      <section className="panel"><h3>Workflow counts</h3><Facts items={[
        {term:'Accepted workflows',value:data.counts.accepted},{term:'Running workflows',value:data.counts.running},
        {term:'Workflows needing attention',value:data.counts.needs_attention},{term:'Completed workflows',value:data.counts.completed},
      ]} /></section>
      <section className="panel"><h3>Obligation counts</h3><Facts items={[
        {term:'Effect unknown',value:data.counts.effect_unknown},{term:'Manual execution',value:data.counts.manual_required},
        {term:'Failed execution',value:data.counts.failed},{term:'Obligations without current verification',value:data.counts.unverified},
      ]} /><p>These counts overlap and must not be added together. Execution states retain historical unknown, failed or manual facts even after a separate completion criterion is satisfied.</p></section>
      <section className="panel"><h3>Current build and authority</h3><Facts items={[
        {term:'Build',value:<code>{data.build_id}</code>},{term:'Contract',value:data.contract_version},{term:'Profile',value:data.profile},
        {term:'Tenant',value:<code>{data.scope.tenant_id}</code>},{term:'Environment',value:<code>{data.scope.environment_id}</code>},
      ]} /><details><summary>My server-derived capabilities</summary><ul>{capabilities.map(c => <li key={c}><code>{c}</code></li>)}</ul></details></section>
    </>}</QueryBoundary></>;
}
