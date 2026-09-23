'use client';
import { useState } from 'react';
import { useMutation, useQuery, usePagedQuery } from '../../shared/api.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TechnicalDetails } from '../../shared/ui.tsx';

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
/**
 * Generating a draft. Deliberately the whole of what this control does: it
 * produces a report and stores it, and it cannot approve or carry anything.
 * A newer draft supersedes the one before it, which is why the button says so
 * rather than reading as a harmless refresh.
 */
function GenerateDraft({ caseId, hasDrafts, onDone }: { caseId: string; hasDrafts: boolean; onDone: () => void }) {
  const mutation = useMutation('generate_diagnostic', true);
  return (
    <>
      <button type="button" disabled={mutation.status === 'pending'}
        onClick={async () => { if (await mutation.run(undefined, { params: { id: caseId } })) onDone(); }}>
        {hasDrafts ? 'Generate a new draft, superseding the current one' : 'Generate a diagnostic draft'}
      </button>
      <p className="cell-sub">
        The report is built from fixed fields only and scanned for forbidden content before it is stored.
        Generating one sends nothing and approves nothing.
      </p>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </>
  );
}

/**
 * Approval binds one exact payload. The digest is shown and submitted rather
 * than typed, because an approval that named a payload the approver had not
 * actually previewed would be the failure this whole flow exists to prevent.
 */
function ApproveDraft({ draftId, digest, superseded, onDone }: {
  draftId: string; digest: string; superseded: boolean;
  onDone: (approval: { id: string; approved_digest: string }) => void;
}) {
  const mutation = useMutation('approve_diagnostic', true);
  const [retention, setRetention] = useState('30');
  if (superseded) {
    return <p className="cell-sub">A newer draft exists. Approving this one would approve a payload that is no longer current.</p>;
  }
  return (
    <form className="inline-form" onSubmit={async event => {
      event.preventDefault();
      const approved = await mutation.run({
        approved_digest: digest, destination: 'MANUAL_OFFLINE_TRANSFER',
        purpose: 'DIAGNOSE_REPORTED_FAILURE', retention_days: Number(retention),
      }, { params: { id: draftId } });
      if (approved) onDone(approved);
    }}>
      <label><span>How long the vendor may keep it (days)</span>
        <input type="number" min={1} max={365} value={retention} onChange={e => setRetention(e.target.value)} required /></label>
      <button type="submit" disabled={mutation.status === 'pending'}>
        Approve this exact payload for offline transfer
      </button>
      <p className="cell-sub">
        You are approving payload <code>{digest.slice(0, 12)}</code> and nothing else. An approval carries no
        authority to generate a newer report, and it does not send anything.
      </p>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

/**
 * Recording that an operator carried the payload. The wording is the point: a
 * transfer here is an attestation by a person, not an observed delivery, and
 * this product neither sent it nor saw it arrive.
 */
function RecordTransfer({ approvalId, onDone }: { approvalId: string; onDone: () => void }) {
  const mutation = useMutation('record_transfer', true);
  const [outcome, setOutcome] = useState<'ACCEPTED' | 'REJECTED' | 'NOT_ATTEMPTED'>('ACCEPTED');
  const [evidence, setEvidence] = useState('');
  const [rejection, setRejection] = useState('');
  const [note, setNote] = useState('');
  return (
    <form className="inline-form" onSubmit={async event => {
      event.preventDefault();
      const done = await mutation.run({
        method: 'MANUAL_OFFLINE_TRANSFER', outcome,
        rejection_code: outcome === 'REJECTED' ? rejection : null,
        evidence_reference: outcome === 'ACCEPTED' ? evidence : null,
        note,
      }, { params: { id: approvalId } });
      if (done) onDone();
    }}>
      <label><span>What happened when you carried it</span>
        <select value={outcome} onChange={e => setOutcome(e.target.value as typeof outcome)}>
          <option value="ACCEPTED">The vendor accepted it</option>
          <option value="REJECTED">The vendor rejected it</option>
          <option value="NOT_ATTEMPTED">I did not attempt it</option>
        </select></label>
      {outcome === 'ACCEPTED' && (
        <label><span>Their reference for it</span>
          <input value={evidence} onChange={e => setEvidence(e.target.value)} required
            placeholder="A receipt or case reference you were given" /></label>
      )}
      {outcome === 'REJECTED' && (
        <label><span>Why they rejected it</span>
          <input value={rejection} onChange={e => setRejection(e.target.value)} required /></label>
      )}
      <label><span>Note</span>
        <input value={note} onChange={e => setNote(e.target.value)} required
          placeholder="How you carried it" /></label>
      <button type="submit" disabled={mutation.status === 'pending'}>Record what I did</button>
      <p className="cell-sub">
        This records that you carried the payload. ORVIA has no support transport: it did not send this and
        did not observe it arrive.
      </p>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

  const query = useQuery('support_case', { params: { id } });
  // Held here rather than read back, because the standing report lists drafts
  // and not approvals: the approval id only exists in the response that created
  // it, and the transfer has to name that exact approval.
  const [approval, setApproval] = useState<{ id: string; approved_digest: string } | null>(null);
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
              <GenerateDraft caseId={id} hasDrafts={data.drafts.length > 0} onDone={query.refresh} />
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
                      { key: 'approve', header: '', cell: draft => (
                        <ApproveDraft draftId={draft.id} digest={draft.payload_digest} superseded={draft.superseded}
                          onDone={approval => { setApproval(approval); query.refresh(); }} />
                      ) },
                    ]}
                  />
                )}
              {approval && (
                <Section title="Record how you carried it">
                  <p className="cell-sub">
                    Approved payload <code>{approval.approved_digest.slice(0, 12)}</code>. ORVIA has not sent it and
                    cannot: recording a transfer is you saying what you did with it.
                  </p>
                  <RecordTransfer approvalId={approval.id} onDone={() => { setApproval(null); query.refresh(); }} />
                </Section>
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
