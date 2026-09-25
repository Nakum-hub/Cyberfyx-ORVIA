# ORVIA V1 — Post-Build Test Pack (500 test cases + 200 business scenarios)

**Purpose:** Test ORVIA thoroughly once the V1 build is finished. The pack is written to be strict and unbiased, and it runs against DPDPA 2023, the DPDP Rules 2025 as mapped in the approved master, and the ORVIA build-pack requirements.
**Status:** Every case and scenario is **NOT_RUN**. This folder holds specifications, not evidence. Do not execute until the build is declared complete.
**Prepared:** 23 September 2026, from `ORVIA_V1_Agent_Build_Pack/` (PRD, TEST_AND_ACCEPTANCE, API_AND_EVENT_CONTRACTS, DATA_MODEL, USER_FLOWS) and the master's "DPDP legal-to-product baseline" section.

## Contents

| Path | What | Count |
|---|---|---|
| `test_cases/01…29_*.md` | Module- and area-level test cases (TC-001 – TC-500) | 500 |
| `scenarios/01…05_*.md` | End-to-end business scenarios across industries (SC-001 – SC-200) | 200 |
| `tracker.csv` | One row per TC/SC with execution columns (Status, Build, Rule pack, Actual, Evidence) | 700 |
| `build_tracker.mjs` | Regenerates `tracker.csv` from the markdown (run `node 500_test_cases/build_tracker.mjs`) | — |

### Test case files

| File | Area | IDs |
|---|---|---|
| 01 | Identity & Access (M01) | TC-001 – 025 |
| 02 | Tenant management & isolation (M02) | TC-026 – 045 |
| 03 | Privacy Control Graph (M03) | TC-046 – 060 |
| 04 | Policy engine & lawful basis (M04; Act §4, §6, §7) | TC-061 – 085 |
| 05 | Workflow engine (M05) | TC-086 – 105 |
| 06 | Connector framework & agent (M06) | TC-106 – 130 |
| 07 | Verification engine (M07) | TC-131 – 145 |
| 08 | Evidence engine (M08) | TC-146 – 165 |
| 09 | Privacy test engine (M09) | TC-166 – 177 |
| 10 | Notification engine (M10) | TC-178 – 189 |
| 11 | Consent management (M11; Act §6) | TC-190 – 224 |
| 12 | Notice management (M12; Act §5, Rule 3) | TC-225 – 244 |
| 13 | Data Principal portal (M13) | TC-245 – 264 |
| 14 | Rights management (M14; Act §11–15, Rule 14) | TC-265 – 299 |
| 15 | Children & guardians (Act §9) | TC-300 – 314 |
| 16 | Retention (M15; Act §8(7)–(8), Rule 8, Rule 6) | TC-315 – 336 |
| 17 | Processors & Significant Data Fiduciary (M16; Act §8(2), §10, Rule 13) | TC-337 – 352 |
| 18 | Incidents (M17; Act §8(6), Rule 7, CERT-In) | TC-353 – 374 |
| 19 | Coverage & failure center (M18) | TC-375 – 386 |
| 20 | Billing, licensing, entitlements (M26–M28) | TC-387 – 404 |
| 21 | Onboarding & imports (M29) | TC-405 – 416 |
| 22 | Support bundle (M30) | TC-417 – 428 |
| 23 | Updates (M31) | TC-429 – 438 |
| 24 | Monitoring, backup & restore (M32) | TC-439 – 448 |
| 25 | Audit administration (M33) | TC-449 – 458 |
| 26 | Data locality, egress, V1 model-free | TC-459 – 470 |
| 27 | Application security (Act §8(5), Rule 6) | TC-471 – 486 |
| 28 | Accessibility, language, UX states | TC-487 – 494 |
| 29 | Performance & fault tolerance | TC-495 – 500 |

Priority split: **303 P0** (release-blocking: isolation, fail-open, leakage, legal core), **177 P1**, **20 P2**.
Types: FUNC functional · NEG negative · SEC security · CONC concurrency · REC recovery/durability · LEGAL DPDPA obligation · UX · PERF · E2E.

### Scenario files (business perspectives)

| File | Sectors | IDs |
|---|---|---|
| 01 | E-commerce, retail, D2C, quick commerce, food delivery, loyalty | SC-001 – 040 |
| 02 | Banking, NBFC, insurance, fintech/UPI, microfinance, brokerage | SC-041 – 080 |
| 03 | Healthcare, pharma, EdTech/children, gaming, social media/SDF | SC-081 – 120 |
| 04 | Telecom, HR, travel/hospitality, logistics, real estate, automotive, OTT, B2B SaaS, NGO, gig, public-function contexts | SC-121 – 160 |
| 05 | Operational, adversarial, lifecycle, vendor boundary, release sign-off | SC-161 – 200 |

## Rules for executing this pack (no assumptions, no bias)

1. **Nothing is PASS until it has run.** Record each result in `tracker.csv` (or the project's existing candidate-evidence mechanism). Use PASS, FAIL, BLOCKED (with cause), NOT_RUN, NOT_APPLICABLE (with reason) or DEFERRED_V2. A command blocked by Docker, identity or setup problems is BLOCKED, not PASS.
2. **Legal values come from the reviewed rule pack, never from memory.** Some cases name the master's mapped values: Rule 7's 72-hour detailed Board report, Rule 8's 48-hour inactivity-erasure warning, Rule 14's grievance ceiling of 90 days or less, the one-year log retention in Rules 6 and 8(3), and CERT-In's 6 hours. Those are references only. The master requires counsel-approved calendar deadlines and commencement status (phased: Consent Manager provisions and principal operational provisions have separate commencement dates). Record the rule-pack version in every LEGAL result. If the pack is missing, the result is BLOCKED.
3. **Sector retention periods** (KYC/AML, tax, health records, telecom CDRs, and so on) are the customer's counsel's inputs. Scenarios test that ORVIA *honours the configured value*; they do not assert what the value should be.
4. **Only fictional organisations and synthetic principals.** Never point a destructive case at real or production records. Prove the target scope first, as TEST_AND_ACCEPTANCE §3 requires.
5. **Record expected versus actual per assertion**, plus the exact commit, package digest, profile, command, timestamp, reviewer and evidence reference. Keep failed runs; don't overwrite them.
6. **Separate facts stay separate.** A control FAIL detected correctly is still a control FAIL. Acknowledgement is not verification. CLOSED is not erasure. Integrity is not truth.
7. **Hidden UI is not absence.** For excluded features (remote access, proactive diagnostics, staff sync, employee monitoring, V2 AI), test the API, configuration, licence, jobs, upgrades and restore paths.
8. **No release waiver** for any known cross-tenant disclosure, uncontrolled destructive operation, customer-data egress or unresolved Critical/High finding.
9. **Human review stays human.** LEGAL cases about notice wording, translations, exemptions and SDF applicability need a qualified reviewer's sign-off in the result. An automated check alone is not a pass.
10. **Conditional scope.** Children's-data cases apply where the customer processes children's data. Crypto deletion and Consent Manager interoperability apply only if shipped; otherwise, test that the product makes no claim about them.

## Relationship to existing acceptance IDs

The master's §217 IDs (T01–T64, UX-01–20, ROLE-01–10, SUP-01–10, V1-01–18, VM-01–24, BUILD-01–22) are referenced in the `Ref` column. This pack **extends** those; it does not replace or renumber them. When a TC maps to a master ID, both results must agree. A disagreement is a finding to investigate.

## Suggested run order after build completion

1. P0 SEC and isolation (files 01, 02, 27, 26)
2. P0 consent, withdrawal and policy (04, 05, 11)
3. Rights, children, retention, incidents (14, 15, 16, 18)
4. Everything else in the test cases
5. Scenarios SC-001 – SC-200
6. SC-200 last, as the release sign-off rehearsal
