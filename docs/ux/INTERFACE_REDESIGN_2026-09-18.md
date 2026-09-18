# ORVIA interface redesign — delivery record

**Date:** 2026-09-18 · **Base commit:** `dbe3e30` · **Profile:** `rehearsal` · **Origin:** `https://127.0.0.1:4330`
Companions: [UI audit](UI_AUDIT_2026-09-18.md) · [Design system](DESIGN_SYSTEM.md)

## 1. Before / after

The audit found seven problems. Six are closed; one is data and needs an operator decision.

| # | Finding | Outcome |
|---|---|---|
| A-01 | No product story anywhere | Eight-stage lifecycle strip on the entry page, the Overview and the Guided demo; each stage links to the screen holding that part of the record |
| A-02 | Identifiers dominate meaning | New `directory.ts` resolves purpose / system / principal names from the same canonical endpoints; every list, card and flow now reads in names, identifiers moved to `Technical details` |
| A-03 | The strongest idea was invisible | Action and verification are now two adjacent panes with their own headings, followed by **"API success is not the same as verification."** |
| A-04 | Overview led with a UUID table | Overview rebuilt: status metrics, lifecycle, one real *Current demonstration* card, assurance, proof links, build facts |
| A-05 | Unresolved work undiagnosable | Attention screen states purpose, system, why it is open, criterion, age and **next action**; one bounded indexed lookup with visible progress and a stop control replaces a per-row opaque scan |
| A-06 | Fixture is test debris | Partly closed: a named demonstration (`Promotional Marketing`, `Aster CRM`, `Manual legacy system`) is provisioned through the real API by `demo:fixture`. The 323 historical fixture purposes remain — clearing them is a database reset and needs human authorisation |
| A-07 | Demo could not survive a pause | Fixed in `scripts/app-run.ts` (below) |

## 2. Screens redesigned

Entry page · Overview (`/workspace`) · **Guided demo (`/workspace/demo`, new)** · Purposes & policies ·
People & targets · Control map · Workflows · Workflow detail · Attention (was Failure Centre) · Evidence
directory · Evidence detail · Test Lab · Test run detail · Capabilities & roadmap · Decision preview ·
Privacy Centre choices · Receipts · Receipt detail. Navigation regrouped into Overview / Privacy controls /
Operations / Assurance / About this build.

## 3. Defects found and fixed while building

| Defect | Evidence | Fix |
|---|---|---|
| **The application stopped after five idle minutes.** `scripts/app-run.ts` held its advisory-lock connection idle; `infrastructure/loopback.mjs` destroys any relayed connection idle for 300s, so the supervisor lost the lock and took web, worker and agent down. Reproduced twice during this session | `handoffs/codex/artifacts/A00-application-lifecycle-1789706995355-*.json` | 30s heartbeat on the ownership connection; a genuinely lost connection now stops with a real reason instead of an unhandled event |
| **A silent stop gave no operator guidance.** Any child exit reported the same sentence | same | The exiting child is classified (`WEB_/WORKER_/AGENT_PROCESS_EXITED`) and `OPERATOR_GUIDANCE` in `packages/testing/src/evidence.ts` carries curated static text — including that an expired machine enrollment is the usual agent cause |
| **The recovery regression scenario errored intermittently.** `scripts/regression-runner.ts` built the recovery command with two separate `Date.now()` calls, so the lifetime was `300000ms + elapsed`, which the canonical schema rejects as "at most five minutes". It only passed when both calls landed in the same millisecond | `handoffs/codex/artifacts/A07-regression-run-1789716447448-*.json` — 10 assertions PASS then `ZodError: Command lifetime must be positive and at most five minutes` | One clock reading for the whole command |
| **Sign out was unclickable.** The new header chip clipped its value with an ellipsis and intercepted the pointer | Playwright: `<span class="v">…</span> intercepts pointer events` | The control moved outside the clipping chip |

## 4. Validation executed

| Check | Result |
|---|---|
| `contracts:check` | PASS — 8 artifacts, canonical seed, 41 route and 7 error examples, contract 0.5.0 |
| `typecheck` | PASS |
| `lint` | PASS over `packages apps tests scripts` excluding the untracked in-progress `scripts/start-orvia.ts`, which is not this lane's file and currently fails `no-useless-assignment` |
| unit | PASS 20/20 |
| production build | PASS — 19 routes |
| `tracking:check` | PASS — 23 tasks, 34 acceptance definitions, 33 capability modules |
| `hygiene:check` | PASS — 2546 files, 0 findings |
| `test:auth` · `test:consent` · `test:expiry` · `test:enforcement` · `test:evidence` · `test:workflows` · `test:regression` · `test:lifecycle` · `test:tls` · `services:smoke` · `dependencies:check` | **All PASS, exit 0** |
| `test:isolation` | NOT_RUN — bound to the `codex-a00` profile, whose services were not up in this session |
| `test:network` | FAIL — the runtime container image predates this source. It needs `runtime:build` before re-running; NOT re-run in this session |
| Playwright browser suite | 12 of 17 PASS on the first full run; 3 of the 5 failures fixed and re-verified, **2 remain** (below) |

## 5. Retained failures — not hidden, not relabelled

**Two browser specs still fail, reproducibly, for one shared cause.**

`GET /api/v1/session` intermittently answers **503 SERVICE_UNAVAILABLE** immediately after navigating away
from the rebuilt Overview. The server log records `{"operation":"SESSION_READ","name":"Error","code":"UNCLASSIFIED"}`.
With no session, `DomainGuard` correctly renders its failure state, so:

- `auth.spec` — "Wrong actor domain for this area" never appears on `/privacy`
- `candidate.spec` — "Programme modules" never appears on `/workspace/capabilities`

Both are *correct* UI behaviour in response to a failed server read; the defect is the failed read. The
working hypothesis is contention on the deliberately small runtime pool (`max: 2`,
`connectionTimeoutMillis: 5000` in `packages/db/src/index.ts`) against the rebuilt Overview's reads. Two
mitigations were applied and **did not** close it: the configuration directory now reads its collections
sequentially, the Attention index uses two readers instead of six, and `api.ts` serialises this tab's
requests through a single gate. Because those did not fix it, the pool hypothesis is not proven and the
cause is still open.

**This must be closed before the rehearsals.** The next steps are to instrument `safeRoute` so the
`SESSION_READ` failure carries a classified code instead of `UNCLASSIFIED`, and to confirm whether the throw
comes from `authorityFor` or from `scopedTransaction`.

## 6. Candidate identity

**No new candidate was frozen.** The source tree has changed, so candidate `c5655eac…` is void for this
work and must not be described as covering it. Freezing a new candidate requires `runtime:build`, a passing
`test:network`, a clean full browser run and `candidate:package` — three of which are outstanding above.

## 7. Remaining demo limitations

1. The 503 session read above.
2. 323 historical fixture purposes still dominate the Privacy Centre and control map. A reset plus one
   `demo:fixture` run would leave a clean, legible demonstration; a reset needs human authorisation.
3. Observation freshness is five minutes, so a demonstration recorded earlier reads *Observation expired*
   rather than *Independently observed*. That is correct product behaviour — run `demo:fixture` or the live
   cycle immediately before presenting.
4. Machine enrollments expire one hour after issue and stop the agent, and therefore the application.
   Re-run `machine:init confirm:rehearsal` before a long session.
5. The Test Lab still has no run-history list; runs are read by exact ID, and the screen says so.
