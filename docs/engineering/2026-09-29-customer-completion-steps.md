# Customer-side completion steps ? 29 September 2026

> Update after authorized sync to 9e4bf8c (PR #31): Claude has supplied a preference-ordering fix and explicitly reserves preferences, vendor/auditor work, shared audit contracts and customer migrations 0069+. Its runtime is a separate cloud container; connectors remain Codex-owned. The earlier request to relay a preference-ownership note is superseded. Imported fixes require combined-source review and verification, not duplicate implementation. See 2026-09-29-github-sync-03.md in handoffs/codex for current sync evidence. The earlier local unit log records 330/330 passing tests at the pre-sync source; the prior compiler/lint processes no longer have recoverable exit statuses, so their empty logs do not establish PASS.

Task V1-CUSTOMER-VERIFY-01. Base 2247dd86213c0fd3c792c6ba67c72b11c5d33b47.

The owner confirmed synthetic data only and that Claude continues vendor/auditor work. Codex continues customer-side verification and fixes. No real records, account credentials, or signing keys are needed in chat. Synthetic results qualify only the named tested behavior and environment, not production accuracy or whole-product completion.

## What the owner should do now

1. Send Claude the coordination note below and bring back its reply. Do not ask it to abandon its vendor/auditor work.
2. Confirm whether Claude uses a cloud checkout or this local checkout, and whether it runs local services. Until runtime separation is clear, Codex can run static and isolated in-process tests without changing databases or service ports.
3. When Claude finishes, provide its commit or PR reference and explicitly request the local update. Codex will preserve pending local work, inspect the incoming changes, then verify the combined result.
4. Do not configure production payments, import customer data, or reset a database for this verification. Existing synthetic fixtures are sufficient for the next engineering steps.

Coordination note to copy:

> Codex is working from 2247dd8 on customer-side verification, PostgreSQL discovery authority checks, and regression tests. Please leave connectors/src/discovery/**, tests/unit/discovery-authority.test.ts, and its task-specific evidence to Codex. Codex confirmed the preference ordering defect remains: a future-dated opt-in can suppress a later opt-out. Please reserve backend/domain/src/preferences/** and its tests for Codex. A complete preference concurrency fix may need shared contract changes and a customer migration; provide your current contract version, next reserved migration number, and shared files before either side changes them. Confirm your checkout and runtime are separate. Continue your vendor/auditor work.

## Engineering sequence

1. Repair PostgreSQL discovery lease expiry and verify positive/adverse tests. Record test-double limits separately from actual database execution.
2. Coordinate and repair preference ordering. Preserve observed timestamps as provenance; do not let client clock skew or an old grant override a withdrawal. Cover equal timestamps, delayed/replayed requests, concurrent interactions, and genuinely new affirmative choices.
3. Diagnose customer migration history without resetting data. Rehearse clean installation and upgrade in a named isolated synthetic database after runtime coordination. The earlier duplicate-relation failure remains unresolved until reproduced and explained.
4. Verify customer flows against the combined source: authentication/isolation, consent and preferences, rights, holds/retention, discovery, mapping, incidents, notifications, worker recovery, and UI error/permission states. Run each database/runtime suite serially per profile. Bind evidence to this run and source; do not reuse old PASS artifacts.
5. Complete native PostgreSQL adapter dispatch only after agreeing the generation/version/approval contract. Its standalone SQL transport and synthetic records adapter are different paths. Never present synthetic behavior as real-source conformance.
6. Run the complete static suite, supported browser journeys, clean install/upgrade/restore and capacity checks on declared hardware. Record measured precision/recall against an independent labelled synthetic corpus where classification accuracy is claimed; do not derive accuracy from test pass percentage.
7. Integrate Claude's final vendor/auditor changes only with the owner's update instruction, then repeat affected checks. Freeze a candidate only when remaining implementation and prerequisites are resolved; execute full acceptance and the required human-supervised rehearsals before release approval.

## Known dependencies

- Preference ordering: shared contract/migration coordination pending.
- Vendor/auditor implementation, including audit mandate/channel: Claude's active lane.
- Full customer runtime/browser qualification: isolated runtime reservation and current database-state diagnosis pending.
- Native PostgreSQL workflow integration: generation/version contract still absent from dispatcher.
- Production signing, reviewed legal content, actual provider conformance, independent assessments and release approval remain separate requirements. No percentage or production-readiness claim is made here.
