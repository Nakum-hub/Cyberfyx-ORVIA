import type { Label } from '../../shared/state-labels.ts';

/**
 * Plain-language labels for the DPDP operations screens.
 *
 * Requested, sent, accepted by the target, reported done by the target and
 * independently verified are separate facts, so each has its own label and none
 * of them borrows the word "done". Only an independent verification is shown in
 * the success tone.
 */
export const ACTION_STATE_LABELS: Record<string, Label> = {
  pending: { label: 'Not started', tone: 'neutral', meaning: 'The action is planned and has not been sent to the target.' },
  awaiting_approval: { label: 'Waiting for approval', tone: 'warn', meaning: 'The run is irreversible; a second person must approve the previewed scope first.' },
  blocked: { label: 'Blocked', tone: 'stop', meaning: 'A recorded hold, a missing reference or an unresolved source stops this action. It will not be sent.' },
  executing: { label: 'Sent, outcome pending', tone: 'info', meaning: 'The action was sent to the target and its outcome is not yet known.' },
  succeeded_unverified: { label: 'Target says done — not verified', tone: 'warn', meaning: 'The target reported completing the action. Nobody has independently confirmed it yet.' },
  verified: { label: 'Verified', tone: 'ok', meaning: 'An independent check of the target confirmed the effect.' },
  failed: { label: 'Failed', tone: 'stop', meaning: 'The target refused or could not apply the action, or verification found the effect absent.' },
  inconclusive: { label: 'Inconclusive', tone: 'unknown', meaning: 'Neither success nor failure could be established. The effect is unknown.' },
  cancelled: { label: 'Cancelled', tone: 'neutral', meaning: 'The run was cancelled before this action was sent.' },
  not_supported: { label: 'Not supported', tone: 'unknown', meaning: 'No connector operation exists for this system. It must be handled outside ORVIA.' },
};

export const EXECUTION_REPORT_LABELS: Record<string, Label> = {
  requested: { label: 'Requested', tone: 'neutral', meaning: 'Recorded as needed; nothing has been sent.' },
  dispatched: { label: 'Dispatched', tone: 'info', meaning: 'Sent to the target.' },
  accepted_by_target: { label: 'Accepted by target', tone: 'info', meaning: 'The target accepted the request. That is not completion.' },
  completed_by_target: { label: 'Completed by target', tone: 'warn', meaning: 'The target says it is done. That is its claim, not verification.' },
  verified: { label: 'Verified', tone: 'ok', meaning: 'Independently verified.' },
  failed: { label: 'Failed', tone: 'stop', meaning: 'Failed.' },
  inconclusive: { label: 'Inconclusive', tone: 'unknown', meaning: 'Outcome unknown.' },
  not_supported: { label: 'Not supported', tone: 'unknown', meaning: 'No automated operation exists.' },
};

export const RUN_STATUS_LABELS: Record<string, Label> = {
  EVALUATING: { label: 'Evaluating', tone: 'info', meaning: 'The population is being evaluated in checkpointed batches.' },
  DRY_RUN_READY: { label: 'Dry run ready', tone: 'warn', meaning: 'The preview is complete. Nothing has been sent. A second person must approve the exact scope.' },
  AWAITING_APPROVAL: { label: 'Waiting for approval', tone: 'warn', meaning: 'A second person must approve before anything is sent.' },
  APPROVED: { label: 'Approved, not started', tone: 'info', meaning: 'The scope was approved. Nothing has been sent yet.' },
  RUNNING: { label: 'Running', tone: 'info', meaning: 'Actions are being sent and verified in batches.' },
  COMPLETED_VERIFIED: { label: 'Completed and verified', tone: 'ok', meaning: 'Every action was independently verified.' },
  COMPLETED_WITH_EXCEPTIONS: { label: 'Completed with exceptions', tone: 'warn', meaning: 'Some actions were blocked, unsupported or unreached. They remain listed below.' },
  PARTIALLY_FAILED: { label: 'Partly failed', tone: 'stop', meaning: 'Some actions failed or are inconclusive. The run stays open for them.' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', meaning: 'The run was cancelled with a recorded reason.' },
  BLOCKED: { label: 'Blocked', tone: 'stop', meaning: 'The run cannot proceed; see the stated reason.' },
};

export const RUN_KIND_LABELS: Record<string, string> = {
  CONSENT_WITHDRAWAL: 'Consent withdrawal propagation', RIGHTS_EXECUTION: 'Rights request execution', CORRECTION: 'Correction propagation',
  RETENTION_ERASURE: 'Retention erasure', PROCESSOR_DISPOSITION: 'Processor disposition',
};

export const APPLICABILITY_LABELS: Record<string, Label> = {
  APPLICABLE: { label: 'Applies', tone: 'info', meaning: 'The recorded facts meet the requirement’s conditions and it is in force.' },
  NOT_APPLICABLE: { label: 'Does not apply', tone: 'neutral', meaning: 'The recorded facts show the requirement’s conditions are not met.' },
  UNRESOLVED: { label: 'Unresolved', tone: 'unknown', meaning: 'A fact the requirement depends on is not recorded. Nothing has been assumed.' },
  NOT_YET_IN_FORCE: { label: 'Not yet in force', tone: 'neutral', meaning: 'The requirement commences later under the package in effect.' },
  SUPERSEDED: { label: 'Superseded', tone: 'neutral', meaning: 'A later package replaced this requirement.' },
  EXEMPT_WITH_RECORDED_BASIS: { label: 'Exempt (recorded basis)', tone: 'warn', meaning: 'An exemption was recorded with its basis. The original decision is kept.' },
};

export const LEGAL_STATUS_LABELS: Record<string, Label> = {
  APPLICABLE: { label: 'In force', tone: 'info', meaning: 'The requirement is in force for this record.' },
  NOT_YET_IN_FORCE: { label: 'Not yet in force', tone: 'neutral', meaning: 'The requirement commences later.' },
  UNRESOLVED: { label: 'Deadline unresolved', tone: 'unknown', meaning: 'A fact the deadline depends on is not recorded, so no deadline has been invented.' },
  NO_ACTIVE_PACKAGE: { label: 'No package in effect', tone: 'stop', meaning: 'No approved regulatory package was in effect at receipt.' },
  IN_FORCE: { label: 'In force', tone: 'info', meaning: 'In force now under this package.' },
};

export const PACKAGE_STATE_LABELS: Record<string, Label> = {
  IMPORTED: { label: 'Imported, not approved', tone: 'warn', meaning: 'Signature verified. A second super admin must approve it before it can take effect.' },
  APPROVED: { label: 'Approved', tone: 'ok', meaning: 'Approved by a second person. It governs from its effective date.' },
  REJECTED: { label: 'Rejected', tone: 'neutral', meaning: 'Rejected with a recorded note. It never governs anything.' },
};

export const TASK_STATE_LABELS: Record<string, Label> = {
  OPEN: { label: 'Open', tone: 'warn', meaning: 'Not yet completed.' },
  COMPLETED: { label: 'Completed', tone: 'ok', meaning: 'Completed with recorded communication or evidence.' },
  NOT_APPLICABLE: { label: 'Not applicable', tone: 'neutral', meaning: 'Closed with a recorded reason; kept for history.' },
};

export const SEVERITY_LABELS: Record<string, Label> = {
  OVERDUE: { label: 'Overdue', tone: 'stop', meaning: 'Past its recorded due time.' },
  DUE_SOON: { label: 'Due soon', tone: 'warn', meaning: 'Due within the look-ahead window.' },
  FAILED: { label: 'Failed', tone: 'stop', meaning: 'Something failed and needs handling.' },
  INCONCLUSIVE: { label: 'Inconclusive', tone: 'unknown', meaning: 'The outcome is unknown.' },
  UNRESOLVED: { label: 'Unresolved', tone: 'unknown', meaning: 'A needed fact is not recorded.' },
  MISSING: { label: 'Missing', tone: 'warn', meaning: 'An expected record is missing.' },
  NOT_SUPPORTED: { label: 'Not supported', tone: 'unknown', meaning: 'No automated path exists.' },
  REVIEW_REQUIRED: { label: 'Review required', tone: 'warn', meaning: 'Somebody needs to review this.' },
  OPEN: { label: 'Open', tone: 'info', meaning: 'Open item.' },
};

export const IMPACT_STATE_LABELS: Record<string, Label> = {
  OPEN: { label: 'Needs review', tone: 'warn', meaning: 'A package change may affect this configuration.' },
  ACTIONED: { label: 'Actioned', tone: 'ok', meaning: 'Reviewed and changed as needed.' },
  NOT_AFFECTED: { label: 'Not affected', tone: 'neutral', meaning: 'Reviewed and recorded as unaffected.' },
};

export const JOB_STATUS_LABELS: Record<string, Label> = {
  RECEIVING: { label: 'Receiving rows', tone: 'info', meaning: 'Rows are being uploaded in chunks. Nothing has been applied.' },
  PROCESSING: { label: 'Processing', tone: 'info', meaning: 'Rows are being applied from the last checkpoint.' },
  COMPLETED: { label: 'Completed', tone: 'ok', meaning: 'Every row was applied or recognised as a duplicate.' },
  COMPLETED_WITH_ERRORS: { label: 'Completed with errors', tone: 'warn', meaning: 'Some rows failed. They can be replayed without re-applying the rest.' },
};

export const knownOr = (dictionary: Record<string, string>, value: string) => dictionary[value] ?? value.replaceAll('_', ' ').toLowerCase();
