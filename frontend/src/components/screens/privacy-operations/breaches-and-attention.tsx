'use client';
import { useState } from 'react';
import { useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TextAreaField, TextField } from '../../shared/ui.tsx';
import { LEGAL_STATUS_LABELS, SEVERITY_LABELS, TASK_STATE_LABELS } from './operations-labels.ts';

/**
 * Personal-data breaches, operational attention and coverage.
 *
 * A breach is pinned to the regulatory package in force when the organisation
 * became aware of it; its deadlines come from that package and never move. If
 * the awareness time is not recorded, the deadline is shown as unresolved rather
 * than computed from something else.
 */
export function PersonalDataBreaches() {
  const list = usePagedQuery('list_breaches', { limit: 25 });
  return (
    <>
      <PageHead eyebrow="DPDP operations" title="Personal-data breaches"
        lede="Incidents registered as personal-data breaches, with intimation and report tasks from the package in force at awareness." />
      <Freshness query={list} />
      <QueryBoundary query={list} label="breaches" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Registered breaches" rows={data.items} rowKey={b => b.incident_id}
              columns={[
                { key: 'incident', header: 'Incident', cell: b => <a className="cell-primary" href={`/workspace/personal-data-breaches/${b.incident_id}`}>{shortId(b.incident_id)}<span className="cell-sub">{b.facts.nature}</span></a> },
                { key: 'aware', header: 'Aware since', cell: b => b.became_aware_at ? formatTime(b.became_aware_at) : <Badge label="Not recorded" tone="unknown" meaning="Deadlines that run from awareness are unresolved." /> },
                { key: 'count', header: 'People affected', cell: b => b.affected_count_state === 'UNKNOWN' ? 'Unknown' : `${b.affected_count} (${b.affected_count_state.toLowerCase()})` },
                { key: 'open', header: 'Open tasks', cell: b => String(b.tasks.filter(t => t.state === 'OPEN').length) },
                { key: 'overdue', header: 'Overdue', cell: b => b.tasks.some(t => t.overdue) ? <Badge label="Overdue" tone="stop" meaning="At least one task is past its deadline." /> : 'No' },
                { key: 'package', header: 'Package', cell: b => `${b.package.version}${b.package.distribution === 'TEST_FIXTURE' ? ' (test fixture)' : ''}` },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function PersonalDataBreachDetail({ id }: { id: string }) {
  const breach = useQuery('breach', { params: { id } });
  const complete = useMutation('complete_breach_task', true);
  const [task, setTask] = useState<string | null>(null);
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  return (
    <QueryBoundary query={breach} label="breach" isEmpty={() => false}>
      {data => (
        <>
          <PageHead eyebrow="Personal-data breach" title={`Incident ${shortId(data.incident_id)}`} lede={data.facts.nature} />
          <Freshness query={breach} />
          {data.package.distribution === 'TEST_FIXTURE' && <NoticeBox tone="warn" title="Test fixture package"><p>These deadlines come from a synthetic test package, not the official Rules.</p></NoticeBox>}
          <Section title="Facts">
            <Facts items={[
              { term: 'Detected', value: formatTime(data.detected_at) }, { term: 'Became aware', value: data.became_aware_at ? formatTime(data.became_aware_at) : 'Not recorded' },
              { term: 'Pinned to package', value: `${data.package.version} at ${formatTime(data.pinned_at)}` },
              { term: 'People affected', value: data.affected_count_state === 'UNKNOWN' ? 'Unknown' : `${data.affected_count} (${data.affected_count_state.toLowerCase()})` },
              { term: 'Extent', value: data.facts.extent }, { term: 'Timing', value: data.facts.timing }, { term: 'Location', value: data.facts.location },
              { term: 'Likely impact', value: data.facts.likely_impact }, { term: 'Mitigation', value: data.mitigation ?? 'Not recorded' },
            ]} />
          </Section>
          <Section title="Tasks and deadlines">
            <DataTable caption="Tasks from the pinned package" rows={data.tasks} rowKey={t => t.id}
              columns={[
                { key: 'kind', header: 'Task', cell: t => <span className="cell-primary">{t.kind.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{t.requirement_id}</span></span> },
                { key: 'rule', header: 'Deadline rule', cell: t => t.timer_rule },
                { key: 'due', header: 'Due', cell: t => t.due_at ? <>{formatTime(t.due_at)}{t.overdue && <> <Badge label="Overdue" tone="stop" meaning="Past its deadline." /></>}</> : t.legal_status === 'UNRESOLVED' ? <StateBadge dictionary={LEGAL_STATUS_LABELS} value="UNRESOLVED" /> : 'Without delay — no hour count stated' },
                { key: 'state', header: 'State', cell: t => <StateBadge dictionary={TASK_STATE_LABELS} value={t.state} /> },
                { key: 'evidence', header: 'Communication evidence', cell: t => t.communication_evidence_reference ?? (t.state === 'OPEN' ? <button type="button" onClick={() => { setTask(t.id); complete.newInteraction(); }}>Record completion</button> : '') },
              ]} />
            {data.tasks.some(t => t.unresolved_reason) && <NoticeBox tone="unknown" title="Why some deadlines are unresolved"><ul>{data.tasks.filter(t => t.unresolved_reason).map(t => <li key={t.id}>{t.unresolved_reason}</li>)}</ul></NoticeBox>}
          </Section>
          {task && (
            <Section title="Record completion">
              <p>Completion requires a reference to the actual communication (for example a Board portal submission or the message sent to Data Principals).</p>
              <TextField label="Communication evidence reference" value={reference} onChange={setReference} required maxLength={200} />
              <TextAreaField label="Note" value={note} onChange={setNote} required maxLength={500} />
              <button type="button" disabled={!reference.trim() || note.trim().length < 10 || complete.status === 'pending'} onClick={async () => {
                if (await complete.run({ communication_evidence_reference: reference, note }, { params: { id: task } })) { setTask(null); setReference(''); setNote(''); breach.refresh(); }
              }}>Record</button>
              {complete.failure && <FailureState failure={complete.failure} />}
            </Section>
          )}
        </>
      )}
    </QueryBoundary>
  );
}

export function OperationsAttention() {
  const attention = useQuery('operations_attention');
  const coverage = useQuery('operations_coverage');
  const sweep = useMutation('operations_notification_sweep', true);
  return (
    <>
      <PageHead eyebrow="DPDP operations" title="Operations attention"
        lede="Deadlines, failures, unresolved facts and missing mappings, derived from the records. Coverage is shown as counted ratios; there is no compliance score." />
      <Section title="Needs attention">
        <Freshness query={attention} />
        <QueryBoundary query={attention} label="attention items" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Items derived from records" rows={data.items} rowKey={(item) => `${item.kind}:${item.entity_id ?? 'none'}:${item.detail}`}
                columns={[
                  { key: 'sev', header: 'Severity', cell: item => <StateBadge dictionary={SEVERITY_LABELS} value={item.severity} /> },
                  { key: 'kind', header: 'Kind', cell: item => item.kind.replaceAll('_', ' ').toLowerCase() },
                  { key: 'detail', header: 'Detail', cell: item => item.detail },
                  { key: 'due', header: 'Due', cell: item => item.due_at ? formatTime(item.due_at) : '—' },
                  { key: 'open', header: 'Record', cell: item => item.entity_id ? <a href={recordHref(item.entity_kind, item.entity_id)}>{item.entity_kind.replaceAll('_', ' ')} {shortId(item.entity_id)}</a> : '—' },
                ]} />
              <NoticeBox tone="info" title="What this list can and cannot tell you"><ul>{data.limits.map(l => <li key={l}>{l}</li>)}</ul></NoticeBox>
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Coverage">
        <QueryBoundary query={coverage} label="coverage" isEmpty={data => !data.measures.length}>
          {data => (
            <DataTable caption="Counted ratios — never a compliance score" rows={data.measures} rowKey={m => m.dimension}
              columns={[
                { key: 'what', header: 'What is counted', cell: m => m.counted },
                { key: 'ratio', header: 'Count', cell: m => `${m.numerator} of ${m.denominator}` },
                { key: 'excluded', header: 'Excluded', cell: m => m.excluded ? `${m.excluded} — ${m.exclusion_reasons.join(' ')}` : 'None' },
              ]} />
          )}
        </QueryBoundary>
      </Section>
      <Section title="Deadline notifications">
        <p>Raises one notification per open deadline or failure that has none yet. The background runner does this on a schedule; this button runs it now.</p>
        <button type="button" disabled={sweep.status === 'pending'} onClick={async () => { sweep.newInteraction(); await sweep.run(undefined as never); }}>Raise due notifications now</button>
        {sweep.failure && <FailureState failure={sweep.failure} />}
        {sweep.result && (
          <>
            <p>{sweep.result.created} notification(s) raised from {sweep.result.examined} item(s).</p>
            {sweep.result.unresolved.length > 0 && <NoticeBox tone="unknown" title="Not raised — nothing was invented"><ul>{[...new Set(sweep.result.unresolved.map(u => u.reason))].map(r => <li key={r}>{r}</li>)}</ul></NoticeBox>}
          </>
        )}
      </Section>
    </>
  );
}

function recordHref(kind: string, id: string) {
  switch (kind) {
    case 'personal_data_breach': return `/workspace/personal-data-breaches/${id}`;
    case 'workflow_run': return `/workspace/operations-runs/${id}`;
    case 'rights_request': return `/workspace/rights/${id}`;
    case 'registry_activity': return '/workspace/processing-activities';
    case 'regulatory_impact': return '/workspace/regulatory/impacts';
    case 'sdf_obligation': return '/workspace/organisation-profile';
    case 'bulk_job': return '/workspace/estate-imports';
    case 'retention_hold': case 'retention_rule': return '/workspace/registry-retention';
    default: return '/workspace/operations-attention';
  }
}
