'use client';
import { useQuery } from '../shared/api.ts';
import { formatTime, type Label } from '../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, QueryBoundary, Section, StateBadge } from '../shared/ui.tsx';

/**
 * M32 Monitoring.
 *
 * There is no green light on this page, and adding one would be the change that
 * made it useless. Liveness, dependency readiness and business readiness are
 * three rows with three verdicts, because the failure worth catching is an
 * installation that answers every probe while being unable to carry out a
 * single privacy decision.
 *
 * Two of the seven signals cannot be measured by this build. They are shown as
 * not measured, with the reason, rather than as zero — a reader who cannot tell
 * those apart has been told something false.
 */

const KIND_LABELS: Record<string, string> = {
  LIVENESS: 'Is the process running?',
  DEPENDENCY_READINESS: 'Can it reach what it needs?',
  BUSINESS_READINESS: 'Can it actually carry out a privacy decision?',
};
const VERDICT_LABELS: Record<string, Label> = {
  READY: { label: 'Yes', tone: 'ok', meaning: 'Established for this question only. It says nothing about the other two.' },
  NOT_READY: { label: 'No', tone: 'stop', meaning: 'Something is blocking it, and what is blocking it is named.' },
  NOT_ASSESSABLE: { label: 'Cannot tell', tone: 'unknown', meaning: 'This question could not be answered either way, which is not the same as a no.' },
};
const SIGNAL_LABELS: Record<string, string> = {
  PROPAGATION_LAG: 'Worst propagation delay',
  OLDEST_UNRESOLVED_WORK: 'Oldest unresolved work',
  OBSERVATION_FRESHNESS: 'Age of the newest observation',
  QUEUE_DEPTH: 'Undispatched events',
  CONNECTOR_LIMIT_HEADROOM: 'Connector limit headroom',
  STORAGE_FOOTPRINT: 'Database size',
  BACKUP_STATUS: 'Backup status',
};

/** A duration nobody has to convert in their head, and a byte count likewise. */
function reading({ value, unit }: { value: number | null; unit: string | null }) {
  if (value === null || unit === null) return null;
  if (unit === 'RECORDS') return `${value}`;
  if (unit === 'BYTES') {
    if (value < 1024) return `${value} B`;
    if (value < 1024 ** 2) return `${Math.round(value / 1024)} KB`;
    if (value < 1024 ** 3) return `${Math.round(value / 1024 ** 2)} MB`;
    return `${(value / 1024 ** 3).toFixed(1)} GB`;
  }
  if (value < 60) return `${value}s`;
  if (value < 3600) return `${Math.round(value / 60)} min`;
  if (value < 86_400) return `${Math.round(value / 3600)} h`;
  return `${Math.round(value / 86_400)} days`;
}

export function Readiness() {
  const query = useQuery('operational_readiness');
  return (
    <>
      <PageHead
        eyebrow="Installation"
        title="Operational readiness"
        lede="Three separate questions with three separate answers, and the signals behind them. There is deliberately no single status here: a process that answers every probe can still be unable to carry out one privacy decision."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="operational readiness" isEmpty={() => false}>
        {data => {
          const business = data.facts.find(fact => fact.kind === 'BUSINESS_READINESS')!;
          const live = data.facts.find(fact => fact.kind === 'LIVENESS')!;
          return (
            <>
              {live.verdict === 'READY' && business.verdict === 'NOT_READY' && (
                <NoticeBox tone="stop" title="This installation is running and cannot carry out a privacy decision">
                  <p>Every probe an uptime monitor would make is passing. That is exactly the condition this page exists to make visible, because nothing else on the system would report it.</p>
                </NoticeBox>
              )}
              <Section title="The three questions">
                <DataTable
                  caption="Readiness, reported as three separate facts that are never combined"
                  rows={data.facts}
                  rowKey={fact => fact.kind}
                  columns={[
                    { key: 'kind', header: 'Question', cell: fact => KIND_LABELS[fact.kind] ?? fact.kind },
                    { key: 'verdict', header: 'Answer', cell: fact => <StateBadge dictionary={VERDICT_LABELS} value={fact.verdict} /> },
                    { key: 'covers', header: 'What this answer covers', cell: fact => fact.covers },
                    { key: 'blocking', header: 'What is blocking it', cell: fact => fact.blocking.length
                      ? <ul>{fact.blocking.map(reason => <li key={reason}>{reason}</li>)}</ul>
                      : <span className="cell-sub">Nothing</span> },
                  ]}
                />
              </Section>
              <Section title="Signals">
                <DataTable
                  caption="The seven signals, each with what it counted and whether it could be measured at all"
                  rows={data.signals}
                  rowKey={signal => signal.signal}
                  columns={[
                    { key: 'signal', header: 'Signal', cell: signal => SIGNAL_LABELS[signal.signal] ?? signal.signal },
                    { key: 'value', header: 'Reading', cell: signal => signal.measured
                      ? <span className="cell-primary">{reading(signal)}</span>
                      : <Badge label="Not measured" tone="unknown" meaning="This was not measured. It is not a reading of zero." /> },
                    { key: 'counted', header: 'What it counted', cell: signal => signal.measured
                      ? signal.counted
                      : <span className="cell-primary">{signal.counted}<span className="cell-sub">{signal.unavailable_reason}</span></span> },
                  ]}
                />
                {data.signals.some(signal => !signal.measured) && (
                  <NoticeBox tone="warn" title="Some signals were not measured">
                    <p>Two of the signals this report is required to carry cannot be produced by this build: there is no connector load budget to have headroom against, and there is no backup capability whose status could be reported. They are shown as not measured rather than as zero, because a reader who cannot tell those apart has been told something false.</p>
                  </NoticeBox>
                )}
              </Section>
              <NoticeBox tone="info" title="What this page can and cannot tell you">
                <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
              </NoticeBox>
              <p className="cell-sub">Evaluated {formatTime(data.as_of)} on profile {data.profile}.</p>
            </>
          );
        }}
      </QueryBoundary>
    </>
  );
}
