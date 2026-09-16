# A00 executable local foundation

Run from the repository root in PowerShell. Docker Desktop must already be available and approved. These are development-only synthetic profiles; no production deployment is qualified. Use the workspace toolchain, not the machine's pnpm shim.

```powershell
.\scripts\bootstrap-tools.ps1
node scripts/record.mjs install --frozen-lockfile
node scripts/record.mjs profile:init codex-a00
node scripts/record.mjs services pull
node scripts/record.mjs services up
node scripts/record.mjs db:migrate
node scripts/record.mjs preflight
node scripts/record.mjs contracts:check
node scripts/record.mjs typecheck
node scripts/record.mjs lint
node scripts/record.mjs test
node scripts/record.mjs tracking:check
node scripts/record.mjs hygiene:check
node scripts/record.mjs services:smoke
node scripts/record.mjs build
node scripts/record.mjs web:smoke
.\scripts\dev.ps1 start
```

`profile:init` is one-time and refuses to replace any existing or partial profile. Credentials are generated locally in ignored `.local/profiles/<name>/`; do not print, commit or share them. The default profile is `codex-a00`. Set `$env:ORVIA_PROFILE='ui-b00'` in the UI worktree before initializing/starting its profile. Configuration is validated against the canonical allowlist; arbitrary database names, hosts and URLs are not accepted. `services up` starts containers; only `preflight` verifies protocol readiness. The migration is safe to rerun: a checksum-protected ledger, advisory lock, identity check and one transaction prevent duplicate or changed application.

| Profile | Compose project / Temporal namespace | App | PostgreSQL | OPA | Temporal | Database |
|---|---|---|---|---|---|---|
| codex-a00 | orvia-codex-a00 | 4310 | 55431 | 58181 | 57233 | orvia_codex_a00 |
| ui-b00 | orvia-ui-b00 | 4320 | 55432 | 58182 | 57234 | orvia_ui_b00 |
| rehearsal | orvia-rehearsal | 4330 | 55433 | 58183 | 57235 | orvia_rehearsal |

All host listeners bind 127.0.0.1. Each Compose project owns separate postgres_data/temporal_state volumes, profile identity and credentials. Artifacts are written under the current worktree's `handoffs/codex/artifacts/` with unique timestamp/UUID names; the UI lane must keep its browser artifacts in its own handoff/artifact directory. The UI worktree and rehearsal profile were not started or tested in this run. Only `codex-a00` has measured service evidence.

The seed name `aster-birch-v1` is frozen for A01/A02's fictional Aster/Birch organisations and principal mappings. The executable A00 fixture is only `bootstrap-probe-v1`; there is no completed business seeder. The command `services:smoke` inserts a fresh random synthetic probe, runs a real Temporal worker and restarts only this profile's PostgreSQL/Temporal containers. It verifies persistence and invalid-reset guards. Do not run concurrently with another lane using the same profile.

```powershell
node scripts/record.mjs reset:bootstrap codex-a00 codex-a00-bootstrap-only
node scripts/record.mjs services status
node scripts/record.mjs services stop
```

Reset requires the exact profile and confirmation, possession of its local operator credential, matching installation/database identity, no running Temporal workflows and only the three bootstrap tables. It saves an intent artifact before the deletion transaction and then records the outcome. It deletes only bootstrap probe rows, preserving migration/profile identity and all Temporal history. It refuses application/business tables. This is not A06's full fault/reset or target-restore implementation. No `down -v`, arbitrary SQL or arbitrary shell reset surface is exposed.

`record.mjs` records the exact command, start/end, actual exit code, base commit and SHA-256 of source files present before execution, plus raw output. Source-tree hashes identify uncommitted implementation accurately. Failed attempts remain available. A00 outputs are engineering checks and bootstrap subsets, never full T01/T28 or application acceptance. PowerShell exploratory inspection commands and the auto-review audit rejection are separately described in the handoff.

Only `/` and `/healthz` are implemented HTTP routes. Liveness returns `{"status":"alive"}` and discloses no database details. Actual readiness is the protected local operator preflight, not a public service-detail endpoint. Staff/principal runtime auth and all business APIs remain A01+. No development default login exists.
