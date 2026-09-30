# Handoff - R5-01 - WebKit and hydration verification

**Base:** 5c806fc2b02368827e8b6b35f483e5a3c135cc90. **Branch:** codex/webkit-verification-20261002.
**New commit:** this handoff's branch commit. Contract 0.46.0 and approved masters unchanged. Synthetic preserved isolated customer/vendor profiles only; no reset, deployment, main merge, or relay change (256 MiB).

## Results

| Test | Browser | Result | Exit | Artifact |
|---|---|---|---|---|
| dpdpa-audit-local | WebKit | FAIL: 8 passing assertions, 1 failure | shell 1; native exit not captured | R5-webkit-dpdpa-audit-local.log; A00-operations-dpdpa-audit-browser-1790760376246-bf556e38-1a85-4654-abf8-183cb21b6cff.json |
| sign-in-hydration-local | WebKit | PASS 20/20 | 0 | R5-webkit-sign-in-hydration-local.log |
| sign-in-hydration-local | Firefox | PASS 20/20 | 0 | R5-firefox-sign-in-hydration-local.log |
| audit-mandate-local | WebKit | INCOMPLETE: owner time-box; one assertion completed | 124 | R5-webkit-audit-mandate-local.log |
| expansion-screens-local | WebKit | NOT_RUN: time-box | N/A | this handoff |
| interface-crawl-local | WebKit | NOT_RUN: time-box | N/A | this handoff |

All artifacts above are in handoffs/codex/artifacts/. Both hydration probes verify all four sign-in surfaces with unchanged assertions. They do not qualify the other journeys. The owner shortened the pass to 15 minutes at 09:21 UTC; test cutoff 09:31:30 reserved evidence/push time. Earlier FAIL records remain unchanged.

## Failure and traces

First failing audit step: tests/e2e/dpdpa-audit-local.ts:196, reviewer reload and click Open on the matching Engagements row; locator timed out at the unchanged 30000ms. Context 3 records a 503 from /api/v1/admin/dpdpa-audit/gaps. Vendor and both staff sign-in POSTs returned 200. Cause remains OPEN; no frontend fix attempted. Claude owns the DPDPA audit screen/domain/API; runtime contribution is unproven.

Complete credential-redacted diagnostic copies: artifacts/R5-traces/webkit-dpdpa-audit-local/context-{1,2,3}.zip and events.jsonl. First failing step is context-3.zip. Time-boxed mandate traces: artifacts/R5-traces/webkit-audit-mandate-local/context-1.zip through context-6.zip and events.jsonl. Six contexts were retained; interruption is not a product failure or PASS. Raw traces stay in ignored output/playwright/round5/. No external trace upload. R5-trace-validation.json records CRC/SHA256 checks; redactors exited 0, learning 52 and 61 credential values respectively.

## Commands actually executed

Pinned Node 24.21.0; ORVIA_PROFILE=codex-a00; ORVIA_WORKSPACE_ROOT=this worktree. Exact preparation commands/exits are in artifacts/R5-preparation.json. Frozen offline install, build and forward-only vendor migration 0014 each exited 0. No roles were reprovisioned. Test command prefix: `node node_modules/tsx/dist/cli.mjs handoffs/codex/run-browser-round5.mjs`.

Executed suffixes: `webkit dpdpa-audit-local` (batch shell 1; PowerShell Stop converted stderr to a terminating shell error before native exit capture), `webkit sign-in-hydration-local` (0), `firefox sign-in-hydration-local` (0), `webkit audit-mandate-local` (124; R5_RUN_JOURNEY=1). The audit artifact and trace independently record the actual failing locator. Later commands used Continue to capture native exit codes. R5-results.jsonl preserves this distinction.

`python handoffs/codex/redact-round4-traces.py output/playwright/round5/baseline-webkit-<suite> handoffs/codex/artifacts/R5-traces/webkit-<suite> --profiles .local/profiles` ran for dpdpa-audit-local and audit-mandate-local: both 0. ZIP CRC validation: 0. `node --check handoffs/codex/run-browser-round5.mjs`: 0. `git diff --quiet 5c806fc -- tests/e2e`: 0. R5-unchanged-tests.json verifies all five Git blobs unchanged.

## Changed files and limitations

Only this handoff, run-browser-round5.mjs, run-round5.ps1, prepare-round5-vendor.ts, and the explicit R5/A00 synthetic artifacts. The batch script's shell error mode was corrected after its first failure; no test source, assertion, fixture, selector or threshold changed. The wrapper adds only browser selection, passive console/network logs, traces and a time-box guard; it adds no page scripts or waits. The deadline guard intentionally prevents later launches under this expired pass.

R5-host-memory.jsonl is the initial WebKit audit sample (1006108 KiB free of 8106040 KiB), not idle Firefox crawl evidence. Items 2-4 have separate NOT_RUN handoffs/branches. Next: Claude investigates the audit 503/absent engagement with context-3; Codex reruns remaining journeys and idle crawl in a separately scheduled window. No acceptance promotion.
