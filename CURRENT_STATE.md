# ORVIA — current execution state

**Writer:** Work · **Checkpoint:** PR #26 merged; final candidate frozen and qualified; W01/W02 accepted; rehearsals outstanding · **Date:** 2026-09-17

| Field | Current evidence / decision |
|---|---|
| Current integration / reviewed runtime | Latest human-integrated `main` is `b909be896084da21f2c9d69e8e88dbb4a36d58d4` (merge of PR #26). Its tree `c709c61ee1ee1946a7fdac367c973808cf14e8a6` is byte-identical to checkpoint `c4d779395ddaa0e047a81aa0778bf47e566da8b3`, so every checkpoint correction is integrated. Continuation branch `prototype/work/final-prototype-continuation` adds one source commit, `81431d64afb8dd613c96d942402d8c0d8cc07ac0`, correcting the Test Lab operator exit expectation and interruption barrier. |
| Frozen final candidate | **IDENTIFIED — see `artifacts/release-manifest.json` for the exact identity.** That manifest is the single authority for source commit, source inventory SHA-256, host and container build IDs, runtime image digest, contract, profile, fixture and package artifact hashes. This row deliberately does **not** repeat those values: `scripts/source-state.ts` includes `CURRENT_STATE.md` and `tracking/` in the qualified source inventory, so embedding the candidate identity here would change the very inventory it names. Independent verification is recorded in `handoffs/work/final-prototype-continuation/candidate-verification.json`. The historical 0.4.1 candidate `766854399d411c551c4d3f657ea2b4f3f189a4bd` is superseded and must not be described as covering these corrections. |
| Source / contract | Master rev 1.3 SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6` unchanged. Executable transport **0.5.0**, signed command **0.3.0**. `contracts:check` validates 8 artifacts, the canonical seed, 41 route examples and 7 error examples. Lockfile SHA-256 `b2694da120310a26a6ae377ebecbd4dafcac6711b60377c4ff308fe4fc91a5c8` unchanged; no dependency or migration change. |
| Owners | Work: sole canonical writer, review/state/tracking documents and the transferred former-Cowork UX/copy/capability/demo/runbook/document-tool paths and C00–C02. Codex: all application engineering plus transferred UI/component/browser B IDs. Human: approvals, merge, release and final sign-off. |
| Accepted tasks | W00, A00, A01 (historical) plus **A02 `3242521e…`, A03 `03410094…`, A04 `94d3e722…`, A05 `d94f525e…`, A06 `3c2ee18f…` and W01 `81431d64…`**, accepted on executed evidence at the frozen candidate. |
| W01 — authority and consent | **ACCEPTED.** Historical MEDIUM W01-A02-F01 (freshness/expiry not enforced at consumption after lock waits) is **CLOSED** on executed evidence: `tests/integration/consent/expiry.test.ts` 87/87 assertions including 15 real "transaction and wait began before expiry" controls. Full review: `handoffs/work/final-prototype-continuation/W01-consolidated-review.md` and `docs/reviews/work/AUTH_AND_CONSENT.md`. |
| W02 — integration, failure, security, recovery | **Review content ACCEPTED** on executed evidence; the canonical ticket remains BLOCKED only by its board dependency chain (see the blocking gate row). FINAL-B06-F02 (manual-attestation contract gap), FINAL-B06-F05 (browser fixture ownership timeout) and FINAL-CONT-F06/F07 (Test Lab harness) are closed. Full review: `handoffs/work/final-prototype-continuation/W02-consolidated-review.md` and `docs/reviews/work/INTEGRATION_AND_SECURITY.md`. |
| Executed results at the candidate | Static: typecheck, lint, `contracts:check`, 15/15 unit tests, production build, hygiene (1659 files, 33 browser bundle files, 81 generated credential values, **0 findings**). Backend: evidence 69, auth 87, consent 50, expiry 87, workflow 32, enforcement 46, regression 70 (T23–T25), lifecycle 17, TLS 12, services smoke 4 and network qualification 13 assertions — **every suite PASS, exit 0**. Browser: **16/16 PASS, exit 0** over a 9 min 59 s run at the exact candidate commit and tree, all seven mandatory suites, Chromium over normal trusted HTTPS with no bypass. |
| Retained failures | Two failures from this session are retained, not overwritten: an auth suite run rate-limited at 429 (`handoffs/codex/browser/B06-exec-2026-09-17T11-46-50.057Z`, rerun PASS) and the `codex-a00`-pinned fixture-isolation suite refusing the rehearsal profile (`…T12-07-55.927Z`). All earlier checkpoint failures remain in place. |
| Canonical acceptance | T01–T34 remain **NOT_RUN**. 24 of the 30 P0 scenarios have every covering component suite passing at this exact candidate; T01, T02, T26, T27, T28 and T30 are PARTIAL with named gaps. T26 needs the browser-side egress observation and T27 needs dependency-advisory triage; neither ran at this candidate. Promotion to PASS requires `APPLICATION_ACCEPTANCE` / `FULL_SCENARIO` records, which the two human rehearsals are designed to produce. Per-scenario detail: `handoffs/work/final-prototype-continuation/T01-T30-reconciliation.md`. T31–T34 remain unpromoted. |
| Blocking gate | The canonical board chain `C00 → B00 → B01/B02 → B03 → B04 → W02 → A07 → B06 → C02 → W03` cannot advance because **C00 acceptance is a documented human decision** that has not been made. The underlying engineering is merged and qualified; only the acceptance act is outstanding. |
| Scope / isolation / time | `CUSTOMER_LOCAL_SYNTHETIC` marketing withdrawal; AI DEFERRED_V2; no P1 promoted; no public deployment. Synthetic Aster/Birch fixtures only. `codex-a00`, `ui-b00` and `rehearsal` stores remain separate; `.local` credentials, keys and raw authenticated traces stay off GitHub. |
| Certificate trust | The reviewed rehearsal CA `8C592FC41BBD6AA18F42234085F6B8155466A190` was reinstalled in `CurrentUser\Root` under fresh explicit human approval and independently verified with `certutil`. It is temporary and must be removed after the rehearsals; record: `handoffs/work/final-prototype-continuation/certificate-trust.json`. No validation bypass, plaintext fallback or machine-wide trust was used. |
| Readiness | Internal-demo NOT_READY; frozen candidate IDENTIFIED; two rehearsals NOT_RUN; W03 BLOCKED; human NOT_SIGNED. Production security/legal/supply-chain/full recovery NOT_ASSESSED and governed separately by the master. |
| Next action | Human accepts or returns C00; human runs or supervises Rehearsal 1 and Rehearsal 2 on this exact candidate using `handoffs/work/final-prototype-continuation/REHEARSAL_RUNBOOK.md`; Work then completes C02 and W03 and presents the final recommendation. Human retains merge, release and sign-off. |

| Work ticket | Document deliverable | Acceptance / remaining gate |
|---|---|---|
| W00 | [Scope/ADR and A00 review](docs/reviews/work/W00_A00_ACCEPTANCE.md) | COMPLETED; accepted commit retained |
| W01 | [Authority/consent](docs/reviews/work/AUTH_AND_CONSENT.md) | **COMPLETED** at candidate `81431d64…`; W01-A02-F01 closed on executed evidence |
| W02 | [Integration/security/recovery](docs/reviews/work/INTEGRATION_AND_SECURITY.md) | Review content accepted; ticket BLOCKED on the B04 chain, which is gated on C00 human acceptance |
| C00 | [UX/copy/journeys/scenario](handoffs/work/C00-C02-r4-delivery.md) | IN_REVIEW; **human acceptance outstanding and now the critical-path blocker** |
| C01 | [Capability map/runbook/claims/evidence](handoffs/work/C00-C02-r4-delivery.md) | BLOCKED; refreshed against the frozen candidate, start dependency C00 |
| C02 | [Presentation/release handover](docs/demo/LEADERSHIP_HANDOVER.md) | BLOCKED; candidate now identified, but two qualifying rehearsals are absent |
| W03 | [Final gate report](docs/reviews/work/FINAL_GATE_REPORT.md) | BLOCKED; recommendation remains NOT_READY until R1/R2 and the outstanding acceptances |

Work alone consolidates this record. Other lanes submit factual handoffs. The complete continuation record for this session, including every command, interval, exit code and artifact, is
`handoffs/work/final-prototype-continuation/`.

## History

Previous checkpoints are preserved and are not restated here. `handoffs/work/final-prototype-7bc7780/`
holds the Codex pause checkpoint, its original request, bounded corrections and the intake verification of
the historical 0.4.1 candidate. Earlier r3/r4 delivery, takeover and delivery-audit notes remain in
`docs/reviews/cowork/VALIDATION.md` and the C-lane handoffs at their original identities. Source presence,
engineering PASS, Work acceptance, full canonical scenario acceptance and human rehearsal remain five
different facts.
