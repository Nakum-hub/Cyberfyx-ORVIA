# Handoff - R4-CRAWL-03 - idle-host observations

Base application: `e42f573c91340eadbcd42ad010c79c56fd50010a`. Branch: `codex/crawl-recheck-20261001`, based on browser evidence commit `d8e7514`. Allowed changes: this handoff. Focused helper and evidence are inherited from `codex/cross-browser-20261001`.

Plan: stop build/preparation load, visit the three specified role/routes in Firefox and Chromium, and check the eight additional full-crawl failures under the same idle-host condition. No concurrent tests or shared database writes. The original full crawl remains FAIL; this focused control does not replace its 450-visit coverage.

Commands: `tsx handoffs/codex/run-browser-round4.mjs firefox crawl-observations-round4` and the Chromium counterpart, using the recorded helper dispatch in `run-browser-round4.mjs`. Both returned exit 0, 11/11 routes each. Exact executed suite argument is recorded in `R4-firefox-idle-observations.log` and `R4-chromium-idle-observations.log`; do not infer an unexecuted full-crawl rerun.

The required admin `/workspace/installed-versions`, auditor `/workspace/assessments`, and auditor `/workspace/audit-coverage` rendered successfully in both browsers. Auditor audit coverage's actual `/api/v1/session` response was 200 in both runs. All eight additional failed role/routes also passed the focused check. Evidence: `artifacts/R4-idle-firefox-crawl-observations.json`, `R4-idle-chromium-crawl-observations.json`, `R4-followup-results.log`, and A00 `round-four-crawl-observations` records ending `1790743583136-92e21d2f-93f5-4306-b4ba-6b8507fc1f52.json` and `1790743757364-e9a5aa9c-3a04-4661-b5ee-ef33cb84ec76.json`.

No defect reproduced on the idle host, so no application fix or speculative regression expectation was added. Full Firefox crawl API 503s remain documented with complete failure traces under `artifacts/R4-traces/baseline-firefox-interface-crawl-local/`. The owner portion overlapped installer-image preparation on a memory-constrained host; this is a confounder, not an established root cause. The full failure and WebKit authentication limitation remain with the cross-browser handoff.

Changed file: this handoff only, in this commit. `git diff --cached --check`: exit 0. No test, fixture, expectation or threshold changed; no tracking acceptance promoted. Next dependency: investigate full-load intermittent failures with the retained traces if they recur; owner decides qualification acceptance.
