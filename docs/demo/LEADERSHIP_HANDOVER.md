# ORVIA prototype: leadership handover

**Owner:** Cowork (C02) · **Status:** PREPARED_NOT_FROZEN (blocked on A07 candidate and B06 browser results) · **Revision:** c02-r2, 16 Sep 2026 IST · **Documentation base:** `e839b1a` (r1 was written against `96b8bd7`)

## How to use this document

This is the presentation content. Its claims **cannot be frozen** yet: no packaged candidate, test result, browser result, screenshot, recording or rehearsal exists.

Where a statement depends on evidence, it is written as the claim to be made **once evidenced**, and it points to its register entry in [`CLAIMS_REGISTER.md`](CLAIMS_REGISTER.md). Until then, present only §1, §5, §6 and §7, and say plainly that the working demonstration is not ready.

## Readiness at a glance (generated)

<!-- BEGIN GENERATED: handover-readiness -->
As of 2026-09-16T10:00:00Z (DELIVERY_STATUS.json).

| Question | Answer |
|---|---|
| Documentation base | `e839b1a` (current source inspection EV-SRC-003, 2026-09-16T09:44:21Z) |
| Application at that base | A00 bootstrap only: apps/web has layout.tsx, page.tsx (minimal foundation text) and /healthz; no workspace or Privacy Centre screens; business endpoints are contract-only (CONTRACT_ONLY_PENDING_TICKET). |
| Internal-demo readiness | **NOT_READY**. Source: `CURRENT_STATE.md` @ `e839b1a`, quoted: “Internal demo NOT_READY”. Owner: Work (consolidates); human (approves). |
| Production readiness | **NOT_ASSESSED**. Source: `CURRENT_STATE.md`, quoted: “production security/legal/supply-chain/recovery NOT_ASSESSED”. |
| Frozen candidate | NOT_IDENTIFIED |
| P0 scenarios with an inspected PASS on the candidate | 0 of 30 (records indexed: 0) |
| Engineering reports indexed (not acceptance) | 51 (14 with non-zero exit, retained) |
| Presentation deadline | See F-015 in FINDINGS.csv |
<!-- END GENERATED: handover-readiness -->

---

## 1. Opening (say this whether or not the demo runs)

> "ORVIA is meant to do four things: record what should happen to a person's data, control a supported action, coordinate the downstream work, and show what actually happened — including the failures and gaps. This prototype tests that on one path, marketing-consent withdrawal, using fictional organisations on a local machine, with no AI model involved."

## 2. Core withdrawal demonstration (only once evidenced)

The step-by-step sequence is [`DEMO_SCRIPT.md`](../prototype/DEMO_SCRIPT.md) §4. In summary, the prototype must show:

1. **Asha, a fictional person, withdraws marketing consent.** She gets a receipt that says only that the withdrawal is recorded. (CL-06)
2. **The synthetic CRM audience actually changes,** and ORVIA confirms it with a separate read. (CL-08, CL-09)
3. **A queued marketing message is blocked at the local send point.** The order-service update is judged on its own condition. (CL-05, CL-10)

**Evidence status:** every item is MISSING (T08, T09, T12–T15).

## 3. Uncertainty and manual gaps (only once evidenced)

- **Lost reply.** When a system applies a change but its reply is lost, ORVIA says *outcome unknown* and reads the system before deciding anything. (CL-11)
- **No API.** A system with no API becomes a person's task. The person's record is kept as a statement, not as an observation, and the workflow stays *Needs attention* until its rule is met. (CL-12)
- **Live counts.** The overview shows these as live counts. It is not a compliance score. (CL-13)

**Evidence status:** MISSING (T17–T21). T18 and T19 are mandatory tests even if they are not shown live.

## 4. Regression and recovery (only once evidenced)

- **Regression.** A deliberately broken, test-only sender is caught by an assertion that looks at what was sent. The healthy rerun is recorded separately. (CL-15)
- **Recovery.** A worker restart neither loses nor repeats the accepted action. An old synthetic CRM copy restored into quarantine stays blocked until it is reconciled. This is target-only, not disaster recovery. (CL-16)
- **Offline run.** With internet blocked, the core runs, and no unapproved traffic appears during the tested interval. (CL-17)

**Evidence status:** MISSING (T11, T23–T26).

## 5. Scoped value statement

> "If the evidence holds, we will have shown that ORVIA can turn a person's choice into a controlled and honestly reported outcome on systems we map — observed where ORVIA can read the system, and saying 'unknown' and 'manual' when that is the truth. That is the foundation for Version 1. It is not yet a product, an integration catalogue, or a compliance certificate."

## 6. Limitations to state

These are stated even after the evidence exists.

- **Fictional data and synthetic, local systems only.** No Salesforce, HubSpot, SMS, email or payment integrations.
- **Only the local supported send point is controlled.** There is no company-wide interception, and messages already handed off cannot be recalled.
- **Withdrawal stops marketing use.** It does not erase data. Rights, retention and guardian flows are not built.
- **Evidence digests detect changes against a trusted copy.** They are not legal certificates.
- **No production security, HA, disaster recovery, SSO, licensing or update infrastructure.** No penetration test.
- **The wider Version 1 programme is larger.** The master lists 33 modules: 26 are in Version 1, and seven custom-AI modules (IDs 19–25) are deferred to Version 2 (EV-SRC-004). The capability register that tracks their status is not in the repository (F-002), so module status cannot be shown yet. Unbuilt Version 1 work stays in Version 1.
- **No legal-compliance claim of any kind.** (CL-22)

## 7. Next engineering decisions for leadership

| Decision | Why it matters now | Owner |
|---|---|---|
| Confirm the presentation date and time (IST), and what leadership is asked to decide | Sets the cut line; nothing is timed today (F-015) | Human |
| Provide the approved master and the tracking files to the repository | Scope, 33-module register, and task/acceptance truth (F-001, F-002, F-004, F-005) | Human |
| Authorise and accept the A00 bootstrap | No implementation exists; every gate depends on it (F-003) | Human → Codex |
| If time is short, accept a smaller truthful slice rather than the full outcome demo | EXECUTION_PLAN §6–§7: a partial demo must not be labelled complete | Human with Work |
| Decide the open contract questions: propagation status, reconciliation/quarantine representation, send-record view, receipt list | Needed before the UI can bind honestly (F-006, F-008, F-016, F-018) | Work → Codex, Claude Code |
| Production path after the demo: security review, legal review, real connector selection, deployment model | The prototype is a foundation, not a release | Leadership |

---

## 8. Prepared answers to leadership and CTO questions

Answers are written to stay true today. Update the evidence references when artifacts exist.

**What actually ran?**
No ORVIA application scenario has run yet. At `e839b1a`, the repository holds the A00 bootstrap:
- a foundation page and `/healthz`;
- PostgreSQL, OPA and Temporal probes;
- contract proposal 0.2.0.

Codex reports 51 recorded engineering runs in its `codex-a00` profile; 14 exited non-zero before later successful reruns. Cowork checked that the artifacts exist and that their exit codes match. Cowork re-ran nothing, and these runs are not T01–T34 acceptance. When a candidate exists, the answer is the list of `INSPECTED` records in `EVIDENCE_INDEX.json` for that build.

**What remains incomplete?**
- All 30 required scenarios have no application evidence.
- Work has not yet recorded A00 acceptance or accepted contract 0.2.0.
- The authentication, consent, workflow, agent, enforcement, evidence, recovery and UI tickets (A01–A07, B00–B06) have not started.
- The capability register is absent, and the master is not yet in the repository.
- Most operator commands are still missing.
- No rehearsal has taken place.

`FINDINGS.csv` lists the owners.

**What does a receipt prove?**
That the organisation's ORVIA installation durably saved the person's choice, with its version number and time, in the same transaction as the follow-up work. It does not prove that any downstream system changed. The stored receipt never changes; current progress is shown separately with its own time. (CL-06)

**What does an observation prove?**
That ORVIA read a specific target record, by a named method, at a recorded time and generation, and saw the required state, within the stated scope. It is different from a system's "OK" reply. It can become out of date, and it proves nothing about systems ORVIA cannot read. (CL-09)

**Which processing boundary is controlled?**
Only the local, supported send-admission point in the prototype. At admission it rechecks current consent and the published policy. It does not intercept other software, and it cannot recall messages already sent. (CL-10)

**How are unknown effects handled?**
A lost reply is recorded as *outcome unknown*, not *failed*. ORVIA then records a separate reconciliation attempt and reads the target or its receipt. The uncertain attempt is never rewritten as a success. If the read cannot settle the question, the item stays unknown and assigned. Retries are bounded and escalate to a person. The same principle applies to a person's own request: after a timeout the page retries the *same* request rather than creating a new one. (CL-11)

**How do customer and vendor identities differ?**
Staff and data principals have separate sessions scoped to their organisation. Organisation administrators manage their own installation. The prototype accepts no Cyberfyx vendor identity and has no vendor remote administration. Commerce and release signing sit in a separate trust domain from customer evidence keys. (CL-04; CONTRACT §1, §7)

**What stays customer-local?**
Operational records, identifiers, evidence, logs, workflow history and test targets all run inside the local environment:

- no vendor analytics, crash uploads, remote fonts or CDN scripts;
- the Cyberfyx website is marketing only, not a processing plane.

The claim will be backed by the T26 egress capture for the tested interval. (CL-17)

**Why is runtime AI excluded?**
Version 1 is defined as a non-model release in the approved plan, and the learned-AI capabilities are designated for Version 2. For this prototype, excluding models means:

- no model is shipped;
- there are no hosted model calls, embeddings or training, and no GPU dependency;
- customer data never needs to leave the environment for inference.

The result is deterministic behaviour that can be tested. (CL-18)

**What production gates remain?**
The prototype can pass on synthetic data and still be far from production. The full master release gates still apply: security (including penetration testing), legal review, real connectors, deployment and ingress separation, high availability and disaster recovery, licensing and updates, and support processes. (EXECUTION_PLAN §8)

**Can we show it to a customer?**
No. It is an internal demonstrator on fictional data. Customer pilots are subject to the full master gates.

**Is the demo live or recorded?**
Every recording carries a "RECORDING — not live" caption with its build and date. None exists yet.

---

## 9. Evidence status table (generated from EVIDENCE_INDEX.json)

<!-- BEGIN GENERATED: handover-evidence -->
| Area | Tests | Canonical status (Work) | With records | Inspected PASS on candidate |
|---|---|---|---|---|
| Start, bootstrap, isolation, roles | T01–T05 | NOT_RUN | 0 / 5 | 0 / 5 |
| Configuration and consent | T06–T10 | NOT_RUN | 0 / 5 | 0 / 5 |
| Workflow, commands, CRM, admission, policy | T11–T16 | NOT_RUN | 0 / 6 | 0 / 6 |
| Uncertainty, failure, manual | T17–T20 | NOT_RUN | 0 / 4 | 0 / 4 |
| Evidence and export | T21–T22 | NOT_RUN | 0 / 2 | 0 / 2 |
| Regression and recovery | T23–T25 | NOT_RUN | 0 / 3 | 0 / 3 |
| Egress, hygiene, reset | T26–T28 | NOT_RUN | 0 / 3 | 0 / 3 |
| Browser flow and repeatability | T29–T30 | NOT_RUN | 0 / 2 | 0 / 2 |
| **Total P0** | **T01–T30** | — | **0 / 30** | **0 / 30** |

All T01–T30 are mandatory for the completed internal demo, including tests whose live narration is optional.
<!-- END GENERATED: handover-evidence -->

## 10. Media index

<!-- BEGIN GENERATED: handover-media -->
Indexed: 0 screenshots, 0 recordings, 0 browser traces, 0 completed rehearsals (EVIDENCE_INDEX.json).
<!-- END GENERATED: handover-media -->

Each entry in `EVIDENCE_INDEX.json` → `media` records:

- file path;
- producer (Claude Code or the human);
- candidate commit and build;
- profile;
- capture time (IST);
- live or recorded;
- what it shows, and what it does not show.

Do not synthesise screenshots, retouch failures, or use a recording from an older build.
