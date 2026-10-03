# Demo readiness: findings, fixes and open issues (2026-10-03)

Branch `claude/upbeat-newton-w4h53x`. Synthetic data only. Every result below was executed in this session; anything not
executed is marked NOT_RUN.

## Fixed (verified)

| # | Finding | Impact if left | Fix | Evidence |
|---|---|---|---|---|
| F1 | The operations runner held a silent LISTEN connection; the loopback relay drops a connection idle for five minutes; the unhandled pg error ended the runner, and the supervisor then stopped the whole application | ORVIA stopped itself about 4.5 minutes into any quiet period, which would have happened mid-demo | Heartbeat and automatic reopen on the listener; TCP keepalive and an error listener on every pool (`guardPool`) | Reproduced on the old build (stopped at ~4.5 min); fixed build ran 9m42s with no stop, 19 passes |
| F2 | Sign-in showed a title, a "Staff email" label and a "Check my session" button that are not in the owner's preview | Did not match the approved design | Email, Password and Sign in only; links in the bottom line; framer-motion intro on the preview's timeline, every visit | Frame-by-frame comparison with the preview |
| F3 | After signing in, a "Signed in / Go to workspace" dead end | Extra click; looked unfinished | Goes straight to the workspace | `test:e2e:demo-data`, all roles |
| F4 | Workspace had none of the Cyberfyx identity | The product looked like two different apps | Brand layer: purple, orange marker, local Montserrat headings, shield wordmark, full-height navigation | Screenshots `output/playwright/demo-data/` |
| F5 | Intake submissions read "Consent withdrawn for activity 348f4890-…" | Unreadable to staff | Named by activity: "Consent withdrawn: Promotional email and SMS" | `test:e2e:demo-data` assertion |
| F7 | A breach task whose Rule 7 duty had not commenced (13 May 2027) was counted as open and would turn "overdue" at its computed due time, raise attention and DPO notices, and count as "missed the timer" in DPDPA audit indicators | From 5 October the demo breach would have shown an overdue statutory duty that is not yet law | Overdue, due-soon, notifications and audit timeliness count only duties in force at awareness; the list shows "0 (+3 not yet in force)" | breach 19/19, incidents 42/42, notifications 31/31, sdf 22/22, audit-indicator-counts 21/21, dpdpa-audit 56/56, audit-mandate 102/102, operations screens 30/30 |
| F8 | Two AI-governance tests assumed the monitor queue was empty | Intermittent red tests on a long-lived database | Drain due jobs as the running worker does, then check own system | monitor 9/9, catalog-flow 58/58 |
| F6 | The rehearsal installation was almost empty | Most screens said "Nothing recorded yet" | `npm run demo:data`: a DPDP dataset through the real API, with a snapshot first | 27/27 submissions applied; 3/3 withdrawals Completed and verified; 38/38 screen checks (run 4 times, including after a full remove-and-reload cycle) |

## Test harness and data issues found (not product defects)

- **Demo data mistakes, corrected:** the loader first used `@aster-store.example`, and ORVIA correctly refused it, because
  only `@aster.example` and `@birch.example` are synthetic. The store's synthetic records also weren't seeded at first,
  so withdrawals reported `RECORD_NOT_FOUND`, again correctly. Both were fixed in the loader.
- **Sign-in rate limit:** ORVIA allows 10 sign-ins per minute per address and locks an account after 5 wrong codes.
  Back-to-back test runs hit this. The accuracy test now waits out the window. A live demo won't reach it.
- **Orphaned test web servers:** a suite can leave its `next-server` child running on port 4310, and the next suite then
  fails with EADDRINUSE. This happened to audit-mandate, which passed 20/20 once the port was free. The harness's `stop()`
  should end the whole process group.
- **AI governance monitor test:** the test assumes its job is processed in the first sweep, but the sweep takes 20 due
  jobs per pass and the long-lived test database has a backlog. It has failed intermittently in earlier batteries as
  well. The test needs its own scope or must drain the queue first.

## Open product issues (after the demo)

1. **Privacy requests list shows no requester name.** It shows the request ID only, although the person is recorded.
   Adding a name needs a contract change.
2. **The breach list's "Open tasks" counts tasks that are not yet in force.** The tasks themselves are correctly marked
   "Not yet in force" (Rule 7 commences on 13 May 2027). The count should say so.
3. **Systems named after their connector.** Earlier automated runs created many systems named "SYNTHETIC_CRM" and
   similar on the rehearsal database, and they crowd selection lists. A fresh installation doesn't have them.
4. **The vendor installation depends on the developer profile.** `npm run start:vendor` uses the codex-a00 database
   server. A machine without that profile needs `npm run vendor:init confirm:vendor-a00` and first-run setup.
5. **No requester names on consent records either.** By design, ORVIA stores only a keyed digest of store identifiers,
   so records show the reference. A display-name source for staff needs an owner decision.

## Results of this session (all executed)

| Check | Result |
|---|---|
| Static | typecheck, lint, contracts (500 route examples, contract 0.60.0), unit tests 428/428 |
| Full battery: 99 integration suites (excl. lifecycle), 2 security, 10 browser suites incl. full interface crawl | 105 passed; 4 failed and were then explained and rerun under correct conditions: AI monitor and catalog-flow (test fixed, now 9/9 and 58/58), grc-http (needs its own OPA, now passes), migration upgrade (read timeout under load, now 10/10) |
| Targeted reruns after the F7 fix, on a fresh build | 13/13 suites pass |
| Organisation side, demo data (`test:e2e:demo-data`) | 38/38, five times, including a full remove → start → load cycle |
| Vendor/auditor/client side | start smoke 21/21; DPDPA audit engagement 24/24; audit mandate 20/20; vendor production criteria 15/15; sign-in hydration 15/15; 30-minute sign-out 7/7; branded sign-in for vendor admin, audit lead, audit reviewer, client account 4/4 (in `test:e2e:demo-data`, 42/42 with the vendor service running) |
| NOT_RUN | lifecycle.test (needs a database reset authorisation); network-core (needs the packaged image); TLS suite not rerun this session |
