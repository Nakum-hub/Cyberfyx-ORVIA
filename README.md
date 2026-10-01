# ORVIA Version 1

**ORVIA — Observe · Review · Verify · Inspect · Assure**

ORVIA is Cyberfyx's customer-local privacy control platform for the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025. A client organisation runs ORVIA in its own environment to operate its DPDPA programme. **Cyberfyx Consulting** uses the same product, in a separate vendor installation, to audit that organisation against the Act and Rules.

The name describes how the product works:

| | Step | What ORVIA does |
|---|---|---|
| **O** | **Observe** | Reads the organisation's own records and systems: consent, requests, breaches, processors, retention, data inventory. |
| **R** | **Review** | Puts every consequential action (erasure, disclosure, audit mandate, evidence release, report) before a second person. |
| **V** | **Verify** | Checks each outcome independently by reading the target back. An acknowledgement is never treated as proof. |
| **I** | **Inspect** | Gives the auditor signed, chained, personal-data-free evidence to examine, delivered outbound only. |
| **A** | **Assure** | Issues the audit opinion as of a date for a stated scope. It is never a certificate. |

The approved product baseline is [master revision 1.4](ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md), extended by these owner decisions:
- [revision 1.5](docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md): DPDPA audit exchange and the vendor installation;
- [revision 1.6](docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md): audit mandate, signed evidence and the outbound-only channel;
- [the V1 expanded baseline](docs/engineering/V1_EXPANDED_BASELINE.md);
- [revision 1.7](docs/engineering/V1_BASELINE_REV_1_7_ORGANISATION_INTAKE.md): the organisation's own website or app sends consent changes and privacy requests to ORVIA; the Privacy Centre is optional.

Earlier prototype documents are historical evidence only.

**Release status: BUILD_IN_PROGRESS — NOT_RELEASE_QUALIFIED.** Everything below runs on synthetic data and is exercised by the tests named in the handoffs. It is not yet qualified for a real client. The steps that remain are listed in [Going live](#going-live) and in [production readiness](docs/engineering/PRODUCTION_READINESS.md).

## Two installations, one product

| Installation | Who runs it | What it does |
|---|---|---|
| **Client installation** (`CUSTOMER_INSTALLATION`) | The client organisation, in its own environment | Runs the DPDPA programme on the organisation's own records |
| **Vendor installation** (`VENDOR_SERVICE`) | Cyberfyx | Licences, support and the DPDPA audit practice |

Client installation modules:
- consent and notices;
- rights requests and grievances;
- breach timers;
- processors;
- retention and erasure;
- data inventory;
- controls and assessments;
- the DPDPA gap register;
- the audit mandate.

Vendor installation areas:
- client organisations;
- licences;
- support;
- the audit practice: engagements, evidence, working papers, findings and signed reports.

**How the organisation's customers reach ORVIA.** They don't have to. Rule 14(1) of the DPDP Rules, 2025 puts the means of making a request on the organisation's own website or app, so:
- **the organisation's website or app** sends consent changes and privacy requests straight to its ORVIA installation, with an intake key created in the Workspace ([developer guide](docs/integration/ORGANISATION_INTAKE.md));
- **the website consent banner** records visitors' cookie and tracking choices;
- **staff** record requests that arrive by email or phone;
- **the Privacy Centre**, a separate customer sign-in site, is optional and off unless the organisation turns it on.

Everything lands in the Workspace and is handled there.

**Customer data stays with the customer.** The vendor never connects to, signs in to or reads a client installation, and nothing is inbound. The single exception is audit evidence ([AGENTS.md](AGENTS.md)), which the client sends outbound only, to one address:
- personal-data-free evidence that ORVIA generates and signs, under a dual-approved audit mandate; or
- sealed packages the client approves item by item.

## What is built

**Client installation (DPDPA operations)**
- **Grounds for processing:**
  - purposes, processing activities and legitimate uses under s.7;
  - versioned notices in Indian languages, each bound to a content digest.
- **Consent:**
  - consent records with an append-only history;
  - website consent banner with script blocking;
  - withdrawal propagated to connected systems and verified by reading them back.
- **Consent Managers** (s.6(7)–(9), Rule 4):
  - a register of Board-registered Consent Managers;
  - consent records linked to a Consent Manager's artefact;
  - relayed withdrawals, which are always honoured.
  - The Data Fiduciary's duty applies from 13 May 2027. No Consent Manager is registered with the Board yet.
- **Website & app intake:** intake keys (shown once, revocable, server-to-server only); consent changes and privacy requests from the organisation's own application, applied automatically; anything that cannot be applied waits for staff with the reason.
- **Rights and grievances:**
  - access, correction, erasure, grievance (90-day clock, Rule 14) and nomination;
  - reviewed response packages with redaction.
- **Breach:** intimation to each affected person, to the Board without delay, and the detailed report within 72 hours (Rule 7).
- **Retention and erasure:**
  - rules, holds and erasure runs approved by a second person, with verified outcomes;
  - the **Rule 8(2) 48-hour intimation**: Third Schedule erasure waits for a notice recorded at least 48 hours earlier, and is cancelled if the person re-engages.
- **Processors:** agreements, restrictions, terminations and verified return or deletion (s.8(2)).
- **Inventory:** data inventory and classification, systems and locations, cross-border review.
- **Governance:**
  - frameworks, controls, scheduled control tests and drift alerts;
  - impact assessments;
  - AI governance;
  - Significant Data Fiduciary obligations.
- **DPDPA external audit:**
  - a gap register for all 33 requirements, with automatic evidence for 32 of them;
  - evidence files;
  - engagements;
  - the **audit mandate**: approved once by two people, after which ORVIA sends signed, chained, personal-data-free evidence to the auditor on a schedule and on signed request, outbound only;
  - "what the vendor can see", listing every delivery.

**Vendor installation (Cyberfyx)**
- **Leadership overview:** counts only, with no evidence content.
- **Client administration:** organisations, licences, support and payments (payments in test mode).
- **Audit engagements:**
  - acceptance, independence and conflict checks;
  - scope, risk and work programme;
  - evidence register and auditor requests;
  - working papers and sampling;
  - findings and management responses;
  - a signed report, giving an opinion as of a date for a stated scope, never a certificate.
- **Controls:**
  - activation gates, which refuse real engagements until management-approved templates, the official law rule set and a production audit key exist;
  - decision D1: reports go only to the client, and the statutory Significant Data Fiduciary audit is not offered.

**Official law texts**
- The Act, G.S.R. 843(E), 844(E), 846(E) and the corrigendum G.S.R. 892(E) are in [`regulatory-sources/`](regulatory-sources/), unchanged.
- Each claim the product relies on is checked against them in [LEGAL_SOURCE_STATUS.md](docs/regulatory/LEGAL_SOURCE_STATUS.md).
- Obligation-by-obligation status is in [DPDP_CONFORMANCE.md](docs/regulatory/DPDP_CONFORMANCE.md).

**Audit practice documents** ([`docs/audit-practice/`](docs/audit-practice/))
- [Methodology v1.0](docs/audit-practice/METHODOLOGY.md);
- [decisions](docs/audit-practice/DECISIONS.md);
- eight client [templates](docs/audit-practice/templates/): subscription terms, processing agreement, engagement letter, scope statement, representation letter, privacy notice, retention schedule, security and breach commitments;
- the [company details sheet](docs/audit-practice/templates/COMPANY_DETAILS.md) Cyberfyx fills in before approving them.

A click-by-click walkthrough of both installations is in [docs/demo/DEMO_SCRIPT.md](docs/demo/DEMO_SCRIPT.md).

## Going live

ORVIA deliberately refuses real audit engagements until these steps are done. They are people's actions, not code. The ordered checklist, with the exact commands and screens, is [docs/GO_LIVE.md](docs/GO_LIVE.md).

| Step | Who |
|---|---|
| Fill in part A of [COMPANY_DETAILS.md](docs/audit-practice/templates/COMPANY_DETAILS.md) | Cyberfyx |
| A director approves the templates; record the two template gates ([steps](docs/audit-practice/templates/README.md)) | Director, super administrator |
| Sign the production law rule set from the official PDFs; a second person approves it ([steps](docs/regulatory/DPDP_CONFORMANCE.md#how-to-supply-the-official-pdfs)) | Release key holder, approver |
| Create the production audit signing key (`scripts/vendor-audit-key.ts`) | Named key holder |
| Host the vendor service ([runbook](docs/runbooks/VENDOR_HOSTING_READINESS.md)) | Cyberfyx |
| Switch payments from test to live (Razorpay merchant account) | Cyberfyx |
| Connectors to each client's real systems (needs that client's sandbox) | Per client |
| Qualify the production installation, which lifts the synthetic-people-only rule (until then a request naming a real person waits for staff and is not stored) | Cyberfyx |

## Run locally

The supported development host is Windows x64 with Docker Desktop (Linux containers), Git, and free local ports `4330`, `55433`, `58183` and `57235`. Setup provisions the repository-pinned Node 24.21.0 and pnpm 12.4.2 into `.local/tools`.

```powershell
npm start
```

The command sets up the local profile, services, schema and application, then holds the foreground. Stop it with Ctrl+C. For explicit set-up and status:

```powershell
npm run setup
npm run status
npm stop
```

The staff workspace is at `https://127.0.0.1:4330/workspace`. The optional Privacy Centre is at `https://127.0.0.1:4330/privacy`; it is on for the synthetic fixture organisations and off for a new organisation. Local credentials, TLS material and machine tokens are generated into the ignored `.local/profiles/rehearsal` directory.

Read the [operator instructions](docs/engineering/local-packaging-and-operation.md) before using the local certificate or handling evidence. Never share secrets or real customer data in development fixtures.

## Develop and verify

```powershell
npm run contracts:check
npm run tracking:check
npm run typecheck
npm run lint
npm test
```

- Integration and browser suites run on their documented isolated profiles; see the [engineering docs](docs/engineering/README.md).
- The latest full run of each suite, with exit codes, is recorded in the handoffs under [`handoffs/`](handoffs/).
- A passing unit suite does not turn an unexecuted scenario into a pass: the scenarios in [acceptance tracking](tracking/acceptance.json) stay `NOT_RUN` until each is executed and reviewed against an identified release candidate.

## Code map

| Area | Path |
|---|---|
| UI (client and vendor) | [frontend/src/app](frontend/src/app), [frontend/src/components](frontend/src/components) |
| API and domain | [backend/api/src](backend/api/src), [backend/domain/src](backend/domain/src), [backend/vendor](backend/vendor) |
| DPDPA audit (client side) | [backend/domain/src/dpdpa-audit](backend/domain/src/dpdpa-audit) |
| Privacy control | [backend/privacy-control/src](backend/privacy-control/src) |
| Database migrations | [database/customer/migrations](database/customer/migrations), [database/vendor/migrations](database/vendor/migrations) |
| Worker and agent | [services/worker/src](services/worker/src), [services/agent/src](services/agent/src) |
| Connectors and test targets | [connectors/src](connectors/src), [services/synthetic-target](services/synthetic-target) |
| Contract (0.48.0) | [shared/contracts](shared/contracts) |
| Law baseline and official sources | [scripts/regulatory](scripts/regulatory), [regulatory-sources](regulatory-sources) |
| Tests and operations | [tests](tests), [scripts](scripts), [docs/engineering](docs/engineering), [docs/runbooks](docs/runbooks) |

Two agents work in this checkout, Codex (base V1) and Claude Code (DPDP and audit lane). Coordinate shared files and runtime resources as described in [AGENTS.md](AGENTS.md).
