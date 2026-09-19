'use client';
import { useState } from 'react';
import { useQuery, usePagedQuery } from '../shared/api.ts';
import { formatTime, shortId, type Label } from '../shared/state-labels.ts';
import { DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../shared/ui.tsx';

/**
 * M18 Coverage and Failure Center.
 *
 * No percentage appears here without the counts behind it, and the attention
 * figures are deliberately never totalled: they describe overlapping sets, and
 * a single headline number would be the most misleading thing on the page.
 */

const DIMENSION_LABELS: Record<string, string> = {
  INVENTORY_REVIEWED: 'Copies reviewed by a person',
  INVENTORY_OBSERVED: 'Copies with a current observation',
  RETENTION_BASIS: 'Copies with a reviewed retention basis',
  CONTROL_OBSERVATION: 'Control mappings independently confirmed',
  RIGHTS_EXECUTION: 'Privacy requests fully executed',
};
const ATTENTION_LABELS: Record<string, Label> = {
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'Execution failed. No system effect should be assumed.' },
  MANUAL_REQUIRED: { label: 'Needs a person', tone: 'warn', meaning: 'No automated path exists; somebody still has to act.' },
  EFFECT_UNKNOWN: { label: 'Effect unknown', tone: 'unknown', meaning: 'An attempt was made but the result was never confirmed.' },
  PENDING: { label: 'Pending', tone: 'info', meaning: 'Accepted work that has not reached execution yet.' },
  UNVERIFIED: { label: 'Unverified', tone: 'warn', meaning: 'Nothing has independently confirmed the current state.' },
};
const SOURCE_LABELS: Record<string, string> = {
  NO_RETENTION_BASIS: 'No retention basis', NEVER_OBSERVED: 'Never observed', STALE_OBSERVATION: 'Observation is stale',
  UNREVIEWED_INVENTORY: 'Not reviewed', UNRESOLVED_DESTINATION: 'Destination unreachable', FAILED_EXECUTION: 'Execution failed',
};
const SEVERITY_LABELS: Record<string, Label> = {
  LOW: { label: 'Low', tone: 'neutral', meaning: 'Worth recording; not urgent.' },
  MEDIUM: { label: 'Medium', tone: 'info', meaning: 'Should be scheduled.' },
  HIGH: { label: 'High', tone: 'warn', meaning: 'Needs attention soon.' },
  CRITICAL: { label: 'Critical', tone: 'stop', meaning: 'Needs attention now.' },
};
const GAP_STATE_LABELS: Record<string, Label> = {
  OPEN: { label: 'Open', tone: 'warn', meaning: 'Detected and not yet owned by anyone.' },
  IN_PROGRESS: { label: 'In progress', tone: 'info', meaning: 'Assigned to an owner with a deadline.' },
  RESOLVED: { label: 'Resolved', tone: 'ok', meaning: 'Closed with named evidence.' },
  ACCEPTED_RISK: { label: 'Risk accepted', tone: 'neutral', meaning: 'Deliberately not fixed, with a named owner and a recorded reason.' },
};

/** A ratio is always shown with the counts that produced it. */
function Ratio({ numerator, denominator }: { numerator: number; denominator: number }) {
  if (denominator === 0) return <span className="cell-sub">Nothing recorded to measure</span>;
  return (
    <span className="cell-primary">
      {Math.round((numerator / denominator) * 100)}%
      <span className="cell-sub">{numerator} of {denominator}</span>
    </span>
  );
}

export function Coverage() {
  const query = useQuery('coverage');
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Coverage"
        lede="What ORVIA can currently evidence about your recorded estate, and what it cannot. Every figure shows the counts behind it."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="coverage" isEmpty={() => false}>
        {data => (
          <>
            <Section title="What can be evidenced">
              <DataTable
                caption="Coverage by dimension, with the counts behind each figure"
                rows={data.measures}
                rowKey={measure => measure.dimension}
                columns={[
                  { key: 'dimension', header: 'Dimension', cell: measure => DIMENSION_LABELS[measure.dimension] ?? measure.dimension },
                  { key: 'ratio', header: 'Covered', cell: measure => <Ratio numerator={measure.numerator} denominator={measure.denominator} /> },
                  { key: 'counted', header: 'What the denominator counts', cell: measure => measure.counted },
                  { key: 'excluded', header: 'Excluded', cell: measure => measure.excluded === 0
                    ? <span className="cell-sub">None</span>
                    : <span title={measure.exclusion_reasons.join(' ')}>{measure.excluded} — {measure.exclusion_reasons[0]}</span> },
                ]}
              />
            </Section>
            <Section title="What needs attention">
              <NoticeBox tone="warn" title="These counts describe overlapping sets">
                <p>A single record can appear in more than one row below — a copy may be both unverified and awaiting a person. Adding these figures together would over-count, so ORVIA does not present a total.</p>
              </NoticeBox>
              <DataTable
                caption="Attention states, which overlap and are never summed"
                rows={data.attention}
                rowKey={entry => entry.state}
                columns={[
                  { key: 'state', header: 'State', cell: entry => <StateBadge dictionary={ATTENTION_LABELS} value={entry.state} /> },
                  { key: 'count', header: 'Records', cell: entry => String(entry.count) },
                  { key: 'overlaps', header: 'May also be', cell: entry => entry.overlaps_with.length
                    ? entry.overlaps_with.map(state => ATTENTION_LABELS[state]?.label ?? state).join(', ')
                    : <span className="cell-sub">Does not overlap</span> },
                ]}
              />
            </Section>
            <NoticeBox tone="info" title="What these figures can and cannot tell you">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function Gaps() {
  const query = usePagedQuery('list_gaps', { limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Gaps"
        lede="Findings derived from recorded rows, each with an owner, a severity and a deadline once assigned. A gap is closed by evidence, or by an owned and reasoned acceptance of risk."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded gaps" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded gaps, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'source', header: 'Finding', cell: item => (
                  <span className="cell-primary">{SOURCE_LABELS[item.source] ?? item.source}
                    <span className="cell-sub">{item.description}</span>
                  </span>
                ) },
                { key: 'subject', header: 'Subject', cell: item => item.subject_kind === 'DATA_ASSET'
                  ? <a href={`/workspace/inventory/${item.subject_id}`}>{shortId(item.subject_id)}</a>
                  : <a href={`/workspace/rights/${item.subject_id}`}>{shortId(item.subject_id)}</a> },
                { key: 'severity', header: 'Severity', cell: item => <StateBadge dictionary={SEVERITY_LABELS} value={item.severity} /> },
                { key: 'state', header: 'State', cell: item => <StateBadge dictionary={GAP_STATE_LABELS} value={item.state} /> },
                { key: 'owner', header: 'Owner', cell: item => item.owner_reference ?? <span className="cell-sub">Unassigned</span> },
                { key: 'due', header: 'Due', cell: item => item.due_at ? formatTime(item.due_at) : <span className="cell-sub">No deadline</span> },
                { key: 'guidance', header: 'Guidance', cell: item => (
                  <button type="button" onClick={() => setSelected(item.id)}>Suggestions</button>
                ) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      {selected && <GapGuidance id={selected} onClose={() => setSelected(null)} />}
      <NoticeBox tone="info" title="How a gap is detected and how it ends">
        <p>Every gap comes from a recorded row, so a problem in a system nobody declared cannot appear here. An absent gap is not evidence of correctness. Closing one is terminal: if the same finding recurs, ORVIA opens a new gap with its own detection date rather than reopening the old one, so a recurrence stays visible.</p>
      </NoticeBox>
    </>
  );
}

function GapGuidance({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery('gap_guidance', { params: { id } });
  return (
    <Section title="Suggestions" aside={<button type="button" onClick={onClose}>Close</button>}>
      <QueryBoundary query={query} label="guidance" isEmpty={() => false}>
        {data => (
          <>
            <Facts items={[
              { term: 'Matched runbook rule', value: data.matched_rule ?? 'No rule matched' },
              { term: 'Suggestion', value: data.suggestion ?? 'None offered' },
            ]} />
            <NoticeBox tone="unknown" title="This is advice, not a finding">
              <ul>{data.caveats.map(caveat => <li key={caveat}>{caveat}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}
