# Handoff ? V1-CUSTOMER-VERIFY-01 ? Codex

> Update after authorized sync to 9e4bf8c (PR #31): Claude has supplied a preference-ordering fix and explicitly reserves preferences, vendor/auditor work, shared audit contracts and customer migrations 0069+. Its runtime is a separate cloud container; connectors remain Codex-owned. The earlier request to relay a preference-ownership note is superseded. Imported fixes require combined-source review and verification, not duplicate implementation. See 2026-09-29-github-sync-03.md in handoffs/codex for current sync evidence. The earlier local unit log records 330/330 passing tests at the pre-sync source; the prior compiler/lint processes no longer have recoverable exit statuses, so their empty logs do not establish PASS.

**Base commit:** 2247dd86213c0fd3c792c6ba67c72b11c5d33b47
**New commit:** not committed
**Source master / SHA-256:** revision 1.4 / c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b; addenda 1.5, 1.6 and expansion E1 remain applicable.
**Contract version:** customer 0.42.0, unchanged by this task.
**Scope:** customer-side connectors and synthetic in-process tests. No database, runtime port, customer record, provider call, shared contract, or vendor/auditor implementation was changed.

## Authority and plan

The owner asked to complete remaining work and give clear instructions, confirmed Claude continues vendor/auditor work, and requested synthetic data only. This task reviews current customer code, repairs independent defects, executes fresh tests and retains honest limits. Allowed implementation files: connectors/src/discovery/**, its focused unit test, the test inventory and task-specific documentation/evidence. Shared preference contract/migration edits await coordination. No takeover of Claude's active lane is implied.

## Delivered

- connectors/src/discovery/observer-authority.ts: common finite/current machine observer lease check.
- connectors/src/discovery/postgres-catalog.ts: snapshots authority and allowlist, rechecks after connection/query/commit waits and before target reads, preserves the primary error if rollback also fails.
- connectors/src/discovery/postgres-classify.ts: refuses malformed expiry, snapshots authority and relation, rechecks before/after target reads and before returning any successful/missing/empty result, releases the connection even after rollback failure.
- tests/unit/discovery-authority.test.ts: 12 tests covering malformed/expired/wrong authority, pool/query/commit expiry, caller mutation and failed rollback. SQL transport doubles only; not database conformance or classification-accuracy evidence.
- tracking/qualification-inventory.json: regenerated for 147 files (47 unit, 70 integration, 5 security, 7 Playwright, 10 browser/transport, 8 support).
- docs/engineering/2026-09-29-customer-completion-steps.md: owner instructions, copyable Claude coordination note and remaining engineering sequence.
- This handoff and artifacts/V1-CUSTOMER-VERIFY-01-* contain this task's evidence. The unrelated V1-CI-2247DD8-01-hosted-failure.log appeared during the session and was not authored or changed by this task.

## Commands actually executed

Pinned executable for TypeScript checks: .local/tools/node-v24.21.0-win-x64/node.exe. The initial inspection shell's generic node was 24.7.0; it was used for file reads/edits, not the reported TypeScript test execution.

| Command / operation | Exit | Result | Artifact |
|---|---:|---|---|
| --import tsx --test tests/unit/discovery-authority.test.ts | 0 | PASS, 12/12, no skips | artifacts/V1-CUSTOMER-VERIFY-01-discovery.log |
| Same tests against unchanged git-show 2247dd8 connector sources in ignored .local/customer-verify-01 | 1 | EXPECTED REGRESSION DETECTION: 11 failures, 1 passing control | artifacts/V1-CUSTOMER-VERIFY-01-original-regression.log |
| --import tsx scripts/qualification-inventory.ts | 0 | WRITTEN, 147 files | artifacts/V1-CUSTOMER-VERIFY-01-inventory-generate.log |
| --import tsx scripts/qualification-inventory.ts --check | 0 | MATCH | artifacts/V1-CUSTOMER-VERIFY-01-inventory-check.log |
| git diff --check | 0 | PASS | command output |
| Initial tsc --noEmit | interrupted | No result; identified PID 24244 was terminated after more than ten minutes without compiler output | artifacts/V1-CUSTOMER-VERIFY-01-typecheck.log |

Full typecheck retry, changed-file lint and full serial unit checks are pending at this checkpoint; append actual final results before handoff. Two apply_patch attempts failed with Windows sandbox IPC startup timeout before writing any files; direct guarded text replacements succeeded. A process-inspection attempt was denied by the sandbox; approved read-only process inspection subsequently identified the stalled compiler, and an identity-checked taskkill succeeded. These tool failures are not application test passes.

## Acceptance and limitations

No canonical scenario or expansion family is promoted. Healthy synthetic tests plus an original-source regression prove the bounded authority repair; they do not qualify actual PostgreSQL deployment, RLS/grants, browser flows, installation, performance, production classification accuracy or release readiness. The existing historical 318-test PASS remains historical.

Current code still contains preference ordering based on client observed_at: a future-dated opt-in can make a subsequently received opt-out ineffective. No preference source was changed because the complete fix needs shared contract/migration coordination with Claude. The owner received a precise coordination note. Native mapped-record dispatch, clean/upgrade database validation, full runtime/browser acceptance and the wider completion steps remain open. Claude retains vendor/auditor ownership.

## Next integration action

Obtain Claude's shared-file/contract/migration reservation and runtime-location reply. Continue customer preference ordering and isolated synthetic database qualification without resetting an existing database. Review Claude's eventual incoming commit only when the owner authorizes the local update. No commit, push, merge, deployment or release is performed by this task.
