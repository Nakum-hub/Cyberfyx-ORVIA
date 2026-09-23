# ORVIA prototype: full coverage of the approved master

**Writer:** Work · **Date:** 2026-09-18 · **Candidate:** `c5655eacf86a68e4aa76ae3b79a1328517c0d23d` · **Status:** dated snapshot

This document maps every one of the 218 numbered top-level sections of the approved ORVIA Version 1 master
to what this prototype actually implements, and says plainly what remains for full ORVIA. It exists so that
a reader can see the whole programme and the built slice side by side without either being overstated. It is
an engineering mapping, not an acceptance record: the canonical acceptance tests T01–T34 remain NOT_RUN and
no claim here is promoted to `EVIDENCED` under `docs/demo/CLAIMS_REGISTER.md`.

---

## How to reproduce this mapping

The approved master is `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`,
SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`.

```bash
# 1. Confirm the source identity.
sha256sum docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md

# 2. List the 218 numbered top-level sections, in order.
grep -E "^# [0-9]+\. " docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md

# 3. Confirm the count is exactly 218.
grep -cE "^# [0-9]+\. " docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md

# 4. Read the authoritative module-level status register (33 modules, M01-M33).
cat tracking/capabilities.json
```

The untracked working-tree file `ORVIA_V1_Master_with_Engineering_Breakdown(full idea).md` carries the same
218-section list with a prepended engineering breakdown. It is context only; every citation in this document
is to the approved master above.

This is a **dated snapshot taken on 2026-09-18** against the frozen candidate named in `CURRENT_STATE.md`.
It is not self-updating. If the source, the register or the code changes, this mapping must be regenerated.

---

## Methodology

### The six statuses

| Status | Definition |
|---|---|
| `DEMONSTRATED` | The section's core behaviour is built **and** exercised by a named executing suite in the customer-local synthetic profile, at CORE, LIGHT or SANDBOX depth. It never means the master module is delivered. |
| `PARTIALLY_IMPLEMENTED` | A named, bounded part of the section exists and is exercised; the rest is absent. |
| `FOUNDATION_ONLY` | Architecture or structure exists that the future capability would extend — a contract, a table, a registered system kind — but the section's own behaviour is not built. |
| `NOT_IMPLEMENTED` | Nothing is built. |
| `DEFERRED_V2` | The master assigns the section to Version 2 AI (sections 63–74 and related). |
| `NOT_APPLICABLE_TO_PROTOTYPE` | The section governs process, team, commercial, legal or deployment matters that a local synthetic prototype cannot demonstrate — for example §117 "20-PERSON ENGINEERING TEAM" or §218 "PRIMARY SOURCE REGISTER AND REVIEW LIMITS". |

Where a section was genuinely ambiguous, the weaker status was chosen.

### Sources of status

`tracking/capabilities.json` is authoritative for **module-level** status (M01–M33) and its per-module
`limitation` text is quoted or paraphrased rather than softened. Section-level statuses in the main table are
derived from that register plus direct inspection of the code, policy, scripts and tests. Every file path,
npm script name and module id cited below was checked to exist before it was written down.

### The percentages, and what they are not

The published percentage is **prototype coverage of master sections**. It is not ORVIA product completion,
not module completion, and not a compliance measure. A section counted as `DEMONSTRATED` may represent a
small bounded slice of a large master module.

Two figures are published, both from the same table.

```text
covered_sections   = DEMONSTRATED + PARTIALLY_IMPLEMENTED + FOUNDATION_ONLY

all-sections figure        = covered_sections / 218
applicable-sections figure = covered_sections / (218 - NOT_APPLICABLE_TO_PROTOTYPE)
```

`NOT_APPLICABLE_TO_PROTOTYPE` sections are **excluded from the denominator of the applicable-sections figure
only**. `DEFERRED_V2` and `NOT_IMPLEMENTED` sections stay in both denominators, because they are real
Version 1 or Version 2 scope that this prototype does not deliver. Both figures are shown together so that
neither can be quoted without the other.

---

## Results summary

| Status | Sections |
|---|---|
| `DEMONSTRATED` | 40 |
| `PARTIALLY_IMPLEMENTED` | 63 |
| `FOUNDATION_ONLY` | 16 |
| `NOT_IMPLEMENTED` | 51 |
| `DEFERRED_V2` | 14 |
| `NOT_APPLICABLE_TO_PROTOTYPE` | 34 |
| **Total** | **218** |

Covered sections (`DEMONSTRATED` + `PARTIALLY_IMPLEMENTED` + `FOUNDATION_ONLY`) = 40 + 63 + 16 = **119**.

| Figure | Calculation | Result |
|---|---|---|
| Prototype coverage of **all** master sections | 119 / 218 | **54.6 %** |
| Prototype coverage of **applicable** master sections | 119 / (218 − 34) = 119 / 184 | **64.7 %** |

Read strictly: 119 of the 218 numbered sections have some built, inspectable presence in this prototype; 40
of those have a core behaviour that an executing suite actually exercises. Nothing in these numbers says a
master module is delivered.

---

## Capability areas

### What the prototype covers parts of

Each item names the master section and, where one exists, the capability register module.

- **Identity and access** — §§6, 7, 109, 110; M01. Real staff and principal sessions, scoped roles,
  privileged MFA, server-side capability checks against OPA.
- **Tenant isolation** — §§35, 36, 127; M02. Tenant, legal entity and environment predicates plus row-level
  security, proven by cross-tenant and sibling-environment denial.
- **Privacy control graph and control relationships** — §§4, 8, 105; M03. A relational control abstraction
  with registered systems and explicit mappings; a list and detail view, not a graph database.
- **Purposes** — §§9, 170; M04. Separate purposes each decided on their own authority.
- **Notices** — §19; M12. Immutable published versions with content digest and publication time.
- **Consent** — §§16, 17, 18; M11. Affirmative purpose-specific grant against an exact notice version,
  monotonic epoch, immutable receipt, withdrawal that never requires accepting a new notice.
- **Policy** — §§13, 14, 15; M04. Separate administrative and processing namespaces in OPA, immutable
  published versions, distinct-reviewer re-authentication, fail-closed on policy outage.
- **Workflow** — §§25, 149; M05. Transactional outbox, durable Temporal worker, bounded retry and
  reconciliation surviving restart.
- **Connector framework** — §§27, 28, 30, 171; M06. Locally signed, scope-bound agent commands against three
  declared synthetic connector kinds.
- **Verification** — §44; M07. Independent scoped reads recording method, generation, freshness and scope,
  kept separate from execution receipts.
- **Evidence** — §§45, 46, 133, 169; M08, M33. Receipt, action and observation timeline with authenticated
  JSON export carrying an integrity digest and explicit coverage limits.
- **Failure handling** — §§48, 49, 208; M18. Unresolved obligations across unknown effect, failed execution,
  unsupported or manual control, and missing verification, with counts that are never summed into a score.
- **Privacy testing** — §§57, 58, 59; M09. Executable regression scenarios with real assertions: healthy
  passes, a deliberately broken control keeps its real FAIL, a repaired run passes, an interrupted run is
  recorded as ERROR.
- **Recovery** — §§43, 149; M05. Worker and application restart recovery, and target-only quarantined
  restore. Not disaster recovery.
- **Principal portal** — §§20, 33; M13. A separate principal authentication domain showing own choices,
  notice, receipts and history, with grant and withdrawal.
- **Operational UI** — §§102, 103, 104, 106, 107, 184, 185. Workspace shell, overview, control map,
  workflows, evidence, failures, test lab and policy preview.

### What full ORVIA still contains

- **Full graph and discovery** — §§4, 62, 67. No estate discovery, lineage or drift detection.
- **Explicit data categories** — §§5, 9. The "what data" dimension is not modelled.
- **Data principal rights / DSR** — §§22, 23, 24; M14. Not implemented.
- **Retention and deletion** — §§50, 51, 52, 132; M15. Not implemented.
- **Processor and vendor management** — §53; M16. Registered synthetic systems only; no vendor registry,
  contract, DPA or assessment tracking.
- **Privacy incidents** — §§54, 55, 56, 108; M17. Not implemented.
- **Broader reporting** — §§134, 195, 196. Live counts exist; reports do not.
- **Production connector catalogue** — §29; M06. Three synthetic kinds only.
- **Enterprise SSO** — §§7, 80; M01. No SSO, SCIM or directory federation.
- **Licensing and entitlements** — §§76, 77, 94, 160; M27, M28. Not implemented.
- **Editions** — §§78, 79, 80, 81, 144, 145; M28. The register's `edition_entitlement` field is a plan
  reference, not an enforced entitlement.
- **Installer and update lifecycle** — §§85, 93, 146; M31. Not implemented.
- **Support and diagnostics** — §§95, 96; M30. Not implemented.
- **Production backup and disaster recovery** — §§91, 92. Not implemented.
- **Customer cloud deployment** — §§34, 86, 87, 194, 202. Outside the local synthetic profile.
- **High availability** — §§130, 131. Outside the local synthetic profile.
- **Restricted and air-gapped deployment** — §§32, 33. The tested interval showed no unapproved egress; that
  is not an air-gapped installer.
- **Production security hardening** — §§163, 164, 206. NOT_ASSESSED and governed separately by the master.
- **Version 2 AI** — §§63–74, 112, 113, 205; M19–M25. Deferred in full.

---

## The 218 sections

Columns: section number; master section title; status; the depth actually implemented; evidence paths, npm
script names, browser specs or module ids; and what remains for full ORVIA.

Suite names in the evidence column are npm scripts defined in `package.json` (for example `test:consent` runs
`tests/integration/consent/consent.test.ts`). Browser specs live under `tests/e2e/`.

### Sections 1–40

| # | Master section | Status | Implemented depth | Evidence / source | Remaining for full ORVIA |
|---|---|---|---|---|---|
| 1 | PURPOSE OF THIS DOCUMENT | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`; `docs/prototype/SOURCE_ALIGNMENT.md` | Document governance; nothing to build |
| 2 | PRODUCT DEFINITION | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/prototype/CONTRACT.md` | Definitional statement |
| 3 | CORE PRODUCT PRINCIPLE | PARTIALLY_IMPLEMENTED | One slice, SANDBOX | `backend/domain/src/processing.ts`; `backend/domain/src/evidence.ts`; `test:workflows` | DISCOVER and IMPROVE stages of the loop |
| 4 | THE CENTRAL SYSTEM: PRIVACY CONTROL GRAPH | PARTIALLY_IMPLEMENTED | LIGHT (M03) | `backend/domain/src/configuration.ts` `controlMap`; `frontend/src/app/workspace/control-map/page.tsx` | Graph store, estate discovery, lineage, data categories |
| 5 | CORE DOMAIN MODEL | PARTIALLY_IMPLEMENTED | CORE subset | `database/customer/migrations/0004_configuration_consent.sql`; `test:consent` | Data categories, vendors, incidents, rights, retention entities |
| 6 | USER ROLES | PARTIALLY_IMPLEMENTED | Demo role subset | `policy/admin/authorization.rego`; `scripts/roles-init.ts` | DPO, legal, support and vendor roles; role administration |
| 7 | ROLE-BASED ACCESS CONTROL | DEMONSTRATED | CORE (M01) | `policy/admin/authorization.rego`; `test:auth`; `tests/e2e/auth.spec.ts` | Full capability catalogue, delegation, enterprise SSO |
| 8 | PRIVACY CONTROL GRAPH RELATIONSHIP | PARTIALLY_IMPLEMENTED | LIGHT (M03) | `backend/domain/src/configuration.ts` `createMapping`; `test:evidence` | Data-category and vendor edges; traversal UI |
| 9 | DATA PROCESSING MODEL | PARTIALLY_IMPLEMENTED | SANDBOX | `backend/domain/src/processing.ts` (`processing_decisions`) | The "what data" dimension is not modelled |
| 10 | MODULE ARCHITECTURE | PARTIALLY_IMPLEMENTED | Register plus 13 modules at some depth | `tracking/capabilities.json`; `tests/unit/capabilities.test.ts` | 20 modules unbuilt or deferred |
| 11 | SERVICE ARCHITECTURE | PARTIALLY_IMPLEMENTED | Four local apps | `frontend`, `services/worker`, `services/agent`, `services/synthetic-target`; `infrastructure/compose.yaml` | Services for unbuilt modules; gateway; scaling |
| 12 | RECOMMENDED TECHNOLOGY STACK | PARTIALLY_IMPLEMENTED | As built | `package.json`; `infrastructure/compose.yaml` (PostgreSQL, OPA, Temporal, Next/TypeScript) | Object store, message bus, Kubernetes, managed cloud |
| 13 | POLICY ENGINE | DEMONSTRATED | CORE (M04) | `policy/processing/decision.rego`; `policy/admin/authorization.rego`; `test:enforcement` | Arbitrary policy authoring; only fixed condition forms exist |
| 14 | POLICY VERSIONING | DEMONSTRATED | CORE (M04) | `backend/domain/src/configuration.ts` `publishPolicy`; `database/customer/migrations/0005_publication_trigger.sql`; `test:consent` | Schema-version negotiation and version migration |
| 15 | POLICY LIFECYCLE | PARTIALLY_IMPLEMENTED | Draft to published only | `backend/domain/src/configuration.ts` `recordPublicationProof`; `tests/e2e/configuration.spec.ts` | Deprecation, archive, rollback, scheduled activation |
| 16 | CONSENT MANAGEMENT | DEMONSTRATED | CORE (M11) | `backend/domain/src/consent.ts`; `test:consent`; `tests/e2e/consent.spec.ts` | Multiple collection channels; wider purpose families |
| 17 | CONSENT WITHDRAWAL | DEMONSTRATED | CORE (M11) | `backend/domain/src/consent.ts` `changeConsent`; `services/worker/src/withdrawal-workflows.ts`; `test:consent` | Withdrawal beyond the two synthetic purpose fixtures |
| 18 | CONSENT PROPAGATION | DEMONSTRATED | SANDBOX (M05/M06) | `backend/domain/src/workflow.ts`; `services/agent/src/execute.ts`; `test:workflows` | Propagation limited to three declared synthetic targets |
| 19 | NOTICE MANAGEMENT | PARTIALLY_IMPLEMENTED | LIGHT (M12) | `backend/domain/src/configuration.ts`; `test:consent` | Translation, delivery management, version diffing |
| 20 | DATA PRINCIPAL PORTAL | PARTIALLY_IMPLEMENTED | CORE subset (M13) | `frontend/src/app/privacy/page.tsx`; `test:consent`; `tests/e2e/consent.spec.ts` | Access, correction, erasure and grievance journeys; branding |
| 21 | CROSS-COMPANY DATA PRINCIPAL NETWORK | NOT_IMPLEMENTED | — | — | Whole capability; the master defers it beyond Version 1 |
| 22 | RIGHTS MANAGEMENT ENGINE | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M14 | The whole rights/DSR engine |
| 23 | IDENTITY MATCHING | FOUNDATION_ONLY | Exact principal reference only | `backend/domain/src/consent.ts`; `database/customer/migrations/0004_configuration_consent.sql` | Fuzzy and assisted matching with human review |
| 24 | RIGHTS REQUEST STATES | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M14 | The request state machine |
| 25 | WORKFLOW ENGINE | DEMONSTRATED | CORE (M05) | `services/worker/src/withdrawal-workflows.ts`; `test:workflows`; `test:lifecycle` | One workflow family; no workflow designer |
| 26 | HUMAN-IN-THE-LOOP SUPPORT | PARTIALLY_IMPLEMENTED | Manual task plus distinct-reviewer publish | `backend/domain/src/evidence.ts` `attest`; `scripts/assign-manual.ts`; `test:evidence` | Approval gates for destructive actions; queues; escalation |
| 27 | CONNECTOR FRAMEWORK | DEMONSTRATED | SANDBOX (M06) | `services/agent/src/execute.ts`; `connectors/src/target-db.ts`; `test:workflows` | Real vendor connectors; a connector SDK |
| 28 | CONNECTOR CAPABILITY DECLARATION | DEMONSTRATED | SANDBOX (M06) | `database/customer/migrations/0012_effective_read_capability.sql`; `backend/domain/src/evidence.ts` `capabilities` | Full capability schema (discovery, search, delete) |
| 29 | INITIAL CONNECTORS | FOUNDATION_ONLY | Three synthetic kinds registered | `connectors/src/simulator.ts`; `services/synthetic-target/src/sender.ts` | Every production connector in the master's starting list |
| 30 | CONNECTOR AGENT | DEMONSTRATED | SANDBOX (M06) | `services/agent/src/execute.ts`; `shared/contracts/src/crypto.ts` (Ed25519); `test:workflows` | Production agent packaging and enrolment lifecycle |
| 31 | CUSTOMER DATA BOUNDARY | PARTIALLY_IMPLEMENTED | Runtime is wholly customer-local | `docs/decisions/ADR-001-prototype-profile.md`; `scripts/network-qualification.ts`; `test:network` | No vendor plane exists against which to classify metadata |
| 32 | PRIVACY-PRESERVING EXECUTION MODEL | DEMONSTRATED | SANDBOX | `scripts/network-qualification.ts`; `infrastructure/egress-canary.mjs`; `test:network` | Covers the tested interval only; not an air-gapped installer |
| 33 | PORTAL DATA BOUNDARY | PARTIALLY_IMPLEMENTED | Local portal, no third-party assets | `frontend/src/app/privacy/layout.tsx`; `frontend/src/server/http.ts` (CSP) | Public ingress or segregated portal tier; attachments |
| 34 | CLOUD ARCHITECTURE | NOT_APPLICABLE_TO_PROTOTYPE | — | `infrastructure/compose.yaml` | Deployment topology a local prototype cannot demonstrate |
| 35 | MULTI-TENANCY | DEMONSTRATED | CORE (M02) | `backend/domain/src/transaction.ts` `predicate`; `database/customer/migrations/0001_auth_scope.sql`; `test:auth` | Two synthetic organisations; no tenant lifecycle administration |
| 36 | DATABASE SECURITY | DEMONSTRATED | CORE (M02) | `database/customer/migrations/0001_auth_scope.sql` (RLS); `database/customer/src/runtime.ts`; `test:auth` | Production hardening, credential rotation, database auditing |
| 37 | SECRETS MANAGEMENT | PARTIALLY_IMPLEMENTED | Local private files with restricted ACLs | `scripts/local-private.ts`; `scripts/local-hygiene.mjs` | Vault or KMS-backed secret store; rotation |
| 38 | ENCRYPTION | PARTIALLY_IMPLEMENTED | TLS in transit | `scripts/tls-init.ts`; `tests/security/tls.test.ts` (`test:tls`) | Application at-rest and field-level encryption |
| 39 | KEY MANAGEMENT | FOUNDATION_ONLY | Local Ed25519 agent signing key | `scripts/machine-init.ts`; `shared/contracts/src/crypto.ts` | KMS, customer-managed keys, rotation, escrow |
| 40 | PRIVACY FIREWALL / CONTROL POINT | DEMONSTRATED | SANDBOX (M04) | `backend/domain/src/processing.ts` `admitSend`; `policy/processing/decision.rego`; `test:enforcement` | MASK and RESTRICT outcomes; more than one boundary |

### Sections 41–80

| # | Master section | Status | Implemented depth | Evidence / source | Remaining for full ORVIA |
|---|---|---|---|---|---|
| 41 | PRIVACY SDK | FOUNDATION_ONLY | Internal policy client only | `backend/policy-sdk/src/index.ts` | Published Node and Python SDKs and middleware |
| 42 | LOCAL POLICY CACHE | NOT_IMPLEMENTED | Decisions are always evaluated live | `backend/policy-sdk/src/index.ts` | Cache, expiry, staleness and refresh rules |
| 43 | OFFLINE / DEGRADED OPERATION | PARTIALLY_IMPLEMENTED | Fails closed on policy outage | `backend/policy-sdk/src/index.ts`; `test:enforcement` (INDETERMINATE on OPA outage) | Licence-grace modes and the wider degraded-mode matrix |
| 44 | VERIFICATION ENGINE | DEMONSTRATED | SANDBOX (M07) | `backend/domain/src/workflow.ts` `observeAction`; `backend/domain/src/completion.ts`; `test:evidence` | Verification only where a scoped read exists |
| 45 | EVIDENCE ENGINE | DEMONSTRATED | CORE (M08) | `backend/domain/src/evidence.ts`; `scripts/evidence-export.ts`; `test:evidence` | Evidence chains for operations beyond withdrawal |
| 46 | AUDIT TRAIL | DEMONSTRATED | LIGHT (M33) | `backend/domain/src/transaction.ts` `audit`; `database/customer/migrations/0003_request_audit.sql`; `test:auth` | Audit administration UI, retention, scheduled export |
| 47 | EVIDENCE INTEGRITY | PARTIALLY_IMPLEMENTED | Export digest against a trusted reference | `backend/domain/src/evidence.ts`; `scripts/evidence-export.ts`; `test:evidence` | Hash chaining, signing, external notarisation |
| 48 | PRIVACY FAILURE CENTER | DEMONSTRATED | CORE (M18) | `backend/domain/src/evidence.ts` `failures`; `frontend/src/app/workspace/failures/page.tsx`; `tests/e2e/workflow.spec.ts` | Bounded lookup (F-07); no estate-wide failure view |
| 49 | COVERAGE MAP | PARTIALLY_IMPLEMENTED | Capability and unresolved-obligation counts | `backend/domain/src/evidence.ts` `capabilities`; `frontend/src/app/workspace/capabilities/page.tsx` | Per-operation matrix across discovery, search, delete |
| 50 | RETENTION ENGINE | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M15 | Schedules, holds, policy-driven execution |
| 51 | DELETION ENGINE | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M15 | The whole deletion pipeline |
| 52 | CRYPTOGRAPHIC DELETION | NOT_IMPLEMENTED | — | — | Key-destruction based deletion |
| 53 | PROCESSOR/VENDOR MANAGEMENT | FOUNDATION_ONLY | Registered synthetic systems only (M16 `PARTIAL_SANDBOX`) | `backend/domain/src/configuration.ts` systems and mappings; `test:evidence` | Vendor registry, contracts, DPAs, assessments |
| 54 | PRIVACY INCIDENT EXPLORER | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M17 | Intake, triage, investigation, notification |
| 55 | INCIDENT SEVERITY | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M17 | Configurable severity model |
| 56 | NOTIFICATION SUPPORT | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M17 | Regulator and principal notification drafting |
| 57 | PRIVACY TEST ENGINE | DEMONSTRATED | SANDBOX (M09) | `backend/domain/src/test-runs.ts`; `scripts/regression-runner.ts`; `test:regression`; `tests/e2e/test-lab.spec.ts` | Test authoring, scheduling, run history |
| 58 | SYNTHETIC TESTING | DEMONSTRATED | SANDBOX (M09) | `scripts/demo-fixture.ts`; `tests/fault-fixtures/stale-sender.ts`; `test:regression` | Synthetic identity generation at scale |
| 59 | PRIVACY REGRESSION TEST | DEMONSTRATED | SANDBOX (M09) | `tests/integration/regression/regression.test.ts`; `scripts/regression-runner.ts` | A broader scenario catalogue |
| 60 | CI/CD INTEGRATION | NOT_IMPLEMENTED | No pipeline in the repository | `scripts/preflight.ts` (local checks only) | Gating privacy tests on commit or pull request |
| 61 | PRIVACY TEST SUITE | PARTIALLY_IMPLEMENTED | Consent, enforcement and verification scenarios | `tests/integration/regression/regression.test.ts`; `scripts/regression-init.ts` | Retention, deletion, rights and incident categories |
| 62 | PRIVACY DRIFT DETECTION | FOUNDATION_ONLY | Regression engine that drift checks would extend | `scripts/regression-runner.ts`; `test:regression` | New-system, changed-system and changed-policy drift detection |
| 63 | AI ARCHITECTURE | DEFERRED_V2 | — | `tracking/capabilities.json` M19–M25; `docs/demo/CLAIMS_REGISTER.md` CL-18 | Whole Version 2 AI layer |
| 64 | AI MODEL ABSTRACTION | DEFERRED_V2 | — | `tracking/capabilities.json` M19–M25 | Model gateway, routing, release lifecycle |
| 65 | AI DATA-MINIMISATION | DEFERRED_V2 | — | `docs/demo/CLAIMS_REGISTER.md` CL-18; `test:network` | No AI processing exists to minimise for |
| 66 | AI PRIVACY COPILOT | DEFERRED_V2 | — | `tracking/capabilities.json` M19 | Whole module |
| 67 | AI DISCOVERY | DEFERRED_V2 | — | `tracking/capabilities.json` M20 | Whole module |
| 68 | AI POLICY BUILDER | DEFERRED_V2 | — | `tracking/capabilities.json` M21 | Whole module |
| 69 | AI WORKFLOW BUILDER | DEFERRED_V2 | — | `tracking/capabilities.json` M22 | Whole module |
| 70 | AI FAILURE ANALYSIS | DEFERRED_V2 | — | `tracking/capabilities.json` M23 | Whole module |
| 71 | AI DRIFT ANALYSIS | DEFERRED_V2 | — | `tracking/capabilities.json` M23 | Whole module |
| 72 | AI INCIDENT ANALYSIS | DEFERRED_V2 | — | `tracking/capabilities.json` M25 | Whole module |
| 73 | AI TEST GENERATION | DEFERRED_V2 | — | `tracking/capabilities.json` M24 | Whole module |
| 74 | AI SAFETY RULES | DEFERRED_V2 | — | `tracking/capabilities.json` M19–M25 | Whole module |
| 75 | NOTIFICATION ENGINE | PARTIALLY_IMPLEMENTED | Send-admission boundary only (M10 `PARTIAL_SANDBOX`) | `backend/domain/src/processing.ts` `admitSend`; `database/customer/migrations/0007_send_admission.sql`; `test:enforcement` | Channels, templates, recipients, actual delivery |
| 76 | LICENSING AND ENTITLEMENTS | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M27, M28 | Licence issue, import, verification and entitlements |
| 77 | FEATURE FLAGS VS ENTITLEMENTS | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M28 | Entitlement checks and flag infrastructure |
| 78 | ORVIA FOUNDATION | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M28 | Edition is neither modelled nor enforced |
| 79 | ORVIA CONTROL | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M28 | Edition is neither modelled nor enforced |
| 80 | ORVIA ENTERPRISE | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M28 | Edition is neither modelled nor enforced |

### Sections 81–120

| # | Master section | Status | Implemented depth | Evidence / source | Remaining for full ORVIA |
|---|---|---|---|---|---|
| 81 | ONE CODEBASE, THREE EDITIONS | FOUNDATION_ONLY | Single codebase; non-enforcing edition field | `tracking/capabilities.json` `edition_entitlement` | Entitlement checks that actually gate features |
| 82 | WEBSITE | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/decisions/ADR-001-prototype-profile.md` (no public deployment) | Vendor commercial website |
| 83 | WEBSITE-TO-CUSTOMER JOURNEY | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/decisions/ADR-001-prototype-profile.md` | Commercial purchase journey |
| 84 | CUSTOMER ONBOARDING WIZARD | PARTIALLY_IMPLEMENTED | Command-line bootstrap (M29 `PARTIAL_SANDBOX`) | `scripts/auth-bootstrap.ts`; `scripts/auth-init.ts`; `services:smoke` | The wizard itself; the interface does not pretend one exists |
| 85 | CONNECTOR INSTALLATION | FOUNDATION_ONLY | Local agent enrolment with signed commands | `scripts/machine-init.ts`; `services/agent/src/main.ts` | Download package, signed licence, installer |
| 86 | CUSTOMER-CONTROLLED CLOUD DEPLOYMENT | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/decisions/ADR-001-prototype-profile.md` | Cloud deployment a local prototype cannot demonstrate |
| 87 | CLOUD PROVIDER SECURITY | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Cloud account controls |
| 88 | OBSERVABILITY | PARTIALLY_IMPLEMENTED | Health endpoint and correlated request audit (M32) | `frontend/src/app/healthz/route.ts`; `scripts/preflight.ts`; `test:network` | Metrics, traces, log pipeline |
| 89 | MONITORING DASHBOARD | NOT_IMPLEMENTED | Operator status command only | `scripts/orvia-status.ts` | The dashboard; alerting and uptime monitoring |
| 90 | SECURITY MONITORING | FOUNDATION_ONLY | Authentication rate-limit and request audit records | `database/customer/src/auth-schema.ts` `rateLimit`; `database/customer/migrations/0003_request_audit.sql` | Detection rules and alerting |
| 91 | BACKUPS | NOT_IMPLEMENTED | — | `docs/demo/CLAIMS_REGISTER.md` CL-16 | Backup of database, configuration and evidence |
| 92 | DISASTER RECOVERY | NOT_IMPLEMENTED | Worker restart recovery is not disaster recovery | `test:lifecycle`; `docs/demo/CLAIMS_REGISTER.md` CL-16 | RPO/RTO, control-plane restore, failover |
| 93 | UPDATE SYSTEM | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M31 | Update channel, version check, upgrade path |
| 94 | LICENSE SECURITY | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M27 | Signed licence verification and tamper handling |
| 95 | PRIVACY-SAFE SUPPORT | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M30; `docs/runbooks/OPERATOR.md` | Diagnostic bundle and redaction rules |
| 96 | SUPPORT PORTAL | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M30 | Ticketing and support tooling |
| 97 | API ARCHITECTURE | PARTIALLY_IMPLEMENTED | 36 documented paths across session, admin, portal, machine | `shared/contracts/generated/openapi.json`; `frontend/src/server/business.ts`; `contracts:check` | APIs for rights, retention, incidents, connectors |
| 98 | WEBHOOK ARCHITECTURE | NOT_IMPLEMENTED | — | — | Outbound webhooks, signing, retries |
| 99 | IDEMPOTENCY | DEMONSTRATED | CORE | `backend/domain/src/transaction.ts` `idempotent`; `database/customer/migrations/0002_idempotency_key_bound.sql`; `test:consent` | Coverage for routes that do not yet exist |
| 100 | EVENT ARCHITECTURE | PARTIALLY_IMPLEMENTED | Transactional outbox for consent events | `database/customer/migrations/0004_configuration_consent.sql`; `services/worker/src/withdrawal-worker.ts`; `test:workflows` | Event bus, catalogue and subscribers |
| 101 | DATA MIGRATION STRATEGY | PARTIALLY_IMPLEMENTED | 15 hash-checked forward migrations | `database/customer/migrations/`; `scripts/migrate.ts` | Rollback plans and zero-downtime strategy |
| 102 | FRONTEND ARCHITECTURE | PARTIALLY_IMPLEMENTED | Shared component set and one shell | `frontend/src/components/ui.tsx`; `frontend/src/components/shell.tsx` | Full design system and accessibility audit |
| 103 | PRIMARY NAVIGATION | PARTIALLY_IMPLEMENTED | Workspace and portal navigation | `frontend/src/components/shell.tsx`; `tests/e2e/workflow.spec.ts` | Navigation for rights, incidents, retention, settings |
| 104 | DASHBOARD | PARTIALLY_IMPLEMENTED | Live counts, deliberately no score | `backend/domain/src/evidence.ts` `overview`; `frontend/src/app/workspace/page.tsx` | Health scoring and trends, which CL-13 forbids claiming |
| 105 | PRIVACY GRAPH UI | PARTIALLY_IMPLEMENTED | Control-map list and detail | `frontend/src/app/workspace/control-map/page.tsx` | Graph traversal and visualisation |
| 106 | CONTROL DETAIL PAGE | PARTIALLY_IMPLEMENTED | Workflow and system detail views | `frontend/src/app/workspace/workflows/[id]/page.tsx`; `tests/e2e/workflow.spec.ts` | A first-class control entity page |
| 107 | TEST DETAIL PAGE | PARTIALLY_IMPLEMENTED | Read by exact run identifier (F-12) | `frontend/src/app/workspace/test-lab/[id]/page.tsx`; `tests/e2e/test-lab.spec.ts` | Run history list and navigation |
| 108 | INCIDENT DETAIL PAGE | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M17 | Whole page |
| 109 | SECURITY REQUIREMENTS | PARTIALLY_IMPLEMENTED | MFA, session protection, TLS, CSP, bounded schemas | `backend/auth/src/server.ts`; `frontend/src/server/http.ts`; `test:auth`; `test:tls` | Production hardening remains NOT_ASSESSED |
| 110 | API SECURITY | DEMONSTRATED | CORE | `frontend/src/server/business.ts` (authn, authz, schema, idempotency); `test:auth` | Per-API rate limits and quotas |
| 111 | FILE UPLOAD SECURITY | NOT_IMPLEMENTED | No upload path exists | — | Validation, scanning and isolation once uploads exist |
| 112 | AI SECURITY | DEFERRED_V2 | — | `tracking/capabilities.json` M19–M25 | Model-specific controls; the V1-binding isolation duty is met under §§7, 35, 110 |
| 113 | AI TOOL-USE MODEL | DEFERRED_V2 | — | `tracking/capabilities.json` M19–M25 | Whole tool-use model |
| 114 | DEVELOPER EXPERIENCE | PARTIALLY_IMPLEMENTED | Generated OpenAPI and per-increment engineering docs | `shared/contracts/generated/openapi.json`; `docs/engineering/`; `contracts:check` | Published SDK documentation and developer portal |
| 115 | CLI | PARTIALLY_IMPLEMENTED | Operator start, stop, status, setup | `scripts/orvia-cli.ts`; `scripts/orvia-status.ts` | Domain commands for policy, consent and connectors |
| 116 | REPOSITORY STRUCTURE | DEMONSTRATED | Monorepo as recommended | `pnpm-workspace.yaml`; `docs/engineering/REPOSITORY_INVENTORY.md` | Packages for unbuilt modules |
| 117 | 20-PERSON ENGINEERING TEAM | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Team structure; not a software artefact |
| 118 | NON-ENGINEERING EXPERTISE REQUIRED | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Staffing matter |
| 119 | ENGINEERING TEAM WORKFLOW | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/prototype/TASK_BOARD.md` | Process matter |
| 120 | DEFINITION OF DONE | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/prototype/RELEASE_CHECKLIST.md` | Process matter |

### Sections 121–160

| # | Master section | Status | Implemented depth | Evidence / source | Remaining for full ORVIA |
|---|---|---|---|---|---|
| 121 | AI CODING AGENT RULES | NOT_APPLICABLE_TO_PROTOTYPE | — | `AGENTS.md`; `docs/prototype/FILE_OWNERSHIP.md` | Build-process rules |
| 122 | DEVELOPMENT ENVIRONMENTS | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/engineering/local-development.md` | Dev, staging and production environments |
| 123 | CI/CD PIPELINE | NOT_IMPLEMENTED | Local preflight only | `scripts/preflight.ts` | A hosted pipeline with gates |
| 124 | CODE QUALITY | DEMONSTRATED | Strict TypeScript; ESLint at zero warnings | `tsconfig.json`; `eslint.config.mjs`; `typecheck`; `lint` | Coverage thresholds and a CI gate |
| 125 | TESTING PYRAMID | PARTIALLY_IMPLEMENTED | 5 unit, 11 integration/security suites, 7 browser specs | `tests/unit/`; `tests/integration/`; `tests/e2e/` | A genuinely broad unit base beneath the integration layer |
| 126 | SECURITY TESTING | DEMONSTRATED | Access control, tenant escape, TLS | `tests/security/auth.test.ts` (`test:auth`); `tests/security/tls.test.ts` | Penetration testing, which CL-19 forbids claiming |
| 127 | MULTI-TENANT SECURITY TEST | DEMONSTRATED | Cross-tenant and sibling-environment denial | `tests/security/auth.test.ts`; `test:consent` | Only two synthetic tenants exist |
| 128 | CONNECTOR SECURITY TESTING | DEMONSTRATED | SANDBOX | `tests/integration/workflows/workflow.test.ts` (tampered scope, wrong installation, expired command) | Real vendor credential failure modes |
| 129 | PERFORMANCE TARGETS | NOT_IMPLEMENTED | — | — | Targets, measurement and load testing |
| 130 | SCALABILITY MODEL | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Independent scaling a local prototype cannot demonstrate |
| 131 | CUSTOMER SCALE | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Scale targets |
| 132 | DATA RETENTION WITHIN ORVIA | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M33 limitation | Retention policy for ORVIA's own records |
| 133 | AUDIT EVIDENCE EXPORT | DEMONSTRATED | CORE (M08) | `scripts/evidence-export.ts`; `backend/domain/src/evidence.ts`; `test:evidence` | CSV and PDF formats; scheduled export |
| 134 | REPORTING | NOT_IMPLEMENTED | Live counts are not reports | `backend/domain/src/evidence.ts` `overview` | Control-health, failure and trend reports |
| 135 | READINESS SCANNER | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Website lead-generation capability |
| 136 | INITIAL CUSTOMER TARGET | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Commercial targeting |
| 137 | FIRST VERTICAL SLICE | DEMONSTRATED | This is the prototype's slice | `backend/domain/src/consent.ts`; `services/worker/src/withdrawal-workflows.ts`; `test:workflows`; `tests/e2e/workflow.spec.ts` | Synthetic targets only; canonical T01–T34 remain NOT_RUN |
| 138 | PHASE 0 — ARCHITECTURAL FOUNDATION | PARTIALLY_IMPLEMENTED | Repo, auth, tenancy, database, contracts | `database/customer/migrations/`; `shared/contracts/`; `test:auth` | CI/CD is absent from this phase |
| 139 | PHASE 1 — CORE PRIVACY OPERATIONS | DEMONSTRATED | CORE/SANDBOX for one slice | `backend/domain/src/`; `test:consent`; `test:workflows`; `test:evidence` | Rights and retention operations |
| 140 | PHASE 2 — CONTROL | PARTIALLY_IMPLEMENTED | Control point built; SDK is internal only | `backend/domain/src/processing.ts`; `backend/policy-sdk/src/index.ts` | Distributable SDK and runtime controls |
| 141 | PHASE 3 — TESTING | DEMONSTRATED | SANDBOX (M09) | `scripts/regression-runner.ts`; `test:regression`; `tests/e2e/test-lab.spec.ts` | Drift detection and scheduled runs |
| 142 | PHASE 4 — ENTERPRISE | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M27, M28, M31 | Enterprise identity, deployment, fleet operations |
| 143 | PHASE 5 — ADVANCED | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M15, M17 | Incident explorer, advanced retention, marketplace |
| 144 | THREE EDITIONS MUST EXIST ARCHITECTURALLY FROM THE BEGINNING | FOUNDATION_ONLY | Non-enforcing edition field on the register | `tracking/capabilities.json` `edition_entitlement` | Architectural edition awareness in the application |
| 145 | BUT FEATURE DELIVERY MUST STILL BE CONTROLLED | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M28 | Feature flags and staged delivery |
| 146 | RELEASE STRATEGY | PARTIALLY_IMPLEMENTED | Frozen candidate, manifest, packaging, checklist | `artifacts/release-manifest.json`; `scripts/package-candidate.ts`; `docs/prototype/RELEASE_CHECKLIST.md` | Release notes, channels, versioned product releases |
| 147 | CONNECTOR VERSIONING | FOUNDATION_ONLY | Versioned transport and signed-command contracts | `shared/contracts/generated/manifest.json`; `contracts:check` | Per-connector version and compatibility matrix |
| 148 | POLICY COMPATIBILITY | FOUNDATION_ONLY | Policy versions immutable and referenced exactly | `backend/domain/src/configuration.ts`; `test:consent` | Policy schema versioning and negotiation |
| 149 | WORKFLOW COMPATIBILITY | PARTIALLY_IMPLEMENTED | Running work binds its policy version and epoch | `services/worker/src/withdrawal-workflows.ts`; `test:lifecycle` | Workflow template versioning |
| 150 | EVIDENCE IMMUTABILITY | PARTIALLY_IMPLEMENTED | Append-only records; reconciliation appended | `database/customer/migrations/0008_evidence_reconciliation.sql`; `test:evidence` | A formal correction-event model |
| 151 | CUSTOMER TRUST MODEL | PARTIALLY_IMPLEMENTED | Limits stated in product and in export | `frontend/src/components/state-labels.ts`; `docs/demo/CLAIMS_REGISTER.md` | Full trust-disclosure surface |
| 152 | ORVIA'S MOST IMPORTANT DIFFERENTIATOR | PARTIALLY_IMPLEMENTED | Control engineering, verification and testing at sandbox depth | `backend/domain/src/completion.ts`; `test:evidence`; `test:regression` | The graph half of the differentiator is shallow |
| 153 | FUTURE INTEROPERABILITY | NOT_IMPLEMENTED | — | — | Consent-manager and ecosystem interoperability |
| 154 | MOBILE AND WEB | PARTIALLY_IMPLEMENTED | Web console and web portal | `frontend/src/app/workspace/`; `frontend/src/app/privacy/` | Mobile experience |
| 155 | INTERNATIONALISATION | NOT_IMPLEMENTED | Single language; no i18n layer | `tracking/capabilities.json` M12 limitation | Language, timezone and formatting architecture |
| 156 | LOCALISATION | NOT_IMPLEMENTED | — | — | Additional languages |
| 157 | SEARCH | NOT_IMPLEMENTED | Cursor paging only | `backend/domain/src/transaction.ts` `paged` | Global search across entities |
| 158 | ADMIN SETTINGS | NOT_IMPLEMENTED | — | — | Organisation profile, user, role and security settings |
| 159 | BILLING | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M26 | Subscription, invoicing, payment |
| 160 | LICENSE EXPIRATION | NOT_IMPLEMENTED | — | `tracking/capabilities.json` M27 | Graceful expiry behaviour |

### Sections 161–218

| # | Master section | Status | Implemented depth | Evidence / source | Remaining for full ORVIA |
|---|---|---|---|---|---|
| 161 | OFFBOARDING | NOT_IMPLEMENTED | — | — | Configuration and evidence offboarding path |
| 162 | CUSTOMER DATA EXPORT | PARTIALLY_IMPLEMENTED | Scoped evidence export only | `scripts/evidence-export.ts`; `test:evidence` | Full configuration and customer data export |
| 163 | SECURITY BASELINE FOR RELEASE | PARTIALLY_IMPLEMENTED | Dependency advisories and hygiene scan, 0 findings | `scripts/dependency-advisories.mjs`; `scripts/local-hygiene.mjs`; `test:tls` | Threat model and the production baseline, NOT_ASSESSED |
| 164 | EXTERNAL SECURITY REVIEW | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/demo/CLAIMS_REGISTER.md` CL-19 | Independent penetration test and architecture review |
| 165 | LEGAL / COMPLIANCE CONTROL | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/demo/CLAIMS_REGISTER.md` CL-22 | Legal mapping; no legal claim is permitted here |
| 166 | REGULATORY RULE PACK ARCHITECTURE | FOUNDATION_ONLY | Policy externalised in Rego, not hard-coded | `policy/processing/decision.rego` | Rule-pack packaging, versioning and distribution |
| 167 | LEGAL CONTENT VERSIONING | FOUNDATION_ONLY | Notice and policy versions carry digest and publication time | `backend/domain/src/configuration.ts`; `test:consent` | A regulatory version dimension |
| 168 | PRODUCT CLAIMS | PARTIALLY_IMPLEMENTED | Claims register with a validator | `docs/demo/CLAIMS_REGISTER.md`; `docs/reviews/cowork/tools/validate_docs.py` | Claims discipline for capabilities not yet built |
| 169 | NO FALSE "PROOF" | DEMONSTRATED | CORE (M08) | `backend/domain/src/evidence.ts` (coverage limits); `backend/domain/src/completion.ts` (`EFFECT_UNKNOWN`); `test:evidence` | The same discipline across unbuilt areas |
| 170 | CUSTOMER CONFIGURATION MODEL | DEMONSTRATED | CORE (M04) | `backend/domain/src/configuration.ts`; `tests/e2e/configuration.spec.ts` | Retention, vendor and rights configuration |
| 171 | PRINCIPLE OF LEAST PRIVILEGE | DEMONSTRATED | CORE/SANDBOX | `services/agent/src/execute.ts` (scope-bound signed commands); `database/customer/src/runtime.ts`; `test:workflows` | Per-connector capability requests against real vendors |
| 172 | CONNECTOR CREDENTIAL MODEL | FOUNDATION_ONLY | Local enrolment and signing key | `scripts/machine-init.ts`; `backend/auth/src/machine.ts` | Credential references backed by a secret store |
| 173 | CONNECTOR HEALTH | PARTIALLY_IMPLEMENTED | On-demand system check and effective read capability | `backend/domain/src/evidence.ts` `checkSystem`; `database/customer/migrations/0012_effective_read_capability.sql` | Continuous health states and alerting |
| 174 | ACTION RETRY STRATEGY | PARTIALLY_IMPLEMENTED | Bounded retry, 3 attempts, 1–5 s | `services/worker/src/withdrawal-workflows.ts`; `test:workflows` | Per-connector backoff and jitter configuration |
| 175 | DEAD-LETTER QUEUES | NOT_IMPLEMENTED | Failures escalate to the Failure Centre instead | `backend/domain/src/evidence.ts` `failures` | Dead-letter storage and replay |
| 176 | RATE LIMITS | FOUNDATION_ONLY | Authentication rate limiting only | `database/customer/src/auth-schema.ts` `rateLimit`; `shared/testing/src/auth-window.ts` | Configurable per-connector rate limits |
| 177 | SYSTEM HEALTH PROTECTION | PARTIALLY_IMPLEMENTED | Activity timeout plus bounded retry | `services/worker/src/withdrawal-workflows.ts` (15 s start-to-close) | Concurrency caps and circuit breakers |
| 178 | CUSTOMER SYSTEM SAFETY | PARTIALLY_IMPLEMENTED | Capability validated; unsupported target becomes manual | `backend/domain/src/evidence.ts`; `scripts/assign-manual.ts`; `test:workflows` | Destructive-action gating; no destructive action exists |
| 179 | DRY RUN MODE | PARTIALLY_IMPLEMENTED | Policy preview, explicitly not an admission decision | `backend/domain/src/processing.ts` `preview`; `frontend/src/app/workspace/policy-preview/page.tsx`; `test:enforcement` | Workflow-level dry run |
| 180 | GRADUAL ENFORCEMENT | NOT_IMPLEMENTED | Single enforcing behaviour | — | Staged observe-to-enforce rollout |
| 181 | ORVIA OBSERVE MODE | FOUNDATION_ONLY | Decision and request records an observe mode would read | `backend/domain/src/processing.ts` (`processing_decisions`); `database/customer/migrations/0003_request_audit.sql` | A selectable observe mode |
| 182 | ORVIA COORDINATE MODE | PARTIALLY_IMPLEMENTED | Manual task assignment and attestation | `scripts/assign-manual.ts`; `backend/domain/src/evidence.ts` `attest`; `test:workflows` | A selectable mode with approvals and task management |
| 183 | ORVIA ENFORCE MODE | PARTIALLY_IMPLEMENTED | ALLOW/BLOCK at one supported boundary | `policy/processing/decision.rego`; `test:enforcement` | MASK and RESTRICT outcomes; more boundaries |
| 184 | USER EXPERIENCE RULE | PARTIALLY_IMPLEMENTED | State labels and reason codes on built screens | `frontend/src/components/state-labels.ts`; `frontend/src/components/mutation-feedback.tsx` | The rule applied across unbuilt areas |
| 185 | DASHBOARD SUMMARY EXAMPLE | PARTIALLY_IMPLEMENTED | Overview counts without a health score | `frontend/src/app/workspace/page.tsx`; `backend/domain/src/evidence.ts` `overview` | The master's summary layout and metrics |
| 186 | ENGINEERING DOCUMENTATION | PARTIALLY_IMPLEMENTED | Per-increment engineering notes | `docs/engineering/authentication-and-scope.md`; `docs/engineering/REPOSITORY_INVENTORY.md` | Documentation for every module |
| 187 | ARCHITECTURE DECISION RECORDS | PARTIALLY_IMPLEMENTED | One ADR | `docs/decisions/ADR-001-prototype-profile.md` | ADRs for the remaining architectural decisions |
| 188 | DEVELOPMENT STANDARD | NOT_APPLICABLE_TO_PROTOTYPE | — | `AGENTS.md` | Human review and merge discipline |
| 189 | AI-CODING DEVELOPMENT LOOP | NOT_APPLICABLE_TO_PROTOTYPE | — | `handoffs/` | Process matter |
| 190 | AI SHOULD BUILD IN SMALL VERIFIED UNITS | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/prototype/TASK_BOARD.md` | Process matter |
| 191 | FIRST DEMO TARGET | PARTIALLY_IMPLEMENTED | Scenario built and covered by suites | `docs/prototype/DEMO_SCRIPT.md`; `tests/e2e/workflow.spec.ts`; `CURRENT_STATE.md` | The two human rehearsals remain NOT_RUN |
| 192 | FAILURE DEMO | DEMONSTRATED | SANDBOX | `shared/testing/src/http-fixture.ts`; `tests/integration/workflows/workflow.test.ts`; `test:workflows` | Failure modes of real vendor systems |
| 193 | PRIVACY REGRESSION DEMO | DEMONSTRATED | SANDBOX | `tests/fault-fixtures/stale-sender.ts`; `test:regression`; `tests/e2e/test-lab.spec.ts` | Broader regression scenarios |
| 194 | CUSTOMER DEPLOYMENT DEMO | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/decisions/ADR-001-prototype-profile.md` | Deployment demonstration |
| 195 | PRODUCT SUCCESS METRICS | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Commercial metrics |
| 196 | PRIVACY CONTROL METRICS | PARTIALLY_IMPLEMENTED | Live unresolved-obligation counts, never summed | `backend/domain/src/evidence.ts` `overview` and `failures` | Trend and coverage metrics over time |
| 197 | CUSTOMER ONBOARDING TARGET | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Commercial onboarding target |
| 198 | COMMERCIAL EXPANSION | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Commercial model |
| 199 | FUTURE MODULE MARKETPLACE | NOT_IMPLEMENTED | — | — | Marketplace; the master defers it |
| 200 | LONG-TERM ARCHITECTURE PRINCIPLE | PARTIALLY_IMPLEMENTED | Modular monorepo with shared domain packages | `pnpm-workspace.yaml`; `backend/domain/src/` | Modularity across the unbuilt modules |
| 201 | FINAL SYSTEM PRINCIPLE | PARTIALLY_IMPLEMENTED | Whole loop runs for one slice | `test:workflows`; `test:evidence`; `test:regression` | The loop for every other privacy operation |
| 202 | FINAL CUSTOMER ARCHITECTURE | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/decisions/ADR-001-prototype-profile.md` | Vendor distribution and customer deployment planes |
| 203 | FINAL DELIVERY MODEL | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Purchase, download and licence delivery |
| 204 | FINAL COMMERCIAL MODEL | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Commercial model |
| 205 | FINAL AI MODEL | DEFERRED_V2 | — | `tracking/capabilities.json` M19–M25; `docs/demo/CLAIMS_REGISTER.md` CL-18 | Whole Version 2 AI layer |
| 206 | FINAL SECURITY MODEL | PARTIALLY_IMPLEMENTED | As §§109–111 at prototype depth | `backend/auth/src/server.ts`; `test:auth`; `test:tls` | Production security remains NOT_ASSESSED |
| 207 | FINAL ENGINEERING RULE | NOT_APPLICABLE_TO_PROTOTYPE | — | `AGENTS.md` | Engineering culture rule |
| 208 | FINAL PRODUCT RULE | DEMONSTRATED | CORE (M18) | `backend/domain/src/evidence.ts` `failures`; `backend/domain/src/test-runs.ts`; `test:regression` (ERROR is never a fabricated pass) | The same rule across unbuilt areas |
| 209 | FINAL ARCHITECTURAL ADVANTAGE | PARTIALLY_IMPLEMENTED | Execution, enforcement, verification and testing joined for one slice | `backend/domain/src/workflow.ts`; `backend/domain/src/completion.ts`; `test:evidence` | The advantage across the full estate |
| 210 | FINAL MASTER BUILD OBJECTIVE | NOT_APPLICABLE_TO_PROTOTYPE | — | `CURRENT_STATE.md` | Whole-product objective a local prototype cannot demonstrate |
| 211 | FINAL ENGINEERING COMMAND TO THE AI BUILD SYSTEM | NOT_APPLICABLE_TO_PROTOTYPE | — | `AGENTS.md` | Instruction to the build system |
| 212 | ORVIA — FINAL PRODUCT IN ONE SENTENCE | NOT_APPLICABLE_TO_PROTOTYPE | — | — | Summary statement |
| 213 | PRIVACY CONTROL PACKAGES AND CHANGE SIMULATION | NOT_IMPLEMENTED | — | — | Control packages and change simulation |
| 214 | ASSESSMENTS, SDF GOVERNANCE AND REMEDIATION | NOT_IMPLEMENTED | — | — | Assessment workspace and SDF governance |
| 215 | CUSTOMER AI-PROCESSING GOVERNANCE EXTENSION | NOT_IMPLEMENTED | — | — | Whole extension; the master positions it as later scope |
| 216 | PRIORITIZED ENGINEERING BACKLOG | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/prototype/TASK_BOARD.md`; `tracking/tasks.json` | Programme backlog governance |
| 217 | MANDATORY ACCEPTANCE AND FAILURE TEST MATRIX | PARTIALLY_IMPLEMENTED | T01–T34 defined and validated; all NOT_RUN | `tracking/acceptance.json`; `docs/prototype/ACCEPTANCE.md`; `tracking:check` | Canonical execution of T01–T34 |
| 218 | PRIMARY SOURCE REGISTER AND REVIEW LIMITS | NOT_APPLICABLE_TO_PROTOTYPE | — | `docs/prototype/SOURCE_ALIGNMENT.md` | Source register and review limits |

---

## Limits of this mapping

- A status describes **the prototype slice only**. It is a statement about this repository at one dated
  snapshot, not about ORVIA the product.
- `DEMONSTRATED` never means the master module is delivered. It means a named behaviour is built and
  exercised by a named executing suite in the `CUSTOMER_LOCAL_SYNTHETIC` profile, against synthetic Aster and
  Birch fixtures and synthetic targets.
- The canonical acceptance tests **T01–T34 remain NOT_RUN**. Component suites passing at one exact candidate
  is engineering evidence, not application acceptance.
- The **two human rehearsals are outstanding**, C00 acceptance has not been made, and internal-demo readiness
  is NOT_READY. See `CURRENT_STATE.md`.
- No claim in `docs/demo/CLAIMS_REGISTER.md` is `EVIDENCED`. Nothing here may be quoted as a demo claim.
- **Nothing here is a legal or compliance claim.** CL-22 permits no legal-compliance statement of any kind.
  Production security, legal, supply-chain and full disaster recovery remain NOT_ASSESSED and are governed
  separately by the master.
- The percentages are a count of master sections with some built presence. They are not a measure of product
  completion, module completion, effort, or value delivered, and must always be quoted with their
  denominators.
