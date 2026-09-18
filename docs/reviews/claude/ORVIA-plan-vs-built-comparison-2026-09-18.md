# ORVIA — execution plan 1.0 compared against the built prototype

**Date:** 2026-09-18 · **Candidate:** `c5655eacf86a68e4aa76ae3b79a1328517c0d23d`
**Method:** every claim below was checked against actual code, database state or an executing suite at the
candidate. Nothing is asserted from memory.

---

## Verdict

The prototype matches the plan. All eleven P0 capabilities, all eleven scenario steps and every
architecture choice are built and covered by passing suites at one frozen candidate.

**One substantive gap was found — the capability register was stale — and it is now closed.** Two harness
defects surfaced while re-qualifying and were fixed. Nothing else was left out.

---

## P0 — all eleven capabilities built

| Plan capability | Built | Evidence at candidate |
|---|---|---|
| Local start and bootstrap | Yes | Protected bootstrap CLI, durable stores, preflight; overview screen shows build, contract, profile, tenant and environment |
| Login and authority | Yes | `test:auth` 87 · real staff/principal sessions, roles, privileged MFA, two organisations |
| Purposes, notices and policies | Yes | `test:consent` 50 · immutable versions, distinct-reviewer publication of the exact version |
| Systems and control map | Yes | `control map exposes actual declared edge`; three connector kinds incl. unsupported legacy |
| Consent and Privacy Centre | Yes | `test:consent` 50, `test:expiry` 87 · affirmative grant, receipt, history, monotonic epoch |
| Durable workflow and restricted connector | Yes | `test:workflows` 32, `test:lifecycle` 17 · outbox, Temporal worker, signed scoped commands |
| Supported send control | Yes | `test:enforcement` 46 · fresh authority check at admission; post-withdrawal blocked |
| Verification, uncertainty and failure | Yes | `test:evidence` 69 · separate scoped read, `EFFECT_UNKNOWN`, failure centre, manual obligation |
| Local evidence | Yes | `test:evidence` 69 · timeline, authenticated JSON export, integrity digest, coverage gaps |
| Regression and recovery | Yes | `test:regression` 70 · healthy/broken/repaired, worker restart, quarantine restore |
| Packaging and safeguards | Yes | Locked versions, 0 foreign origins, isolated reset tooling, documented install |

## The eleven scenario steps — all covered

Each was confirmed by assertion name, not by assumption:

| # | Step | Confirming assertion |
|---|---|---|
| 1 | Configuration with a second approving reviewer | `distinct reviewer publication persists` |
| 2 | Grant at epoch 1; order service has its own condition | `first epoch is one`; `service class cannot reuse marketing purpose`; `order requires its own exact condition` |
| 3 | Single-transaction withdrawal to epoch 2 | `withdrawal increments epoch`; `race advances one epoch only` |
| 4 | Worker plan, agent applies, CRM actually changes | `target recorded current withdrawal epoch` |
| 5 | Admission rechecks authority; preview is not enough | **`preview is current but not admission`**; `new post-withdrawal attempt blocked`; `post-withdrawal no effect` |
| 6 | Separate read, not a copied acknowledgement | `acknowledgement without effect remains unresolved and never verified` |
| 7 | `EFFECT_UNKNOWN`, reconcile, legacy becomes manual | `applied response lost, read reconciliation and visible manual obligation` |
| 8 | Old grant replay cannot reactivate marketing | **`old grant replay cannot reactivate`**; `old grant replay returns old immutable receipt` |
| 9 | Evidence export retains gaps; stays `NEEDS_ATTENTION` | `export retains unresolved coverage`; `export integrity digest matches actual document` |
| 10 | Real broken-control detection, then repaired | `real healthy, broken detection, repaired and target restoration results` |
| 11 | Worker restart; quarantined target-only restore | `test:lifecycle` 17; `TARGET_RESTORE_QUARANTINE` |

## Scenario fixtures — exactly as specified

Aster and Birch, **two Aster principals and one Birch principal**, both purposes
(`promotional_marketing`, `order_service_demo`), and all three connector kinds including the explicitly
unsupported `LEGACY_MANUAL`. Staff roles cover super admin, admin, auditor, member, a distinct reviewer and
a sibling-environment account.

## Architecture — matches row for row, with no drift

Monorepo, Node 24, Next App Router, thin `/api/v1` handlers over shared domain packages, PostgreSQL with
explicit tenant predicates and RLS, Better Auth with separate staff and principal contexts, OPA with
separate namespaces, Temporal worker with transactional outbox, restricted signed agent, synthetic CRM plus
local REST simulator, full test pyramid, one local Compose profile.

**None of the forbidden additions is present:** no Redis, no graph database, no Kubernetes, no competing
ORMs, no runtime AI framework. The control graph is the relational abstraction the plan permits.

**Boundary verified:** 1250 browser requests across 17 contexts, single origin `https://127.0.0.1:4330`,
**zero foreign origins**; TLS validated with no bypass.

## P1 — correctly not built

None of the four optional slices was promoted: rights intake, retention/hold review, licence import,
runbook help. The plan calls P1 "not an obligation" and forbids trading away P0 testing or rehearsal for it,
and the sprint brief required explicit human promotion that was never given. **Both** listed
presentation-polish items were built: the read-only capability catalog and scoped role display.

## "Not implemented by default" — respected

No real vendor services, no customer data ingestion, no autonomous discovery, no workflow designer, no
destructive erasure, no enterprise SSO/HA/Kubernetes, no licence commerce, no model training or inference.
All retained in the register with their Version 1 backlog or Version 2 designation.

---

## The gap that was found, and closed

### The capability register described the plan, not the build

`tracking/capabilities.json` — the file the capability screen renders — still sat at its A00 inspection
baseline. All 26 Version 1 modules read:

> Implementation: NOT_INSPECTED; tests: NOT_RUN; enabled: NOT_VERIFIED · Evidence: None recorded

That included Consent Management, Workflow Engine, Evidence Engine, Policy Engine, Identity and Access
Management and the Privacy Test Engine — modules this build demonstrates live. Nothing validated the file,
so it never moved as the work landed.

This mattered because the plan makes the register the vehicle for presenting the wider programme
*truthfully*. A leadership audience would have watched a live consent withdrawal and then read that consent
management had never been inspected. The register was untruthful in the understating direction.

**Closed.** Each Version 1 module now carries a status grounded in what actually runs at this candidate:

| Status | Count |
|---|---|
| Built as a synthetic subset | 13 |
| Partly built | 5 |
| Not built | 8 |
| Deferred to Version 2 | 7 |

Every built module names the suites and browser specs that cover it. Every unbuilt module says so plainly
and carries no evidence. The vocabulary states its own limits: a sandbox subset is never a delivered master
module, and coverage at the candidate is engineering evidence, **not** canonical acceptance — T01–T34
remain `NOT_RUN`.

**Kept honest.** `validateCapabilities` gives the register teeth: a module claiming to be built must name
evidence that resolves to a real package script or an existing path; an unbuilt module cannot borrow
coverage; a deferred module cannot claim delivery; the 33 master modules cannot be lost and statuses cannot
be invented. It runs in `tracking:check`, in four new unit tests that assert each of those rejections, and
in three browser assertions that check the register no longer reads `NOT_INSPECTED`, that M11 shows built
and covered with its suite named, and that M14 still reads not built with no evidence.

The screen now shows status as labelled badges carrying their meaning and lists covering suites, instead of
printing a raw JSON array.

### Two harness defects found while re-qualifying

Neither is a product defect, and neither is masked by a retry.

**Readiness was declared too early.** `test:auth` failed three times in the back-to-back sequence and
passed three times in isolation, always at the same point — the application restart after the OPA outage
case. Captured server output showed the restart itself succeeded, so the failure was the first business
request afterwards exceeding its own 20-second timeout. `/healthz` answers before the business route graph
has loaded. Readiness now also waits for `/api/v1/session` to answer, where an unauthenticated 401 proves
the boundary is loaded and refusing correctly. If it never answers, it still throws.

**Nine reviewer proofs bypassed the rate-limit guard.** `test:expiry` hit a real 429 mapped to 503. Its
loop performs seven reviewer re-authentications and `consent.test.ts` performs two more, none of which used
the authentication-window guard that login and the scenario builder already had. Both now wait for the
genuine idle window. The product limit is unchanged and no audit row is cleared.

After both fixes, **all 18 static and backend gates passed in one uninterrupted sequence** — the first time
that had happened.

---

## Candidate and qualification

| Field | Value |
|---|---|
| Commit | `c5655eacf86a68e4aa76ae3b79a1328517c0d23d` |
| Qualified inventory | `6a90215df79e8a04612927bbe059c6f167551155e0908f555525c3399b2f249d`, 224 tracked files |
| Host / container build | `sd85T6NMjOMCYlF94AaeS` / `10hmJ2uo-XAjgyWKHu0RA` |
| Manifest | `281810f57ae03338d5a65c6b16fb1db6cf4477215e44e9e5b672f6a25de964fc` |
| Independent verification | **242 checks, 0 failures** |
| Exact-candidate vs historical evidence | 20 vs 175, partitioned; **`failures_at_candidate` empty** |

**Static:** contracts, typecheck, lint, **unit 20/20**, tracking (23 tasks, 34 acceptance definitions, 33
capability modules), production build, runtime image, hygiene 0 findings.

**Backend:** auth 87 · expiry 87 · regression 70 · evidence 69 · consent 50 · enforcement 46 · workflows 32
· lifecycle 17 · network 13 · TLS 12 · smoke 4 · dependencies 498 packages vs 7408 advisories, 0 findings.
All exit 0.

**Browser:** **17/17 PASS**, exit 0, `dirty` false, no TLS bypass. **0 console errors, 0 React/hydration
warnings, 0 genuine page errors** — the single page error is the audit's own probe, separated as
`deliberate_faults`. 1250 requests, single origin, 0 foreign.

---

## What remains

Unchanged and human-only, in order:

1. **Human C00 acceptance**
2. **Rehearsal 1** on `c5655eac…`
3. **Rehearsal 2**, independently
4. **Work consolidation** — promote T statuses only where genuine `APPLICATION_ACCEPTANCE` /
   `FULL_SCENARIO` records exist, then C01/C02 and W03
5. **Human final sign-off**

No planned prototype scope is outstanding. The optional P1 slices remain available if the human wants one
promoted, but the plan is explicit that they must never displace rehearsal time.

Operational notes carried into the rehearsals: put `C:\Windows\System32` ahead of Git's `usr/bin` on `PATH`
if you re-package; do not add `Claude outputs/` to `.gitignore` before the rehearsals, since `.gitignore` is
inside the qualified inventory and that edit would void the candidate; remove the temporary CA trust
afterwards and record its absence.
