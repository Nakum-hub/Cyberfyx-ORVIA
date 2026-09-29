# Handoff — MIGRATION-PREFIX-01 — Codex

**Base commit:** `9e4bf8c0efa813fce677fecbabb949fcf45d63a0` (branch created from origin/main).
**New commit:** identified by `git log -1 -- handoffs/codex/2026-09-29-commerce-migration-prefix.md`; publication hashes are in the final response. This file cannot contain its own commit hash.
**Source master / hash verified:** revision 1.4, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`; addenda 1.5 and 1.6 apply.
**Contract version:** 0.43.0 on origin/main; reviewed branch 0.45.0; no shared contract edited.
**Scope and profile:** synthetic local engineering only; no main merge, Claude branch push, production qualification or acceptance promotion.

## Delivered

Task MIGRATION-PREFIX-01. Allowed files: commerce migration, vendor runner, commerce-owned tests and this handoff/artifacts. Plan: immutable rename, ledger alias with hash validation, runner tests, real fresh/upgrade database proof.

- Renamed `database/vendor/migrations/0003_licence_fulfilment.sql` to `0011_licence_fulfilment.sql`, preserving every SQL byte.
- `database/vendor/src/migrations.ts` assigns the new filename its old execution key. A fresh install still executes it immediately after 0002 and before 0003_vendor_service, so later RLS convergence migrations see its tables. Numeric filename order alone is intentionally not execution order for this historical rename.
- The runner accepts both IDs for ledger lookup and `through`. A fresh database writes only `0011_licence_fulfilment`. An old database retains its original `0003_licence_fulfilment` row, checksum and timestamp; no canonical alias row is inserted, no SQL is reapplied and no ledger history is rewritten. If both IDs exist, both checksums must match. Either mismatch aborts and rolls back.
- Updated only the migration filename references in `tests/integration/commerce/commerce.test.ts`; no fixture, expectation or threshold changed.
- Added `tests/unit/vendor-migration-ledger.test.ts` and `tests/integration/commerce/migration-ledger.test.ts`. The database suite reconstructs the historical ledger identity only in a new random scratch database and then verifies no reapplication, stable timestamp and forced RLS.
- Vendor migrations 0007–0010 and all shared contracts untouched.

## Commands actually executed

All commands used the workspace-pinned Node 24.21.0; `tsx`, `tsc` and `eslint` are the cached root `node_modules/.bin` executables. Working directory: `.worktrees/commerce-migration`.

| Command | Exit | Result | Artifact |
|---|---:|---|---|
| `node --test tests/unit/vendor-migration-ledger.test.ts` | 0 | PASS, 3 runner control tests | `artifacts/MIGRATION-PREFIX-unit.log` |
| `tsx tests/integration/commerce/migration-ledger.test.ts` | 1 | environment error: incomplete worktree dependency links | `artifacts/MIGRATION-PREFIX-database.log` |
| same, after linking existing dependencies | 1 | ECONNREFUSED, local engine not ready | `artifacts/MIGRATION-PREFIX-database-retry.log` |
| same, after starting local services | 1 | 42501: required vendor roles absent | `artifacts/MIGRATION-PREFIX-database-running.log`, `artifacts/MIGRATION-PREFIX-database.json` |
| `eslint database/vendor/src/migrations.ts tests/unit/vendor-migration-ledger.test.ts tests/integration/commerce/migration-ledger.test.ts tests/integration/commerce/commerce.test.ts --max-warnings 0` | 0 | PASS | `artifacts/MIGRATION-PREFIX-lint.log` |
| `tsc --noEmit` | 0 | PASS | `artifacts/MIGRATION-PREFIX-typecheck.log` |
| `git diff --check` | 0 | PASS | local command |

## Acceptance

Fresh PostgreSQL and old-ledger upgrade proofs remain **NOT_RUN to completion**. Runner unit controls passed, but the database command failed before either full proof. This branch is **not ready to merge** until both pass. No mock result is represented as database proof.

## Contract / dependency / ownership changes

No contract change. The alias must remain permanently for existing ledgers and historical through targets. Preserve Claude's complete-schema RLS invariant when integrating this branch. Exact changed paths are the renamed SQL, runner, three named test files, this handoff and MIGRATION-PREFIX artifacts.

## Remaining limitations and blockers

Read-only role inspection returned `vendor_roles: []` on local codex-a00. The checked-in vendor installer would create/alter roles; this task forbids permission changes, so it was not invoked. The database test cleans up only its own generated scratch databases. No existing database was reset and no ledger checksum was realigned.

## Next integration action

An authorised local environment owner provisions a separate synthetic vendor test server with the installer roles. Then rerun `tsx tests/integration/commerce/migration-ledger.test.ts` and the commerce suite unchanged. Human merges only after both fresh/upgrade proofs and combined-branch tests succeed.
