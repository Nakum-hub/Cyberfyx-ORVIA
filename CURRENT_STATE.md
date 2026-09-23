# ORVIA — current execution state

**Writer:** Work · **Checkpoint:** 2026-09-23 source inspection at main e58b281b21af9398bc879d3a43fc748cc83ba626; current frozen candidate NOT_IDENTIFIED · **Date:** 2026-09-23

> **Read this current checkpoint first.** Earlier dated engineering results and candidate identities below remain historical and do not qualify the later source commit.

| Field | Current evidence / decision |
|---|---|
| Inspected route/contract source | e58b281b21af9398bc879d3a43fc748cc83ba626; latest fetched main 43383f4a2862c715aa78e72cd755e986cae380be changes tracking/capabilities.json only; master rev 1.4 SHA-256 c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b. Later code follows the previously qualified f521e16. Current inventory and candidate build have not been qualified here. |
| Current candidate | NOT_IDENTIFIED. The c5655ea candidate is VOID following source changes; the older 81431d64 identity in the evidence index is historical only. New integration-source qualification and both rehearsals are needed. |
| Work document evidence | Source-linked copy and screen-route paths rechecked here; document validation never executes T01–T34 or supplies browser acceptance. |
| Current integration / reviewed runtime | Continuation branch `prototype/work/final-prototype-continuation`. Five source commits close the qualification defects found in the final engineering review: `596a275` (F-01/F-02/F-03/F-04/F-06/F-08/F-09/F-10/F-11), `ba2a0d5` (capability register and contract seed kept inside runtime source), `f025861` (per-bucket authentication window), `9a0b657` (deliberate audit probes separated from genuine faults) `d1e5bc5` (git status parsed by status column), `b6313cc` (capability register made truthful and given a validator) and `c5655ea` (business-boundary readiness on restart, and spacing for every reviewer proof). Everything before them is superseded as a candidate but retained as history. |
| Frozen final candidate | **VOID as of 2026-09-22.** `c5655eacf86a68e4aa76ae3b79a1328517c0d23d` was frozen over a **224-file** qualified inventory (`6a90215d…`). Engineering has continued since: the qualified inventory is now **376 files** with SHA-256 `cf5ee5a9e2f18f8f87823cdb0e90f9e57af0f30581993fede9366cbcbf6ec831` at commit `f521e16e1105e8c4127dbc8c37cf06e96c4a62a2`. `REHEARSAL_RUNBOOK.md` states the rule plainly: *if any file in the qualified source inventory changes, this candidate is void; a new candidate must be frozen and both rehearsals repeated.* That has happened, so the candidate identity, the manifest SHA-256 and the host build id recorded here no longer describe this repository and must not be quoted as if they did. Nothing is being claimed in their place: freezing a new candidate runs on the `rehearsal` profile via `candidate:package` and is part of the same human gate as the rehearsals. The preconditions for it are now met — see the 2026-09-22 section. Historical candidates `766854399d…`, `81431d64…`, `c383b9d9…` and now `c5655eac…` are superseded and retained as history. |
| Source / contract | The Rev 1.4 master that controls V1 is now in the repository: `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md` SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`. The rev 1.3 source remains at `docs/source/…` SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`, unchanged. Executable transport is now **0.14.0** (was 0.5.0); signed command **0.3.0** unchanged. `contracts:check` validates 8 artifacts, the canonical seed, **158 route examples** and 7 error examples. Nine migrations were added since the void candidate (`0027`–`0035`), so the schema is **36 migrations**. Lockfile SHA-256 `04bd68db874dc585ea83bf38e830dba8aa13248de88a4590dcba3b8f5a38a51e`; no dependency change. |
| Owners | Work: sole canonical writer, review/state/tracking documents and the transferred former-Cowork UX/copy/capability/demo/runbook/document-tool paths and C00–C02. Codex: all application engineering plus transferred UI/component/browser B IDs. Human: approvals, merge, release and final sign-off. |
| Accepted tasks | W00, A00, A01 (historical) plus **A02 `3242521e…`, A03 `03410094…`, A04 `94d3e722…`, A05 `d94f525e…`, A06 `3c2ee18f…` and W01 `81431d64…`**, accepted on executed evidence at the frozen candidate. |
| W01 — authority and consent | **ACCEPTED.** Historical MEDIUM W01-A02-F01 (freshness/expiry not enforced at consumption after lock waits) is **CLOSED** on executed evidence: `tests/integration/consent/expiry.test.ts` 87/87 assertions including 15 real "transaction and wait began before expiry" controls. Full review: `handoffs/work/final-prototype-continuation/W01-consolidated-review.md` and `docs/reviews/work/AUTH_AND_CONSENT.md`. |
| W02 — integration, failure, security, recovery | **Review content ACCEPTED** on executed evidence; the canonical ticket remains BLOCKED only by its board dependency chain (see the blocking gate row). FINAL-B06-F02 (manual-attestation contract gap), FINAL-B06-F05 (browser fixture ownership timeout) and FINAL-CONT-F06/F07 (Test Lab harness) are closed. Full review: `handoffs/work/final-prototype-continuation/W02-consolidated-review.md` and `docs/reviews/work/INTEGRATION_AND_SECURITY.md`. |
| Executed results at the candidate | The figures that stood at `c5655eac…` are superseded; see the 2026-09-22 section for what was executed at commit `f521e16…` over the clean 376-file inventory. In summary: every check runnable on the `codex-a00` profile passes — static battery, **173 unit tests**, **24 integration suites totalling 1,005 assertions**, regression 70, network qualification 13, security auth and isolation, services and web smoke, hygiene 0 findings, and `runtime:build` PASS with the image source label matching the candidate inventory. `test:lifecycle` and `test:tls` are `rehearsal`-profile-only by their own guards and remain NOT_RUN here, which is the design rather than a failure. |
| Retained failures | Retained, not overwritten, and each explained rather than hidden. From the review session: a browser run that failed 16/16 with `EADDRINUSE` because an operator left `app:run` holding port 4330 while the suite tried to start its own server; auth/evidence/enforcement runs that hit a real 429 before the authentication-window guard existed; and an `app:run` that failed because machine enrollments had expired. From this session: `B06-exec-2026-09-18T01-27-55…` failed at the candidate because Docker services were down (`ECONNREFUSED` on PostgreSQL), and the following run at the same candidate passed 17/17. One `test:auth` run failed mid-sequence on a post-restart request timeout under container load and passed unchanged in isolation and on the next sequence. All earlier checkpoint failures remain in place. |
| Canonical acceptance | T01–T34 remain **NOT_RUN**; nothing is promoted. Component coverage is now stronger than it has ever been — every mandatory suite passes at one exact candidate — but component success is still not application acceptance. Promotion requires genuine `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records, which only the two human rehearsals produce. Per-scenario detail: `handoffs/work/final-prototype-continuation/T01-T30-reconciliation.md`, whose per-suite references now resolve against this candidate. |
| Blocking gate | The canonical board chain `C00 → B00 → B01/B02 → B03 → B04 → W02 → A07 → B06 → C02 → W03` still cannot advance because **C00 acceptance is a documented human decision** that has not been made. The engineering is merged, qualified and now free of every known blocking defect; only the acceptance act is outstanding. |
| Scope / isolation / time | `CUSTOMER_LOCAL_SYNTHETIC` marketing withdrawal; AI DEFERRED_V2; no P1 promoted; no public deployment. Synthetic Aster/Birch fixtures only. `codex-a00`, `ui-b00` and `rehearsal` stores remain separate; `.local` credentials, keys and raw authenticated traces stay off GitHub. |
| Certificate trust | The reviewed rehearsal CA `8C592FC41BBD6AA18F42234085F6B8155466A190` was reinstalled in `CurrentUser\Root` under fresh explicit human approval and independently verified with `certutil`. It is temporary and must be removed after the rehearsals; record: `handoffs/work/final-prototype-continuation/certificate-trust.json`. No validation bypass, plaintext fallback or machine-wide trust was used. |
| Readiness | Internal-demo NOT_READY; current candidate NOT_IDENTIFIED, T01–T34 NOT_RUN, two qualifying rehearsals NOT_RUN, C00 human acceptance outstanding, W03 BLOCKED. Production security/legal/supply-chain/full recovery NOT_ASSESSED under separate master gates. |
| Next action | Human accepts or returns C00; Codex supplies dependency-ready engineering. Human integrates and freezes a new qualified candidate, then supervises two documented rehearsals with its exact identity. Work reviews actual results before W02/W03 acceptance. The old runbook fixed identity must be updated before execution. |

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

## Engineering continuation — 2026-09-22

Written by the engineering lane. This section records what changed after candidate `c5655eac…` was frozen, why
that candidate is void, and what is now true. Nothing here promotes a gate, and no acceptance result is claimed.

### What was built

Ten requirements across four modules, each with a migration where it needed one, contract invariants, an
integration suite that drives the real product, a workspace screen and a handoff:

| Requirement | What it added |
|---|---|
| FR-M33-01, FR-M33-03 | Audit administration: append-only trail with corrections, scoped read/export, export ceiling. |
| FR-M29-03 | The nine-step guided connection, five steps derived from evidence kept elsewhere. |
| FR-M12-03, FR-M12-04 | Notices in the Eighth Schedule languages, and classified notice changes. |
| FR-M29-01, FR-M29-02 | Eleven preflight gates, each answered by examining something rather than asserting it. |
| FR-M32-03 | Backup declaration and restore quarantine with consent reconciliation. |
| FR-M32-04 | An account of everything ever disclosed to the vendor, derived from records already kept. |
| FR-M33-04 | Purpose-based audit retention; payload absence measured rather than promised. |
| FR-M29-04 | One typed local import path — quarantine, preview, conflict handling, provenance, purge. |

**100 of the 104 routed requirements now have built and exercised code.** The remaining four are M26 Billing,
which is out of sprint scope and blocked by OPEN-03 — no payment vendor, price or tax semantics may be invented.

Three modules stay `PARTIAL_SANDBOX` even though every routed requirement under them now has code, because in
each case one clause is satisfied by an absence rather than by built behaviour, and promoting on that basis would
overstate what exists:

- **M29** — FR-M29-02's customer-held recovery route is not built. Building one would pre-empt OPEN-07, whose
  interim rule is *reuse existing safe identity implementation; no custom auth/backdoor*.
- **M32** — FR-M32-04 has no vendor-side surface to render because no vendor service exists anywhere in this
  build. Vendor service health is reported as unobserved with the reason, never as healthy.
- **M33** — FR-M33-02's separation holds because there is no vendor-facing audit surface at all, not because this
  module built one.

### Why the frozen candidate is void, and what unblocked freezing a new one

`REHEARSAL_RUNBOOK.md` voids a candidate when any file in the qualified source inventory changes. That inventory
went from **224 files** to **376**, so `c5655eac…` is void and both rehearsals must be repeated against a new
candidate. Two preconditions for freezing one were broken and are now fixed:

1. **The inventory was permanently dirty.** `pnpm-lock.yaml` is qualified source, and it had been carrying an
   uncommitted `@pnpm/exe` entry — a Windows-local toolchain artefact no manifest declares. While it stood, every
   `sourceState()` read `dirty: true`, and `candidate:package` refuses to package a dirty tree, so no candidate
   could ever have been frozen. The entry was reverted rather than committed, because committing it would put a
   platform-specific binary reference into a delivered lockfile. `dirty` is now `false`.
2. **The runtime image did not match source.** `test:network` compares the image's `orvia.source-tree` label
   against the live inventory and failed, correctly, because the image had been built from the dirty tree. The
   image was rebuilt; the label now matches `cf5ee5a9…`. `candidate:package` makes the same comparison and would
   have refused.

Freezing the new candidate is deliberately **not** done here: `candidate:package` requires the `rehearsal` profile
and an explicit `confirm:rehearsal`, which places it inside the same human gate as the rehearsals themselves.

### Executed at commit `f521e16e1105e8c4127dbc8c37cf06e96c4a62a2`

Qualified inventory `cf5ee5a9e2f18f8f87823cdb0e90f9e57af0f30581993fede9366cbcbf6ec831`, 376 files, `dirty: false`,
profile `codex-a00`, contract 0.14.0 / signed command 0.3.0.

**Static.** `contracts:check` 8 artifacts, canonical seed, 158 route examples, 7 error examples · typecheck clean ·
lint clean · **173 unit tests, 0 failures** · `tracking:check` 23 tasks, 34 acceptance definitions, 33 capability
modules · hygiene **0 findings** · dependency advisories 0 findings · production build · `runtime:build` **PASS**.

**Integration — 24 suites, 1,005 assertions, 0 failures.** consent 50 · expiry 87 · enforcement 46 · evidence 69 ·
graph 48 · rights 64 · retention 45 · coverage 52 · processors 35 · incidents 42 · notifications 32 · licensing 33 ·
monitoring 31 · restore 33 · vendor-visibility 18 · support 57 · updates 54 · audit 51 · audit-retention 24 ·
connection 33 · languages 19 · preflight 19 · imports 31 · workflows 32.

**Regression** 70 assertions · **network qualification** 13 assertions · **security** auth and fixture isolation ·
**services smoke** and **web smoke** — all PASS, exit 0.

**Not run here, by design.** `test:lifecycle` and `test:tls` guard themselves to the `rehearsal` profile and refuse
to run on `codex-a00`. That is the product being honest about where it may execute, not a failure, and they are
recorded as NOT_RUN rather than skipped quietly.

### A correction to the run recorded above

The integration figures in the previous section were collected by running each suite and then reading the
newest artifact matching its name. That method is unsound, and it misreported two suites. `test:updates`
requires `ORVIA_RELEASE_KEY_ID`, `ORVIA_RELEASE_PRIVATE_KEY` and `ORVIA_RELEASE_PUBLIC_KEY` in the
environment; without them it throws before writing any artifact, so the reader picked up a record from a run
roughly a day earlier and reported it as current. The suite did not pass in that batch, because it did not
run at all.

`test:licensing` has the same shape: it needs `ORVIA_LICENCE_KEY_ID`, `ORVIA_LICENCE_PRIVATE_KEY` and
`ORVIA_LICENCE_PUBLIC_KEY`, and without the public key the untrusted-signer refusal arrives as a bare 503
rather than the named rejection, so a run can fail in a way that looks like a product fault. Run properly it
passes **33 assertions, 0 failures**.

Both were checked deliberately after the first was found, and those two are the only suites that hard-fail on
a missing environment variable — `evidence`, `workflow` and the auth security suite reference `ORVIA_` values
but do not depend on a key pair being supplied.

`test:updates` has since been run properly with the fixture key pair and passes **54 assertions, 0 failures**, so the
figure quoted above is correct — but it was correct by luck rather than by method, and that is worth saying
plainly rather than leaving a number nobody could reproduce.

Two things changed as a result. The suite's own error message now prints the exact command with all three
variables, so the next person is not left diagnosing a prerequisite. And the reason all three are needed is
recorded in the test: the suite signs with the private key while the application verifies with the public
one, so the untrusted-signer refusal only reaches its real code path when the server was started trusting
the same key — a run missing the public key could otherwise look like it exercised verification when it
never could have.

### What this does not change

**T01–T34 remain `NOT_RUN` and nothing is promoted.** `scripts/tracking.ts` will only accept a `PASS` backed by an
`APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` record, and `T01-T30-reconciliation.md` is explicit that transcribing a
component artifact into one *would manufacture the exact claim the validator and the brief forbid*. Every suite
above is component-scoped. The two human-run or human-supervised rehearsals remain the only designed producer of
those records, and the browser acceptance gate is unchanged.

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
