# Handoff — base V1 continuation and presentation UI removal

**Base commit:** `487a77f573fa1afd8a8b250c5303c58f6942cc29`  
**New commit:** not committed  
**Source master / hash verified:** revision 1.4, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`  
**Contract version:** 0.17.0, unchanged  
**Scope and profile:** base V1 target observation, task/document drift, and user-requested removal of the guided presentation UI; `codex-a00` was used only for the targeted synthetic integration attempt and is stopped with volumes retained. Claude Code owns the separate DPDP extension work.

## Delivered

- Moved synthetic target-table reads and simulator readback behind the target observer port. Privacy-control no longer branches on a connector or queries `marketing_memberships`; unsupported connector kinds fail closed. Added focused tests for refusal and exact scoped selectors.
- Removed `/workspace/demo`, its guided component and navigation, and the overview's presentation block. Retained the Test Lab and labelled synthetic fixtures as a **test environment** in the UI. Updated the candidate browser assertion to require the retired route to return 404.
- Corrected stale planned-path entries in `tracking/tasks.json` to match the generated task board, without changing status, acceptance, or historical owners. Recorded the user-authorised owner transfer and subsequent DPDP lane boundary.
- Added current source checkpoints to the historical UX, acceptance-journey, demo-script, and release documents. Refreshed the generated document pack. Updated the document validator to read current canonical contract enums and pinned historical Git sources for moved references. Corrected one accepted quote to match its recorded commit; all 98 document checks now pass.

**Changed source paths:** `backend/privacy-control/src/{target-observer,processing,index}.ts`, `backend/api/src/synthetic/target-observer.ts`, `tests/unit/target-observer.test.ts`, `tests/integration/enforcement/send.test.ts`, `frontend/src/app/{globals.css,layout.tsx,page.tsx,not-found.tsx,privacy/sign-in/page.tsx,workspace/demo/page.tsx}`, `frontend/src/components/shared/{shell,fallback}.tsx`, `frontend/src/components/shared/state-labels.ts`, `frontend/src/components/screens/controls/{overview,configuration,guided-demo}.tsx` (the guided-demo route and component were deleted), `tests/e2e/candidate.spec.ts`, `tracking/tasks.json`, `AGENTS.md`, `docs/prototype/{FILE_OWNERSHIP,RELEASE_CHECKLIST,UX_BRIEF,DEMO_SCRIPT}.md`, `docs/ux/{ACCEPTANCE_JOURNEYS.md,UI_COPY.json}`, `docs/reviews/cowork/tools/{validate_docs,evidence_rules}.py`, `docs/reviews/cowork/tools/tests/{test_document_tools,test_historical_sources}.py`, and generated `docs/demo/index.html` and `docs/reviews/cowork/GENERATED_MANIFEST.json`.

## Commands actually executed

| Command | Exit code | Result / limit |
|---|---:|---|
| `node_modules\\.bin\\tsx.cmd scripts/validate-tracking.ts` | 0 | 23 tasks, 34 acceptance definitions, 33 modules; no result promoted |
| `node_modules\\.bin\\tsx.cmd shared/contracts/src/generate.ts --check` | 0 | 8 artifacts, 163 route and 7 error examples; contract 0.17.0 |
| `node_modules\\.bin\\tsx.cmd --test tests/unit/*.test.ts` | 0 | 199 passed before the added observer tests |
| `node_modules\\.bin\\tsx.cmd --test tests/unit/target-observer.test.ts` | 0 | 2 passed |
| `node_modules\\.bin\\tsc.cmd --noEmit` | 0 | Post-refactor and post-UI-removal checks passed |
| Focused ESLint on changed backend and UI paths | 0 | No warnings |
| `python docs/reviews/cowork/tools/build_pack.py --check` | 0 | Generated document pack current after refresh |
| `python docs/reviews/cowork/tools/validate_docs.py --json` | 0 | 98/98 checks passed after historical reference repair |
| `python -m unittest discover -s docs/reviews/cowork/tools/tests` | INTERRUPTED | Before fixture repair, the disposable-copy run was slow and had emitted an error and a failure. No full-suite pass claimed. |
| `python -m unittest discover -s docs/reviews/cowork/tools/tests -p test_r4_regressions.py -k test_approval_pair_for_reconciliation_and_other_proposal -v` | 0 | Focused historical-approval regression passed after the disposable fixture was given read-only Git object access; 1 test, 124.463 seconds. Full suite remains not qualified. |
| `python -m unittest discover -s docs/reviews/cowork/tools/tests -p test_historical_sources.py -v` | 0 | One isolated regression checks moved and changed historical sources plus unsafe references. |
| `git diff --check` | 0 | No whitespace errors |
| `tests/integration/enforcement/send.test.ts`, `codex-a00` | 1 | First run passed 11 assertions then failed parsing policy-preview error response; artifact `handoffs/codex/artifacts/A00-send-enforcement-1790188846083-83d6771a-f9d0-4cec-94b2-7f0452faac21.json` |
| Same targeted suite, second run | 1 | Fixture choice timed out before assertions; artifact `handoffs/codex/artifacts/A00-send-enforcement-1790189041408-314f79b7-9cd8-45b1-a614-3887d985d4c0.json` |
| Pinned-Node targeted suite | INTERRUPTED | Turn interruption prevented a terminal result; no pass claimed |
| Pinned-Node targeted suite, isolated `codex-a00`, 2026-09-24 | 1 | One run reached fresh-grant admission but returned `POLICY_UNAVAILABLE`/`INDETERMINATE`; artifact `handoffs/codex/artifacts/A00-send-enforcement-1790263760471-6b5b9cc8-47d5-4919-8fe1-ec90bfdc67c9.json`. A second run timed out in an early business request before assertions; artifact `handoffs/codex/artifacts/A00-send-enforcement-1790264197170-2cd5800e-ea4f-4abb-a4b9-a1a7f20d0abe.json`. Test readiness now requires an actual OPA decision response. The profile was stopped without deleting volumes. |
| `node_modules\\.bin\\tsc.cmd --noEmit` (after latest test changes) | 0 | TypeScript check passed. |

## Acceptance and limits

No T01–T34 full application result changed. The retired demo route has a browser assertion but browser acceptance was not run. The target-observer integration remains unqualified because the targeted suite did not pass. The two failed run artifacts are retained. No customer data, external provider, public deployment, database reset, or volume deletion was used. The approved master is unchanged.

The DPDP extension is being implemented by Claude Code in the same project folder according to the user; shared-path and runtime coordination remains necessary before either lane's integrated test. The selected real connector, payment provider and licence policy remain unanswered external product decisions.

## Next integration action

Coordinate a single writer on overlapping application paths, resolve the policy-preview failure on the current source, rerun the send suite in an isolated profile, and then run the browser route assertion. Freeze and qualify a candidate only after the baseline and extension source are integrated and the required scenarios actually run.
