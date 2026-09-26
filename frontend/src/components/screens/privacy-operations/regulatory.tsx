'use client';
import { useState } from 'react';
import { useMutation, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, CheckboxField, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, SelectField, StateBadge, TextAreaField } from '../../shared/ui.tsx';
import { APPLICABILITY_LABELS, IMPACT_STATE_LABELS, LEGAL_STATUS_LABELS, PACKAGE_STATE_LABELS } from './operations-labels.ts';
import { ApplicabilityOverride, PackageImport } from './operations-extras.tsx';

/**
 * Regulatory core: signed packages, their requirements and commencement,
 * applicability decisions and the impact of a package change.
 *
 * A package is only ever shown as official when every source was retrieved from
 * an official host and hashed. A TEST_FIXTURE package is labelled as such on
 * every screen that uses it.
 */
export function RegulatoryPackages() {
  const packages = usePagedQuery('list_regulatory_packages', { limit: 25 });
  const active = useQuery('active_regulatory_package');
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead eyebrow="Regulatory core" title="Regulatory packages"
        lede="Signed releases of the DPDP Act and Rules as ORVIA encodes them. A package takes effect only after a second super admin approves it, and only from its effective date." />
      <Section title="In effect now">
        <QueryBoundary query={active} label="active package" isEmpty={() => false}>
          {data => data.package
            ? <Facts items={[{ term: 'Version', value: data.package.version }, { term: 'Effective from', value: formatTime(data.package.effective_from) },
              { term: 'Distribution', value: <DistributionBadge distribution={data.package.distribution} /> }, { term: 'Why', value: data.reason }]} />
            : <NoticeBox tone="stop" title="No approved package is in effect"><p>{data.reason} Material workflows are refused until one is.</p></NoticeBox>}
        </QueryBoundary>
      </Section>
      <Freshness query={packages} />
      <QueryBoundary query={packages} label="regulatory packages" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Imported packages" rows={data.items} rowKey={p => p.id}
              columns={[
                { key: 'version', header: 'Version', cell: p => <span className="cell-primary">{p.version}<span className="cell-sub">previous {p.previous_version ?? 'none'}</span></span> },
                { key: 'dist', header: 'Distribution', cell: p => <DistributionBadge distribution={p.distribution} /> },
                { key: 'state', header: 'State', cell: p => <StateBadge dictionary={PACKAGE_STATE_LABELS} value={p.state} /> },
                { key: 'active', header: 'Governs now', cell: p => p.active ? 'Yes' : 'No' },
                { key: 'effective', header: 'Effective from', cell: p => formatTime(p.effective_from) },
                { key: 'sources', header: 'Unverified sources', cell: p => p.unverified_source_ids.length ? <Badge label={String(p.unverified_source_ids.length)} tone="warn" meaning="Sources that were not retrieved and hashed from an official host." /> : 'None' },
                { key: 'open', header: '', cell: p => <button type="button" onClick={() => setSelected(p.id)}>Open</button> },
              ]} />
            <Pagination query={packages} />
          </>
        )}
      </QueryBoundary>
      {selected && <PackageDetail id={selected} onDecided={() => { packages.refresh(); active.refresh(); }} />}
      <PackageImport onSaved={() => packages.refresh()} />
    </>
  );
}

function DistributionBadge({ distribution }: { distribution: string }) {
  return distribution === 'PRODUCTION'
    ? <Badge label="Production" tone="info" meaning="Every source was retrieved from an official Government of India host and hashed." />
    : <Badge label="Test fixture" tone="warn" meaning="Synthetic package for automated validation. It is not the official text and must never be relied on." />;
}

function PackageDetail({ id, onDecided }: { id: string; onDecided: () => void }) {
  const detail = useQuery('regulatory_package', { params: { id } });
  const decide = useMutation('decide_regulatory_package', true);
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  return (
    <QueryBoundary query={detail} label="package detail" isEmpty={() => false}>
      {data => (
        <>
          <Section title={`Package ${data.package.version}`}>
            <Facts items={[{ term: 'Package digest', value: <code>{shortId(data.package.package_digest)}</code> }, { term: 'Imported', value: formatTime(data.package.imported_at) },
              { term: 'Decided', value: data.package.decided_at ? `${formatTime(data.package.decided_at)} — ${data.package.decision_note ?? ''}` : 'Not yet' }]} />
            {data.release_notes.length > 0 && <NoticeBox tone="info" title="Release notes"><ul>{data.release_notes.map(n => <li key={n}>{n}</li>)}</ul></NoticeBox>}
          </Section>
          <Section title="Sources">
            <DataTable caption="Official sources and how each was verified" rows={data.sources} rowKey={s => s.source_id}
              columns={[
                { key: 'title', header: 'Source', cell: s => <span className="cell-primary">{s.title}<span className="cell-sub">{s.publisher}</span></span> },
                { key: 'url', header: 'Official URL', cell: s => s.official_url },
                { key: 'verification', header: 'Verification', cell: s => s.verification === 'ARTIFACT_HASHED' ? <Badge label="Retrieved and hashed" tone="ok" meaning={`Digest ${s.artifact_digest ?? ''}`} /> : s.verification === 'TEST_FIXTURE' ? <Badge label="Test fixture" tone="warn" meaning="Not an official artifact." /> : <Badge label="Not retrieved" tone="unknown" meaning="The artifact was not retrieved or hashed." /> },
              ]} />
          </Section>
          <Section title="Requirements">
            <DataTable caption="Encoded requirements with their legal status now" rows={data.requirements} rowKey={r => r.requirement_id}
              columns={[
                { key: 'id', header: 'Requirement', cell: r => <span className="cell-primary">{r.title}<span className="cell-sub">{r.requirement_id} · v{r.version}</span></span> },
                { key: 'provisions', header: 'Provisions', cell: r => r.provision_ids.join(', ') },
                { key: 'status', header: 'Now', cell: r => <StateBadge dictionary={LEGAL_STATUS_LABELS} value={r.legal_status_now} /> },
                { key: 'from', header: 'Effective from', cell: r => r.effective_from },
                { key: 'timer', header: 'Timer', cell: r => r.timer.kind === 'HOURS' ? `${r.timer.hours} hours` : r.timer.kind === 'WITHOUT_DELAY' ? 'Without delay' : 'None stated' },
              ]} />
          </Section>
          {data.package.state === 'IMPORTED' && (
            <Section title="Decision (a different super admin from the importer)">
              {data.package.unverified_source_ids.length > 0 && <NoticeBox tone="warn" title="Open verification items"><p>Some sources were not retrieved and hashed. Approving is a deliberate, recorded act.</p></NoticeBox>}
              <TextAreaField label="Decision note" value={note} onChange={setNote} required maxLength={500} />
              <CheckboxField label="I acknowledge the open verification items listed for this package" checked={acknowledged} onChange={setAcknowledged} />
              <div className="actions">
                <button type="button" disabled={note.trim().length < 10 || decide.status === 'pending'} onClick={async () => { decide.newInteraction(); if (await decide.run({ decision: 'APPROVED', note, acknowledged_open_verification_items: acknowledged }, { params: { id } })) { detail.refresh(); onDecided(); } }}>Approve</button>
                <button type="button" disabled={note.trim().length < 10 || decide.status === 'pending'} onClick={async () => { decide.newInteraction(); if (await decide.run({ decision: 'REJECTED', note, acknowledged_open_verification_items: acknowledged }, { params: { id } })) { detail.refresh(); onDecided(); } }}>Reject</button>
              </div>
              {decide.failure && <FailureState failure={decide.failure} />}
            </Section>
          )}
        </>
      )}
    </QueryBoundary>
  );
}

export function Applicability() {
  const decisions = usePagedQuery('list_applicability_decisions', { limit: 100 });
  const evaluate = useMutation('evaluate_applicability', true);
  const activities = usePagedQuery('list_registry_activities', { limit: 100 });
  const [scope, setScope] = useState('ORGANISATION');
  const result = evaluate.result;
  return (
    <>
      <PageHead eyebrow="Regulatory core" title="Applicability"
        lede="Which requirements apply, from recorded facts only. A fact that is not recorded makes the answer unresolved; nothing is assumed." />
      <Section title="Evaluate now">
        <SelectField label="Scope" value={scope} onChange={setScope}
          options={[{ value: 'ORGANISATION', label: 'The organisation' }, ...(activities.data?.items ?? []).map(a => ({ value: a.id, label: `Activity: ${a.name}` }))]} />
        <button type="button" disabled={evaluate.status === 'pending'} onClick={async () => {
          evaluate.newInteraction();
          if (await evaluate.run(scope === 'ORGANISATION' ? { scope_kind: 'ORGANISATION', scope_id: null, as_of: null } : { scope_kind: 'ACTIVITY', scope_id: scope, as_of: null })) decisions.refresh();
        }}>Evaluate</button>
        {evaluate.failure && <FailureState failure={evaluate.failure} />}
        {result && (
          <>
            <Facts items={Object.entries(result.summary).map(([key, count]) => ({ term: APPLICABILITY_LABELS[key]?.label ?? key, value: String(count) }))} />
            <DecisionTable rows={result.decisions} />
          </>
        )}
      </Section>
      <Section title="Recorded decisions">
        <Freshness query={decisions} />
        <QueryBoundary query={decisions} label="applicability decisions" isEmpty={data => !data.items.length}>
          {data => (<><DecisionTable rows={data.items} /><Pagination query={decisions} /></>)}
        </QueryBoundary>
      </Section>
      <ApplicabilityOverride decisions={decisions.data?.items ?? []} onSaved={() => decisions.refresh()} />
    </>
  );
}

type DecisionRow = { id: string; requirement_id: string; scope_kind: string; scope_id: string | null; result: string; inputs: Record<string, string | boolean | null>; trace: string[]; evaluated_at: string; override_of: string | null };
function DecisionTable({ rows }: { rows: DecisionRow[] }) {
  return (
    <DataTable caption="Applicability decisions with the facts they used" rows={rows} rowKey={d => d.id}
      columns={[
        { key: 'req', header: 'Requirement', cell: d => d.requirement_id },
        { key: 'scope', header: 'Scope', cell: d => d.scope_kind === 'ORGANISATION' ? 'Organisation' : `Activity ${shortId(d.scope_id)}` },
        { key: 'result', header: 'Result', cell: d => <StateBadge dictionary={APPLICABILITY_LABELS} value={d.result} /> },
        { key: 'unknown', header: 'Unrecorded facts', cell: d => Object.entries(d.inputs).filter(([, v]) => v === null).map(([k]) => k).join(', ') || 'None' },
        { key: 'trace', header: 'Reasoning', cell: d => <details className="reveal"><summary>{d.trace.length} step(s)</summary><ul>{d.trace.map(step => <li key={step}>{step}</li>)}</ul></details> },
        { key: 'when', header: 'Evaluated', cell: d => formatTime(d.evaluated_at) },
      ]} />
  );
}

export function RegulatoryImpacts() {
  const impacts = usePagedQuery('list_regulatory_impacts', { limit: 50 });
  const review = useMutation('review_regulatory_impact', true);
  const [notes, setNotes] = useState<Record<string, string>>({});
  return (
    <>
      <PageHead eyebrow="Regulatory core" title="Impact of package changes"
        lede="When a new package changes or removes a requirement, each affected record is listed for review. Where the facts to decide are missing, the item says so." />
      <Freshness query={impacts} />
      <QueryBoundary query={impacts} label="regulatory impacts" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable caption="Impact items" rows={data.items} rowKey={i => i.id}
              columns={[
                { key: 'req', header: 'Requirement', cell: i => <span className="cell-primary">{i.requirement_id}<span className="cell-sub">{i.change.toLowerCase()}</span></span> },
                { key: 'affected', header: 'Affected', cell: i => `${i.affected_kind.toLowerCase()}${i.affected_id ? ` ${shortId(i.affected_id)}` : ''}` },
                { key: 'reason', header: 'Why', cell: i => i.reason },
                { key: 'state', header: 'State', cell: i => <StateBadge dictionary={IMPACT_STATE_LABELS} value={i.state} /> },
                { key: 'review', header: 'Review', cell: i => i.state !== 'OPEN' ? (i.review_note ?? '') : (
                  <span>
                    <input aria-label="Review note" value={notes[i.id] ?? ''} maxLength={500} onChange={event => setNotes({ ...notes, [i.id]: event.target.value })} />
                    <button type="button" disabled={(notes[i.id] ?? '').trim().length < 10} onClick={async () => { review.newInteraction(); if (await review.run({ state: 'ACTIONED', note: notes[i.id]! }, { params: { id: i.id } })) impacts.refresh(); }}>Actioned</button>
                    <button type="button" disabled={(notes[i.id] ?? '').trim().length < 10} onClick={async () => { review.newInteraction(); if (await review.run({ state: 'NOT_AFFECTED', note: notes[i.id]! }, { params: { id: i.id } })) impacts.refresh(); }}>Not affected</button>
                  </span>) },
              ]} />
            {review.failure && <FailureState failure={review.failure} />}
            <Pagination query={impacts} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
