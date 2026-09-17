'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { PROFILES, type schemas } from '@orvia/contracts';
import { POLL, useMutation, useQuery } from './api.ts';
import { hasCapability, type StaffSession } from './session-context.tsx';
import { ASSERTION_LABELS, TEST_LABELS, formatTime } from './state-labels.ts';
import { Facts, Freshness, NoticeBox, QueryBoundary, SelectField, StateBadge } from './ui.tsx';
import { MutationFeedback } from './mutation-feedback.tsx';
import { OpenRecord } from './operations.tsx';

type Request=ReturnType<typeof schemas.TestRunCreate.parse>;
const scenarios=[
  {value:'MARKETING_WITHDRAWAL_HEALTHY',label:'Healthy withdrawal regression / repaired rerun'},
  {value:'MARKETING_WITHDRAWAL_BROKEN_CONTROL',label:'Deliberately broken control — expect detection as FAIL'},
  {value:'TARGET_RESTORE_QUARANTINE',label:'Old target restoration, quarantine and safe recovery'},
];

export function TestLab({session}:{session:StaffSession}) {
  const mutation=useMutation('start_test',true);const [scenario,setScenario]=useState('');const [profile,setProfile]=useState<Request['profile']|null>(null);
  useEffect(()=>{const match=Object.entries(PROFILES).find(([,p])=>String(p.app_port)===globalThis.location.port);if(match&&['codex-a00','ui-b00','rehearsal'].includes(match[0]))setProfile(match[0] as Request['profile']);},[]);
  const submit=async(event:FormEvent)=>{event.preventDefault();if(profile&&scenario)await mutation.run({scenario:scenario as Request['scenario'],profile,fixture_id:PROFILES[profile].seed});};
  return <><div className="page-head"><h2>Test Lab</h2><p>Persisted regression requests and actual assertion results. Enqueueing a request does not execute a test or establish a pass.</p></div>
    <NoticeBox tone="info" title="Local operator execution"><p>An authorized local operator runs the queued scenario in the exclusive synthetic profile. The browser shows NOT_RUN until that process starts, RUNNING during execution and the recorded terminal result. An interrupted run remains unresolved until the operator records recovery as ERROR.</p><p>The intentionally broken scenario must retain its real FAIL result; successful detection is recorded separately. Use a new healthy request for the repaired rerun.</p></NoticeBox>
    <section className="panel"><h3>Request a regression</h3><p>Connected profile: {profile??'unresolved; execution disabled'} · fixture {profile?PROFILES[profile].seed:'unresolved'}</p>{hasCapability(session,'tests.run')?<form onSubmit={submit}><fieldset disabled={mutation.status==='pending'||mutation.unsettled||!!mutation.result}><SelectField label="Scenario" value={scenario} onChange={setScenario} options={scenarios} required/><button type="submit" disabled={!scenario||!profile}>Queue synthetic test</button></fieldset><MutationFeedback mutation={mutation} onReplayed={()=>undefined}/>{mutation.result?<div role="status"><p>Request recorded as <StateBadge dictionary={TEST_LABELS} value={mutation.result.state}/> · <a href={`/workspace/test-lab/${mutation.result.id}`}>Open test run {mutation.result.id}</a></p><button type="button" onClick={mutation.newInteraction}>Start another test request</button></div>:null}</form>:<p>Your session can read authorized runs but cannot enqueue them.</p>}</section>
    <section className="panel"><h3>Open an existing run</h3><OpenRecord label="Test run UUID" base="/workspace/test-lab"/><p>The contract exposes reads by exact run ID, not a run-history list. Results remain in PostgreSQL and can be reopened after refresh.</p></section>
  </>;
}

export function TestRunDetail({id}:{id:string}) {
  const query=useQuery('test_run',{params:{id},pollWhile:run=>!POLL.testTerminal.includes(run.state)});
  return <><div className="page-head"><h2>Recorded test run</h2><p><code>{id}</code> · <a href="/workspace/test-lab">Test Lab</a></p></div><Freshness query={query}/><QueryBoundary query={query} label="persisted test run">{run=><>
    <section className="panel"><h3>Execution state</h3><StateBadge dictionary={TEST_LABELS} value={run.state}/><Facts items={[
      {term:'Scenario',value:run.request.scenario},{term:'Profile',value:run.request.profile},{term:'Fixture',value:run.request.fixture_id},{term:'Build',value:<code>{run.build_id}</code>},{term:'Contract',value:run.contract_version},{term:'Started',value:formatTime(run.started_at)},{term:'Finished',value:formatTime(run.finished_at)},
    ]}/>{run.state==='NOT_RUN'?<p>Durably queued; awaiting the authorized local operator.</p>:null}{run.state==='RUNNING'?<p>Execution is recorded as running. This is not a pass, and an interrupted operator may require recovery.</p>:null}{run.state==='ERROR'?<NoticeBox tone="stop" title="Execution error"><p>This run did not complete normally. No product pass is implied. Review its recorded assertions and operator evidence before enqueueing a new run.</p></NoticeBox>:null}{run.expected_fault_detection?<NoticeBox tone="warn" title="Expected broken-control detection"><p>The backend recorded this as an expected fault-detection scenario. Its business-test result remains {run.state}; it is not converted to PASS by this screen.</p></NoticeBox>:null}</section>
    <section aria-label="Test assertions"><h3>Actual assertions</h3>{!run.assertions.length?<p>No assertion results have been recorded. No success is inferred.</p>:run.assertions.map(assertion=><article className="panel" key={assertion.id}><h4>{assertion.id}</h4><StateBadge dictionary={ASSERTION_LABELS} value={assertion.result}/><Facts items={[{term:'Expected',value:assertion.expected},{term:'Observed',value:assertion.actual}]}/>{assertion.artifact_paths.length?<><h5>Local evidence references</h5><ul>{assertion.artifact_paths.map(path=><li key={path}><code>{path}</code></li>)}</ul><p>These are operator-local paths, not public downloads.</p></>:<p>No artifact reference was supplied for this assertion.</p>}</article>)}</section>
  </>}</QueryBoundary></>;
}
