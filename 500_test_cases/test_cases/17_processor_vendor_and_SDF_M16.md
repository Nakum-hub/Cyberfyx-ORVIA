# 17 — Processor/Vendor Management and Significant Data Fiduciary (M16)

Scope: processor relationships and contracts, notifications/acknowledgements, assessments and findings, SDF applicability (DPIA, audit, DPO in India).
References: PRD FR-M16-01..04, FR-X-03; DPDPA Act §8(2) (processor only under valid contract), §8(5) safeguards, §10 (SDF obligations), Rule 6 (processor-contract provisions), Rule 13 (SDF assessment/audit); acceptance T34.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-337 | Processor record completeness | New processor | 1) Create | Purpose, data scope, subprocessors, region, contract ref, owner, incident contacts captured | P1 | FUNC | FR-M16-01 |
| TC-338 | Processing without contract reference | Processor lacks contract | 1) Link processor to purpose | Flagged; activation requires contract evidence or recorded exception | P0 | LEGAL | Act §8(2) |
| TC-339 | Expired contract evidence | Contract end date passed | 1) Daily check | Finding raised with owner; affected purposes listed | P1 | LEGAL | M16 failure paths |
| TC-340 | Unapproved subprocessor | Processor reports new subprocessor | 1) Record | Unapproved state; review task; no silent approval | P0 | LEGAL | M16 failure paths |
| TC-341 | Notification vs acknowledgement vs verification | Erasure instruction to processor | 1) Send; 2) Receive ack; 3) Verify | Three separate facts; ack not treated as verification | P0 | FUNC | FR-M16-02 |
| TC-342 | No acknowledgement | Processor silent | 1) Wait past configured window | Escalation task; status "not acknowledged" | P1 | FUNC | M16 failure paths |
| TC-343 | Missing API becomes coordination work | Processor without integration | 1) Plan action | Attributed manual coordination task | P1 | FUNC | FR-M16-02 |
| TC-344 | Processor change triggers control review | Swap processor | 1) Save | Affected-control review created | P0 | FUNC | M16 acceptance |
| TC-345 | Finding closure needs evidence | Assessment finding | 1) Close without evidence | Rejected; evidence or retest required | P0 | FUNC | FR-M16-03 |
| TC-346 | Questionnaire does not mark control verified | Completed vendor questionnaire | 1) View control | Control verification unchanged | P0 | FUNC | DATA_MODEL assessment |
| TC-347 | SDF label requires reviewed applicability | Org meets SDF indicators | 1) Toggle SDF | Requires reviewed notification/applicability decision | P0 | LEGAL | Act §10, FR-M16-04 |
| TC-348 | SDF DPIA workflow | SDF applicable | 1) Start periodic DPIA | Workflow per pack; findings link to controls; schedule per Rule 13 values from pack | P1 | LEGAL | Act §10(2), Rule 13 |
| TC-349 | SDF independent audit tracking | SDF applicable | 1) Record audit | Auditor, scope, date, findings stored; runtime pass does not certify org duties | P1 | LEGAL | Act §10(2), FR-M16-04 |
| TC-350 | SDF DPO based in India | SDF applicable | 1) Configure DPO | DPO record with India-based flag required per pack; notices show DPO contact | P1 | LEGAL | Act §10(2)(a) |
| TC-351 | Exception decision scoped and expiring | Risk accepted for processor | 1) Record exception | Scope, approver, expiry; visible; auto-reopens on expiry | P1 | FUNC | DATA_MODEL assessment |
| TC-352 | Processor in cross-border region | Processor stores data abroad | 1) Record region | Transfer assessment task against current Act §16 status; no hard-coded list | P1 | LEGAL | Act §16 |
