# ORVIA — current execution state

**Writer:** Work · **Checkpoint:** W00/repo-r2 · **Date:** 2026-09-16

This state describes the reviewed base and this proposed Work checkpoint. Branch/PR publication is not human integration approval. Other lanes submit exact commits and evidence through their own handoffs; Work alone consolidates this table.

| Field | Current evidence / decision |
|---|---|
| Repository / base | `Nakum-hub/Cyberfyx-ORVIA`; `main` at `96b8bd7590de0ca662d725b7fa0d708e811d6722`; seven planning/instruction files, no application |
| Work branch | `prototype/work/W00-bootstrap-review`; checkpoint commit is the Git commit introducing these records, distinct from the inspected base |
| Source | Product V1, master revision 1.3; reference SHA-256 `527daa1d6a2a7564a61d0375e540ca66b1bc8f33f4e71d327b0f6cb0bf6dbef6` verified; human-controlled repository copy absent |
| Plan / contract | Plan 1.0 / design 0.1.0; executable schemas not created or accepted |
| Profile | CUSTOMER_LOCAL_SYNTHETIC; marketing-withdrawal slice; custom AI DEFERRED_V2; no P1 promoted |
| Owners | Work: decisions/reviews/trackers/views/state. Codex: schemas/dependencies/core/infra/tests/CI. Claude Code: UI/browser tests after A00 transfer. Cowork: UX/capability/demo/runbooks. Human: source originals/access/system approvals/merges/release |
| Accepted tasks / commits | None established; A00 inventory, runnable scaffold and handoff absent |
| Executed results | Git inventory/access/source identity and document consistency only; exact commands/assertions in `docs/reviews/work/W00_EVIDENCE.json` |
| Application results | T01–T34 all NOT_RUN: 30 P0 and 4 unpromoted P1; no runtime/build/browser/recovery/security/rehearsal results |
| Open findings | F01 source/A00 evidence; F02 signed bindings; F03 reconciliation/receipt projection; F04 progress validator; F05 timing/runtime facts; F06 GitHub publication permission |
| Access / merge controls | Public repository; repository API reports user push permission, but connector publication failed with HTTP 403 `Resource not accessible by integration`. No configured alternate Git authentication was found. Main reports unprotected, rulesets list empty; human retains merge control |
| R0 / deadline / target | Not supplied; original 36-hour budget not restarted. Does not block A00 inventory/bootstrap |
| Readiness | Internal demo NOT_READY; production security/legal/supply-chain/recovery NOT_ASSESSED and separate |
| Next dependency-ready tickets | Codex A00; Cowork C00 may proceed independently. B00/W01 wait for accepted A00 and applicable transfer |
| Next merge | None published yet. Human enables the selected GitHub connection's scoped repository write access or applies the prepared patch using authorised access. Then publish/review this Work checkpoint, followed by reviewed A00. No merge/release performed |

| Work ticket | Status | Start / acceptance dependency |
|---|---|---|
| W00 | BLOCKED; ADR and actual-base checkpoint delivered | Review arriving A00 proposal and close applicable findings; do not wait for A00 acceptance before reviewing it |
| W01 | NOT_STARTED | Start A00; accept A01/A02 |
| W02 | NOT_STARTED | Start W01/A03; accept A04/A05/A06/B04 |
| W03 | NOT_STARTED | Start W02; accept A07/B06/C02, exact candidate and all required evidence |

The human must place the already available approved original at `docs/source/ORVIA_Version_1_Unified_Master_with_Version_2_AI_Roadmap.md`. Codex supplies A00's exact commit, inventory, executable contracts/generated interfaces, dependency lockfile, isolated preflight/start/reset evidence and explicit UI layout/entry transfer. Work will review those actual artifacts and route bounded corrections to their owner.

Canonical task/test definitions live in `tracking/tasks.json` and `tracking/acceptance.json`; generated views must match. Task `commit` remains null while no accepted task commit exists. This checkpoint does not populate W01–W03 reports or mark any prototype test passed. Failed runs and retests must be retained against their original code-under-test SHA; candidate-changing fixes require relevant reruns.

See [W00 review](docs/reviews/work/W00_SCOPE_AND_CONTRACT.md), [ADR-001](docs/decisions/ADR-001-prototype-profile.md), [task board](docs/prototype/TASK_BOARD.md) and [handoff](handoffs/work/W00-96b8bd7.md).
