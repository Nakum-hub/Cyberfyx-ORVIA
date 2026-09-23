# Handoff — company repository organization — Codex — working tree

**Task:** user-requested company-facing source organization, following 8A. **Base HEAD:** `b70732693768cdd1ee814faf830d2c1d63ced567` on `prototype/codex/A06-evidence-hardening`. **New commit:** none; changes remain uncommitted. **Source:** Rev 1.4 master. **Contract:** 0.17.0.

## Delivered

- Moved the maintained source tree to dedicated top-level folders: `frontend`, `backend` (`api`, `auth`, `authorization`, `domain`, `policy`, `policy-sdk`, `privacy-control`), `database/customer`, `connectors`, `services` (`worker`, `agent`, `synthetic-target`), and `shared` (`contracts`, `testing`). The empty former `apps` and `packages` directories were removed.
- Updated TypeScript imports, workspace importers and lockfile, scripts, container paths, Compose policy mount, build configuration, tests, capability source paths, current prototype path references, and README navigation. Current Work-owned reference-only changes are bounded in `company-naming-reference-transfer-b707326.md`.
- Kept numbered migration filenames in applied order. Historical review artifacts, handoff IDs, and publication snapshots retain their original identifiers and hashes. The descriptive engineering document names and grouped frontend feature screens from the preceding company-naming pass remain in place.
- Restored contract 0.17.0 and durable Test Lab list work after the Windows directory move failed to transfer some package contents. Restored notification availability semantics and the report section limit refusal. Generated API artifacts from canonical schemas. No database reset, deployment, merge, or commit occurred.

## Commands actually executed

| Command | Exit | Result |
|---|---:|---|
| `node node_modules/typescript/bin/tsc --noEmit` | 0 | Workspace typecheck after relocation and contract generation. |
| `node --import tsx --test tests/unit/*.test.ts` | 0 | 199 tests passed. |
| `node node_modules/eslint/bin/eslint.js frontend backend database connectors shared services scripts tests --max-warnings 0` | 0 | Lint passed. |
| `node --import tsx scripts/web.ts build` | 0 | Production Next.js build; 51 static pages generated. The first run failed on stale frontend tsconfig `extends`, which was corrected before this passing run. |
| `node --import tsx scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 capability modules. |
| `node --import tsx shared/contracts/src/generate.ts --check` | 0 | Eight artifacts and canonical seed matched, 163 routes, contract 0.17.0. |
| `git diff --check` | 0 | No whitespace errors. |
| README and engineering index local link existence check | 0 | No missing local links. |
| Active source/config old `apps/` and `packages/` reference search | 1 | No matches; `rg` returns 1 for no matches. |

## Limitations and next dependency

Integration and browser suites remain NOT_RUN in this pass; the previously attempted Docker runtime was inaccessible in the sandbox. The old local hygiene scan remains unresolved because `.local/profiles/codex-a00/worker` could not be scanned. `pnpm`'s launcher refused its registry signature check during this pass; checks used the installed pinned Node tools directly. Historical prose and evidence snapshots still describe their original path layout by design. The working tree is large because Git displays the move as deleted tracked files plus new untracked destination directories until staging; review the rename-aware diff before integration. Human integration approval is still required by AGENTS.md.

## Recovered backend route files (follow-up)

After the user asked to recover the two uncommitted files lost during the failed Windows move, `backend/api/src/governance-routes.ts` and `backend/api/src/platform-routes.ts` were reconstructed from the currently working central switch. `backend/api/src/business.ts` now delegates 64 governance and 57 platform route cases after the existing server authority checks and within the same scoped transaction, idempotency and audit boundary. A case-set comparison with the base Git version found no missing old case; the current `list_test_runs` case is the only addition. No duplicate case labels occur across the three files.

Executed after reconstruction: TypeScript `tsc --noEmit` exit 0; 199 unit tests exit 0; ESLint on the three backend files exit 0; production Next.js build exit 0 with 51 static pages; `git diff --check` exit 0. Integration and browser suites remain NOT_RUN because the Docker runtime was unavailable in this environment. These are reconstructed files, not byte-for-byte recovery of the lost uncommitted versions.

## Git publication

The reviewed source relocation and route reconstruction were committed as `8bda0c69395bbd6cde42701f82edf786cca261d4` on `prototype/codex/A06-evidence-hardening`. This note follows that commit and records its actual hash. Unrelated untracked `500_test_cases/`, `ORVIA_V1_Agent_Build_Pack/`, and `handoffs/codex/artifacts/` files were excluded. The branch is to be pushed to its existing `origin` upstream without merging.
