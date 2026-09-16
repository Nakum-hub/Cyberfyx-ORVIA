# ADR-001 — Adopt the customer-local synthetic prototype profile

**Ticket:** W00 · **Revision:** repo-r4 · **Date:** 2026-09-16

**Decision owner:** Work · **Integration/release owner:** human

**Status:** Adopted and reviewed against the actual A00 foundation. Work accepts A00 at `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`, contract 0.2.1, following the human integration of PR #5. F01/F07 are closed by source verification and independent retest. See [acceptance review](../reviews/work/W00_A00_ACCEPTANCE.md). Internal-demo/production readiness remains separate.

## Context and authority

The source is `ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`, document revision 1.3, Product Version 1. Its complete reference-file bytes were obtained and SHA-256 independently recomputed:

`527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`

This matches the expected hash in the execution kit and project handoff. The current numbered sections and governing requirements control this decision; historical diff appendices do not supply alternate product requirements. No legal baseline or external technical-version claim was newly verified by this review.

The planning input is the matching `ORVIA_Prototype_Execution_Kit_v1.zip`, plan 1.0. The original planning base was `96b8bd7590de0ca662d725b7fa0d708e811d6722`; its six governing documents matched that kit. A00 supplied the scaffold, inventory, pins and actual bootstrap evidence, then corrected F07 in `732f4f50142e9b6bbe37187b07da04e3341b9621`. Submitted head `aa831cdfc2051599ab812e20287664c34f30a15c` and human-integrated `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe` have identical trees. The approved master now exists at the required repository path and matches the reference hash. Current numbered sections govern; no historical diff appendix or older prototype kit overrides them.

## Decision

Adopt the existing plan's **CUSTOMER_LOCAL_SYNTHETIC** profile and marketing-withdrawal vertical slice. This is a bounded internal-demo addendum to the master, not a replacement product specification. Preserve compatible working code when A00 inventories the actual repository. No framework migration or rewrite is authorised by this ADR.

| Area | Adopted prototype decision | Source / limit |
|---|---|---|
| Runtime boundary | Workspace, Privacy Centre, API, policy service, databases, durable worker, agent, targets, logs and evidence remain local; local assets; no runtime vendor/model dependency | Master §§2, 11, 20, 31, 43, 63; prototype EXECUTION_PLAN §§2–4 |
| Slice | Authenticated grant/withdrawal, durable receipt and outbox, actual CRM restriction, independent observation, current send admission, uncertainty/manual gap, local evidence and real regression | Master §§16–18, 40, 44–47, 137, 191–194 |
| Targets | Synthetic CRM, ORVIA-built REST/send simulator and a declared no-API legacy target; two synthetic organisations and distinct principals | A simulator is not a supported commercial-vendor connector |
| Logical stack | TypeScript/Next, PostgreSQL, Drizzle, Better Auth, OPA, persistent Temporal development service and restricted local agent | Preserve compatible existing implementation. A00 supplies locked versions and measured Windows bootstrap service evidence; full application/resource qualification remains later work |
| Packaging | One private local Compose profile; thin Next handlers call domain packages; shared application build with independently enforced staff/principal identities | Private synthetic adaptation only; public portal/private-admin production ingress is not qualified |
| Recovery | Worker recovery plus quarantined target-only synthetic restore against the current authoritative consent ledger | No claim of full control-plane restore, measured production RPO/RTO or enterprise disaster recovery |
| Security | Real authentication/MFA, scope checks, least privilege, protected bootstrap, signed restricted commands and current-authority checks remain P0 | No role switch, fake identity, arbitrary target or hidden fail-open substitute |
| Optional work | At most one explicitly promoted P1 slice after the core gate and test reserve permit it | No promotion or extra scope selected in W00 |
| Product AI | Custom models, embeddings, training, GPU work, model APIs and an AI-draft-import workbench remain excluded | Product Version 2 is preserved; company-authorised development AI is separate |

## Contract adoption boundary

Adopt the design's separated consent, workflow, action, observation, processing-decision and test-result axes. Accept durable withdrawal before propagation; ACK is not observation, a timeout is not proof of failure, and manual closure is not automated verification. Preview ALLOW never authorises later sending.

The master and prototype use different state vocabularies. Preserve the meaning rather than treating either vocabulary as permission to omit uncertainty:

| Master concept | Prototype mapping / freeze condition |
|---|---|
| §25 `OUTCOME_UNKNOWN` | Design `EFFECT_UNKNOWN`; retain the uncertain attempt and its evidence |
| §25 `RECONCILING` | Accepted 0.2.1 uses a separate typed PENDING → RECONCILING → terminal record linked to the retained uncertain attempt |
| §44 acknowledgement | `ACKNOWLEDGED` is an execution fact, never an independent read |
| §44 observed verification | `OBSERVED_SATISFIED` is scoped, dated and limited; no unqualified universal VERIFIED label |
| §44 stale/missing observation | Preserve `STALE`, `UNVERIFIABLE`, `NOT_CHECKED` and unsatisfied observations as distinct facts |

**Executable contract 0.2.1 is accepted for the prototype foundation.** F02 bindings, F03 immutable receipt/current projection and separate reconciliation representation, and F07's independent-observation predicate are reviewed together. A provider assertion remains evidence but cannot satisfy CURRENT_SCOPED_OBSERVATION; this criterion requires a fresh satisfied SCOPED_READ in current scope. Manual attestation is a separate administrative criterion. A later read may satisfy the declared obligation without rewriting historical EFFECT_UNKNOWN/ACK facts. Existing code is preserved; no framework migration is authorised.

The consent aggregate remains `(tenant, legal_entity, principal_reference, purpose)`. A00 defines each prototype purpose as belonging to one environment; A01/A02 enforce composite authority/mapping constraints and sibling-environment denial. Idempotent retry re-authorises before receipt replay; identical authorised requests return the original receipt even after higher epochs. Current state is a separate projection. Staff/principal/machine authorities remain distinct; dual staff/principal session ambiguity fails closed. Actual persistence/authority/race tests stay in their implementation tickets.

## Ownership and acceptance

Codex remains the sole schema/dependency/migration/server/worker/agent writer. Claude Code owns UI and browser tests after the recorded A00 layout transfer. Cowork owns UX, capability claims and operator/demo documents. Work owns decisions, its reviews, canonical task/acceptance tracking, generated views and consolidated state. The human owns access, system approval, integration and release. A00's explicit layout.tsx/page.tsx transfer to Claude Code is effective on the accepted base once the human integrates the shared ownership record. Codex retains health/API/server/auth/configuration and dependencies. Work restores the common template unchanged from the matching kit; source ownership remains human.

All 30 sprint P0 scenarios remain mandatory for completed internal-demo readiness. A partial demonstration must identify its passing slice and outstanding gates. Preserve the existing R14–R20 rest/handoff block, R28 freeze and final test/rehearsal reserve; actual R0 and the meeting deadline still require the human's timestamp. Timing is an explicit unknown, not a reason to block the accepted foundation. The 36-hour budget has not restarted.

The full Version 1 supply-chain, supported-platform, recovery, legal and independent security gates remain separate, including master §§163–164. Neither this ADR, the planning validator nor a synthetic demo is production approval.

## Consequences and next dependency

Work accepts the existing A00 foundation after actual integrated retests: unchanged F07 reproducer, 11 unit tests, typecheck, lint, generated drift/examples and source/provenance checks. Earlier producer service evidence retains its bootstrap scope and original source identity. Work changed no application code and did not rerun services/browser/recovery; full T01–T34 application scenarios remain NOT_RUN.

After the human merges the Work acceptance/tracking record, **A01 and B00** are the next implementation starts; **C00** remains independent and is required for B00 acceptance. Work next reviews W01 with actual A01/A02 evidence. Preserve the original graph, rest/handoff, freeze and test/rehearsal reserve; no blanket A01–A07 acceptance, new P1 or restarted 36-hour clock is authorised. Human retains all integration and release decisions.
