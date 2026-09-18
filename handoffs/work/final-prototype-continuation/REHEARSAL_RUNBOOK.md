# Rehearsal 1 and Rehearsal 2 — human-run or human-supervised procedure

These are the two remaining mandatory gates that this lane cannot execute alone. They are also the
designed producer of the `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records that `scripts/tracking.ts`
requires before any canonical test may be promoted to PASS.

**A prerecorded clip is not a qualifying rehearsal. Two rerenderings of one report, or replaying one
recording, are not two rehearsals.**

## Fixed identity — must match exactly in every record

| Field | Value |
|---|---|
| `code_under_test_commit` | `d1e5bc56ecac7255e8e37fbb355b70e635c27e76` |
| source inventory SHA-256 (sourceState, not a Git tree ID) | `fd63ae1c374c5c160374c3c976c470c89c59d77cdd0e322ad8040a835ee26778` |
| qualified source inventory | 223 tracked files |
| `build_id` | `ePN-omDrKiUUVSVwJq0B8` |
| `contract_version` | `0.5.0` (signed command `0.3.0`) |
| `profile` | `rehearsal` |
| `fixture_id` | `aster-birch-v1` |
| origin | `https://127.0.0.1:4330` |
| manifest SHA-256 | `9dc1b68a7f89408503bb0f2cf54a6cc773b33fe6d0e5a8665f871435ecc9d95e` |

The historical candidates `766854399d…`, `81431d64…` and `c383b9d9…` are superseded and must not be
described as covering this work.

If any file in the **qualified source inventory** changes, this candidate is void: a new candidate must be
frozen and **both** rehearsals repeated. That inventory is every tracked path outside `handoffs/`,
`artifacts/` and `docs/`, minus the live state documents `CURRENT_STATE.md`, `README.md`,
`README_START_HERE.md`, `AGENTS.md`, `tracking/tasks.json` and `tracking/acceptance.json`. Those six are
deliberately outside the candidate identity — they record where the programme has got to and change
whenever a gate moves, so editing them does **not** void this candidate. Their hashes at packaging time
are recorded in the manifest under `gate_state`. The single definition lives in
`scripts/source-paths.mjs`.

## Before you start

Run these in order. Every step is expected to succeed as written; if one does not, stop and record it
rather than working around it.

```powershell
$env:ORVIA_PROFILE = 'rehearsal'

# 1. Bring the profile services up and confirm all three are healthy.
.\scripts\dev.ps1 services up
.\scripts\dev.ps1 preflight

# 2. Confirm the candidate is still intact.
#    Writes a new timestamped report each run and never overwrites an earlier one,
#    so this is safe to repeat before R1 and again before R2.
python handoffs/work/final-prototype-continuation/verify-candidate.py

# 3. Confirm the reviewed CA is trusted for normal Chromium HTTPS.
certutil -user -store Root 8C592FC41BBD6AA18F42234085F6B8155466A190

# 4. Renew the protected machine enrollments.
#    These expire one hour after they are issued. Renewal is idempotent: it keeps
#    the same machine identities, preserves existing target restrictions and does
#    not reset any business state. Skipping this is the single most common cause
#    of a failed rehearsal start.
.\scripts\dev.ps1 machine:init confirm:rehearsal

# 5. Confirm nothing is queued or half-run, and no worker/agent is active.
node --import tsx handoffs/work/final-prototype-continuation/inspect-state.ts
```

Step 5 must report `pending_or_running_runs: 0` and no `orvia_worker` / `orvia_agent_control` entry in
`database_activity`. If a run is pending, execute it through the existing operator — never delete it and
never mark it passed by hand.

If the application later fails to start and the console reports
`code: MACHINE_ENROLLMENT_EXPIRED` with
`Machine enrollment expired; renew through protected local setup`, the rehearsal has simply run past the
one-hour enrollment window. Re-run step 4 and start again. Nothing needs to be reset.

If `.local/profiles/rehearsal/supervisor/run.json` exists but no `node` process is serving port 4330, a
previous supervisor was killed abruptly. Confirm there is no live process and no listener on 4330, then
delete that journal file before starting. Never delete it while a process is still running.

Use **two independent browser profiles**: one for staff (`/workspace/*`), one for the principal
(`/privacy/*`). Another window in the same profile shares cookies and invalidates the separation the
scenario is demonstrating.

### Credentials

Synthetic staff and principal credentials live only in the protected local fixture journal at
`.local/profiles/rehearsal/auth/bootstrap.json`. Open that file on the rehearsal machine when you need
them. They are deliberately absent from this runbook, from the repository and from every evidence
artifact, and they must not be pasted into a chat, a screenshot, a recording or a report.

Staff accounts require an authenticator. The first privileged sign-in walks through enrollment in the UI
and shows the `otpauth://` URI once; keep it in your authenticator for the rest of the rehearsal.

## Capture the start state first

Write `REHEARSAL_START_STATE` before the run begins. `captured_at` must not be later than the run start,
and its identity must equal the run's exactly.

```json
{
  "kind": "REHEARSAL_START_STATE",
  "rehearsal_id": "R1",
  "code_under_test_commit": "c383b9d9a1b5c26ade00d987c714ec889e27934b",
  "build_id": "pKS-S9WY5IsMrwB9DecCI",
  "contract_version": "0.5.0",
  "profile": "rehearsal",
  "fixture_id": "aster-birch-v1",
  "scenario_scope": "<the same string used in the run record>",
  "captured_at": "<UTC, at or before run start>",
  "documented_start": "<what the environment actually contained: services up, no pending runs, existing retained consent history>"
}
```

## Running the application

```powershell
.\scripts\dev.ps1 app:run confirm:rehearsal     # web + worker + agent, foreground
```

Steps 11 and 12 need the Test Lab operator, which **refuses to start while the worker or agent is
active**. For those steps only:

```powershell
.\scripts\dev.ps1 app:stop confirm:rehearsal
.\scripts\dev.ps1 regression:run confirm:rehearsal
.\scripts\dev.ps1 app:run confirm:rehearsal
```

`regression:run` exits **0** for any completed execution, including the broken control whose stored result
is FAIL. Read the outcome from the Test Lab run record, not from the exit code.

**Write the run ID down.** The Test Lab is read by exact run ID; this build has no run-history list, which
is an accepted prototype limitation. The screen tells you the same thing. After a refresh, a run you did
not record cannot be found again through the interface.

If a rehearsal step spans more than an hour, re-run step 4 of *Before you start* before restarting the
application.

## The twelve canonical steps

Record, for each step: UTC time, what you did, what actually appeared, and the artifact. Record what
happened, not what was supposed to happen.

| # | Step | Screens | What must actually be observed |
|---|---|---|---|
| 1 | Two separate organisations and people | `W-OVERVIEW` (Aster), `W-PRINCIPALS` | Staff sign-in with real MFA; Aster scope only; Birch data not reachable |
| 2 | Separate purposes, systems, notice and a reviewed policy | `W-PURPOSES`, `W-NOTICES`, `W-SYSTEMS`, `W-POLICIES` (`/workspace/configuration`) | A **distinct reviewer** re-authenticates to publish; the publication persists |
| 3 | Asha grants marketing consent | `P-CHOICES`, `P-GRANT`, `P-RECEIPT` | Affirmative action against the exact notice version; an immutable receipt is issued |
| 4 | A marketing message is queued, then Asha withdraws | `P-CHOICES`, `P-RECEIPT` | Withdrawal does **not** require accepting a new notice; the epoch advances by one |
| 5 | The CRM restriction changes and ORVIA reads it back separately | `W-WORKFLOW-DETAIL` | The observation method is a separate `SCOPED_READ`, not the execution receipt |
| 6 | The queued message is stopped; order service judged separately | `W-TESTLAB` assertions, `W-EVIDENCE` | No send record exists after withdrawal; the service purpose is decided independently |
| 7 | Response lost: outcome unknown, then reconciliation | `W-WORKFLOW-DETAIL` reconcile dialog | The attempt stays **unknown**; reconciliation reads, it does not replay the mutation |
| 8 | A system with no API becomes a manual obligation | `W-ATTENTION`, `W-WORKFLOW-DETAIL` attest dialog | Closure is **attributed to a person** and is visibly distinct from an automated observation |
| 9 | An old grant replay cannot re-enable marketing | `P-CHOICES`, `W-WORKFLOW-DETAIL` timeline | The stale replay is refused; marketing stays restricted |
| 10 | Export local evidence, including gaps | `W-EVIDENCE` | The export is an attachment with `no-store`, carries the integrity digest and **retains unresolved coverage** |
| 11 | The regression test catches a real break | `W-TESTLAB` | Healthy → PASS; broken control → **FAIL** shown as expected detection; repaired healthy → PASS |
| 12 | Recovery: worker restart and quarantined target-only restore | `W-WORKFLOW-DETAIL`, `W-SYSTEMS`, operator transcript | Quarantine first; premature activation denied; stale generation denied; the consent ledger is unchanged |

At step 11 the broken control **must be left as a FAIL**. A detection that is relabelled as a pass
invalidates the rehearsal.

## Rehearsal 2

Same candidate, same twelve steps, run **independently** from the documented start state, with its own
`rehearsal_id`, its own start-state capture, its own log and its own artifacts. R2 must include the
recovery and quarantine path in full. Preserve R1's evidence and any R1 issue; a later unsuccessful
attempt prevents an older pair qualifying.

## After both rehearsals

1. Index each run in `docs/demo/EVIDENCE_INDEX.json` under `rehearsals`, using every field in
   `rehearsal_schema.required`, with hashed artifacts and the start-state reference.
2. Work promotes canonical T statuses only where a genuine `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO`
   record exists, then completes C02 and W03.
3. Remove the temporary CA trust and re-verify its absence:

```powershell
certutil -user -delstore Root 8C592FC41BBD6AA18F42234085F6B8155466A190
certutil -user -store Root 8C592FC41BBD6AA18F42234085F6B8155466A190
```

The second command must report `NTE_NOT_FOUND`. Record the result next to
`handoffs/work/final-prototype-continuation/certificate-trust.json`.

## Do not

Do not bypass TLS validation, use `--ignore-certificate-errors` or `ignoreHTTPSErrors`, fall back to
plaintext, reset business data, edit a stored run result, delete a failed attempt, turn the broken control
into a pass, or present a recording as a live rehearsal.
