# Handoff — V1-INTEGRATIONS-01 — Codex

Base: `60f527d91779c654fbf66cf559ae02b65b3f7cb2`. New commit: not committed. Master revision 1.4 plus E1. Existing work preserved.

The user selected Razorpay for UPI/card payments and requested working real connectors. Claude continues latest-feature testing in its separate cloud environment. Codex reserves `backend/vendor/commerce/**`, `shared/contracts/src/commerce.ts`, `database/vendor/**`, new `connectors/src/postgres-records/**`, related new unit/integration tests, and task-specific docs/evidence. No shared customer schema, generated customer contract, staff UI, DPDP executor or runtime is edited without coordination.

Plan: verify Razorpay's official integration rules; implement bounded server checkout/callback/webhook handling and reconcile unknown order creation; implement a scoped PostgreSQL adapter; exercise real local PostgreSQL effects and independent readback plus payment HTTP adverse cases. Real provider activation remains separate from fixture tests. No real charges, customer records, public deployment, database reset or production signing is authorized or claimed.

Status: IMPLEMENTED_PARTIAL / NOT_PRODUCTION_QUALIFIED. Payment provider selection is settled (RAZORPAY); prices, terms, live merchant provisioning and additional customer-system choices are not inferred. Credentials stay in local protected configuration, never chat.

## Changes (uncommitted)

- `backend/vendor/commerce/razorpay.ts`: strict server-order callback signature verification and branded fixed-destination provider GET recovery. Neither is proof of capture.
- `backend/vendor/commerce/store.ts`: scoped durable reconciliation of STARTED/UNKNOWN checkout, exact reserved terms, reauthorization and atomic binding/audit; no repeated POST or licence enqueue.
- `backend/vendor/commerce/service.ts`: composition of checkout, callbacks, recovery and signed webhook ingestion.
- `backend/vendor/commerce/http.ts`: separate vendor Fetch handler, mandatory session authenticator, same-origin browser mutation guard, bounded bodies, safe errors, raw signed webhooks. Not deployed/mounted.
- `shared/contracts/src/commerce.ts`: vendor-internal version 0.3.0 and strict Razorpay callback/order-ID schemas; customer-generated contracts untouched.
- `connectors/src/postgres-records/adapter.ts`: mapped direct-table CORRECT/SUPPRESS SQL, scoped generation/version CAS, atomic target receipt, separate limited observer, no raw values in verification, unknown-effect handling. No synthetic fallback. No erasure/anonymisation or customer dispatcher registration.
- `tests/unit/{razorpay,commerce-http,postgres-records}.test.ts`: new adverse-path tests. PostgreSQL unit tests explicitly use SQL doubles.
- `tests/integration/commerce/commerce.test.ts`: 13 additional recovery/callback checks; new task-specific artifact names/source hashes.
- `backend/vendor/README.md`, `docs/engineering/razorpay-and-connectors.md`, this handoff and `handoffs/codex/artifacts/V1-INTEGRATIONS-01-*`: selection, setup, evidence and limitations.

## Executed validation

All Node commands used `.local/tools/node-v24.21.0-win-x64/node.exe`.

| Command suffix | Exit/result | Evidence |
|---|---|---|
| `--import tsx --test tests/unit/commerce.test.ts tests/unit/razorpay.test.ts tests/unit/commerce-http.test.ts tests/unit/postgres-records.test.ts` | 0; 34 PASS | `V1-INTEGRATIONS-01-unit.log` |
| `--import tsx --test tests/unit/*.test.ts` | 0; 296 PASS | `V1-INTEGRATIONS-01-all-unit.log` |
| `--import tsx tests/integration/commerce/commerce.test.ts` after proxy start | 0; 58 PASS | `V1-INTEGRATIONS-01-commerce-proxy.log`, `V1-INTEGRATIONS-01-commerce-35d22aa4-5486-43df-ab2d-173015153118.json` |
| `node_modules/eslint/bin/eslint.js backend/vendor/commerce shared/contracts/src/commerce.ts connectors/src/postgres-records tests/unit/razorpay.test.ts tests/unit/postgres-records.test.ts tests/unit/commerce-http.test.ts tests/integration/commerce/commerce.test.ts --max-warnings 0` | 0 | `V1-INTEGRATIONS-01-lint-final.log` |
| `node_modules/typescript/bin/tsc --noEmit` initial run | 2; existing four generated-contract errors in account/team deletion screens | `V1-INTEGRATIONS-01-typecheck.log` |

The first new unit run failed because vendor code imported zod outside its workspace package; schemas moved to the contracts package. A SQL-double query matcher initially matched a nested catalog expression incorrectly; narrowed matcher and reran. Neither failure is treated as acceptance.

Three database attempts failed before database creation with ECONNREFUSED (retained JSON/log artifacts). Root cause: only PostgreSQL was started; the repository intentionally publishes it through the separate `loopback` container. Starting the existing proxy resolved this. No network settings, grants, resets or customer tables were changed. Passing tests used a new retained database `orvia_vendor_test_35d22aa4548643dfab2d173015153118`. Provider responses were explicitly synthetic; there were no provider calls or purchases. Operator database role is a test limitation.

## Remaining dependencies

Actual Razorpay TEST-mode checkout/webhook conformance is NOT_RUN. Vendor identity/MFA binding, browser checkout/account UI, approved catalogue/terms, signer/outbox fulfilment, download entitlement delivery and production operations remain unfinished. Do not call EX13 complete.

PostgreSQL mapped-target read/write and independent-role deployment qualification are NOT_RUN. Customer mappings, target roles, external-writer version discipline and permitted operations are required. The shared dispatcher needs coordinated generation/version contract changes before registration; Claude's active application/test lane was preserved. Do not expose a weakened adapter through the old action contract.

User was asked for actual database/CRM/storage/messaging system names and Razorpay test-account availability, without secrets/data. No additional vendor choices were invented. Real erasure/retention/copy verification requires those target-specific details. No canonical acceptance state was promoted. No commit, push or deployment was performed.

Runtime cleanup: `docker --context desktop-linux stop orvia-codex-a00-loopback-1 orvia-codex-a00-postgres-1` exited 0, restoring both services to their initial stopped state. Volumes and isolated test database retained. `git diff --check` exited 0.

## User clarification and continuation

The user confirmed synthetic project data only, no Razorpay account yet, and asked to use this project's systems. Additional CRM/storage/vendor choices are therefore not pending for this local phase and must not be invented. The Razorpay provider test gate stays NOT_RUN until an account exists. Continue local evidence with explicit fixture providers, never a shipped runtime success fallback.

Added in-process Fetch HTTP/database integration for both UPI and CARD using a labelled test session. It checks anonymous denial, rejection of client prices, idempotent order creation, fixed provider destination, public-only checkout configuration, callback-without-credit, signed capture and duplicate delivery with one entitlement. No browser, listener or actual Razorpay service is implied.

Final full-project `tsc --noEmit` exited 2 with the same four pre-existing `my-login.tsx`/`team.tsx` generated-contract errors; no new errors were reported (`V1-INTEGRATIONS-01-typecheck-final.log`). The final HTTP test addition is being checked separately.

Final expanded integration result: 85 checks PASS, exit 0, in `V1-INTEGRATIONS-01-commerce-http-retry.log` and `V1-INTEGRATIONS-01-commerce-51a47b59-684b-4a6a-8afd-f7f3f6a958e3.json`. Retained database: `orvia_vendor_test_51a47b59684b4a6a8afdf7f3f6a958e3`. This supersedes the earlier 58-check result for current source. The first post-restart attempt returned PostgreSQL 57P03 before database creation; its failure artifact `V1-INTEGRATIONS-01-commerce-1aae7d14-915c-4021-9497-62ebe6d91f38.json` remains evidence of startup timing, not a passing test. The retry ran after startup completed.

The final integration-test file passed ESLint (exit 0, `V1-INTEGRATIONS-01-http-lint.log`). The full 296-unit run and 34-targeted-unit run both remain PASS; no implementation changed after those runs. Later edits added integration assertions and documentation only.

Targeted final typecheck PASS (exit 0): pinned Node `node_modules/typescript/bin/tsc --noEmit --target ES2022 --lib ES2024,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --strict --noUncheckedIndexedAccess --esModuleInterop --allowImportingTsExtensions --skipLibCheck tests/integration/commerce/commerce.test.ts tests/unit/commerce-http.test.ts tests/unit/razorpay.test.ts tests/unit/postgres-records.test.ts`; evidence `V1-INTEGRATIONS-01-targeted-typecheck.log`. This checks the new implementation through its imports as well as the final test additions. It does not override the four full-project errors.

Final cleanup repeated after expanded tests: both local containers stopped successfully (exit 0); all volumes retained. Final `git diff --check` exited 0. No task runtime remains active.
