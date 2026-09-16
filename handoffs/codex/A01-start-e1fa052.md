# A01 — Codex implementation start

Base: `e1fa052c6c419e90c4783ce220dee2ef247472dc`, human merge of Work acceptance PR #6. Branch: `prototype/codex/A01-auth`. A00 accepted at `58ceddc`; Work review `425f079`, ledger `af51ca7`. The human confirmed integration in this session; Git fetch verified it. Master SHA-256: `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`. Contract: `0.2.1`.

Allowed paths: Codex-owned auth/authz/db/contracts/testing packages, API/server routes, policy, dependency/configuration files, engineering scripts/tests/docs and this lane's handoffs. UI, Work/Cowork trackers, reviews and source originals remain with their owners.

Implementation checklist:

- Supported Better Auth 1.7.5 Drizzle integration; independent staff/principal stores, secrets and cookie mounts; locally generated credentials; protected setup CLI; persisted sessions, logout/revocation and privileged TOTP MFA.
- Separate migrator, authentication and non-owner/non-superuser/non-BYPASSRLS application credentials. Composite tenant references and transaction-scoped RLS context; explicit predicates and server-derived identity.
- Approved role capabilities, restricted machine authority, safe errors, request limits/origin protections and persistent audit; no UI authority.
- Execute real authentication/database tests for normal persistence, MFA, revoked sessions, cross-tenant/environment/principal denial, staff/principal separation, member/auditor mutation denial and connection reuse. Run generated drift/type/lint/build and applicable existing controls.
- Supply exact source identity, raw results and UI/Work handoff. A02 starts only after A01's integration/acceptance gate; subsequent A03–A07 retain their graph and human/other-lane dependencies.

Inspection: only A00 bootstrap tables/client mounts exist; no auth server or business persistence to replace. Existing versions remain pinned. Docker access initially failed under the sandbox (exit 1); normal approved read-only inspection succeeded (exit 0), with no containers running. Existing named services are being started without reset. No A01 acceptance claimed by this start record.
