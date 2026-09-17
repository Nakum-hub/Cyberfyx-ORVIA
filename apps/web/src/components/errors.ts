import { ApiError } from '@orvia/contracts/client';

export type FailureKind = 'API' | 'NETWORK' | 'MALFORMED' | 'ABORTED' | 'CLIENT';
export type FailureTone = 'warn' | 'stop' | 'unknown' | 'info';

export type UiFailure = {
  kind: FailureKind;
  /** Contract error code when the server answered with the versioned envelope. */
  code: string | null;
  status: number | null;
  title: string;
  /** Safe, actionable sentence. Never a raw object or stack. */
  guidance: string;
  /** The server's own message, shown verbatim but escaped by React. */
  serverMessage: string | null;
  retry: string | null;
  requestId: string | null;
  fieldErrors: { field: string; code: string }[];
  /** True when the request may have been applied server-side (writes only). */
  outcomeUnknown: boolean;
  /** True when re-running the same request with the same key is contract-safe. */
  sameKeyRetry: boolean;
  needsReauthentication: boolean;
};

const GUIDANCE: Record<string, string> = {
  UNAUTHENTICATED: 'This session is not authenticated. Sign in again to continue.',
  FORBIDDEN: 'This session does not carry the required authority. Privileged staff must complete MFA, and each actor sees only its own organisation and scope.',
  NOT_FOUND: 'The server reports no such resource in this scope. In this prototype build it also answers NOT_FOUND for routes whose producing backend ticket is not implemented yet.',
  VALIDATION_ERROR: 'The server rejected the submitted values. Correct the highlighted fields and submit again.',
  EPOCH_CONFLICT: 'The authoritative state moved on since this screen loaded. Refresh to read the current state before deciding again.',
  IDEMPOTENCY_CONFLICT: 'A previous submission used this submission key with different content. Start a new interaction rather than reusing it.',
  RATE_LIMITED: 'The server is rate limiting this operation. Wait before retrying.',
  SERVICE_UNAVAILABLE: 'A required server dependency was unavailable. The request was not confirmed; read the authoritative state before deciding again.',
  UNSUPPORTED_VERSION: 'This interface and the server disagree on the contract version. Do not continue until both sides are on one version.',
  STALE_GENERATION: 'The target generation moved on; earlier plan data no longer applies.',
  INVALID_COMMAND: 'The server rejected the command as invalid.',
};

const TITLES: Record<string, string> = {
  UNAUTHENTICATED: 'Sign in required',
  FORBIDDEN: 'Not permitted for this session',
  NOT_FOUND: 'Not available in this scope',
  VALIDATION_ERROR: 'Check the submitted values',
  EPOCH_CONFLICT: 'State changed before this decision',
  IDEMPOTENCY_CONFLICT: 'Submission key already used differently',
  RATE_LIMITED: 'Too many requests',
  SERVICE_UNAVAILABLE: 'Server dependency unavailable',
  UNSUPPORTED_VERSION: 'Contract version not supported',
  STALE_GENERATION: 'Target generation is stale',
  INVALID_COMMAND: 'Command rejected',
};

export function failureTone(failure: UiFailure): FailureTone {
  if (failure.kind === 'NETWORK' || failure.outcomeUnknown) return 'unknown';
  if (failure.code === 'VALIDATION_ERROR' || failure.code === 'EPOCH_CONFLICT' || failure.code === 'RATE_LIMITED') return 'warn';
  if (failure.code === 'NOT_FOUND') return 'info';
  return 'stop';
}

/**
 * Map any thrown value into one displayable failure. A write whose response was
 * never observed stays explicitly uncertain: acknowledgement is not verification
 * and absence of a response is not proof that nothing was applied.
 */
export function describeFailure(error: unknown, options: { write?: boolean } = {}): UiFailure {
  const write = options.write === true;
  if (error instanceof ApiError) {
    const envelope = error.envelope.error;
    return {
      kind: 'API',
      code: envelope.code,
      status: error.status,
      title: TITLES[envelope.code] ?? 'Request failed',
      guidance: GUIDANCE[envelope.code] ?? 'The server rejected this request.',
      serverMessage: envelope.message,
      retry: envelope.retry,
      requestId: error.envelope.request_id,
      fieldErrors: envelope.field_errors ? [...envelope.field_errors] : [],
      outcomeUnknown: false,
      sameKeyRetry: envelope.retry === 'SAME_IDEMPOTENCY_KEY',
      needsReauthentication: envelope.retry === 'REAUTHENTICATE' || error.status === 401,
    };
  }
  if (error instanceof DOMException && error.name === 'AbortError') {
    return blank('ABORTED', 'Request cancelled', 'This request was superseded and its response was discarded.', false);
  }
  if (error instanceof SyntaxError || (error instanceof Error && error.name === 'ZodError')) {
    return blank('MALFORMED', 'Contract validation failed',
      'A request or response value did not validate against contract 0.3.0. The outcome is unverified and must not be read as success.', write);
  }
  if (error instanceof TypeError) {
    return blank('NETWORK', write ? 'Outcome unknown' : 'Server unreachable',
      write
        ? 'The request left this browser but no response was observed. It may or may not have been applied. Read the authoritative state before deciding again; do not assume failure.'
        : 'The browser could not reach the local ORVIA server. Check that the profile services and application are running.', write);
  }
  return blank('CLIENT', 'Interface error', 'This interface could not complete the request. No server outcome is implied.', false);
}

function blank(kind: FailureKind, title: string, guidance: string, outcomeUnknown: boolean): UiFailure {
  return { kind, code: null, status: null, title, guidance, serverMessage: null, retry: null, requestId: null,
    fieldErrors: [], outcomeUnknown, sameKeyRetry: false, needsReauthentication: false };
}

/** Field-level lookup for form rendering. */
export function fieldError(failure: UiFailure | null, field: string): string | null {
  if (!failure) return null;
  const match = failure.fieldErrors.find(item => item.field === field || item.field.startsWith(`${field}.`));
  return match ? match.code : null;
}
