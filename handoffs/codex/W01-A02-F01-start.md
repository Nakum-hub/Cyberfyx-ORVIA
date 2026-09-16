# W01-A02-F01 correction start

Base: `397cb370bedaf45c3f62409e88fb891f7cd3b23e` on `prototype/codex/A02-A07-core`. A03 implementation and evidence remain committed. Unfinished A04 source/evidence is preserved in the local stash named `Preserve A04 work while correcting W01-A02-F01`; its already-applied synthetic migration is not reversed.

Read Work's `docs/reviews/work/W01_A02_REVIEW.md`, `W01_A02_CODEX_FIX.md` and optional SQL reproduction via `git show origin/main:<path>` at `3ce16c508ab4cfec520a04d0959e1365830e2cd5`. These files are absent on the continuation branch. Work's finding was source-reviewed, with PostgreSQL/application reproduction NOT_RUN.

Owned scope: domain configuration/consent, integration tests and their command registration, producer engineering notes, Codex evidence/handoff. No Work state/review edits, UI changes, contract shape/version changes, dependency changes or migration rewrites.

Plan: execute an HTTP/PostgreSQL regression against the original code; lock only newly-created test records/advisory keys and observe actual blocked backends before releasing after expiry. Correct consumption after lock acquisition using the advancing database clock. Run corrected expiry, consent/auth, unit, contract drift, typecheck, lint and build against the committed correction. Publish for Work retest, then restore unfinished A04 work. A02/W01 acceptance remains Work-owned.

Profile: `codex-a00`, local synthetic `aster-birch-v1`; no reset or real messages. Test fixture deadlines may be shortened only for IDs created by the test. Denials must preserve business rows; transport denial audit remains permitted.
