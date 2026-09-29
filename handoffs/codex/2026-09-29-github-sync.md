# V1-SYNC-02 — authorized GitHub update

**Base:** `cde902122b6afbdd10c1144a9d603c33ae46548e`.
**Updated HEAD:** `91e3d37578b193df943f3b3c8cf5ac85727ea590`, matching fetched `origin/main`, merged PR #29. No new commit or push.

The user explicitly authorized bringing Claude's published work into this folder. This authorizes this update and supersedes the earlier instruction to wait for it; it is not standing authorization for unrelated future updates.

Plan: inspect local and remote state; fetch origin; inspect incoming files and updated authority documents; preserve local changes; fast-forward only; verify preservation; check combined source and record limitations. Allowed paths are the incoming tracked changes and sync-specific inventory/status/evidence. No database migration, service start, permission change or deployment is included.

## Preservation and update

- `git fetch origin`: initial sandbox attempt failed because `.git/FETCH_HEAD` was not writable. Normal approved retry exited 0.
- Before updating, copied and SHA-256 hashed all **138** modified/untracked files into `.local/sync-preservation/2026-09-29-sync2-1790652909187/`. `manifest.json` records paths, hashes, base and target. Incoming paths did not overlap these local paths.
- `git merge --ff-only origin/main`: approved command exited 0. No stash, reset, merge commit or conflict resolution was needed.
- Post-update hash verification: **138 checked, zero mismatches**, exit 0; `after.json` records the result. Local commerce/connector work, reports, presentations and previous evidence were preserved byte-for-byte.
- `git rev-parse HEAD` and `git rev-parse origin/main` both returned the updated full hash above.

Incoming work includes customer contract 0.42.0, vendor/customer installation separation, vendor identity and auditor screens, the DPDPA audit exchange, customer migrations 0065–0067, vendor service migrations, Linux installation tooling, new baseline addenda 1.5/1.6, and Claude's test evidence. Imported evidence remains historical, not a new local execution result. Revision 1.6 is a recorded scope decision; presence of its document does not prove all its behavior is implemented.

## Local verification

Pinned executable: `.local/tools/node-v24.21.0-win-x64/node.exe`.

| Command arguments | Native exit | Result / artifact |
|---|---:|---|
| `--import tsx shared/contracts/src/generate.ts --check` | 0 | Contract 0.42.0; 8 artifacts and seed, 434 route examples, 7 error examples; `artifacts/V1-SYNC-02-contracts.log` |
| `--import tsx --test tests/unit/*.test.ts` | 0 | **318/318 PASS**, no skipped/cancelled tests; `artifacts/V1-SYNC-02-unit.log` |
| `--import tsx scripts/qualification-inventory.ts`, then `--check` | 0 | Regenerated/matched 146 files: 46 unit, 70 integration, 5 security, 7 Playwright, 10 browser/transport, 8 support |
| `git diff --check` | 0 | PASS after fast-forward |

`scripts/qualification-inventory.ts` received one deliberate post-preservation edit to classify the imported `tests/integration/vendor/harness.ts` as support; `tracking/qualification-inventory.json` was then regenerated. New test files were retained in their proper executable categories. Other deliberate local edits in this sync are this handoff, its check logs and the current-state checkpoint.

Windows runner startup timed out once while editing the inventory; the retry succeeded. Parallel checks were slow. The full typecheck stalled without a result. An attempted stop of that specifically identified process returned a Windows `Stop-Process` error; its printed success message was not treated as proof of termination. After rechecking its command identity, approved `taskkill /PID 27248 /T /F` succeeded (exit 0). **Typecheck is INTERRUPTED, not PASS**, and needs a fresh serial run before combined-source qualification. Its log is `artifacts/V1-SYNC-02-typecheck.log`. The requested source update itself completed successfully. No verification process from this task remains active.

## Integration limits / next dependency

- The local uncommitted `0003_licence_fulfilment.sql` and incoming `0003_vendor_service.sql` share a numeric prefix. The incoming runner keys and sorts full filenames, so both files are preserved, but their combined migration history/order still needs review and execution in an isolated database.
- Incoming `0005_vendor_rls_everywhere.sql` deliberately denies application-role access to commercial tables. The local commerce service is not yet bound to this vendor installation's production authorization/database role. Prior isolated commerce evidence does not qualify the combined vendor schema or role configuration.
- The new baseline addenda need integration into release provenance and requirement mappings; the earlier revision-1.4/E1 checks alone are not complete scope provenance for the new decisions.
- No runtime migration, build, integration/browser suite, installer or production qualification was executed during this source sync. Local changes remain uncommitted. No acceptance state was promoted.

The requested source update is complete. Continue combined-source integration and isolated migration/runtime verification before claiming the imported features work against this machine's existing database.
