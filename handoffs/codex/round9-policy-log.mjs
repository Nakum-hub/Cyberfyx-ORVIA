// Read retained synthetic OPA metadata; no policy requests or tests are run.
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const result = spawnSync('docker', ['logs', '--since', '2026-10-02T06:18:21Z', '--until', '2026-10-02T06:39:59Z', 'orvia-round9-opa'],
  { encoding: 'utf8', windowsHide: true, maxBuffer: 32 * 1024 * 1024 });
if (result.status !== 0) throw new Error('Policy log read failed');
const rows = (result.stdout + '\n' + result.stderr).split(/\r?\n/).filter(s => s.startsWith('{')).map(s => JSON.parse(s));
const sent = rows.filter(r => r.msg === 'Sent response.');
const top = [...sent].sort((a, b) => b.resp_duration - a.resp_duration).slice(0, 20)
  .map(r => ({ time: r.time, request: r.req_id, path: r.req_path, duration_ms: r.resp_duration, status: r.resp_status }));
const replied = new Set(sent.map(r => r.req_id));
const missing = rows.filter(r => r.msg === 'Received request.' && !replied.has(r.req_id)).map(r => ({ time: r.time, request: r.req_id, path: r.req_path }));
const record = { command: ['docker', 'logs', '--since', '2026-10-02T06:18:21Z', '--until', '2026-10-02T06:39:59Z', 'orvia-round9-opa'],
  exit_code: result.status, received: rows.filter(r => r.msg === 'Received request.').length, sent: sent.length,
  non_200: sent.filter(r => r.resp_status !== 200).length, slowest: top, missing_responses_in_interval: missing,
  limitation: 'Container HTTP timing only. It cannot measure time before a request reached the service, or the Windows browser/app event loop.' };
writeFileSync('handoffs/codex/artifacts/R9-run1-crawl-policy-metadata.json', JSON.stringify(record, null, 2) + '\n');
console.log(JSON.stringify(record, null, 2));
