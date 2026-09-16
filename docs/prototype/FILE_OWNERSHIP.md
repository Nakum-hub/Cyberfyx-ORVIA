# File ownership, isolated work and merges

## One writer per path

| Path | Writer | Constraint |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md`, `CURRENT_STATE.md` | Work, human-approved | Other tracks submit changes in their handoff, not simultaneous edits |
| `docs/source/**` | Human-controlled | Approved originals only; no agent rewrites |
| `docs/prototype/EXECUTION_PLAN.md`, `CONTRACT.md`, `FILE_OWNERSHIP.md`, `SOURCE_ALIGNMENT.md`, `docs/decisions/**`, `docs/reviews/work/**` | Work | Contract changes need producer/consumer coordination |
| `tracking/tasks.json`, `tracking/acceptance.json` and their generated Markdown views | Work | Results require actual evidence; no automatic task completion from target labels |
| `tracking/contract_seed.json` | Codex after bootstrap handoff | Seed mirrors the approved semantic contract; canonical executable schemas live in packages/contracts |
| `tracking/capabilities.json`, `docs/prototype/UX_BRIEF.md`, `DEMO_SCRIPT.md`, `RELEASE_CHECKLIST.md`, `docs/ux/**`, `docs/demo/**`, `docs/runbooks/**`, `docs/reviews/cowork/**` | Work | Release checks/reports describe actual engineering evidence, not invented commands |
| **All** `package.json` files, package-manager lockfile, root config/CI, TS/build/lint config | Codex | Codex coordinates dependency/config and UI changes |
| `packages/contracts/**`, `packages/domain/**`, `packages/db/**`, `packages/auth/**`, `packages/authz/**`, `packages/connectors/**`, `packages/policy-sdk/**`, `packages/testing/**` | Codex | Includes generated contracts/client transport; no frontend-only copy |
| `apps/web/src/app/api/**`, `apps/web/src/server/**`, auth middleware/server entry points | Codex | UI imports permitted client interfaces only; no secrets bundled client-side |
| `apps/worker/**`, `apps/agent/**`, `apps/demo-targets/**`, `policy/**`, `infrastructure/**`, `scripts/**`, `docs/engineering/**` | Codex | This includes fault/reset implementation and target allowlists |
| `apps/web/src/app/workspace/**`, `apps/web/src/app/privacy/**`, client components/styles/assets, `packages/ui/**` | Codex | Excludes any server/auth authority and any dependency manifest |
| `apps/web/src/app/layout.tsx` and UI bootstrap entry files | Codex | Transfer explicitly recorded in A00 handoff before B00 starts |
| `tests/unit/**`, `tests/integration/**`, `tests/security/**`, `tests/recovery/**`, `tests/fault-fixtures/**` | Codex | Work reviews; fixes remain with Codex unless reassigned |
| `tests/e2e/**`, UI component tests and browser screenshots | Codex | No shared-data reset without named isolated profile |
| `handoffs/TEMPLATE.md` | Work | Shared format restored unchanged from the matching v1 kit |
| `handoffs/<lane>/**` | That lane | Unique task/commit filenames; other lanes read only |
| Integration branch and release approval | Human | Small reviewed merges; no agent silently overwrites another branch |

A00 can map these logical paths onto a compatible existing repository once. Record that mapping before parallel implementation. Do not have one lane follow a new tree while the other follows the existing one.

## Branches/worktrees

After the first shared scaffold commit, use one integration checkout and isolated worktrees, for example:

```sh
# Example structure, not commands executed by this kit.
# Run only from the confirmed repository after A00's first commit.
git worktree add -b prototype/backend ../orvia-backend
git worktree add -b prototype/ui ../orvia-ui
git worktree add -b prototype/docs ../orvia-docs
```

Work may review the human integration checkout read-only and provide patches for owned docs. Work uses one isolated docs checkout and can use an isolated output folder; the former Cowork lane could use a docs worktree or an isolated output folder, depending on actual authorised tool access. Do not require unsupported automatic syncing. Use small commits per ticket and integrate one at a time.

**A Git worktree does not isolate running services.** Give each executable lane a distinct Compose project name, app port, database namespace/volume, Temporal namespace/state and artifact directory. Never let a UI test reset the backend integration database. Keep one separately identified rehearsal profile with the frozen candidate. Do not share active `.env` secrets through chat or Git.

## Integration sequence

1. Owner works from recorded base commit and one task with start dependencies satisfied.
2. Owner runs its targeted normal and negative tests in its isolated profile.
3. Owner posts a factual handoff; Work reviews semantics and another lane reviews relevant user-facing consequences.
4. Human integrates the commit onto the integration branch; do not merge unrelated formatting/rewrite changes.
5. Re-run relevant contract/integration/browser smoke tests against the integrated build, not only the feature branch.
6. Work records accepted state, candidate commit and next task. Other lanes synchronise from the approved commit before starting dependent work.

## Contract/change request

Include `change_id`, reason, current contract version, exact affected fields/routes/enums, producer changes, consumer changes, migration effect, tests and owner. Codex is the schema writer; Work reviews meaning; Codex confirms producer and consumer binding changes. Bump the contract version and regenerate artifacts together. No second endpoint with different semantics just to avoid coordination.

If blocked, state the dependency and continue an independent owned task. Never invent missing success data, remove tests, alter the product boundary or quietly take over another lane's files.

## Accepted A00 transfer — 2026-09-16

Work accepts the human-integrated A00 base `58ceddcd73b9b9f0717553bbd1e2fff3f7389abe`, contract 0.2.1. After the human integrates this shared record, Codex's existing A00 handoff transfer of `apps/web/src/app/layout.tsx` and `apps/web/src/app/page.tsx` takes effect for Claude Code/B00. Health/API/server/auth, Next/root configuration, manifests, dependencies and executable schemas remain Codex-owned. B00 uses isolated `ui-b00` and shared generated clients; C00 is needed for B00 acceptance, not its start. Codex retains the accepted seed/generator metadata writer role. Work review reproducers/artifacts under docs/reviews/work are review evidence, not application fixes.

## Human-authorised successor transfer — 2026-09-16

Work now owns every former-Cowork path above, including document tools/tests and the genuine capability register; Codex inherits all unfinished UI/component/browser responsibilities under unchanged B IDs, including layout/page. The accepted A00 transfer above remains a historical record. No unfinished implementation is accepted by reassignment. One canonical Work writer: `prototype/work/cowork-r4-completion`, isolated checkout; no other checkout is modified. See [takeover record](../../handoffs/work/C00-C02-r4-owner-transfer.md). Existing dependencies, test IDs, accepted commits and human merge/release control remain in force.
