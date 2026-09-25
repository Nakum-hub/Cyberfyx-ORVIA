# ORVIA V1 capacity target: 1 million records per organisation

**Decision (25 September 2026):** the user set the first capacity target at **1,000,000 total records per customer organisation**, across data types. This is a load target to build and verify, not a measured production claim. Data remains customer-local. A larger customer must receive an explicit supported capacity result; the phrase “handle anything” does not remove hardware, storage, time or connector limits.

## Required behaviour

- Interactive lists use bounded keyset pages scoped by tenant, legal entity and environment. A stable sort needs a unique tie-breaker. An absent row or partial connector page is never treated as complete coverage.
- Report/export paths must process bounded batches and state whether the result is complete. A multi-part export needs a durable manifest with scope, filter, row counts, part digests, overall digest, actor, creation time and omission reasons. It must be auditable and resumable after interruption without treating an incomplete package as final.
- The browser must never receive a million-row JSON report or build a million-row DOM/PDF. Large exports need customer-local background work, bounded memory and backpressure. Section summaries and drill-down pages can remain interactive.
- RLS and server-side capability checks apply to every page and job. Cursor tokens must bind scope, filter and ordering; retries may not silently change the population represented by a completed export.
- Capacity includes ingestion, query, report/export, workflow processing, audit, backup and restore. A successful SQL query alone is insufficient.

## Current verified design gaps

| Path | Current implementation | Required work before capacity acceptance |
| --- | --- | --- |
| Report builder | Each section is capped at 2,000 rows; the whole report is one JSON response and browser print. | Durable, paged report/export job with complete manifest and bounded rendering. Keep the small print view labelled as such. |
| Audit export | Refuses matches above 5,000, then materialises the set in JSON. | Partitioned or streamed customer-local export with exact completeness evidence. |
| Interactive lists | Most use bounded pages; some UUID cursors do not follow time order. | Benchmark each high-volume route, stabilize time/id cursors where needed, and test concurrent insert behavior. |
| Database | Scoped primary keys exist; chronological report/event scans lacked matching composite indexes. | Apply `0040_capacity_indexes.sql` in an isolated runtime and verify plans with representative data. |
| Load evidence | No 1M mixed-workload run exists. | Run 1M synthetic organisation load, record hardware, workload mix, latency, throughput, memory, disk, errors and recovery. |

`scripts/capacity-probe.ts` is a narrow first measurement: one million synthetic rows in a transaction-local PostgreSQL table, with scoped first/deep keyset pages. On the isolated Codex profile, both returned 101 rows through index scans; the recorded query times were 11.76 ms and 4.54 ms (artifact `handoffs/codex/artifacts/A00-capacity-probe-1790309594947-365288d5-ab3f-4419-83fb-440d0bf4683b.json`). This does not exercise RLS, API authentication, reports, exports, jobs or concurrent clients. Its result cannot promote this target to PASS.

## Acceptance evidence still required

1. Freeze a synthetic workload mix that totals one million records for one organisation, including consent, audit, rights, graph, incident, import and workflow records. Record the mix instead of inventing a production distribution.
2. Run isolated ingestion and read tests, then concurrent reads/writes and an interrupted/restarted export. Verify exact counts, no duplicates or omissions, cross-organisation and sibling-scope denial, bounded memory and audit coverage.
3. Run backup/restore and reconciliation against the same dataset, recording elapsed time and recovery outcome.
4. Record the machine profile, database settings, generated artifact IDs and measured performance. Agree customer-specific service thresholds and hardware sizing from those measurements before a production promise.

**Status:** NOT_RUN for end-to-end 1M acceptance. A component probe, even when it succeeds, remains component evidence.
