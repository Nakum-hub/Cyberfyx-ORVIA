# 15 — Children and Guardians (DPDPA Act §9)

Scope: verifiable guardian consent, tracking/behavioural monitoring/targeted advertising restrictions, harm, age transitions, exemptions.
References: DPDPA Act §9(1)–(5); Rules relating to verifiable consent and exemptions (use reviewed pack); PRD FR-M14-03, FR-X-03; master §1453 child safeguards (V1 baseline safeguard; advanced automation is Enterprise/advanced scope).
All cases start **NOT_RUN**. Tests marked V1-CONDITIONAL apply where the customer's processing of children's data is supported and configured.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-300 | Child flag blocks processing without guardian consent | Principal age below configured threshold | 1) Attempt consent by child directly | Consent not accepted as valid; guardian flow required | P0 | LEGAL | Act §9(1) |
| TC-301 | Verifiable guardian consent recorded | Guardian verification method configured per reviewed pack | 1) Guardian completes verification and grants | Grant links guardian identity reference, method, time; minimal attestation, not document warehousing | P0 | LEGAL | Act §9(1); master child safeguard |
| TC-302 | Targeted advertising at child blocked | Child principal; marketing purpose with targeting | 1) Evaluate | BLOCK with child-safeguard reason | P0 | LEGAL | Act §9(3) |
| TC-303 | Behavioural monitoring/tracking of child blocked | Child principal; analytics tracking purpose | 1) Evaluate | BLOCK unless reviewed exemption applies | P0 | LEGAL | Act §9(3) |
| TC-304 | Exemption requires reviewed applicability | Exempt class configured (e.g. educational institution) | 1) Activate exemption | Requires source-reviewed decision; scope limited to exempted purposes | P0 | LEGAL | Act §9(4)–(5) |
| TC-305 | Unknown age | Age not collected | 1) Evaluate child-sensitive purpose | INDETERMINATE/review, not assumed adult | P0 | NEG | FR-M14-03 |
| TC-306 | Age transition to adulthood | Child turns 18 | 1) Re-evaluate | Guardian authority for new actions ends per configured rule; principal's own consent required going forward | P0 | LEGAL | FR-M14-03 |
| TC-307 | Guardian mandate revoked | Court order transfers guardianship | 1) Old guardian attempts action | Denied | P0 | SEC | FR-M14-03, T24 |
| TC-308 | Guardian access limited to child | Guardian with two children | 1) Access child A data | Only child A's data; child B requires its own mandate | P0 | SEC | FR-M14-03 |
| TC-309 | Guardian of adult with disability | Lawful guardian | 1) Grant consent | Recorded under lawful-guardian mandate with evidence | P1 | LEGAL | Act §9(1) |
| TC-310 | Detrimental processing check | Purpose flagged potentially detrimental to child wellbeing | 1) Publish policy | Review required; cannot activate without decision | P1 | LEGAL | Act §9(2) |
| TC-311 | Child safeguard in shared core (not Enterprise-only) | Foundation edition | 1) Configure child processing | Baseline safeguard available and enforced | P0 | FUNC | master §1453 |
| TC-312 | Guardian verification data minimised | Guardian verified | 1) Inspect storage | Only minimal attestation retained; no unnecessary ID document storage | P1 | LEGAL | master §1453 |
| TC-313 | Child erasure request by guardian | Guardian requests erasure | 1) Execute | Processed under guardian mandate with verification | P1 | FUNC | Act §12, §9 |
| TC-314 | Import of child records without guardian evidence | CSV with minors' consents lacking guardian info | 1) Import | Flagged INCOMPLETE_EVIDENCE; not usable | P0 | LEGAL | FR-M11-04, Act §9 |
