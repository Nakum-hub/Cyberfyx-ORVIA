'use client';
import { useState, type FormEvent, type ReactNode } from 'react';
import type { schemas } from '@orvia/contracts';
import { useMutation, useNow, usePagedQuery, useQuery, POLL } from '../../shared/api.ts';
import { useDirectory, type Directory } from '../../shared/directory.ts';
import { actionVerification, buildTimeline, obligationAction, obligationStatus, obligationTotals, observationFreshness } from '../../shared/derive.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import {
  EXECUTION_LABELS, WORKFLOW_LABELS,
  CONNECTOR_LABELS, CRITERION_LABELS, METHOD_LABELS, OPERATION_LABELS, PURPOSE_CODE_LABELS,
  UNCERTAINTY_COPY, formatAge, formatTime, shortId,
} from '../../shared/state-labels.ts';
import {
  Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination,
  QueryBoundary, Section, StateBadge, StoryCell, TechnicalDetails, TextField, TextAreaField,
} from '../../shared/ui.tsx';
import { MutationFeedback } from '../../shared/mutation-feedback.tsx';

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
