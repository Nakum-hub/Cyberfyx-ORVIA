# 18 — Privacy Incident Explorer (M17)

Scope: breach timeline, awareness clocks, multi-regime obligations, Board and affected-principal intimation, corrections, manual submission package.
References: PRD FR-M17-01..04; DPDPA Act §8(6) (breach intimation to Board and each affected principal), Rule 7 (initial intimation without delay; detailed information within 72 hours subject to allowed extension); CERT-In directions (listed incidents within 6 hours — separate regime); acceptance T36, T37, BUILD-13.
All cases start **NOT_RUN**. Clock values come from reviewed rule packs; record the pack version used.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-353 | Record occurrence/detection/awareness separately | New incident | 1) Enter three timestamps | Stored separately with source and reviewer | P0 | FUNC | FR-M17-01 |
| TC-354 | DPDP Board detailed-report clock | Awareness recorded; DPDP pack applies | 1) View obligations | Board detailed-information task due per pack (Rule 7: 72 hours from awareness); initial intimation "without delay" task present | P0 | LEGAL | Rule 7 |
| TC-355 | Affected principal intimation task | Breach affects principals | 1) View obligations | Separate task to intimate each affected principal with pack-defined content | P0 | LEGAL | Act §8(6), Rule 7 |
| TC-356 | CERT-In clock independent | Incident also a CERT-In listed type | 1) Mark applicability | Separate CERT-In task with its own clock (6 hours per pack) and recipient | P0 | LEGAL | T36; CERT-In |
| TC-357 | Multiple regimes independent | DPDP + CERT-In + sector regulator | 1) View | Independent triggers, deadlines, recipients; completing one doesn't close others | P0 | FUNC | T36 |
| TC-358 | Awareness timestamp corrected | Awareness corrected earlier by 5 hours | 1) Correct | Correction auditable; old clock history preserved; new due times shown; no silent restart | P0 | FUNC | T37, BUILD-13 |
| TC-359 | Extension recorded | Extension permitted by pack | 1) Record extension request/approval | Extension evidence recorded; original due time retained | P1 | LEGAL | Rule 7 extension |
| TC-360 | Initial sent, detailed pending, legal review unresolved | Incident mid-response | 1) View | All three states shown independently | P0 | FUNC | M17 acceptance |
| TC-361 | Unsent remains unsent | Draft never dispatched | 1) View | Not shown as notified | P0 | FUNC | BUILD-13 |
| TC-362 | Manual submission package | No authorised filing channel | 1) Generate package | Package with required fields per pack; marked for manual submission; no fake filing | P0 | FUNC | FR-M17-04 |
| TC-363 | Severity is configured policy | Severity rules | 1) Change rules | Severity recomputed deterministically; not "inferred law" | P1 | FUNC | FR-M17-02 |
| TC-364 | Affected scope with uncertainty | Unknown number of principals | 1) Record | Scope stored with uncertainty; not rounded to zero | P1 | FUNC | FR-M17-02 |
| TC-365 | Processor-originated breach | Processor reports breach | 1) Log | Processor linked; fiduciary obligations created; processor response tracked | P1 | LEGAL | Act §8(6) |
| TC-366 | Overdue review escalation | Review not done before due | 1) Wait | Escalation to configured owner | P1 | FUNC | FR-M17-04 |
| TC-367 | Partial delivery of principal notifications | 10,000 recipients, 300 bounces | 1) Dispatch | Delivered/failed counts accurate; failed list actionable | P0 | FUNC | M17 failure paths |
| TC-368 | Pending applicability | Unsure if CERT-In applies | 1) Leave pending | Pending shown; clock visibility per pack; no silent drop | P1 | LEGAL | M17 failure paths |
| TC-369 | Conflicting timestamps | Two sources give different detection times | 1) Record both | Conflict visible; reviewer decides; both retained | P1 | FUNC | M17 failure paths |
| TC-370 | Incident links to controls and evidence | Incident caused by failed control | 1) Link | Control, gaps and evidence linked | P1 | FUNC | FR-M17-02 |
| TC-371 | Incident notification content per principal | Principal notifications | 1) Render | Each principal sees only their own breach details | P0 | SEC | M10 acceptance |
| TC-372 | Incident access restricted | Member without incident role | 1) Open incident | Denied | P1 | SEC | FR-M01-04 |
| TC-373 | Clock timezone | Awareness entered in IST | 1) View due time in UTC server | Correct conversion; unambiguous display | P1 | FUNC | NFR-05 |
| TC-374 | Incident closure keeps obligations visible | Close incident with pending obligation | 1) Close | Blocked or pending obligation remains visible | P0 | FUNC | FR-M17-03 |
