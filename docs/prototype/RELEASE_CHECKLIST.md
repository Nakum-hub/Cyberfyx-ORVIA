# ORVIA prototype: internal-demo release checklist

**Owner:** GPT Work, successor to Cowork (C02) · **Status:** PREPARED_NOT_FROZEN · **Revision:** c02-r4, 16 Sep 2026 UTC · **Documentation base:** `9bb8f2900909997f63db864eeea1211523aa5819`

**Internal-demo readiness: NOT_READY.** Source: `CURRENT_STATE.md` at the r4 inspected revision; exact source hash is in DELIVERY_STATUS.json; Work owns this value.
**Production security/legal/supply-chain/full recovery: NOT_ASSESSED.** This prototype is not a production candidate.

## How this checklist works

This checklist describes the evidence required. It records no application result, because no final candidate, full-scenario acceptance or qualifying rehearsal is supplied. Engineering subset runs do exist and are indexed.

A00–A05 and the merged PR #16 correction supply engineering subsets. Work inspected 221 command reports and hashes. Retain the original run identity and failures; none satisfies a final-candidate item by itself.

**All T01–T30 are mandatory.** No item may be skipped because a demo step is optional to narrate live.

| Role | Who |
|---|---|
| Records results | Work (canonical tracking) |
| Signs off | Human (G6) |
| Keeps checklist wording aligned with actual engineering evidence | Work (transferred FILE_OWNERSHIP) |

**Gate names** come from EXECUTION_PLAN §6.

**Items that cannot be waived to meet a date** (EXECUTION_PLAN §7):

- tenant or principal leakage;
- false verification;
- lost accepted requests;
- unsafe target access;
- a bypass of the claimed boundary;
- unrepeatable startup;
- unexplained external traffic.

## Item status values

| Status | Meaning |
|---|---|
| `MISSING` | No qualifying final-candidate evidence for this item; narrower engineering reports may exist. |
| `REPORTED` | An engineering handoff states a result. `REPORTED (A00 subset)` means the artifact exists and its exit code matches, but it is not candidate evidence. |
| `INSPECTED` | The artifact was reviewed and matches the candidate. |
| `FAILED` | The artifact shows a failure. |
| `WAIVED` | **Not allowed** for the items listed above. |

---

## A. Candidate identity

| # | Check | Evidence required | Owner | Status |
|---|---|---|---|---|
| A1 | The frozen candidate commit is recorded on the integration branch | Commit hash in CURRENT_STATE.md | Human / Work | MISSING |
| A2 | The build manifest matches the commit and the exact lockfile | Manifest file, lockfile hash | Codex (A07) | MISSING |
| A3 | The contract version is recorded, and generated artifacts match it | `packages/contracts` version, generation log | Codex | ACCEPTED BASELINE 0.2.1; present executable transport 0.4.0 (signed command 0.3.0) and A02–A05 report intake await consolidated review; candidate match MISSING |
| A4 | The on-screen build ID equals the manifest | Screenshot + manifest (J00) | Codex / Human | MISSING |
| A5 | Development checksums or signatures are labelled as development-only | Manifest note | Codex | MISSING |
| A6 | The approved master (rev 1.3) is present, with its SHA-256 recorded | Hash comparison (F-001) | Human | DOCUMENT SOURCE VERIFIED: repository bytes match approved master hash; no application gate implied |

## B. Clean install and start (G1, G5)

| # | Check | Evidence required | Test | Owner | Status |
|---|---|---|---|---|---|
| B1 | A fresh isolated profile starts from the documented steps | Transcript with exit codes | T01 | Human / Codex | REPORTED (A00 subset, `codex-a00` only); candidate/`rehearsal` MISSING |
| B2 | No model, provider or vendor credentials are required | Environment inventory | T01, T26 | Codex | MISSING |
| B3 | Protected bootstrap creates a unique owner; no default password | Transcript, T02 record | T02 | Codex | MISSING |
| B4 | Stores and control services are not publicly bound | Port and bind listing | T26, T27 | Codex | SUPPLIED statement (127.0.0.1 listeners, A00); not independently verified |

## C. Authority and isolation (G1)

| # | Check | Test | Owner | Status |
|---|---|---|---|---|
| C1 | Login, MFA, logout and revocation work | T02 | Codex | MISSING |
| C2 | Cross-tenant and sibling-environment access is denied, including jobs, export and database role | T03 | Codex | MISSING |
| C3 | Principal and staff separation holds | T04 | Codex | MISSING |
| C4 | Least privilege and distinct-reviewer publish hold | T05 | Codex | MISSING |

## D. Core outcome (G2, G3)

| # | Check | Test | Owner | Status |
|---|---|---|---|---|
| D1 | Configuration persists; published versions are immutable | T06 | Codex | MISSING |
| D2 | Grant stores the exact notice and epoch | T07 | Codex | MISSING |
| D3 | Atomic withdrawal; receipt issued only after commit | T08 | Codex | MISSING |
| D4 | Idempotency and epoch conflicts handled | T09 | Codex | MISSING |
| D5 | Replay and fresh re-consent are safe | T10 | Codex | MISSING |
| D6 | Signed, restricted commands enforced | T12 | Codex | MISSING |
| D7 | Real CRM change confirmed by a separate read | T13 | Codex | MISSING |
| D8 | Send admission blocks after withdrawal; no send row written | T14 | Codex | MISSING |
| D9 | Service purpose is independent | T15 | Codex | MISSING |
| D10 | Degraded policy fails closed | T16 | Codex | MISSING |

## E. Uncertainty, failure and evidence (G3)

| # | Check | Test | Owner | Status |
|---|---|---|---|---|
| E1 | Applied-but-lost response leads to unknown, then reconciliation | T17 | Codex | MISSING |
| E2 | Acknowledgement without effect is detected | T18 | Codex | MISSING |
| E3 | Known failure has bounded retry and escalation | T19 | Codex | MISSING |
| E4 | Manual obligation and coverage loss handled | T20 | Codex | MISSING |
| E5 | Dashboard and evidence match persisted state | T21 | Codex | MISSING |
| E6 | Export is local, scoped and audited | T22 | Codex | MISSING |

## F. Regression, recovery and boundary (G3, G4)

| # | Check | Test | Owner | Status |
|---|---|---|---|---|
| F1 | Healthy regression run persists assertion-level results | T23 | Codex | MISSING |
| F2 | Broken fixture is detected by assertion; healthy rerun recorded | T24 | Codex | MISSING |
| F3 | Worker restart: no lost or duplicated logical action | T11 | Codex | MISSING |
| F4 | Quarantined target-only restore stays blocked until reconciled | T25 | Codex | MISSING |
| F5 | No unapproved runtime egress during the tested interval | T26 | Codex / Human | MISSING |
| F6 | Input, session and secret hygiene; scans triaged | T27 | Codex | MISSING |
| F7 | Reset and fault isolation; lane stores isolated | T28 | Codex | REPORTED (A00 bootstrap-only reset subset); full reset MISSING |

## G. Browser and presentation (G5, G6)

| # | Check | Evidence required | Test | Owner | Status |
|---|---|---|---|---|---|
| G1 | Integrated browser flow on the real API | Playwright report against the candidate | T29 | Codex (B04/B06) | MISSING |
| G2 | Empty, loading, denied and error states are accessible; mocked-state results reported separately | J21 report | T29 | Codex | MISSING |
| G3 | Copy matches UI_COPY.json, or deviations are recorded | Screenshot review | — | Work / Codex | MISSING |
| G4 | Two rehearsals from the documented state on this candidate | Rehearsal logs | T30 | Human | MISSING |
| G5 | Every spoken claim is EVIDENCED in CLAIMS_REGISTER.md | Claims review | T30 | Work | MISSING |
| G6 | Recordings, if any, are labelled with build, date and "not live", and match the candidate | Media entries in EVIDENCE_INDEX.json | T30 | Human / Work | MISSING |
| G7 | Capability register reviewed: 33 modules; exactly IDs 19–25 DEFERRED_V2 (master, EV-SRC-004); other unbuilt work remains in Version 1 | Register review | T30 | Work | DOCUMENT REGISTER RESTORED; runtime mapping/candidate claims pending F-029 |
| G8 | Evidence exported before any reset | Export path | T28 | Human | MISSING |

## H. Optional P1 (only if Work selects a slice)

| # | Check | Test | Status |
|---|---|---|---|
| H1 | Selected P1 slice meets its own case | One of T31–T34 | NOT_SELECTED |

## I. Website (last, separate approval)

| # | Check | Status |
|---|---|---|
| I1 | Explanatory copy drafted only after the core gate, and only within authorised scope | NOT_STARTED |
| I2 | No workspace embedding, public tunnel or exposed internal service | Required. No website work done. |
| I3 | Separate human deployment approval | NOT_REQUESTED |

## Sign-off (G6)

| Role | Name | Date / time (IST) | Decision |
|---|---|---|---|
| Human owner | — | — | NOT_SIGNED |
| Work review | — | — | NOT_REVIEWED |
| Work claims review | — | — | SELF_REVIEWED_DOCUMENTS; candidate claims and independent acceptance pending |

## r4 intake rules

No gate is satisfied by an indexed row alone. Candidate identity includes code-under-test SHA, package/build, exact contract, execution profile, fixture and scenario scope. Documentation/publication/merge SHAs remain separate. Current artifact claims require complete local files, exact hashes and matching record content. Unavailable evidence is dated historical or reported-uninspected; it cannot support a current PASS.

Two qualifying T30 rehearsals require distinct actual ordered intervals and logs, documented starting states, completed successful sequences, reviewed outcomes with no unresolved run issues, matching candidate identity and integrity-checked referenced media. Aborted, planned, duplicate, mismatched or incomplete runs stay visible without qualifying. A completed run with defects remains completed history. Material candidate changes require the applicable reruns. Full T01–T30 gates, including T18/T19, remain mandatory; no P1 is promoted.
