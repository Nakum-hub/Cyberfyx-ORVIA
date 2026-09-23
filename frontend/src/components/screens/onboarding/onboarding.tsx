'use client';
import { useQuery, usePagedQuery } from '../../shared/api.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';

/**
 * M29 Customer Onboarding — the nine-step guided connection.
 *
 * The page will not show a progress bar that can be dragged, a "mark complete"
 * control, or a single percentage. Every step says what its answer was measured
 * from, and five of the nine are measured from records kept elsewhere, so a step
 * that was done stops being done when the evidence behind it is withdrawn. A
 * number nobody can trace back to a record is worse than no number.
 *
 * And the two facts that must never merge into one are two separate rows:
 * what the connection asked for, and what a real check observed. A connection
 * that works is not a connection that may change anything.
 */

const STEP_LABELS: Record<string, string> = {
  SELECT_SYSTEM: 'Select system and environment',
  CHOOSE_CAPABILITIES: 'Choose required capabilities',
  CONFIGURE_CONNECTIVITY: 'Configure local connectivity',
  SCOPED_IDENTITY: 'Supply a scoped service identity',
  TEST_PERMISSIONS: 'Test permissions',
  SELECT_RESOURCES: 'Select resources',
  REVIEW_MAPPINGS: 'Review mappings',
  PREVIEW_AND_TEST: 'Preview and test',
  ENABLE_PROGRESSIVELY: 'Enable progressively',
};
const STAGE_LABELS: Record<string, Label> = {
  OBSERVE: { label: 'Observe', tone: 'neutral', meaning: 'Reading only. Nothing in the connected system is changed from here.' },
  COORDINATE: { label: 'Coordinate', tone: 'info', meaning: 'Work is planned and recorded against this system, still without changing it.' },
  ENFORCE: { label: 'Approved enforcement', tone: 'warn', meaning: 'Approved supported changes may be carried out. This required a check that found the system able to restrict.' },
};
const KIND_LABELS: Record<string, Label> = {
  TEST: { label: 'Test', tone: 'info', meaning: 'Marked as a test environment by the person who started this connection.' },
  PRODUCTION: { label: 'Production', tone: 'warn', meaning: 'Marked as production. This was stated, never assumed from an omission.' },
};

/** Unknown is its own answer. Not looked at is not the same as looked at and denied. */
function Observed({ value, what }: { value: boolean | null; what: string }) {
  if (value === null) return <Badge label="Not checked" tone="unknown" meaning={`No capability check has been recorded, so whether this system can ${what} is unknown rather than denied.`} />;
  return <Badge label={value ? 'Allowed' : 'Denied'} tone={value ? 'ok' : 'stop'} meaning={`A recorded check observed that this system ${value ? 'can' : 'cannot'} ${what}.`} />;
}

export function ConnectionsScreen() {
  const query = usePagedQuery('list_connections', { limit: 25 });
  return (
    <>
      <PageHead
        eyebrow="Installation"
        title="Guided connections"
        lede="Each connection runs the same nine steps here in your own workspace, never on a vendor site. A connection that works is not a connection that may change anything: those are two columns and they never merge."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="guided connections" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Guided connections and the step each is on"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'system', header: 'System', cell: item => (
                  <span className="cell-primary">{shortId(item.system_id)}
                    <span className="cell-sub"><StateBadge dictionary={KIND_LABELS} value={item.environment_kind} /></span>
                  </span>
                ) },
                { key: 'step', header: 'Current step', cell: item => item.current_step
                  ? <span className="cell-primary">{STEP_LABELS[item.current_step] ?? item.current_step}
                    <span className="cell-sub">step {item.steps.find(s => s.step === item.current_step)!.position} of 9</span>
                  </span>
                  : <span className="cell-primary">All nine done<span className="cell-sub">nothing outstanding</span></span> },
                { key: 'done', header: 'Steps done', cell: item => `${item.steps.filter(s => s.done).length} of 9` },
                { key: 'stage', header: 'Enablement', cell: item => <StateBadge dictionary={STAGE_LABELS} value={item.enablement_stage} /> },
                { key: 'restrict', header: 'Observed able to restrict', cell: item => <Observed value={item.observed_restrict} what="restrict a record" /> },
                { key: 'open', header: '', cell: item => <a href={`/workspace/connections/${item.id}`}>Open</a> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="Connected is not the same as safe to change">
        <p>A connection begins in observation and climbs one rung at a time. Approved enforcement is a separate authority and is refused outright for a system no recorded check found able to restrict — not warned about, refused.</p>
      </NoticeBox>
    </>
  );
}

export function ConnectionDetail({ id }: { id: string }) {
  const query = useQuery('connection', { params: { id } });
  return (
    <>
      <PageHead
        eyebrow="Installation"
        title="Guided connection"
        lede="Every step says what its answer was measured from. Five of the nine are read from records kept elsewhere, so a step stops being done if the evidence behind it is withdrawn."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="this connection" isEmpty={() => false}>
        {data => (
          <>
            <Section title="What this connection is">
              <DataTable
                caption="What was requested, and what a check actually observed"
                rows={[
                  { k: 'System', v: <>{shortId(data.system_id)} · <StateBadge dictionary={KIND_LABELS} value={data.environment_kind} /></> },
                  { k: 'Capabilities requested', v: <code>{data.requested_capabilities.join(', ')}</code> },
                  { k: 'Observed able to read', v: <Observed value={data.observed_read} what="be read" /> },
                  { k: 'Observed able to restrict', v: <Observed value={data.observed_restrict} what="restrict a record" /> },
                  { k: 'Endpoint', v: data.endpoint_reference
                    ? <>{data.endpoint_reference} · {data.tls_verified
                      ? <Badge label="Certificate verified" tone="ok" />
                      : <Badge label="Certificate not verified" tone="stop" meaning="Verification is not switched off to let the step pass." />}</>
                    : <span className="cell-sub">Not recorded</span> },
                  { k: 'Service identity', v: data.secret_reference
                    ? <><code>{data.secret_reference}</code> <span className="cell-sub">a reference to a secret the customer holds; the secret is not in this product</span></>
                    : <span className="cell-sub">Not recorded</span> },
                  { k: 'Enablement', v: <StateBadge dictionary={STAGE_LABELS} value={data.enablement_stage} /> },
                  { k: 'Started', v: formatTime(data.started_at) },
                ]}
                rowKey={row => row.k}
                columns={[
                  { key: 'k', header: 'Fact', cell: row => row.k },
                  { key: 'v', header: 'Value', cell: row => row.v },
                ]}
              />
            </Section>
            <DataTable
              caption="The nine steps, each with what its answer was measured from"
              rows={data.steps}
              rowKey={step => step.step}
              columns={[
                { key: 'n', header: '', cell: step => step.position },
                { key: 'step', header: 'Step', cell: step => STEP_LABELS[step.step] ?? step.step },
                { key: 'state', header: 'State', cell: step => step.done
                  ? <Badge label="Done" tone="ok" meaning="Measured from the record named beside it, not from anybody marking it complete." />
                  : <Badge label="Outstanding" tone="unknown" meaning="Nothing has been recorded that would answer this step yet." /> },
                { key: 'measured', header: 'Measured from', cell: step => step.measured_from },
                { key: 'outstanding', header: 'What is left', cell: step => step.outstanding.length
                  ? <ul>{step.outstanding.map(item => <li key={item}>{item}</li>)}</ul>
                  : <span className="cell-sub">Nothing</span> },
              ]}
            />
            <NoticeBox tone="warn" title="This connection is not permission to change anything">
              <p>Finishing all nine steps connects a system and records what it can be observed to do. Carrying out an approved supported change is a separate authority, and later changes to scope or credentials require the checks to be run again.</p>
            </NoticeBox>
            <NoticeBox tone="info" title="What this page can and cannot tell you">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
