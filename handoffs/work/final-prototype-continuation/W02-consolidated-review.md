# W02 — consolidated integration, failure, security and recovery review

**Reviewer:** Work integration/review lane (this session). **Date:** 2026-09-17.
**Candidate source:** `81431d64afb8dd613c96d942402d8c0d8cc07ac0`, source inventory SHA-256
`e949d8c43c0dfffcea2e332eb7baa7eb2a052f0524709e6d533dcd566304e437`.
**Contract:** transport 0.5.0, signed command 0.3.0. **Profile:** `rehearsal`, fixture `aster-birch-v1`.

This reviewer also performed the authorized bounded harness corrections in this session. Work-lane
acceptance of executed evidence only; not an independent security assessment, not human sign-off.

## Decision

**W02 — ACCEPTED at this candidate source**, with the explicitly retained limitations below and with T26
runtime-egress qualification tracked separately (see status at the end of this document).

FINAL-B06-F02 (manual-attestation contract/consumer gap) is **CLOSED** on executed backend and browser
evidence. FINAL-B06-F05 (browser fixture ownership-connection timeout) is **CLOSED**. FINAL-CONT-F06 and
FINAL-CONT-F07 (Test Lab harness) are **CLOSED**.

## Boundary-by-boundary conclusions with executed evidence

| Boundary | Source conclusion (carried forward) | Executed evidence at this candidate | Result |
|---|---|---|---|
| Durable workflow and signed command | `packages/domain/src/workflow.ts` persists one plan and obligation set and signs a one-record, one-attempt command; existing plans prevent duplicate planning | `tsx tests/integration/workflows/workflow.test.ts` | **PASS**, exit 0 — `B06-exec-2026-09-17T11-55-06.951Z`, artifact `A07-workflow-integration-1789646136254-11016705-c854-42a4-8acb-b58c356f1873.json` |
| Target effect and command denial | `apps/agent/src/execute.ts` verifies signature, installation, scope, enrolled operation/capability, budgets; locks current consent and the exact target; rechecks approval, epoch, generation and expiry immediately before mutation | same run: `command replay does not mutate target again`, `agent rejects tampered scope before effect`, `same command ID with changed signed body rejected`, `expired new command rejected`, `generation mismatch produces known failed execution`, `nonce replay with another command ID rolls back`, `all rejected commands preserve last target mutation` | **PASS** |
| Stale/replayed authority | stale withdrawal must not act after fresh consent; fresh grant must not silently reactivate | same run: `stale withdrawal cannot act after fresh consent`, `fresh grant does not silently reactivate target`, `old evidence is not current completion after epoch changes`, `portal receipt does not turn stale completion green`, `human session cannot poll machine commands` | **PASS** |
| Current admission | `packages/domain/src/processing.ts` checks enrolled sender/system, current consent and publication under locks, mapping generation, quarantine, unresolved suppression and the separate service condition | `tsx tests/integration/enforcement/send.test.ts` | **PASS**, exit 0 — `B06-exec-2026-09-17T11-57-02.765Z`, artifact `A07-send-enforcement-1789646240320-8a3a2988-2905-4e96-9af7-dcebdfdc3c09.json` |
| Policy failure safety | `packages/policy-sdk/src/index.ts` returns INDETERMINATE for timeout, transport failure, missing result and malformed strict result; no permissive fallback | same run: `missing OPA result is indeterminate` + `missing OPA creates no send`; `malformed OPA result is indeterminate` + `creates no send`; `OPA outage is indeterminate` + `creates no send`; `OPA recovered`; `recovered policy still blocks withdrawal` | **PASS** — degraded policy fails closed |
| Observation, completion and manual action | `workflow.ts` reads the exact synthetic resource separately and records denied/unavailable reads as UNVERIFIABLE; `completion.ts` requires current scope and a fresh SCOPED_READ with matching desired/observed state, or a separately declared attributed-manual criterion | `tsx tests/integration/evidence/evidence.test.ts` | **PASS**, exit 0 — `B06-exec-2026-09-17T11-45-47.355Z`, artifact `A07-evidence-integration-1789645594362-18028a06-424b-43bf-8363-b2358bb7f8f4.json` |
| Reconciliation and capability loss | `packages/domain/src/evidence.ts` persists a read request, never replays a target mutation, retains the original attempt, and completes only from current read evidence | same run: `reconciliation never invents recovered ACK`, `capability loss becomes effective read=false`, `failed capability check immediately invalidates prior completion`, `new failed read supersedes prior satisfied read`, `permission loss removes current completion`, `REST read permission loss also fails closed at admission`, `unverifiable REST admission has no send` | **PASS** |
| Export and counts | evidence composed from scoped persisted workflow/event/test records; reads/exports audited; unresolved limits retained; bounded digest claim | same run: `export integrity digest matches actual document`, `export is attachment with no-store`, `export retains unresolved coverage`, `export retains exact immutable acceptance`, `foreign tenant cannot export`, `principal cannot export`, `member has no export capability`, `export action persisted in audit`, `overview workflow counts come from scoped persisted rows` | **PASS** |
| Target restore and quarantine | `packages/testing/src/target-recovery.ts` is operator-only, requires the current run-owned snapshot and installation/profile identity, commits quarantine first, activates only after exact current withdrawal epoch/generation/restriction checks | `tsx tests/integration/regression/regression.test.ts` — TARGET_RESTORE_QUARANTINE run `59335f6a-24d9-4668-bb7b-00db1359c0e5` reached PASS with `old_target_snapshot_quarantined`, `premature_activation_denied`, `old_generation_command_denied`, `reconciled_target_activated`, `restriction_survives_activation`, `authoritative_consent_ledger_unchanged`, `recovery_journal_recorded` | **PASS**, exit 0, 70/70 assertions (T23/T24/T25) — `B06-exec-2026-09-17T11-58-46.926Z`, artifact `A07-regression-integration-1789646604777-caac7f33-7580-4dc2-ac9c-171ab199070e.json` |
| Broken regression detection | expected fault detection must not be reported as an ordinary pass | same run: run `7f48cebe-02ba-47aa-bdf5-15b2f7842e2e` (MARKETING_WITHDRAWAL_BROKEN_CONTROL) stored **FAIL** with `expected_fault_detection: true`; `broken fixture actual synthetic send count` = 1; `violation assertion derives from actual effect`; `expected fault flag does not turn FAIL into PASS`; `terminal outcome cannot be rewritten` | **PASS** — the FAIL is preserved as a FAIL |
| Transport and lifecycle | trusted chain, wrong-host/untrusted rejection, secure cookies, no HTTP fallback; supervised restart preserves business state and refuses a business-schema reset | `tsx tests/security/tls.test.ts` **PASS** (`B06-exec-2026-09-17T12-06-43.711Z`); `tsx tests/integration/lifecycle.test.ts` **PASS**, two full cycles (`B06-exec-2026-09-17T12-05-05.401Z`, artifact `A07-lifecycle-integration-1789646736637-d431e762-e660-4703-a388-8acde76651ef.json`) | **PASS** |
| Runtime egress (T26) | backend isolated on an internal Docker network with deny-all DNS and a separate controlled canary | see **T26 status** below | tracked separately |

## FINAL-B06-F02 — manual-attestation contract gap: closure evidence

Required behaviour from the brief was: read obligation/manual task → response exposes the authoritative
current task version → UI uses that exact version → mutation checks the expected version → stale concurrent
version rejected → current version accepted → stable replay retained.

Executed in `tests/integration/evidence/evidence.test.ts` at this candidate (all PASS):

- `manual task read exposes authoritative stored version`
- `concurrent current-version attestations accept exactly one`
- `manual identical replay accepted` and `manual identical replay preserves original operation`
- `manual conflicting replay denied`
- `manual stale version denied on a new request`
- `manual task revision increments once`
- `manual attestation attributed`
- `manual attestation creates no automated observation`
- `manual cannot satisfy independent-read criterion`
- `old manual attestation is not current after fresh consent`
- `declared manual criterion completes administratively`
- `foreign evidence reference denied`
- assignment/scope: `unassigned member cannot see workflow`, `member sees only exact assigned workflow`,
  `member still cannot see other workflow`, `member list equals exact persisted assignments`

Executed in the browser at this candidate: `B03 manual task uses its read version, preserves replay and
rejects a stale tab` — **PASS**, together with `B03 applied response lost, read reconciliation and visible
manual obligation` and `B03 acknowledgement without effect remains unresolved and never verified`.

Contract discipline: the change went through the canonical generator (transport 0.5.0, signed command
unchanged at 0.3.0); `contracts:check` reports 8 artifacts, canonical seed, 41 route examples and 7 error
examples validated. No second hand-written DTO and no storage migration.

## FINAL-B06-F05 and the Test Lab harness findings: closure evidence

- **FINAL-B06-F05** (browser fixture lost its idle PostgreSQL ownership connection after the relay's
  300000 ms limit): the heartbeat correction is verified by a **complete 16-test browser run lasting
  9 minutes 59 seconds** (2026-09-17T12:16:04.891Z → 12:26:03.781Z), i.e. well beyond the five-minute idle
  limit, with no lease loss.
- **FINAL-CONT-F06** (operator exit contract) and **FINAL-CONT-F07** (`app.purposes` / barrier lifetime):
  both Test Lab cases now pass. The exit contract decision is backed by runtime behaviour — the regression
  integration suite invokes the runner through `execFile` for the broken control and that call resolves
  (exit 0) while the stored business result is FAIL. Full rationale and the three dependent consumers are
  recorded in `bounded-corrections.md`.

## Complete browser qualification

`node tests/e2e/record.mjs B06 exec playwright test --config tests/e2e/playwright.config.ts` —
**16/16 PASS, exit 0**, all seven mandatory suites (`auth`, `configuration`, `consent`, `workflow`,
`test-lab`, `candidate`, `tls`), Chromium over normal trusted HTTPS with no certificate bypass. Each test
also writes a per-context network record; the fixture asserts no request leaves the application origin.

## Retained limitations

- Synthetic targets only; one effect attempt followed by read reconciliation.
- Target-only recovery. No full control-plane disaster recovery is claimed or demonstrated.
- No production signing; development SHA-256 checksums only.
- No whole-host egress assurance: network qualification observes the backend core on a private Docker
  network; Playwright network records are scoped to their own browser context.
- No enterprise security certification, penetration test, legal approval or production readiness.
- Engineering and Work-lane acceptance only. Human rehearsals and final sign-off remain open.

## T26 status

Runtime egress qualification requires the rebuilt `orvia-local:prototype` image, which now carries label
`orvia.source-tree = e949d8c43c0dfffcea2e332eb7baa7eb2a052f0524709e6d533dcd566304e437` matching this
candidate. Execution status is recorded in `EXECUTION_LOG.md` in this directory.
