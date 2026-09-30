# Cyberfyx Consulting: DPDPA audit methodology

**Version:** 1.0, draft for approval by Cyberfyx management (2026-09-30).
**Owner:** Cyberfyx audit practice lead.
**Status:** firm policy once approved. It is not legal advice. Management decided on 2026-09-30 that no external legal review is required (`docs/engineering/V1_BASELINE_REV_1_6_AUDIT_MANDATE.md`).

This document says how Cyberfyx Consulting audits a client organisation against the Digital Personal Data Protection Act, 2023 and the DPDP Rules, 2025, using ORVIA. ORVIA is the tool. The **organisation** is what is audited.

ORVIA evidence shows what the organisation records and does inside ORVIA. It cannot show what happens in systems that never reach ORVIA. So this methodology combines three sources:
- ORVIA's signed evidence;
- the auditor's own procedures;
- a scope statement signed by the client that names what is outside ORVIA.

---

## 1. Service lines

| Service | ORVIA `service_type` | What the client receives | Conditions before Cyberfyx offers it |
|---|---|---|---|
| Readiness assessment | `READINESS_ADVISORY` | Gap register review, findings and a remediation plan. **No opinion.** | Engagement letter and processing agreement signed. |
| Evidence audit | `EVIDENCE_AUDIT` | A signed report giving an **opinion as of a stated date, for a stated scope**, per requirement. | As above, plus: production criteria in ORVIA; production audit key; independence checks in section 2 passed; every requirement in scope has at least one auditor procedure (section 5). |
| Statutory audit of a Significant Data Fiduciary | `STATUTORY_SDF_AUDIT_CLAIM` | The independent data audit under s.10(2)(b) and Rule 13. | **Not offered until** the Government publishes auditor eligibility criteria and Cyberfyx meets them. The applicability basis and eligibility evidence are recorded in ORVIA; ORVIA refuses the claim without them. |

Wording rules, which apply to every service:
- The report is never a "certificate", "certification", "DPDP certified" or "compliant organisation".
- It states the requirements tested, the period, the date of the opinion and every limitation.

## 2. Independence (firm policy)

1. **Tool and audit are separate commitments.**
   - The ORVIA subscription fee never depends on an audit's outcome.
   - The audit fee never depends on the result.
   - A client may use another auditor. ORVIA exports the gap register and sealed evidence packages as files for that purpose.
2. **No self-review.** A person who configured, implemented or advised on the client's ORVIA set-up or DPDPA programme in the last 12 months:
   - is recorded as a `PRIOR_IMPLEMENTATION` or `PRIOR_CONSULTING` conflict;
   - never holds review authority on that engagement (ORVIA enforces this through `review_barred`);
   - performs no procedure on the work they did.
3. **Commercial separation.** The engagement's commercial owner (sales, account management) and implementation owner can never be its reviewer. ORVIA enforces this.
4. **Firm-level rule.** Cyberfyx does not issue an `EVIDENCE_AUDIT` opinion to a client for whom Cyberfyx Consulting ran the DPDPA implementation project in the same or previous financial year. Such clients receive a readiness assessment only.
5. The lead auditor records the independence declaration at acceptance. The reviewer decides acceptance, and cannot accept while any conflict is open.

## 3. Engagement lifecycle in ORVIA

| Step | Who | Where in ORVIA |
|---|---|---|
| 1. Engagement letter and processing agreement signed; scope statement received | Commercial owner, client | Outside ORVIA (templates in `templates/`). References are recorded at acceptance. |
| 2. Engagement created; criteria and methodology chosen | Vendor administrator | Vendor area → Engagements → Configure |
| 3. Acceptance: objectives, intended users, responsibilities, independence, conflicts | Lead auditor prepares, reviewer decides | Engagement → Acceptance |
| 4. Understanding of the organisation: activities, systems, data categories, third parties, SDF status | Auditor | Engagement → Understanding |
| 5. Applicability per requirement: APPLICABLE / NOT_APPLICABLE / UNRESOLVED, with reasons | Lead auditor | Engagement → Applicability |
| 6. Risk assessment and work programme: one or more procedures per applicable requirement (section 7) | Lead auditor; reviewer approves the plan | Engagement → Risk, Programme |
| 7. Audit mandate: requirements, evidence categories, schedule, dates | Client preparer drafts, a different client owner/administrator approves | Client ORVIA → DPDPA audit → Mandate |
| 8. Fieldwork: automatic evidence, auditor requests, remote sessions, external tests | Auditors | Engagement → Evidence, Requests, Working papers |
| 9. Evaluation: each evidence item rated for relevance, reliability, sufficiency, contradiction | Auditor | Evidence → Evaluate |
| 10. Findings, with severity and the requirement affected | Auditor drafts, lead auditor confirms | Engagement → Findings |
| 11. Management responses: agreement, action plan, owner and date; reviewed for personal data before sending | Client | Client ORVIA → DPDPA audit → Findings |
| 12. Review: every working paper and conclusion, by the independent reviewer | Reviewer | Engagement → Review |
| 13. Report signed and delivered | Lead auditor drafts, reviewer approves | Engagement → Report |
| 14. Closure; evidence purged after the retention period (section 11) | Vendor administrator | Engagement → Close; Retention sweep |

## 4. Evidence hierarchy

From strongest to weakest:

1. **Independent corroboration:** evidence from outside the client, such as the auditor's own test of the client's public website or rights channel (section 8.2).
2. **Auditor observation and reperformance:** the auditor watches a process run live, or repeats it (section 8.1).
3. **ORVIA system-generated evidence:** signed by the client installation's evidence key and chained, so it cannot be edited, left out or backdated. It is still derived from what the client records in ORVIA.
4. **Documents:** policies, contracts, board approvals, received as evidence files.
5. **Management assertions:** written statements by the client, including the scope statement and the representation letter.

Rules:
- **R1.** A requirement is never concluded `MEETS` on a management assertion alone.
- **R2.** ORVIA system-generated evidence alone supports a conclusion on **design and implementation**. A conclusion on **operating effectiveness** needs at least one procedure from levels 1–2, or a seeded sample (section 6).
- **R3.** Evidence that contradicts other evidence is recorded as contradicting and resolved before the conclusion. It is never discarded.
- **R4.** Where ORVIA shows zero events for a population (for example, no breaches in the period), the conclusion covers design only. The report says the control was not exercised in the period.

## 5. Scope and completeness

ORVIA can only show what the organisation has put into it. Before fieldwork, the client signs the **scope statement** (`templates/scope-statement.md`). It lists:
- every system that processes digital personal data;
- whether each system is represented in ORVIA (connected, catalogued, or managed manually);
- the processors and the processing activities.

Rules:
- A system outside ORVIA is either tested by auditor procedure (section 8) or stated in the report as a **scope limitation**.
- The auditor compares the scope statement with ORVIA's systems, data assets and processors, and with the understanding in step 4. A difference found is a finding, or a limitation where it cannot be resolved.
- Requests past their due date appear in the report as scope limitations.

## 6. Sampling

- **Selection:** always `SEEDED_RANDOM` from an auditor-chosen seed.
  - ORVIA orders the population by `HMAC-SHA256(seed, record id)` and takes the first *n*, so the client cannot choose the items.
  - `JUDGEMENTAL` selection is added only for targeted items, such as a known incident, and never replaces the seeded sample.
- **Completeness:** each population records its completeness basis. A population marked `UNVERIFIED` supports no operating-effectiveness conclusion.
- **Size (firm policy):**

| Population in the period | Lower risk | Higher risk |
|---|---|---|
| 1–5 | all | all |
| 6–50 | 5 | 10 |
| 51–250 | 15 | 25 |
| 251 or more | 25 | 40 |

- **Exceptions:**
  - One exception in a sample means the result is `PARTIALLY_MEETS` unless the auditor extends the sample and finds no more.
  - Two or more exceptions mean `DOES_NOT_MEET` for operating effectiveness.
  - The auditor may extend the sample once, by the same size, before concluding.
- **Automatic sample answers** (`SAMPLE_COUNT`) return only counts and pass/fail. To inspect a record, the auditor uses a remote session (section 8.1). It is not an evidence package, so the record never leaves the client.

## 7. Audit programme per requirement

"Automatic" means evidence ORVIA sends under the mandate. The indicators are in `backend/domain/src/dpdpa-audit/indicators.ts`. Every applicable requirement also gets the auditor procedures listed.

| Requirement | Law | Automatic evidence (indicators, plus control standing, tests and versions) | Auditor procedures | Typical finding triggers |
|---|---|---|---|---|
| DPDP-NOTICE-CONSENT-REQUEST | s.5(1), R3 | Published notice versions; consent records granted | Inspect each published notice against R3 contents (itemised data, purposes, withdrawal, rights, Board complaint). External test: read the live notice where consent is taken, and compare its digest or text with the published version. | Notice lacks an R3 item; live notice differs from the recorded version |
| DPDP-NOTICE-LEGACY-CONSENT | s.5(2) | Notice delivery evidence records | Inquire about the pre-commencement population; seeded sample of delivery evidence inspected in a remote session | No legacy notice plan; deliveries missing |
| DPDP-CONSENT-VALIDITY | s.6(1), s.6(4) | Consent records total and withdrawn | Seeded sample: affirmative, purpose-specific grant. External test: give and then withdraw consent as a synthetic principal, and compare the steps. | Pre-ticked or bundled consent; withdrawal harder than giving |
| DPDP-CONSENT-WITHDRAWAL-CESSATION | s.6(6) | Withdrawal runs verified, with exceptions, open | Seeded sample of withdrawals: reperform the check in the downstream system in a remote session; inquire about processors | Processing continues after withdrawal; processor not told |
| DPDP-CONSENT-MANAGER | s.6(7)–(9), R4 | None: ORVIA does not support Consent Managers | Inquiry: does the organisation accept consent through a registered Consent Manager? If yes, walk through it. In force 13 Nov 2026. | Consent Manager requests not honoured |
| DPDP-CONSENT-PROOF | s.6(10) | Consent events; events with evidence | Seeded sample: trace each event to its notice version and evidence | Consent that cannot be proven |
| DPDP-LEGITIMATE-USES | s.4, s.7 | Legitimate-use conditions; unresolved conditions; activities on a legitimate use; activities with no condition | Inspect each legitimate-use justification against s.7(a)–(i); inquire about activities with no condition | Legitimate use claimed outside s.7; activity without any ground |
| DPDP-PROCESSOR-CONTRACT | s.8(2) | Active engagements; active without agreement; expired agreements; disposition unverified | Seeded sample of processor agreements inspected (purpose limit, security, erasure, breach notice) | Processor without a valid contract |
| DPDP-ACCURACY | s.8(3) | Correction runs verified, with exceptions, open | Inquire where data drives decisions or is disclosed; walkthrough of the correction path | No accuracy control where data drives decisions |
| DPDP-SECURITY-SAFEGUARDS | s.8(5), R6 | Safeguards recorded; with evidence; missing; needing verification; kinds covered (of 8) | Inspect evidence for each R6 measure (encryption, access control, logging, backup, processor safeguards); observe access reviews in a remote session; inquire about systems outside ORVIA | R6 measure absent; evidence missing |
| DPDP-BREACH-PRINCIPAL-INTIMATION | s.8(6), R7(1) | Timer met, missed and open | For each breach in the period: inspect the intimation content and timing. With no breaches: walk through the procedure (R4). | Late or incomplete intimation |
| DPDP-BREACH-BOARD-INTIMATION | s.8(6), R7(2)(a) | Timer met, missed and open | As above, against the Board intimation | Board not told without delay |
| DPDP-BREACH-BOARD-REPORT | R7(2)(b) | 72-hour timer met, missed and open | Inspect the detailed report and when it was submitted | Report later than 72 hours without an extension |
| DPDP-ERASURE-PURPOSE-SERVED | s.8(7) | Erasure runs; active rules; outcomes failed or unknown | Seeded sample of erasures: reperform the check in the target system in a remote session | Data kept after the purpose ended |
| DPDP-RETENTION-THIRD-SCHEDULE | s.8(8), R8(1) | Retention rules citing the Third Schedule | Confirm whether the organisation is in a Third Schedule class; inspect the rule period against it | Class applies, rule missing |
| DPDP-ERASURE-ADVANCE-NOTICE | R8(2) | None: the 48-hour intimation is not built in ORVIA | Inquiry and walkthrough of the organisation's own process | No 48-hour intimation |
| DPDP-LOG-RETENTION-MINIMUM | R8(3) | Active log-retention holds; activity-log digest chain | Inspect log retention settings for in-scope systems outside ORVIA | Logs kept less than one year |
| DPDP-CONTACT-PUBLICATION | s.8(9), R9 | Contact recorded in the current profile (1 = yes); published notices | External test: find the contact on the website and app; send a question and time the answer | Contact not published or not answered |
| DPDP-GRIEVANCE-RESPONSE | s.8(10), s.13, R14 | Grievances open; open over 90 days | Seeded sample of closed grievances: response inside the published period. External test: file a synthetic grievance. | Response later than the published period |
| DPDP-RIGHTS-MEANS | R14 | Rights requests total; last 90 days | External test: find the means and particulars for rights on the website and app | Means not published |
| DPDP-RIGHT-ACCESS | s.11 | Access requests completed, open, over 90 days, rejected; responses released | Seeded sample: response contents against s.11. External test: synthetic access request. | Incomplete summary; no response |
| DPDP-RIGHT-CORRECTION-ERASURE | s.12 | Requests completed, open, over 90 days, rejected; execution failed or manual | Seeded sample: reperform the correction or erasure check in the target system | Requests not carried out |
| DPDP-RIGHT-NOMINATION | s.14, R14 | Nomination requests; nominees verified, unverified | Walkthrough of nomination intake and verification | No nomination route |
| DPDP-CHILD-VERIFIABLE-CONSENT | s.9(1), R10 | Children recorded; consent established; not established; status unknown | Seeded sample of children: inspect the verifiable-consent evidence and method; inquire how age is determined | Child data processed without verifiable consent |
| DPDP-CHILD-NO-TRACKING | s.9(3) | Children recorded; published consent-banner configurations | External test: observe tracking and advertising tags on child-directed pages; inquire about the ad stack | Tracking or targeted ads directed at children |
| DPDP-SDF-DPO | s.10(2)(a) | DPO obligation next due, overdue, completed | Inspect the appointment and that the DPO is based in India and reports to the board | No DPO in India |
| DPDP-SDF-AUDITOR | s.10(2)(b) | Auditor appointment next due, overdue, completed | Inspect the appointment | No independent auditor appointed |
| DPDP-SDF-DPIA | s.10(2)(c), R13 | DPIA next due, overdue | Inspect the latest DPIA and its board report | DPIA older than 12 months |
| DPDP-SDF-AUDIT | s.10(2)(c), R13 | Audit next due, overdue | Inspect the latest audit report | Audit older than 12 months |
| DPDP-SDF-ALGORITHMIC-DILIGENCE | R13 | Diligence next due, overdue, completed; AI systems recorded | Inspect due-diligence records for each algorithmic system | No diligence recorded |
| DPDP-SDF-TRANSFER-RESTRICTION | R13 | Review next due, overdue, completed; systems outside India | Inspect the data-location review against any category the Government specifies | Specified data held outside India |
| DPDP-CROSS-BORDER | s.16, R15 | Systems outside India; systems with no location; agreements allowing onward transfer | Inspect transfers against any restricted country notified (none notified at the time of writing) | Transfer to a restricted country |
| DPDP-BOARD-COMPLAINT-CHANNEL | s.18, G.S.R. 844(E) | None | Inspect the notice text for the right to complain to the Board | Right not stated |

## 8. Procedures that need no physical visit

### 8.1 Remote inspection session

The auditor inspects records on the client's own screen over a video call.
- Nothing is recorded, and no screenshot showing personal data is taken.
- The working paper holds:
  - the sample position numbers from the seeded selection (1…n);
  - the result per position;
  - the name of the client person who drove the screen;
  - the date.
- **The working paper never holds a record identifier, a name or any other personal data.** The link from position to record stays on the client's side.
- Viewing personal data is still processing. It happens under the processing agreement.

### 8.2 External tests as a synthetic Data Principal

With the client's written permission in the engagement letter, the auditor acts as an ordinary member of the public, using an identity Cyberfyx controls:
- reads the live notices and consent banner;
- gives and withdraws consent;
- files access, correction, grievance and nomination requests;
- measures what happens and how long it takes.

This is the strongest evidence available (level 1), and it involves no client data at all. The synthetic identity is stated to the client's DPO at the end of fieldwork, so the requests can be closed.

### 8.3 Interviews and walkthroughs

These are held by video call. Each is recorded in a working paper with the procedure type `INQUIRY` or `WALKTHROUGH`, the role interviewed (not the person's contact details), and what was shown.

## 9. Conclusions and the report

- **Result per requirement:**
  - `MEETS`: design and operating effectiveness are supported (R2);
  - `PARTIALLY_MEETS`: design is supported and operation has exceptions, or design only (R4);
  - `DOES_NOT_MEET`;
  - `NOT_APPLICABLE`: with the recorded reason;
  - `NOT_TESTED`: a scope limitation.
- **Finding severity:**
  - **Critical:** a data principal right or a breach duty is denied in practice, or children's data is processed without verifiable consent.
  - **High:** a statutory duty is not designed.
  - **Medium:** designed, with operating exceptions.
  - **Low:** documentation.
- **Opinion wording:** "In our opinion, as at [date], for the requirements and systems described in the scope, [the organisation] has [met / partially met / not met] the requirements listed in Appendix A, subject to the limitations in section [n]."
- **Every report lists:**
  - the criteria version and its digest;
  - the period;
  - the systems outside ORVIA;
  - overdue requests;
  - the activity-log limit stated in revision 1.6 (the client's audit log is not hash-chained before the first snapshot);
  - that the report is not a certification.
- **Before signing,** the client's accountable officer signs the management representation letter (`templates/management-representation-letter.md`). A report is not signed without it.

## 10. Quality review

The reviewer is independent under section 2 and never a commercial or implementation owner. Before the report is approved, the reviewer checks:
- every working paper has a procedure, evidence, an evaluation and a conclusion;
- rules R1–R4 hold for every requirement;
- every finding has a management response, or is marked as without one;
- the scope limitations are complete;
- the independence record is complete.

## 11. Retention (firm policy)

| Record | Kept | Mechanism |
|---|---|---|
| Evidence content: package items and delivered snapshots and responses | Engagement close + retention period. Default 90 days; set per engagement from 1 to 3650 days. | Vendor retention sweep. **Run by the practice lead on the first working day of each month** until it is scheduled automatically. |
| Working papers, findings, report | 8 years from the report date | Kept in the vendor installation |
| Anything under an active legal hold | Until the hold is released or expires | Legal holds in the vendor area |

## 12. What this methodology does not cover yet

- Statutory SDF audit claims: section 1.
- Consent Manager support in ORVIA (in force 13 Nov 2026) and the R8(2) 48-hour intimation: tested only by auditor procedure until ORVIA supports them.
- Official texts: the criteria used for real engagements must be the **production** criteria built from the official gazette PDFs, retrieved and hashed. Until then, ORVIA refuses real engagements.
