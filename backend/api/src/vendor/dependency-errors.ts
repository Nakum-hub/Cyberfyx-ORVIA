type VendorFailureStage = 'VENDOR_SESSION_READ' | 'ACCOUNT_SESSION_READ';
const stages = new WeakMap<object, VendorFailureStage>();
const statuses: Readonly<Record<string, number>> = {
  BAD_REQUEST: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404,
  CONFLICT: 409, TOO_MANY_REQUESTS: 429, INTERNAL_SERVER_ERROR: 500,
  BAD_GATEWAY: 502, SERVICE_UNAVAILABLE: 503, GATEWAY_TIMEOUT: 504,
};

/** Retain a bounded internal stage and rethrow the original dependency failure. */
export function markVendorFailure(error: unknown, stage: VendorFailureStage): never {
  try {
    if (error !== null && (typeof error === 'object' || typeof error === 'function') &&
      (stage === 'VENDOR_SESSION_READ' || stage === 'ACCOUNT_SESSION_READ')) stages.set(error, stage);
  } catch { /* Diagnostics must never replace the original failure. */ }
  throw error;
}

/** Own data only: no getters, messages, bodies, headers or credential values. */
export function vendorFailureMetadata(error: unknown): { dependency_status?: number; failure_stage?: VendorFailureStage } {
  try {
    if (error === null || (typeof error !== 'object' && typeof error !== 'function')) return {};
    const own = (key: string): unknown => {
      const descriptor = Object.getOwnPropertyDescriptor(error, key);
      return descriptor && 'value' in descriptor ? descriptor.value : undefined;
    };
    const numeric = own('statusCode'), named = own('status');
    const status = typeof numeric === 'number' && Number.isInteger(numeric) && numeric >= 100 && numeric <= 599
      ? numeric : typeof named === 'string' && Object.hasOwn(statuses, named) ? statuses[named] : undefined;
    const stage = stages.get(error);
    return { ...(status !== undefined ? { dependency_status: status } : {}), ...(stage ? { failure_stage: stage } : {}) };
  } catch { return {}; }
}
