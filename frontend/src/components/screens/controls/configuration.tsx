'use client';
import { useState, type ReactNode, type FormEvent } from 'react';
import type { schemas } from '@orvia/contracts';
import { DataCategoryCode } from '@orvia/contracts';
import type { EndpointMap } from '@orvia/contracts/generated/endpoint-types';
import { call, useCollection, useMutation, useRequestGuard } from '../../shared/api.ts';
import { MutationFeedback } from '../../shared/mutation-feedback.tsx';
import { describeFailure, type UiFailure } from '../../shared/errors.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import {
  CONFIGURATION_STATUS_LABELS, CONNECTOR_LABELS, CONNECTOR_NOTES, CONDITION_LABELS,
  PURPOSE_CODE_LABELS, formatTime, shortId,
} from '../../shared/state-labels.ts';
import {
  Badge, FailureState, Facts, Flow, Freshness, NoticeBox, PageHead, QueryBoundary, Section,
  StateBadge, StoryCell, TechnicalDetails, TextField,
} from '../../shared/ui.tsx';

type Purpose = ReturnType<typeof schemas.Purpose.parse>;
type Notice = ReturnType<typeof schemas.Notice.parse>;
const CATEGORY_CODES = DataCategoryCode.options;
type Policy = ReturnType<typeof schemas.Policy.parse>;
type System = ReturnType<typeof schemas.System.parse>;

type CreateOperation = 'create_purposes'|'create_notices'|'create_policies'|'create_systems'|'create_principals'|'create_mapping';
const value=(form:FormData,key:string)=>String(form.get(key)??'');

export function Input({label,name,type='text',maxLength=120}:{label:string;name:string;type?:string;maxLength?:number}) {
  return <label className="field"><span className="label">{label}</span><input name={name} type={type} required maxLength={maxLength} /></label>;
}
export function Select({label,name,options}:{label:string;name:string;options:{id:string;name:string}[]}) {
  return <label className="field"><span className="label">{label}</span><select name={name} required defaultValue=""><option value="">Select…</option>{options.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</select></label>;
}

function CreateRecord<K extends CreateOperation>({operation,label,allowed,build,onSaved,children}:{operation:K;label:string;allowed:boolean;build:(form:FormData)=>EndpointMap[K]['request'];onSaved:()=>void;children:ReactNode}) {
  const mutation=useMutation(operation,true);
  const [localError,setLocalError]=useState<UiFailure|null>(null);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{event.preventDefault();const form=event.currentTarget;setLocalError(null);try{const result=await mutation.run(build(new FormData(form)));if(result){form.reset();onSaved();}}catch(error){setLocalError(describeFailure(error));}};
  if(!allowed)return <NoticeBox tone="info" title="Read-only for this session"><p>Your current capabilities do not allow {label.toLowerCase()}.</p></NoticeBox>;
  return <form className="panel" onSubmit={submit}><h3>{label}</h3><fieldset disabled={mutation.status==='pending'||mutation.unsettled}>{children}<button className="primary" type="submit">{mutation.status==='pending'?'Recording…':label}</button></fieldset>{localError?<FailureState failure={localError}/>:null}<MutationFeedback mutation={mutation} onReplayed={onSaved}/>{mutation.result?<p role="status">Recorded <code>{mutation.result.id}</code>. <button type="button" onClick={mutation.newInteraction}>Start another request</button></p>:null}</form>;
}

const TABS = ['purposes','notices','policies','systems'] as const;
const TAB_LEDE: Record<string,string> = {
  purposes: 'What processing is being controlled, and under what authority. Each purpose is shown with the notice and reviewed policy currently in force for it, and the systems that policy names.',
  notices: 'The exact text a person is asked to consent to. A notice is published by publishing its policy, never on its own.',
  policies: 'The versioned rule in force for a purpose. Publication requires a distinct reviewer who re-authenticates; an author cannot publish their own policy.',
  systems: 'The allowlisted synthetic systems ORVIA may act in, and what each one actually supports.',
};

export function Configuration({session}:{session:StaffSession}) {
  const [tab,setTab]=useState<string>('purposes'); const blocked=useRequestGuard();
  const purposes=useCollection('list_purposes');const notices=useCollection('list_notices');
  const policies=useCollection('list_policies');const systems=useCollection('list_systems');
  const canWrite=hasCapability(session,'configuration.write');
  const selectors={legal_entity_id:session.scope.legal_entity_id,environment_id:session.scope.environment_id};
  const purposeOptions=purposes.data?.items.map(p=>({id:p.id,name:p.name}))??[];
  const systemOptions=systems.data?.items.map(s=>({id:s.id,name:s.name}))??[];
  const reload=()=>{purposes.refresh();notices.refresh();policies.refresh();systems.refresh();};

  return <>
    <PageHead eyebrow="Privacy controls" title="Purposes &amp; policies" lede={TAB_LEDE[tab]} />
    <nav className="segmented" aria-label="Configuration sections" style={{marginBottom:'var(--s5)'}}>
      {TABS.map(name=><button key={name} type="button" disabled={blocked} aria-pressed={tab===name} onClick={()=>setTab(name)}>{name[0]!.toUpperCase()+name.slice(1)}</button>)}
    </nav>

    {tab==='purposes'?<>
      <Freshness query={purposes}/>
      <QueryBoundary query={purposes} label="purposes" isEmpty={d=>!d.items.length}>{d=>
        <RecordList label="Purpose versions" items={d.items} render={purpose=>
          <PurposeCard purpose={purpose} notices={notices.data?.items??[]} policies={policies.data?.items??[]} systems={systems.data?.items??[]}/>
        }/>
      }</QueryBoundary>
      <CreateRecord operation="create_purposes" label="Create purpose" allowed={canWrite} onSaved={reload}
        build={f=>({...selectors,code:value(f,'code') as 'promotional_marketing'|'order_service_demo',name:value(f,'name'),description:value(f,'description')})}>
        <Input label="Purpose name" name="name"/>
        <Select label="Purpose condition" name="code" options={[{id:'promotional_marketing',name:'Promotional marketing'},{id:'order_service_demo',name:'Order service'}]}/>
        <Input label="Description" name="description" maxLength={500}/>
      </CreateRecord>
    </>:null}

    {tab==='notices'?<>
      <Freshness query={notices}/>
      <QueryBoundary query={notices} label="notices" isEmpty={d=>!d.items.length}>{d=>
        <RecordList label="Notice versions" items={d.items} render={n=><>
          <h3>{n.title}</h3>
          <div className="row" style={{marginBottom:'var(--s3)'}}>
            <Badge label={n.published_at?'Published notice':'Draft notice'} tone={n.published_at?'ok':'neutral'}
              meaning={n.published_at?'This notice version is in force and can be consented to.':'Not in force. A notice is published by publishing its policy.'}/>
            <span className="muted" style={{fontSize:13}}>{n.published_at?`Published ${formatTime(n.published_at)}`:'Publish through its policy'}</span>
          </div>
          <details className="reveal"><summary>Read the notice text</summary><p className="notice-body" style={{marginTop:'var(--s3)'}}>{n.content}</p></details>
          {n.itemisation_was_not_recorded
            ? <Badge label="Not itemised" tone="warn" meaning="This notice was published before itemised content and contact information were required here. The items were never recorded, and they are not invented now."/>
            : <TechnicalDetails items={[
              {term:'Personal data itemised',value:n.data_categories!.map(code=>code.replaceAll('_',' ').toLowerCase()).join(', ')},
              {term:'Exercising rights',value:n.contact!.rights_channel},
              {term:'Grievance',value:n.contact!.grievance_channel},
              {term:'Complaint to the Board',value:n.contact!.board_complaint_channel}]}/>}
          <TechnicalDetails items={[{term:'Notice',value:n.id},{term:'Version',value:n.version_id},{term:'Purpose',value:n.purpose_id},{term:'Content digest',value:n.content_digest}]}/>
        </>}/>
      }</QueryBoundary>
      <QueryBoundary query={purposes} label="purpose choices">{()=>
        <CreateRecord operation="create_notices" label="Create notice" allowed={canWrite} onSaved={reload}
          build={f=>({purpose_id:value(f,'purpose_id'),language:'en',title:value(f,'title'),content:value(f,'content'),
            data_categories:CATEGORY_CODES.filter(code=>f.get(`category_${code}`)==='on'),
            contact:{rights_channel:value(f,'rights_channel'),grievance_channel:value(f,'grievance_channel'),board_complaint_channel:value(f,'board_complaint_channel')}})}>
          <Select label="Notice purpose" name="purpose_id" options={purposeOptions}/>
          <Input label="Notice title" name="title"/>
          <label className="field"><span className="label">Notice content</span><textarea name="content" required maxLength={10000}/></label>
          {/* Rules 3 and 9: the notice is itemised rather than described in prose,
              and from the same vocabulary the inventory uses, so the two can be
              compared instead of being two independent stories. */}
          <fieldset className="field"><legend className="label">Personal data this notice covers</legend>
            {CATEGORY_CODES.map(code=>(
              <label key={code} style={{display:'block'}}>
                <input type="checkbox" name={`category_${code}`}/> {code.replaceAll('_',' ').toLowerCase()}
              </label>))}
          </fieldset>
          {/* Act §5(1)(b) and (c): how to exercise rights, and how to complain to
              the Board. Three fields because they are three different acts. */}
          <Input label="How to exercise rights, including withdrawing consent" name="rights_channel"/>
          <Input label="How to raise a grievance with this organisation" name="grievance_channel"/>
          <Input label="How to complain to the Data Protection Board" name="board_complaint_channel"/>
        </CreateRecord>
      }</QueryBoundary>
    </>:null}

    {tab==='policies'?<>
      <Freshness query={policies}/>
      <QueryBoundary query={policies} label="policies" isEmpty={d=>!d.items.length}>{d=>
        <RecordList label="Policy versions" items={d.items} render={p=><PolicyCard policy={p} systems={systems.data?.items??[]} session={session} onSaved={reload}/>}/>
      }</QueryBoundary>
      <QueryBoundary query={purposes} label="policy purposes">{()=>
        <QueryBoundary query={notices} label="policy notices">{()=>
          <QueryBoundary query={systems} label="policy systems">{()=>
            <CreateRecord operation="create_policies" label="Create policy draft" allowed={canWrite} onSaved={reload}
              build={f=>({purpose_id:value(f,'purpose_id'),notice_version_id:value(f,'notice_version_id'),condition:value(f,'condition') as 'AFFIRMATIVE_MARKETING_CONSENT'|'APPROVED_SYNTHETIC_ORDER_SERVICE',system_ids:f.getAll('system_ids').map(String),required_observation:true})}>
              <Select label="Policy purpose" name="purpose_id" options={purposeOptions}/>
              <Select label="Notice version" name="notice_version_id" options={notices.data!.items.map(n=>({id:n.version_id,name:n.title+' · '+n.version_id}))}/>
              <Select label="Policy condition" name="condition" options={[{id:'AFFIRMATIVE_MARKETING_CONSENT',name:'Affirmative marketing consent'},{id:'APPROVED_SYNTHETIC_ORDER_SERVICE',name:'Independent synthetic order-service condition'}]}/>
              <fieldset><legend>Systems (one to three)</legend>{systemOptions.map(s=><label className="checkbox" key={s.id}><input name="system_ids" type="checkbox" value={s.id}/><span>{s.name} · {s.id}</span></label>)}</fieldset>
              <p className="muted" style={{fontSize:13}}>Supported automated obligations require independent observation. Manual targets remain explicit manual obligations.</p>
            </CreateRecord>
          }</QueryBoundary>
        }</QueryBoundary>
      }</QueryBoundary>
    </>:null}

    {tab==='systems'?<>
      <Freshness query={systems}/>
      <QueryBoundary query={systems} label="systems" isEmpty={d=>!d.items.length}>{d=>
        <RecordList label="Configured systems" items={d.items} render={s=><SystemCard system={s} session={session} onSaved={reload}/>}/>
      }</QueryBoundary>
      <CreateRecord operation="create_systems" label="Create synthetic system" allowed={canWrite} onSaved={reload}
        build={f=>({...selectors,name:value(f,'name'),connector:value(f,'connector') as 'SYNTHETIC_CRM'|'ORVIA_REST_SIMULATOR'|'LEGACY_MANUAL'})}>
        <Input label="System name" name="name"/>
        <Select label="Connector" name="connector" options={[{id:'SYNTHETIC_CRM',name:'Synthetic CRM'},{id:'ORVIA_REST_SIMULATOR',name:'Local REST simulator'},{id:'LEGACY_MANUAL',name:'Legacy manual obligation'}]}/>
      </CreateRecord>
    </>:null}
  </>;
}

/**
 * One purpose told as a control, not as a row: what is being controlled, under
 * what authority, against which notice and policy version, in which systems.
 * Every value is joined from the same canonical collections this screen already
 * reads; nothing is inferred when a record is absent.
 */
function PurposeCard({purpose,notices,policies,systems}:{purpose:Purpose;notices:Notice[];policies:Policy[];systems:System[]}) {
  const forPurpose=policies.filter(policy=>policy.purpose_id===purpose.id);
  const published=forPurpose.find(policy=>policy.status==='PUBLISHED')??null;
  const policy=published??forPurpose[0]??null;
  const notice=policy?notices.find(item=>item.version_id===policy.notice_version_id)??null:notices.find(item=>item.purpose_id===purpose.id)??null;
  const named=(policy?.system_ids??[]).map(id=>systems.find(system=>system.id===id)??null);
  return <>
    <div className="row row-between" style={{marginBottom:'var(--s3)'}}>
      <div style={{minWidth:0}}>
        <p className="eyebrow" style={{margin:0}}>{PURPOSE_CODE_LABELS[purpose.code]??purpose.code}</p>
        <h3 style={{margin:'2px 0 0'}}>{purpose.name}</h3>
      </div>
      <StateBadge dictionary={CONFIGURATION_STATUS_LABELS} value={purpose.status}/>
    </div>
    <p>{purpose.description}</p>
    <div className="story-grid" style={{marginBottom:'var(--s4)'}}>
      <StoryCell term="Authority" value={policy?CONDITION_LABELS[policy.condition]??policy.condition:'No policy recorded'}/>
      <StoryCell term="Notice" value={notice?(notice.published_at?`Published ${formatTime(notice.published_at)}`:'Draft — not in force'):'No notice recorded'} small/>
      <StoryCell term="Policy" value={policy?(published?'Published and in force':`${policy.status.toLowerCase()} — not in force`):'No policy recorded'} small/>
      <StoryCell term="Independent observation" value={policy?(policy.required_observation?'Required by this policy':'Not required by this policy'):'—'} small/>
    </div>
    {policy?<details className="reveal"><summary>Show how this purpose is enforced</summary><div style={{marginTop:'var(--s4)'}}><Flow steps={[
      {kind:'Purpose',name:purpose.name,note:PURPOSE_CODE_LABELS[purpose.code]??purpose.code,tone:'info'},
      {kind:'Notice',name:notice?notice.title:'No notice resolved',note:notice?(notice.published_at?`Version ${shortId(notice.version_id)}, published ${formatTime(notice.published_at)}`:'Draft version; nothing can be consented to yet'):'The policy names a notice version that is not in this page of notices.',tone:notice?.published_at?'ok':'warn'},
      {kind:'Policy',name:CONDITION_LABELS[policy.condition]??policy.condition,note:`Version ${shortId(policy.version_id)} · ${policy.status.toLowerCase()}`,tone:published?'ok':'warn'},
      ...named.map((system,index)=>({
        kind:'System',
        name:system?(CONNECTOR_LABELS[system.name]??system.name):`System ${shortId(policy.system_ids[index]!)}`,
        note:system?CONNECTOR_NOTES[system.connector]:'Not in this page of configured systems.',
        tone:'info' as const,
      })),
    ]}/>
      <NoticeBox tone="neutral" title="Control objective">
        <p style={{marginBottom:0}}>
          {purpose.code==='promotional_marketing'
            ? 'Do not permit marketing processing for this person after withdrawal, and be able to prove it at the target rather than assume it.'
            : 'Decide this purpose on its own separately approved condition, independently of any marketing decision.'}
        </p>
      </NoticeBox>
    </div></details>:<NoticeBox tone="warn" title="No policy is in force for this purpose"><p style={{marginBottom:0}}>Nothing is enforced and nothing can be consented to until a policy is published by a distinct reviewer.</p></NoticeBox>}
    <TechnicalDetails items={[
      {term:'Purpose',value:purpose.id},
      {term:'Purpose version',value:purpose.version_id},
      {term:'Version number',value:String(purpose.version)},
      {term:'Condition code',value:purpose.code},
      ...(policy?[{term:'Policy',value:policy.id},{term:'Policy version',value:policy.version_id},{term:'Policy digest',value:policy.digest}]:[]),
      ...(notice?[{term:'Notice version',value:notice.version_id},{term:'Content digest',value:notice.content_digest}]:[]),
    ]}/>
  </>;
}

function PolicyCard({policy,systems,session,onSaved}:{policy:Policy;systems:System[];session:StaffSession;onSaved:()=>void}) {
  const publish=useMutation('publish_policy',true);const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState<UiFailure|null>(null);
  const submit=async(event:FormEvent)=>{
    event.preventDefault();if(busy)return;setBusy(true);setError(null);
    try{
      const proof=await call('reauthenticate_policy',{version_id:policy.version_id,digest:policy.digest,code},{params:{id:policy.id}});
      setCode('');
      if(await publish.run({version_id:policy.version_id,digest:policy.digest,reauthentication_id:proof.reauthentication_id},{params:{id:policy.id}}))onSaved();
    }catch(error){setError(describeFailure(error,{write:true}));}finally{setBusy(false);setCode('');}
  };
  return <>
    <div className="row row-between" style={{marginBottom:'var(--s3)'}}>
      <h3 style={{margin:0,fontSize:14}}>Policy {policy.id}</h3>
      <StateBadge dictionary={CONFIGURATION_STATUS_LABELS} value={policy.status}/>
    </div>
    <Facts tight items={[
      {term:'Authority',value:CONDITION_LABELS[policy.condition]??policy.condition},
      {term:'Independent observation',value:policy.required_observation?'Required by this policy':'Not required by this policy'},
      {term:'Systems named',value:policy.system_ids.map(id=>{const s=systems.find(item=>item.id===id);return s?CONNECTOR_LABELS[s.name]??s.name:shortId(id);}).join(', ')||'None'},
      {term:'Published at',value:formatTime(policy.published_at)},
    ]}/>
    {policy.status==='DRAFT'&&hasCapability(session,'policy.publish')?(
      policy.author_id===session.actor_id
        ? <NoticeBox tone="info" title="Distinct reviewer required"><p>The author cannot publish their own policy. A second authorised reviewer must re-authenticate to publish this exact version.</p></NoticeBox>
        : <form onSubmit={submit} style={{marginTop:'var(--s4)'}}>
            <p className="muted" style={{fontSize:13}}>Publishing this exact version also publishes the notice version it names. You are re-authenticating as the distinct reviewer.</p>
            <TextField label="Publication authenticator code" value={code} onChange={setCode} inputMode="numeric" maxLength={6} required autoComplete="one-time-code"/>
            <button type="submit" className="primary" disabled={busy||publish.unsettled||code.length!==6}>Approve and publish exact version</button>
          </form>
    ):null}
    {error?<FailureState failure={error}/>:null}
    <MutationFeedback mutation={publish} onReplayed={onSaved}/>
    {publish.result?<p role="status">Policy publication recorded.</p>:null}
    <TechnicalDetails items={[
      {term:'Policy',value:policy.id},
      {term:'Exact version',value:policy.version_id},
      {term:'Digest',value:policy.digest},
      {term:'Purpose',value:policy.purpose_id},
      {term:'Notice version',value:policy.notice_version_id},
      {term:'Author',value:policy.author_id},
      {term:'Condition',value:policy.condition},
      {term:'Systems',value:policy.system_ids.join(', ')},
    ]}/>
  </>;
}

function SystemCard({system,session,onSaved}:{system:System;session:StaffSession;onSaved:()=>void}) {
  const check=useMutation('check_system',false);
  return <>
    <div className="row row-between" style={{marginBottom:'var(--s3)'}}>
      <div>
        <h3 style={{margin:0}}>{CONNECTOR_LABELS[system.name]??system.name}</h3>
        <p className="muted" style={{margin:'2px 0 0',fontSize:13}}>{CONNECTOR_NOTES[system.connector]}</p>
      </div>
      <div className="row">
        <Badge label={system.supports_restrict?'Can restrict':'No automated restriction'} tone={system.supports_restrict?'ok':'warn'}
          meaning="Declared capability of this connector, not proof that any restriction is currently in place."/>
        <Badge label={system.supports_read?'Can be read back':'No independent read'} tone={system.supports_read?'ok':'warn'}
          meaning="Whether ORVIA can independently observe this target at all."/>
      </div>
    </div>
    <p className="muted" style={{fontSize:13}}>Last capability check: {formatTime(system.checked_at)}. A capability check is not an effect observation.</p>
    {hasCapability(session,'systems.check')?<button type="button" disabled={check.status==='pending'} onClick={async()=>{if(await check.run(undefined,{params:{id:system.id}}))onSaved();}}>Check system capability</button>:null}
    {check.failure?<FailureState failure={check.failure}/>:null}
    <TechnicalDetails items={[
      {term:'System',value:system.id},
      {term:'Configured name',value:system.name},
      {term:'Connector',value:system.connector},
      {term:'Capability version',value:system.capability_version},
      {term:'Declared restrict',value:String(system.supports_restrict)},
      {term:'Declared read',value:String(system.supports_read)},
    ]}/>
  </>;
}

export function RecordList<T extends {id:string}>({label,items,render}:{label:string;items:T[];render:(item:T)=>ReactNode}) {
  const [page,setPage]=useState(0);const [filter,setFilter]=useState(''); const blocked=useRequestGuard();
  const filtered=items.filter(item=>JSON.stringify(item).toLowerCase().includes(filter.toLowerCase()));
  const current=Math.min(page,Math.max(0,Math.ceil(filtered.length/10)-1));
  return <section aria-label={label}>
    <TextField label={'Search '+label.toLowerCase()} value={filter} onChange={value=>{if(!blocked){setFilter(value);setPage(0);}}} hint="Filters the records already read into this screen."/>
    <p className="muted" style={{fontSize:13}}>{filtered.length} recorded result(s). Page {current+1}.</p>
    {filtered.slice(current*10,current*10+10).map(item=><article className="panel" key={item.id}>{render(item)}</article>)}
    {!filtered.length?<p>No matching records.</p>:null}
    <div className="row">
      <button type="button" disabled={blocked||current===0} onClick={()=>setPage(current-1)}>Previous records</button>
      <button type="button" disabled={blocked||(current+1)*10>=filtered.length} onClick={()=>setPage(current+1)}>Next records</button>
    </div>
  </section>;
}

export function Principals({session}:{session:StaffSession}) {
  const principals=useCollection('list_principals');
  const purposes=useCollection('list_purposes',{enabled:hasCapability(session,'configuration.read')});
  const systems=useCollection('list_systems',{enabled:hasCapability(session,'configuration.read')});
  const mappings=useCollection('list_mappings',{enabled:hasCapability(session,'configuration.read')});
  const scope={legal_entity_id:session.scope.legal_entity_id,environment_id:session.scope.environment_id};
  const purposeName=(id:string)=>purposes.data?.items.find(item=>item.id===id)?.name??`Purpose ${shortId(id)}`;
  const systemName=(id:string)=>{const system=systems.data?.items.find(item=>item.id===id);return system?CONNECTOR_LABELS[system.name]??system.name:`System ${shortId(id)}`;};
  const principalName=(id:string)=>principals.data?.items.find(item=>item.id===id)?.display_name??`Person ${shortId(id)}`;

  return <>
    <PageHead eyebrow="Privacy controls" title="People &amp; targets"
      lede="The people this organisation holds synthetic records for, and the exact target record each purpose maps to in each system. Creating a directory reference does not create a login account." />
    <Section title="People">
      <Freshness query={principals}/>
      <QueryBoundary query={principals} label="principal directory" isEmpty={d=>!d.items.length}>{d=>
        <RecordList label="Principals" items={d.items} render={p=><>
          <div className="row row-between">
            <div><h3 style={{margin:0}}>{p.display_name}</h3><p className="muted" style={{margin:'2px 0 0',fontSize:13}}>{p.email}</p></div>
            <Badge label="Synthetic record" tone="neutral" meaning="Fictional data created for testing. No real person is represented."/>
          </div>
          <TechnicalDetails items={[{term:'Principal',value:p.id}]}/>
        </>}/>
      }</QueryBoundary>
      <CreateRecord operation="create_principals" label="Create principal reference" allowed={hasCapability(session,'principals.create')} onSaved={principals.refresh}
        build={f=>({...scope,display_name:value(f,'display_name'),email:value(f,'email')})}>
        <Input label="Display name" name="display_name" maxLength={100}/>
        <Input label="Synthetic email" name="email" type="email" maxLength={254}/>
        <p className="muted" style={{fontSize:13}}>Use only reserved aster.example or birch.example addresses.</p>
      </CreateRecord>
    </Section>

    {hasCapability(session,'configuration.read')?<Section title="Exact target mappings" aside="One purpose, one system, one exact synthetic record. ORVIA never operates on a set.">
      <Freshness query={mappings}/>
      <QueryBoundary query={mappings} label="target mappings" isEmpty={d=>!d.items.length}>{d=>
        <RecordList label="Mappings" items={d.items} render={m=><>
          <h4 style={{marginTop:0}}>{principalName(m.principal_id)}</h4>
          <Facts tight items={[
            {term:'Purpose',value:purposeName(m.purpose_id)},
            {term:'System',value:systemName(m.system_id)},
            {term:'Target record',value:<span className="mono">{m.target_subject_reference}</span>},
            {term:'Target generation',value:String(m.target_generation)},
          ]}/>
          <TechnicalDetails items={[
            {term:'Mapping',value:m.id},
            {term:'Principal',value:m.principal_id},
            {term:'Purpose',value:m.purpose_id},
            {term:'System',value:m.system_id},
          ]}/>
        </>}/>
      }</QueryBoundary>
      <QueryBoundary query={principals} label="mapping principals">{p=>
        <QueryBoundary query={purposes} label="mapping purposes">{pur=>
          <QueryBoundary query={systems} label="mapping systems">{sys=>
            <CreateRecord operation="create_mapping" label="Create target mapping" allowed={hasCapability(session,'configuration.write')} onSaved={mappings.refresh}
              build={f=>({principal_id:value(f,'principal_id'),purpose_id:value(f,'purpose_id'),system_id:value(f,'system_id')})}>
              <Select label="Mapping principal" name="principal_id" options={p.items.map(x=>({id:x.id,name:x.display_name+' · '+x.email}))}/>
              <Select label="Mapping purpose" name="purpose_id" options={pur.items.map(x=>({id:x.id,name:x.name}))}/>
              <Select label="Mapping system" name="system_id" options={sys.items.map(x=>({id:x.id,name:x.name}))}/>
              <p className="muted" style={{fontSize:13}}>The server creates the exact synthetic target identity; no arbitrary target identifiers or URLs.</p>
            </CreateRecord>
          }</QueryBoundary>
        }</QueryBoundary>
      }</QueryBoundary>
    </Section>:null}
  </>;
}
