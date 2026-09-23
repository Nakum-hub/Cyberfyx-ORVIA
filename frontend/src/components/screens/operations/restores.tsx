'use client';
import { useState } from 'react';
import { usePagedQuery, useMutation } from '../../shared/api.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';

/**
 * M32 Monitoring — backup declarations and restore quarantine (FR-M32-03).
 *
 * This page is not a backup console and will not become one. ORVIA does not
 * make, hold, encrypt or read the archive; the customer's own tooling does,
 * under the customer's own key. Two things are shown, and both are things only
 * this product can say:
 *
 *   - what this installation saw at the moment a snapshot was declared, and
 *   - which consent decisions have changed since, each of which a named person
 *     has to decide before the restore may resume.
 *
 * The release control is deliberately dull and deliberately hard to reach: it
 * is disabled while anything is outstanding, and it sits behind a capability
 * the person who started the restore does not need to hold. A restore that
 * quietly reinstates a withdrawal is the failure this whole page exists for,
 * and a one-click "resume" would reintroduce it.
 */

const STATE_LABELS: Record<string, Label> = {
  QUARANTINED: { label: 'In quarantine', tone: 'warn', meaning: 'Restored data is present but must not resume until every consent decision that changed since the snapshot has been decided by a named person.' },
  RELEASED: { label: 'Released', tone: 'ok', meaning: 'Every changed decision was decided and a person holding the release authority let this restore resume. It does not mean the archive was verified.' },
};
const DECISION_LABELS: Record<string, Label> = {
  CURRENT_STATE_PREVAILS: { label: 'Current state stands', tone: 'ok', meaning: 'The decision as it is today stands. A withdrawal made after the snapshot is not undone.' },
  RESTORED_STATE_PREVAILS: { label: 'Restored state stands', tone: 'stop', meaning: 'Somebody decided the state in the archive prevails over the current one. This is the decision that should be hard to make quietly, and it is attributed.' },
};
const CONSENT_LABELS: Record<string, Label> = {
  GRANTED: { label: 'Granted', tone: 'ok', meaning: 'Consent stood at this point.' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'stop', meaning: 'Consent had been withdrawn at this point.' },
  NOT_GIVEN: { label: 'Not given', tone: 'neutral', meaning: 'No decision is recorded at this point.' },
};

/** One changed decision, and the person who takes responsibility for it. */
function Acknowledge({ restoreId, principalId, purposeId, onDone }: {
  restoreId: string; principalId: string; purposeId: string; onDone: () => void;
}) {
  const mutation = useMutation('acknowledge_conflict', true);
  const [decision, setDecision] = useState<'CURRENT_STATE_PREVAILS' | 'RESTORED_STATE_PREVAILS'>('CURRENT_STATE_PREVAILS');
  const [basis, setBasis] = useState('');
  return (
    <form
      className="inline-form"
      onSubmit={async event => {
        event.preventDefault();
        if (await mutation.run({ principal_id: principalId, purpose_id: purposeId, decision, basis }, { params: { id: restoreId } })) onDone();
      }}
    >
      <label>
        <span>Which state stands</span>
        <select value={decision} onChange={event => setDecision(event.target.value as typeof decision)}>
          <option value="CURRENT_STATE_PREVAILS">The current state stands</option>
          <option value="RESTORED_STATE_PREVAILS">The restored state stands</option>
        </select>
      </label>
      <label>
        <span>Why</span>
        <input value={basis} onChange={event => setBasis(event.target.value)} required minLength={3}
          placeholder="Recorded against your name and kept" />
      </label>
      <button type="submit" disabled={mutation.status === 'pending' || !basis}>Record this decision</button>
      {decision === 'RESTORED_STATE_PREVAILS' && (
        <p className="cell-sub">This records that the archived answer prevails over the current one. It is attributed to you and kept.</p>
      )}
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

function Release({ run, onDone }: { run: { id: string; outstanding: number }; onDone: () => void }) {
  const mutation = useMutation('release_restore', true);
  if (run.outstanding > 0) {
    return (
      <p className="cell-sub">
        {run.outstanding} changed {run.outstanding === 1 ? 'decision has' : 'decisions have'} not been decided, so this
        restore cannot be released. The control is not hidden; it is refused, and it would be refused by the server too.
      </p>
    );
  }
  return (
    <>
      <button
        type="button"
        disabled={mutation.status === 'pending'}
        onClick={async () => { if (await mutation.run(undefined, { params: { id: run.id } })) onDone(); }}
      >
        Release this restore from quarantine
      </button>
      <p className="cell-sub">Releasing lets the restored data resume. It does not re-grant anything: a decision resolved as “current state stands” leaves the withdrawal standing.</p>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </>
  );
}

export function RestoresScreen() {
  const runs = usePagedQuery('list_restore_runs', { limit: 25 });
  const snapshots = usePagedQuery('list_backup_snapshots', { limit: 25 });
  return (
    <>
      <PageHead
        eyebrow="Installation"
        title="Backups and restores"
        lede="ORVIA does not make, hold or read your archive — your own tooling does, under your own key. What it records is what this installation saw when a snapshot was declared, and what it refuses is a restore that resumes on consent somebody has since withdrawn."
      />
      <NoticeBox tone="info" title="What a declared snapshot is, and is not">
        <p>A declaration is this installation’s statement of what it saw at a moment in time, digested so it can be checked later. It is not evidence that an archive exists, that it can be read, or that it is encrypted — none of which this product observed.</p>
      </NoticeBox>

      <Section title="Restores waiting to resume">
        <Freshness query={runs} />
        <QueryBoundary query={runs} label="restore runs" isEmpty={data => !data.items.length}>
          {data => (
            <>
              {data.items.map(run => (
                <Section key={run.id} title={`Restore ${shortId(run.id)}`}>
                  <p className="cell-sub">
                    From the snapshot declared {formatTime(run.snapshot_taken_at)} · <StateBadge dictionary={STATE_LABELS} value={run.state} />
                    {run.released_at && <> · released {formatTime(run.released_at)}</>}
                  </p>
                  <p>{run.note}</p>
                  {run.conflicts.length === 0
                    ? <p className="cell-sub">No consent decision has changed since this snapshot was taken, so there is nothing to reconcile.</p>
                    : (
                      <DataTable
                        caption="Consent decisions that changed between the snapshot and now"
                        rows={run.conflicts}
                        rowKey={conflict => `${conflict.principal_id}:${conflict.purpose_id}`}
                        columns={[
                          { key: 'who', header: 'Person and purpose', cell: conflict => (
                            <span className="cell-primary">{shortId(conflict.principal_id)}
                              <span className="cell-sub">purpose {shortId(conflict.purpose_id)}</span>
                            </span>
                          ) },
                          { key: 'then', header: 'At the snapshot', cell: conflict => <StateBadge dictionary={CONSENT_LABELS} value={conflict.state_at_snapshot} /> },
                          { key: 'now', header: 'Now', cell: conflict => (
                            <span className="cell-primary"><StateBadge dictionary={CONSENT_LABELS} value={conflict.state_now} />
                              <span className="cell-sub">{conflict.decisions_since_snapshot} decision(s) since</span>
                            </span>
                          ) },
                          { key: 'decision', header: 'Decided', cell: conflict => conflict.decision
                            ? <span className="cell-primary"><StateBadge dictionary={DECISION_LABELS} value={conflict.decision} />
                              <span className="cell-sub">by {shortId(conflict.acknowledged_by!)} on {formatTime(conflict.acknowledged_at!)}</span>
                            </span>
                            : <Badge label="Outstanding" tone="warn" meaning="Nobody has decided this yet, and the restore cannot resume until somebody does." /> },
                          { key: 'act', header: '', cell: conflict => conflict.decision || run.state === 'RELEASED'
                            ? null
                            : <Acknowledge restoreId={run.id} principalId={conflict.principal_id} purposeId={conflict.purpose_id} onDone={runs.refresh} /> },
                        ]}
                      />
                    )}
                  {run.state === 'QUARANTINED' && <Release run={run} onDone={runs.refresh} />}
                  <NoticeBox tone="info" title="What this reconciliation covers">
                    <ul>{run.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
                  </NoticeBox>
                </Section>
              ))}
              <Pagination query={runs} />
            </>
          )}
        </QueryBoundary>
      </Section>

      <Section title="Declared snapshots">
        <QueryBoundary query={snapshots} label="declared snapshots" isEmpty={data => !data.items.length}>
          {data => (
            <>
              <DataTable
                caption="Snapshot declarations, each with what this installation counted at the time"
                rows={data.items}
                rowKey={item => item.id}
                columns={[
                  { key: 'taken', header: 'Declared', cell: item => formatTime(item.taken_at) },
                  { key: 'covers', header: 'Covers', cell: item => item.covers.join(', ') },
                  { key: 'counts', header: 'What was counted', cell: item => (
                    <ul>{item.counts.map(count => <li key={count.domain}>{count.domain}: {count.rows}</li>)}</ul>
                  ) },
                  { key: 'key', header: 'Key held by you at', cell: item => (
                    <span className="cell-primary">{item.key_reference}
                      <span className="cell-sub">a reference to where you keep the key, never the key</span>
                    </span>
                  ) },
                  { key: 'digest', header: 'Digest', cell: item => <span className="cell-sub">{item.state_digest.slice(0, 16)}…</span> },
                  { key: 'note', header: 'Note', cell: item => item.note },
                ]}
              />
              <Pagination query={snapshots} />
            </>
          )}
        </QueryBoundary>
      </Section>
    </>
  );
}
