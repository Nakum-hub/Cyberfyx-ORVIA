'use client';
import { useState } from 'react';
import { useCollection, usePagedQuery, useQuery } from '../../shared/api.ts';
import { formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section } from '../../shared/ui.tsx';
import { ActionButton, Area, Choice, Input, Many, WriteForm, all, localNow, nullable, text, time } from '../privacy-operations/registry-forms.tsx';

const CHECKS: Record<string, string> = {
  SYSTEMS_HAVE_CONNECTOR_BINDING: 'Every system an activity uses has a connector binding',
  CONSENT_EVENTS_HAVE_EVIDENCE: 'Every consent event has its evidence',
  RETENTION_RULES_SOURCED: 'Every active retention rule states a period',
  PROCESSORS_HAVE_AGREEMENT: 'Every engaged processor has an agreement in force',
  WITHDRAWALS_PROPAGATED: 'Every withdrawal has a propagation run',
  ASSESSMENTS_CURRENT: 'No approved assessment is past its review date',
  FORCED_ROW_SECURITY: 'Every application table forces row security',
  AUDIT_TRAIL_APPEND_ONLY: 'The audit trail is append-only',
  GRC_EVIDENCE_CURRENT: 'Every control has current evidence',
};
const STANDING_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral'> = { PASSING: 'ok', FAILING: 'stop', ERROR: 'stop', STALE: 'warn', NEVER_RUN: 'warn', DISABLED: 'neutral' };
const ISSUE_TONE: Record<string, 'ok' | 'warn' | 'stop' | 'neutral'> = { OPEN: 'stop', REMEDIATION_PLANNED: 'warn', REMEDIATED: 'warn', VERIFIED: 'ok', RISK_ACCEPTED: 'neutral', ACCEPTANCE_EXPIRED: 'stop' };
const label = (v: string) => v.toLowerCase().replaceAll('_', ' ');

/**
 * Continuous compliance (EX10/EX11). Control tests run deterministic checks over
 * this installation's records on a schedule; a failure opens one issue and a
 * change of state raises one alert. Issues close only by verification. Policies
 * are versioned and published by someone other than their author.
 */
export function Compliance() {
  const report = useQuery('compliance_report');
  return (
    <>
      <PageHead eyebrow="Governance" title="Continuous compliance"
        lede="Scheduled checks over the records this installation holds, the issues they open, and the policies that govern them. A pass is evidence for the named check at the time shown, not a certification." />
      <Freshness query={report} />
      <QueryBoundary query={report} label="compliance report" isEmpty={() => false}>
        {r => (
          <Section title="Standing">
            <Facts items={[
              { term: 'Control tests', value: `${r.summary.tests}: ${r.summary.passing} passing, ${r.summary.failing} failing, ${r.summary.error} error, ${r.summary.stale} stale, ${r.summary.never_run} never run, ${r.summary.disabled} disabled` },
              { term: 'Open issues', value: `${r.summary.open_issues} (${r.summary.overdue_issues} overdue)` },
              { term: 'Published policies', value: `${r.summary.policies_published} (${r.summary.policies_review_due} due for review)` },
              { term: 'As of', value: formatTime(r.as_of) },
            ]} />
            {r.frameworks.length > 0 && (
              <DataTable caption="Framework coverage" rows={r.frameworks} rowKey={f => f.framework_id}
                columns={[
                  { key: 'name', header: 'Framework', cell: f => <span className="cell-primary">{f.name}<span className="cell-sub">{f.version}</span></span> },
                  { key: 'mapped', header: 'Requirements mapped to a control', cell: f => `${f.requirements_mapped} of ${f.requirements}` },
                  { key: 'unmapped', header: 'Unmapped', cell: f => f.unmapped_codes.length ? f.unmapped_codes.slice(0, 8).join(', ') + (f.unmapped_codes.length > 8 ? '…' : '') : 'None' },
                ]} />
            )}
            <ul className="cell-sub">{r.limits.map(l => <li key={l}>{l}</li>)}</ul>
          </Section>
        )}
      </QueryBoundary>
      <ControlTests onChanged={() => report.refresh()} />
      <Alerts />
      <Issues onChanged={() => report.refresh()} />
      <Policies onChanged={() => report.refresh()} />
    </>
  );
}

function ControlTests({ onChanged }: { onChanged: () => void }) {
  const tests = usePagedQuery('list_control_tests', { limit: 25 });
  const controls = useCollection('list_grc_controls');
  const [selected, setSelected] = useState<string | null>(null);
  const refresh = () => { tests.refresh(); onChanged(); };
  return (
    <Section title="Control tests">
      <div className="actions">
        <ActionButton operation="control_test_sweep" label="Run due tests now" input={undefined as never} onDone={refresh} />
      </div>
      <QueryBoundary query={tests} label="control tests" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Control tests" rows={d.items} rowKey={t => t.id}
              columns={[
                { key: 'name', header: 'Test', cell: t => <span className="cell-primary">{t.name}<span className="cell-sub">{CHECKS[t.check_kind] ?? t.check_kind}; limit {t.maximum_violations}</span></span> },
                { key: 'standing', header: 'Standing', cell: t => <Badge label={label(t.standing)} tone={STANDING_TONE[t.standing] ?? 'neutral'} /> },
                { key: 'last', header: 'Last run', cell: t => t.latest_run ? `${formatTime(t.latest_run.observed_at)}: ${t.latest_run.result === 'ERROR' ? `error ${t.latest_run.error_code}` : `${t.latest_run.violations} violation(s)`}` : 'Never' },
                { key: 'next', header: 'Next due', cell: t => t.enabled ? formatTime(t.next_run_at) : '—' },
                { key: 'issue', header: 'Open issue', cell: t => t.open_issue_id ? shortId(t.open_issue_id) : '—' },
                { key: 'open', header: '', cell: t => <button type="button" onClick={() => setSelected(t.id)}>Open</button> },
              ]} />
            <Pagination query={tests} />
          </>
        )}
      </QueryBoundary>
      {selected && <ControlTestDetail key={selected} id={selected} onChanged={refresh} />}
      <WriteForm operation="create_control_test" label="Add a control test" onSaved={refresh} describe={t => `${t.name} added; it runs at the next sweep`}
        build={f => ({ control_id: text(f, 'control'), name: text(f, 'name'), check_kind: text(f, 'check') as 'FORCED_ROW_SECURITY', maximum_violations: Number(text(f, 'maximum')), interval_minutes: Number(text(f, 'interval')) })}>
        <Choice label="Control" name="control" options={(controls.data?.items ?? []).map(c => ({ value: c.id, label: c.title }))} hint="The control this test provides evidence for." />
        <Input label="Name" name="name" minLength={3} maxLength={160} />
        <Choice label="Check" name="check" options={Object.entries(CHECKS).map(([value, l]) => ({ value, label: l }))} />
        <Input label="Violations allowed" name="maximum" type="number" defaultValue="0" hint="The test fails when more records than this violate the check." />
        <Input label="Run every (minutes)" name="interval" type="number" defaultValue="60" hint="Between 5 minutes and 30 days. A test not run within twice this is stale." />
      </WriteForm>
    </Section>
  );
}

function ControlTestDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const detail = useQuery('control_test', { params: { id } });
  const refresh = () => { detail.refresh(); onChanged(); };
  return (
    <QueryBoundary query={detail} label="control test" isEmpty={() => false}>
      {d => (
        <div className="panel">
          <h3>{d.test.name}</h3>
          <p className="cell-sub">{CHECKS[d.test.check_kind]}. Runs every {d.test.interval_minutes} minutes; fails above {d.test.maximum_violations} violation(s).</p>
          <div className="actions">
            {d.test.enabled && <ActionButton operation="run_control_test" label="Run now" input={undefined as never} params={{ id }} onDone={refresh} />}
            <ActionButton operation="toggle_control_test" label={d.test.enabled ? 'Disable' : 'Enable'} input={{ enabled: !d.test.enabled }} params={{ id }} onDone={refresh} />
          </div>
          <DataTable caption="Run history" rows={d.runs} rowKey={r => r.id}
            columns={[
              { key: 'at', header: 'Observed', cell: r => formatTime(r.observed_at) },
              { key: 'trigger', header: 'Trigger', cell: r => label(r.trigger) },
              { key: 'result', header: 'Result', cell: r => <Badge label={label(r.result)} tone={r.result === 'PASS' ? 'ok' : 'stop'} /> },
              { key: 'count', header: 'Violations', cell: r => r.result === 'ERROR' ? r.error_code : String(r.violations) },
              { key: 'sample', header: 'Sample (identifiers)', cell: r => r.sample.length ? r.sample.map(s => s.length > 20 ? shortId(s) : s).join(', ') : '—' },
              { key: 'digest', header: 'Observation digest', cell: r => r.observation_digest ? <code>{r.observation_digest.slice(0, 12)}</code> : '—' },
            ]} />
        </div>
      )}
    </QueryBoundary>
  );
}

function Alerts() {
  const alerts = usePagedQuery('list_compliance_alerts', { limit: 25 });
  return (
    <Section title="Alerts">
      <p className="cell-sub">One alert per change of state. Alerts are held here; delivery to email or webhook is configured separately and is not yet sent.</p>
      <QueryBoundary query={alerts} label="alerts" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Compliance alerts" rows={d.items} rowKey={a => a.id}
              columns={[
                { key: 'kind', header: 'Change', cell: a => <Badge label={a.kind === 'DRIFT_TO_FAIL' ? 'drifted to fail' : label(a.kind)} tone={a.kind === 'RECOVERED' ? 'ok' : 'stop'} /> },
                { key: 'detail', header: 'Detail', cell: a => a.detail },
                { key: 'at', header: 'Raised', cell: a => formatTime(a.created_at) },
                { key: 'delivery', header: 'Delivery', cell: () => 'Not delivered' },
              ]} />
            <Pagination query={alerts} />
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

function Issues({ onChanged }: { onChanged: () => void }) {
  const [state, setState] = useState('');
  const issues = usePagedQuery('list_grc_issues', { limit: 25, query: state ? { state: state as 'OPEN' } : {} });
  const controls = useCollection('list_grc_controls');
  const risks = useCollection('list_grc_risks');
  const [selected, setSelected] = useState<string | null>(null);
  const refresh = () => { issues.refresh(); onChanged(); };
  return (
    <Section title="Issues">
      <Choice label="Show" name="issue_state" required={false} placeholder="All states" value={state} onChange={setState}
        options={['OPEN', 'REMEDIATION_PLANNED', 'REMEDIATED', 'VERIFIED', 'RISK_ACCEPTED', 'ACCEPTANCE_EXPIRED'].map(s => ({ value: s, label: label(s) }))} />
      <QueryBoundary query={issues} label="issues" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Issues" rows={d.items} rowKey={i => i.id}
              columns={[
                { key: 'title', header: 'Issue', cell: i => <span className="cell-primary">{i.title}<span className="cell-sub">{label(i.source_kind)} · {i.owner_reference}</span></span> },
                { key: 'sev', header: 'Severity', cell: i => label(i.severity) },
                { key: 'state', header: 'State', cell: i => <Badge label={label(i.state)} tone={ISSUE_TONE[i.state] ?? 'neutral'} /> },
                { key: 'due', header: 'Due', cell: i => i.overdue ? <Badge label={`overdue since ${formatTime(i.due_at)}`} tone="stop" /> : formatTime(i.due_at) },
                { key: 'open', header: '', cell: i => <button type="button" onClick={() => setSelected(i.id)}>Open</button> },
              ]} />
            <Pagination query={issues} />
          </>
        )}
      </QueryBoundary>
      {selected && <IssueDetail key={selected} id={selected} onChanged={refresh} />}
      <WriteForm operation="create_grc_issue" label="Raise an issue" onSaved={refresh} describe={i => `${i.title} raised`}
        build={f => ({ source_kind: 'MANUAL', source_id: null, title: text(f, 'title'), severity: text(f, 'severity') as 'LOW', owner_reference: text(f, 'owner'), due_at: time(f, 'due'),
          control_id: nullable(f, 'control'), risk_id: nullable(f, 'risk') })}>
        <Input label="Title" name="title" minLength={3} maxLength={300} />
        <Choice label="Severity" name="severity" options={['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(s => ({ value: s, label: label(s) }))} />
        <Input label="Owner" name="owner" maxLength={500} />
        <Input label="Due" name="due" type="datetime-local" defaultValue={localNow(14)} />
        <Choice label="Control" name="control" required={false} placeholder="None" options={(controls.data?.items ?? []).map(c => ({ value: c.id, label: c.title }))} />
        <Choice label="Risk" name="risk" required={false} placeholder="None" options={(risks.data?.items ?? []).map(r => ({ value: r.id, label: r.title }))} />
      </WriteForm>
    </Section>
  );
}

function IssueDetail({ id, onChanged }: { id: string; onChanged: () => void }) {
  const issue = useQuery('grc_issue', { params: { id } });
  const [kind, setKind] = useState('');
  const refresh = () => { issue.refresh(); onChanged(); };
  return (
    <QueryBoundary query={issue} label="issue" isEmpty={() => false}>
      {i => (
        <div className="panel">
          <h3>{i.title}</h3>
          <Facts items={[
            { term: 'State', value: label(i.state) }, { term: 'Source', value: `${label(i.source_kind)}${i.source_id ? ` ${shortId(i.source_id)}` : ''}` },
            { term: 'Due', value: formatTime(i.due_at) }, { term: 'Raised', value: `${formatTime(i.created_at)} by ${shortId(i.created_by)}` },
          ]} />
          <DataTable caption="History" rows={i.events} rowKey={e => e.id}
            columns={[
              { key: 'kind', header: 'Event', cell: e => label(e.kind) },
              { key: 'note', header: 'Note', cell: e => <span>{e.note}{e.evidence_reference ? <span className="cell-sub">Evidence: {e.evidence_reference}</span> : null}{e.verification_method ? <span className="cell-sub">Verified by {label(e.verification_method)}{e.control_test_run_id ? ` (run ${shortId(e.control_test_run_id)})` : ''}</span> : null}</span> },
              { key: 'who', header: 'By', cell: e => shortId(e.actor_id) },
              { key: 'at', header: 'When', cell: e => formatTime(e.recorded_at) },
            ]} />
          <WriteForm operation="record_grc_issue_event" label="Record progress" params={{ id }} onSaved={() => { setKind(''); refresh(); }} describe={r => `Issue is now ${label(r.state)}`}
            build={f => ({ kind: kind as 'REMEDIATED', note: text(f, 'note'), evidence_reference: nullable(f, 'evidence'),
              verification_method: kind === 'VERIFIED' ? (text(f, 'method') as 'INDEPENDENT_REVIEW') : null, control_test_run_id: kind === 'VERIFIED' ? nullable(f, 'run') : null,
              acceptance_expires_at: kind === 'RISK_ACCEPTED' ? time(f, 'expires') : null })}>
            <Choice label="Event" name="kind" value={kind} onChange={setKind} options={['REMEDIATION_PLANNED', 'REMEDIATED', 'VERIFIED', 'RISK_ACCEPTED', 'REOPENED'].map(k => ({ value: k, label: label(k) }))}
              hint="Verification is by someone other than the remediator, or by a passing control-test run after the remediation. Risk acceptance needs an approver other than the raiser." />
            <Area label="Note" name="note" minLength={10} maxLength={1000} />
            <Input label="Evidence reference" name="evidence" required={kind === 'REMEDIATED'} maxLength={500} hint="Required for a remediation and for a review." />
            {kind === 'VERIFIED' && <Choice label="Verified by" name="method" options={[{ value: 'INDEPENDENT_REVIEW', label: 'Independent review' }, { value: 'CONTROL_TEST', label: 'A passing control-test run' }]} />}
            {kind === 'VERIFIED' && <Input label="Control-test run id" name="run" required={false} maxLength={36} hint="For a control-test verification: the passing run, from the test's run history." />}
            {kind === 'RISK_ACCEPTED' && <Input label="Acceptance expires" name="expires" type="datetime-local" defaultValue={localNow(90)} />}
          </WriteForm>
        </div>
      )}
    </QueryBoundary>
  );
}

function Policies({ onChanged }: { onChanged: () => void }) {
  const policies = usePagedQuery('list_grc_policies', { limit: 25 });
  const controls = useCollection('list_grc_controls');
  const active = useQuery('active_regulatory_package');
  const activeId = active.data?.package?.id;
  const pkg = useQuery('regulatory_package', { params: { id: activeId ?? '' }, enabled: Boolean(activeId) });
  const [basis, setBasis] = useState('');
  const refresh = () => { policies.refresh(); onChanged(); };
  const requirements = pkg.data?.requirements ?? [];
  return (
    <Section title="Policies">
      <QueryBoundary query={policies} label="policies" isEmpty={d => !d.items.length}>
        {d => (
          <>
            <DataTable caption="Policies" rows={d.items} rowKey={p => p.id}
              columns={[
                { key: 'title', header: 'Policy', cell: p => <span className="cell-primary">{p.title}<span className="cell-sub">version {p.version} · {p.owner_reference}</span></span> },
                { key: 'status', header: 'Status', cell: p => <Badge label={p.review_due ? 'review due' : label(p.status)} tone={p.review_due ? 'warn' : p.status === 'PUBLISHED' ? 'ok' : 'neutral'} /> },
                { key: 'ack', header: 'Acknowledged', cell: p => p.status === 'PUBLISHED' ? `${p.acknowledgements}${p.acknowledged_by_me ? ' (including you)' : ''}` : '—' },
                { key: 'review', header: 'Next review', cell: p => p.next_review_at ? formatTime(p.next_review_at) : '—' },
                { key: 'act', header: '', cell: p => (
                  <span>
                    {p.status === 'DRAFT' && <ActionButton operation="decide_grc_policy" label="Publish" input={{ action: 'PUBLISH' }} params={{ id: p.id }} onDone={refresh} />}
                    {p.status === 'PUBLISHED' && !p.acknowledged_by_me && <ActionButton operation="acknowledge_grc_policy" label="Acknowledge" input={undefined as never} params={{ id: p.id }} onDone={refresh} />}
                    {p.status === 'PUBLISHED' && <ActionButton operation="decide_grc_policy" label="Retire" input={{ action: 'RETIRE' }} params={{ id: p.id }} onDone={refresh} />}
                    {p.status !== 'RETIRED' && <button type="button" onClick={() => setBasis(p.policy_key)}>New version</button>}
                  </span>
                ) },
              ]} />
            <Pagination query={policies} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="neutral" title="Publication is a second person's decision"><p>The author of a version cannot publish it. Publishing a new version retires the one in force.</p></NoticeBox>
      <WriteForm key={basis || 'new'} operation="create_grc_policy" label={basis ? 'Draft a new version' : 'Draft a policy'} onSaved={() => { setBasis(''); refresh(); }} describe={p => `${p.title} version ${p.version} drafted`}
        build={f => ({ policy_key: basis || null, title: text(f, 'title'), body: text(f, 'body'), owner_reference: text(f, 'owner'), review_interval_days: Number(text(f, 'interval')),
          control_ids: all(f, 'controls'), requirement_ids: all(f, 'requirements'), change_summary: text(f, 'summary') })}>
        {basis && <p className="cell-sub">New version of policy {shortId(basis)}. <button type="button" onClick={() => setBasis('')}>Draft a separate policy instead</button></p>}
        <Input label="Title" name="title" minLength={3} maxLength={160} />
        <Area label="Policy text" name="body" minLength={20} maxLength={50000} />
        <Input label="Owner" name="owner" maxLength={500} />
        <Input label="Review every (days)" name="interval" type="number" defaultValue="365" />
        <Many legend="Controls it governs" name="controls" options={(controls.data?.items ?? []).map(c => ({ value: c.id, label: c.title }))} />
        <Many legend="Requirements it addresses" name="requirements" hint="From the regulatory package in force." options={requirements.slice(0, 100).map(r => ({ value: r.requirement_id, label: `${r.requirement_id} — ${r.title}` }))} />
        <Input label="Change summary" name="summary" minLength={10} maxLength={500} />
      </WriteForm>
      <WriteForm operation="import_regulatory_framework" label="Create a framework from the regulatory package in force" onSaved={onChanged} describe={f => `${f.name} created with ${f.requirements.length} requirement(s)`}
        build={f => ({ name: text(f, 'name') })}>
        <Input label="Framework name" name="name" minLength={3} maxLength={120} defaultValue="DPDP obligations" hint="Requirements are copied from the package in force so controls can be mapped to them." />
      </WriteForm>
    </Section>
  );
}
