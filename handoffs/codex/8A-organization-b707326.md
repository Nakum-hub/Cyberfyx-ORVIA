# Handoff — 8A repository organization — Codex — working tree

**Base and ending HEAD:** `b70732693768cdd1ee814faf830d2c1d63ced567`, branch `prototype/codex/A06-evidence-hardening`; not committed. The user's current request targets section 8A, subsections A–N, of the pasted V1 prompt. Section 7A real connectors remains deferred.

**Source:** Revision 1.4 master, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`; pasted prompt at the user-provided attachment. Current contract 0.17.0. No ownership transfer.

## A–N result

| Subsection | Result at this working tree |
|---|---|
| A Structural outcome | Existing apps/packages/infrastructure/tests boundaries retained. README map updated. Independent vendor service/store is absent and cannot be described as implemented. |
| B Module organization | Existing `privacy-control`, `domain/*`, auth, evidence and connectors remain bounded. No empty module trees created. |
| C Frontend organization | Split mixed `operations.tsx`, then grouped all 27 feature screens under `controls/`, `governance/`, `onboarding/` and `operations/`; shared UUID navigation moved to `shared/open-record.tsx`. Route, Test Lab and test imports updated. |
| D Backend organization | Common auth, scope recheck, transaction, idempotency, audit and response path remains in `business.ts`. Existing governance and platform operation cases moved to `governance-routes.ts` and `platform-routes.ts`, still executing within that same transaction. Domain behavior remains in `packages/domain`. |
| E Database organization | Existing ordered migrations and runtime under `packages/db` unchanged. No applied migration rewritten. Vendor store remains absent. |
| F Connector organization | Existing `crm-synthetic` and shared connector primitives remain visibly synthetic. No real connector renamed or fabricated; section 7A deferred. |
| G Naming | Replaced maintained catch-all UI `operations.tsx` with feature names and renamed ten A00–A07 engineering guides to responsibility names. Historical handoff/evidence filenames and ordered migrations retain their audit IDs. |
| H Package naming | Established package names kept; no package added or renamed, so workspace/lockfile/CI migration unnecessary. |
| I Delivery clutter | Inspected tracked suspicious names. Matches were historical Work-owned reviews/handoffs with traceability. No unreviewed deletion or cleanup of user untracked files. |
| J Company handoff | README now has an early code navigation table; engineering guides have a document index. Vendor-facing deployment/store cannot be pointed to because it does not exist. |
| K Move references | Current imports and active path references updated, including capability evidence and operator script guidance. Historical publication records remain as path snapshots. |
| L Verification | Typecheck, lint, 199 unit tests, contract check, tracking check, `git diff --check`, local navigation-link resolution, and Next.js production build passed after naming moves. Integration/browser suites NOT_RUN: Docker runtime was inaccessible in sandbox. Hygiene check ERROR (EPERM scanning `.local/profiles/codex-a00/worker`); no hygiene PASS claim. |
| M Git traceability | File splits were source-preserving and small in two batches. No historical files or Git history rewritten. Git commit/merge not performed. |
| N Priority | Structural change precedes further new modules; broad Version 1 product work remains ongoing. No aesthetic package renaming or folder tree recreation. |

## Exact source moves and consumers

- `apps/web/src/components/screens/operations.tsx` split into `workflows.tsx`, `attention.tsx`, `evidence.tsx`, `capabilities.tsx`, `policy-controls.tsx`, and `apps/web/src/components/shared/open-record.tsx`. All affected `apps/web/src/app/workspace/**/page.tsx` imports and `test-lab.tsx` updated.
- `packages/backend/src/business.ts` governance cases moved to `packages/backend/src/governance-routes.ts`; platform cases moved to `packages/backend/src/platform-routes.ts`. `business.ts` remains the sole common authenticated API boundary.
- `README.md` structure map updated. No new dependency, migration, endpoint, service or runtime asset.

The subsequent naming and grouped-screen moves, exact reference updates and verification are detailed in `handoffs/codex/company-naming-b707326.md`.

## Commands actually executed after final structure change

| Command | Exit | Result |
|---|---:|---|
| Pinned Node `tsx --test tests/unit/*.test.ts` | 0 | 199/199 PASS. |
| Pinned Node ESLint over `packages apps scripts tests --max-warnings 0` | 0 | PASS. |
| Pinned Node `tsc --noEmit --pretty false` | 0 | PASS. |
| Pinned Node `scripts/web.ts build` | 0 | Compiled, typechecked and generated 51 static pages. |
| Pinned Node contract generator `--check` | 0 | 8 artifacts/seed, 163 route examples and 7 errors; 0.17.0. |
| Pinned Node `scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 capability modules; no promotion. |
| `git diff --check` | 0 | PASS. |
| Pinned Node `scripts/local-hygiene.mjs` | 1 | ERROR: sandbox EPERM reading local protected worker folder. Not a PASS. |

## Limitations and next dependency

Backend route extraction is mechanically type/build checked, but affected integration and browser paths have not been rerun. The protected Docker/runtime access and Work-owned status review are needed before integration. Vendor service/store, real connectors, and production separation require their product implementation; section 8A cannot honestly be declared wholly complete before these exist. No merge, deployment, database reset, commit or account change occurred.
