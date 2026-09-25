# 03 — Privacy Control Graph (M03)

Scope: data inventory, processing activities, lineage, provenance, impact analysis, historical versions.
References: PRD FR-M03-01..04; master §4, §8, §9, §49, §62, §105, §157; acceptance T04, T34.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-046 | Trace purpose to evidence | Purpose "Order fulfilment" linked to datasets, systems, processor, control, evidence | 1) Open purpose; 2) Traverse to data, systems, processors, controls, actions, evidence | Every hop resolves with provenance and version; no dead links | P1 | FUNC | FR-M03-01 |
| TC-047 | Asserted vs observed provenance | Customer declares a field; connector later discovers same field | 1) View field record | Both provenance types shown separately with review state, recorded time and freshness | P1 | FUNC | FR-M03-02 |
| TC-048 | Purpose not inferred from field name | Connector discovers column "aadhaar_no" and "health_note" | 1) Complete discovery | Fields flagged for review; no purpose or sensitive category auto-approved from name | P0 | FUNC | FR-M03-02 |
| TC-049 | Partial discovery stays partial | Connector scan interrupted at 60% | 1) View inventory and coverage | Inventory marked partial; no complete-coverage claim | P0 | FUNC | M03 acceptance, T17 |
| TC-050 | Revoked scan permission | Discovery identity loses read permission | 1) Run scheduled discovery | Snapshot marked stale/failed; coverage decreases; gap created with owner | P1 | NEG | M03 failure paths |
| TC-051 | Processor change produces impact set | Purpose uses Processor P1 | 1) Replace P1 with P2 for that purpose | Reviewed impact set lists affected policies, workflows, tests, assessments, notices and owners | P0 | FUNC | FR-M03-03, T34 |
| TC-052 | New data destination requires impact review | Policy diff adds a new recipient | 1) Submit change | Impact review and relevant tests required before publish | P0 | FUNC | T34 |
| TC-053 | Old evidence resolves original graph version | Evidence recorded under graph v3; graph now v7 | 1) Open old evidence | Links resolve to v3 entities, not rewritten to v7 | P0 | FUNC | T04, FR-M03-04 |
| TC-054 | Personal payload deletion leaves justified tombstone | Principal record deleted | 1) Inspect graph links referencing that principal | Only tombstone/integrity references remain with deletion justification; no invisible history rewrite | P1 | FUNC | FR-M03-04 |
| TC-055 | Bounded traversal | Large graph (100k nodes) | 1) Request unbounded traversal | Traversal bounded/paginated; no full graph loaded in browser; response within budget | P1 | PERF | FR-M03-03 |
| TC-056 | Traversal respects authorisation | Member scoped to Subtenant A | 1) Traverse from shared system into B's processing activities | B nodes hidden; counts do not leak | P0 | SEC | FR-M03-03 |
| TC-057 | Unknown destination shown as unknown | Data flow to unobserved endpoint | 1) View flow | Destination marked declared/unknown, not invented or green | P1 | FUNC | DATA_MODEL graph |
| TC-058 | Conflicted identity link | Two records linked to same principal with conflicting attributes | 1) View link | Marked conflicted; no automatic merge used for rights actions | P1 | NEG | M03 failure paths |
| TC-059 | Keyword search in inventory | Inventory populated | 1) Search dataset/field/purpose names | Correct results within scope; relevant hits ranked; no out-of-scope results | P2 | FUNC | FR-M03-03 |
| TC-060 | Cross-border transfer attribute recorded | Processing copy stored outside India | 1) Record region; 2) Check transfer review | Region captured; transfer flagged for assessment against current Act §16 restrictions (no hard-coded country list) | P1 | LEGAL | Act §16; master DPDP baseline |
