// Read existing run evidence only. This never starts a suite.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
const dir = 'handoffs/codex/artifacts';
const files = readdirSync(dir).filter(p => p.endsWith('.json'));
const evidence = new Map();
for (const file of files) {
  if (!file.startsWith('DPDP-') && !file.startsWith('V1-')) continue;
  try {
    const record = JSON.parse(readFileSync(`${dir}/${file}`, 'utf8'));
    if (record.run_id) {
      const list = evidence.get(record.run_id) ?? [];
      list.push({ file: `${dir}/${file}`, record }); evidence.set(record.run_id, list);
    }
  } catch { /* non-JSON historical artifact is not execution evidence */ }
}
const runs = [];
for (const run of [1, 2, 3]) {
  const ledger = `${dir}/R9-run${run}.jsonl`;
  if (!existsSync(ledger)) continue;
  const rows = readFileSync(ledger, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(s => JSON.parse(s));
  for (const row of rows) {
    if (!row.log) continue;
    const log = readFileSync(row.log, 'utf8');
    const bound = evidence.get(row.run_id) ?? [];
    for (const m of log.matchAll(/(?:Artifact:|artifact:)\s*(handoffs\/codex\/artifacts\/[^\s]+\.json)/gi)) {
      if (bound.some(e => e.file === m[1]) || !existsSync(m[1])) continue;
      const record = JSON.parse(readFileSync(m[1], 'utf8'));
      // Explicitly named by this command, and generated during its execution.
      const stamp = record.recorded_at ?? record.generated_at;
      if (stamp && stamp >= row.started_at && stamp <= row.ended_at) bound.push({ file: m[1], record });
    }
    // A suite may write intermediate evidence and a final copy of the same
    // assertions. Never add those copies together.
    const lists = bound.map(e => e.record.assertions ?? e.record.results ?? []).filter(Array.isArray);
    const checks = lists.sort((a, b) => b.length - a.length)[0] ?? [];
    const summary = [...log.matchAll(/(?:^|\n)(\d+) assertions, (\d+) failures\./g)].at(-1);
    const fraction = [...log.matchAll(/(?:^|\n)[^\n]*?\b(\d+)\/(\d+) passed\b/g)].at(-1);
    row.evidence = bound.map(e => e.file);
    row.assertions = summary ? Number(summary[1]) : fraction ? Number(fraction[2]) : checks.length || null;
    row.assertion_failures = summary ? Number(summary[2]) : fraction ? Number(fraction[2]) - Number(fraction[1]) : checks.filter(c => typeof c === 'object' && ['FAIL', 'FAILED'].includes(c.result)).length;
    row.count_source = summary || fraction ? 'terminal suite summary' : checks.length ? 'largest run-bound assertion artifact; intermediate copies not added' : 'no assertion count reported';
    row.first_error = row.status === 'FAILED' ? log.split(/\r?\n/).find(s => /(^FAIL\b|AssertionError|Assertion failed:|Error:|Timeout \d+ms exceeded|"result":"FAIL")/.test(s))
      ?? log.split(/\r?\n/).find(s => /code:/.test(s)) ?? 'Nonzero exit; inspect complete log.' : null;
  }
  runs.push({ run, completed: existsSync(`${dir}/R9-run${run}-results.json`),
    counts: Object.fromEntries(['PASS', 'FAILED', 'NOT_RUN'].map(s => [s, rows.filter(r => r.kind === 'suite' && r.status === s).length])), rows });
}
writeFileSync(`${dir}/R9-summary.json`, JSON.stringify({ generated_at: new Date().toISOString(), runs }, null, 2) + '\n');
console.log(JSON.stringify(runs.map(r => ({ run: r.run, completed: r.completed, counts: r.counts,
  failures: r.rows.filter(x => x.status === 'FAILED').map(x => ({ suite: x.label, first_error: x.first_error, log: x.log })) })), null, 2));
