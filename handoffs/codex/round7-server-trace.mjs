// Passive diagnostic preload. Records no request bodies, credentials or keys.
import { AsyncLocalStorage } from 'node:async_hooks';
import { performance } from 'node:perf_hooks';
import http from 'node:http';
const context = new AsyncLocalStorage();
const errorOriginal = console.error;
console.error = function (...args) {
  const trace = context.getStore();
  if (trace && args.length === 1 && typeof args[0] === 'string') {
    try {
      const data = JSON.parse(args[0]);
      if (data.dependency === 'policy_engine') trace.policy_engine_lines.push({ dependency: data.dependency, attempt: data.attempt, elapsed_ms: data.elapsed_ms, error: data.error });
    } catch { /* Arbitrary console text is never retained in request traces. */ }
  }
  return errorOriginal.apply(this, args);
};
const emit = http.Server.prototype.emit;
http.Server.prototype.emit = function (event, ...args) {
  if (event !== 'request') return emit.call(this, event, ...args);
  const [request, response] = args;
  const trace = { path: request.url?.split('?')[0], method: request.method, dependencies: [], policy_engine_lines: [], opa_scope: 'customer and vendor authorize' };
  response.once('finish', () => {
    if (response.statusCode >= 500) console.error(JSON.stringify({ round7_diagnostic: true, request_id: response.getHeader('x-request-id'), status: response.statusCode, ...trace }));
  });
  return context.run(trace, () => emit.call(this, event, ...args));
};
const fetchOriginal = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const trace = context.getStore();
  const url = String(input instanceof Request ? input.url : input);
  if (!trace || !['/v1/data/orvia/admin/authorize', '/v1/data/orvia/vendor/authorize'].some(path => url.endsWith(path))) return fetchOriginal(input, init);
  const started = performance.now();
  try {
    const response = await fetchOriginal(input, init);
    trace.dependencies.push({ dependency: 'OPA', status: response.status, elapsed_ms: Math.round(performance.now() - started) });
    return response;
  } catch (error) {
    trace.dependencies.push({ dependency: 'OPA', error: error?.name, code: /^[A-Z_]+$/.test(error?.cause?.code) ? error.cause.code : undefined, elapsed_ms: Math.round(performance.now() - started) });
    throw error;
  }
};
