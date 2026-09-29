# Legal source status for the DPDPA audit practice

**Recorded:** 2026-09-29, task AUDIT-PRACTICE-01.
**Status of this file:** an engineering record of which primary sources were and were not checked. It is not a legal opinion. Repository legal prose, including this file, must not be relied on as legal advice.

## Primary sources

| Source | Official location found | Retrieved and hashed in this repository? | Status |
|---|---|---|---|
| Digital Personal Data Protection Act, 2023 (No. 22 of 2023) | meity.gov.in "Act and Policies" | No | **BLOCKED_EXTERNAL.** The build container's network policy denies `www.meity.gov.in`. |
| DPDP Rules, 2025, G.S.R. 846(E), 13 November 2025 | meity.gov.in; a web-search index lists the notification PDFs on meity.gov.in | No | **BLOCKED_EXTERNAL** (same cause) |
| Commencement notification, G.S.R. 843(E) | meity.gov.in / egazette.gov.in | No | **BLOCKED_EXTERNAL** |
| Board establishment notification, G.S.R. 844(E) | meity.gov.in / egazette.gov.in | No | **BLOCKED_EXTERNAL** |
| Amendments and corrigenda after 13 November 2025 | Not established | No | **UNKNOWN.** Whether any exist has not been checked against the Gazette. |

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
