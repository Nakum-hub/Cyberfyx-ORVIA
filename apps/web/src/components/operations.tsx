'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { schemas } from '@orvia/contracts';
import programme from '../../../../tracking/capabilities.json';
import { call, currentIdentity, useCollection, useMutation, useNow, usePagedQuery, useQuery, POLL } from './api.ts';
import { actionVerification, buildTimeline, obligationAction, obligationStatus, obligationTotals } from './derive.ts';
import { describeFailure, type UiFailure } from './errors.ts';
import { hasCapability, type StaffSession } from './session-context.tsx';
import { EXECUTION_LABELS, OBSERVATION_LABELS, WORKFLOW_LABELS, CONSENT_LABELS, DECISION_LABELS, formatTime } from './state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, Pagination, QueryBoundary, StateBadge, TextField } from './ui.tsx';
import { MutationFeedback } from './mutation-feedback.tsx';
import { Select } from './configuration.tsx';

type Workflow = ReturnType<typeof schemas.Workflow.parse>;
type Obligation = ReturnType<typeof schemas.Obligation.parse>;
type Action = ReturnType<typeof schemas.Action.parse>;

export function Workflows({evidence=false}:{evidence?:boolean}) {
  const query=usePagedQuery('workflows',{limit:20});
  return <><div className="page-head"><h2>{evidence?'Evidence directory':'Workflows'}</h2><p>Recorded operations in your current scope. Open an exact workflow to read its obligations, attempts and evidence.</p></div>
    <Freshness query={query}/><QueryBoundary query={query} label="workflows" isEmpty={d=>!d.items.length}>{d=><DataTable caption="Recorded workflows (server cursor order)" rows={d.items} rowKey={w=>w.id} columns={[
      {key:'id',header:'Workflow',cell:w=><a href={`/workspace/${evidence?'evidence':'workflows'}/${w.id}`}>{w.id}</a>},
      {key:'purpose',header:'Purpose',cell:w=><code>{w.purpose_id}</code>},
      {key:'state',header:'Recorded state',cell:w=><StateBadge dictionary={WORKFLOW_LABELS} value={w.state}/>},
      {key:'accepted',header:'Accepted',cell:w=>formatTime(w.accepted_at)},
      {key:'updated',header:'Updated',cell:w=>formatTime(w.updated_at)},
    ]}/>}</QueryBoundary><Pagination query={query}/></>;
}

export function WorkflowDetail({id,session}:{id:string;session:StaffSession}) {
  const query=useQuery('workflow',{params:{id},pollWhile:d=>!POLL.workflowTerminal.includes(d.state)});
  return <><div className="page-head"><h2>Workflow detail</h2><p><code>{id}</code></p></div><p><a href="/workspace/workflows">All workflows</a>{hasCapability(session,'evidence.read')?<> · <a href={`/workspace/evidence/${id}`}>Evidence for this workflow</a></>:null}</p>
    <Freshness query={query}/><QueryBoundary query={query} label="workflow">{workflow=><WorkflowFacts workflow={workflow} session={session} refresh={query.refresh}/>}</QueryBoundary></>;
}

function WorkflowFacts({workflow,session,refresh}:{workflow:Workflow;session:StaffSession;refresh:()=>void}) {
  const now=useNow(1000);const totals=obligationTotals(workflow,now);const timeline=buildTimeline(workflow);
  return <><section className="panel"><h3>Accepted operation</h3><StateBadge dictionary={WORKFLOW_LABELS} value={workflow.state}/><Facts items={[
    {term:'Event',value:<code>{workflow.event_id}</code>},{term:'Purpose',value:<code>{workflow.purpose_id}</code>},{term:'Accepted',value:formatTime(workflow.accepted_at)},{term:'Updated',value:formatTime(workflow.updated_at)},
  ]}/><p>{totals.statement}</p><p>Recorded workflow status and current evidence freshness are separate. This API does not expose every outbox, dispatch or worker timestamp; absent stages are not invented.</p></section>
    <section aria-label="Workflow actions"><h3>Actions and independent observations</h3>{!workflow.actions.length?<p>No action is recorded yet. Acceptance alone does not establish a target effect.</p>:workflow.actions.map(action=><ActionCard key={action.id} action={action} workflow={workflow} session={session} refresh={refresh} now={now}/>)}</section>
    <section aria-label="Workflow obligations"><h3>Obligations</h3>{!workflow.obligations.length?<p>No obligation is recorded yet.</p>:workflow.obligations.map(obligation=><ObligationCard key={obligation.id} obligation={obligation} action={obligationAction(obligation,workflow)} now={now}/>)}</section>
    <section className="panel"><h3>Recorded timeline</h3><ol className="timeline">{timeline.map((entry,index)=><li key={index}><time>{formatTime(entry.at)}</time><Badge label={entry.title} tone={entry.tone}/><p>{entry.detail}</p></li>)}</ol></section></>;
}

function ActionCard({action,workflow,session,refresh,now}:{action:Action;workflow:Workflow;session:StaffSession;refresh:()=>void;now:number}) {
  const reconcile=useMutation('reconcile',true);
  const current=workflow.obligations.some(o=>o.observation?.action_id===action.id&&o.scope_still_current);
  const verification=actionVerification(action,now,current);
  return <article className="panel"><h4>Action {action.id}</h4><StateBadge dictionary={EXECUTION_LABELS} value={action.execution_state}/>{' '}<Badge label={verification.claim} tone={verification.verified?'ok':'warn'}/><p>{verification.detail}</p>
    <Facts items={Object.entries(action.plan.scope).map(([term,value])=>({term:term.replaceAll('_',' '),value:<code>{value}</code>}))}/>
    <p>Capability {action.plan.capability} · version {action.plan.capability_version} · maximum attempts {action.plan.operation_budget.maximum_attempts}</p>
    <h4>Execution receipts</h4>{!action.attempts.length?<p>No target response recorded.</p>:action.attempts.map(attempt=><p key={attempt.attempt_id}><code>{attempt.attempt_id}</code> · <StateBadge dictionary={EXECUTION_LABELS} value={attempt.execution_state}/> · {attempt.reason_code} · {formatTime(attempt.recorded_at)} · command <code>{attempt.command_id}</code></p>)}
    <h4>Observation records</h4>{!action.observations.length?<p>No observation recorded.</p>:action.observations.map(o=><div key={o.id}><p><code>{o.id}</code> · {o.method} · <StateBadge dictionary={OBSERVATION_LABELS} value={o.state}/></p><p>Observed {formatTime(o.observed_at)}; fresh until {formatTime(o.fresh_until)}; generation {o.target_generation}; target state {o.observed_state}.</p>{o.method!=='SCOPED_READ'?<p>Provider evidence is not independent observation.</p>:null}<ul>{o.limits.map(limit=><li key={limit}>{limit}</li>)}</ul></div>)}
    {hasCapability(session,'action.reconcile')?<><button type="button" disabled={reconcile.status==='pending'||reconcile.unsettled} onClick={async()=>{if(await reconcile.run(undefined,{params:{id:action.id}}))refresh();}}>Request scoped read reconciliation</button><p>This requests a read, never replays the target effect. The server checks current scope and action eligibility.</p></>:null}
    <MutationFeedback mutation={reconcile} onReplayed={refresh}/>{reconcile.result?<p role="status">Reconciliation accepted at {formatTime(reconcile.result.accepted_at)}. Acceptance is not resolution. <button type="button" onClick={refresh}>Read recorded outcome</button></p>:null}
  </article>;
}

function ObligationCard({obligation,action,now,children}:{obligation:Obligation;action:Action|null;now:number;children?:ReactNode}) {
  const status=obligationStatus(obligation,action,now);
  return <article className="panel"><h4>Obligation {obligation.id}</h4><Badge label={status.resolved?'Criterion satisfied':'Unresolved'} tone={status.tone}/>{' '}<StateBadge dictionary={EXECUTION_LABELS} value={obligation.execution_state}/><p>{status.summary}</p><p>{obligation.required?'Required':'Optional'} · {obligation.completion_criterion} · scope {obligation.scope_still_current?'current':'superseded'}</p>{obligation.skip_reason?<p>Skip reason: {obligation.skip_reason}</p>:null}
    {obligation.attestation?<><h5>Attributed manual closure</h5><p>Actor {obligation.attestation.actor_id} · {formatTime(obligation.attestation.recorded_at)}</p><p>{obligation.attestation.statement}</p><p>Evidence {obligation.attestation.evidence_record_ids.join(', ')}</p><p>This is administrative closure, not automated observation.</p></>:obligation.completion_criterion==='ATTRIBUTED_MANUAL_ATTESTATION'?<NoticeBox tone="warn" title="Manual action required"><p>The current read contract does not expose the task version required to submit a safe attestation. Browser submission is unavailable until that binding is supplied. The obligation remains open; no version is guessed.</p></NoticeBox>:null}{children}</article>;
}

export function Failures() {
  const query=usePagedQuery('failures',{limit:20});const now=useNow(1000);
  return <><div className="page-head"><h2>Failure Centre</h2><p>Current unresolved obligations, including unknown effects, unsupported/manual control and failed or missing observations. Empty pages may still have a next cursor.</p></div><Freshness query={query}/><QueryBoundary query={query} label="unresolved obligations" isEmpty={d=>!d.items.length}>{d=>d.items.map(o=><ObligationCard key={o.id} obligation={o} action={null} now={now}><FindWorkflow obligationId={o.id}/></ObligationCard>)}</QueryBoundary><Pagination query={query}/></>;
}

function FindWorkflow({obligationId}:{obligationId:string}) {
  const [busy,setBusy]=useState(false);const [found,setFound]=useState<string|null>(null);const [message,setMessage]=useState('');const [error,setError]=useState<UiFailure|null>(null);
  const find=async()=>{setBusy(true);setError(null);setMessage('');const actor=currentIdentity();try{
    let cursor:string|undefined;const seen=new Set<string>();
    for(let page=0;page<100;page++) {
      const listing=await call('workflows',undefined,{cursor,limit:100});
      for(const summary of listing.items){const w=await call('workflow',undefined,{params:{id:summary.id}});if(actor!==currentIdentity())return;if(w.obligations.some(o=>o.id===obligationId)){setFound(w.id);return;}}
      if(!listing.next_cursor){setMessage('No owning workflow was found among currently authorized records. No link is inferred.');return;}
      if(seen.has(listing.next_cursor))throw new Error('Repeated workflow cursor');seen.add(listing.next_cursor);cursor=listing.next_cursor;
    }
    setMessage('Search bound reached; no complete-search claim is made. Use the workflow directory with an exact authorized ID.');
  }catch(error){if(actor===currentIdentity())setError(describeFailure(error));}finally{if(actor===currentIdentity())setBusy(false);}};
  return <>{found?<a href={`/workspace/workflows/${found}`}>Open owning workflow</a>:<button type="button" disabled={busy} onClick={()=>void find()}>{busy?'Reading authorized workflows...':'Find owning workflow'}</button>}{message?<p role="status">{message}</p>:null}{error?<FailureState failure={error}/>:null}</>;
}

export function EvidenceDetail({id,session}:{id:string;session:StaffSession}) {
  const query=useQuery('evidence',{params:{workflow_id:id}});const [error,setError]=useState<UiFailure|null>(null);const [busy,setBusy]=useState(false);
  const download=async()=>{setBusy(true);setError(null);const actor=currentIdentity();try{const data=await call('export',undefined,{params:{workflow_id:id}});if(actor!==currentIdentity())return;const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`orvia-evidence-${id}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(error){if(actor===currentIdentity())setError(describeFailure(error));}finally{if(actor===currentIdentity())setBusy(false);}};
  return <><div className="page-head"><h2>Workflow evidence</h2><p><code>{id}</code> · <a href={`/workspace/workflows/${id}`}>Open operational workflow</a></p></div><Freshness query={query}/><QueryBoundary query={query} label="workflow evidence">{e=><>
    <section className="panel"><h3>Evidence scope and integrity</h3><p>Exported at {formatTime(e.exported_at)}</p><p>Digest <code>{e.integrity_digest}</code></p><p>{e.integrity_limit}</p><ul>{e.coverage_limits.map(limit=><li key={limit}>{limit}</li>)}</ul><p>Policy versions {e.policy_version_ids.join(', ')||'None recorded'}.</p><p>Notice versions {e.notice_version_ids.join(', ')||'None recorded'}.</p>{hasCapability(session,'evidence.export')?<button type="button" disabled={busy} onClick={()=>void download()}>Download local evidence JSON</button>:null}{error?<FailureState failure={error}/>:null}</section>
    <section className="panel"><h3>Immutable accepted receipts</h3>{e.receipts.map(r=><div key={r.receipt_id}><p>Receipt <code>{r.receipt_id}</code> · <StateBadge dictionary={CONSENT_LABELS} value={r.consent_status}/> · epoch {r.consent_epoch} · {formatTime(r.accepted_at)}</p>{r.consent_status==='WITHDRAWN'&&r.workflow_id===e.workflow.id?<p>Withdrawal accepted for this workflow. Target observations are shown separately below.</p>:null}</div>)}</section>
    <WorkflowFacts workflow={e.workflow} session={session} refresh={query.refresh}/>
    <section className="panel"><h3>Linked regression evidence</h3>{!e.tests.length?<p>No test run is linked to this workflow. No passing result is implied.</p>:e.tests.map(t=><p key={t.id}><a href={`/workspace/test-lab/${t.id}`}>{t.id}</a> · {t.state} · build {t.build_id}</p>)}</section>
  </>}</QueryBoundary></>;
}

export function Capabilities() {
  const query=usePagedQuery('capabilities',{limit:20});
  return <><div className="page-head"><h2>Capability register</h2><p>The programme register retains all 33 master modules. Target depth is a plan, not evidence of implementation, entitlement or successful testing.</p></div>
    <section><h3>Programme modules</h3>{programme.capabilities.map(c=><article className="panel" key={c.module_id}><h4>{c.module_id} — {c.name}</h4><p>{c.target_product} · target depth {c.target_depth} · {c.sprint_priority}</p><p>Implementation: {c.implementation_status}; tests: {c.test_status}; enabled: {c.enabled_state}; profile: {c.supported_profile}.</p><p>Entitlement: {c.edition_entitlement}</p><p>{c.limitation}</p><p>Evidence: {c.evidence.length?JSON.stringify(c.evidence):'None recorded in programme register'}</p></article>)}</section>
    <h3>Runtime connector records</h3><p>These records cover the synthetic connector subset, not the full module register above.</p><Freshness query={query}/><QueryBoundary query={query} label="runtime capabilities" isEmpty={d=>!d.items.length}>{d=>d.items.map(c=><article className="panel" key={c.code}><h4>{c.code}</h4><p>{c.target_release} · {c.implementation_status} · test {c.test_status} · {c.supported_profile}</p><ul>{c.limitations.map(l=><li key={l}>{l}</li>)}</ul></article>)}</QueryBoundary><Pagination query={query}/></>;
}

export function PolicyPreview({session}:{session:StaffSession}) {
  const principals=useCollection('list_principals');const purposes=useCollection('list_purposes');const systems=useCollection('list_systems');const mutation=useMutation('evaluate',false);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const data=new FormData(event.currentTarget);await mutation.run({principal_id:String(data.get('principal')),purpose_id:String(data.get('purpose')),system_id:String(data.get('system')),action:data.get('action') as 'MARKETING_SEND'|'ORDER_SERVICE_SEND'});};
  return <><div className="page-head"><h2>Policy preview</h2><p>A preview is not send authorization. Actual admission always rechecks current authority at the consumption boundary.</p></div>
    <QueryBoundary query={principals} label="preview principals">{p=><QueryBoundary query={purposes} label="preview purposes">{pur=><QueryBoundary query={systems} label="preview systems">{sys=><form className="panel" onSubmit={submit}><Select label="Preview principal" name="principal" options={p.items.map(x=>({id:x.id,name:x.display_name}))}/><Select label="Preview purpose" name="purpose" options={pur.items.map(x=>({id:x.id,name:x.name}))}/><Select label="Preview system" name="system" options={sys.items.map(x=>({id:x.id,name:x.name}))}/><Select label="Preview action" name="action" options={[{id:'MARKETING_SEND',name:'Marketing'},{id:'ORDER_SERVICE_SEND',name:'Separate order service'}]}/><button type="submit" disabled={!hasCapability(session,'policy.preview')||mutation.status==='pending'}>Evaluate current policy preview</button></form>}</QueryBoundary>}</QueryBoundary>}</QueryBoundary>
    {mutation.failure?<FailureState failure={mutation.failure}/>:null}{mutation.result?<section className="panel" role="status"><h3>Preview result</h3><StateBadge dictionary={DECISION_LABELS} value={mutation.result.decision}/><p>{mutation.result.reason_codes.join(', ')}</p><p>Epoch {mutation.result.consent_epoch??'unavailable'} · policy {mutation.result.policy_version_id??'unavailable'} · {formatTime(mutation.result.evaluated_at)}</p><p>Preview only; no message was sent and no future send is authorized.</p></section>:null}</>;
}

export function ControlMap() {
  const query=usePagedQuery('control_map',{limit:20});
  return <><div className="page-head"><h2>Declared control map</h2><p>Declared target relationships and last recorded observations. An old observed value is not a current effect guarantee.</p></div><Freshness query={query}/><QueryBoundary query={query} label="control relationships" isEmpty={d=>!d.edges.length}>{d=><DataTable caption="Purpose to target relationships" rows={d.edges} rowKey={e=>e.resource_id} columns={[
    {key:'purpose',header:'Purpose',cell:e=><code>{e.purpose_id}</code>},{key:'system',header:'System',cell:e=><code>{e.system_id}</code>},{key:'target',header:'Exact resource',cell:e=><code>{e.resource_id}</code>},{key:'capability',header:'Declared restriction',cell:e=>String(e.declared_restrict)+' / '+e.capability_version},{key:'observation',header:'Last recorded observation',cell:e=>e.observed_restrict===null?'No observation':String(e.observed_restrict)},{key:'time',header:'Observation time',cell:e=>formatTime(e.as_of)},
  ]}/>}</QueryBoundary><Pagination query={query}/></>;
}

/** Navigates only to a contract-valid local record ID, never an arbitrary URL. */
export function OpenRecord({label,base}:{label:string;base:string}) {
  const [id,setId]=useState('');const valid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  return <form onSubmit={e=>{e.preventDefault();if(valid)globalThis.location.assign(`${base}/${id}`);}}><TextField label={label} value={id} onChange={setId} required/><button type="submit" disabled={!valid}>Open recorded ID</button><p>Enter the exact UUID of an authorized record. The server still checks your scope.</p></form>;
}
