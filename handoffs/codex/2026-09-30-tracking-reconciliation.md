# Handoff — R3-TRACKING-RECONCILIATION — Codex

**Base commit:** bf29c436911d33cbbafcbb6ce7f6d04a5704a64d, human merge of PR #32 into main.
**New commit:** this handoff's commit on `codex/tracking-reconcile-20260930`.
**Source master:** revision 1.4 plus approved addenda, unchanged.
**Master SHA-256 verified:** C51102A7CDA5FE15C1346E8C34167C406E186C691E9BA86576A3D8FD03BB550B.
**Contract:** 0.46.0 unchanged. **Scope:** post-merge evidence reconciliation; no runtime use.

## Delivered

`tracking/v1-expansion.json` now records the audit merge, Claude's final battery7 evidence, resolved second-review findings and remaining decisions. EX19 no longer incorrectly says the work is unmerged. EX13 distinguishes later commerce/migration coverage from its historical 45-assertion entry. EX14 distinguishes the fresh isolated qualification profile from the preserved divergent historical database.

`tracking/tasks.json` links this evidence and Claude's handoff to A07, B06 and W03. Historical task completion/accepted commits and all acceptance statuses are retained. `docs/prototype/TASK_BOARD.md` is regenerated to match those evidence links. No frozen candidate, owner acceptance or release qualification is promoted.

## Evidence reconciliation

Claude's merged `handoffs/code/2026-09-29-audit-practice.md` records battery7 on bd92f85 with the audit-mandate test-only correction 8b68c90: vendor-audit 74/74, audit-practice 99/99, schema-equivalence 7/7, commerce 116/116, migration-ledger fresh/legacy-name PASS, audit-mandate 98/98 including the 250-request backlog, dpdpa-audit 52/52, operations PASS, upgrade 10/10, Chromium journeys 20/20 + 19/19 + 69/69, crawl 460/460, unit 334 and static/contract/tracking checks clean. These are attributed execution results, not a new Codex rerun.

The “remaining limitations” section in that older handoff contains historical items superseded by its own later battery7 section and subsequent merged commits: relay memory is now 256 MB in Compose, the commerce migration is 0011, contract 0.46.0 was reviewed and high findings fixed, and EX15–EX19 exist. Other open items are retained.

| Round-3 task | Executed evidence / status | Branch and exact source |
|---|---|---|
| Backup | Current-schema restore PASS; historical migration FAIL/rolled back. Restore includes 71 ledger entries and forced RLS, but zero withdrawn consent rows. No historical database repair or nonempty withdrawal proof. Preserved stopped relay raised from 64 to 256 MiB too, matching merged Compose. | `codex/backup-drill-20260930`, 8b20408 (drill artifact at 81262a3), `handoffs/codex/2026-09-30-backup-drill.md` |
| Capacity | Before: 18 statement-timeout cancellations, correctly exit 1. After current migrations: zero errors, exit 0, unchanged 45-second/16-client workload. Historical 37-error run retained. Schema and relay memory differ; not a controlled single-factor experiment. | `codex/capacity-20260930`, e27e5fd, `handoffs/codex/2026-09-30-capacity.md` |
| Installer | Clean-container preflight FAIL: Docker CLI, Compose, openssl, pnpm, daemon absent. Individual script syntax checks PASS. Fresh install/setup/previous-RC upgrade NOT_RUN here. | `codex/installer-20260930`, e34cdda, `handoffs/codex/2026-09-30-installer.md` |
| SCIM | Implementation/provider qualification NOT_RUN pending owner scope/provider decision. | `codex/scim-decision-20260930`, 675903d, `handoffs/codex/2026-09-30-scim-decision.md` |
| Cross-browser | All eight Firefox/WebKit commands FAIL, exit 1. Firefox crawl: 450 visits, 414 pages with issues; WebKit: seven signed-out visits then sign-in failure. No authenticated WebKit qualification. | `codex/cross-browser-20260930`, 7fdffd4, `handoffs/codex/2026-09-30-cross-browser.md` |
| Local TLS | PASS, 10/10 after correcting my initial harness HTTP-status expectation to the existing route's 200. Real signed delivery and request/response over HTTPS; CA and hostname rejection controls passed. Full production hosting NOT_RUN. | `codex/local-tls-20260930`, a101de4, `handoffs/codex/2026-09-30-local-tls.md`, A00-operations-local-audit-tls-1790737669095-994f3ef6-0787-45c6-adac-0c10cf308bf0.json |
| UI polish | Build/typecheck/lint PASS. Unchanged Chrome expansion 69/69; crawl 450 visits, zero issues. Focused Firefox feature checks PASS but its overall test FAILS on remaining crypto-polyfill CSP diagnostics. | `codex/interface-polish-20260930`, db9f7a0, `handoffs/codex/2026-09-30-interface-polish.md`; A00-operations-expansion-screens-browser-1790738148146-8db495de-bb29-4e33-b645-df17ec6d6062.json and A00-operations-interface-crawl-1790738819941-b5e16fbd-ca81-4c7c-b6e6-8c82c410177a.json |

TLS fixture cleanup passed through the application: one remaining synthetic engagement from the first failed run was closed; A00-operations-local-tls-fixture-closure-1790738868140-893f4137-8a82-483e-95f6-f76dc5384ddd.json. No database was reset. The UI crawl has eight detail routes without listed synthetic records and 452 PASS log records, so its coverage is not claimed identical to Claude's 460-check seeded crawl.

## Runtime handback

Verified the three running test containers were on `orvia-qualification-20260930`, and their PostgreSQL mount was `orvia-qualification-20260930-postgres`. Verified the preserved original containers were stopped. Then `docker stop` on the three qualification containers, followed by six `docker rename` commands, all exited 0. Final inspect exited 0; `R3-runtime-handback.log` records the final state (text encoding normalized after PowerShell mixed UTF-8/UTF-16 output).

- Original containers again use `orvia-codex-a00-postgres-1`, `orvia-codex-a00-opa-1`, `orvia-codex-a00-loopback-1`; all stopped, original volumes untouched. The original relay now has the requested 256 MiB RAM limit.
- Qualification containers retained stopped as `orvia-qualification-20260930-postgres`, `orvia-qualification-20260930-opa`, `orvia-qualification-20260930-loopback`; all report no OOM kill and zero restarts. Their network/volume are retained.
- Private qualification profiles remain in `.worktrees/backup-round3/.local/profiles`; private test signing keys remain in `.worktrees/browser-round3/.local/vendor`. No private material is committed. Root original profiles were preserved. Worktree profile junctions still select the qualification profile, not the original one.
- Application/test processes completed and closed their owned listeners. Reusing fixed-profile container names for another drill requires the normal one-writer runtime coordination; do not confuse retained qualification profiles with the original stopped containers.

## Commands actually executed

`git fetch origin` — exit 0. `git rev-parse origin/main` — exit 0, bf29c436911d33cbbafcbb6ce7f6d04a5704a64d. New worktree/branch created from that merged main — exit 0. `tsx scripts/validate-tracking.ts` — exit 0: 23 tasks, 34 acceptance definitions, 33 capability modules and Markdown views validated, no results promoted. Final rerun is recorded in R3-tracking-validation.log.

## Acceptance

All canonical T01–T34 acceptance results and expanded-family acceptance remain NOT_RUN. `release_qualified` remains false. Human review/acceptance is a distinct required step.

## Contract / dependency / ownership changes

None. No new migration, endpoint, DTO, ownership transfer or scope decision. This supersedes the earlier `codex/tracking-gate-20260930` handoff's waiting-on-merge status; that historical observation remains valid for its checkpoint.

## Remaining limitations and blockers

- Owner: inactive-mandate state-only check-in, SCIM scope/provider, customer-held recovery, previous release-candidate nomination, exact-candidate acceptance/release decision.
- Legal/external: engagement letter/DPA, official criteria/source review, production signing custody, real TLS hosting, real-host installer/platform qualification, payment-provider activation.
- Claude: protected vendor/channel/browser findings from round-3 cross-browser evidence.
- Engineering: sustained/multi-day operation and declared-hardware capacity remain unqualified; synthetic local execution does not establish production readiness.

## Next integration action

Human reviews/merges the separate task branches and this reconciliation. Rerun the necessary qualification checks on the exact resulting candidate; do not infer acceptance from a collection of different branch runs.
