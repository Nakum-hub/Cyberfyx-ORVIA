# ORVIA — current execution state

**Writer:** Work · **Checkpoint:** qualification defects F-01–F-11 closed; new candidate `c5655eac…` frozen and fully re-qualified; C00 and both rehearsals outstanding · **Date:** 2026-09-18

| Field | Current evidence / decision |
|---|---|
| Current integration / reviewed runtime | Continuation branch `prototype/work/final-prototype-continuation`. Five source commits close the qualification defects found in the final engineering review: `596a275` (F-01/F-02/F-03/F-04/F-06/F-08/F-09/F-10/F-11), `ba2a0d5` (capability register and contract seed kept inside runtime source), `f025861` (per-bucket authentication window), `9a0b657` (deliberate audit probes separated from genuine faults) `d1e5bc5` (git status parsed by status column), `b6313cc` (capability register made truthful and given a validator) and `c5655ea` (business-boundary readiness on restart, and spacing for every reviewer proof). Everything before them is superseded as a candidate but retained as history. |
| Frozen final candidate | **`c5655eacf86a68e4aa76ae3b79a1328517c0d23d`**, qualified source inventory SHA-256 `6a90215df79e8a04612927bbe059c6f167551155e0908f555525c3399b2f249d` over **224 tracked files**, host build `sd85T6NMjOMCYlF94AaeS`, manifest SHA-256 `281810f57ae03338d5a65c6b16fb1db6cf4477215e44e9e5b672f6a25de964fc`. `artifacts/release-manifest.json` remains the full authority for container build, runtime image digest, service digests and package hashes. **This row can now safely name the candidate.** The identity was circular before: `CURRENT_STATE.md` and `tracking/` were inside the qualified inventory, so recording a result about a candidate changed the inventory that result named. Live state documents are now hashed separately as `gate_state` and are outside the candidate identity — see `scripts/source-paths.mjs`. Independent verification at this candidate reports **242 checks, 0 failures**; every earlier dated report is preserved beside it in `handoffs/work/final-prototype-continuation/`. Historical candidates `766854399d…`, `81431d64…` and `c383b9d9…` are superseded. |
| Source / contract | Master rev 1.3 SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6` unchanged. Executable transport **0.5.0**, signed command **0.3.0**. `contracts:check` validates 8 artifacts, the canonical seed, 41 route examples and 7 error examples. Lockfile SHA-256 `b2694da120310a26a6ae377ebecbd4dafcac6711b60377c4ff308fe4fc91a5c8` unchanged; no dependency or migration change. |
| Owners | Work: sole canonical writer, review/state/tracking documents and the transferred former-Cowork UX/copy/capability/demo/runbook/document-tool paths and C00–C02. Codex: all application engineering plus transferred UI/component/browser B IDs. Human: approvals, merge, release and final sign-off. |
| Accepted tasks | W00, A00, A01 (historical) plus **A02 `3242521e…`, A03 `03410094…`, A04 `94d3e722…`, A05 `d94f525e…`, A06 `3c2ee18f…` and W01 `81431d64…`**, accepted on executed evidence at the frozen candidate. |
| W01 — authority and consent | **ACCEPTED.** Historical MEDIUM W01-A02-F01 (freshness/expiry not enforced at consumption after lock waits) is **CLOSED** on executed evidence: `tests/integration/consent/expiry.test.ts` 87/87 assertions including 15 real "transaction and wait began before expiry" controls. Full review: `handoffs/work/final-prototype-continuation/W01-consolidated-review.md` and `docs/reviews/work/AUTH_AND_CONSENT.md`. |
| W02 — integration, failure, security, recovery | **Review content ACCEPTED** on executed evidence; the canonical ticket remains BLOCKED only by its board dependency chain (see the blocking gate row). FINAL-B06-F02 (manual-attestation contract gap), FINAL-B06-F05 (browser fixture ownership timeout) and FINAL-CONT-F06/F07 (Test Lab harness) are closed. Full review: `handoffs/work/final-prototype-continuation/W02-consolidated-review.md` and `docs/reviews/work/INTEGRATION_AND_SECURITY.md`. |
| Executed results at the candidate | All executed at the exact candidate and recorded in the manifest under `exact_candidate_evidence`, with **`failures_at_candidate` empty** and a single clean browser run at the candidate; 175 earlier records are retained separately as `historical_engineering_evidence` and are never relabelled. Static: `contracts:check` (8 artifacts, canonical seed, 41 route and 7 error examples), typecheck, lint, **20/20 unit tests**, `tracking:check` (23 tasks, 34 acceptance definitions, 33 capability modules), production build, hygiene (**0 findings**). Backend: auth 87, consent 50, evidence 69, enforcement 46, workflows 32, expiry 87, regression 70, lifecycle 17, TLS 12, services smoke 4, network qualification 13 — **every suite PASS, exit 0**, and dependency advisories 498 lock packages against 7408 reviewed advisories, 0 findings. Browser: **17/17 PASS, exit 0** at the exact candidate commit and inventory, `dirty` false, all seven mandatory suites, Chromium over normal trusted HTTPS with no bypass; **0 console errors, 0 React/hydration warnings, 0 genuine page errors**, and 1306 requests across 17 contexts all to `https://127.0.0.1:4330` with **0 foreign origins**. |
| Retained failures | Retained, not overwritten, and each explained rather than hidden. From the review session: a browser run that failed 16/16 with `EADDRINUSE` because an operator left `app:run` holding port 4330 while the suite tried to start its own server; auth/evidence/enforcement runs that hit a real 429 before the authentication-window guard existed; and an `app:run` that failed because machine enrollments had expired. From this session: `B06-exec-2026-09-18T01-27-55…` failed at the candidate because Docker services were down (`ECONNREFUSED` on PostgreSQL), and the following run at the same candidate passed 17/17. One `test:auth` run failed mid-sequence on a post-restart request timeout under container load and passed unchanged in isolation and on the next sequence. All earlier checkpoint failures remain in place. |
| Canonical acceptance | T01–T34 remain **NOT_RUN**; nothing is promoted. Component coverage is now stronger than it has ever been — every mandatory suite passes at one exact candidate — but component success is still not application acceptance. Promotion requires genuine `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records, which only the two human rehearsals produce. Per-scenario detail: `handoffs/work/final-prototype-continuation/T01-T30-reconciliation.md`, whose per-suite references now resolve against this candidate. |
| Blocking gate | The canonical board chain `C00 → B00 → B01/B02 → B03 → B04 → W02 → A07 → B06 → C02 → W03` still cannot advance because **C00 acceptance is a documented human decision** that has not been made. The engineering is merged, qualified and now free of every known blocking defect; only the acceptance act is outstanding. |
| Scope / isolation / time | `CUSTOMER_LOCAL_SYNTHETIC` marketing withdrawal; AI DEFERRED_V2; no P1 promoted; no public deployment. Synthetic Aster/Birch fixtures only. `codex-a00`, `ui-b00` and `rehearsal` stores remain separate; `.local` credentials, keys and raw authenticated traces stay off GitHub. |
| Certificate trust | The reviewed rehearsal CA `8C592FC41BBD6AA18F42234085F6B8155466A190` was reinstalled in `CurrentUser\Root` under fresh explicit human approval and independently verified with `certutil`. It is temporary and must be removed after the rehearsals; record: `handoffs/work/final-prototype-continuation/certificate-trust.json`. No validation bypass, plaintext fallback or machine-wide trust was used. |
| Readiness | Internal-demo **NOT_READY** pending human acts only. Candidate frozen and fully re-qualified; rehearsal procedure verified executable as written; two rehearsals NOT_RUN; W03 BLOCKED; human NOT_SIGNED. Production security, legal, supply-chain and full disaster recovery remain NOT_ASSESSED and governed separately by the master. |
| Next action | Human accepts or returns C00; human runs or supervises Rehearsal 1 and Rehearsal 2 on candidate `c5655eac…` using `handoffs/work/final-prototype-continuation/REHEARSAL_RUNBOOK.md`, whose preparation steps now include the machine-enrollment renewal that previously blocked startup; Work then completes C02 and W03. Remove the temporary CA trust after the rehearsals and record its absence. Human retains merge, release and sign-off. |

| Work ticket | Document deliverable | Acceptance / remaining gate |
|---|---|---|
| W00 | [Scope/ADR and A00 review](docs/reviews/work/W00_A00_ACCEPTANCE.md) | COMPLETED; accepted commit retained |
| W01 | [Authority/consent](docs/reviews/work/AUTH_AND_CONSENT.md) | **COMPLETED** at candidate `81431d64…`; W01-A02-F01 closed on executed evidence |
| W02 | [Integration/security/recovery](docs/reviews/work/INTEGRATION_AND_SECURITY.md) | Review content accepted; ticket BLOCKED on the B04 chain, which is gated on C00 human acceptance. The eleven qualification defects raised in the final engineering review (F-01 to F-11) are closed at candidate `c5655eac…`; F-07 and F-12 are retained as documented bounded limitations, not defects. |
| C00 | [UX/copy/journeys/scenario](handoffs/work/C00-C02-r4-delivery.md) | IN_REVIEW; **human acceptance outstanding and now the critical-path blocker** |
| C01 | [Capability map/runbook/claims/evidence](handoffs/work/C00-C02-r4-delivery.md) | BLOCKED; refreshed against the frozen candidate, start dependency C00 |
| C02 | [Presentation/release handover](docs/demo/LEADERSHIP_HANDOVER.md) | BLOCKED; candidate now identified, but two qualifying rehearsals are absent |
| W03 | [Final gate report](docs/reviews/work/FINAL_GATE_REPORT.md) | BLOCKED; recommendation remains NOT_READY until R1/R2 and the outstanding acceptances |

Work alone consolidates this record. Other lanes submit factual handoffs. The complete continuation record for this session, including every command, interval, exit code and artifact, is
`handoffs/work/final-prototype-continuation/`.

## History

Previous checkpoints are preserved and are not restated here. `handoffs/work/final-prototype-7bc7780/`
holds the Codex pause checkpoint, its original request, bounded corrections and the intake verification of
the historical 0.4.1 candidate. Earlier r3/r4 delivery, takeover and delivery-audit notes remain in
`docs/reviews/cowork/VALIDATION.md` and the C-lane handoffs at their original identities. Source presence,
engineering PASS, Work acceptance, full canonical scenario acceptance and human rehearsal remain five
different facts.

## Qualification defect closure — 2026-09-18

Eleven defects from the final engineering review are closed at candidate `c5655eac…`. Each was closed by
fixing the cause, not by relabelling the result.

| ID | Closure |
|---|---|
| F-01 | Candidate identity de-circularised. One definition of qualified runtime source in `scripts/source-paths.mjs`; live state hashed separately as `gate_state`. The manifest partitions `exact_candidate_evidence` from `historical_engineering_evidence` and reports `failures_at_candidate`. No ancestor evidence is relabelled. |
| F-02 | `tests/unit/tracking.test.ts` derives two mutually independent downgradable tasks from the live board instead of hard-coding ids, so it stays correct as the board advances. `validateTracking` is unchanged, and a new test asserts it still rejects a genuinely invalid dependency progression. 16/16. |
| F-03 | The runbook renews machine enrollments before startup, and `safeError` carries static operator guidance from a curated table keyed by error code — never text taken from the error — so an expired enrollment now reports `MACHINE_ENROLLMENT_EXPIRED` instead of a bare `UNCLASSIFIED`. |
| F-04 | `verify-candidate.py` writes one timestamped report per execution and preserves every earlier one. Proven by two consecutive runs, 241 checks and 0 failures each. |
| F-05 | The two authentication rate-limit buckets are measured separately against the real limit, with deterministic waiting for the genuine idle window. The limit is unchanged, nothing is retried and no audit row is cleared. |
| F-06 | `not-found.tsx` and `error.tsx` render inside the ORVIA shell with the synthetic banner and a route back, keep HTTP 404 semantics, and show no stack trace. Route-level 404, missing record, malformed identifier and server error stay four distinct outcomes. |
| F-07 | Retained as a documented bounded limitation, not redesigned. The Failure Centre lookup is bounded and never claims an exhaustive search. Measured against the live fixture at the time of review: 120 workflows. |
| F-08 | A console and page-error audit covers every page in each browser context. Uncaught errors and React correctness warnings fail the run; deliberate HTTP statuses are recorded as `HTTP_STATUS` and do not. The reporter publishes the result into `results.json`, separating genuine `faults` from `deliberate_faults`, and a spec proves a synthetic page error is captured. |
| F-09 | Navigation destinations can be marked signed-out-only and are filtered by the server-derived session. Hiding remains presentation; the server still authorises every request. |
| F-10 | A conservative CSP is served on every response with all fetching directives set to `'self'`, so the no-remote-script claim is browser-enforced. `script-src`/`style-src` keep `'unsafe-inline'` because the App Router streams inline bootstrap scripts; removing it needs a per-request nonce from middleware and is recorded as post-prototype hardening rather than shipped weak. |
| F-11 | Evidence recorders and candidate identity share one tracked inventory, so an unrelated untracked file no longer changes the source hash and `dirty` means qualified source changed. A latent `git status` parsing bug found while proving this is fixed in `statusPath`. |
| F-12 | Retained as an accepted limitation. The Test Lab is read by exact run ID; the screen says so and the runbook tells the operator to record it. |

## Plan comparison — 2026-09-18

The built prototype was compared against `ORVIA — working prototype execution plan 1.0`. All eleven P0
capabilities, all eleven scenario steps and the selected architecture are built and covered by executing
suites at this candidate. None of the four optional P1 slices was promoted, which the plan permits and the
sprint brief required. Both listed presentation-polish items exist.

One substantive gap was found and closed: `tracking/capabilities.json` still carried its A00 inspection
baseline, so all 26 Version 1 modules read `NOT_INSPECTED` with no evidence — including modules this build
demonstrates live. The register now describes this build, each built module names suites that resolve, and
`validateCapabilities` plus four unit tests and three browser assertions keep it from drifting again.

Two harness defects were found while re-qualifying and fixed: readiness was declared on `/healthz` before
the business route graph had loaded, so a suite restarting the application raced its first business
request; and nine reviewer re-authentications across the consent and expiry suites bypassed the
authentication window guard. Neither was a product defect, and neither is masked by a retry.
