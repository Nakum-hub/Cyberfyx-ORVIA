# A06 start

Base `62ece0b504edd5e8a405266f06adc763da808cea`; A05 published in PR #19 before this increment. User-authorized A02–A07 continuation and consolidated Work review remain in force; this is implementation, not acceptance.

Allowed paths: Codex-owned contracts/manifests/migrations/domain/testing, server/worker/agent/demo targets, policy/infrastructure/scripts, backend integration/security/recovery/fault tests, engineering notes and Codex handoffs. UI, Work/Cowork files and shared main remain untouched.

Implement durable allowlisted synthetic test-run start/read and actual assertion persistence, an isolated buggy sender that produces a detectable violation plus repaired healthy rerun, target-only snapshot restore into quarantine followed by current-ledger reconciliation, and actual backend egress/secret/input/fault-isolation checks. Reuse existing real HTTP/PostgreSQL/OPA/Temporal/agent paths. Keep fixture/reset authority explicit and named, preserve evidence, and never reset customer/shared data. Produce actual commands/exits/source hashes and a separate A06 PR. Coordinate browser/network and frozen-candidate/human portions without certifying them.
