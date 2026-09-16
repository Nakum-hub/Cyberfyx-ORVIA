# W00 — repository scope and bootstrap review

**Review:** repo-r2, 2026-09-16 · **Base inspected:** `96b8bd7590de0ca662d725b7fa0d708e811d6722`

**Disposition:** Work design/checkpoint delivered; W00 acceptance BLOCKED pending A00 proposal and source placement. No application tests executed. This updates the earlier document-only review against the newly accessible repository.

## Source, inventory and decision

The approved master is document revision 1.3, SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`. Work verified the supplied reference bytes; the repository copy under `docs/source/` is absent. [SOURCE_ALIGNMENT](../../prototype/SOURCE_ALIGNMENT.md) records provenance. [ADR-001](../../decisions/ADR-001-prototype-profile.md) adopts the existing bounded prototype profile; there is one architectural decision, with this repository update.

`git ls-tree -r --name-only HEAD` lists exactly seven files: `AGENTS.md`, `README.md`, `README_START_HERE.md`, and prototype `ACCEPTANCE.md`, `CONTRACT.md`, `EXECUTION_PLAN.md`, `FILE_OWNERSHIP.md`. No source code, manifest, lockfile, executable contract, test suite, CI, A00 inventory or A00 handoff is present. The initial isolated Work checkout is clean. The six substantive governing files match the supplied execution kit byte for byte.

GitHub's initial read reports a public repository, default branch `main`, user push permission, no open PRs, one branch with `protected: false`, and no active repository/inherited rulesets in the returned ruleset list. The subsequent publication write was denied by GitHub with HTTP 403 `Resource not accessible by integration`; user permission did not establish the connector's ability to write. No remote branch or PR was created in that failed attempt. The authorised retry subsequently published the matching tree and draft PR #1; F06 is resolved for publication. These are access/control observations, not security certification. Keep human merge control. Work does not alter repository settings or merge this branch.

## Scope and critical path

Keep the agreed marketing-withdrawal slice: real staff/principal authentication and privileged MFA; immutable approved configuration; atomic consent/event/outbox/receipt; persistent workflow; restricted CRM mutation; independent observation; current send-admission enforcement; explicit uncertainty/manual gaps; local evidence; genuine regression detection; worker recovery and quarantined target-only restore. Use Aster Demo, Birch Demo and distinct synthetic principals. Service-purpose authority is independent of marketing consent. No additional P1 slice is promoted.

Keep the selected TypeScript/Next/PostgreSQL/typed persistence/auth integration/OPA/Temporal/local-agent direction. No implementation exists in this base to migrate. A00 must inspect its actual starting commit before scaffolding and preserve any subsequently supplied working code. Compatible versions, resources and startup are verified by Codex, not inferred from this review environment.

| Gate | Existing plan requirement | Work decision |
|---|---|---|
| R0–R1 / shared base | A00 inventory, service preflight, exact schemas; W00 review; C00 independent | A00 may start now; A00 acceptance requires W00 review of its proposal. Do not introduce a circular dependency |
| G1 / R1–R4 | Real persisted login/action and tenant/principal denial | Stop breadth if authority fails |
| G2 / R4–R8 | Browser withdrawal, durable work, actual CRM effect/readback | Require cross-component evidence |
| G3 / R8–R14 | Current boundary, uncertainty, replay and actual broken-fixture detection | Checkpoint, not final readiness |
| R14–R20 | Protected rest and committed handoff | Preserve; no unsupervised cross-tool scheduling |
| G4 / R20–R25 | Recovery/isolation/egress fixes | P1 only after core gate and explicit promotion |
| R25–R28 | Reproducible package and feature freeze | Record exact candidate, lockfile, profile and scope |
| G5 / R28–R32 | Clean start and scoped acceptance on frozen candidate | All 30 P0 plus any promoted P1 require actual results |
| R32–R36 / G6 | Two rehearsals, retained evidence, contingency, human handover | Human approves internal demo; production gates remain separate |

Actual R0, timezone-labelled deadline and target-machine resources are not supplied. Do not restart the 36-hour allowance or declare the schedule feasible without those facts. Their absence does not block A00 inventory/bootstrap. Cut polish/P1/extra cases/commercial preview/website scope before sacrificing authority, durability, truthful observation or testing.

## API and state review

The design contract is 0.1.0; no executable contract is frozen. Server-derived identity and tenant/legal-entity/environment capability checks must protect requests, jobs and exports. IDs supplied by a client are selectors. The master consent aggregate remains `(tenant, legal_entity, principal_reference, purpose)`; A00 must state how environment-scoped purposes/mappings and sibling-environment denial work without inventing a different aggregate or implicitly sharing authority.

Keep consent, workflow, execution, observation, processing-decision and test-result axes separate. A committed receipt means durable acceptance, not downstream completion. Timeout means possible unknown effect. ACK is not independent observation; manual attestation is not automated verification. Required unresolved obligations keep NEEDS_ATTENTION. A readback can become stale. Preview ALLOW cannot authorise later sending.

Freeze examples for authenticated idempotent replay after a higher epoch, conflicting reuse, current receipt projection, apply-then-timeout reconciliation, ACK-without-effect, missing read permission, stale command versus fresh consent and target generation, and 400/401/403/404/409/429/503 errors. Request replay re-authorises before returning the original receipt; history is not rewritten. Codex owns the canonical schemas and generated types/OpenAPI; Claude Code consumes them.

## Findings and owner handoffs

All findings below reference the inspected base above unless explicitly labelled as a supplied-kit observation. They are missing evidence or contract ambiguities, not executed runtime defects. F01–F05 remain open until their stated retests are reviewed. F06 is resolved by the publication retry recorded below.

### W00-F01 — High — incomplete source/bootstrap evidence

- **Task/file:** W00/A00; absent `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`, `docs/engineering/REPOSITORY_INVENTORY.md`, `packages/contracts/**`, manifests/lockfile, runtime/tests and `handoffs/codex/**`.
- **Reproduction/evidence:** seven-file tree at the inspected SHA; baseline command records and hashes in `W00_EVIDENCE.json`. Repository access and exact commit are now established, resolving that part of the earlier F01.
- **Expected:** approved source copy and a small runnable shared scaffold with actual inventory/preflight, canonical interfaces and explicit UI entry/layout transfer. Do not demand later A01–A06 application features before accepting the initial scaffold.
- **Owner/correction:** human places the already available approved master; Codex supplies A00 inventory, implementation, versions, contract proposal and factual handoff. Missing seed/common handoff template must be restored from the agreed kit by their authorised owner; Work used the supplied template for its own handoff.
- **Retest:** compare repository master hash; review exact A00 commit/diff and real generated artifacts; execute the available clean-start and isolated reset checks for T01/T28, recording their actual scope and remaining final-package obligations. Work then decides W00/A00 acceptance.

### W00-F02 — High — signed-command bindings not fully frozen

- **Task/file:** A00/A03; `docs/prototype/CONTRACT.md` §6 against master §30; future `packages/contracts/**` and agent validation.
- **Reproduction/evidence:** master §30 explicitly binds workflow/action, capability, schema version and approval digest. The design envelope list omits explicit workflow/capability/schema/approval bindings, although the plan separately lists capability version. No canonical schema proves an equivalent binding.
- **Expected:** tampering with any required authority/plan binding is rejected by the agent. Approval absence cannot bypass an approval requirement.
- **Owner/correction:** Codex proposes exact fields or a reviewable canonical digest binding with definitions/examples and any contract version change; Work reviews semantics; Claude Code confirms consumer impact. Work does not edit the schema.
- **Retest:** A00 positive/negative schema examples and generated drift check; A03/A06 T12 executes altered workflow, capability, schema, approval, scope, expiry and replay denials against the agent. Schema-only checks do not count as executed agent security tests.

### W00-F03 — High — reconciliation and receipt projection are underspecified

- **Task/file:** A00/A02/A03/A05 and B02/B03; `CONTRACT.md` §§3–4, 6–8; master §§25, 44.
- **Reproduction/evidence:** design maps outcome uncertainty to EFFECT_UNKNOWN but supplies no typed durable RECONCILING transition/attempt. `propagation_status` lacks a frozen type and examples distinguishing stable acceptance from refreshed projection. The existing text prohibits false verification but does not settle the wire/persistence representation.
- **Expected:** an apply-then-timeout attempt retains unknown/ACK history while supported read-only reconciliation adds a separate scoped observation; it cannot fabricate an ACK. Retries depend on current authority/generation and classified safety. An identical authorised request replay returns the original logical receipt even after a higher epoch; current status is labelled separately.
- **Owner/correction:** Codex freezes transitions, completion predicates, replay ordering and immutable receipt/current-projection examples; Work reviews; Claude Code binds those types without a second DTO model. No enum/endpoint change is pre-approved here.
- **Retest:** A00 schema/transition examples; T08–T11, T13, T17–T21 and T29 on their owning implementation commits, including applied timeout, ACK without effect, permission loss, stale workers and unsafe retry rejection.

### W00-F04 — Medium — missing progress-aware tracker validation

- **Task/file:** A00; missing `scripts/validate_prototype_kit.py` in this repository. The supplied kit's file contains assertions requiring every task NOT_STARTED and every test NOT_RUN with empty evidence.
- **Reproduction/evidence:** inspect those literal assertions in the matching kit. Earlier rejection of progressed W00 belongs to the supplied-kit review, not a runtime run on this repository. This checkpoint executes separate document checks only.
- **Expected:** valid progress and retained failed/retest evidence are permitted; IDs, dependencies, required artifacts and generated views remain consistent. Status labels never fabricate passing tests.
- **Owner/correction:** Codex supplies the permanent validator/generators under its scripts/CI ownership, with documented supported statuses. Work preserves JSON schema version 1, existing IDs/dependencies and prior W00 BLOCKED status; only the existing repository observation becomes INSPECTED.
- **Retest:** legitimate progressed fixture passes; invalid dependencies/unsupported statuses/missing evidence or view drift fail. Do not hard-code all records to their initial state or move Work's canonical tracker ownership.

### W00-F05 — Medium — timing and execution environment unconfirmed

- **Task/file:** W00/A00; `CURRENT_STATE.md`, `EXECUTION_PLAN.md` §6 and future A00 preflight.
- **Reproduction/evidence:** no actual R0/deadline or target-machine profile exists in the seven-file base. The Work scratch environment is not claimed to be the demo host.
- **Expected:** record human deadline/timezone and an isolated authorised runtime with actual tool versions, resources, service readiness, namespaces/ports and artifact retention.
- **Owner/correction:** human supplies timing/target facts; Codex records executable preflight. Continue dependency-ready inventory meanwhile; no spend, provisioning or secret request is implied.
- **Retest:** inspect factual handoff and actual preflight logs, then reassess remaining gate capacity without removing P0 gates.

### W00-F06 — Medium — GitHub publication blocked — RESOLVED

- **Task/file:** W00 publication of the nine owned additions on `prototype/work/W00-bootstrap-review`; GitHub Git tree creation for `Nakum-hub/Cyberfyx-ORVIA`.
- **Reproduction/evidence:** the selected GitHub connector's create-tree request returned HTTP 403 `Resource not accessible by integration`. The attempted tree and exact error are retained in `W00_EVIDENCE.json`. Read access and the repository's user push flag do not demonstrate integration write permission. No credential helper, Git authentication configuration, askpass, SSH agent or GitHub CLI was configured for an alternate authenticated push; credentials were not extracted.
- **Expected:** the authorised Work checkpoint can be published to its own branch and draft PR, with remote SHA and changed paths verified. Human owns access, permissions and merging.
- **Owner/correction:** human checks/authorises repository Contents write and Pull requests write for the selected GitHub connection, or applies the prepared commit patch using existing authorised repository access. No token or private key is requested in chat and no access control is bypassed.
- **Retest:** after access is corrected, publish the reviewed tree, verify remote branch commit/tree and PR target/diff, and keep `main` unchanged until human approval. This is a publication blocker, not an observed application defect.

**Resolution / retest:** GitHub accepted tree `4f0afd9ee19f8c69dd37d8f449334937fcba45fb`, identical to reviewed local checkpoint `43d9590d26ec7e825a67ebdb1a76aea3b306ed05`. Published checkpoint `ebaea86cae793d04808a1fc983e1adc31b1bbe06` was submitted on the intended Work branch in [PR #1](https://github.com/Nakum-hub/Cyberfyx-ORVIA/pull/1). The owner `Nakum-hub` subsequently merged it at `2026-09-16T08:21:24Z` into `d2f49fe3ebde2e7e946239329fc14c802d10a3b3`. Work did not merge it; later publication metadata is a separate proposal. Remote branch SHA and all nine changed paths were checked. `W00_EVIDENCE.json` retains the failed attempt and the successful retry separately. This closes the publication blocker only.

## Four Work stages and execution boundary

| Ticket | Current state | Required input / intended report |
|---|---|---|
| W00 | BLOCKED for acceptance; design and repository checkpoint delivered | A00 proposal/evidence; this review and ADR-001 |
| W01 | NOT_STARTED | Start after accepted A00; accept with A01/A02; `AUTH_AND_CONSENT.md` |
| W02 | NOT_STARTED | Start after W01/A03; accept with A04/A05/A06/B04; `INTEGRATION_AND_SECURITY.md` |
| W03 | NOT_STARTED | Start after W02; accept with A07/B06/C02; `FINAL_GATE_REPORT.md` |

W01 will review real tenant/environment/principal authority, MFA/roles/version approval, atomic persistence, stale-grant/concurrent epochs and re-authorised idempotency. W02 will trace actual API/database/worker/agent/target/browser evidence for current-boundary ordering, ACK-versus-observation, unknown effects/safe retries, recovery/reset isolation, negative regression and egress. W03 will review an exact integrated frozen build, all 30 P0 scenarios and promoted P1, package/lockfile identity, two rehearsals and truthful capability/demo claims. No empty report is presented as a completed review.

The restored canonical ledger retains all 34 tests NOT_RUN and no application evidence. Prototype IDs are distinct from similarly numbered master tests. Internal-demo readiness is NOT_READY; production security/legal/release readiness is NOT_ASSESSED.

Next dependency-ready ticket: **Codex A00**, with **Cowork C00** independent. The human integrated the initial Work checkpoint via PR #1; that alone does not accept W00/A00 or permit B00/W01 to start. See [the factual handoff](../../../handoffs/work/W00-96b8bd7.md).
