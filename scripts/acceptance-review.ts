// Mechanical review of acceptance results (tracking/acceptance.json) before a human reads them.
//
//   pnpm exec tsx scripts/acceptance-review.ts --candidate <sha> --since <ISO time the candidate was frozen>
//
// For every scenario it checks what can be checked without judgement:
//   - PASS or FAIL has at least one evidence path, and every path exists in the repository;
//   - each JSON artifact parses, was recorded at or after --since, and, if it names a commit or candidate, names this one;
//   - a PASS has no failing assertion in any of its artifacts, and at least one assertion in total;
//   - a FAIL has at least one failing assertion (a FAIL without an observed failure is not evidence either);
//   - NOT_RUN is reported as such and is never counted as a pass.
// It does not decide whether the artifacts cover every expected step; that remains the reviewer's job
// (docs/engineering/ACCEPTANCE_MAP.md lists the steps). Exit code 1 if any check fails. Read-only.
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

type Scenario = { id: string; title: string; status: string; evidence?: string[] };
type Assertion = { name?: string; result?: string };

const args = process.argv.slice(2);
const option = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const candidate = option('--candidate');
const since = option('--since');
if (!candidate || !/^[0-9a-f]{7,40}$/.test(candidate) || !since || !Number.isFinite(Date.parse(since))) {
  console.error('Usage: tsx scripts/acceptance-review.ts --candidate <commit sha> --since <ISO time the candidate was frozen>');
  process.exit(2);
}
const sinceMs = Date.parse(since);

const root = resolve(import.meta.dirname, '..');
const tests = (JSON.parse(readFileSync(resolve(root, 'tracking/acceptance.json'), 'utf8')) as { tests: Scenario[] | Record<string, Omit<Scenario, 'id'>> }).tests;
const scenarios: Scenario[] = Array.isArray(tests) ? tests : Object.entries(tests).map(([id, v]) => ({ id, ...v }));

/** Every string value under a key naming a commit or candidate, anywhere in the artifact. */
function commitsIn(value: unknown, out: string[] = []): string[] {
  if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) {
    if (typeof v === 'string' && /commit|candidate|sha$/i.test(k) && /^[0-9a-f]{7,40}$/.test(v)) out.push(v);
    else commitsIn(v, out);
  }
  return out;
}
/** Assertions in the shapes the suites write: {assertions:[{name,result}]} or {checks:[...]} or {results:[...]}. */
function assertionsIn(artifact: Record<string, unknown>): Assertion[] {
  for (const key of ['assertions', 'checks', 'results']) if (Array.isArray(artifact[key])) return artifact[key] as Assertion[];
  return [];
}

const rows: { id: string; status: string; ok: boolean; notes: string[] }[] = [];
for (const s of scenarios) {
  const notes: string[] = [];
  let ok = true;
  const fail = (note: string) => { ok = false; notes.push(note); };
  if (s.status === 'NOT_RUN') { rows.push({ id: s.id, status: s.status, ok: true, notes: ['not run: not a pass'] }); continue; }
  if (s.status !== 'PASS' && s.status !== 'FAIL') { fail(`unknown status ${s.status}`); rows.push({ id: s.id, status: s.status, ok, notes }); continue; }
  const evidence = (s.evidence ?? []).filter(p => !p.endsWith('.md'));
  if (!evidence.length) fail('no artifact listed (a handoff document alone is not an artifact)');
  let total = 0, failed = 0;
  for (const path of evidence) {
    const file = resolve(root, path);
    if (!existsSync(file)) { fail(`missing: ${path}`); continue; }
    if (!path.endsWith('.json')) { notes.push(`not machine-checked: ${path}`); continue; }
    let artifact: Record<string, unknown>;
    try { artifact = JSON.parse(readFileSync(file, 'utf8')); } catch { fail(`unreadable JSON: ${path}`); continue; }
    const at = Date.parse(String(artifact.recorded_at ?? artifact.finished_at ?? artifact.started_at ?? ''));
    if (!Number.isFinite(at)) fail(`no recorded time: ${path}`);
    else if (at < sinceMs) fail(`recorded before the candidate was frozen: ${path}`);
    const named = commitsIn(artifact);
    if (named.length && !named.some(c => candidate.startsWith(c) || c.startsWith(candidate))) fail(`names another commit (${[...new Set(named)].join(', ')}): ${path}`);
    const list = assertionsIn(artifact);
    total += list.length;
    failed += list.filter(a => a.result && a.result !== 'PASS').length + (typeof artifact.failures === 'number' && list.length === 0 ? artifact.failures : 0);
  }
  if (s.status === 'PASS') { if (failed) fail(`${failed} failing assertion(s) behind a PASS`); if (!total) fail('no assertions recorded behind a PASS'); }
  if (s.status === 'FAIL' && !failed) fail('FAIL with no failing assertion recorded');
  notes.unshift(`${total} assertion(s), ${failed} failing`);
  rows.push({ id: s.id, status: s.status, ok, notes });
}

const counts = rows.reduce<Record<string, number>>((m, r) => ({ ...m, [r.status]: (m[r.status] ?? 0) + 1 }), {});
for (const r of rows) console.log(`${r.ok ? 'ok  ' : 'FAIL'} ${r.id.padEnd(4)} ${r.status.padEnd(8)} ${r.notes.join('; ')}`);
console.log(`\nCandidate ${candidate}, frozen ${since}. ${JSON.stringify(counts)}. ${rows.filter(r => !r.ok).length} scenario(s) failed a mechanical check.`);
console.log('Mechanical checks only: a human still confirms each PASS covers every expected step (docs/engineering/ACCEPTANCE_MAP.md).');
process.exit(rows.some(r => !r.ok) ? 1 : 0);
