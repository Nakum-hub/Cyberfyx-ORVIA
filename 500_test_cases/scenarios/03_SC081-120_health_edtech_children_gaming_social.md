# Scenarios SC-081 – SC-120 — Healthcare, Pharma, EdTech/Children, Gaming, Social Media/SDF

Children's-data scenarios apply where the customer's processing of children's data is supported and configured (V1 baseline safeguard). Age thresholds, verifiable-consent methods and exemptions come from the reviewed pack. All scenarios start **NOT_RUN**.

| ID | Business context | Scenario flow | Must hold (pass criteria) | Must NOT happen | DPDPA / ORVIA refs | Linked TCs |
|---|---|---|---|---|---|---|
| SC-081 | Hospital, patient portal | Patient grants consent for "Health newsletter", receives treatment under treatment purpose, withdraws newsletter | Treatment data flows unaffected; newsletter blocked | Treatment records affected by marketing withdrawal | Act §6, §7 | TC-063, TC-206 |
| SC-082 | Medical emergency (§7 legitimate use) | Unconscious patient treated | Processing recorded under reviewed §7 medical-emergency basis with source | Consent demanded before emergency processing; or basis unreviewed | Act §7 | TC-062 |
| SC-083 | Diagnostic lab shares reports with referring doctor | Doctor is recipient in graph | Recipient in access response; purpose limited | Reports reused for lab marketing | Act §11 | TC-266 |
| SC-084 | Patient requests correction of allergy record | Clinical correction | Routed to clinician review; not auto-applied | Auto-overwrite of clinical record | FR-M14-04 | TC-290 |
| SC-085 | Patient erasure vs medical records retention | Erasure request | Records retained per configured health-record retention; restricted; response explains | Medical records deleted | Act §8(7) | TC-271 |
| SC-086 | Pharma clinical trial participant withdraws | Participant withdraws consent | Future processing stops per trial purpose; already-collected data handling per configured rule with reviewer | Silent continued collection | Act §6(4) | TC-202, TC-205 |
| SC-087 | Health insurer + TPA processor | TPA holds claim data | Processor contract; erasure instruction tracked separately | Ack = verified | Act §8(2) | TC-338, TC-341 |
| SC-088 | Telemedicine app, video recordings | Recording retention | Retention rule per copy; recordings deleted when eligible; backups unverified | Recordings kept indefinitely without rule | FR-M15-01 | TC-315 |
| SC-089 | Hospital ransomware | Breach of patient data | Incident clocks per Rule 7 and CERT-In; principal intimation tasks | Unsent drafts shown as sent | Rule 7 | TC-354..TC-361 |
| SC-090 | Hospital staff snooping on celebrity record | Unauthorised access in audit | Audit shows actor; incident can be created | Audit missing actor | FR-M33-01 | TC-449, TC-452 |
| SC-091 | Guardian of adult patient with disability | Lawful guardian consents | Recorded under lawful guardian mandate | Guardian mandate for a different person used | Act §9(1) | TC-309 |
| SC-092 | EdTech K-12 platform signup | Child signs up alone | Guardian verification required before processing | Child consent accepted | Act §9(1) | TC-300, TC-301 |
| SC-093 | EdTech personalised ads to children | Ad targeting purpose for child accounts | BLOCK | Targeted ads served | Act §9(3) | TC-302 |
| SC-094 | EdTech learning analytics (behavioural monitoring) | Tracking purpose for child | BLOCK unless reviewed exemption covers it | Tracking enabled by default | Act §9(3)–(5) | TC-303, TC-304 |
| SC-095 | School (exempt class) | Educational institution exemption configured with review | Exemption scoped to permitted purposes only | Exemption applied to marketing | Act §9(4) | TC-304 |
| SC-096 | Child turns 18 | Account transitions | Guardian authority ends for new actions; adult consent requested | Guardian continues controlling adult account | FR-M14-03 | TC-306 |
| SC-097 | Divorced parents, guardianship change | Court order transfers guardianship | Old guardian denied | Old guardian accesses child data | FR-M14-03 | TC-307 |
| SC-098 | Parent with two children on platform | Access request for child A | Only child A data | Child B data included | FR-M14-03 | TC-308 |
| SC-099 | Unknown age users | Age not collected | INDETERMINATE for child-sensitive purposes | Assumed adult | FR-M14-03 | TC-305 |
| SC-100 | Tutoring marketplace imports student list | Import lacks guardian evidence | INCOMPLETE_EVIDENCE | Minors marketed | Act §9 | TC-314 |
| SC-101 | Online gaming, in-game purchases | Adult gamer consents to offers; inactive for pack-defined period | Inactivity erasure applies only if gaming class/thresholds in pack; warning before erasure | Erasure without warning | Rule 8 | TC-320, TC-322 |
| SC-102 | Gaming with child players | Child plays; chat logs | Guardian consent; no behavioural monitoring for ads | Chat mined for ad targeting | Act §9 | TC-302, TC-303 |
| SC-103 | Social media platform notified SDF | SDF applicability reviewed | DPIA, audit, DPO obligations tracked | SDF label without review | Act §10 | TC-347..TC-350 |
| SC-104 | Social platform account deletion | User deletes account | Erasure across posts, messages, ad profiles; derived copies; backups unverified | Ad profile retained silently | Act §12(3) | TC-291 |
| SC-105 | Social platform access request with tagged friends | Access package includes photos with friends | Third-party data handled/redacted per review | Friends' private data released | T25 | TC-267, TC-296 |
| SC-106 | Social inactivity erasure | Platform in pack class | Warning then erasure; login cancels | Mass erasure of all inactive without class check | Rule 8 | TC-320..TC-322 |
| SC-107 | Social platform with 10 lakh withdrawals after controversy | Load spike | No lost withdrawals; backlog visible | Dropped events | NFR-02 | TC-497 |
| SC-108 | Dating app sensitive data | Orientation data | Purpose-limited; restricted roles; no ad use | Shared with ad partners | Act §6 | TC-079 |
| SC-109 | Fitness app wearable data | Health metrics synced | Consent specific to purpose; withdrawal stops sync processing | Continues syncing | Act §6 | TC-202 |
| SC-110 | Pharmacy app prescription upload | Unsafe file upload | Blocked | Malicious file stored | FR-M13 | TC-254 |
| SC-111 | Hospital chain with 5 hospitals (legal entities) | Consent at Hospital 1 | Not reused at Hospital 2 unless separate basis | Group consent inference | FR-M02-01 | TC-035 |
| SC-112 | Health notice in Malayalam | Principal language Malayalam | Reviewed Malayalam variant | Machine translation unreviewed shown as reviewed | FR-M12-04 | TC-229 |
| SC-113 | Hospital vendor support case | Diagnostic contains patient ID | Blocked locally | Sent | SUP-02 | TC-417 |
| SC-114 | EdTech parent grievance | Parent complains about child data use | Grievance under guardian mandate; pack clock | Grievance rejected because child not the submitter | Act §13 | TC-262 |
| SC-115 | Coaching institute WhatsApp marketing to minors | Marketing to minor numbers | Blocked (child + marketing) | Sent | Act §9 | TC-302 |
| SC-116 | Gaming studio seeded regression test | Test engine seeded bypass | Test FAIL linked to control | False PASS | T27 | TC-166 |
| SC-117 | Health data breach affects unknown count | Scope uncertain | Uncertainty recorded; not zero | Reported zero affected | FR-M17-02 | TC-364 |
| SC-118 | Social platform ad partner added | New recipient | Impact review | Silent | T34 | TC-052 |
| SC-119 | Pharma vendor (CRO) changes subprocessor | New subprocessor | Unapproved state; review | Auto-approved | FR-M16 | TC-340 |
| SC-120 | Health app no-model operation | Hospital IT blocks all AI | Everything works deterministically | Features silently fail | T39 | TC-463 |
