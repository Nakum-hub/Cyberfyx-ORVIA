/**
 * Presentation vocabulary for canonical contract enums.
 *
 * Every label here has to stay truthful about the difference between what a
 * target acknowledged and what ORVIA independently observed. Nothing in this
 * file may turn an unknown or unverified state into a success tone.
 */
export type Tone = 'ok' | 'warn' | 'stop' | 'unknown' | 'neutral' | 'info';
export type Label = { label: string; tone: Tone; meaning: string };

const unknownLabel = (value: string): Label => ({
  label: value,
  tone: 'unknown',
  meaning: 'This build does not recognise this state. It is displayed unchanged and must not be read as success.',
});

export const EXECUTION_LABELS: Record<string, Label> = {
  PENDING: { label: 'Pending', tone: 'neutral', meaning: 'Planned and signed, not yet attempted by the agent.' },
  RUNNING: { label: 'Running', tone: 'info', meaning: 'An attempt is in progress at the target.' },
  ACKNOWLEDGED: { label: 'Acknowledged', tone: 'warn', meaning: 'The target accepted the command. Acknowledgement is not verification: the effect is only established by a separate scoped observation.' },
  EFFECT_UNKNOWN: { label: 'Effect unknown', tone: 'unknown', meaning: 'The attempt timed out or its result was not observed. The change may already have been applied. Reconcile by reading the target; do not blindly retry.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'The target reported a definite failure for this attempt.' },
  MANUAL_REQUIRED: { label: 'Manual required', tone: 'warn', meaning: 'No supported automated control exists for this system. A person must act and attest; manual closure is not automated verification.' },
  SKIPPED: { label: 'Skipped', tone: 'neutral', meaning: 'No action was planned for this system in this workflow.' },
};

export const OBSERVATION_LABELS: Record<string, Label> = {
  NOT_CHECKED: { label: 'Not checked', tone: 'neutral', meaning: 'No independent read has been made for this action.' },
  OBSERVED_SATISFIED: { label: 'Observed satisfied', tone: 'ok', meaning: 'A scoped read of this exact synthetic resource and generation showed the desired restriction.' },
  OBSERVED_NOT_SATISFIED: { label: 'Observed not satisfied', tone: 'stop', meaning: 'A scoped read showed the desired restriction is not in place.' },
  UNVERIFIABLE: { label: 'Unverifiable', tone: 'unknown', meaning: 'The target exposes no read for this resource, so no independent observation is possible.' },
  STALE: { label: 'Stale', tone: 'warn', meaning: 'The observation refers to a different target generation than the plan; it cannot be used as current proof.' },
};

export const WORKFLOW_LABELS: Record<string, Label> = {
  ACCEPTED: { label: 'Accepted', tone: 'info', meaning: 'The consent decision is durably recorded and propagation was accepted.' },
  RUNNING: { label: 'Running', tone: 'info', meaning: 'Planned actions are being executed and observed.' },
  NEEDS_ATTENTION: { label: 'Needs attention', tone: 'warn', meaning: 'At least one required obligation is unresolved, uncertain or no longer current.' },
  COMPLETED: { label: 'Completed', tone: 'ok', meaning: 'Every required obligation was satisfied by its own criterion in the current scope.' },
};

export const CONSENT_LABELS: Record<string, Label> = {
  NOT_GIVEN: { label: 'Not given', tone: 'neutral', meaning: 'No affirmative consent has been recorded for this purpose.' },
  GRANTED: { label: 'Granted', tone: 'ok', meaning: 'Affirmative, purpose-specific consent is currently recorded.' },
  WITHDRAWN: { label: 'Withdrawn', tone: 'stop', meaning: 'Consent is currently withdrawn. Later processing for this purpose must be refused.' },
};

export const PROPAGATION_LABELS: Record<string, Label> = {
  ACCEPTED: { label: 'Accepted', tone: 'info', meaning: 'Propagation work was durably accepted for this decision.' },
  RUNNING: { label: 'Running', tone: 'info', meaning: 'Propagation is in progress.' },
  NEEDS_ATTENTION: { label: 'Needs attention', tone: 'warn', meaning: 'Propagation is unresolved, uncertain or superseded by a newer decision.' },
  COMPLETED: { label: 'Completed', tone: 'ok', meaning: 'Propagation finished against every required obligation.' },
  NOT_REQUIRED: { label: 'Not required', tone: 'neutral', meaning: 'This decision required no downstream propagation.' },
};

export const RECONCILIATION_LABELS: Record<string, Label> = {
  PENDING: { label: 'Pending', tone: 'neutral', meaning: 'Reconciliation is requested but has not started.' },
  RECONCILING: { label: 'Reconciling', tone: 'info', meaning: 'A read is in progress to resolve an uncertain attempt.' },
  RESOLVED: { label: 'Resolved', tone: 'ok', meaning: 'A later read resolved the uncertain attempt with observation evidence.' },
  INCONCLUSIVE: { label: 'Inconclusive', tone: 'unknown', meaning: 'Reconciliation finished without establishing the effect. The attempt stays uncertain.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'Reconciliation itself failed; the original uncertainty remains.' },
};

export const DECISION_LABELS: Record<string, Label> = {
  ALLOW: { label: 'Allow', tone: 'ok', meaning: 'Current authority permits this processing.' },
  BLOCK: { label: 'Block', tone: 'stop', meaning: 'Current authority refuses this processing.' },
  INDETERMINATE: { label: 'Indeterminate', tone: 'unknown', meaning: 'No decision could be established. Fail closed: treat as not permitted.' },
};

export const TEST_LABELS: Record<string, Label> = {
  NOT_RUN: { label: 'Not run', tone: 'neutral', meaning: 'This scenario has not been executed in this build.' },
  RUNNING: { label: 'Running', tone: 'info', meaning: 'The allowlisted runner is executing the scenario.' },
  PASS: { label: 'Pass', tone: 'ok', meaning: 'Every assertion in the run met its expectation.' },
  FAIL: { label: 'Fail', tone: 'stop', meaning: 'At least one assertion did not meet its expectation.' },
  ERROR: { label: 'Error', tone: 'unknown', meaning: 'The run could not complete. No product conclusion may be drawn.' },
  SKIPPED: { label: 'Skipped', tone: 'neutral', meaning: 'The run was skipped.' },
};

export const ASSERTION_LABELS: Record<string, Label> = {
  PASS: { label: 'Pass', tone: 'ok', meaning: 'Observed matched expected.' },
  FAIL: { label: 'Fail', tone: 'stop', meaning: 'Observed did not match expected.' },
  ERROR: { label: 'Error', tone: 'unknown', meaning: 'The assertion could not be evaluated.' },
  SKIPPED: { label: 'Skipped', tone: 'neutral', meaning: 'The assertion was not evaluated in this run.' },
};

export const CONFIGURATION_STATUS_LABELS: Record<string, Label> = {
  DRAFT: { label: 'Draft', tone: 'neutral', meaning: 'Editable version; not in force.' },
  PUBLISHED: { label: 'Published', tone: 'ok', meaning: 'The version currently in force for this scope.' },
  SUPERSEDED: { label: 'Superseded', tone: 'neutral', meaning: 'Replaced by a later published version; retained for history.' },
};

export const ROLE_LABELS: Record<string, string> = {
  ORG_SUPER_ADMIN: 'Organisation super administrator',
  ORG_ADMIN: 'Organisation administrator',
  MEMBER: 'Member',
  AUDITOR: 'Auditor',
  DATA_PRINCIPAL: 'Data principal',
};

export function describeState(dictionary: Record<string, Label>, value: string | null | undefined): Label {
  if (value === null || value === undefined) return { label: 'Unknown', tone: 'unknown', meaning: 'No state was supplied.' };
  return dictionary[value] ?? unknownLabel(value);
}

/** Absolute local rendering of a contract timestamp; never a bare "just now". */
export function formatTime(value: string | null | undefined): string {
  if (!value) return '—';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  return new Date(parsed).toLocaleString(undefined, { hour12: false, timeZoneName: 'short' });
}

export function formatId(value: string | null | undefined): string {
  return value ?? '—';
}
