# Handoff - R5-03 - idle-crawl

**Base:** 5c806fc2b02368827e8b6b35f483e5a3c135cc90. **Branch:** codex/idle-crawl-20261002.
**New commit:** this handoff's branch commit. **Contract:** 0.46.0 unchanged.
**Scope:** only this handoff. Approved masters unchanged; no product, test, database, relay-limit, deployment, or acceptance changes.

## Result

Firefox full interface-crawl-local: NOT_RUN. A previous full crawl took about 20 minutes, exceeding the owner's new 15-minute maximum for the whole pass. No idle-crawl memory sample exists for this round. The startup memory sample in R5-host-memory.jsonl belongs to the WebKit audit and must not be described as idle Firefox evidence. All eight historical 503 visits remain unresolved; no earlier FAIL is promoted. Owner: Codex for a bounded idle-host reproduction and a focused fix if reproduced in its lane.

## Commands actually executed

No test command was executed for this item. Exit code: N/A (NOT_RUN). No trace was generated for an unexecuted test. Repository preparation/build and the tests actually run are recorded in the R5-01 handoff on codex/webkit-verification-20261002.

## Next dependency

The owner capped this pass at 15 minutes at 09:21 UTC. Remaining checks require a separately scheduled verification pass. No merge to main or acceptance promotion is authorized or performed.
