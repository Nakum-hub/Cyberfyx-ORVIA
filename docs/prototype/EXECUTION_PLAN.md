# ORVIA — working prototype execution plan

**Plan 1.0 · 16 September 2026 · approximately 36 elapsed hours remaining**

## 1. The decision

Build a **real, customer-local outcome-assurance demonstrator**, centred on marketing consent withdrawal. It must move from a person's authenticated choice to durable control changes, actual sandbox effects, readback, evidence and an executable regression test. Present the wider ORVIA vision through a truthful capability register, not dozens of empty pages.

The objective for leadership is: **“ORVIA can record what should happen, control a supported action, coordinate downstream work, and show what actually happened—including failures and gaps.”**

This sprint does not certify the full Version 1 programme, all connectors, legal compliance or production security. Every claim is scoped to the actual tested build, synthetic data and named boundary. Preserve the original master and all non-demo capabilities. Only the already-deferred learned-model work belongs to Product Version 2.

## 2. Fixed scope and depth

### P0 — must work before calling the outcome demo ready

| Capability | Smallest live implementation | Leadership proof |
|---|---|---|
| Local start and bootstrap | One documented local profile; durable stores; create organisation/unique local owner through protected bootstrap | Clean start, actual build ID and health status |
| Login and authority | Real library-backed staff and principal sessions; scoped roles; privileged MFA; two synthetic organisations for denial tests | Principal cannot enter admin area; auditor cannot mutate; tenant B cannot read tenant A |
| Purposes, notices and policies | Create purpose; immutable published notice/policy; explicit approval of the exact version; small configured rule form | Marketing and order-service purposes are separate |
| Systems and control map | One CRM sandbox, one local REST-provider simulator, one explicitly unsupported legacy target; declared relationships/capabilities | Scope is visible; no claim of automatic estate-wide discovery |
| Consent and Privacy Centre | Own-principal view, affirmative grant, withdrawal receipt, history and monotonically increasing epoch | Withdrawal is accepted durably, not merely a UI toggle |
| Durable workflow and restricted connector | Transactional outbox, separate durable worker, signed scoped agent command, bounded retry/reconciliation | The CRM audience actually changes and survives process restart |
| Supported send control | Fresh server-side purpose decision at simulated admission boundary | A post-withdrawal marketing attempt is blocked; independently permitted service fixture still works |
| Verification, uncertainty and failure | Independent target read; applied-but-timeout case; failure/coverage view; unresolved manual action | HTTP success is not mistaken for outcome proof |
| Local evidence | Persisted receipt/action/observation timeline and authenticated JSON export | Exact policy/consent versions, timestamps, observations and coverage gaps |
| Regression and recovery | Real assertion against healthy/broken fixture; safe worker restart; quarantined synthetic target restore and reconciliation | The suite finds a seeded broken control; restored target does not resume restricted processing |
| Packaging and safeguards | Locked versions, local assets, no runtime vendor calls, isolated reset/fault tooling, documented clean install | Tested build can be reproduced without model/GPU/provider credentials |

A policy editor can be a form. The graph can be a relationship list/detail panel. A setup CLI is acceptable for the protected organisation bootstrap; the UI must not pretend an absent wizard exists. Seeded demonstration data saves presentation time, but creation and persistence still need automated proof.

### P1 — choose only after the core gate is green

One small additional slice may be promoted with its own tests: (a) own-principal rights intake plus assigned status tracking, (b) a retention/hold review case with no destructive execution, (c) a local signed development-licence import demonstration, or (d) reviewed deterministic runbook help. Other useful presentation polish includes a read-only capability catalog and scoped role display.

P1 is not an obligation to build all four additions. Never trade away P0 testing or rehearsal for them. Any rights intake must be labelled coordination unless actual downstream fulfilment exists. Marketing withdrawal must not be represented as erasing all data.

### Not implemented by default in this prototype

Real Salesforce/HubSpot/SMS/payment services; customer data ingestion; autonomous discovery of an entire organisation; arbitrary workflow designers; all rights/guardian/nomination/retention cases; destructive erasure; enterprise SSO/HA/Kubernetes/multi-region certification; production licence commerce/update infrastructure; vendor remote administration; production support automation; model training or inference. Retain the relevant Version 1 backlog or Version 2 AI designation in the catalog.

## 3. The exact scenario

Use fictional **Aster Demo** and **Birch Demo** organisations. All people, orders and system records are synthetic. Use an adult fixture such as `Asha Demo` with a reserved-domain address; do not use a real customer record. Create at least two principal identities in Aster and one in Birch for isolation tests.

1. An authorised staff member configures `promotional_marketing` and a separate `order_service_demo` purpose, their systems, notice version and policy. A second authorised reviewer approves publication of the exact policy version.
2. Asha signs into the separate Privacy Centre identity and actively grants marketing consent. The server records the exact notice reference and epoch 1. The order-service fixture has its own separately configured condition; it does not inherit marketing consent.
3. Queue a synthetic marketing attempt. Asha withdraws marketing. The server authenticates principal/scope, handles idempotency, locks the aggregate, increments to epoch 2, appends the consent event and writes the outbox event **in one transaction**. Only after commit return an acceptance receipt and workflow reference.
4. The worker derives an immutable, purpose-scoped plan from the mapped systems. The restricted agent applies only the approved operation to the exact synthetic CRM record. The CRM audience membership actually changes.
5. When the queued send is admitted, the boundary rechecks current authority. A withdrawal committed before the admission check must block the attempt and produce no simulated send record. A prior preview or stale grant is not sufficient. An independently valid service attempt is evaluated separately.
6. Verify CRM state by a **separate read**. Record the method, observed target generation, timestamp and scope. Do not copy the command acknowledgement into a “verified” record.
7. In the REST sandbox, apply a restriction but drop the response. Show `EFFECT_UNKNOWN`. Reconcile through the supported read/receipt path before deciding whether retry is safe. A legacy target with no API becomes `MANUAL_REQUIRED`; it cannot be marked automatically verified by closing a task.
8. Replay an old grant event. It cannot lower the epoch or reactivate marketing. A genuinely new affirmative grant would be a new authenticated interaction at a higher epoch; old withdrawal workers must re-evaluate applicability before acting on a new generation.
9. Export local evidence, including successes, failures, unknown/manual obligations and explicit coverage limits. The overall result remains `NEEDS_ATTENTION` while a required obligation is unresolved.
10. Run the healthy synthetic regression test; run a deliberately broken **test-only target fixture**; observe the assertion detecting an actual violation. Restore the healthy fixture and rerun. Never implement “FAIL when the selector says broken.”
11. Stop/restart the worker after an accepted request, then show recovery without losing or duplicating the logical action. Restore an older **target-only synthetic snapshot** into quarantine; reconcile against the current authoritative consent store before allowing simulated sends. This does not demonstrate full control-plane backup recovery or enterprise disaster recovery.

The boundary is precise: the local supported send-admission integration, not all software in a company. An already handed-off external message is not promised to be recallable. Neither a graph nor a policy API automatically intercepts every external data use.

## 4. Architecture selected for this sprint

Retain the earlier prototype's TypeScript/Next/PostgreSQL direction rather than spending the deadline changing frameworks. A00 must inspect existing implemented code first; a material mismatch requires one small recorded decision, not unilateral rewrites by four agents.

| Layer | Selected implementation |
|---|---|
| Repository | One TypeScript monorepo; pnpm for a new scaffold; one reviewed dependency/lockfile owner |
| Runtime | Node 24 line; verify and pin a maintained compatible patch at bootstrap |
| UI | Next.js App Router + React + Tailwind; accessible reusable primitives |
| API packaging | Thin Next route handlers under `/api/v1`, calling shared domain packages; no business authority in React |
| Persistence | PostgreSQL + Drizzle/typed SQL; relational constraints, explicit tenant predicates and RLS |
| Authentication | Better Auth integration; separate staff/principal session contexts; unique generated credentials; privileged MFA |
| Administrative and processing policies | OPA with separate policy namespaces/adapters/tests |
| Durable work | Temporal TypeScript worker with persistent, private development service; transactional outbox dispatcher |
| Customer execution | Restricted local TypeScript agent, locally signed commands, allowlisted installations/actions |
| Demonstration targets | Separate synthetic CRM database plus local ORVIA-built REST/provider/send simulator |
| Tests | Unit/integration/security/recovery suites and Playwright browser assertions |
| Deployment | One local Compose profile; TLS/credential/storage prerequisites documented; no public ports for stores/control services |

Do not add Redis, a graph database, Kubernetes, multiple competing ORMs or a runtime AI framework for this scenario. The graph is a relational domain abstraction. Exact package versions and image digests must be recorded by A00; this document does not pretend to be a current lockfile.

### Prototype-only UI packaging adaptation

Use `apps/web` for both `/workspace/*` and `/privacy/*` layouts in this **private synthetic profile**. Use independently scoped staff/principal sessions and server routes; path names alone provide no security. No vendor website is involved. This does not claim a production public-portal/private-admin exposure design has been qualified. Separate deployment/ingress remains a production requirement before exposing the portal publicly.

### Deployment and data boundary

UI assets, API, OPA, Temporal history, databases, worker, agent, evidence, logs and test targets are all inside the local/customer-controlled environment. Disable telemetry and third-party asset fetching. Bind stores and administration to private networks/loopback. The protected candidate uses verified TLS on exposed application paths; never disable certificate checks as a shortcut. Any development-only transport limitation must be recorded and must not be used to justify public access.

The website is distribution/marketing, not ORVIA's customer processing plane. Internet may be used for authorised dependency setup; the **core demo runtime** must work after it is blocked. This is a tested runtime boundary, not a claim of a fully engineered air-gapped installer.

## 5. Four tracks and the human integration role

**Work:** chief architect/product owner and review lead. Own the sprint decisions, contract review, threat review, cross-track acceptance and truthful state/gate report. Review code as supplied; do not silently become a second backend writer.

**Codex:** core engineering lead. Own bootstrap, canonical schemas, all manifests/lockfile changes, persistence/auth/policy/consent, durable workflows, agent/connectors, evidence, deterministic tests and local package scripts.

**Work (former Cowork responsibilities, human-authorised r4 transfer):** UX, documentation and demonstration lead. Own the UX brief/copy, scenario preparation, capability truthfulness, operator instructions, leadership narrative and review of actual evidence. It does not fabricate runtime measurements or repair backend code.

**Codex (transferred B IDs):** product interface and browser-test lead. Own workspace/Privacy Centre pages, shared UI, generated-client use, loading/error/permission states and end-to-end browser tests. It must use the same actual backend.

**Human:** authorises access/uploads, owns secrets and system approvals, reviews/merges changes, resolves choices, runs or supervises commands, rehearses and signs off. Only Work and Codex remain active AI execution owners; historical time budgets and acceptance meanings are unchanged.

## 6. Remaining-time budget

The windows below are work-allocation budgets, not a promise of completion. The exact meeting time is not known. If less time is actually available, cut P1 and packaging polish, not access controls or evidence correctness.

| Window from R0 | Backend / UI objective | Work / human gate |
|---|---|---|
| R0–R1 | A00 inventory, real service preflight, shared scaffold/contracts; UI reads frozen brief | W00 scope/authority check; C00 demo/UX script. Accept one base commit before parallel code |
| R1–R4 | A01 auth/DB/scoping; B00/B01 shell and genuine login | G1: persisted authenticated action; cross-tenant/principal denial. If broken, stop breadth |
| R4–R8 | A02/A03 consent/outbox/CRM; B02 portal | G2: browser withdrawal causes actual target mutation/readback; no in-memory substitute |
| R8–R14 | A04/A05 enforcement and evidence; first A06 regression increment; B03/B04 live views | G3 checkpoint: core story, failure, stale replay and first real regression detection integrated; not final acceptance |
| R14–R20 | Committed checkpoint; protected rest/handoff block | No assumption of unsupervised AI writes or a human working 36 hours continuously |
| R20–R25 | Remaining A06 recovery/isolation/egress tests and fixes; B04 browser integration | G4: repair critical findings. P1 only if G3 is green and does not consume test reserve |
| R25–R28 | A07 reproducible package; B06 UI error/polish fixes | Feature freeze at R28; record exact candidate commit and actual scope |
| R28–R32 | Frozen-candidate clean start and full scoped acceptance | G5: commands, results, exclusions and known issues match candidate |
| R32–R34 | Two rehearsals; actual recording/evidence export | Website explanatory page only after core and only with separate deployment approval |
| R34–R36 | Contingency and leadership handover | G6: human signs internal-demo readiness; never substitute a fresh untested build |

The target is aggressive. If a gate slips, stop adding features; use the task graph to focus both coding lanes on the critical path without concurrent ownership of the same files. A safe partial demo may show only the passing slice and openly state limitations, but must not be labelled the completed outcome prototype while P0 gates remain unmet.

## 7. Scope cuts and blockers

Cut in order: animated graph/polish → optional help → extra case types → commercial/licence preview → website work. Retain real auth/scoping, durable consent, actual CRM effect, current-boundary blocking, truthful verification/unknown handling, local evidence and a real regression assertion.

Do not waive tenant/principal leakage, false verification, lost accepted requests, unsafe target access, bypass of the claimed boundary, unrepeatable startup or unexplained external data traffic to hit the date. Isolate and fix. Do not say a feature is tested because its UI renders.

## 8. Completion and handover

The final handover contains the reviewed source commit, exact dependency lockfile, actual local deployment instructions, migrations, generated-credential bootstrap, synthetic seed/reset safeguards, candidate build manifest, executed acceptance evidence, limitations/support matrix, actual demo recording and local evidence export. Development signing/checksums are labelled as such and do not imply production release trust.

Promotion to a customer pilot/production remains subject to the full master release/security/legal/deployment gates. This prototype is a foundation to extend, not a separate throwaway system or a production-readiness certificate.
