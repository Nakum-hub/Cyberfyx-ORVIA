# 16 — Retention Management (M15)

Scope: per-copy retention, erasure on purpose completion, inactivity erasure with prior warning, legal holds, suppression vs deletion, backups, restore quarantine.
References: PRD FR-M15-01..04; DPDPA Act §8(7)–(8); Rule 8(1)–(2) (scheduled inactivity erasure for specified classes and its 48-hour warning — particular scope), Rule 8(3) (minimum one-year retention of specified data/logs), Rule 6 (one-year security log retention); master §DPDP baseline; acceptance T09, T31–T33, BUILD-12, BUILD-19.
All cases start **NOT_RUN**. Durations and applicable fiduciary classes must be taken from the reviewed pack; record the value used.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-315 | Retention rule per copy/category/context | Same email in CRM, billing, analytics | 1) Configure rules | Each copy evaluated separately with trigger, source, min/max, permitted use, owner | P0 | FUNC | FR-M15-01 |
| TC-316 | Purpose served triggers erasure eligibility | Order completed, return window closed | 1) Run eligibility | Eligible copies proposed for deletion unless another constraint applies | P0 | LEGAL | Act §8(7)(a) |
| TC-317 | Withdrawal triggers erasure eligibility | Consent withdrawn for consent-only purpose | 1) Run eligibility | Copies used only for that purpose become eligible | P0 | LEGAL | Act §8(7) |
| TC-318 | Legal retention overrides erasure | Invoice under tax retention | 1) Evaluate | Retained, purpose-restricted; reason and release date recorded | P0 | LEGAL | Act §8(7) proviso |
| TC-319 | Longest duration is not a universal override | Two rules: 1 year marketing, 8 years tax | 1) Evaluate marketing copy | Marketing copy follows its own rule; tax rule applies only to tax-relevant copy | P0 | FUNC | FR-M15-02 |
| TC-320 | Inactivity erasure warning | Fiduciary class and period per pack; principal inactive | 1) Advance to warning point | Warning sent the pack-specified time (Rule 8: 48 hours) before erasure; evidence recorded | P0 | LEGAL | Rule 8(1)–(2) |
| TC-321 | Principal responds to warning | Warning sent | 1) Principal logs in / approaches before deadline | Erasure cancelled; activity recorded | P0 | LEGAL | Act §8(8), Rule 8 |
| TC-322 | Inactivity rule scope limited | Tenant not in pack's specified class | 1) Check scheduling | Inactivity erasure not auto-applied; configuration shows inapplicability | P1 | LEGAL | Rule 8 scope |
| TC-323 | Minimum log retention | Processing logs and traffic data | 1) Attempt purge before configured minimum | Purge blocked with reason (Rule 8(3)/Rule 6 per pack) | P0 | LEGAL | Rule 8(3), Rule 6 |
| TC-324 | Legal hold exact scope | Hold on principal P, system S | 1) Run deletion for P across S and T | S excluded; T processed | P0 | FUNC | FR-M15-02 |
| TC-325 | Hold released | Hold ends | 1) Release | Eligibility re-evaluated; not blindly deleted | P0 | FUNC | T32 |
| TC-326 | Marketing withdrawal plus retained transaction copy | As T31 | 1) Execute | Marketing stops; transaction copy restricted | P0 | LEGAL | T31, BUILD-12 |
| TC-327 | Stale generation deletion | Deletion planned at g1; record now g2 | 1) Execute | Blocked; re-evaluation | P0 | FUNC | T09 |
| TC-328 | Dependency order | Parent/child records | 1) Execute deletion | Children before parents per plan; no orphan errors | P1 | FUNC | FR-M15-03 |
| TC-329 | Budget and checkpointing | 1M eligible rows | 1) Execute | Batched within budget; checkpoints; resumable; target DB not overloaded | P1 | PERF | FR-M15-03 |
| TC-330 | Approval required for bulk deletion | Bulk deletion plan | 1) Execute without approval | Blocked | P0 | SEC | FR-M15-03 |
| TC-331 | Outcomes recorded separately | Deletion complete in live store; backup unverified | 1) View | Live, derived, processor, backup outcomes separate; backups remain unverified | P0 | FUNC | FR-M15-04 |
| TC-332 | Backup restores suppressed audience member | Restore old snapshot | 1) Restore | Quarantined; reconciled with suppression before audience use | P0 | REC | T33 |
| TC-333 | Unknown replica | Replica discovered not in plan | 1) Discover | Gap created; claim not verified-all | P1 | FUNC | M15 failure paths |
| TC-334 | Crypto deletion limitations (optional scope) | Crypto deletion enabled (V1-CONDITIONAL) | 1) Delete key | Key-copy limitations stated; not claimed as universal erasure | P2 | FUNC | FR-M15-04 |
| TC-335 | Lost response during deletion | Adapter response lost | 1) Observe | EFFECT_UNKNOWN; reconciliation before retry | P0 | REC | T19 |
| TC-336 | Retention change review | Retention period shortened | 1) Publish | Review and impact listing; no immediate mass deletion without approval | P1 | FUNC | FR-M15-02 |
