# ORVIA V1 verification matrix

Generated from executed battery summaries on the codex-a00 development profile (synthetic data only), source `2ea335f`. A suite with no execution in these batteries is shown NOT_RUN. PASS means the suite exited 0 with every assertion passing on this host; it is not release qualification, production qualification or acceptance by Codex.


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
- **Scenarios executed** (`integration-consent-canaries`):
  - a decoy customer who never consented is planted in the marketing list and the CRM;
  - one owner registers the decoy and a different person activates it, so self-activation is refused;
  - a decoy holding a granted consent cannot be activated;
  - a send admission to the decoy is BLOCKED, the sender is not told why, and a hit names the sending machine and system;
  - a message addressed to the decoy is recorded as a hit without being refused, so its author cannot probe for canaries;
  - an operator recording consent for the decoy leaves a hit;
  - staff record the decoy mailbox receiving a newsletter, with evidence;
  - Operations attention shows the count to administrators who cannot see the canaries;
  - each hit is reviewed once, and hits cannot be edited or deleted;
  - a retired canary traps nothing;
  - another tenant sees none of it.
- **Not claimed:** inside ORVIA a hit is detected automatically. Outside ORVIA (the client's own mailers) a hit is known only when staff report the decoy mailbox receiving something.

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


## Important functions

| Function | Suites executed (latest result) |
|---|---|
| Regulatory package import and review | `integration-operations-regulatory` PASS (32 assertions, 0 failures) |
| Applicability evaluation, including unknown results | `integration-operations-applicability` PASS (18 assertions, 0 failures) |
| Principal and representative registry | `integration-operations-registry` PASS (47 assertions, 0 failures)<br>`integration-rights-rights` PASS (64 assertions, 0 failures) |
| Processing activity registry | `integration-operations-registry` PASS (47 assertions, 0 failures)<br>`integration-expansion-ropa-exports` PASS (58 assertions, 0 failures) |
| Dry run and execution approval | `integration-operations-rights` PASS (26 assertions, 0 failures)<br>`integration-operations-correction` PASS (12 assertions, 0 failures)<br>`integration-operations-retention-scale` PASS (16 assertions, 0 failures)<br>`integration-operations-runner` PASS (10 assertions, 0 failures) |
| Current-at-effect checks | `integration-operations-runner` PASS (10 assertions, 0 failures)<br>`integration-processors-assessment-race` PASS<br>`integration-consent-expiry` PASS<br>`integration-updates-updates` PASS (54 assertions, 0 failures) |
| Replay and idempotency protection | `integration-consent-consent` PASS<br>`integration-enforcement-send` PASS<br>`security-auth` PASS |
| Unknown-effect reconciliation | `integration-operations-consent-withdrawal` PASS (38 assertions, 0 failures)<br>`integration-workflows-workflow` PASS |
| Redaction and response review | `integration-expansion-response-packages` PASS (52 assertions, 0 failures)<br>`integration-rights-rights` PASS (64 assertions, 0 failures) |
| Secure response delivery (expiry, revocation) | `integration-expansion-response-packages` PASS (52 assertions, 0 failures) |
| Source freshness and drift | `integration-discovery-schema-drift` PASS (10 assertions, 0 failures)<br>`integration-discovery-catalog-flow` PASS (58 assertions, 0 failures)<br>`integration-expansion-policy-discovery` PASS (30 assertions, 0 failures) |
| Classification quality measurement | `integration-expansion-classification` PASS (29 assertions, 0 failures) |
| Access-exposure findings | `integration-expansion-classification` PASS (29 assertions, 0 failures) |
| Risk treatment and issue lifecycle | `integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-grc-grc` PASS |
| Evidence freshness and scope checks | `integration-vendor-audit-practice` PASS (112/112 passed)<br>`integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-grc-audits` PASS |
| Audit sampling with an auditor-provided seed | `integration-vendor-audit-practice` PASS (112/112 passed) |
| Signed audit delivery chain | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Mandate suspension, expiry and revocation | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Vendor visibility history | `integration-monitoring-vendor-visibility` PASS (18 assertions, 0 failures)<br>`integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Continuous assurance mandate | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures) |
| Verified payment events (duplicates, out of order) | `integration-commerce-commerce` PASS |
| Reviewed licence issuance | `integration-commerce-commerce` PASS<br>`integration-licensing-licensing` PASS (33 assertions, 0 failures) |

## Modules (master register)

| Module | Name | Product | Tracked status | Suites executed (latest result) |
|---|---|---|---|---|
| M01 | Identity and Access Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `security-auth` PASS<br>`integration-expansion-staff-members` PASS (37 assertions, 0 failures)<br>`integration-expansion-staff-delete` PASS (27 assertions, 0 failures)<br>`e2e-sign-in-hydration` PASS (20 assertions, 0 failures)<br>`e2e-team` PASS (8 assertions, 0 failures)<br>`e2e-delete-login` PASS (14 assertions, 0 failures) |
| M02 | Tenant Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `security-auth` PASS<br>`security-fixture-isolation` NOT_RUN<br>`integration-consent-consent` PASS |
| M03 | Privacy Control Graph | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-graph-graph` PASS (46 assertions, 0 failures)<br>`security-graph-source-binding` NOT_RUN<br>`integration-evidence-reports` PASS (24 assertions, 0 failures)<br>`integration-discovery-catalog-flow` PASS (58 assertions, 0 failures)<br>`integration-discovery-schema-drift` PASS (10 assertions, 0 failures) |
| M04 | Policy Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-enforcement-send` PASS<br>`integration-enforcement-withdrawal-timing` PASS (11 assertions, 0 failures)<br>`integration-opa-cold-start` PASS (8 assertions, 0 failures)<br>`integration-consent-consent` PASS |
| M05 | Workflow Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-workflows-workflow` PASS<br>`integration-operations-runner` PASS (10 assertions, 0 failures) |
| M06 | Connector Framework | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-workflows-workflow` PASS<br>`integration-onboarding-connection` PASS (33 assertions, 0 failures)<br>`integration-discovery-postgres-catalog` PASS (13 assertions, 0 failures) |
| M07 | Verification Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-evidence-evidence` PASS<br>`integration-operations-consent-withdrawal` PASS (38 assertions, 0 failures)<br>`integration-workflows-workflow` PASS |
| M08 | Evidence Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-evidence-evidence` PASS<br>`integration-evidence-reports` PASS (24 assertions, 0 failures) |
| M09 | Privacy Test Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-regression-regression` PASS |
| M10 | Notification Engine | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-notifications-notifications` PASS (31 assertions, 0 failures)<br>`integration-expansion-delivery` PASS (41 assertions, 0 failures) |
| M11 | Consent Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-consent-consent` PASS<br>`integration-consent-expiry` PASS<br>`integration-consent-canaries` PASS (24 assertions, 0 failures)<br>`integration-operations-consent-manager` PASS (12 assertions, 0 failures)<br>`integration-operations-consent-withdrawal` PASS (38 assertions, 0 failures)<br>`integration-expansion-preferences` PASS (45 assertions, 0 failures)<br>`integration-expansion-cmp` PASS (45 assertions, 0 failures) |
| M12 | Notice Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-notices-languages` PASS (19 assertions, 0 failures)<br>`integration-operations-notices` PASS (15 assertions, 0 failures)<br>`integration-operations-notice-language-drift` PASS (20 assertions, 0 failures)<br>`integration-expansion-policy-discovery` PASS (30 assertions, 0 failures) |
| M13 | Data Principal Portal | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-rights-portal` PASS (19 assertions, 0 failures)<br>`integration-operations-organisation-intake` PASS (44 assertions, 0 failures)<br>`e2e-preferences` PASS (10 assertions, 0 failures) |
| M14 | Rights Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-rights-rights` PASS (64 assertions, 0 failures)<br>`integration-rights-portal` PASS (19 assertions, 0 failures)<br>`integration-operations-rights` PASS (26 assertions, 0 failures)<br>`integration-operations-correction` PASS (12 assertions, 0 failures)<br>`integration-operations-erasure-intimation` PASS (15 assertions, 0 failures)<br>`integration-expansion-response-packages` PASS (52 assertions, 0 failures) |
| M15 | Retention Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-retention-retention` PASS (45 assertions, 0 failures)<br>`integration-operations-retention-scale` PASS (16 assertions, 0 failures)<br>`integration-operations-backup-obligations` PASS (22 assertions, 0 failures) |
| M16 | Processor/Vendor Management | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-processors-processors` PASS (35 assertions, 0 failures)<br>`integration-processors-assessment-race` PASS<br>`integration-operations-processors` PASS (14 assertions, 0 failures)<br>`integration-expansion-third-party` PASS (43 assertions, 0 failures) |
| M17 | Privacy Incident Explorer | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-incidents-incidents` PASS (42 assertions, 0 failures)<br>`integration-operations-breach` PASS (19 assertions, 0 failures) |
| M18 | Coverage and Failure Center | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-coverage-coverage` PASS (56 assertions, 0 failures) |
| M19 | AI Privacy Copilot | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M20 | AI Discovery | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M21 | AI Policy Builder | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M22 | AI Workflow Builder | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M23 | AI Risk/Drift Analysis | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M24 | AI Test Generation | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M25 | AI Incident Analysis | V2 (deferred) | DEFERRED_V2 | Not built in V1 by rule: no shipped model, hosted model or training |
| M26 | Billing | V1 | NOT_IMPLEMENTED | `integration-commerce-commerce` PASS<br>`integration-commerce-migration-ledger` PASS |
| M27 | Licensing | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-licensing-licensing` PASS (33 assertions, 0 failures) |
| M28 | Entitlements | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-licensing-licensing` PASS (33 assertions, 0 failures) |
| M29 | Customer Onboarding | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-onboarding-first-run` PASS (23 assertions, 0 failures)<br>`integration-onboarding-first-run-http` PASS (7 assertions, 0 failures)<br>`integration-onboarding-connection` PASS (33 assertions, 0 failures)<br>`integration-onboarding-preflight` PASS (20 assertions, 0 failures)<br>`integration-onboarding-imports` PASS (31 assertions, 0 failures)<br>`integration-operations-estate-import` PASS (18 assertions, 0 failures)<br>`integration-onboarding-owner-recovery` PASS (26 assertions, 0 failures)<br>`integration-onboarding-real-principals` PASS (25 assertions, 0 failures) |
| M30 | Support Bundle System | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-support-support` PASS (57 assertions, 0 failures) |
| M31 | Updates | V1 | IMPLEMENTED_SANDBOX_SUBSET | `integration-updates-updates` PASS (54 assertions, 0 failures)<br>`integration-migration-upgrade` PASS (10 assertions, 0 failures) |
| M32 | Monitoring | V1 | PARTIAL_SANDBOX | `integration-monitoring-monitoring` PASS (31 assertions, 0 failures)<br>`integration-monitoring-restore` PASS (33 assertions, 0 failures)<br>`integration-monitoring-backup-drill` PASS (5 assertions, 0 failures)<br>`integration-monitoring-vendor-visibility` PASS (18 assertions, 0 failures)<br>`e2e-backups-and-recovery` PASS (12 assertions, 0 failures) |
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
| EX07 | Retention holds deletion and backup obligations | BUILT_PENDING_REVIEW | `integration-operations-backup-obligations` PASS (22 assertions, 0 failures)<br>`integration-operations-retention-scale` PASS (16 assertions, 0 failures)<br>`e2e-backups-and-recovery` PASS (12 assertions, 0 failures) |
| EX08 | Third-party lifecycle | BUILT_PENDING_REVIEW | `integration-expansion-third-party` PASS (43 assertions, 0 failures) |
| EX09 | Incidents and reviewed notification | BUILT_PENDING_REVIEW | `integration-expansion-delivery` PASS (41 assertions, 0 failures)<br>`integration-operations-breach` PASS (19 assertions, 0 failures) |
| EX10 | Enterprise GRC and audit | BUILT_PENDING_REVIEW | `integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-grc-grc` PASS<br>`integration-grc-audits` PASS<br>`integration-grc-http` PASS |
| EX11 | Continuous compliance and control tests | BUILT_PENDING_REVIEW | `integration-expansion-grc-lifecycle` PASS (75 assertions, 0 failures)<br>`integration-regression-regression` PASS<br>`policy-gate` NOT_RUN |
| EX12 | Data security posture and AI governance | BUILT_PENDING_REVIEW | `integration-ai-governance-ai-governance` PASS (32 assertions, 0 failures)<br>`integration-ai-governance-monitor` PASS (9 assertions, 0 failures)<br>`integration-ai-governance-model-versions` PASS (21 assertions, 0 failures)<br>`e2e-ai-governance` PASS |
| EX13 | Vendor commerce UPI and cards | IN_PROGRESS | `integration-commerce-commerce` PASS<br>`integration-commerce-migration-ledger` PASS |
| EX14 | Enterprise delivery and release qualification | IN_PROGRESS | `integration-opa-cold-start` PASS (8 assertions, 0 failures)<br>`integration-migration-upgrade` PASS (10 assertions, 0 failures)<br>`integration-monitoring-backup-drill` PASS (5 assertions, 0 failures)<br>`security-tls` NOT_RUN: runs only on the rehearsal (customer) profile, whose single first-run owner forbids seeding the fixture users it needs<br>`security-network-core` NOT_RUN<br>`e2e-interface-crawl` PASS (1 assertions, 0 failures) |
| EX15 | Installation kinds | BUILT_PENDING_REVIEW | `integration-web` PASS<br>`integration-vendor-schema-equivalence` PASS (7/7 passed) |
| EX16 | Vendor area in the same application | BUILT_PENDING_REVIEW | `integration-vendor-vendor-audit` PASS (74/74 passed)<br>`e2e-vendor-production-criteria` PASS (11 assertions, 0 failures) |
| EX17 | DPDPA audit exchange | BUILT_PENDING_REVIEW | `integration-expansion-dpdpa-audit` PASS (56 assertions, 0 failures)<br>`integration-expansion-audit-indicator-counts` PASS (21/21 passed)<br>`e2e-dpdpa-audit` PASS (23 assertions, 0 failures) |
| EX18 | Audit mandate and outbound channel | BUILT_PENDING_REVIEW | `integration-expansion-audit-mandate` PASS (102 assertions, 0 failures)<br>`e2e-audit-mandate` PASS (19 assertions, 0 failures) |
| EX19 | DPDPA audit practice | BUILT_PENDING_REVIEW | `integration-vendor-audit-practice` PASS (112/112 passed) |

## Other suites executed

- `e2e-expansion-screens` PASS 69 assertions, 0 failures.
- `e2e-operations-screens` PASS 30 assertions, 0 failures.
- `e2e-registry-forms` PASS 16 assertions, 0 failures.
- `integration-bootstrap` PASS 
- `integration-operations-sdf` PASS 22 assertions, 0 failures.

## Failures in the latest results

None.
