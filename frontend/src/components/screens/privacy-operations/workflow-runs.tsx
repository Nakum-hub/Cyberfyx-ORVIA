'use client';
import { useState } from 'react';
import { readOnce, useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TextAreaField } from '../../shared/ui.tsx';
import { ACTION_STATE_LABELS, EXECUTION_REPORT_LABELS, RUN_KIND_LABELS, RUN_STATUS_LABELS, knownOr } from './operations-labels.ts';

/**
 * Operational runs: consent withdrawal, rights execution, correction, retention
 * erasure and processor disposition.
 *
 * The run is shown as counts that add up, never as a percentage, and each
 * action keeps its target's claim apart from independent verification. An
 * irreversible run shows its dry-run scope before anything is sent, and the
 * approval binds that exact scope: if the scope changes, the approval fails.
 */
export function WorkflowRuns() {
  const [status, setStatus] = useState('');
  const query = usePagedQuery('list_workflow_runs', { limit: 25, ...(status ? { query: { status } } : {}) });
  return (
    <>
      <PageHead eyebrow="DPDP operations" title="Operational runs"
        lede="Every downstream change ORVIA makes or coordinates, with what was requested, what each target reported, and what was independently verified." />
      <label className="inline-filter">
        <span>Status</span>
        <select value={status} onChange={event => setStatus(event.target.value)}>
          <option value="">Any status</option>
          {Object.entries(RUN_STATUS_LABELS).map(([value, label]) => <option key={value} value={value}>{label.label}</option>)}
        </select>
      </label>
      <Freshness query={query} />
      <QueryBoundary query={query} label="operational runs" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Operational runs, newest first" rows={data.items} rowKey={run => run.id}
              columns={[
                { key: 'kind', header: 'Run', cell: run => <a href={`/workspace/operations-runs/${run.id}`} className="cell-primary">{RUN_KIND_LABELS[run.kind] ?? run.kind}<span className="cell-sub">{shortId(run.id)}</span></a> },
                { key: 'status', header: 'Status', cell: run => <StateBadge dictionary={RUN_STATUS_LABELS} value={run.status} /> },
                { key: 'counts', header: 'Verified / submitted / eligible', cell: run => `${run.counts.verified} / ${run.counts.submitted} / ${run.counts.eligible}` },
                { key: 'exceptions', header: 'Open exceptions', cell: run => run.open_exceptions.length ? String(run.open_exceptions.length) : 'None' },
                { key: 'package', header: 'Regulatory package', cell: run => <>{run.package.version}{run.package.distribution === 'TEST_FIXTURE' && <> <Badge label="Test fixture" tone="warn" meaning="Pinned to a synthetic test package, not an official one." /></>}</> },
                { key: 'created', header: 'Created', cell: run => formatTime(run.created_at) },
              ]} />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function WorkflowRunDetail({ id }: { id: string }) {
  const run = useQuery('workflow_run', { params: { id }, pollWhile: data => ['EVALUATING', 'RUNNING'].includes(data.status) });
  const actions = usePagedQuery('list_run_actions', { params: { id }, limit: 100 });
  const directory = useDirectory(['systems']);
  const evaluate = useMutation('evaluate_run', true);
  const decide = useMutation('decide_run', true);
  const execute = useMutation('execute_run', true);
  const cancel = useMutation('cancel_run', true);
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');
  const [exported, setExported] = useState<string | null>(null);
  const refresh = () => { run.refresh(); actions.refresh(); };

  return (
    <QueryBoundary query={run} label="operational run" isEmpty={() => false}>
      {data => (
        <>
          <PageHead eyebrow={RUN_KIND_LABELS[data.kind] ?? data.kind} title={`Run ${shortId(data.id)}`}
            lede={<StateBadge dictionary={RUN_STATUS_LABELS} value={data.status} large />} />
          <Freshness query={run} />
          {data.package.distribution === 'TEST_FIXTURE' && (
            <NoticeBox tone="warn" title="Pinned to a test fixture package">
              <p>This run was evaluated under a synthetic TEST_FIXTURE regulatory package. It demonstrates behaviour; it is not evidence against the official DPDP instruments.</p>
            </NoticeBox>
          )}
          <Section title="Counts">
            <Facts items={[
              { term: 'Discovered', value: String(data.counts.total_discovered) }, { term: 'Eligible', value: String(data.counts.eligible) },
              { term: 'Blocked', value: String(data.counts.blocked) }, { term: 'Unresolved', value: String(data.counts.unresolved) },
              { term: 'Submitted', value: String(data.counts.submitted) }, { term: 'Target says done', value: String(data.counts.succeeded) },
              { term: 'Independently verified', value: String(data.counts.verified) }, { term: 'Failed', value: String(data.counts.failed) },
              { term: 'Inconclusive', value: String(data.counts.inconclusive) }, { term: 'Not supported', value: String(data.counts.not_supported) },
              { term: 'Still pending', value: String(data.counts.pending) },
            ]} />
            {data.open_exceptions.length > 0 && (
              <NoticeBox tone="warn" title="Open exceptions — these stay visible after the run ends">
                <ul>{data.open_exceptions.map(item => <li key={item}>{item}</li>)}</ul>
              </NoticeBox>
            )}
          </Section>

          {data.status === 'EVALUATING' && (
            <Section title="Evaluation in progress">
              <p>The population is evaluated in bounded batches. The background runner resumes it; you can also evaluate the next batch now.</p>
              <button type="button" disabled={evaluate.status === 'pending'} onClick={async () => { evaluate.newInteraction(); if (await evaluate.run({ limit: 500 }, { params: { id } })) refresh(); }}>Evaluate next batch</button>
              {evaluate.failure && <FailureState failure={evaluate.failure} />}
            </Section>
          )}

          {data.preview && (
            <Section title="Dry run: what would happen">
              {data.preview.irreversible && <NoticeBox tone="stop" title="Irreversible"><p>Once sent, these actions cannot be undone by ORVIA. Check the scope below before approving.</p></NoticeBox>}
              {data.preview.warning && <NoticeBox tone="warn" title="Warning"><p>{data.preview.warning}</p></NoticeBox>}
              <Facts items={[
                { term: 'Actions', value: data.preview.action_types.join(', ') || 'None' },
                { term: 'People in scope', value: String(data.preview.population_count) },
                { term: 'Eligible', value: String(data.preview.eligible) }, { term: 'Blocked', value: String(data.preview.blocked) },
                { term: 'Unresolved', value: String(data.preview.unresolved) }, { term: 'Unsupported targets', value: String(data.preview.unsupported) },
                { term: 'Verifiable', value: String(data.preview.verifiable) }, { term: 'Blocking holds', value: String(data.preview.blocking_hold_ids.length) },
                { term: 'Requirements', value: data.preview.requirement_ids.join(', ') || 'None' },
                { term: 'Scope hash', value: <code>{data.scope_hash ?? 'Not computed'}</code> },
              ]} />
              <DataTable caption="Target systems in this run" rows={data.preview.target_systems} rowKey={t => t.system_id}
                columns={[
                  { key: 'system', header: 'System', cell: t => directory.systemName(t.system_id) },
                  { key: 'adapter', header: 'Connector', cell: t => t.adapter === 'SYNTHETIC_RECORDS_TEST_ADAPTER' ? <Badge label="Test adapter" tone="warn" meaning="Synthetic records test adapter. It is not a live production connector." /> : t.adapter === 'MANUAL_ONLY' ? 'Manual only' : 'No connector bound' },
                  { key: 'supported', header: 'Can act', cell: t => t.supported ? 'Yes' : 'No' },
                  { key: 'verify', header: 'Can verify independently', cell: t => t.can_verify ? 'Yes' : 'No' },
                  { key: 'count', header: 'Actions', cell: t => String(t.action_count) },
                ]} />
            </Section>
          )}

          {data.status === 'DRY_RUN_READY' && data.scope_hash && (
            <Section title="Second-person approval">
              <p>You cannot approve a run you created. Approval binds scope hash <code>{shortId(data.scope_hash)}</code>; if the scope changes, the approval is refused.</p>
              <TextAreaField label="Approval or rejection note" value={note} onChange={setNote} required maxLength={500} />
              <div className="actions">
                <button type="button" disabled={note.trim().length < 10 || decide.status === 'pending'} onClick={async () => { decide.newInteraction(); if (await decide.run({ decision: 'APPROVED', note, scope_hash: data.scope_hash! }, { params: { id } })) refresh(); }}>Approve this exact scope</button>
                <button type="button" disabled={note.trim().length < 10 || decide.status === 'pending'} onClick={async () => { decide.newInteraction(); if (await decide.run({ decision: 'REJECTED', note, scope_hash: data.scope_hash! }, { params: { id } })) refresh(); }}>Reject</button>
              </div>
              {decide.failure && <FailureState failure={decide.failure} />}
            </Section>
          )}
          {data.approval && (
            <Section title="Recorded decision">
              <Facts items={[{ term: 'Decision', value: data.approval.decision }, { term: 'By', value: shortId(data.approval.approver_id) },
                { term: 'At', value: formatTime(data.approval.decided_at) }, { term: 'Note', value: data.approval.note }, { term: 'Scope hash', value: <code>{shortId(data.approval.scope_hash)}</code> }]} />
            </Section>
          )}

          {['APPROVED', 'RUNNING', 'PARTIALLY_FAILED'].includes(data.status) && (
            <Section title="Execution">
              <p>Actions are sent in bounded batches, each with an idempotency key, and each is verified independently before it counts as verified.</p>
              <button type="button" disabled={execute.status === 'pending'} onClick={async () => { execute.newInteraction(); if (await execute.run({ limit: 50 }, { params: { id } })) refresh(); }}>Send next batch</button>
              {execute.failure && <FailureState failure={execute.failure} />}
            </Section>
          )}

          <Section title="Actions">
            <Freshness query={actions} />
            <QueryBoundary query={actions} label="run actions" isEmpty={page => !page.items.length}>
              {page => (
                <>
                  <DataTable caption="Actions in planned order" rows={page.items} rowKey={a => a.id}
                    columns={[
                      { key: 'n', header: '#', cell: a => String(a.ordinal + 1) },
                      { key: 'target', header: 'Target', cell: a => <span className="cell-primary">{a.system_id ? directory.systemName(a.system_id) : 'Processor'}<span className="cell-sub">{a.action_type}{a.target_reference ? ` · ${a.target_reference}` : ''}</span></span> },
                      { key: 'state', header: 'State', cell: a => <StateBadge dictionary={ACTION_STATE_LABELS} value={a.state} /> },
                      { key: 'report', header: 'Shared vocabulary', cell: a => <StateBadge dictionary={EXECUTION_REPORT_LABELS} value={a.execution} /> },
                      { key: 'target_result', header: 'Target reported', cell: a => knownOr({}, a.target_result) },
                      { key: 'verification', header: 'Verification', cell: a => a.verifications[0] ? `${a.verifications[0].result} · ${a.verifications[0].method.replaceAll('_', ' ').toLowerCase()}` : 'None recorded' },
                      { key: 'why', header: 'Why', cell: a => a.block_reason ?? a.last_error_code ?? (a.hold_ids.length ? `${a.hold_ids.length} hold(s)` : '') },
                      { key: 'attempts', header: 'Attempts', cell: a => String(a.attempts) },
                    ]} />
                  <Pagination query={actions} />
                </>
              )}
            </QueryBoundary>
          </Section>

          <Section title="Evidence package">
            <p>Exports the run, its pinned package, applicability, approvals, every action and verification, holds and evidence records, with an integrity digest.</p>
            <button type="button" onClick={async () => {
              const evidence = await readOnce('run_evidence_package', { params: { id } });
              const blob = new Blob([JSON.stringify(evidence, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob); const link = document.createElement('a');
              link.href = url; link.download = `orvia-run-${id}-evidence.json`; link.click(); URL.revokeObjectURL(url);
              setExported(evidence.integrity_digest);
            }}>Download evidence package</button>
            {exported && <p className="cell-sub">Integrity digest {shortId(exported)}. The digest detects change to this export; it does not prove effects beyond the recorded verifications.</p>}
          </Section>

          {!['COMPLETED_VERIFIED', 'CANCELLED'].includes(data.status) && (
            <Section title="Cancel this run">
              <TextAreaField label="Reason for cancelling" value={reason} onChange={setReason} required maxLength={500} />
              <button type="button" disabled={reason.trim().length < 10 || cancel.status === 'pending'} onClick={async () => { cancel.newInteraction(); if (await cancel.run({ reason }, { params: { id } })) refresh(); }}>Cancel run</button>
              {cancel.failure && <FailureState failure={cancel.failure} />}
            </Section>
          )}
        </>
      )}
    </QueryBoundary>
  );
}
