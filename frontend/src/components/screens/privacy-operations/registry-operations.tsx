'use client';
import { useState } from 'react';
import { useCollection, useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';
import { JOB_STATUS_LABELS } from './operations-labels.ts';
import { Choice, Input, Many, WriteForm, all, localNow, nullable, nullableInt, nullableTime, text, time } from './registry-forms.tsx';

/**
 * Retention and holds, processor engagements and sharing, and estate imports.
 *
 * A retention rule without a sourced period never makes anyone eligible; a hold
 * names its authority and is released once, by somebody other than who placed
 * it. A processor's own statement is never shown as verification.
 */
export function RegistryRetention() {
  const rules = usePagedQuery('list_retention_rules', { limit: 50 });
  const holds = usePagedQuery('list_retention_holds', { limit: 50, query: { active: 'true' } });
  const createRun = useMutation('create_retention_run', true);
  const release = useMutation('release_retention_hold', true);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  return (
    <>
      <PageHead eyebrow="Registry" title="Retention rules and holds"
        lede="When personal data becomes eligible for erasure, and what stops it. Evaluating a rule produces a dry run that a second person must approve before anything is erased." />
      <Section title="Retention rules">
        <Freshness query={rules} />
        <QueryBoundary query={rules} label="retention rules" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Current retention rules" rows={data.items} rowKey={r => r.id}
                columns={[
                  { key: 'name', header: 'Rule', cell: r => <span className="cell-primary">{r.name}<span className="cell-sub">v{r.version} · {r.trigger.replaceAll('_', ' ').toLowerCase()}</span></span> },
                  { key: 'period', header: 'Period', cell: r => r.duration_days === null ? <Badge label="Not sourced" tone="unknown" meaning="No period is recorded with its source, so nothing becomes eligible under this rule." /> : `${r.duration_days} days` },
                  { key: 'source', header: 'Source', cell: r => r.source_reference ?? '—' },
                  { key: 'action', header: 'Action', cell: r => r.erasure_action.toLowerCase() },
                  { key: 'status', header: 'Status', cell: r => r.status.toLowerCase() },
                  { key: 'run', header: '', cell: r => r.status === 'ACTIVE' ? <button type="button" disabled={createRun.status === 'pending'} onClick={async () => { createRun.newInteraction(); const run = await createRun.run({ retention_rule_id: r.id }); if (run) globalThis.location.assign(`/workspace/operations-runs/${run.id}`); }}>Evaluate</button> : null },
                ]} />
              {createRun.failure && <FailureState failure={createRun.failure} />}
              <Pagination query={rules} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Active holds">
        <Freshness query={holds} />
        <QueryBoundary query={holds} label="active holds" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Holds that stop erasure" rows={data.items} rowKey={h => h.id}
                columns={[
                  { key: 'type', header: 'Hold', cell: h => <span className="cell-primary">{h.hold_type.replaceAll('_', ' ').toLowerCase()}<span className="cell-sub">{h.authority_reference}</span></span> },
                  { key: 'reason', header: 'Reason', cell: h => h.reason },
                  { key: 'scope', header: 'Covers', cell: h => [h.subject_id && `person ${shortId(h.subject_id)}`, h.activity_id && `activity ${shortId(h.activity_id)}`, h.system_id && `system ${shortId(h.system_id)}`, h.data_category_id && `category ${shortId(h.data_category_id)}`].filter(Boolean).join(', ') || 'Everything in scope' },
                  { key: 'review', header: 'Review', cell: h => <>{formatTime(h.review_at)}{h.review_overdue && <> <Badge label="Review overdue" tone="warn" meaning="The review date has passed." /></>}</> },
                  { key: 'release', header: 'Release (a different person)', cell: h => (
                    <span>
                      <input aria-label="Release reason" value={reasons[h.id] ?? ''} maxLength={500} onChange={event => setReasons({ ...reasons, [h.id]: event.target.value })} />
                      <button type="button" disabled={(reasons[h.id] ?? '').trim().length < 10} onClick={async () => { release.newInteraction(); if (await release.run({ reason: reasons[h.id]! }, { params: { id: h.id } })) holds.refresh(); }}>Release</button>
                    </span>) },
                ]} />
              {release.failure && <FailureState failure={release.failure} />}
              <Pagination query={holds} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <RetentionForms onSaved={() => { rules.refresh(); holds.refresh(); }} />
    </>
  );
}

const TRIGGERS = [{ value: 'RELATIONSHIP_ENDED', label: 'The relationship ended' }, { value: 'CONSENT_WITHDRAWN', label: 'Consent was withdrawn' }, { value: 'PURPOSE_RETIRED', label: 'The purpose was retired' }];
const DURATION_SOURCES = [{ value: 'CUSTOMER_CONFIGURATION', label: 'Our own retention schedule' }, { value: 'REGULATORY_REQUIREMENT', label: 'A requirement in the regulatory package' }, { value: 'EXTERNAL_LAW_REFERENCE', label: 'Another law' }];
const HOLD_TYPES = [{ value: 'OPERATIONAL_HOLD', label: 'Operational hold' }, { value: 'OTHER_LAW_RETENTION', label: 'Retention required by another law' }, { value: 'OFFICIAL_EXEMPTION', label: 'Official exemption' }];

function RetentionForms({ onSaved }: { onSaved: () => void }) {
  const activities = useCollection('list_registry_activities');
  const principalCategories = useCollection('list_principal_categories');
  const dataCategories = useCollection('list_data_categories');
  const systems = useCollection('list_systems');
  const opt = (items: { id: string; name: string }[] | undefined) => (items ?? []).map(i => ({ value: i.id, label: i.name }));
  return (
    <Section title="Record rules and holds">
      <div className="grid-2">
        <WriteForm operation="create_retention_rule" label="Create a retention rule" onSaved={onSaved}
          describe={r => r.resolved ? `${r.name}: ${r.duration_days} days after trigger` : `${r.name}: recorded without a sourced period, so it makes nothing eligible`}
          build={f => {
            const duration = nullableInt(f, 'days'); const source = nullable(f, 'source');
            if ((duration === null) !== (source === null)) throw new Error('A retention period and where it comes from are recorded together, or neither is.');
            if (duration !== null && !nullable(f, 'reference')) throw new Error('A retention period cites its source.');
            if (source === 'REGULATORY_REQUIREMENT' && !nullable(f, 'requirement')) throw new Error('A regulatory period names the requirement it rests on.');
            return { name: text(f, 'name'), activity_id: nullable(f, 'activity'), principal_category_id: text(f, 'principal'), data_category_id: nullable(f, 'category'), system_id: nullable(f, 'system'),
              trigger: text(f, 'trigger') as 'RELATIONSHIP_ENDED', duration_days: duration, duration_source: source as 'CUSTOMER_CONFIGURATION' | null,
              source_reference: nullable(f, 'reference'), requirement_id: nullable(f, 'requirement'), approval_required: f.get('approval') === 'on',
              erasure_action: text(f, 'action') as 'ERASE', effective_from: time(f, 'from') };
          }}>
          <Input label="Name" name="name" />
          <Choice label="Data Principal category" name="principal" options={opt(principalCategories.data?.items)} />
          <Choice label="Activity" name="activity" required={false} placeholder="Any activity" options={opt(activities.data?.items)} />
          <Choice label="Personal data category" name="category" required={false} placeholder="Any category" options={opt(dataCategories.data?.items)} />
          <Choice label="System" name="system" required={false} placeholder="Any system" options={opt(systems.data?.items)} />
          <Choice label="Starts when" name="trigger" options={TRIGGERS} />
          <Input label="Retention period (days)" name="days" type="number" required={false} hint="Leave blank if no period has been sourced; the rule is then recorded but makes nothing eligible." />
          <Choice label="Period comes from" name="source" required={false} placeholder="No period sourced" options={DURATION_SOURCES} />
          <Input label="Source reference" name="reference" required={false} maxLength={500} />
          <Input label="Requirement identifier" name="requirement" required={false} maxLength={80} hint="Required when the period comes from the regulatory package." />
          <Choice label="When eligible" name="action" options={[{ value: 'ERASE', label: 'Erase' }, { value: 'ANONYMISE', label: 'Anonymise' }, { value: 'SUPPRESS', label: 'Suppress' }]} />
          <label className="checkbox"><input type="checkbox" name="approval" defaultChecked /> <span>A second person approves each dry run before anything is erased</span></label>
          <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} />
        </WriteForm>

        <WriteForm operation="create_retention_hold" label="Place a hold" onSaved={onSaved}
          describe={h => `${h.hold_type.replaceAll('_', ' ').toLowerCase()} active until released; review ${formatTime(h.review_at)}`}
          build={f => {
            const scope = { subject_id: nullable(f, 'subject'), activity_id: nullable(f, 'activity'), system_id: nullable(f, 'system'), data_category_id: nullable(f, 'category') };
            if (Object.values(scope).every(v => v === null)) throw new Error('A hold names what it covers; there is no hold on everything.');
            if (text(f, 'type') === 'OFFICIAL_EXEMPTION' && !nullable(f, 'requirement')) throw new Error('An official exemption cites the requirement it rests on.');
            return { hold_type: text(f, 'type') as 'OPERATIONAL_HOLD', authority_reference: text(f, 'authority'), reason: text(f, 'reason'), ...scope,
              starts_at: time(f, 'starts'), ends_at: nullableTime(f, 'ends'), review_at: time(f, 'review'), owner_reference: text(f, 'owner'),
              evidence_reference: nullable(f, 'evidence'), requirement_id: nullable(f, 'requirement') };
          }}>
          <Choice label="Kind of hold" name="type" options={HOLD_TYPES} />
          <Input label="Authority" name="authority" minLength={3} maxLength={500} hint="The order, law or decision the hold rests on." />
          <Input label="Reason" name="reason" minLength={10} maxLength={500} />
          <Input label="Data Principal identifier" name="subject" required={false} maxLength={36} hint="Optional: the registry identifier of one person." />
          <Choice label="Activity" name="activity" required={false} placeholder="Not limited to an activity" options={opt(activities.data?.items)} />
          <Choice label="System" name="system" required={false} placeholder="Not limited to a system" options={opt(systems.data?.items)} />
          <Choice label="Personal data category" name="category" required={false} placeholder="Not limited to a category" options={opt(dataCategories.data?.items)} />
          <Input label="Starts" name="starts" type="datetime-local" defaultValue={localNow()} />
          <Input label="Ends" name="ends" type="datetime-local" required={false} hint="Leave blank if it lasts until released." />
          <Input label="Review by" name="review" type="datetime-local" defaultValue={localNow(90)} />
          <Input label="Owner" name="owner" maxLength={500} />
          <Input label="Evidence reference" name="evidence" required={false} maxLength={500} />
          <Input label="Requirement identifier" name="requirement" required={false} maxLength={80} />
        </WriteForm>
      </div>
    </Section>
  );
}

const DISPOSITION_TEXT: Record<string, { label: string; tone: 'ok' | 'warn' | 'neutral' | 'unknown' | 'info'; meaning: string }> = {
  NOT_APPLICABLE: { label: 'Not applicable', tone: 'neutral', meaning: 'No disposition is required.' },
  PENDING: { label: 'Pending', tone: 'warn', meaning: 'The processor has not confirmed return or deletion.' },
  PROCESSOR_CONFIRMED: { label: 'Processor says done — not verified', tone: 'warn', meaning: 'The processor’s own statement. It is not verification.' },
  VERIFIED: { label: 'Verified', tone: 'ok', meaning: 'Independent audit evidence or a target check confirmed it.' },
  UNKNOWN: { label: 'Unknown', tone: 'unknown', meaning: 'The outcome is not known.' },
};

export function ProcessorEngagements() {
  const engagements = usePagedQuery('list_processor_engagements', { limit: 50 });
  const sharing = usePagedQuery('list_data_sharing_links', { limit: 50 });
  const directory = useDirectory(['systems']);
  return (
    <>
      <PageHead eyebrow="Registry" title="Processor engagements and data sharing"
        lede="Which processor serves which activities, categories and systems, and who received whose data. Termination closes history; it does not delete it." />
      <Section title="Engagements">
        <Freshness query={engagements} />
        <QueryBoundary query={engagements} label="engagements" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Processor engagements" rows={data.items} rowKey={e => e.id}
                columns={[
                  { key: 'service', header: 'Service', cell: e => <span className="cell-primary">{e.service_description}<span className="cell-sub">processor {shortId(e.processor_id)}{e.subprocessor_of ? ' · sub-processor' : ''}</span></span> },
                  { key: 'period', header: 'Period', cell: e => `${formatTime(e.effective_from)} – ${e.effective_to ? formatTime(e.effective_to) : 'current'}` },
                  { key: 'contract', header: 'Contract evidence', cell: e => e.contract_evidence_reference ?? <Badge label="Missing" tone="warn" meaning="No contract evidence reference is recorded." /> },
                  { key: 'activities', header: 'Activities', cell: e => String(e.activity_ids.length) },
                  { key: 'status', header: 'Status', cell: e => e.status.toLowerCase() },
                  { key: 'disposition', header: 'Return / deletion', cell: e => { const d = DISPOSITION_TEXT[e.disposition_state]!; return <Badge label={d.label} tone={d.tone} meaning={d.meaning} />; } },
                  { key: 'run', header: 'Run', cell: e => e.disposition_run_id ? <a href={`/workspace/operations-runs/${e.disposition_run_id}`}>{shortId(e.disposition_run_id)}</a> : '—' },
                ]} />
              <Pagination query={engagements} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <Section title="Data-sharing register">
        <QueryBoundary query={sharing} label="sharing register" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable caption="Who received what" rows={data.items} rowKey={s => s.id}
                columns={[
                  { key: 'recipient', header: 'Recipient', cell: s => s.engagement_id ? `Engagement ${shortId(s.engagement_id)}` : s.recipient_reference ?? '—' },
                  { key: 'activity', header: 'Activity', cell: s => shortId(s.activity_id) },
                  { key: 'category', header: 'Data category', cell: s => shortId(s.data_category_id) },
                  { key: 'system', header: 'From system', cell: s => s.system_id ? directory.systemName(s.system_id) : '—' },
                  { key: 'period', header: 'Valid', cell: s => `${formatTime(s.valid_from)} – ${s.valid_to ? formatTime(s.valid_to) : 'current'}` },
                  { key: 'evidence', header: 'Evidence', cell: s => s.evidence_reference ?? 'None recorded' },
                ]} />
              <Pagination query={sharing} />
            </>
          )}
        </QueryBoundary>
      </Section>
      <EngagementForm engagements={engagements.data?.items ?? []} onSaved={() => engagements.refresh()} />
    </>
  );
}

function EngagementForm({ engagements, onSaved }: { engagements: { id: string; service_description: string; status: string }[]; onSaved: () => void }) {
  const processors = useCollection('list_processors');
  const principalCategories = useCollection('list_principal_categories');
  const dataCategories = useCollection('list_data_categories');
  const systems = useCollection('list_systems');
  return (
    <Section title="Record an engagement">
      <WriteForm operation="create_processor_engagement" label="Record a processor engagement" onSaved={onSaved}
        describe={e => `${e.service_description}${e.contract_evidence_reference ? '' : ' — no contract evidence recorded yet'}`}
        build={f => ({ processor_id: text(f, 'processor'), service_description: text(f, 'service'), subprocessor_of: nullable(f, 'parent'), effective_from: time(f, 'from'),
          contract_evidence_reference: nullable(f, 'contract'), safeguard_evidence_reference: nullable(f, 'safeguard'),
          links: [...all(f, 'data').map(target_id => ({ link_kind: 'DATA_CATEGORY' as const, target_id })), ...all(f, 'principal').map(target_id => ({ link_kind: 'PRINCIPAL_CATEGORY' as const, target_id })),
            ...all(f, 'system').map(target_id => ({ link_kind: 'SYSTEM' as const, target_id }))] })}>
        <Choice label="Processor" name="processor" options={(processors.data?.items ?? []).map(p => ({ value: p.id, label: p.name }))} hint="Processors are registered under Processors." />
        <Input label="Service provided" name="service" maxLength={500} />
        <Choice label="Sub-processor of" name="parent" required={false} placeholder="Engaged directly" options={engagements.filter(e => e.status === 'ACTIVE').map(e => ({ value: e.id, label: e.service_description }))} />
        <Input label="Effective from" name="from" type="datetime-local" defaultValue={localNow()} />
        <Input label="Contract evidence reference" name="contract" required={false} maxLength={500} />
        <Input label="Safeguard evidence reference" name="safeguard" required={false} maxLength={500} />
        <Many legend="Personal data shared" name="data" options={(dataCategories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
        <Many legend="Whose data" name="principal" options={(principalCategories.data?.items ?? []).map(c => ({ value: c.id, label: c.name }))} />
        <Many legend="Systems it operates on" name="system" options={(systems.data?.items ?? []).map(s => ({ value: s.id, label: s.name }))} />
      </WriteForm>
    </Section>
  );
}

export function EstateImports() {
  const jobs = usePagedQuery('list_bulk_jobs', { limit: 25 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Registry" title="Existing-data onboarding"
        lede="Imports of an existing estate: people, references, relationship contexts, consent and notice history. Missing history is recorded as missing; nothing is filled in." />
      <NoticeBox tone="info" title="How rows arrive">
        <p>Rows are uploaded in chunks through the API (see the operations runbook), then applied from a checkpoint. A failed row never stops the rest, and replaying errors never re-applies rows that already succeeded.</p>
      </NoticeBox>
      <Freshness query={jobs} />
      <QueryBoundary query={jobs} label="import jobs" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Import jobs" rows={data.items} rowKey={j => j.id}
              columns={[
                { key: 'label', header: 'Source', cell: j => <span className="cell-primary">{j.source_label}<span className="cell-sub">mapping {j.mapping_version}</span></span> },
                { key: 'status', header: 'Status', cell: j => <StateBadge dictionary={JOB_STATUS_LABELS} value={j.status} /> },
                { key: 'counts', header: 'Applied / duplicate / error / pending of received', cell: j => `${j.counts.applied} / ${j.counts.duplicate} / ${j.counts.error} / ${j.counts.pending} of ${j.counts.received}` },
                { key: 'updated', header: 'Updated', cell: j => formatTime(j.updated_at) },
                { key: 'open', header: '', cell: j => <button type="button" onClick={() => setSelected(j.id)}>Open</button> },
              ]} />
            <Pagination query={jobs} />
          </>
        )}
      </QueryBoundary>
      {selected && <EstateImportDetail id={selected} onChanged={() => jobs.refresh()} />}
    </>
  );
}

function EstateImportDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const job = useQuery('bulk_job', { params: { id }, pollWhile: data => data.status === 'PROCESSING' });
  const process = useMutation('process_bulk_job', true);
  const replay = useMutation('replay_bulk_job_errors', true);
  return (
    <QueryBoundary query={job} label="import job" isEmpty={() => false}>
      {data => (
        <Section title={`Import ${shortId(data.id)}`}>
          <Facts items={[{ term: 'Checkpoint', value: data.cursor < 0 ? 'Not started' : `Row ${data.cursor + 1}` }, { term: 'Received', value: String(data.counts.received) },
            { term: 'Applied', value: String(data.counts.applied) }, { term: 'Duplicates', value: String(data.counts.duplicate) }, { term: 'Errors', value: String(data.counts.error) }]} />
          {data.errors.length > 0 && (
            <DataTable caption="Rows that failed (codes only; row content is not echoed)" rows={data.errors} rowKey={e => String(e.ordinal)}
              columns={[{ key: 'row', header: 'Row', cell: e => String(e.ordinal + 1) }, { key: 'code', header: 'Reason', cell: e => e.error_code }]} />
          )}
          <div className="actions">
            {(data.status === 'RECEIVING' || data.status === 'PROCESSING') && <button type="button" disabled={process.status === 'pending'} onClick={async () => { process.newInteraction(); if (await process.run({ limit: 500 }, { params: { id } })) { job.refresh(); onChanged(); } }}>Apply next 500 rows</button>}
            {data.status === 'COMPLETED_WITH_ERRORS' && <button type="button" disabled={replay.status === 'pending'} onClick={async () => { replay.newInteraction(); if (await replay.run(undefined as never, { params: { id } })) { job.refresh(); onChanged(); } }}>Queue failed rows again</button>}
          </div>
          {process.failure && <FailureState failure={process.failure} />}
          {replay.failure && <FailureState failure={replay.failure} />}
        </Section>
      )}
    </QueryBoundary>
  );
}

