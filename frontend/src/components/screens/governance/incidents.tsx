'use client';
import { useQuery, usePagedQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';

/**
 * M17 Privacy Incident Explorer.
 *
 * Occurrence, detection and awareness are shown as three separate rows, never
 * as one "when it happened", because duties run from different ones. Every
 * deadline on this screen names the rule it came from — ORVIA has no notion of
 * how long any organisation has.
 */

const STATE_LABELS: Record<string, Label> = {
  OPEN: { label: 'Open', tone: 'stop', meaning: 'Not yet contained.' },
  CONTAINED: { label: 'Contained', tone: 'warn', meaning: 'The immediate exposure was stopped. Obligations may still be outstanding.' },
  CLOSED: { label: 'Closed', tone: 'neutral', meaning: 'Administratively closed after every outstanding notification was resolved.' },
};
const SEVERITY_LABELS: Record<string, Label> = {
  NEGLIGIBLE: { label: 'Negligible', tone: 'neutral', meaning: 'Configured policy: negligible.' },
  LOW: { label: 'Low', tone: 'neutral', meaning: 'Configured policy: low.' },
  MEDIUM: { label: 'Medium', tone: 'info', meaning: 'Configured policy: medium.' },
  HIGH: { label: 'High', tone: 'warn', meaning: 'Configured policy: high.' },
  SEVERE: { label: 'Severe', tone: 'stop', meaning: 'Configured policy: severe.' },
};
const NOTIFICATION_LABELS: Record<string, Label> = {
  NOT_APPLICABLE: { label: 'Not applicable', tone: 'neutral', meaning: 'Reviewed and found not to apply to this incident.' },
  PENDING_REVIEW: { label: 'Needs review', tone: 'warn', meaning: 'Nobody has decided what to do about this duty yet.' },
  DRAFTED: { label: 'Drafted', tone: 'info', meaning: 'A draft exists and has not been approved.' },
  APPROVED: { label: 'Approved', tone: 'info', meaning: 'Approved for dispatch but not yet sent.' },
  DISPATCHED: { label: 'Dispatched', tone: 'ok', meaning: 'Recorded as sent, with named evidence. ORVIA did not send it.' },
  DELIVERY_UNCONFIRMED: { label: 'Delivery unconfirmed', tone: 'unknown', meaning: 'Sent, but receipt was never confirmed.' },
  MANUAL_PACKAGE_REQUIRED: { label: 'Manual package needed', tone: 'warn', meaning: 'No supported channel exists; somebody must submit this by hand.' },
};
const CLOCK_LABELS: Record<string, string> = {
  OCCURRED_AT: 'when it occurred', DETECTED_AT: 'when it was detected', BECAME_AWARE_AT: 'when awareness was established',
};
const FIELD_LABELS: Record<string, string> = {
  OCCURRED_AT: 'Occurrence time', BECAME_AWARE_AT: 'Awareness time', SEVERITY: 'Severity', PRINCIPAL_SCOPE: 'Affected scope',
};

export function Incidents() {
  const query = usePagedQuery('list_incidents', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Incidents"
        title="Privacy incidents"
        lede="When something happened, when it was detected, and when the organisation became aware are three different moments. Duties run from different ones, so they are never merged."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded incidents" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded incidents, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'summary', header: 'Incident', cell: item => (
                  <a className="cell-primary" href={`/workspace/incidents/${item.id}`}>{item.summary}<span className="cell-sub">{shortId(item.id)}</span></a>
                ) },
                { key: 'severity', header: 'Severity', cell: item => <StateBadge dictionary={SEVERITY_LABELS} value={item.severity} /> },
                { key: 'state', header: 'State', cell: item => <StateBadge dictionary={STATE_LABELS} value={item.state} /> },
                { key: 'occurred', header: 'Occurred', cell: item => item.occurred_at
                  ? formatTime(item.occurred_at)
                  : <span className="cell-sub">Not established</span> },
                { key: 'detected', header: 'Detected', cell: item => formatTime(item.detected_at) },
                { key: 'aware', header: 'Became aware', cell: item => item.became_aware_at
                  ? formatTime(item.became_aware_at)
                  : <span className="cell-sub">Not established</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="Where the deadlines on these incidents come from">
        <p>ORVIA ships no notification periods. Every deadline is computed from a rule your organisation recorded and activated, naming its own reviewed source and which of the three moments its clock runs from.</p>
      </NoticeBox>
    </>
  );
}

export function IncidentDetail({ id }: { id: string }) {
  const query = useQuery('incident_assessment', { params: { id } });
  const directory = useDirectory(['systems', 'purposes']);
  return (
    <>
      <PageHead eyebrow="Incidents" title={`Incident ${shortId(id)}`} lede="The three moments, what each duty is owed against, and every correction that moved a deadline." />
      <QueryBoundary query={query} label="this incident" isEmpty={() => false}>
        {data => (
          <>
            <Section title="What happened">
              <Facts items={[
                { term: 'Summary', value: data.incident.summary },
                { term: 'State', value: <StateBadge dictionary={STATE_LABELS} value={data.incident.state} /> },
                { term: 'Severity', value: <StateBadge dictionary={SEVERITY_LABELS} value={data.incident.severity} /> },
                { term: 'Why that severity', value: data.incident.severity_basis },
                { term: 'Affected systems', value: data.incident.affected_system_ids.length
                  ? data.incident.affected_system_ids.map(s => directory.systemName(s)).join(', ') : 'None recorded' },
                { term: 'Affected purposes', value: data.incident.affected_purpose_ids.length
                  ? data.incident.affected_purpose_ids.map(p => directory.purposeName(p)).join(', ') : 'None recorded' },
                { term: 'Who is affected', value: data.incident.principal_scope },
                { term: 'Is that scope certain', value: data.incident.principal_scope_certain ? 'Yes' : 'No — some duties may not apply until it is' },
              ]} />
            </Section>

            <Section title="The three moments">
              <DataTable
                caption="Separately recorded, because different duties run from different ones"
                rows={[
                  { moment: 'Occurred', at: data.incident.occurred_at, note: data.incident.occurrence_basis },
                  { moment: 'Detected', at: data.incident.detected_at, note: 'When the organisation first saw something was wrong.' },
                  { moment: 'Became aware', at: data.incident.became_aware_at, note: 'Awareness in the sense a reviewed rule means. Often later than detection.' },
                ]}
                rowKey={row => row.moment}
                columns={[
                  { key: 'moment', header: 'Moment', cell: row => row.moment },
                  { key: 'at', header: 'When', cell: row => row.at
                    ? formatTime(row.at)
                    : <Badge label="Not established" tone="unknown" meaning="Unknown is a real answer and is not replaced by another moment." /> },
                  { key: 'note', header: 'What it means', cell: row => row.note },
                ]}
              />
            </Section>

            <Section title="What is owed, to whom, and by when">
              {data.obligations.length === 0
                ? <p>No obligation rules are currently activated, so nothing is computed here. That is not a statement that nothing is owed.</p>
                : <DataTable
                  caption="One duty per activated rule, each on its own clock"
                  rows={data.obligations}
                  rowKey={item => item.id}
                  columns={[
                    { key: 'recipient', header: 'Who must be told', cell: item => (
                      <span className="cell-primary">{item.recipient}<span className="cell-sub">{item.regime_reference}</span></span>
                    ) },
                    { key: 'clock', header: 'Clock runs from', cell: item => CLOCK_LABELS[item.runs_from] ?? item.runs_from },
                    { key: 'due', header: 'Due', cell: item => item.due_at
                      ? <span className={item.overdue ? 'cell-primary' : undefined}>{formatTime(item.due_at)}{item.overdue ? ' — overdue' : ''}</span>
                      : <span className="cell-sub">No deadline: its clock has not started</span> },
                    { key: 'state', header: 'State', cell: item => <StateBadge dictionary={NOTIFICATION_LABELS} value={item.state} /> },
                    { key: 'evidence', header: 'Evidence', cell: item => item.dispatch_evidence ?? item.unavailable_reason ?? <span className="cell-sub">—</span> },
                  ]}
                />}
            </Section>

            {data.corrections.length > 0 && (
              <Section title="Corrections">
                <DataTable
                  caption="Appended corrections, each naming the deadlines it moved"
                  rows={data.corrections}
                  rowKey={item => item.id}
                  columns={[
                    { key: 'field', header: 'What changed', cell: item => FIELD_LABELS[item.field] ?? item.field },
                    { key: 'from', header: 'Was', cell: item => item.previous_value ?? <span className="cell-sub">Not established</span> },
                    { key: 'to', header: 'Now', cell: item => item.new_value },
                    { key: 'why', header: 'Why', cell: item => item.reason },
                    { key: 'reviewer', header: 'Reviewer', cell: item => item.reviewer_reference },
                    { key: 'moved', header: 'Deadlines moved', cell: item => item.affected_deadlines.length
                      ? String(item.affected_deadlines.length)
                      : <span className="cell-sub">None</span> },
                  ]}
                />
                <NoticeBox tone="info" title="Why corrections are appended rather than applied">
                  <p>Changing when an incident occurred or when awareness was established can move a legal deadline. Recording the change as an appended correction, with its previous value and the deadlines it moved, means a clock never shifts quietly.</p>
                </NoticeBox>
              </Section>
            )}

            <NoticeBox tone="info" title="What this assessment does and does not claim">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function ObligationRules() {
  const query = usePagedQuery('list_obligation_rules', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Incidents"
        title="Notification rules"
        lede="The duties your organisation has recorded and activated. ORVIA ships none of these: each names its own reviewed source, the moment its clock runs from and how long it allows."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded obligation rules" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded notification rules, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'recipient', header: 'Who must be told', cell: item => item.recipient },
                { key: 'source', header: 'Reviewed source', cell: item => item.regime_reference },
                { key: 'clock', header: 'Clock runs from', cell: item => CLOCK_LABELS[item.runs_from] ?? item.runs_from },
                { key: 'hours', header: 'Allowed', cell: item => `${item.hours} hours` },
                { key: 'severity', header: 'Applies at or above', cell: item => <StateBadge dictionary={SEVERITY_LABELS} value={item.minimum_severity} /> },
                { key: 'uncertain', header: 'Applies while scope uncertain', cell: item => item.applies_when_scope_uncertain ? 'Yes' : 'No' },
                { key: 'active', header: 'Active', cell: item => item.active ? 'Yes' : 'No' },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
