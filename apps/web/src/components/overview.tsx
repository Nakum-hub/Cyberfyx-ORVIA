'use client';
import { useMemo, useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { useCollection, useNow, useQuery } from './api.ts';
import { useDirectory } from './directory.ts';
import { actionVerification, obligationTotals } from './derive.ts';
import type { StaffSession } from './session-context.tsx';
import { hasCapability } from './session-context.tsx';
import {
  OPERATION_LABELS, PURPOSE_CODE_LABELS, WORKFLOW_LABELS, EXECUTION_LABELS,
  formatAge, formatTime, shortId,
} from './state-labels.ts';
import {
  Badge, Facts, Freshness, Lifecycle, Loading, Metric, NoticeBox, PageHead,
  QueryBoundary, Section, StateBadge, StoryCell, TechnicalDetails, type Stage,
} from './ui.tsx';

type WorkflowSummary = ReturnType<typeof schemas.WorkflowSummary.parse>;

/**
 * The lifecycle strip is explanatory navigation, not runtime state. It names the
 * sequence ORVIA actually implements and sends the viewer to the screen that
 * holds each part of the record. It never claims a stage has happened.
 */
export const LIFECYCLE: Stage[] = [
  { step: 'Purpose', name: 'Purpose & policy', note: 'What processing is being controlled, and under which authority.', href: '/workspace/configuration' },
  { step: 'Consent', name: 'Person’s decision', note: 'A purpose-specific decision the person can change at any time.', href: '/workspace/principals' },
  { step: 'Policy', name: 'Decision preview', note: 'How current authority evaluates a proposed processing action.', href: '/workspace/policy-preview' },
  { step: 'Workflow', name: 'Durable workflow', note: 'The operational work a decision creates, recorded in the database.', href: '/workspace/workflows' },
  { step: 'System', name: 'System action', note: 'The restriction ORVIA requests in the connected system.', href: '/workspace/control-map' },
  { step: 'Verification', name: 'Independent verification', note: 'ORVIA reads the target itself. An acknowledgement is not a verification.', href: '/workspace/workflows' },
  { step: 'Evidence', name: 'Evidence', note: 'What happened, what was observed, and what is still unresolved.', href: '/workspace/evidence' },
  { step: 'Test', name: 'Regression test', note: 'Whether the control still works — including when it is deliberately broken.', href: '/workspace/test-lab' },
];

export function Overview({ session }: { session: StaffSession }) {
  const overview = useQuery('overview');
  return (
    <>
      <PageHead
        eyebrow="Privacy control workspace"
        title="Privacy control status"
        lede="ORVIA turns a person's purpose-specific privacy decision into operational work, changes the connected system, verifies the result independently and keeps the evidence — including the parts that did not resolve."
      />
      <Freshness query={overview} asOf={overview.data?.as_of} />
      <QueryBoundary query={overview} label="current privacy control status">
        {data => (
          <>
            <Section title="Live counts in this scope" aside="Live server values for your authenticated organisation and environment. No trend, target or score is derived from them.">
              <div className="grid-4">
                <Metric label="Controls verified" value={data.counts.completed} tone="ok"
                  note="Workflows where every required obligation closed by its own criterion." />
                <Metric label="Controls needing attention" value={data.counts.needs_attention} tone="warn"
                  note="At least one required obligation is unresolved, uncertain or superseded."
                  link={{ href: '/workspace/failures', label: 'Open attention list' }} />
                <Metric label="Outcome unknown" value={data.counts.effect_unknown} tone="unknown"
                  note="Attempts with no reliable result. ORVIA reconciles by reading, never by blind retry." />
                <Metric label="Manual action required" value={data.counts.manual_required} tone="warn"
                  note="Systems with no supported automated control; a named person must act and attest." />
              </div>
              <div className="grid-4" style={{ marginTop: 'var(--s4)' }}>
                <Metric label="Accepted, not yet started" value={data.counts.accepted} />
                <Metric label="Running" value={data.counts.running} />
                <Metric label="Failed actions" value={data.counts.failed} tone="stop" />
                <Metric label="Obligations without current verification" value={data.counts.unverified} tone="warn" />
              </div>
              <p className="muted" style={{ marginTop: 'var(--s3)', fontSize: 13 }}>
                These counts overlap and must not be added together. Execution states retain historical unknown,
                failed or manual facts even after a separate completion criterion is satisfied.
              </p>
            </Section>

            <Section title="How ORVIA controls privacy" aside="Each stage opens the screen that holds that part of the record.">
              <Lifecycle stages={LIFECYCLE} />
            </Section>

            <CurrentDemonstration session={session} />

            <Section title="Assurance" aside="Regression results are read by exact run ID; this build exposes no run-history list.">
              <div className="grid-2">
                <div className="metric">
                  <span className="metric-label">Test Lab</span>
                  <span className="metric-value text">No run selected</span>
                  <span className="metric-note">
                    Open a scenario in the Test Lab and record its run ID. A queued request is not an execution,
                    and an execution is not a pass.
                  </span>
                  <a href="/workspace/test-lab">Open Test Lab</a>
                </div>
                <div className="metric">
                  <span className="metric-label">Canonical acceptance</span>
                  <span className="metric-value text">Not run</span>
                  <span className="metric-note">
                    Component suites pass at this candidate. Canonical acceptance additionally requires the two
                    human rehearsals and is deliberately not claimed here.
                  </span>
                  <a href="/workspace/capabilities">Open capabilities &amp; roadmap</a>
                </div>
              </div>
            </Section>

            <Section title="Proof">
              <div className="grid-3">
                <ProofLink href="/workspace/evidence" title="Evidence" note="Consent, policy, execution and independent observation for one workflow, with its unresolved gaps." />
                <ProofLink href="/workspace/workflows" title="Workflows" note="What ORVIA actually did, attempt by attempt, with the separate readback." />
                <ProofLink href="/workspace/control-map" title="Control map" note="Declared purpose-to-target relationships and the last observation of each." />
              </div>
            </Section>

            {/* Kept as a named heading because build and authority are facts a
                reviewer checks first, not decoration. */}
            <Section title="This build">
              <div className="panel">
                <Facts tight items={[
                  { term: 'Build', value: <code className="mono">{data.build_id}</code> },
                  { term: 'Contract', value: data.contract_version },
                  { term: 'Data profile', value: data.profile },
                  { term: 'Organisation', value: <code className="mono">{shortId(data.scope.legal_entity_id)}</code> },
                  { term: 'Environment', value: <code className="mono">{shortId(data.scope.environment_id)}</code> },
                ]} />
                <TechnicalDetails summary="Scope identifiers and server-derived capabilities" items={[
                  { term: 'Tenant', value: data.scope.tenant_id },
                  { term: 'Organisation', value: data.scope.legal_entity_id },
                  { term: 'Environment', value: data.scope.environment_id },
                ]}>
                  <p className="muted" style={{ fontSize: 12.5, marginTop: 'var(--s3)' }}>
                    Capabilities are derived by the server for this session. Hiding a control in this interface
                    is presentation; the server authorises every request independently.
                  </p>
                  <ul>{session.capabilities.map(capability => <li key={capability}><code>{capability}</code></li>)}</ul>
                </TechnicalDetails>
              </div>
            </Section>
          </>
        )}
      </QueryBoundary>
    </>
  );
}

function ProofLink({ href, title, note }: { href: string; title: string; note: string }) {
  return (
    <a className="entry-card" href={href}>
      <h2>{title}</h2>
      <p>{note}</p>
      <p style={{ marginBottom: 0, color: 'var(--accent)', fontWeight: 600, fontSize: 13.5 }}>View proof →</p>
    </a>
  );
}

type Focus = 'recent' | 'verified' | 'attention';
const FOCUS_LABEL: Record<Focus, string> = {
  recent: 'Most recent', verified: 'Most recent verified', attention: 'Most recent needing attention',
};

/**
 * One real, currently recorded demonstration, told as a sentence instead of a
 * table. Every value comes from `workflows`, `workflow` and the configuration
 * directory; nothing is chosen to look better than it is, and the operator can
 * switch which real record is being shown.
 */
function CurrentDemonstration({ session }: { session: StaffSession }) {
  const [focus, setFocus] = useState<Focus>('recent');
  const canRead = hasCapability(session, 'workflow.read');
  const workflows = useCollection('workflows', { enabled: canRead });
  const directory = useDirectory(['purposes', 'systems', 'principals'], canRead);

  const chosen = useMemo<WorkflowSummary | null>(() => {
    const items = workflows.data?.items ?? [];
    if (!items.length) return null;
    const bytime = [...items].sort((a, b) => Date.parse(b.accepted_at) - Date.parse(a.accepted_at));
    if (focus === 'verified') return bytime.find(item => item.state === 'COMPLETED') ?? null;
    if (focus === 'attention') return bytime.find(item => item.state === 'NEEDS_ATTENTION') ?? null;
    return bytime[0] ?? null;
  }, [workflows.data, focus]);

  return (
    <Section
      title="Current demonstration"
      aside={
        <div className="segmented" role="group" aria-label="Which recorded operation to feature">
          {(['recent', 'verified', 'attention'] as const).map(option => (
            <button key={option} type="button" aria-pressed={focus === option} onClick={() => setFocus(option)}>
              {FOCUS_LABEL[option]}
            </button>
          ))}
        </div>
      }
    >
      {!canRead ? (
        <NoticeBox tone="info" title="Recorded operations are not readable by this session">
          <p>Your server-derived capabilities do not include <code>workflow.read</code>, so no operation is featured here.</p>
        </NoticeBox>
      ) : null}
      {canRead && workflows.status === 'loading' ? <Loading label="recorded operations in this scope" /> : null}
      {workflows.failure && !workflows.data ? (
        <NoticeBox tone="warn" title="Recorded operations could not be read">
          <p>{workflows.failure.guidance}</p>
        </NoticeBox>
      ) : null}
      {workflows.data && !chosen ? (
        <NoticeBox tone="neutral" title={`No ${FOCUS_LABEL[focus].toLowerCase()} operation exists in this scope`}>
          <p>
            {workflows.data.items.length
              ? 'Records exist, but none currently matches this selection. Nothing is substituted.'
              : 'No workflow has been recorded yet. A consent decision that requires downstream work creates one.'}
          </p>
        </NoticeBox>
      ) : null}
      {chosen ? <DemonstrationCard summary={chosen} directory={directory} /> : null}
    </Section>
  );
}

function DemonstrationCard({ summary, directory }: { summary: WorkflowSummary; directory: ReturnType<typeof useDirectory> }) {
  const detail = useQuery('workflow', { params: { id: summary.id } });
  const now = useNow(5000);
  const purpose = directory.purpose(summary.purpose_id);

  return (
    <div className="story">
      <div className="row row-between" style={{ marginBottom: 'var(--s4)' }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>{purpose ? PURPOSE_CODE_LABELS[purpose.code] ?? purpose.code : 'Purpose'}</p>
          <h3 style={{ fontSize: 20, margin: '2px 0 0' }}>{directory.purposeName(summary.purpose_id)}</h3>
        </div>
        <StateBadge dictionary={WORKFLOW_LABELS} value={summary.state} large />
      </div>

      <QueryBoundary query={detail} label="the featured operation">
        {workflow => {
          const totals = obligationTotals(workflow, now);
          const action = workflow.actions[0] ?? null;
          const scopeCurrent = action
            ? workflow.obligations.some(item => item.observation?.action_id === action.id && item.scope_still_current)
            : false;
          const verification = action ? actionVerification(action, now, scopeCurrent) : null;
          const latest = action?.observations.at(-1) ?? null;
          return (
            <>
              <div className="story-grid">
                <StoryCell term="Person" value={action ? directory.principalName(action.plan.scope.principal_reference_id) : 'No action names a person'} />
                <StoryCell term="Authority" value={purpose?.code === 'promotional_marketing' ? 'Consent-based' : purpose ? 'Separately approved condition' : 'Not resolved'} />
                <StoryCell term="Connected system" value={action ? directory.systemName(action.plan.scope.system_id) : 'No system action planned'} />
                <StoryCell term="Control" value={action ? OPERATION_LABELS[action.plan.scope.operation] ?? action.plan.scope.operation : 'No action planned'} />
                <StoryCell term="Decision accepted" value={formatTime(workflow.accepted_at)} small />
                <StoryCell term="Action status" value={action ? <StateBadge dictionary={EXECUTION_LABELS} value={action.execution_state} /> : <Badge label="Nothing attempted" tone="neutral" />} />
                <StoryCell term="Independent verification" value={verification ? <Badge label={verification.claim} tone={verification.verified ? 'ok' : 'warn'} meaning={verification.detail} /> : <Badge label="No action recorded" tone="neutral" />} />
                <StoryCell term="Last observation" value={latest?.observed_at ? formatAge(latest.observed_at, now) : 'No observation'} small />
              </div>

              {verification ? <p style={{ marginTop: 'var(--s4)', marginBottom: 'var(--s2)' }}>{verification.detail}</p> : null}
              <p style={{ marginTop: verification ? 0 : 'var(--s4)', marginBottom: 'var(--s3)' }}>{totals.statement}</p>

              <div className="row">
                <a className="badge badge-info" style={{ textDecoration: 'none' }} href={`/workspace/workflows/${workflow.id}`}>Open the workflow</a>
                <a className="badge badge-info" style={{ textDecoration: 'none' }} href={`/workspace/evidence/${workflow.id}`}>View proof</a>
                <a className="badge badge-neutral" style={{ textDecoration: 'none' }} href="/workspace/demo">Guided demo</a>
              </div>

              <TechnicalDetails items={[
                { term: 'Workflow', value: workflow.id },
                { term: 'Consent event', value: workflow.event_id },
                { term: 'Purpose', value: workflow.purpose_id },
                ...(action ? [
                  { term: 'Action', value: action.id },
                  { term: 'System', value: action.plan.scope.system_id },
                  { term: 'Target record', value: action.plan.scope.resource_id },
                  { term: 'Operation', value: action.plan.scope.operation },
                  { term: 'Consent epoch', value: String(action.plan.scope.consent_epoch) },
                  { term: 'Target generation', value: String(action.plan.scope.target_generation) },
                ] : []),
              ]} />
            </>
          );
        }}
      </QueryBoundary>
    </div>
  );
}
