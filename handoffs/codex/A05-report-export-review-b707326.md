# Handoff — A05 report-export correction — Codex — working tree

**Base commit:** `b70732693768cdd1ee814faf830d2c1d63ced567` on `prototype/codex/A06-evidence-hardening`.
**New commit:** Not committed. This is a continuation correction to the historical A05 evidence task, not a new acceptance claim.
**Source master / hash verified:** Revision 1.4, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`; §133. The master was not edited.
**Contract version:** `0.15.0`; no wire schema or route changed.
**Scope and profile:** Customer-local report generation and CSV export. No external destination or customer data used.

## Delivered

- `apps/web/src/components/screens/reports.tsx`: prefix spreadsheet formula-like values with an apostrophe before RFC 4180 quoting, including common full-width starters and leading control characters. Quoting alone did not prevent spreadsheet formula evaluation. The screen says spreadsheet edit/save cycles require a new check; no universal CSV sanitization claim is made.
- `packages/domain/src/reporting/reports.ts`: fetch row 501 and refuse the report when any bounded section has more than 500 rows. Previously the first 500 were described as every row in scope, and aggregate counts were derived from that partial set.
- `tests/unit/reports.test.ts`: boundary and formula-safety controls.
- `README.md`: update the existing repository map to name domain folders already present. No package or folder was moved; the `apps`/`packages` boundaries already distinguish UI, backend, persistence, contracts, workers, agent and test-only targets.

## Commands actually executed

| Command | Exit code | Result | Artifact / environment |
|---|---:|---|---|
| Pinned Node `tsx --test tests/unit/reports.test.ts` | 0 | PASS, 9/9 | Console, local checkout |
| Pinned Node `eslint` on the three changed TS/TSX files, before the final CSV character/copy refinement | 0 | PASS, 0 warnings | Console, local checkout |
| Pinned Node `eslint` rerun after the final refinement | 1 after operator interruption | NOT_RUN to completion; host remained resource constrained | Local checkout |
| `git diff --check` | 0 | PASS | Local checkout |
| Pinned Node `tsc --noEmit --pretty false` | 1 after operator interruption | NOT_RUN to completion; process produced no diagnostic for several minutes on this host | Local checkout |
| Global `pnpm` test/typecheck/lint attempts | 1 after operator interruption | NOT_RUN to completion; global shim stalled and transient lockfile edits were removed | Local checkout |

Integration report suite, full unit suite, build and browser checks: NOT_RUN at this working tree. No candidate or acceptance evidence is promoted.

## Review and source alignment

The recent Claude reporting work preserves scoped report queries, per-section authority, named omitted sections, explicit caveats and an audited export route. Those parts remain intact. The confirmed defects were formula interpretation and silent row truncation. The existing ten-section response schema remains sufficient; oversized report requests now fail explicitly until a bounded export job or pagination is designed.

`tracking/capabilities.json` is Work-owned. Its M08 limitation says quoting a leading equals sign prevents spreadsheet formula execution; that sentence was incorrect before this fix and should be updated by Work to describe the apostrophe prefix and the 500-row refusal. `CURRENT_STATE.md` and any release claim remain Work-owned. No migration or contract change is needed for this correction.

## Remaining limitations and next integration action

This is a sandbox implementation, not a production V1 report service. Signed evidence packages, large-report job handling, complete customer deployment, real connectors and the wider V1 gates remain open. Re-run typecheck, the report integration suite, contracts check and build on an isolated profile with adequate machine resources; then review/commit and have the human integrate. The build pack and untracked test artifacts present at task start were preserved.
