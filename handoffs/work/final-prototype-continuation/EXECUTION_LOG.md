# Continuation execution log

Every command below ran through the existing recorder `node tests/e2e/record.mjs B06 …`, which pins the
toolchain, sets `ORVIA_PROFILE=rehearsal` and a per-process `NODE_EXTRA_CA_CERTS`, and captures source
identity, UTC interval, exit code and log path. Suites ran **serially** against the exclusive rehearsal
database and ports. Nothing was overwritten; both failed runs are retained in place.

All runs share source tree `ae48b3249891…` as computed by the recorder. Runs labelled `b909be89` executed
the **identical file content** that was then committed as candidate `81431d64`; the post-commit build at
12:32 records the same tree hash, which is the evidence for that equivalence. Runs labelled `81431d64`
executed after the commit.

| Started (UTC) | Finished (UTC) | Command (after `node tests/e2e/record.mjs B06`) | Exit | Result | Commit | Evidence |
|---|---|---|---|---|---|---|
| 2026-09-17T11:41:38.630Z | 2026-09-17T11:42:02.879Z | `typecheck` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-typecheck-2026-09-17T11-41-38.630Z` |
| 2026-09-17T11:42:09.995Z | 2026-09-17T11:42:51.210Z | `lint` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-lint-2026-09-17T11-42-09.995Z` |
| 2026-09-17T11:42:57.408Z | 2026-09-17T11:43:11.224Z | `contracts:check` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-contracts-check-2026-09-17T11-42-57.408Z` |
| 2026-09-17T11:43:11.703Z | 2026-09-17T11:43:13.603Z | `test` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-test-2026-09-17T11-43-11.703Z` |
| 2026-09-17T11:44:03.110Z | 2026-09-17T11:45:34.850Z | `exec tsx handoffs/work/final-prototype-continuation/execute-pending.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-44-03.110Z` |
| 2026-09-17T11:45:47.355Z | 2026-09-17T11:46:34.934Z | `exec tsx tests/integration/evidence/evidence.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-45-47.355Z` |
| 2026-09-17T11:46:50.057Z | 2026-09-17T11:47:10.352Z | `exec tsx tests/security/auth.test.ts` | 1 | **FAIL** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-46-50.057Z` |
| 2026-09-17T11:48:52.399Z | 2026-09-17T11:49:14.974Z | `exec tsx tests/security/auth.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-48-52.399Z` |
| 2026-09-17T11:50:49.858Z | 2026-09-17T11:51:10.513Z | `exec tsx tests/integration/consent/consent.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-50-49.858Z` |
| 2026-09-17T11:52:38.674Z | 2026-09-17T11:53:38.461Z | `exec tsx tests/integration/consent/expiry.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-52-38.674Z` |
| 2026-09-17T11:55:06.951Z | 2026-09-17T11:55:36.699Z | `exec tsx tests/integration/workflows/workflow.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-55-06.951Z` |
| 2026-09-17T11:57:02.765Z | 2026-09-17T11:57:20.741Z | `exec tsx tests/integration/enforcement/send.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-57-02.765Z` |
| 2026-09-17T11:58:46.926Z | 2026-09-17T12:03:25.434Z | `exec tsx tests/integration/regression/regression.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T11-58-46.926Z` |
| 2026-09-17T12:05:05.401Z | 2026-09-17T12:05:37.074Z | `exec tsx tests/integration/lifecycle.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T12-05-05.401Z` |
| 2026-09-17T12:06:43.711Z | 2026-09-17T12:06:49.518Z | `exec tsx tests/security/tls.test.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T12-06-43.711Z` |
| 2026-09-17T12:07:55.927Z | 2026-09-17T12:08:00.729Z | `exec tsx tests/security/fixture-isolation.ts` | 1 | **FAIL** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T12-07-55.927Z` |
| 2026-09-17T12:11:01.117Z | 2026-09-17T12:14:12.706Z | `exec playwright test --config tests/e2e/playwright.config.ts test-lab.spec.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T12-11-01.117Z` |
| 2026-09-17T12:16:04.891Z | 2026-09-17T12:26:03.781Z | `exec playwright test --config tests/e2e/playwright.config.ts` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-exec-2026-09-17T12-16-04.891Z` |
| 2026-09-17T12:31:16.527Z | 2026-09-17T12:31:42.609Z | `hygiene:check` | 0 | **PASS** | `b909be89` | `handoffs/codex/browser/B06-hygiene-check-2026-09-17T12-31-16.527Z` |
| 2026-09-17T12:32:15.454Z | 2026-09-17T12:33:12.294Z | `build` | 0 | **PASS** | `81431d64` | `handoffs/codex/browser/B06-build-2026-09-17T12-32-15.454Z` |
| 2026-09-17T12:36:13.063Z | 2026-09-17T12:46:20.459Z | `exec playwright test --config tests/e2e/playwright.config.ts` | 0 | **PASS** | `81431d64` | `handoffs/codex/browser/B06-exec-2026-09-17T12-36-13.063Z` |
| 2026-09-17T12:49:54.324Z | 2026-09-17T12:50:09.769Z | `exec tsx tests/integration/bootstrap.test.ts` | 0 | **PASS** | `81431d64` | `handoffs/codex/browser/B06-exec-2026-09-17T12-49-54.324Z` |
| 2026-09-17T12:50:28.741Z | 2026-09-17T12:51:05.399Z | `exec tsx scripts/network-qualification.ts confirm:rehearsal` | 0 | **PASS** | `81431d64` | `handoffs/codex/browser/B06-exec-2026-09-17T12-50-28.741Z` |
| 2026-09-17T12:51:36.045Z | 2026-09-17T12:51:51.452Z | `exec tsx tests/e2e/package.ts confirm:rehearsal` | 1 | **FAIL** | `81431d64` | `handoffs/codex/browser/B06-exec-2026-09-17T12-51-36.045Z` |
| 2026-09-17T12:52:22.742Z | 2026-09-17T12:53:43.945Z | `exec tsx tests/e2e/package.ts confirm:rehearsal` | 0 | **PASS** | `81431d64` | `handoffs/codex/browser/B06-exec-2026-09-17T12-52-22.742Z` |


## Two retained failures

| Run | Why it failed | Disposition |
|---|---|---|
| `B06-exec-2026-09-17T11-46-50.057Z` — `tsx tests/security/auth.test.ts`, exit 1 | `wrong MFA code rejected` expected 401, actual **429**. The authentication rate-limit window had been consumed by the immediately preceding operator execution; the product rate-limited correctly. | Test-sequencing artefact, not a product defect. Rerun at 11:48:52 after the window cleared: PASS, 87/87. Suites spaced thereafter. |
| `B06-exec-2026-09-17T12-07-55.927Z` — `tsx tests/security/fixture-isolation.ts`, exit 1 | `Only the named Codex fixture profile is permitted`. The suite is pinned to `codex-a00`; the recorder forces `rehearsal`. | Correctly out of scope for this candidate. T28 is reported PARTIAL for exactly this reason. |

A third failure, `B06-exec-2026-09-17T12-51-36.045Z` (`tests/e2e/package.ts`, exit 1), is retained with its
partial output preserved as `.local/releases/81431d64…FAILED-gnu-tar-2026-09-17T12-51-36Z`. Cause:
GNU `tar` from Git Bash shadowed Windows `bsdtar`, which the packaging scripts require
(`tar: Cannot connect to C: resolve failed`). Rerun with `C:\Windows\System32` ahead on `PATH`: PASS. This
is recorded as a toolchain note in `docs/runbooks/OPERATOR.md`.

## Commands run outside the recorder

| Command | Result | Artifact |
|---|---|---|
| `node --import tsx handoffs/work/final-prototype-continuation/inspect-state.ts` | read-only intake; confirmed the retained NOT_RUN record, no active worker/agent, no advisory locks | — |
| `certutil -user -store Root 8C592FC41BBD6AA18F42234085F6B8155466A190` (before) | `NTE_NOT_FOUND` — CA absent after the documented pause removal | `certificate-trust.json` |
| `certutil -user -addstore Root .local/profiles/rehearsal/tls/ca-cert.pem` | added, then independently re-read with matching serial and SHA-1 | `certificate-trust.json` |
| `tsx scripts/runtime-image.ts confirm:rehearsal` | runtime image rebuilt; label `orvia.source-tree` = `e949d8c4…`, revision = `81431d64…` | `A00-runtime-image-1789648554795-…json` |
| `python handoffs/work/final-prototype-continuation/verify-candidate.py` | **PASS — 242 checks, 0 failures** | `candidate-verification.json` |
| `node --import tsx scripts/validate-tracking.ts` | 23 tasks, 34 acceptance definitions and both Markdown views validated | — |
| `python docs/reviews/cowork/tools/build_pack.py` | five generated outputs rebuilt | `GENERATED_MANIFEST.json` |
| `python docs/reviews/cowork/tools/validate_docs.py --json` | **98 / 98** | — |
| `python -m unittest discover -s docs/reviews/cowork/tools/tests` | 62 tests; one stale negative control failed and was corrected (FINAL-CONT-F10), then passed | — |
| `docker network ls --filter label=orvia.network-test` / `docker ps -a --filter …` | empty — the T26 run removed everything it created | — |

## T26 status referenced by the W02 review

`tsx scripts/network-qualification.ts confirm:rehearsal` — **PASS, exit 0, 13 assertions** at candidate
`81431d64`, source inventory SHA-256 `e949d8c4…`. Evidence `handoffs/codex/browser/B06-exec-2026-09-17T12-50-28.741Z`, artifact
`handoffs/codex/artifacts/A07-network-qualification-1789649464712-61fc22c5-8651-4fd8-9679-cf7e0b0aef05.json`.
Limitation retained verbatim: observed backend core only, private Docker network, local deny-all DNS and a
controlled external-network canary; browser and host development egress remain unqualified; no real
vendor or model call.
