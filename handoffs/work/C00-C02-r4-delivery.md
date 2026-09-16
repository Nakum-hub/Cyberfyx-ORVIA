# Work r4 delivery — C00, C01 and C02

**Author:** GPT Work, successor to Cowork. **Date:** 2026-09-16 UTC.
**Inspected base:** `2432a008539450725129d19ff5fc6c2eee488031` (PR #17 merged; includes PR #15/#16).
**Branch:** `prototype/work/cowork-r4-completion`. **Delivery commit:** the containing Git commit and review PR; no application candidate is identified by this documentary commit.
**Master:** rev 1.3; 850752 bytes; SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`.
**Contract:** accepted 0.2.1; present executable 0.3.0 and merged expiry correction await consolidated Work review.
**Profile:** document fixtures only; no ORVIA runtime profile started.

## Delivery and task definitions

| Task | Canonical state | Delivered now | Actual remaining gate |
|---|---|---|---|
| C00 — Prepare UX and leadership scenario | IN_REVIEW | Current 18-screen UX/copy, 28 journeys, loading/error/permission/recovery states and 12-step synthetic scenario; existing r3 wording and IDs preserved; concrete request-retention and missing-view display decisions supplied | Codex consumer cross-check and review/acceptance. C00 has no B00 dependency; B00 needs C00 for acceptance. This is Work self-review, not independent approval. |
| C01 — Capability truthfulness and operator runbook | BLOCKED; independent documents delivered | Exact original 33-module register restored; source-to-depth map, actual source-backed commands, current claims and 174 supplied engineering reports, including 32 non-zero exits, preserved with hashes | Start depends on accepted C00; acceptance depends on A00 (already accepted) and B00 (pending). Capability API compatibility and application/operator evidence remain bounded Codex inputs. |
| C02 — Prepare evidence-backed presentation handover | BLOCKED; presentation prepared | Current evidence/recording index, offline presentation, leadership answers, runbook/release checklist and evidence/rehearsal gate rules | C01 start dependency; A07 packaged candidate and B06 browser acceptance; actual candidate-matched artifacts and two qualifying T30 rehearsals. None supplied. No frozen handover claimed. |

The real inventory is `tracking/tasks.json`: 23 tasks, including only C00–C02 in this lane. W03 is Work's final acceptance gate. No task IDs, start/acceptance dependency meanings, P0/P1 selection, accepted commits or canonical application results were changed. W00/A00/A01 remain the only completed tasks. All 34 acceptance scenarios remain NOT_RUN; 30 P0 and four unpromoted P1.

## r4 corrections

| Defect | Correction and paired test coverage |
|---|---|
| Readiness can contradict its citation | Parse the exact authoritative readiness field and verify source bytes/revision/time; disagreement fails validation and renders INVALID_SOURCE. Value-only and stale-source negatives plus unchanged-source positive. |
| Candidate matching compares commit only | Match commit, build, contract, profile, fixture and scenario in both status files, records, claims and rehearsals. Every dimension has a mismatch negative; fully matching inspected evidence can qualify. Later failed/incomplete/unreviewed runs cannot hide behind older PASS. |
| Unsupported screen or browser PASS | Require known, scoped source evidence with existing paths/hashes for implementation; browser results require original candidate-matched BROWSER_ACCEPTANCE report with screen scope. NOT_IMPLEMENTED cannot also browser-PASS. |
| Missing files appear verified | Mandatory safe repository-relative artifacts, exact hash set, original report content and required child logs. Missing, hash-only, absent-reference, traversal, URL, absolute path and escaping symlink negatives. Historical unavailable evidence stays explicitly unavailable and cannot qualify. |
| Every rehearsal counted as completion | Separate indexed/started/aborted/completed/issues/qualifying counts; require original run log, documented starting state, actual 12-step outcomes, valid dates, full identity, review, distinct log/ID, nonoverlap and no unresolved issues. Actual controls demonstrate that two good runs can qualify. |
| Proposal and approval lifecycle inconsistent | All proposal bindings use the same source-backed, version-scoped approval rule; existing real W00 acceptance unlocks accepted 0.2.1 reconciliation and other fields. Consumer implementation/test status stays separate. Unsupported generation/version error maps remain unresolved rather than borrowing an unrelated acceptance. |
| Unsafe decision/session/incomplete-test copy | Decision unavailable does not authorize processing or assert no earlier effect; independent browser profiles/session stores are required; incomplete test copy preserves recorded assertions and failures. |

Original r3 defects were reproduced against the exact imported base in disposable copies. `artifacts/r4/r3-defect-reproduction.json` records the inherited behavior; synthetic data is labelled DOCUMENT-TOOL TEST DATA. It is never added to real application evidence. Tools use Python's standard library; no application code, manifest, lockfile or engineering script changed.

## Narrow Codex requests

| Owner/task | Exact paths or fields | Required correction/confirmation | Evidence to return |
|---|---|---|---|
| Codex B00–B03; Work semantic review | `docs/ux/UI_COPY.json`, `UX_BRIEF.md`, `ACCEPTANCE_JOURNEYS.md`; actual `apps/web` consumer routes | Cross-check accepted 0.2.1 fields and present 0.3.0 APIs; bind each copy ID, audience and trigger. Preserve separate action, observation, reconciliation and workflow states. Do not display withdrawal-specific ACCEPTED copy for another trigger. | Copy-ID/producer/consumer table, exact source commit, component checks and relevant browser assertions; retain failures. Work then records review separately. |
| Codex B02/A02, F-024 | UX_BRIEF `C00-R4-RECOVERY`; `recovery.portal.*`, idempotency key/payload/epoch and receipt/history reads | Same-tab in-memory request context and exact authorized retry are specified. Return an accepted customer-local mechanism for recovery after a full reload; no localStorage credentials or new key for an unresolved earlier effect. Absent retention cannot imply rollback or successful recovery. | Timeout after commit, same-key conflict/replay, reauthentication, changed principal, reload-lost-context negative and successful preserved-context tests. |
| Codex B03/shared contract, F-029 | `tracking/capabilities.json` vs `packages/contracts/src/index.ts` CapabilityRecord | Preserve genuine module IDs/names/V1–V2/depth and unknown/partial facts. Supply explicit mapping or versioned schema proposal; binary implementation enum must not silently promote partially supplied code to whole-module completion. Work reviews semantics. | Full 33-row mapping, generated schema/consumer changes if needed, negative unknown/partial and positive supported-profile browser tests. |
| Codex existing B/A IDs, F-007/008/009/013/016/017/018/023 | Findings and exact unresolved copy bindings | Supply remaining overview counts, reason map, retry/stale/quarantine states, manual-completion scope, receipt/config surfaces and supported auth UX bindings. Current document choices do not invent endpoints. | Exact producer and consumer source, scoped acceptance decision where needed, task-linked test reports. |
| Codex A06/A07/B04/B06 | `docs/runbooks/OPERATOR.md`, candidate identity and evidence schema | Supply guarded business seed/reset/export/restore/fault/egress/package procedures and matching UI/browser evidence. Preserve engineering report identities and failures; do not relabel command smoke as full acceptance. | Commit/build/contract/profile/fixture/scenario, original command/assertion reports, logs/media hashes, full selected scenario results and limitations. |
| Work with actual operator and human | C02/T30, existing W01–W03 review | Review supplied correction and integrated candidate, execute and record two actual qualifying rehearsals, obtain human review/release decision. | Separate two run logs/start-state artifacts and review records. No future run has been scheduled or invented. |

The missing application inputs do not block these document-tool repairs or the independently completed documents. They do block application claims and candidate-backed C02 completion.

## Validation, evidence and limits

Actual commands/results are recorded in `docs/reviews/cowork/VALIDATION.md` and `artifacts/r4/`. The regression suite exercises negative and positive states in disposable document fixtures. Offline-pack browser inspection, if executed, is documentation QA only. Supplied engineering reports were inspected, not rerun. No new ORVIA application, security, browser acceptance, recovery, egress or rehearsal test was executed by this session.

Review provenance is **Work self-review**. Codex cross-check, human acceptance, GitHub merge and prototype readiness remain distinct. Internal demo NOT_READY; production security/legal/supply-chain/full recovery NOT_ASSESSED. Ownership transfer was recorded in a separate first commit; historical Cowork paths/authorship and earlier GitHub 403 failures remain preserved. Current Work GitHub access is checked independently. Publication is a review PR with individual files, no main push/merge/deployment.
