'use client';
import { useState } from 'react';
import { useQuery, usePagedQuery } from '../shared/api.ts';
import { useDirectory } from '../shared/directory.ts';
import { formatTime, shortId, type Label } from '../shared/state-labels.ts';
import { Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../shared/ui.tsx';

/**
 * M16 Processor and Vendor Management.
 *
 * The screen never shows a processor as a single traffic light. Notified,
 * acknowledged and verified are three separate columns, because a vendor that
 * was told and replied has still never been checked, and presenting those as
 * one status is exactly how an organisation comes to believe a control it never
 * verified.
 */

const ROLE_LABELS: Record<string, string> = {
  PROCESSOR: 'Processor', SUB_PROCESSOR: 'Sub-processor',
  JOINT_CONTROLLER: 'Joint controller', INDEPENDENT_CONTROLLER: 'Independent controller',
};
const FACT_LABELS: Record<string, Label> = {
  NOTIFIED: { label: 'Told', tone: 'info', meaning: 'ORVIA recorded that this was raised with the processor. It says nothing about what they did.' },
  ACKNOWLEDGED: { label: 'They replied', tone: 'warn', meaning: 'The processor said something back. This is their claim, not evidence.' },
  VERIFIED: { label: 'Checked', tone: 'ok', meaning: 'Somebody independently checked and recorded the evidence. Only this establishes that a control holds.' },
};
const SEVERITY_LABELS: Record<string, Label> = {
  LOW: { label: 'Low', tone: 'neutral', meaning: 'Worth recording; not urgent.' },
  MEDIUM: { label: 'Medium', tone: 'info', meaning: 'Should be scheduled.' },
  HIGH: { label: 'High', tone: 'warn', meaning: 'Needs attention soon.' },
  CRITICAL: { label: 'Critical', tone: 'stop', meaning: 'Needs attention now.' },
};
const FINDING_STATE_LABELS: Record<string, Label> = {
  OPEN: { label: 'Open', tone: 'warn', meaning: 'Not yet remediated or accepted.' },
  REMEDIATED: { label: 'Remediated', tone: 'ok', meaning: 'Closed with named evidence or a retest.' },
  ACCEPTED_RISK: { label: 'Risk accepted', tone: 'neutral', meaning: 'Deliberately not fixed, with a recorded reason.' },
};

export function Processors() {
  const query = usePagedQuery('list_processors', { limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead
        eyebrow="Vendors"
        title="Processors"
        lede="Organisations that process personal data on your behalf, the purposes each is authorised for, and who owns the relationship."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded processors" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded processors, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'name', header: 'Processor', cell: item => (
                  <span className="cell-primary">{item.name}<span className="cell-sub">{ROLE_LABELS[item.role] ?? item.role} · {item.region}</span></span>
                ) },
                { key: 'purposes', header: 'Authorised purposes', cell: item => String(item.authorised_purpose_ids.length) },
                { key: 'categories', header: 'Authorised categories', cell: item => item.authorised_categories.join(', ') },
                { key: 'contract', header: 'Contract', cell: item => item.contract_reference },
                { key: 'sub', header: 'May sub-contract', cell: item => item.subprocessors_permitted ? 'Yes' : 'No' },
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
    </>
  );
}

function Standing({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery('processor_standing', { params: { id } });
  const directory = useDirectory(['systems']);
  return (
    <Section title="What is actually established" aside={<button type="button" onClick={onClose}>Close</button>}>
      <QueryBoundary query={query} label="processor standing" isEmpty={() => false}>
        {data => (
          <>
            <DataTable
              caption="Three separate facts, never combined into one status"
              rows={[
                { fact: 'NOTIFIED', established: data.notified },
                { fact: 'ACKNOWLEDGED', established: data.acknowledged },
                { fact: 'VERIFIED', established: data.verified },
              ]}
              rowKey={row => row.fact}
              columns={[
                { key: 'fact', header: 'Fact', cell: row => <StateBadge dictionary={FACT_LABELS} value={row.fact} /> },
                { key: 'established', header: 'Recorded', cell: row => row.established
                  ? <Badge label="Yes" tone="ok" />
                  : <Badge label="No" tone="unknown" meaning="Nothing of this kind has been recorded." /> },
              ]}
            />
            {data.notified && data.acknowledged && !data.verified && (
              <NoticeBox tone="warn" title="This processor has been told and has replied, but nobody has checked">
                <p>An acknowledgement is the processor&rsquo;s own claim about what they did. Until somebody independently checks and records the evidence, there is no basis for saying the control holds.</p>
              </NoticeBox>
            )}
            <Facts items={[
              { term: 'Open findings', value: String(data.open_findings) },
              { term: 'Overdue remediations', value: String(data.overdue_remediations) },
              { term: 'Evaluated', value: formatTime(data.as_of) },
            ]} />
            {data.unauthorised_system_links.length > 0 && (
              <NoticeBox tone="stop" title="Systems serving a purpose this processor is not authorised for">
                <ul>{data.unauthorised_system_links.map(system => <li key={system}>{directory.systemName(system)}</li>)}</ul>
                <p>These were derived from the declared links and the published policies, not asserted by anyone.</p>
              </NoticeBox>
            )}
            <NoticeBox tone="info" title="What this standing does and does not mean">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

export function Assessments() {
  const query = usePagedQuery('list_assessments', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Vendors"
        title="Assessments"
        lede="Assessments are activated by a reviewed applicability decision, never by a questionnaire alone, and cannot be completed while their own findings are open."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded assessments" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded assessments, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'kind', header: 'Assessment', cell: item => (
                  <span className="cell-primary">{item.kind.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{shortId(item.id)}</span></span>
                ) },
                { key: 'basis', header: 'Why it applies', cell: item => item.applicability_basis },
                { key: 'reviewer', header: 'Reviewer', cell: item => item.reviewer_reference },
                { key: 'due', header: 'Due', cell: item => formatTime(item.due_at) },
                { key: 'state', header: 'State', cell: item => item.state === 'COMPLETED'
                  ? <span title={item.conclusion ?? undefined}>Completed</span>
                  : item.state === 'OPEN' ? 'Open' : 'Superseded' },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function Findings() {
  const query = usePagedQuery('list_findings', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Vendors"
        title="Assessment findings"
        lede="Each finding names an owner and a deadline. Closing one requires either evidence or a retest — a statement that it was handled is not enough."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded findings" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded assessment findings, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'description', header: 'Finding', cell: item => item.description },
                { key: 'severity', header: 'Severity', cell: item => <StateBadge dictionary={SEVERITY_LABELS} value={item.severity} /> },
                { key: 'state', header: 'State', cell: item => <StateBadge dictionary={FINDING_STATE_LABELS} value={item.state} /> },
                { key: 'owner', header: 'Owner', cell: item => item.owner_reference },
                { key: 'due', header: 'Due', cell: item => formatTime(item.due_at) },
                { key: 'closure', header: 'Closed on', cell: item => item.closure_evidence ?? item.retest_reference ?? <span className="cell-sub">Still open</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
