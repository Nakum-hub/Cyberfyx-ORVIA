// Legacy vendor/crawl writers lack run IDs. Preserve their reports as
// supplemental records, never use their timestamps as primary PASS evidence.
import { copyFileSync, existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const sources = 'handoffs/code/artifacts';
const kinds = {
  'tests/e2e/interface-crawl-local.ts': 'interface-crawl',
  'tests/integration/vendor/audit-practice.test.ts': 'audit-practice',
  'tests/integration/vendor/vendor-audit.test.ts': 'vendor-audit',
};
const records = [];
for (const run of [1, 2, 3]) {
  const ledger = `handoffs/codex/artifacts/R9-run${run}.jsonl`;
  if (!existsSync(ledger)) continue;
  const rows = readFileSync(ledger, 'utf8').trim().split(/\r?\n/).map(s => JSON.parse(s));
  for (const row of rows) {
    const kind = kinds[row.label]; if (!kind || !row.ended_at) continue;
    const matches = readdirSync(sources).filter(file => {
      if (!file.startsWith(`${kind}-`)) return false;
      const m = file.slice(kind.length + 1).match(/^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z\.json$/);
      if (!m) return false;
      const stamp = `${m[1]}T${m[2]}:${m[3]}:${m[4]}.${m[5]}Z`;
      return stamp >= row.started_at && stamp <= row.ended_at;
    });
    if (matches.length !== 1) throw new Error(`Ambiguous supplemental report for run ${run} ${kind}`);
    const source = `${sources}/${matches[0]}`;
    const destination = `handoffs/codex/artifacts/R9-run${run}-${kind}-supplemental.json`;
    const bytes = readFileSync(source); const sha256 = createHash('sha256').update(bytes).digest('hex');
    copyFileSync(source, destination);
    records.push({ run, suite: row.label, source, destination, sha256, primary_command_log: row.log,
      binding: 'Supplemental report from the isolated worktree and execution interval. It lacks a run ID; command exit and console assertions remain the primary evidence.' });
  }
}
writeFileSync('handoffs/codex/artifacts/R9-supplemental-manifest.json', JSON.stringify(records, null, 2) + '\n');
console.log(JSON.stringify({ reports: records.length }));
