'use client';
import { useEffect,useState,type FormEvent } from 'react';
import { useCollection,useMutation,usePagedQuery,useQuery } from '../../shared/api.ts';
import { hasCapability,type StaffSession } from '../../shared/session-context.tsx';
import { DataTable,FailureState,Freshness,NoticeBox,PageHead,Pagination,QueryBoundary,Section } from '../../shared/ui.tsx';
import { formatTime,shortId } from '../../shared/state-labels.ts';
import { Classification,ExposureOverview } from '../expansion/classification.tsx';

export function CatalogDiscovery({session}:{session:StaffSession}){
  const list=usePagedQuery('list_catalog_discovery_targets',{limit:20});
  const systems=useCollection('list_systems');
  const [selected,setSelected]=useState<string|null>(null);
  useEffect(()=>{
    const id=new URLSearchParams(window.location.search).get('target_id');
    if(id&&/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id))setSelected(id);
  },[]);
  const create=useMutation('create_catalog_discovery_target',true);
  const approve=useMutation('approve_catalog_discovery_target',true);
  const disable=useMutation('disable_catalog_discovery_target',true);
  const materialize=useMutation('create_catalog_asset',true);
  const [createdAsset,setCreatedAsset]=useState<string|null>(null);
  const detail=useQuery('catalog_discovery_target',{params:{id:selected??'00000000-0000-4000-8000-000000000000'},enabled:!!selected});
  const canWrite=hasCapability(session,'graph.write'),canApprove=hasCapability(session,'connection.enable');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    const result=await create.run({system_id:String(form.get('system_id')||''),schema_name:String(form.get('schema_name')||''),
      relation_name:String(form.get('relation_name')||'')});
    if(result){list.refresh();setSelected(result.id);}
  }
  return <>
    <PageHead eyebrow="Discovery" title="Catalog observations" lede="Approve exact PostgreSQL relations for local, read-only metadata checks. Review source columns and freshness before mapping personal data."/>
    <NoticeBox tone="info" title="Metadata scope"><p>This adapter reads column names, types and nullability from the protected synthetic PostgreSQL target. The metadata read takes no row values. Value classification is a separate sample, requested with connection authority, that keeps only counts. A pending target is a request, not an observation.</p></NoticeBox>
    <Freshness query={list}/>
    <QueryBoundary query={list} label="Catalog targets" isEmpty={data=>!data.items.length}>
      {data=><><DataTable caption="Reviewed source targets" rows={data.items} rowKey={item=>item.id} columns={[
        {key:'relation',header:'Relation',cell:item=><span className="cell-primary">{item.schema_name}.{item.relation_name}<span className="cell-sub">System {shortId(item.system_id)}</span></span>},
        {key:'state',header:'Approval',cell:item=>item.state},
        {key:'created',header:'Created',cell:item=>formatTime(item.created_at)},
        {key:'open',header:'Evidence',cell:item=><button type="button" onClick={()=>setSelected(item.id)}>Open</button>},
      ]}/><Pagination query={list}/></>}
    </QueryBoundary>
    {canWrite?<Section title="Request a catalog read"><p>Only a separate authorised reviewer can approve this target. The local worker then reads its catalog metadata.</p>
      <form className="ai-governance-form" onSubmit={event=>void submit(event)}>
        <label>System <select name="system_id" required>{systems.data?.items.filter(item=>item.connector==='SYNTHETIC_CRM').map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
        <label>Schema <input name="schema_name" required pattern="[a-z][a-z0-9_]*" maxLength={63}/></label>
        <label>Relation <input name="relation_name" required pattern="[a-z][a-z0-9_]*" maxLength={63}/></label>
        <button type="submit" disabled={systems.status!=='ready'||create.status==='pending'||create.unsettled}>Request review</button>
      </form>
      {create.failure?<FailureState failure={create.failure} onRetry={create.unsettled?()=>void create.retry():undefined}/>:null}
    </Section>:null}
    {selected?<Section title="Target and observations" aside={<button type="button" onClick={()=>setSelected(null)}>Close</button>}>
      <QueryBoundary query={detail} label="Catalog target detail">{data=><>
        <h3>{data.target.schema_name}.{data.target.relation_name}</h3>
        <p>State {data.target.state} · Created by {shortId(data.target.created_by)} · Approved by {data.target.approved_by?shortId(data.target.approved_by):'no reviewer yet'}</p>
        {data.target.state==='PENDING'&&canApprove?<button type="button" disabled={approve.status==='pending'||approve.unsettled}
          onClick={()=>void approve.run({}, {params:{id:selected}}).then(result=>{if(result){detail.refresh();list.refresh();}})}>Approve exact relation</button>:null}
        {data.target.state==='APPROVED'&&canApprove?<button type="button" disabled={disable.status==='pending'||disable.unsettled}
          onClick={()=>void disable.run({}, {params:{id:selected}}).then(result=>{if(result){detail.refresh();list.refresh();}})}>Disable catalog access</button>:null}
        {approve.failure?<FailureState failure={approve.failure} onRetry={approve.unsettled?()=>void approve.retry():undefined}/>:null}
        {disable.failure?<FailureState failure={disable.failure} onRetry={disable.unsettled?()=>void disable.retry():undefined}/>:null}
        <p>Freshness {data.freshness.replaceAll('_',' ').toLowerCase()} · Job {data.job?.state??'not scheduled'} · Attempts {data.job?.attempts??0} · Next check {data.job?formatTime(data.job.next_run_at):'after approval'}</p>
        {data.freshness==='STALE'||data.freshness==='UNKNOWN'?<NoticeBox tone="warn" title="No current catalog assurance"><p>The prior read is stale or the current read failed. Review the target and worker before relying on its inventory.</p></NoticeBox>:null}
        {data.job?.state==='EXHAUSTED'?<NoticeBox tone="stop" title="Catalog read exhausted"><p>The local reader failed after bounded retries. Inspect the target permission and worker logs.</p></NoticeBox>:null}
        {data.observations.length===0?<NoticeBox tone="warn" title="No observation"><p>No source read is recorded for this target.</p></NoticeBox>:null}
        {canWrite&&data.freshness==='CURRENT'&&data.observations[0]?.state==='OBSERVED_METADATA'?<button type="button"
          disabled={materialize.status==='pending'||materialize.unsettled}
          onClick={()=>void materialize.run({observation_id:data.observations[0]!.id}).then(result=>{if(result)setCreatedAsset(result.id);})}>
          Add observed dataset to inventory</button>:null}
        {materialize.failure?<FailureState failure={materialize.failure} onRetry={materialize.unsettled?()=>void materialize.retry():undefined}/>:null}
        {createdAsset?<p>Observed metadata dataset added: <a href={`/workspace/inventory/${createdAsset}`}>Open inventory record</a>. Classification and purpose review remain separate.</p>:null}
        <DataTable caption="Independent catalog reads" rows={data.observations} rowKey={item=>item.id} columns={[
          {key:'state',header:'Result',cell:item=>item.state},
          {key:'time',header:'Read at',cell:item=>formatTime(item.observed_at)},
          {key:'digest',header:'Digest',cell:item=>item.digest?item.digest.slice(0,16)+'…':'none'},
          {key:'columns',header:'Columns',cell:item=>item.columns.map(column=>`${column.name}: ${column.data_type}${column.nullable?'?':''}`).join(', ')||'none'},
        ]}/>
        {data.history_limited?<p>Only the latest 100 observations are shown.</p>:null}
        <Classification targetId={selected} approved={data.target.state==='APPROVED'}/>
      </>}</QueryBoundary>
    </Section>:null}
    <ExposureOverview/>
  </>;
}
