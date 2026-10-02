// Fixed synthetic dependency readiness; not a business-suite retry.
import { writeFileSync } from 'node:fs';
const label = process.argv[2];
if (process.argv.length !== 3 || !/^[a-z0-9-]{1,60}$/.test(label ?? '') || process.env.ORVIA_PROFILE !== 'codex-a00') throw new Error('Fixed synthetic readiness label required');
const path = `handoffs/codex/artifacts/R8-${label}-policy-prerequisite.json`;
writeFileSync(path, '', { flag: 'wx' });
const started_at = new Date().toISOString();
const deadline = Date.now() + 30000;
const observations = [];
let ready = false;
while (Date.now() < deadline) {
  try {
    const response = await fetch('http://127.0.0.1:58181/health', { signal: AbortSignal.timeout(Math.min(2000, deadline - Date.now())) });
    observations.push({ at: new Date().toISOString(), status: response.status });
    if (response.status === 200) { ready = true; break; }
  } catch (error) { observations.push({ at: new Date().toISOString(), error_class: error instanceof Error ? error.name : 'UnknownError' }); }
  await new Promise(resolve => setTimeout(resolve, Math.min(500, Math.max(0, deadline - Date.now()))));
}
writeFileSync(path, JSON.stringify({ started_at, ended_at: new Date().toISOString(), dependency: 'owned synthetic policy engine', observations, ready, exit_code: ready ? 0 : 1 }, null, 2) + '\n');
console.log(JSON.stringify({ artifact: path, ready, exit_code: ready ? 0 : 1 }));
process.exitCode = ready ? 0 : 1;
