# 23 — Updates (M31)

Scope: signed manifests, safe unpacking, migrations, recovery, no silent egress/feature expansion.
References: PRD FR-M31-01..04; acceptance T43, T59, BUILD-18, UX-10, UX-11, UX-14.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-429 | Tampered update | Modified update ZIP | 1) Apply | Rejected before privileged execution | P0 | SEC | BUILD-18 |
| TC-430 | Revoked signing key | Update signed by revoked key | 1) Apply | Rejected | P0 | SEC | M31 failure paths |
| TC-431 | Archive traversal/bomb | Update contains ../ paths or bomb | 1) Unpack | Safe unpack rejects | P0 | SEC | FR-M31-02 |
| TC-432 | Migration interrupted | Kill during migration | 1) Recover | Tested forward-recovery path; data consistent; no false rollback claim | P0 | REC | FR-M31-03 |
| TC-433 | Roles, epochs, evidence survive update | Populated system | 1) Update; 2) Compare | Owner, roles, consent epochs, evidence intact | P0 | REC | M31 acceptance |
| TC-434 | Update tries to add egress | Update manifest declares new outbound destination | 1) Apply | Rejected pending explicit customer review; boundary tests rerun | P0 | SEC | T59, UX-14 |
| TC-435 | Update enables telemetry | Update toggles telemetry on | 1) Apply | No silent change; customer approval required | P0 | SEC | T59 |
| TC-436 | Unsafe downgrade | Apply lower version with known issue | 1) Apply | Blocked per policy | P1 | SEC | FR-M31-04 |
| TC-437 | Offline update | Disconnected host | 1) Apply update bundle | Works with bundled dependencies and trust | P1 | FUNC | UX-11, V1-12 |
| TC-438 | Incompatible agent version | Agent older than required | 1) Update server | Incompatibility flagged; commands not sent to incompatible agent | P1 | NEG | M31 failure paths |
