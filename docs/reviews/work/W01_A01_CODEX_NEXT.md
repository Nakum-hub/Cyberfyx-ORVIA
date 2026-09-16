# Codex prompt after A01 review

**Historical prompt — superseded:** A02 was subsequently pushed and reviewed. Do not restart A02 from this prompt; preserve the continuation work and use [W01_A02_CODEX_FIX.md](W01_A02_CODEX_FIX.md) for the current bounded correction.

A01 at `50cb4daeded9253c4f7cca4f742cb212c10aa5b7` has no blocking Work finding. There is no A01 repair ticket. After the human merges the Work acceptance/tracking PR, give Codex the following:

```text
You are the Codex coding lane for Nakum-hub/Cyberfyx-ORVIA. Start A02 only after the human-integrated Work ledger records A01 COMPLETED. Fetch the current main, identify its exact commit, and use your own isolated worktree/profile. Read AGENTS.md, the approved master in docs/source/, CURRENT_STATE.md, docs/prototype/EXECUTION_PLAN.md, CONTRACT.md, FILE_OWNERSHIP.md, tracking/tasks.json A02, and docs/reviews/work/AUTH_AND_CONSENT.md.

Work accepted A01 at 50cb4daeded9253c4f7cca4f742cb212c10aa5b7 (implementation 3be3fd09c358ac851b97a381f9a856f8f0a92177, contract 0.2.1). No A01 repair is requested. Preserve its working auth/MFA, server-derived scope, RLS, bootstrap, typed clients and evidence. The human still owns merges/release.

Implement A02's approved deliverable: versioned purpose/notice/policy configuration and exact-version independent approval; scoped principal/system mappings; own-principal consent aggregates/events, idempotency, transactional outbox and persisted receipts. Use existing authorized synthetic fixtures only. Do not implement A03-A07, UI, AI or vendor-hosted operations in this ticket.

Enforce current server authority on every route and before replay. Deny cross-tenant, legal-entity, sibling-environment, staff-as-principal and wrong-principal access. Preserve composite scope constraints and transaction-local non-owner RLS. Exact policy publication must reject self-approval, wrong version/digest and insufficient contextual reauthentication; approval is for the immutable version.

For grant/withdrawal, derive the principal from its authenticated session. Require affirmative valid-notice interaction for grant; withdrawal must not require accepting a new notice. Use the master's aggregate identity (tenant, legal entity, principal reference, purpose) with an explicit environment-scope strategy. Lock/serialize the aggregate; atomically commit the consent state, monotonically increasing epoch, immutable event, required outbox/workflow identity, receipt and idempotency response. Return acceptance only after commit.

Resolve authorized identical idempotent retries before treating their old expected_epoch as a new-operation conflict. Keep keys/digests scoped; reject conflicting reuse. A new stale operation must conflict. Old grant/event replay cannot lower the epoch or restore marketing; fresh re-consent needs a new authenticated interaction at a higher epoch. Preserve immutable POST Receipt versus GET ReceiptView current state. Do not claim downstream effects, completed workflows, send blocking or verification from an accepted receipt; those need later tickets.

Run actual normal, negative and concurrent HTTP/database tests for the A02 portions of T06-T10 and W01's T03/T04/T05/T08/T09: authority denials, exact independent approval, immutable published versions, grant/withdrawal, transaction rollback/failure, simultaneous duplicate/conflicting keys, competing expected epochs, original receipt replay after a later epoch, stale grant replay and fresh re-consent. Check database effects/outbox counts and persisted state, not status codes alone. Preserve failures and retests. Re-run relevant A01 regressions, contract drift, types/lint/build on the exact submitted source.

Codex remains the sole schema/dependency/migration/backend/test writer. Coordinate any semantic change with Work and the UI consumer; bump and regenerate together when needed. Do not modify Work/Cowork/Claude Code files or canonical task/acceptance/state records. Keep profiles and credential files local, use no shared-database reset, and do not bypass the retained advisory-upload approval block.

Finish using handoffs/TEMPLATE.md under handoffs/codex/: exact source/base/commit, paths, commands/exits, fixture/profile/build, actual results, failures, limitations and UI binding implications. Publish your branch/PR for Work W01 review and human integration. Propose tracker updates in the handoff; do not self-accept A02 or promote full test IDs from partial coverage.
```
