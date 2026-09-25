'use client';
import { useState, type FormEvent } from 'react';
import { useCollection, useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import { DataTable, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { formatTime, shortId } from '../../shared/state-labels.ts';

const KINDS = ['RISK_ASSESSMENT','POLICY','CONTROL','APPROVAL','EVIDENCE','MONITORING','INCIDENT'] as const;
type Kind = typeof KINDS[number];
const STATES = ['RECORDED','NEEDS_REVIEW','APPROVED','REJECTED','FINDING'] as const;

export function AiGovernance({session}:{session:StaffSession}) {
  const list=usePagedQuery('list_ai_systems',{limit:20});
  const report=useQuery('ai_governance_report');
  const [selected,setSelected]=useState<string|null>(null);
  const canWrite=hasCapability(session,'ai_governance.write');
  const refresh=()=>{list.refresh();report.refresh();};
  return <>
    <PageHead eyebrow="Governance" title="AI systems and uses" lede="Record each AI use, its data flow, accountable owner and review history in this customer-local workspace." />
    <NoticeBox tone="info" title="Governance records, not model execution"><p>These entries are declarations and human review records. ORVIA does not run, inspect or train an AI model here. A recorded monitor entry is not independent proof of external behaviour.</p></NoticeBox>
    <Section title="Portfolio report">
      <QueryBoundary query={report} label="AI governance report">
        {data=><>
          <p>Recorded systems: <strong>{data.systems}</strong> · Approved reviews: <strong>{data.approved}</strong> · Missing risk assessment: <strong>{data.assessment_missing}</strong> · Missing monitor record: <strong>{data.monitoring_missing}</strong> · Open findings: <strong>{data.findings}</strong> · Checks due: <strong>{data.monitor_due}</strong> · Checks exhausted: <strong>{data.monitor_exhausted}</strong></p>
          {data.monitor_exhausted>0?<NoticeBox tone="stop" title="Monitoring checks exhausted"><p>{data.monitor_exhausted} check(s) stopped after bounded retries. Review the linked records and restore the local worker before relying on a current assessment.</p></NoticeBox>:null}
          {data.monitor_due>0?<NoticeBox tone="warn" title="Monitoring checks due"><p>{data.monitor_due} check(s) await the local worker. A due job is not an observation.</p></NoticeBox>:null}
          {data.findings>0?<NoticeBox tone="warn" title="AI governance findings open"><p>{data.findings} system(s) have unresolved monitoring findings. A later assertion cannot close them.</p></NoticeBox>:null}
          <p className="muted">As of {formatTime(data.as_of)}</p>
          <ul>{data.limitations.map(limit=><li key={limit}>{limit}</li>)}</ul>
        </>}
      </QueryBoundary>
    </Section>
    <Freshness query={list}/>
    <QueryBoundary query={list} label="AI system inventory" isEmpty={data=>!data.items.length}>
      {data=><><DataTable caption="Customer-declared AI systems" rows={data.items} rowKey={item=>item.id} columns={[
        {key:'name',header:'System and use',cell:item=><span className="cell-primary">{item.name}<span className="cell-sub">{item.use_case}</span></span>},
        {key:'owner',header:'Owner',cell:item=>shortId(item.owner_actor_id)},
        {key:'input',header:'Input asset',cell:item=>shortId(item.input_asset_id)},
        {key:'vendor',header:'Processor',cell:item=>item.processor_id?shortId(item.processor_id):'None recorded'},
        {key:'review',header:'Review',cell:item=><button type="button" onClick={()=>setSelected(item.id)}>Open record</button>},
      ]}/><Pagination query={list}/></>}
    </QueryBoundary>
    {canWrite?<CreateAiSystem onSaved={refresh}/>:null}
    {selected?<AiDetail id={selected} session={session} onClose={()=>setSelected(null)} onChanged={refresh}/>:null}
  </>;
}

function CreateAiSystem({onSaved}:{onSaved:()=>void}) {
  const purposes=useCollection('list_purposes');
  const activities=useCollection('list_activities');
  const assets=useCollection('list_data_assets');
  const systems=useCollection('list_systems');
  const processors=useCollection('list_processors');
  const mutation=useMutation('create_ai_system',true);
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    const result=await mutation.run({
      name:String(form.get('name')||''),use_case:String(form.get('use_case')||''),
      purpose_id:String(form.get('purpose_id')||''),processing_activity_id:String(form.get('processing_activity_id')||''),
      input_asset_id:String(form.get('input_asset_id')||''),output_system_id:String(form.get('output_system_id')||''),
      processor_id:String(form.get('processor_id')||'')||null,
    });
    if(result)onSaved();
  }
  const ready=[purposes,activities,assets,systems,processors].every(query=>query.status==='ready'&&!!query.data);
  const sources=[['Purpose',purposes],['Processing activity',activities],['Input asset',assets],['Output system',systems],['Processor',processors]] as const;
  return <Section title="Register an AI use">
    <p>First map the input asset to its processing activity and purpose in Data inventory. The server checks those relationships before saving this record. Your signed-in actor becomes its owner.</p>
    {!ready?<NoticeBox tone="warn" title="Source inventory is incomplete"><p>Registration waits for complete source lists. Open the related workspace section or retry any failed read.</p><ul>{sources.filter(([,query])=>query.status!=='ready').map(([name,query])=><li key={name}>{name}: {query.failure?.code??query.status} <button type="button" onClick={query.refresh}>Retry</button></li>)}</ul></NoticeBox>:null}
    <form className="ai-governance-form" onSubmit={event=>void submit(event)}>
      <label>System name <input name="name" required maxLength={120}/></label>
      <label>Use case <input name="use_case" required maxLength={500}/></label>
      <label>Purpose <select name="purpose_id" required>{purposes.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Processing activity <select name="processing_activity_id" required>{activities.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Input data asset <select name="input_asset_id" required>{assets.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Output system <select name="output_system_id" required>{systems.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Processor <select name="processor_id"><option value="">No processor recorded</option>{processors.data?.items.map(item=><option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <button type="submit" disabled={!ready||mutation.status==='pending'||mutation.unsettled}>Register use</button>
    </form>
    {mutation.failure?<FailureState failure={mutation.failure} onRetry={mutation.unsettled?()=>void mutation.retry():undefined}/>:null}
    {mutation.status==='done'?<NoticeBox tone="ok" title="Use recorded"><p>The inventory was saved as a declaration. Review and monitoring remain separate work.</p></NoticeBox>:null}
  </Section>;
}

function AiDetail({id,session,onClose,onChanged}:{id:string;session:StaffSession;onClose:()=>void;onChanged:()=>void}) {
  const detail=useQuery('ai_system',{params:{id}});
  const [kind,setKind]=useState<Kind>('RISK_ASSESSMENT');
  const mutation=useMutation('record_ai_event',true);
  const canWrite=hasCapability(session,'ai_governance.write');
  async function submit(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=new FormData(event.currentTarget);
    const state=String(form.get('state')) as typeof STATES[number];
    const result=await mutation.run({kind,state,title:String(form.get('title')||''),detail:String(form.get('detail')||''),
      source_reference:String(form.get('source_reference')||'')||null,
      policy_version_id:kind==='POLICY'?String(form.get('policy_version_id')||''):null,
      incident_id:kind==='INCIDENT'?String(form.get('incident_id')||''):null,
    },{params:{id}});
    if(result){detail.refresh();onChanged();}
  }
  return <Section title="Use and review history" aside={<button type="button" onClick={onClose}>Close</button>}>
    <QueryBoundary query={detail} label="AI system detail">{data=><>
      <h3>{data.system.name}</h3><p>{data.system.use_case}</p>
      <p>Owner {shortId(data.system.owner_actor_id)} · Risk assessment {data.assessment_recorded?'recorded':'missing'} · Approval {data.approved?'recorded and current':'missing or invalidated'} · Finding {data.finding_open?'open':'none recorded'} · Last monitor {data.last_monitoring_at?formatTime(data.last_monitoring_at):'not recorded'}</p>
      <p className="muted">Purpose {shortId(data.system.purpose_id)} · Activity {shortId(data.system.processing_activity_id)} · Input asset {shortId(data.system.input_asset_id)} · Output system {shortId(data.system.output_system_id)} · Processor {data.system.processor_id?shortId(data.system.processor_id):'none recorded'}</p>
      {data.event_limit_reached?<NoticeBox tone="warn" title="History window limited"><p>This view shows the latest 100 entries. Use audit export for older history.</p></NoticeBox>:null}
      <DataTable caption="Append-only governance records" rows={data.events} rowKey={item=>item.id} columns={[
        {key:'kind',header:'Record',cell:item=>item.kind.replaceAll('_',' ')},
        {key:'state',header:'State',cell:item=>item.state.replaceAll('_',' ')},
        {key:'detail',header:'Detail',cell:item=><span className="cell-primary">{item.title}<span className="cell-sub">{item.detail}</span></span>},
        {key:'source',header:'Source',cell:item=>item.source_reference??'Not linked'},
        {key:'recorded',header:'Recorded',cell:item=>formatTime(item.recorded_at)},
      ]}/>
    </>}</QueryBoundary>
    {canWrite?<form className="ai-governance-form" onSubmit={event=>void submit(event)}>
      <h3>Add review record</h3>
      <label>Kind <select value={kind} onChange={event=>setKind(event.target.value as Kind)}>{KINDS.map(item=><option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></label>
      <label>State <select name="state">{STATES.filter(item=>kind==='APPROVAL'?item==='APPROVED'||item==='REJECTED':kind==='MONITORING'?item==='RECORDED'||item==='NEEDS_REVIEW'||item==='FINDING':item==='RECORDED'||item==='NEEDS_REVIEW').map(item=><option key={item} value={item}>{item.replaceAll('_',' ')}</option>)}</select></label>
      <label>Title <input name="title" required maxLength={120}/></label>
      <label>Detail <textarea name="detail" required maxLength={500}/></label>
      <label>Source reference <input name="source_reference" maxLength={500}/></label>
      {kind==='POLICY'?<label>Published policy version ID <input name="policy_version_id" required/></label>:null}
      {kind==='INCIDENT'?<label>Incident ID <input name="incident_id" required/></label>:null}
      <button type="submit" disabled={mutation.status==='pending'||mutation.unsettled}>Record</button>
      {kind==='APPROVAL'?<p>Approval requires a different reviewer from the inventory owner, recorded risk/policy/control, and no open finding. The server checks these conditions.</p>:null}
    </form>:null}
    {mutation.failure?<FailureState failure={mutation.failure} onRetry={mutation.unsettled?()=>void mutation.retry():undefined}/>:null}
  </Section>;
}
