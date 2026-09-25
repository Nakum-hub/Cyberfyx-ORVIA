# 12 — Notice Management (M12)

Scope: notice drafting, review, publication, languages, digests, change classification, migration.
References: PRD FR-M12-01..04; DPDPA Act §5 (notice content, language), Rule 3 (itemised notice content), §5(2) notice for pre-Act consent; master §15, §16, §19, §20, §155, §156, §167; acceptance T10.
All cases start **NOT_RUN**. Exact notice content items must be taken from the reviewed regulatory pack, not from this file.

| ID | Title | Preconditions | Steps | Expected result | Pri | Type | Ref |
|---|---|---|---|---|---|---|---|
| TC-225 | Draft/review/publish lifecycle | Notice editor | 1) Draft; 2) Review; 3) Publish | Published version immutable; states audited | P0 | FUNC | FR-M12-01 |
| TC-226 | Notice itemises personal data and purposes | Notice for "Loan processing" | 1) Validate against reviewed Rule 3 checklist in the pack | Validation flags any missing required item before publish | P0 | LEGAL | Act §5(1), Rule 3 |
| TC-227 | Notice explains how to withdraw and complain | Notice | 1) Validate | Withdrawal method, rights exercise and Board complaint information present per pack | P0 | LEGAL | Act §5(1)(ii)-(iii) |
| TC-228 | Language variants | Notice in English + Hindi + Marathi | 1) Publish all | Each variant tied to same version; principal can choose language | P0 | LEGAL | Act §5(3) |
| TC-229 | Missing reviewed translation | Hindi variant unreviewed | 1) Publish notice set | Hindi not published as reviewed; explicit status; English-first admin cannot erase language choice | P0 | LEGAL | FR-M12-04 |
| TC-230 | Digest mismatch | Stored digest differs from content | 1) Render | Integrity error; not rendered as valid | P0 | SEC | M12 failure paths |
| TC-231 | Editorial change classification | Typo fix | 1) Classify as editorial; 2) Publish | No re-consent; grants unaffected; classification approved and recorded | P1 | FUNC | FR-M12-03 |
| TC-232 | Material scope change | New data category added | 1) Publish | Classified material; migration/fresh-consent decision required and affected grants listed | P0 | LEGAL | FR-M12-03, T10 |
| TC-233 | Misclassification attempt | Material change labelled editorial | 1) Submit | Reviewer workflow flags data/purpose diff; cannot bypass | P0 | SEC | FR-M12-03 |
| TC-234 | Historic receipt resolves exact content | Receipt from v2 Hindi | 1) Open receipt after v5 published | Shows v2 Hindi content | P0 | FUNC | M12 acceptance |
| TC-235 | Effective date respected | Notice effective next week | 1) View portal today | Current notice still shown; new marked scheduled | P1 | FUNC | FR-M12-01 |
| TC-236 | Accessible presentation | Notice page | 1) Screen reader and keyboard review | Headings, reading order, contrast pass accessibility checks | P1 | UX | FR-M12-04 |
| TC-237 | Pre-existing consent notice | Consent collected before Act commencement | 1) Configure "legacy notice" campaign | Notice generated per pack; tracked per principal with delivery evidence; commencement status honoured | P1 | LEGAL | Act §5(2) |
| TC-238 | Notice linked to purposes and categories | Notice | 1) Change a linked purpose | Notice flagged for review | P1 | FUNC | FR-M12-01 |
| TC-239 | Contact information current | DPO changed | 1) Update contact | Material classification per pack; notices updated through review | P2 | FUNC | Rule 9 |
| TC-240 | Notice plain language | Notice text | 1) Review with checklist | Clear plain-language check recorded by reviewer (human review, not automated pass) | P2 | LEGAL | Act §6(3) |
| TC-241 | Notice rendering in low bandwidth | 2G throttling | 1) Load notice | Loads with local assets; readable; no external fonts/scripts | P1 | UX | FR-M13-03, T48 |
| TC-242 | Notice publish audit | Publish | 1) Audit | Actor, approver, digest, languages recorded | P2 | FUNC | FR-M33-01 |
| TC-243 | Unpublish/supersede | Superseded notice | 1) Supersede | Old version remains resolvable for receipts; not shown for new grants | P1 | FUNC | FR-M12-02 |
| TC-244 | Notice for multiple legal entities | Group with two entities | 1) Publish entity-specific notice | Each entity's notice distinct; no cross-entity consent sharing | P1 | LEGAL | FR-M02-01 |
