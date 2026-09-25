# Scenarios SC-041 – SC-080 — Banking, NBFC, Insurance, Fintech/UPI, Microfinance, Brokerage

Sector retention obligations (e.g. KYC, AML, insurance records) must come from the reviewed rule pack or customer counsel. These scenarios test that ORVIA **honours whatever is configured**; they do not set legal durations. All scenarios start **NOT_RUN**.

| ID | Business context | Scenario flow | Must hold (pass criteria) | Must NOT happen | DPDPA / ORVIA refs | Linked TCs |
|---|---|---|---|---|---|---|
| SC-041 | Retail bank, cross-sell marketing | Customer with savings account grants "Loan offers", later withdraws | Loan-offer campaigns blocked; account servicing continues | Account statements stop | Act §6 | TC-202, TC-206 |
| SC-042 | Bank closes account; erasure request | Customer closes account, requests erasure | KYC/AML-retained records kept restricted per configured retention; marketing profile erased; response explains retained categories | KYC deleted; or everything retained with no reason | Act §8(7), §12(3) | TC-271, TC-318 |
| SC-043 | NBFC loan app with contact-list access | App purpose "loan processing" requests phone contacts | Flagged beyond necessity for review; not auto-approved | Contacts collected under loan purpose silently | Act §6(1) proviso | TC-194 |
| SC-044 | NBFC recovery agent using principal data | Recovery team purpose; data shared with collection agency (processor) | Processor contract reference required; purpose-limited; audited | Sharing without contract | Act §8(2) | TC-338 |
| SC-045 | Insurance claim with health data | Claim processing uses medical reports | Purpose "claim" linked to sensitive data categories; access restricted to claims role | Marketing reuses health data | Act §6 | TC-079, TC-056 |
| SC-046 | Insurance nominee after policyholder death | Nominee under DPDP nomination requests erasure of marketing data | Nomination verified; action within nomination scope | Nominee gets access beyond scope | Act §14 | TC-276, TC-277 |
| SC-047 | Policyholder revokes nomination, later dies | Old nominee requests access | Denied (revoked) | Revoked nominee served | Act §14, T24 | TC-278 |
| SC-048 | UPI app notification of breach | Token leak affects 20,000 users | DPDP Board + principal tasks and CERT-In task each with own clock; sector regulator task if configured | One clock closes all | Rule 7, T36 | TC-356, TC-357 |
| SC-049 | Bank corrects awareness time after audit | Awareness moved 5 h earlier | Correction appended; due times recalculated; old clock history retained | Clock silently reset later | T37 | TC-358 |
| SC-050 | Credit card telemarketing via outsourced call centre | Call centre is processor; withdrawal received by phone | Assisted withdrawal recorded with agent attribution; processor notified | Agent-recorded withdrawal lost | Act §6(4) | TC-220, TC-204 |
| SC-051 | Joint account holders | Holder A requests access to joint account data | Returns A's data and joint account data per configured policy; B's personal-only data excluded | B's separate accounts disclosed | T25 | TC-267 |
| SC-052 | Bank employee (§7 employment purpose) | Employee data processed under employment legitimate use | Consent withdrawal UI not the basis; employment purpose evaluated under reviewed §7 basis | Employee's withdrawal of unrelated marketing stops payroll | Act §7 | TC-062, TC-063 |
| SC-053 | Fintech with Account Aggregator style consent | Purpose-specific data-fetch consent with expiry | Fetch allowed only within validity; blocked after expiry | Fetch after expiry | M11 | TC-216 |
| SC-054 | Microfinance, rural, low literacy | Field officer assists borrower in Odia on tablet | Notice/consent in reviewed Odia; assisted channel recorded; low bandwidth works | English-only; assisted grant without attribution | Act §6(3), FR-M13-03 | TC-221, TC-220, TC-260 |
| SC-055 | Stockbroker trading data access request | Client requests access | Response includes trades data summary and recipients (exchanges/depositories as configured) | Other client's data leaked in batch | Act §11 | TC-265, TC-178 |
| SC-056 | Bank uses 12 connected systems | Erasure across core banking, CRM, card, data lake, 2 processors | Per-system plan; partial completion explicit; backups unverified | COMPLETED with unverified systems | FR-M14-04 | TC-280, TC-291 |
| SC-057 | Core banking has no delete API | Manual erasure tasks | Manual task with owner; attestation not independent verification | Manual attestation shown as verified | FR-M07-04 | TC-100, TC-137 |
| SC-058 | Fraud team places legal hold | Hold on suspected fraudster | Erasure excludes held scope; hold released later → re-evaluation | Held data deleted; release causes blind delete | FR-M15-02, T32 | TC-292, TC-325 |
| SC-059 | Insurance broker imports lead consents from aggregator | Aggregator CSV with ambiguous duplicates | REVIEW_REQUIRED for ambiguous rows | Wrong principal marked consented | FR-M11-04 | TC-214 |
| SC-060 | Bank restores DB after ransomware | Restore from 3-day-old backup | Quarantine; reconcile withdrawals, role revocations, holds before traffic; RPO/RTO measured | Revoked admins regain access | T30, BUILD-19 | TC-443, TC-444 |
| SC-061 | Loan app targets minors | Borrower age under threshold | Blocked; guardian path or refusal per policy | Minor profiled | Act §9 | TC-300, TC-302 |
| SC-062 | Bank is notified SDF | SDF status recorded after reviewed applicability | DPIA, audit, India-based DPO tasks active | SDF toggled by any admin without review | Act §10 | TC-347..TC-350 |
| SC-063 | Insurance data stored with overseas reinsurer | Processing copy abroad | Transfer assessment task per current Act §16 status | Hard-coded "allowed" | Act §16 | TC-060, TC-352 |
| SC-064 | Bank maker-checker for policy | Compliance analyst drafts, same person approves | Denied; independent checker required | Self-approval | FR-M04-02 | TC-065 |
| SC-065 | Policy engine outage during salary-day promotions | OPA down | Sends fail closed/queued; no ALLOW; alert | Promotions sent unchecked | T28 | TC-069 |
| SC-066 | Customer disputes consent existed | Principal says never consented | Evidence shows notice version, interaction, time, channel | No evidence available | Act §6(10) | TC-164 |
| SC-067 | Bank auditors review evidence offline | Signed evidence package verified on air-gapped laptop | Verifier passes; states integrity ≠ truth | Verifier needs internet | FR-M08-04 | TC-150, TC-162 |
| SC-068 | Insider modifies evidence to hide failed deletion | DBA edits row | Integrity verifier detects | Silent tamper | T22 | TC-148, TC-163 |
| SC-069 | Wealth app: family office representative | Authorised representative with mandate requests access | Mandate verified; scope limited | Representative accesses other family members | FR-M14-03 | TC-297 |
| SC-070 | Card processor partial pagination during discovery | Provider API fails last page | Coverage partial | "Complete inventory" claim | T17 | TC-119 |
| SC-071 | Bank revokes connector delete permission | Provider-side permission removed | Capability degraded; gap | Deletions still reported verified | T18 | TC-120 |
| SC-072 | Deletion API returns success but row remains | Verification | Fails; gap | Verified | T20 | TC-131 |
| SC-073 | Duplicate payment of ORVIA subscription | Duplicate provider callbacks | One licence | Two contradictory licences | FR-M26-03 | TC-390 |
| SC-074 | Bank blocks all internet from ORVIA host | Air-gapped deployment | Core works offline; licence imported offline | Hidden cloud dependency | T45 | TC-396, TC-461 |
| SC-075 | Bank's internal pentest finds High issue | Finding in release | Promotion blocked until fixed/retested | Release promoted | T57 | TC-482, TC-484 |
| SC-076 | Grievance about loan rejection data | Principal grievance on data correctness | Grievance clock per pack; correction reviewed against source | Auto-apply correction contradicting KYC | Rule 14 | TC-283, TC-290 |
| SC-077 | Bank employee leaves; access revoked | Role revocation with queued exports | Exports denied at execution | Exports complete after revocation | ROLE-06 | TC-013, TC-014 |
| SC-078 | Bank subsidiary (insurance arm) as subtenant | Subtenant admins | Isolation between bank and insurance subtenant | Cross-subtenant search hits | NFR-01 | TC-044, TC-032 |
| SC-079 | Bank sends support diagnostic to ORVIA vendor | Report includes account number accidentally | Blocked locally | Sent to vendor | SUP-02 | TC-417 |
| SC-080 | Regulator inspection asks for rights-request statistics | Export aggregated report | Counts with stated semantics; no personal data | Personal data in stats export | FR-M18-02 | TC-379, TC-385 |
