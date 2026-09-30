# Cyberfyx client document templates

**Version 1.0, drafts for Cyberfyx management approval.** Not legal advice. Management decided on 2026-09-30 that these proceed without an external legal review, and accepts responsibility for that decision.

| File | Accepted by the client | When |
|---|---|---|
| `subscription-terms.md` | Online click-accept at checkout. The order stores the SHA-256 of the accepted version (`vendor.orders.terms_digest`). | Each ORVIA purchase or renewal |
| `privacy-notice-client-staff.md` | Shown at checkout and at vendor sign-in | Always available |
| `data-processing-agreement.md` | Signed, or accepted online by an authorised signatory | Before any engagement, and before any personal-data item is accepted |
| `engagement-letter.md` | Signed by an authorised signatory | Each audit or readiness engagement |
| `scope-statement.md` | Signed by the client's accountable officer | Before fieldwork |
| `management-representation-letter.md` | Signed by the client's accountable officer | Before the report is signed |
| `retention-schedule.md` | Annex to the processing agreement | With the processing agreement |
| `security-and-breach-commitments.md` | Annex to the subscription terms and the processing agreement | With both |

## Approving a version

1. Fill in part A of `COMPANY_DETAILS.md` and replace those placeholders in every template. Leave the part-B (per-client) placeholders in place.
2. Compute the digest: `sha256sum docs/audit-practice/templates/<file>.md`.
3. A Cyberfyx director approves the version in writing.
4. In the vendor area → Audit practice, the super administrator records these gates:
   - `ENGAGEMENT_LETTER_TEMPLATE_APPROVED`, with reference `engagement-letter.md v1.0 sha256:<digest>, approved by <role> on <date>`;
   - `PROCESSING_AGREEMENT_TEMPLATE_APPROVED`, in the same way for the processing agreement.
5. Any change is a new version. It needs a new digest and a new approval. It does not reopen documents clients have already accepted.

These documents are written once per version, not once per client. Each new client accepts the current version online or by e-signature, so no meeting is needed.
