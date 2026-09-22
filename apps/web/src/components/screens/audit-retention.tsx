'use client';
import { useState } from 'react';
import { useQuery, useMutation } from '../shared/api.ts';
import { formatTime, shortId, type Label } from '../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, QueryBoundary, Section, StateBadge } from '../shared/ui.tsx';

/**
 * M33 Audit Administration — purpose-based retention (FR-M33-04).
 *
 * There is no purge button on this page and there will not be one. The audit
 * trail is append-only against every role including the migrator, so a period
 * elapsing is a thing to know about, not authority to shorten the record. The
 * page reports what is past its period and stops there.
 *
 * Nor is there a default period anywhere. A purpose nobody has configured is
 * shown as having no period, which is deliberately not the same as being kept
 * forever by choice — the first is an omission somebody should fix, the second
 * is a decision somebody made, and a reader who cannot tell them apart has been
 * told something false.
 */

const PURPOSE_LABELS: Record<string, string> = {
  SECURITY_INVESTIGATION: 'Investigating a security incident',
  REGULATORY_ACCOUNTABILITY: 'Demonstrating regulatory accountability',
  COMMERCIAL_OBLIGATION: 'Meeting a commercial obligation',
  CHANGE_TRACEABILITY: 'Tracing what changed and when',
};
const PERIOD_LABELS: Record<string, Label> = {
  CONFIGURED: { label: 'Period set', tone: 'ok', meaning: 'Somebody recorded how long records kept for this purpose are held, and what that period rests on.' },
  NONE: { label: 'No period set', tone: 'warn', meaning: 'Nobody has recorded how long these are kept. This is an omission to fix, not a decision to keep them indefinitely.' },
};

function SetPeriod({ purpose, onSaved }: { purpose: string; onSaved: () => void }) {
  const mutation = useMutation('set_audit_retention', true);
  const [days, setDays] = useState('365');
  const [source, setSource] = useState('');
  return (
    <form
      className="inline-form"
      onSubmit={async event => {
        event.preventDefault();
        if (await mutation.run({ purpose: purpose as 'SECURITY_INVESTIGATION', days: Number(days), source_reference: source })) onSaved();
      }}
    >
      <label>
        <span>Days</span>
        <input type="number" min={1} max={3650} value={days} onChange={event => setDays(event.target.value)} required />
      </label>
      <label>
        <span>What this period rests on</span>
        <input value={source} onChange={event => setSource(event.target.value)} required minLength={10}
          placeholder="No period ships with this product; say where yours comes from" />
      </label>
      <button type="submit" disabled={mutation.status === 'pending' || source.length < 10}>Record this period</button>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

export function AuditRetentionScreen() {
  const query = useQuery('audit_retention');
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Audit retention"
        lede="How long the audit trail is kept, and why. Nothing on this page deletes anything: the trail is append-only against every role, so a period elapsing is reported rather than acted on."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="audit retention" isEmpty={() => false}>
        {data => (
          <>
            <NoticeBox tone="info" title="There is no payload to minimise away">
              <p>
                An audit record here is an envelope: who did what, to which resource, under which request, and when.
                It has no payload column, so there is nothing to delete and no justified payload deletion an envelope
                would have to survive. This page checked that when it loaded and found {data.payload_columns_found} payload
                columns on the audit table — if one were ever added, this page would refuse to render rather than keep
                describing a trail that had started carrying content it says it does not.
              </p>
            </NoticeBox>

            <Section title="What is kept, and for what purpose">
              <DataTable
                caption="Each audited category is retained under exactly one stated purpose"
                rows={data.lines}
                rowKey={item => item.purpose}
                columns={[
                  { key: 'purpose', header: 'Purpose', cell: item => (
                    <span className="cell-primary">{PURPOSE_LABELS[item.purpose] ?? item.purpose}
                      <span className="cell-sub">{item.categories.map(c => c.replaceAll('_', ' ').toLowerCase()).join(', ')}</span>
                    </span>
                  ) },
                  { key: 'period', header: 'Period', cell: item => item.rule
                    ? <span className="cell-primary"><StateBadge dictionary={PERIOD_LABELS} value="CONFIGURED" />
                      <span className="cell-sub">{item.rule.days} days</span>
                    </span>
                    : <StateBadge dictionary={PERIOD_LABELS} value="NONE" /> },
                  { key: 'basis', header: 'What the period rests on', cell: item => item.rule
                    ? <span className="cell-primary">{item.rule.source_reference}
                      <span className="cell-sub">recorded {formatTime(item.rule.recorded_at)} by {shortId(item.rule.recorded_by)}</span>
                    </span>
                    : <span className="cell-sub">No period has been recorded, so nothing rests on anything yet.</span> },
                  { key: 'held', header: 'Records held', cell: item => (
                    <span className="cell-primary">{item.events_held}
                      <span className="cell-sub">{item.oldest_event_at ? `oldest ${formatTime(item.oldest_event_at)}` : 'none recorded yet'}</span>
                    </span>
                  ) },
                  { key: 'beyond', header: 'Past their period', cell: item => item.rule
                    ? <span className="cell-primary">{item.beyond_period}
                      <span className="cell-sub">reported, not deleted</span>
                    </span>
                    : <Badge label="Not applicable" tone="neutral" meaning="Nothing can be past a period that was never set. This is not a statement that everything is within its period." /> },
                  { key: 'set', header: '', cell: item => <SetPeriod purpose={item.purpose} onSaved={query.refresh} /> },
                ]}
              />
            </Section>

            {data.snapshots_covering_evidence > 0 && (
              <NoticeBox tone="warn" title="Copies exist that nothing here reaches">
                <p>
                  {data.snapshots_covering_evidence} declared backup snapshot(s) cover the audit trail. Those archives are
                  yours, held under your own key and outside this product entirely. Nothing described on this page reaches
                  a copy inside one, and this product cannot tell you what any of them still contains.
                </p>
              </NoticeBox>
            )}

            <NoticeBox tone="info" title="What this page can and cannot tell you">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
            <p className="cell-sub">Evaluated {formatTime(data.as_of)} on profile {data.profile}.</p>
          </>
        )}
      </QueryBoundary>
    </>
  );
}
