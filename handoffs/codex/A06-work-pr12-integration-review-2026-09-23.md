# Handoff - A06 - Codex - Work PR #12 integration review

**Base commit:** `141bc2639847bcf36318d16f1d73d26efd312583` (merged Work PR #12)
**Reviewed Codex commit:** `e09429a` (rebased local commit; publication commit recorded in the final push result)
**Source master / hash verified:** `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md`, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`
**Contract version:** `0.15.0`
**Scope and profile:** review of merged Work PR #12 on the combined local tree; no customer data, deployment, database reset or Work-owned source edit

## Delivered

- Reviewed the effective PR #12 diff (`43383f4..85394d6`): 18 Work-owned documentation/review files. The PR preserves `NOT_IDENTIFIED`/`NOT_RUN` states and does not promote application or production readiness without evidence.
- Rebasing the Codex A06 commit onto `origin/main` completed without conflict.
- Confirmed the revision 1.4 master digest recorded by the Work documents matches the repository file and supplied build-pack manifest.
- Identified two Work-lane follow-ups without editing their owned paths:
  - `docs/reviews/cowork/tools/evidence_rules.py` uses default-encoding `Path.read_text()` calls. On Windows code page 1252, `validate_docs.py --json` fails the accepted-binding check with a `charmap` decode error. Running with `PYTHONUTF8=1` makes that check pass.
  - `docs/demo/index.html` and `docs/reviews/cowork/GENERATED_MANIFEST.json` are stale according to the merged `build_pack.py --check` gate. These generated Work-owned outputs need regeneration and review from their sources.
- Minor trailing whitespace exists in new `CURRENT_STATE.md` lines. It is non-semantic and remains untouched because the path is Work-owned.

## Commands actually executed

| Command | Exit code | Result | Artifact / environment |
|---|---:|---|---|
| `git fetch origin --prune` | 0 | PASS - fetched PR #12 merge at `141bc26` | `origin/main` |
| `git rebase origin/main` | 0 | PASS - no conflicts | local Codex branch |
| `python docs/reviews/cowork/tools/validate_docs.py --json` | 1 | FAIL - 96/98; Windows default-encoding error plus stale generated outputs | Windows code page 1252 |
| `$env:PYTHONUTF8='1'; python docs/reviews/cowork/tools/validate_docs.py --json` | 1 | FAIL - 97/98; content checks pass, generated-output check remains red | combined tree |
| `$env:PYTHONUTF8='1'; python docs/reviews/cowork/tools/build_pack.py --check` | 1 | FAIL - two stale generated outputs | combined tree |
| `npm run contracts:check` | 0 | PASS - 8 artifacts, 162 routes, 7 errors, contract 0.15.0 | combined tree |
| `npm run typecheck` | 0 | PASS | combined tree |
| `npm run lint` | 0 | PASS | combined tree |
| `npm test` | 0 | PASS - 197/197 | combined tree |
| `npm run tracking:check` | 0 | PASS - 23 tasks, 34 acceptance definitions, 33 modules; no promotion | combined tree |
| `$env:PYTHONUTF8='1'; python -m unittest -v test_document_tools.DocToolCase.test_explicit_no_evidence_snapshot_passes_historical_mode` | 1 | FAIL - historical-mode control inherits the two stale generated outputs | clean tracked-files archive of `HEAD` |

The complete 62-case Work document-tool suite is **NOT_RUN to completion** on this host. Its test setup copies the full repository once per case; the working-tree run also copied large unrelated untracked directories. A clean tracked-files archive removed that contamination, and the previously observed failing case was then reproduced directly in 32.582 seconds. Continuing all 62 cases cannot make the already-red gate pass and would add no acceptance evidence before the generated outputs are repaired.

## Acceptance

- PR #12 is acceptable for its conservative source/state reconciliation; no unsupported readiness promotion was found.
- The combined branch is not document-gate green until the two generated outputs are current.
- The Windows portability defect is reproduced by the default command and controlled by an explicit UTF-8 rerun.
- The clean-archive historical-mode regression reproduces the stale-output failure independently of the user-owned untracked files.
- The existing final A06 aggregate application battery remains red (18/27 suites passed); this review does not supersede or relabel that evidence.

## Contract / dependency / ownership changes

- No contract schema, endpoint, migration, dependency, task status or acceptance status changed during this review.
- No Work-owned file was edited. This handoff is the change request required by `docs/prototype/FILE_OWNERSHIP.md`.

## Remaining limitations and blockers

- **Work / document generation:** run `python docs/reviews/cowork/tools/build_pack.py`, inspect and commit only the intended changes to `docs/demo/index.html` and `docs/reviews/cowork/GENERATED_MANIFEST.json`, then require `build_pack.py --check` and `validate_docs.py --json` to exit 0.
- **Work / Windows portability:** add `encoding="utf-8"` to text reads in `docs/reviews/cowork/tools/evidence_rules.py` (and regression coverage using a non-UTF-8 Windows default), then require the unprefixed validator command to exit 0 on Windows.
- **Codex / application qualification:** reproduce and resolve the retained nine-suite aggregate failure before any application PASS claim.

## Next integration action

1. Work reviews these two bounded document-tool findings and updates its owned paths.
2. Codex publishes the rebased A06 commit and this review handoff on a feature branch for human review; Codex does not merge or push directly to `main`.
3. Integration reruns the default Windows validator, document-tool unit suite and full application battery after the Work fix.
