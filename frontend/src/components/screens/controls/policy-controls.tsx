'use client';
import { useState, type FormEvent } from 'react';
import { useCollection, useMutation, useNow, usePagedQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { hasCapability, type StaffSession } from '../../shared/session-context.tsx';
import { CONNECTOR_LABELS, CONNECTOR_NOTES, DECISION_LABELS, formatAge, formatTime, shortId } from '../../shared/state-labels.ts';
import { Badge, Facts, FailureState, Flow, Freshness, Metric, PageHead, Pagination, QueryBoundary, StateBadge, TechnicalDetails } from '../../shared/ui.tsx';
import { Select } from './configuration.tsx';

/* ================================================================== *
 * Decision preview
 * ================================================================== */

export function PolicyPreview({ session }: { session: StaffSession }) {
  const principals = useCollection('list_principals');
  const purposes = useCollection('list_purposes');
  const systems = useCollection('list_systems');
  const mutation = useMutation('evaluate', false);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    await mutation.run({
      principal_id: String(data.get('principal')), purpose_id: String(data.get('purpose')),
      system_id: String(data.get('system')), action: data.get('action') as 'MARKETING_SEND' | 'ORDER_SERVICE_SEND',
    });
  };
  return (
    <>
      <PageHead
        eyebrow="Privacy controls"
        title="Decision preview"
        lede="Ask current authority how it would decide a proposed processing action. A preview is not send authorization: actual admission always rechecks current authority at the consumption boundary."
      />
      <QueryBoundary query={principals} label="preview principals">{principalPage =>
        <QueryBoundary query={purposes} label="preview purposes">{purposePage =>
          <QueryBoundary query={systems} label="preview systems">{systemPage =>
            <form className="panel" onSubmit={submit}>
              <Select label="Preview principal" name="principal" options={principalPage.items.map(item => ({ id: item.id, name: item.display_name }))} />
              <Select label="Preview purpose" name="purpose" options={purposePage.items.map(item => ({ id: item.id, name: item.name }))} />
              <Select label="Preview system" name="system" options={systemPage.items.map(item => ({ id: item.id, name: CONNECTOR_LABELS[item.name] ?? item.name }))} />
              <Select label="Preview action" name="action" options={[{ id: 'MARKETING_SEND', name: 'Marketing' }, { id: 'ORDER_SERVICE_SEND', name: 'Separate order service' }]} />
              <button type="submit" className="primary" disabled={!hasCapability(session, 'policy.preview') || mutation.status === 'pending'}>Evaluate current policy preview</button>
            </form>
          }</QueryBoundary>
        }</QueryBoundary>
      }</QueryBoundary>
      {mutation.failure ? <FailureState failure={mutation.failure} /> : null}
      {mutation.result ? (
        <section className="panel" role="status">
          <h3>Preview result</h3>
          <StateBadge dictionary={DECISION_LABELS} value={mutation.result.decision} large />
          <p style={{ marginTop: 'var(--s3)' }}>{mutation.result.reason_codes.join(', ')}</p>
          <Facts tight items={[
            { term: 'Consent epoch', value: mutation.result.consent_epoch ?? 'unavailable' },
            { term: 'Policy version', value: <span className="mono">{mutation.result.policy_version_id ?? 'unavailable'}</span> },
            { term: 'Evaluated at', value: formatTime(mutation.result.evaluated_at) },
          ]} />
          <p style={{ marginTop: 'var(--s3)', marginBottom: 0 }}>Preview only; no message was sent and no future send is authorized.</p>
        </section>
      ) : null}
    </>
  );
}

/* ================================================================== *
 * Privacy control map
 * ================================================================== */

export function ControlMap() {
  const query = usePagedQuery('control_map', { limit: 20 });
  const directory = useDirectory(['purposes', 'systems']);
  const now = useNow(30_000);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <>
      <PageHead
        eyebrow="Privacy controls"
        title="Privacy control map"
        lede="Declared privacy-control relationships: which purpose is enforced in which system, against which exact target record, and what ORVIA last observed there. ORVIA does not discover these relationships automatically — they are declared through configuration."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="declared control relationships" isEmpty={data => !data.edges.length}>
        {data => {
          const current = data.edges.filter(edge => edge.observed_restrict !== null).length;
          const stale = data.edges.filter(edge => edge.observed_restrict === null && edge.as_of !== null).length;
          const never = data.edges.length - current - stale;
          return (
            <>
              <div className="grid-3" style={{ marginBottom: 'var(--s5)' }}>
                <Metric label="Current proof on this page" value={current} tone={current ? 'ok' : 'warn'}
                  note="A fresh, current-generation scoped read established the target state." />
                <Metric label="Observed, but not current proof" value={stale} tone={stale ? 'warn' : 'neutral'}
                  note="An observation exists but is expired, of another generation, or not an independent read." />
                <Metric label="Never independently read" value={never} tone={never ? 'warn' : 'ok'}
                  note="Declared as a relationship; ORVIA has never observed this exact target for it." />
              </div>
              {data.edges.map(edge => {
                const system = directory.system(edge.system_id);
                const key = edge.resource_id;
                const open = expanded === key;
                // `observed_restrict` is non-null only for a fresh,
                // current-generation scoped read. An `as_of` without it means an
                // observation exists that no longer counts as current proof, and
                // the two cases are never collapsed into one label.
                const proof = edge.observed_restrict !== null ? 'CURRENT' : edge.as_of ? 'NOT_CURRENT' : 'NONE';
                const tone = proof === 'CURRENT' ? (edge.observed_restrict ? 'ok' : 'stop') : 'warn';
                const verdict = proof === 'CURRENT'
                  ? (edge.observed_restrict ? 'Restriction verified' : 'Restriction not in place')
                  : proof === 'NOT_CURRENT' ? 'No current proof' : 'Never observed';
                const verdictMeaning = proof === 'CURRENT'
                  ? 'A fresh scoped read of this exact target and generation established this state.'
                  : proof === 'NOT_CURRENT'
                    ? 'An observation exists for this target, but it is outside its freshness window, refers to another target generation, or is not an independent scoped read. It does not count as current proof.'
                    : 'ORVIA has not independently read this exact target for this relationship.';
                return (
                  <article className="panel" key={key}>
                    <div className="row row-between">
                      <div style={{ minWidth: 0 }}>
                        <p className="eyebrow" style={{ margin: 0 }}>{directory.purposeName(edge.purpose_id)}</p>
                        <h4 style={{ margin: '2px 0 0', fontSize: 16 }}>{directory.systemName(edge.system_id)}</h4>
                      </div>
                      <div className="row">
                        <Badge label={verdict} tone={tone} meaning={verdictMeaning} large />
                        <button type="button" className="quiet" aria-expanded={open} onClick={() => setExpanded(open ? null : key)}>
                          {open ? 'Hide relationship' : 'Show relationship'}
                        </button>
                      </div>
                    </div>
                    <p className="muted" style={{ margin: 'var(--s2) 0 0', fontSize: 13 }}>
                      {edge.declared_restrict ? 'Declares an automated restriction' : 'Declares no automated restriction'} · capability {edge.capability_version} ·{' '}
                      {edge.as_of ? <>last read {formatAge(edge.as_of, now)} ({formatTime(edge.as_of)})</> : 'never read'}
                    </p>
                    {open ? (
                      <div style={{ marginTop: 'var(--s4)' }}>
                        <Flow steps={[
                          { kind: 'Purpose', name: directory.purposeName(edge.purpose_id), note: 'The processing being controlled.', tone: 'info' },
                          { kind: 'System', name: directory.systemName(edge.system_id), note: system ? CONNECTOR_NOTES[system.connector] : 'Connector not resolved from the configuration directory.', tone: 'info' },
                          { kind: 'Control', name: 'Marketing restriction', note: `Declared restriction capability ${String(edge.declared_restrict)}, capability version ${edge.capability_version}.`, tone: edge.declared_restrict ? 'info' : 'warn' },
                          { kind: 'Target record', name: <span className="mono">{shortId(edge.resource_id)}</span>, note: 'One exact synthetic record. ORVIA never operates on a set.', tone: 'neutral' },
                          {
                            kind: 'Last independent read',
                            name: verdict,
                            note: edge.as_of ? `${verdictMeaning} Last read ${formatAge(edge.as_of, now)} · ${formatTime(edge.as_of)}.` : verdictMeaning,
                            tone,
                          },
                        ]} />
                        <TechnicalDetails items={[
                          { term: 'Purpose', value: edge.purpose_id },
                          { term: 'System', value: edge.system_id },
                          { term: 'Target record', value: edge.resource_id },
                          { term: 'Declared restriction', value: String(edge.declared_restrict) },
                          { term: 'Capability version', value: edge.capability_version },
                          { term: 'observed_restrict', value: String(edge.observed_restrict) },
                          { term: 'as_of', value: edge.as_of ?? 'none' },
                          { term: 'Current-proof rule', value: 'observed_restrict is non-null only for a SCOPED_READ of the current target generation, inside its freshness window, in a definite state.' },
                        ]} />
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </>
          );
        }}
      </QueryBoundary>
      <Pagination query={query} />
    </>
  );
}
