# ORVIA V1 baseline addendum — revision 1.12: file intake (automatic and manual), vendor installation

**Status:** owner decisions, 2026-10-02. Does not modify the 1.4 master; read with revisions 1.5–1.11.

## A. Owner decisions (verbatim intent)

| Question | Decision |
|---|---|
| Which files ORVIA imports | "both and everything that orvia needs": customer data exports and evidence documents, and every file ORVIA already uses (licences, releases, regulatory packages, data inventories, existing-data rows) |
| Where automatic import gets files | A **local inbox folder** on the installation server |
| What happens to an automatically picked-up file | **Staged; a staff member approves** before anything in it is used |
| Which plans | **Every plan**, both automatic and manual |
| Vendor's own installation | "as vendors we will not buy our own tool subscription": the vendor service installation is given by the company to its members, who sign in with credentials and use ORVIA from the vendor side (mainly auditing). **How credentials are given is the owner's idea, to be explained before end-to-end testing; not built until then.** |

## B. Channel (AGENTS "no assumptions")

Staff reach file intake through **Operations → Files** in the workspace (manual upload) and through the **inbox folder** on the installation server, which the organisation's own systems or scheduled exports write to. Data Principals never use this channel; their requests arrive through the intake API or Privacy Centre (rev 1.7). Nothing is fetched from outside the installation: the folder is the only automatic source, so customer data stays local.

## C. Behaviour

- Folder per scope: `<ORVIA_FILE_INBOX_DIR>/<environment id>/incoming` (default `file-inbox` under the profile directory). Picked-up files move to `accepted/`; empty or oversized files move to `rejected/` with a `.reason.txt`. Hidden and partial files (`.part`, `.tmp`, `.crdownload`), links, folders and files changed in the last 5 seconds are left alone. Nothing is ever deleted from the folder.
- Upload: up to 10 MiB per file; types json, jsonl, csv, txt, pdf, docx, xlsx, png, jpg/jpeg.
- Kind is decided by the contract schemas: a signed licence, release or regulatory package; a data-inventory import; existing-data rows (JSON array or JSONL); otherwise a document; anything else, or content that does not match its extension, is **not readable** and can only be rejected.
- Approval runs the target path **as the approver**, with that path's capability and plan checks (a licence needs `licence.manage`). The path's own review still applies: an inventory batch waits in quarantine; onboarding rows wait for processing. Documents are kept and may be linked to a processor, system, incident, breach, rights request, purpose or notice.
- The same content is one item. A decision is final (database-enforced). A rejected or routed file's content is removed; the record, digest, decider and reason are kept. Kept documents stay in the customer-local database.
- Plan placement: file intake and existing-data onboarding (`bulk-jobs`, previously mis-placed in Control) are Foundation. The worker pauses intake only when no licence covers Foundation.

## D. Vendor installation

The vendor service installation carries no plan, licence or entitlement check (verified: the tier dispatcher serves customer routes only, which return 404 on a vendor installation). The vendor issues licences to customers; from this revision, issued licences carry `term` and an increasing `sequence` per installation so anti-rollback applies to them.

## E. Open

- Credential issuance for vendor members (owner, before end-to-end testing).
- CSV and XLSX are kept as documents; data imports use the JSON formats. A CSV/XLSX column mapping would be a further decision.
