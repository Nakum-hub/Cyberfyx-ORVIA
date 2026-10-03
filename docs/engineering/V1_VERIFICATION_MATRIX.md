# ORVIA V1 verification matrix

Round 9 verification on the synthetic codex-a00 and vendor-a00 development stores, integrated base `a14470c8`. Runtime rows below use the latest executed Round 9 result (discovery `106c5599`, fixes `7217f2b8`; exact later sources and commands are in `handoffs/codex/artifacts/R9-summary.json`). PASS is component evidence on this host, not release qualification, production qualification or owner acceptance. Family acceptance states are unchanged. The policy gate remains explicitly historical evidence.


## The presentation claims, scenario by scenario

Each claim names the scenarios that are executed, the suite, and what the claim does **not** cover. Results for each suite are in the module and family tables below.

### 1. Questionnaires and assessment (EX06, EX08)
- **Scenarios executed** (`integration-expansion-impact`, `integration-expansion-third-party`):
  - versioned questionnaire templates, where an answer stays bound to the version it answered;
  - evidence attached per answer;
  - the person who prepared an assessment cannot approve it;
  - risk-scored remediation actions, retest after remediation, and reassessment on a schedule;
  - supplier questionnaires through a scoped, expiring and revocable response link, with no supplier login into the installation;
  - the supplier's answers are reviewed by staff before they count;
  - another tenant sees nothing.
- **Not claimed:** no regulator-certified questionnaire content. The questions are the organisation's own, or the templates shipped for management approval.

### 2. Metadata discovery and mapping (M03, EX04, EX05, EX02)
- **Scenarios executed:**
  - **PostgreSQL catalog** (`integration-discovery-postgres-catalog`, `-catalog-flow`, `-schema-drift`):
    - an approved, read-only observer reads the catalog;
    - the observer is refused if it can write;
    - a column added later opens one HIGH "review the mapping" gap, with no duplicates on re-read;
    - a dropped table is reported MISSING, not unchanged;
    - an expired observer credential is refused;
    - a new target is read before older ones are re-read.
  - **Classification** (`integration-expansion-classification`): value sampling with measured precision and recall on labelled synthetic data, and access-exposure findings.
  - **RoPA** (`integration-expansion-ropa-exports`): built from the graph, with a completeness manifest, bounded and resumable.
  - **Website privacy-policy "handshake"** (`integration-expansion-policy-discovery`):
    - the site's own declaration (`rel="privacy-policy"`, or a footer link with policy text) is followed from the registered origin;
    - redirects off the origin are refused;
    - text changes are detected by digest and sent to staff review;
    - weekly re-observation;
    - quiet local Chromium that contacts no vendor or Google host.
- **Not claimed:**
  - no discovery of systems ORVIA was not given;
  - no MySQL, Oracle or SaaS connectors (synthetic connectors only);
  - no reading of personal values beyond the classification sample, which is kept as counts only.

### 3. Real-time consent enforcement (M04, M11)
- **Scenarios executed** (`integration-enforcement-send`, `-withdrawal-timing`, `integration-consent-consent`, `-expiry`):
  - send admission while consent stands is ALLOW;
  - 20 independent purposes: in 20 of 20 the first send after the withdrawal returned was BLOCK;
  - expiry stops admission;
  - an old event, a retry or a licence error never reactivates marketing;
  - a **re-grant does not silently restart marketing** while the withdrawal's suppression work is unresolved: admission stays BLOCK on `unresolved_suppression` until the downstream suppression is verified;
  - the operations runner is woken by the withdrawal (database NOTIFY), measured with the real runner process.
- **Measured on this host** (synthetic loopback records target):

  | Measurement | Result |
  |---|---|
  | Admission decision after a withdrawal | p50 33 ms, p95 42 ms, max 57 ms |
  | Withdrawal to independently verified suppression of the target record | p50 14.2 s, max 14.6 s |
  | The supervised runner process, woken by the withdrawal | 13.5 s, inside its 30-second loop |

- **Not claimed:**
  - "Real-time" holds for the refusal at the processing boundary (milliseconds).
  - Downstream suppression takes seconds and is verified, not assumed.
  - A named production connector needs its own measurement.

### 4. Downstream telemetry verification (M07, M08)
- **Scenarios executed** (`integration-operations-consent-withdrawal`, `integration-workflows-workflow`, `integration-evidence-evidence`):
  - a target change is read back independently and reported VERIFIED;
  - an acknowledgement without effect stays unverified;
  - a timeout is UNKNOWN effect, not failure or success;
  - an unavailable target is reported as unavailable;
  - stale observations are not used as proof;
  - evidence is signed and replay-immutable.
- **Not claimed:** acknowledgement is never treated as verification. Real vendor systems are not connected.

### 5. CI/CD regression gate (M09, EX11)
- **Scenarios executed:**
  - `policy-gate`: 28 OPA policy tests, plus 8 deliberate defects that must each be caught. A gate that passes a defect fails the job.
  - `integration-regression-regression`: privacy regression runs against the installation.
  - `integration-expansion-grc-lifecycle`: scheduled control tests with drift and deduplicated alerts.
- **Not claimed:** the gate runs in this repository's CI. A client's own pipeline integration is not built.

### 6. Eighth Schedule drift guard (M12)
- **Scenarios executed:**
  - `integration-operations-notice-language-drift` (runtime):
    - a material change marks out-of-step languages;
    - publication is refused, with one field error per out-of-step language;
    - the reference is the latest original, never a translation, and English is not assumed;
    - acknowledgement is needed only when the changes statement changes;
    - Operations attention lists the drift.
  - `integration-notices-languages`: the person's chosen language is preserved, and generated language text is immutable.
  - **NoticeContextDrift CI guard** (`tests/unit/notice-context-drift.test.ts`, run by `pnpm test` on every push): nine rule scenarios, plus five deliberately broken rule variants that must each fail a scenario.
- **Not claimed:**
  - ORVIA does not translate and never judges wording equivalence across the 22 languages.
  - Equivalence is a reviewed human attestation (`docs/engineering/NOTICE_LANGUAGE_DRIFT.md`).

### 7. AI custom model governance (EX12)
- **Scenarios executed** (`integration-ai-governance-ai-governance`, `-monitor`, `-model-versions`):
  - AI use inventory with risk, policy, control and approval records;
  - an open finding blocks approval;
  - each model version records its training datasets, purpose, basis, data cut-off and evaluation;
  - a trained model must name its data;
  - the recorder cannot approve;
  - approval is refused while a training dataset is not mapped to the training purpose, naming the dataset;
  - one deployed version at a time;
  - consent withdrawn after the cut-off raises a retraining decision, never an "unlearning" claim;
  - approved facts cannot be rewritten.
- **Not claimed:** ORVIA trains, runs and evaluates no model. Its own model functions (M19–M25) are Version 2.

### 8. P3 canary trap (M11)
- **Scenarios executed** (`integration-consent-canaries`, `-canary-grant-admission`, `-canary-retirement`, `integration-onboarding-real-principals`):
  - a decoy customer who never consented is planted in the marketing list and the CRM;
  - one owner registers the decoy and a different person activates it, so self-activation is refused;
  - a decoy holding a granted consent cannot be activated;
  - a send admission to the decoy is BLOCKED, the sender is not told why, and a hit names the sending machine and system;
  - **owner decision A (revision 1.10):** even after someone records a consent grant for an active decoy, with every other admission prerequisite in place, marketing admission is BLOCK with the generic reason `RECIPIENT_MARKETING_HOLD`, one decision and one hit are recorded and no send record. The staff preview agrees. Before migration 0088 the same case was observed as ALLOW (battery 21);
  - a canary transition and an admission check serialise on one lock covering the principal (an admission waits while a transition is uncommitted);
  - only send admission and its preview may ask for the hold;
  - a message addressed to the decoy is recorded as a hit without being refused at composition, so its author cannot probe for canaries;
  - **real-person decoys (revision 1.10):** a real person may be a decoy, but a message to them is WITHHELD by the runner and the database refuses any delivery attempt; only the delivery runner can withhold;
  - an operator recording consent for the decoy leaves a hit;
  - staff record the decoy mailbox receiving a newsletter, with evidence;
  - Operations attention shows the count to administrators who cannot see the canaries;
  - each hit is reviewed once, and hits cannot be edited or deleted;
  - a pending decoy can be retired without ever being activated (migration 0086);
  - a retired canary traps nothing, and its record returns to the ordinary consent rules;
  - another tenant sees none of it.
- **Not claimed:**
  - Inside ORVIA a hit is detected automatically. Outside ORVIA (the client's own mailers) a hit is known only when staff report the decoy mailbox receiving something.
  - A sender that controls every other prerequisite can infer that a BLOCK came from something it cannot see; the response never names canaries, but perfect indistinguishability is not claimed.
  - The author of a message to a real-person decoy sees it WITHHELD.

### 9. NoticeContextDrift
This is the named CI guard for claim 6 (`tests/unit/notice-context-drift.test.ts`). It decides the drift states without a database on every push, and proves it would catch a regression in the rules.

At runtime, the publish refusal and the website-policy change review apply the same rules. Suites: `integration-operations-notice-language-drift` and `integration-expansion-policy-discovery`.

### 10. Real people (go-live C1, revision 1.9)
- **Scenarios executed** (`integration-onboarding-real-principals`):
  - before admission a real email is refused, and the reason is explained;
  - the application cannot admit real people;
  - the protected server command admits them once, with the reference and the operator recorded, audit in every environment, permanent;
  - labels are set by the database;
  - development profiles refuse the command.

### 11. Restores older than the erasure ledger (EX07)
- **Scenarios executed** (`integration-operations-backup-obligations`, `e2e-backups-and-recovery`):
  - each ledger purge records the latest erasure it removed for that system, without naming anyone;
  - a restore from a backup older than purged erasures is recorded with INCOMPLETE ledger coverage and the purge point, and the people the ledger can still name stay marked;
  - a newer restore keeps COMPLETE coverage;
  - Operations attention names the INCOMPLETE restore until a manual review is recorded; a complete restore takes no review, a second review is refused, and the review, the coverage and the purge records cannot be rewritten.
- **Not claimed:** ORVIA cannot name people the ledger has already forgotten; it says so and asks for a manual review. How long the ledger is kept is an open owner choice.

### 12. Regulatory impact analysis does not drop records silently
- **Scenario executed** (`integration-operations-regulatory`): on a profile holding 80 open breaches, the breach this run opened is among the impact items. Before the fix, at most 50 per kind were listed, unordered, and it was missing (battery 21).
- **Not claimed:** beyond 1000 records of one kind, the rest are reported as one UNRESOLVED item to review as a group, not itemised.


## Important functions

| Function | Suites executed (latest result) |
|---|---|
| Regulatory package import and review | `integration-operations-regulatory` PASS (32 assertions, 0 failures) |
| Applicability evaluation, including unknown results | `integration-operations-applicability` PASS (18 assertions, 0 failures) |
| Principal and representative registry | `integration-operations-registry` PASS (53 assertions, 0 failures)<br>`integration-rights-rights` PASS (64 assertions, 0 failures) |
| Processing activity registry | `integration-operations-registry` PASS (53 assertions, 0 failures)<br>`integration-expansion-ropa-exports` PASS (58 assertions, 0 failures) |
| Dry run and execution approval | `integration-operations-rights` PASS (26 assertions, 0 failures)<br>`integration-operations-correction` PASS (12 assertions, 0 failures)<br>`integration-operations-retention-scale` PASS (16 assertions, 0 failures)<br>`integration-operations-runner` PASS (10 assertions, 0 failures) |
| Current-at-effect checks | `integration-operations-runner` PASS (10 assertions, 0 failures)<br>`integration-processors-assessment-race` PASS (6 assertions, 0 failures)<br>`integration-consent-expiry` PASS (87 assertions, 0 failures)<br>`integration-updates-updates` PASS (54 assertions, 0 failures) |
| Replay and idempotency protection | `integration-consent-consent` PASS (50 assertions, 0 failures)<br>`integration-enforcement-send` PASS (47 assertions, 0 failures)<br>`security-auth` PASS (88 assertions, 0 failures) |
| Unknown-effect reconciliation | `integration-operations-consent-withdrawal` PASS (38 assertions, 0 failures)<br>`integration-workflows-workflow` PASS (32 assertions, 0 failures) |
| Redaction and response review | `integration-expansion-response-packages` PASS (52 assertions, 0 failures)<br>`integration-rights-rights` PASS (64 assertions, 0 failures) |
| Secure response delivery (expiry, revocation) | `integration-expansion-response-packages` PASS (52 assertions, 0 failures) |
| Source freshness and drift | `integration-discovery-schema-drift` PASS (10 assertions, 0 failures)<br>`integration-discovery-catalog-flow` PASS (58 assertions, 0 failures)<br>`integration-expansion-policy-discovery` PASS (30 assertions, 0 failures) |
| Classification quality measurement | `integration-expansion-classification` PASS (29 assertions, 0 failures) |
| Access-exposure findings | `integration-expansion-classification` PASS (29 assertions, 0 failures) |
| Risk treatment and issue lifecycle | `integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-grc-grc` PASS (40 assertions, 0 failures) |
| Evidence freshness and scope checks | `integration-vendor-audit-practice` PASS (128 assertions, 0 failures)<br>`integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-grc-audits` PASS (41 assertions, 0 failures) |
| Audit sampling with an auditor-provided seed | `integration-vendor-audit-practice` PASS (128 assertions, 0 failures) |
| Signed audit delivery chain | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Mandate suspension, expiry and revocation | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Vendor visibility history | `integration-monitoring-vendor-visibility` PASS (20 assertions, 0 failures)<br>`integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Continuous assurance mandate | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Verified payment events (duplicates, out of order) | `integration-commerce-commerce` PASS (116 assertions, 0 failures) |
| Reviewed licence issuance | `integration-commerce-commerce` PASS (116 assertions, 0 failures)<br>`integration-licensing-licensing` PASS (33 assertions, 0 failures) |

## Modules (master register)

| Module | Name | Product | Tracked status | Suites executed (latest result) |
|---|---|---|---|---|
| M01 | Identity and Access Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `security-auth` PASS (88 assertions, 0 failures)<br>`integration-expansion-staff-members` PASS (37 assertions, 0 failures)<br>`integration-expansion-staff-delete` PASS (27 assertions, 0 failures)<br>`e2e-sign-in-hydration` PASS (20 assertions, 0 failures)<br>`e2e-team` PASS (8 assertions, 0 failures)<br>`e2e-delete-login` PASS (14 assertions, 0 failures) |
| M02 | Tenant Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `security-auth` PASS (88 assertions, 0 failures)<br>`security-fixture-isolation` PASS<br>`integration-consent-consent` PASS (50 assertions, 0 failures) |
| M03 | Privacy Control Graph | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-graph-graph` PASS (46 assertions, 0 failures)<br>`security-graph-source-binding` PASS (2 assertions, 0 failures)<br>`integration-evidence-reports` PASS (24 assertions, 0 failures)<br>`integration-discovery-catalog-flow` PASS (58 assertions, 0 failures)<br>`integration-discovery-schema-drift` PASS (10 assertions, 0 failures) |
| M04 | Policy Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-enforcement-send` PASS (47 assertions, 0 failures)<br>`integration-enforcement-withdrawal-timing` PASS (12 assertions, 0 failures)<br>`integration-opa-cold-start` PASS (8 assertions, 0 failures)<br>`integration-consent-consent` PASS (50 assertions, 0 failures) |
| M05 | Workflow Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-workflows-workflow` PASS (32 assertions, 0 failures)<br>`integration-operations-runner` PASS (10 assertions, 0 failures) |
| M06 | Connector Framework | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-workflows-workflow` PASS (32 assertions, 0 failures)<br>`integration-onboarding-connection` PASS (33 assertions, 0 failures)<br>`integration-discovery-postgres-catalog` PASS (13 assertions, 0 failures) |
| M07 | Verification Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-evidence-evidence` PASS (69 assertions, 0 failures)<br>`integration-operations-consent-withdrawal` PASS (38 assertions, 0 failures)<br>`integration-workflows-workflow` PASS (32 assertions, 0 failures) |
| M08 | Evidence Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-evidence-evidence` PASS (69 assertions, 0 failures)<br>`integration-evidence-reports` PASS (24 assertions, 0 failures) |
| M09 | Privacy Test Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-regression-regression` PASS (90 assertions, 0 failures) |
| M10 | Notification Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-notifications-notifications` PASS (31 assertions, 0 failures)<br>`integration-expansion-delivery` PASS (41 assertions, 0 failures) |
| M11 | Consent Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-consent-consent` PASS (50 assertions, 0 failures)<br>`integration-consent-expiry` PASS (87 assertions, 0 failures)<br>`integration-consent-canaries` PASS (24 assertions, 0 failures)<br>`integration-operations-consent-manager` PASS (12 assertions, 0 failures)<br>`integration-operations-consent-withdrawal` PASS (38 assertions, 0 failures)<br>`integration-expansion-preferences` PASS (45 assertions, 0 failures)<br>`integration-expansion-cmp` PASS (45 assertions, 0 failures) |
| M12 | Notice Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-notices-languages` PASS (19 assertions, 0 failures)<br>`integration-operations-notices` PASS (16 assertions, 0 failures)<br>`integration-operations-notice-language-drift` PASS (20 assertions, 0 failures)<br>`integration-expansion-policy-discovery` PASS (30 assertions, 0 failures) |
| M13 | Data Principal Portal | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-rights-portal` PASS (19 assertions, 0 failures)<br>`integration-operations-organisation-intake` PASS (44 assertions, 0 failures)<br>`e2e-preferences` PASS (10 assertions, 0 failures) |
| M14 | Rights Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-rights-rights` PASS (64 assertions, 0 failures)<br>`integration-rights-portal` PASS (19 assertions, 0 failures)<br>`integration-operations-rights` PASS (26 assertions, 0 failures)<br>`integration-operations-correction` PASS (12 assertions, 0 failures)<br>`integration-operations-erasure-intimation` PASS (15 assertions, 0 failures)<br>`integration-expansion-response-packages` PASS (52 assertions, 0 failures) |
| M15 | Retention Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-retention-retention` PASS (45 assertions, 0 failures)<br>`integration-operations-retention-scale` PASS (16 assertions, 0 failures)<br>`integration-operations-backup-obligations` PASS (44 assertions, 0 failures) |
| M16 | Processor/Vendor Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-processors-processors` PASS (35 assertions, 0 failures)<br>`integration-processors-assessment-race` PASS (6 assertions, 0 failures)<br>`integration-operations-processors` PASS (15 assertions, 0 failures)<br>`integration-expansion-third-party` PASS (43 assertions, 0 failures) |
| M17 | Privacy Incident Explorer | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-incidents-incidents` PASS (42 assertions, 0 failures)<br>`integration-operations-breach` PASS (19 assertions, 0 failures) |
| M18 | Coverage and Failure Center | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-coverage-coverage` PASS (56 assertions, 0 failures) |
| M19 | AI Privacy Copilot | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M20 | AI Discovery | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M21 | AI Policy Builder | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M22 | AI Workflow Builder | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M23 | AI Risk/Drift Analysis | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M24 | AI Test Generation | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M25 | AI Incident Analysis | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M26 | Billing | V1 | NOT_IMPLEMENTED | Not built in the customer runtime by design: billing, metering and invoicing belong to the ORVIA Account on the vendor website (master §658, §3796; enforced by tests/unit/deployment-boundary.test.ts). Vendor commerce is verified under EX13. |
| M27 | Licensing | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-licensing-licensing` PASS (33 assertions, 0 failures) |
| M28 | Entitlements | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-licensing-licensing` PASS (33 assertions, 0 failures) |
| M29 | Customer Onboarding | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-onboarding-first-run` PASS (23 assertions, 0 failures)<br>`integration-onboarding-first-run-http` PASS (7 assertions, 0 failures)<br>`integration-onboarding-connection` PASS (33 assertions, 0 failures)<br>`integration-onboarding-preflight` PASS (20 assertions, 0 failures)<br>`integration-onboarding-imports` PASS (31 assertions, 0 failures)<br>`integration-operations-estate-import` PASS (18 assertions, 0 failures)<br>`integration-onboarding-owner-recovery` PASS (26 assertions, 0 failures)<br>`integration-onboarding-real-principals` PASS (37 assertions, 0 failures) |
| M30 | Support Bundle System | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-support-support` PASS (57 assertions, 0 failures) |
| M31 | Updates | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-updates-updates` PASS (54 assertions, 0 failures)<br>`integration-migration-upgrade` PASS (10 assertions, 0 failures) |
| M32 | Monitoring | V1 | PARTIAL_SANDBOX | `integration-monitoring-monitoring` PASS (31 assertions, 0 failures)<br>`integration-monitoring-restore` PASS (33 assertions, 0 failures)<br>`integration-monitoring-backup-drill` PASS (5 assertions, 0 failures)<br>`integration-monitoring-vendor-visibility` PASS (20 assertions, 0 failures)<br>`e2e-backups-and-recovery` PASS (12 assertions, 0 failures) |
| M33 | Audit Administration | V1 | PARTIAL_SANDBOX | `integration-audit-audit` PASS (51 assertions, 0 failures)<br>`integration-audit-retention` PASS (24 assertions, 0 failures) |

## Expansion families

| Family | Title | Tracked status | Suites executed (latest result) |
|---|---|---|---|
| EX01 | Universal consent and preferences | BUILT_PENDING_REVIEW | `integration-expansion-preferences` PASS (45 assertions, 0 failures)<br>`e2e-preferences` PASS (10 assertions, 0 failures) |
| EX02 | Website CMP and tracker controls | BUILT_PENDING_REVIEW | `integration-expansion-cmp` PASS (45 assertions, 0 failures)<br>`integration-expansion-policy-discovery` PASS (30 assertions, 0 failures) |
| EX03 | Full rights fulfilment | BUILT_PENDING_REVIEW | `integration-expansion-response-packages` PASS (52 assertions, 0 failures)<br>`integration-operations-rights` PASS (26 assertions, 0 failures) |
| EX04 | Discovery classification and source/code flows | BUILT_PENDING_REVIEW | `integration-expansion-classification` PASS (29 assertions, 0 failures)<br>`integration-discovery-catalog-flow` PASS (58 assertions, 0 failures)<br>`integration-discovery-schema-drift` PASS (10 assertions, 0 failures)<br>`e2e-catalog-discovery` PASS |
| EX05 | Data mapping and RoPA | BUILT_PENDING_REVIEW | `integration-expansion-ropa-exports` PASS (58 assertions, 0 failures) |
| EX06 | General impact assessments and remediation | BUILT_PENDING_REVIEW | `integration-expansion-impact` PASS (41 assertions, 0 failures) |
| EX07 | Retention holds deletion and backup obligations | BUILT_PENDING_REVIEW | `integration-operations-backup-obligations` PASS (44 assertions, 0 failures)<br>`integration-operations-retention-scale` PASS (16 assertions, 0 failures)<br>`e2e-backups-and-recovery` PASS (12 assertions, 0 failures) |
| EX08 | Third-party lifecycle | BUILT_PENDING_REVIEW | `integration-expansion-third-party` PASS (43 assertions, 0 failures) |
| EX09 | Incidents and reviewed notification | BUILT_PENDING_REVIEW | `integration-expansion-delivery` PASS (41 assertions, 0 failures)<br>`integration-operations-breach` PASS (19 assertions, 0 failures) |
| EX10 | Enterprise GRC and audit | BUILT_PENDING_REVIEW | `integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-grc-grc` PASS (40 assertions, 0 failures)<br>`integration-grc-audits` PASS (41 assertions, 0 failures)<br>`integration-grc-http` PASS (57 assertions, 0 failures) |
| EX11 | Continuous compliance and control tests | BUILT_PENDING_REVIEW | `integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-regression-regression` PASS (90 assertions, 0 failures)<br>`policy-gate` HISTORICAL PASS (not rerun in Round 9) |
| EX12 | Data security posture and AI governance | BUILT_PENDING_REVIEW | `integration-ai-governance-ai-governance` PASS (32 assertions, 0 failures)<br>`integration-ai-governance-monitor` PASS (9 assertions, 0 failures)<br>`integration-ai-governance-model-versions` PASS (21 assertions, 0 failures)<br>`e2e-ai-governance` PASS |
| EX13 | Vendor commerce UPI and cards | IN_PROGRESS | `integration-commerce-commerce` PASS (116 assertions, 0 failures)<br>`integration-commerce-migration-ledger` PASS |
| EX14 | Enterprise delivery and release qualification | IN_PROGRESS | `integration-opa-cold-start` PASS (8 assertions, 0 failures)<br>`integration-migration-upgrade` PASS (10 assertions, 0 failures)<br>`integration-monitoring-backup-drill` PASS (5 assertions, 0 failures)<br>`security-tls` NOT_RUN: Rehearsal-only TLS suite requires fixture users incompatible with the clean single-owner installation; existing NOT_RUN retained.<br>`security-network-core` NOT_RUN: Requires separately qualified packaged runtime image and controlled canary; existing NOT_RUN retained.<br>`e2e-interface-crawl` PASS (1 assertions, 0 failures) |
| EX15 | Installation kinds | BUILT_PENDING_REVIEW | `integration-web` PASS (3 assertions, 0 failures)<br>`integration-vendor-schema-equivalence` PASS (7 assertions, 0 failures) |
| EX16 | Vendor area in the same application | BUILT_PENDING_REVIEW | `integration-vendor-vendor-audit` PASS (74 assertions, 0 failures)<br>`e2e-vendor-production-criteria` PASS (15 assertions, 0 failures) |
| EX17 | DPDPA audit exchange | BUILT_PENDING_REVIEW | `integration-expansion-dpdpa-audit` PASS (56 assertions, 0 failures)<br>`integration-expansion-audit-indicator-counts` PASS (21 assertions, 0 failures)<br>`e2e-dpdpa-audit` PASS (24 assertions, 0 failures) |
| EX18 | Audit mandate and outbound channel | BUILT_PENDING_REVIEW | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures)<br>`e2e-audit-mandate` PASS (20 assertions, 0 failures) |
| EX19 | DPDPA audit practice | BUILT_PENDING_REVIEW | `integration-vendor-audit-practice` PASS (128 assertions, 0 failures) |

## Other suites executed

- `e2e-backups-and-recovery-2` HISTORICAL PASS (older alias; Round 9 evidence is `e2e-backups-and-recovery` above).
- `e2e-expansion-screens` PASS (69 assertions, 0 failures)
- `e2e-operations-screens` PASS (30 assertions, 0 failures)
- `e2e-registry-forms` PASS (16 assertions, 0 failures)
- `integration-bootstrap` PASS (4 assertions, 0 failures)
- `integration-consent-canary-grant-admission` PASS (36 assertions, 0 failures)
- `integration-consent-canary-retirement` PASS (14 assertions, 0 failures)
- `integration-operations-runner-progress` PASS (31 assertions, 0 failures)
- `integration-operations-sdf` PASS (22 assertions, 0 failures)
- `integration-operations-withdrawal-single-pass` PASS (9 assertions, 0 failures)

## Failures in the latest results

None.

<!-- ROUND9 EVIDENCE START -->
## Round 9 execution boundary

Latest runtime-suite results: **108 PASS, 0 FAILED, 11 NOT_RUN**. Discovery and each targeted attempt remain separately recorded; a later result does not erase its earlier failure. See [the Round 9 handoff](../../handoffs/codex/2026-10-02-round9.md) for causes, fix commits, commands and limitations.

| Additional observed control | Latest result |
|---|---|
| Installed function ACL after protected initialization: six functions, five runtime roles and PUBLIC | `security-function-acl` PASS (46 assertions, 0 failures; includes installation identity and RLS checks) |
| Customer app tables with enabled and forced RLS | 222 inspected by the same ACL suite; no missing table protection in its passing evidence |

The following suites remain NOT_RUN; they are not skipped assertions or substituted local acceptance:

- `tests/e2e/auth.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/e2e/candidate.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/e2e/configuration.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/e2e/consent.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/e2e/test-lab.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/e2e/tls.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/e2e/transport-preflight.ts`: Rehearsal-only HTTPS transport requires the seeded multi-user rehearsal fixture; NOT_RUN, not a local-browser substitute.
- `tests/e2e/workflow.spec.ts`: Canonical rehearsal browser acceptance requires exclusive seeded rehearsal and frozen candidate; single-owner installation preserved; NOT_RUN.
- `tests/integration/lifecycle.test.ts`: Existing rehearsal-only lifecycle remains NOT_RUN: requires seeded business fixtures and exclusive rehearsal supervisor, outside this codex-a00 run.
- `tests/security/network-core.ts`: Requires separately qualified packaged runtime image and controlled canary; existing NOT_RUN retained.
- `tests/security/tls.test.ts`: Rehearsal-only TLS suite requires fixture users incompatible with the clean single-owner installation; existing NOT_RUN retained.

The 1,000-item regulatory-impact boundary was not directly asserted by the existing regulatory suite. Erasure-ledger retention is decided (owner, 2026-10-02): 30 days after backups age out, on every plan; recorded in the revision 1.10 addendum.
<!-- ROUND9 EVIDENCE END -->
