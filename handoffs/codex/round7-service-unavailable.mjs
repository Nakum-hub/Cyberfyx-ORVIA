// Safe request/dependency evidence only; no bodies, cookies or credentials.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
const root = 'handoffs/codex/artifacts';
const reports = [];
for (const file of readdirSync(root).filter(name => /^R7V-.*-diagnostic\.jsonl$/.test(name))) {
  const rows = readFileSync(`${root}/${file}`, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const ids = new Set(rows.filter(row => row.status === 503 || row.server?.status === 503).map(row => row.request_id ?? row.server?.request_id).flat().filter(id => typeof id === 'string'));
  for (const request_id of ids) {
    const browser = rows.find(row => row.status === 503 && row.request_id === request_id);
    const server = rows.find(row => row.server?.status === 503 && [row.server.request_id].flat().includes(request_id))?.server;
    const operation = rows.find(row => row.server?.request_id === request_id && row.server.operation)?.server;
    const start = browser?.issued_at, end = browser?.at;
    reports.push({
      file, request_id, status: 503, url: browser?.url ?? server?.path, issuing_page: browser?.page ?? null,
      observer_started_at: start ?? null, observer_response_at: end ?? null,
      observed_interval_ms: start && end ? Date.parse(end) - Date.parse(start) : null,
      operation: operation ?? null, opa_calls: server?.dependencies ?? [],
      opa_scope: server?.opa_scope ?? 'customer admin authorize only; earlier preload did not instrument vendor policy calls',
      policy_engine_lines_in_request_context: server?.policy_engine_lines ?? null,
      note: server?.policy_engine_lines === undefined
        ? 'Older preload did not bind policy-engine console lines to the request. Original lines remain in the same diagnostic file; use the request-bound OPA trace for correlation, not timestamp proximity alone.'
        : 'Policy-engine payloads are captured within this HTTP request async context. Empty arrays mean no calls or failures were observed within the stated instrumentation scope; they do not identify another cause.',
    });
  }
  for (const row of rows.filter(row => (row.status === 503 || row.server?.status === 503) && !(row.request_id ?? row.server?.request_id))) {
    reports.push({ file, request_id: null, status: 503, url: row.url ?? row.server?.path, issuing_page: row.page ?? null, observer_at: row.at, opa_calls: row.server?.dependencies ?? [], policy_engine_lines_in_request_context: row.server?.policy_engine_lines ?? null, opa_scope: row.server?.opa_scope ?? 'customer admin authorize only', note: 'No request ID was provided. This is an anonymous diagnostic record, not asserted to be a distinct request from another anonymous record.' });
  }
}
writeFileSync(`${root}/R7V-service-unavailable.json`, JSON.stringify(reports, null, 2));
console.log(JSON.stringify({identified_requests: reports.filter(row => row.request_id).length, anonymous_records: reports.filter(row => !row.request_id).length, request_ids: reports.filter(row => row.request_id).map(row => row.request_id)}));
