# Bounded reference update for company-facing names

The user explicitly requested projectwide, company-facing file naming and reference integrity. The ten Codex-owned maintained `docs/engineering/A00*` through `A07*` documents are being renamed to responsibility-based filenames. Their current path strings occur in the following Work-owned current references: `tracking/tasks.json`, `docs/ux/UI_COPY.json`, `docs/prototype/TASK_BOARD.md`, `docs/prototype/FULL_ORVIA_COVERAGE.md`, `docs/prototype/DEMO_SCRIPT.md`, `docs/prototype/CONTRACT.md`, and `docs/demo/EVIDENCE_INDEX.json`. The feature-screen relocation also changes exact evidence paths in Work-owned `tracking/capabilities.json`. This record bounds the cross-lane update to exact path-string replacement only, with no status, requirement, acceptance, or historical evidence mutation. Historical publication manifests and command artifacts keep their recorded path snapshots.

Base HEAD: b70732693768cdd1ee814faf830d2c1d63ced567. No ownership of those files is otherwise transferred.

## Root folder relocation extension (2026-09-23)

The user's follow-up explicitly requested dedicated top-level frontend, backend, database and related folders. This extends the reference-only transfer to exact path-string replacement in current `docs/prototype/*.md` and `tracking/capabilities.json` after the physical move. Requirement, owner, task, status and acceptance semantics were not changed. The old `packages/ui/**` in planning documents remains a historical proposed path because no such package exists in the delivered tree. Historical review evidence and raw artifacts retain their original paths and hashes.
