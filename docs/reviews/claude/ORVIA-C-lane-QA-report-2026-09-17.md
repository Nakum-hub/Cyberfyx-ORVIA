# ORVIA final-prototype QA lane — execution report

**Date:** 2026-09-17 · **Lane:** integration / QA / UX / acceptance readiness
**Repository:** `Nakum-hub/Cyberfyx-ORVIA` · **Working tree inspected:** `C:\Cyberfyx-projects\Cyberfyx_ORVIA`
**Inspected HEAD:** `e26bde8` on `prototype/work/final-prototype-continuation`

---

## 0. Headline

**The assignment cannot be executed as written from this session, and it is not a scoping problem — it is a
machine-reachability problem.** [Certain] Phases 1, 3, 5, 19 (static half), 20 (schema half), 23 and 28 were
executed and are reported below with evidence. Phases 2, 4, 6–18, 21, 22, 24, 26 and 27 were **not** executed,
because nothing in this session can start your stack. No result below is inferred from a run I did not perform.

Second headline, before the detail: **your own record already says the only things standing between this
prototype and W03 are three human acts** — C00 acceptance, Rehearsal 1, Rehearsal 2. A re-execution of the
browser suites by me would not have changed that. What I could usefully do instead — audit whether the frozen
candidate's evidence chain actually holds together — I did, and it mostly does. Three defects came out of it.

---

## 1. Why execution stopped, precisely

| Path | Status | Reason |
|---|---|---|
| Cloud container shell | Has Docker, pnpm, psql — **useless** | Separate machine. Your repo, your `.local` profile store, your rehearsal CA and your Docker volumes are all on Windows. |
| `device_bash` (shell on your machine) | Reaches your files — **cannot run the stack** | Runs in an isolated Linux VM with your folder mounted. `docker`, `docker-compose`, `pnpm` and `psql` are all absent; `node` is v22.23.2 against a pinned `24.21.0`. Services start via `docker compose -f infrastructure/compose.yaml`. |
| Computer use (terminal) | **Refused by policy** | Terminals grant in *click-only* mode — visible and clickable, never typeable. `.\scripts\dev.ps1 app:run confirm:rehearsal` cannot be issued. |
| Claude in Chrome | **Extension not connected** | Would have been the right tool: your real Chrome already trusts rehearsal CA `8C592FC4…`, so `https://127.0.0.1:4330` would load without bypass. |
| Built-in browser pane | Available, **nothing to browse** | `.local/profiles/rehearsal/supervisor/` is empty — no `run.json` journal, so the application supervisor is not running. The stack is down. |

**To unblock the browser-driven phases, exactly two things are needed:**

1. In the repo root on Windows: `.\scripts\dev.ps1 app:run confirm:rehearsal` (leave it foreground).
2. Chrome running with the Claude extension signed in to the same account.

With both, Phases 3, 4, 6–18, 24 and the R1/R2 observation work become executable against the real backend.
Without a typeable shell on that machine, Phases 2, 21, 22 and 27 stay with you regardless.

---

## 2. A challenge to the brief itself

**"Start from the latest human-integrated `main`" is the wrong instruction for this candidate.** [Certain]
`main` is `b909be8`. Your frozen candidate is four commits ahead of it on
`prototype/work/final-prototype-continuation`. Qualifying `main` would test a build that does **not** contain
`81431d6` — the Test Lab operator-exit contract and interruption-barrier correction. The manifest, the
runtime image label and the passing browser run all name continuation-branch commits, not `main`.
I tested the continuation HEAD. If you genuinely meant `main`, the entire evidence chain below does not apply
to it and would have to be rebuilt.

---

## 3. Phase 1 — source integrity: **PASS**

Executed, not asserted:

- **224 / 224** files in `artifacts/release-manifest.json`'s `source_files` inventory match the working tree
  byte-for-byte by SHA-256. 0 mismatches, 0 missing.
- **0** tracked files under `apps/`, `packages/`, `policy/`, `scripts/` are outside that inventory. There is no
  unqualified runtime source shipping in this candidate.
- `e26bde8` (HEAD) changed **only** `artifacts/release-manifest.json` and evidence artifacts under
  `handoffs/`. No inventory file changed between the manifest's declared `source_commit` `c383b9d9` and HEAD,
  so the candidate identity and the tree I inspected are equivalent on qualified source.
- The qualifying browser run's `source_tree_sha256` is `66381551e28c17…`, **identical** to the manifest's
  `source_tree_sha256`. The evidence and the candidate are the same tree. [Certain]
- Commit ordering is clean: `c383b9d` at `14:53:44Z` → qualifying run starts `14:54:52Z` → hygiene check
  `15:16:53Z` → `e26bde8` at `15:17:42Z`.
- Working tree is clean; `origin` correct; one stash and one prunable worktree outstanding (see F04).

**Browser evidence at the candidate:** 16 tests, 16 `passed`, 0 failed, 759,854 ms of test time across seven
spec files (`auth`, `candidate`, `configuration`, `consent`, `test-lab`, `tls`, `workflow`). Real, at the right
tree, not carried forward from an older candidate.

---

## 4. Defects

### CONT-QA-F01 — the frozen state document cites a run that did not yet exist · **MEDIUM**

- **Artifact:** `CURRENT_STATE.md` (inside the qualified 224-file inventory)
- **Claim:** *"Browser: 16/16 PASS, exit 0 over a 9 min 59 s run at the exact candidate commit and tree."*
- **Actual:** `CURRENT_STATE.md` was last modified in `c383b9d`, committed `2026-09-17T14:53:44Z`. The only
  16/16 run at the candidate tree `66381551…` **started at `14:54:52Z`** — 68 seconds later. At the moment the
  sentence was written, the only existing 16/16 was at `81431d6`, tree `e949d8c4…` — which
  `EXECUTION_LOG.md` explicitly disavows: *"The 16/16 result at `81431d6` is **not** carried forward."*
- **Why it matters:** `e26bde8` re-qualified after the service collapse and updated `EXECUTION_LOG.md` and the
  manifest, but left `CURRENT_STATE.md` untouched. The document frozen *as part of the candidate* therefore
  carries a claim that was unsupported when written, never mentions FINAL-CONT-F11, the Docker daemon
  collapse, or the re-qualification, and is stale against the very commit that froze it. It is true today only
  by the accident of a later run.
- **Root cause, and the real finding:** `scripts/source-state.ts` puts `CURRENT_STATE.md` *inside* the
  qualified inventory. A document inside the inventory can never truthfully describe its own qualifying run —
  correcting it changes the inventory hash, which changes the candidate, which invalidates the run it now
  cites. You de-circularised the *candidate identity row*; the *evidence row* has the identical problem and
  was not de-circularised.
- **Minimum fix:** move the executed-evidence row out of `CURRENT_STATE.md` into an inventory-excluded
  evidence document (the manifest and `EXECUTION_LOG.md` already carry it), and have `CURRENT_STATE.md` point
  at it by path rather than restate the numbers.
- **Required regression:** `verify-candidate.py`, manifest regeneration, and — because the inventory changes —
  one full browser re-qualification.

### CONT-QA-F02 — two authorities disagree on the gate state · **MEDIUM**

- `artifacts/release-manifest.json` says `task_id: "B06"`, `candidate_kind:
  "LOCAL_SYNTHETIC_UI_ENGINEERING_CANDIDATE_PENDING_REVIEW"`, `gates.work_review: "PENDING"`.
- `CURRENT_STATE.md` says W01 **ACCEPTED** and W02 review content **ACCEPTED**.
- The manifest is named as "the single authority for candidate identity", and a reader checking gate state
  there gets a stale answer. Either regenerate the gate block after Work acceptance, or state in
  `CURRENT_STATE.md` that manifest gates are frozen at generation time and are not the live gate record.
- **Minimum fix:** one sentence in whichever document you decide is authoritative for gates. No code change.

### CONT-QA-F03 — UI copy is outside the frozen candidate · **LOW**

- `docs/ux/UI_COPY.json` and `docs/demo/EVIDENCE_INDEX.json` are **not** in the 224-file inventory.
- C00 acceptance and Phase 25 both compare live screens against UI copy. As it stands, the copy a human
  accepts at C00 can change without changing the candidate identity, and a later reader cannot tell which copy
  revision was accepted.
- **Minimum fix:** add `docs/ux/UI_COPY.json` to the `source-state.ts` inventory, or record in the C00
  acceptance the file's SHA-256 at the time of the decision.

### CONT-QA-F04 — stale git state · **LOW**

- Worktree `C:/Cyberfyx-projects/orvia-ui-b00` at `397cb37` `[prototype/code/B00-B04]` is **prunable**.
- `stash@{0}` from `prototype/codex/A02-A07-core` ("Preserve A04 work while correcting W01-A02-F01") is
  unadjudicated.
- Neither affects the candidate, but Phase 1 requires them inspected and both are exactly the kind of stale
  checkout that can end up serving old code during a rehearsal.
- **Minimum fix:** `git worktree prune`; keep or drop the stash on the record.

**No BLOCKER and no HIGH defect was found in anything I was able to execute.**

---

## 5. What passed, with evidence

**Phase 3 — route inventory (file level only; no navigation performed).** All 19 mandatory routes exist:
`/`, `/workspace`, `/workspace/sign-in`, `/configuration`, `/principals`, `/workflows`, `/workflows/[id]`,
`/failures`, `/evidence`, `/evidence/[id]`, `/test-lab`, `/test-lab/[id]`, `/control-map`, `/policy-preview`,
`/capabilities`, `/privacy`, `/privacy/sign-in`, `/privacy/receipts`, `/privacy/receipt/[id]`. Receipt links
are internally consistent across `privacy/page.tsx`, `receipts/page.tsx`, `receipt/[id]/page.tsx` and
`shell.tsx` — no broken detail-route spelling.

**Phase 5 — frontend/backend wiring.** 35 operations in the generated `EndpointMap`. **34 have a UI caller**;
the one that does not is `health`, correctly infrastructure-only via `/healthz`. Every operation resolves
server-side: 31 through the `/api/v1/[...segments]` dispatcher, `session` through its own route, `list_principals`
and `create_principals` through `/api/v1/admin/principals` (`GET` + `POST` both exported). **No UI call targets
an endpoint that does not exist, and no endpoint is orphaned.** The transport is a single generated client —
`apps/web/src/components/api.ts` imports `createClient` from `@orvia/contracts` with no hand-written URL and
no second DTO model.

**Phase 23 — placeholder / dead-code sweep.** Across `apps/`, `packages/`, `policy/`, `scripts/`: **one**
TODO-class match, and it is a doc comment in `ui.tsx` describing the dependency-pending component that
deliberately reports the real server state instead of a fabricated one. **Zero** `mock`/`fake` identifiers in
runtime code. `console.log` appears 3 times, all in tooling and test harnesses, never in `apps/web`. This is
a genuinely clean codebase for this stage.

**Phase 19 — static security surface (`apps/web/src`).** 0 uses of `localStorage`, `sessionStorage` or
`document.cookie`. 0 uses of `dangerouslySetInnerHTML`, `eval`, or `new Function`. 0 external origins
referenced anywhere in the web source — consistent with the T26 claim of 1,133 requests, 0 foreign-origin,
single origin `https://127.0.0.1:4330`.

**Phase 28 — reconciliation.** `tracking/acceptance.json` holds 34 scenarios, **all 34 `NOT_RUN`**. This is
correct and I am not promoting any of them: `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records only come from
the two human rehearsals, which have not happened.

---

## 6. Final report, in the requested shape

| Field | Result |
|---|---|
| **Prototype state** | Engineering complete and internally consistent; **acceptance incomplete**. |
| **Percentage complete** | Deliberately not given. Any number I produce here is a guess dressed as a measurement — 22 of 30 phases were unexecutable. |
| **Candidate** | `c383b9d9a1b5c26ade00d987c714ec889e27934b`, tree `66381551e28c17a2e9d479f4cb7dd9fc188d05adc35366c0cbd04c1ac033ff63`, branch `prototype/work/final-prototype-continuation`, inspected at HEAD `e26bde8`. Verified 224/224. |
| **UI test result** | **Not executed by this lane.** Pages checked: 19, statically. Controls checked: 0 — no control was clicked. Browser suites: none run by me; the candidate's own run is 16/16 PASS at the matching tree. Screenshots: none taken. |
| **Functional flows** | **NOT_TESTED** by this lane. |
| **Integration** | Wiring audit **PASS** — 34/35 operations UI-reachable, 35/35 server-resolvable, 0 orphans, single generated transport. |
| **Accessibility** | **NOT_TESTED** — requires a live DOM. |
| **Security** | Static surface **PASS** (no browser storage, no unsafe HTML, no external origins). Runtime security phases NOT_TESTED. |
| **Reliability / recovery** | **NOT_TESTED**. Note: the candidate's own history shows a real Docker daemon collapse and a documented restore (FINAL-CONT-F11) — the recovery path has been exercised at least once under duress. |
| **Remaining defects** | CONT-QA-F01 (MEDIUM), F02 (MEDIUM), F03 (LOW), F04 (LOW). No BLOCKER, no HIGH found. |
| **C00** | **NOT ACCEPTABLE — and not mine to decide.** C00 is a documented human decision. I did not see the running screens, so I cannot even offer the recommendation honestly. |
| **T01–T34** | All 34 **NOT_RUN**. Unchanged. Not promoted. |
| **Rehearsals** | R1 **NOT_RUN**, R2 **NOT_RUN**. |
| **W03** | **BLOCKED.** |
| **Final recommendation** | **NOT_READY** for internal demo sign-off. The blockers are C00 acceptance, R1 and R2 — all human acts — plus the four defects above, of which only F01 requires a decision about your freeze process rather than a text edit. |

---

## 7. What I would do next, in order

1. Decide F01: move the evidence row out of the qualified inventory. Everything else is downstream of that,
   because fixing it changes the candidate.
2. Fix F02 and F03 in the same pass (both are single-line documentation corrections).
3. `git worktree prune` and adjudicate the stash (F04).
4. Re-freeze and re-qualify once, cleanly, so that for the first time the state document, the manifest, the
   runtime image and the browser run all name one identity with no ordering paradox.
5. Start the stack and reconnect Chrome; I then execute Phases 3, 4, 6–18 and 24 for real and report actual
   control-level results before you commit to C00 and the rehearsals.
