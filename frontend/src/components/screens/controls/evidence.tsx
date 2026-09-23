'use client';
import { useState } from 'react';
import { call, currentIdentity, useNow, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { actionVerification, obligationTotals } from '../../shared/derive.ts';
import { describeFailure, type UiFailure } from '../../shared/errors.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import { CONSENT_LABELS, WORKFLOW_LABELS, formatTime } from '../../shared/state-labels.ts';
import { Badge, Facts, FailureState, Freshness, PageHead, QueryBoundary, Section, StateBadge, StoryCell, TechnicalDetails } from '../../shared/ui.tsx';
import { WorkflowFacts } from './workflows.tsx';

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
