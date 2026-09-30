# Handoff - R4-ASSESSMENT-02 - repeat-save recheck

Base application: `e42f573c91340eadbcd42ad010c79c56fd50010a`. Branch: `codex/assessment-repeat-save-20261001`, based on browser evidence commit `d8e7514`. Allowed changes: this handoff; no screen, contract, test, fixture or threshold edits.

Plan: observe field validity and disabled state at both saves, then run the unchanged expansion journey in Firefox and Chromium. The historical defect did not reproduce; no application fix is justified by this evidence.

Firefox 155 completed 69/69 assertions, exit 0. At the second Save answers click, all four fields were valid and enabled, the evidence field contained 23 characters, and the Save answers button was enabled. Both saves sent POST requests and received 200. Exact form/network events: `artifacts/R4-firefox-repeat-save-diagnostic.jsonl`.

Chromium completed 69/69 assertions, exit 0 on the completed rerun. The first attempt completed its assertions but the diagnostic wrapper hung during cleanup; it was stopped with exit -1 and is NOT_COMPLETED. The wrapper cleanup fix is observation-only and recorded in the cross-browser handoff. No journey was changed to pass.

Executed commands: `tsx handoffs/codex/run-browser-round4.mjs firefox expansion-screens-local` (0); the corresponding Chromium invocation (-1 initially, then 0 with `R4_RUN_LABEL=chromium-complete`). Pinned Node 24.21.0; synthetic isolated codex-a00 profile. Logs: `R4-firefox-expansion-screens-local.log`, `R4-chromium-expansion-screens-local.log`, `R4-chromium-expansion-complete.log`, `R4-followup-results.log`. A00 artifacts end in `1790741809529-0ab39b64-5fee-4f46-b476-fea2c9bf94da.json` and `1790744495207-602bf84e-58c3-4a1f-b7b2-5f80958718ec.json`.

Changed file: this handoff only, in this commit. `git diff --cached --check`: exit 0. Evidence is inherited from `codex/cross-browser-20261001`. No acceptance promotion. Historical root cause remains undetermined; retain the diagnostic if it recurs. No outstanding reproduced screen defect from this recheck.
