# Scenarios SC-121 – SC-160 — Telecom, HR/Employment, Travel & Hospitality, Logistics, Real Estate, Automotive, Media/OTT, B2B SaaS, NGO, Gig Platforms, Public-Function Contexts

All scenarios start **NOT_RUN**. Legitimate-use (§7) bases require reviewed applicability before activation.

| ID | Business context | Scenario flow | Must hold (pass criteria) | Must NOT happen | DPDPA / ORVIA refs | Linked TCs |
|---|---|---|---|---|---|---|
| SC-121 | Telecom operator, number recycling | Recycled number holder requests data | Ambiguous identity; no disclosure | Old subscriber data disclosed | T23 | TC-273 |
| SC-122 | Telecom promotional calls | Subscriber withdraws marketing | Promo calls/SMS blocked; service SMS continue | Service messages blocked | Act §6 | TC-206 |
| SC-123 | Telecom CDR retention | Erasure request | CDRs retained per configured obligation, restricted | CDR deleted or used for marketing | Act §8(7) | TC-318 |
| SC-124 | Telecom breach with CERT-In applicability | SIM-swap database leak | Separate DPDP and CERT-In tasks and clocks | Single merged task | T36 | TC-356, TC-357 |
| SC-125 | HR: employee onboarding (§7 employment) | Employee data processed under employment basis | Basis reviewed; no consent pop-up pretending to be basis | Employment data processed under "consent" that can't be refused | Act §7 | TC-061, TC-062 |
| SC-126 | HR: employee marketing of company products | Separate marketing purpose | Needs consent; refusal has no employment effect | Employee penalised for refusal | Act §6(1) | TC-193 |
| SC-127 | HR: ex-employee erasure request | Employee left | Payroll/tax/statutory records retained; others erased | All deleted or none | Act §8(7) | TC-271 |
| SC-128 | HR: background verification vendor | BGV processor | Contract reference; purpose-limited; erasure instruction tracked | No contract | Act §8(2) | TC-338 |
| SC-129 | HR: employee monitoring features requested | Customer wants employee-activity monitoring from ORVIA | Not a V1 feature; absent/unavailable | Feature enabled | PRD exclusions | TC-455 |
| SC-130 | Recruitment portal, rejected candidates | Retention after rejection | Candidate data eligible for deletion per rule; talent pool requires consent | Kept indefinitely | Act §8(7) | TC-316 |
| SC-131 | Airline: passenger manifest to authorities | Processing under legal obligation basis (reviewed) | Basis recorded; not affected by marketing withdrawal | Manifest blocked by marketing withdrawal | Act §7 | TC-063 |
| SC-132 | Airline loyalty marketing | Withdrawal | Blocked | Continued | Act §6 | TC-202 |
| SC-133 | Hotel guest ID copies | Retention rule for guest ID per configured obligation | Retained restricted; deleted when eligible | Used for marketing | FR-M15 | TC-315, TC-318 |
| SC-134 | Travel agency shares data with foreign hotel | Cross-border processing | Transfer assessment task | Hard-coded allow | Act §16 | TC-060 |
| SC-135 | Logistics: delivery address correction | Correction propagates to last-mile partner | Coordination task; verification status | Marked done without partner | FR-M16-02 | TC-343 |
| SC-136 | Logistics: proof-of-delivery photos | Retention per copy | Deleted when eligible; backups unverified | Kept forever | FR-M15 | TC-331 |
| SC-137 | Real estate CRM: purchased leads | Leads without consent | Not usable | Called | FR-M11-04 | TC-212 |
| SC-138 | Real estate: broker (processor) keeps data after deal | Erasure instruction to broker | Unacknowledged → escalation | Assumed deleted | FR-M16-02 | TC-342 |
| SC-139 | Automotive connected car telematics | Location/driving behaviour for insurance offers | Separate purpose consent; withdrawal stops | Reused without consent | Act §6 | TC-079 |
| SC-140 | Car dealer service reminders vs marketing | Service reminder classification | Reviewed basis per purpose | Marketing disguised as service | M04 | TC-079 |
| SC-141 | OTT platform viewing history | Recommendation profiling purpose | Consent-based; withdrawal stops profiling | Profiling continues | Act §6 | TC-202 |
| SC-142 | OTT kids profile | Child profile | No behavioural ads | Ads targeted | Act §9(3) | TC-302 |
| SC-143 | News publisher newsletters in 5 languages | Notices in 5 languages | Each reviewed; principal choice honoured | Unreviewed variant published as reviewed | Act §6(3) | TC-228, TC-229 |
| SC-144 | B2B SaaS acting as processor for its clients | ORVIA tenant is a processor | Records show processor role per client; instructions tracked | Treated as fiduciary obligations incorrectly without review | Act §8(2) | TC-337 |
| SC-145 | B2B SaaS multi-client isolation | Each client as subtenant | Isolation tests pass | Cross-client data | NFR-01 | TC-026..TC-034 |
| SC-146 | NGO donor database | Donor marketing consent; donation receipts retained | Marketing withdrawal stops appeals; receipts retained | Receipts deleted | Act §8(7) | TC-206 |
| SC-147 | NGO beneficiaries in rural areas, assisted consent | Field worker records consent in Santali | Reviewed language variant if configured; else explicit unavailable status | Consent recorded in unsupported language silently | Act §6(3) | TC-229, TC-220 |
| SC-148 | Gig platform: worker ratings | Worker access request | Ratings data included; customer identities handled per review | Customer personal data exposed | T25 | TC-267 |
| SC-149 | Gig platform: worker deactivation and erasure | Worker leaves | Payment/tax records retained; profile erased | Payment records deleted | Act §8(7) | TC-271 |
| SC-150 | State-funded scheme implementer (private contractor) | §7 state function basis considered | Requires reviewed applicability; not default for private tenant | Auto-applied | Act §7 | TC-084 |
| SC-151 | Co-working space CCTV | Retention per copy | Deleted per rule; backups unverified | Indefinite | FR-M15 | TC-315 |
| SC-152 | Utility company (electricity) bill payments | Service messages vs promotions | Basis per purpose | Promotions under service basis | M04 | TC-079 |
| SC-153 | Event ticketing with photo capture | Consent for photo use in marketing | Specific consent; withdrawal stops future use | Continued use | Act §6 | TC-202 |
| SC-154 | Market research firm panel | Panelist withdraws | Removed from future surveys; processors notified | Continues | Act §6(6) | TC-204 |
| SC-155 | Franchise business with 50 franchisees | Each franchisee as subtenant | Franchisee cannot see others | Cross-franchise leakage | NFR-01 | TC-044 |
| SC-156 | Matrimony site: profile sharing | Profile shared with matches | Recipient types in access response | Missing | Act §11 | TC-266 |
| SC-157 | Credit bureau data correction | Principal disputes record | Correction workflow with source review | Auto-overwrite | Act §12 | TC-290 |
| SC-158 | Courier company: consignee (not customer) data | Consignee requests access | Identity verification; data about consignee only | Sender's other data disclosed | FR-M14-02 | TC-275 |
| SC-159 | Law firm client data | Legal hold on case files | Hold honoured | Erased | FR-M15-02 | TC-324 |
| SC-160 | Cooperative bank with no IT team | Uses manual/file onboarding only | Snapshot labelled; manual tasks; no live-control claims | Claims live verification | FR-M29-04 | TC-414, TC-127 |
