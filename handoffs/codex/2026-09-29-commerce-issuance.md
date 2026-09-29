# Handoff — V1-COMMERCE-ISSUANCE-01 — Codex

**Base commit:** cde902122b6afbdd10c1144a9d603c33ae46548e.
**New commit:** not committed; all pre-existing local work retained.
**Product authority:** immutable revision 1.4 and expanded baseline E1, already verified in V1-COMPLETION-01. No master edit.
**Contract:** customer 0.41.0 unchanged; vendor-internal commerce 0.3.0 → 0.4.0. Vendor database schema 2 → 3.
**Scope/profile:** vendor commerce only, synthetic test database on local codex-a00 PostgreSQL. No customer application/schema, Claude-owned catalogue/credentials/DPDP file or shared customer contract generator changed. No GitHub fetch/pull/push, commit, public deployment, real payment, production signing or permission grant.

## Start and plan

The user said continue the full-completion effort, retaining the restriction against pulling Claude's future GitHub changes. Reserved paths: vendor commerce store/handler and vendor migration, vendor-internal contract, associated tests, inventory hashes and task documentation. Plan: close the paid-order-to-licence gap with exact independent review, durable signed-document/outbox/audit persistence, account-scoped download and adverse PostgreSQL tests. Do not infer prices, edition mappings or other undecided commercial terms from Claude's catalogue.

## Delivered

- `database/vendor/migrations/0003_licence_fulfilment.sql`: vendor boundary guard; immutable licence requests, approvals and issued documents; unique licence IDs; application-level prepare/approve/issue capabilities; schema version 3. No PostgreSQL roles or grants created. All three vendor migrations must be applied in order in a vendor database, never through the customer runner.
- `shared/contracts/src/commerce.ts`: version 0.4.0 and canonical licence-review response reusing the current customer licence claim schema.
- `backend/vendor/commerce/store.ts`: paid/READY/provider-mode guarded preparation, order/account/terms-bound canonical digest, independent exact approval, inspectable review snapshot, trusted local Ed25519 signing, atomic document/outbox/audit persistence and replay after commit uncertainty. Read/download remains account-scoped and audited. Active membership checked for every call. The order lock serializes issuance against payment/refund updates.
- `backend/vendor/commerce/http.ts`: authenticated `GET /vendor/api/orders/{id}/licence`, returning the persisted signed document with no-store headers. No HTTP preparer/approval/signing endpoint, key input or development authenticator was added.
- `tests/integration/commerce/commerce.test.ts`: full existing commerce suite plus real PostgreSQL fulfilment assertions, real fixture-key signatures, concurrency, audit rollback, actual committed-then-lost-acknowledgment simulation, restart recovery, refund blocking/review, review authority, account denial and download assertions. Setup phases now distinguish migrations from database creation. Exact source hashes included in new task artifacts.
- `tests/unit/commerce-http.test.ts`: session-required licence retrieval and rejection of signing/mutation through its read endpoint.
- `tracking/qualification-inventory.json`: regenerated hashes for changed test files; no acceptance state promoted.
- `backend/vendor/README.md`, `docs/engineering/razorpay-and-connectors.md`, `CURRENT_STATE.md`, this handoff: configuration, scope and remaining work.

## Commands actually executed

Node executable: `.local/tools/node-v24.21.0-win-x64/node.exe`. Log paths below are under `handoffs/codex/artifacts/`, prefix `V1-COMMERCE-ISSUANCE-01-`. Native command exits are distinguished from PowerShell wrapper exits.

| Command / Node arguments | Exit | Result / artifact |
|---|---:|---|
| `node_modules/typescript/bin/tsc --noEmit`, initial | 2 | New test import-name collision and nullable pool reference; fixed; `types.log` |
| Same full typecheck, corrected | 0 | PASS; `types-final.log` |
| Changed-file ESLint initial and corrected | 0 | PASS; `lint.log`, `lint-final.log` |
| `--import tsx --test tests/unit/commerce.test.ts tests/unit/commerce-http.test.ts tests/unit/razorpay.test.ts tests/unit/vendor-plans.test.ts` | 0 | 31/31 PASS; `unit.log` |
| `--import tsx tests/integration/commerce/commerce.test.ts`, first | 1 | Duplicate new test variable names; transform failed before database access; `integration.log` |
| Same integration command, first retry | 1 | Database setup timeout, zero assertions; `integration-retry.log`, failure JSON `commerce-9026b057-eeb3-4eb1-8b3a-8b6872fc8753.json` |
| Same integration command after readiness check | 0 | **116/116 PASS**; `integration-ready.log`, `commerce-a5003635-992a-4535-bfbd-dbd2a730729e.json` |
| `--import tsx --test tests/unit/*.test.ts` | 0 | **305/305 PASS**, no skipped/cancelled tests; `all-units.log` |
| `--import tsx scripts/qualification-inventory.ts`, then `--check` | 0 | Generated and matched; 134 test files and 7 support files |
| `git diff --check` | 0 | PASS |

Final checks also passed: full `tsc --noEmit` (exit 0, `types-verified.log`); changed-file ESLint (exit 0, `lint-verified.log`); `--import tsx shared/contracts/src/generate.ts --check` (exit 0, `contracts.log`: customer contract 0.41.0, 8 artifacts and canonical seed, 412 route examples and 7 error examples). No production-build rerun is claimed for this vendor-only continuation; the previous build result belongs to V1-COMPLETION-01.

Changed-file lint arguments: `node_modules/eslint/bin/eslint.js backend/vendor/commerce/store.ts backend/vendor/commerce/http.ts shared/contracts/src/commerce.ts tests/integration/commerce/commerce.test.ts tests/unit/commerce-http.test.ts --max-warnings 0`.

## Runtime and retained failures

Docker was initially stopped. Normal approved access was used to inspect Docker, start Docker Desktop with `Start-Process -WindowStyle Hidden`, and start only `orvia-codex-a00-postgres-1` and `orvia-codex-a00-loopback-1`. Early daemon probes returned missing-pipe and startup HTTP 500 errors; a later `docker --context desktop-linux version` succeeded. `pg_isready -U orvia_migrator -d postgres` returned accepting connections (exit 0). After the setup timeout, a direct host-path `SELECT 1 AS ready` using the existing protected test config succeeded (exit 0). An earlier `node -e` probe failed from Windows argument quoting and was replaced with literal stdin; it did not reach PostgreSQL.

Successful suite database: `orvia_vendor_test_a5003635992a4535bfbddbd2a730729e`. Test keys were generated in memory and never persisted or printed. Provider responses and vendor session were explicit fixtures. Assertions used actual PostgreSQL transactions and actual Ed25519 verification, not a SQL double. The operator database identity remains a production role qualification limitation.

Cleanup: `docker --context desktop-linux stop orvia-codex-a00-loopback-1 orvia-codex-a00-postgres-1` exited 0. Both containers returned to their original stopped state; databases/volumes retained. Docker Desktop itself was started and left running. No customer database, schema or runtime worker was started or reset.

## Acceptance and remaining dependencies

This closes a tested service-level gap, not EX13 or full V1 acceptance. Canonical scenarios and full-family acceptance are unchanged. No “above 90% complete” inference is made from test counts.

Still unfinished: durable vendor identity/MFA binding; account/checkout/review/download UI; approved prices, tax, billing/subscription/refund terms and automated catalogue-to-claims mapping; real Razorpay sandbox conformance; production signing custody; issuance scheduling; correction/expiry workflow for an incorrectly prepared immutable request; least-privilege deployment, capacity and independent review. Existing reviewed requests are deliberately not overwritten. Issued documents remain downloadable after refund for historical continuity; the outbox is flagged for review and no customer privacy control is remotely changed.

Claude's shared application and catalogue work remains separate. Continue Codex-owned work without pulling GitHub until the user explicitly authorizes the future update. Before production activation, integrate the identity/review UI and approved commercial mapping, qualify real providers and key custody, then run the complete exact-candidate release gates.
