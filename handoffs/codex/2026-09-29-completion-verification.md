# Handoff — V1-COMPLETION-01 — Codex

**Base commit:** cde902122b6afbdd10c1144a9d603c33ae46548e.
**New commit:** not committed.
**Source master:** revision 1.4, SHA-256 c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b, verified by source-index check. Expanded baseline E1 retained.
**Contract version:** 0.41.0, generated check passed.
**Scope:** local engineering checks and Codex-owned connector/tooling repairs. Existing dirty files preserved. No GitHub fetch/pull, merge, push, database reset, permission grant, provider request or deployment.

## Start and plan

The user requests full completion and verification, while Claude continues separate work and will publish it later. The user explicitly reserves permission for a future local update. Current lane records reserve Claude's DPDP/expansion/shared application work. This task does not overwrite or duplicate it.

Allowed changes: Codex-owned `connectors/src/postgres-records/adapter.ts`, its unit tests, source-review/test-inventory tools and tests, the existing uncommitted static CI workflow, new inventory/docs and this task's evidence. Plan: inspect current scope/history, execute static checks, fix reproduced boundary gaps, verify new behavior, enumerate missing test coverage without promoting acceptance. No shared runtime is reserved or started by this task. The local production build writes its ordinary `frontend/.next` build output.

## Delivered

- `connectors/src/postgres-records/adapter.ts`: snapshot machine authority; revalidate after connection/permission setup, after target lock/read waits and before a mutation/replay acknowledgment or passing observation. Expired observer reads remain inconclusive. Existing unknown-effect behavior and unsupported erasure remain unchanged.
- `tests/unit/postgres-records.test.ts`: deterministic clock regressions for pool wait, lock wait, replay and observation expiry. These use SQL doubles, not real PostgreSQL deployment evidence.
- `scripts/source-review-state.ts`, `scripts/v1-source-inventory.ts`, `tests/unit/source-review-state.test.ts`: preserve reviewed mappings during regeneration/checks while rejecting changed source provenance and malformed containers. No review or acceptance is inferred.
- `scripts/qualification-inventory.ts`, `tests/unit/qualification-inventory.test.ts`, `tracking/qualification-inventory.json`: inventory all 141 nonignored test-tree files, including untracked additions: 45 unit, 68 integration, 5 security, 7 Playwright, 9 standalone browser/transport and 7 support files. Unknown test naming fails instead of silently escaping coverage. Hashes cover test files, not full application candidate identity.
- `.github/workflows/source-validation.yml`: add inventory freshness check to the previously uncommitted static workflow. Hosted execution NOT_RUN.
- `docs/engineering/qualification-inventory.md`: complete-inventory usage, serialized runtime requirements, exact-run evidence rules and remaining release gates.
- `CURRENT_STATE.md`: dated local checkpoint; historical acceptance remains intact.

## Commands actually executed

All Node commands below use `.local/tools/node-v24.21.0-win-x64/node.exe`. Logs are in `handoffs/codex/artifacts/` with prefix `V1-COMPLETION-01-`. PowerShell wrapper exit codes are not substituted for the captured native exit codes.

| Node arguments / command | Native exit | Result / artifact |
|---|---:|---|
| `--import tsx --test tests/unit/*.test.ts` initial | 0 | 296/296 PASS; `units.log` |
| `node_modules/typescript/bin/tsc --noEmit` initial | 0 | PASS; `types.log` |
| `--import tsx shared/contracts/src/generate.ts --check` | 0 | Contract 0.41.0; 8 artifacts, seed, 412 route and 7 error examples; `contracts.log` |
| `node_modules/eslint/bin/eslint.js frontend backend database connectors shared services scripts tests --max-warnings 0` | 0 | Full initial lint PASS; `lint.log` |
| `--import tsx --test tests/unit/postgres-records.test.ts tests/unit/source-review-state.test.ts` | 0 | 14/14 PASS; `regression.log` |
| `--import tsx --test tests/unit/*.test.ts` after new tools | 0 | 303/303 PASS; `units-final.log`; later connector pool-wait guard/test checked below |
| `--import tsx --test tests/unit/postgres-records.test.ts tests/unit/source-review-state.test.ts tests/unit/qualification-inventory.test.ts` | 0 | Latest relevant tests 17/17 PASS; `regression-final.log` |
| `--import tsx --test tests/unit/*.test.ts` final verification | 0 | 304/304 PASS, no failures/skips/cancellations; `units-verified.log` |
| `--import tsx scripts/qualification-inventory.ts` and `--check` | 0 | Generated then matched all test files; `inventory.log` records final check |
| `--import tsx scripts/v1-source-inventory.ts --check` | 0 | All 218 immutable sections match; `source-index.log` |
| `--import tsx scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 capability modules; `tracking.log`; no results promoted |
| `git diff --check` | 0 | PASS |
| Changed-file ESLint, first attempt | 1 | Three unused destructured bindings in new helper; corrected, rerun recorded below |
| `scripts/local-hygiene.mjs`, sandbox attempt | 1 | EPERM reading protected local worker directory; `hygiene.log`; not a clean scan |

| `--import tsx scripts/web.ts build` | 0 | Production build PASS, compilation/typecheck/prerender complete; `build.log` |
| `node_modules/typescript/bin/tsc --noEmit` final | 0 | PASS; `types-final.log` |
| Changed-file ESLint after corrections and final connector guard | 0 | PASS; `lint-final.log` |
| `scripts/local-hygiene.mjs`, approved protected-directory retry | 1 | Completed scan: 4,505 candidate files, 113 browser bundle files, 79 local credential comparisons, two marker findings; `hygiene-retry.log` |

Changed-file ESLint command: `node_modules/eslint/bin/eslint.js scripts/source-review-state.ts scripts/qualification-inventory.ts scripts/v1-source-inventory.ts tests/unit/source-review-state.test.ts tests/unit/qualification-inventory.test.ts tests/unit/postgres-records.test.ts connectors/src/postgres-records/adapter.ts --max-warnings 0`.

Hygiene findings were inspected with `rg -n -C 2 -- 'BEGIN.*PRIVATE KEY|END.*PRIVATE KEY' tests/unit/credentials.test.ts handoffs/codex/artifacts/V1-RESUMPTION-01-proposed-fixes.patch` (exit 0). Both are synthetic marker literals, not encoded private key material: credential fixture strings and the parked customer-key-path regression proposal. No actual credential match was reported. The scanner still exits 1; this is a reviewed false-positive explanation, not a passing scan or comprehensive security certification. Claude's credential test file and the historical patch were preserved. No permission/ACL was changed for the approved read-only scan.

## Acceptance and remaining work

Overall completion and “above 90% working” are **not established**. Unit pass rate is not a product completion denominator. No canonical application scenario or full-family acceptance was promoted. The complete test inventory corrects an omission risk; it does not execute the 68 integration suites, security/browser suites or prove requirement-level coverage.

The prior project review remains a gap inventory, not an exact description of every later change. Its generated-contract mismatch is resolved in this local base, as today's checks demonstrate. Other findings must be rechecked against Claude's forthcoming authorized integration rather than overwritten from an older patch.

Remaining dependencies include Claude's pending branch and explicit authorization to update this checkout; shared dispatcher/action-contract integration for real connectors; real PostgreSQL least-privilege deployment and independent readback qualification; unfinished vendor identity/account/checkout/download/issuance flows; actual Razorpay test-account conformance; complete reviewed requirement mappings; exact-candidate runtime/browser/upgrade/restore/capacity/egress evidence; independent assessment and required human release decisions. Other implementation work remains open; this handoff does not imply all independent engineering is finished or blocked by Claude.

## Next integration action

Preserve these uncommitted changes. Continue independent implementation in the Codex lane; do not pull Claude's future GitHub changes until the user explicitly authorizes that update. After authorized integration, reconcile requirements and suite prerequisites against the new exact source, run runtime suites serially in reserved profiles, and retain failures alongside retests. No public release is authorized by this task.
