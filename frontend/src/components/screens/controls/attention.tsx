'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { schemas } from '@orvia/contracts';
import { call, currentIdentity, useNow, usePagedQuery } from '../../shared/api.ts';
import { useDirectory } from '../../shared/directory.ts';
import { obligationStatus } from '../../shared/derive.ts';
import { describeFailure, type UiFailure } from '../../shared/errors.ts';
import { CONNECTOR_LABELS, CRITERION_LABELS, EXECUTION_LABELS, formatAge, formatTime } from '../../shared/state-labels.ts';
import { Badge, Facts, FailureState, Freshness, NoticeBox, PageHead, Pagination, QueryBoundary, StateBadge, TechnicalDetails } from '../../shared/ui.tsx';

type Obligation = ReturnType<typeof schemas.Obligation.parse>;

/* ================================================================== *
 * Attention — unresolved privacy control work
 * ================================================================== */

type IndexState = {
  status: 'idle' | 'building' | 'ready' | 'error';
  owners: Record<string, { workflowId: string; purposeId: string }>;
  read: number;
  total: number;
  failure: UiFailure | null;
};

/**
 * The contract links an obligation to its workflow only through an observation's
 * action, so an unresolved obligation with no observation has no direct route
 * home. Rather than a per-row opaque scan, this builds one bounded index for the
 * whole screen, with real progress, a cancel control and an explicit statement
 * of its limit. It reads only records this session is already authorised to read.
 */
function useOwningWorkflowIndex() {
  const [state, setState] = useState<IndexState>({ status: 'idle', owners: {}, read: 0, total: 0, failure: null });
  const cancelled = useRef(false);
  useEffect(() => () => { cancelled.current = true; }, []);

  const cancel = useCallback(() => { cancelled.current = true; setState(previous => ({ ...previous, status: 'ready' })); }, []);

  const build = useCallback(async () => {
    cancelled.current = false;
    const actor = currentIdentity();
    setState({ status: 'building', owners: {}, read: 0, total: 0, failure: null });
    try {
      const summaries: { id: string; purpose_id: string }[] = [];
      let cursor: string | undefined;
      const seen = new Set<string>();
      for (let page = 0; page < 100; page += 1) {
        const listing = await call('workflows', undefined, { cursor, limit: 100 });
        if (cancelled.current || actor !== currentIdentity()) return;
        summaries.push(...listing.items.map(item => ({ id: item.id, purpose_id: item.purpose_id })));
        if (!listing.next_cursor) break;
        if (seen.has(listing.next_cursor)) throw new Error('Repeated workflow cursor');
        seen.add(listing.next_cursor);
        cursor = listing.next_cursor;
      }
      setState(previous => ({ ...previous, total: summaries.length }));
      const owners: IndexState['owners'] = {};
      let read = 0;
      const queue = [...summaries];
      const worker = async () => {
        for (;;) {
          const next = queue.shift();
          if (!next || cancelled.current || actor !== currentIdentity()) return;
          const workflow = await call('workflow', undefined, { params: { id: next.id } });
          for (const obligation of workflow.obligations) owners[obligation.id] = { workflowId: workflow.id, purposeId: workflow.purpose_id };
          read += 1;
          if (read % 5 === 0 || !queue.length) setState(previous => ({ ...previous, owners: { ...owners }, read }));
        }
      };
      // Two readers only: the customer-local runtime pool is deliberately tiny,
      // and a wider fan-out starves unrelated requests on the same screen.
      await Promise.all(Array.from({ length: 2 }, worker));
      if (cancelled.current || actor !== currentIdentity()) return;
      setState({ status: 'ready', owners, read, total: summaries.length, failure: null });
    } catch (error) {
      if (cancelled.current || actor !== currentIdentity()) return;
      setState(previous => ({ ...previous, status: 'error', failure: describeFailure(error) }));
    }
  }, []);

  return { ...state, build, cancel };
}

/** What an operator can actually do next about this unresolved obligation. */
function nextAction(obligation: Obligation): string {
  if (!obligation.scope_still_current) return 'Nothing to do here: a newer decision supersedes this work. Open the current workflow for this purpose.';
  if (obligation.completion_criterion === 'ATTRIBUTED_MANUAL_ATTESTATION') return 'An authorised operator performs the action and records an attributed attestation in the owning workflow.';
  if (obligation.execution_state === 'EFFECT_UNKNOWN') return 'Request a scoped read reconciliation on the owning action. Do not repeat the change.';
  if (obligation.observation?.state === 'UNVERIFIABLE') return 'This target exposes no usable read, so observation cannot close it. Treat it as a manual or design gap.';
  if (obligation.observation?.state === 'OBSERVED_NOT_SATISFIED') return 'The required state is genuinely absent at the target. Investigate the control before re-running anything.';
  return 'Request a current independent read of the target.';
}

export function Attention() {
  const query = usePagedQuery('failures', { limit: 20 });
  const directory = useDirectory(['purposes', 'systems']);
  const index = useOwningWorkflowIndex();
  const now = useNow(1000);
  return (
    <>
      <PageHead
        eyebrow="Operations"
        title="Attention"
        lede="Privacy control work that is not resolved: unknown outcomes, systems with no supported automated control, failed actions and missing or expired verification. ORVIA keeps these visible rather than reporting green."
      />
      <Freshness query={query} />
      <div className="panel panel-quiet">
        <div className="row row-between">
          <div style={{ maxWidth: '62ch' }}>
            <strong>Find the owning workflow for these items</strong>
            <p className="muted" style={{ margin: '2px 0 0', fontSize: 13 }}>
              The contract links an obligation to its workflow only through an observation, so items without one
              need a bounded local search over the operations you are authorised to read. This builds the index
              once for the whole page; it makes no claim to be an exhaustive search of anything else.
            </p>
          </div>
          <div className="row">
            {index.status === 'building'
              ? <><span className="muted" aria-live="polite">Read {index.read} of {index.total || '…'} operations</span><button type="button" onClick={index.cancel}>Stop</button></>
              : <button type="button" onClick={() => void index.build()}>{index.status === 'ready' ? 'Rebuild index' : 'Find owning workflows'}</button>}
          </div>
        </div>
        {index.failure ? <FailureState failure={index.failure} /> : null}
      </div>
      <QueryBoundary query={query} label="unresolved privacy control work" isEmpty={data => !data.items.length}
        empty={<NoticeBox tone="ok" title="Nothing on this page needs attention"><p>This page of unresolved obligations is empty. An empty page may still have a next cursor.</p></NoticeBox>}>
        {data => (
          <>
            {data.items.map(obligation => {
              const status = obligationStatus(obligation, null, now);
              const owner = index.owners[obligation.id];
              const system = directory.system(obligation.observation?.system_id);
              return (
                <article className="panel" key={obligation.id}>
                  <div className="row row-between" style={{ marginBottom: 'var(--s3)' }}>
                    <div style={{ minWidth: 0 }}>
                      {owner ? <p className="eyebrow" style={{ margin: 0 }}>{directory.purposeName(owner.purposeId)}</p> : null}
                      <h4 style={{ margin: '2px 0 0', fontSize: 16 }}>
                        {system ? CONNECTOR_LABELS[system.connector] ?? system.name : 'System not named by this record'}
                      </h4>
                    </div>
                    <div className="row">
                      <Badge label={status.resolved ? 'Criterion satisfied' : 'Unresolved'} tone={status.tone} large />
                      <StateBadge dictionary={EXECUTION_LABELS} value={obligation.execution_state} />
                    </div>
                  </div>
                  <Facts tight items={[
                    { term: 'Why it is open', value: status.summary },
                    { term: 'Closes on', value: <StateBadge dictionary={CRITERION_LABELS} value={obligation.completion_criterion} /> },
                    { term: 'Last observation', value: obligation.observation?.observed_at ? `${formatAge(obligation.observation.observed_at, now)} · ${formatTime(obligation.observation.observed_at)}` : 'none recorded' },
                    { term: 'Next action', value: nextAction(obligation) },
                  ]} />
                  <div className="row" style={{ marginTop: 'var(--s4)' }}>
                    {owner
                      ? <><a href={`/workspace/workflows/${owner.workflowId}`}>Open owning workflow</a> · <a href={`/workspace/evidence/${owner.workflowId}`}>View proof</a></>
                      : <span className="muted" style={{ fontSize: 13 }}>Owning workflow not indexed yet.</span>}
                  </div>
                  <TechnicalDetails items={[
                    { term: 'Obligation', value: obligation.id },
                    { term: 'Completion criterion', value: obligation.completion_criterion },
                    { term: 'Execution state', value: obligation.execution_state },
                    { term: 'Required', value: String(obligation.required) },
                    { term: 'Scope still current', value: String(obligation.scope_still_current) },
                    ...(obligation.observation ? [
                      { term: 'Observation state', value: obligation.observation.state },
                      { term: 'System', value: obligation.observation.system_id },
                      { term: 'Target record', value: obligation.observation.resource_id },
                    ] : []),
                    ...(owner ? [{ term: 'Owning workflow', value: owner.workflowId }] : []),
                  ]} />
                </article>
              );
            })}
          </>
        )}
      </QueryBoundary>
      <Pagination query={query} />
    </>
  );
}
