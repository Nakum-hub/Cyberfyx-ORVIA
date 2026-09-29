# Handoff — RELAY-MEMORY-01 — Codex

**Base commit:** 9e4bf8c0efa813fce677fecbabb949fcf45d63a0.
**New commit:** the commit containing this handoff on `codex/relay-memory-20260929`.
**Source master / hash verified:** revision 1.4, SHA256 C51102A7CDA5FE15C1346E8C34167C406E186C691E9BA86576A3D8FD03BB550B; additive 1.5/1.6 scope unchanged.
**Contract version:** base branch contract unchanged; no API changes.
**Scope and profile:** Compose configuration only; synthetic interpolation values; no running profile altered.

## Delivered

- `infrastructure/compose.yaml`: raise loopback relay memory from 64m to 256m. Claude's 0ee17e4 handoff reports four OOM kills at 64 MB, idle RSS around 45 MB, and a successful upgrade suite with a temporary 256 MB override. Matching that tested value provides more headroom than an untested 128 MB setting.
- This handoff and `handoffs/codex/artifacts/relay-compose-config.log` record validation.

## Commands actually executed

| Command | Exit code | Result | Artifact / environment |
|---|---|---|---|
| `docker compose -f infrastructure/compose.yaml config --format json` followed by assertion `services.loopback.mem_limit == 268435456` | 0 | PASS, 256 MiB resolved | relay-compose-config.log; synthetic project/database/namespace/ports and nonexistent synthetic secret directory; config only |
| `git diff --check` | 0 | PASS | worktree |

Docker CLI warned that its user config was unreadable under the sandbox; Compose rendering and the memory assertion succeeded. No Docker engine mutation was needed.

Tests not run: local upgrade workload, sustained memory/load qualification. Claude's prior 256 MB upgrade pass is supporting evidence, not a Codex rerun.

## Acceptance

Configuration validation PASS. Customer runtime/load acceptance NOT_RUN. A larger memory ceiling is not a guarantee against all overloads.

## Contract / dependency / ownership changes

User explicitly authorized this infrastructure fix. No contracts, images, database state, ports or other service limits changed. The configured maximum increases by 192 MiB per installation, without reserving that entire amount as idle usage.

## Remaining limitations and blockers

Existing containers retain their current limit until the updated Compose configuration is applied by recreation or an explicit runtime update. No running container was changed in this task; Claude's reported temporary override is in its own runtime.

## Next integration action

Human merges this branch, then the runtime owner applies the updated Compose loopback service during a coordinated interruption and repeats the migration upgrade workload while observing OOM/restart state. No shared database reset is needed. Do not run a plain restart expecting it to pick up the new Compose memory limit.
