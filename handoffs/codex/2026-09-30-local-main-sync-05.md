# V1-SYNC-05 — local GitHub source synchronization

- Base: `bf29c436911d33cbbafcbb6ce7f6d04a5704a64d`.
- Local main updated by fast-forward to `e20e4f510f51c3b9c1e9c6d11d23c1d742f048c6` (GitHub PR #35, 87 incoming commits).
- Scope: fetch GitHub updates, preserve pending work, fast-forward local main, regenerate the overlapping qualification inventory, check contracts, align cached dependencies.
- No integration merge, push, runtime restart, deployment, migration or database reset.

## Preservation

47 pending files were copied and SHA-256 verified in `.local/sync-preservation/20260930-205509/manifest.json`. All 46 non-generated files remained byte-identical after the fast-forward. Only `tracking/qualification-inventory.json` overlapped incoming changes; its original is backed up, and it was regenerated after the update to include the pending local discovery test. Nested worktrees were excluded from backup and left untouched.

The round-6 refresh remains available locally in `.worktrees/design-round6` on `codex/design-refresh-20261002` at `e4ad01a`; that branch is not merged into GitHub main. Other fetched branch tips were not combined into main. Existing demo processes were not upgraded by this source-only synchronization.

## Commands and exits

| Command/check | Exit | Result |
|---|---:|---|
| `git fetch origin` | 0 | Updated GitHub remote references |
| Copy pending files and compare SHA-256 | 0 | 47 verified backups |
| `git restore --source=HEAD -- tracking/qualification-inventory.json` | 0 | Only after verified backup |
| `git merge --ff-only origin/main` | 0 | Fast-forward only |
| Compare SHA-256 of 46 non-generated pending files | 0 | All preserved |
| `node node_modules/tsx/dist/cli.mjs scripts/qualification-inventory.ts` | 0 | Regenerated |
| `node node_modules/tsx/dist/cli.mjs scripts/qualification-inventory.ts --check` | 0 | MATCH |
| `node node_modules/tsx/dist/cli.mjs shared/contracts/src/generate.ts --check` | 0 | Contract 0.47.0; 8 artifacts, 455 route examples, 7 error examples |
| `git rev-list --left-right --count HEAD...origin/main` | 0 | 0 / 0 |
| `git diff --check` | 0 | PASS |

Commands use the pinned Node 24.21.0. Source changes are the upstream commits, regenerated inventory and this uncommitted handoff; prior pending edits remain uncommitted. Unit/integration/browser tests were not rerun for this synchronization; no acceptance promotion.

Dependency alignment: node .local/tools/package-manager/node_modules/pnpm/bin/pnpm.mjs install --offline --frozen-lockfile exited 0; 367 cached packages reused, zero downloads.
