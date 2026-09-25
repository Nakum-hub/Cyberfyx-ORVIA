# 21 — Customer Onboarding and Data Imports (M29)

Scope: package verification, preflight, owner creation, connection wizard, file/manual imports, quarantine, provenance.
References: PRD FR-M29-01..04; acceptance T42, T43, VM-15..20, BUILD-10, UX-02, UX-15.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-405 | Clean install needs no developer checkout or model | Clean host, signed ZIP | 1) Install per runbook | Console, portal, graph, policy, workflows, evidence, tests run locally; no model/GPU | P0 | E2E | T42, V1-01 |
| TC-406 | Tampered package refused | Modified ZIP | 1) Install | Refused before privileged execution | P0 | SEC | T43 |
| TC-407 | Unsupported host | Unsupported CPU/OS | 1) Run preflight | Rejected or marked unsupported; no false compatibility | P1 | NEG | UX-15 |
| TC-408 | Wrong package for target host | Windows browser downloading for Linux host | 1) Use wizard | Correct target package chosen by server selection, not browser OS | P2 | UX | UX-02 |
| TC-409 | Partial setup resume | Setup interrupted after DB init | 1) Rerun | Resumes without erasing existing secrets/data | P1 | REC | USER_FLOWS setup |
| TC-410 | Connection success is not deletion approval | Connector connected | 1) Check actions | Delete not enabled; approval required | P0 | SEC | M29 acceptance |
| TC-411 | Malicious import file | CSV with formula injection, zip bomb, path traversal archive, macro XLSX | 1) Import | Quarantined/blocked locally; no public scan upload | P0 | SEC | BUILD-10, VM-18 |
| TC-412 | Partly committed import retried | Import fails at row 5,000 of 10,000 | 1) Retry | Dedup per declared atomicity; row counts accurate; provenance retained | P0 | REC | BUILD-10 |
| TC-413 | Mapping change invalidates preview | Preview approved | 1) Change column mapping | Preview invalidated; new approval required | P1 | FUNC | USER_FLOWS import |
| TC-414 | Snapshot is not live evidence | Imported CRM snapshot | 1) Request deletion | Snapshot status shown; no claim of source mutation; manual coordination task | P0 | FUNC | VM-19 |
| TC-415 | Import purge | Import completed | 1) Purge raw file per policy | Raw payload purged; provenance record retained | P1 | FUNC | FR-M29-04 |
| TC-416 | Onboarding reports untested gates | Setup complete | 1) View checklist | Untested gates shown as untested; no completion claim | P1 | UX | M29 acceptance |
