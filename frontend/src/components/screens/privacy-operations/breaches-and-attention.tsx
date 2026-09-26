'use client';
import { useState } from 'react';
import { useCollection, useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TextAreaField, TextField } from '../../shared/ui.tsx';
import { LEGAL_STATUS_LABELS, SEVERITY_LABELS, TASK_STATE_LABELS } from './operations-labels.ts';
import { Area, Choice, Input, Many, WriteForm, all, nullable, nullableInt, text } from './registry-forms.tsx';

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
      <RegisterBreach registered={new Set((list.data?.items ?? []).map(b => b.incident_id))} />
    </>
  );
}

const COUNT_STATES = [{ value: 'UNKNOWN', label: 'Unknown' }, { value: 'ESTIMATED', label: 'Estimated' }, { value: 'ESTABLISHED', label: 'Established' }];

/** Reads the breach facts and count shared by registration and update, refusing an inconsistent count. */
function breachFacts(f: FormData) {
  const state = text(f, 'count_state') as 'UNKNOWN' | 'ESTIMATED' | 'ESTABLISHED';
  const count = nullableInt(f, 'count');
  if ((state === 'UNKNOWN') !== (count === null)) throw new Error(state === 'UNKNOWN' ? 'Leave the number blank when it is unknown.' : 'An estimated or established count states the number.');
  return { affected_count: count, affected_count_state: state, mitigation: nullable(f, 'mitigation'),
    facts: { nature: text(f, 'nature'), extent: text(f, 'extent'), timing: text(f, 'timing'), location: text(f, 'location'), likely_impact: text(f, 'impact') } };
}

function BreachFactFields({ current }: { current?: { affected_count: number | null; affected_count_state: string; mitigation: string | null; facts: Record<'nature' | 'extent' | 'timing' | 'location' | 'likely_impact', string> } }) {
  return (
    <>
      <Choice label="People affected" name="count_state" options={COUNT_STATES} defaultValue={current?.affected_count_state ?? 'UNKNOWN'} />
      <Input label="Number of people" name="count" type="number" required={false} defaultValue={current?.affected_count?.toString()} hint="Blank when unknown." />
      <Area label="Nature" name="nature" maxLength={500} defaultValue={current?.facts.nature} />
      <Area label="Extent" name="extent" maxLength={500} defaultValue={current?.facts.extent} />
      <Area label="Timing" name="timing" maxLength={500} defaultValue={current?.facts.timing} />
      <Area label="Location" name="location" maxLength={500} defaultValue={current?.facts.location} />
      <Area label="Likely impact" name="impact" maxLength={500} defaultValue={current?.facts.likely_impact} />
      <Area label="Mitigation" name="mitigation" required={false} maxLength={500} defaultValue={current?.mitigation ?? undefined} />
    </>
  );
}

/**
 * Registers an existing incident as a personal-data breach. The awareness time
 * comes from the incident record, so the deadlines are computed from it by the
 * package in force at awareness; nothing is entered here that could move them.
 */
function RegisterBreach({ registered }: { registered: Set<string> }) {
  const incidents = useCollection('list_incidents');
  const activities = useCollection('list_registry_activities');
  const dataCategories = useCollection('list_data_categories');
  const systems = useCollection('list_systems');
  const engagements = useCollection('list_processor_engagements');
  const candidates = (incidents.data?.items ?? []).filter(i => !registered.has(i.id));
  return (
    <Section title="Register a breach">
      <WriteForm operation="register_breach" label="Register as a personal-data breach"
        onSaved={b => globalThis.location.assign(`/workspace/personal-data-breaches/${b.incident_id}`)}
        build={f => ({ incident_id: text(f, 'incident'), data_category_ids: all(f, 'categories'), activity_ids: all(f, 'activities'), system_ids: all(f, 'systems'), engagement_ids: all(f, 'engagements'), ...breachFacts(f) })}>
        <Choice label="Incident" name="incident" hint="Incidents are recorded under Incidents; the awareness time is taken from that record."
          options={candidates.map(i => ({ value: i.id, label: `${i.summary.slice(0, 80)} (${i.became_aware_at ? `aware ${formatTime(i.became_aware_at)}` : 'awareness not recorded'})` }))} />
        <BreachFactFields />
        <Many legend="Personal data affected" name="categories" options={(dataCategories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
        <Many legend="Processing activities affected" name="activities" options={(activities.data?.items ?? []).map(a => ({ value: a.id, label: a.name }))} />
        <Many legend="Systems affected" name="systems" options={(systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }))} />
        <Many legend="Processor engagements involved" name="engagements" options={(engagements.data?.items ?? []).map(e => ({ value: e.id, label: e.service_description }))} />
      </WriteForm>
    </Section>
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
          <Section title="Correct the facts">
            <WriteForm operation="update_breach" label="Record corrected facts" params={{ id }} onSaved={() => breach.refresh()} keepValues
              describe={() => 'the pinned package and deadlines are unchanged'} build={breachFacts}>
              <BreachFactFields current={data} />
            </WriteForm>
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
    case 'registry_notice': case 'registry_notice_version': return '/workspace/registry-notices';
    case 'regulatory_impact': return '/workspace/regulatory/impacts';
    case 'sdf_obligation': return '/workspace/organisation-profile';
    case 'bulk_job': return '/workspace/estate-imports';
    case 'retention_hold': case 'retention_rule': return '/workspace/registry-retention';
    default: return '/workspace/operations-attention';
  }
}
