# 08 — Evidence Engine (M08)

Scope: append-only events, envelopes vs payloads, per-class retention, exports (JSON/CSV/PDF/signed), offline integrity verifier.
References: PRD FR-M08-01..04; master §45–47, §101, §132–134, §150, §162, §169; acceptance T22, BUILD-14.
All cases start **NOT_RUN**.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-146 | Material action creates evidence | Consent withdrawal executed | 1) Open evidence timeline | Event with policy/workflow/action/actor/approval/version references | P0 | FUNC | FR-M08-01 |
| TC-147 | Correction appends, not replaces | Evidence entry with wrong note | 1) Correct it | Original retained; correction appended with actor and reason | P0 | FUNC | FR-M08-01 |
| TC-148 | Evidence bytes changed | Export package | 1) Modify one byte in payload; 2) Run offline verifier | Integrity validation fails, pinpointing entry | P0 | SEC | T22 |
| TC-149 | Broken chain detected | Delete one entry from exported chain | 1) Run verifier | Continuity break reported | P0 | SEC | FR-M08-04 |
| TC-150 | Verifier states limits | Valid package | 1) Run verifier | Reports manifest/hash/signature pass and states integrity is not proof of external-world truth | P1 | FUNC | FR-M08-04 |
| TC-151 | Payload purge leaves truthful tombstone | Approved purge of personal payload | 1) Purge; 2) Export again | Envelope remains with tombstone explaining deletion; no regenerated fake content; no vendor copy | P0 | FUNC | BUILD-14 |
| TC-152 | Envelope minimal, payload protected | Evidence for rights request | 1) Inspect envelope storage and indexes | Envelope has references only; personal payload in protected store | P1 | SEC | FR-M08-02 |
| TC-153 | Per-class retention across payload, index, export, backup | Retention class with configured period | 1) Advance past period; 2) Check payload, search index, exports, backup catalogue | Removed/expired consistently or marked pending in backup; documented | P1 | FUNC | FR-M08-02 |
| TC-154 | Unauthorised export denied | Member without export permission | 1) Request evidence export | Denied and audited | P0 | SEC | FR-M08-03 |
| TC-155 | Export contains only scoped facts and gaps | Export for Subtenant A | 1) Export; 2) Compare with DB | Matches stored facts; gaps/unknowns included; nothing out of scope | P0 | FUNC | M08 acceptance |
| TC-156 | Malicious CSV formula | Principal name "=HYPERLINK(...)" / "+cmd" / "@SUM" | 1) Export CSV; 2) Open in spreadsheet | Cells neutralised (prefixed/escaped); no formula execution | P0 | SEC | M08 failure paths |
| TC-157 | Expired download link | Export link with expiry | 1) Use after expiry | Denied | P1 | SEC | FR-M08-03 |
| TC-158 | Export access audited | Export created and downloaded | 1) Check audit | Creation and each access recorded with actor | P1 | FUNC | FR-M08-03 |
| TC-159 | Third-party data not disclosed in export | Evidence referencing multiple principals | 1) Export for principal P | Other principals redacted | P0 | SEC | FR-M08-03 |
| TC-160 | Missing historic version | Evidence references purged policy version | 1) Open evidence | Explicit "version unavailable" with reason; no silent substitution | P1 | NEG | M08 failure paths |
| TC-161 | PDF export fidelity | Evidence set | 1) Export PDF | Same facts as JSON; statuses (unknown/partial) not rendered as success | P2 | FUNC | FR-M08-03 |
| TC-162 | Signed package verification offline | Signed package | 1) Verify on machine with no network | Verification succeeds using bundled trust material | P1 | FUNC | FR-M08-04 |
| TC-163 | Evidence cannot be deleted to hide failure | Failed action evidence | 1) Admin attempts deletion | Denied; only justified payload purge with tombstone allowed | P0 | SEC | M33 failure paths |
| TC-164 | Consent log retrievable for Board-style inquiry | Principal with consent history | 1) Produce consent evidence for a date range | Receipts with notice version, time, purpose, withdrawal shown | P0 | LEGAL | Act §6(10) burden of proof |
| TC-165 | Evidence timezone correctness | Actions across IST and UTC servers | 1) View timeline | Timestamps unambiguous with timezone; ordering correct | P2 | FUNC | NFR-05 |
