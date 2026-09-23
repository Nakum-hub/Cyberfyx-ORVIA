/**
 * Presentation vocabulary for canonical contract enums.
 *
 * Every label here has to stay truthful about the difference between what a
 * target acknowledged and what ORVIA independently observed. Nothing in this
 * file may turn an unknown or unverified state into a success tone.
 */
export type Tone = 'ok' | 'warn' | 'stop' | 'unknown' | 'neutral' | 'info';
export type Label = { label: string; tone: Tone; meaning: string };

/**
 * Every status carries a shape as well as a colour and its own words, so the
 * state survives greyscale printing, a projector and colour vision deficiency.
 */
export const TONE_GLYPH: Record<Tone, string> = {
  ok: '✓', warn: '!', stop: '×', unknown: '?', neutral: '–', info: '•',
};

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
  WITHDRAWN: { label: 'Withdrawn', tone: 'stop', meaning: 'Consent-based marketing for this purpose is refused; separately approved service conditions remain separate.' },
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
  ALLOW: { label: 'Allow', tone: 'ok', meaning: 'This preview evaluated to allow at its recorded time; actual admission must recheck current authority.' },
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

/** Reading form of an identifier. The full value always stays available nearby. */
export function shortId(value: string | null | undefined): string {
  if (!value) return '—';
  return value.length > 12 ? `${value.slice(0, 8)}…` : value;
}

/** Relative age in words, for judging whether an observation is worth trusting. */
export function formatAge(value: string | null | undefined, now: number): string {
  if (!value) return 'never';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return value;
  const seconds = Math.max(0, Math.round((now - parsed) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min ago`;
  if (seconds < 86_400) return `${Math.round(seconds / 3600)} h ago`;
  return `${Math.round(seconds / 86_400)} d ago`;
}

/* ------------------------------------------------------------------ *
 * Business vocabulary for canonical enum values
 *
 * These translate a contract enum into the words a privacy leader uses. The
 * exact technical value is always still rendered somewhere on the same screen,
 * usually inside "Technical details".
 * ------------------------------------------------------------------ */

export const CONNECTOR_LABELS: Record<string, string> = {
  SYNTHETIC_CRM: 'Synthetic CRM',
  ORVIA_REST_SIMULATOR: 'Messaging simulator',
  LEGACY_MANUAL: 'Manual legacy system',
};

export const CONNECTOR_NOTES: Record<string, string> = {
  SYNTHETIC_CRM: 'Supports an automated restriction and an independent scoped read.',
  ORVIA_REST_SIMULATOR: 'Local REST target used to rehearse lost responses and acknowledgement without effect.',
  LEGACY_MANUAL: 'Exposes no supported automated control, so its obligations close only by an attributed manual action.',
};

export const OPERATION_LABELS: Record<string, string> = {
  CRM_REMOVE_MARKETING_MEMBERSHIP: 'Remove marketing membership',
  SIMULATOR_RESTRICT: 'Apply marketing restriction',
};

export const CRITERION_LABELS: Record<string, Label> = {
  CURRENT_SCOPED_OBSERVATION: { label: 'Closes on independent verification', tone: 'info', meaning: 'A fresh, satisfied scoped read of the exact target and generation is required. A provider receipt cannot close this.' },
  ATTRIBUTED_MANUAL_ATTESTATION: { label: 'Closes on attributed manual action', tone: 'warn', meaning: 'This system exposes no supported automated control, so a named person must act and attest. Administrative closure, not automated verification.' },
};

export const CONDITION_LABELS: Record<string, string> = {
  AFFIRMATIVE_MARKETING_CONSENT: 'Affirmative consent',
  APPROVED_SYNTHETIC_ORDER_SERVICE: 'Separately approved service condition',
};

export const PURPOSE_CODE_LABELS: Record<string, string> = {
  promotional_marketing: 'Promotional marketing',
  order_service_demo: 'Order service',
};

export const METHOD_LABELS: Record<string, Label> = {
  SCOPED_READ: { label: 'Independent scoped read', tone: 'info', meaning: 'ORVIA read the exact target resource itself, separately from the command it sent.' },
  PROVIDER_RECEIPT: { label: 'Provider receipt', tone: 'warn', meaning: 'The target’s own response about its own work. Attributable evidence, but not independent observation.' },
  NONE: { label: 'No method recorded', tone: 'neutral', meaning: 'No observation method is recorded for this entry.' },
};

/** What the viewer should take away when an action has no verified effect. */
export const UNCERTAINTY_COPY: Record<string, { title: string; body: string; next: string }> = {
  EFFECT_UNKNOWN: {
    title: 'Outcome unknown',
    body: 'The action may have been applied, but ORVIA did not receive a reliable response. ORVIA will not blindly repeat the change, because repeating an already-applied change is itself a risk.',
    next: 'Next action: perform an independent read reconciliation.',
  },
  ACKNOWLEDGED: {
    title: 'Acknowledged — not verified',
    body: 'The target accepted the request. Acceptance is the target talking about itself; it is not proof that the required state is now in place.',
    next: 'Next action: read the target independently before treating this as done.',
  },
  MANUAL_REQUIRED: {
    title: 'Manual action required',
    body: 'This system exposes no supported automated control. A named operator must perform the action and record an attributed statement.',
    next: 'Next action: an authorised operator records the attributed action in the owning workflow.',
  },
  FAILED: {
    title: 'Action failed',
    body: 'The target reported a definite failure. Nothing was applied by this attempt, and no required state has been established.',
    next: 'Next action: review the reason code and the target configuration.',
  },
};

export const SCENARIO_LABELS: Record<string, { name: string; proves: string; expected: string[]; expectedResult: 'PASS' | 'FAIL' }> = {
  MARKETING_WITHDRAWAL_HEALTHY: {
    name: 'Marketing withdrawal — healthy control',
    proves: 'The whole control works end to end when nothing is broken. Also used for the repaired rerun.',
    expected: ['Withdrawal accepted', 'Marketing restriction applied at the target', 'A current marketing send is blocked', 'An independent read confirms the restriction'],
    expectedResult: 'PASS',
  },
  MARKETING_WITHDRAWAL_BROKEN_CONTROL: {
    name: 'Marketing withdrawal — deliberately broken control',
    proves: 'A controlled defect stops the expected privacy outcome. The value of the test is that ORVIA reports FAIL instead of green.',
    expected: ['Withdrawal accepted', 'The injected defect prevents the required restriction', 'The independent read does not confirm the restriction', 'The run is stored as a real business FAIL'],
    expectedResult: 'FAIL',
  },
  TARGET_RESTORE_QUARANTINE: {
    name: 'Old target restoration and safe recovery',
    proves: 'Restoring an old copy of a target cannot silently re-enable marketing: the restored target is quarantined and a stale generation is refused.',
    expected: ['Restored target enters quarantine', 'Premature activation is denied', 'A stale generation is denied', 'The consent ledger is unchanged'],
    expectedResult: 'PASS',
  },
};

/**
 * Capability register vocabulary. A sandbox subset is never presented as a
 * delivered master module, and coverage at the candidate is engineering
 * evidence, never canonical acceptance.
 */
export const CAPABILITY_LABELS: Record<string, Label> = {
  IMPLEMENTED_SANDBOX_SUBSET: { label: 'Built (synthetic subset)', tone: 'ok', meaning: 'The named behaviour is built and runs in the customer-local synthetic profile. This is a subset of the master module, not a delivered module.' },
  PARTIAL_SANDBOX: { label: 'Partly built', tone: 'warn', meaning: 'Only the part named in the limitation exists. The rest of the module is not built.' },
  NOT_IMPLEMENTED: { label: 'Not built', tone: 'neutral', meaning: 'Nothing is built for this module in this prototype.' },
  DEFERRED_V2: { label: 'Deferred to Version 2', tone: 'neutral', meaning: 'Retained in the programme as future learned-model work; nothing is built or claimed here.' },
};

export const CAPABILITY_TEST_LABELS: Record<string, Label> = {
  COVERED_AT_CANDIDATE: { label: 'Covered at candidate', tone: 'ok', meaning: 'Executing suites covered this behaviour at the frozen candidate. Engineering evidence only: canonical acceptance needs the two human rehearsals, and every canonical test remains NOT_RUN.' },
  NOT_RUN: { label: 'Not run', tone: 'neutral', meaning: 'No suite covers this module in this build.' },
  DEFERRED_V2: { label: 'Deferred to Version 2', tone: 'neutral', meaning: 'Not tested because nothing is built.' },
};

/**
 * English and the twenty-two Eighth Schedule languages, in their English names.
 * A code shown raw to a data principal is a code they have to look up, and the
 * whole point of Act s5 is that the notice reaches them in words they read.
 */
export const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English', as: 'Assamese', bn: 'Bengali', brx: 'Bodo', doi: 'Dogri', gu: 'Gujarati',
  hi: 'Hindi', kn: 'Kannada', ks: 'Kashmiri', kok: 'Konkani', mai: 'Maithili', ml: 'Malayalam',
  mni: 'Manipuri', mr: 'Marathi', ne: 'Nepali', or: 'Odia', pa: 'Punjabi', sa: 'Sanskrit',
  sat: 'Santali', sd: 'Sindhi', ta: 'Tamil', te: 'Telugu', ur: 'Urdu',
};
