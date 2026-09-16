# ADR-001 — Adopt the customer-local synthetic prototype profile

**Ticket:** W00 · **Revision:** repo-r2 · **Date:** 2026-09-16

**Decision owner:** Work · **Integration/release owner:** human

**Status:** Adopted for Work's design review. Repository adoption and W00 acceptance remain blocked pending A00's actual inventory, executable contract proposal and human integration decision.

## Context and authority

The source is `ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`, document revision 1.3, Product Version 1. Its complete reference-file bytes were obtained and SHA-256 independently recomputed:

`527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`

This matches the expected hash in the execution kit and project handoff. The current numbered sections and governing requirements control this decision; historical diff appendices do not supply alternate product requirements. No legal baseline or external technical-version claim was newly verified by this review.

The reviewed planning input is `ORVIA_Prototype_Execution_Kit_v1.zip`, plan 1.0, contract design 0.1.0. It contains the requested W00 assignment and matching role prompt. Its `docs/source/` contains only a README; the verified master was read separately. Repository `Nakum-hub/Cyberfyx-ORVIA` is now inspected at `96b8bd7590de0ca662d725b7fa0d708e811d6722`. Its seven tracked files are planning/instruction documents; there is no application, approved master in `docs/source/`, executable schema, A00 inventory or A00 handoff. Six governing documents are byte-identical to the agreed kit. The human-controlled master remains available as a separately verified reference; this Work branch does not change `docs/source/`. The older `ORVIA_36_Hour_Prototype_Build_Kit.zip` was not used as governing input.

## Decision

Adopt the existing plan's **CUSTOMER_LOCAL_SYNTHETIC** profile and marketing-withdrawal vertical slice. This is a bounded internal-demo addendum to the master, not a replacement product specification. Preserve compatible working code when A00 inventories the actual repository. No framework migration or rewrite is authorised by this ADR.

| Area | Adopted prototype decision | Source / limit |
|---|---|---|
| Runtime boundary | Workspace, Privacy Centre, API, policy service, databases, durable worker, agent, targets, logs and evidence remain local; local assets; no runtime vendor/model dependency | Master §§2, 11, 20, 31, 43, 63; prototype EXECUTION_PLAN §§2–4 |
| Slice | Authenticated grant/withdrawal, durable receipt and outbox, actual CRM restriction, independent observation, current send admission, uncertainty/manual gap, local evidence and real regression | Master §§16–18, 40, 44–47, 137, 191–194 |
| Targets | Synthetic CRM, ORVIA-built REST/send simulator and a declared no-API legacy target; two synthetic organisations and distinct principals | A simulator is not a supported commercial-vendor connector |
| Logical stack | TypeScript/Next, PostgreSQL, Drizzle, Better Auth, OPA, persistent Temporal development service and restricted local agent | Preserve compatible existing implementation. Exact versions, package choices, resource fit and service startup remain A00 evidence obligations |
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
| §25 `RECONCILING` | A durable, explicitly typed reconciliation transition/attempt is required; Codex must propose its canonical representation |
| §44 acknowledgement | `ACKNOWLEDGED` is an execution fact, never an independent read |
| §44 observed verification | `OBSERVED_SATISFIED` is scoped, dated and limited; no unqualified universal VERIFIED label |
| §44 stale/missing observation | Preserve `STALE`, `UNVERIFIABLE`, `NOT_CHECKED` and unsatisfied observations as distinct facts |

**The contract is not frozen for implementation acceptance.** A00 must resolve W00-F02 (signed-envelope bindings) and W00-F03 (reconciliation/receipt transitions) in the single canonical schema set, with versioned producer/consumer examples. Work does not add fields or enums to Codex-owned schemas. No runtime exists in the inspected commit, so there is no implemented architecture to migrate. A00 may create the agreed scaffold after rechecking its actual base; any newly supplied working code must be preserved.

Environment scope is also explicit: master §16 specifies the consent aggregate `(tenant, legal_entity, principal_reference, purpose)`. This review does not silently add an environment component or assume consent sharing. A00 must document how environment-scoped purposes, mappings and authority relate to that aggregate and prove sibling-environment denial.

## Ownership and acceptance

Codex remains the sole schema/dependency/migration/server/worker/agent writer. Claude Code owns UI and browser tests after the recorded A00 layout transfer. Cowork owns UX, capability claims and operator/demo documents. Work owns decisions, its reviews, canonical task/acceptance tracking, generated views and consolidated state. The human owns access, system approval, integration and release. No transfer is made here.

All 30 sprint P0 scenarios remain mandatory for completed internal-demo readiness. A partial demonstration must identify its passing slice and outstanding gates. Preserve the existing R14–R20 rest/handoff block, R28 freeze and final test/rehearsal reserve; actual R0 and the meeting deadline still require the human's timestamp. This does not block A00 inventory/bootstrap. The 36-hour budget has not restarted.

The full Version 1 supply-chain, supported-platform, recovery, legal and independent security gates remain separate, including master §§163–164. Neither this ADR, the planning validator nor a synthetic demo is production approval.

## Consequences and next dependency

This decision fixes the intended demo depth and boundaries while retaining all unrelated master requirements. No implementation was changed or tested. W00 has a concrete design deliverable, but its A00 bootstrap/contract acceptance is still open. This revision supersedes only the earlier unavailable-repository observation; it does not convert earlier document checks into runtime evidence.

Next dependency-ready work is **A00 repository inventory and contract proposal**; A00 may begin inventory without W00 acceptance. Work reviews that unaccepted proposal, closes the findings and returns a recommendation for human integration. Do not add an A00-completion dependency to W00, which would create an acceptance deadlock. C00 remains independent. B00 and W01 wait for the accepted A00 base.
