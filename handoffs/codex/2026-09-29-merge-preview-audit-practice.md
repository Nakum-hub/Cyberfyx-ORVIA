# Handoff — AUDIT-MERGE-PREVIEW — Codex

**Base commit:** `9e4bf8c0efa813fce677fecbabb949fcf45d63a0` (branch created from origin/main).
**New commit:** identified by `git log -1 -- handoffs/codex/2026-09-29-merge-preview-audit-practice.md`; publication hashes are in the final response. This file cannot contain its own commit hash.
**Source master / hash verified:** revision 1.4, SHA-256 `c51102a7cda5fe15c1346e8c34167c406e186c691e9ba86576a3d8fd03bb550b`; addenda 1.5 and 1.6 apply.
**Contract version:** 0.43.0 on origin/main; reviewed branch 0.45.0; no shared contract edited.
**Scope and profile:** synthetic local engineering only; no main merge, Claude branch push, production qualification or acceptance promotion.

## Delivered

Local scratch preview in `.worktrees/audit-practice-runtime`, detached at `a82f14aa582829363b72e031dbab43a3e695694f`. Ran `git merge --no-commit --no-ff origin/main`: exit **0**, “Automatic merge went well; stopped before committing as requested”. `git diff --name-only --diff-filter=U`: exit **0**, empty. `git diff --cached --stat`: exit **0**, empty. `git merge --abort`: exit **0**. No merge was committed or pushed; source restored before browser preflight.

**Every conflict: none.** The graph needed a merge but no content change was staged. This preview does not include the separate new Codex migration/tracking/UI branches.

Every main commit after `2247dd8` touching a reserved path is enumerated with every matching path in `handoffs/codex/artifacts/MERGE-AUDIT-main-paths.json` (`git diff-tree -m` includes both parents of merges).

| Commit | Subject | Preferred resolution |
|---|---|---|
| `9e4bf8c0efa8` | Merge pull request #31 from Nakum-hub/claude/upbeat-newton-w4h53x | Preserve existing integrated content; no conflict |
| `4acb8ba013c5` | Converge vendor row-level security across fresh and upgraded databases | Preserve existing integrated content; no conflict |
| `0794f7ee285b` | Merge origin/main (commerce fulfilment 2247dd8, CI fix PR #30) into the revision 1.6 branch | Preserve existing integrated content; no conflict |
| `715ef5299a7d` | Rev 1.6 documentation, tracking and handoff; trust-file audit address tests; regression battery | Preserve existing integrated content; no conflict |
| `f8fbacdfce30` | Audit mandate browser journey; vendor visibility and checklist show mandate evidence | Preserve existing integrated content; no conflict |
| `1c618ba6ea30` | Screens for the audit mandate: client mandate and channel panel, vendor channel section, leadership overview | Preserve existing integrated content; no conflict |
| `0aa1a87d3b0b` | Fix a type annotation in the audit mandate suite (typecheck clean) | Preserve existing integrated content; no conflict |
| `b8197f5b685d` | Audit mandate channel verified end to end; vendor visibility lists the channel | Preserve existing integrated content; no conflict |
| `64085b40df6d` | Audit mandate channel (rev 1.6): contract, vendor and client migrations, vendor channel service, client worker and staff domain | Preserve existing integrated content; no conflict |

## Commands actually executed

The four merge/diff/abort commands above all exited 0. Read-only enumeration used `git rev-list 2247dd8..origin/main` and `git diff-tree -m --no-commit-id --name-only -r <commit>`, exit 0.

## Acceptance

Merge feasibility only. Build/runtime/integration acceptance NOT_RUN. No conflicts does not clear review findings.

## Contract / dependency / ownership changes

None. Files changed: this handoff and the JSON path inventory only.

## Remaining limitations and blockers

Preview pinned to the SHAs above; Claude may advance. Re-fetch and repeat before a human merge.

## Next integration action

Human reviews R1–R7 and integrates approved branches. Keep the migration rename’s execution-order alias when integrating Claude’s runner invariant; both are required.
