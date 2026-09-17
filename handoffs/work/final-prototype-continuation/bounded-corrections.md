# Continuation bounded corrections and findings

Base: `b909be896084da21f2c9d69e8e88dbb4a36d58d4` (merged checkpoint). Continues the recorded scope in
`handoffs/work/final-prototype-7bc7780/bounded-corrections.md`; FINAL-B06-F01 … F05 remain as written.

Allowed paths for this session's corrections are the already-recorded browser-harness paths
`tests/e2e/{fixture,auth,configuration,consent,workflow,candidate,test-lab}.spec.ts` plus this directory's
review/handoff records. No dependency, lockfile, migration, contract-version or product redesign change is
authorized here. Any further verified defect receives its own finding below before the edit.

---

## FINAL-CONT-F06 — MEDIUM Test Lab operator exit-code expectation contradicts the documented CLI contract

**Severity** MEDIUM · **Owner** browser harness (test) · **Source** `tests/e2e/test-lab.spec.ts:16,18`

**Reproduction.** Targeted rerun `B06-playwright-2026-09-17T10-50-33.688Z` (checkpoint evidence) fails at
`tests/e2e/test-lab.spec.ts:18` with `Expected exit 1, Received 0` for the
`MARKETING_WITHDRAWAL_BROKEN_CONTROL` case.

**Actual runner behaviour** (`scripts/regression-runner.ts`). `process.exitCode=1` is set only in the
top-level `catch` (line 95), i.e. when the operator could not complete the enqueued execution and records
an `execution_error` / `ERROR` terminal state. A scenario that completes and stores
`run.state='FAIL'` (line 91) leaves the exit code at 0.

**Three independent existing consumers require exit 0 for a completed broken-control detection:**

| consumer | mechanism | requirement |
|---|---|---|
| `tests/integration/regression/regression.test.ts:30` | `promisify(execFile)` (rejects on non-zero) | runs all four scenarios including `MARKETING_WITHDRAWAL_BROKEN_CONTROL`, then asserts stored state `FAIL` at line 33 |
| `scripts/demo-run.ts:16` | `promisify(execFile)` | `MARKETING_WITHDRAWAL_BROKEN_CONTROL` is an allowlisted scenario (line 11); line 17 expects stored `FAIL` and writes `expected_fault_detected:true` with `result:'PASS'` |
| `tests/security/network-core.ts:16` | `promisify(execFile)` | healthy scenario only, but same completion semantics |

**Documented contract, decided from that real behaviour.** The operator CLI exit code reports whether the
*operator run completed*, not the business outcome of the scenario:

```
exit 0  the enqueued run reached a recorded terminal result (PASS or FAIL), or there was
        nothing pending / only an interrupted run to recover as ERROR
exit 1  the runner itself could not complete the execution (top-level error, run stored ERROR)
```

An expected broken-control detection is a **successful operator execution** whose durable business result
is FAIL. Conflating it with operator failure would contradict `AGENTS.md` ("expected regression detection
is distinguished from an ordinary passing control") and would break the three consumers above.

**Correction.** Change the expectation in `tests/e2e/test-lab.spec.ts` only: the broken control expects
exit 0, with the contract recorded inline. **No product assertion is weakened.** The case still requires
stored `state==='FAIL'`, non-empty stored assertions, `expected_fault_detection===true`, the visible `Fail`
result and the `Expected broken-control detection` heading. `scripts/regression-runner.ts` is not changed,
so no already-executed backend evidence is invalidated.

**Retest.** `tests/e2e/test-lab.spec.ts` both cases, then the complete browser suite.

---

## FINAL-CONT-F07 — MEDIUM interruption barrier references a nonexistent table and leaks a pooled connection

**Severity** MEDIUM · **Owner** browser harness (test) · **Source** `tests/e2e/test-lab.spec.ts:30,34`

**Reproduction.** Same run `B06-playwright-2026-09-17T10-50-33.688Z`: the second case fails at line 30,
`LOCK TABLE app.purposes IN SHARE MODE`, because `app.purposes` does not exist. The failure is raised
before the `try` on line 32, so the `finally` on line 34 never runs; the checked-out `h.db` client stays
held in an aborted transaction and the worker fixture's teardown (`h.db.end()`) times out at 240000 ms.

**Schema evidence.** `packages/db/migrations/0004_configuration_consent.sql:2` creates
`app.purpose_versions`; no migration creates `app.purposes`. `packages/domain/src/configuration.ts:21`
(`INSERT INTO app.purpose_versions VALUES(...)`) is the first configuration write performed by
`createMarketingScenario` (`packages/testing/src/scenario.ts:12` → `POST /api/v1/admin/purposes`), which
`scripts/regression-runner.ts:51` calls immediately after persisting `state='RUNNING'` (line 47). A
SHARE-mode lock conflicts with the ROW EXCLUSIVE lock that INSERT takes, so the runner blocks in RUNNING
exactly as the case intends.

**Correction.** Use `app.purpose_versions`, and protect acquisition, barrier setup, operator termination,
`ROLLBACK` and `release()` so that a failure at any step still releases the pooled connection and does not
leave an operator child registered with the harness. The interruption remains a real process kill; no run
state is manufactured and the recovery path is unchanged.

**Retest.** `tests/e2e/test-lab.spec.ts` both cases, then the complete browser suite beyond five minutes
(which also completes the outstanding FINAL-B06-F05 heartbeat verification).

---

## Carried-forward blocking prerequisite

Browser execution of the retests above is **BLOCKED** pending fresh explicit human approval to reinstall
the reviewed rehearsal CA in `CurrentUser\Root`; see `START.md` for the re-verified certificate identity.

---

## FINAL-CONT-F08 — LOW, no per-screen browser acceptance producer (OPEN, not corrected here)

**Severity** LOW · **Owner** browser harness · **Source** `tests/e2e/reporter.ts`

`evidence_rules.screen_errors` (line 366) requires a raw report of `kind: "BROWSER_ACCEPTANCE"` listing the
screen in `screen_ids` before any screen in `DELIVERY_STATUS.json` may claim a browser result. The
Playwright reporter writes `handoffs/codex/browser/B06-playwright-*/results.json` with `result`,
`source_commit`, `source_tree_sha256`, `contract_version`, `profile`, `fixture`, `limitations` and per-test
entries — but **no `kind` and no `screen_ids`**.

Consequence: even though the complete suite passed **16/16 at the exact candidate commit**, every screen's
`tested` value stays `NOT_RUN`, and C02 cannot evidence a screen-level browser claim. The source-inspection
side is now satisfied (all 18 screens are `IMPLEMENTED` with hash-verified route files at the candidate).

**Not corrected here.** Adding `kind` and a screen mapping to the reporter is an engineering change outside
this session's recorded bounded scope, and the screen-to-test mapping is a product decision. Recorded for
the human and the next engineering increment.

---

## FINAL-CONT-F09 — LOW, pack builder was not byte-deterministic across platforms (CORRECTED)

**Severity** LOW · **Owner** Work document tools · **Source** `docs/reviews/cowork/tools/build_pack.py:495`

`(root / p).write_text(c, encoding="utf-8")` used Python text mode, which rewrites every `\n` as `\r\n` on
Windows. The repository stores these generated files with LF, so running the documented command
`python3 docs/reviews/cowork/tools/build_pack.py` on Windows rewrote all five outputs wholesale:
`UX_BRIEF.md` (646 lines), `DEMO_SCRIPT.md` (323), `LEADERSHIP_HANDOVER.md` (182), `index.html` (297) and
`GENERATED_MANIFEST.json` (38), with `git diff --check` reporting trailing whitespace on every line.

This matters beyond diff noise: the C-lane evidence system hashes these files, so identical inputs produced
different SHA-256 values depending on the operating system the builder ran on.

**Correction.** Pass `newline=""` so the generated `\n` is written verbatim on every platform. After the
fix, rebuilding changes only real content: `LEADERSHIP_HANDOVER.md` 5 lines, `index.html` 9 lines,
`GENERATED_MANIFEST.json` 13 lines; `UX_BRIEF.md` and `DEMO_SCRIPT.md` are byte-identical to `HEAD`.
`git diff --check` is clean. `validate_docs.py` reports **98/98**.

This path is Work-owned (`AGENTS.md`: Work owns the transferred former-Cowork document tools), so no
cross-lane transfer was required.

---

## FINAL-CONT-F10 — LOW, screen negative control stopped perturbing its input (CORRECTED)

**Severity** LOW · **Owner** Work document tools · **Source**
`docs/reviews/cowork/tools/tests/test_r4_regressions.py:199`

`test_screen_unknown_and_source_only_browser_claim_fail` proves that a stated screen implementation which
contradicts the source inspection is rejected. It did so by overriding `screens[0]` with the hard-coded
value `implementation='IMPLEMENTED'`, which was a contradiction only while the real screens were
`NOT_IMPLEMENTED`.

Once EV-SRC-009 recorded the screens as genuinely `IMPLEMENTED` at the frozen candidate, that override
became a no-op: `rules.screen_errors` correctly returned `[]`, and the control failed with
`AssertionError: [] is not true`. **The rule was never broken** — the other two sub-controls
(`evidence='UNKNOWN'`, `tested='PASS'`) continued to fail as designed, and `validate_docs.py` reports 98/98.

**Correction.** Derive the contradicting value from the current state instead of hard-coding it, so the
control keeps perturbing its input whichever way the real screens are recorded. Verified:
`python -m unittest test_r4_regressions.R4Tests.test_screen_unknown_and_source_only_browser_claim_fail`
→ OK.

The failing run is retained in this session's record; it is a stale test fixture, not a regression in the
evidence rules.

---

## FINAL-CONT-F11 — HIGH, browser suite at `0ff33e9` failed 5 PASS / 11 FAIL (OPEN)

**Severity** HIGH · **Owner** environment / to be determined · **Source** run
`B06-exec-2026-09-17T13-46-47.048Z`, results `B06-playwright-2026-09-17T13-46-58.203Z/results.json`

Exit **1**, `13:46:47Z → 14:12:13Z` (25 m 26 s, against 9 m 59 s for the passing run at `81431d6`),
commit `0ff33e9a`, build `pKS-S9WY5IsMrwB9DecCI`, `source_changed_during_run=false`.

**Why this run existed.** `scripts/source-state.ts:6` excludes `handoffs/`, `artifacts/` and `docs/` but
**not `tracking/`**. Commit `0ff33e9` edited `tracking/tasks.json` and `tracking/acceptance.json`, so the
qualified source inventory moved from `e949d8c4…` to `fa3bec7e…`, and `tests/e2e/package.ts:29` only counts
browser reports whose commit **and** inventory hash match the candidate. Work's own acceptance bookkeeping
therefore invalidates the candidate it is recording.

**First causal failure (PROVEN).** `configuration.spec.ts`, 74,149 ms:
`TimeoutError: locator.selectOption: Timeout 20000ms exceeded` waiting for
`locator('form').filter({has: getByRole('heading',{name:'Create target mapping', exact:true})}).getByLabel('Mapping principal')`
on `/workspace/principals`.

**Consequential failures (PROVEN).** The remaining 10 share one signature,
`Error: Connection terminated due to connection timeout` (one `Connection terminated unexpectedly`) —
**57 occurrences** across the protected traces. `tls.spec.ts` failed in **1,095 ms**, and it only navigates
to `/` and expects 200, so the application was unreachable within a second. Ordering: `auth` 3/3 PASS
(16.5/6.2/9.0 s), `candidate` 2/2 PASS (158.0/19.7 s), then `configuration` FAIL at 74 s, then everything
else FAIL in 1.1–7.2 s.

**Environment state observed afterwards (PROVEN).** The Docker daemon was unreachable
(`npipe:////./pipe/dockerDesktopLinuxEngine … system cannot find the file specified`) and none of
`55433 / 57235 / 58183 / 4330` were listening, though all four were listening earlier in the session.

**Hypothesis, not proven.** That the backing layer collapsed mid-run and the empty `Mapping principal`
select was a symptom rather than a UI regression. Not excluded: a genuine data/UI defect. `0ff33e9`
changed only `docs/`, `tracking/`, `artifacts/` and `CURRENT_STATE.md`, and `candidate.spec.ts` had just
exercised the workspace successfully for 158 s, which makes a regression unlikely but not impossible.

**Smallest next diagnostic.** Restore services, confirm the four ports, then run `configuration.spec.ts`
**alone**. Pass ⇒ environmental. Reproduce ⇒ real defect, and that single spec is the targeted retest.

**Do not** present the 16/16 run at `81431d6` as qualification of `0ff33e9` or of any later build.

---

## FINAL-CONT-F12 — MEDIUM, documentation defects found by audit (CORRECTED)

**Severity** MEDIUM · **Owner** Work · **Source** this directory plus `CURRENT_STATE.md`,
`docs/reviews/work/FINAL_GATE_REPORT.md`

1. **Arithmetic.** The reconciliation summary claimed "25 of 30 … 5 PARTIAL" while its own table held 26
   COMPONENT_PASS and 4 PARTIAL. Both figures were wrong. Corrected to **24 / 6** after item 2, and the
   total is now checked against the table rows.
2. **Two scenarios were mislabelled COMPONENT_PASS against their canonical `expected` text.**
   **T26** requires "**browser and backend** observations"; only the backend run happened, and its own
   artifact says browser egress is unqualified. **T27** requires "**dependency**/secret scan findings
   triaged"; only the secret/pattern scan ran, and the newest dependency-advisory artifact
   (`A07-dependency-advisories-1789613793192.json`) predates this work and carries no `source_commit`.
   Both are now **PARTIAL**.
3. **Tree-ID labelling.** `e949d8c43c0d…` was written as "tree". It is `sourceState().sha256`, a custom
   SHA-256 over a filtered file inventory — **not** a Git tree ID. The real Git trees are
   `81431d6 → e69c35f8636e…` and `0ff33e9 → 67553e1062…`. All occurrences now read
   "source inventory SHA-256".

T01, T02, T28 and T30 were already PARTIAL for the right reasons: restarting retained services is not a
fresh-profile start, and `fixture-isolation.ts` only *refused* the rehearsal profile, so cross-lane store
isolation stays unproven.
