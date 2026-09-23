'use client';
import type { schemas } from '@orvia/contracts';
import { REQUEST_TRANSITIONS } from '@orvia/contracts';
import { usePagedQuery, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TechnicalDetails } from '../../shared/ui.tsx';

type RightsRequest = ReturnType<typeof schemas.RightsRequest.parse>;

/**
 * M14 Rights Management.
 *
 * The lifecycle state is shown next to five independent dimensions rather than
 * on its own, because the whole point of the module is that "closed" is not the
 * same as "erased everywhere". Each dimension carries its own words and its own
 * meaning on hover; no dimension is summed into a single reassuring score.
 */

const STATE_LABELS: Record<string, Label> = {
  RECEIVED: { label: 'Received', tone: 'info', meaning: 'Recorded. Nothing has been verified or acted on yet.' },
  PENDING_VERIFICATION: { label: 'Awaiting verification', tone: 'warn', meaning: 'The requester’s identity or authority is still being established.' },
  VERIFIED: { label: 'Verified', tone: 'ok', meaning: 'Identity and authority were established. No work has been scoped yet.' },
  SCOPING: { label: 'Scoping', tone: 'info', meaning: 'Determining which systems, copies and constraints apply.' },
  AWAITING_APPROVAL: { label: 'Awaiting approval', tone: 'warn', meaning: 'A reviewable plan exists and is waiting for approval of that exact scope.' },
  EXECUTING: { label: 'Executing', tone: 'info', meaning: 'Approved actions are running.' },
  PARTIALLY_COMPLETED: { label: 'Partly done', tone: 'warn', meaning: 'Some planned actions succeeded and others did not. This is not completion.' },
  COMPLETED: { label: 'Completed', tone: 'ok', meaning: 'Every planned action completed and no destination was left unresolved.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'Execution failed. Nothing here implies the data was reached.' },
  ESCALATED: { label: 'Escalated', tone: 'warn', meaning: 'Raised for a decision a reviewer must make.' },
  REJECTED: { label: 'Rejected', tone: 'stop', meaning: 'The request was refused, with its reason recorded.' },
  CLOSED: { label: 'Closed', tone: 'neutral', meaning: 'Administratively closed. This says nothing about whether every system was reached.' },
};
const IDENTITY_LABELS: Record<string, Label> = {
  NOT_ASSESSED: { label: 'Not assessed', tone: 'neutral', meaning: 'Nobody has reviewed who this requester is.' },
  UNDER_REVIEW: { label: 'Under review', tone: 'warn', meaning: 'A probable match was found; it is not yet good enough to act on.' },
  ESTABLISHED: { label: 'Established', tone: 'ok', meaning: 'Resolved to exactly one recorded person.' },
  AMBIGUOUS: { label: 'Ambiguous', tone: 'stop', meaning: 'More than one person matched. Disclosure and destructive actions are blocked.' },
  NO_MATCH: { label: 'No match', tone: 'stop', meaning: 'No recorded person matched. Disclosure and destructive actions are blocked.' },
};
const AUTHORITY_LABELS: Record<string, Label> = {
  NOT_ESTABLISHED: { label: 'Not established', tone: 'stop', meaning: 'No current authority permits this request.' },
  SELF: { label: 'The person themselves', tone: 'ok', meaning: 'Made by the data principal for their own records.' },
  MANDATED: { label: 'Authorised representative', tone: 'ok', meaning: 'A current mandate permits this specific right.' },
  MANDATE_EXPIRED: { label: 'Mandate expired', tone: 'stop', meaning: 'The representation window has passed. New actions are blocked.' },
  MANDATE_REVOKED: { label: 'Mandate revoked', tone: 'stop', meaning: 'The mandate was revoked. It stays revoked on retry.' },
};
const EXECUTION_LABELS: Record<string, Label> = {
  NOT_STARTED: { label: 'Not started', tone: 'neutral', meaning: 'No action has been attempted against any system.' },
  RUNNING: { label: 'Running', tone: 'info', meaning: 'Approved actions are in progress.' },
  PARTIAL: { label: 'Partly done', tone: 'warn', meaning: 'Some systems were reached and some were not.' },
  COMPLETE: { label: 'Complete', tone: 'ok', meaning: 'Every planned action completed against every planned system.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'Execution failed; no system effect should be assumed.' },
  MANUAL_REQUIRED: { label: 'Needs a person', tone: 'warn', meaning: 'A destination cannot be reached automatically and needs manual work.' },
};
const RESPONSE_LABELS: Record<string, Label> = {
  NOT_PREPARED: { label: 'Not prepared', tone: 'neutral', meaning: 'No response package exists yet.' },
  IN_REVIEW: { label: 'In review', tone: 'info', meaning: 'Being reviewed for third-party information before release.' },
  RELEASED: { label: 'Released', tone: 'ok', meaning: 'Released through expiring authenticated local delivery.' },
  DELIVERY_FAILED: { label: 'Delivery failed', tone: 'stop', meaning: 'The response was prepared but not delivered. It remains undelivered.' },
  EXPIRED: { label: 'Expired', tone: 'warn', meaning: 'The delivery window closed before it was collected.' },
  WITHHELD: { label: 'Withheld', tone: 'stop', meaning: 'Deliberately not released, with the reason recorded.' },
};
const SCOPE_LABELS: Record<string, Label> = {
  NOT_DETERMINED: { label: 'Not determined', tone: 'neutral', meaning: 'The systems and copies in scope have not been worked out.' },
  DETERMINED: { label: 'Determined', tone: 'ok', meaning: 'Every known destination is covered by the plan.' },
  UNRESOLVED_DESTINATIONS: { label: 'Unresolved destinations', tone: 'warn', meaning: 'Known destinations exist that this plan cannot reach. They are listed and stay visible.' },
};
const RIGHT_LABELS: Record<string, string> = {
  ACCESS: 'Access', CORRECTION: 'Correction', ERASURE: 'Erasure', GRIEVANCE: 'Grievance', NOMINATION: 'Nomination',
};
const ACTION_LABELS: Record<string, string> = {
  DISCLOSE_COPY: 'Disclose a copy', CORRECT_RECORD: 'Correct the record', ERASE_RECORD: 'Erase the record',
  RESTRICT_PROCESSING: 'Restrict processing', NO_ACTION_REQUIRED: 'No action required',
};
const OUTCOME_LABELS: Record<string, Label> = {
  SUCCEEDED: { label: 'Done', tone: 'ok', meaning: 'The action was carried out and the record names its evidence.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'The attempt failed. Assume no effect on this system.' },
  EFFECT_UNKNOWN: { label: 'Effect unknown', tone: 'unknown', meaning: 'An attempt was made but the result was never confirmed. This is not success.' },
  MANUAL_REQUIRED: { label: 'Needs a person', tone: 'warn', meaning: 'No automated path exists; somebody still has to do this.' },
  NOT_SUPPORTED: { label: 'Not supported', tone: 'warn', meaning: 'No connector implements this action for this system.' },
};
const METHOD_LABELS: Record<string, string> = {
  CONNECTOR_OPERATION: 'Through a connector', MANUAL_ATTESTATION: 'Recorded by a person', NONE: 'Nothing attempted yet',
};

export function RightsRequests() {
  const query = usePagedQuery('list_rights_requests', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Rights"
        title="Privacy requests"
        lede="Access, correction, erasure, grievance and nomination requests in your current scope. The lifecycle state is shown beside what was actually established, executed and delivered, because those move independently."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded privacy requests" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded privacy requests, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'right', header: 'Request', cell: item => (
                  <a className="cell-primary" href={`/workspace/rights/${item.id}`}>
                    {RIGHT_LABELS[item.right_type] ?? item.right_type}
                    <span className="cell-sub">{shortId(item.id)}</span>
                  </a>
                ) },
                { key: 'state', header: 'Stage', cell: item => <StateBadge dictionary={STATE_LABELS} value={item.state} /> },
                { key: 'identity', header: 'Identity', cell: item => <StateBadge dictionary={IDENTITY_LABELS} value={item.identity} /> },
                { key: 'execution', header: 'Execution', cell: item => <StateBadge dictionary={EXECUTION_LABELS} value={item.execution} /> },
                { key: 'response', header: 'Response', cell: item => <StateBadge dictionary={RESPONSE_LABELS} value={item.response} /> },
                { key: 'received', header: 'Received', cell: item => formatTime(item.received_at) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="Why five columns instead of one status">
        <p>A request can be closed while some systems were never reached, and a response can be prepared but never delivered. Collapsing these into a single status is how a record ends up claiming work that did not happen, so ORVIA keeps them apart.</p>
      </NoticeBox>
    </>
  );
}

export function RightsRequestDetail({ id }: { id: string }) {
  const query = useQuery('rights_request', { params: { id } });
  const directory = useDirectory(['systems']);
  return (
    <>
      <PageHead eyebrow="Rights" title={`Privacy request ${shortId(id)}`} lede="What was asked, what was established, what was actually done and what remains unreached." />
      <QueryBoundary query={query} label="this privacy request" isEmpty={() => false}>
        {request => (
          <>
            <Section title="What was asked">
              <Facts items={[
                { term: 'Right', value: RIGHT_LABELS[request.right_type] ?? request.right_type },
                { term: 'Description', value: request.description },
                { term: 'Received', value: formatTime(request.received_at) },
                { term: 'Arrived through', value: request.submitted_channel === 'PORTAL' ? 'The privacy portal' : 'Recorded manual intake' },
              ]} />
            </Section>
            <Section title="Where it stands">
              <Facts items={[
                { term: 'Stage', value: <StateBadge dictionary={STATE_LABELS} value={request.state} /> },
                { term: 'Identity', value: <StateBadge dictionary={IDENTITY_LABELS} value={request.identity} /> },
                { term: 'Authority', value: <StateBadge dictionary={AUTHORITY_LABELS} value={request.authority} /> },
                { term: 'Execution', value: <StateBadge dictionary={EXECUTION_LABELS} value={request.execution} /> },
                { term: 'Response', value: <StateBadge dictionary={RESPONSE_LABELS} value={request.response} /> },
                { term: 'Scope', value: <StateBadge dictionary={SCOPE_LABELS} value={request.scope} /> },
              ]} />
              {request.state === 'CLOSED' && <ClosureNotice request={request} />}
            </Section>
            <Section title="Planned work, per system">
              {request.plan.length === 0
                ? <p>No plan has been recorded yet. Nothing is scheduled against any system.</p>
                : <DataTable
                  caption="One planned action per system"
                  rows={request.plan}
                  rowKey={item => item.system_id}
                  columns={[
                    { key: 'system', header: 'System', cell: item => directory.systemName(item.system_id) },
                    { key: 'action', header: 'Planned action', cell: item => ACTION_LABELS[item.action] ?? item.action },
                    { key: 'automatable', header: 'How', cell: item => item.automatable ? 'Through a supported connector' : 'Needs a person' },
                    { key: 'exception', header: 'Retention exception', cell: item => item.retention_exception ?? 'None recorded' },
                    { key: 'note', header: 'Note', cell: item => item.note },
                  ]}
                />}
              {request.outcomes.length > 0 && (
                <>
                  <h3>What actually happened</h3>
                  <DataTable
                    caption="Recorded outcome per system"
                    rows={request.outcomes}
                    rowKey={outcome => outcome.system_id}
                    columns={[
                      { key: 'system', header: 'System', cell: outcome => directory.systemName(outcome.system_id) },
                      { key: 'result', header: 'Outcome', cell: outcome => <StateBadge dictionary={OUTCOME_LABELS} value={outcome.result} /> },
                      { key: 'method', header: 'How', cell: outcome => METHOD_LABELS[outcome.method] ?? outcome.method },
                      { key: 'evidence', header: 'Evidence', cell: outcome => outcome.evidence_reference ?? 'None — nothing has been done yet' },
                      { key: 'when', header: 'Recorded', cell: outcome => formatTime(outcome.recorded_at) },
                    ]}
                  />
                  <NoticeBox tone="info" title="Where the execution status comes from">
                    <p>The execution status above is computed from exactly these rows. Moving this request along its stages does not change it, and nothing here can be rewritten once recorded.</p>
                  </NoticeBox>
                </>
              )}
              {request.unresolved_destinations.length > 0 && (
                <NoticeBox tone="warn" title="Destinations this plan cannot reach">
                  <ul>{request.unresolved_destinations.map(destination => <li key={destination}>{destination}</li>)}</ul>
                  <p>These remain unreached. They are not counted as done, and closing the request does not change that.</p>
                </NoticeBox>
              )}
            </Section>
            <TechnicalDetails items={[
              { term: 'Request id', value: request.id },
              { term: 'Principal reference', value: request.principal_id },
              { term: 'Mandate', value: request.mandate_id ?? 'None — made by the person themselves' },
              { term: 'Identity grade', value: request.identity_grade ?? 'Not assessed' },
              { term: 'Last updated', value: formatTime(request.updated_at) },
              { term: 'Stages reachable from here', value: REQUEST_TRANSITIONS[request.state].join(', ') || 'None — this request is closed' },
            ]} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

/** Closure is an administrative act. It must never be read as universal erasure. */
function ClosureNotice({ request }: { request: RightsRequest }) {
  return (
    <NoticeBox tone="neutral" title="This request was closed administratively">
      <p>Closing records that the organisation has finished handling the request. It does not mean every system was reached, and it did not change what execution achieved.</p>
      <Facts items={[
        { term: 'Reason recorded', value: request.closure_note ?? '—' },
        { term: 'What execution actually achieved', value: <StateBadge dictionary={EXECUTION_LABELS} value={request.execution} /> },
        { term: 'Destinations still unreached', value: request.unresolved_destinations.length ? String(request.unresolved_destinations.length) : 'None recorded' },
      ]} />
    </NoticeBox>
  );
}

export function Mandates() {
  const query = usePagedQuery('list_mandates', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Rights"
        title="Representation"
        lede="Nominations and guardian mandates recorded in your current scope. A mandate authorises only the rights it names, only while it is current, and is never a general substitute account."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded mandates" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded representation mandates, in server cursor order"
              rows={data.items}
              rowKey={mandate => mandate.id}
              columns={[
                { key: 'kind', header: 'Kind', cell: mandate => (
                  <span className="cell-primary">{mandate.kind === 'GUARDIAN' ? 'Guardian' : 'Nomination'}
                    <span className="cell-sub">{mandate.representative_reference}</span>
                  </span>
                ) },
                { key: 'rights', header: 'Permitted rights', cell: mandate => mandate.permitted_rights.map(right => RIGHT_LABELS[right] ?? right).join(', ') },
                { key: 'from', header: 'Valid from', cell: mandate => formatTime(mandate.valid_from) },
                { key: 'to', header: 'Valid until', cell: mandate => mandate.valid_to ? formatTime(mandate.valid_to) : 'No end date recorded' },
                { key: 'state', header: 'State', cell: mandate => mandate.state === 'REVOKED'
                  ? <span title={mandate.revocation_reason ?? undefined}>Revoked</span>
                  : mandate.state === 'ACTIVE' ? 'Active' : mandate.state === 'EXPIRED' ? 'Expired' : 'Superseded' },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="What a mandate does and does not do">
        <p>A nomination and a guardian mandate are different authorities with different safeguards. Neither transfers general account ownership, and a revoked mandate stays revoked — a later retry cannot resurrect it.</p>
      </NoticeBox>
    </>
  );
}
