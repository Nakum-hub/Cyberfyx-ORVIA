'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import type { schemas } from '@orvia/contracts';
import programme from '../../../../tracking/capabilities.json';
import { call, currentIdentity, useCollection, useMutation, useNow, usePagedQuery, useQuery, POLL } from './api.ts';
import { useDirectory, type Directory } from './directory.ts';
import { actionVerification, buildTimeline, obligationAction, obligationStatus, obligationTotals, observationFreshness } from './derive.ts';
import { describeFailure, type UiFailure } from './errors.ts';
import { hasCapability, type StaffSession } from './session-context.tsx';
import {
  EXECUTION_LABELS, WORKFLOW_LABELS, CONSENT_LABELS, DECISION_LABELS, CAPABILITY_LABELS, CAPABILITY_TEST_LABELS,
  CONNECTOR_LABELS, CONNECTOR_NOTES, CRITERION_LABELS, METHOD_LABELS, OPERATION_LABELS, PURPOSE_CODE_LABELS,
  UNCERTAINTY_COPY, formatAge, formatTime, shortId,
} from './state-labels.ts';
import {
  Badge, DataTable, Facts, FailureState, Flow, Freshness, Metric, NoticeBox, PageHead, Pagination,
  QueryBoundary, Section, StateBadge, StoryCell, TechnicalDetails, TextField, TextAreaField,
} from './ui.tsx';
import { MutationFeedback } from './mutation-feedback.tsx';
import { Select } from './configuration.tsx';

type Workflow = ReturnType<typeof schemas.Workflow.parse>;
type Obligation = ReturnType<typeof schemas.Obligation.parse>;
type Action = ReturnType<typeof schemas.Action.parse>;

/* ================================================================== *
 * Workflow directory
 * ================================================================== */

export function Workflows({ evidence = false }: { evidence?: boolean }) {
  const query = usePagedQuery('workflows', { limit: 20 });
  const directory = useDirectory(['purposes']);
  const base = evidence ? 'evidence' : 'workflows';
  return (
    <>
      <PageHead
        eyebrow={evidence ? 'Proof' : 'Operations'}
        title={evidence ? 'Evidence directory' : 'Workflows'}
        lede={evidence
          ? 'Each recorded operation carries its own evidence: the consent that caused it, the policy in force, what ORVIA asked the system to do, what ORVIA independently observed, and what is still unresolved.'
          : 'The operational work created by privacy decisions in your current scope. Open one to read its actions, its independent verification and its unresolved obligations.'}
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded operations" isEmpty={data => !data.items.length}>
        {data => (
          <DataTable
            caption="Recorded operations, in server cursor order"
            rows={data.items}
            rowKey={workflow => workflow.id}
            columns={[
              { key: 'purpose', header: 'Purpose', cell: workflow => (
                <a className="cell-primary" href={`/workspace/${base}/${workflow.id}`}>
                  {directory.purposeName(workflow.purpose_id)}
                  <span className="cell-sub">operation {shortId(workflow.id)}</span>
                </a>
              ) },
              { key: 'state', header: 'Control status', cell: workflow => <StateBadge dictionary={WORKFLOW_LABELS} value={workflow.state} /> },
              { key: 'accepted', header: 'Decision accepted', cell: workflow => formatTime(workflow.accepted_at) },
              { key: 'updated', header: 'Last updated', cell: workflow => formatTime(workflow.updated_at) },
              { key: 'open', header: 'Proof', cell: workflow => <a href={`/workspace/evidence/${workflow.id}`}>View proof</a> },
            ]}
          />
        )}
      </QueryBoundary>
      <Pagination query={query} />
    </>
  );
}

/* ================================================================== *
 * Workflow detail — the demonstration hero screen
 * ================================================================== */

export function WorkflowDetail({ id, session }: { id: string; session: StaffSession }) {
  const query = useQuery('workflow', { params: { id }, pollWhile: data => !POLL.workflowTerminal.includes(data.state) || data.actions.some(action => action.reconciliations.some(item => item.state === 'PENDING' || item.state === 'RECONCILING')) });
  const directory = useDirectory(['purposes', 'systems', 'principals']);
  return (
    <QueryBoundary query={query} label="the recorded operation">
      {workflow => (
        <>
          <PageHead
            eyebrow="Recorded operation"
            title={directory.purposeName(workflow.purpose_id)}
            lede="What ORVIA was asked to enforce, what it actually did in the connected system, and what it independently observed afterwards."
            actions={<>
              <StateBadge dictionary={WORKFLOW_LABELS} value={workflow.state} large />
              {hasCapability(session, 'evidence.read') ? <a href={`/workspace/evidence/${id}`}>Evidence for this workflow</a> : null}
            </>}
          />
          <p style={{ fontSize: 13 }}><a href="/workspace/workflows">← All workflows</a></p>
          <Freshness query={query} />
          <WorkflowFacts workflow={workflow} session={session} refresh={query.refresh} directory={directory} />
        </>
      )}
    </QueryBoundary>
  );
}

export function WorkflowFacts({ workflow, session, refresh, directory, hideSummary }: {
  workflow: Workflow; session: StaffSession; refresh: () => void; directory: Directory;
  /** The evidence screen states the same summary in its own words already. */
  hideSummary?: boolean;
}) {
  const now = useNow(1000);
  const totals = obligationTotals(workflow, now);
  const timeline = buildTimeline(workflow);
  const purpose = directory.purpose(workflow.purpose_id);
  const first = workflow.actions[0] ?? null;
  return (
    <>
      {hideSummary ? null : <Section title="What this operation is">
        <div className="story">
          <div className="story-grid">
            <StoryCell term="Purpose" value={directory.purposeName(workflow.purpose_id)} />
            <StoryCell term="Processing type" value={purpose ? PURPOSE_CODE_LABELS[purpose.code] ?? purpose.code : 'Not resolved'} />
            <StoryCell term="Authority" value={purpose?.code === 'promotional_marketing' ? 'Consent-based' : purpose ? 'Separately approved condition' : 'Not resolved'} />
            <StoryCell term="Person" value={first ? directory.principalName(first.plan.scope.principal_reference_id) : 'No action names a person'} />
            <StoryCell term="Decision accepted" value={formatTime(workflow.accepted_at)} small />
            <StoryCell term="Last updated" value={formatTime(workflow.updated_at)} small />
            <StoryCell term="Obligations" value={`${totals.satisfied} of ${workflow.obligations.length} closed`} />
          </div>
          <p style={{ marginTop: 'var(--s4)', marginBottom: 0 }}>{totals.statement}</p>
          <TechnicalDetails items={[
            { term: 'Workflow', value: workflow.id },
            { term: 'Consent event', value: workflow.event_id },
            { term: 'Purpose', value: workflow.purpose_id },
            { term: 'Recorded state', value: workflow.state },
          ]}>
            <p className="muted" style={{ fontSize: 12.5 }}>
              Recorded workflow status and current evidence freshness are separate. This API does not expose every
              outbox, dispatch or worker timestamp; absent stages are not invented.
            </p>
          </TechnicalDetails>
        </div>
      </Section>}

      <Section title="System action and independent verification" aside="Two different facts, never merged.">
        {!workflow.actions.length ? (
          <NoticeBox tone="neutral" title="No system action is recorded yet">
            <p>Accepting a decision alone does not establish a target effect. Nothing is shown as done.</p>
          </NoticeBox>
        ) : workflow.actions.map(action => (
          <ActionCard key={action.id} action={action} workflow={workflow} session={session} refresh={refresh} now={now} directory={directory} />
        ))}
      </Section>

      <Section title="Obligations">
        {!workflow.obligations.length ? (
          <NoticeBox tone="neutral" title="No obligation is recorded yet"><p>Nothing is outstanding and nothing is claimed as closed.</p></NoticeBox>
        ) : workflow.obligations.map(obligation => (
          <ObligationCard key={obligation.id} obligation={obligation} action={obligationAction(obligation, workflow)} now={now} directory={directory}>
            {hasCapability(session, 'manual.attest') && obligation.completion_criterion === 'ATTRIBUTED_MANUAL_ATTESTATION'
              ? <ManualTaskForm obligation={obligation} refresh={refresh} /> : null}
          </ObligationCard>
        ))}
      </Section>

      <Timeline entries={timeline} />
    </>
  );
}

/**
 * Record identifiers stay on the timeline, but behind one control for the whole
 * list rather than a wall of hex under every entry.
 */
function Timeline({ entries }: { entries: ReturnType<typeof buildTimeline> }) {
  const [ids, setIds] = useState(false);
  return (
    <Section
      title="Recorded timeline"
      aside={<>
        Only stages the API reports. Absent stages are left absent.{' '}
        <button type="button" className="link" aria-pressed={ids} onClick={() => setIds(!ids)}>
          {ids ? 'Hide record identifiers' : 'Show record identifiers'}
        </button>
      </>}
    >
      <div className="panel">
        <ol className="timeline">
          {entries.map((entry, index) => (
            <li key={index} className={`tone-${entry.tone}`}>
              <time>{formatTime(entry.at)}</time>
              <span className="entry-kind">{entry.kind}</span>
              <div className="entry-title">{entry.title}</div>
              <p className="entry-detail">{entry.detail}</p>
              {ids ? <p className="mono muted" style={{ margin: '4px 0 0', fontSize: 11 }}>{entry.technical}</p> : null}
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

/**
 * The defining screen of the product: what ORVIA *requested* and what ORVIA
 * *independently observed* are presented as two separate panels, so a viewer
 * cannot mistake an acknowledgement for a verification.
 */
function ActionCard({ action, workflow, session, refresh, now, directory }: {
  action: Action; workflow: Workflow; session: StaffSession; refresh: () => void; now: number; directory: Directory;
}) {
  const reconcile = useMutation('reconcile', true);
  const scopeCurrent = workflow.obligations.some(item => item.observation?.action_id === action.id && item.scope_still_current);
  const verification = actionVerification(action, now, scopeCurrent);
  const latest = action.observations.at(-1) ?? null;
  const lastAttempt = action.attempts.at(-1) ?? null;
  const system = directory.system(action.plan.scope.system_id);
  const uncertainty = UNCERTAINTY_COPY[action.execution_state];

  return (
    <article className="panel">
      <div className="row row-between" style={{ marginBottom: 'var(--s4)' }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>Connected system</p>
          <h4 style={{ fontSize: 17, margin: '2px 0 0' }}>{directory.systemName(action.plan.scope.system_id)}</h4>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
            {OPERATION_LABELS[action.plan.scope.operation] ?? action.plan.scope.operation}
            {system ? ` · ${CONNECTOR_LABELS[system.connector] ?? system.connector}` : null}
          </p>
        </div>
        {/* The exact verification claim is rendered once, in the Result row of
            the verification pane below, so a reader can never find the verdict
            in two places and read them as two facts. */}
        <Badge label={verification.verified ? 'Verified' : 'Not yet verified'}
          tone={verification.verified ? 'ok' : 'warn'} meaning={verification.detail} large />
      </div>

      <div className="verify-split">
        <div className="verify-pane">
          <h5>Action — what ORVIA requested</h5>
          <Facts tight items={[
            { term: 'Requested action', value: OPERATION_LABELS[action.plan.scope.operation] ?? action.plan.scope.operation },
            { term: 'Action status', value: <StateBadge dictionary={EXECUTION_LABELS} value={action.execution_state} /> },
            { term: 'Target response', value: lastAttempt ? <>{lastAttempt.reason_code} · {formatTime(lastAttempt.recorded_at)}</> : 'No target response recorded' },
            { term: 'Attempts used', value: `${action.attempts.length} of at most ${action.plan.operation_budget.maximum_attempts}` },
          ]} />
        </div>
        <div className="verify-pane pane-verification">
          <h5>Verification — what ORVIA independently observed</h5>
          <Facts tight items={[
            { term: 'Method', value: latest ? <StateBadge dictionary={METHOD_LABELS} value={latest.method} /> : <Badge label="No observation" tone="neutral" /> },
            { term: 'Expected', value: latest ? latest.desired_state.replaceAll('_', ' ').toLowerCase() : 'Marketing restricted' },
            { term: 'Observed', value: latest ? latest.observed_state.replaceAll('_', ' ').toLowerCase() : 'not read' },
            { term: 'Result', value: <Badge label={verification.claim} tone={verification.verified ? 'ok' : latest?.state === 'OBSERVED_NOT_SATISFIED' ? 'stop' : 'warn'} /> },
            { term: 'Read', value: latest?.observed_at ? <>{formatAge(latest.observed_at, now)} · {formatTime(latest.observed_at)}</> : 'never' },
            { term: 'Freshness', value: latest ? observationFreshness(latest, now).toLowerCase() : 'none' },
          ]} />
        </div>
      </div>

      <p className="verify-rule">
        <strong>API success is not the same as verification.</strong> {verification.detail}
      </p>

      {uncertainty && !verification.verified ? (
        <NoticeBox tone={action.execution_state === 'EFFECT_UNKNOWN' ? 'unknown' : action.execution_state === 'FAILED' ? 'stop' : 'warn'}
          title={action.execution_state === 'MANUAL_REQUIRED' ? 'No supported automated control at this system' : uncertainty.title}>
          <p>{uncertainty.body}</p>
          <p><strong>{uncertainty.next}</strong></p>
        </NoticeBox>
      ) : null}

      {hasCapability(session, 'action.reconcile') ? (
        <div className="row" style={{ marginTop: 'var(--s4)' }}>
          <button type="button" className="primary" disabled={reconcile.status === 'pending' || reconcile.unsettled}
            onClick={async () => { if (await reconcile.run(undefined, { params: { id: action.id } })) refresh(); }}>
            Request scoped read reconciliation
          </button>
          <span className="muted" style={{ fontSize: 12.5 }}>This requests a read. It never replays the target effect.</span>
        </div>
      ) : null}
      <MutationFeedback mutation={reconcile} onReplayed={refresh} />
      {reconcile.result ? (
        <p role="status" style={{ marginTop: 'var(--s3)' }}>
          Reconciliation accepted at {formatTime(reconcile.result.accepted_at)}. Acceptance is not resolution.{' '}
          <button type="button" className="link" onClick={refresh}>Read recorded outcome</button>
        </p>
      ) : null}

      {action.observations.length ? (
        <details className="technical">
          <summary>All observation records ({action.observations.length})</summary>
          <div className="technical-body">
            {action.observations.map(observation => (
              <div key={observation.id} style={{ marginBottom: 'var(--s3)' }}>
                <p style={{ marginBottom: 2 }}>
                  <StateBadge dictionary={METHOD_LABELS} value={observation.method} />{' '}
                  <Badge label={observation.state.replaceAll('_', ' ').toLowerCase()}
                    tone={observation.state === 'OBSERVED_SATISFIED' ? 'ok' : observation.state === 'OBSERVED_NOT_SATISFIED' ? 'stop' : 'unknown'} />
                </p>
                <p className="mono" style={{ margin: 0 }}>
                  {observation.id} · observed {formatTime(observation.observed_at)} · fresh until {formatTime(observation.fresh_until)} · generation {observation.target_generation} · target state {observation.observed_state}
                </p>
                {observation.method !== 'SCOPED_READ' ? <p style={{ margin: 0 }}>Provider evidence is not independent observation.</p> : null}
                {observation.limits.length ? <ul style={{ margin: '4px 0 0' }}>{observation.limits.map(limit => <li key={limit}>{limit}</li>)}</ul> : null}
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <TechnicalDetails summary="Action, target and command identifiers" items={[
        { term: 'Action', value: action.id },
        { term: 'Capability', value: `${action.plan.capability} ${action.plan.capability_version}` },
        ...Object.entries(action.plan.scope).map(([term, value]) => ({ term: term.replaceAll('_', ' '), value: String(value) })),
      ]}>
        {action.attempts.length ? (
          <>
            <h5 style={{ margin: 'var(--s3) 0 var(--s2)' }}>Execution receipts</h5>
            {action.attempts.map(attempt => (
              <p key={attempt.attempt_id} className="mono" style={{ marginBottom: 4 }}>
                {attempt.attempt_id} · {attempt.execution_state} · {attempt.reason_code} · {formatTime(attempt.recorded_at)} · command {attempt.command_id}
              </p>
            ))}
          </>
        ) : null}
      </TechnicalDetails>
    </article>
  );
}

function ObligationCard({ obligation, action, now, directory, children }: {
  obligation: Obligation; action: Action | null; now: number; directory?: Directory; children?: ReactNode;
}) {
  const status = obligationStatus(obligation, action, now);
  const system = directory?.system(obligation.observation?.system_id);
  return (
    <article className="panel">
      <div className="row row-between" style={{ marginBottom: 'var(--s3)' }}>
        <div>
          <h4 style={{ margin: 0 }}>
            {obligation.required ? 'Required obligation' : 'Optional obligation'}
            {system ? ` · ${CONNECTOR_LABELS[system.connector] ?? system.name}` : ''}
          </h4>
          <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
            <StateBadge dictionary={CRITERION_LABELS} value={obligation.completion_criterion} />
          </p>
        </div>
        <div className="row">
          <Badge label={status.resolved ? 'Criterion satisfied' : 'Unresolved'} tone={status.tone} large />
          <StateBadge dictionary={EXECUTION_LABELS} value={obligation.execution_state} />
        </div>
      </div>
      <p>{status.summary}</p>
      {obligation.skip_reason ? <p className="muted">Skip reason: {obligation.skip_reason}</p> : null}
      {!obligation.scope_still_current ? (
        <NoticeBox tone="warn" title="Scope is no longer current">
          <p>The consent epoch or target generation moved on, so earlier work cannot close this obligation.</p>
        </NoticeBox>
      ) : null}

      {obligation.attestation ? (
        <div className="verify-pane" style={{ marginTop: 'var(--s3)' }}>
          <h5>Attributed manual closure</h5>
          <Facts tight items={[
            { term: 'Recorded by', value: <code className="mono">{shortId(obligation.attestation.actor_id)}</code> },
            { term: 'Recorded at', value: formatTime(obligation.attestation.recorded_at) },
            { term: 'Statement', value: obligation.attestation.statement },
            { term: 'Evidence', value: <span className="mono">{obligation.attestation.evidence_record_ids.join(', ')}</span> },
          ]} />
          <p style={{ marginTop: 'var(--s3)', marginBottom: 0 }}>This is administrative closure, not automated observation.</p>
        </div>
      ) : obligation.completion_criterion === 'ATTRIBUTED_MANUAL_ATTESTATION' ? (
        <NoticeBox tone="warn" title="Manual action required">
          <p>An authorized operator may record the action in the owning workflow. A statement is administrative evidence, not an independent observation; this obligation stays open until the server accepts it.</p>
        </NoticeBox>
      ) : null}
      {children}
      <TechnicalDetails items={[
        { term: 'Obligation', value: obligation.id },
        { term: 'Task version', value: String(obligation.task_version) },
        { term: 'Completion criterion', value: obligation.completion_criterion },
        { term: 'Execution state', value: obligation.execution_state },
        { term: 'Scope still current', value: String(obligation.scope_still_current) },
        ...(obligation.observation ? [
          { term: 'Observation', value: obligation.observation.id },
          { term: 'Observation state', value: obligation.observation.state },
          { term: 'System', value: obligation.observation.system_id },
          { term: 'Target record', value: obligation.observation.resource_id },
        ] : []),
      ]} />
    </article>
  );
}

function ManualTaskForm({ obligation, refresh }: { obligation: Obligation; refresh: () => void }) {
  const mutation = useMutation('attest', true);
  const [statement, setStatement] = useState('');
  const [references, setReferences] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const accepted = await mutation.run({
      statement: statement.trim(),
      evidence_record_ids: references.trim().split(/[\s,]+/).filter(Boolean),
      expected_task_version: obligation.task_version,
    }, { params: { id: obligation.id } });
    if (accepted) refresh();
  };
  // A background read can reveal a committed effect before the original reply
  // arrives. Preserve the exact request holder until replay settles it.
  if ((obligation.attestation || !obligation.scope_still_current) && mutation.status !== 'pending' && !mutation.unsettled) return null;
  return (
    <form aria-label="Record manual attestation" onSubmit={submit} style={{ marginTop: 'var(--s4)' }}>
      <h5 style={{ marginTop: 0 }}>Record manual attestation</h5>
      <p className="muted" style={{ fontSize: 13 }}>Describe the action you performed and reference this workflow&apos;s accepted receipt. The server checks assignment, current scope, evidence and task revision.</p>
      <fieldset disabled={mutation.status === 'pending' || mutation.unsettled || mutation.status === 'done' || !!obligation.attestation || !obligation.scope_still_current}>
        <TextAreaField label="Action statement" value={statement} onChange={setStatement} required maxLength={2000} />
        <TextField label="Receipt evidence IDs" value={references} onChange={setReferences} required maxLength={369} hint="Use this workflow's receipt ID. Separate multiple IDs with commas." />
        <button type="submit" className="primary">Record attributed action</button>
      </fieldset>
      <MutationFeedback mutation={mutation} onReplayed={refresh} />
      {mutation.result ? <p role="status">Attestation accepted. Reading the recorded result.</p> : null}
      <button type="button" disabled={mutation.status === 'pending'} onClick={refresh}>Read current task</button>
    </form>
  );
}

/* ================================================================== *
 * Attention — unresolved privacy control work
 * ================================================================== */

type IndexState = {
  status: 'idle' | 'building' | 'ready' | 'error';
  owners: Record<string, { workflowId: string; purposeId: string }>;
  read: number;
  total: number;
  failure: UiFailure | null;
};

/**
 * The contract links an obligation to its workflow only through an observation's
 * action, so an unresolved obligation with no observation has no direct route
 * home. Rather than a per-row opaque scan, this builds one bounded index for the
 * whole screen, with real progress, a cancel control and an explicit statement
 * of its limit. It reads only records this session is already authorised to read.
 */
function useOwningWorkflowIndex() {
  const [state, setState] = useState<IndexState>({ status: 'idle', owners: {}, read: 0, total: 0, failure: null });
  const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);

  const cancel = useCallback(() => { cancelled.current = true; setState(previous => ({ ...previous, status: 'ready' })); }, []);

  const build = useCallback(async () => {
    cancelled.current = false;
    const actor = currentIdentity();
    setState({ status: 'building', owners: {}, read: 0, total: 0, failure: null });
    try {
      const summaries: { id: string; purpose_id: string }[] = [];
      let cursor: string | undefined;
      const seen = new Set<string>();
      for (let page = 0; page < 100; page += 1) {
        const listing = await call('workflows', undefined, { cursor, limit: 100 });
        if (cancelled.current || actor !== currentIdentity()) return;
        summaries.push(...listing.items.map(item => ({ id: item.id, purpose_id: item.purpose_id })));
        if (!listing.next_cursor) break;
        if (seen.has(listing.next_cursor)) throw new Error('Repeated workflow cursor');
        seen.add(listing.next_cursor);
        cursor = listing.next_cursor;
      }
      setState(previous => ({ ...previous, total: summaries.length }));
      const owners: IndexState['owners'] = {};
      let read = 0;
      const queue = [...summaries];
      const worker = async () => {
        for (;;) {
          const next = queue.shift();
          if (!next || cancelled.current || actor !== currentIdentity()) return;
          const workflow = await call('workflow', undefined, { params: { id: next.id } });
          for (const obligation of workflow.obligations) owners[obligation.id] = { workflowId: workflow.id, purposeId: workflow.purpose_id };
          read += 1;
          if (read % 5 === 0 || !queue.length) setState(previous => ({ ...previous, owners: { ...owners }, read }));
        }
      };
      // Two readers only: the customer-local runtime pool is deliberately tiny,
      // and a wider fan-out starves unrelated requests on the same screen.
      await Promise.all(Array.from({ length: 2 }, worker));
      if (cancelled.current || actor !== currentIdentity()) return;
      setState({ status: 'ready', owners, read, total: summaries.length, failure: null });
    } catch (error) {
      if (cancelled.current || actor !== currentIdentity()) return;
      setState(previous => ({ ...previous, status: 'error', failure: describeFailure(error) }));
    }
  }, []);

  return { ...state, build, cancel };
}

/** What an operator can actually do next about this unresolved obligation. */
function nextAction(obligation: Obligation): string {
  if (!obligation.scope_still_current) return 'Nothing to do here: a newer decision supersedes this work. Open the current workflow for this purpose.';
  if (obligation.completion_criterion === 'ATTRIBUTED_MANUAL_ATTESTATION') return 'An authorised operator performs the action and records an attributed attestation in the owning workflow.';
  if (obligation.execution_state === 'EFFECT_UNKNOWN') return 'Request a scoped read reconciliation on the owning action. Do not repeat the change.';
  if (obligation.observation?.state === 'UNVERIFIABLE') return 'This target exposes no usable read, so observation cannot close it. Treat it as a manual or design gap.';
  if (obligation.observation?.state === 'OBSERVED_NOT_SATISFIED') return 'The required state is genuinely absent at the target. Investigate the control before re-running anything.';
  return 'Request a current independent read of the target.';
}

export function Attention() {
  const query = usePagedQuery('failures', { limit: 20 });
  const directory = useDirectory(['purposes', 'systems']);
  const index = useOwningWorkflowIndex();
  const now = useNow(1000);
  return (
    <>
      <PageHead
        eyebrow="Operations"
        title="Attention"
        lede="Privacy control work that is not resolved: unknown outcomes, systems with no supported automated control, failed actions and missing or expired verification. ORVIA keeps these visible rather than reporting green."
      />
      <Freshness query={query} />
      <div className="panel panel-quiet">
        <div className="row row-between">
          <div style={{ maxWidth: '62ch' }}>
            <strong>Find the owning workflow for these items</strong>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
              The contract links an obligation to its workflow only through an observation, so items without one
              need a bounded local search over the operations you are authorised to read. This builds the index
              once for the whole page; it makes no claim to be an exhaustive search of anything else.
            </p>
          </div>
          <div className="row">
            {index.status === 'building'
              ? <><span className="muted" aria-live="polite">Read {index.read} of {index.total || '…'} operations</span><button type="button" onClick={index.cancel}>Stop</button></>
              : <button type="button" onClick={() => void index.build()}>{index.status === 'ready' ? 'Rebuild index' : 'Find owning workflows'}</button>}
          </div>
        </div>
        {index.failure ? <FailureState failure={index.failure} /> : null}
      </div>
      <QueryBoundary query={query} label="unresolved privacy control work" isEmpty={data => !data.items.length}
        empty={<NoticeBox tone="ok" title="Nothing on this page needs attention"><p>This page of unresolved obligations is empty. An empty page may still have a next cursor.</p></NoticeBox>}>
        {data => (
          <>
            {data.items.map(obligation => {
              const status = obligationStatus(obligation, null, now);
              const owner = index.owners[obligation.id];
              const system = directory.system(obligation.observation?.system_id);
              return (
                <article className="panel" key={obligation.id}>
                  <div className="row row-between" style={{ marginBottom: 'var(--s3)' }}>
                    <div style={{ minWidth: 0 }}>
                      {owner ? <p className="eyebrow" style={{ margin: 0 }}>{directory.purposeName(owner.purposeId)}</p> : null}
                      <h4 style={{ margin: '2px 0 0', fontSize: 16 }}>
                        {system ? CONNECTOR_LABELS[system.connector] ?? system.name : 'System not named by this record'}
                      </h4>
                    </div>
                    <div className="row">
                      <Badge label={status.resolved ? 'Criterion satisfied' : 'Unresolved'} tone={status.tone} large />
                      <StateBadge dictionary={EXECUTION_LABELS} value={obligation.execution_state} />
                    </div>
                  </div>
                  <Facts tight items={[
                    { term: 'Why it is open', value: status.summary },
                    { term: 'Closes on', value: <StateBadge dictionary={CRITERION_LABELS} value={obligation.completion_criterion} /> },
                    { term: 'Last observation', value: obligation.observation?.observed_at ? `${formatAge(obligation.observation.observed_at, now)} · ${formatTime(obligation.observation.observed_at)}` : 'none recorded' },
                    { term: 'Next action', value: nextAction(obligation) },
                  ]} />
                  <div className="row" style={{ marginTop: 'var(--s4)' }}>
                    {owner
                      ? <><a href={`/workspace/workflows/${owner.workflowId}`}>Open owning workflow</a> · <a href={`/workspace/evidence/${owner.workflowId}`}>View proof</a></>
                      : <span className="muted" style={{ fontSize: 13 }}>Owning workflow not indexed yet.</span>}
                  </div>
                  <TechnicalDetails items={[
                    { term: 'Obligation', value: obligation.id },
                    { term: 'Completion criterion', value: obligation.completion_criterion },
                    { term: 'Execution state', value: obligation.execution_state },
                    { term: 'Required', value: String(obligation.required) },
                    { term: 'Scope still current', value: String(obligation.scope_still_current) },
                    ...(obligation.observation ? [
                      { term: 'Observation state', value: obligation.observation.state },
                      { term: 'System', value: obligation.observation.system_id },
                      { term: 'Target record', value: obligation.observation.resource_id },
                    ] : []),
                    ...(owner ? [{ term: 'Owning workflow', value: owner.workflowId }] : []),
                  ]} />
                </article>
              );
            })}
          </>
        )}
      </QueryBoundary>
      <Pagination query={query} />
    </>
  );
}

/* ================================================================== *
 * Evidence — proof of control
 * ================================================================== */

export function EvidenceDetail({ id, session }: { id: string; session: StaffSession }) {
  const query = useQuery('evidence', { params: { workflow_id: id }, pollWhile: evidence => evidence.workflow.actions.some(action => action.reconciliations.some(item => item.state === 'PENDING' || item.state === 'RECONCILING')) });
  const directory = useDirectory(['purposes', 'systems', 'principals']);
  const now = useNow(5000);
  const [error, setError] = useState<UiFailure | null>(null);
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true); setError(null);
    const actor = currentIdentity();
    try {
      const data = await call('export', undefined, { params: { workflow_id: id } });
      if (actor !== currentIdentity()) return;
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = `orvia-evidence-${id}.json`; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (failure) {
      if (actor === currentIdentity()) setError(describeFailure(failure));
    } finally {
      if (actor === currentIdentity()) setBusy(false);
    }
  };

  return (
    <>
      <PageHead
        eyebrow="Proof of control"
        title="Privacy control evidence"
        lede="One record of what was decided, what was in force, what ORVIA did, what it independently observed, and what remains unresolved."
        actions={<a href={`/workspace/workflows/${id}`}>Open operational workflow</a>}
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="workflow evidence">
        {evidence => {
          const workflow = evidence.workflow;
          const totals = obligationTotals(workflow, now);
          const action = workflow.actions[0] ?? null;
          const scopeCurrent = action ? workflow.obligations.some(item => item.observation?.action_id === action.id && item.scope_still_current) : false;
          const verification = action ? actionVerification(action, now, scopeCurrent) : null;
          const decision = evidence.receipts.at(-1) ?? null;
          return (
            <>
              <Section title="Summary">
                <div className="story">
                  <div className="story-grid">
                    <StoryCell term="Purpose" value={directory.purposeName(workflow.purpose_id)} />
                    <StoryCell term="Decision" value={decision ? <StateBadge dictionary={CONSENT_LABELS} value={decision.consent_status} /> : 'No receipt recorded'} />
                    <StoryCell term="Workflow" value={<StateBadge dictionary={WORKFLOW_LABELS} value={workflow.state} />} />
                    <StoryCell term="Target system" value={directory.systemName(action?.plan.scope.system_id)} />
                    <StoryCell term="Observed result" value={verification ? <Badge label={verification.verified ? 'Verified' : 'Not yet verified'} tone={verification.verified ? 'ok' : 'warn'} meaning={verification.detail} /> : <Badge label="No action recorded" tone="neutral" />} />
                    <StoryCell term="Evidence integrity" value={<Badge label="Digest recorded" tone="info" meaning={evidence.integrity_limit} />} />
                  </div>
                  <p style={{ marginTop: 'var(--s4)', marginBottom: 0 }}>{totals.statement}</p>
                </div>
              </Section>

              <Section title="Evidence scope and integrity">
                <div className="panel">
                  <Facts tight items={[
                    { term: 'Exported at', value: formatTime(evidence.exported_at) },
                    { term: 'Policy versions', value: evidence.policy_version_ids.length ? <span className="mono">{evidence.policy_version_ids.join(', ')}</span> : 'None recorded' },
                    { term: 'Notice versions', value: evidence.notice_version_ids.length ? <span className="mono">{evidence.notice_version_ids.join(', ')}</span> : 'None recorded' },
                    { term: 'Integrity digest', value: <span className="mono">{evidence.integrity_digest}</span> },
                  ]} />
                  <p className="muted" style={{ marginTop: 'var(--s3)', fontSize: 13 }}>{evidence.integrity_limit}</p>
                  {hasCapability(session, 'evidence.export') ? (
                    <button type="button" className="primary" disabled={busy} onClick={() => void download()} style={{ marginTop: 'var(--s2)' }}>
                      Download local evidence JSON
                    </button>
                  ) : null}
                  {error ? <FailureState failure={error} /> : null}
                </div>
              </Section>

              <Section title="Outstanding gaps" aside="Retained in the export, never trimmed to look complete.">
                <div className="panel">
                  {evidence.coverage_limits.length
                    ? <ul style={{ margin: 0, paddingLeft: 'var(--s5)' }}>{evidence.coverage_limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
                    : <p style={{ margin: 0 }}>No coverage limit is recorded for this workflow.</p>}
                </div>
              </Section>

              <Section title="Consent proof">
                <div className="panel">
                  {!evidence.receipts.length ? <p style={{ margin: 0 }}>No receipt is recorded for this workflow.</p> : evidence.receipts.map(receipt => (
                    <div key={receipt.receipt_id} style={{ marginBottom: 'var(--s4)' }}>
                      <div className="row">
                        <StateBadge dictionary={CONSENT_LABELS} value={receipt.consent_status} />
                        <span className="muted">epoch {receipt.consent_epoch} · accepted {formatTime(receipt.accepted_at)}</span>
                      </div>
                      {receipt.consent_status === 'WITHDRAWN' && receipt.workflow_id === workflow.id
                        ? <p style={{ margin: '6px 0 0' }}>Withdrawal accepted for this workflow. Target observations are shown separately below.</p> : null}
                      <TechnicalDetails items={[
                        { term: 'Receipt', value: receipt.receipt_id },
                        { term: 'Consent event', value: receipt.event_id },
                        { term: 'Propagation at acceptance', value: receipt.propagation_status },
                      ]} />
                    </div>
                  ))}
                </div>
              </Section>

              <WorkflowFacts workflow={workflow} session={session} refresh={query.refresh} directory={directory} hideSummary />

              <Section title="Regression evidence">
                <div className="panel">
                  {!evidence.tests.length
                    ? <p style={{ margin: 0 }}>No test run is linked to this workflow. No passing result is implied.</p>
                    : evidence.tests.map(run => (
                      <p key={run.id}>
                        <a href={`/workspace/test-lab/${run.id}`}>{run.request.scenario}</a> · {run.state} · build <span className="mono">{run.build_id}</span>
                      </p>
                    ))}
                </div>
              </Section>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}

/* ================================================================== *
 * Capability register
 * ================================================================== */

export function Capabilities() {
  const query = usePagedQuery('capabilities', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="About this build"
        title="Capabilities & roadmap"
        lede="The programme register retains all 33 master modules. Target depth is a plan, not evidence of implementation, entitlement or successful testing."
      />
      <NoticeBox tone="info" title="How to read this register"><p>{programme.note}</p></NoticeBox>
      <Section title="Programme modules">
        {programme.capabilities.map(capability => (
          <article className="panel" key={capability.module_id}>
            <div className="row row-between" style={{ marginBottom: 'var(--s3)' }}>
              <h4 style={{ margin: 0, fontSize: 15 }}>{capability.module_id} — {capability.name}</h4>
              <div className="row">
                <StateBadge dictionary={CAPABILITY_LABELS} value={capability.implementation_status} />
                <StateBadge dictionary={CAPABILITY_TEST_LABELS} value={capability.test_status} />
              </div>
            </div>
            <p className="muted" style={{ fontSize: 13 }}>{capability.target_product} · target depth {capability.target_depth} · {capability.sprint_priority}</p>
            <p>{capability.limitation}</p>
            {capability.evidence.length
              ? <><p style={{ marginBottom: 4 }}>Covering suites and specs:</p><ul style={{ margin: 0 }}>{capability.evidence.map(item => <li key={item}><code>{item}</code></li>)}</ul></>
              : <p>Evidence: none recorded in the programme register.</p>}
            <TechnicalDetails items={[
              { term: 'Implementation', value: capability.implementation_status },
              { term: 'Tests', value: capability.test_status },
              { term: 'Enabled', value: capability.enabled_state },
              { term: 'Profile', value: capability.supported_profile },
              { term: 'Entitlement', value: capability.edition_entitlement },
            ]} />
          </article>
        ))}
      </Section>
      <Section title="Runtime connector records" aside="This covers the synthetic connector subset, not the module register above.">
        <Freshness query={query} />
        <QueryBoundary query={query} label="runtime capabilities" isEmpty={data => !data.items.length}>
          {data => data.items.map(record => (
            <article className="panel" key={record.code}>
              <h4 style={{ marginTop: 0 }}>{record.code}</h4>
              <p className="muted" style={{ fontSize: 13 }}>{record.target_release} · {record.implementation_status} · test {record.test_status} · {record.supported_profile}</p>
              <ul style={{ margin: 0 }}>{record.limitations.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </article>
          ))}
        </QueryBoundary>
        <Pagination query={query} />
      </Section>
    </>
  );
}

/* ================================================================== *
 * Decision preview
 * ================================================================== */

export function PolicyPreview({ session }: { session: StaffSession }) {
  const principals = useCollection('list_principals');
  const purposes = useCollection('list_purposes');
  const systems = useCollection('list_systems');
  const mutation = useMutation('evaluate', false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.run({
      principal_id: String(data.get('principal')), purpose_id: String(data.get('purpose')),
      system_id: String(data.get('system')), action: data.get('action') as 'MARKETING_SEND' | 'ORDER_SERVICE_SEND',
    });
  };
  return (
    <>
      <PageHead
        eyebrow="Privacy controls"
        title="Decision preview"
        lede="Ask current authority how it would decide a proposed processing action. A preview is not send authorization: actual admission always rechecks current authority at the consumption boundary."
      />
      <QueryBoundary query={principals} label="preview principals">{principalPage =>
        <QueryBoundary query={purposes} label="preview purposes">{purposePage =>
          <QueryBoundary query={systems} label="preview systems">{systemPage =>
            <form className="panel" onSubmit={submit}>
              <Select label="Preview principal" name="principal" options={principalPage.items.map(item => ({ id: item.id, name: item.display_name }))} />
              <Select label="Preview purpose" name="purpose" options={purposePage.items.map(item => ({ id: item.id, name: item.name }))} />
              <Select label="Preview system" name="system" options={systemPage.items.map(item => ({ id: item.id, name: CONNECTOR_LABELS[item.name] ?? item.name }))} />
              <Select label="Preview action" name="action" options={[{ id: 'MARKETING_SEND', name: 'Marketing' }, { id: 'ORDER_SERVICE_SEND', name: 'Separate order service' }]} />
              <button type="submit" className="primary" disabled={!hasCapability(session, 'policy.preview') || mutation.status === 'pending'}>Evaluate current policy preview</button>
            </form>
          }</QueryBoundary>
        }</QueryBoundary>
      }</QueryBoundary>
      {mutation.failure ? <FailureState failure={mutation.failure} /> : null}
      {mutation.result ? (
        <section className="panel" role="status">
          <h3>Preview result</h3>
          <StateBadge dictionary={DECISION_LABELS} value={mutation.result.decision} large />
          <p style={{ marginTop: 'var(--s3)' }}>{mutation.result.reason_codes.join(', ')}</p>
          <Facts tight items={[
            { term: 'Consent epoch', value: mutation.result.consent_epoch ?? 'unavailable' },
            { term: 'Policy version', value: <span className="mono">{mutation.result.policy_version_id ?? 'unavailable'}</span> },
            { term: 'Evaluated at', value: formatTime(mutation.result.evaluated_at) },
          ]} />
          <p style={{ marginTop: 'var(--s3)', marginBottom: 0 }}>Preview only; no message was sent and no future send is authorized.</p>
        </section>
      ) : null}
    </>
  );
}

/* ================================================================== *
 * Privacy control map
 * ================================================================== */

export function ControlMap() {
  const query = usePagedQuery('control_map', { limit: 20 });
  const directory = useDirectory(['purposes', 'systems']);
  const now = useNow(30_000);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <PageHead
        eyebrow="Privacy controls"
        title="Privacy control map"
        lede="Declared privacy-control relationships: which purpose is enforced in which system, against which exact target record, and what ORVIA last observed there. ORVIA does not discover these relationships automatically — they are declared through configuration."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="declared control relationships" isEmpty={data => !data.edges.length}>
        {data => {
          const current = data.edges.filter(edge => edge.observed_restrict !== null).length;
          const stale = data.edges.filter(edge => edge.observed_restrict === null && edge.as_of !== null).length;
          const never = data.edges.length - current - stale;
          return (
            <>
              <div className="grid-3" style={{ marginBottom: 'var(--s5)' }}>
                <Metric label="Current proof on this page" value={current} tone={current ? 'ok' : 'warn'}
                  note="A fresh, current-generation scoped read established the target state." />
                <Metric label="Observed, but not current proof" value={stale} tone={stale ? 'warn' : 'neutral'}
                  note="An observation exists but is expired, of another generation, or not an independent read." />
                <Metric label="Never independently read" value={never} tone={never ? 'warn' : 'ok'}
                  note="Declared as a relationship; ORVIA has never observed this exact target for it." />
              </div>
              {data.edges.map(edge => {
                const system = directory.system(edge.system_id);
                const key = edge.resource_id;
                const open = expanded === key;
                // `observed_restrict` is non-null only for a fresh,
                // current-generation scoped read. An `as_of` without it means an
                // observation exists that no longer counts as current proof, and
                // the two cases are never collapsed into one label.
                const proof = edge.observed_restrict !== null ? 'CURRENT' : edge.as_of ? 'NOT_CURRENT' : 'NONE';
                const tone = proof === 'CURRENT' ? (edge.observed_restrict ? 'ok' : 'stop') : 'warn';
                const verdict = proof === 'CURRENT'
                  ? (edge.observed_restrict ? 'Restriction verified' : 'Restriction not in place')
                  : proof === 'NOT_CURRENT' ? 'No current proof' : 'Never observed';
                const verdictMeaning = proof === 'CURRENT'
                  ? 'A fresh scoped read of this exact target and generation established this state.'
                  : proof === 'NOT_CURRENT'
                    ? 'An observation exists for this target, but it is outside its freshness window, refers to another target generation, or is not an independent scoped read. It does not count as current proof.'
                    : 'ORVIA has not independently read this exact target for this relationship.';
                return (
                  <article className="panel" key={key}>
                    <div className="row row-between">
                      <div style={{ minWidth: 0 }}>
                        <p className="eyebrow" style={{ margin: 0 }}>{directory.purposeName(edge.purpose_id)}</p>
                        <h4 style={{ margin: '2px 0 0', fontSize: 16 }}>{directory.systemName(edge.system_id)}</h4>
                      </div>
                      <div className="row">
                        <Badge label={verdict} tone={tone} meaning={verdictMeaning} large />
                        <button type="button" className="quiet" aria-expanded={open} onClick={() => setExpanded(open ? null : key)}>
                          {open ? 'Hide relationship' : 'Show relationship'}
                        </button>
                      </div>
                    </div>
                    <p className="muted" style={{ margin: 'var(--s2) 0 0', fontSize: 13 }}>
                      {edge.declared_restrict ? 'Declares an automated restriction' : 'Declares no automated restriction'} · capability {edge.capability_version} ·{' '}
                      {edge.as_of ? <>last read {formatAge(edge.as_of, now)} ({formatTime(edge.as_of)})</> : 'never read'}
                    </p>
                    {open ? (
                      <div style={{ marginTop: 'var(--s4)' }}>
                        <Flow steps={[
                          { kind: 'Purpose', name: directory.purposeName(edge.purpose_id), note: 'The processing being controlled.', tone: 'info' },
                          { kind: 'System', name: directory.systemName(edge.system_id), note: system ? CONNECTOR_NOTES[system.connector] : 'Connector not resolved from the configuration directory.', tone: 'info' },
                          { kind: 'Control', name: 'Marketing restriction', note: `Declared restriction capability ${String(edge.declared_restrict)}, capability version ${edge.capability_version}.`, tone: edge.declared_restrict ? 'info' : 'warn' },
                          { kind: 'Target record', name: <span className="mono">{shortId(edge.resource_id)}</span>, note: 'One exact synthetic record. ORVIA never operates on a set.', tone: 'neutral' },
                          {
                            kind: 'Last independent read',
                            name: verdict,
                            note: edge.as_of ? `${verdictMeaning} Last read ${formatAge(edge.as_of, now)} · ${formatTime(edge.as_of)}.` : verdictMeaning,
                            tone,
                          },
                        ]} />
                        <TechnicalDetails items={[
                          { term: 'Purpose', value: edge.purpose_id },
                          { term: 'System', value: edge.system_id },
                          { term: 'Target record', value: edge.resource_id },
                          { term: 'Declared restriction', value: String(edge.declared_restrict) },
                          { term: 'Capability version', value: edge.capability_version },
                          { term: 'observed_restrict', value: String(edge.observed_restrict) },
                          { term: 'as_of', value: edge.as_of ?? 'none' },
                          { term: 'Current-proof rule', value: 'observed_restrict is non-null only for a SCOPED_READ of the current target generation, inside its freshness window, in a definite state.' },
                        ]} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </>
          );
        }}
      </QueryBoundary>
      <Pagination query={query} />
    </>
  );
}

/** Navigates only to a contract-valid local record ID, never an arbitrary URL. */
export function OpenRecord({ label, base }: { label: string; base: string }) {
  const [id, setId] = useState('');
  const valid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id);
  return (
    <form onSubmit={event => { event.preventDefault(); if (valid) globalThis.location.assign(`${base}/${id}`); }}>
      <TextField label={label} value={id} onChange={setId} required />
      <button type="submit" disabled={!valid}>Open recorded ID</button>
      <p className="muted" style={{ fontSize: 13, marginTop: 'var(--s2)' }}>Enter the exact UUID of an authorized record. The server still checks your scope.</p>
    </form>
  );
}
