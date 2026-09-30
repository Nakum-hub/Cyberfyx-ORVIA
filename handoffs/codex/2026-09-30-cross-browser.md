# Handoff — R3-CROSS-BROWSER — Codex

**Base commit:** 3fa7081aa9ce49d92dd6c724b35b3f5ffa3a79d8 from Claude's integration branch.
**New commit:** this handoff's commit on `codex/cross-browser-20260930`.
**Source master:** revision 1.4 plus approved addenda; unchanged.
**Contract:** 0.46.0 unchanged. **Profile:** user-approved fresh isolated synthetic codex-a00/vendor-a00, customer migrations through 0070, vendor through 0013.

## Delivered

User approved installation of Playwright Firefox and WebKit. Installed Firefox 155 (Playwright build 1543) and WebKit 26.6 (build 2359). `handoffs/codex/run-browser-round3.mjs` substitutes the browser launch implementation only, then imports each unchanged requested journey. Assertions, selectors, fixtures and thresholds are not modified. Final screenshots mask input/code/pre elements; all other visible data is synthetic.

No application or protected test source changed on this branch. Tests generate their own output files; selected evidence is retained under `handoffs/codex/` rather than committing changes in Claude's handoff area. The product/test source under backend, frontend, shared, tests, scripts and database has no diff between this pinned base and merged main bf29c43; subsequent integration commits were records/artifacts.

## Setup failures and corrections

All failures are retained; none is reclassified as a pass.

- Initial shared dependency junction caused Turbopack's out-of-root symlink failure (`R3-browser-build.log`, exit 1). A webpack fallback also failed on `node:crypto` (`R3-browser-build-webpack.log`, exit 1).
- Native offline install lacked cached yargs (`R3-browser-offline-install.log`, exit 1). Native frozen install with the workspace store succeeded (`R3-browser-install.log`, exit 0); normal Turbopack build succeeded (`R3-browser-build-native.log`, exit 0).
- Initial fresh staff fixtures had no enrolled authenticator URIs. Enrolled the synthetic accounts through the normal authentication API (`R3-browser-mfa-setup.log`, exit 0); no bypass or reset. Earlier per-browser `*-capture.log`, artifacts and `before-mfa/` screenshots remain failure evidence.
- My synthetic signing-key setup initially used development-prefixed IDs for release/licence keys where the contract requires UUIDs. Corrected those local IDs, retained the generated keys and refreshed public trust (`R3-key-id-correction.log`, exit 0). Audit key ID remains its supported string. No contract/expectation change, no production keys.
- The overnight interruption ended the enrolled batch after two Firefox failures; its expansion log has startup only and is NOT_COMPLETED. `R3-browser-enrolled-results.log` is not the final matrix.
- Restarted only the new isolated qualification containers after Docker Desktop restarted; renewed the synthetic machine enrollment (`R3-machine-renew.log`, exit 0). Preserved historical volumes/database unchanged.

## Commands actually executed

Pinned Node 24.21.0, pnpm 12.4.2. Each final invocation uses `ORVIA_PROFILE=codex-a00` and `ORVIA_WORKSPACE_ROOT` set to this worktree:

`tsx handoffs/codex/run-browser-round3.mjs <firefox|webkit> <dpdpa-audit-local|audit-mandate-local|expansion-screens-local|interface-crawl-local>`

Per-command exits are in `R3-browser-final-results.log`; the PowerShell loop's own exit is not a suite result. Each final log references its independently generated A00 JSON artifact.

| Browser / journey | Result | Evidence |
|---|---|---|
| Firefox / dpdpa-audit-local | FAIL, exit 1; 18 recorded assertions including one failure | `R3-firefox-dpdpa-audit-local-final.log`; A00-operations-dpdpa-audit-browser-1790736133531-38a3a0c0-72ca-49f0-ab28-327178be2bc7.json |
| Firefox / audit-mandate-local | FAIL, exit 1; 20 records including failed assertion and propagated exception | `R3-firefox-audit-mandate-local-final.log`; A00-operations-audit-mandate-browser-1790736288544-c89f7b6c-02cf-425f-8ab4-4d87b1fff4b0.json |
| Firefox / expansion-screens-local | FAIL, exit 1; 6 recorded assertions including one failure | `R3-firefox-expansion-screens-local-final.log`; A00-operations-expansion-screens-browser-1790736374815-95077770-7b66-489b-a593-dfd54c039dbe.json |
| Firefox / interface-crawl-local | FAIL, exit 1; 105 routes inventoried, 450 visits, 414 pages with issues, nine detail routes without a listed record | `R3-firefox-interface-crawl-detail.json`; A00-operations-interface-crawl-1790737304521-ee39281c-4d55-4453-8c4b-9f21d49e34e4.json |
| WebKit / dpdpa-audit-local | FAIL, exit 1; three passing isolation checks, then vendor sign-in timeout | `R3-webkit-dpdpa-audit-local-final.log`; A00-operations-dpdpa-audit-browser-1790737381818-180c19b3-0860-4c22-ad22-09d35a6644a1.json |
| WebKit / audit-mandate-local | FAIL, exit 1; vendor sign-in timeout before business assertions | `R3-webkit-audit-mandate-local-final.log`; A00-operations-audit-mandate-browser-1790737421728-5be2c6ff-8647-413a-b1ea-c3a3d5ec54ee.json |
| WebKit / expansion-screens-local | FAIL, exit 1; staff sign-in timeout before business assertions | `R3-webkit-expansion-screens-local-final.log`; A00-operations-expansion-screens-browser-1790737485770-1e21920c-e742-4fa5-ba77-2d24ef1f6da9.json |
| WebKit / interface-crawl-local | FAIL, exit 1; seven signed-out visits with no issues, then staff sign-in timeout | `R3-webkit-interface-crawl-detail.json`; A00-operations-interface-crawl-1790737533328-3d81887b-c895-472d-b919-ae2aed2bc5fb.json |

All eight final commands executed and exited 1. WebKit authenticated-route coverage is incomplete. Its crawl's “nothing wrong” aggregate applies only to the seven visits completed before the propagated exception; the suite is FAIL, not PASS.

## Findings and reproduction

1. **Firefox vendor Report tab transition:** unchanged dpdpa journey reaches signed findings export, clicks Report, then times out waiting for Draft report / Executive summary at `tests/e2e/dpdpa-audit-local.ts:329`. Screenshot `R3-firefox-dpdpa-audit-local-5.png` still shows Findings and actions selected; page 6 is the independent reviewer context. The preceding 17 assertions passed. Claude-owned vendor page/test; no fix attempted here.
2. **Firefox CSP console failures:** mandate business-flow assertions complete through closure, but the final browser-error assertion records blocked eval probes from a shared client chunk. The external-request array is empty. Baseline crawl records the same error across pages. Do not add unsafe-eval or suppress the assertions. The separate UI branch tests a client-startup Zod `jitless` configuration; a focused rerun still reports two diagnostics from a chunk containing Next's compiled assert/util/get-intrinsic probes pulled in with Node crypto. Disabling Zod's optional probe is not a complete CSP fix. Claude-owned audit schema modules import node:crypto alongside browser-consumed schemas; coordinate a browser/server module separation without changing signature validation or duplicating schemas.
3. **Firefox assessment repeat-save:** expansion journey creates/publishes a template, starts an assessment and saves answers; after filling the required evidence reference, the second Save answers produces no matching POST within 30 seconds (`expansion-screens-local.ts:102`). Screenshot `R3-firefox-expansion-screens-local-2.png` shows the stored first answer and the form. This is an observed failure, not a confirmed backend cause.
4. **Other crawl observations:** besides CSP, administrator `/workspace/installed-versions` did not settle within 20 seconds and remained loading; auditor `/workspace/assessments` remained loading; auditor `/workspace/audit-coverage` recorded HTTP 503 from `/api/v1/session`. Preserve these as observed failures requiring reproduction, not proven independent root causes. The final full TypeScript check on the separate UI tree ran during part of the crawl, so this was not an otherwise idle host.
5. **WebKit sign-in transition:** all four suites time out waiting for the authenticator field after submitting email/password. Audit journeys stop at `/vendor/sign-in`; expansion/crawl stop at `/workspace/sign-in`. `R3-webkit-dpdpa-audit-local-1.png` shows the email/password form still displayed, email focused, with no server error notice. Root cause is not proven; do not change credentials, authentication requirements or test timing to conceal it.

## Acceptance

Cross-browser execution is engineering evidence only. Owner acceptance NOT_RUN. Successful business-flow subsets do not turn an overall failed suite into PASS. Chromium battery7 remains attributed to Claude; these are Firefox/WebKit runs.

## Contract / dependency / ownership changes

No contract, migration or application dependency change. Approved local browser installation and synthetic qualification environment only. No Claude-owned source edited.

## Remaining limitations and blockers

Protected vendor failures require Claude's correction and unchanged-suite reruns. WebKit authenticated routes remain unqualified. These local desktop browsers do not qualify real customer hosts, production TLS, legal engagements or multi-day operation.

## Next integration action

Push this report branch for human review and coordinate protected-path fixes with Claude. Rerun on the exact integrated candidate after corrections; no acceptance promotion. The separate UI branch's results must be read independently.
