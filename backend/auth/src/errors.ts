import type { Domain } from './server.ts';
export type AuthFailureStage = 'AUTH_LIBRARY_HANDLER' | 'AUTH_MFA_SESSION_READ' | 'AUTH_MFA_PROOF_INSERT' | 'AUTH_PASSWORD_SESSION_READ' | 'AUTH_PASSWORD_STATE_UPDATE' | 'AUTH_AUDIT_INSERT';
const names = new Set(['Error', 'error', 'TypeError', 'RangeError', 'AggregateError', 'AbortError', 'TimeoutError', 'APIError', 'DatabaseError', 'DrizzleError', 'DrizzleQueryError', 'TransactionRollbackError']);
const codes = new Set(['57014','55P03','53300','53400','53200','53100','54000','08000','08001','08003','08004','08006','08P01','40001','40P01','42501','23502','23503','23505','23514','25P02','42P01','42703','42883','P0001','57P01','57P02','57P03','XX000',
  'ECONNREFUSED','ECONNRESET','ETIMEDOUT','EPIPE','ENOTFOUND','EAI_AGAIN','EACCES','EPERM','ENOMEM','ABORT_ERR','ERR_OUT_OF_RANGE','ERR_INVALID_ARG_TYPE','ERR_CRYPTO_INVALID_SCRYPT_PARAMS','UND_ERR_CONNECT_TIMEOUT','UND_ERR_HEADERS_TIMEOUT','UND_ERR_BODY_TIMEOUT']);
const publicCodes = new Set(['SERVICE_UNAVAILABLE','UNAUTHENTICATED','UNAUTHORIZED','FORBIDDEN','NOT_FOUND','RATE_LIMITED','TOO_MANY_REQUESTS','INVALID_EMAIL_OR_PASSWORD','INVALID_EMAIL','EMAIL_PASSWORD_DISABLED','EMAIL_NOT_VERIFIED','FAILED_TO_CREATE_SESSION','INVALID_ORIGIN','INVALID_CONTENT_TYPE','INVALID_BODY','UNSUPPORTED_METHOD','INVALID_CALLBACK','METHOD_NOT_ALLOWED','SESSION_UNAVAILABLE','MFA_ENROLLMENT_REQUIRED']);
const stages = new Set<AuthFailureStage>(['AUTH_LIBRARY_HANDLER','AUTH_MFA_SESSION_READ','AUTH_MFA_PROOF_INSERT','AUTH_PASSWORD_SESSION_READ','AUTH_PASSWORD_STATE_UPDATE','AUTH_AUDIT_INSERT']);
function field(value: unknown, key: string): unknown {
  if (!value || typeof value !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}
function uuid(value: unknown) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) ? value.toLowerCase() : undefined;
}
function status(value: unknown) { return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : undefined; }
function publicCode(value: unknown) { return typeof value === 'string' && publicCodes.has(value) ? value : 'UNKNOWN'; }
/** Own cause values only; no getters, messages, SQL, parameters or objects are serialized. */
export function authErrorChain(error: unknown) {
  const chain: { name: string; code: string }[] = []; const seen = new Set<unknown>();
  let current: unknown = error;
  for (let depth = 0; depth < 5; depth++) {
    if (seen.has(current)) break; seen.add(current);
    const name = field(current, 'name'); const code = field(current, 'code');
    const fallback = current instanceof TypeError ? 'TypeError' : current instanceof RangeError ? 'RangeError' : 'Error';
    chain.push({ name: typeof name === 'string' && names.has(name) ? name : fallback, code: typeof code === 'string' && codes.has(code) ? code : 'UNCLASSIFIED' });
    const cause = field(current, 'cause'); if (!cause || typeof cause !== 'object') break; current = cause;
  }
  return chain;
}
/** A bounded local diagnostic; never changes authorization, audit or exception semantics. */
export function logAuthDependencyFailure(error: unknown, metadata: { request_id: string; domain: Domain; stage: AuthFailureStage; response_status?: number }) {
  try {
    console.error(JSON.stringify({ event: 'AUTH_DEPENDENCY_FAILURE', request_id: uuid(metadata.request_id),
      domain: ['staff','principal','vendor','account'].includes(metadata.domain) ? metadata.domain : 'unknown',
      stage: stages.has(metadata.stage) ? metadata.stage : 'AUTH_LIBRARY_HANDLER',
      ...(status(metadata.response_status) !== undefined ? { response_status: status(metadata.response_status) } : {}), causes: authErrorChain(error) }));
  } catch { /* A diagnostic must not replace the original exception. */ }
}
export class AuthLoginFailure extends Error {
  readonly code = 'AUTH_LOGIN_FAILED';
  constructor(readonly http_status: number, readonly response_code: string, readonly request_id?: string) { super('Synthetic login failed'); this.name = 'AuthLoginFailure'; }
}
export function authLoginMetadata(error: AuthLoginFailure) {
  return { ...(status(field(error, 'http_status')) !== undefined ? { http_status: status(field(error, 'http_status')) } : {}),
    response_code: publicCode(field(error, 'response_code')), ...(uuid(field(error, 'request_id')) ? { request_id: uuid(field(error, 'request_id')) } : {}) };
}
/** Select only public failure metadata; successful responses are never parsed here. */
export async function failedAuthResponse(response: Response) {
  let data: unknown; try { data = await response.clone().json(); } catch { /* Non-JSON failure stays UNKNOWN. */ }
  const nested = field(data, 'error');
  return new AuthLoginFailure(response.status, publicCode(field(nested, 'code') ?? field(data, 'code')),
    uuid(response.headers.get('X-Request-Id')) ?? uuid(field(data, 'request_id')));
}
