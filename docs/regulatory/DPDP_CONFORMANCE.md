# ORVIA: DPDP Act 2023 and DPDP Rules 2025 conformance map

**Status:** engineering self-assessment dated 2026-09-28. It is not a legal opinion; counsel must review it before any compliance claim. Each row says what ORVIA does for a customer acting as a Data Fiduciary, where that is implemented, and what is missing.

## Sources

The laws in scope:
- **The Digital Personal Data Protection Act, 2023** (Act No. 22 of 2023, 11 August 2023).
- **The Digital Personal Data Protection Rules, 2025**, G.S.R. 846(E), notified 13 November 2025.
- **Commencement notification** G.S.R. 843(E), and the **Board establishment notification** G.S.R. 844(E), both dated 13 November 2025.

**Official copies not yet retrieved.** The build environment's network policy blocks the Government hosts (meity.gov.in, egazette.gov.in, indiacode.nic.in). The provisions below are taken from the repository's regulatory baseline (`scripts/regulatory/dpdp-baseline.ts`), cross-checked on 2026-09-28 against published summaries of the notified Rules:
- [taxmann](https://www.taxmann.com/post/blog/analysis-indias-dpdp-act-and-rules)
- [Scrut](https://www.scrut.io/post/dpdp-rules)
- [dpdpa.com Rule 13](https://www.dpdpa.com/dpdparules/rule13.html)
- [dpdpa.com Rule 14](https://www.dpdpa.com/dpdparules/rule14.html)
- [Tsaaro](https://tsaaro.com/blogs/dpdp-rules-2025-explained-full-overview-and-practical-summary)
- [Mondaq](https://www.mondaq.com/india/privacy-protection/1709432/significant-data-fiduciaries-under-the-dpdp-act-and-dpdp-rules-the-new-frontier-of-risk-classification-dpias-and-algorithmic-accountability)

**By design** (`shared/contracts/src/regulatory.ts`), ORVIA refuses a PRODUCTION regulatory package unless every source is an official Government of India document, retrieved and SHA-256 hashed. Secondary summaries can never become executable rules.

## Commencement (verified in the baseline)

| Date | What commences |
|---|---|
| 13 Nov 2025 | Board provisions (s.18 onwards, G.S.R. 844(E)) |
| 13 Nov 2026 | Consent Manager provisions: s.6(7)–(9), Rule 4, First Schedule |
| 13 May 2027 | All remaining substantive obligations |

ORVIA stores a commencement date per provision and never treats a provision as in force before it (Regulatory Core).

## Conformance by obligation

Legend: **Built**: implemented and exercised by the named suites on the synthetic profile. **Partial**: built with a stated limit. **Gap**: not built.

| Obligation | Act / Rules | ORVIA | Status | Evidence |
|---|---|---|---|---|
| Grounds for processing: consent or legitimate use | s.4, s.7 | Processing-condition records per activity; legitimate-use codes s.7(a)–(i); applicability engine | Built | registry, applicability suites |
| Itemised notice with each consent request | s.5(1), R3 | Versioned, digest-bound notices in multiple languages; consent references the exact notice version | Built | notices, consent suites |
| Notice for consent given before commencement | s.5(2) | Legacy-consent notice requirement and delivery history | Built | notices suite |
| Valid consent; withdrawal as easy as giving | s.6(1), s.6(4) | Affirmative, purpose-specific grant; one-click withdrawal in the privacy portal | Built | consent, portal suites |
| Stop processing on withdrawal, including by processors | s.6(6) | Durable withdrawal propagation, signed agent commands, independent read-back; preference decisions refuse contact once withdrawn | Partial | consent-withdrawal, workflows, preferences. **Limit:** synthetic connectors only; no real downstream system yet |
| Burden of proving notice and consent | s.6(10) | Immutable consent receipts bound to the notice version and digest; evidence export | Built (requirement not in the package) | consent suite |
| **Consent Managers** (accept consent given or withdrawn through a registered Consent Manager) | s.6(7)–(9), R4, First Schedule | Not supported | **Gap**, in force 13 Nov 2026 | none |
| Processors only under contract | s.8(2) | Processor engagements, agreements lifecycle, restrictions, reassessment | Built | processors, third-party |
| Accuracy where used for a decision or disclosed | s.8(3) | Correction workflow with verification | Built | correction suite |
| Reasonable security safeguards | s.8(5), R6 | Security-safeguard register, access control, MFA, row-level security, audit trail | Partial | safeguards screens, auth 88/88. **Limit:** a register of the customer's own safeguards; ORVIA cannot secure the customer's other systems |
| Breach: intimate each affected person without delay | s.8(6), R7(1) | Breach tasks with a PRINCIPAL_INTIMATION timer from awareness | Built | breach suite |
| Breach: intimate the Board without delay; detailed report within **72 hours** | R7(2)(a),(b) | BOARD_INTIMATION timer and a 72-hour BOARD_DETAILED_REPORT timer; extensions recorded | Built | breach suite. ORVIA records the report; it does not submit to the Board's portal |
| Erase when consent is withdrawn or the purpose is served; cause processors to erase | s.8(7) | Retention evaluation, holds, approved erasure runs, verified outcomes | Partial | retention-scale. **Limit:** synthetic targets |
| Third Schedule: deemed end of purpose (3 years of inactivity for e-commerce 2 crore+, online gaming 50 lakh+ and social media 2 crore+ users) | s.8(8), R8(1) | Applicability by organisation class; retention rule cites the Schedule period | Built | applicability |
| **48-hour advance intimation before erasure** under R8(1) | R8(2) | Not implemented | **Gap** | none |
| Keep logs at least one year | R8(3) | Log-retention minimum requirement enforced through holds | Built | retention-scale |
| Publish contact for questions / DPO | s.8(9), R9 | Organisation profile; contact on notices and the portal | Built | notices, portal |
| Grievance redressal within the published period, **≤ 90 days** | s.8(10), s.13, R14 | Grievance cases with a 2,160-hour timer from receipt | Built | rights suite |
| Publish the means to exercise rights | R14 | Privacy portal rights intake | Built | portal-rights |
| Access to a processing summary | s.11 | Access request and reviewed response package with redaction and expiring delivery | Built | response-packages 52/52 |
| Correction, completion, updating, erasure | s.12 | Rights runs for correction and erasure with verification | Partial | rights, correction. **Limit:** synthetic targets |
| Nomination | s.14, R14 | Representatives and mandates, nomination right | Built | rights |
| Verifiable consent of parent or lawful guardian (child) | s.9(1), R10 | Child status, guardian relationship, verifiable-consent requirement | Built | registry, applicability |
| Lawful guardian of a person with disability | s.9(1), R11 | Guardian relationship exists; R11's specific verification is not encoded as its own provision | Partial | registry |
| Children exemptions (classes and purposes) | R12, Fourth Schedule | Not encoded; applicability treats every child case as covered | **Gap** (over-applies, fails safe) | none |
| No tracking, behavioural monitoring or targeted ads at children | s.9(3) | Requirement plus consent-banner and preference controls | Partial | cmp, preferences. **Limit:** cannot inspect the customer's ad stack |
| SDF: DPO in India; independent data auditor | s.10(2) | SDF obligations register | Built | sdf suite |
| SDF: DPIA and audit **every 12 months**; report to Board | s.10(2), R13 | 8,760-hour periodic timers from designation; impact assessments engine | Built | sdf, impact 41/41 |
| SDF: algorithmic due diligence; specified data kept in India | R13 | Obligations recorded; AI-use governance | Partial | sdf, ai-governance |
| Transfers outside India, subject to restriction | s.16, R15 | Location declarations per system, transfer review | Partial | ropa-exports. **Limit:** no list of restricted countries yet, because none is notified |
| Data Protection Board complaint channel | s.18, G.S.R. 844(E) | Board channel text on notices | Built | notices |

## External DPDPA audit support (revision 1.5 addendum, 2026-09-29)

The vendor also audits client organisations against the DPDP Act and Rules. ORVIA supports that audit without giving the auditor any live access (`docs/engineering/dpdpa-audit-exchange.md`).

**Client installation.**
- **Gap register:** one row per requirement of the package in force. Unresolved applicability is a gap.
- **Evidence files:** each carries a personal-data flag confirmed by a second person.
- **Evidence packages:** personal-data-free by default, dual-approved and sealed, carried out as a file.
- **Audit outputs:** signed findings and reports are imported only after verification, and findings are tracked as GRC issues.

**Vendor installation.**
- Engagements record the auditor's independence declaration and conflict check. An optional Board empanelment reference (for Rule 13 SDF audits) is never assumed.
- Packages containing personal data are quarantined until a processing agreement is recorded. The vendor then acts as the client's Data Processor under s.8(2).
- Evidence is encrypted at rest, and every view and download is logged.
- Each requirement gets a result (MEETS, PARTIALLY_MEETS, DOES_NOT_MEET, NOT_APPLICABLE or NOT_TESTED).
- The report is drafted by the lead auditor and approved by a different reviewer.
- Evidence retention is purged after the engagement closes.

**Wording.** The output is an **audit opinion as of a date for a stated scope**. It is never a compliance certificate: only the Data Protection Board of India decides compliance. A unit test refuses certification wording in report templates and report text.

**Limit.** Audit criteria come from the regulatory package in force. Until the official PRODUCTION package is built from the hashed Government sources (gap 6 below), the criteria are TEST_FIXTURE content and must not be relied on for a real audit.

## Gaps to close (in order)

1. **Consent Managers** (s.6(7)–(9), R4), from 13 Nov 2026: accept consent and withdrawal routed through a registered Consent Manager, record the Consent Manager's identity and registration, and make it interoperable. This needs the First Schedule technical details from the official Rules text.
2. **Rule 8(2) 48-hour advance intimation** before Third Schedule erasure: notify the person, wait 48 hours, and cancel erasure if they re-engage.
3. **Rule 12 / Fourth Schedule** child-consent exemptions, as applicability facts.
4. **Rule 11** as its own provision for guardians of persons with disability.
5. Add **s.6(10)** (burden of proof) as an explicit requirement, so the package reports it.
6. **Official sources:** retrieve and hash the four Government PDFs, resolve the open verification items (commencement discrepancy, corrigendum, Schedules), obtain legal review, then build and sign the PRODUCTION package.
7. **Real connectors** for withdrawal, erasure and correction outcomes. All automated effects are synthetic today.

## How to supply the official PDFs

Download these from meity.gov.in and commit them unchanged under `regulatory-sources/`:
- the Act;
- G.S.R. 843(E), the commencement notification;
- G.S.R. 844(E), the Board establishment notification;
- G.S.R. 846(E), the Rules, including the Schedules.

Alternatively, allow those hosts in the environment's network settings. Either way, `scripts/regulatory-package.ts` can then hash them and build the PRODUCTION package for independent approval and signing.
