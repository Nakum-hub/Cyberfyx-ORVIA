// Render only completed Round 9 execution records into the existing matrix.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const summary = JSON.parse(readFileSync('handoffs/codex/artifacts/R9-summary.json', 'utf8'));
if (!summary.runs.some(r => r.run === 2 && r.completed) || summary.runs.some(r => !r.completed)) throw new Error('Targeted execution is incomplete');
if (existsSync('handoffs/codex/artifacts/R9-run3.jsonl') && !summary.runs.some(r => r.run === 3 && r.completed)) throw new Error('Run 3 summary is missing');
const latest = new Map();
for (const run of summary.runs) for (const row of run.rows) if (row.kind === 'suite') latest.set(row.label, { ...row, run: run.run });
const suiteId = path => path.replace(/^tests\//, '').replace(/\.test\.ts$|\.spec\.ts$|\.ts$/g, '').replace(/-local$|-preflight$/g, '').replaceAll('/', '-');
const byId = new Map([...latest.values()].map(r => [suiteId(r.label), r]));
const target = 'docs/engineering/V1_VERIFICATION_MATRIX.md';
const before = execFileSync('git', ['show', `a14470c8d04048856694c520bbab69fcdbf77217:${target}`], { encoding: 'utf8' });
let after = before.replace(/^Generated from executed battery summaries.*$/m,
  'Round 9 verification on the synthetic codex-a00 and vendor-a00 development stores, integrated base `a14470c8`. Runtime rows below use the latest executed Round 9 result (discovery `106c5599`, fixes `7217f2b8`; exact later sources and commands are in `handoffs/codex/artifacts/R9-summary.json`). PASS is component evidence on this host, not release qualification, production qualification or owner acceptance. Family acceptance states are unchanged. The policy gate remains explicitly historical evidence.');
after = after.replace(/`([^`]+)` (PASS|FAILED|NOT_RUN)(?: \([^\n)]*\)| \d+ assertions, \d+ failures\.|:[^<|\n]+)?/g, (whole, id) => {
  const row = byId.get(id); if (!row) return whole;
  if (row.status === 'NOT_RUN') return `\`${id}\` NOT_RUN: ${row.reason}`;
  return `\`${id}\` ${row.status}${row.assertions === null || row.assertions === undefined ? '' : ` (${row.assertions} assertions, ${row.assertion_failures} failures)`}`;
});
after = after.replace(/`policy-gate` PASS(?: \([^\n)]*\))?/g, '`policy-gate` HISTORICAL PASS (not rerun in Round 9)');
after = after.replace(/`e2e-backups-and-recovery-2` PASS[^\n]*/g, '`e2e-backups-and-recovery-2` HISTORICAL PASS (older alias; Round 9 evidence is `e2e-backups-and-recovery` above).');
const counts = Object.fromEntries(['PASS', 'FAILED', 'NOT_RUN'].map(status => [status, [...latest.values()].filter(r => r.status === status).length]));
const acl = latest.get('tests/security/function-acl.ts');
const section = `<!-- ROUND9 EVIDENCE START -->
## Round 9 execution boundary

Latest runtime-suite results: **${counts.PASS} PASS, ${counts.FAILED} FAILED, ${counts.NOT_RUN} NOT_RUN**. Discovery and each targeted attempt remain separately recorded; a later result does not erase its earlier failure. See [the Round 9 handoff](../../handoffs/codex/2026-10-02-round9.md) for causes, fix commits, commands and limitations.

| Additional observed control | Latest result |
|---|---|
| Installed function ACL after protected initialization: six functions, five runtime roles and PUBLIC | \`security-function-acl\` ${acl.status} (${acl.assertions} assertions, ${acl.assertion_failures} failures; includes installation identity and RLS checks) |
| Customer app tables with enabled and forced RLS | 222 inspected by the same ACL suite; no missing table protection in its passing evidence |

The following suites remain NOT_RUN; they are not skipped assertions or substituted local acceptance:

${[...latest.values()].filter(r => r.status === 'NOT_RUN').map(r => `- \`${r.label}\`: ${r.reason}`).join('\n')}

The 1,000-item regulatory-impact boundary was not directly asserted by the existing regulatory suite. The owner question about erasure-ledger retention (currently 30 days after backups age out) remains undecided.
<!-- ROUND9 EVIDENCE END -->`;
after = /<!-- ROUND9 EVIDENCE START -->[\s\S]*?<!-- ROUND9 EVIDENCE END -->/.test(after)
  ? after.replace(/<!-- ROUND9 EVIDENCE START -->[\s\S]*?<!-- ROUND9 EVIDENCE END -->/, section) : after.trimEnd() + '\n\n' + section + '\n';
after = after.replace(/[ \t]+$/gm, '');
const oldRows = new Map(before.split(/\r?\n/).filter(l => l.startsWith('|')).map(l => [l.split('|')[1].trim(), l]));
const changedRows = after.split(/\r?\n/).filter(l => l.startsWith('|')).map(line => ({ row: line.split('|')[1].trim(), before: oldRows.get(line.split('|')[1].trim()) ?? null, after: line }))
  .filter(r => r.before !== r.after && !/^[-:]+$/.test(r.row));
writeFileSync(target, after);
writeFileSync('handoffs/codex/artifacts/R9-matrix-changes.json', JSON.stringify({ counts, changed_rows: changedRows }, null, 2) + '\n');
console.log(JSON.stringify({ counts, changed_rows: changedRows.map(r => r.row) }));
