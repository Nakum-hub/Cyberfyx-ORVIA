# Handoff — R4-BROWSER-01 — cross-browser diagnostics

**Base commit:** e42f573c91340eadbcd42ad010c79c56fd50010a, fetched from Claude's branch.
**Branch:** codex/cross-browser-20261001; this handoff's commit.
**Source master:** revision 1.4 plus approved addenda, unchanged. **Contract:** 0.46.0 unchanged.
**Profile:** preserved, isolated synthetic round-3 customer/vendor qualification databases; no reset or shared installation writes.

## Delivered

Observation-only `run-browser-round4.mjs` runs the original journeys with the selected browser. It records traces (`screenshots: true`, `snapshots: true`), every browser console/network event, final runtime/cookie state and form validity. Additional input diagnostics record lengths and whether React input properties are attached, never input contents. The four original test files match their e42f573 Git blobs (`R4-unchanged-journeys.json`); fixtures, assertions and thresholds were not edited.

The wrapper, focused observation helper, trace credential-redaction/packaging tools, this handoff, logs and indexed artifacts are the changes. No frontend, backend, contract or migration source changed. Focused-route and Chromium expansion results are reported separately; they do not replace the failed full crawl.

## Executed matrix

Each command was `tsx handoffs/codex/run-browser-round4.mjs <browser> <suite>` under pinned Node 24.21.0, ORVIA_PROFILE=codex-a00 and this worktree root. Native frozen offline dependency install, production build and synthetic machine renewal each exited 0. The batch shell exits 0 after recording individual exits; that is not a passing matrix.

| Browser | Journey | Exit | Actual result |
|---|---|---|---|
| Firefox | dpdpa-audit-local | 0 | PASS, 20 assertions; Report tab/download and final browser-error control pass |
| Firefox | audit-mandate-local | 0 | PASS, 19 assertions; final browser-error control passes |
| Firefox | expansion-screens-local | 0 | PASS, 69 assertions, including both answer saves |
| Firefox | interface-crawl-local | 1 | FAIL, 450 visits, 8 pages with issues |
| WebKit | dpdpa-audit-local | 1 | FAIL, 3 isolation checks pass, vendor sign-in stops before MFA |
| WebKit | audit-mandate-local | 1 | FAIL at vendor sign-in before business assertions |
| WebKit | expansion-screens-local | 1 | FAIL at staff sign-in before business assertions |
| WebKit | interface-crawl-local | 1 | FAIL, 7 signed-out visits, one privacy loading observation, then staff sign-in failure |

Exact original A00 artifact names and assertion counts are in `artifacts/R4-browser-matrix.json`; exits are in `R4-browser-results.log`. Crawl soft-check counts differ from the final A00 assertion count: its aggregate failure and propagated exception are two failures, not just two visited pages.

## WebKit finding for Claude

The page JavaScript does run. The recorded Next runtime is an object at submit, all observed script responses are 200, and there is no page exception or CSP-eval error. In each of the four journeys, **no sign-in POST is sent**, so there is no sign-in response status or cookie to report. Cookie jars are empty. Console errors before submit are the unauthenticated session GET's 401 resource message; full, unfiltered records are retained. Native validation reports an empty required email field at submit.

The additional unchanged expansion invocation with label `hydration-probe` exits 1 and pins down input loss: email input length 56 and valid, with `reactPropsAttached: false`; the password input occurs with React properties attached, but email length is then 0 and invalid. Next runtime was already present at both events. This supports a hydration/input-binding race: an editable server-rendered controlled field accepts input before the client owns it, then loses that input. It is not evidence for a cookie/Secure or backend authentication failure.

Claude-owned entry point: `frontend/src/app/vendor/sign-in/page.tsx`, using `TextField` from shared UI. The same observation occurs on staff sign-in (`frontend/src/app/workspace/sign-in/page.tsx`). Coordinate an interaction-readiness fix across the sign-in surfaces; do not add waits to the journeys to conceal lost input. No sign-in or shared UI fix was made in this task, following the instruction to report protected-path failures with traces.

Summary: `artifacts/R4-webkit-sign-in-diagnostics.json`. Traces and complete event logs are under `artifacts/R4-traces/baseline-webkit-<suite>/`; the additional input-binding trace is under `R4-traces/hydration-probe-webkit-expansion-screens-local/`. The trace index explains local viewing and credential redaction.

## Firefox crawl findings

Eight observed failures: owner `/workspace/evidence` (workflows 503), installed versions (installation-versions 503), operations runs (workflow-runs 503), preflight (503), processor engagements (20-second network-settle failure and registry-activities 503), support cases (503), updates (update-plans 503); member `/workspace/failures` (503). Retain the full crawl as FAIL even where focused reruns pass.

The first owner portion overlapped preparation of the disposable installer image. That build finished before the later roles. The host has about 8 GB physical RAM and a sample showed under 300 MiB free; these are confounding conditions, not a proven explanation. PostgreSQL logged zero statement-timeout messages during the sampled crawl interval; the relay/PostgreSQL/OPA reported no OOM kills or restarts. Do not equate these observations with the prior database planner or relay crash findings. Server safe diagnostics for this crawl were empty.

All three specifically requested role/route observations passed within this full crawl: admin installed versions, auditor assessments and auditor audit coverage. Separate idle-host controls cover them and all eight new route/role failures. No threshold was increased and no failure was removed.

Failing Firefox trace contexts: 2 (owner) and 5 (member), under `artifacts/R4-traces/baseline-firefox-interface-crawl-local/`. The entire console/network event log is retained. `R4-firefox-crawl-owner-503.json` retains response error bodies, request IDs and timings. Large ZIPs are split into ordered 40 MiB parts with checksums; they remain complete traces after concatenation.

## Evidence handling and validation

Validation commands: `node --check handoffs/codex/run-browser-round4.mjs` (0), trace-redactor self-check (0), ZIP CRC/JSON/reassembled SHA256 validation of all eight published failure traces (0), and scan of published text resources against 43 known generated credential values (0). Exact records are `R4-trace-redactor-check.log`, `R4-trace-validation.json`, and `R4-trace-secret-scan.log`.

The initial Chromium follow-up completed 69 assertions but its diagnostic cleanup hung while awaiting headers for aborted requests; it was stopped with exit -1 and remains NOT_COMPLETED. The wrapper now records synchronous events, enriches headers asynchronously without blocking close, and gives contexts globally unique numbers across browser launches. The unchanged Chromium expansion rerun completed 69/69 with exit 0. `R4-followup-results.log` retains both outcomes. These observation-only changes did not alter journey assertions, fixtures, expectations, or thresholds.

Raw traces remain local and are not committed. Published traces redact generated credentials, cookies and authorization values while retaining cookie attributes and complete console/network records. Redaction is explicit; these are diagnostic copies, not byte-identical raw exports. Masked final screenshots and raw test artifacts contain synthetic data only. The trace-redactor self-check verifies removal of a generated sample password/session token, preserved cookie attributes and a readable ZIP (exit 0).

The artifact index lists exact delivered paths. Existing tracked test-generated images were restored after their evidence was preserved; no protected journey or Claude handoff source was edited. Original crawl-generated detail reports are retained in the Codex artifact area.

## Acceptance and next dependency

No acceptance/tracking promotion. WebKit authenticated workflows remain unqualified. Claude must correct the sign-in interaction/hydration issue and rerun unchanged journeys. Firefox CSP and report-tab findings move to passing engineering evidence on this exact base; the full crawl remains failed. Low-memory/trace overhead and the new API failures need the separate idle-host evidence, not a blanket production-capacity claim. No contract 0.47.0 or migration was introduced.
