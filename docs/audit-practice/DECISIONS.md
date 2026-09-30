# Cyberfyx audit practice: decisions

Each entry records a management decision, the reason, what it changes and where it is applied. Newest last.

## D1: reports go only to the client; the Significant Data Fiduciary statutory audit is not offered

**Date:** 2026-09-30. **Decided by:** Cyberfyx management, relayed by the product owner.

**Decision.**
1. Every Cyberfyx report, finding and conclusion is delivered only to the client organisation. Nothing is sent to the Data Protection Board of India or any other authority, unless the law compels disclosure.
2. Cyberfyx does not offer the statutory yearly audit of a Significant Data Fiduciary, the audit by an "independent data auditor" under section 10(2)(b) of the Act and Rule 13(1) of the Rules.
3. A Significant Data Fiduciary may still buy a readiness assessment or an evidence audit. Its statutory audit is carried out by another firm, which handles the Board report.

**Why.** Rule 13(2) of the DPDP Rules, 2025, as read in the official G.S.R. 846(E) PDF (`regulatory-sources/DPDP-RULES-2025.pdf`), says:

> "A Significant Data Fiduciary shall cause the person carrying out the Data Protection Impact Assessment and audit to furnish to the Board a report containing significant observations in the Data Protection Impact Assessment and audit."

The law names the auditor of that statutory audit as the one who sends the report to the Board. Taking that audit while reporting only to the client would leave the client in breach and expose Cyberfyx. It would also create a Board relationship the company does not want. Declining that one service keeps the model simple: Cyberfyx reports to its client and to no one else.

**Scope.**
- Significant Data Fiduciaries are only organisations the Central Government notifies (s.10(1)).
- None had been notified when this decision was recorded.
- Every other client is unaffected: no Board reporting applies to a readiness assessment or an evidence audit.

**Applied in:**
- `METHODOLOGY.md` section 1: the service table and the rule on who receives the report.
- `templates/engagement-letter.md` section 5: the report goes only to the client, and the engagement is not the s.10(2)(b) audit.
- ORVIA already has no connection to the Board.
- The `STATUTORY_SDF_AUDIT_CLAIM` service type still exists in the vendor code (`database/vendor/migrations/0008_audit_practice.sql`). Under this decision the acceptance reviewer refuses it. Removing or blocking it in code is a later engineering change, which needs a vendor migration.

**Revisit if:** management later wants to offer the statutory audit. It would then need an engagement-letter clause in which the client instructs Cyberfyx to send the Rule 13(2) report of significant observations to the Board, with a copy to the client, and a Board reporting procedure.

## D2: the name ORVIA

**Date:** 2026-09-30. **Decided by:** the product owner, for Cyberfyx.

**Decision.** ORVIA stands for **Observe · Review · Verify · Inspect · Assure**.

**Why.** The name describes the product's method:
- **Observe:** read the organisation's own records;
- **Review:** put every consequential action before a second person;
- **Verify:** check outcomes independently, never trusting an acknowledgement;
- **Inspect:** give the auditor signed evidence to examine;
- **Assure:** issue the audit opinion.

A form with "Intelligence" was rejected, because Version 1 deliberately has no AI model.

**Applied in:** `README.md`.
