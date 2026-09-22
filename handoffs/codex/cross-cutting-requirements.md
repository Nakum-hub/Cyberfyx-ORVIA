# The 17 requirements nothing in this repository tracks

The build pack carries **121 requirements**. 104 of them are the 26 non-AI
modules at four each, and those are represented in `tracking/capabilities.json`.
The remaining **17 are attributed to no module and to no work package**:
`FR-X-01` to `FR-X-07` and `NFR-01` to `NFR-10`, each with `"module": null` and
`"work_packages": []` in the pack's `traceability.json`.

Nothing in this repository mentions any of them. `git grep -E "FR-X-0|NFR-0"`
returns nothing across every tracked file. The capability register is fixed at
33 modules by its own validator, `tracking/tasks.json` is the 23-task work
breakdown and `tracking/acceptance.json` is the 34-test candidate board, so
there is no existing place a requirement-level status could live. That is why
this is a document rather than a tracker change: recording a requirement as
unmet is not a delivery claim, but inventing a fourth tracking file would be a
governance change that is not mine to make.

**Nothing below promotes anything.** Where a check was run in this pass the
artifact is named; where it was not, the status is `NOT_ASSESSED` and stays
`NOT_ASSESSED`.

## Non-functional requirements

| Id | What it requires | Status | Evidence or blocker |
|---|---|---|---|
| NFR-01 | Isolation across authority domains, tenants, legal entities, environments, APIs, queues, object paths, exports and caches, with denied paths tested | **Evidenced in part** | `test:isolation` passed (`A00-fixture-isolation-1790036069701-*`). Every scoped table uses RLS with capability predicates, and the M30/M31 suites assert refusal for an under-privileged actor. Not assessed: object paths, queues, search and caches as named categories. |
| NFR-02 | Durability for accepted events and safe repeated delivery, with crash, restart and replay tests rather than a diagram-based exactly-once claim | **Evidenced** | `test:regression`, 70 assertions, 0 failures (`A00-regression-integration-1790034659889-*`), including that an interrupted run stays durable, becomes an explicit ERROR, and creates no success fallback. |
| NFR-03 | Security controls, no unresolved applicable Critical/High findings, independent defined-scope review and retest, no score-only waiver of boundary defects | **Blocked** | The independent review is task `W02`, which is `BLOCKED`. `dependencies:check` was not run in this pass. An independent review is by definition not something this build can perform on itself. |
| NFR-04 | Locality covering UI assets, telemetry, support drafts, histories, backups and imported payloads, with no covert expansion into operational data through a permitted schema | **Evidenced** | `test:network` passed against the current source (`A06-network-qualification-1790036577761-*`): the isolated runtime reached no controlled external endpoint and issued no unexpected DNS query, while the backend core still succeeded under blocked egress. `hygiene:check` examines 55 browser bundle files and reports 0 findings. M30 is the support-draft case and keeps it by schema. |
| NFR-05 | Accessible keyboard and screen-reader flows, plain-language outcomes, language, version and timezone support, tested browser matrix | **NOT_ASSESSED** | Blocked on `OPEN-14` (accessibility, languages and branding). The pack states that a quantitative conformance claim requires an assessment, so no claim is made here. |
| NFR-06 | Control-plane p95 under 500 ms, simple local policy p95 under 100 ms, connected marketing propagation p95 under 30 s, benchmarked with a defined workload and hardware | **NOT_ASSESSED** | Blocked on `OPEN-12` (performance, capacity and operational budgets). The pack is explicit that these are illustrative targets and not already-achieved metrics. |
| NFR-07 | Recovery objectives set per supported profile and data class and measured; restore reconciles current restrictions and authority before resuming | **NOT_ASSESSED** | Blocked on `OPEN-09` (persistence and current-safety recovery). No RPO or RTO is stated anywhere in this repository, which is correct — the pack forbids inventing one. |
| NFR-08 | Signed, reproducible, versioned packages, migration, workflow and connector compatibility, documented unsupported profiles and upgrade recovery | **Evidenced in part** | `runtime:build` now completes from tracked files alone (`A00-runtime-image-1790036537521-*`); it did not before this pass, see below. M31 covers versioned releases, migration compatibility and forward upgrade recovery, and is qualified. Not assessed: build reproducibility as a measured property, and profiles other than `CUSTOMER_LOCAL_SYNTHETIC`. |
| NFR-09 | Local rate limits, concurrency and load budgets and circuit breaking to protect customer systems, with limits set by measurement and customer permission | **Evidenced in part** | Authentication rate limits are real and enforced: the integration fixtures wait out the genuine idle window rather than relaxing them (`packages/testing/src/auth-window.ts`). Not assessed: connector concurrency and load budgets, and circuit breaking, both of which need `OPEN-12`. |
| NFR-10 | Explainable minimum code; no unused production files, duplicated state models, uncontrolled dependency additions or fake implementations | **Evidenced in part, with one finding** | `lint` 0 findings and `hygiene:check` 0 findings across 2869 files. The finding is in the other direction and is recorded at `5b91d7c`: an unanchored `.gitignore` rule had excluded the whole of M18 from the repository, and every check in the suite passed against a working tree that was not the repository. The inventory checks were weaker than they looked. |

## Cross-cutting functional requirements

| Id | What it requires | Status | Note |
|---|---|---|---|
| FR-X-01 | Control packages bundling applicability, policy, adapter needs, tests, evidence schema and declared limitations, mapped, reviewed and tested by the customer before activation | **Not built** | No control-package concept exists in the contract or the database. The constituent parts exist separately — policies, assessments, tests, evidence, declared limitations on every response — but nothing bundles them into an activatable unit. |
| FR-X-02 | Change simulation showing affected purposes, notices, systems, copies, tests and owners with assumptions and graph coverage limitations, performing no hidden production mutation | **Partly built** | `ImpactAssessment` (M03) and the decision preview screen (M04) each answer part of this and both state their own coverage limits. Neither mutates. Not built: a single simulation spanning all six listed subjects at once. |
| FR-X-03 | Assessments, findings and remediation connected to controls and closure evidence; applicable SDF and guardian safeguards requiring source-reviewed decisions | **Partly built** | M16 carries assessments, findings and closure-by-evidence, and M18 carries gaps closed by evidence or an owned risk acceptance. Not built: the connection from a finding to the specific control it concerns, and the SDF and guardian safeguards. |
| FR-X-04 | A complete signed ZIP product from vendor distribution for supported server, Kubernetes and offline profiles, with customer-controlled operation and keys common to editions | **Not built for the named profiles** | This installation supports `CUSTOMER_LOCAL_SYNTHETIC` only, and the contract admits no other value, so server, Kubernetes and offline profiles are absent by construction rather than by omission. Customer-controlled keys are real: both the licence and release signing keys are supplied by configuration with no default. |
| FR-X-05 | Customer exports and offboarding that stay local and usable, revoke integrations and identities safely and preserve required records; vendor-held business deletion under its separate policy | **Partly built** | Evidence export exists and is local (M08, `evidence.export` capability). Not built: offboarding as a flow, and safe revocation of integrations and identities. No repository file mentions offboarding. |
| FR-X-06 | Optional Guided Assistance using rules, templates and local search, unable to delay required errors, manual support or core operation | **Partly built** | M18 gap guidance is rules-based, local, and labels itself advice rather than a finding; it sits beside the gap and delays nothing. Not built: templates and local search as an assistance surface. |
| FR-X-07 | Vendor readiness content collecting only fields admitted by the minimum-data contract, with the source tension about system and maturity questions treated as an OPEN review rather than permission for inventory upload | **Not built, and correctly so** | Blocked on `OPEN-15` (readiness questionnaire versus minimum-data boundary). Nothing here collects readiness content, which is the right state while the boundary is unresolved — building it first would be the precise mistake the requirement warns against. |

## What this adds up to

Of the 17, **four are evidenced or largely evidenced** (NFR-01, NFR-02, NFR-04,
NFR-08), **four more are partly evidenced** (NFR-09, NFR-10, and the partly-built
FR-X-02 and FR-X-03), **five are blocked on OPEN decisions** the build rules
forbid inventing (NFR-03 on `W02`, NFR-05 on `OPEN-14`, NFR-06 on `OPEN-12`,
NFR-07 on `OPEN-09`, FR-X-07 on `OPEN-15`), and **four are genuinely unbuilt
features** with no blocker other than nobody having built them: FR-X-01 control
packages, FR-X-04 non-local deployment profiles, FR-X-05 offboarding, and the
assistance surface in FR-X-06.

The four unbuilt features are the only part of this list that is an ordinary
backlog. Everything else is either done, measured as done, or waiting on a
decision that is not an engineering decision.
