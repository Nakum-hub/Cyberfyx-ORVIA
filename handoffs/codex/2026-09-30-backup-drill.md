# Handoff — R3-BACKUP — Codex

**Base commit:** ca8cc6e (Claude integration branch, fetched before work).
**New commit:** this handoff's commit on `codex/backup-drill-20260930`.
**Source master:** immutable revision 1.4 plus 1.5/1.6 and expanded baseline; unchanged.
**Contract:** 0.46.0. **Profile:** isolated synthetic codex-a00, customer migrations through 0070.

## Delivered

Backup/restore drill executed successfully after migrating a fresh isolated qualification database. No backup product change was needed. The pre-existing database could not be migrated safely: historical ledger entry `0048_grc` has no checksum match in current files, while `grc_frameworks` already exists. Migration failed with 42P07 and rolled back. No checksum was rewritten and no old database was reset.

The user explicitly approved a separate fresh synthetic qualification environment. Original stopped containers were retained as `orvia-preserved-20260930-{postgres,opa,loopback}`, with their original database volume intact. Qualification uses a new volume `orvia-qualification-20260930-postgres`, a separate network of the same prefix, new private credentials under this worktree's ignored `.local/profiles`, and a 256 MiB relay. Fixed profile container names/ports are temporarily used for the existing tooling; these are not Claude's cloud containers.

## Commands actually executed

Node 24.21.0, pnpm 12.4.2; cached tsx where stated. Logs/artifacts under `handoffs/codex/artifacts`.

| Command | Exit | Result / evidence |
|---|---|---|
| Direct PowerShell invocation of pnpm.mjs | launch failed | R3-backup-migrate.log; corrected by invoking through node, not a migration result |
| `node <pnpm.mjs> run db:migrate` on historical profile | 1 | R3-backup-migrate-retry.log; 42P07 |
| `tsx .local/diagnose-migration.ts` | 1 | R3-migration-diagnosis.log; checksum comparison and rolled-back repeat identify existing grc_frameworks |
| `node scripts/profile-init.mjs codex-a00` in fresh local directory | 0 | new isolated profile; credentials never printed |
| `tsx scripts/roles-init.ts confirm:codex-a00` | 0 | R3-isolated-roles.log |
| `node <pnpm.mjs> run db:migrate` on isolated profile | 0 | R3-isolated-migrate.log; A00-migration-1790707574274-d9b6295a-9156-4907-92ff-0451f559f6b1.json, 71 migrations through 0070 |
| `tsx scripts/auth-init.ts confirm:codex-a00` | 0 | R3-isolated-auth.log |
| `tsx scripts/auth-bootstrap.ts fixtures confirm:codex-a00` | 0 | R3-isolated-fixtures.log |
| `tsx scripts/machine-init.ts confirm:codex-a00` | 0 | R3-isolated-machine.log |
| `tsx scripts/backup-drill.ts confirm:codex-a00` | 0 | R3-backup-current.log; A00-backup-drill-1790707625547-cf202893-7a74-49a6-a39f-1cb337d61e0e.json |

## Acceptance

Local logical backup/restore PASS: 1,466,943 bytes, migration checksums and table counts identical, forced RLS retained; scratch restore database dropped. **Withdrawn registry-consent count was zero**, so this run does not independently prove preservation of a nonempty withdrawal population. Owner acceptance remains NOT_RUN. Off-host restore, production recovery objectives and customer-host qualification remain NOT_RUN.

## Contract / dependency / ownership changes

No contract, migration or product implementation changed. New local roles/databases were created only in the user-approved isolated environment. Changed tracked paths: this handoff and its R3/A00 execution artifacts.

## Remaining limitations and blockers

The historical profile still needs an explicit data-preserving migration reconciliation; this run neither repairs nor resets it. Its previous missing-consent-record failure is retained in the earlier qualification handoff. The clean current-schema result is a separate environment result, not a claim that the old database was repaired.

## Next integration action

Review evidence and coordinate any historical-profile reconciliation separately. No merge or acceptance promotion. Qualification environment lifecycle is recorded in the round-3 final handoffs.
