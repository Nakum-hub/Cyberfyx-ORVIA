'use client';
import { useEffect, useState, type FormEvent } from 'react';
import { PROFILES, type schemas } from '@orvia/contracts';
import { POLL, useMutation, useQuery, usePagedQuery } from '../../shared/api.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import { ASSERTION_LABELS, SCENARIO_LABELS, TEST_LABELS, formatTime } from '../../shared/state-labels.ts';
import {
  Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, SelectField,
  StateBadge, TechnicalDetails,
} from '../../shared/ui.tsx';
import { MutationFeedback } from '../../shared/mutation-feedback.tsx';
import { OpenRecord } from '../../shared/open-record.tsx';

type Request=ReturnType<typeof schemas.TestRunCreate.parse>;
const SCENARIOS = ['MARKETING_WITHDRAWAL_HEALTHY','MARKETING_WITHDRAWAL_BROKEN_CONTROL','TARGET_RESTORE_QUARANTINE'] as const;
const scenarios = SCENARIOS.map(value => ({ value, label: SCENARIO_LABELS[value]!.name }));

/**
 * The Test Lab answers one question: would you find out if this privacy control
 * stopped working? Each card states what the scenario is designed to establish
 * and what result it is *designed* to produce. Neither is a claim about any run:
 * a run's real result is only ever read back from the stored record.
 */
function ScenarioCard({ id }: { id: keyof typeof SCENARIO_LABELS }) {
  const scenario = SCENARIO_LABELS[id]!;
  const broken = scenario.expectedResult === 'FAIL';
  return (
    <article className="panel">
      <div className="row row-between" style={{ marginBottom: 'var(--s3)' }}>
        <h4 style={{ margin: 0, fontSize: 16 }}>{scenario.name}</h4>
        <Badge
          label={broken ? 'Designed to be detected as FAIL' : 'Designed to pass'}
          tone={broken ? 'stop' : 'ok'}
          meaning="The scenario's design expectation. A run's real stored result is read back from the record, never assumed from this label."
          large
        />
      </div>
      <p>{scenario.proves}</p>
      <p style={{ marginBottom: 4, fontWeight: 600, fontSize: 13 }}>What the scenario asserts:</p>
      <ul style={{ margin: 0, paddingLeft: 'var(--s5)' }}>
        {scenario.expected.map(item => <li key={item}>{item}</li>)}
      </ul>
      {broken ? (
        <NoticeBox tone="warn" title="This failure is the point">
          <p style={{ marginBottom: 0 }}>
            A controlled defect prevents the expected privacy outcome, and ORVIA records a real business
            <strong> FAIL</strong> rather than reporting green. The run is never relabelled as a pass. The repaired
            rerun is a separate, new healthy request.
          </p>
        </NoticeBox>
      ) : null}
      <TechnicalDetails items={[{ term: 'Scenario', value: id }, { term: 'Designed stored result', value: scenario.expectedResult }]} />
    </article>
  );
}

export function TestLab({session}:{session:StaffSession}) {
  const mutation=useMutation('start_test',true);
  const history=usePagedQuery('list_test_runs',{limit:20});
  const [scenario,setScenario]=useState('');
  const [profile,setProfile]=useState<Request['profile']|null>(null);
  useEffect(()=>{const match=Object.entries(PROFILES).find(([,p])=>String(p.app_port)===globalThis.location.port);if(match&&['codex-a00','ui-b00','rehearsal'].includes(match[0]))setProfile(match[0] as Request['profile']);},[]);
  const submit=async(event:FormEvent)=>{event.preventDefault();if(profile&&scenario)await mutation.run({scenario:scenario as Request['scenario'],profile,fixture_id:PROFILES[profile].seed});};

  return <>
    <PageHead
      eyebrow="Assurance"
      title="Test Lab"
      lede="ORVIA can test whether a privacy control actually works — including when the control is deliberately broken. Requests and assertion results are persisted; enqueueing a request does not execute a test, and an execution is not a pass."
    />

    <NoticeBox tone="info" title="Local operator execution">
      <p>An authorized local operator runs the queued scenario in the exclusive synthetic profile. The browser shows NOT_RUN until that process starts, RUNNING during execution and the recorded terminal result. An interrupted run remains unresolved until the operator records recovery as ERROR.</p>
      <p>The intentionally broken scenario must retain its real FAIL result; successful detection is recorded separately. Use a new healthy request for the repaired rerun.</p>
    </NoticeBox>

    <Section title="Scenarios" aside="What each scenario is designed to establish.">
      {SCENARIOS.map(id => <ScenarioCard key={id} id={id} />)}
    </Section>

    <Section title="Request a regression">
      <div className="panel">
        <Facts tight items={[
          { term: 'Connected profile', value: profile ?? 'unresolved; execution disabled' },
          { term: 'Fixture', value: profile ? PROFILES[profile].seed : 'unresolved' },
        ]} />
        {hasCapability(session,'tests.run') ? (
          <form onSubmit={submit} style={{ marginTop: 'var(--s4)' }}>
            <fieldset disabled={mutation.status==='pending'||mutation.unsettled||!!mutation.result}>
              <SelectField label="Scenario" value={scenario} onChange={setScenario} options={scenarios} required/>
              <button type="submit" className="primary" disabled={!scenario||!profile}>Queue synthetic test</button>
            </fieldset>
            <MutationFeedback mutation={mutation} onReplayed={()=>undefined}/>
            {mutation.result ? (
              <div role="status" style={{ marginTop: 'var(--s3)' }}>
                <p>
                  Request recorded as <StateBadge dictionary={TEST_LABELS} value={mutation.result.state}/> ·{' '}
                  <a href={`/workspace/test-lab/${mutation.result.id}`}>Open test run {mutation.result.id}</a>
                </p>
                <p className="muted" style={{ fontSize: 13 }}>The run remains available in the history below after refresh.</p>
                <button type="button" onClick={mutation.newInteraction}>Start another test request</button>
              </div>
            ) : null}
          </form>
        ) : <p style={{ marginTop: 'var(--s4)' }}>Your session can read authorized runs but cannot enqueue them.</p>}
      </div>
    </Section>

    <Section title="Run history" aside="Persisted runs in server cursor order.">
      <Freshness query={history}/>
      <QueryBoundary query={history} label="test runs" isEmpty={data=>!data.items.length}>{data=><>
        <DataTable caption="Recorded synthetic test runs" rows={data.items} rowKey={run=>run.id} columns={[
          {key:'scenario',header:'Scenario',cell:run=><a href={`/workspace/test-lab/${run.id}`}>{SCENARIO_LABELS[run.request.scenario]?.name??run.request.scenario}</a>},
          {key:'state',header:'Actual result',cell:run=><StateBadge dictionary={TEST_LABELS} value={run.state}/>},
          {key:'started',header:'Started',cell:run=>formatTime(run.started_at)},
          {key:'finished',header:'Finished',cell:run=>formatTime(run.finished_at)},
        ]}/>
        <Pagination query={history}/>
      </>}</QueryBoundary>
    </Section>

    <Section title="Open a run by ID">
      <div className="panel">
        <OpenRecord label="Test run UUID" base="/workspace/test-lab"/>
        <p className="muted" style={{ fontSize: 13 }}>Results remain in PostgreSQL and can be reopened after refresh.</p>
      </div>
    </Section>
  </>;
}

export function TestRunDetail({id}:{id:string}) {
  const query=useQuery('test_run',{params:{id},pollWhile:run=>!POLL.testTerminal.includes(run.state)});
  return <>
    <Freshness query={query}/>
    <QueryBoundary query={query} label="persisted test run">{run=><>
      <PageHead
        eyebrow="Assurance"
        title={SCENARIO_LABELS[run.request.scenario]?.name ?? 'Recorded test run'}
        lede={SCENARIO_LABELS[run.request.scenario]?.proves}
        actions={<><StateBadge dictionary={TEST_LABELS} value={run.state} large/><a href="/workspace/test-lab">Test Lab</a></>}
      />
      <Section title="Execution">
        <div className="panel">
          <Facts tight items={[
            {term:'Started',value:formatTime(run.started_at)},
            {term:'Finished',value:formatTime(run.finished_at)},
            {term:'Profile',value:run.request.profile},
            {term:'Fixture',value:run.request.fixture_id},
          ]}/>
          {run.state==='NOT_RUN'?<p style={{marginTop:'var(--s3)'}}>Durably queued; awaiting the authorized local operator.</p>:null}
          {run.state==='RUNNING'?<p style={{marginTop:'var(--s3)'}}>Execution is recorded as running. This is not a pass, and an interrupted operator may require recovery.</p>:null}
          <TechnicalDetails items={[
            {term:'Run',value:run.id},
            {term:'Scenario',value:run.request.scenario},
            {term:'Build',value:run.build_id},
            {term:'Contract',value:run.contract_version},
            {term:'Expected fault detection',value:String(run.expected_fault_detection)},
          ]}/>
        </div>
        {run.state==='ERROR'?<NoticeBox tone="stop" title="Execution error"><p>This run did not complete normally. No product pass is implied. Review its recorded assertions and operator evidence before enqueueing a new run.</p></NoticeBox>:null}
        {run.expected_fault_detection?<NoticeBox tone="warn" title="Expected broken-control detection"><p>The backend recorded this as an expected fault-detection scenario. Its business-test result remains {run.state}; it is not converted to PASS by this screen. The detection is the evidence that the control failure would be noticed.</p></NoticeBox>:null}
      </Section>

      <Section title="Actual assertions" aside="Expected against observed, exactly as the run recorded them.">
        {!run.assertions.length?<NoticeBox tone="neutral" title="No assertion results recorded"><p>No success is inferred from an absent result.</p></NoticeBox>:run.assertions.map(assertion=>
          <article className="panel" key={assertion.id}>
            <div className="row row-between" style={{marginBottom:'var(--s3)'}}>
              <h4 style={{margin:0,fontSize:14}}>{assertion.id.replaceAll('_',' ')}</h4>
              <StateBadge dictionary={ASSERTION_LABELS} value={assertion.result}/>
            </div>
            <Facts tight items={[
              {term:'Expected',value:assertion.expected},
              {term:'Observed',value:assertion.actual},
            ]}/>
            {assertion.artifact_paths.length?<>
              <p style={{margin:'var(--s3) 0 4px',fontWeight:600,fontSize:13}}>Evidence</p>
              <ul style={{margin:0}}>{assertion.artifact_paths.map(path=><li key={path}><code className="mono">{path}</code></li>)}</ul>
              <p className="muted" style={{fontSize:12.5,marginTop:4}}>These are operator-local paths, not public downloads.</p>
            </>:<p className="muted" style={{fontSize:13,marginTop:'var(--s3)',marginBottom:0}}>No artifact reference was supplied for this assertion.</p>}
            <TechnicalDetails items={[{term:'Assertion id',value:assertion.id},{term:'Result',value:assertion.result}]}/>
          </article>
        )}
      </Section>
    </>}</QueryBoundary>
  </>;
}
