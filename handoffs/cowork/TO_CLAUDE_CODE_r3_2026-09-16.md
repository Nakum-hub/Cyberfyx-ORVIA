# Cowork → Claude Code: corrected copy and UI acceptance requirements (r3)

| Field | Value |
|---|---|
| From | Cowork |
| Base | `e839b1a` |
| Date | 16 Sep 2026 |
| Inputs | `docs/prototype/UX_BRIEF.md` (c00-r3), `docs/ux/UI_COPY.json` (385 entries; 114 UNRESOLVED, each with a finding), `docs/ux/ACCEPTANCE_JOURNEYS.md` |

At `e839b1a`, A00 transfers `apps/web/src/app/layout.tsx` and `page.tsx` to you once Work/human accept the base for B00. Cowork does not edit UI code. Route paths are your decision; the brief fixes screens and copy only.

## A. What changed since r2 and must be reflected

1. **Uncertain writes (F-024).**
   - Never show "nothing changed" after a timeout or a generic 503. Use `error.portal.503` / `error.staff.503` and `*.network_change`.
   - Do **not** display `error.portal.503_not_saved` (it is conditional).
   - Keep the original grant or withdrawal request — Idempotency-Key, exact payload including `expected_epoch`, `interaction_id` and, for grant, `notice_version_id` — across timeout **and reload**.
   - Offer `recovery.portal.retry_same` and `recovery.portal.check`.
   - A new choice uses a new key and the current epoch, and only after recovery or conflict handling.
   - Never retry writes automatically (0.2.0).
2. **Conflicts.**
   - Show `error.portal.409_epoch` with `error.portal.409_epoch.action`.
   - Show `error.portal.409_epoch.reloaded` **only after** the reload succeeds.
   - For `IDEMPOTENCY_CONFLICT`, use `error.portal.409_idempotency`.
   - Map the response's `retry` hint to `error.retry.*`.
3. **Reconciliation (F-008).**
   - `reconcile.pending` is transient button text.
   - After the 202, render the durable record from the workflow using `state.reconciliation.*` (0.2.0 values, pending W00).
   - The uncertain attempt stays `Outcome unknown` in history.
4. **Decision copy (F-025).**
   - ALLOW detail is purpose-neutral.
   - Never present marketing consent as the basis for `order_service_demo`.
5. **Manual work (F-013).**
   - The attestation copy says "statement", never "observed".
   - If a workflow is COMPLETED with manual statements, show `state.workflow.COMPLETED.manual_note`.
   - Do not render a completed or observed state that contradicts the approved criteria; report it as a finding.
6. **Overview (F-007).**
   - Bind cards to the counts the accepted contract returns: 0.2.0 has `effect_unknown`, `failed`, `manual_required` and `unverified` (`overview.card.unverified`).
   - Hide `.unverifiable`, `.not_satisfied` and `.stale` unless those counts are added.
7. **Systems.**
   - Three configured connectors.
   - Coverage badges derive from `supports_restrict` and `supports_read`.
   - The send gateway is explanatory text, not a system row (F-018).
8. **Test Lab (F-010).**
   - Scenario options come from `testlab.scenario.*`.
   - Show `testlab.broken_fixture_note` only when the run's `expected_fault_detection` is true.
   - Never recolour or convert a result.
9. **Sign-in (F-023)** and **dual session (F-026).** Map Better Auth codes to copy after A01. Use `permission.both_sessions` if Work confirms the 403 rule.

## B. Acceptance requirements for your browser evidence

| Journey | What to cover |
|---|---|
| J06 / J07 | The timeout variants: identical retried request after reload; original receipt or conflict path |
| J10 | Durable reconciliation record |
| J13 | Manual note rule |
| J15 | Count parity |
| J17 | Expected-detection annotation |
| J21 | States, keyboard and zoom. Report mocked-state results separately from integrated-flow results. |

**Evidence to supply per run:** Playwright traces, screenshots and reports with the candidate commit, build and profile, so Cowork can index them.

**Media rules:**
- Use real screenshots only, and give each one's scope ("shows" / "does not show").
- A recording must be labelled as recorded.

## C. Reply requested

Adopt the brief and copy, or list specific objections by copy ID, in your own handoff directory (F-019). **Forwarding does not close these findings.**
