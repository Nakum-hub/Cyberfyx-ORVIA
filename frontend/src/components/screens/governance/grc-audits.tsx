'use client';
import {useEffect,useState,type FormEvent} from 'react';
import type {EndpointMap} from '@orvia/contracts/generated/endpoint-types';
import {useCollection,useMutation,usePagedQuery,useQuery,useRequestGuard} from '../../shared/api.ts';
import {hasCapability,type StaffSession} from '../../shared/session-context.tsx';
import {DataTable,FailureState,Freshness,NoticeBox,PageHead,Pagination,QueryBoundary,Section} from '../../shared/ui.tsx';
import {formatTime} from '../../shared/state-labels.ts';
import type {UiFailure} from '../../shared/errors.ts';
type Audit=EndpointMap['grc_audit_detail']['response']['audit'];
type RequestRecord=EndpointMap['grc_audit_request_detail']['response']['request'];
type Mutation={status:string;unsettled:boolean;failure:UiFailure|null;retry:()=>Promise<unknown>};
const text=(f:FormData,key:string)=>String(f.get(key)??'');
const date=(f:FormData,key:string)=>new Date(text(f,key)).toISOString();
const busy=(m:Mutation)=>m.status==='pending'||m.unsettled;
function Result({mutation,onSaved}:{mutation:Mutation;onSaved:()=>void}){return <>{mutation.failure?<FailureState failure={mutation.failure} onRetry={mutation.unsettled?()=>{void mutation.retry().then(v=>{if(v)onSaved();});}:undefined}/>:null}{mutation.status==='done'?<p role="status">Record saved.</p>:null}</>;}

export function GrcAuditWorkspace({session}:{session:StaffSession}){
  const list=usePagedQuery('list_grc_audits',{limit:20}),guarded=useRequestGuard();
  const [create,setCreate]=useState(false),[selected,setSelected]=useState<string|null>(null);
  return <><PageHead eyebrow="Governance" title="Audit engagements" lede="Define control scope, request local evidence and retain independent review decisions."/>
    <p><a href="/workspace/grc">Frameworks, controls and risks</a></p>
    <NoticeBox tone="info" title="Closure records a reviewed engagement"><p>Closing an engagement requires current accepted responses for every scoped control. It does not certify compliance or verify external control effects.</p></NoticeBox>
    {hasCapability(session,'grc.write')?<button disabled={guarded} onClick={()=>setCreate(!create)}>{create?'Close form':'Plan audit'}</button>:null}
    {create?<Section title="Plan audit"><PlanForm onSaved={list.refresh}/></Section>:null}
    <Section title="Engagements"><Freshness query={list}/><QueryBoundary query={list} label="Audit engagements" isEmpty={d=>!d.items.length}>{d=><><DataTable caption="Recorded audit scope" rows={d.items} rowKey={r=>r.id} columns={[
      {key:'title',header:'Audit',cell:r=>r.title},{key:'owner',header:'Owner',cell:r=>r.owner_reference},{key:'due',header:'Due',cell:r=>formatTime(r.due_at)},{key:'scope',header:'Controls',cell:r=>r.control_ids.length},{key:'open',header:'Requests',cell:r=><button disabled={guarded} onClick={()=>setSelected(r.id)}>Open audit</button>},
    ]}/><Pagination query={list}/></>}</QueryBoundary></Section>
    {selected?<Section title="Audit detail" aside={<button disabled={guarded} onClick={()=>setSelected(null)}>Close audit view</button>}><AuditDetail key={selected} id={selected} session={session}/></Section>:null}
  </>;
}
function PlanForm({onSaved}:{onSaved:()=>void}){
  const controls=useCollection('list_grc_controls'),m=useMutation('create_grc_audit',true);
  const [selected,setSelected]=useState<string[]>([]),[filter,setFilter]=useState('');
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await m.run({title:text(f,'title'),objective:text(f,'objective'),owner_reference:text(f,'owner'),due_at:date(f,'due'),control_ids:selected}))onSaved();}
  return <><form className="ai-governance-form" onSubmit={e=>void submit(e)}><label>Audit title<input name="title" required maxLength={500}/></label><label>Objective<input name="objective" required maxLength={500}/></label><label>Accountable owner<input name="owner" required maxLength={500}/></label><label>Audit due<input name="due" type="datetime-local" required/></label><label>Find a control<input value={filter} onChange={e=>setFilter(e.target.value)}/></label>
    <p role="status">{selected.length} control(s) selected. Scope is immutable after saving.</p>
    <QueryBoundary query={controls} label="Available controls" isEmpty={d=>!d.items.length}>{d=><fieldset disabled={busy(m)}><legend>Audit scope (1 to 100 controls)</legend><div style={{maxHeight:320,overflowY:'auto'}}>{d.items.filter(c=>`${c.title} ${c.description}`.toLocaleLowerCase().includes(filter.toLocaleLowerCase())).map(c=><label key={c.id} style={{display:'flex',gap:8,marginBottom:12}}><input type="checkbox" style={{width:16,height:16,flexShrink:0}} checked={selected.includes(c.id)} disabled={!selected.includes(c.id)&&selected.length>=100} onChange={e=>setSelected(ids=>e.target.checked?[...ids,c.id]:ids.filter(id=>id!==c.id))}/>{c.title}</label>)}</div></fieldset>}</QueryBoundary>
    <button disabled={busy(m)||controls.status!=='ready'||!selected.length}>Save audit plan</button></form><Result mutation={m} onSaved={onSaved}/></>;
}
function AuditDetail({id,session}:{id:string;session:StaffSession}){
  const detail=useQuery('grc_audit_detail',{params:{id}}),requests=usePagedQuery('grc_audit_requests',{params:{id},limit:10}),guarded=useRequestGuard();
  const [selected,setSelected]=useState<RequestRecord|null>(null);
  const refresh=()=>{detail.refresh();requests.refresh();};
  return <><Freshness query={detail}/><QueryBoundary query={detail} label="Audit detail">{d=><>
    <h3>{d.audit.title}</h3><p>{d.audit.objective}</p><p>Due {formatTime(d.audit.due_at)}. Status: <strong>{d.closure?'CLOSED':'OPEN'}</strong></p>
    {d.closure?<p>Closed {formatTime(d.closure.recorded_at)}: {d.closure.reason}. {d.closure.accepted_response_ids.length} accepted responses were bound to this closure.</p>:<>
      {hasCapability(session,'grc.write')?<RequestForm audit={d.audit} onSaved={refresh}/>:null}
      {hasCapability(session,'grc.approve')&&session.actor_id!==d.audit.recorded_by?<CloseForm id={id} onSaved={refresh}/>:null}
    </>}
    <h3>Evidence requests</h3><QueryBoundary query={requests} label="Audit requests" isEmpty={r=>!r.items.length}>{r=><><DataTable caption="Requested evidence" rows={r.items} rowKey={item=>item.id} columns={[
      {key:'description',header:'Request',cell:item=>item.description},{key:'owner',header:'Assignee reference',cell:item=>item.assignee_reference},{key:'due',header:'Due',cell:item=>formatTime(item.due_at)},{key:'open',header:'Response',cell:item=><button disabled={guarded} onClick={()=>setSelected(item)}>Open request</button>},
    ]}/><Pagination query={requests}/></>}</QueryBoundary>
    {selected?<Section title="Evidence request" aside={<button disabled={guarded} onClick={()=>setSelected(null)}>Close request view</button>}><RequestDetail key={selected.id} request={selected} audit={d.audit} closed={!!d.closure} session={session}/></Section>:null}
  </>}</QueryBoundary></>;
}
function RequestForm({audit,onSaved}:{audit:Audit;onSaved:()=>void}){
  const controls=useCollection('list_grc_controls'),m=useMutation('create_grc_audit_request',true);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await m.run({control_id:text(f,'control'),description:text(f,'description'),assignee_reference:text(f,'assignee'),due_at:date(f,'due')},{params:{id:audit.id}}))onSaved();}
  return <><h3>Request evidence</h3><form className="ai-governance-form" onSubmit={e=>void submit(e)}><QueryBoundary query={controls} label="Scoped controls">{d=><label>Scoped control<select name="control" required defaultValue=""><option value="" disabled>Select control</option>{d.items.filter(c=>audit.control_ids.includes(c.id)).map(c=><option value={c.id} key={c.id}>{c.title}</option>)}</select></label>}</QueryBoundary><label>Request description<input name="description" required maxLength={500}/></label><label>Assignee reference<input name="assignee" required maxLength={500}/></label><label>Request due<input type="datetime-local" name="due" required/></label><p>The assignee reference records responsibility; it does not grant access or send a message.</p><button disabled={busy(m)||controls.status!=='ready'}>Save evidence request</button></form><Result mutation={m} onSaved={onSaved}/></>;
}
function CloseForm({id,onSaved}:{id:string;onSaved:()=>void}){const m=useMutation('close_grc_audit',true);async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();if(await m.run({reason:text(new FormData(e.currentTarget),'reason')},{params:{id}}))onSaved();}return <><h3>Close engagement</h3><p>Every scoped control must have a request, and every request must have a current independently accepted response. Missing or stale evidence prevents closure.</p><form className="ai-governance-form" onSubmit={e=>void submit(e)}><label>Closure reason<input name="reason" required maxLength={500}/></label><button disabled={busy(m)}>Close reviewed audit</button></form><Result mutation={m} onSaved={onSaved}/></>;}
function RequestDetail({request,audit,closed,session}:{request:RequestRecord;audit:Audit;closed:boolean;session:StaffSession}){
  const detail=useQuery('grc_audit_request_detail',{params:{id:request.id}}),history=usePagedQuery('grc_audit_response_history',{params:{id:request.id},limit:10});
  const refresh=()=>{detail.refresh();history.refresh();};
  useEffect(()=>{const timer=setInterval(detail.refresh,30000);return ()=>clearInterval(timer);},[detail.refresh]);
  return <><p>{request.description}</p><Freshness query={detail}/><QueryBoundary query={detail} label="Evidence request detail">{d=><>
    <p>Current response status: <strong>{d.state.replaceAll('_',' ')}</strong>. As of {formatTime(d.as_of)}.</p>
    {d.response?<><p>{d.response.explanation}</p><p>Evidence snapshot: {d.response.evidence_snapshot.description}</p><p>Local reference: {d.response.evidence_snapshot.local_reference}</p><p>Declared digest: <code style={{overflowWrap:'anywhere'}}>{d.response.evidence_snapshot.content_sha256}</code></p></>:null}
    {d.review?<p>Review: {d.review.decision} - {d.review.reason}</p>:null}
    {!closed&&d.response&&!d.review&&hasCapability(session,'grc.approve')?([audit.recorded_by,request.recorded_by,d.response.recorded_by,d.response.evidence_snapshot.recorded_by].includes(session.actor_id)?<p>An independent reviewer must decide this response.</p>:<ResponseReview key={d.response.id} id={request.id} responseId={d.response.id} onSaved={refresh}/>):null}
  </>}</QueryBoundary>
    {!closed&&hasCapability(session,'grc.write')?<ResponseForm request={request} onSaved={refresh}/>:null}
    <h3>Response history</h3><p>Historical decisions do not establish current evidence validity.</p><QueryBoundary query={history} label="Response history" isEmpty={d=>!d.items.length}>{d=><><DataTable caption="Responses, newest first" rows={d.items} rowKey={r=>r.id} columns={[
      {key:'time',header:'Submitted',cell:r=>formatTime(r.recorded_at)},{key:'response',header:'Response',cell:r=><span>{r.explanation}<br/>{r.evidence_snapshot.local_reference}</span>},{key:'review',header:'Historical review',cell:r=>r.review?`${r.review.decision}: ${r.review.reason}`:'No review'},
    ]}/><Pagination query={history}/></>}</QueryBoundary></>;
}
function ResponseForm({request,onSaved}:{request:RequestRecord;onSaved:()=>void}){
  const control=useQuery('grc_control_detail',{params:{id:request.control_id}}),m=useMutation('respond_grc_audit_request',true);
  async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const evidence=control.data?.evidence;if(evidence&&await m.run({evidence_id:evidence.id,explanation:text(new FormData(e.currentTarget),'explanation')},{params:{id:request.id}}))onSaved();}
  return <><h3>Respond with local evidence</h3><Freshness query={control}/><QueryBoundary query={control} label="Current control evidence">{d=>d.standing.state==='MANUAL_REVIEW_ACCEPTED'&&d.evidence?<><p>Current accepted manual evidence: {d.evidence.description}. This response records an immutable snapshot of its reference, digest and validity.</p><form className="ai-governance-form" onSubmit={e=>void submit(e)}><label>Response explanation<input name="explanation" required maxLength={500}/></label><button disabled={busy(m)}>Submit audit response</button></form></>:<p>Submit and independently review current evidence in the controls workspace before responding.</p>}</QueryBoundary><Result mutation={m} onSaved={onSaved}/></>;
}
function ResponseReview({id,responseId,onSaved}:{id:string;responseId:string;onSaved:()=>void}){const m=useMutation('review_grc_audit_response',true);async function submit(e:FormEvent<HTMLFormElement>){e.preventDefault();const f=new FormData(e.currentTarget);if(await m.run({response_id:responseId,decision:text(f,'decision') as 'ACCEPT'|'REJECT',reason:text(f,'reason')},{params:{id}}))onSaved();}return <><form className="ai-governance-form" onSubmit={e=>void submit(e)}><label>Audit response decision<select name="decision"><option value="REJECT">Reject</option><option value="ACCEPT">Accept response</option></select></label><label>Audit review reason<input name="reason" required maxLength={500}/></label><button disabled={busy(m)}>Record audit review</button></form><Result mutation={m} onSaved={onSaved}/></>;}
