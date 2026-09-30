# Handoff — R3-INTERFACE-POLISH — Codex

**Base commit:** 656bf012f1d7900f7697f23946b9d300cea1defc.
**New commit:** this handoff's commit on `codex/interface-polish-20260930`.
**Source master:** revision 1.4 plus approved addenda; unchanged.
**Contract:** 0.46.0 unchanged. **Profile:** isolated synthetic codex-a00/vendor-a00.

## Delivered

- `frontend/src/components/shared/record-action.tsx`: accessible collapsed action with `aria-expanded` and `aria-controls`; closing retains the mounted form and unsaved values.
- `frontend/src/components/screens/controls/configuration.tsx`: collapse purpose, notice, policy, system, principal and target-mapping creation forms behind their existing action labels.
- `frontend/src/components/screens/operations/audit-retention.tsx`: collapse retention-period entry behind “Record retention period”.
- `frontend/src/components/screens/operations/capabilities.tsx`: five programme modules per page with previous/next controls and actual module counts. All 33 existing entries retained; runtime connector records keep their existing server pagination.
- `frontend/src/instrumentation-client.ts`, `frontend/package.json`, `pnpm-lock.yaml`: configure pinned Zod 4.6.5 with `jitless: true` at client startup. Firefox on the baseline reports CSP-blocked `new Function` probes on every page. This disables optional JIT/probing without changing schemas or allowing `unsafe-eval`.
- `handoffs/codex/check-base-ui.ts` and `run-browser-round3.mjs`: focused mobile verification and browser selection for unchanged regression journeys. No protected journey source, fixture, assertion or threshold changed.

## Commands actually executed

Pinned Node 24.21.0; native worktree dependencies. Logs in `handoffs/codex/artifacts/`.

| Command | Exit | Evidence |
|---|---|---|
| targeted TypeScript check before CSP addition | 0 | R3-polish-typecheck.log |
| targeted ESLint before CSP addition | 0 | R3-polish-lint.log |
| pinned pnpm frozen offline install with workspace store | 0 | R3-polish-install.log |
| `tsx scripts/web.ts build` before CSP addition | 0 | R3-polish-build.log |
| `pnpm --filter @orvia/web add zod@4.6.5 --offline` | 0 | R3-polish-csp-dependency.log |
| `tsx scripts/web.ts build` including CSP configuration | 0 | R3-polish-build-csp.log |
| ESLint all five changed TypeScript/TSX sources, `--max-warnings 0` | 0 | R3-polish-lint-final.log |
| `node_modules/.bin/tsc.cmd --noEmit` on the final source | 0 | R3-polish-typecheck-final.log |

Runtime execution:

| Command | Exit | Evidence |
|---|---|---|
| `tsx scripts/machine-init.ts confirm:codex-a00` | 0 | R3-polish-machine-renew.log |
| `tsx handoffs/codex/check-base-ui.ts` (Firefox, 390 px viewport) | 1 | R3-polish-focused-ui.log; both feature checks pass, final CSP-error assertion fails |
| wrapper with Chromium default executable, expansion and crawl | 1 each | R3-polish-chromium-*.log; pinned browser revision 1243 absent; no journey executed |
| wrapper with installed Google Chrome 154.0.8037.58, expansion | 0 | R3-polish-chrome-expansion-screens-local.log; A00-operations-expansion-screens-browser-1790738148146-8db495de-bb29-4e33-b645-df17ec6d6062.json: **69/69** |
| same wrapper/executable, `interface-crawl-local` | 0 | R3-polish-chrome-interface-crawl-local.log; A00-operations-interface-crawl-1790738819941-b5e16fbd-ca81-4c7c-b6e6-8c82c410177a.json; **450 visits, zero pages with issues** |

The installed Chrome run sets `ORVIA_CHROMIUM_PATH=C:/Program Files/Google/Chrome/Application/chrome.exe`, retains the unchanged test's executable override, and runs `tsx handoffs/codex/run-browser-round3.mjs chromium expansion-screens-local`. No additional browser download or version claim is hidden; `R3-polish-chrome-version.log` records the local executable's version. `ORVIA_PROFILE=codex-a00`, `ORVIA_WORKSPACE_ROOT` points to this worktree.

The focused Firefox check verifies all 33 modules reachable in seven pages of at most five, disabled Next at the end, initially collapsed purpose form, and draft retained on close/reopen. Both assertions pass; screenshots R3-polish-capabilities-mobile.png and R3-polish-configuration-mobile.png were visually inspected. The overall check remains FAIL because two crypto-polyfill eval diagnostics remain. Capability entries can still be long when their recorded limitations/evidence are long; pagination bounds the number of entries, not each entry's text height.

## Acceptance

Owner acceptance NOT_RUN. These changes do not promote historical capability/acceptance statuses or claim production qualification.

## Contract / dependency / ownership changes

No semantic contract or migration change. Zod is already the workspace contract dependency; the frontend now declares its direct startup import. No Claude-owned path edited.

## Remaining limitations and blockers

The required unchanged expansion journey and interface crawl both PASS on this build under installed Google Chrome 154. The crawl inventories 105 routes and completes 450 visits; eight detail routes have no listed record in this synthetic environment. The log contains 452 PASS records including its aggregate check; this differs from Claude's seeded 460-check crawl and does not claim identical dynamic-record coverage. `R3-polish-chrome-interface-crawl-detail.json` retains the raw report. Its screenshot fields reference transient output paths; retained visual evidence is the named R3 masked screenshots, not the complete crawl screenshot directory. Tracked generated images were restored after execution.

Baseline Firefox/WebKit failures belong to the separate browser handoff; feature checks do not replace an overall failed suite. The focused Firefox check remains FAIL on CSP as described below.

The Zod startup change removes its optional eval probe but does not remove every Firefox CSP diagnostic. A remaining client chunk contains Next's compiled assert/util/get-intrinsic eval probes, pulled in by browserified Node crypto. `shared/contracts/src/dpdpa-audit.ts` imports canonical schemas from audit-exchange.ts and audit-channel.ts, both of which also import node:crypto. Those are explicitly Claude-owned paths. Recommended coordinated fix: separate browser-safe schemas/constants from server crypto helpers while preserving canonical schemas and server signature validation. No crypto stub, duplicated DTO schema, unsafe-eval, console filtering or expectation weakening is introduced here. The known limitation remains visible in the failed focused check.

## Next integration action

Push the isolated branch for human review/merge, coordinate the remaining Firefox/WebKit dependencies, then rerun on the resulting integration commit. No merge into main performed by Codex.
