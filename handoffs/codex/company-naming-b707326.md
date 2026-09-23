# Handoff — company-facing file names and frontend navigation — Codex — working tree

**Base and ending HEAD:** `b70732693768cdd1ee814faf830d2c1d63ced567`, branch `prototype/codex/A06-evidence-hardening`; uncommitted. This continues section 8A G/J/K/M at the user's explicit request. No product acceptance status changed.

## Delivered

- Renamed the ten maintained `docs/engineering/A00*`–`A07*` files to descriptive names: executable contract proposal, local development, dependency selection, authentication and scope, contract change history, workflow and agent, send admission, evidence and reconciliation, regression and recovery, and local packaging and operation. Their A task IDs remain in document bodies for provenance. Added `docs/engineering/README.md` separating current entry points from historical implementation notes. Marked `REPOSITORY_INVENTORY.md` as a historical bootstrap snapshot.
- Grouped 27 maintained `apps/web/src/components/screens/*.tsx` files under `controls/`, `governance/`, `onboarding/`, and `operations/`. Framework-required `app/**/page.tsx` files remain in the Next.js route tree. Updated relative imports, page consumers, and the reports unit test import. Root README now has an early code navigation table.
- Updated exact active path references in scripts, README, engineering docs, tracking and Work-owned documentation. The cross-lane reference-only scope is recorded in `handoffs/codex/company-naming-reference-transfer-b707326.md`. `tracking/capabilities.json` evidence paths now resolve; CRLF remains preserved via a path-specific `.gitattributes` whitespace rule.
- Historical publication JSON, raw command artifacts and migration filenames retain their original A task/sequence IDs and bytes. They are audit snapshots, not source module names. No compatibility copy of the renamed documents was left behind.

## Checks actually run

| Check | Exit | Result |
|---|---:|---|
| Pinned Node TypeScript `tsc --noEmit --pretty false` | 0 | After screen move. |
| Pinned Node ESLint over `packages apps scripts tests --max-warnings 0` | 0 | After screen move. |
| Pinned Node `scripts/web.ts build` | 0 | Next.js compiled, typechecked and generated 51 static pages after screen move. |
| Pinned Node `tsx --test tests/unit/*.test.ts` | 0 | 199/199 after capability evidence paths corrected. First run detected stale M03 path and failed 198/199; the corrected rerun passed. |
| Pinned Node `scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 modules. First run detected stale M03 path; corrected rerun passed. |
| Pinned Node contract generator `--check` | 0 | 8 artifacts, 163 route examples, contract 0.17.0. |
| `git diff --check` | 0 | No whitespace errors after preserving register line endings. |
| README/engineering index local-link resolution script | 0 | No missing local navigation links. |

Integration/browser suites remain NOT_RUN due the inaccessible Docker runtime in this sandbox. The earlier local hygiene check ERROR remains unresolved because protected `.local/profiles/codex-a00/worker` could not be scanned. No database, external service, deployment, commit or merge was changed. Next action: run the affected integration/browser suites in an authorized isolated profile and review the descriptive rename diff before human integration.
