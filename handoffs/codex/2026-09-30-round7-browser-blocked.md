# Handoff — R7-BROWSER-01 — Phase A diagnostics, protected-file stop

**Base:** `e4ad01ac185bb28058427a13b23d23b64bcde79f`, `codex/design-refresh-20261002`.
**Branch:** `codex/round7-browser-fixes`.
**Diagnostic commit:** `e5ea61d`, pushed to origin; application code unchanged.
**Status:** BLOCKED; no application fix implemented or qualified.
**Source master SHA-256:** `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`, unchanged.
**Existing build:** `rgu7z21LSvTmWQSgQOsZK`; contract 0.46.0. This is the requested Round 6 base, not the revision 1.7 acceptance candidate.
**Lockfile SHA-256:** `7fdbfbf0e6b165dedb83fe22b9c28040967f9a4a148fcb5dff39555b08dc5c0b`.
**Runtime:** existing synthetic `codex-a00` and `vendor-a00`, sequential use; no reset or resource-limit change.

## Scope and plan

Read local AGENTS.md, PRODUCTION_READINESS.md and handoff template, then fetched and read the latest Claude branch's AGENTS.md (revision 1.7 and No assumptions rule) and its organisation-intake addendum. The older requested base does not yet contain that entry. Product channel for the consent reproduction: an existing synthetic organisation website includes its installation's published banner script; its visitor submits directly to that installation's public CMP endpoint. No new user channel or product-direction assumption was introduced.

Plan: reproduce the three browser failures with secret-safe request/server diagnostics; identify causes before changes; fix only authorized paths and add regressions; run the full required three-browser matrix; push for Claude integration. Phase B starts only after the user supplies the merged-main candidate SHA.

The user's explicit stop condition applies: **"If the fix needs ... backend/authorization/**, STOP and report it."** The observed 503 is an authorization dependency timeout in that protected directory. Resolving its deadline/error-propagation behavior requires coordination with Claude's revision 1.7 authorization changes. No protected file was edited. The underlying reason for slow OPA completion is not yet established; a timeout observation is not a claim to have fixed its cause.

## Delivered evidence

| Investigation | Observed result | Artifact |
|---|---|---|
| Actual published CMP banner, Chromium | POST 201 | `artifacts/R7-cmp-before-evidence.json` |
| Same banner and origin, WebKit | POST 400; `credentials: no_credentials_accepted` | Same artifact, exact synthetic body and non-secret headers |
| Same banner and origin, Firefox | POST 201 | Same artifact |
| WebKit diagnostic variant without keepalive | Still POST 400 | `artifacts/R7-cmp-request-evidence.json`, `R7-cmp-keepalive-probe.log` |
| Firefox partial original crawl | 65 PASS lines / 1 FAIL, stopped at protected-file boundary; **not a completed 450-visit crawl** | `artifacts/R7-firefox-baseline-crawl.log` |
| Matched browser/server 503 | Same request ID; OPA `TimeoutError`, 2399 ms | `artifacts/R7-firefox-interface-crawl-local-diagnostic.jsonl` |

### CMP: narrowed cause, not fixed

The unchanged SDK sends `credentials: 'omit'`. In this Windows WebKit run a non-empty Cookie header nevertheless reaches the public endpoint (172 bytes); Chromium and Firefox omit it. `backend/api/src/cmp.ts` rejects any Cookie or Authorization header before body validation. The response is `VALIDATION_ERROR`, field `credentials`, code `no_credentials_accepted`. The synthetic JSON payload includes the visitor UUID, banner version 1, necessary=true, analytics=false, gpc=false, language=en. It is accepted by the other engines.

Cookie values were never retained in evidence, logs or chat; only header presence/byte count/empty flag were retained, and the header value is explicitly redacted. Other request headers and the synthetic JSON body are captured verbatim. Removing keepalive is a negative diagnostic control: it did not fix this. No credential check was relaxed. Whether this is specific to the Windows WebKit port or also affects Safari remains unqualified; do not claim Safari qualification from this diagnostic.

Reproduce: in the configured synthetic profile, run `node node_modules/tsx/dist/cli.mjs handoffs/codex/round7-cmp-repro.ts`. It starts the existing build, selects an existing enabled synthetic Browser shop with a published banner, binds that already-approved loopback origin, and submits Reject all through each real browser. The fourth explicitly labelled case changes only keepalive for diagnosis. It records statuses rather than asserting success, so exit 0 means the capture completed, **not** that WebKit passed.

### Firefox: protected authorization path reached

Browser request: `GET http://127.0.0.1:4310/api/v1/admin/principals?limit=100`, issued by owner page `/workspace/principals`, response 503, `SERVICE_UNAVAILABLE`.

Correlated request ID: **`a2eeec63-5ca5-48e0-996c-4fec9b43b544`**. Passive server tracing recorded the same ID and an OPA `TimeoutError` after **2399 ms**. `backend/authorization/src/index.ts`, `requireCapability`, uses `AbortSignal.timeout(2000)` and catches dependency errors as a new `AccessError(503, 'SERVICE_UNAVAILABLE')`. `safeRoute` ordinarily suppresses logs for AccessError, so the earlier Round 6 artifact did not preserve this causal detail. The passive preload records only dependency, elapsed time, safe error name/code and request ID; it changes no deadlines or decisions.

This reproduces the same class of 503 on another read endpoint; it does **not** prove the historical delivery-page request had the same cause. The historical loading-only observations were not yet reproduced or root-caused. Source inspection found that read/session hooks discard ABORTED errors without changing state, but no claim is made that this caused those two observations.

The diagnostic crawl was deliberately stopped once this protected boundary was established. Its process exit was **-1 (interrupted)**, not a normal suite exit. Only the matching Round 7 Node process tree and its owned browser/server descendants were stopped; the three existing infrastructure containers remain started. No completed-crawl JSON or passing acceptance artifact is claimed.

### Vendor-session investigation

NOT_RUN after the stop condition. Static inspection found that successful MFA calls `reload()` immediately before a full `location.assign`, potentially starting a session read on the departing page; this is a hypothesis, not a proven root cause. The diagnostic runner is prepared to record each session request URL, issuing page, status or transport failure and relevant console error. No errors were filtered from the original suite assertions.

## Commands actually executed

Working directory: `C:/Cyberfyx-projects/Cyberfyx_ORVIA/.worktrees/design-round6`; pinned Node 24.21.0 on PATH, `ORVIA_PROFILE=codex-a00`, `ORVIA_WORKSPACE_ROOT` set to this worktree.

| Command / check | Exit | Result |
|---|---:|---|
| `git fetch origin` | 0 | Read latest lane rules |
| `git switch -c codex/round7-browser-fixes origin/codex/design-refresh-20261002` | 0 | Exact requested base |
| `docker start orvia-qualification-20260930-postgres orvia-qualification-20260930-opa orvia-qualification-20260930-loopback` | 0 | Existing stopped services; no reset |
| `node node_modules/tsx/dist/cli.mjs handoffs/codex/round7-cmp-repro.ts` | 1 | Initial site-list response was not the expected list; `R7-cmp-repro.log` |
| Same command with relative diagnostic NODE_OPTIONS preload | 1 | Helper path resolved relative to child frontend cwd; owned web process failed to start; `R7-cmp-repro-retry.log` |
| Same command with `NODE_OPTIONS=--import=file:///C:/Cyberfyx-projects/Cyberfyx_ORVIA/.worktrees/design-round6/handoffs/codex/round7-server-trace.mjs` | 0 | Three-engine capture, `R7-cmp-repro-capture.log` |
| Same command, no preload, with header metadata | 0 | 201 / 400 / 201; `R7-cmp-header-check.log` |
| Same command, with labelled no-keepalive diagnostic case | 0 | 201 / 400 / 201 / 400; `R7-cmp-keepalive-probe.log` |
| `node node_modules/tsx/dist/cli.mjs handoffs/codex/round7-browser.mjs firefox interface-crawl-local` | -1 | Interrupted at explicit protected-file stop; partial failure retained |
| `git commit -m "Capture Round 7 browser failures and protected authorization blocker"` | 0 | `e5ea61d`, diagnostics only |
| `git push -u origin codex/round7-browser-fixes` | 0 | Published diagnostic handoff |

Full typecheck, full lint, `pnpm test`, the completed three-browser crawl matrix and three journeys per browser: **NOT_RUN for a fixed candidate**. There is no fixed candidate. Existing Round 6 results are not promoted to Round 7.

## Changed files and remaining work

Only this handoff, `round7-cmp-repro.ts`, `round7-browser.mjs`, `round7-server-trace.mjs`, and their `artifacts/R7-*` evidence are task changes. Application code, shared contracts, migrations, authorization and acceptance tracking remain unchanged. Generated crawl screenshots are restored after retaining the textual diagnostics.

**Claude / owner next action:** coordinate the authorization deadline and cause-preserving error handling in the revision 1.7 lane, and identify why OPA exceeds the existing deadline on this host. Do not simply relabel this as a flake or raise a timeout without evidence. Then resume the other two diagnoses, implement approved fixes with regressions, rebuild and run all Phase A gates. This diagnostics branch is not a browser-fix completion or acceptance candidate.

**Phase B:** T01–T34 are NOT_RUN here, with no candidate artifacts and no status edits. The user has not supplied the merged revision 1.7 + rounds 6/7 main SHA. No acceptance branch or frozen candidate was created. Independent penetration testing, real connectors, production signing/law sources, hosting, live payments, real-people qualification, full 1M-record organisation scale and human release approval remain OPEN and were not attempted.

Diagnostic helper lint: node node_modules/eslint/bin/eslint.js handoffs/codex/round7-cmp-repro.ts handoffs/codex/round7-browser.mjs handoffs/codex/round7-server-trace.mjs --max-warnings 0 initially exited 1 for three no-undef references to performance. An explicit node:perf_hooks import fixed the diagnostic helper; rerun exited 0. Both logs retained. R7 text logs normalized to UTF-8/LF without changing their results.
