# Cowork document validation record

**Scope:** documents only. **These checks are not ORVIA application tests** and prove nothing about runtime behaviour.

| Field | Value |
|---|---|
| Base commit | `96b8bd7590de0ca662d725b7fa0d708e811d6722` |
| Executed by | Cowork session, in its own cloud container (Python 3, Chromium via Playwright) |
| Date | 16 Sep 2026 |

## Commands executed

| # | Command (from repository root) | Exit code | Result |
|---|---|---|---|
| 1 | `git clone https://github.com/Nakum-hub/Cyberfyx-ORVIA.git` | 0 | `main` at `96b8bd7`. 2 commits, 7 tracked files, no application code. |
| 2 | `git log`, `git ls-files`, `sha256sum $(git ls-files)`, `git ls-remote origin` | 0 | Only `main` exists. File hashes are recorded in `docs/demo/EVIDENCE_INDEX.json` → `source_inspection`. |
| 3 | `python3 docs/reviews/cowork/tools/build_pack.py` | 0 | Generated tables spliced into UX_BRIEF.md and DEMO_SCRIPT.md, and `docs/demo/index.html` built. |
| 4 | `python3 docs/reviews/cowork/tools/validate_docs.py` (first run) | 1 | 47/49. **Both failures were errors in the validator's own logic, not in the documents:** (a) the generic key `state.consent.detail` was treated as a state value; (b) the enum check matched the word "RECONCILING" inside an explanatory note. Both checks were corrected to test what they are meant to test. |
| 5 | `python3 docs/reviews/cowork/tools/validate_docs.py` (after fix and final rebuild) | 0 | 49/49 document checks passed (final run listed in the C00 handoff) |
| 6 | Playwright/Chromium render of `docs/demo/index.html`: 1360×900 light and 390×844 dark | 0 | No horizontal scroll at either width. No non-`file://` requests. No console errors. The severity filter showed 5 blocker rows. Screenshots were inspected once by Cowork; they are scratch files and not indexed as evidence. |

## What the validator checks

**UI_COPY.json**
- The file parses as JSON.
- IDs are unique, and every entry has all required fields.
- Each entry's placeholder list matches the placeholders in its text.
- Every entry marked unresolved names the open decision.
- Every CONTRACT §3 state has a label.
- No state value outside CONTRACT §3 is introduced, and no `RECONCILING`/`QUARANTINED` state is introduced.
- The text contains no credentials and no non-reserved email domains.
- The wording assigned for the listed states is present.
- Copy exists for every required screen state and for every specified screen's empty state.

**Markdown**
- Every copy ID referenced in UX_BRIEF, ACCEPTANCE_JOURNEYS and DEMO_SCRIPT exists.
- Relative links in Cowork-owned documents resolve.
- No readiness or pass overstatement appears in owned documents.

**Acceptance and evidence**
- All 34 acceptance IDs appear in the journey summary.
- Every journey result is `NOT_RUN`.
- The evidence index covers T01–T34 once each and has no fabricated results; its summary counts match its entries.

**Demo steps**
- There are exactly 12 steps.
- Every step has all its fields, and every referenced test ID exists.

**Findings and claims**
- The findings CSV has the required columns, complete rows and valid severities.
- Every finding ID referenced in the documents exists.
- No claim is marked `EVIDENCED`.

**HTML pack**
- Internal anchors resolve.
- It loads no external resources.
- It has no forms, inputs, iframes or buttons.
- It makes no storage or network calls.
- It carries the documentation-only label and a restrictive CSP.
- It defines both dark and light theme tokens.

## Not run

| Check | Status | Reason |
|---|---|---|
| Automated accessibility scan (axe or similar) of the HTML pack | NOT_RUN | No scanner is installed; none was added. Contrast was chosen by design, not measured. |
| Rendering on the human's Windows machine or browser | NOT_RUN | — |
| Any ORVIA application test, browser test or runtime check | NOT_RUN | No application exists |

---

# r3 record (16 Sep 2026, documentation base `e839b1a`)

**Scope:** Cowork documents and document tools only. **These are not ORVIA application tests, security audits or acceptance decisions.**

| Field | Value |
|---|---|
| Environment | Cowork cloud container: Python 3.11.15; Chromium through Playwright |
| Checkout | Isolated worktree on local branch `prototype/cowork/C00-C02-review` from `e839b1a` |
| History | The r2 record above (base `96b8bd7`) is kept unchanged as history |

## Commands executed

| # | Command | Exit | Result |
|---|---|---|---|
| 1 | `git fetch origin --prune`; `git ls-remote origin` | 0 | `main` = `e839b1a` (PR #3 A00 merged). PR heads #1–#3 are visible. No remote Cowork branch. |
| 2 | `curl https://api.github.com/repos/Nakum-hub/Cyberfyx-ORVIA` | 0 (HTTP 403) | "GitHub access to this repository is not enabled for this session." |
| 3 | `git push --dry-run origin 96b8bd7:refs/heads/prototype/cowork/C00-C02-review-dryrun-check` | 0 (remote said HTTP 403) | Git proxy: repository "not in this session's authorized repository set". Nothing written. |
| 4 | Web fetch of the repository page | — | Shows the **Public** label |
| 5 | `sha256sum ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md` (read-only copy staged from the human's computer) | 0 | `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6`, matching the expected hash |
| 6 | `git apply --check --whitespace=error cowork_C00-C02_96b8bd7.patch` (on `e839b1a`), then `git apply` | 0 | The r2 patch applied cleanly to the current base before correction |
| 7 | Consistency check of `handoffs/codex/A00-command-index.json` against its 51 artifacts | 0 | All artifacts present; exit codes match; 14 non-zero exits retained. No command was re-executed. |
| 8 | The r2 `validate_docs.py` run on a temporary r3 copy containing one labelled fixture record | 1 | Crashed with `KeyError: 'observed_result'`. This retest confirms the r2 defect (F-027): the old tool assumed permanently empty evidence and could not read a progress-capable index. Log kept outside the tree. |
| 9 | First run of the new `validate_docs.py` on r3 | 0 | 92/92 |
| 10 | `python3 docs/reviews/cowork/tools/build_pack.py` | 0 | Wrote UX_BRIEF, DEMO_SCRIPT and LEADERSHIP_HANDOVER generated sections, `docs/demo/index.html` and `GENERATED_MANIFEST.json` |
| 11 | `python3 docs/reviews/cowork/tools/build_pack.py --check` | 0 | "generated outputs are current" |
| 12 | `python3 docs/reviews/cowork/tools/validate_docs.py` | 0 | **92/92** document checks passed (mode: current) |
| 13 | `python3 docs/reviews/cowork/tools/validate_docs.py --mode historical-no-evidence` | 0 | **97/97** passed. Expected, because no application evidence exists yet at `e839b1a`. |
| 14 | `python3 -m unittest discover -s docs/reviews/cowork/tools/tests -v` | 0 | **29 tests, OK** (DOCUMENT-TOOL TEST DATA only) |
| 15 | Playwright/Chromium render of `docs/demo/index.html` at 1360×900 (light) and 390×844 (dark) | 0 | See the details below. Screenshots were inspected once and kept outside the tree. |

**Render details (command 15):**
- No non-`file://` requests.
- No console errors.
- No page-level horizontal overflow; wide tables scroll inside their own containers.
- No broken in-page anchors.
- The first Tab reaches "Skip to content" with a solid focus outline, and Enter moves to `#main`.
- The severity filter shows 2 blocker rows, and the audience filter works.

## What the regression tests cover

Each test copies the repository to a temporary directory and mutates only that copy.

**Baseline**
- The unmodified copy passes in both modes.

**Copy traceability**
- An unresolved entry without a finding fails.
- A dangling finding ID fails.
- An unresolved entry pointing to a resolved finding fails.
- Marking a proposal-bound value resolved fails.
- An invented state value fails.
- An unconditional "unchanged" assurance fails.

**Generated output**
- Changed copy makes UX_BRIEF, the HTML and the manifest stale until rebuilt; `--check` exits 1.
- A hand-edited HTML file is detected.
- The build is deterministic.

**Structure**
- Malformed JSON is reported, not crashed.
- A missing required field fails.
- Inconsistent media and rehearsal counts fail.
- An incomplete media entry fails.

**Evidence lifecycle**
- A supported non-empty record is accepted.
- Fixture data in the real index is rejected in current mode.
- A recorded FAIL is kept as a result.
- An expected-detection run recorded as PASS fails.
- Incomplete provenance fails.
- An artifact hash mismatch fails.
- Historical mode rejects results.

**Claims**
- An unsupported EVIDENCED claim fails.
- A claim whose record is on the wrong candidate fails.
- A claim supported by a matching candidate passes.

**Readiness and wording**
- A readiness value not quoted from its source fails.
- A self-accepted ticket status fails.
- "Optional" P0 wording fails.
- A journey result that disagrees with the canonical status fails.

## Not run (r3)

| Check | Status | Reason |
|---|---|---|
| Automated accessibility scanner (axe or similar) | NOT_RUN | Not installed; no dependency added |
| Contrast measurement | NOT_RUN | Chosen by design; not measured |
| Rendering on the human's machine | NOT_RUN | — |
| Any ORVIA application, browser, security, recovery or egress test | NOT_RUN | Cowork lane |
| Any runbook command | NOT_RUN | Requires human approval and the rehearsal profile |
| GitHub commit, push, PR or CI | NOT_RUN | Blocked (F-028) |

### r3 retest after the clean-checkout check

| # | Command | Exit | Result |
|---|---|---|---|
| 16 | Applied the r3 patch to a fresh checkout of `e839b1a`, then ran the validator, `--check` and the tests | 0 / 0 / 1 | Validator 92/92 and `--check` current. **Tests: 3 failures.** The fixture `synthetic_artifact.log` was not in the patch because `.gitignore` on `main` ignores `*.log`. |
| 17 | Renamed the fixture to `synthetic_artifact.txt`, updated the fixture record and tests, regenerated the patch, and repeated #16 | see below | Result recorded in the final section |
| 18 | Added the validator check "No Cowork-owned file is ignored by .gitignore". It fails with `synthetic_artifact.log` present and passes after the rename. | 1 → 0 | Prevents the #16 defect from recurring |
| 19 | `scratchpad/verify_clean.sh` (outside the tree): regenerated the patch, applied it with `--whitespace=error` to a fresh `e839b1a` checkout, then ran `build_pack.py --check`, both validator modes and the tests there | 0 | Patch applies. `--check`: current. Validator: **93/93** (current) and **98/98** (historical-no-evidence). Tests: **29 run, all OK**. A grep for "... ok" counted only 28 because one test prints `--check` output before its "ok"; the unittest summary line is authoritative. |

**Final delivery patch.** The patch is regenerated after this record is written and verified again the same way. That verification's logs are in the delivery's `logs/` folder, outside the repository tree.
