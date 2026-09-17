import type { schemas } from '@orvia/contracts';

// Types come from the canonical schemas themselves, exactly like the generated
// transport does. This interface keeps no second copy of the contract shapes.
type Workflow = ReturnType<typeof schemas.Workflow.parse>;
type Action = ReturnType<typeof schemas.Action.parse>;
type Obligation = ReturnType<typeof schemas.Obligation.parse>;
type Observation = ReturnType<typeof schemas.Observation.parse>;
type Receipt = ReturnType<typeof schemas.Receipt.parse>;
type ReceiptView = ReturnType<typeof schemas.ReceiptView.parse>;
type WorkflowSummary = ReturnType<typeof schemas.WorkflowSummary.parse>;

/**
 * Derivations that keep execution facts and observation facts apart.
 *
 * Nothing in this module may invent a percentage, a "done everywhere" claim or a
 * verified effect. Every helper is pure so the same reasoning can be asserted in
 * component tests without a browser.
 */

export type Freshness = 'NONE' | 'FRESH' | 'EXPIRED';

export function observationFreshness(observation: Observation | null, now: number): Freshness {
  if (!observation || !observation.fresh_until) return 'NONE';
  return Date.parse(observation.fresh_until) > now ? 'FRESH' : 'EXPIRED';
}

export type Verification = {
  verified: boolean;
  /** Short claim shown next to the action. */
  claim: string;
  detail: string;
};

/**
 * An acknowledgement, a completed attempt or a manual closure never yields
 * `verified: true`. Only a fresh, satisfied, current-generation scoped read does.
 */
export function actionVerification(action: Action, now: number): Verification {
  const latest = action.observations.at(-1) ?? null;
  const freshness = observationFreshness(latest, now);
  const generationMatches = latest ? latest.target_generation === action.plan.scope.target_generation : false;
  if (latest && latest.state === 'OBSERVED_SATISFIED' && latest.method === 'SCOPED_READ' && freshness === 'FRESH' && generationMatches) {
    return { verified: true, claim: 'Independently observed',
      detail: 'A separate scoped read of this exact synthetic resource and generation observed the desired restriction, within its freshness window.' };
  }
  if (latest && latest.state === 'OBSERVED_NOT_SATISFIED') {
    return { verified: false, claim: 'Observed not satisfied', detail: 'A separate read showed the restriction is not in place at the target.' };
  }
  if (latest && freshness === 'EXPIRED') {
    return { verified: false, claim: 'Observation expired', detail: 'The last observation is outside its freshness window and no longer counts as current proof.' };
  }
  if (latest && !generationMatches) {
    return { verified: false, claim: 'Observation stale', detail: 'The last observation refers to a different target generation than this plan.' };
  }
  if (action.execution_state === 'EFFECT_UNKNOWN') {
    return { verified: false, claim: 'Effect unknown', detail: 'An attempt did not return a definite result. The effect may or may not have been applied; reconcile by reading the target.' };
  }
  if (action.execution_state === 'ACKNOWLEDGED') {
    return { verified: false, claim: 'Acknowledged only', detail: 'The target acknowledged the command. No independent observation has confirmed the effect.' };
  }
  return { verified: false, claim: 'Not verified', detail: 'No independent observation establishes the effect of this action.' };
}

export type ObligationStatus = {
  resolved: boolean;
  tone: 'ok' | 'warn' | 'stop' | 'unknown' | 'neutral';
  summary: string;
};

export function obligationStatus(obligation: Obligation, action: Action | null, now: number): ObligationStatus {
  if (!obligation.scope_still_current) {
    return { resolved: false, tone: 'warn',
      summary: 'Scope is no longer current: the consent epoch or target generation moved on, so earlier work cannot close this obligation.' };
  }
  if (obligation.completion_criterion === 'ATTRIBUTED_MANUAL_ATTESTATION') {
    return obligation.attestation
      ? { resolved: true, tone: 'ok', summary: 'Closed by an attributed manual attestation. This is an administrative criterion, not automated verification.' }
      : { resolved: false, tone: 'warn', summary: 'Open manual obligation: this system exposes no supported automated control, so a person must act and attest.' };
  }
  const freshness = observationFreshness(obligation.observation, now);
  if (obligation.observation && obligation.observation.state === 'OBSERVED_SATISFIED' && obligation.observation.method === 'SCOPED_READ' && freshness === 'FRESH') {
    return { resolved: true, tone: 'ok', summary: 'Closed by a fresh, satisfied scoped observation in the current scope.' };
  }
  if (obligation.observation && obligation.observation.state === 'OBSERVED_NOT_SATISFIED') {
    return { resolved: false, tone: 'stop', summary: 'A scoped read shows the required effect is not in place.' };
  }
  if (obligation.observation && obligation.observation.state === 'UNVERIFIABLE') {
    return { resolved: false, tone: 'unknown', summary: 'The target exposes no usable read, so this obligation cannot be closed by observation.' };
  }
  if (freshness === 'EXPIRED') {
    return { resolved: false, tone: 'warn', summary: 'The last observation is outside its freshness window; a current read is required.' };
  }
  if (action && action.execution_state === 'EFFECT_UNKNOWN') {
    return { resolved: false, tone: 'unknown', summary: 'An uncertain attempt is outstanding. Reconcile by reading the target before deciding anything else.' };
  }
  return { resolved: false, tone: 'warn', summary: 'No current scoped observation satisfies this obligation yet.' };
}

export type ObligationTotals = {
  required: number;
  optional: number;
  satisfied: number;
  unresolved: number;
  manualOutstanding: number;
  uncertain: number;
  /** Honest sentence; never a completion percentage or estate-wide claim. */
  statement: string;
};

export function obligationTotals(workflow: Workflow, now: number): ObligationTotals {
  let satisfied = 0, unresolved = 0, manualOutstanding = 0, uncertain = 0, required = 0, optional = 0;
  for (const obligation of workflow.obligations) {
    const status = obligationStatus(obligation, obligationAction(obligation, workflow), now);
    if (obligation.required) required += 1; else optional += 1;
    if (status.resolved) satisfied += 1;
    else {
      unresolved += 1;
      if (obligation.completion_criterion === 'ATTRIBUTED_MANUAL_ATTESTATION') manualOutstanding += 1;
      if (status.tone === 'unknown') uncertain += 1;
    }
  }
  const statement = unresolved === 0
    ? `All ${workflow.obligations.length} recorded obligation(s) in this workflow are closed by their own criterion. This covers only the systems configured in this synthetic scope.`
    : `${satisfied} of ${workflow.obligations.length} recorded obligation(s) closed; ${unresolved} unresolved (${manualOutstanding} manual, ${uncertain} uncertain). Unresolved work stays visible and is not counted as done.`;
  return { required, optional, satisfied, unresolved, manualOutstanding, uncertain, statement };
}

/**
 * The contract links an obligation to an action only through its observation.
 * When no observation exists the obligation is manual or not yet attempted, and
 * no action is inferred rather than guessed from ordering.
 */
export function obligationAction(obligation: Obligation, workflow: Workflow): Action | null {
  const actionId = obligation.observation?.action_id ?? null;
  if (!actionId) return null;
  return workflow.actions.find(action => action.id === actionId) ?? null;
}

export type TimelineEntry = {
  at: string | null;
  title: string;
  tone: 'ok' | 'warn' | 'stop' | 'unknown' | 'neutral';
  detail: string;
  category: 'WORKFLOW' | 'EXECUTION' | 'OBSERVATION' | 'RECONCILIATION';
};

/** Execution facts and observation facts are separate entries, never merged. */
export function buildTimeline(workflow: Workflow): TimelineEntry[] {
  const entries: TimelineEntry[] = [
    { at: workflow.accepted_at, title: 'Consent decision accepted', tone: 'neutral', category: 'WORKFLOW',
      detail: `Workflow ${workflow.id} was created from consent event ${workflow.event_id}.` },
  ];
  for (const action of workflow.actions) {
    for (const attempt of action.attempts) {
      entries.push({
        at: attempt.recorded_at,
        title: `Attempt ${attempt.execution_state === 'ACKNOWLEDGED' ? 'acknowledged by target' : attempt.execution_state === 'EFFECT_UNKNOWN' ? 'returned no definite result' : 'failed'}`,
        tone: attempt.execution_state === 'ACKNOWLEDGED' ? 'warn' : attempt.execution_state === 'EFFECT_UNKNOWN' ? 'unknown' : 'stop',
        category: 'EXECUTION',
        detail: `Execution fact only. Operation ${action.plan.scope.operation} on system ${action.plan.scope.system_id}; reason ${attempt.reason_code}; target generation ${attempt.target_generation}.`,
      });
    }
    for (const observation of action.observations) {
      entries.push({
        at: observation.observed_at,
        title: `Independent observation: ${observation.state}`,
        tone: observation.state === 'OBSERVED_SATISFIED' ? 'ok' : observation.state === 'OBSERVED_NOT_SATISFIED' ? 'stop' : 'unknown',
        category: 'OBSERVATION',
        detail: `Observation fact only. Method ${observation.method}; observed state ${observation.observed_state}; generation ${observation.target_generation}; fresh until ${observation.fresh_until ?? 'n/a'}.`,
      });
    }
    for (const reconciliation of action.reconciliations) {
      entries.push({
        at: reconciliation.finished_at ?? reconciliation.started_at,
        title: `Reconciliation ${reconciliation.state}`,
        tone: reconciliation.state === 'RESOLVED' ? 'ok' : reconciliation.state === 'FAILED' ? 'stop' : 'unknown',
        category: 'RECONCILIATION',
        detail: `Resolving uncertain attempt ${reconciliation.uncertain_attempt_id} by ${reconciliation.method}${reconciliation.reason_code ? `; reason ${reconciliation.reason_code}` : ''}.`,
      });
    }
  }
  return entries.sort((a, b) => (a.at ? Date.parse(a.at) : 0) - (b.at ? Date.parse(b.at) : 0));
}

/** Counts derived only from the workflow summaries actually loaded on screen. */
export function workflowCounts(items: WorkflowSummary[]) {
  const counts = { ACCEPTED: 0, RUNNING: 0, NEEDS_ATTENTION: 0, COMPLETED: 0 } as Record<string, number>;
  for (const item of items) counts[item.state] = (counts[item.state] ?? 0) + 1;
  return counts;
}

export type ReceiptIntegrity = {
  consistent: boolean;
  superseded: boolean;
  message: string | null;
};

/**
 * Receipt facts are immutable. The `current` object is a separate, later read.
 *
 * A withdrawal recorded at epoch N can never be shown as reactivated by an older
 * grant: a current state that claims an earlier epoch, or claims GRANTED at an
 * epoch at or below a recorded withdrawal, is reported as a defect rather than
 * quietly corrected for the demonstration.
 */
export function receiptIntegrity(view: ReceiptView): ReceiptIntegrity {
  const { receipt, current } = view;
  if (current.consent_epoch < receipt.consent_epoch) {
    return { consistent: false, superseded: false,
      message: `Authoritative current epoch ${current.consent_epoch} is older than this receipt's epoch ${receipt.consent_epoch}. This contradicts monotonic consent epochs and is reported, not corrected here.` };
  }
  if (current.consent_epoch === receipt.consent_epoch && current.consent_status !== receipt.consent_status) {
    return { consistent: false, superseded: false,
      message: `At epoch ${receipt.consent_epoch} this receipt records ${receipt.consent_status} but the current state reads ${current.consent_status}. Same-epoch states must agree.` };
  }
  return { consistent: true, superseded: current.consent_epoch > receipt.consent_epoch, message: null };
}

/**
 * Guards a receipt shown in-page against a response that arrived out of order.
 * The newest accepted epoch always wins; an older in-flight response is dropped.
 */
export function newerReceipt(existing: Receipt | null, candidate: Receipt): boolean {
  if (!existing) return true;
  if (candidate.receipt_id === existing.receipt_id) return false;
  return candidate.consent_epoch > existing.consent_epoch;
}
