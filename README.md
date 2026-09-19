# ORVIA

### Customer-Controlled Privacy Control Platform

> **Working ORVIA Version 1 prototype**, demonstrating a complete privacy-control lifecycle end to end on synthetic data. This is a real, running application — not a mock-up, and not the production release.

---

## 1. What is ORVIA?

ORVIA is being developed as a unified privacy-control platform that connects privacy
decisions and policies to **real operational controls**, downstream system actions,
verification, evidence and regression testing.

Most privacy tooling stops at the record. It can tell you that *"this person withdrew
consent."* ORVIA is designed to answer the harder questions that follow:

| Question | Where ORVIA answers it |
|---|---|
| What privacy decision applies? | Consent event, epoch and immutable receipt |
| What purpose does it apply to? | Versioned privacy purpose |
| What policy governs it? | Immutable published policy version |
| What operational action is required? | Action plan produced by a durable workflow |
| Was the action executed? | Signed agent command and its receipt |
| Did the downstream system actually reach the required state? | Independent scoped read of the target |
| Can that fact be independently verified? | Observation, recorded separately from the acknowledgement |
| What evidence exists? | Local evidence export with explicit coverage limits |
| Would the control still work if tested again? | Privacy regression run in the Test Lab |

ORVIA makes no legal or compliance claim. It records what was decided, what was done,
what was observed, and what remains unresolved.

---

## 2. Quick Start

**One command.** From a configured checkout:

```bash
npm start
```

That brings up the complete stack — Docker services, schema, machine enrollment,
production build, web, worker and connector agent — and holds the foreground until you
press `Ctrl+C`.

| | |
|---|---|
| **Workspace** | `https://127.0.0.1:4330/workspace` |
| **Privacy Centre** | `https://127.0.0.1:4330/privacy` |

```bash
npm stop        # stop the application and the backing services, keeping all data
npm run status  # what is actually running, with no secrets
npm run setup   # explicit one-time installation (npm start does this automatically on a fresh machine)
```

**Credentials.** Sign-in credentials, TLS material and machine tokens are generated
locally during setup and stay in the protected, git-ignored `.local/profiles/rehearsal`
directory. No command in this repository prints them, and they must never be committed
or shared. The operator reads them locally from the protected profile; see
[A07 package instructions](docs/engineering/A07-PACKAGE.md).

**The local certificate is a private, one-use CA.** Trusting it in a browser is a
deliberate, reversible human decision, documented in the operator guidance. Never click
through a certificate warning and never start a browser with certificate checking
disabled.

<details>
<summary><strong>Prerequisites</strong></summary>

The tested host is **Windows x64** with:

- **Docker Desktop** (Linux containers) — PostgreSQL, Temporal, OPA and the loopback relay run as digest-pinned containers
- **Git**
- Ports `4330`, `55433`, `58183`, `57235` free

Node **24.21.0** and pnpm **12.4.2** are pinned by the repository and provisioned into
`.local/tools` by the bootstrap step, which `npm run setup` invokes. `npm start` re-launches
itself under that pinned toolchain and refuses to run on a mismatched system Node.

Linux and macOS are **not** claimed or tested. First-run setup is a PowerShell script.
</details>

---

## 3. What this repository is

This repository contains the **working ORVIA prototype**. It is the foundation intended
to grow into the full product — not disposable prototype code. Future Version 1 modules
and later product development are expected to extend this same codebase; a large rewrite
needs architectural justification, not preference.

```
Prototype today
   -> accepted baseline
      -> expanded ORVIA Version 1
         -> production hardening
            -> enterprise capabilities
               -> later Version 2 AI
```

---

## 4. Prototype objective — one complete vertical slice

The prototype proves **one privacy-control path, end to end, with nothing faked in the
middle**. This is the main live demonstration:

```
                     Data Principal
                           |
              Promotional Marketing Purpose
                           |
                   Notice  +  Consent
                           |
                     Policy Decision
                           |
                  Consent Withdrawal
                           |
                   Durable Workflow
                           |
              Downstream CRM Restriction
                           |
                 Independent Readback
                           |
          Verification  /  Unresolved State
                           |
                        Evidence
                           |
            Current Processing Enforcement
                           |
              Privacy Regression Testing
```

Every arrow in that chain is executed by real code against a real database, a real
durable workflow engine and a real (synthetic) target system.

---

## 5. What the prototype actually does

Only implemented behaviour is listed. Depth and limits are recorded per module in
[`tracking/capabilities.json`](tracking/capabilities.json).

| Capability | Prototype behaviour |
|---|---|
| Authentication | Real library-backed staff and data-principal sessions, in separate identity domains |
| MFA | Enforced for privileged staff; rate limits are real and are never disabled for tests |
| Tenant isolation | Tenant / legal entity / environment scoping by explicit predicates and row-level security, proven by cross-tenant and sibling-environment denial |
| Purposes | Versioned privacy purposes, each decided on its own authority |
| Notices | Immutable published notice versions with content digest, referenced by exact version at the moment of consent |
| Policy | Deterministic versioned policies evaluated in OPA; separate administrative and processing namespaces; fails closed on policy outage |
| Policy approval | The author of a version cannot publish it; a distinct reviewer re-authenticates to approve that exact version |
| Consent | Grant, withdraw, history, monotonic epoch, immutable receipts, replay and freshness safety at consumption |
| Workflow | Transactional outbox plus a durable Temporal workflow that survives worker and application restart |
| CRM control | A locally signed, scope-bound agent command restricts marketing membership in a synthetic downstream CRM |
| Verification | Independent scoped readback recording method, observed generation, freshness and scope — kept separate from the execution receipt |
| Enforcement | Send-admission control evaluates a queued marketing attempt against *current* authority and blocks it |
| Uncertainty | `EFFECT_UNKNOWN` outcomes are retained, with a separate reconciliation attempt and a read before any further action |
| Manual work | A system with no API becomes an attributed, version-safe manual obligation, recorded as a statement and never as an observation |
| Evidence | Workflow / action / observation timeline with an authenticated local JSON export carrying an integrity digest and explicit gaps |
| Failure Centre | Unresolved, manual, unknown and failed states surfaced as deliberately overlapping counts that are never summed into a score |
| Test Lab | Healthy, deliberately broken, repaired and interrupted regression runs, each with real assertions |
| Recovery | Worker and application restart continuity, and target-only quarantine and reconciliation of a restored stale copy |
| Privacy Centre | Principal-facing view of own choices, notice, receipts and history, with grant and withdrawal |
| Staff Workspace | Operational privacy-control interface over the whole lifecycle |

---

## 6. Why the prototype is technically real

This is not a static dashboard with seeded JSON. A privacy decision travels through an
actual distributed control path:

```
Browser UI  (Next.js / React)
     |
Generated TypeScript contract / client
     |
Authenticated server API
     |
Domain / policy logic  (OPA decisions)
     |
PostgreSQL  (row-level security, transactional outbox)
     |
Temporal workflow  (durable, restart-safe)
     |
Restricted signed agent  (scope-bound commands)
     |
Synthetic target  (isolated CRM database)
     |
Independent observation  (separate scoped read)
     |
Evidence  ->  UI
```

Contracts are generated, not hand-written, so the browser client and the server cannot
silently disagree. Services run as digest-pinned containers on an internal Docker
network behind fixed loopback relays. The browser suite runs under Playwright over
ordinary trusted HTTPS with no certificate bypass.

---

## 7. The core ORVIA principle

> ### An acknowledgement is not verification.

```
         Action status    !=    Independent observation
```

ORVIA never assumes that

```
   API returned 200   =   privacy obligation completed
```

An acknowledgement only tells you what a system *said*. So the prototype keeps three
different things apart, and shows all three:

- **`ACKNOWLEDGED`** — the target replied. That is all it means.
- **`EFFECT_UNKNOWN`** — the reply was lost or ambiguous. The outcome stays unknown. A separate reconciliation attempt is recorded, and the system is read before any further action is taken.
- **`OBSERVED_SATISFIED`** — ORVIA performed its own scoped read of the target afterwards and saw the required state, recording the method, the observed generation, the freshness and the scope.

Where no supported read exists, the state is `UNVERIFIABLE` and stays visible as an
unresolved obligation. Nothing is quietly upgraded to "verified", and nothing is summed
into a single reassuring compliance score.

---

## 8. Example end-to-end flow (synthetic data)

1. A fictional Data Principal in a synthetic organisation has granted promotional-marketing consent against an exact notice version.
2. They withdraw that consent in the **Privacy Centre**. Withdrawal never requires accepting a new notice.
3. ORVIA records the withdrawal, raises the consent epoch and issues an immutable receipt — the choice, its event and the follow-up work are committed together.
4. A **durable workflow** starts and produces an action plan.
5. A **restricted, signed agent command** updates the synthetic CRM's marketing state, scoped to exactly that principal, purpose and environment.
6. ORVIA then performs an **independent scoped read** of that CRM.
7. If the required restriction is present, ORVIA records an observation — separately from the acknowledgement it already had.
8. A queued marketing attempt is evaluated at the send boundary against **current** authority and is blocked. No simulated send is admitted.
9. The **evidence export** shows the privacy decision, the governing policy version, the action, the observation and the remaining limitations, including anything still unresolved.
10. In the **Test Lab**, the control can then be deliberately broken. The regression run detects it, keeps a real `FAIL`, and passes again only once the healthy fixture is restored.

A marketing withdrawal is a **purpose restriction**. It is not erasure, and this
prototype never describes it as one.

---

## 9. Prototype versus full ORVIA

The approved ORVIA master contains **218 numbered sections**. The prototype implements
one vertical slice of that product.

A reproducible, section-by-section mapping — with the classification rules, the evidence
for each row, and the percentage methodology stated explicitly — is published in
**[`docs/prototype/FULL_ORVIA_COVERAGE.md`](docs/prototype/FULL_ORVIA_COVERAGE.md)**.

Read that document rather than inferring coverage from this summary. Two figures there
are deliberately kept apart, because they mean very different things:

- **Prototype coverage of master sections** — how much of the written master the prototype touches at CORE / LIGHT / SANDBOX depth.
- **ORVIA product completion** — *not* claimed anywhere in this repository.

**The prototype covers parts of:** identity and access · tenant isolation · privacy
control relationships (a control map, not a graph database) · purposes · notices ·
consent · policy · workflow · connector framework · verification · evidence · failure
handling · privacy testing · recovery · principal portal · operational UI.

**Full ORVIA still contains, and this prototype does not build:** complete Privacy
Control Graph and estate discovery · explicit data categories · Data Principal Rights /
DSR orchestration · retention and deletion · processor and vendor management · privacy
incidents · broader reporting · a production connector catalogue · enterprise identity
and SSO · licensing and entitlements · editions · installer and update lifecycle ·
support and diagnostics · production backup and disaster recovery · customer cloud
deployment · high availability · restricted and air-gapped enterprise deployment ·
production security hardening · and the Version 2 AI capabilities.

---

## 10. What this prototype proves

- A privacy decision can be **captured** — affirmatively, against an exact notice version, with an immutable receipt.
- A deterministic policy can **evaluate** it — versioned, reviewed by someone other than its author, and failing closed.
- A durable workflow can **translate it into action** — surviving worker and application restart without losing or repeating the request.
- A downstream system can be **changed** — by a scope-bound, signed command from a restricted agent.
- The result can be **independently checked** — by ORVIA's own read of that system, recorded separately from what the system claimed.
- Failures and uncertainty can **stay visible** — unknown, failed, manual and unverifiable states are surfaced, not smoothed away.
- Evidence can be **preserved** — exported locally, authenticated, and honest about its own gaps.
- The control can be **regression-tested** — a deliberately broken control is detected and keeps its real failure.

## 11. What it does not yet prove

- Full ORVIA module coverage — most of the 218 master sections are future work.
- Production-scale connectors — targets here are synthetic; there is no commercial vendor integration.
- Production high availability, or full disaster recovery — restoration here is target-only quarantine and reconciliation, not control-plane recovery.
- Enterprise deployment — no SSO, fleet management, customer-cloud deployment or air-gapped installer.
- Legal or regulatory certification of any kind.
- Commercial licensing, entitlements or editions.
- Version 2 AI. This build contains **no model, no hosted model API, no embeddings and no training**.

---

## 12. Current prototype status

These are two different facts and are deliberately not merged:

| | |
|---|---|
| **Engineering implementation** | A working prototype. The full backend, worker, agent, Staff Workspace and Privacy Centre are built and exercised by executing test suites. |
| **Formal prototype acceptance** | **Not complete.** Canonical acceptance tests remain `NOT_RUN`, and two human rehearsals plus outstanding human acceptance decisions are open. |

The authoritative, dated record — the frozen candidate, what executed against it, what
failed and what gates remain — is **[`CURRENT_STATE.md`](CURRENT_STATE.md)**. Treat it,
not this README, as the source of truth for status.

---

## 13. Privacy and deployment model

The prototype runs in the `CUSTOMER_LOCAL_SYNTHETIC` profile:

- **Synthetic data only.** Two fictional organisations and fictional principals. No production customer personal data is required or used.
- **Local, customer-controlled runtime.** Everything runs on the operator's machine behind loopback relays.
- **No hosted AI runtime**, no external analytics, no vendor telemetry, and no vendor operational-data dependency.
- **Local evidence.** Exports are written locally and are readable by the operator.
- A conservative Content-Security-Policy sets every fetching directive to `'self'`, so the "no remote script, font, analytics or model" claim is enforced by the browser rather than only asserted.

**Intended product direction.** ORVIA is intended to be distributed and licensed by the
vendor but **deployed inside the customer's own environment or customer-controlled
cloud**, with operational customer data remaining there. The prototype demonstrates that
boundary; it does not make the prototype itself production-ready.

---

## 14. Architecture

```
  +---------------------------------------------------------------+
  |                    ORVIA Web Application                      |
  |         Staff Workspace            Privacy Centre             |
  +-------------------------------+-------------------------------+
                                  |
                      Generated API Contracts
                                  |
          +-----------------------+-----------------------+
          |            ORVIA Application Server           |
          |   Auth / Consent / Policy / Workflow / Evidence|
          +------+----------------+----------------+------+
                 |                |                |
            PostgreSQL        Temporal            OPA
                 |                |
                 +--------+-------+
                          |
                  Restricted Agent
                          |
                  Synthetic Targets
                          |
                  Independent Read
                          |
                      Evidence
```

---

## 15. Screens

**Staff Workspace** — the operational privacy-control interface.

| Screen | Purpose |
|---|---|
| Overview | Live counts from the database, including unknown, failed, manual and unobservable items |
| Configuration | Purposes, notices, systems and policy versions, with distinct-reviewer publication |
| Principals | Scoped synthetic data principals and their consent state |
| Control Map | Registered systems and explicit principal-to-target control relationships |
| Policy Preview | Evaluate a policy version — explicitly labelled as *not* an admission decision |
| Workflows | Withdrawal workflows, action plans, acknowledgements and observations |
| Failure Centre | Unresolved, manual, unknown and failed obligations |
| Evidence | Evidence records and authenticated local export |
| Test Lab | Privacy regression runs, read by exact run identifier |
| Capabilities | The live capability register — every module with its target depth and its actual status |

**Privacy Centre** — the data principal's own view: current choices, the exact notice
version they accepted, their receipts and history, and grant/withdraw actions. A
principal cannot reach the Workspace and sees no other principal, staff identifier or
workflow internal.

---

## 16. Testing

```bash
npm test            # unit tests
npm run typecheck
npm run lint
```

<details>
<summary><strong>Backend, security and integration suites</strong></summary>

Each of these runs against the live rehearsal profile and records an evidence artifact.

```bash
npm run contracts:check     # generated contracts match the committed source of truth
npm run test:auth           # authentication, MFA, roles, tenant isolation
npm run test:consent        # grant, withdraw, receipts, epoch and replay safety
npm run test:expiry         # freshness and expiry enforced at consumption
npm run test:workflows      # durable withdrawal workflow, agent execution, observation
npm run test:enforcement    # send-admission control against current authority
npm run test:evidence       # evidence timeline and authenticated export
npm run test:regression     # healthy / broken / repaired / interrupted privacy regression
npm run test:lifecycle      # application supervisor lifecycle
npm run test:tls            # local HTTPS identity, wrong CA and wrong hostname negatives
npm run test:network        # runtime egress qualification
npm run preflight           # recorded PostgreSQL / Temporal / OPA service report
npm run hygiene:check       # no local credential, key or ignored file became a candidate
```

The complete browser qualification runs under the established Playwright harness in
`tests/e2e/` over ordinary trusted HTTPS, with no certificate-ignore flag.
</details>

---

## 17. Repository structure

```
apps/
  web/            Staff Workspace + Privacy Centre (Next.js App Router; thin route
                   adapters only — request handling lives in packages/backend)
                    src/app/            Routes, layouts; app/api/**/route.ts call @orvia/backend
                    src/components/screens/  Full-page screen content (one file per screen area)
                    src/components/shared/   Generic UI kit, API/query hooks, session context, nav shell
  worker/         Durable Temporal workflow execution
  agent/          Restricted, signed target execution
  demo-targets/   Synthetic CRM target schema

packages/
  auth/           Sessions, MFA, machine identity and enrollment
  authz/          Capability checks against OPA decisions
  backend/        Backend request handlers for apps/web's API routes (business rules,
                   machine/service auth boundary, session, admin, HTTP/audit wrapper).
                   src/synthetic/ holds the synthetic demo CRM's own route handler and
                   its TargetObserver adapter — isolated so a real connector's adapter
                   can be added there later without touching privacy-control's logic.
  contracts/      Generated API contracts and shared types
  db/             Schema, migrations and row-level security
  domain/         Business logic, one sub-module per domain concern:
                    src/shared/         Cross-cutting primitives (transactional outbox, workflow-completion semantics)
                    src/consent/        Grant, withdraw, receipts, epoch
                    src/configuration/  Purposes, notices, systems, policy publication
                    src/workflow/       Durable withdrawal workflow and signed action delivery
                    src/evidence/       Evidence timeline, failures, capabilities, reconciliation
                    src/test-runs/      Test Lab / privacy regression runs
                  Future domain modules (DSR, retention, processors, incidents, ...) get
                  their own sibling folder under src/ — never merged into an existing
                  module's folder. Policy/control evaluation is its own bounded package,
                  packages/privacy-control/, not a domain sub-module (see below).
  privacy-control/  Policy and control evaluation — policy preview and send-admission
                   control (moved out of packages/domain/src/processing/ 2026-09-19 as
                   the first bounded feature module). Depends only on a TargetObserver
                   adapter contract for independent target reads, never on a specific
                   connector; packages/backend/src/synthetic/ supplies today's (synthetic)
                   implementation of that adapter.
  connectors/     Target adapters, one sub-module per connector:
                    src/shared/         Cross-connector primitives (scoped target transaction)
                    src/crm-synthetic/  The synthetic demo CRM connector (Test Lab / regression target)
                  A real connector gets its own sibling folder under src/, e.g. src/<system-name>/.
  policy-sdk/     Policy decision client
  testing/        Profiles, evidence recording and safe error reporting

policy/           OPA policies (bootstrap, admin authorization, processing decision)
scripts/          Local operation, lifecycle, packaging and qualification commands
tests/            unit / integration / security / e2e (Playwright)
docs/             Architecture, prototype, engineering, review and operator docs
tracking/         Capability, task and acceptance state
infrastructure/   Docker Compose definition, digest-pinned
```

---

## 18. Roadmap

Everything below is **roadmap, not implemented**, and is derived from the approved
master and the capability register — not invented here. See
[`docs/prototype/FULL_ORVIA_COVERAGE.md`](docs/prototype/FULL_ORVIA_COVERAGE.md) for the
section-level detail.

**Privacy domain expansion** — complete Privacy Control Graph and discovery · explicit
data categories · Data Principal Rights and DSR orchestration · retention and deletion ·
processor and vendor management · privacy incidents · broader reporting.

**Connector ecosystem** — a production connector catalogue, connector conformance and a
privacy SDK for in-application control points.

**Enterprise** — enterprise identity and SSO · customer-controlled cloud and fleet
deployment · high availability · backup and disaster recovery · advanced administration ·
restricted and air-gapped deployment.

**Commercial / platform** — licensing · entitlements · editions · update lifecycle ·
support and diagnostics.

**Version 2** — the approved AI capabilities, including the AI Privacy Copilot. None of
them is present in this build, and Version 1 has no model service dependency.

---

## 19. Security and scope disclaimer

**This repository currently represents a working synthetic prototype, not a
production-certified release.**

It is **not** claimed to be, and must not be described as:

- DPDPA-, GDPR- or otherwise legally compliant or certified
- production penetration-tested or security-certified
- enterprise production-ready
- proven against real customer personal data

All data is synthetic. All targets are local and synthetic. Scan results are scan
results, not a penetration test. An evidence digest detects change against a trusted
reference copy; it is not a legal certificate. Permitted and forbidden wording for every
demonstrable claim is held in
[`docs/demo/CLAIMS_REGISTER.md`](docs/demo/CLAIMS_REGISTER.md).

---

## 20. Further reading

| Document | What it holds |
|---|---|
| [`CURRENT_STATE.md`](CURRENT_STATE.md) | Authoritative current candidate, evidence and open gates |
| [`docs/prototype/FULL_ORVIA_COVERAGE.md`](docs/prototype/FULL_ORVIA_COVERAGE.md) | 218-section master coverage mapping and methodology |
| [`docs/engineering/A07-PACKAGE.md`](docs/engineering/A07-PACKAGE.md) | Engineering setup, lifecycle and packaging commands |
| [`docs/demo/CLAIMS_REGISTER.md`](docs/demo/CLAIMS_REGISTER.md) | What may and may not be claimed, and the required limitations |
| [`tracking/capabilities.json`](tracking/capabilities.json) | Live capability register: every module, its target depth and its actual status |
| [`README_START_HERE.md`](README_START_HERE.md) | Sprint execution kit and source precedence |

Work owns acceptance. The human owns merges, release and final sign-off.
