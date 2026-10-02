// Diagnostic only: observes failing response consumption, including in-process handlers. Import and promise timing change; no endpoint attribution is claimed.
import { appendFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
import { syncBuiltinESMExports } from 'node:module';
const label = process.env.R8_VENDOR_TEAM_DIAGNOSTIC_LABEL;
if (!label || !/^[a-z0-9-]{1,40}$/.test(label) || !['codex-a00', 'vendor-a00'].includes(process.env.ORVIA_PROFILE)) throw new Error('Explicit synthetic vendor diagnostic label required');
const artifact = fileURLToPath(new URL(`./artifacts/R8-${label}-vendor-team-${process.pid}.jsonl`, import.meta.url));
writeFileSync(artifact, '', { flag: 'wx' });
const codes = new Set(['SERVICE_UNAVAILABLE','UNAUTHENTICATED','FORBIDDEN','VALIDATION_ERROR','RATE_LIMITED','UNAUTHORIZED','TOO_MANY_REQUESTS']);
const own = (value, key) => {
  if (!value || typeof value !== 'object') return undefined;
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
};
let records = 0; let bytes = 0; let stopped = false;
function record(event) {
  if (stopped) return;
  const line = JSON.stringify(event) + '\n';
  if (records >= 100 || bytes + Buffer.byteLength(line) > 65536 - 256) {
    stopped = true;
    appendFileSync(artifact, '{"kind":"DIAGNOSTIC_TRUNCATED","record_limit":100,"byte_limit":65536}\n');
    return;
  }
  appendFileSync(artifact, line); records++; bytes += Buffer.byteLength(line);
}
const original = Response.prototype.text;
// Installed better-auth 1.7.5 resolves @better-auth/utils 0.4.2's node
// password export, which imports scrypt from node:crypto. Observe all process
// scrypt calls; these event IDs do not assert which call created a member.
const originalScrypt = crypto.scrypt;
let nextScrypt = 0;
const safeRecord = event => { try { record(event); } catch { /* Preserve crypto behavior. */ } };
crypto.scrypt = function (...args) {
  const id = ++nextScrypt; const started = performance.now();
  safeRecord({ at: new Date().toISOString(), kind: 'SCRYPT_START', id });
  const last = args.length - 1;
  if (typeof args[last] === 'function') {
    const callback = args[last];
    args[last] = function (...callbackArgs) {
      safeRecord({ at: new Date().toISOString(), kind: 'SCRYPT_END', id, elapsed_ms: Math.round(performance.now() - started), error: !!callbackArgs[0] });
      return Reflect.apply(callback, this, callbackArgs);
    };
  }
  try { return Reflect.apply(originalScrypt, this, args); }
  catch (error) {
    safeRecord({ at: new Date().toISOString(), kind: 'SCRYPT_END', id, elapsed_ms: Math.round(performance.now() - started), error: true });
    throw error;
  }
};
syncBuiltinESMExports();
const originalFetch = globalThis.fetch;
globalThis.fetch = function (...args) {
  let selected = false;
  try {
    const input = args[0];
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url);
    selected = url.protocol === 'http:' && url.hostname === '127.0.0.1' && url.port === '58181' && url.pathname === '/v1/data/orvia/vendor/authorize';
  } catch { /* Preserve original input validation. */ }
  const started = performance.now();
  const failed = error => {
    try {
      const name = own(error, 'name'); const cause = own(error, 'cause');
      const code = own(error, 'code') ?? own(cause, 'code');
      safeRecord({ at: new Date().toISOString(), kind: 'VENDOR_OPA_FAILURE', elapsed_ms: Math.round(performance.now() - started),
        error_name: ['Error','TypeError','AbortError','TimeoutError'].includes(name) ? name : error instanceof TypeError ? 'TypeError' : 'UNCLASSIFIED',
        error_code: ['ECONNREFUSED','ECONNRESET','ETIMEDOUT','ENOTFOUND','EAI_AGAIN','ABORT_ERR'].includes(code) ? code : 'UNCLASSIFIED' });
    } catch { /* Preserve original rejection. */ }
  };
  let promise;
  try { promise = Reflect.apply(originalFetch, this, args); }
  catch (error) { if (selected) failed(error); throw error; }
  if (!selected) return promise;
  return promise.then(async response => {
    let booleanResultShape = false;
    try { booleanResultShape = typeof own(await response.clone().json(), 'result') === 'boolean'; } catch { /* Shape unknown. */ }
    safeRecord({ at: new Date().toISOString(), kind: 'VENDOR_OPA_RESPONSE', elapsed_ms: Math.round(performance.now() - started), status: response.status, boolean_result_shape: booleanResultShape });
    return response;
  }, error => { failed(error); throw error; });
};
Response.prototype.text = function (...args) {
  const response = this;
  const promise = Reflect.apply(original, this, args);
  if (response.status !== 503) return promise;
  return promise.then(text => {
    try {
      const data = JSON.parse(text); const error = own(data, 'error');
      const code = own(error, 'code');
      if (code !== 'SERVICE_UNAVAILABLE') return text;
      const message = own(error, 'message');
      const header = response.headers.get('X-Request-Id') ?? own(data, 'request_id');
      const requestId = typeof header === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(header) ? header.toLowerCase() : undefined;
      record({ at: new Date().toISOString(), kind: 'VENDOR_RESPONSE_FAILURE', status: 503, code: codes.has(code) ? code : 'UNKNOWN', request_id: requestId,
        bucket: message === 'Request audit unavailable.' ? 'REQUEST_AUDIT_UNAVAILABLE' : 'OTHER' });
    } catch { /* Parsing or recording must not replace the original text. */ }
    return text;
  }, error => { throw error; });
};
