# Codex continuation — A02 through A07

Base: `50cb4daeded9253c4f7cca4f742cb212c10aa5b7` (human-merged A01). Branch: `prototype/codex/A02-A07-core`.

The human requested continuous implementation of A02–A07 and one consolidated Work review afterwards on 2026-09-16. This authorizes serial implementation and verification without waiting for a new Work review between tickets. It does not confer final acceptance, transfer UI/browser ownership, authorize self-merging main, public deployment, spending, customer data, or A08.

Allowed paths: Codex-owned contracts/generated seed, manifests/configuration, database/migrations, auth/authz/domain/connectors/policy SDK/testing, API/server, worker/agent/demo targets, infrastructure/scripts/policy, backend tests, engineering documents and Codex handoffs. Work's state/task/review documents and Claude Code's UI/browser files remain owned by those lanes.

Plan: A02 immutable configuration and independently approved publication; transactional own-principal consent/events/outbox/receipts with replay and concurrency tests. Then A03 durable Temporal dispatch and signed restricted CRM execution; A04 current-state send admission; A05 real fault behavior, observations and evidence; A06 actual regression/recovery/security checks; A07 package and frozen candidate checks. Each increment records actual commands, failures, fixes and evidence; unexecuted acceptance remains NOT_RUN.

Contract additions needed by A02 will be versioned in the executable source with generated client/OpenAPI/examples, a producer/consumer handoff and PENDING_WORK_REVIEW metadata. Accepted 0.2.1 is the baseline, not an approval of later changes.

Status: A02 implementation in progress. A03–A07 not yet implemented. Final evidence and exact commits will be appended after execution.
