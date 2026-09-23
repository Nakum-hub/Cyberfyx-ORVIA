'use client';
import { useQuery, usePagedQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { formatTime, shortId, type Label } from '../../shared/state-labels.ts';
import { DataTable, Facts, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../../shared/ui.tsx';

/**
 * M15 Retention Management.
 *
 * The screen is built around one refusal: it never presents "nothing is stopping
 * you" as permission. A copy with no recorded basis is shown as blocked, with the
 * missing basis named, because absence of a rule is not authority to delete.
 */

const BLOCKER_COPY: Record<string, string> = {
  NO_RECORDED_BASIS: 'No reviewed retention basis is recorded for this copy. Absence of a rule is not permission to delete.',
  ACTIVE_LEGAL_HOLD: 'An active legal hold covers this copy. A hold outranks any retention schedule.',
  MINIMUM_NOT_ELAPSED: 'The recorded minimum retention period has not yet elapsed.',
  MAXIMUM_NOT_REACHED: 'No recorded constraint has yet reached the point where deletion is permitted.',
  UNRESOLVED_CONSTRAINT_CONFLICT: 'Recorded constraints disagree. A reviewer must decide which governs — the longest duration is not applied automatically.',
  AWAITING_QUARANTINE_RECONCILIATION: 'This copy was restored into quarantine. Its current restrictions must be reconciled before anything else happens to it.',
  ALREADY_TOMBSTONED: 'This copy has already been erased and carries a tombstone.',
};
const RESULT_LABELS: Record<string, Label> = {
  SUPPRESSED: { label: 'Suppressed', tone: 'ok', meaning: 'Processing was restricted and the record names its evidence.' },
  DELETED: { label: 'Deleted', tone: 'ok', meaning: 'The copy was deleted and the record names its evidence.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'The attempt failed. Assume the copy is unchanged.' },
  EFFECT_UNKNOWN: { label: 'Effect unknown', tone: 'unknown', meaning: 'An attempt was made but the result could not be observed. This is not erasure.' },
  NOT_SUPPORTED: { label: 'Not supported', tone: 'warn', meaning: 'No supported path exists to act on this copy.' },
  RESTORED_TO_QUARANTINE: { label: 'Restored to quarantine', tone: 'warn', meaning: 'Brought back from a backup into quarantine, pending reconciliation of current restrictions.' },
};
const COPY_CLASS_LABELS: Record<string, string> = {
  DATASET: 'Live dataset', FIELD: 'Live field', DERIVED_COPY: 'Derived copy', EXPORT: 'Export', BACKUP_COPY: 'Backup copy',
};

/** Eligibility for one copy, embedded in the data-asset detail screen. */
export function RetentionEligibility({ id }: { id: string }) {
  const query = useQuery('asset_eligibility', { params: { id } });
  return (
    <Section title="Can this copy be deleted?">
      <QueryBoundary query={query} label="retention eligibility" isEmpty={() => false}>
        {data => (
          <>
            <NoticeBox
              tone={data.eligible ? 'ok' : 'stop'}
              title={data.eligible ? 'A reviewed constraint permits deletion of this copy' : 'Deletion of this copy is not permitted'}
            >
              <ul>{data.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
            </NoticeBox>
            {data.blockers.length > 0 && (
              <DataTable
                caption="What is blocking deletion"
                rows={data.blockers.map(blocker => ({ blocker }))}
                rowKey={row => row.blocker}
                columns={[
                  { key: 'blocker', header: 'Blocker', cell: row => row.blocker.replaceAll('_', ' ').toLowerCase() },
                  { key: 'why', header: 'What it means', cell: row => BLOCKER_COPY[row.blocker] ?? row.blocker },
                ]}
              />
            )}
            <Facts items={[
              { term: 'Evaluated', value: formatTime(data.evaluated_at) },
              { term: 'Recorded constraints', value: data.applicable_constraint_ids.length ? String(data.applicable_constraint_ids.length) : 'None' },
              { term: 'Active legal holds', value: data.active_hold_ids.length ? String(data.active_hold_ids.length) : 'None' },
              { term: 'Governing constraint', value: data.governing_constraint_id ? shortId(data.governing_constraint_id) : 'None — nothing currently permits deletion' },
              { term: 'Earliest permissible deletion', value: data.earliest_deletion_at ? formatTime(data.earliest_deletion_at) : 'Not determinable from what is recorded' },
            ]} />
            <NoticeBox tone="info" title="What this evaluation can and cannot see">
              <ul>{data.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
            </NoticeBox>
          </>
        )}
      </QueryBoundary>
    </Section>
  );
}

export function RetentionConstraints() {
  const query = usePagedQuery('list_constraints', { limit: 20 });
  const directory = useDirectory(['purposes']);
  return (
    <>
      <PageHead
        eyebrow="Retention"
        title="Retention constraints"
        lede="What each copy must or may be kept for, and on whose authority. A constraint is always recorded from a reviewed source; ORVIA never infers one from how data is used."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded retention constraints" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded retention constraints, in server cursor order"
              rows={data.items}
              rowKey={item => item.id}
              columns={[
                { key: 'asset', header: 'Copy', cell: item => <a className="cell-primary" href={`/workspace/inventory/${item.data_asset_id}`}>{shortId(item.data_asset_id)}</a> },
                { key: 'purpose', header: 'Processing context', cell: item => directory.purposeName(item.purpose_id) },
                { key: 'basis', header: 'Basis', cell: item => item.basis.replaceAll('_', ' ').toLowerCase() },
                { key: 'window', header: 'Period', cell: item => [
                  item.minimum_days === null ? null : `at least ${item.minimum_days} days`,
                  item.maximum_days === null ? null : `at most ${item.maximum_days} days`,
                ].filter(Boolean).join(', ') },
                { key: 'trigger', header: 'Counted from', cell: item => item.trigger.replaceAll('_', ' ').toLowerCase() },
                { key: 'owner', header: 'Owner', cell: item => item.owner_reference },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}

export function LegalHolds() {
  const query = usePagedQuery('list_holds', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Retention"
        title="Legal holds"
        lede="Holds preserve named copies against deletion. Each names the exact copies it covers, the authority it rests on and the criterion for releasing it. There is no hold-everything setting."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded legal holds" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded legal holds, in server cursor order"
              rows={data.items}
              rowKey={hold => hold.id}
              columns={[
                { key: 'authority', header: 'Authority', cell: hold => (
                  <span className="cell-primary">{hold.authority_reference}<span className="cell-sub">{shortId(hold.id)}</span></span>
                ) },
                { key: 'reason', header: 'Reason', cell: hold => hold.reason },
                { key: 'copies', header: 'Copies covered', cell: hold => String(hold.data_asset_ids.length) },
                { key: 'state', header: 'State', cell: hold => hold.state === 'ACTIVE' ? 'Active' : 'Released' },
                { key: 'review', header: 'Review due', cell: hold => formatTime(hold.review_at) },
                { key: 'released', header: 'Released', cell: hold => hold.released_at
                  ? <span title={hold.release_reason ?? undefined}>{formatTime(hold.released_at)}</span>
                  : <span className="cell-sub">—</span> },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="A released hold stays released">
        <p>Releasing a hold is terminal. Re-imposing one requires a new hold with its own authority reference, so each period of preservation is separately justified and separately auditable.</p>
      </NoticeBox>
    </>
  );
}

export function RetentionOutcomes() {
  const query = usePagedQuery('list_retention_outcomes', { limit: 20 });
  return (
    <>
      <PageHead
        eyebrow="Retention"
        title="What happened to each copy"
        lede="Recorded outcomes, separated by copy class. A live store, a derived copy and a backup differ in what can be reached and what can be verified, so they are never summed together."
      />
      <Freshness query={query} />
      <QueryBoundary query={query} label="recorded retention outcomes" isEmpty={data => !data.items.length}>
        {data => (
          <>
            <DataTable
              caption="Recorded retention outcomes, in server cursor order"
              rows={data.items}
              rowKey={outcome => `${outcome.data_asset_id}-${outcome.recorded_at}`}
              columns={[
                { key: 'asset', header: 'Copy', cell: outcome => <a className="cell-primary" href={`/workspace/inventory/${outcome.data_asset_id}`}>{shortId(outcome.data_asset_id)}</a> },
                { key: 'class', header: 'Copy class', cell: outcome => COPY_CLASS_LABELS[outcome.copy_class] ?? outcome.copy_class },
                { key: 'result', header: 'Outcome', cell: outcome => <StateBadge dictionary={RESULT_LABELS} value={outcome.result} /> },
                { key: 'evidence', header: 'Evidence', cell: outcome => outcome.evidence_reference ?? 'None — nothing was verified' },
                { key: 'when', header: 'Recorded', cell: outcome => formatTime(outcome.recorded_at) },
              ]}
            />
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
      <NoticeBox tone="info" title="Why a backup is never marked erased">
        <p>A backup cannot be independently read back, so its erasure cannot be observed. ORVIA records an unknown effect for backup copies rather than a completion, and a future expiry date is not accepted as current proof of erasure.</p>
      </NoticeBox>
    </>
  );
}
