# 02 — Tenant Management and Isolation (M02, NFR-01)

Scope: organisation, legal entity, environment, subtenant separation; scoped queries, jobs, caches, exports; suspension.
References: PRD FR-M02-01..04, NFR-01; master §5, §7, §35, §36, §101; acceptance T01–T03.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-026 | Tenant A reads Tenant B resource by ID | Tenants A and B with requests, consents, evidence | 1) As Tenant A admin, GET each B resource type by direct ID | Denied before disclosure; response identical to "not found" for nonexistent IDs; no timing oracle | P0 | SEC | T01 |
| TC-027 | Tenant A mutates Tenant B resource | Same as TC-026 | 1) PATCH/DELETE/POST against B IDs from A session | Denied; B unchanged; audit in A records denied attempt without B details | P0 | SEC | T01 |
| TC-028 | Pooled DB connection retains old tenant context | Connection pool shared | 1) Run alternating A and B requests at high concurrency (1000+); 2) Compare returned rows to expected owner | Zero cross-tenant rows; context reset per request | P0 | SEC | T02 |
| TC-029 | Background task without authorised tenant | Job enqueued with missing tenant context | 1) Worker picks job | Rejected and audited safely; no default tenant fallback | P0 | SEC | T03 |
| TC-030 | Cached data after tenant switch | User belongs to Subtenant A and B | 1) Load dashboard in A; 2) Switch to B; 3) Inspect lists, counts, search suggestions | No A data visible in B; caches keyed by scope | P0 | SEC | M02 failure paths |
| TC-031 | Foreign key to another tenant's record | Tenant A creating a processing activity | 1) Submit reference to a B system ID | Rejected; error does not reveal B's record exists | P0 | SEC | FR-M02-02 |
| TC-032 | Cross-tenant search | Search index holds both tenants | 1) Search a string that exists only in Tenant B | No hits, no snippet, no count leakage | P0 | SEC | NFR-01 |
| TC-033 | Cross-tenant export | Export job | 1) Craft export request with B scope params from A | Denied; no artifact produced | P0 | SEC | FR-M02-02 |
| TC-034 | Object storage path traversal across tenants | Attachments stored per tenant | 1) Request attachment path using ../ or B's object key | Denied; paths are scoped and not user-controlled | P0 | SEC | NFR-01 |
| TC-035 | Legal entities kept separate within a group | Org with Legal Entity X and Y | 1) Principal grants consent under X; 2) Evaluate processing for same principal under Y | Consent is not inferred for Y; decision for Y is BLOCK/INDETERMINATE per policy | P0 | LEGAL | FR-M02-01; Act §6 |
| TC-036 | No automatic tenant per employee | Invite 20 staff | 1) Inspect tenant/org records | Memberships created; no new tenants created | P2 | FUNC | FR-M02-01 |
| TC-037 | Wrong environment mutation | Admin with Staging-only grant | 1) Publish policy to Production | Denied; Production unchanged | P0 | SEC | M02 failure paths |
| TC-038 | Organisation update uses version check | Two admins edit org profile | 1) Both submit with same base version | Second write conflicts; no lost update; audit shows both | P1 | CONC | FR-M02-03 |
| TC-039 | Suspension preserves evidence | Subtenant with evidence and active restrictions | 1) Suspend subtenant; 2) Inspect evidence and restrictions | Evidence intact; accepted withdrawals/suppressions remain enforced; no relaxation | P0 | FUNC | FR-M02-03 |
| TC-040 | Suspension continuity for in-flight work | Rights request mid-execution | 1) Suspend subtenant | Defined continuity: in-flight work handed off/paused per policy and visible; deadlines not silently reset | P1 | REC | FR-M02-03 |
| TC-041 | Vendor commercial store is separate | Vendor DB and runtime DB | 1) Inspect schemas/connection strings/keys; 2) Try runtime credentials on vendor store and vice versa | No shared database, cookie store or privileged key | P0 | SEC | FR-M02-04 |
| TC-042 | Scoped operation survives restart | Long request in Tenant A | 1) Restart API and worker mid-operation | Operation resumes in Tenant A only; scope retained | P1 | REC | M02 acceptance |
| TC-043 | Error messages do not leak tenant existence | Two tenants | 1) Trigger unique-constraint and FK errors using B's identifiers | Generic safe error; no raw DB error text | P1 | SEC | DATA_MODEL §scope |
| TC-044 | Subtenant admin cannot see parent-level data | Subtenant admin | 1) Browse org-level policies, other subtenants, org audit | Only own subtenant scope visible | P0 | SEC | FR-M02-01 |
| TC-045 | Delegated environment administration | Owner delegates Staging admin to U | 1) U administers Staging; 2) U attempts org settings | Staging actions allowed and audited; org settings denied | P1 | FUNC | FR-M02-03 |
