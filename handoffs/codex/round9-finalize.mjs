// Documentation only: consume completed execution records; never run tests.
import { readFileSync, writeFileSync } from 'node:fs';
const summary = JSON.parse(readFileSync('handoffs/codex/artifacts/R9-summary.json', 'utf8'));
if (summary.runs.length !== 3 || summary.runs.some(r => !r.completed)) throw new Error('All three runs must be complete');
const matrix = JSON.parse(readFileSync('handoffs/codex/artifacts/R9-matrix-changes.json', 'utf8'));
const latest = new Map();
for (const run of summary.runs) for (const row of run.rows) if (row.kind === 'suite') latest.set(row.label, row);
const failed = [...latest.values()].filter(r => r.status === 'FAILED');
const notRun = [...latest.values()].filter(r => r.status === 'NOT_RUN');
const runTable = summary.runs.map(r => `| ${r.run} | \`node --import tsx handoffs/codex/round9-run.mjs ${r.run}\` | ${r.rows.some(x => x.status === 'FAILED') ? 1 : 0} | ${r.counts.PASS} / ${r.counts.FAILED} / ${r.counts.NOT_RUN} | \`${r.rows[0].head}\` | [ledger](artifacts/R9-run${r.run}.jsonl) |`).join('\n');
const buildIds = JSON.parse(readFileSync('handoffs/codex/artifacts/R9-build-identities.json', 'utf8'));
const failureTables = [...readFileSync('handoffs/codex/round9-triage.md', 'utf8').matchAll(/\| Suite \|[\s\S]*?(?=\n\n)/g)].map(m => m[0]);
const text = `# Handoff — V1-ROUND9 — integrated verification

**Base commit:** a14470c8d04048856694c520bbab69fcdbf77217, integrated origin/claude/upbeat-newton-w4h53x; bf3010f ancestry verified.
**Branch:** codex/round9, isolated worktree. The original dirty main checkout was preserved.
**Source commits:** 106c55991469738a03dbe7926d9fd6f9668f3ab9 (serial runner and observed ACL); 7217f2b856806c10c7aa233a05d09dae874d7477 (discovery fixes); fcce3e115066f2bceb6aaa70011e318743f6102a (Run 2 fixture corrections). The final evidence-only commit follows these; resolve it from this file's git history.
**Source master SHA-256:** C51102A7CDA5FE15C1346E8C34167C406E186C691E9BA86576A3D8FD03BB550B, unchanged.
**Contract:** customer 0.55.0, vendor 0.6.0. No schema/contract-shape change; customer 0092, vendor 0018 and customer contract 0.56.0 remain unused.
**Scope/profile:** synthetic codex-a00 customer and vendor-a00 stores, one serial runtime writer. No shared DB reset, real-person admission, deployment, main merge or production credentials.

## Delivered

Observed installed function privileges after protected initialization, including inherited execution permissions and PUBLIC, plus forced RLS on all 222 app tables. Added bounded runtime-container selection so outage, persistence and backup controls exercise the actual owned dependencies. Corrected criteria-review interaction and vendor-channel visibility. Isolated notification fixtures from historical enabled relays; added finally cleanup for each canary test's own relay. Batched scoped registry page reads while preserving history caps, paging, detail fields and isolation controls.

Exact changed files are listed in [R9-changed-files.json](artifacts/R9-changed-files.json). [Discovery and second-pass triage](round9-triage.md) records every failure, first error, root cause/classification and same-pattern review. The nine discovery corrections belong to 7217f2b8; the two Run 2 test faults belong to fcce3e11. The crawl's underlying host/transport delay remains unproven; a later passing crawl does not establish that historical root cause.

Initial allowed paths were verification harness/evidence, discovery-justified product/test fixes, matrix, inventory and handoff. Approved masters remained read-only. The plan was one full discovery, root-cause/fix review, cheap checks, then at most two targeted passes. No suite was retried within a run, skipped or quarantined.

## Commands actually executed

Pinned runtime: Node 24.21.0 from the checkout's local tools, with tsx. The runner records every exact subprocess command, run ID, source HEAD, UTC interval, exit and log. Run 1 executed customer migration, vendor-init confirm:vendor-a00, auth-init, machine-init and one build before all manifested suites; all prerequisites exited 0. Runs 2 and 3 each repeated auth-init/machine-init and one build, then the identical 21-suite targeted set. Protected machine enrollment was renewed between the listed long-running suites, without changing expiry or product controls.

| Run | Command | Exit | PASS / FAILED / NOT_RUN suites | Source HEAD | Evidence |
|---|---|---|---|---|---|
${runTable}

Run 1 manifested 119 suites: 91 integration, all six security .ts files, and 22 browser/transport files. It executed 108 and retained 11 explicit NOT_RUN prerequisites. Run 2/3 target files are byte-identical. All three runtime runs are consumed; no fourth run is authorized or performed.

Build identities: ${buildIds.map(b => `Run ${b.run}: \`${b.build_id}\``).join('; ')}.

Cheap commands were executed through \`node handoffs/codex/round9-checks.mjs before-run2\` and \`before-run3\`: qualification inventory regeneration; pnpm test; contracts:check; typecheck; lint; tracking:check; qualification-inventory --check; v1-source-inventory --check. Both unit passes recorded 396 PASS, zero failures/skips. Before Run 2, typecheck initially exited 2 for inferred empty result arrays; explicit types fixed it and a direct \`node node_modules/typescript/bin/tsc --noEmit\` exited 0. Every before-run3 check exited 0. All 218 immutable master sections remain inventoried. [Check logs](artifacts/R9-checks-before-run3.json) retain exact commands/exits; inventory was regenerated after the final fixture corrections.

Preparation used an offline frozen-lockfile install (367 packages, exit 0), branch ancestry checks and an isolated worktree. Read-only profile counts and OPA/PostgreSQL diagnostic reads are observations, not extra test runs. Report, supplemental-copy, matrix and publication scripts only process existing artifacts.

## Every failure and fix attribution

The following tables preserve the first error and discovery-time causal analysis, including the originally pending plans. The bounded Run 1 corrections were implemented in 7217f2b8 (the environmental policy-delay cause remains unproven); the Run 2 corrections were implemented in fcce3e11. All listed suites passed their final targeted attempt. Bootstrap is included as an invalid-coverage finding despite its initial exit 0.

${failureTables.join('\n\n')}

## Acceptance and changed matrix rows

Latest suite state across the three runs: **${matrix.counts.PASS} PASS, ${matrix.counts.FAILED} FAILED, ${matrix.counts.NOT_RUN} NOT_RUN**. Earlier failures remain in their original ledgers. Per-suite assertion counts and count provenance are in [R9-summary.json](artifacts/R9-summary.json); duplicate intermediate artifacts are not added together. The intentionally broken regression fixture is expected negative-control detection, not a healthy fixture PASS.

The ACL suite covers six functions (the request lists six despite calling them five): owner_recovery_issue, admit_real_principals and record_ledger_upgrade_boundary have no runtime grants; canary_marketing_hold permits only app/sender; withhold_real_decoy_message permits only worker; real_decoy_recipient permits none. All five runtime roles and PUBLIC are inspected. Its 46 assertions also cover identity, function presence and 222 enabled/forced-RLS tables.

Required discovery coverage includes canary admission/retirement, claim-then-designate withholding, 0090 ledger coverage plus 0091 BEFORE_UPGRADE boundary, delivery, notifications, runner, regulatory, audit practice, vendor audit, audit mandate, vendor-production-criteria and backups-and-recovery. The regulatory suite's existing 32 assertions do not directly exercise the 1,000-item impact boundary; that specific coverage is not claimed.

Changed matrix row IDs: ${matrix.changed_rows.map(r => `\`${r.row}\``).join(', ')}. Exact before/after rows are in [R9-matrix-changes.json](artifacts/R9-matrix-changes.json). Family acceptance states were not promoted; policy-gate remains historical, not rerun evidence.

Run 1 bootstrap exited 0 but restarted the wrong PostgreSQL container, so its database-restart coverage is explicitly invalid. The affected corrected suite was included in both targeted manifests. Primary evidence is command exit plus bound assertions. Legacy crawl/vendor reports without run IDs are supplemental only, with source hash and correlation caveat. Browser images are retained locally under .local/round9/run1-playwright, run2-playwright and run3-playwright; portable logs and visit reports are committed. Baseline screenshots are restored rather than publishing unrelated image churn.

## Remaining FAILED / NOT_RUN and limitations

${failed.length ? failed.map(r => `- FAILED: \`${r.label}\`; first error: ${r.first_error}. See triage for root cause and proposed patch; no further retry.`).join('\n') : 'No runtime suite remains FAILED at its latest executed attempt.'}

${notRun.map(r => `- NOT_RUN: \`${r.label}\` — ${r.reason}`).join('\n')}

The Run 1 policy-engine timeout correctly failed closed. OPA request logs and later resource snapshots do not identify the underlying host/transport scheduling cause. Registry N+1 reads were removed, but that does not prove the independent historical policy delay was resolved. Keep this environment finding open for the owner of the next qualification environment.

**Owner question remains undecided:** erasure-ledger retention, currently 30 days after backups age out. No retention policy change was made.

## Contract, ownership and next integration action

No ownership transfer, contract bump, migration, shared reset, external service change or release qualification is implied. Owned runtime containers are stopped after verification, leaving the originally running unrelated OPA service intact; persistent volumes remain intact. Review the cleanup metadata with the final evidence.

**Ready for the owner to merge to main as completed V1: NO.** This branch provides integrated verification and bounded fixes, but the listed NOT_RUN acceptance/packaged-runtime controls and unresolved environment finding prevent claiming V1 closure. The owner can review these commits independently; no main merge is performed. The next dependency is an explicitly owned qualification environment for the retained acceptance gaps, plus the open retention decision. Do not rerun this Round 9 battery beyond its three-run budget.
`;
writeFileSync('handoffs/codex/2026-10-02-round9.md', text);
console.log(JSON.stringify({ latest: matrix.counts, changed_matrix_rows: matrix.changed_rows.length }));
