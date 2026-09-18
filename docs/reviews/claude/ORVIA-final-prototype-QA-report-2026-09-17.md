# ORVIA — final prototype execution, interface validation and acceptance review

**Reviewer:** Claude Code (integration / QA / UX / security / release lane)
**Date:** 2026-09-17
**Nature of this document:** a record of what was actually executed and observed. No gate is promoted here, and no human decision is recorded or simulated.

---

## 0. Candidate under review

| Field | Value |
|---|---|
| Repository | `Nakum-hub/Cyberfyx-ORVIA` |
| Latest integrated `main` | `4aa57de` (merge of PR #27) |
| Working tree at review | `e26bde8`, tree `54ad4aa5…` — **byte-identical to `origin/main`** (`git diff HEAD origin/main` empty) |
| Frozen candidate named by `artifacts/release-manifest.json` | `c383b9d9a1b5c26ade00d987c714ec889e27934b` |
| Source inventory | **224/224 manifest files recomputed and matched byte-for-byte**, before and after all testing |
| Host build ID | `pKS-S9WY5IsMrwB9DecCI` — matches `apps/web/.next/BUILD_ID` |
| Contract | `0.5.0` (signed command `0.3.0`) |
| Profile / fixture | `rehearsal` / `aster-birch-v1` |
| Origin | `https://127.0.0.1:4330`, reviewed CA `8C592FC4…` trusted in `CurrentUser\Root` |

`e26bde8` and `0ff33e9` touch only `artifacts/`, `handoffs/` and evidence files — **no file in the 224-file source inventory**. The candidate source is therefore live in the working tree, and everything below ran against it.

**I changed no source file.** Final re-check after all execution: 224 manifest files, 0 mismatches; `git status` shows only my own untracked `Claude outputs/` directory. The candidate is **not voided** by this review.

---

## 1. Prototype state

Two different numbers, because one number would be misleading:

- **Engineering implementation of the agreed `CUSTOMER_LOCAL_SYNTHETIC` scope: ~97% complete.** Every mandatory route exists, every mandatory control I exercised is genuinely wired to the real backend, and the full end-to-end chain (UI → generated client → session/capability → route → domain → Postgres/Temporal/OPA → agent → synthetic target → independent read → UI) executes for real. Two defects (§3 F-02, F-06) and a set of smaller items remain.
- **Acceptance / release readiness: not met.** C00 is an unmade human decision, T01–T34 are all `NOT_RUN`, both rehearsals are `NOT_RUN`, W03 is `BLOCKED`, and the release manifest's own evidence does not stand at the candidate (§3 F-01).

---

## 2. What I actually executed

### 2.1 Startup (Phase 2)

Docker was down and no rehearsal container was running. Containers were restarted with volumes untouched (`services up` — no reset, no volume deletion).

`preflight`: PostgreSQL **17.11** `orvia_rehearsal` PASS · OPA PASS (readiness only, arbitrary operation refused) · Temporal `orvia-rehearsal` PASS.
`inspect-state`: `pending_or_running_runs: 0`, no `orvia_worker` / `orvia_agent_control` activity, build `pKS-S9WY5IsMrwB9DecCI`, contract `0.5.0`.

First `app:run confirm:rehearsal` **failed** — see F-03. After the bounded local fix (renewing machine enrollments, which changes no source), the supervisor ran cleanly: HTTPS ready, Temporal worker `RUNNING`, agent polling, `/healthz` 200. `app:stop` exited 0 cleanly on both later runs with stores retained.

### 2.2 Browser suite — independently reproduced

```
node tests/e2e/record.mjs B06 exec playwright test --config tests/e2e/playwright.config.ts
```

**16/16 PASS, exit 0**, 16:53:59Z → 17:04:19Z, real Chromium, `ignoreHTTPSErrors:false`, no `--ignore-certificate-errors`, no plaintext fallback. All seven mandatory suites.

Rigour check on identity: I diffed my run's recorded source inventory against the reference 16/16 run at `c383b9d`. **All 382 common files byte-identical, 0 content differences.** The only delta is my own untracked report file (see F-11). This is a genuine independent reproduction, not a re-reading of old evidence.

Covered and observed passing: staff MFA + refresh + actor separation + logout; rejected login and read-only authority; expired session recheck; full candidate walkthrough; dependency outage, malformed ID, denied scope, responsive navigation; distinct-reviewer publication persistence; principal consent → immutable receipt → withdrawal → history → refresh; lost committed response preserving the exact request; stale interaction denial and dialog Escape; Test Lab healthy / broken-detection / repaired / target restoration; interrupted operator recovered as `ERROR` with no fabricated pass; rehearsal HTTPS without bypass; real target effect + independent read + evidence export; applied-response-lost reconciliation + visible manual obligation; acknowledgement-without-effect never reaching `VERIFIED`; manual task using its read version, preserving replay and rejecting a stale tab.

### 2.3 Static gates (Phase 22)

| Gate | Result |
|---|---|
| `contracts:check` | PASS — 8 artifacts, canonical seed, 41 route + 7 error examples |
| `typecheck` | PASS |
| `lint` | PASS, `--max-warnings 0` |
| `hygiene:check` | PASS — 1850 files, 33 browser bundle files, 81 generated credential values, **0 findings** |
| `tracking:check` | PASS — 23 tasks, 34 acceptance definitions, Markdown tables, nothing promoted |
| `test` (unit) | **FAIL — 14/15** → F-02 |

### 2.4 Backend suites — every assertion count reproduced exactly

| Suite | Assertions | Result | Claimed in `CURRENT_STATE.md` |
|---|---|---|---|
| `services:smoke` | 4 | PASS | 4 ✓ |
| `test:consent` | 50 | PASS | 50 ✓ |
| `test:workflows` | 32 | PASS | 32 ✓ |
| `test:enforcement` | 46 | PASS | 46 ✓ |
| `test:evidence` | 69 | PASS | 69 ✓ |
| `test:expiry` | 87 | PASS | 87 ✓ |
| `test:auth` | 87 | PASS | 87 ✓ |
| `test:regression` | 70 | PASS | 70 (T23–T25) ✓ |
| `test:lifecycle` | 17 | PASS | 17 ✓ |
| `dependencies:check` | 498 packages vs 7408 advisories | PASS, 0 findings | ✓ (T27 half) |
| `test:isolation` | — | refuses the rehearsal profile **by design** (`codex-a00` pin) | already a retained failure ✓ |

`test:auth`, `test:evidence` and `test:enforcement` each failed once when run back-to-back and passed in isolation — mechanism identified and proven in F-05. Those failure artifacts are retained, not overwritten.

### 2.5 T26 browser egress — reproduced

16 Playwright contexts, **1069 requests observed, single origin `https://127.0.0.1:4330`, 0 foreign origins.** No external analytics, model, font, CDN or third-party script. Scope limit stands verbatim: Playwright context only, not host-wide egress.

### 2.6 Direct browser inspection (closing the Phase 18 gap)

The existing suite does not capture console output (F-08), so I drove the running application directly.

- Root, `/workspace`, `/workspace/evidence`, `/privacy`, `/workspace/sign-in`, `/workspace/workflows/not-a-uuid`, `/workspace/does-not-exist`.
- **No uncaught JavaScript errors. No React warnings. No hydration warnings.** The only console entries are HTTP status logs: `401` from the unauthenticated session probe and `404` for the deliberately missing page.
- Unauthenticated deep links to guarded routes render "Sign in required" with a working link — no 404, no blank page, no infinite spinner, no dead navigation.
- **Server-side enforcement verified independently of the UI:** `/api/v1/session`, `/api/v1/admin/purposes` and `/api/v1/portal/me/consents` all return `401` with a generic message, `cache-control: no-store`, `x-frame-options: DENY` and an `x-request-id` correlation id. No stack trace, no secret, no scope disclosure. Hiding a control is presentation; the server refuses regardless.
- Keyboard: skip link is first in tab order and becomes visible on focus; no positive `tabindex` anywhere; explicit `:focus-visible { outline: 3px solid }` on every interactive element; `<main tabindex="-1">` receives the skip target.
- Responsive at 375×812: `scrollWidth === clientWidth`, **no horizontal overflow, no clipped or overflowing element**.

---

## 3. Defects

### F-01 — BLOCKER — Release-manifest evidence was not produced at the frozen candidate

**Where:** `artifacts/release-manifest.json` → `executed_evidence`; claim restated in `CURRENT_STATE.md` row "Executed results at the candidate".
**Expected:** evidence cited as qualifying the frozen candidate carries the candidate's source identity.
**Actual:** **none of the 72 `executed_evidence` entries carries `c383b9d`.** They are distributed across five ancestor commits: `04a16669` ×32, `bfa81e59` ×25, `e3740308` ×12, `8d852bd2` ×2, `7bc7780d` ×1.
**Evidence:** direct read of the manifest; the unit-test entry (`node scripts/record.mjs test`, exit 0) is recorded at `04a16669`.
**Why it matters:** F-02 is the concrete consequence — a suite recorded PASS at an ancestor genuinely fails at the candidate. This is exactly the "never reuse evidence from an older candidate" rule the project sets for itself.
**Minimum fix:** re-execute the manifest's evidence set at the frozen candidate, or restate the manifest and `CURRENT_STATE.md` to say which results are candidate-level and which are historical. My §2.3–2.5 runs supply candidate-level replacements for the backend and browser suites.

### F-02 — BLOCKER — `pnpm test` fails at the frozen candidate (14/15), contradicting the recorded 15/15

**Screen/area:** governance tracking validator · **File:** `tests/unit/tracking.test.ts:6` · **Under test:** `scripts/tracking.ts:30`
**Steps:** `ORVIA_PROFILE=rehearsal pnpm test` at the candidate.
**Expected:** 15/15, exit 0 (as claimed).
**Actual:** `✖ current and legitimately progressed/BLOCKED tracking remain valid` → `Error: Unmet start dependency A02`. Exit 1.
**Root cause (established, not inferred):** the test applies a hard-coded "legitimate progression" fixture that sets `A00 → IN_PROGRESS` and `A01 → BLOCKED`, then asserts the board still validates. `validateTracking` correctly fails any task in `{IN_PROGRESS, IN_REVIEW, COMPLETED}` whose start dependency is not `COMPLETED`.
- At `04a16669` (where the passing evidence was recorded) `A02` was `BLOCKED`, so the rule did not fire.
- At `c383b9d`/HEAD, `A02` and `A03` are `COMPLETED`, so downgrading `A01` makes a `COMPLETED` task depend on a non-`COMPLETED` one — correctly rejected.

Verified by `git show <commit>:tracking/tasks.json` at both commits. **The validator is correct; the test fixture is stale.** `tracking:check` on the real board still passes — only the synthetic mutation is invalid.
**Owner:** Codex (test fixture).
**Minimum fix:** choose progression targets with no already-progressed dependants, or downgrade dependants consistently in the same fixture.
**Required regression:** `pnpm test` 15/15; `tracking:check` unchanged.
**⚠ Do not fix without a human decision:** `tests/` is inside the frozen inventory. Per the runbook, changing it **voids the candidate and requires both rehearsals to be repeated.** That trade-off is the human's call, not mine — which is why I have not touched it.

### F-03 — HIGH — Machine enrollments expire after 1 hour; the rehearsal runbook has no renewal step

**Steps:** wait >1 h after the last `machine:init`, then run the documented `.\scripts\dev.ps1 app:run confirm:rehearsal`.
**Expected:** the documented rehearsal start procedure works.
**Actual:** the web server reaches readiness, then the agent exits immediately and the supervisor tears the stack down with `result: FAIL`. The operator sees only:
```
{ name: 'Error', code: 'UNCLASSIFIED' }
```
**Root cause:** `scripts/machine-init.ts` issues `expires_at = Date.now() + 3600000`. All nine identities (agent/observer/sender × 3 scopes) had expired at `2026-09-17T16:06:52.897Z`; `apps/agent/src/main.ts` throws `Agent enrollment expired; renew through protected local setup`, but `safeError` redacts the message to `UNCLASSIFIED`.
**Evidence:** enrollment JSON expiry timestamps; `handoffs/codex/artifacts/A00-application-lifecycle-1789663642926-….json` (`stop_reason: ERROR`, `result: FAIL`); reproduced twice; resolved by `machine:init confirm:rehearsal` (idempotent — reuses identity IDs, `ON CONFLICT DO UPDATE`, preserves existing target restrictions).
**Why it matters:** this is a **live blocker for the documented rehearsal procedure**, and the redacted error gives the operator nothing to act on mid-demo.
**Minimum fix (no source change required for the first part):** add `machine:init confirm:rehearsal` to the runbook "Before you start" block. Separately, allow the enrollment-expiry message through the redaction filter — it names no secret.

### F-04 — HIGH — The runbook's step-1 verification cannot be executed as written

**File:** `handoffs/work/final-prototype-continuation/verify-candidate.py:17-18`
**Runbook says:** "Confirm the candidate is still intact (expects 242 checks, 0 failures) — *writes a new dated report*".
**Actual:** the script writes a **fixed** path, `candidate-verification-c383b9d.json`, and hard-fails first thing if it exists:
```
RuntimeError: Preserve the previous execution report
```
That file is committed at HEAD, so the documented pre-rehearsal precondition **can never run**. Reproduced.
**Minimum fix:** date the output filename (as the runbook already describes).
**Mitigation used here:** I performed the equivalent check read-only — 224/224 manifest source files recomputed and matched, before and after all testing.

### F-05 — MEDIUM — Auth-dependent suites are not reproducible back-to-back (TOTP rate limit)

**Where:** `packages/auth/src/server.ts:25-26` — `rateLimit.customRules['/two-factor/*'] = { window: 60, max: 10 }`, plus `accountLockout { maxFailedAttempts: 5, durationSeconds: 900 }`.
**Actual:** running suites in sequence, `test:auth` failed immediately after `PASS owner: MFA challenge required`, and `test:evidence` failed at `packages/testing/src/scenario.ts:17` → `Synthetic reviewer reauthentication failed`. Each passed unchanged when re-run alone after the 60 s window cleared. `test:enforcement` showed the same pattern.
**Mechanism:** each `createMarketingScenario` performs a distinct-reviewer TOTP verification; several scenarios in quick succession exceed 10/60 s; `reauthenticate_policy` maps the resulting `429` to `503`, and the fixture sees a non-201.
**Why it matters:** the claim "every suite PASS, exit 0" is **order- and timing-dependent**, not unconditionally reproducible — and a rehearsal that runs steps briskly can hit the same limit live. This matches the previously retained `429` failure already in the project record.
**Minimum fix:** document required spacing between auth-dependent suites/steps, or raise the limit for the named synthetic profile only.

### F-06 — MEDIUM — No `not-found.tsx` / `error.tsx`; 404 escapes the ORVIA shell

**Steps:** navigate to `https://127.0.0.1:4330/workspace/does-not-exist`.
**Expected:** a 404 inside the product shell with the synthetic banner, navigation and a way back.
**Actual:** Next.js's bare default page — `404 / This page could not be found.` — rendered from `<body>`, outside the shell. No banner, no nav, no ORVIA branding, no route back. Confirmed absent: `apps/web/src/app/not-found.tsx` and `error.tsx`.
**Why it matters:** a mistyped or stale link during a leadership demo drops the audience into an unbranded dead end.
**Minimum fix:** add `not-found.tsx` (and `error.tsx`) rendering inside the existing shell.

### F-07 — MEDIUM — Failure Centre "Find owning workflow" is an unbounded-feeling client-side N+1 scan

**File:** `apps/web/src/components/operations.tsx` → `FindWorkflow`
**Actual:** lists workflows 100 per page and issues a `workflow` detail call for **every** workflow until the obligation is found, bounded at 100 pages — up to ~10,000 sequential HTTPS requests, each with a 20 s timeout.
**Mitigating:** the control is honest — it never claims a complete search and says so when the bound is reached.
**Why it matters:** on the synthetic fixture it is fast, but it is a real demo hazard and the wrong shape for the product.
**Minimum fix (contract-level):** include the owning workflow reference on the `failures` list item so the link is a direct read.

### F-08 — MEDIUM — Browser evidence cannot show console health

**Files:** `tests/e2e/fixture.ts:110`, `tests/e2e/reporter.ts`
**Actual:** `pageerror` is recorded only as a Playwright *annotation* and only for pages created via `newContextPage`; the reporter's `results.json` record omits annotations entirely; `console` messages (React warnings, hydration warnings) are never captured. A page error would therefore be invisible in the published evidence and would not fail the run.
**Closed manually for this candidate:** my direct browser inspection found **no uncaught errors and no React/hydration warnings** (§2.6) — but that is my observation, not something the suite can evidence.
**Minimum fix:** capture `console` and `pageerror` per context, publish them in `results.json`, and fail on uncaught errors.

### F-09 — LOW — "Staff sign in" is a permanent primary-nav item

`apps/web/src/components/shell.tsx` → `WORKSPACE_NAV` always includes `/workspace/sign-in`, so an already-authenticated staff user sees "Staff sign in" in the primary navigation next to their own actor summary and Sign out control. Minor but visible in every screenshot.

### F-10 — LOW — No Content-Security-Policy header

Observed response headers: `x-frame-options: DENY`, `cache-control: no-store` on API routes, `x-request-id` correlation. **No `Content-Security-Policy`.** The "no external script, font, model or analytics" property is asserted in UI copy and verified by test (and I reproduced 0 foreign origins), but it is not *enforced* by the browser. Appropriate to flag as prototype hardening; production security is deferred and governed separately.

### F-11 — LOW — Evidence recorders hash untracked files into the source inventory

`scripts/record.mjs` and `tests/e2e/record.mjs` build their inventory from `git ls-files --cached --others --exclude-standard`, so **any** untracked file in the repo root changes `source_tree_sha256` and sets `dirty: true`. My browser run recorded 383 files against the reference run's 382 solely because of my own `Claude outputs/` report — all 382 common files were byte-identical. `dirty: true` was already present on the reference run and is effectively always true during an evidence-writing session, so it carries no signal.
**Minimum fix:** restrict the inventory to tracked source paths (as `artifacts/release-manifest.json` already does with its 224-file list), or exclude a named scratch directory.

### F-12 — Known limitation (not a defect) — Test Lab has no run history

The contract exposes reads by exact run ID only; there is no run-history list or pagination. The UI states this plainly. An operator who does not retain the run UUID cannot rediscover a run through the interface after a refresh. Worth stating explicitly in the demo script.

### Checked and found correct (recording these so they are not re-raised)

- **Form accessible names.** The a11y-tree inspector reported bare `textbox` nodes, which looked like a defect. DOM verification showed `aria-labelledby` resolving to a real element **and** a matching `label[for]` on every field — the markup is correct and the missing name was the inspector's serializer.
- **`test:isolation` refusing the rehearsal profile** is a deliberate `codex-a00` pin, already recorded as a retained failure.

---

## 4. Integration and wiring (Phase 5)

No wiring defect found. Specifically verified in source and confirmed by execution:

- **One transport.** `apps/web/src/components/api.ts` uses the single generated client from `packages/contracts`. There is no second DTO model, no hand-written endpoint URL and **no mock-success fallback** anywhere in the runtime.
- **Placeholder sweep (Phase 23) is genuinely clean.** Searching `TODO|FIXME|HACK|TEMP|placeholder|mock|dummy|fake|hardcoded|not implemented` across `apps packages scripts policy infrastructure` returns only (a) documentation comments asserting the *absence* of placeholders and (b) a legitimate `placeholder` prop on `TextField`. No `console.log` in any web runtime path.
- **Idempotency identity is contract-correct:** one key per interaction, reused only for a byte-identical retry, replaced when payload or interaction changes.
- **Double-submit protection** is real: `if (inFlight.current) return null`, plus `fieldset disabled` on every mutating form.
- **Identity-scoped cache:** switching actor, organisation or environment drops every cached response and invalidates in-flight reads; a response that outlived its actor is discarded, never rendered.
- **Pagination refuses to truncate silently** — a collection read that cannot complete throws rather than showing a partial list; cursor loops are cycle-guarded.
- **Unknown write outcomes are preserved.** `errors.ts` marks writes that time out or return ≥500 as `outcomeUnknown` and says *"It may or may not have been applied… do not assume failure."* A lost response is never softened into success or failure.
- **Server re-reads authority inside the business transaction** and re-checks the capability, so a stale UI role, prior preview or cookie cache cannot authorise a mutation or replay.

**One wiring nuance worth recording (not a defect):** the evidence "Download local evidence JSON" button re-serialises the contract-validated response client-side into a Blob rather than consuming the server's attachment response. The server's `content-disposition: attachment` and `no-store` headers are therefore exercised only by direct API access, not by this UI path. The `integrity_digest` is computed over the evidence *object* (excluding itself), so the downloaded document still carries verifiable content — and `integrity_limit` states the digest's scope honestly.

---

## 5. Functional flows

| Flow | Result |
|---|---|
| Staff sign-in, real MFA, refresh, actor separation, logout | **PASS** |
| Rejected login, read-only authority, expired-session recheck | **PASS** |
| Configuration → distinct-reviewer re-authentication → publication persists | **PASS** |
| Principal grant → immutable receipt → withdrawal → history → refresh | **PASS** |
| Lost committed response preserves the exact request; one event only | **PASS** |
| Stale interaction denial adds no extra event | **PASS** |
| Real target effect + independent `SCOPED_READ` + evidence export | **PASS** |
| Applied-but-response-lost → `EFFECT_UNKNOWN` → read reconciliation | **PASS** |
| Acknowledgement without effect stays unresolved, never `VERIFIED` | **PASS** |
| Manual attestation uses its read `task_version`, rejects a stale tab | **PASS** |
| Test Lab healthy / broken-control FAIL / repaired / restoration | **PASS** |
| Interrupted run recovered as `ERROR`, no fabricated pass | **PASS** |
| Current-processing enforcement, OPA outage/malformed → indeterminate, no send | **PASS** (46 assertions) |
| Governance tracking validator unit test | **FAIL** (F-02) |

The state vocabulary is the strongest part of the product. `ACKNOWLEDGED` carries a *warn* tone with "Acknowledgement is not verification"; `EFFECT_UNKNOWN` is *unknown*, never success or failure; an unrecognised enum value is displayed verbatim with "must not be read as success"; the Test Lab explicitly refuses to convert an expected-detection FAIL into a PASS. This all held under execution.

---

## 6. Accessibility

**Findings:** none blocking. Verified: skip link first in tab order and visible on focus; `aria-label="Primary"` navigation with `aria-current="page"`; `<main id="main" tabindex="-1">`; every field has `label[for]` **and** resolving `aria-labelledby`, with `aria-describedby` linking hint and error and `aria-invalid` on failure; field errors carry `role="alert"`; loading uses `role="status" aria-live="polite"`; failures use `role="alert"`; tables have `<caption>` and `scope="col"`; dialogs use native `<dialog showModal()>` — real focus trap, Escape via `onCancel` guarded while busy, focus restored to the previously focused element; explicit `:focus-visible` outline; no positive `tabindex`; no colour-only meaning (every badge carries a text label).

Minor observations, not raised as defects: badge *meanings* are exposed via the `title` attribute, which is not keyboard-reachable — acceptable because the visible label text already carries the critical distinction; `DataTable` emits no `<th scope="row">`.

---

## 7. Security

**Findings:** F-10 (no CSP) only.

Verified: server refuses every unauthenticated API call independently of the UI (401, generic message, no stack trace, no scope disclosure, `no-store`, correlated `x-request-id`); `x-frame-options: DENY`; a request carrying an `authorization` header on a business route is rejected 401, preventing machine-token confusion; simultaneous staff **and** principal sessions are rejected 403; privileged roles without verified MFA are rejected 403; authorisation is double-checked in-process **and** against OPA, and **fails closed** — an OPA outage, missing result or malformed result yields 503/indeterminate, never allow (proven: "missing OPA creates no send", "malformed OPA result is indeterminate", "OPA outage creates no send"); hygiene scan of 1850 files, 33 browser bundle files and 81 generated credential values returned **0 findings**; 498 lock packages against 7408 reviewed advisories, **0 findings**; 1069 browser requests across 16 contexts, **0 foreign origins**.

Production security, legal, supply-chain and full disaster recovery remain **NOT_ASSESSED** and governed separately.

---

## 8. Reliability and recovery

`test:lifecycle` 17/17 PASS — restart with business state retained, owned worker/agent connections gone per cycle. `test:regression` 70/70 PASS including "interruption assertion separately persisted" and "**terminal outcome cannot be rewritten**". `app:stop` exited 0 cleanly twice, stores retained; the supervisor correctly refused automatic takeover of an existing journal and cleaned its journal on exit. Target quarantine and restore passed in both the Test Lab scenario and the browser suite.

The one reliability defect found is F-03 (enrollment expiry), plus the repeatability issue in F-05. **I do not claim full disaster recovery** — only the tested application and target recovery scope.

---

## 9. Gate status — unchanged by this review

| Gate | Status |
|---|---|
| **C00** | `IN_REVIEW`. **This is a human decision and it has not been made.** I have not recorded, simulated or implied one. My screen-level review found the interface consistent with the UX brief and copy, with F-06 and F-09 as the UX items to weigh — but the acceptance act remains outstanding and is the critical-path blocker. |
| **T01–T34** | **All 34 `NOT_RUN`. Zero promoted.** Promotion requires genuine `APPLICATION_ACCEPTANCE` + `FULL_SCENARIO` records, which only the rehearsals produce. Component success — including my own 16/16 browser and nine backend suites — is explicitly insufficient. |
| **Rehearsal 1** | `NOT_RUN`. Human-run or human-supervised. Blocked in practice by F-03 and F-04 until those are addressed. |
| **Rehearsal 2** | `NOT_RUN`. |
| **C01 / C02** | `BLOCKED` on C00 and on the two rehearsals. |
| **W01** | Accepted; independently re-confirmed here (`test:expiry` 87/87, including the freshness/expiry controls that closed W01-A02-F01). |
| **W02** | Review content accepted; ticket `BLOCKED` on its board chain. |
| **W03** | `BLOCKED`. |

Canonical board: 9 `COMPLETED`, 1 `IN_REVIEW`, 9 `NOT_STARTED`, 4 `BLOCKED`. B00–B06 and A07 are recorded `NOT_STARTED` even though that engineering is merged and executing — the board tracks *accepted* state, not *present* state, and its advancement is gated on C00. That gap is also the mechanical cause of F-02.

---

## 10. Recommendation

**NOT READY for internal demo sign-off. The engineering is in good shape; the acceptance evidence is not.**

The prototype genuinely works. I drove it end to end and the full chain — UI control → generated client → session and capability → server route → domain service → Postgres/Temporal/OPA → signed command → agent → synthetic target → independent read → UI refresh → evidence — executes for real, with truthful uncertainty preserved at every step. Sixteen browser journeys and nine backend suites reproduced at the exact candidate source, with every assertion count matching the record. That is a strong product.

Three things block a clean recommendation, and two of them are about evidence rather than code:

1. **F-01** — the release manifest's evidence stands at ancestor commits, not at the frozen candidate.
2. **F-02** — the concrete proof that this matters: a suite recorded PASS at an ancestor genuinely fails at the candidate. The recorded "15/15 unit tests" does not reproduce.
3. **F-03 / F-04** — the documented rehearsal procedure cannot currently be executed as written: enrollments expire after an hour with no renewal step, and the step-1 verification script refuses to run.

Suggested order, for the human to decide:

1. Fix **F-04** (script filename) and add the `machine:init` line to the runbook for **F-03** — neither touches the frozen inventory, so **neither voids the candidate**.
2. Decide **F-02**. The fix is small and bounded, but `tests/` is inside the inventory, so applying it **voids the candidate and requires both rehearsals to be repeated**. Fixing it now is cheaper than fixing it after two rehearsals. That trade-off is yours to make, which is why I left the code untouched.
3. Re-run the manifest's evidence set at whichever candidate results (**F-01**), or restate the manifest and `CURRENT_STATE.md` to separate candidate-level from historical results.
4. Take the **C00** decision, weighing **F-06** and **F-09**.
5. Then run **R1** and **R2**, promote T-statuses only where real `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records exist, and complete **C02** and **W03**.
6. After the rehearsals, remove the temporary CA trust and re-verify its absence, as the runbook requires.

---

## Appendix — evidence produced by this review

All under the candidate source, with the candidate build ID.

- `handoffs/codex/browser/B06-exec-2026-09-17T16-53-59.046Z/` — 16/16 PASS, exit 0
- `handoffs/codex/browser/B06-playwright-2026-09-17T16-53-59.960Z/` — results, screenshots, 16 network-origin records
- `handoffs/codex/browser/B06-exec-2026-09-17T16-52-14.196Z/` — **retained FAIL**: 16/16 failed with `EADDRINUSE 127.0.0.1:4330`. Cause was mine, not the product: I had `app:run` holding the port while the e2e fixture, which owns the full app lifecycle itself, tried to start its own server. Retained rather than deleted, per project discipline.
- `handoffs/codex/artifacts/A00-auth-security-1789666469084-….json` — 87 PASS
- `handoffs/codex/artifacts/A00-expiry-integration-1789665592707-….json` — 87 PASS
- `handoffs/codex/artifacts/A00-evidence-integration-1789665422360-….json` — 69 PASS
- `handoffs/codex/artifacts/A00-regression-integration-1789665959977-….json` — 70 PASS
- `handoffs/codex/artifacts/A00-send-enforcement-1789665194118-….json` — 46 PASS
- `handoffs/codex/artifacts/A00-consent-integration-1789664992857-….json` — 50 PASS
- `handoffs/codex/artifacts/A00-workflow-integration-1789665021157-….json` — 32 PASS
- `handoffs/codex/artifacts/A00-lifecycle-integration-1789666078610-….json` — 17 PASS
- `handoffs/codex/artifacts/A06-dependency-advisories-1789666262979.json` — 498 / 7408, 0 findings
- **Retained failures** (not overwritten): `A00-auth-security-1789665438611-….json`, `A00-evidence-integration-1789665213062-….json`, `A00-evidence-integration-1789665030319-….json`, `A00-send-enforcement-1789665026298-….json` — all the F-05 rate-limit mechanism; `A00-application-lifecycle-1789663642926-….json` — the F-03 startup failure.

**Nothing in this document promotes a gate, and no human decision is recorded here.**
