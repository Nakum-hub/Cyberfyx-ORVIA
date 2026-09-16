# A03 — start record

Base: A02 implementation `3242521e59966885d8053747a82d96cb92ea55d5`, evidence commit `2e01b7a` on `prototype/codex/A02-A07-core`, pushed to origin. Work review remains consolidated at the human's request.

Allowed paths: Codex worker/agent/demo-targets, contracts if necessary, database/migrations, machine auth/domain/connectors, API/server, policy, infrastructure/scripts and backend tests/evidence. No UI or Work-owned tracking edits.

Plan: scoped machine identities and distinct least-privilege runtime roles; separate synthetic target database; durable outbox dispatch into actual Temporal; immutable action bindings and customer-local signing; independent agent validation and persistent command/nonce ledger; actual target mutation followed by a separate read. Verify duplicate delivery, restart recovery, stale epoch/generation and signature/trust denials. Target mutation credentials stay with the agent; the worker receives read-only observation access. Setup/seed remains protected CLI with the named synthetic profile.

New consent may be recorded while earlier restrictions are unresolved, but no target generation is silently enabled by grant. A04 admission must additionally block unresolved earlier suppression. Older commands must fail current-epoch/generation validation, preserving their records. No in-memory workflow or simulated verification fallback is permitted.

Status: implementation in progress; no A03 execution evidence yet.
