# Handoff ? B03 operations and evidence UI

Base 09882215c210bf9f94b6e9b38ec1a288bcfd9627. Contract 0.4.1, backend base 7f4f701, rehearsal / aster-birch-v1. Source-master identity is unchanged from B00.

Delivered real paginated workflow/failure/evidence directories, exact workflow plans/attempts/observations/reconciliations and local evidence export, policy preview, declared control map, all 33 read-only programme modules separately from runtime connectors. Overview includes recorded workflows. Failure-to-workflow links are found by exact authorized obligation membership, not inferred. Missing dispatch/outbox timestamps are not fabricated.

Fixed preserved UI helper findings: provider evidence is not labelled independent; empty obligations do not imply completion; future/expired/mismatched reads cannot verify; current scope must be affirmatively linked. Manual closure stays administrative.

Executed:
- `node tests/e2e/record.mjs B03 typecheck`: exit 0; browser/B03-typecheck-2026-09-17T05-08-07.681Z/command.json.
- `node tests/e2e/record.mjs B03 test`: initial exit 1, 11 passed and one test-file setup failed because the canonical workflow example has no action. Corrected the explicit unit fixture without changing runtime behavior.
- Same unit command: exit 0, 14/14 passed; browser/B03-test-2026-09-17T05-10-13.849Z/command.json. Original failure retained at browser/B03-test-2026-09-17T05-09-42.758Z/command.json.
- `node tests/e2e/record.mjs B03 lint`: exit 0; browser/B03-lint-2026-09-17T05-10-15.379Z/command.json.
- `git diff --check`: exit 0.

Exact source paths are this commit's operations.tsx, derive.ts, shell.tsx, workspace routes/overview and tests/unit/ui-evidence.test.ts. No backend/contracts/dependencies changed.

Known integration limitation: manual-task mutation requires expected_task_version, absent from Obligation reads in canonical contract 0.4.1. UI displays explicit unavailability and never guesses version zero. Producer owner Codex/contracts, semantic review Work; minimal follow-up is expose the authorized current manual task version with schema version/tests coordinated. Retest two competing manual submissions and stable committed replay. Other operational screens proceed independently.

Browser execution remains NOT_RUN pending B04/B06 suite and human CA trust approval. Work acceptance not claimed. Next: Test Lab, complete real browser tests, consolidated review and new candidate/package.
