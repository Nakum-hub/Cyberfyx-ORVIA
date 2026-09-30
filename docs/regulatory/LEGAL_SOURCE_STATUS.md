# Legal source status for the DPDPA audit practice

**Recorded:** 2026-09-29, task AUDIT-PRACTICE-01.
**Status of this file:** an engineering record of which primary sources were and were not checked. It is not a legal opinion. Repository legal prose, including this file, must not be relied on as legal advice.

## Primary sources

**Updated 2026-09-30.** The user downloaded the four official PDFs from the meity.gov.in addresses in `scripts/regulatory/dpdp-baseline.ts`; they are committed unchanged in `regulatory-sources/`. They were imported with `scripts/regulatory-package.ts import` (method `MANUAL_IMPORT`: this environment still cannot reach the Government hosts, so the tool did not download them itself). Before a PRODUCTION package is approved, the approver re-downloads each file and confirms its digest.

| Source | File | Pages | SHA-256 | Status |
|---|---|---|---|---|
| Digital Personal Data Protection Act, 2023 (No. 22 of 2023) | `DPDP-ACT-2023.pdf` | 21 | `e46746bcb286df29c255edd058de28fbb969c6253f0ad9917f9523aa13f4df25` | Imported; identity checked from its text |
| G.S.R. 843(E), commencement, 13 November 2025 | `GSR-843E-2025.pdf` | 2 | `cc637997fbea4a74de72c74a9b19ec694d6723d397cdd45be3c106bbe64f0aed` | Imported; identity checked |
| G.S.R. 844(E), establishment of the Board, 13 November 2025 | `GSR-844E-2025.pdf` | 2 | `4a46b2e5a744a60be69a982a93a597337ab296dd961e102049a45c1f53267cb2` | Imported; identity checked |
| DPDP Rules, 2025, G.S.R. 846(E), 13 November 2025 | `DPDP-RULES-2025.pdf` | 41 | `105df5e2144777d47f895661bc68f6633841225cfa9dd487fa8339afab549ab8` | Imported; identity checked |
| Corrigendum G.S.R. 892(E) and any later amendments | not supplied | | | **UNKNOWN**: not checked |

### Checked against the official text (2026-09-30)

| Claim in the repository | Official text | Result |
|---|---|---|
| s.8(2): a processor only under a valid contract | "A Data Fiduciary may engage, appoint, use or otherwise involve a Data Processor to process personal data on its behalf for any activity related to offering of goods or services to Data Principals only under a valid contract." | **Confirmed.** Note the scope ("for any activity related to offering of goods or services"); whether audit work falls inside it is a legal reading, so the engagement letter and processing agreement remain the safe course. |
| Commencement of s.6(7)–(9) one year after publication | G.S.R. 843(E): one year for s.6(9) and s.27(1)(d) only; eighteen months for s.6(1)–(8) and (10) | **Corrected.** The baseline dated s.6(7)–(8) one year; they commence 13 May 2027. |
| Rules commencement | Rule 1: rules 1, 2, 17–21 on publication; rule 4 one year after; rules 3, 5–16, 22, 23 eighteen months after | **Confirmed** |
| R7(2)(b): detailed report to the Board within 72 hours | "within seventy-two hours of becoming aware of the breach, or within such longer period as the Board may allow" | **Confirmed** |
| R8(2): intimation at least 48 hours before Third Schedule erasure | "At least forty-eight hours before completion of the time period for erasure …" | **Confirmed** |
| R8(3): logs kept at least one year | "for a minimum period of one year from the date of such processing" | **Confirmed** |
| R13(1): DPIA and audit every twelve months | "once in every period of twelve months … undertake a Data Protection Impact Assessment and an audit" | **Confirmed** |
| R13: auditor empanelled by the Board | Rule 13 and s.10(2)(b) require an "independent data auditor"; no empanelment or other eligibility test appears | **Not in the text** (the earlier withdrawal stands). **New:** R13(2) requires the SDF to cause the auditor to furnish a report of significant observations to the Board. |
| R14: grievance period not exceeding 90 days | "within a reasonable period not exceeding ninety days" | **Confirmed** |
| Publication date 13 vs 14 November 2025 | Each notification reads "New Delhi, the 13th November, 2025"; the Gazette masthead date could not be extracted from the PDFs | **Open** (unchanged) |

The regulatory package ORVIA ships (`scripts/regulatory/dpdp-baseline.ts`) is **TEST_FIXTURE** content. It is not the official text and must not be relied on for a real audit (`docs/regulatory/DPDP_CONFORMANCE.md`, gap 6).

## Rule 13: auditor eligibility

**The claim.** Revision 1.5 (`docs/engineering/V1_BASELINE_REV_1_5_AUDIT_EXCHANGE.md`) stated that "Rule 13 audits of Significant Data Fiduciaries need an auditor empanelled by the Board".

**What was checked.**
- The official Rule 13 text could not be read from this container (see above).
- A web-search index summary of the MeitY notification describes Rule 13 as requiring a Significant Data Fiduciary to carry out a data protection impact assessment and an audit every twelve months. It says nothing about Board empanelment.
- A search summary is not a primary source, so it neither confirms nor refutes the claim.
- A separate planning review by Codex also could not substantiate the claim in the official Rule 13 text it checked.

**Decision in the product.**
- The statement is **withdrawn as unverified**.
- ORVIA does not decide, enforce or display statutory auditor eligibility. The optional field only records a reference the auditor states, labelled "not verified by ORVIA".
- An engagement claiming to be a statutory SDF audit requires validated legal applicability, meaning Significant Data Fiduciary status recorded with its source, and documented auditor eligibility evidence. Both are entered by people and reviewed; neither is inferred.

**Open for legal/owner resolution.**
1. What Rule 13, and any other provision, actually requires of the person conducting an SDF audit.
2. Whether any Board notification prescribes eligibility, empanelment or reporting formats.
3. Whether any amendment or corrigendum changes the Rules text used by the regulatory package.

## What unblocks this

Either:
- allow `www.meity.gov.in` and `egazette.gov.in` in the environment's network settings; or
- commit the four official PDFs unchanged under `regulatory-sources/`.

Then `scripts/regulatory-package.ts` can hash them. Legal review of the interpretation, and a PRODUCTION regulatory package signed by the release key custodian, remain human steps.
