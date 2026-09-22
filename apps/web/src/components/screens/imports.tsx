'use client';
import { useState } from 'react';
import { usePagedQuery, useMutation } from '../shared/api.ts';
import { formatTime, shortId, type Label } from '../shared/state-labels.ts';
import { Badge, DataTable, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, Section, StateBadge } from '../shared/ui.tsx';

/**
 * M29 Customer Onboarding — local imports (FR-M29-04).
 *
 * There is one import path here and it accepts one declared row shape. There is
 * no file picker, because there is no parser: the contract schema is the parser,
 * and a second format would be a reviewed contract change rather than something
 * an operator configures. OPEN-11 asks for exactly that.
 *
 * The page never presents imported rows as something ORVIA found. Everything
 * that reaches the inventory from here is a customer statement — asserted,
 * unreviewed, carrying no observation time — and the banner says so in the same
 * words the contract enforces. An inventory exported from a CRM describes what
 * that system's operator believed at a moment; it is not evidence that any
 * restriction is in force, and treating it as such is the failure this whole
 * path is shaped to prevent.
 */

const STATE_LABELS: Record<string, Label> = {
  QUARANTINED: { label: 'In quarantine', tone: 'warn', meaning: 'Submitted and previewed. Nothing has reached the inventory, and nothing will until every conflict is decided and somebody applies it.' },
  APPLIED: { label: 'Applied', tone: 'ok', meaning: 'The rows became asserted, unreviewed inventory. That is a record of what the customer stated, not of anything this product observed.' },
  PURGED: { label: 'Purged', tone: 'neutral', meaning: 'The quarantined rows were deleted. This record remains so a purge stays distinguishable from an import that never arrived.' },
};
const CONFLICT_LABELS: Record<string, Label> = {
  NEW: { label: 'Nothing to collide with', tone: 'ok', meaning: 'No asset with this name exists in this system, so importing it adds something new.' },
  MATCHES_EXISTING: { label: 'Already recorded', tone: 'info', meaning: 'An identical asset is already recorded. Importing it again would say the same thing twice.' },
  CONFLICTS_WITH_EXISTING: { label: 'Disagrees with the inventory', tone: 'stop', meaning: 'An asset with this name exists in this system and says something different. Applied blindly this would create a second record of one stored thing.' },
};

function Decide({ batchId, lineNumber, onDone }: { batchId: string; lineNumber: number; onDone: () => void }) {
  const mutation = useMutation('decide_import_row', true);
  const [decision, setDecision] = useState<'IMPORT_AS_NEW' | 'SKIP_ROW'>('SKIP_ROW');
  return (
    <form
      className="inline-form"
      onSubmit={async event => {
        event.preventDefault();
        if (await mutation.run({ line_number: lineNumber, decision }, { params: { id: batchId } })) onDone();
      }}
    >
      <label>
        <span>What to do</span>
        <select value={decision} onChange={event => setDecision(event.target.value as typeof decision)}>
          <option value="SKIP_ROW">Skip this row</option>
          <option value="IMPORT_AS_NEW">Import it as a separate asset</option>
        </select>
      </label>
      <button type="submit" disabled={mutation.status === 'pending'}>Record this decision</button>
      {mutation.failure && <FailureState failure={mutation.failure} />}
    </form>
  );
}

function Settle({ batch, onDone }: { batch: { id: string; undecided_conflicts: number }; onDone: () => void }) {
  const apply = useMutation('apply_import', true);
  const purge = useMutation('purge_import', true);
  const [reason, setReason] = useState('');
  return (
    <>
      {batch.undecided_conflicts > 0 ? (
        <p className="cell-sub">
          {batch.undecided_conflicts} row(s) disagree with the inventory and nobody has decided what to do about them,
          so this import cannot be applied. The control is not hidden; it is refused, and the server would refuse it too.
        </p>
      ) : (
        <button type="button" disabled={apply.status === 'pending'}
          onClick={async () => { if (await apply.run(undefined, { params: { id: batch.id } })) onDone(); }}>
          Apply these rows as asserted inventory
        </button>
      )}
      {apply.failure && <FailureState failure={apply.failure} />}
      <form
        className="inline-form"
        onSubmit={async event => {
          event.preventDefault();
          if (await purge.run({ reason }, { params: { id: batch.id } })) onDone();
        }}
      >
        <label>
          <span>Or purge these rows, and say why</span>
          <input value={reason} onChange={event => setReason(event.target.value)} required minLength={10}
            placeholder="The rows are deleted; the record that they arrived is kept" />
        </label>
        <button type="submit" disabled={purge.status === 'pending' || reason.length < 10}>Purge</button>
      </form>
      {purge.failure && <FailureState failure={purge.failure} />}
    </>
  );
}

export function ImportsScreen() {
  const query = usePagedQuery('list_imports', { limit: 25 });
  return (
    <>
      <PageHead
        eyebrow="Privacy controls"
        title="Local imports"
        lede="One supported import: a typed data inventory. Rows land in quarantine, you see what each would collide with, and nothing reaches the inventory until every disagreement has been decided by name."
      />
      <NoticeBox tone="warn" title="An imported inventory is a statement, not an observation">
        <p>
          Everything applied from here is recorded as <strong>asserted</strong> and <strong>unreviewed</strong>: it is what
          your source system’s operator believed at the moment they exported it. ORVIA did not observe any of it, and none
          of it is evidence that a restriction is in force anywhere. Nothing imported can carry an observation time —
          the inventory schema refuses one on an asserted record.
        </p>
      </NoticeBox>
      <Freshness query={query} />
      <QueryBoundary query={query} label="local imports" isEmpty={data => !data.items.length}>
        {data => (
          <>
            {data.items.map(batch => (
              <Section key={batch.id} title={`Import ${shortId(batch.id)}`}>
                <p className="cell-sub">
                  <StateBadge dictionary={STATE_LABELS} value={batch.state} /> · {batch.row_count} row(s) ·
                  {' '}describes the source as at {formatTime(batch.captured_at)} ·
                  {' '}submitted {formatTime(batch.submitted_at)} by {shortId(batch.submitted_by)}
                  {batch.settled_at && <> · settled {formatTime(batch.settled_at)}</>}
                </p>
                <p>{batch.source_reference}</p>
                {batch.purge_reason && (
                  <NoticeBox tone="info" title="These rows were purged">
                    <p>{batch.purge_reason}</p>
                    <p>The rows were deleted. This record is kept so a purge never looks like an import that never arrived.</p>
                  </NoticeBox>
                )}
                {batch.rows.length > 0 && (
                  <DataTable
                    caption="Each row, and what it would collide with in the inventory as it stands"
                    rows={batch.rows}
                    rowKey={item => `${batch.id}:${item.line_number}`}
                    columns={[
                      { key: 'line', header: 'Line', cell: item => item.line_number },
                      { key: 'asset', header: 'Asset', cell: item => (
                        <span className="cell-primary">{item.row.name}
                          <span className="cell-sub">{item.row.kind.replaceAll('_', ' ').toLowerCase()} in system {shortId(item.row.system_id)}</span>
                        </span>
                      ) },
                      { key: 'conflict', header: 'Against the inventory', cell: item => (
                        <span className="cell-primary"><StateBadge dictionary={CONFLICT_LABELS} value={item.conflict} />
                          {item.existing_asset_id && <span className="cell-sub">existing asset {shortId(item.existing_asset_id)}</span>}
                        </span>
                      ) },
                      { key: 'decision', header: 'Decided', cell: item => item.decision
                        ? <span className="cell-primary">{item.decision === 'SKIP_ROW' ? 'Skipped' : 'Imported as a separate asset'}
                          <span className="cell-sub">by {shortId(item.decided_by!)} on {formatTime(item.decided_at!)}</span>
                        </span>
                        : item.conflict === 'NEW'
                          ? <span className="cell-sub">Nothing to decide</span>
                          : <Badge label="Outstanding" tone="warn" meaning="Nobody has decided this yet, and the import cannot be applied until somebody does." /> },
                      { key: 'result', header: 'Became', cell: item => item.created_asset_id
                        ? <a href={`/workspace/inventory/${item.created_asset_id}`}>{shortId(item.created_asset_id)}</a>
                        : <span className="cell-sub">nothing yet</span> },
                      { key: 'act', header: '', cell: item => batch.state === 'QUARANTINED' && item.conflict !== 'NEW' && !item.decision
                        ? <Decide batchId={batch.id} lineNumber={item.line_number} onDone={query.refresh} />
                        : null },
                    ]}
                  />
                )}
                {batch.state === 'QUARANTINED' && <Settle batch={batch} onDone={query.refresh} />}
                <NoticeBox tone="info" title="What this import can and cannot tell you">
                  <ul>{batch.limits.map(limit => <li key={limit}>{limit}</li>)}</ul>
                </NoticeBox>
              </Section>
            ))}
            <Pagination query={query} />
          </>
        )}
      </QueryBoundary>
    </>
  );
}
