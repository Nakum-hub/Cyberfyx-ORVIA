// Runs the DPDP operations integration suites one after another against the
// configured profile and reports each suite's own exit status. A suite that is
// not run is reported NOT_RUN; nothing is summarised as passing unless it passed.
import { spawnSync } from 'node:child_process';

export const operationsSuites = ['regulatory', 'applicability', 'registry', 'estate-import', 'notices', 'consent-withdrawal', 'rights', 'correction', 'processors', 'breach', 'sdf', 'runner', 'retention-scale'];
const only = process.argv.slice(2);
const unknown = only.filter(name => !operationsSuites.includes(name));
if (unknown.length) throw new Error(`Unknown operations suite(s): ${unknown.join(', ')}`);
const results: { suite: string; status: 'PASS' | 'FAIL' | 'NOT_RUN' }[] = [];
for (const suite of operationsSuites) {
  if (only.length && !only.includes(suite)) { results.push({ suite, status: 'NOT_RUN' }); continue; }
  const run = spawnSync(process.execPath, ['--import', 'tsx', `tests/integration/operations/${suite}.test.ts`], { stdio: 'inherit' });
  results.push({ suite, status: run.status === 0 ? 'PASS' : 'FAIL' });
}
console.table(results);
if (results.some(r => r.status === 'FAIL')) process.exitCode = 1;
