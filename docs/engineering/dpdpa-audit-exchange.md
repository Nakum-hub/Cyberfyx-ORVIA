# DPDPA external audit exchange

Baseline: `docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md` (owner decision 2026-09-28).
Contract: customer 0.42.0 (`shared/contracts/src/dpdpa-audit.ts`) and vendor-internal 0.1.0 (`shared/contracts/src/vendor-audit.ts`).
File formats: `shared/contracts/src/audit-exchange.ts`.

## Flow

```
CLIENT (CUSTOMER_INSTALLATION)                          VENDOR (VENDOR_SERVICE)
gap register ─ evidence files ─ engagement (code) ─┐
package: prepare → screen → approve (other person) │  file carried by a person
      → seal → export file ─────────────────────────┼─▶ /vendor/upload (client account + code)
                                                    │   verify → scan → encrypt → inbox
                                                    │   review → results → findings → report
signed findings / report  ◀─────────────────────────┘   (lead drafts, reviewer approves, audit key signs)
verify with trust file → import → GRC issues
```

The customer installation never contacts the vendor, and the vendor never reaches a customer installation.

## Client side (`/workspace/dpdpa-audit`, migration 0066)

**Gap register.** For every requirement of the package in force, the register shows:
- **Applicability**, from recorded decisions. A requirement with no decision is `UNRESOLVED`, and that counts as a gap.
- **Expected evidence**, from `evidence_expectations`.
- **Mapped controls**, meaning the controls mapped to the imported DPDP framework, with their `controlStanding`.
- **Aggregate ORVIA indicators** (`backend/domain/src/dpdpa-audit/indicators.ts`: counts and dates only, never identifiers).

Gap status: `NOT_APPLICABLE`, `UNRESOLVED_APPLICABILITY`, `NO_EVIDENCE`, `STALE`, `PENDING_REVIEW`, `REJECTED` or `EVIDENCED`. The register also has a module summary and a CSV export.

**Evidence files.**
- **Limits:** up to 20 MB; PDF, PNG, JPEG, TXT, CSV, DOCX or XLSX; the type is decided by magic bytes.
- **Hash:** SHA-256 is computed on the server, and the file is linked to a GRC evidence record.
- **Personal-data flag:** `contains_personal_data` (YES, NO or UNKNOWN) is set by the submitter and confirmed by a different person (`app.evidence_file_confirm`). An unconfirmed file cannot be shared.

**Engagement.**
- The client enters the code the vendor supplied; only its digest is stored.
- It also records the firm, the scope, the audit period, the processing-agreement reference, and the auditor's independence declaration and empanelment reference. These are entered by the client and never assumed.

**Package.**
- **Preparation:** the preparer adds items. Each item is a file, an indicator (computed by the server at that moment) or a statement (redacted).
- **Screening:** unconfirmed items, and items outside the engagement scope, are blocked.
- **Personal-data exceptions:** a personal-data item needs an exception approved by an owner or administrator other than the preparer, with a justification (`app.audit_item_add_exception`).
- **Approval:** an owner or administrator other than the preparer approves (`app.audit_package_approve`). At that moment the canonical manifest is computed, with a SHA-256 per item, a fingerprint and the file SHA-256, and the package is sealed.
- **Export:** every export is recorded and listed on `/workspace/vendor-visibility`. The server refuses to export if the bytes differ from what was approved.
- **Revocation:** a revoked package is named in the next package, and the vendor withdraws it on upload.

**Imports.**
- Request lists, findings and reports are verified with the audit public key in `trust/vendor-public-keys.json` before storage. They are stored immutably.
- A report must arrive with the PDF whose hash it signs.
- Findings become GRC issues with `source_kind = EXTERNAL_AUDIT_FINDING`.

## Vendor side (`/vendor/*`, vendor migrations 0003–0005)

**Identity.**
- Staff logins live in `vendor_auth`. Roles: `VENDOR_SUPER_ADMIN`, `VENDOR_ADMIN`, `LEAD_AUDITOR`, `AUDITOR`, `AUDIT_REVIEWER`. Client upload logins live in `account_auth`.
- MFA is mandatory for both.
- Every request is checked against the local role map, then against `backend/policy/vendor/authorization.rego`, then runs as `orvia_vendor_app` under row-level security.

**First-run setup.** `pnpm run vendor:setup-code confirm:vendor-a00`, then `/vendor/setup`.

**Upload.** Uploads are refused if the file is:
- tampered (manifest fingerprint, per-item hash, size, or type by bytes);
- expired or already received;
- for the wrong engagement or outside its scope;
- from a closed engagement;
- sent with an unknown code or by another organisation;
- rejected by the malware screen.

Refusals keep no content. Accepted packages are sealed with AES-256-GCM using a key per package, which is wrapped by the installation vault key. Personal data without a recorded processing agreement is quarantined until one is recorded.

**Rate limits.** Each account may make 10 upload attempts per 10 minutes. Sign-in goes through the library's rate limit and account lockout.

**Evidence access.** Only the engagement team can see evidence, and every view and download is logged.

**Review.**
- Each item gets a decision (ACCEPT, REJECT or REQUEST_MORE) with a note and sampling record.
- Each requirement gets a result (MEETS, PARTIALLY_MEETS, DOES_NOT_MEET, NOT_APPLICABLE or NOT_TESTED).
- Requests and findings are recorded. Every finding must cite provisions of its requirement.

**Report.**
- The lead auditor drafts it; the engagement's reviewer, a different person, approves it (enforced by trigger).
- It is signed with `.local/vendor/signing/audit.json`.
- It is issued as a PDF (deterministic, no remote fonts) plus signed JSON that binds the PDF hash.
- Once signed, it is immutable.

**Wording guard.** Certification language is refused in report text and templates. The output is an audit opinion as of a date for a stated scope.

**Retention.** Evidence is purged a set number of days after closure (default 90). Reports and findings are kept, and each purge is recorded.

## Tests (executed 2026-09-29; see the handoff for the artifact names)

| Suite | Result |
|---|---|
| `tests/unit/audit-exchange.test.ts` | 13/13 (whole unit suite 284/284) |
| `tests/integration/vendor/vendor-audit.test.ts` | 68/68 |
| `tests/integration/expansion/dpdpa-audit.test.ts` | 52/52, including the round trip through an isolated vendor installation |
| `tests/e2e/dpdpa-audit-local.ts` | Chromium 13/13, both installations started from the same build |

## Honest limits

- **Malware screening** is a structural screen, not an antivirus engine. It catches executable formats, EICAR, PDF active content and Office macros. Set `ORVIA_CLAMSCAN` to a ClamAV binary for signature scanning. ClamAV is not present in the build environment, so that path is **NOT_RUN**.
- **Firefox and WebKit** runs are **NOT_RUN**: only Chromium is installed in the build environment.
- **Regulatory content.** The regulatory package in the tests is a TEST_FIXTURE. Audit criteria based on it must not be relied on for a real audit until the official package is signed (`docs/regulatory/DPDP_CONFORMANCE.md`).
- **Development keys.** The audit key is a development fixture created by `credentials:separate`. Replace it and move it to vendor custody (offline or HSM) before any real report is signed.
- **Vendor website.** Only the link target `/vendor/sign-in` is in scope. Vendor-account sign-up, subscriptions and installer downloads through the website are not built.
- **Payments** remain a placeholder.
