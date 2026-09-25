'use client';
import {useState,useEffect,type FormEvent} from 'react';
import type {EndpointMap} from '@orvia/contracts/generated/endpoint-types';
import {useCollection,useMutation,usePagedQuery,useQuery,useRequestGuard} from '../../shared/api.ts';
import {hasCapability,type StaffSession} from '../../shared/session-context.tsx';
import {DataTable,FailureState,Freshness,NoticeBox,PageHead,Pagination,QueryBoundary,Section} from '../../shared/ui.tsx';
import type {UiFailure} from '../../shared/errors.ts';
import {formatTime,shortId} from '../../shared/state-labels.ts';

const text=(form:FormData,key:string)=>String(form.get(key)??'');
const iso=(form:FormData,key:string)=>new Date(text(form,key)).toISOString();
type Feedback={failure:UiFailure|null;status:string;unsettled:boolean;retry:()=>Promise<unknown>};
function Result({mutation,onSaved}:{mutation:Feedback;onSaved:()=>void}){
  return <>{mutation.failure?<FailureState failure={mutation.failure} onRetry={mutation.unsettled?()=>{void mutation.retry().then(value=>{if(value)onSaved();});}:undefined}/>:null}
    {mutation.status==='done'?<p role="status">Record saved.</p>:null}</>;
}
const busy=(mutation:Feedback)=>mutation.status==='pending'||mutation.unsettled;

export function GrcWorkspace({session}:{session:StaffSession}){
  const frameworks=usePagedQuery('list_grc_frameworks',{limit:20});
  const controls=usePagedQuery('list_grc_controls',{limit:20});
  const risks=usePagedQuery('list_grc_risks',{limit:20});
  const [selected,setSelected]=useState<{kind:'control'|'risk';id:string}|null>(null);
  const [create,setCreate]=useState<'framework'|'control'|'risk'|null>(null);
  const guarded=useRequestGuard(),canWrite=hasCapability(session,'grc.write');
  const refresh=()=>{controls.refresh();risks.refresh();};
  return <>
    <PageHead eyebrow="Governance" title="Frameworks, controls and risks" lede="Map requirements to controls, review local evidence and record time-bound risk decisions."/>
    <p><a href="/workspace/grc/audits">Audit engagements</a></p>
    <NoticeBox tone="info" title="Evidence and review stay separate"><p>Manual review records a person’s decision. It does not verify an external control effect or certify compliance.</p></NoticeBox>
    {canWrite?<div className="row">{(['framework','control','risk'] as const).map(kind=><button key={kind} type="button" disabled={guarded} onClick={()=>setCreate(kind)}>Add {kind}</button>)}</div>:null}
    {create?<Section title={`Add ${create}`} aside={<button type="button" disabled={guarded} onClick={()=>setCreate(null)}>Close form</button>}>
      {create==='framework'?<FrameworkForm onSaved={frameworks.refresh}/>:create==='control'?<ControlForm onSaved={refresh}/>:<RiskForm onSaved={refresh}/>}</Section>:null}
    <Section title="Framework versions"><Freshness query={frameworks}/><QueryBoundary query={frameworks} label="Framework versions" isEmpty={data=>!data.items.length}>{data=><>
      <DataTable caption="Versioned requirements" rows={data.items} rowKey={item=>item.id} columns={[
        {key:'name',header:'Framework',cell:item=>item.name},{key:'version',header:'Version',cell:item=>item.version},
        {key:'source',header:'Source',cell:item=>item.source_reference},
        {key:'requirements',header:'Requirements',cell:item=><details><summary>{item.requirements.length} requirements</summary><dl>{item.requirements.map(r=><div key={r.code}><dt>{r.code}</dt><dd>{r.description}</dd></div>)}</dl></details>},
      ]}/><Pagination query={frameworks}/></>}</QueryBoundary></Section>
    <Section title="Controls"><Freshness query={controls}/><QueryBoundary query={controls} label="Controls" isEmpty={data=>!data.items.length}>{data=><>
      <DataTable caption="Recorded controls" rows={data.items} rowKey={item=>item.id} columns={[
        {key:'title',header:'Control',cell:item=><span className="cell-primary">{item.title}<span className="cell-sub">{item.description}</span></span>},
        {key:'owner',header:'Owner',cell:item=>item.owner_reference},
        {key:'mapped',header:'Requirements',cell:item=>item.mappings.length},
        {key:'review',header:'Review interval',cell:item=>`${item.review_interval_days} days`},
        {key:'open',header:'Evidence',cell:item=><button disabled={guarded} onClick={()=>setSelected({kind:'control',id:item.id})}>Review evidence</button>},
      ]}/><Pagination query={controls}/></>}</QueryBoundary></Section>
    <Section title="Risk register"><Freshness query={risks}/><QueryBoundary query={risks} label="Risks" isEmpty={data=>!data.items.length}>{data=><>
      <DataTable caption="Declared risks" rows={data.items} rowKey={item=>item.id} columns={[
        {key:'title',header:'Risk',cell:item=><span className="cell-primary">{item.title}<span className="cell-sub">{item.description}</span></span>},
        {key:'owner',header:'Owner',cell:item=>item.owner_reference},
        {key:'score',header:'Declared likelihood × impact',cell:item=>`${item.likelihood} × ${item.impact} = ${item.likelihood*item.impact}`},
        {key:'due',header:'Review due',cell:item=>formatTime(item.review_due_at)},
        {key:'open',header:'Treatment',cell:item=><button disabled={guarded} onClick={()=>setSelected({kind:'risk',id:item.id})}>Open risk</button>},
      ]}/><Pagination query={risks}/></>}</QueryBoundary></Section>
    {selected?<Section title={selected.kind==='control'?'Control evidence':'Risk treatment'} aside={<button disabled={guarded} onClick={()=>setSelected(null)}>Close record</button>}>
      {selected.kind==='control'?<ControlDetail key={selected.id} id={selected.id} session={session}/>:<RiskDetail key={selected.id} id={selected.id} session={session}/>}</Section>:null}
  </>;
}

function FrameworkForm({onSaved}:{onSaved:()=>void}){
  const mutation=useMutation('create_grc_framework',true);
  const [requirements,setRequirements]=useState([{code:'',description:''}]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.run({name:text(form,'name'),version:text(form,'version'),source_reference:text(form,'source'),requirements}))onSaved();}
  return <><form className="ai-governance-form" onSubmit={event=>void submit(event)}>
    <label>Framework name<input name="name" required maxLength={500}/></label><label>Version<input name="version" required maxLength={80}/></label>
    <label>Source reference<input name="source" required maxLength={500}/></label>
    {requirements.map((requirement,index)=><fieldset key={index} disabled={busy(mutation)}><legend>Requirement {index+1}</legend>
      <label>Code<input required maxLength={80} value={requirement.code} onChange={event=>setRequirements(items=>items.map((item,i)=>i===index?{...item,code:event.target.value}:item))}/></label>
      <label>Description<input required maxLength={500} value={requirement.description} onChange={event=>setRequirements(items=>items.map((item,i)=>i===index?{...item,description:event.target.value}:item))}/></label>
      {requirements.length>1?<button type="button" onClick={()=>setRequirements(items=>items.filter((_,i)=>i!==index))}>Remove requirement {index+1}</button>:null}
    </fieldset>)}
    <button type="button" disabled={requirements.length>=100||busy(mutation)} onClick={()=>setRequirements(items=>[...items,{code:'',description:''}])}>Add requirement</button>
    <button disabled={busy(mutation)}>Save framework version</button>
  </form><Result mutation={mutation} onSaved={onSaved}/></>;
}

function ControlForm({onSaved}:{onSaved:()=>void}){
  const frameworks=useCollection('list_grc_frameworks');const mutation=useMutation('create_grc_control',true);
  const [filter,setFilter]=useState(''),[selectedMappings,setSelectedMappings]=useState<string[]>([]);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);
    const selected=new Set(selectedMappings);
    const mappings=frameworks.data?.items.flatMap(f=>f.requirements.filter(r=>selected.has(`${f.id}:${r.code}`)).map(r=>({framework_id:f.id,requirement_code:r.code})))??[];
    if(await mutation.run({title:text(form,'title'),description:text(form,'description'),owner_reference:text(form,'owner'),review_interval_days:Number(form.get('interval')),mappings}))onSaved();
  }
  return <><form className="ai-governance-form" onSubmit={event=>void submit(event)}>
    <label>Control title<input name="title" required maxLength={500}/></label><label>Description<input name="description" required maxLength={500}/></label>
    <label>Accountable owner<input name="owner" required maxLength={500}/></label><label>Review interval (days)<input name="interval" type="number" required min={1} max={365} defaultValue={30}/></label>
    <label>Find a requirement<input value={filter} onChange={event=>setFilter(event.target.value)} placeholder="Framework, code or description"/></label>
    <p role="status">{selectedMappings.length} requirement(s) selected. Selections are retained when filtering.</p>
    <QueryBoundary query={frameworks} label="Framework versions" isEmpty={data=>!data.items.length}>{data=><fieldset disabled={busy(mutation)}><legend>Map at least one requirement</legend><div style={{maxHeight:320,overflowY:'auto'}}>{data.items.map(f=>{
      const visible=f.requirements.filter(r=>`${f.name} ${f.version} ${r.code} ${r.description}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase()));
      return visible.length?<fieldset key={f.id}><legend>{f.name} · {f.version}</legend>{visible.map(r=>{const key=`${f.id}:${r.code}`,checked=selectedMappings.includes(key);return <label key={r.code} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:12}}><input style={{width:16,height:16,flexShrink:0,marginTop:3,padding:0}} type="checkbox" name="mapping" value={key} checked={checked} disabled={!checked&&selectedMappings.length>=100} onChange={event=>setSelectedMappings(values=>event.target.checked?[...values,key]:values.filter(value=>value!==key))}/>{r.code} — {r.description}</label>;})}</fieldset>:null;
    })}</div></fieldset>}</QueryBoundary>
    <button disabled={busy(mutation)||frameworks.status!=='ready'||!selectedMappings.length}>Save control</button>
  </form><Result mutation={mutation} onSaved={onSaved}/></>;
}

function RiskForm({onSaved}:{onSaved:()=>void}){
  const controls=useCollection('list_grc_controls');const mutation=useMutation('create_grc_risk',true);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.run({title:text(form,'title'),description:text(form,'description'),owner_reference:text(form,'owner'),likelihood:Number(form.get('likelihood')),impact:Number(form.get('impact')),review_due_at:iso(form,'due'),control_ids:form.getAll('control').map(String)}))onSaved();}
  return <><form className="ai-governance-form" onSubmit={event=>void submit(event)}>
    <label>Risk title<input name="title" required maxLength={500}/></label><label>Description<input name="description" required maxLength={500}/></label><label>Accountable owner<input name="owner" required maxLength={500}/></label>
    <label>Declared likelihood (1–5)<input name="likelihood" type="number" min={1} max={5} required/></label><label>Declared impact (1–5)<input name="impact" type="number" min={1} max={5} required/></label><label>Review due<input name="due" type="datetime-local" required/></label>
    <QueryBoundary query={controls} label="Linked controls">{data=><fieldset><legend>Related controls (optional)</legend>{data.items.map(c=><label key={c.id} style={{display:'flex',alignItems:'flex-start',gap:8,marginBottom:12}}><input style={{width:16,height:16,flexShrink:0,marginTop:3,padding:0}} type="checkbox" name="control" value={c.id}/>{c.title}</label>)}</fieldset>}</QueryBoundary>
    <button disabled={busy(mutation)||controls.status!=='ready'}>Save risk</button>
  </form><Result mutation={mutation} onSaved={onSaved}/></>;
}

function ControlDetail({id,session}:{id:string;session:StaffSession}){
  const detail=useQuery('grc_control_detail',{params:{id}});
  const history=usePagedQuery('grc_evidence_history',{params:{id},limit:10});
  const refresh=()=>{detail.refresh();history.refresh();};
  useEffect(()=>{const timer=setInterval(detail.refresh,30000);return ()=>clearInterval(timer);},[detail.refresh]);
  return <><Freshness query={detail}/><QueryBoundary query={detail} label="Control detail">{data=><>
    <h3>{data.control.title}</h3><p>{data.control.description}</p><p>Evidence status: <strong>{data.standing.state.replaceAll('_',' ')}</strong> · As of {formatTime(data.standing.as_of)}</p>
    {data.evidence?<><p>{data.evidence.description}</p><dl><dt>Local reference</dt><dd>{data.evidence.local_reference}</dd><dt>Submitted digest (SHA-256)</dt><dd><code style={{overflowWrap:'anywhere'}}>{data.evidence.content_sha256}</code></dd><dt>Collected / valid until</dt><dd>{formatTime(data.evidence.collected_at)} / {formatTime(data.evidence.valid_until)}</dd><dt>Submitted by</dt><dd>{shortId(data.evidence.recorded_by)}</dd></dl></>:<p>No evidence submitted.</p>}
    {data.review?<p>Review: {data.review.decision} — {data.review.reason} · {formatTime(data.review.recorded_at)}</p>:null}
    {data.evidence&&!data.review&&hasCapability(session,'grc.approve')?<EvidenceReview key={data.evidence.id} id={id} evidence={data.evidence} author={data.control.recorded_by} session={session} onSaved={refresh}/>:null}
  </>}</QueryBoundary>{hasCapability(session,'grc.write')?<EvidenceForm id={id} onSaved={refresh}/>:null}
    <h3>Evidence history</h3><p>Decisions below are historical. Current validity is shown above.</p>
    <QueryBoundary query={history} label="Evidence history" isEmpty={data=>!data.items.length}>{data=><><DataTable caption="Recorded evidence, newest first" rows={data.items} rowKey={item=>item.id} columns={[
      {key:'time',header:'Submitted',cell:item=>formatTime(item.recorded_at)},
      {key:'evidence',header:'Evidence',cell:item=><span className="cell-primary">{item.description}<span className="cell-sub">{item.local_reference}</span></span>},
      {key:'review',header:'Decision at review',cell:item=>item.review?`${item.review.decision} — ${item.review.reason}`:'No review recorded'},
    ]}/><Pagination query={history}/></>}</QueryBoundary></>;
}

function EvidenceForm({id,onSaved}:{id:string;onSaved:()=>void}){
  const mutation=useMutation('submit_grc_evidence',true);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.run({description:text(form,'description'),local_reference:text(form,'reference'),content_sha256:text(form,'digest'),collected_at:iso(form,'collected'),valid_until:iso(form,'valid')},{params:{id}}))onSaved();}
  return <><h3>Submit evidence</h3><p>A new submission replaces the current evidence for review. Its contents stay in your local evidence store; this records your reference and declared digest.</p>
    <form className="ai-governance-form" onSubmit={event=>void submit(event)}><label>Description<input name="description" required maxLength={500}/></label><label>Local evidence reference<input name="reference" required maxLength={500}/></label><label>SHA-256 digest<input name="digest" required pattern="[a-f0-9]{64}" minLength={64} maxLength={64}/></label><label>Collected at<input type="datetime-local" name="collected" required/></label><label>Valid until<input type="datetime-local" name="valid" required/></label><button disabled={busy(mutation)}>Submit for review</button></form><Result mutation={mutation} onSaved={onSaved}/></>;
}

function EvidenceReview({id,evidence,author,session,onSaved}:{id:string;evidence:NonNullable<EndpointMap['grc_control_detail']['response']['evidence']>;author:string;session:StaffSession;onSaved:()=>void}){
  const mutation=useMutation('review_grc_evidence',true);const independent=session.actor_id!==author&&session.actor_id!==evidence.recorded_by;
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.run({evidence_id:evidence.id,decision:text(form,'decision') as 'ACCEPT'|'REJECT',reason:text(form,'reason')},{params:{id}}))onSaved();}
  return independent?<><form className="ai-governance-form" onSubmit={event=>void submit(event)}><label>Evidence decision<select name="decision"><option value="REJECT">Reject</option><option value="ACCEPT">Accept manual evidence</option></select></label><label>Review reason<input name="reason" required maxLength={500}/></label><button disabled={busy(mutation)}>Record evidence review</button></form><Result mutation={mutation} onSaved={onSaved}/></>:<p>An independent reviewer must assess this evidence.</p>;
}

function RiskDetail({id,session}:{id:string;session:StaffSession}){
  const detail=useQuery('grc_risk_detail',{params:{id}});
  const history=usePagedQuery('grc_treatment_history',{params:{id},limit:10});
  const refresh=()=>{detail.refresh();history.refresh();};
  useEffect(()=>{const timer=setInterval(detail.refresh,30000);return ()=>clearInterval(timer);},[detail.refresh]);
  return <><Freshness query={detail}/><QueryBoundary query={detail} label="Risk detail">{data=><>
    <h3>{data.risk.title}</h3><p>{data.risk.description}</p><p>Treatment status: <strong>{data.standing.state.replaceAll('_',' ')}</strong> · As of {formatTime(data.standing.as_of)}</p>
    {data.standing.review_overdue?<p role="status">Risk review is overdue.</p>:null}{data.standing.treatment_overdue?<p role="status">Treatment due date has passed.</p>:null}
    {data.treatment?<><p>{data.treatment.response}: {data.treatment.plan}</p><p>Due {formatTime(data.treatment.due_at)}{data.treatment.acceptance_expires_at?` · Acceptance expires ${formatTime(data.treatment.acceptance_expires_at)}`:''}</p></>:<p>No treatment proposed.</p>}
    {data.review?<p>Review: {data.review.decision} — {data.review.reason}</p>:null}
    {data.treatment&&!data.review&&hasCapability(session,'grc.approve')?<TreatmentReview key={data.treatment.id} id={id} treatment={data.treatment} author={data.risk.recorded_by} session={session} onSaved={refresh}/>:null}
  </>}</QueryBoundary>{hasCapability(session,'grc.write')?<TreatmentForm id={id} onSaved={refresh}/>:null}
    <h3>Treatment history</h3><p>Prior approvals do not apply to replacement plans.</p>
    <QueryBoundary query={history} label="Treatment history" isEmpty={data=>!data.items.length}>{data=><><DataTable caption="Recorded treatments, newest first" rows={data.items} rowKey={item=>item.id} columns={[
      {key:'time',header:'Proposed',cell:item=>formatTime(item.recorded_at)},
      {key:'plan',header:'Treatment',cell:item=>`${item.response}: ${item.plan}`},
      {key:'review',header:'Decision at review',cell:item=>item.review?`${item.review.decision} — ${item.review.reason}`:'No review recorded'},
    ]}/><Pagination query={history}/></>}</QueryBoundary></>;
}

function TreatmentForm({id,onSaved}:{id:string;onSaved:()=>void}){
  const mutation=useMutation('propose_grc_treatment',true);const [response,setResponse]=useState<'MITIGATE'|'AVOID'|'TRANSFER'|'ACCEPT'>('MITIGATE');
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.run({response,plan:text(form,'plan'),due_at:iso(form,'due'),acceptance_expires_at:response==='ACCEPT'?iso(form,'expires'):null},{params:{id}}))onSaved();}
  return <><h3>Propose treatment</h3><p>Reviewing a plan does not verify its execution or close the risk.</p><form className="ai-governance-form" onSubmit={event=>void submit(event)}><label>Response<select value={response} onChange={event=>setResponse(event.target.value as typeof response)}>{(['MITIGATE','AVOID','TRANSFER','ACCEPT'] as const).map(value=><option key={value} value={value}>{value}</option>)}</select></label><label>Plan<input name="plan" required maxLength={500}/></label><label>Due at<input name="due" type="datetime-local" required/></label>{response==='ACCEPT'?<label>Acceptance expires at<input name="expires" type="datetime-local" required/></label>:null}<button disabled={busy(mutation)}>Propose treatment</button></form><Result mutation={mutation} onSaved={onSaved}/></>;
}

function TreatmentReview({id,treatment,author,session,onSaved}:{id:string;treatment:NonNullable<EndpointMap['grc_risk_detail']['response']['treatment']>;author:string;session:StaffSession;onSaved:()=>void}){
  const mutation=useMutation('review_grc_treatment',true);const independent=session.actor_id!==author&&session.actor_id!==treatment.recorded_by;
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();const form=new FormData(event.currentTarget);if(await mutation.run({treatment_id:treatment.id,decision:text(form,'decision') as 'ACCEPT'|'REJECT',reason:text(form,'reason')},{params:{id}}))onSaved();}
  return independent?<><form className="ai-governance-form" onSubmit={event=>void submit(event)}><label>Treatment decision<select name="decision"><option value="REJECT">Reject</option><option value="ACCEPT">Approve treatment plan</option></select></label><label>Review reason<input name="reason" required maxLength={500}/></label><button disabled={busy(mutation)}>Record treatment review</button></form><Result mutation={mutation} onSaved={onSaved}/></>:<p>An independent reviewer must assess this treatment.</p>;
}
