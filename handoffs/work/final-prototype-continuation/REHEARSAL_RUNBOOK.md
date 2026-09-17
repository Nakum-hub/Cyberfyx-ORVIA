# Rehearsal 1 and Rehearsal 2 — human-run or human-supervised procedure

These are the two remaining mandatory gates that this lane cannot execute alone. They are also the
designed producer of the `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records that `scripts/tracking.ts`
requires before any canonical test may be promoted to PASS.

**A prerecorded clip is not a qualifying rehearsal. Two rerenderings of one report, or replaying one
recording, are not two rehearsals.**

## Fixed identity — must match exactly in every record

| Field | Value |
|---|---|
| `code_under_test_commit` | `81431d64afb8dd613c96d942402d8c0d8cc07ac0` |
| source inventory SHA-256 (sourceState, not a Git tree ID) | `e949d8c43c0dfffcea2e332eb7baa7eb2a052f0524709e6d533dcd566304e437` |
| `build_id` | `mtRrfhGjl22jabwoImHIf` |
| `contract_version` | `0.5.0` (signed command `0.3.0`) |
| `profile` | `rehearsal` |
| `fixture_id` | `aster-birch-v1` |
| origin | `https://127.0.0.1:4330` |
| manifest SHA-256 | `95f5acbe94eecc1ef8296779b6ce3c1116c067753fd2e5bd199d6e340d24e026` |

If any source file under `apps`, `packages`, `scripts`, `tests`, `infrastructure`, `policy`,
`pnpm-lock.yaml` or `package.json` changes, this candidate is void: a new candidate must be frozen and
**both** rehearsals repeated.

## Before you start

```powershell
$env:ORVIA_PROFILE = 'rehearsal'

# 1. Confirm the candidate is still intact (expects 242 checks, 0 failures).
python handoffs/work/final-prototype-continuation/verify-candidate.py

# 2. Confirm the reviewed CA is trusted for normal Chromium HTTPS.
certutil -user -store Root 8C592FC41BBD6AA18F42234085F6B8155466A190

# 3. Confirm nothing is queued or half-run, and no worker/agent is active.
node --import tsx handoffs/work/final-prototype-continuation/inspect-state.ts
```

Step 3 must report `pending_or_running_runs: 0` and no `orvia_worker` / `orvia_agent_control` entry in
`database_activity`. If a run is pending, execute it through the existing operator — never delete it and
never mark it passed by hand.

Use **two independent browser profiles**: one for staff (`/workspace/*`), one for the principal
(`/privacy/*`). Another window in the same profile shares cookies and invalidates the separation the
scenario is demonstrating.

## Capture the start state first

Write `REHEARSAL_START_STATE` before the run begins. `captured_at` must not be later than the run start,
and its identity must equal the run's exactly.

```json
{
  "kind": "REHEARSAL_START_STATE",
  "rehearsal_id": "R1",
  "code_under_test_commit": "81431d64afb8dd613c96d942402d8c0d8cc07ac0",
  "build_id": "mtRrfhGjl22jabwoImHIf",
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
