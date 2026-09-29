# ORVIA V1 baseline addendum, revision 1.5: DPDPA external audit exchange

**Status:** owner decision recorded 2026-09-28. It is additive to the approved master `ORVIA_V1_Unified_Master_Rev_1_4_Vendor_Support_and_Data_Onboarding.md`; the master itself is not changed. Where this addendum and the 1.4 master disagree, this addendum wins **only** on the points listed under "What changes". Everything else in the master still applies.

## Decision

The company operates as a **DPDPA auditor first and a software vendor second**. Its auditors audit client organisations against the Digital Personal Data Protection Act 2023 and the DPDP Rules 2025, using evidence the clients share through ORVIA.

- **Scope is DPDPA only.** There are no SOC 2 or ISO criteria. The criteria are the DPDP requirements in the signed regulatory package (`app.regulatory_requirements`, with applicability from `app.applicability_decisions`). Their source is `scripts/regulatory/dpdp-baseline.ts`.
- **This is not an assessment or questionnaire product.** The audit works from evidence files, derived indicators, gaps, findings and a report.

## What changes

The 1.4 rule that "customer operational records, identifiers, evidence, logs and assets stay customer-local" is narrowed by exactly one exception.

> A **client-approved, personal-data-free audit evidence package** may leave a customer installation. A client user carries it out as a file, then uploads it to the vendor's own installation. The vendor never pulls data, never holds a connection to a client installation and never signs in to one.

Package defaults:
1. **Nothing personal by default.**
   - Every evidence file carries `contains_personal_data` (YES, NO or UNKNOWN). The submitter sets it and a reviewer confirms it.
   - YES and UNKNOWN are blocked from any package.
   - The only exception is a per-item approval by a reviewer with a written justification. A package holding such an item is accepted by the vendor only when a processing agreement is recorded for the engagement; otherwise it stays quarantined.
   - Free text in a package passes through the redaction engine.
2. **File export and manual upload only.** There is no network transport, API push, sync or scheduled send from a customer installation, and the customer installation never calls the vendor.
3. **Dual control and sealing.**
   - A preparer assembles the package; an owner or administrator who is a different person approves it.
   - The package is sealed: a canonical JSON manifest, a SHA-256 per item and a manifest fingerprint.
   - It carries an expiry date, can be revoked by the client, and is listed on the vendor-visibility screen with every other thing that has ever left the installation.
4. **Signed files back.** Auditor request lists, findings and the final report return as files signed with the vendor **audit** key (a new key kind). Installations verify them with the audit public key in their trust file before import.

## Installations

One application, one installer, two installation kinds. The kind is fixed when the installation is provisioned and recorded in its protected installation record. It cannot be changed from the interface; changing it needs a fresh installation.

| | `CUSTOMER_INSTALLATION` (default) | `VENDOR_SERVICE` |
|---|---|---|
| Who installs it | Each client organisation, on its own server or data centre | The vendor, on its own server, data centre or Indian cloud |
| Enabled | Workspace, privacy portal, DPDPA audit evidence | Vendor area `/vendor/*`: audits, organisations, licences, support, vendor team; client package upload page |
| Disabled | Every `/vendor/*` page and API, which return 404; no `vendor_auth` store exists | `/workspace/*` and `/privacy/*`, which return 404; no organisation's operational data is held |
| Identity store | `staff_auth`, `principal_auth` | `vendor_auth` (vendor staff) and `vendor_accounts` (client uploaders); separate database |
| Connects to the other kind | Never | Never |

Both kinds are reached only through a browser, from Windows, macOS, Linux or a tablet. Vendor staff sign in **only** on the vendor installation. A staff, principal or supplier session is never accepted on `/vendor/*`, and a vendor session is never accepted on `/workspace/*` or `/privacy/*`.

The vendor's public website links to `https://<vendor-domain>/vendor/sign-in`: the same deployment and the same session as the in-app vendor sign-in.

## Legal and wording guardrails

- ORVIA produces an **audit opinion, as of a date, for a stated scope**. It never produces a "DPDPA compliance certificate". Only the Data Protection Board of India decides compliance. A unit test refuses report templates that use certification wording.
- When a package contains personal data under an approved exception, the vendor acts as the client's **Data Processor** (s.8(2)). The engagement must record that a processing agreement is in place before such a package is accepted.
- Each engagement records the auditor's **independence declaration** and a **conflict check**.
- **Correction (2026-09-29):** an earlier version of this line stated that Rule 13 audits of Significant Data Fiduciaries need an auditor empanelled by the Board. That statement was never verified against the official Rule 13 text, and a later review could not substantiate it. It is withdrawn; see `docs/regulatory/LEGAL_SOURCE_STATUS.md`. ORVIA does not decide who is eligible to perform a statutory audit. The optional field (stored as `empanelment_reference`) records an eligibility reference the auditor states, and ORVIA only displays it; it never asserts eligibility. Any statutory SDF audit claim needs validated legal applicability and eligibility evidence, which is a legal/owner decision.

## Security principles (unchanged from 1.4, restated)

- Server-side authorisation, least privilege, row-level security on every vendor table, and audit of every action.
- Idempotent writes over durable PostgreSQL state.
- No vendor analytics and no live vendor access.
- Customer operational data never enters the vendor database, other than the contents of a package a client chose to upload.
- Evidence the vendor receives is purged a configurable number of days after the engagement closes (default 90). Reports and findings are kept. Every purge is recorded.

## Out of scope for this revision

- Payment activation: Razorpay is chosen but waits on KYC, prices and GST.
- The public website build: only its link to `/vendor/sign-in` is in scope.
- SSO/SCIM.
- The M19–M25 AI modules, which remain Version 2.
