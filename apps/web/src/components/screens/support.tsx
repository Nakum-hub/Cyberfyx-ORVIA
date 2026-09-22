'use client';
import { useState } from 'react';
import { useQuery, usePagedQuery } from '../shared/api.ts';
import { formatTime, shortId, type Label } from '../shared/state-labels.ts';
import { Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TechnicalDetails } from '../shared/ui.tsx';

/**
 * M30 Support Bundle System.
 *
 * The one thing this screen must never do is put the vendor's case state and
 * the local control state in the same column. A vendor can close their case
 * while the gap that prompted it is still open, and an interface that collapsed
 * those two into a single tick is how an organisation comes to believe a
 * control it never fixed.
 *
 * Nothing here sends anything. A recorded transfer is an operator saying they
 * carried a payload somewhere, which is a much weaker claim than delivery, and
 * the wording says so rather than implying a transport that does not exist.
 */

const SUBJECT_LABELS: Record<string, string> = {
  INSTALLATION_FAILURE: 'Installation failed', MIGRATION_FAILURE: 'Migration failed',
  POLICY_DECISION_UNAVAILABLE: 'Policy decisions unavailable', CONNECTOR_OBSERVATION_FAILURE: 'Connector could not observe',
  EVIDENCE_EXPORT_FAILURE: 'Evidence export failed', LICENCE_VERIFICATION_FAILURE: 'Licence would not verify',
  UPDATE_FAILURE: 'Update failed', PERFORMANCE_DEGRADATION: 'Performance degraded',
};
const CASE_STATE_LABELS: Record<string, Label> = {
  OPEN: { label: 'Open', tone: 'warn', meaning: 'Recorded locally and not yet carried anywhere.' },
  AWAITING_VENDOR: { label: 'With the vendor', tone: 'info', meaning: 'A payload was carried to the vendor by an operator.' },
  AWAITING_CUSTOMER: { label: 'Back with you', tone: 'warn', meaning: 'The vendor answered. Whatever they said, the local control is a separate question.' },
  CLOSED: { label: 'Closed', tone: 'neutral', meaning: 'The vendor case is finished. This says nothing about the local gap.' },
};
const VENDOR_STATE_LABELS: Record<string, Label> = {
  NOT_SUBMITTED: { label: 'Not submitted', tone: 'neutral', meaning: 'Nothing has been carried to the vendor.' },
  SUBMITTED: { label: 'Submitted', tone: 'info', meaning: 'An operator recorded carrying an approved payload. ORVIA did not send it and did not see it arrive.' },
  VENDOR_RESOLVED: { label: 'Vendor says resolved', tone: 'info', meaning: 'The vendor’s claim about their own case. It is not evidence about your installation.' },
  VENDOR_CLOSED: { label: 'Vendor closed it', tone: 'neutral', meaning: 'The vendor is finished. Your control may or may not be.' },
};
const LOCAL_STATE_LABELS: Record<string, Label> = {
  NO_LINKED_GAP: { label: 'No linked gap', tone: 'unknown', meaning: 'This case is not about a recorded coverage gap, so there is no local control to verify.' },
  GAP_OPEN: { label: 'Gap still open', tone: 'stop', meaning: 'The coverage gap this case is about has not been closed.' },
  GAP_IN_PROGRESS: { label: 'Gap being worked', tone: 'warn', meaning: 'Assigned to an owner with a deadline, and not yet closed.' },
  GAP_RESOLVED: { label: 'Gap resolved', tone: 'ok', meaning: 'Closed with named evidence. This, and only this, verifies the local control.' },
  GAP_RISK_ACCEPTED: { label: 'Risk accepted', tone: 'neutral', meaning: 'Somebody decided not to fix it. A decision is not a verification.' },
};

export function SupportCases() {
  const query = usePagedQuery('list_support_cases', { limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Support cases"
        lede="Failures recorded locally, each optionally linked to the coverage gap it is about. A diagnostic report is generated from a fixed vocabulary, approved against one exact payload, and carried by a person — this product has no support transport."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded support cases" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded support cases, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'subject', header: 'What failed', cell: item => (
                  <span className="cell-primary">{SUBJECT_LABELS[item.subject] ?? item.subject}
                    <span className="cell-sub">{shortId(item.id)}</span>
                  </span>
                ) },
                { key: 'state', header: 'Case state', cell: item => <StateBadge dictionary={CASE_STATE_LABELS} value={item.state} /> },
                { key: 'gap', header: 'Local gap', cell: item => item.gap_id
                  ? <a href="/workspace/gaps">{shortId(item.gap_id)}</a>
                  : <span className="cell-sub">Not linked to a gap</span> },
                { key: 'vendor', header: 'Vendor reference', cell: item => item.vendor_case_reference ?? <span className="cell-sub">None recorded</span> },
                { key: 'opened', header: 'Opened', cell: item => formatTime(item.opened_at) },
                { key: 'standing', header: 'What is established', cell: item => (
                  <button type="button" onClick={() => setSelected(item.id)}>Open</button>
                ) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      {selected && <Standing id={selected} onClose={() => setSelected(null)} />}
      <NoticeBox tone="info" title="What a diagnostic report is able to say">
        <p>Every field of a report is a code, a count, a timestamp, a version or a digest. There is no field in which a log line, an error message, a query or a reference to a person could be written, so minimisation here is a property of the schema rather than a promise about behaviour. The installation is named only by a one-way digest, which lets a vendor correlate two reports without learning which installation they came from.</p>
      </NoticeBox>
    </>
  );
}

function Standing({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery('support_case', { params: { id } });
  return (
    <Section title="What is actually established" aside={<button type="button" onClick={onClose}>Close</button>}>
      <QueryBoundary query={query} label="support case standing" isEmpty={() => false}>
        {data => (
          <>
            <DataTable
              caption="The vendor's case and your control, reported as two separate facts"
              rows={[
                { fact: 'vendor', label: 'The vendor’s case', value: <StateBadge dictionary={VENDOR_STATE_LABELS} value={data.vendor_case_state} /> },
                { fact: 'local', label: 'Your control', value: <StateBadge dictionary={LOCAL_STATE_LABELS} value={data.local_control_state} /> },
                { fact: 'verified', label: 'Verified locally', value: data.local_control_verified
                  ? <Badge label="Yes" tone="ok" meaning="The linked gap was closed with named evidence." />
                  : <Badge label="No" tone="unknown" meaning="Nothing has independently confirmed the control. Only a resolved gap does that." /> },
              ]}
              rowKey={row => row.fact}
              columns={[
                { key: 'label', header: 'Fact', cell: row => row.label },
                { key: 'value', header: 'Recorded', cell: row => row.value },
              ]}
            />
            {data.vendor_case_state === 'VENDOR_CLOSED' && !data.local_control_verified && (
              <NoticeBox tone="stop" title="The vendor has closed their case and your control is not verified">
                <p>Closing a vendor case is the vendor finishing their work. It establishes nothing about this installation. The local control is verified when the coverage gap it is about is resolved with recorded evidence, and by nothing else.</p>
              </NoticeBox>
            )}
            <Section title="Diagnostic drafts">
              {data.drafts.length === 0
                ? <p className="cell-sub">No report has been generated for this case.</p>
                : (
                  <DataTable
                    caption="Generated drafts, oldest first. A newer draft supersedes the one before it."
                    rows={data.drafts}
                    rowKey={draft => draft.id}
                    columns={[
                      { key: 'generated', header: 'Generated', cell: draft => formatTime(draft.generated_at) },
                      { key: 'digest', header: 'Payload digest', cell: draft => <code>{draft.payload_digest.slice(0, 12)}</code> },
                      { key: 'observations', header: 'Observations', cell: draft => String(draft.report.observations.length) },
                      { key: 'scan', header: 'Forbidden content', cell: draft => (
                        <span className="cell-primary">None found
                          <span className="cell-sub">{draft.forbidden_content_scan.canaries_checked} canaries checked</span>
                        </span>
                      ) },
                      { key: 'superseded', header: 'Current', cell: draft => draft.superseded
                        ? <Badge label="Superseded" tone="neutral" meaning="A newer draft exists. An approval that named this payload cannot transfer the newer one." />
                        : <Badge label="Current" tone="ok" /> },
                    ]}
                  />
                )}
              {data.drafts.some(draft => draft.superseded) && (
                <NoticeBox tone="info" title="Why superseded drafts are still listed">
                  <p>A draft is never edited or deleted. If a report is regenerated the previous one is marked superseded and kept, so an approval that named it is provably an approval of that payload and not of whatever exists now.</p>
                </NoticeBox>
              )}
              {data.drafts.length > 0 && (
                <TechnicalDetails
                  summary="The exact contents of the most recent draft"
                  items={Object.entries(data.drafts[data.drafts.length - 1]!.report)
                    .filter(([, value]) => typeof value !== 'object')
                    .map(([term, value]) => ({ term, value: String(value) }))}
                />
              )}
            </Section>
            <Facts items={[
              { term: 'Case opened', value: formatTime(data.support_case.opened_at) },
              { term: 'Vendor reference', value: data.support_case.vendor_case_reference ?? 'None recorded' },
              { term: 'Vendor resolution closes local gaps', value: data.vendor_resolution_closes_local_gaps ? 'Yes' : 'No — never' },
            ]} />
            <NoticeBox tone="info" title="What this standing does and does not mean">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

export function SupportCanaries() {
  const query = usePagedQuery('list_canaries', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Assurance"
        title="Forbidden content canaries"
        lede="Strings that must never leave this installation. Every diagnostic report is scanned for them before it is stored, and a match refuses the generation rather than quietly redacting it."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="registered canaries" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Registered canaries, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'note', header: 'What it is', cell: item => item.note },
                { key: 'digest', header: 'Token digest', cell: item => <code>{item.token_digest.slice(0, 12)}</code> },
                { key: 'registered', header: 'Registered', cell: item => formatTime(item.registered_at) },
                { key: 'by', header: 'By', cell: item => shortId(item.registered_by) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="Why this exists when the schema should already make it unnecessary">
        <p>A diagnostic report has no field a canary string could occupy, so in principle the scan can never fire. The schema is a statement about today; the scan is a statement about every change made to it afterwards. The token itself is never returned by this interface — only the digest of it, so the page that checks for a secret does not become a place to read one.</p>
      </NoticeBox>
    </>
  );
}
