'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Choice, Input, WriteForm, nullable, nullableTime, text } from './registry-forms.tsx';

const STATUS: Record<string, { label: string; tone: 'ok' | 'warn' | 'stop' | 'neutral' | 'unknown' | 'info' }> = {
  UNKNOWN: { label: 'Unknown', tone: 'unknown' }, REQUESTED: { label: 'Requested', tone: 'info' }, PRESENTED: { label: 'Presented', tone: 'info' },
  GRANTED: { label: 'Granted', tone: 'ok' }, DECLINED: { label: 'Declined', tone: 'neutral' }, WITHDRAWN: { label: 'Withdrawn', tone: 'stop' }, EXPIRED: { label: 'Expired', tone: 'neutral' },
};
const EVENTS = ['REQUESTED', 'PRESENTED', 'GRANTED', 'DECLINED', 'MODIFIED', 'WITHDRAWN', 'EXPIRED'] as const;
const EVIDENCE = [{ value: 'EVIDENCE_AVAILABLE', label: 'Evidence available' }, { value: 'NEEDS_VERIFICATION', label: 'Needs verification' }, { value: 'EVIDENCE_MISSING', label: 'Evidence missing' }];

/**
 * Consent records: one per person and activity where consent is the configured
 * condition. A record starts unknown, never granted. Its status is derived from
 * the event history. Recording a withdrawal opens the propagation run at once;
 * imported history never does.
 */
export function ConsentRecords() {
  const list = usePagedQuery('list_consent_records', { limit: 25 });
  const activities = useCollection('list_registry_activities');
  const [selected, setSelected] = useState<string | null>(null);
  const activityName = (id: string) => activities.data?.items.find(a => a.id === id)?.name ?? shortId(id);
  return (
    <>
      <PageHead eyebrow="Registry" title="Consent records"
        lede="Consent held per person and activity, derived from its recorded events. A withdrawal is propagated to every linked system and verified independently." />
      <div className="actions">
        <ActionButton operation="sync_portal_consent" label="Mirror Privacy Centre choices" input={undefined as never} onDone={() => list.refresh()} />
      </div>
      <Freshness query={list} />
      <QueryBoundary query={list} label="consent records" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Consent records" rows={d.items} rowKey={r => r.id}
              columns={[
                { key: 'person', header: 'Person', cell: r => <span className="cell-primary">{shortId(r.subject_id)}<span className="cell-sub">{r.channel}</span></span> },
                { key: 'activity', header: 'Activity', cell: r => activityName(r.activity_id) },
                { key: 'status', header: 'Status', cell: r => { const x = STATUS[r.current_status]!; return <Badge label={x.label} tone={x.tone} />; } },
                { key: 'runs', header: 'Propagation runs', cell: r => r.withdrawal_run_ids.length ? r.withdrawal_run_ids.map(id => <a key={id} href={`/workspace/operations-runs/${id}`}>{shortId(id)} </a>) : '—' },
                { key: 'updated', header: 'Updated', cell: r => formatTime(r.updated_at) },
                { key: 'open', header: '', cell: r => <button type="button" onClick={() => setSelected(r.id)}>Open</button> },
              ]} />
            <Pagination query={list} />
          </>
        )}
      </QueryBoundary>
      {selected && <ConsentRecordDetail key={selected} id={selected} onChanged={() => list.refresh()} />}
      <Section title="Create a consent record">
        <CreateConsentRecord onSaved={r => { list.refresh(); setSelected(r.id); }} />
      </Section>
    </>
  );
}

function CreateConsentRecord({ onSaved }: { onSaved: (r: { id: string }) => void }) {
  const activities = useCollection('list_registry_activities');
  const principals = useCollection('list_principals');
  const purposes = useCollection('list_purposes');
  return (
    <WriteForm operation="create_consent_record" label="Create consent record" onSaved={onSaved} describe={r => `status ${r.current_status.toLowerCase()}`}
      build={f => ({ subject_id: text(f, 'subject'), relationship_id: nullable(f, 'relationship'), activity_id: text(f, 'activity'), channel: text(f, 'channel'),
        expiry_policy: nullable(f, 'expiry'), v1_principal_id: nullable(f, 'v1_principal'), v1_purpose_id: nullable(f, 'v1_purpose') })}>
      <Input label="Data Principal identifier" name="subject" maxLength={36} hint="From Data Principals." />
      <Input label="Relationship context identifier" name="relationship" required={false} maxLength={36} />
      <Choice label="Activity" name="activity" options={(activities.data?.items ?? []).map(a => ({ value: a.id, label: a.name }))} />
      <Input label="Channel" name="channel" maxLength={60} hint="Where consent is collected, e.g. WEB_FORM." />
      <Input label="Expiry policy" name="expiry" required={false} maxLength={500} hint="Only if consent here expires by configuration; otherwise expiry is refused." />
      <Choice label="Privacy Centre identity" name="v1_principal" required={false} placeholder="Not linked" options={(principals.data?.items ?? []).map(p => ({ value: p.id, label: p.display_name }))} />
      <Choice label="Privacy Centre purpose" name="v1_purpose" required={false} placeholder="Not linked" options={(purposes.data?.items ?? []).map(p => ({ value: p.id, label: p.name }))} />
    </WriteForm>
  );
}

function ConsentRecordDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const record = useQuery('consent_record', { params: { id } });
  const notices = useCollection('list_registry_notices');
  const noticeVersions = (notices.data?.items ?? []).flatMap(n => n.versions.filter(v => v.status !== 'DRAFT').map(v => ({ value: v.id, label: `${n.name} v${v.version} (${v.locale})` })));
  const [event, setEvent] = useState('');
  return (
    <QueryBoundary query={record} label="consent record" isEmpty={() => false}>
      {data => (
        <Section title={`Consent record ${shortId(data.id)}`}>
          <DataTable caption="Event history (append-only)" rows={data.events} rowKey={e => e.id}
            columns={[
              { key: 'event', header: 'Event', cell: e => e.event.toLowerCase() },
              { key: 'at', header: 'Occurred', cell: e => e.occurred_at ? formatTime(e.occurred_at) : <Badge label="Time unknown" tone="unknown" /> },
              { key: 'source', header: 'Source', cell: e => e.source.replaceAll('_', ' ').toLowerCase() },
              { key: 'evidence', header: 'Evidence', cell: e => e.evidence_reference ?? e.evidence_state.replaceAll('_', ' ').toLowerCase() },
              { key: 'run', header: 'Propagation', cell: e => e.run_id ? <a href={`/workspace/operations-runs/${e.run_id}`}>run {shortId(e.run_id)}</a> : e.event === 'WITHDRAWN' ? (e.source === 'IMPORT' ? 'Imported history; not re-enacted' : <Badge label="Not yet propagated" tone="warn" meaning="Waiting for a regulatory package in force; the runner creates the run." />) : '—' },
            ]} />
          {event === 'WITHDRAWN' && <NoticeBox tone="warn" title="A withdrawal is propagated"><p>Recording it opens a run that suppresses this person in every linked system and verifies each one independently.</p></NoticeBox>}
          <WriteForm operation="record_consent_event" label="Record a consent event" params={{ id }} onSaved={() => { record.refresh(); onChanged(); }}
            describe={r => `status now ${r.current_status.toLowerCase()}${r.withdrawal_run_ids.length ? `; ${r.withdrawal_run_ids.length} propagation run(s)` : ''}`}
            build={f => {
              const evidence = text(f, 'evidence') as 'EVIDENCE_AVAILABLE' | 'EVIDENCE_MISSING' | 'NEEDS_VERIFICATION';
              const reference = nullable(f, 'reference'); const at = nullableTime(f, 'at');
              if ((evidence === 'EVIDENCE_AVAILABLE') !== (reference !== null)) throw new Error('Only available evidence carries a reference, and it always does.');
              if (at === null && evidence !== 'EVIDENCE_MISSING') throw new Error('An unknown time is recorded only with evidence missing.');
              return { event: event as typeof EVENTS[number], occurred_at: at, evidence_state: evidence, evidence_reference: reference, notice_version_id: nullable(f, 'notice') };
            }}>
            <Choice label="Event" name="event" value={event} onChange={setEvent} options={EVENTS.map(e => ({ value: e, label: e.toLowerCase() }))} />
            <Input label="Occurred at" name="at" type="datetime-local" required={false} hint="Blank only if the time is genuinely unknown." />
            <Choice label="Evidence" name="evidence" options={EVIDENCE} />
            <Input label="Evidence reference" name="reference" required={false} maxLength={500} />
            <Choice label="Notice version shown" name="notice" required={false} placeholder="None recorded" options={noticeVersions} />
          </WriteForm>
        </Section>
      )}
    </QueryBoundary>
  );
}
