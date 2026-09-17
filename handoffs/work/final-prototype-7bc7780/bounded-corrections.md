# B06 bounded implementation authorization and findings

Base: `7bc7780de51c095ccd808ef5d01e423106c65f30`. The user's final-completion brief explicitly authorizes the available coding capability to make the smallest verified fixes, and specifically requests coordinated manual-attestation producer/schema/UI/test correction. This session performs that bounded engineering work serially, then records Work review separately; it does not imply independent human acceptance.

Allowed paths for these corrections: `apps/web/src/components/ui.tsx`, `apps/web/src/components/operations.tsx`, `packages/contracts/src/{index,generate}.ts`, `packages/contracts/package.json`, generated artifacts under `packages/contracts/generated/`, generated `tracking/contract_seed.json`, `packages/domain/src/workflow.ts`, `tests/unit/{completion,contracts,ui-evidence}.test.ts`, `tests/integration/evidence/evidence.test.ts`, `tests/e2e/{fixture,auth,configuration,consent,workflow,candidate,test-lab}.spec.ts` as applicable (fixture is `fixture.ts`), and review/handoff records. Dependency/lockfile changes, migrations and unrelated redesign are excluded. Additional verified defects require a separately recorded scope.

## FINAL-B06-F01 — MEDIUM browser qualification/accessibility integration

Source: `apps/web/src/components/ui.tsx`, shared Field label. Real baseline browser execution `2026-09-17T10-06-22.276Z` repeatedly times out at the exact Password locator. Protected accessibility snapshot shows `Password *`. The required asterisk is exposed as label text despite native required semantics.

Correction: mark only the decorative required asterisk aria-hidden, preserving the visible indicator and input required attribute. Keep exact-name browser assertions. Retest auth, configuration, principal journeys and full affected browser suite. No authentication check is relaxed.

## FINAL-B06-F02 — MEDIUM manual-attestation contract/consumer gap

Source: canonical Obligation omits `manual_version` while ManualAttestation requires `expected_task_version`; `readWorkflow` drops the stored version; the UI explicitly disables submission. Existing integration test guesses 0. Reproduced by source/contract inspection; runtime corrected-path tests remain pending.

Coordinated change: transport 0.5.0 adds required `task_version` to every Obligation read, sourced from the database's authoritative `manual_version`. Existing schema version 0.4.1 clients use strict response objects, so this is an explicit coordinated minor-version change. Signed command version remains 0.3.0. No storage migration is required. Workflow/failure/evidence readers share the same producer and generated contract. The UI submits exactly the current read version and retains the original payload/key for uncertain retries. Assignment, scope, evidence binding, current consent and transactional version checks remain server authority.

Required tests: authoritative read version; successful current version; rejected stale/concurrent operation; exactly one attribution/version increment; stable identical replay; conflicting replay; scoped evidence denial; no automated observation from manual closure; real assigned-member browser submission and server rejection of a stale tab. Regenerate canonical artifacts, contracts:check, typecheck, lint, unit, evidence integration, build and affected browser suites. Keep all original failures. Source changes require a new candidate; old package is historical evidence only.

## FINAL-B06-F03 — LOW test locator ambiguity

Real auth rerun after F01 passes privileged login but rejects the global `getByRole('alert')` locator because both the actual sign-in rejection and Next's empty `__next-route-announcer__` match. Scope application alert assertions to `main`, retaining their exact rejection/denial expectations. Applicable paths are existing auth, consent and candidate browser tests. This is a test harness correction, not relaxation of product authority or expected errors.

## FINAL-B06-F04 — MEDIUM stale package qualification metadata

Source inspection of `tests/e2e/package.ts` shows unconditional claims that manual submission is unavailable and CA trust is absent, plus a certificate-blocked status derived from any historical failure. These become false after the authorized corrections/trust operation. The bounded packaging path is added to this session's authorized engineering scope: use the latest matching-source browser results, require the added manual-task journey with the existing mandatory suites, and derive the browser/TLS limitation from observed results. Work/human gates must remain pending. The canonical package format/tool remains unchanged.

The executable historical F07 helper `handoffs/codex/repro/W00-F07/provider-receipt.mjs` is also added solely to supply the new required `task_version` fixture field. Original historical execution evidence remains untouched; all four original F07 assertions retain their meanings and expectations.

## FINAL-B06-F05 — MEDIUM browser fixture ownership timeout

Full run `B06-playwright-2026-09-17T10-39-47.700Z` lost its held PostgreSQL ownership connection after the relay's 300000 ms idle limit (`infrastructure/loopback.mjs`). The checked-out advisory-lock client in `tests/e2e/fixture.ts` performs no query after acquisition. The retained first Test Lab error is `Connection terminated unexpectedly`; its broken-control run was interrupted in RUNNING. The next actual queue request returned 409, preserving the no-overlap rule.

Bounded correction is restricted to the browser harness: periodically query the same lock-owning client, and fail/clean up the fixture if that connection fails. Do not relax the relay timeout, drop the ownership lock, change application outcomes or clear database history. Recover only this execution's abandoned run `84cd5044-b7c9-4957-b7f9-46024a329c58` through the existing protected regression runner, retaining before/after state and ERROR attribution. Rerun both Test Lab cases and then the complete suite beyond five minutes. The code and recovery helper are covered by the user's verified-defect correction and test-execution authorization.
