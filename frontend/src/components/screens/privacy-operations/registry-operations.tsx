'use client';
import { useState } from 'react';
import { useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';
import { JOB_STATUS_LABELS } from './operations-labels.ts';

/**
 * Retention and holds, processor engagements and sharing, and estate imports.
 *
 * A retention rule without a sourced period never makes anyone eligible; a hold
 * names its authority and is released once, by somebody other than who placed
 * it. A processor's own statement is never shown as verification.
 */
export function RegistryRetention() {
  const rules = usePagedQuery('list_retention_rules', { limit: 50 });
  const holds = usePagedQuery('list_retention_holds', { limit: 50, query: { active: 'true' } });
  const createRun = useMutation('create_retention_run', true);
  const release = useMutation('release_retention_hold', true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return (
    <>
      <PageHead eyebrow="Registry" title="Retention rules and holds"
        lede="When personal data becomes eligible for erasure, and what stops it. Evaluating a rule produces a dry run that a second person must approve before anything is erased." />
      <Section title="Retention rules">
        <Freshness query={rules} />
        <QueryBoundary query={rules} label="retention rules" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Current retention rules" rows={data.items} rowKey={r => r.id}
                columns={[
                  { key: 'name', header: 'Rule', cell: r => <span className="cell-primary">{r.name}<span className="cell-sub">v{r.version} · {r.trigger.replaceAll('_', ' ').toLowerCase()}</span></span> },
                  { key: 'period', header: 'Period', cell: r => r.duration_days === null ? <Badge label="Not sourced" tone="unknown" meaning="No period is recorded with its source, so nothing becomes eligible under this rule." /> : `${r.duration_days} days` },
                  { key: 'source', header: 'Source', cell: r => r.source_reference ?? '—' },
                  { key: 'action', header: 'Action', cell: r => r.erasure_action.toLowerCase() },
                  { key: 'status', header: 'Status', cell: r => r.status.toLowerCase() },
                  { key: 'run', header: '', cell: r => r.status === 'ACTIVE' ? <button type="button" disabled={createRun.status === 'pending'} onClick={async () => { createRun.newInteraction(); const run = await createRun.run({ retention_rule_id: r.id }); if (run) globalThis.location.assign(`/workspace/operations-runs/${run.id}`); }}>Evaluate</button> : null },
                ]} />
              {createRun.failure && <FailureState failure={createRun.failure} />}
              <Pagination query={rules} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Active holds">
        <Freshness query={holds} />
        <QueryBoundary query={holds} label="active holds" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Holds that stop erasure" rows={data.items} rowKey={h => h.id}
                columns={[
                  { key: 'type', header: 'Hold', cell: h => <span className="cell-primary">{h.hold_type.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{h.authority_reference}</span></span> },
                  { key: 'reason', header: 'Reason', cell: h => h.reason },
                  { key: 'scope', header: 'Covers', cell: h => [h.subject_id && `person ${shortId(h.subject_id)}`, h.activity_id && `activity ${shortId(h.activity_id)}`, h.system_id && `system ${shortId(h.system_id)}`, h.data_category_id && `category ${shortId(h.data_category_id)}`].filter(Boolean).join(', ') || 'Everything in scope' },
                  { key: 'review', header: 'Review', cell: h => <>{formatTime(h.review_at)}{h.review_overdue && <> <Badge label="Review overdue" tone="warn" meaning="The review date has passed." /></>}</> },
                  { key: 'release', header: 'Release (a different person)', cell: h => (
                    <span>
                      <input aria-label="Release reason" value={reasons[h.id] ?? ''} maxLength={500} onChange={event => setReasons({ ...reasons, [h.id]: event.target.value })} />
                      <button type="button" disabled={(reasons[h.id] ?? '').trim().length < 10} onClick={async () => { release.newInteraction(); if (await release.run({ reason: reasons[h.id]! }, { params: { id: h.id } })) holds.refresh(); }}>Release</button>
                    </span>) },
                ]} />
              {release.failure && <FailureState failure={release.failure} />}
              <Pagination query={holds} />
            </>
          )}
        </QueryBoundary>
      </Section>
    </>
  );
}

const DISPOSITION_TEXT: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' | 'unknown' | 'info'; meaning: string }> = {
  NOT_APPLICABLE: { label: 'Not applicable', tone: 'neutral', meaning: 'No disposition is required.' },
  PENDING: { label: 'Pending', tone: 'warn', meaning: 'The processor has not confirmed return or deletion.' },
  PROCESSOR_CONFIRMED: { label: 'Processor says done — not verified', tone: 'warn', meaning: 'The processor’s own statement. It is not verification.' },
  VERIFIED: { label: 'Verified', tone: 'ok', meaning: 'Independent audit evidence or a target check confirmed it.' },
  UNKNOWN: { label: 'Unknown', tone: 'unknown', meaning: 'The outcome is not known.' },
};

export function ProcessorEngagements() {
  const engagements = usePagedQuery('list_processor_engagements', { limit: 50 });
  const sharing = usePagedQuery('list_data_sharing_links', { limit: 50 });
  const directory = useDirectory(['systems']);
  return (
    <>
      <PageHead eyebrow="Registry" title="Processor engagements and data sharing"
        lede="Which processor serves which activities, categories and systems, and who received whose data. Termination closes history; it does not delete it." />
      <Section title="Engagements">
        <Freshness query={engagements} />
        <QueryBoundary query={engagements} label="engagements" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Processor engagements" rows={data.items} rowKey={e => e.id}
                columns={[
                  { key: 'service', header: 'Service', cell: e => <span className="cell-primary">{e.service_description}<span className="cell-sub">processor {shortId(e.processor_id)}{e.subprocessor_of ? ' · sub-processor' : ''}</span></span> },
                  { key: 'period', header: 'Period', cell: e => `${formatTime(e.effective_from)} – ${e.effective_to ? formatTime(e.effective_to) : 'current'}` },
                  { key: 'contract', header: 'Contract evidence', cell: e => e.contract_evidence_reference ?? <Badge label="Missing" tone="warn" meaning="No contract evidence reference is recorded." /> },
                  { key: 'activities', header: 'Activities', cell: e => String(e.activity_ids.length) },
                  { key: 'status', header: 'Status', cell: e => e.status.toLowerCase() },
                  { key: 'disposition', header: 'Return / deletion', cell: e => { const d = DISPOSITION_TEXT[e.disposition_state]!; return <Badge label={d.label} tone={d.tone} meaning={d.meaning} />; } },
                  { key: 'run', header: 'Run', cell: e => e.disposition_run_id ? <a href={`/workspace/operations-runs/${e.disposition_run_id}`}>{shortId(e.disposition_run_id)}</a> : '—' },
                ]} />
              <Pagination query={engagements} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Data-sharing register">
        <QueryBoundary query={sharing} label="sharing register" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Who received what" rows={data.items} rowKey={s => s.id}
                columns={[
                  { key: 'recipient', header: 'Recipient', cell: s => s.engagement_id ? `Engagement ${shortId(s.engagement_id)}` : s.recipient_reference ?? '—' },
                  { key: 'activity', header: 'Activity', cell: s => shortId(s.activity_id) },
                  { key: 'category', header: 'Data category', cell: s => shortId(s.data_category_id) },
                  { key: 'system', header: 'From system', cell: s => s.system_id ? directory.systemName(s.system_id) : '—' },
                  { key: 'period', header: 'Valid', cell: s => `${formatTime(s.valid_from)} – ${s.valid_to ? formatTime(s.valid_to) : 'current'}` },
                  { key: 'evidence', header: 'Evidence', cell: s => s.evidence_reference ?? 'None recorded' },
                ]} />
              <Pagination query={sharing} />
            </>
          )}
        </QueryBoundary>
      </Section>
    </>
  );
}

export function EstateImports() {
  const jobs = usePagedQuery('list_bulk_jobs', { limit: 25 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Registry" title="Existing-data onboarding"
        lede="Imports of an existing estate: people, references, relationship contexts, consent and notice history. Missing history is recorded as missing; nothing is filled in." />
      <NoticeBox tone="info" title="How rows arrive">
        <p>Rows are uploaded in chunks through the API (see the operations runbook), then applied from a checkpoint. A failed row never stops the rest, and replaying errors never re-applies rows that already succeeded.</p>
      </NoticeBox>
      <Freshness query={jobs} />
      <QueryBoundary query={jobs} label="import jobs" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Import jobs" rows={data.items} rowKey={j => j.id}
              columns={[
                { key: 'label', header: 'Source', cell: j => <span className="cell-primary">{j.source_label}<span className="cell-sub">mapping {j.mapping_version}</span></span> },
                { key: 'status', header: 'Status', cell: j => <StateBadge dictionary={JOB_STATUS_LABELS} value={j.status} /> },
                { key: 'counts', header: 'Applied / duplicate / error / pending of received', cell: j => `${j.counts.applied} / ${j.counts.duplicate} / ${j.counts.error} / ${j.counts.pending} of ${j.counts.received}` },
                { key: 'updated', header: 'Updated', cell: j => formatTime(j.updated_at) },
                { key: 'open', header: '', cell: j => <button type="button" onClick={() => setSelected(j.id)}>Open</button> },
              ]} />
            <Pagination query={jobs} />
          </>
        )}
      </QueryBoundary>
      {selected && <EstateImportDetail id={selected} onChanged={() => jobs.refresh()} />}
    </>
  );
}

function EstateImportDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const job = useQuery('bulk_job', { params: { id }, pollWhile: data => data.status === 'PROCESSING' });
  const process = useMutation('process_bulk_job', true);
  const replay = useMutation('replay_bulk_job_errors', true);
  return (
    <QueryBoundary query={job} label="import job" isEmpty={() => false}>
      {data => (
        <Section title={`Import ${shortId(data.id)}`}>
          <Facts items={[{ term: 'Checkpoint', value: data.cursor < 0 ? 'Not started' : `Row ${data.cursor + 1}` }, { term: 'Received', value: String(data.counts.received) },
            { term: 'Applied', value: String(data.counts.applied) }, { term: 'Duplicates', value: String(data.counts.duplicate) }, { term: 'Errors', value: String(data.counts.error) }]} />
          {data.errors.length > 0 && (
            <DataTable caption="Rows that failed (codes only; row content is not echoed)" rows={data.errors} rowKey={e => String(e.ordinal)}
              columns={[{ key: 'row', header: 'Row', cell: e => String(e.ordinal + 1) }, { key: 'code', header: 'Reason', cell: e => e.error_code }]} />
          )}
          <div className="actions">
            {(data.status === 'RECEIVING' || data.status === 'PROCESSING') && <button type="button" disabled={process.status === 'pending'} onClick={async () => { process.newInteraction(); if (await process.run({ limit: 500 }, { params: { id } })) { job.refresh(); onChanged(); } }}>Apply next 500 rows</button>}
            {data.status === 'COMPLETED_WITH_ERRORS' && <button type="button" disabled={replay.status === 'pending'} onClick={async () => { replay.newInteraction(); if (await replay.run(undefined as never, { params: { id } })) { job.refresh(); onChanged(); } }}>Queue failed rows again</button>}
          </div>
          {process.failure && <FailureState failure={process.failure} />}
          {replay.failure && <FailureState failure={replay.failure} />}
        </Section>
      )}
    </QueryBoundary>
  );
}

