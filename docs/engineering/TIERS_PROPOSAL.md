# ORVIA tiers and subscriptions: proposal for owner decision

**Status:** PROPOSED. Nothing in this document is built or enforced yet. Prices are left for the owner (`₹ —` throughout).
**Date:** 2026-10-02. **Basis:** master Rev 1.4 (M27 Licensing, M28 Entitlements; billing on the vendor website, §658 and §3796), addenda 1.5–1.10, `tracking/capabilities.json`, `tracking/v1-expansion.json`.

## 1. What exists today and what is missing

| Exists | Missing |
|---|---|
| Signed Ed25519 licence, bound to one installation, with validity window, three editions (`FOUNDATION`, `CONTROL`, `ENTERPRISE`), entitlement list, licensed limits (environments, staff, member seats) | **No route enforces entitlements.** `entitlementReport` reports five gates per feature, but no business route or runner job refuses work when a feature is not licensed |
| `NEVER_LICENSABLE` list (AI copilot, vendor remote access, …) rejected at import | Only **8 entitlement codes**, written before the 19 expansion families. Families EX01–EX12 and EX17–EX19 have no code |
| Expiry keeps read and export (FR-M28-03) | No rule that an edition may only carry its own entitlements, so a mis-issued licence (FOUNDATION naming ENTERPRISE features) would be accepted |
| Vendor shop: approved plan versions, orders, manual licence review (EX13) | No mapping from a plan to an edition and entitlements; no interface marking of locked features |

## 2. Principles (proposed, need owner approval)

1. **Legal floor in Tier 1.** Every duty the DPDP Act and Rules place on an ordinary Data Fiduciary must be achievable on Tier 1: notice in the person's language, consent and withdrawal, rights requests (access, correction, erasure, grievance, nomination) within their deadlines, breach notification to the Board and to people, retention and erasure, children's verifiable consent, processor contracts, and the website/app intake channel (Rule 14(1)). Higher tiers sell **automation, scale and assurance**, never the ability to comply. A customer who cannot comply on the plan we sold blames us, and our honest-claims rule forbids implying otherwise.
2. **Protective controls are never gated and never switched off.** Withdrawal enforcement, the canary marketing hold, suppression, rights and breach deadlines, the audit trail, and read and export of everything recorded work on every tier and survive expiry or downgrade. A licence problem may stop new premium work; it may never reactivate marketing or hide evidence (AGENTS rule).
3. **The server decides.** A hidden button is not a guardrail. Every route and runner job declares its entitlement; the server refuses with `403 entitlement_required` naming the plan, and the interface only reflects that decision.
4. **No dark patterns.** No nagging pop-ups, fake scarcity or features that look usable and then fail. Locked features are shown honestly ("Part of Control: verifies that systems actually removed the person"). People upgrade because each tier visibly removes work they are doing by hand. That is the habit loop, done fairly.
5. **Value metrics that never block legal work.** Charge on staff seats, legal entities and environments, connected systems, and websites. **Do not** cap Data Principals or consent events in a way that refuses a rights request or a withdrawal. Over a soft limit, the product warns and the vendor trues up at renewal; it never refuses legal intake.
6. **Customer-local stays customer-local.** There is no vendor telemetry. Usage for renewal comes from the customer exporting the signed limit report (`EntitlementReport.limit_usage`), not from phoning home.

## 3. The three tiers (each includes the one below)

Names reuse the existing editions. Marketing names are the owner's choice.

### Tier 1 — FOUNDATION ("Comply")
For: startups, SMEs, a single company with one website. The promise: everything you legally must do, done properly, with evidence.

| Area | Included | Source |
|---|---|---|
| Access | Staff sign-in with authenticator, roles, audit trail, owner recovery | M01, M33, rev 1.8 |
| Organisation | 1 legal entity, 1 production environment (plus 1 test) | M02 |
| Registry | Systems, purposes, data categories, processing activities (manual); RoPA export | M03 (manual), EX05 basic |
| Consent | Consent and withdrawal records, preferences, expiry, enforcement at send for ORVIA-sent messages, canary trap | M11, EX01 basic, P3 |
| Notices | Versioned notices, all 22 Eighth Schedule languages, drift guard, acknowledgement | M12, NoticeContextDrift |
| Intake | Website/app intake API (Rule 14(1)); optional Privacy Centre | M13, rev 1.7 |
| Rights | All rights request types, deadlines, manual fulfilment with evidence, grievance | M14 |
| Retention | Retention rules, erasure records, backup treatment and ledger | M15, EX07 basic |
| Processors | Processor register, contracts, termination and disposition | M16 basic |
| Breach | Incident register, 72-hour Board report clock, notification templates (sent by staff) | M17, EX09 basic |
| Website | Cookie banner and script blocking for 1 website | EX02 (1 domain) |
| Evidence | Signed evidence, exports, notifications by email | M08, M10 |
| Platform | Onboarding, updates, support bundle, monitoring | M29–M32 |
| **Limits** | 5 staff seats, 1 entity, 1 production environment, 1 website, 2 connected systems | licence |

### Tier 2 — CONTROL ("Automate and verify") = Tier 1 +
For: growing companies with several systems and teams. The promise: stop doing it by hand, and prove each system actually did what it was told.

| Area | Added | Source |
|---|---|---|
| Real-time enforcement | Send-admission API for the organisation's own mailers and systems (block in milliseconds) | M04 |
| Automation | Workflow engine, connectors, downstream actions | M05, M06 |
| Verification | Independent read-back that systems really suppressed or erased (telemetry verification) | M07 |
| Coverage | Coverage and failure centre, Operations attention at full depth | M18 |
| Rights at scale | Response packages, redaction, expiring delivery links | EX03 |
| Discovery | PostgreSQL catalog discovery, schema drift, classification, website policy discovery | EX04, F1 |
| Assessments | Questionnaires, DPIA, remediation and retest | EX06 |
| Third parties | Supplier questionnaires by link, reassessment schedule | EX08 |
| Delivery | Organisation's own SMTP/webhook transports with retries and receipts | EX09 delivery |
| Retention | Legal holds, restore re-erasure, restore coverage review | EX07 full |
| Website | Up to 5 websites | EX02 |
| **Limits** | 25 seats, 3 entities, 3 production environments, 5 websites, 15 connected systems | licence |

### Tier 3 — ENTERPRISE ("Assure") = Tier 2 +
For: large groups, regulated sectors, Significant Data Fiduciaries. The promise: board- and auditor-ready assurance, continuously.

| Area | Added | Source |
|---|---|---|
| Regression gate | Privacy test engine and CI/CD regression gate | M09, EX11 |
| Continuous compliance | Scheduled control tests, drift alerts, issues | EX11 |
| GRC | Policies, control mapping, audit workspace | EX10 |
| Data security and AI | Data security posture, AI use inventory, custom-model version governance | EX12 |
| External audit | DPDPA audit exchange, audit mandate, continuous assurance channel | EX17, EX18 |
| Scale and identity | Unlimited entities and environments; SSO/SCIM when delivered (GO_LIVE D1); 1M-record scale | M01, M02 |
| Support | Priority support terms | commercial |
| **Limits** | Seats, entities, systems and websites by contract | licence |

### Add-ons (any tier, priced separately)
Extra websites, extra seats, extra connected systems, and the DPDPA audit engagement itself (a vendor service under EX19, sold by engagement rather than as a customer feature).

### Not sold at any tier
`NEVER_LICENSABLE` stays as it is: AI copilot and the other V2 model functions, vendor remote access, directory sync, proactive diagnostics, runtime replication. Billing remains on the vendor website (M26 stays not implemented in the customer product).

## 4. Guardrails to build (after approval)

1. **Entitlement vocabulary.** Expand `EntitlementCode` to one code per gated area above (about 20; raise the 16 limit). Contract minor version bump.
2. **Edition ceiling.** At import, the installation refuses a licence whose entitlements exceed its edition's allowed set (new rejection `ENTITLEMENT_EXCEEDS_EDITION`), so a vendor issuing mistake cannot open Tier 3 to a Tier 1 customer.
3. **Route declarations.** Every route in the canonical route table declares `entitlement` (or `PROTECTIVE`, never gated). A unit invariant fails the build if any route is undeclared, or if a protective route is gated.
4. **Server enforcement.** The API dispatcher checks the entitlement before the capability; runner jobs check before acting. Refusal: `403 entitlement_required` with the plan that includes it. Reads and exports stay open after downgrade or expiry.
5. **Limits.** Enforce seats (already), entities, environments, websites and connected systems at creation time. Never refuse a rights request, withdrawal or breach record for a limit.
6. **Interface.** Navigation and screens read the entitlement report: locked items show a plan badge and a one-line value statement, with no dead buttons. A "Your plan" page shows usage against limits and what each higher tier adds.
7. **Vendor side.** Each approved plan version maps to an edition, entitlements and limits; licence issuance takes them from the plan, not from free text, still with the existing manual review.
8. **Tests.** For each tier, a suite that walks every route as a Tier 1, 2 and 3 installation and asserts allowed or refused. Plus downgrade and expiry tests proving protective controls still work and data stays readable.

## 5. Open questions for the owner

1. Approve the legal-floor principle (all statutory duties on Tier 1)?
2. Significant Data Fiduciaries: must they buy Tier 3, since DPIA, periodic audit and the DPO duties are statutory for them? (Proposal: the vendor will not sell Tier 1 or 2 to a designated SDF; the product shows a warning if the organisation profile says SDF on a lower tier.)
3. Value metrics and limits in the tables: accept, or change?
4. Trials: a time-limited signed Tier 2/3 licence (for example 30 days) that falls back to the paid tier without losing data?
5. Marketing names for the three tiers.
6. Prices (owner sets later).

## Sources consulted (market patterns)
- Osano and Ketch publish entry tiers metered on domains and visitors, with DSAR, data mapping and assessments reserved for higher or custom tiers: [Enzuzo comparison](https://www.enzuzo.com/blog/osano-competitors-alternatives), [OneTrust vs Ketch](https://www.enzuzo.com/alternatives/onetrust-vs-ketch).
- Indian DPDP tools price from about ₹2,499–₹5,999 a month for SMEs, with free tiers capped on consent volume, while enterprise suites run into tens of lakhs a year: [Consently cost breakdown](https://www.consently.in/blog/dpdp-act-compliance-cost-india-2026), [ConsentOS buyer's guide](https://consentos.in/learn/dpdp-compliance-software/), [Redacto CMP list](https://www.redacto.ai/en-in/blogs/consent-management-platform-india).
