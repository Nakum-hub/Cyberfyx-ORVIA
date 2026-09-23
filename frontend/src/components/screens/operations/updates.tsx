'use client';
import { useState } from 'react';
import { useMutation, useQuery, usePagedQuery } from '../../shared/api.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge, TechnicalDetails } from '../../shared/ui.tsx';

/**
 * M31 Updates.
 *
 * Two separations are the whole point of this screen, and it is built so that
 * neither can be smudged. The first is between being eligible and being allowed
 * to run: eligibility is reported check by check and labelled as what it is,
 * which is permission to fetch and verify.
 *
 * The second is between recovery and rollback. When a release declares an
 * irreversible migration the interface says rollback is not available and why,
 * rather than offering a reassuring button that would not work. An update in
 * flight is listed with everything still outstanding, so an interrupted one is
 * findable rather than merely recorded.
 */

const CHECK_LABELS: Record<string, string> = {
  TRUSTED_ORIGIN: 'Signed by a key this installation trusts',
  SIGNATURE_VALID: 'Signature verifies over these exact claims',
  AUDIENCE_MATCH: 'Issued for a customer installation',
  PROFILE_SUPPORTED: 'This deployment profile is named as supported',
  UPGRADE_PATH_SUPPORTED: 'Can be applied from the installed version',
  ARCHIVE_ENTRIES_SAFE: 'Every archive path is contained and the expansion is plausible',
  NO_PROHIBITED_CHANGE: 'Introduces no egress, model runtime or unknown authority',
  NO_UNSAFE_DOWNGRADE: 'Strictly newer than what is installed',
};
const PLAN_STATE_LABELS: Record<string, Label> = {
  APPROVED: { label: 'Approved', tone: 'info', meaning: 'An approver accepted the recovery mode. Nothing has been done yet.' },
  APPLYING: { label: 'Applying', tone: 'warn', meaning: 'Some steps have succeeded and some have not been recorded.' },
  INTERRUPTED: { label: 'Interrupted', tone: 'stop', meaning: 'The run stopped part way and is still part way. It is not rolled back and it is not applied.' },
  APPLIED: { label: 'Applied', tone: 'ok', meaning: 'Every step succeeded, including boundary revalidation and core regression.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'A step failed and was never retried successfully. The evidence is kept.' },
};
const STEP_LABELS: Record<string, string> = {
  VERIFY_TRUSTED_ORIGIN: 'Verify the signer', VERIFY_ARTIFACT_DIGEST: 'Verify the artifact digest',
  UNPACK_ARTIFACT: 'Unpack the artifact', APPLY_MIGRATIONS: 'Apply migrations',
  RESTART_SERVICES: 'Restart services', REVALIDATE_BOUNDARIES: 'Revalidate the boundaries',
  RUN_CORE_REGRESSION: 'Run the core regression suite',
};
const STEP_STATE_LABELS: Record<string, Label> = {
  RUNNING: { label: 'Running', tone: 'info', meaning: 'Started and not yet concluded.' },
  SUCCEEDED: { label: 'Succeeded', tone: 'ok', meaning: 'Concluded successfully, with named evidence for the claim.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'Concluded unsuccessfully. The record is kept rather than replaced.' },
};

export function Releases() {
  const query = usePagedQuery('list_releases', { limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead
        eyebrow="Operations"
        title="Releases"
        lede="Signed release manifests imported into this installation. A manifest states its own provenance, dependencies and migrations, and is never edited afterwards. Importing one is not applying it."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="imported releases" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Imported release manifests, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'version', header: 'Version', cell: item => (
                  <span className="cell-primary">{item.version}
                    <span className="cell-sub">published {formatTime(item.published_at)}</span>
                  </span>
                ) },
                { key: 'provenance', header: 'Built from', cell: item => (
                  <span className="cell-primary"><code>{item.provenance.source_commit.slice(0, 12)}</code>
                    <span className="cell-sub">{item.provenance.builder_reference}</span>
                  </span>
                ) },
                { key: 'dependencies', header: 'Dependencies', cell: item => String(item.dependency_count) },
                { key: 'migrations', header: 'Migrations', cell: item => item.irreversible_migrations.length
                  ? <span className="cell-primary">{item.migration_count}
                    <span className="cell-sub">{item.irreversible_migrations.length} cannot be undone</span>
                  </span>
                  : <span className="cell-primary">{item.migration_count}<span className="cell-sub">all reversible</span></span> },
                { key: 'imported', header: 'Imported', cell: item => formatTime(item.imported_at) },
                { key: 'eligibility', header: 'Eligibility', cell: item => (
                  <button type="button" onClick={() => setSelected(item.id)}>Check</button>
                ) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      {selected && <Eligibility id={selected} onClose={() => setSelected(null)} />}
      <NoticeBox tone="info" title="What a release manifest can never declare">
        <p>New network egress, a model runtime, and any authority that does not already exist in this product&rsquo;s vocabulary are all refused by the schema before a signature is even considered. A release cannot introduce them, whoever signed it.</p>
      </NoticeBox>
    </>
  );
}

/**
 * Approving a plan. The recovery mode is acknowledged explicitly rather than
 * defaulted, because it is the one decision that cannot be taken back later: a
 * release containing an irreversible migration decides the recovery mode for
 * the whole update, and an operator who did not notice that before starting has
 * no way to undo it afterwards.
 */
function PlanUpdate({ releaseId, mode, eligible, onDone }: {
  releaseId: string; mode: string; eligible: boolean; onDone: () => void;
}) {
  const mutation = useMutation('plan_update', true);
  const [note, setNote] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  if (!eligible) {
    return <p className="cell-sub">This release is not eligible, so there is nothing to approve. The refusing check is named above.</p>;
  }
  return (
    <form className="inline-form" onSubmit={async event => {
      event.preventDefault();
      if (await mutation.run({ approval_note: note, acknowledged_recovery_mode: mode as 'REVERSIBLE' },
        { params: { id: releaseId } })) onDone();
    }}>
      <label><span>Why this update is being approved</span>
        <input value={note} onChange={e => setNote(e.target.value)} required minLength={3} /></label>
      <label>
        <input type="checkbox" checked={acknowledged} onChange={e => setAcknowledged(e.target.checked)} />
        {' '}
        {mode === 'FORWARD_RECOVERY_ONLY'
          ? 'I understand this update cannot be rolled back: recovery is forward-only.'
          : 'I understand the recorded recovery mode for this update is reversible.'}
      </label>
      <button type="submit" disabled={mutation.status === 'pending' || !acknowledged || note.length < 3}>
        Approve this update plan
      </button>
      <p className="cell-sub">
        Approving records a plan. It does not fetch, unpack or run anything: this product applies no artifact,
        and each step is recorded by whoever actually carried it out.
      </p>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

/**
 * Recording a step somebody performed. A step claiming success must name its
 * evidence, which the contract enforces and this form makes visible: the field
 * appears exactly when the claim needs backing.
 */
function RecordStep({ planId, outstanding, onDone }: {
  planId: string; outstanding: readonly string[]; onDone: () => void;
}) {
  const mutation = useMutation('record_update_step', true);
  const [step, setStep] = useState(outstanding[0] ?? '');
  const [state, setState] = useState<'RUNNING' | 'SUCCEEDED' | 'FAILED'>('SUCCEEDED');
  const [evidence, setEvidence] = useState('');
  const [note, setNote] = useState('');
  if (!outstanding.length) return <p className="cell-sub">Every step on this plan has been recorded.</p>;
  return (
    <form className="inline-form" onSubmit={async event => {
      event.preventDefault();
      const done = await mutation.run({
        step: step as 'VERIFY_TRUSTED_ORIGIN', state,
        evidence_reference: state === 'SUCCEEDED' ? evidence : null,
        note,
      }, { params: { id: planId } });
      if (done) { setEvidence(''); setNote(''); onDone(); }
    }}>
      <label><span>Which step</span>
        <select value={step} onChange={e => setStep(e.target.value)}>
          {outstanding.map(name => <option key={name} value={name}>{name.replaceAll('_', ' ').toLowerCase()}</option>)}
        </select></label>
      <label><span>How it went</span>
        <select value={state} onChange={e => setState(e.target.value as typeof state)}>
          <option value="RUNNING">It is running</option>
          <option value="SUCCEEDED">It succeeded</option>
          <option value="FAILED">It failed</option>
        </select></label>
      {state === 'SUCCEEDED' && (
        <label><span>Evidence for the claim that it succeeded</span>
          <input value={evidence} onChange={e => setEvidence(e.target.value)} required
            placeholder="What somebody could check to confirm this" /></label>
      )}
      <label><span>Note</span>
        <input value={note} onChange={e => setNote(e.target.value)} required /></label>
      <button type="submit" disabled={mutation.status === 'pending'}>Record this step</button>
      <p className="cell-sub">
        A step recorded as succeeded must name evidence. This records what a person did; ORVIA did not
        perform the step and did not observe it.
      </p>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

function Eligibility({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery('update_eligibility', { params: { id } });
  return (
    <Section title="Eligibility" aside={<button type="button" onClick={onClose}>Close</button>}>
      <QueryBoundary query={query} label="update eligibility" isEmpty={() => false}>
        {data => (
          <>
            <Facts items={[
              { term: 'Installed version', value: data.installed_version },
              { term: 'Release version', value: data.release_version },
              { term: 'Evaluated', value: formatTime(data.evaluated_at) },
              { term: 'Eligible to fetch and verify', value: data.eligible
                ? <Badge label="Yes" tone="ok" meaning="Every check is satisfied." />
                : <Badge label="No" tone="stop" meaning="At least one check refused it. The refusing check is named below." /> },
            ]} />
            <NoticeBox tone={data.eligible ? 'warn' : 'info'} title="Eligible is not permission to run">
              <p>Being eligible means this release can be fetched and verified. Applying it is a separate act, by a separate authority, that re-runs every one of these checks. Nothing on this screen starts an update.</p>
            </NoticeBox>
            <DataTable
              caption="Every eligibility check, reported separately with its own reason"
              rows={data.checks}
              rowKey={check => check.check}
              columns={[
                { key: 'check', header: 'Check', cell: check => CHECK_LABELS[check.check] ?? check.check },
                { key: 'satisfied', header: 'Satisfied', cell: check => check.satisfied
                  ? <Badge label="Yes" tone="ok" />
                  : <Badge label="No" tone="stop" meaning="This check is why the release is not eligible." /> },
                { key: 'reason', header: 'Why', cell: check => check.reason },
              ]}
            />
            <RecoveryNotice mode={data.recovery_mode} rollback={data.rollback_available} />
            <PlanUpdate releaseId={id} mode={data.recovery_mode} eligible={data.eligible} onDone={query.refresh} />
            <NoticeBox tone="info" title="What this evaluation does and does not mean">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

function RecoveryNotice({ mode, rollback }: { mode: string; rollback: boolean }) {
  if (mode === 'FORWARD_RECOVERY_ONLY') {
    return (
      <NoticeBox tone="stop" title="Recovery for this release is forward only">
        <p>This release declares at least one migration that cannot be undone. Rollback is therefore not offered — not because it is withheld, but because it would not work. If a step fails, the way out is to resolve the failure and record the step again; reversing the applied migrations is not available and attempting it would lose data.</p>
      </NoticeBox>
    );
  }
  return (
    <NoticeBox tone={rollback ? 'ok' : 'unknown'} title="Recovery for this release is reversible">
      <p>No irreversible migration is declared, so this release can be reversed to the previously recorded version. The recovery mode is derived from the manifest and cannot be relaxed afterwards by anyone.</p>
    </NoticeBox>
  );
}

export function UpdatePlans() {
  const query = usePagedQuery('list_update_plans', { limit: 20 });
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <>
      <PageHead
        eyebrow="Operations"
        title="Updates"
        lede="Approved updates and what actually happened to them. An update is applied only when all seven steps have succeeded, including revalidating the boundaries and running the core regression suite — the database refuses to record it otherwise."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="update plans" isEmpty={data => !data.items.length}>
        {data => (
          <>
            {data.items.some(plan => plan.state === 'INTERRUPTED' || plan.state === 'APPLYING') && (
              <NoticeBox tone="warn" title="An update is part way through">
                <p>An update that stopped part way is neither applied nor reversed. It stays in that state, visibly, until the outstanding steps are recorded. Nothing tidies it away and the next attempt does not overwrite its evidence.</p>
              </NoticeBox>
            )}
            <DataTable
              caption="Update plans, in server cursor order"
              rows={data.items}
              rowKey={plan => plan.id}
              columns={[
                { key: 'versions', header: 'Update', cell: plan => (
                  <span className="cell-primary">{plan.from_version} → {plan.to_version}
                    <span className="cell-sub">{shortId(plan.id)}</span>
                  </span>
                ) },
                { key: 'state', header: 'State', cell: plan => <StateBadge dictionary={PLAN_STATE_LABELS} value={plan.state} /> },
                { key: 'outstanding', header: 'Outstanding', cell: plan => plan.outstanding_steps.length
                  ? <span className="cell-primary">{plan.outstanding_steps.length} of 7
                    <span className="cell-sub">{STEP_LABELS[plan.outstanding_steps[0]!] ?? plan.outstanding_steps[0]} next</span>
                  </span>
                  : <span className="cell-sub">Nothing outstanding</span> },
                { key: 'boundaries', header: 'Boundaries revalidated', cell: plan => plan.post_change_verification.boundaries_revalidated
                  ? <Badge label="Yes" tone="ok" />
                  : <Badge label="No" tone="unknown" meaning="The boundaries have not been rechecked since the change." /> },
                { key: 'regression', header: 'Core regression passed', cell: plan => plan.post_change_verification.core_regression_passed
                  ? <Badge label="Yes" tone="ok" />
                  : <Badge label="No" tone="unknown" meaning="The core regression suite has not passed since the change." /> },
                { key: 'rollback', header: 'Rollback', cell: plan => plan.rollback_available
                  ? <Badge label="Available" tone="ok" />
                  : <Badge label="Not available" tone="neutral" meaning="An irreversible migration was declared, so reversing this would not work." /> },
                { key: 'steps', header: 'Ledger', cell: plan => (
                  <button type="button" onClick={() => setSelected(plan.id)}>Open</button>
                ) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      {selected && <Ledger id={selected} onClose={() => setSelected(null)} />}
    </>
  );
}

function Ledger({ id, onClose }: { id: string; onClose: () => void }) {
  const query = useQuery('update_plan', { params: { id } });
  return (
    <Section title="What actually happened" aside={<button type="button" onClick={onClose}>Close</button>}>
      <QueryBoundary query={query} label="update ledger" isEmpty={() => false}>
        {data => (
          <>
            <Facts items={[
              { term: 'From', value: data.from_version },
              { term: 'To', value: data.to_version },
              { term: 'Approved', value: formatTime(data.approved_at) },
              { term: 'Approved by', value: shortId(data.approved_by) },
            ]} />
            <p>{data.approval_note}</p>
            {data.steps.length === 0
              ? <p className="cell-sub">No step has been recorded yet.</p>
              : (
                <DataTable
                  caption="Every recorded step, in the order it was appended. Nothing here is edited or removed."
                  rows={data.steps}
                  rowKey={step => step.id}
                  columns={[
                    { key: 'step', header: 'Step', cell: step => STEP_LABELS[step.step] ?? step.step },
                    { key: 'state', header: 'Result', cell: step => <StateBadge dictionary={STEP_STATE_LABELS} value={step.state} /> },
                    { key: 'evidence', header: 'Evidence', cell: step => step.evidence_reference ?? <span className="cell-sub">None named</span> },
                    { key: 'note', header: 'Note', cell: step => step.note },
                    { key: 'recorded', header: 'Recorded', cell: step => formatTime(step.recorded_at) },
                  ]}
                />
              )}
            <RecordStep planId={id} outstanding={data.outstanding_steps} onDone={query.refresh} />
            {data.outstanding_steps.length > 0 && (
              <TechnicalDetails
                summary={`${data.outstanding_steps.length} steps still outstanding`}
                items={data.outstanding_steps.map(step => ({ term: STEP_LABELS[step] ?? step, value: 'Not yet succeeded' }))}
              />
            )}
            <NoticeBox tone={data.rollback_available ? 'info' : 'warn'} title="How to recover from here">
              <p>{data.recovery_instruction}</p>
            </NoticeBox>
            <NoticeBox tone="info" title="What this ledger does and does not mean">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

export function InstallationVersions() {
  const query = usePagedQuery('installation_versions', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Operations"
        title="Installed versions"
        lede="Every version this installation has actually reached, each written only after the update that produced it recorded all seven successful steps."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="installed versions" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded installed versions, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'version', header: 'Version', cell: item => item.version },
                { key: 'applied', header: 'Recorded', cell: item => formatTime(item.applied_at) },
                { key: 'plan', header: 'From update', cell: item => item.plan_id
                  ? <a href="/workspace/updates">{shortId(item.plan_id)}</a>
                  : <span className="cell-sub">Not from a recorded update</span> },
                { key: 'note', header: 'Note', cell: item => item.note },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="Why a version appears here late rather than early">
        <p>A row is written when an update finishes, not when it starts. An update that is part way through does not move this list, because an installation that has restarted its services is not yet an installation whose boundaries have been rechecked.</p>
      </NoticeBox>
    </>
  );
}
